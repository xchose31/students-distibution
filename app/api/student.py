# app/api/student.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User, ComPerson
from ..models.user import ClassProfile
from ..models.user import SystemSetting
from ..models.user import ProfileChoice
from ..extensions import db

bp = Blueprint('student', __name__)


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