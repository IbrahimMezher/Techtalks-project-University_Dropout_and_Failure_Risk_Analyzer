
<<<<<<< HEAD
=======



db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = "FEWHUWFHUBCDFSGWWQM93648F"
    #hek 3arafna local db bas nent2el la mar7ale akbar se3eta ba3mlo URL
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    from datetime import timedelta
    #time la tdal remembered fik t7ot le badak ye
    #cookies hene feena ne3teber saved data jowa pc aw laptop
    app.config['REMEMBER_COOCKIE_DURATION'] = timedelta(days=2)
    #aymata fi browser yeb3at cookie eza false 3al local host eza true 3al https://
    app.config['REMEMBER_COOCKIE_SECURE'] = False
    #protection la2ano metel ma fi sql injection fi XSS injection 3aber js fa bnesta3mel hay la ma ye2dar 
    app.config['REMEMBER_COOCKIE_HTTPONLY'] = True
    
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

    app.register_blueprint(views, url_prefix="/")
    app.register_blueprint(auth, url_prefix="/")

     #hon le na3mel local db eza ma ken mawjood
    with app.app_context():
        db.create_all()
    
    return app


>>>>>>> f2aaf76 (latest update)
