from flask_login import UserMixin
from . import db

#hek bet3arfo db howe class bil python)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30))
    last_name = db.Column(db.String(30))
    email = db.Column(db.String(70), unique=True)
    password = db.Column(db.String(200))
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    email_otp_hash = db.Column(db.String(255), nullable=True)
    email_otp_expires_at = db.Column(db.DateTime, nullable=True)
    role = db.Column(db.String(255), nullable=True)
    choose_role = db.Column(db.Boolean,default=False,nullable=False)



class courses(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    course_description = db.Column(db.Text, nullable=False)
    course_price = db.Column(db.Float, nullable=False)
    course_image = db.Column(db.String(255), nullable=True)

class instructor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    course_description = db.Column(db.Text, nullable=False)
    course_price = db.Column(db.Float, nullable=False)
    course_image = db.Column(db.String(255), nullable=True)