import re
from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_login import login_user, logout_user, login_required,current_user
from .home import views
from .models import User
from .import db
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import datetime, timedelta
from .emailer import send_verify_otp, send_reset_link
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app


auth = Blueprint('auth', __name__)

# random otp being generated of 6 digits


def _make_otp():
    return str(secrets.randbelow(900000) + 100000)

# min el esem el ases la na3mel otp(one time pass ex:000765)


def issue_email_otp(user, minutes=15):
    otp = _make_otp()
    user.email_otp_hash = generate_password_hash(otp)
    # lezem dayman nkoon hateen time limit
    user.email_otp_expires_at = datetime.utcnow() + timedelta(minutes=minutes)
    db.session.commit()
    send_verify_otp(user.email, otp, minutes_valid=minutes)


def check_email_otp(user, otp_input: str) -> bool:
    # hek esmon bil db w hay is used ex otp 8alat aw expirey mara2 aw eza sa7 w akid eza raja3 true ya3ne meshe hala
    if not user.email_otp_hash or not user.email_otp_expires_at:
        return False
    if datetime.utcnow() > user.email_otp_expires_at:
        return False
    return check_password_hash(user.email_otp_hash, otp_input)

#####################################################################################


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
           return redirect(url_for("views.home"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        remember = True if request.form.get("remember") else False
       
        
        user = User.query.filter_by(email=email).first()

        if not user or not check_password_hash(user.password, password):
            flash("Email or Password are wrong", "error1")
            return render_template("login.html")

        if not user.email_verified:
            flash("Please verify your email first.", "error")
            return redirect(url_for("auth.verify_email", email=user.email))
        #flask login b2alba hay built in
        login_user(user,remember=remember)
        if not user.choose_role or not user.role:
         return redirect(url_for("views.choose"))
        
        return redirect(url_for("views.home"))

    return render_template("login.html")

#####################################################################################


@auth.route('/signup', methods=['GET', 'POST'])
def sign_up():
    if current_user.is_authenticated:
           return redirect(url_for("views.home"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password1 = request.form.get("password1", "")
        password2 = request.form.get("password2", "")
        first_name = request.form.get("first_name", "").strip()
        last_name = request.form.get("last_name", "").strip()

        user = User.query.filter_by(email=email).first()

        if user:
            flash("Email Exists please use a different one", "error4")
            return render_template("signup.html")

        if len(password1) < 8 or not re.search(r"[A-Z]", password1) or not re.search(r"[!@#$%^&*(),.?\/-_:{}<>]", password1):
            flash("Password should be greater than 7, have at least 1 uppercase, and 1 special character", "error2")
            return render_template("signup.html")

        if password1 != password2:
            flash("Passwords dont match", "error3")
            return render_template("signup.html")

        newuser = User(first_name=first_name, last_name=last_name,
                       email=email, password=generate_password_hash(password1))
        # bedoon hay law add ma t3abe bil User mashi ha yfoot 3al db .add w .commit
        db.session.add(newuser)
        db.session.commit()
        issue_email_otp(newuser, minutes=15)
        flash("We sent a verification code to your email.", "success")
        return redirect(url_for("auth.verify_email", email=newuser.email))
            
    return render_template("signup.html")

#####################################################################################


@auth.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("views.intro"))

#####################################################################################


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
  # serializes the email link example /reset_password bbbbbbskckswkd kermel ma yfoot 3laya ayya wahad


@auth.route("/reset-password", methods=["GET", "POST"])
def reset_password_request():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        user = User.query.filter_by(email=email).first()

        if user:
            token = _serializer().dumps(email, salt="reset-password")
            send_reset_link(email, token)

        flash("If that email exists, a reset link was sent.", "success")
        return redirect(url_for("auth.login"))

    return render_template("resetpassword.html")


@auth.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password_token(token):
    try:
        email = _serializer().loads(token, salt="reset-password", max_age=60 *30) 
         # bekel basata time total ta3oola howe 30 minutes
    except SignatureExpired:  # these two are built in services in itsdangerous
        flash("Reset link expired. Please request a new one.", "error")
        return redirect(url_for("auth.reset_password_request"))
        # as seen simply eza it got expired
    except BadSignature:
        flash("Reset link is invalid. Please request a new one.", "error")
        return redirect(url_for("auth.reset_password_request"))
        # as seen simply eza the link didnt work bet2ool lal user
    user = User.query.filter_by(email=email).first()
    if not user:
        flash("User not found. Please request a new reset link.", "error")
        return redirect(url_for("auth.reset_password_request"))

    if request.method == "POST":
        pw1 = request.form.get("password1", "")
        pw2 = request.form.get("password2", "")

        if pw1 != pw2:
            flash("Passwords don't match.", "error")
            return render_template("reset_password_form.html")

        if len(pw1) < 8 or not re.search(r"[A-Z]", pw1) or not re.search(r"[!@#$%^&*(),.?\/-_:{}<>]", pw1):
            flash(
                "Password should be greater than 7, have at least 1 uppercase, and 1 special character", "error")
            return render_template("reset_password_form.html")

        user.password = generate_password_hash(pw1)
        db.session.commit()

        flash("Password updated. Please login.", "success")
        return redirect(url_for("auth.login"))

    return render_template("reset_password_form.html")
#####################################################################################
# verify it has two verify email and if resend code is used


@auth.route("/verify-email", methods=["GET", "POST"])
def verify_email():
    # we used args not.form la2ano badna ye ye2ra min url email ade besewe
    email = request.args.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()

    # verification 3adeye
    if not user:
        flash("User not found.", "error")
        return redirect(url_for("auth.sign_up"))

    if user.email_verified:
        flash("Email already verified. Please login.", "success")
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        code = request.form.get("code", "").strip()

        if not check_email_otp(user, code):
            flash("Invalid or expired code.", "error")
            return render_template("verify_email.html", email=email)

        user.email_verified = True
        user.email_verified_at = datetime.utcnow()
        user.email_otp_hash = None
        user.email_otp_expires_at = None
        db.session.commit()

        flash("Email verified! You can login now.", "success")
        return redirect(url_for("auth.login"))

    return render_template("verify_email.html", email=email)


@auth.route("/verify-email/resend")
def resend_verify_email():
    email = request.args.get("email", "").strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user:
        flash("User not found.", "error")
        return redirect(url_for("auth.sign_up"))

    if user.email_verified:
        flash("Email already verified.", "success")
        return redirect(url_for("auth.login"))

    # function shara7ta fo2  bnesta3mela hol ( la teb3at el otp)
    issue_email_otp(user, minutes=15)

    flash("Verification code resent.", "success")
    return redirect(url_for("auth.verify_email", email=email))
