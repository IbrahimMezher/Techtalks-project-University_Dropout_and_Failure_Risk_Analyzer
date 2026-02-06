from flask import Blueprint, render_template, request, url_for, redirect
from flask_login import login_required, current_user

views = Blueprint('views', __name__)


@views.route('/home')
@login_required
def home():
    return render_template("homepage.html")


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
    return render_template("introductorypage.html")
