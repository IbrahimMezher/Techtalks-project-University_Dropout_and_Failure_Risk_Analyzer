from flask import Blueprint, render_template, request, url_for, redirect, flash
from flask_login import login_required, current_user
from . import db

views = Blueprint('views', __name__)

@views.route('/home')
@login_required
def home():
    if not current_user.choose_role or not current_user.role:
        return redirect(url_for("views.choose"))
    
    if current_user.role == "student":
        return redirect(url_for("student_views.dashboard")) # Point to new Blueprint
    
    return redirect(url_for("views.instructor"))

@views.route('/')
def intro():
    if current_user.is_authenticated:
        return redirect(url_for("views.home"))
    return render_template("introductorypage.html")

@views.route('/settings')
@login_required
def settings():
    return render_template("settings.html", user=current_user)


@views.route('/Contact_us', methods=['GET', 'POST'])
def contact():
    if request.method == "POST":
        email = request.form.get("email")
        name = request.form.get("name")
        message = request.form.get("message")

        contact_us_function(email, message, name) 
        flash("Thank you for contacting us we'll reach back to you in 24 hours.")        
        return render_template("introductorypage.html")


@views.route('/instructor')
@login_required
def instructor():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))
    return render_template("instructorhomepage.html")


@views.route('/Choose', methods=['GET','POST'])
@login_required
def choose():
    if current_user.choose_role and current_user.role:
        return redirect(url_for("views.home"))
    
    if request.method == "POST":
        role = request.form.get("role")

        if role not in("student", "instructor"):
            flash("please choose between student and instructor", "error")
            return render_template("choose_role.html")
        
        current_user.role = role
        current_user.choose_role = True

        db.session.commit()
        return redirect(url_for("views.home"))
    return render_template("choose_role.html")
    
