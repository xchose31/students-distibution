from flask import Blueprint, jsonify, request
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User, SystemSetting, ClassProfile
from ..extensions import db


bp = Blueprint('admin', __name__)

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


@bp.route('/selection-status', methods=['GET', 'PUT'])
@admin_required
def get_selection_status():
    if request.method == 'GET':
        is_open = SystemSetting.get_setting('selection_open', 'false')
        return jsonify({"is_open": is_open == 'true'}), 200
    elif request.method == 'PUT':
        data = request.get_json()
        if data is None or 'selection_open' not in data:
            return jsonify({"error": "selection_open field is required"}), 400

        value = 'true' if data['selection_open'] is True else 'false'
        SystemSetting.set_setting('selection_open', value)
        return jsonify({"selection_open": value}), 200


@bp.route('/class-profiles', methods=['GET', 'POST'])
@admin_required
def class_profiles():
    profiles = ClassProfile.query.all()
    if request.method == 'GET':
        return jsonify({"profiles": [profile.to_dict() for profile in profiles]}), 200
    elif request.method == 'POST':
        data = [elem.lower() for elem in request.get_json()['profiles']]
        for profile in profiles:
            if profile not in data:
                db.session.delete(profile)
        for elem in data:
            if not ClassProfile.query.filter_by(name=elem).first():
                db.session.add(ClassProfile(name=elem))
        db.session.commit()
        return jsonify({"profiles": data}), 200

