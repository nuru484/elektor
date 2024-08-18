document.addEventListener('DOMContentLoaded', function () {
  const voteButtons = document.querySelectorAll('.vote-button');

  voteButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const position = this.getAttribute('data-position');
      const candidateId = this.getAttribute('data-candidate-id');

      // Remove the 'selected' class from all buttons of the same position
      document
        .querySelectorAll(`.vote-button[data-position='${position}']`)
        .forEach((btn) => btn.classList.remove('selected'));

      // Add the 'selected' class to the clicked button
      this.classList.add('selected');

      // Update the hidden input with the selected candidate's ID
      document.getElementById(`hidden-${position}`).value = candidateId;
    });
  });
});

// confirm vote script
document
  .getElementById('submitVoteButton')
  .addEventListener('click', function () {
    const selectedCandidates = {};

    // Loop through each position and get the selected candidate's name
    document.querySelectorAll('input[type="hidden"]').forEach((input) => {
      if (input.value) {
        const position = input.name.replace('CandidateId', '');
        const candidateName = document.querySelector(
          `label[for="candidate-${position}-${input.value}"] .candidate-name`
        ).textContent;
        selectedCandidates[position] = candidateName;
      }
    });

    if (Object.entries(selectedCandidates).length !== 8) {
      // Show  select all vote modal
      document.getElementById('confirmationModalSelect').style.display =
        'block';
    } else {
      // Populate the modal with the selected candidates
      const selectedCandidatesList = document.getElementById(
        'selectedCandidatesList'
      );
      selectedCandidatesList.innerHTML = ''; // Clear the list
      for (const position in selectedCandidates) {
        const li = document.createElement('li');
        li.textContent = `${position}: ${selectedCandidates[position]}`;
        selectedCandidatesList.appendChild(li);
      }

      // Show the modal
      document.getElementById('confirmationModal').style.display = 'block';
    }
  });

// document
//   .getElementById('confirmVoteButton')
//   .addEventListener('click', function () {
//     // Submit the form if the user confirms
//     document.getElementById('voteForm').submit();
//   });

document
  .getElementById('cancelVoteButton')
  .addEventListener('click', function () {
    // Close the modal if the user cancels
    document.getElementById('confirmationModal').style.display = 'none';
  });

// vote success
document
  .getElementById('confirmVoteButton')
  .addEventListener('click', function () {
    // Submit the form if the user confirms
    document.getElementById('voteForm').submit();

    // Show the "Vote Counted" modal
    document.getElementById('confirmationModal').style.display = 'none';
    document.getElementById('voteCountedModal').style.display = 'block';
  });

document
  .getElementById('closeVoteCountedModalButton')
  .addEventListener('click', function () {
    // Close the modal and redirect or do other actions if needed
    document.getElementById('voteCountedModal').style.display = 'none';
    window.location.href = '/'; // Redirect to homepage or another page after closing
  });

document
  .getElementById('backToVoteAllButton')
  .addEventListener('click', function () {
    // Close the modal if the user cancels
    document.getElementById('confirmationModalSelect').style.display = 'none';
  });
