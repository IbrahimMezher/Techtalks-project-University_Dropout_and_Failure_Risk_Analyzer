from flask import Blueprint, render_template, request, url_for, redirect, flash, jsonify
from flask_login import login_required, current_user
from .models import Course, Enrollment, CalendarEvent, User, Grade, Attendance, StudentInvite
from . import db
from datetime import datetime, timedelta

student_views = Blueprint('student_views', __name__)

@student_views.route('/student-dashboard')
@login_required
def dashboard():

    student_enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    total_courses = len(student_enrollments)

    total_attendance = 0
    if total_courses > 0:
        total_attendance = sum(e.attendance_rate for e in student_enrollments) / total_courses

    instructor_by_course = {}
    if current_user.email:
        accepted_invites = (
            StudentInvite.query
            .filter_by(student_email=current_user.email, accepted=True)
            .order_by(StudentInvite.accepted_at.desc())
            .all()
        )
        for inv in accepted_invites:
            if inv.course_id and inv.course_id not in instructor_by_course:
                inst = User.query.get(inv.instructor_id)
                if inst:
                    instructor_by_course[inv.course_id] = f"{inst.first_name} {inst.last_name}".strip()

    processed_courses = []
    for e in student_enrollments:
        if e.attendance_rate < 70 or e.current_grade < 65:
            risk_class = "status-badge status-danger"
            risk_text = "High Risk"
        elif e.attendance_rate < 85 or e.current_grade < 75:
            risk_class = "status-badge status-warn"
            risk_text = "Moderate"
        else:
            risk_class = "status-badge status-good"
            risk_text = "Low Risk"

        icon_text = (e.course.course_code[:2].upper() if e.course.course_code else e.course.course_name[:2].upper())
        instructor_name = instructor_by_course.get(e.course_id, "Not assigned")

        processed_courses.append({
            "course_name": e.course.course_name,
            "course_code": e.course.course_code,
            "attendance": round(e.attendance_rate, 1),
            "grade": round(e.current_grade, 1),
            "icon": icon_text,
            "instructor": instructor_name,
            "target_class": risk_class,
            "target_text": risk_text,
        })

    today = datetime.utcnow().date()
    end = today + timedelta(days=7)

    upcoming = (
        CalendarEvent.query
        .filter(CalendarEvent.user_id == current_user.id)
        .filter(CalendarEvent.event_date >= datetime(today.year, today.month, today.day))
        .filter(CalendarEvent.event_date < datetime(end.year, end.month, end.day))
        .order_by(CalendarEvent.event_date.asc())
        .limit(8)
        .all()
    )

    upcoming_events = [{
        "title": e.title,
        "date": e.event_date.strftime("%Y-%m-%d"),
        "pretty": e.event_date.strftime("%b %d"),
        "type": e.event_type or "Deadline"
    } for e in upcoming]

    return render_template(
        "studenthomepage.html",
        user=current_user,
        courses=processed_courses,
        total_courses=total_courses,
        overall_attendance=round(total_attendance, 1),
        upcoming_events=upcoming_events,
        active_page="dashboard"
    )

@student_views.route('/courses')
@login_required
def courses():
    enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    return render_template("courses.html", user=current_user, enrollments=enrollments, active_page="courses")

@student_views.route('/calender')
@login_required
def calender():
    return render_template("calender.html", user=current_user, active_page="calendar")

@student_views.route('/student_settings')
@login_required
def student_settings():
    tab = (request.args.get("tab") or "profile").strip().lower()

    print("RAW TAB FROM URL:", request.args.get("tab"))
    print("FINAL TAB VALUE:", tab)

    if tab not in ("profile", "notifications", "security"):
        print("TAB INVALID — RESETTING TO PROFILE")
        tab = "profile"

    return render_template(
        "settings.html",
        user=current_user,
        active_page="settings",
        tab=tab
    )


@student_views.route('/enroll', methods=['POST'])
@login_required
def enroll():
    course_name = request.form.get('course_name')
    course_code = request.form.get('course_code')

    course = Course.query.filter_by(course_code=course_code).first()
    if not course:
        course = Course(course_name=course_name, course_code=course_code)
        db.session.add(course)
        db.session.commit()

    existing = Enrollment.query.filter_by(user_id=current_user.id, course_id=course.id).first()
    if not existing:
        db.session.add(Enrollment(user_id=current_user.id, course_id=course.id))
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
        new_grade = Grade(
            enrollment_id=enrollment.id,
            exam_name=request.form.get('exam_name'),
            score=float(request.form.get('score')),
            weight=float(request.form.get('weight')),
            date_recorded=datetime.strptime(request.form.get('date'), '%Y-%m-%d').date()
        )
        db.session.add(new_grade)

        all_grades = Grade.query.filter_by(enrollment_id=enrollment.id).all()
        total_weight = sum(g.weight for g in all_grades)
        if total_weight > 0:
            weighted_sum = sum(g.score * (g.weight / 100) for g in all_grades)
            enrollment.current_grade = (weighted_sum / (total_weight / 100))

        db.session.commit()
        flash("Grade successfully added!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/add-attendance', methods=['POST'])
@login_required
def add_attendance():
    enrollment_id = request.form.get('enrollment_id')
    enrollment = Enrollment.query.filter_by(id=enrollment_id, user_id=current_user.id).first()

    if enrollment:
        new_attendance = Attendance(
            enrollment_id=enrollment.id,
            date=datetime.strptime(request.form.get('date'), '%Y-%m-%d').date(),
            status=request.form.get('status')
        )
        db.session.add(new_attendance)

        all_att = Attendance.query.filter_by(enrollment_id=enrollment.id).all()
        if all_att:
            present_days = sum(1 for a in all_att if a.status == 'present')
            enrollment.attendance_rate = (present_days / len(all_att)) * 100

        db.session.commit()
        flash("Attendance recorded!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/edit-enrollment', methods=['POST'])
@login_required
def edit_enrollment():
    enrollment_id = request.form.get('enrollment_id')
    enrollment = Enrollment.query.filter_by(id=enrollment_id, user_id=current_user.id).first()

    if enrollment:
        course_name = request.form.get('course_name')
        course_code = request.form.get('course_code')
        
        enrollment.course.course_name = course_name
        enrollment.course.course_code = course_code
        db.session.commit()
        flash("Enrollment updated successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/delete-enrollment', methods=['POST'])
@login_required
def delete_enrollment():
    enrollment_id = request.form.get('enrollment_id')
    enrollment = Enrollment.query.filter_by(id=enrollment_id, user_id=current_user.id).first()

    if enrollment:
        db.session.delete(enrollment)
        db.session.commit()
        flash("Enrollment deleted successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/edit-attendance', methods=['POST'])
@login_required
def edit_attendance():
    attendance_id = request.form.get('attendance_id')
    attendance = Attendance.query.get(attendance_id)

    if attendance:
        enrollment = Enrollment.query.filter_by(id=attendance.enrollment_id, user_id=current_user.id).first()
        if enrollment:
            attendance.date = datetime.strptime(request.form.get('date'), '%Y-%m-%d').date()
            attendance.status = request.form.get('status')
            
            all_att = Attendance.query.filter_by(enrollment_id=enrollment.id).all()
            if all_att:
                present_days = sum(1 for a in all_att if a.status == 'present')
                enrollment.attendance_rate = (present_days / len(all_att)) * 100
            
            db.session.commit()
            flash("Attendance updated successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/delete-attendance', methods=['POST'])
@login_required
def delete_attendance():
    attendance_id = request.form.get('attendance_id')
    attendance = Attendance.query.get(attendance_id)

    if attendance:
        enrollment = Enrollment.query.filter_by(id=attendance.enrollment_id, user_id=current_user.id).first()
        if enrollment:
            db.session.delete(attendance)
            
            all_att = Attendance.query.filter_by(enrollment_id=enrollment.id).all()
            if all_att:
                present_days = sum(1 for a in all_att if a.status == 'present')
                enrollment.attendance_rate = (present_days / len(all_att)) * 100
            else:
                enrollment.attendance_rate = 0
            
            db.session.commit()
            flash("Attendance deleted successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/edit-grade', methods=['POST'])
@login_required
def edit_grade():
    grade_id = request.form.get('grade_id')
    grade = Grade.query.get(grade_id)

    if grade:
        enrollment = Enrollment.query.filter_by(id=grade.enrollment_id, user_id=current_user.id).first()
        if enrollment:
            grade.exam_name = request.form.get('exam_name')
            grade.score = float(request.form.get('score'))
            grade.weight = float(request.form.get('weight'))
            grade.date_recorded = datetime.strptime(request.form.get('date'), '%Y-%m-%d').date()
            
            all_grades = Grade.query.filter_by(enrollment_id=enrollment.id).all()
            total_weight = sum(g.weight for g in all_grades)
            if total_weight > 0:
                weighted_sum = sum(g.score * (g.weight / 100) for g in all_grades)
                enrollment.current_grade = (weighted_sum / (total_weight / 100))
            
            db.session.commit()
            flash("Grade updated successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/delete-grade', methods=['POST'])
@login_required
def delete_grade():
    grade_id = request.form.get('grade_id')
    grade = Grade.query.get(grade_id)

    if grade:
        enrollment = Enrollment.query.filter_by(id=grade.enrollment_id, user_id=current_user.id).first()
        if enrollment:
            db.session.delete(grade)
            
            all_grades = Grade.query.filter_by(enrollment_id=enrollment.id).all()
            if all_grades:
                total_weight = sum(g.weight for g in all_grades)
                if total_weight > 0:
                    weighted_sum = sum(g.score * (g.weight / 100) for g in all_grades)
                    enrollment.current_grade = (weighted_sum / (total_weight / 100))
            else:
                enrollment.current_grade = 0
            
            db.session.commit()
            flash("Grade deleted successfully!", "success")

    return redirect(url_for('student_views.courses'))

@student_views.route('/update-settings', methods=['POST'])
@login_required
def update_settings():
   
    name = (request.form.get("name") or "").strip()
    theme = (request.form.get("theme") or "light").strip()

    if name:
        parts = name.split()
        current_user.first_name = parts[0]
        current_user.last_name = parts[1] if len(parts) > 1 else ""

    current_user.theme_preference = theme if theme in ("light", "dark") else "light"

    db.session.commit()
    flash("Profile updated successfully!", "success")
    return redirect(url_for('student_views.settings', tab="profile"))

@student_views.route('/api/events', methods=['GET', 'POST'])
@login_required
def manage_events():
    if request.method == 'POST':
        data = request.json
        new_event = CalendarEvent(
            user_id=current_user.id,
            title=data['title'],
            event_date=datetime.strptime(data['date'], '%Y-%m-%d'),
            event_type=data.get('type', 'Deadline')
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify({"status": "success"})

    
    events_list = []

    
    manual_events = CalendarEvent.query.filter_by(user_id=current_user.id).all()
    for e in manual_events:
        events_list.append({
            "id": e.id,
            "title": e.title,
            "date": e.event_date.strftime('%Y-%m-%d'),
            "type": e.event_type,
            "is_manual": True
        })

    
    enrollments = Enrollment.query.filter_by(user_id=current_user.id).all()
    for enr in enrollments:
        course_name = enr.course.course_name if enr.course else "Course"

       
        for g in enr.grades:
            if g.date_recorded:
                events_list.append({
                    "id": None,
                    "title": f"{course_name} - {g.exam_name}",
                    "date": g.date_recorded.strftime('%Y-%m-%d'),
                    "type": "Exam",
                    "is_manual": False
                })

        
        for a in enr.attendance_records:
            if a.date:
                events_list.append({
                    "id": None,
                    "title": f"{course_name} - {a.status}",
                    "date": a.date.strftime('%Y-%m-%d'),
                    "type": "Attendance",
                    "is_manual": False
                })

    return jsonify(events_list)

@student_views.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
@login_required
def modify_event(event_id):
    event = CalendarEvent.query.get_or_404(event_id)
    if event.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == 'DELETE':
        db.session.delete(event)
        db.session.commit()
        return jsonify({"status": "deleted"})

    if request.method == 'PUT':
        data = request.json
        event.title = data.get('title', event.title)
        if 'date' in data:
            event.event_date = datetime.strptime(data['date'], '%Y-%m-%d')
        event.event_type = data.get('type', event.event_type)
        db.session.commit()
        return jsonify({"status": "updated"})