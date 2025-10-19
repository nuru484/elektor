document.addEventListener("DOMContentLoaded", function () {
  const approvalModal = document.getElementById("approval-modal");
  const approvalModalCancel = document.getElementById("approval-modal-cancel");
  const approvalModalConfirm = document.getElementById(
    "approval-modal-confirm"
  );
  const approvalModalMessage = document.getElementById(
    "approval-modal-message"
  );

  if (approvalModalCancel) {
    approvalModalCancel.addEventListener("click", closeApprovalModal);
  }

  if (approvalModalConfirm) {
    approvalModalConfirm.addEventListener("click", async function () {
      if (!currentVoterId) return;

      this.disabled = true;
      const originalText = this.innerHTML;
      this.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Approving...`;

      try {
        const response = await fetch(`/admin/approve-voter/${currentVoterId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (data.success) {
          showSuccessNotification(data.message);
          closeApprovalModal();
          location.reload();
        } else {
          showErrorNotification(data.error);
        }
      } catch (error) {
        showErrorNotification("Network error occurred.");
      } finally {
        this.disabled = false;
        this.innerHTML = originalText;
      }
    });
  }

  setupModalCloseOnOutsideClick();
  setupEscapeKeyClose();
});

let currentVoterId = null;

function showApprovalModal(voterId, voterName) {
  currentVoterId = voterId;
  approvalModalMessage.textContent = `Are you sure you want to approve ${voterName}?`;
  approvalModal.style.display = "flex";
  document.body.classList.add("modal-open");
}

function closeApprovalModal() {
  approvalModal.style.display = "none";
  document.body.classList.remove("modal-open");
  currentVoterId = null;
}

async function loadAddVoterForm() {
  const modal = document.getElementById("voter-form-modal");
  const formContainer = document.getElementById("voter-form");

  try {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    showLoadingSpinner("voter-form", "slate");

    const response = await fetch("/admin/add-voter-form");
    if (!response.ok) throw new Error("Failed to load form");

    formContainer.innerHTML = await response.text();

    const form = formContainer.querySelector("#add-voter-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Adding...`;

        try {
          const formData = new FormData(form);

          const jsonData = {};
          for (let [key, value] of formData.entries()) {
            jsonData[key] = value;
          }

          const response = await fetch("/admin/add-voter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(jsonData),
          });

          const data = await response.json();

          if (data.success) {
            showSuccessNotification(data.message);
            removeVoterForm();
            location.reload();
          } else {
            showErrorNotification(data.error);
          }
        } catch (error) {
          showErrorNotification("Network error occurred.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }
  } catch (error) {
    showError("voter-form", "Failed to load voter form.");
  }
}

function removeVoterForm() {
  const modal = document.getElementById("voter-form-modal");
  document.getElementById("voter-form").innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function loadAddCandidateForm() {
  const modal = document.getElementById("candidate-form-modal");
  const formContainer = document.getElementById("candidate-form");

  try {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    showLoadingSpinner("candidate-form", "slate");

    const response = await fetch("/admin/add-candidate-form");
    if (!response.ok) throw new Error("Failed to load form");

    formContainer.innerHTML = await response.text();

    const form = formContainer.querySelector("#add-candidate-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Adding...`;

        try {
          const formData = new FormData(form);
          const response = await fetch("/admin/add-candidate", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();

          if (data.success) {
            showSuccessNotification(data.message);
            removeCandidateForm();
            location.reload();
          } else {
            showErrorNotification(data.error);
          }
        } catch (error) {
          showErrorNotification("Network error occurred.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }
  } catch (error) {
    showError("candidate-form", "Failed to load candidate form.");
  }
}

function removeCandidateForm() {
  const modal = document.getElementById("candidate-form-modal");
  document.getElementById("candidate-form").innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function loadUploadVotersForm() {
  const modal = document.getElementById("upload-voters-form-modal");
  const formContainer = document.getElementById("upload-voters-form");

  try {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    showLoadingSpinner("upload-voters-form", "slate");

    const response = await fetch("/admin/upload-voters-form");
    if (!response.ok) throw new Error("Failed to load form");

    formContainer.innerHTML = await response.text();

    const form = formContainer.querySelector("#upload-voters-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Uploading...`;

        try {
          const formData = new FormData(form);
          const response = await fetch("/admin/upload-voters", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();

          if (data.success) {
            showSuccessNotification(data.message);
            removeUploadVotersForm();
            location.reload();
          } else {
            showErrorNotification(data.error);
          }
        } catch (error) {
          showErrorNotification("Network error occurred.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }
  } catch (error) {
    showError("upload-voters-form", "Failed to load upload form.");
  }
}

function removeUploadVotersForm() {
  const modal = document.getElementById("upload-voters-form-modal");
  document.getElementById("upload-voters-form").innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function loadAddAdminForm() {
  if (!window.isSuperAdmin) {
    showErrorNotification("Access denied. Super admin only.");
    return;
  }

  const modal = document.getElementById("admin-form-modal");
  const formContainer = document.getElementById("admin-form");

  try {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    showLoadingSpinner("admin-form", "slate");

    const response = await fetch("/admin/add-admin-form");
    if (!response.ok) throw new Error("Failed to load form");

    formContainer.innerHTML = await response.text();

    const form = formContainer.querySelector("#add-admin-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Adding...`;

        try {
          const formData = new FormData(form);
          const jsonData = Object.fromEntries(formData);

          const response = await fetch("/admin/add-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonData),
          });
          const data = await response.json();

          if (data.success) {
            showSuccessNotification(data.message);
            removeAdminForm();
            location.reload();
          } else {
            showErrorNotification(data.error);
          }
        } catch (error) {
          showErrorNotification("Network error occurred.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }
  } catch (error) {
    showError("admin-form", "Failed to load admin form.");
  }
}

function removeAdminForm() {
  const modal = document.getElementById("admin-form-modal");
  document.getElementById("admin-form").innerHTML = "";
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function setupModalCloseOnOutsideClick() {
  [
    "voter-form-modal",
    "candidate-form-modal",
    "upload-voters-form-modal",
    "admin-form-modal",
  ].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          const closeFuncs = {
            "voter-form-modal": removeVoterForm,
            "candidate-form-modal": removeCandidateForm,
            "upload-voters-form-modal": removeUploadVotersForm,
            "admin-form-modal": removeAdminForm,
          };
          closeFuncs[id]();
        }
      });
    }
  });

  approvalModal.addEventListener("click", (e) => {
    if (e.target === approvalModal) closeApprovalModal();
  });
}

function setupEscapeKeyClose() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (
        document.getElementById("voter-form-modal").classList.contains("active")
      )
        removeVoterForm();
      if (
        document
          .getElementById("candidate-form-modal")
          .classList.contains("active")
      )
        removeCandidateForm();
      if (
        document
          .getElementById("upload-voters-form-modal")
          .classList.contains("active")
      )
        removeUploadVotersForm();
      if (
        document.getElementById("admin-form-modal").classList.contains("active")
      )
        removeAdminForm();
      if (approvalModal.style.display === "flex") closeApprovalModal();
    }
  });
}

function showLoadingSpinner(containerId, color = "gray") {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-64">
        <svg class="animate-spin h-8 w-8 text-${color}-500" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>`;
  }
}

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
        <div class="flex items-center">
          <svg class="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-red-700">${message}</p>
        </div>
      </div>`;
  }
}

function showSuccessNotification(message) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-[200]";
  notification.innerHTML = `
    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    ${message}`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add(
      "opacity-0",
      "transition-opacity",
      "duration-300"
    );
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showErrorNotification(message) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-[200]";
  notification.innerHTML = `
    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    ${message}`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add(
      "opacity-0",
      "transition-opacity",
      "duration-300"
    );
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showSuccessNotification(message, duration = 3000) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-[200] animate-slide-in max-w-md";
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="flex-1">
        <p class="font-semibold text-sm">Success</p>
        <p class="text-sm opacity-90">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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
    "fixed top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-2xl z-[200] animate-slide-in max-w-md";
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="flex-1">
        <p class="font-semibold text-sm">Error</p>
        <p class="text-sm opacity-90">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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

// Update the modal display functions to use the new style
function showApprovalModal(voterId, voterName) {
  currentVoterId = voterId;
  const modal = document.getElementById("approval-modal");
  const message = document.getElementById("approval-modal-message");

  if (modal && message) {
    message.textContent = `Are you sure you want to approve ${voterName}?`;
    modal.style.display = "flex";
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
