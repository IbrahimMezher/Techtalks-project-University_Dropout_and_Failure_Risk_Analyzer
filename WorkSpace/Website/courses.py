from flask import Blueprint, render_template

courses_bp = Blueprint('courses', __name__)

@courses_bp.route('/courses')
def courses():
    return render_template('courses.html')