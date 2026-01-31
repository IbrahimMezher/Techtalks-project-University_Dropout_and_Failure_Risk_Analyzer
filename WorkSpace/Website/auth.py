from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_login import login_user,logout_user,login_required
from .home import views
from .models import User
from .import db
from werkzeug.security import generate_password_hash,check_password_hash



auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
       email=request.form.get("email", "").strip().lower()
       password = request.form.get("password","")
       
       user = User.query.filter_by(email =email).first()
       if not user or not check_password_hash(user.password,password):
           flash("Email or Password are wrong","error")
           return render_template("login.html")
       
       
        
       login_user(user)
       return redirect(url_for("views.home"))
       
    return render_template("login.html")
       
import re
@auth.route('/signup', methods=['GET', 'POST'])
def sign_up():
    if request.method == "POST":
         email=request.form.get("email", "").strip().lower()
         password1 = request.form.get("password1","")
         password2 = request.form.get("password2","")
         first_name = request.form.get("first_name","").strip()
         last_name = request.form.get("last_name","").strip()

         
         if len(password1)<8 or not re.search(r"[A-Z]",password1) or not re.search(r"[!@#$%^&*(),.?\/-_:{}<>]",password1):
          flash("Password should be greater than 7, have at least 1 uppercase, and 1 special character","error")
          return render_template("signup.html")
         
         if password1 != password2:
            flash("Passwords dont match","error")
            return render_template("signup.html")
         
         user = User.query.filter_by(email =email).first()

         if user:
            flash("Email Exists please use a different one","error")
            return render_template("signup.html")
         
         newuser = User(first_name=first_name,last_name=last_name,email = email,password= generate_password_hash(password1))
         db.session.add(newuser)
         db.session.commit()
         return redirect(url_for("auth.login"))
    
    return render_template("signup.html")
@auth.route("/logout")
@login_required
def logout():
   logout_user()
   return redirect(url_for("views.intro"))