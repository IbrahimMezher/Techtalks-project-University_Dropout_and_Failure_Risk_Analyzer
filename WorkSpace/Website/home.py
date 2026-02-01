from flask import Blueprint, render_template, request, url_for
from flask_login import login_required
import smtplib

views = Blueprint('views', __name__)


@views.route('/home')
@login_required
def home():
    return render_template("homepage.html")


@views.route('/', methods=['GET', 'POST'])
def intro():
    return render_template("introductorypage.html")


@views.route('/Contact_us', methods=['GET', 'POST'])
def contact():
    return render_template("introductorypage.html")
