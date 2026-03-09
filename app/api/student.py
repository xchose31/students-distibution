from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User, SystemSetting, ClassProfile, ProfileChoice
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

        if not data.get('first_choice_id') or not data.get('second_choice_id'):
            return jsonify({"error": "Выберите оба профиля"}), 400

        if data['first_choice_id'] == data['second_choice_id']:
            return jsonify({"error": "Профили не могут совпадать"}), 400

        if profile_choice:
            profile_choice.first_choice_id = data['first_choice_id']
            profile_choice.second_choice_id = data['second_choice_id']
        else:
            profile_choice = ProfileChoice(
                person_id=person.id,
                first_choice_id=data['first_choice_id'],
                second_choice_id=data['second_choice_id']
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