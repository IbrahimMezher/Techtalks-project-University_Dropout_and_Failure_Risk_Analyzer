import os
import requests
from dotenv import load_dotenv

load_dotenv()

EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send"

SERVICE_ID = os.getenv("EMAILJS_SERVICE_ID")
PUBLIC_KEY = os.getenv("EMAILJS_PUBLIC_KEY")
PRIVATE_KEY = os.getenv("EMAILJS_PRIVATE_KEY")

VERIFY_TEMPLATE_ID = os.getenv("EMAILJS_VERIFY_TEMPLATE_ID") #in this service we have two templates one for reset one for verify
RESET_TEMPLATE_ID = os.getenv("EMAILJS_RESET_TEMPLATE_ID")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://127.0.0.1:5000")
#hol hene identified .env for protection w ahama shi .env never gets commit with the git because it has all the personal info

def _send(template_id: str, params: dict):
    missing = [k for k, v in {
        "EMAILJS_SERVICE_ID": SERVICE_ID,
        "EMAILJS_PUBLIC_KEY": PUBLIC_KEY,
        "template_id": template_id
    }.items() if not v]
    
    payload = {
        "service_id": SERVICE_ID,
        "template_id": template_id,
        "user_id": PUBLIC_KEY,
        "template_params": params,
        "accessToken": PRIVATE_KEY,
    }

    r = requests.post(EMAILJS_URL, json=payload, timeout=15)

    r.raise_for_status()
    return r.text


def send_verify_otp(to_email: str, passcode: str, minutes_valid: int = 15):
    return _send(VERIFY_TEMPLATE_ID, {
        "email": to_email,
        "passcode": passcode,
        "time": f"{minutes_valid} minutes"
    })
# as the name suggests to used for verify email with otp

def send_reset_link(to_email: str, token: str):
    link = f"{APP_BASE_URL}/reset-password/{token}"
    return _send(RESET_TEMPLATE_ID, {
        "email": to_email,
        "link": link
    })
# btesta3mal metel ma elesem be2ool kermel reset link token la tehme (serializer)