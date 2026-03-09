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

bp = Blueprint('admin_exam_results', __name__, url_prefix='/api/admin/exam-results')


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

    Все названия предметов автоматически приводятся к lowercase
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
        if 'фио' in str(col).lower() or 'fio' in str(col).lower():
            fio_column = col
            break

    if fio_column is None:
        return jsonify({"error": "В файле не найден столбец 'ФИО'"}), 400

    # Получаем список столбцов-предметов (все кроме ФИО)
    subject_columns = [col for col in df.columns if col != fio_column]

    # Статистика импорта
    stats = {
        'total_rows': len(df),
        'success': 0,
        'failed': 0,
        'failed_students': [],
        'subjects_created': [],
        'results_added': 0
    }

    # 🔧 Кэш предметов для оптимизации (название lowercase -> объект)
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

        name = fio_parts[0]
        surname = fio_parts[1] if len(fio_parts) > 1 else ''
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

        for subject_col in subject_columns:
            score = row[subject_col]

            # Пропускаем пустые значения
            if pd.isna(score) or score == '' or str(score).strip() == '':
                continue

            # Пытаемся преобразовать в число
            try:
                score_value = int(float(score))
            except (ValueError, TypeError):
                continue

            # 🔧 Нормализуем название предмета: lowercase + trim
            subject_name = str(subject_col).strip().lower()

            # Проверяем кэш
            subject = subject_cache.get(subject_name)

            if not subject:
                # Ищем в базе (теперь поиск по lowercase)
                subject = Subject.query.filter_by(name=subject_name).first()

                if not subject:
                    # Создаём новый предмет (автоматически сохранится в lowercase)
                    subject = Subject(name=subject_name)
                    db.session.add(subject)
                    stats['subjects_created'].append(subject_name)
                    db.session.flush()

                # Добавляем в кэш
                subject_cache[subject_name] = subject

            # Проверяем существующий результат
            existing_result = ExamResult.query.filter_by(
                person_id=person.id,
                subject_id=subject.id
            ).first()

            if existing_result:
                existing_result.result = score_value
            else:
                exam_result = ExamResult(
                    person_id=person.id,
                    subject_id=subject.id,
                    result=score_value
                )
                db.session.add(exam_result)
                student_results += 1

        stats['success'] += 1
        stats['results_added'] += student_results

    db.session.commit()

    response = {
        'message': 'Импорт завершён',
        'stats': stats,
        'summary': {
            'total_rows': stats['total_rows'],
            'success': stats['success'],
            'failed': stats['failed'],
            'results_added': stats['results_added'],
            'subjects_created': len(stats['subjects_created'])
        }
    }

    if stats['failed'] > 0:
        response['warning'] = f'{stats["failed"]} записей не импортировано'
        response['failed_details'] = stats['failed_students']

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