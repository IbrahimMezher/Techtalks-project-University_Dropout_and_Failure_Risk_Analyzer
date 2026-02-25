from flask_login import UserMixin
from . import db
from datetime import datetime
import secrets
from datetime import datetime, timedelta

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
    choose_role = db.Column(db.Boolean, default=False, nullable=False)
    theme_preference = db.Column(db.String(10), default='light') 

    enrollments = db.relationship('Enrollment', backref='student', lazy=True)
    events = db.relationship('CalendarEvent', backref='user', lazy=True)
    
    pending_email = db.Column(db.String(70), nullable=True)
    pending_email_verified = db.Column(db.Boolean, default=False, nullable=False)
class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_name = db.Column(db.String(100), nullable=False)
    course_code = db.Column(db.String(20), unique=True)
    enrollments = db.relationship('Enrollment', backref='course', lazy=True)

class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    
    attendance_rate = db.Column(db.Float, default=100.0)
    current_grade = db.Column(db.Float, default=0.0)

    grades = db.relationship('Grade', backref='enrollment', lazy=True, cascade="all, delete-orphan")
    attendance_records = db.relationship('Attendance', backref='enrollment', lazy=True, cascade="all, delete-orphan")


class Grade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollment.id'), nullable=False)
    exam_name = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False)      
    weight = db.Column(db.Float, nullable=False)     
    date_recorded = db.Column(db.Date, nullable=True)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollment.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False) 

class CalendarEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    event_date = db.Column(db.DateTime, nullable=False)
    event_type = db.Column(db.String(50))

class StudentInvite(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    student_email = db.Column(db.String(70), nullable=False)

    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=True)

    token = db.Column(db.String(200), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)

    accepted = db.Column(db.Boolean, default=False, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    @staticmethod
    def make_token():
        return secrets.token_urlsafe(32)