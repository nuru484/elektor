// Handle modals in admin dashboard

document.addEventListener("DOMContentLoaded", function () {
  let targetForm = null;
  let isOtpRequest = false;

  // Existing OTP and approval handlers
  document
    .querySelectorAll("button.otp-request, button.approve")
    .forEach(function (button) {
      button.addEventListener("click", function (e) {
        e.preventDefault();

        targetForm = button.closest("form");
        isOtpRequest = button.classList.contains("otp-request");

        const modal = document.getElementById("confirmation-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalMessage = document.getElementById("modal-message");

        if (modal && modalTitle && modalMessage) {
          modal.style.display = "block";
          modalTitle.textContent = isOtpRequest
            ? "Request OTP"
            : "Approve Student";
          modalMessage.textContent = `Are you sure you want to ${
            isOtpRequest ? "request OTP for" : "approve"
          } this student?`;
        }
      });
    });

  const modalClose = document.querySelector(".modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", function () {
      const modal = document.getElementById("confirmation-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  const modalCancel = document.getElementById("modal-cancel");
  if (modalCancel) {
    modalCancel.addEventListener("click", function () {
      const modal = document.getElementById("confirmation-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  const modalConfirm = document.getElementById("modal-confirm");
  if (modalConfirm) {
    modalConfirm.addEventListener("click", function () {
      if (targetForm) {
        if (isOtpRequest) {
          const formData = new FormData(targetForm);

          fetch(targetForm.action, {
            method: "POST",
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.text();
            })
            .then((data) => {
              const studentId = targetForm
                .querySelector("button.otp-request")
                .getAttribute("data-student-id");
              const otpInput = document.querySelector(
                `#otp-input-${studentId}`
              );

              if (otpInput) {
                otpInput.style.display = "inline";
              }
            })
            .catch(() => {
              alert("Failed to request OTP.");
            });
        } else {
          targetForm.submit();
        }
      }

      const modal = document.getElementById("confirmation-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  const approvalModalClose = document.querySelector(
    "#approval-modal .modal-close"
  );
  if (approvalModalClose) {
    approvalModalClose.addEventListener("click", closeApprovalModal);
  }

  const approvalModalCancel = document.getElementById("approval-modal-cancel");
  if (approvalModalCancel) {
    approvalModalCancel.addEventListener("click", closeApprovalModal);
  }

  // Close modals when clicking outside
  setupModalCloseOnOutsideClick();
});

// Voter approval functions
let currentVoterId = null;

function showApprovalModal(voterId, voterName) {
  currentVoterId = voterId;
  const modal = document.getElementById("approval-modal");
  const message = document.getElementById("approval-modal-message");

  if (modal && message) {
    message.textContent = `Are you sure you want to approve ${voterName}?`;
    modal.style.display = "block";
    document.body.classList.add("modal-open");
  }
}

function closeApprovalModal() {
  const modal = document.getElementById("approval-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
  currentVoterId = null;
}

document.addEventListener("DOMContentLoaded", function () {
  const approvalConfirmBtn = document.getElementById("approval-modal-confirm");

  if (approvalConfirmBtn) {
    approvalConfirmBtn.addEventListener("click", async function () {
      if (!currentVoterId) return;

      // Add loading state
      approvalConfirmBtn.disabled = true;
      approvalConfirmBtn.textContent = "Approving...";

      try {
        const response = await fetch(`/admin/approve-voter/${currentVoterId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          closeApprovalModal();
          // Reload the page to show updated status
          window.location.reload();
        } else {
          alert(data.error || "Failed to approve voter");
          approvalConfirmBtn.disabled = false;
          approvalConfirmBtn.textContent = "Confirm";
        }
      } catch (error) {
        console.error("Error approving voter:", error);
        alert("Failed to approve voter. Please try again.");
        approvalConfirmBtn.disabled = false;
        approvalConfirmBtn.textContent = "Confirm";
      }
    });
  }
});

// Load Add Voter Form
async function loadAddVoterForm() {
  const modal = document.getElementById("voter-form-modal");
  const formContainer = document.getElementById("voter-form");

  try {
    formContainer.innerHTML =
      '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p class="mt-2 text-gray-600">Loading form...</p></div>';
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const response = await fetch("/admin/add-voter-form");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    formContainer.innerHTML = html;
  } catch (error) {
    console.error("Error loading voter form:", error);
    formContainer.innerHTML =
      '<div class="bg-white rounded-lg p-6 max-w-md mx-auto"><p class="text-red-600">Error loading voter form. Please try again.</p><button onclick="removeVoterForm()" class="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Close</button></div>';
  }
}

function removeVoterForm() {
  const modal = document.getElementById("voter-form-modal");
  const formContainer = document.getElementById("voter-form");

  formContainer.innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// Load Add Candidate Form
async function loadAddCandidateForm() {
  const modal = document.getElementById("candidate-form-modal");
  const formContainer = document.getElementById("candidate-form");

  try {
    formContainer.innerHTML =
      '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div><p class="mt-2 text-gray-600">Loading form...</p></div>';
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const response = await fetch("/admin/add-candidate-form");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    formContainer.innerHTML = html;
  } catch (error) {
    console.error("Error loading candidate form:", error);
    formContainer.innerHTML =
      '<div class="bg-white rounded-lg p-6 max-w-md mx-auto"><p class="text-red-600">Error loading candidate form. Please try again.</p><button onclick="removeCandidateForm()" class="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Close</button></div>';
  }
}

function removeCandidateForm() {
  const modal = document.getElementById("candidate-form-modal");
  const formContainer = document.getElementById("candidate-form");

  formContainer.innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// Load Upload Voters Form
async function loadUploadVotersForm() {
  const modal = document.getElementById("upload-voters-form-modal");
  const formContainer = document.getElementById("upload-voters-form");

  try {
    formContainer.innerHTML =
      '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div><p class="mt-2 text-gray-600">Loading form...</p></div>';
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const response = await fetch("/admin/upload-voters-form");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    formContainer.innerHTML = html;
  } catch (error) {
    console.error("Error loading upload form:", error);
    formContainer.innerHTML =
      '<div class="bg-white rounded-lg p-6 max-w-md mx-auto"><p class="text-red-600">Error loading upload form. Please try again.</p><button onclick="removeUploadVotersForm()" class="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Close</button></div>';
  }
}

function removeUploadVotersForm() {
  const modal = document.getElementById("upload-voters-form-modal");
  const formContainer = document.getElementById("upload-voters-form");

  formContainer.innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// Load Add Admin Form (Super Admin Only)
async function loadAddAdminForm() {
  if (!window.isSuperAdmin) {
    alert("Access denied. Super admin only.");
    return;
  }

  const modal = document.getElementById("admin-form-modal");
  const formContainer = document.getElementById("admin-form");

  try {
    formContainer.innerHTML =
      '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p class="mt-2 text-gray-600">Loading form...</p></div>';
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const response = await fetch("/admin/add-admin-form");

    if (response.status === 403) {
      alert("Access denied. Super admin only.");
      removeAdminForm();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    formContainer.innerHTML = html;
  } catch (error) {
    console.error("Error loading admin form:", error);
    formContainer.innerHTML =
      '<div class="bg-white rounded-lg p-6 max-w-md mx-auto"><p class="text-red-600">Error loading admin form. Please try again.</p><button onclick="removeAdminForm()" class="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Close</button></div>';
  }
}

function removeAdminForm() {
  const modal = document.getElementById("admin-form-modal");
  const formContainer = document.getElementById("admin-form");

  formContainer.innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// Setup modal close on outside click
function setupModalCloseOnOutsideClick() {
  // Close form modals when clicking on overlay
  const formModals = [
    { modal: "voter-form-modal", closeFunc: removeVoterForm },
    { modal: "candidate-form-modal", closeFunc: removeCandidateForm },
    { modal: "upload-voters-form-modal", closeFunc: removeUploadVotersForm },
    { modal: "admin-form-modal", closeFunc: removeAdminForm },
  ];

  formModals.forEach(({ modal, closeFunc }) => {
    const modalElement = document.getElementById(modal);
    if (modalElement) {
      modalElement.addEventListener("click", (e) => {
        // Only close if clicking directly on the overlay (not the content)
        if (e.target === modalElement) {
          closeFunc();
        }
      });
    }
  });

  // Close approval modal when clicking outside
  const approvalModal = document.getElementById("approval-modal");
  if (approvalModal) {
    approvalModal.addEventListener("click", (e) => {
      if (e.target === approvalModal) {
        closeApprovalModal();
      }
    });
  }
}

// Handle escape key to close modals
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    // Close any active modal
    const voterModal = document.getElementById("voter-form-modal");
    const candidateModal = document.getElementById("candidate-form-modal");
    const uploadModal = document.getElementById("upload-voters-form-modal");
    const adminModal = document.getElementById("admin-form-modal");
    const approvalModal = document.getElementById("approval-modal");

    if (voterModal && voterModal.classList.contains("active")) {
      removeVoterForm();
    } else if (candidateModal && candidateModal.classList.contains("active")) {
      removeCandidateForm();
    } else if (uploadModal && uploadModal.classList.contains("active")) {
      removeUploadVotersForm();
    } else if (adminModal && adminModal.classList.contains("active")) {
      removeAdminForm();
    } else if (approvalModal && approvalModal.style.display === "block") {
      closeApprovalModal();
    }
  }
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
  window.history.replaceState(null, null, window.location.href);
}

// Auto-hide success/error messages after 5 seconds
document.addEventListener("DOMContentLoaded", function () {
  const messages = document.querySelectorAll(
    ".alert, .success-message, .error-message"
  );

  messages.forEach((message) => {
    setTimeout(() => {
      message.style.transition = "opacity 0.5s ease";
      message.style.opacity = "0";
      setTimeout(() => {
        message.remove();
      }, 500);
    }, 5000);
  });
});

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = "smooth";

// Table row hover effect enhancement
document.addEventListener("DOMContentLoaded", function () {
  const tableRows = document.querySelectorAll("tbody tr");

  tableRows.forEach((row) => {
    row.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.01)";
      this.style.transition = "transform 0.2s ease";
    });

    row.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });
  });
});

// Form validation helper
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  const inputs = form.querySelectorAll("input[required], select[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add("border-red-500");
      input.addEventListener(
        "input",
        function () {
          this.classList.remove("border-red-500");
        },
        { once: true }
      );
    }
  });

  if (!isValid) {
    alert("Please fill in all required fields.");
  }

  return isValid;
}

// Loading spinner utility
function showLoadingSpinner(containerId, color = "blue") {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-${color}-600"></div>
        <p class="mt-4 text-gray-600 text-lg">Loading...</p>
      </div>
    `;
  }
}

// Error display utility
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg">
        <div class="flex items-center mb-4">
          <svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-red-600">Error</h3>
        </div>
        <p class="text-gray-700 mb-4">${message}</p>
        <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Reload Page
        </button>
      </div>
    `;
  }
}

// Success notification
function showSuccessNotification(message, duration = 3000) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in";
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    notification.style.transition = "all 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Error notification
function showErrorNotification(message, duration = 5000) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in";
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    notification.style.transition = "all 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Add CSS animation for notifications
const style = document.createElement("style");
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);

console.log("Admin Dashboard Script Loaded Successfully");
