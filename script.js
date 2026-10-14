
"use strict";

/*
 * FRONTEND DEMO MODE
 * These records are saved in this browser only.
 * Later, connect these functions to your teammate's Flask API.
 */

const API_BASE_URL = "http://127.0.0.1:5000/api";
const USE_DEMO_DATA = true;
const STORAGE_KEY = "certiVerifyDemoCertificates";

const certificateForm = document.getElementById("certificateForm");
const formMessage = document.getElementById("formMessage");
const certificateTableBody = document.getElementById("certificateTableBody");
const dashboardSearch = document.getElementById("dashboardSearch");
const statusFilter = document.getElementById("statusFilter");
const verifyForm = document.getElementById("verifyForm");
const verifyId = document.getElementById("verifyId");
const verificationResult = document.getElementById("verificationResult");

const today = new Date().toLocaleDateString("en-CA");
document.getElementById("issueDate").value = today;

function createDemoCertificates() {
  return [
    {
      id: "CC-DEMO-001",
      studentName: "Rahul Sharma",
      studentEmail: "rahul@example.com",
      courseName: "Cloud Computing",
      certificateType: "Course Completion",
      issueDate: "2026-09-10",
      issuerName: "ABC Institute",
      status: "valid"
    },
    {
      id: "CC-DEMO-002",
      studentName: "Priya Reddy",
      studentEmail: "priya@example.com",
      courseName: "Web Development",
      certificateType: "Achievement",
      issueDate: "2026-09-15",
      issuerName: "ABC Institute",
      status: "valid"
    },
    {
      id: "CC-DEMO-003",
      studentName: "Arjun Kumar",
      studentEmail: "arjun@example.com",
      courseName: "Cyber Security",
      certificateType: "Training",
      issueDate: "2026-08-20",
      issuerName: "ABC Institute",
      status: "revoked"
    }
  ];
}

function loadCertificates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Could not read demo certificate records:", error);
  }

  const initialData = createDemoCertificates();
  saveCertificates(initialData);
  return initialData;
}

let certificates = loadCertificates();

function saveCertificates(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Could not save demo records:", error);
    showFormMessage(
      "Could not save demo data in this browser.",
      "error"
    );
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = "message " + type;
}

function generateCertificateId() {
  // Demo-only ID generator. The real backend should generate IDs.
  let id;

  do {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    id = "CC-" + Date.now().toString().slice(-6) + "-" + randomPart;
  } while (certificates.some(function (certificate) {
    return certificate.id === id;
  }));

  return id;
}

/* ADMIN: CREATE CERTIFICATE */

certificateForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const formData = new FormData(certificateForm);

  const studentName = String(formData.get("studentName") || "").trim();
  const studentEmail = String(formData.get("studentEmail") || "").trim();
  const courseName = String(formData.get("courseName") || "").trim();
  const certificateType = String(formData.get("certificateType") || "");
  const issueDate = String(formData.get("issueDate") || "");
  const issuerName = String(formData.get("issuerName") || "").trim();

  if (!studentName || !courseName || !certificateType ||
      !issueDate || !issuerName) {
    showFormMessage("Please complete all required fields.", "error");
    return;
  }

  const newCertificate = {
    id: generateCertificateId(),
    studentName,
    studentEmail,
    courseName,
    certificateType,
    issueDate,
    issuerName,
    status: "valid"
  };

  /*
   * API INTEGRATION PLACEHOLDER
   *
   * When your teammate shares the create-certificate endpoint,
   * send the form fields to that endpoint instead.
   * The server should generate the permanent ID and save the record.
   */

  if (!USE_DEMO_DATA) {
    showFormMessage(
      "API integration is not configured yet. Demo mode is enabled in this version.",
      "error"
    );
    return;
  }

  certificates.unshift(newCertificate);
  saveCertificates(certificates);
  renderDashboard();

  certificateForm.reset();
  document.getElementById("issueDate").value =
    new Date().toLocaleDateString("en-CA");

  showFormMessage(
    "Demo certificate created! ID: " + newCertificate.id,
    "success"
  );

  verifyId.value = newCertificate.id;
});

/* DASHBOARD: RENDER RECORDS */

function renderDashboard() {
  const searchTerm = dashboardSearch.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredCertificates = certificates.filter(function (certificate) {
    const searchableText = [
      certificate.id,
      certificate.studentName,
      certificate.courseName,
      certificate.issuerName
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);
    const matchesStatus =
      selectedStatus === "all" || certificate.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  document.getElementById("totalCount").textContent = certificates.length;
  document.getElementById("validCount").textContent =
    certificates.filter(function (certificate) {
      return certificate.status === "valid";
    }).length;
  document.getElementById("revokedCount").textContent =
    certificates.filter(function (certificate) {
      return certificate.status === "revoked";
    }).length;

  certificateTableBody.innerHTML = filteredCertificates.map(function (certificate) {
    const status = certificate.status === "revoked" ? "revoked" : "valid";

    const actionButton = status === "valid"
      ? '<button class="small-button danger" data-action="revoke" data-id="' +
        escapeHTML(certificate.id) + '">Revoke</button>'
      : '<button class="small-button" data-action="restore" data-id="' +
        escapeHTML(certificate.id) + '">Restore demo</button>';

    return `
      <tr>
        <td>${escapeHTML(certificate.id)}</td>
        <td>${escapeHTML(certificate.studentName)}</td>
        <td>${escapeHTML(certificate.courseName)}</td>
        <td>${escapeHTML(formatDate(certificate.issueDate))}</td>
        <td><span class="status ${status}">${status}</span></td>
        <td>
          <button class="small-button"
            data-action="verify" data-id="${escapeHTML(certificate.id)}">
            Verify
          </button>
          ${actionButton}
        </td>
      </tr>
    `;
  }).join("");

  document.getElementById("emptyDashboard").hidden =
    filteredCertificates.length !== 0;
}

dashboardSearch.addEventListener("input", renderDashboard);
statusFilter.addEventListener("change", renderDashboard);

/* DASHBOARD: ACTION BUTTONS */

certificateTableBody.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const certificateId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "verify") {
    verifyId.value = certificateId;
    showVerificationResult(certificateId);
    document.getElementById("verify").scrollIntoView({
      behavior: "smooth"
    });
    return;
  }

  const certificate = certificates.find(function (item) {
    return item.id === certificateId;
  });

  if (!certificate) return;

  if (action === "revoke") {
    const confirmed = window.confirm(
      "Revoke this certificate in demo mode?"
    );
    if (!confirmed) return;

    certificate.status = "revoked";
  } else if (action === "restore") {
    const confirmed = window.confirm(
      "Restore this demo certificate to valid status?"
    );
    if (!confirmed) return;

    certificate.status = "valid";
  }

  saveCertificates(certificates);
  renderDashboard();
});

/* PUBLIC VERIFICATION */

verifyForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const certificateId = verifyId.value.trim();

  if (!certificateId) {
    showVerificationMessage("Please enter a certificate ID.");
    return;
  }

  showVerificationResult(certificateId);
});

function showVerificationMessage(message) {
  verificationResult.hidden = false;
  verificationResult.className = "result-card invalid-result";
  verificationResult.textContent = message;
}

function showVerificationResult(certificateId) {
  /*
   * Later, replace this demo lookup with a GET request to the
   * verification endpoint supplied by your backend teammate.
   */
  if (!USE_DEMO_DATA) {
    showVerificationMessage(
      "Connect the verification endpoint to check cloud records."
    );
    return;
  }

  const certificate = certificates.find(function (item) {
    return item.id.toLowerCase() === certificateId.toLowerCase();
  });

  verificationResult.hidden = false;

  if (!certificate) {
    verificationResult.className = "result-card invalid-result";
    verificationResult.innerHTML = `
      <div class="result-heading">
        <h3>Certificate Not Found</h3>
        <span class="status revoked">Invalid</span>
      </div>
      <p>No matching certificate record was found in the demo data.</p>
      <div class="result-details">
        <div>
          <span>Certificate ID searched</span>
          <strong>${escapeHTML(certificateId)}</strong>
        </div>
        <div>
          <span>Result</span>
          <strong>Not found</strong>
        </div>
      </div>
    `;
    return;
  }

  if (certificate.status === "revoked") {
    verificationResult.className = "result-card revoked-result";
  } else {
    verificationResult.className = "result-card valid-result";
  }

  const isValid = certificate.status === "valid";

  verificationResult.innerHTML = `
    <div class="result-heading">
      <h3>${isValid ? "Certificate Verified" : "Certificate Revoked"}</h3>
      <span class="status ${isValid ? "valid" : "revoked"}">
        ${isValid ? "Valid" : "Revoked"}
      </span>
    </div>

    <p>
      ${
        isValid
          ? "A matching record exists in the local demo data and is marked valid."
          : "A matching record exists, but its current status is revoked."
      }
    </p>

    <div class="result-details">
      <div>
        <span>Certificate ID</span>
        <strong>${escapeHTML(certificate.id)}</strong>
      </div>
      <div>
        <span>Student name</span>
        <strong>${escapeHTML(certificate.studentName)}</strong>
      </div>
      <div>
        <span>Course / Program</span>
        <strong>${escapeHTML(certificate.courseName)}</strong>
      </div>
      <div>
        <span>Certificate type</span>
        <strong>${escapeHTML(certificate.certificateType)}</strong>
      </div>
      <div>
        <span>Issue date</span>
        <strong>${escapeHTML(formatDate(certificate.issueDate))}</strong>
      </div>
      <div>
        <span>Issuing organization</span>
        <strong>${escapeHTML(certificate.issuerName)}</strong>
      </div>
    </div>
  `;
}

/* RESET DEMO DATA */

document.getElementById("resetDemo").addEventListener("click", function () {
  const confirmed = window.confirm(
    "Reset all demo records and restore the original sample data?"
  );

  if (!confirmed) return;

  certificates = createDemoCertificates();
  saveCertificates(certificates);
  dashboardSearch.value = "";
  statusFilter.value = "all";
  renderDashboard();

  verificationResult.hidden = true;
  showFormMessage("Demo records have been reset.", "success");
});

/* INITIAL PAGE RENDER */

renderDashboard();
