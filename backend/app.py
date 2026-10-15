from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Change this to the real website address after deployment
FRONTEND_URL = "http://127.0.0.1:5500"

# Temporary storage (Firebase will replace this later)
certificates = {}


def generate_certificate_id():
    year = datetime.now().year
    return f"CERT-{year}-{uuid.uuid4().hex[:6].upper()}"


@app.route("/")
def home():
    return jsonify({"message": "Certificate API is running"})


# 1. Admin issues a certificate
@app.route("/api/certificates", methods=["POST"])
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
    }
    certificates[cert_id] = certificate

    return jsonify({
        "message": "Certificate issued successfully",
        "certificate": certificate,
        "verification_url": f"{FRONTEND_URL}/index.html?id={cert_id}",
    }), 201


# 2. Employer or college verifies a certificate
@app.route("/api/verify/<certificate_id>", methods=["GET"])
def verify_certificate(certificate_id):
    cert = certificates.get(certificate_id)

    if not cert:
        return jsonify({"result": "invalid", "message": "Certificate not found"}), 404

    return jsonify({"result": cert["status"], "certificate": cert})


# 3. Admin revokes a certificate
@app.route("/api/certificates/<certificate_id>/revoke", methods=["PUT"])
def revoke_certificate(certificate_id):
    cert = certificates.get(certificate_id)
    if not cert:
        return jsonify({"error": "Certificate not found"}), 404

    cert["status"] = "revoked"
    return jsonify({"message": "Certificate revoked", "certificate": cert})


# 4. Admin restores a revoked certificate
@app.route("/api/certificates/<certificate_id>/restore", methods=["PUT"])
def restore_certificate(certificate_id):
    cert = certificates.get(certificate_id)
    if not cert:
        return jsonify({"error": "Certificate not found"}), 404

    cert["status"] = "valid"
    return jsonify({"message": "Certificate restored", "certificate": cert})


# 5. Admin dashboard: list all certificates
@app.route("/api/certificates", methods=["GET"])
def list_certificates():
    return jsonify({"certificates": list(certificates.values())})


if __name__ == "__main__":
    app.run(debug=True)