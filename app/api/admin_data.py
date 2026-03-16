# app/api/admin_data.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from ..extensions import db
from ..models.user import User, ComPerson
from ..models.user import Subject, ExamResult, EmpPost, EmpPostRoles
from ..models.user import ClassProfile
from ..models.user import ProfileChoice
from ..models.user import SystemSetting

bp = Blueprint('admin_data', __name__, url_prefix='/admin/data')


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


@bp.route('', methods=['GET'])
@admin_required
def get_all_data():
    """
    Получить все данные для таблицы в плоском формате

    Каждая строка = один ученик
    Колонки: ФИО + все предметы + выбор профилей

    Query params:
    - search: поиск по ФИО
    - profile: фильтр по профилю (id)
    - subject: фильтр по предмету (id)
    - min_score: минимальный балл
    - sort_by: сортировка (surname, name, avg_score)
    - sort_order: asc/desc
    """

    # Параметры запроса
    search = request.args.get('search', '')
    profile_filter = request.args.get('profile', type=int)
    subject_filter = request.args.get('subject', type=int)
    min_score = request.args.get('min_score', type=int)
    sort_by = request.args.get('sort_by', 'surname')
    sort_order = request.args.get('sort_order', 'asc')

    # Базовый запрос: все ученики
    query = ComPerson.query.join(User, User.pers_id == ComPerson.id, isouter=True)

    query = query.filter(
        ~ComPerson.emp_post.has(  # NOT EXISTS
            EmpPost.role.has(
                EmpPostRoles.role == 'distribution'
            )
        )
    )

    # Поиск по ФИО
    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                ComPerson.surname.ilike(search_pattern),
                ComPerson.name.ilike(search_pattern),
                ComPerson.patro.ilike(search_pattern)
            )
        )

    # Фильтр по профилю (первый или второй приоритет)
    if profile_filter:
        query = query.join(ProfileChoice, ProfileChoice.person_id == ComPerson.id, isouter=True)
        query = query.filter(
            db.or_(
                ProfileChoice.first_choice_id == profile_filter,
                ProfileChoice.second_choice_id == profile_filter
            )
        )

    # Фильтр по предмету и минимальному баллу
    if subject_filter or min_score:
        query = query.join(ExamResult, ExamResult.person_id == ComPerson.id, isouter=True)

        if subject_filter:
            query = query.filter(ExamResult.subject_id == subject_filter)

        if min_score:
            query = query.filter(ExamResult.result >= min_score)

    # Сортировка
    if sort_by == 'surname':
        query = query.order_by(ComPerson.surname.asc() if sort_order == 'asc' else ComPerson.surname.desc())
    elif sort_by == 'name':
        query = query.order_by(ComPerson.name.asc() if sort_order == 'asc' else ComPerson.name.desc())
    elif sort_by == 'avg_score':
        # Сложная сортировка по среднему баллу
        from sqlalchemy import func
        avg_subquery = db.session.query(
            ExamResult.person_id,
            func.avg(ExamResult.result).label('avg_score')
        ).group_by(ExamResult.person_id).subquery()

        query = query.outerjoin(avg_subquery, avg_subquery.c.person_id == ComPerson.id)
        query = query.order_by(
            avg_subquery.c.avg_score.asc() if sort_order == 'asc' else avg_subquery.c.avg_score.desc()
        )

    persons = query.all()

    # Получаем все предметы для колонок
    subjects = Subject.query.order_by(Subject.name).all()

    # Получаем все профили
    profiles = ClassProfile.query.order_by(ClassProfile.name).all()

    # Формируем плоскую структуру данных
    rows = []
    for person in persons:
        # Получаем результаты экзаменов
        exam_results = ExamResult.query.filter_by(person_id=person.id).all()
        results_dict = {r.subject_id: r.result for r in exam_results}

        # Получаем выбор профилей
        profile_choice = ProfileChoice.query.filter_by(person_id=person.id).first()

        if not profile_choice:
            profile_choice = ProfileChoice(person_id=person_id)
            db.session.add(profile_choice)

        if 'first_choice_id' in updates:
            profile_choice.first_choice_id = updates['first_choice_id']
        if 'second_choice_id' in updates:
            profile_choice.second_choice_id = updates['second_choice_id']
        if 'third_choice_id' in updates:  # ← Добавлено
            profile_choice.third_choice_id = updates['third_choice_id']

        # Строка данных
        row = {
            'person_id': person.id,
            'surname': person.surname,
            'name': person.name,
            'patro': person.patro,
            'fio': f'{person.name} {person.surname} {person.patro}',
            'snils': person.snils,
            'first_choice_id': profile_choice.first_choice_id if profile_choice else None,
            'first_choice_name': profile_choice.first_choice.name if profile_choice and profile_choice.first_choice else None,
            'second_choice_id': profile_choice.second_choice_id if profile_choice else None,
            'second_choice_name': profile_choice.second_choice.name if profile_choice and profile_choice.second_choice else None,
            'third_choice_id': profile_choice.third_choice_id if profile_choice else None,  # ← Добавлено
            'third_choice_name': profile_choice.third_choice.name if profile_choice and profile_choice.third_choice else None,
            'results': results_dict,
            'results': results_dict,  # {subject_id: score}
            'avg_score': sum(results_dict.values()) / len(results_dict) if results_dict else None,
            'total_subjects': len(results_dict)
        }

        rows.append(row)

    return jsonify({
        'data': rows,
        'subjects': [{'id': s.id, 'name': s.name} for s in subjects],
        'profiles': [{'id': p.id, 'name': p.name} for p in profiles],
        'total': len(rows),
        'filters': {
            'search': search,
            'profile': profile_filter,
            'subject': subject_filter,
            'min_score': min_score,
            'sort_by': sort_by,
            'sort_order': sort_order
        }
    }), 200


@bp.route('/update', methods=['PUT'])
@admin_required
def update_data():
    """
    Обновить данные ученика

    Request body:
    {
        "person_id": 123,
        "updates": {
            "surname": "Новая Фамилия",
            "results": {
                "1": 95,  # subject_id: score
                "2": 88
            },
            "first_choice_id": 5,
            "second_choice_id": 6
        }
    }
    """
    data = request.get_json()

    if not data or 'person_id' not in data or 'updates' not in data:
        return jsonify({"error": "Неверный формат данных"}), 400

    person_id = data['person_id']
    updates = data['updates']

    # Находим ученика
    person = ComPerson.query.get(person_id)
    if not person:
        return jsonify({"error": "Ученик не найден"}), 404

    # Обновляем личные данные
    if 'surname' in updates:
        person.surname = updates['surname']
    if 'name' in updates:
        person.name = updates['name']
    if 'patro' in updates:
        person.patro = updates['patro']
    if 'snils' in updates:
        person.snils = updates['snils']

    # Обновляем результаты экзаменов
    if 'results' in updates:
        for subject_id, score in updates['results'].items():
            subject_id = int(subject_id)

            # Пропускаем пустые значения (удаление оценки)
            if score is None or score == '':
                existing = ExamResult.query.filter_by(
                    person_id=person_id,
                    subject_id=subject_id
                ).first()
                if existing:
                    db.session.delete(existing)
                continue

            # Проверяем существующий результат
            existing = ExamResult.query.filter_by(
                person_id=person_id,
                subject_id=subject_id
            ).first()

            if existing:
                existing.result = int(score)
            else:
                # Создаём новый
                exam_result = ExamResult(
                    person_id=person_id,
                    subject_id=subject_id,
                    result=int(score)
                )
                db.session.add(exam_result)

    # Обновляем выбор профилей
    if 'first_choice_id' in updates or 'second_choice_id' in updates:
        profile_choice = ProfileChoice.query.filter_by(person_id=person_id).first()

        if not profile_choice:
            profile_choice = ProfileChoice(person_id=person_id)
            db.session.add(profile_choice)

        if 'first_choice_id' in updates:
            profile_choice.first_choice_id = updates['first_choice_id']
        if 'second_choice_id' in updates:
            profile_choice.second_choice_id = updates['second_choice_id']

    db.session.commit()

    # Возвращаем обновлённые данные
    exam_results = ExamResult.query.filter_by(person_id=person_id).all()
    results_dict = {r.subject_id: r.result for r in exam_results}

    profile_choice = ProfileChoice.query.filter_by(person_id=person_id).first()

    return jsonify({
        'person_id': person.id,
        'surname': person.surname,
        'name': person.name,
        'patro': person.patro,
        'snils': person.snils,
        'first_choice_id': profile_choice.first_choice_id if profile_choice else None,
        'first_choice_name': profile_choice.first_choice.name if profile_choice and profile_choice.first_choice else None,
        'second_choice_id': profile_choice.second_choice_id if profile_choice else None,
        'second_choice_name': profile_choice.second_choice.name if profile_choice and profile_choice.second_choice else None,
        'results': results_dict,
        'message': 'Данные обновлены'
    }), 200


@bp.route('/subjects', methods=['GET'])
@admin_required
def get_subjects():
    """Получить список всех предметов"""
    subjects = Subject.query.order_by(Subject.name).all()
    return jsonify({
        'subjects': [{'id': s.id, 'name': s.name} for s in subjects]
    }), 200


@bp.route('/profiles', methods=['GET'])
@admin_required
def get_profiles():
    """Получить список всех профилей"""
    profiles = ClassProfile.query.order_by(ClassProfile.name).all()
    return jsonify({
        'profiles': [{'id': p.id, 'name': p.name} for p in profiles]
    }), 200


@bp.route('/export', methods=['GET'])
@admin_required
def export_data():
    """
    Экспорт данных в Excel (заготовка)

    Query params: те же что и для GET /api/admin/data
    """
    # TODO: Реализовать экспорт в Excel
    return jsonify({
        "message": "Экспорт в разработке",
        "hint": "Используйте GET /api/admin/data для получения JSON"
    }), 200