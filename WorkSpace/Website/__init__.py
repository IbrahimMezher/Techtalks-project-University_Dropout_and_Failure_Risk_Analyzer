from flask import Flask
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

load_dotenv()


db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///database.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    from datetime import timedelta
    #time la tdal remembered fik t7ot le badak ye
    #cookies hene feena ne3teber saved data jowa pc aw laptop
    app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=int(os.getenv("REMEMBER_COOKIE_DAYS", "2")))
    app.config["REMEMBER_COOKIE_SECURE"] = os.getenv("REMEMBER_COOKIE_SECURE", "false").lower() == "true"
    app.config["REMEMBER_COOKIE_HTTPONLY"] = True
    app.config["REMEMBER_COOKIE_SAMESITE"] = os.getenv("REMEMBER_COOKIE_SAMESITE", "Lax")
    
    db.init_app(app)

    from .models import User
    
    #hay btosta3mel la na3mel shi ktir mhm le howe login_required
    # (hay btosta3mal la ma ye2dar yfoot 3al home 8er ma ya3mel el user login)
    login_manager = LoginManager()
    login_manager.login_view = "auth.login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from .home import views
    from .auth import auth
    from .student import student_views
    from .instructor import instructor

    app.register_blueprint(views, url_prefix="/")
    app.register_blueprint(auth, url_prefix="/")
    app.register_blueprint(student_views, url_prefix="/")
    app.register_blueprint(instructor, url_prefix="/")
    
     #hon le na3mel local db eza ma ken mawjood
    with app.app_context():
        db.create_all()
    
    return app


