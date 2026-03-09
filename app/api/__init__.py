from flask import Blueprint
from .auth import bp as auth_bp
from .admin import bp as admin_bp
from .student import bp as student_bp
from .admin_exam_results import bp as admin_exam_results_bp

api = Blueprint('api', __name__, url_prefix='/api')

api.register_blueprint(auth_bp)
api.register_blueprint(admin_bp)
api.register_blueprint(student_bp)
api.register_blueprint(admin_exam_results_bp)