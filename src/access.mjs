const endpoint = 'api/access';

async function request(action, options = {}) {
  const response = await fetch(`${endpoint}?action=${action}`, {
    credentials:'same-origin',
    cache:'no-store',
    ...options,
    headers: options.body ? {'Content-Type':'application/json'} : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

function post(action, data) {
  return request(action, {method:'POST', body:JSON.stringify(data)});
}

export function initializeReadingAccess({showSample, unlock}) {
  const dialog = document.querySelector('#access-dialog');
  const applyPanel = document.querySelector('#access-apply-panel');
  const loginPanel = document.querySelector('#access-login-panel');
  const successPanel = document.querySelector('#access-success-panel');
  const applyForm = document.querySelector('#access-apply-form');
  const loginForm = document.querySelector('#access-login-form');
  const codeForm = document.querySelector('#access-code-form');
  const applyError = document.querySelector('#access-apply-error');
  const loginMessage = document.querySelector('#access-login-message');
  const accessButton = document.querySelector('#access-open');
  const headerLogin = document.querySelector('#header-login');
  const gate = document.querySelector('#demo-gate');
  const recoveryNav = document.querySelector('.site-header nav a[href="#recovery"]');
  if (recoveryNav) recoveryNav.href = '#reading';
  let approved = false;
  let prompted = false;

  function panel(name) {
    applyPanel.hidden = name !== 'apply';
    loginPanel.hidden = name !== 'login';
    successPanel.hidden = name !== 'success';
    dialog.setAttribute('aria-label', name === 'apply' ? 'Apply for full access' : name === 'login' ? 'Sign in' : 'Application received');
  }

  function open(name = 'apply') {
    panel(name);
    if (!dialog.open) dialog.showModal();
    (name === 'apply' ? applyForm.elements.fullName : name === 'login' ? loginForm.elements.email : document.querySelector('#access-done')).focus();
  }

  showSample();
  request('session').then((data) => {
    if (data.authenticated && data.purpose === 'reader') {
      approved = true;
      unlock(data.email);
      accessButton.textContent = 'Sign out';
      headerLogin.textContent = 'Sign out';
      if (recoveryNav) recoveryNav.href = '#recovery';
    }
  }).catch(() => {
    document.querySelector('#access-status').textContent = 'Sign-in is temporarily unavailable. The sample remains open.';
  });

  async function signOut() {
    try { await post('logout', {}); window.location.reload(); }
    catch { document.querySelector('#access-status').textContent = 'Could not sign out. Please try again.'; }
  }
  accessButton.addEventListener('click', () => approved ? signOut() : open('apply'));
  headerLogin.addEventListener('click', () => approved ? signOut() : open('login'));
  document.querySelector('#demo-apply').addEventListener('click', () => open('apply'));
  document.querySelector('#demo-signin').addEventListener('click', () => open('login'));
  document.querySelector('#access-show-login').addEventListener('click', () => open('login'));
  document.querySelector('#access-show-apply').addEventListener('click', () => open('apply'));
  document.querySelector('#access-close').addEventListener('click', () => dialog.close());
  document.querySelector('#access-done').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!approved && !prompted && entries.some((entry) => entry.isIntersecting)) {
        prompted = true;
        open('apply');
        observer.disconnect();
      }
    }, {threshold:.3});
    observer.observe(gate);
  }

  applyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!applyForm.reportValidity()) return;
    applyError.hidden = true;
    const button = applyForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const data = await post('apply', Object.fromEntries(new FormData(applyForm)));
      if (data.alreadyApproved) {
        loginForm.elements.email.value = applyForm.elements.email.value;
        loginMessage.textContent = 'This email is already approved. Request a sign-in code below.';
        open('login');
      } else {
        applyForm.reset();
        panel('success');
      }
    } catch (error) {
      applyError.textContent = error.message;
      applyError.hidden = false;
    } finally { button.disabled = false; }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const button = loginForm.querySelector('[type="submit"]');
    button.disabled = true;
    loginMessage.textContent = 'Sending your sign-in code…';
    try {
      await post('request-code', {email:loginForm.elements.email.value, purpose:'reader'});
      codeForm.hidden = false;
      loginMessage.textContent = 'If this email is approved, a six-digit sign-in code is on its way. Check your inbox and spam folder.';
      codeForm.elements.code.focus();
    } catch (error) { loginMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });

  codeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!codeForm.reportValidity()) return;
    const button = codeForm.querySelector('[type="submit"]');
    button.disabled = true;
    loginMessage.textContent = 'Checking your code…';
    try {
      await post('verify-code', {email:loginForm.elements.email.value, code:codeForm.elements.code.value, purpose:'reader'});
      approved = true;
      unlock(loginForm.elements.email.value.trim().toLowerCase());
      accessButton.textContent = 'Sign out';
      headerLogin.textContent = 'Sign out';
      if (recoveryNav) recoveryNav.href = '#recovery';
      dialog.close();
      document.querySelector('#reading-form').scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) { loginMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
