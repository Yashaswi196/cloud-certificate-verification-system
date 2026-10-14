from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Temporary storage (Person 3's Firebase will replace this later)
certificates = {}


# Task 3: Generate a unique certificate ID
def generate_certificate_id():
    year = datetime.now().year
    return f"CERT-{year}-{uuid.uuid4().hex[:6].upper()}"


@app.route("/")
def home():
    return jsonify({"message": "Certificate API is running"})


# Task 2 + Task 4 + Task 5: Add a certificate (admin)
@app.route("/api/certificates", methods=["POST"])
def add_certificate():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Please send certificate details as JSON"}), 400

    # Task 5: Validate inputs
    required = ["student_name", "course", "issue_date", "issued_by"]
    for field in required:
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return jsonify({"error": f"{field} is required"}), 400

    cert_id = generate_certificate_id()
    certificate = {
        "certificate_id": cert_id,
        "student_name": data["student_name"].strip(),
        "course": data["course"].strip(),
        "issue_date": data["issue_date"].strip(),
        "issued_by": data["issued_by"].strip(),
        "status": "valid",
    }
    certificates[cert_id] = certificate

    return jsonify({"message": "Certificate created", "certificate": certificate}), 201


# Task 4 + Task 5: Verify a certificate
@app.route("/api/verify/<certificate_id>", methods=["GET"])
def verify_certificate(certificate_id):
    cert = certificates.get(certificate_id)

    # Task 5: Handle invalid certificate IDs
    if not cert:
        return jsonify({"result": "invalid", "message": "Certificate not found"}), 404

    return jsonify({"result": cert["status"], "certificate": cert})


if __name__ == "__main__":
    app.run(debug=True)