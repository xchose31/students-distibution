# app/api/admin_exam_results.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from ..extensions import db
from ..models.user import User
from ..models.user import ClassProfile
from ..models.user import SystemSetting
from ..models.user import ProfileChoice
from ..models.user import Subject, ExamResult
from ..models.user import ComPerson
import pandas as pd
from io import BytesIO

bp = Blueprint('admin_exam_results', __name__, url_prefix='/admin/exam-results')


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        if not user or not user.person.emp_post.role.role == 'distribution':
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


@bp.route('/upload', methods=['POST'])
@admin_required
def upload_exam_results():
    """
    Загрузка результатов экзаменов из Excel файла

    ТОЛЬКО столбцы с точными названиями интерпретируются как зачисление:
    - "Класс зачисления" → enrolled_class
    - "Профиль зачисления" → enrolled_profile
    - Все остальные столбцы → результаты экзаменов
    """

    if 'file' not in request.files:
        return jsonify({"error": "Файл не найден"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "Файл не выбран"}), 400

    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "Неверный формат файла. Поддерживаются только .xlsx и .xls"}), 400

    try:
        df = pd.read_excel(BytesIO(file.read()))
    except Exception as e:
        return jsonify({"error": f"Ошибка чтения файла: {str(e)}"}), 400

    # Проверяем наличие столбца ФИО
    fio_column = None
    for col in df.columns:
        col_lower = str(col).lower()
        if 'фио' in col_lower or 'fio' in col_lower or 'фамилия' in col_lower:
            fio_column = col
            break

    if fio_column is None:
        return jsonify({"error": "В файле не найден столбец 'ФИО'"}), 400

    # Получаем все столбцы кроме ФИО
    all_columns = [col for col in df.columns if col != fio_column]

    # 🔧 СТРОГОЕ ОПРЕДЕЛЕНИЕ СТОЛБЦОВ ЗАЧИСЛЕНИЯ
    enrolled_class_col = None
    enrolled_profile_col = None
    f_prof_col = None
    s_prof_col = None
    t_prof_col = None

    # 🔍 Поиск по ТОЧНЫМ названиям (без частичного match)
    for col in all_columns:
        col_stripped = str(col).strip().lower()

        # 🔴 ТОЛЬКО точное совпадение "класс зачисления"
        if col_stripped == 'класс зачисления':
            enrolled_class_col = col

        # 🔵 ТОЛЬКО точное совпадение "профиль зачисления"
        if col_stripped == 'профиль зачисления':
            enrolled_profile_col = col

        if col_stripped == '1 приоритет':
            f_prof_col = col
        if col_stripped == '2 приоритет':
            s_prof_col = col
        if col_stripped == '3 приоритет':
            t_prof_col = col

    subject_columns = [
        col for col in all_columns
        if
        col != enrolled_class_col and col != enrolled_profile_col and col != f_prof_col and col != s_prof_col and col != t_prof_col
    ]

    stats = {
        'total_rows': len(df),
        'success': 0,
        'failed': 0,
        'failed_students': [],
        'updated_results': [],  # 🔧 Новое: обновлённые оценки
        'subjects_created': [],
        'results_added': 0,
        'results_updated': 0,  # 🔧 Новое: счётчик обновлений
        'enrollment_updated': 0
    }

    # Кэш предметов
    subject_cache = {}

    for index, row in df.iterrows():
        fio_raw = str(row[fio_column]).strip()

        if not fio_raw or fio_raw == 'nan':
            stats['failed'] += 1
            stats['failed_students'].append({
                'row': index + 2,
                'fio': fio_raw,
                'error': 'Пустое ФИО'
            })
            continue

        # Парсим ФИО (формат: Имя Фамилия Отчество)
        fio_parts = fio_raw.split()

        if len(fio_parts) < 2:
            stats['failed'] += 1
            stats['failed_students'].append({
                'row': index + 2,
                'fio': fio_raw,
                'error': 'Неверный формат ФИО (ожидалось: Имя Фамилия Отчество)'
            })
            continue

        name = fio_parts[1]
        surname = fio_parts[0] if len(fio_parts) > 1 else ''
        patro = fio_parts[2] if len(fio_parts) > 2 else ''

        # Ищем ученика в базе по ФИО
        person = ComPerson.query.filter_by(
            name=name,
            surname=surname,
            patro=patro
        ).first()

        if not person:
            stats['failed'] += 1
            stats['failed_students'].append({
                'row': index + 2,
                'fio': fio_raw,
                'error': 'Ученик не найден в базе'
            })
            continue

        student_results = 0
        student_updated = []  # 🔧 Новое: обновлённые оценки ученика
        enrollment_updated = False

        # 🔧 Обработка класса и профиля зачисления
        enrolled_class = None
        enrolled_profile = None

        if enrolled_class_col:
            class_value = row[enrolled_class_col]
            if pd.notna(class_value) and str(class_value).strip() and str(class_value).strip() != 'nan':
                enrolled_class = str(class_value).strip()

        if enrolled_profile_col:
            profile_value = row[enrolled_profile_col]
            if pd.notna(profile_value) and str(profile_value).strip() and str(profile_value).strip() != 'nan':
                enrolled_profile = str(profile_value).strip()

        # Обновляем поля зачисления у ученика
        if enrolled_class or enrolled_profile:
            if enrolled_class:
                person.enrolled_class = enrolled_class
            if enrolled_profile:
                person.enrolled_profile = enrolled_profile
            enrollment_updated = True

        # Обработка результатов экзаменов
        for subject_col in subject_columns:
            score = row[subject_col]

            if pd.isna(score) or score == '' or str(score).strip() == '' or str(score).strip() == 'nan':
                continue

            try:
                score_value = int(float(score))
            except (ValueError, TypeError):
                continue

            subject_name = str(subject_col).strip().lower()
            subject = subject_cache.get(subject_name)

            if not subject:
                subject = Subject.query.filter_by(name=subject_name.lower()).first()

                if not subject:
                    subject = Subject(name=subject_name.lower())
                    db.session.add(subject)
                    stats['subjects_created'].append(subject_name)
                    db.session.flush()

                subject_cache[subject_name] = subject

            # 🔧 ПРОВЕРКА НА СУЩЕСТВУЮЩИЙ РЕЗУЛЬТАТ
            existing_result = ExamResult.query.filter_by(
                person_id=person.id,
                subject_id=subject.id
            ).first()

            if existing_result:
                # 🔧 ЗАМЕНЯЕМ СТАРУЮ ОЦЕНКУ НА НОВУЮ
                if existing_result.result != score_value:
                    student_updated.append({
                        'subject': subject_name,
                        'old_score': existing_result.result,
                        'new_score': score_value
                    })
                    existing_result.result = score_value
                    stats['results_updated'] += 1
                # Если оценка не изменилась — ничего не делаем
            else:
                # Создаём новый результат
                exam_result = ExamResult(
                    person_id=person.id,
                    subject_id=subject.id,
                    result=score_value
                )
                db.session.add(exam_result)
                student_results += 1

        # 🔧 Статистика по обновлённым оценкам
        if student_updated:
            stats['updated_results'].append({
                'row': index + 2,
                'fio': fio_raw,
                'person_id': person.id,
                'updated': student_updated
            })

        if student_results > 0 or enrollment_updated or student_updated:
            stats['success'] += 1

        if enrollment_updated:
            stats['enrollment_updated'] += 1

        stats['results_added'] += student_results

    db.session.commit()

    # Формируем ответ
    response = {
        'message': 'Импорт завершён',
        'stats': stats,
        'summary': {
            'total_rows': stats['total_rows'],
            'success': stats['success'],
            'failed': stats['failed'],
            'results_added': stats['results_added'],
            'results_updated': stats['results_updated'],  # 🔧 Новое
            'subjects_created': len(stats['subjects_created']),
            'enrollment_updated': stats['enrollment_updated']
        }
    }

    if stats['failed'] > 0:
        response['warning'] = f'{stats["failed"]} ошибок импортировано'
        response['failed_details'] = stats['failed_students']

    # 🔧 Добавляем информацию об обновлённых оценках
    if stats['results_updated'] > 0:
        response['updated_details'] = stats['updated_results']

    return jsonify(response), 200

@bp.route('/subjects', methods=['GET'])
@admin_required
def get_subjects():
    """Получить список всех предметов"""
    subjects = Subject.query.order_by(Subject.name).all()
    return jsonify({
        'subjects': [{'id': s.id, 'name': s.name} for s in subjects]
    }), 200


@bp.route('/results/<int:person_id>', methods=['GET'])
@admin_required
def get_person_results(person_id):
    """Получить результаты экзаменов конкретного ученика"""
    person = ComPerson.query.get_or_404(person_id)
    results = ExamResult.query.filter_by(person_id=person_id).all()

    return jsonify({
        'person': {
            'id': person.id,
            'fio': f'{person.name} {person.surname} {person.patro}'
        },
        'results': [
            {
                'subject_id': r.subject.id,
                'subject_name': r.subject.name,
                'result': r.result
            }
            for r in results
        ]
    }), 200