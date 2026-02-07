from flask import Blueprint, render_template, request, url_for, redirect,flash
from flask_login import login_required, current_user
from .emailer import contact_us_function
from . import db

views = Blueprint('views', __name__)


@views.route('/home')
@login_required
def home():
    if not current_user.choose_role or not current_user.role:
     return redirect(url_for("views.choose"))
    
    if current_user.role == "student":
       return redirect(url_for("views.student"))
    
    return redirect(url_for("views.instructor"))


@views.route('/', methods=['GET', 'POST'])
def intro():
    #ana zedta la eza wahad ken kebes remember me mante2eyan min el cookies bas yerja3 yfoot law
    #sho ma kabas lezem ye5do 3al homepage fa fi feature bil flask login bas ta3mel login_user()
    #beseer 3ndak current_user w b2alba function is authenticated ya true ya false(zedta 3al login/signup route)
    if current_user.is_authenticated:
        return redirect(url_for("views.home"))
    return render_template("introductorypage.html")


@views.route('/Contact_us', methods=['GET', 'POST'])
def contact():
  if request.method == "POST":
    email = request.form.get("email")
    name = request.form.get("name")
    message = request.form.get("message")

    contact_us_function(email,message,name) 
    flash("Thank you for contacting us we'll reach back to you in 24 hours.")         
    return render_template("introductorypage.html")


@views.route('/student')
@login_required
def student():
     if current_user.role != "student":
        return redirect(url_for("views.home"))
     return render_template("studenthomepage.html")

@views.route('/instructor')
@login_required
def instructor():
    if current_user.role != "instructor":
        return redirect(url_for("views.home"))
    return render_template("instructorhomepage.html")

@views.route('/Choose',methods=['GET','POST'])
@login_required
def choose():
    if current_user.choose_role and current_user.role:
      return redirect(url_for("views.home"))
    
    if request.method =="POST":
       role = request.form.get("role")

       if role not in("student","instructor"):
          flash("please choose between student and instructor","error")
          return render_template("choose_role.html")
       
       current_user.role = role
       current_user.choose_role =True

       db.session.commit()
       return redirect(url_for("views.home"))
    return render_template("choose_role.html")
