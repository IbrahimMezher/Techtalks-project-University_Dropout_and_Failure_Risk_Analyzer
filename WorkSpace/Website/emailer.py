import os
import smtplib
import ssl
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")      
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_USER = os.getenv("SMTP_USER")             
SMTP_PASS = os.getenv("SMTP_PASS")             
MAIL_FROM = os.getenv("MAIL_FROM", SMTP_USER)   

APP_BASE_URL = os.getenv("APP_BASE_URL")


def _require_env():
    missing = [k for k, v in {
        "SMTP_HOST": SMTP_HOST,
        "SMTP_PORT": SMTP_PORT,
        "SMTP_USER": SMTP_USER,
        "SMTP_PASS": SMTP_PASS,
        "MAIL_FROM": MAIL_FROM
    }.items() if not v]
    if missing:
        raise RuntimeError(f"Email not configured. Missing: {', '.join(missing)}")


def _send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None):
    _require_env()

    msg = EmailMessage()
    msg["From"] = MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    if not text_body:
        text_body = "Please view this email in an HTML-capable client."
    msg.set_content(text_body)

    msg.add_alternative(html_body, subtype="html")

    if SMTP_PORT == 587:
       
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)


def send_verify_otp(to_email: str, passcode: str, minutes_valid: int = 15):
    subject = "Verify your email"
    html = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;
                  padding:12px 16px;border:1px solid #ddd;display:inline-block">
        {passcode}
      </div>
      <p style="margin-top:16px">This code expires in <b>{minutes_valid} minutes</b>.</p>
    </div>
    """
    text = f"Your verification code is: {passcode} (expires in {minutes_valid} minutes)."
    return _send_email(to_email, subject, html, text)


def send_reset_link(to_email: str, token: str):
    link = f"{APP_BASE_URL}/reset-password/{token}"
    subject = "Reset your password"
    html = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Password Reset</h2>
      <p>Click the button below to reset your password:</p>
      <p>
        <a href="{link}" style="background:#4f46e5;color:#fff;text-decoration:none;
                               padding:10px 14px;border-radius:8px;display:inline-block">
          Reset Password
        </a>
      </p>
      <p>If the button doesn’t work, copy and paste this link:</p>
      <p><a href="{link}">{link}</a></p>
    </div>
    """
    text = f"Reset your password using this link: {link}"
    return _send_email(to_email, subject, html, text)


def contact_us_function(email:str,message:str,name:str):
    subject = "User Contact"
    html = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Name:{name}  Email:{email}</h2>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;
                  padding:12px 16px;border:1px solid #ddd;display:inline-block">
                  {message}
      </div>
    </div>
     """
    text = f""
    return _send_email(SMTP_USER,subject, html, text)


def send_student_invite(to_email: str, invite_link: str, instructor_name: str, course_name: str | None = None):
    subject = "You were invited to join Dropout Analyzer"
    course_line = f"<p><b>Course:</b> {course_name}</p>" if course_name else ""
    html = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>You're invited</h2>
      <p><b>{instructor_name}</b> invited you to join Dropout Analyzer.</p>
      {course_line}
      <p>Click below to accept:</p>
      <p>
        <a href="{invite_link}" style="background:#4f46e5;color:#fff;text-decoration:none;
                               padding:10px 14px;border-radius:8px;display:inline-block">
          Accept Invitation
        </a>
      </p>
      <p>If the button doesn’t work, copy/paste:</p>
      <p><a href="{invite_link}">{invite_link}</a></p>
      <p style="color:#64748b;font-size:13px;margin-top:14px;">
        If you didn’t expect this invitation, you can ignore this email.
      </p>
    </div>
    """
    text = f"You were invited by {instructor_name}. Accept here: {invite_link}"
    return _send_email(to_email, subject, html, text)

