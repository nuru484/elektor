document.addEventListener("DOMContentLoaded", function () {
  const voteButtons = document.querySelectorAll(".vote-button");
  const skipButtons = document.querySelectorAll(".skip-button");
  const submitVoteButton = document.getElementById("submitVoteButton");
  const confirmationModal = document.getElementById("confirmationModal");
  const confirmationModalSelect = document.getElementById(
    "confirmationModalSelect"
  );
  const voteCountedModal = document.getElementById("voteCountedModal");
  const confirmVoteButton = document.getElementById("confirmVoteButton");
  const cancelVoteButton = document.getElementById("cancelVoteButton");
  const backToVoteAllButton = document.getElementById("backToVoteAllButton");
  const selectedCandidatesList = document.getElementById(
    "selectedCandidatesList"
  );
  const voteForm = document.getElementById("voteForm");

  if (voteButtons.length === 0 && skipButtons.length === 0) {
    submitVoteButton.disabled = true;
    submitVoteButton.textContent = "No Candidates Available";
    submitVoteButton.style.opacity = "0.5";
    submitVoteButton.style.cursor = "not-allowed";
  }

  // Handle vote button clicks
  voteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const position = this.getAttribute("data-position");
      const candidateId = this.getAttribute("data-candidate-id");

      document
        .querySelectorAll(`.vote-button[data-position='${position}']`)
        .forEach((btn) => btn.classList.remove("selected"));

      const skipButton = document.querySelector(
        `.skip-button[data-position='${position}']`
      );

      if (skipButton) {
        skipButton.classList.remove("selected");
      }

      this.classList.add("selected");

      const positionKey = position.replace(/\s+/g, "");
      const hiddenInput = document.getElementById(`hidden-${positionKey}`);
      if (hiddenInput) {
        hiddenInput.value = candidateId;
      }

      console.log(`Selected: Candidate ${candidateId} for ${position}`);
    });
  });

  skipButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const position = this.getAttribute("data-position");
      const positionKey = position.replace(/\s+/g, "");

      document
        .querySelectorAll(`.vote-button[data-position='${position}']`)
        .forEach((btn) => btn.classList.remove("selected"));

      const skipButton = document.querySelector(
        `.skip-button[data-position='${position}']`
      );
      if (skipButton) {
        skipButton.classList.remove("selected");
      }

      this.classList.add("selected");

      const hiddenInput = document.getElementById(`hidden-${positionKey}`);
      if (hiddenInput) {
        hiddenInput.value = "skipped";
      }
    });
  });

  submitVoteButton.addEventListener("click", function (e) {
    e.preventDefault();

    const hiddenInputs = document.querySelectorAll(
      'input[type="hidden"][required]'
    );

    if (hiddenInputs.length === 0) {
      showErrorAlert("No candidates available for voting at this time.");
      return;
    }

    const selectedCandidates = {};
    let allPositionsVoted = true;

    hiddenInputs.forEach((input) => {
      const value = input.value;
      const position = input.name.replace("CandidateId", "");

      if (!value || value.trim() === "") {
        allPositionsVoted = false;
        return;
      }

      if (value === "skipped") {
        selectedCandidates[position] = "Skipped";
      } else {
        const candidateButton = document.querySelector(
          `button[data-position][data-candidate-id="${value}"]`
        );

        if (candidateButton) {
          const candidateName = candidateButton.getAttribute(
            "data-candidate-name"
          );
          selectedCandidates[position] = candidateName || `Candidate ${value}`;
        } else {
          selectedCandidates[position] = `Candidate ${value}`;
        }
      }
    });

    if (!allPositionsVoted) {
      confirmationModalSelect.style.display = "flex";
      return;
    }

    selectedCandidatesList.innerHTML = "";
    for (const position in selectedCandidates) {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200";
      li.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-900">${position}</div>
            <div class="text-sm ${
              selectedCandidates[position] === "Skipped"
                ? "text-gray-500 italic"
                : "text-slate-700 font-medium"
            }">${selectedCandidates[position]}</div>
          </div>
        </div>
      `;
      selectedCandidatesList.appendChild(li);
    }

    confirmationModal.style.display = "flex";
  });

  confirmVoteButton.addEventListener("click", async function () {
    confirmVoteButton.disabled = true;
    const originalHTML = confirmVoteButton.innerHTML;
    confirmVoteButton.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Submitting...</span>
    `;
    try {
      const formData = new FormData(voteForm);

      const jsonData = {};
      for (let [key, value] of formData.entries()) {
        jsonData[key] = value;
      }

      const response = await fetch(voteForm.action, {
        method: voteForm.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const data = await response.json();
      if (data.success) {
        confirmationModal.style.display = "none";
        voteCountedModal.style.display = "flex";
      } else {
        confirmationModal.style.display = "none";
        showErrorAlert(
          data.error || "An error occurred while submitting your vote"
        );
        confirmVoteButton.disabled = false;
        confirmVoteButton.innerHTML = originalHTML;
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      confirmationModal.style.display = "none";
      showErrorAlert(
        "Network error. Please check your connection and try again."
      );
      confirmVoteButton.disabled = false;
      confirmVoteButton.innerHTML = originalHTML;
    }
  });

  cancelVoteButton.addEventListener("click", function () {
    confirmationModal.style.display = "none";
  });

  backToVoteAllButton.addEventListener("click", function () {
    confirmationModalSelect.style.display = "none";
  });

  document
    .getElementById("closeVoteCountedModalButton")
    .addEventListener("click", function () {
      window.location.href = "/voter/login";
    });

  function showErrorAlert(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "fixed top-4 right-4 z-[150] max-w-md animate-modal";
    alertDiv.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-2xl">
        <div class="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-red-800 mb-1">Error</p>
            <p class="text-sm text-red-700">${message}</p>
          </div>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="ml-3 text-red-500 hover:text-red-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.remove();
    }, 8000);
  }

  window.onload = function () {
    if (performance.navigation.type === 2) {
      window.location.href = "/voter/login";
    }
  };
});
