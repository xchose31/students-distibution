import os
from flask import Flask
from app.config import config
from app.extensions import init_extensions
from flask_cors import CORS


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    CORS(app)

    # 1. Инициализация расширений (db, login_manager)
    init_extensions(app)

    # 2. Импорт моделей (регистрация метаданных)
    # Импортируем здесь, чтобы избежать циклических зависимостей
    from app.models import user  # noqa: F401

    register_blueprints(app)

    return app


def register_blueprints(app):
    from app.api import api as api_bp

    app.register_blueprint(api_bp)