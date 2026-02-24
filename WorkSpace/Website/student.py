from flask import Blueprint, render_template, request, url_for, redirect, flash, jsonify
from flask_login import login_required, current_user
from .models import Course, Enrollment, CalendarEvent, User, Grade, Attendance
from . import db
from datetime import datetime

student_views = Blueprint('student_views', __name__)

@student_views.route('/student-dashboard')
@login_required
def dashboard():
    student_enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    total_courses = len(student_enrollments)
    total_attendance = 0
    if total_courses > 0:
        total_attendance = sum(e.attendance_rate for e in student_enrollments) / total_courses
        
    processed_courses = []
    for e in student_enrollments:
        # AI Risk Algorithm Thresholds
        if e.attendance_rate < 70 or e.current_grade < 65:
            risk_class = "status-badge status-danger"
            risk_text = "High Risk"
        elif e.attendance_rate < 85 or e.current_grade < 75:
            risk_class = "status-badge status-warn"
            risk_text = "Moderate"
        else:
            risk_class = "status-badge status-good"
            risk_text = "Low Risk"
            
        icon_text = e.course.course_code[:2].upper() if e.course.course_code else e.course.course_name[:2].upper()
        
        processed_courses.append({
            'course_name': e.course.course_name,
            'course_code': e.course.course_code,
            'attendance': round(e.attendance_rate, 1),
            'grade': round(e.current_grade, 1),
            'icon': icon_text,
            'target_class': risk_class,
            'target_text': risk_text
        })
        
    return render_template(
        "studenthomepage.html", 
        user=current_user, 
        courses=processed_courses,
        total_courses=total_courses,
        overall_attendance=round(total_attendance, 1)
    )

@student_views.route('/courses')
@login_required
def courses():
    # We pass the user's enrollments to the template so the dropdown menus work!
    enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    return render_template("courses.html", user=current_user, enrollments=enrollments)

@student_views.route('/calender')
@login_required
def calender():
    return render_template("calender.html", user=current_user)

@student_views.route('/settings')
@login_required
def settings():
    return render_template("settings.html", user=current_user)


# ==========================================
# ACTION ROUTES (Database Logic)
# ==========================================

@student_views.route('/enroll', methods=['POST'])
@login_required
def enroll():
    course_name = request.form.get('course_name')
    course_code = request.form.get('course_code')

    # Check if this course already exists globally, if not, create it
    course = Course.query.filter_by(course_code=course_code).first()
    if not course:
        course = Course(course_name=course_name, course_code=course_code)
        db.session.add(course)
        db.session.commit()

    # Prevent duplicate enrollments
    existing_enrollment = Enrollment.query.filter_by(user_id=current_user.id, course_id=course.id).first()
    if not existing_enrollment:
        new_enrollment = Enrollment(user_id=current_user.id, course_id=course.id)
        db.session.add(new_enrollment)
        db.session.commit()
        flash("Enrolled successfully!", "success")
    else:
        flash("You are already enrolled in this course.", "info")
        
    return redirect(url_for('student_views.courses'))


@student_views.route('/add-grade', methods=['POST'])
@login_required
def add_grade():
    enrollment_id = request.form.get('enrollment_id')
    enrollment = Enrollment.query.filter_by(id=enrollment_id, user_id=current_user.id).first()
    
    if enrollment:
        # Add the new grade
        new_grade = Grade(
            enrollment_id=enrollment.id,
            exam_name=request.form.get('exam_name'),
            score=float(request.form.get('score')),
            weight=float(request.form.get('weight')),
            date_recorded=datetime.strptime(request.form.get('date'), '%Y-%m-%d').date()
        )
        db.session.add(new_grade)
        
        # Recalculate the overall current_grade for this course
        all_grades = Grade.query.filter_by(enrollment_id=enrollment.id).all()
        total_weight = sum(g.weight for g in all_grades)
        
        if total_weight > 0:
            weighted_score_sum = sum(g.score * (g.weight / 100) for g in all_grades)
            # Normalize to 100% just in case weights don't perfectly equal 100 yet
            enrollment.current_grade = (weighted_score_sum / (total_weight / 100))
            
        db.session.commit()
        flash("Grade successfully added!", "success")
        
    return redirect(url_for('student_views.courses'))


@student_views.route('/add-attendance', methods=['POST'])
@login_required
def add_attendance():
    enrollment_id = request.form.get('enrollment_id')
    enrollment = Enrollment.query.filter_by(id=enrollment_id, user_id=current_user.id).first()
    
    if enrollment:
        # Add the attendance record
        new_attendance = Attendance(
            enrollment_id=enrollment.id,
            date=datetime.strptime(request.form.get('date'), '%Y-%m-%d').date(),
            status=request.form.get('status')
        )
        db.session.add(new_attendance)
        
        # Recalculate attendance rate
        all_attendance = Attendance.query.filter_by(enrollment_id=enrollment.id).all()
        if all_attendance:
            present_days = sum(1 for a in all_attendance if a.status == 'present')
            enrollment.attendance_rate = (present_days / len(all_attendance)) * 100
            
        db.session.commit()
        flash("Attendance recorded!", "success")
        
    return redirect(url_for('student_views.courses'))


@student_views.route('/update-settings', methods=['POST'])
@login_required
def update_settings():
    name = request.form.get('name')
    if name:
        current_user.first_name = name.split(' ')[0]
        if len(name.split(' ')) > 1:
            current_user.last_name = name.split(' ')[1]
            
    current_user.email = request.form.get('email')
    current_user.theme_preference = request.form.get('theme')
    
    db.session.commit()
    flash("Profile updated successfully!", "success")
    return redirect(url_for('student_views.settings'))


@student_views.route('/api/events', methods=['GET', 'POST'])
@login_required
def manage_events():
    if request.method == 'POST':
        data = request.json
        new_event = CalendarEvent(
            user_id=current_user.id,
            title=data['title'],
            event_date=datetime.strptime(data['date'], '%Y-%m-%d'),
            event_type=data['type']
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify({"status": "success"})

    events = CalendarEvent.query.filter_by(user_id=current_user.id).all()
    return jsonify([{"title": e.title, "date": e.event_date.strftime('%Y-%m-%d'), "type": e.event_type} for e in events])