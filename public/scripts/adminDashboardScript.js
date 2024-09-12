// Handle modals in admin dashboard

document.addEventListener('DOMContentLoaded', function () {
  let targetForm = null;
  let isOtpRequest = false;

  document
    .querySelectorAll('button.otp-request, button.approve')
    .forEach(function (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();

        targetForm = button.closest('form');
        isOtpRequest = button.classList.contains('otp-request');

        document.getElementById('confirmation-modal').style.display = 'block';

        document.getElementById('modal-title').textContent = isOtpRequest
          ? 'Request OTP'
          : 'Approve Student';
        document.getElementById(
          'modal-message'
        ).textContent = `Are you sure you want to ${
          isOtpRequest ? 'request OTP for' : 'approve'
        } this student?`;
      });
    });

  document.querySelector('.modal-close').addEventListener('click', function () {
    document.getElementById('confirmation-modal').style.display = 'none';
  });

  document
    .getElementById('modal-cancel')
    .addEventListener('click', function () {
      document.getElementById('confirmation-modal').style.display = 'none';
    });

  document
    .getElementById('modal-confirm')
    .addEventListener('click', function () {
      if (targetForm) {
        if (isOtpRequest) {
          var formData = new FormData(targetForm);

          fetch(targetForm.action, {
            method: 'POST',
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.text();
            })
            .then((data) => {
              var studentId = targetForm
                .querySelector('button.otp-request')
                .getAttribute('data-student-id');
              var otpInput = document.querySelector(`#otp-input-${studentId}`);

              if (otpInput) {
                otpInput.style.display = 'inline';
              }
            })
            .catch((error) => {
              console.error('Error requesting OTP:', error);
              alert('Failed to request OTP.');
            });
        } else {
          targetForm.submit();
        }
      }

      document.getElementById('confirmation-modal').style.display = 'none';
    });
});

// window.history.replaceState(null, null, window.location.href);
