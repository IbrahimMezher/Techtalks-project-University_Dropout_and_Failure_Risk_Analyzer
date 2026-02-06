<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
from flask import Blueprint, render_template, request, url_for
from flask_login import login_required
import smtplib
=======
from flask import Blueprint, render_template, request, url_for, redirect
from flask_login import login_required, current_user
>>>>>>> f2aaf76 (latest update)
=======
from flask import Blueprint, render_template, request, url_for, redirect,flash
from flask_login import login_required, current_user
from .emailer import contact_us_function
>>>>>>> f4e47a3 (added a main.css that can be used in each new .html)

views = Blueprint('views', __name__)


@views.route('/home')
@login_required
def home():
    return render_template("studenthomepage.html")


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
>>>>>>> ffbc0ce (test)
