from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import secrets
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Change this to the real website address after deployment
FRONTEND_URL = "http://127.0.0.1:5500"

# Only people who know this code can register as admin.
# Set a real one in your environment later; this is just a default for testing.
ADMIN_SIGNUP_CODE = os.environ.get("ADMIN_SIGNUP_CODE", "change-me-123")

# Temporary storage (Firebase will replace these later)
certificates = {}
admins = {}   # username -> {"username", "password_hash"}
tokens = {}   # login token -> username


def generate_certificate_id():
    year = datetime.now().year
    return f"CERT-{year}-{uuid.uuid4().hex[:6].upper()}"


# ---------- Authorization ----------
def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Admin login required"}), 401
        username = tokens.get(auth[7:])
        if not username:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        g.admin = username
        return f(*args, **kwargs)
    return wrapper


@app.route("/")
def home():
    return jsonify({"message": "Certificate API is running"})


# ---------- Admin accounts ----------
@app.route("/api/auth/register", methods=["POST"])
def register_admin():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", ""))
    signup_code = str(data.get("signup_code", ""))

    if signup_code != ADMIN_SIGNUP_CODE:
        return jsonify({"error": "Invalid admin signup code"}), 403
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if username in admins:
        return jsonify({"error": "Username already exists"}), 409

    admins[username] = {
        "username": username,
        "password_hash": generate_password_hash(password),
    }
    return jsonify({"message": "Admin registered successfully"}), 201


@app.route("/api/auth/login", methods=["POST"])
def login_admin():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", ""))

    admin = admins.get(username)
    if not admin or not check_password_hash(admin["password_hash"], password):
        return jsonify({"error": "Wrong username or password"}), 401

    token = secrets.token_urlsafe(32)
    tokens[token] = username
    return jsonify({"message": "Login successful", "token": token, "username": username})


@app.route("/api/auth/logout", methods=["POST"])
def logout_admin():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        tokens.pop(auth[7:], None)
    return jsonify({"message": "Logged out"})


@app.route("/api/auth/me", methods=["GET"])
@admin_required
def whoami():
    return jsonify({"username": g.admin})


# ---------- Certificates ----------
# 1. Admin issues a certificate (protected)
@app.route("/api/certificates", methods=["POST"])
@admin_required
def add_certificate():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please send certificate details as JSON"}), 400

    required = ["student_name", "course", "issue_date", "issued_by"]
    for field in required:
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return jsonify({"error": f"{field} is required"}), 400

    cert_id = generate_certificate_id()
    certificate = {
        "certificate_id": cert_id,
        "student_name": data["student_name"].strip(),
        "student_email": str(data.get("student_email", "")).strip(),
        "course": data["course"].strip(),
        "certificate_type": str(data.get("certificate_type", "")).strip(),
        "issue_date": data["issue_date"].strip(),
        "issued_by": data["issued_by"].strip(),
        "status": "valid",
        "issued_by_admin": g.admin,
    }
    certificates[cert_id] = certificate

    return jsonify({
        "message": "Certificate issued successfully",
        "certificate": certificate,
        "verification_url": f"{FRONTEND_URL}/index.html?id={cert_id}",
    }), 201


# 2. Anyone verifies a certificate (PUBLIC, no login)
@app.route("/api/verify/<certificate_id>", methods=["GET"])
def verify_certificate(certificate_id):
    cert = certificates.get(certificate_id)

    if not cert:
        return jsonify({"result": "invalid", "message": "Certificate not found"}), 404

    return jsonify({"result": cert["status"], "certificate": cert})


# 3. Admin revokes a certificate (protected)
@app.route("/api/certificates/<certificate_id>/revoke", methods=["PUT"])
@admin_required
def revoke_certificate(certificate_id):
    cert = certificates.get(certificate_id)
    if not cert:
        return jsonify({"error": "Certificate not found"}), 404

    cert["status"] = "revoked"
    return jsonify({"message": "Certificate revoked", "certificate": cert})


# 4. Admin restores a certificate (protected)
@app.route("/api/certificates/<certificate_id>/restore", methods=["PUT"])
@admin_required
def restore_certificate(certificate_id):
    cert = certificates.get(certificate_id)
    if not cert:
        return jsonify({"error": "Certificate not found"}), 404

    cert["status"] = "valid"
    return jsonify({"message": "Certificate restored", "certificate": cert})


# 5. Admin dashboard: list all certificates (protected)
@app.route("/api/certificates", methods=["GET"])
@admin_required
def list_certificates():
    return jsonify({"certificates": list(certificates.values())})


if __name__ == "__main__":
    app.run(debug=True)