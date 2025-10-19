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
  }
}

function closeApprovalModal() {
  const modal = document.getElementById("approval-modal");
  if (modal) {
    modal.style.display = "none";
  }
  currentVoterId = null;
}

document.addEventListener("DOMContentLoaded", function () {
  const approvalConfirmBtn = document.getElementById("approval-modal-confirm");

  if (approvalConfirmBtn) {
    approvalConfirmBtn.addEventListener("click", async function () {
      if (!currentVoterId) return;

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
        }
      } catch (error) {
        console.error("Error approving voter:", error);
        alert("Failed to approve voter. Please try again.");
      }
    });
  }
});

// Load Add Voter Form
async function loadAddVoterForm() {
  try {
    const response = await fetch("/admin/add-voter-form");
    const html = await response.text();
    const voterForm = document.getElementById("voter-form");
    voterForm.innerHTML = html;
  } catch (error) {
    console.error("Error loading voter form:", error);
    document.getElementById("voter-form").innerHTML =
      "Error loading voter form";
  }
}

function removeVoterForm() {
  const voterForm = document.getElementById("voter-form");
  voterForm.innerHTML = "";
}

// Load Add Candidate Form
async function loadAddCandidateForm() {
  try {
    const response = await fetch("/admin/add-candidate-form");
    const html = await response.text();
    const candidateForm = document.getElementById("candidate-form");
    candidateForm.innerHTML = html;
  } catch (error) {
    console.error("Error loading candidate form:", error);
    document.getElementById("candidate-form").innerHTML =
      "Error loading candidate form";
  }
}

function removeCandidateForm() {
  const candidateForm = document.getElementById("candidate-form");
  candidateForm.innerHTML = "";
}

// Load Upload Voters Form
async function loadUploadVotersForm() {
  try {
    const response = await fetch("/admin/upload-voters-form");
    const html = await response.text();
    const uploadForm = document.getElementById("upload-voters-form");
    uploadForm.innerHTML = html;
  } catch (error) {
    console.error("Error loading upload form:", error);
    document.getElementById("upload-voters-form").innerHTML =
      "Error loading upload form";
  }
}

function removeUploadVotersForm() {
  const uploadForm = document.getElementById("upload-voters-form");
  uploadForm.innerHTML = "";
}

// Load Add Admin Form (Super Admin Only)
async function loadAddAdminForm() {
  if (!window.isSuperAdmin) {
    alert("Access denied. Super admin only.");
    return;
  }

  try {
    const response = await fetch("/admin/add-admin-form");
    if (response.status === 403) {
      alert("Access denied. Super admin only.");
      return;
    }
    const html = await response.text();
    const adminForm = document.getElementById("admin-form");
    adminForm.innerHTML = html;
  } catch (error) {
    console.error("Error loading admin form:", error);
    document.getElementById("admin-form").innerHTML =
      "Error loading admin form";
  }
}

function removeAdminForm() {
  const adminForm = document.getElementById("admin-form");
  adminForm.innerHTML = "";
}
