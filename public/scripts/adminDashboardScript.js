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

        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');

        if (modal && modalTitle && modalMessage) {
          modal.style.display = 'block';
          modalTitle.textContent = isOtpRequest
            ? 'Request OTP'
            : 'Approve Student';
          modalMessage.textContent = `Are you sure you want to ${
            isOtpRequest ? 'request OTP for' : 'approve'
          } this student?`;
        }
      });
    });

  document.querySelector('.modal-close').addEventListener('click', function () {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  });

  document
    .getElementById('modal-cancel')
    .addEventListener('click', function () {
      const modal = document.getElementById('confirmation-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });

  document
    .getElementById('modal-confirm')
    .addEventListener('click', function () {
      if (targetForm) {
        if (isOtpRequest) {
          const formData = new FormData(targetForm);

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
              const studentId = targetForm
                .querySelector('button.otp-request')
                .getAttribute('data-student-id');
              const otpInput = document.querySelector(
                `#otp-input-${studentId}`
              );

              if (otpInput) {
                otpInput.style.display = 'inline';
              }
            })
            .catch(() => {
              alert('Failed to request OTP.');
            });
        } else {
          targetForm.submit();
        }
      }

      const modal = document.getElementById('confirmation-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
});
