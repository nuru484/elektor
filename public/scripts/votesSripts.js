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

  // **NEW: Check if there are any candidates on page load**
  if (voteButtons.length === 0 && skipButtons.length === 0) {
    // No candidates available, disable submit button
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

      // Deselect all vote buttons for this position
      document
        .querySelectorAll(`.vote-button[data-position='${position}']`)
        .forEach((btn) => btn.classList.remove("selected"));

      // Deselect the skip button for this position
      const skipButton = document.querySelector(
        `.skip-button[data-position='${position}']`
      );
      if (skipButton) {
        skipButton.classList.remove("selected");
      }

      // Select the clicked vote button
      this.classList.add("selected");

      // Update the hidden input with the selected candidate's ID
      const positionKey = position.replace(/\s+/g, "");
      const hiddenInput = document.getElementById(`hidden-${positionKey}`);
      if (hiddenInput) {
        hiddenInput.value = candidateId;
      }

      console.log(`Selected: Candidate ${candidateId} for ${position}`);
    });
  });

  // Handle skip button clicks
  skipButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const position = this.getAttribute("data-position");
      const positionKey = position.replace(/\s+/g, "");

      // Deselect all vote buttons for this position
      document
        .querySelectorAll(`.vote-button[data-position='${position}']`)
        .forEach((btn) => btn.classList.remove("selected"));

      // Deselect any previously selected skip button for this position
      const skipButton = document.querySelector(
        `.skip-button[data-position='${position}']`
      );
      if (skipButton) {
        skipButton.classList.remove("selected");
      }

      // Select the clicked skip button
      this.classList.add("selected");

      // Set the hidden input to 'skipped'
      const hiddenInput = document.getElementById(`hidden-${positionKey}`);
      if (hiddenInput) {
        hiddenInput.value = "skipped";
      }

      console.log(`Skipped position: ${position}`);
    });
  });

  // Handle submit vote button
  submitVoteButton.addEventListener("click", function (e) {
    e.preventDefault();

    // **NEW: Double-check if candidates exist**
    const hiddenInputs = document.querySelectorAll(
      'input[type="hidden"][required]'
    );

    if (hiddenInputs.length === 0) {
      alert("No candidates available for voting at this time.");
      return;
    }

    const selectedCandidates = {};
    let allPositionsVoted = true;

    // Loop through each position and get the selected candidate's name
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
        // Find the candidate name from the button
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

    // Check if all positions have been voted or skipped
    if (!allPositionsVoted) {
      confirmationModalSelect.style.display = "block";
      return;
    }

    // Populate the modal with the selected candidates
    selectedCandidatesList.innerHTML = "";
    for (const position in selectedCandidates) {
      const li = document.createElement("li");
      li.textContent = `${position}: ${selectedCandidates[position]}`;
      selectedCandidatesList.appendChild(li);
    }

    // Show the confirmation modal
    confirmationModal.style.display = "block";
  });

  // Handle confirm vote button
  confirmVoteButton.addEventListener("click", function () {
    confirmationModal.style.display = "none";

    // Submit the form normally (this will use POST with form data)
    voteForm.submit();

    // Show the "Vote Counted" modal after a short delay
    setTimeout(() => {
      voteCountedModal.style.display = "block";
    }, 500);
  });

  // Handle cancel vote button
  cancelVoteButton.addEventListener("click", function () {
    confirmationModal.style.display = "none";
  });

  // Handle back to vote all button
  backToVoteAllButton.addEventListener("click", function () {
    confirmationModalSelect.style.display = "none";
  });

  // Handle close vote counted modal
  document
    .getElementById("closeVoteCountedModalButton")
    .addEventListener("click", function () {
      window.location.href = "/userLogin";
    });

  // Prevent back button navigation
  window.onload = function () {
    if (performance.navigation.type === 2) {
      window.location.href = "/userLogin";
    }
  };
});
