from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models.user import User
from datetime import timedelta



bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    remember_me = data.get('remember_me') or False
    if not username or not password:
        return jsonify({"error": "Invalid credentials"}), 401

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        if remember_me:
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=timedelta(days=7)
            )
        else:
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=timedelta(hours=1))
        return jsonify(access_token=access_token, user=user.to_dict()), 200
    return jsonify({"error": "Invalid credentials"}), 401