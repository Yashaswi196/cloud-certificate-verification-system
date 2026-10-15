
"use strict";

const API_BASE_URL = "http://127.0.0.1:5001";
const TOKEN_KEY = "adminToken";

let adminToken = sessionStorage.getItem(TOKEN_KEY);

const $ = (id) => document.getElementById(id);

// Display messages
function showMessage(id, message, type = "") {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`.trim();
}

// Send requests to Flask
async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to Flask. Make sure the backend is running on port 5001."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && path !== "/api/auth/login") {
      adminToken = null;
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin();
    }

    throw new Error(
      data.error || data.message || "The request failed."
    );
  }

  return data;
}

// Show login form
function showLogin() {
  $("authPanel").hidden = false;
  $("dashboard").hidden = true;
  $("logoutButton").hidden = true;

  $("authHeading").textContent = "Admin Login";
  $("loginForm").hidden = false;
  $("registerForm").hidden = true;
  $("authSwitch").hidden = false;
  $("showLogin").hidden = true;

  showMessage("authMessage", "");
}

// Show registration form
function showRegister() {
  $("authHeading").textContent = "Admin Registration";
  $("loginForm").hidden = true;
  $("registerForm").hidden = false;
  $("authSwitch").hidden = true;
  $("showLogin").hidden = false;

  showMessage("authMessage", "");
}

// Show admin dashboard after login
function showDashboard() {
  $("authPanel").hidden = true;
  $("dashboard").hidden = false;
  $("logoutButton").hidden = false;

  loadCertificates();
}

// Switch between login and registration
$("showRegister").addEventListener("click", showRegister);
$("showLogin").addEventListener("click", showLogin);

// Register admin
$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = $("registerUsername").value.trim();
  const password = $("registerPassword").value;
  const confirmPassword = $("confirmPassword").value;
  const signupCode = $("signupCode").value;

  if (password !== confirmPassword) {
    showMessage("authMessage", "Passwords do not match.", "error");
    return;
  }

  try {
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        signup_code: signupCode
      })
    });

    $("registerForm").reset();

    showLogin();

    showMessage(
      "authMessage",
      result.message || "Registration successful. You can now log in.",
      "success"
    );
  } catch (error) {
    showMessage("authMessage", error.message, "error");
  }
});

// Admin login
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  showMessage("authMessage", "Signing in...");

  try {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: $("loginUsername").value.trim(),
        password: $("loginPassword").value
      })
    });

    if (!result.token) {
      throw new Error("Login response did not contain an authentication token.");
    }

    adminToken = result.token;
    sessionStorage.setItem(TOKEN_KEY, adminToken);

    $("loginForm").reset();
    showDashboard();
  } catch (error) {
    showMessage("authMessage", error.message, "error");
  }
});

// Logout
$("logoutButton").addEventListener("click", async () => {
  try {
    if (adminToken) {
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
    }
  } catch (error) {
    console.warn("Logout request failed:", error.message);
  }

  adminToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
});

// Display the complete certificate inside the admin page
function showAdminCertificate(cert) {
  if (!cert) return;

  const resultBox = $("issuedResult");
  resultBox.hidden = false;

  $("adminCertTitle").textContent =
    cert.certificate_type || "Certificate of Completion";

  $("adminCertStudent").textContent = cert.student_name || "";
  $("adminCertCourse").textContent = cert.course || "";
  $("adminCertId").textContent = cert.certificate_id || "";
  $("adminCertDate").textContent = cert.issue_date || "";
  $("adminCertIssuer").textContent = cert.issued_by || "";
  $("adminCertIssuerFooter").textContent = cert.issued_by || "";

  const publicUrl = new URL("index.html", window.location.href);
  publicUrl.searchParams.set("id", cert.certificate_id);

  $("adminPublicLink").href = publicUrl.href;

  const qrContainer = $("adminCertificateQR");
  qrContainer.replaceChildren();

  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: publicUrl.href,
      width: 110,
      height: 110
    });
  } else {
    qrContainer.textContent = "QR code unavailable";
  }

  resultBox.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Issue a certificate
$("issueForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  showMessage("issueMessage", "Issuing certificate...");

  const certificateData = {
    student_name: $("studentName").value.trim(),
    student_email: $("studentEmail").value.trim(),
    course: $("course").value.trim(),
    certificate_type: $("certificateType").value,
    issue_date: $("issueDate").value,
    issued_by: $("issuedBy").value.trim()
  };

  try {
    const result = await apiRequest("/api/certificates", {
      method: "POST",
      body: JSON.stringify(certificateData)
    });

    if (!result.certificate) {
      throw new Error("The server did not return the issued certificate.");
    }

    showAdminCertificate(result.certificate);

    showMessage(
      "issueMessage",
      result.message || "Certificate issued successfully!",
      "success"
    );

    $("issueForm").reset();
    $("issueDate").value = new Date().toISOString().slice(0, 10);

    await loadCertificates();
  } catch (error) {
    showMessage("issueMessage", error.message, "error");
  }
});

// Add a table cell safely
function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";
  row.appendChild(cell);
  return cell;
}

// Revoke or restore a certificate
async function changeStatus(id, action) {
  try {
    await apiRequest(
      `/api/certificates/${encodeURIComponent(id)}/${action}`,
      { method: "PUT" }
    );

    showMessage(
      "listMessage",
      `Certificate ${action === "revoke" ? "revoked" : "restored"}.`,
      "success"
    );

    await loadCertificates();
  } catch (error) {
    showMessage("listMessage", error.message, "error");
  }
}

// Load certificates into the dashboard
async function loadCertificates() {
  showMessage("listMessage", "Loading certificates...");
  $("certificateRows").replaceChildren();

  try {
    const result = await apiRequest("/api/certificates");
    const certificates = result.certificates || [];

    if (certificates.length === 0) {
      showMessage("listMessage", "No certificates have been issued yet.");
      return;
    }

    showMessage("listMessage", "");

    certificates.forEach((cert) => {
      const row = document.createElement("tr");

      addCell(row, cert.certificate_id);
      addCell(row, cert.student_name);
      addCell(row, cert.course);
      addCell(row, cert.issue_date);
      addCell(row, cert.status);

      const actions = addCell(row, "");

      // View the certificate without leaving the admin page
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "secondary action-button";
      viewButton.textContent = "View";

      viewButton.addEventListener("click", () => {
        showAdminCertificate(cert);
      });

      actions.appendChild(viewButton);

      // Preserve revoke and restore functionality
      const statusButton = document.createElement("button");
      statusButton.type = "button";
      statusButton.className = "secondary action-button";

      if (cert.status === "revoked") {
        statusButton.textContent = "Restore";

        statusButton.addEventListener("click", () => {
          changeStatus(cert.certificate_id, "restore");
        });
      } else {
        statusButton.textContent = "Revoke";

        statusButton.addEventListener("click", () => {
          if (confirm("Are you sure you want to revoke this certificate?")) {
            changeStatus(cert.certificate_id, "revoke");
          }
        });
      }

      actions.appendChild(statusButton);
      $("certificateRows").appendChild(row);
    });
  } catch (error) {
    showMessage("listMessage", error.message, "error");
  }
}

// Refresh the certificate table
$("refreshButton").addEventListener("click", loadCertificates);

// Print or save the admin certificate as PDF



$("adminPrintButton").addEventListener("click", () => {
    if ($("issuedResult").hidden) {
        alert("Please issue or view a certificate before printing.");
        return;
    }

    document.body.classList.remove("printing-public");
    document.body.classList.add("printing-admin");

    const cleanup = () => {
        document.body.classList.remove("printing-admin");
        window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
});



// Check an existing login and initialize the page
async function initializeAdmin() {
  $("issueDate").max = new Date().toISOString().slice(0, 10);
  $("issueDate").value = $("issueDate").max;

  if (!adminToken) {
    showLogin();
    return;
  }

  try {
    await apiRequest("/api/auth/me");
    showDashboard();
  } catch (error) {
    adminToken = null;
    sessionStorage.removeItem(TOKEN_KEY);
    showLogin();
  }
};

initializeAdmin();

