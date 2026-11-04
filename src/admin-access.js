const base = '/api/access';
const loginPanel = document.querySelector('#admin-login');
const dashboard = document.querySelector('#admin-dashboard');
const tokenForm = document.querySelector('#admin-token-form');
const loginStatus = document.querySelector('#admin-login-status');
const status = document.querySelector('#admin-status');
const tbody = document.querySelector('#applications-body');

async function api(action, data) {
  const response = await fetch(`${base}?action=${action}`, {
    credentials:'same-origin', cache:'no-store',
    ...(data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

async function load() {
  status.textContent = 'Loading applications…';
  try {
    const {applications} = await api('applications');
    const counts = {pending:0,approved:0,rejected:0};
    applications.forEach((item) => {counts[item.status] += 1;});
    document.querySelector('#admin-counts').innerHTML = Object.entries(counts).map(([key, value]) => `<span>${value} ${key}</span>`).join('');
    tbody.innerHTML = applications.length ? applications.map((item) => `<tr>
      <td><strong>${escapeHtml(item.fullName)}</strong><a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a></td>
      <td>${escapeHtml(item.yearsAtChurch)}</td><td>${escapeHtml(item.discovery)}</td>
      <td>${new Date(item.submittedAt).toLocaleString()}</td>
      <td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>${item.status === 'approved' && !item.approvalEmailSentAt ? '<span class="email-warning">Approval email needs retry</span>' : ''}</td>
      <td><div class="decision">
        ${item.status !== 'approved' ? `<button type="button" data-id="${item.id}" data-decision="approved">Approve</button>` : ''}
        ${item.status !== 'rejected' ? `<button type="button" class="reject" data-id="${item.id}" data-decision="rejected">Reject</button>` : ''}
        ${item.status === 'approved' ? `<button type="button" data-id="${item.id}" data-decision="resend">Resend email</button>` : ''}
      </div></td></tr>`).join('') : '<tr><td colspan="6">No applications yet.</td></tr>';
    status.textContent = '';
  } catch (error) { status.textContent = error.message; }
}

async function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await load();
}

api('session').then((session) => {
  if (session.authenticated && session.purpose === 'admin') showDashboard();
}).catch(() => { loginStatus.textContent = 'Sign-in is temporarily unavailable.'; });

tokenForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!tokenForm.reportValidity()) return;
  const button = tokenForm.querySelector('button');
  button.disabled = true;
  loginStatus.textContent = 'Signing in…';
  try {
    await api('admin-token-login', {token:tokenForm.elements.token.value});
    tokenForm.reset();
    await showDashboard();
  } catch (error) { loginStatus.textContent = error.message; }
  finally { button.disabled = false; }
});

tbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const decision = button.dataset.decision;
  if (decision === 'rejected' && !window.confirm('Reject this application and revoke any existing reading access?')) return;
  button.disabled = true;
  status.textContent = `${decision === 'resend' ? 'Sending' : 'Saving'}…`;
  try {
    const result = await api('review', {id:button.dataset.id, decision});
    await load();
    status.textContent = result.emailSent === false ? 'Application approved, but the email could not be sent. Use Resend email.' : 'Application updated.';
  } catch (error) { status.textContent = error.message; button.disabled = false; }
});

document.querySelector('#admin-refresh').addEventListener('click', load);
document.querySelector('#admin-logout').addEventListener('click', async () => {
  try { await api('logout', {}); window.location.reload(); }
  catch (error) { status.textContent = error.message; }
});
