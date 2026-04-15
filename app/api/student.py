# app/api/student.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User, ComPerson, ExamResult
from ..models.user import ClassProfile
from ..models.user import SystemSetting
from ..models.user import ProfileChoice
from ..extensions import db
import logging
from logging.handlers import RotatingFileHandler
import os

bp = Blueprint('student', __name__)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    # Создаем директорию для логов, если она не существует
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # RotatingFileHandler: ротация при достижении 10 МБ, храним до 5 файлов
    handler = RotatingFileHandler(
        os.path.join(log_dir, 'student_profile.log'),
        maxBytes=10 * 1024 * 1024,  # 10 МБ
        backupCount=5,              # Хранить до 5 старых файлов
        encoding='utf-8'
    )
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    handler.setLevel(logging.DEBUG)
    logger.addHandler(handler)

@bp.route('/profile-choice', methods=['GET', 'PUT'])
@jwt_required()
def crud_profile_choice():
    current_user_id = get_jwt_identity()
    user = User.query.get_or_404(int(current_user_id))
    person = user.person

    profile_choice = ProfileChoice.query.filter_by(person_id=person.id).first()

    if request.method == 'GET':
        if profile_choice:
            return jsonify({"profiles": [profile_choice.to_dict()]}), 200
        else:
            return jsonify({"profiles": []}), 200

    elif request.method == 'PUT':
        is_open = SystemSetting.get_setting('selection_open', 'false')
        if is_open != 'true':
            return jsonify({"error": "Выбор профилей закрыт"}), 400

        data = request.get_json()

        # 🔧 Получаем все 3 приоритета
        first_choice_id = data.get('first_choice_id')
        second_choice_id = data.get('second_choice_id')
        third_choice_id = data.get('third_choice_id')

        # Первый приоритет обязателен
        if not first_choice_id:
            return jsonify({"error": "Выберите первый приоритет"}), 400

        # Проверка на дубликаты
        choices = [first_choice_id, second_choice_id, third_choice_id]
        choices = [c for c in choices if c]  # Убираем None
        if len(choices) != len(set(choices)):
            return jsonify({"error": "Профили не могут совпадать"}), 400

        if profile_choice:
            profile_choice.first_choice_id = first_choice_id
            profile_choice.second_choice_id = second_choice_id
            profile_choice.third_choice_id = third_choice_id
        else:
            profile_choice = ProfileChoice(
                person_id=person.id,
                first_choice_id=first_choice_id,
                second_choice_id=second_choice_id,
                third_choice_id=third_choice_id
            )
            db.session.add(profile_choice)

        db.session.commit()
        return jsonify({"profiles": [profile_choice.to_dict()]}), 200


@bp.route('/profiles', methods=['GET'])
@jwt_required()
def get_profiles():
    is_open = SystemSetting.get_setting('selection_open', 'false')
    selection_open = (is_open == 'true')

    profiles = ClassProfile.query.order_by(ClassProfile.name).all()

    return jsonify({
        "selection_open": selection_open,
        "profiles": [p.to_dict() for p in profiles]
    }), 200


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_student_profile():
    """Получить полную информацию об ученике"""
    try:
        current_user_id = get_jwt_identity()
        logger.info(f"📥 [START] Запрос профиля для user_id={current_user_id}")

        # 1. Поиск пользователя
        user = User.query.get(int(current_user_id))
        if not user:
            logger.error(f"❌ Пользователь с ID {current_user_id} не найден в БД")
            return jsonify({"error": "Пользователь не найден"}), 404

        person = user.person
        if not person:
            logger.error(f"❌ У пользователя {current_user_id} нет связанной записи ComPerson")
            return jsonify({"error": "Профиль ученика не найден"}), 404

        logger.info(f"✅ Пользователь найден: {person.surname} {person.name}, person_id={person.id}")

        # 2. Получение результатов экзаменов
        logger.info(f"🔍 Поиск результатов экзаменов для person_id={person.id}...")
        exam_results = ExamResult.query.filter_by(person_id=person.id).all()
        logger.info(f"📊 Найдено результатов: {len(exam_results)}")

        results_list = []
        for r in exam_results:
            # 🔧 КРИТИЧЕСКАЯ ПРОВЕРКА
            if r.subject is None:
                logger.warning(f"⚠️ Результат экзамена ID={r.id} имеет NULL subject! Пропускаем.")
                continue

            logger.debug(f"   - Предмет: {r.subject.name}, Балл: {r.result}")
            results_list.append({
                'subject_id': r.subject.id,
                'subject_name': r.subject.name,
                'result': r.result
            })

        # 3. Расчет среднего балла
        avg_score = None
        if results_list:
            total = sum(item['result'] for item in results_list)
            avg_score = round(total / len(results_list), 2)
            logger.info(f" Средний балл: {avg_score}")

        # 4. Выбор профилей
        profile_choice = ProfileChoice.query.filter_by(person_id=person.id).first()
        choices_data = None
        if profile_choice:
            logger.info("✅ Выбор профилей найден")
            # 🔧 ДОБавлена защита от ошибки, если выбор есть, а профиль внутри удален
            try:
                choices_data = {
                    'first_choice': profile_choice.first_choice.name if profile_choice.first_choice else None,
                    'second_choice': profile_choice.second_choice.name if profile_choice.second_choice else None,
                    'third_choice': profile_choice.third_choice.name if profile_choice.third_choice else None
                }
            except AttributeError as e:
                logger.error(f"Ошибка внутри выбора профилей: {e}")
                choices_data = {'error': 'Некорректные данные выбора'}
        else:
            logger.info("ℹ️ Выбор профилей не найден (пусто)")

        # 5. Формирование ответа
        response_data = {
            'person': {
                'id': person.id,
                'fio': f'{person.surname} {person.name} {person.patro}',
                'surname': person.surname,
                'name': person.name,
                'patro': person.patro
            },
            'enrollment': {
                'class': person.enrolled_class,
                'profile': person.enrolled_profile
            },
            'profile_choices': choices_data,
            'exam_results': results_list,
            'avg_score': avg_score
        }

        logger.info(f"🚀 [SUCCESS] Отправляем ответ для user_id={current_user_id}")
        return jsonify(response_data), 200

    except Exception as e:
        # 🔧 ЛОВИМ ВСЕ ОШИБКИ
        logger.error(f"💥 [CRITICAL ERROR] Ошибка при получении профиля user_id={current_user_id}", exc_info=True)
        logger.error(f"Тип ошибки: {type(e).__name__}")
        logger.error(f"Сообщение: {str(e)}")

        # Исправление: используем current_app вместо app, так как app может быть не импортирован здесь
        from flask import current_app
        is_debug = current_app.config.get('FLASK_ENV') == 'development'

        return jsonify({
            "error": "Внутренняя ошибка сервера",
            "details": str(e) if is_debug else "Обратитесь к администратору"
        }), 500