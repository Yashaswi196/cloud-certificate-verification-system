const API_BASE_URL = "http://127.0.0.1:5001";

const $ = (id) => document.getElementById(id);

let currentCertificate = null;

function showMessage(id, message, type = "") {
  const element = $(id);
  element.textContent = message;
  element.className = `message ${type}`;
}

function setCertificateVisible(visible) {
  $("certificateSection").hidden = !visible;
  $("verificationResult").hidden = !visible;
}

async function verifyCertificate(id) {
  showMessage("verifyMessage", "Checking certificate...");
  setCertificateVisible(false);
  currentCertificate = null;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verify/${encodeURIComponent(id)}`
    );

    const data = await response.json().catch(() => ({}));

    $("verificationResult").hidden = false;

    if (!response.ok || !data.certificate) {
      $("statusBadge").textContent = "INVALID";
      $("statusBadge").className = "status-badge invalid";
      $("statusMessage").textContent =
        data.message || "No certificate was found with this ID.";
      showMessage("verifyMessage", "");
      return;
    }

    if (data.result !== "valid") {
      $("statusBadge").textContent = "REVOKED";
      $("statusBadge").className = "status-badge revoked";
      $("statusMessage").textContent =
        "This certificate has been revoked and should not be treated as valid.";
      showMessage("verifyMessage", "");
      return;
    }

    currentCertificate = data.certificate;
    displayCertificate(currentCertificate);
    $("statusBadge").textContent = "VALID";
    $("statusBadge").className = "status-badge valid";
    $("statusMessage").textContent =
      "This certificate exists and is currently marked valid.";
    $("certificateSection").hidden = false;
    showMessage("verifyMessage", "Certificate verified successfully.", "success");
  } catch (error) {
    console.error(error);
    $("verificationResult").hidden = true;
    showMessage(
      "verifyMessage",
      "Cannot connect to the verification server. Please try again later.",
      "error"
    );
  }
}

function displayCertificate(cert) {
  $("certTitle").textContent =
    cert.certificate_type || "Certificate of Completion";
  $("certStudent").textContent = cert.student_name || "";
  $("certCourse").textContent = cert.course || "";
  $("certId").textContent = cert.certificate_id || "";
  $("certDate").textContent = cert.issue_date || "";
  $("certIssuer").textContent = cert.issued_by || "";
  $("certIssuerFooter").textContent = cert.issued_by || "";

  const qrContainer = $("certificateQR");
  qrContainer.replaceChildren();

  const verificationUrl = new URL(window.location.href);
  verificationUrl.searchParams.set("id", cert.certificate_id);
  verificationUrl.hash = "";

  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: verificationUrl.href,
      width: 110,
      height: 110
    });
  } else {
    qrContainer.textContent = "QR code unavailable";
  }
}

$("verifyForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("certificateId").value.trim();
  if (id) {
    verifyCertificate(id);
  }
});


$("printButton").addEventListener("click", () => {
    if ($("certificateSection").hidden) {
        alert("Please verify a certificate before printing.");
        return;
    }

    document.body.classList.remove("printing-admin");
    document.body.classList.add("printing-public");

    const cleanup = () => {
        document.body.classList.remove("printing-public");
        window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
});




$("downloadButton").addEventListener("click", async () => {
    if ($("certificateSection").hidden) {
        alert("Please verify a certificate before downloading.");
        return;
    }

    if (typeof html2canvas === "undefined" ||
        typeof window.jspdf === "undefined") {
        alert("PDF libraries did not load. Check your internet connection and refresh the page.");
        return;
    }

    const button = $("downloadButton");
    const certificate = $("certificate");

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Preparing PDF...";

    try {
        const canvas = await html2canvas(certificate, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false
        });

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = 297;
        const pageHeight = 210;
        const margin = 8;

        const imageWidth = canvas.width;
        const imageHeight = canvas.height;

        const scale = Math.min(
            (pageWidth - 2 * margin) / imageWidth,
            (pageHeight - 2 * margin) / imageHeight
        );

        const finalWidth = imageWidth * scale;
        const finalHeight = imageHeight * scale;

        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        pdf.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            x,
            y,
            finalWidth,
            finalHeight
        );

        const certificateId =
            $("certId").textContent.trim() || "certificate";

        pdf.save(`${certificateId}.pdf`);
    } catch (error) {
        console.error("PDF download failed:", error);
        alert("Could not generate the PDF. Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});


// Automatically verify a certificate when the page is opened from a QR link.
const initialId = new URLSearchParams(window.location.search).get("id");

if (initialId) {
  $("certificateId").value = initialId;
  verifyCertificate(initialId);
}
