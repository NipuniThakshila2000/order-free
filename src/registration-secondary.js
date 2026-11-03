const sourceForm = document.querySelector('#program-registration-form');
const mount = document.querySelector('#recovery-registration-form-mount');
if (sourceForm && mount) {
  const form = sourceForm.cloneNode(true);
  form.id = 'recovery-registration-form';
  const status = form.querySelector('#program-form-status');
  status.id = 'recovery-program-form-status';
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  mount.append(form);

  fetch('/api/register').then((response) => response.json()).then(({ready}) => {
    if (!ready) return;
    button.disabled = false;
    button.textContent = 'Register for the free program ↗';
    status.textContent = '';
  }).catch(() => {});

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    status.textContent = 'Saving your registration…';
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Registration could not be saved.');
      form.reset();
      status.textContent = 'Your registration was received. Thank you!';
    } catch (problem) {
      status.textContent = problem.message || 'Registration could not be saved. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelector('#recovery-cta')?.addEventListener('click', () => {
  document.querySelector('#recovery-dialog')?.close();
});
