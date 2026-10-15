
import os
from pathlib import Path

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

load_dotenv(Path(__file__).parent / ".env")

key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

if not key_path or not Path(key_path).is_file():
    raise FileNotFoundError(
        "Check the Firebase service-account path in backend/.env"
    )

try:
    firebase_admin.get_app()
except ValueError:
    credential = credentials.Certificate(key_path)
    firebase_admin.initialize_app(credential)

db = firestore.client()
certificates = db.collection("certificates")


def add_certificate(certificate):
    certificate_id = certificate["certificate_id"]
    certificates.document(certificate_id).create(certificate)
    return {"message": "Certificate added successfully"}


def get_certificate(certificate_id):
    results = certificates.where(
        "certificate_id", "==", certificate_id
    ).limit(1).stream()

    for document in results:
        return document.to_dict()

    return None


def revoke_certificate(certificate_id):
    results = certificates.where(
        "certificate_id", "==", certificate_id
    ).limit(1).stream()

    for document in results:
        document.reference.update({"status": "revoked"})
        return {"message": "Certificate revoked successfully"}

    return None
