from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models.user import User
from datetime import timedelta
from requests import get


bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    remember_me = data.get('remember_me', False)

    if not username or not password:
        return jsonify({"error": "Invalid credentials"}), 401

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(weeks=1) if remember_me else timedelta(hours=1)
        )

        # 🔧 Возвращаем ФИО вместо только логина
        person = user.person
        return jsonify({
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "is_admin": person.emp_post.role.role == 'distribution' if person.emp_post else False,
                "fio": f"{person.surname} {person.name} {person.patro}".strip() if person else user.username  # ← ФИО
            }
        }), 200

    return jsonify({"error": "Invalid credentials"}), 401


@bp.route('/login-by-token', methods=['POST'])
def login_by_token():
    data = request.get_json()
    token = data.get('token')
    if not token:
        return jsonify({"error": "There's no token"}), 400
    params = {
        "ver": 1.0,
        "auth_code": token
    }
    req = get('https://lis.1502.moscow/api/auth.php', params=params, verify=True)
    if req.status_code != 200:
        return jsonify({"error": "Invalid token"}), 401
    username = req.json()['username']

    user = User.query.filter_by(username=username).first()
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=1)
    )

    person = user.person
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "is_admin": person.emp_post.role.role == 'distribution' if person.emp_post else False,
            "fio": f"{person.surname} {person.name} {person.patro}".strip() if person else user.username
        }
    }), 200