from flask import Blueprint, render_template, request, url_for, redirect, flash, session
from flask_login import login_required, current_user
from datetime import datetime, timedelta

from .models import User, Course, Enrollment, StudentInvite, CalendarEvent
from . import db
from .emailer import send_student_invite

instructor = Blueprint('instructor', __name__)


def risk_bucket(attendance_rate: float, current_grade: float):
    """
    Simple, explainable rule-based risk:
    - High if attendance < 60 OR grade < 55
    - Medium if attendance < 75 OR grade < 70
    - Low otherwise
    """
    a = attendance_rate or 0.0
    g = current_grade or 0.0

    if a < 60 or g < 55:
        return ("High", "high")
    if a < 75 or g < 70:
        return ("Medium", "med")
    return ("Low", "low")


@instructor.route('/instructor')
@login_required
def instructor_log():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))

    enrolls = (
        db.session.query(Enrollment, User, Course)
        .join(User, Enrollment.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .all()
    )

    overview = []
    total_students_set = set()
    at_risk = 0
    critical = 0

    for en, u, c in enrolls:
        total_students_set.add(u.id)

        risk_label, risk_class = risk_bucket(en.attendance_rate, en.current_grade)
        if risk_class == "med":
            at_risk += 1
        elif risk_class == "high":
            critical += 1

        overview.append({
            "student_name": f"{u.first_name} {u.last_name}".strip(),
            "course_name": c.course_name,
            "attendance_rate": en.attendance_rate,
            "current_grade": en.current_grade,
            "risk_label": risk_label,
            "risk_class": risk_class
        })

    risk_order = {"high": 0, "med": 1, "low": 2}
    overview.sort(key=lambda r: (risk_order.get(r["risk_class"], 9), r["attendance_rate"], r["current_grade"]))
    overview = overview[:12]

    totals = {
        "total_students": len(total_students_set),
        "at_risk": at_risk,
        "critical": critical
    }

    return render_template(
        "instructorhomepage.html",
        totals=totals,
        overview=overview,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        active_page="dashboard"
    )


@instructor.route('/Instructor_students')
@login_required
def ins_students():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))

    q = request.args.get("q", "").strip().lower()
    risk = request.args.get("risk", "").strip().lower()  # low/med/high

    enrolls = (
        db.session.query(Enrollment, User, Course)
        .join(User, Enrollment.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .all()
    )

    rows = []
    total_students_set = set()
    at_risk = 0
    critical = 0

    for en, u, c in enrolls:
        total_students_set.add(u.id)

        risk_label, risk_class = risk_bucket(en.attendance_rate, en.current_grade)
        if risk_class == "med":
            at_risk += 1
        elif risk_class == "high":
            critical += 1

        student_name = f"{u.first_name} {u.last_name}".strip()
        email = u.email or ""

        if q:
            hay = f"{student_name} {email}".lower()
            if q not in hay:
                continue
        if risk and risk != risk_class:
            continue

        rows.append({
            "student_name": student_name,
            "email": email,
            "course_name": c.course_name,
            "attendance_rate": en.attendance_rate,
            "current_grade": en.current_grade,
            "risk_label": risk_label,
            "risk_class": risk_class
        })

    risk_order = {"high": 0, "med": 1, "low": 2}
    rows.sort(key=lambda r: (risk_order.get(r["risk_class"], 9), r["student_name"]))

    totals = {
        "total_students": len(total_students_set),
        "at_risk": at_risk,
        "critical": critical
    }

    courses = Course.query.order_by(Course.course_name.asc()).all()

    return render_template(
        "instructor_students.html",
        rows=rows,
        totals=totals,
        q=q,
        risk=risk,
        courses=courses,
        active_page="students"
    )


@instructor.route('/reports')
@login_required
def reports():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))

    enrolls = (
        db.session.query(Enrollment, User, Course)
        .join(User, Enrollment.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .all()
    )

    by_course = {}
    critical_list = []

    for en, u, c in enrolls:
        risk_label, risk_class = risk_bucket(en.attendance_rate, en.current_grade)

        key = c.id
        if key not in by_course:
            by_course[key] = {"course_name": c.course_name, "total": 0, "high": 0}
        by_course[key]["total"] += 1

        if risk_class == "high":
            by_course[key]["high"] += 1
            critical_list.append({
                "student_name": f"{u.first_name} {u.last_name}".strip(),
                "course_name": c.course_name
            })

    courses_report = []
    for _, v in by_course.items():
        total = v["total"] or 1
        high_pct = (v["high"] / total) * 100.0
        courses_report.append({**v, "high_pct": high_pct})

    courses_report.sort(key=lambda x: (-x["high_pct"], -x["high"], x["course_name"]))
    critical_list = critical_list[:8]

    events = (
        CalendarEvent.query
        .order_by(CalendarEvent.event_date.asc())
        .limit(6)
        .all()
    )

    return render_template(
        "reports.html",
        courses=courses_report,
        critical_list=critical_list,
        events=events,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        active_page="reports"
    )


@instructor.route('/instructor_settings')
@login_required
def settings():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))

    tab = request.args.get("tab", "profile") 
    return render_template("settings_instructor.html", active_page="settings", tab=tab)

@instructor.route('/update-settings', methods=['POST'])
@login_required
def update_settings():
    name = (request.form.get('name') or "").strip()
    theme = (request.form.get('theme') or "light").strip()

    if name:
        parts = name.split()
        current_user.first_name = parts[0]
        current_user.last_name = parts[1] if len(parts) > 1 else ""

    current_user.theme_preference = theme if theme in ("light", "dark") else "light"

    db.session.commit()
    flash("Profile updated successfully!", "success")
    return redirect(url_for('instructor.settings'))

@instructor.route('/invite-student', methods=['POST'])
@login_required
def invite_student():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))

    student_email = (request.form.get("student_email") or "").strip().lower()
    course_id = (request.form.get("course_id") or "").strip()

    if not student_email:
        flash("Please enter a student email.", "error")
        return redirect(url_for("instructor.ins_students"))

    token = StudentInvite.make_token()
    invite = StudentInvite(
        instructor_id=current_user.id,
        student_email=student_email,
        course_id=int(course_id) if course_id else None,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=3)
    )
    db.session.add(invite)
    db.session.commit()

    accept_link = url_for('instructor.accept_invite', token=token, _external=True)

    course_name = None
    if invite.course_id:
        c = Course.query.get(invite.course_id)
        course_name = c.course_name if c else None

    instructor_name = f"{current_user.first_name} {current_user.last_name}".strip()

    send_student_invite(
        to_email=student_email,
        invite_link=accept_link,
        instructor_name=instructor_name,
        course_name=course_name
    )

    flash("Invite sent successfully!", "success")
    return redirect(url_for("instructor.ins_students"))


@instructor.route('/accept-invite/<token>')
def accept_invite(token):
    invite = StudentInvite.query.filter_by(token=token).first()

    if not invite:
        return render_template(
            "invite_result.html",
            ok=False,
            title="Invalid Invitation",
            message="This invitation link is not valid."
        )

    if invite.accepted:
        return render_template(
            "invite_result.html",
            ok=True,
            title="Invitation Already Accepted",
            message="This invitation has already been accepted."
        )

    if invite.expires_at < datetime.utcnow():
        return render_template(
            "invite_result.html",
            ok=False,
            title="Invitation Expired",
            message="This invitation link has expired."
        )

  
    if not current_user.is_authenticated:
        session["pending_invite_token"] = token
        return redirect(url_for("auth.login"))


    if current_user.role != "student":
        return render_template(
            "invite_result.html",
            ok=False,
            title="Wrong Account Type",
            message="Please log in with a student account to accept this invite."
        )

    if (current_user.email or "").lower() != invite.student_email.lower():
        return render_template(
            "invite_result.html",
            ok=False,
            title="Email Mismatch",
            message="This invite was sent to a different email address."
        )

    instructor_user = User.query.get(invite.instructor_id)
    course = Course.query.get(invite.course_id) if invite.course_id else None

    if course:
        existing = Enrollment.query.filter_by(user_id=current_user.id, course_id=course.id).first()
        if not existing:
            db.session.add(Enrollment(user_id=current_user.id, course_id=course.id))

    invite.accepted = True
    invite.accepted_at = datetime.utcnow()
    db.session.commit()

    return render_template(
        "invite_result.html",
        ok=True,
        title="You're Added!",
        message="You have been added successfully.",
        instructor_name=f"{instructor_user.first_name} {instructor_user.last_name}".strip() if instructor_user else "Instructor",
        course_name=(course.course_name if course else None)
    )