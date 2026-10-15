
from firebase_db import add_certificate, get_certificate, revoke_certificate

certificate = {
    "certificate_id": "TEST-CERT-001",
    "recipient_name": "Test Student",
    "course_name": "Python Fundamentals",
    "issue_date": "2026-10-15",
    "status": "valid"
}

try:
    print(add_certificate(certificate))
except Exception as error:
    print("Add certificate error:", error)

print("Retrieved certificate:", get_certificate("TEST-CERT-001"))
print("Revoke result:", revoke_certificate("TEST-CERT-001"))
print("After revocation:", get_certificate("TEST-CERT-001"))
