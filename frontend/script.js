
// ---------- ADMIN AUTHENTICATION ----------

const API_BASE_URL = "http://127.0.0.1:5000";

const authSection = document.getElementById("authSection");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

// Store the session token for the current browser session.
// This is only a frontend session convenience; Flask must
// enforce authorization on every protected API.
let adminToken = sessionStorage.getItem("adminToken");

function showAuthMessage(message, type = "error") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function showLoginScreen() {
  authTitle.textContent = "Admin Login";
  authSubtitle.textContent =
    "Sign in to manage digital certificates.";

  loginForm.hidden = false;
  registerForm.hidden = true;
  authMessage.textContent = "";
}

function showRegisterScreen() {
  authTitle.textContent = "Admin Registration";
  authSubtitle.textContent =
    "Create an authorized admin account.";

  loginForm.hidden = true;
  registerForm.hidden = false;
  authMessage.textContent = "";
}

function setAuthenticatedUI(isAuthenticated) {
  authSection.hidden = isAuthenticated;

  // Keep the existing website intact; show it after login.
  document.querySelector("header").hidden = !isAuthenticated;

  document.querySelectorAll(
    "main, footer"
  ).forEach((element) => {
    element.hidden = !isAuthenticated;
  });
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }

  return data;
}

// Switch between login and registration.
document.getElementById("showRegister").addEventListener(
  "click",
  showRegisterScreen
);

document.getElementById("showLogin").addEventListener(
  "click",
  showLoginScreen
);

// Admin registration.
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById(
    "registerUsername"
  ).value.trim();

  const password = document.getElementById(
    "registerPassword"
  ).value;

  const confirmPassword = document.getElementById(
    "confirmPassword"
  ).value;

  const signupCode = document.getElementById(
    "signupCode"
  ).value;

  if (password !== confirmPassword) {
    showAuthMessage("Passwords do not match.");
    return;
  }

  try {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        signup_code: signupCode
      })
    });

    showAuthMessage(
      data.message || "Registration successful. Please log in.",
      "success"
    );

    registerForm.reset();
    loginForm.reset();
    showLoginScreen();
  } catch (error) {
    showAuthMessage(error.message);
  }
});

// Admin login.
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById(
    "loginUsername"
  ).value.trim();

  const password = document.getElementById(
    "loginPassword"
  ).value;

  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    adminToken = data.token;
    sessionStorage.setItem("adminToken", adminToken);

    setAuthenticatedUI(true);
    await initializeCertificateApp();

    showAuthMessage("Login successful.", "success");
    loginForm.reset();
  } catch (error) {
    adminToken = null;
    sessionStorage.removeItem("adminToken");
    showAuthMessage(error.message);
  }
});

// Logout helper; connect it to a visible Logout button.
async function logoutAdmin() {
  try {
    if (adminToken) {
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
    }
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    adminToken = null;
    sessionStorage.removeItem("adminToken");
    setAuthenticatedUI(false);
    showLoginScreen();
  }
}

document.getElementById("logoutButton").addEventListener(
  "click",
  logoutAdmin
);
id="v5j2pd"



"use strict";

// DEMO MODE: records are stored in this browser only.
// Connect this frontend to Flask/Firebase later.
const USE_DEMO_DATA = true;
const STORAGE_KEY = "certiVerifyDemoCertificates";

const certificateForm = document.getElementById("certificateForm");
const formMessage = document.getElementById("formMessage");
const issueDateInput = document.getElementById("issueDate");

const issuedSection = document.getElementById("issuedCertificateSection");
const issuedStudentName = document.getElementById("issuedStudentName");
const issuedCourseName = document.getElementById("issuedCourseName");
const issuedCertificateId = document.getElementById("issuedCertificateId");
const issuedCertificateType = document.getElementById("issuedCertificateType");
const issuedIssueDate = document.getElementById("issuedIssueDate");
const issuedIssuerName = document.getElementById("issuedIssuerName");
const qrContainer = document.getElementById("certificateQrCode");
const qrHelp = document.getElementById("qrHelp");

const tableBody = document.getElementById("certificateTableBody");
const emptyDashboard = document.getElementById("emptyDashboard");
const dashboardSearch = document.getElementById("dashboardSearch");
const statusFilter = document.getElementById("statusFilter");

const verifyForm = document.getElementById("verifyForm");
const verifyIdInput = document.getElementById("verifyId");
const verificationResult = document.getElementById("verificationResult");

let latestIssuedCertificateId = null;

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function formatDate(value) {
  if (!value) return "—";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function getCertificates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read saved certificates:", error);
    return [];
  }
}

function saveCertificates(certificates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));
    return true;
  } catch (error) {
    console.error("Could not save certificates:", error);

    alert(
      "The browser could not save the certificate. Check your browser storage settings."
    );

    return false;
  }
}

function makeCertificateId() {
  const year = new Date().getFullYear();
  const records = getCertificates();
  let id;

  do {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    id = `CV-${year}-${randomNumber}`;
  } while (records.some((certificate) => certificate.id === id));

  return id;
}

function getSampleCertificates() {
  return [
    {
      id: "CC-DEMO-001",
      studentName: "Rahul Sharma",
      studentEmail: "rahul@example.com",
      courseName: "Cloud Computing",
      certificateType: "Course Completion",
      issueDate: "2026-09-15",
      issuerName: "Demo Institute",
      status: "valid"
    },
    {
      id: "CC-DEMO-002",
      studentName: "Priya Reddy",
      studentEmail: "priya@example.com",
      courseName: "Web Development",
      certificateType: "Achievement",
      issueDate: "2026-09-20",
      issuerName: "Demo Institute",
      status: "valid"
    },
    {
      id: "CC-DEMO-003",
      studentName: "Arjun Kumar",
      studentEmail: "arjun@example.com",
      courseName: "Cyber Security",
      certificateType: "Participation",
      issueDate: "2026-08-10",
      issuerName: "Demo Institute",
      status: "revoked"
    }
  ];
}

function initializeDemoData() {
  if (!USE_DEMO_DATA) return;

  try {
    if (localStorage.getItem(STORAGE_KEY) === null) {
      saveCertificates(getSampleCertificates());
    }
  } catch (error) {
    console.error("Demo storage is unavailable:", error);
  }
}

function setFormMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.className = `message ${type}`.trim();
}

// RENDER DASHBOARD WITH VIEW, REVOKE AND RESTORE BUTTONS
function renderDashboard() {
  const certificates = getCertificates();

  document.getElementById("totalCount").textContent = certificates.length;

  document.getElementById("validCount").textContent =
    certificates.filter((certificate) => certificate.status === "valid").length;

  document.getElementById("revokedCount").textContent =
    certificates.filter((certificate) => certificate.status === "revoked").length;

  const searchTerm = dashboardSearch.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = certificates.filter((certificate) => {
    const searchableText = [
      certificate.id,
      certificate.studentName,
      certificate.studentEmail,
      certificate.courseName,
      certificate.certificateType,
      certificate.issuerName
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    const matchesStatus =
      selectedStatus === "all" || certificate.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  tableBody.innerHTML = filtered.map((certificate) => {
    const status =
      certificate.status === "revoked" ? "revoked" : "valid";

    const actionLabel = status === "valid" ? "Revoke" : "Restore";
    const actionValue = status === "valid" ? "revoke" : "restore";

    return `
      <tr>
        <td>
          <span class="table-id">${escapeHTML(certificate.id)}</span>
        </td>

        <td>${escapeHTML(certificate.studentName)}</td>

        <td>${escapeHTML(certificate.courseName)}</td>

        <td>${escapeHTML(formatDate(certificate.issueDate))}</td>

        <td>
          <span class="status-badge ${status}">
            ${status === "valid" ? "Valid" : "Revoked"}
          </span>
        </td>

        <td class="action-cell">
          <button
            type="button"
            class="table-action view"
            data-action="view"
            data-id="${escapeHTML(certificate.id)}"
          >View</button>

          <button
            type="button"
            class="table-action ${actionValue}"
            data-action="${actionValue}"
            data-id="${escapeHTML(certificate.id)}"
          >${actionLabel}</button>
        </td>
      </tr>
    `;
  }).join("");

  emptyDashboard.hidden = filtered.length > 0;
}

// DISPLAY A CERTIFICATE AGAIN FROM THE DASHBOARD
function showIssuedCertificate(certificate) {
  latestIssuedCertificateId = certificate.id;

  issuedStudentName.textContent = certificate.studentName;
  issuedCourseName.textContent = certificate.courseName;
  issuedCertificateId.textContent = certificate.id;
  issuedCertificateType.textContent = certificate.certificateType;
  issuedIssueDate.textContent = formatDate(certificate.issueDate);
  issuedIssuerName.textContent = certificate.issuerName;

  // Update the displayed status if a certificate has been revoked.
  const statusElement = issuedSection.querySelector(".issued-status");

  if (statusElement) {
    const isValid = certificate.status === "valid";

    statusElement.textContent = isValid ? "VALID" : "REVOKED";
    statusElement.classList.toggle("revoked", !isValid);
  }

  // Regenerate the QR code for this certificate.
  qrContainer.innerHTML = "";

  const verificationURL = new URL(window.location.href);
  verificationURL.search = "";
  verificationURL.hash = "verify";
  verificationURL.searchParams.set("certificateId", certificate.id);

  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: verificationURL.toString(),
      width: 140,
      height: 140,
      correctLevel: QRCode.CorrectLevel.M
    });

    qrHelp.textContent =
      "Scan the QR code to open the verification page.";
  } else {
    qrHelp.textContent =
      "QR library could not load. Check your internet connection.";
  }

  issuedSection.hidden = false;

  issuedSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ISSUE A NEW CERTIFICATE
certificateForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!USE_DEMO_DATA) {
    setFormMessage(
      "Backend integration is not configured yet. Connect the Flask API first.",
      "error"
    );
    return;
  }

  const studentName =
    document.getElementById("studentName").value.trim();

  const studentEmail =
    document.getElementById("studentEmail").value.trim();

  const courseName =
    document.getElementById("courseName").value.trim();

  const certificateType =
    document.getElementById("certificateType").value;

  const issueDate = issueDateInput.value;

  const issuerName =
    document.getElementById("issuerName").value.trim();

  if (
    !studentName ||
    !courseName ||
    !certificateType ||
    !issueDate ||
    !issuerName
  ) {
    setFormMessage("Please complete all required fields.", "error");
    return;
  }

  if (issueDate > getToday()) {
    setFormMessage("The issue date cannot be in the future.", "error");
    return;
  }

  const certificates = getCertificates();

  const certificate = {
    id: makeCertificateId(),
    studentName,
    studentEmail,
    courseName,
    certificateType,
    issueDate,
    issuerName,
    status: "valid"
  };

  certificates.unshift(certificate);

  if (!saveCertificates(certificates)) return;

  setFormMessage(
    `Certificate issued successfully. ID: ${certificate.id}`,
    "success"
  );

  renderDashboard();
  showIssuedCertificate(certificate);

  certificateForm.reset();
  issueDateInput.value = getToday();
});

// DASHBOARD ACTIONS: VIEW, REVOKE AND RESTORE
tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const certificateId = button.dataset.id;
  const action = button.dataset.action;

  const certificates = getCertificates();

  const certificate = certificates.find(
    (item) => item.id === certificateId
  );

  if (!certificate) return;

  // Viewing does not change the certificate's status.
  if (action === "view") {
    showIssuedCertificate(certificate);
    return;
  }

  if (action === "revoke") {
    const confirmed = window.confirm(
      `Revoke certificate ${certificateId}?`
    );

    if (!confirmed) return;

    certificate.status = "revoked";
  } else if (action === "restore") {
    const confirmed = window.confirm(
      `Restore certificate ${certificateId} to valid status?`
    );

    if (!confirmed) return;

    certificate.status = "valid";
  } else {
    return;
  }

  if (saveCertificates(certificates)) {
    renderDashboard();

    // Refresh the certificate currently being viewed.
    if (latestIssuedCertificateId === certificateId) {
      showIssuedCertificate(certificate);
    }

    // Refresh verification results if this ID is currently searched.
    if (
      verifyIdInput.value.trim().toUpperCase() ===
      certificateId.toUpperCase()
    ) {
      showVerificationResult(certificateId);
    }
  }
});

// SEARCH AND FILTER
dashboardSearch.addEventListener("input", renderDashboard);
statusFilter.addEventListener("change", renderDashboard);

// PUBLIC CERTIFICATE VERIFICATION
verifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showVerificationResult(verifyIdInput.value);
});

function showVerificationResult(inputId) {
  const certificateId = String(inputId || "").trim().toUpperCase();

  if (!certificateId) {
    verificationResult.hidden = true;
    return;
  }

  const certificate = getCertificates().find(
    (item) => item.id.toUpperCase() === certificateId
  );

  verificationResult.hidden = false;

  if (!certificate) {
    verificationResult.className = "verification-result not-found";

    verificationResult.innerHTML = `
      <div class="result-symbol">!</div>
      <h3>Certificate Not Found</h3>
      <p>
        No matching certificate record was found.
        Check the certificate ID and try again.
      </p>
    `;

    return;
  }

  const isValid = certificate.status === "valid";

  verificationResult.className =
    `verification-result ${isValid ? "verified" : "revoked-result"}`;

  verificationResult.innerHTML = `
    <div class="result-symbol">${isValid ? "✓" : "!"}</div>

    <h3>
      ${isValid ? "Certificate Verified" : "Certificate Revoked"}
    </h3>

    <p class="result-status">
      ${
        isValid
          ? "A matching certificate record exists and is marked valid."
          : "A matching certificate record exists, but it has been revoked."
      }
    </p>

    <div class="result-details">
      <p><strong>Certificate ID:</strong> ${escapeHTML(certificate.id)}</p>
      <p><strong>Student:</strong> ${escapeHTML(certificate.studentName)}</p>
      <p><strong>Course:</strong> ${escapeHTML(certificate.courseName)}</p>
      <p><strong>Type:</strong> ${escapeHTML(certificate.certificateType)}</p>
      <p><strong>Issue Date:</strong> ${escapeHTML(formatDate(certificate.issueDate))}</p>
      <p><strong>Issued By:</strong> ${escapeHTML(certificate.issuerName)}</p>
      <p><strong>Status:</strong> ${isValid ? "Valid" : "Revoked"}</p>
    </div>
  `;
}

// RESET DEMO RECORDS
document.getElementById("resetDemo").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset the demo certificates? This removes certificates created in this browser and restores the three sample records."
  );

  if (!confirmed) return;

  if (saveCertificates(getSampleCertificates())) {
    renderDashboard();

    verificationResult.hidden = true;
    issuedSection.hidden = true;
    latestIssuedCertificateId = null;

    setFormMessage("Demo data has been reset.", "success");
  }
});

// PRINT OR SAVE AS PDF
document.getElementById("printCertificate").addEventListener("click", () => {
  if (!latestIssuedCertificateId) return;

  window.print();
});

// CLOSE THE CERTIFICATE DISPLAY WITHOUT DELETING THE RECORD
document.getElementById("hideIssuedCertificate").addEventListener("click", () => {
  issuedSection.hidden = true;
});

// HANDLE A CERTIFICATE ID PASSED IN THE URL
function handleVerificationLink() {
  const parameters = new URLSearchParams(window.location.search);
  const certificateId = parameters.get("certificateId");

  if (!certificateId) return;

  verifyIdInput.value = certificateId;

  document.getElementById("verify").scrollIntoView({
    behavior: "smooth"
  });

  showVerificationResult(certificateId);
}


// ---------- INITIALIZE CERTIFICATE APP ----------

async function initializeCertificateApp() {
  // This function will later load certificates from Flask.
  // Do not initialize browser demo records here.
  issueDateInput.max = getToday();
  issueDateInput.value = getToday();

  // Temporary: your existing certificate functions still
  // use localStorage. We will replace them with Flask calls
  // in the next integration step.
  renderDashboard();
  handleVerificationLink();
}

async function checkExistingLogin() {
  setAuthenticatedUI(false);
  showLoginScreen();

  if (!adminToken) return;

  try {
    await apiRequest("/api/auth/me", {
      method: "GET"
    });

    setAuthenticatedUI(true);
    await initializeCertificateApp();
  } catch (error) {
    adminToken = null;
    sessionStorage.removeItem("adminToken");
    setAuthenticatedUI(false);
    showLoginScreen();
  }
}

checkExistingLogin();


