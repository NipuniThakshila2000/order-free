import {renderExperienceReport, renderYearDetail} from './experience-report.mjs';
import {loadMailing} from './bulk-email.js?v=9';

const base = '/api/access';
const loginPanel = document.querySelector('#admin-login');
const dashboard = document.querySelector('#admin-dashboard');
const tokenForm = document.querySelector('#admin-token-form');
const loginStatus = document.querySelector('#admin-login-status');
const status = document.querySelector('#admin-status');
const countsPanel = document.querySelector('#admin-counts');
const tbody = document.querySelector('#applications-body');
const generatedBody = document.querySelector('#generated-body');
const generatedStatus = document.querySelector('#generated-status');
const generatedDetail = document.querySelector('#generated-detail');
const generatedReport = document.querySelector('#generated-report');
const metricsStatus = document.querySelector('#page-metrics-status');
const metricsCards = document.querySelector('#page-metrics-cards');
const metricsChart = document.querySelector('#page-metrics-chart');
let generatedOffset = 0;
let registrationsOffset = 0;
let selectedRecord = null;
let applications = [];
let activeFilter = 'all';

async function api(action, data) {
  const response = await fetch(`${base}?action=${action}`, {
    credentials:'same-origin', cache:'no-store',
    ...(data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}

async function experienceApi(action, options = {}) {
  const query = new URLSearchParams({action, ...(options.id ? {id:options.id} : {}), ...(options.offset ? {offset:String(options.offset)} : {})});
  const response = await fetch(`/api/experience-data?${query}`, {
    credentials:'same-origin', cache:'no-store', method:options.method || 'GET'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Saved experiences are unavailable.');
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

async function loadMetrics() {
  metricsStatus.textContent = 'Loading page metrics…';
  try {
    const response = await fetch('api/page-metrics', {credentials:'same-origin', cache:'no-store'});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Page metrics are unavailable.');
    const count = (value) => (Number(value) || 0).toLocaleString();
    const summary = data.summary;
    metricsCards.innerHTML = [
      ['Today', summary.today],
      ['Last 7 days', summary.last_seven_days],
      ['Last 30 days', summary.last_thirty_days],
      ['All time', summary.total]
    ].map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${count(value)}</strong></div>`).join('');

    const dayCounts = new Map(data.daily.map((item) => [item.day, Number(item.views) || 0]));
    const end = new Date(`${summary.as_of_day}T00:00:00Z`);
    const days = Array.from({length:30}, (_, index) => {
      const day = new Date(end);
      day.setUTCDate(end.getUTCDate() - 29 + index);
      const key = day.toISOString().slice(0, 10);
      return {key, views:dayCounts.get(key) || 0};
    });
    const peak = Math.max(0, ...days.map((day) => day.views));
    metricsChart.innerHTML = days.map((day, index) => `<div class="metric-day" title="${day.key}: ${count(day.views)} page loads"><div class="metric-bar" style="height:${Math.max(2, Math.round(day.views / Math.max(1, peak) * 100))}%"></div>${index % 5 === 0 || index === 29 ? `<small>${day.key.slice(5)}</small>` : '<small aria-hidden="true">&nbsp;</small>'}</div>`).join('');
    metricsChart.setAttribute('aria-label', `Daily page loads over the last 30 days. Total: ${count(summary.last_thirty_days)}. Highest day: ${count(peak)}.`);

    metricsStatus.textContent = summary.first_day ? `Counting since ${summary.first_day}.` : 'Counting starts with the first page load after deployment.';
  } catch (error) { metricsStatus.textContent = error.message; }
}

function renderApplications() {
  const counts = {all:applications.length,pending:0,approved:0,rejected:0};
  applications.forEach((item) => { if (item.status in counts) counts[item.status] += 1; });
  const labels = {all:'All',pending:'Pending approval',approved:'Approved',rejected:'Rejected'};
  countsPanel.innerHTML = Object.entries(counts).map(([key, value]) => `<button type="button" data-filter="${key}" aria-pressed="${activeFilter === key}">${labels[key]} <span class="filter-count">${value}</span></button>`).join('');
  const visible = activeFilter === 'all' ? applications : applications.filter((item) => item.status === activeFilter);
  tbody.innerHTML = visible.length ? visible.map((item) => `<tr>
      <td><strong>${escapeHtml(item.fullName)}</strong><a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a></td>
      <td>${escapeHtml(item.phone || '—')}</td><td>${escapeHtml(item.country || '—')}</td>
      <td>${escapeHtml(item.yearsAtChurch)}</td><td>${escapeHtml(item.discovery)}</td><td>${escapeHtml(item.recommendedBy || '—')}</td>
      <td>${new Date(item.submittedAt).toLocaleString()}</td>
      <td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>${item.status === 'approved' && !item.approvalEmailSentAt ? '<span class="email-warning">Approval email needs retry</span>' : ''}</td>
      <td><div class="decision">
        ${item.status !== 'approved' ? `<button type="button" data-id="${item.id}" data-decision="approved">Approve</button>` : ''}
        ${item.status !== 'rejected' ? `<button type="button" class="reject" data-id="${item.id}" data-decision="rejected">Reject</button>` : ''}
        ${item.status === 'approved' ? `<button type="button" data-id="${item.id}" data-decision="resend">Resend email</button>` : ''}
    </div></td></tr>`).join('') : `<tr><td colspan="9">${activeFilter === 'all' ? 'No applications yet.' : `No ${activeFilter} applications.`}</td></tr>`;
}

async function load() {
  status.textContent = 'Loading applications…';
  try {
    ({applications} = await api('applications'));
    renderApplications();
    status.textContent = '';
  } catch (error) { status.textContent = error.message; }
}

async function loadRegistrations(offset = registrationsOffset) {
  const registrationStatus = document.querySelector('#registrations-status');
  const registrationBody = document.querySelector('#registrations-body');
  registrationStatus.textContent = 'Loading registrations…';
  try {
    const response = await fetch(`/api/admin-registrations?offset=${offset}`, {
      credentials:'same-origin', cache:'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Registrations are unavailable.');
    registrationsOffset = offset;
    registrationBody.innerHTML = result.registrations.length ? result.registrations.map((item) => `<tr>
      <td>${item.submittedAt ? escapeHtml(new Date(item.submittedAt).toLocaleString()) : '—'}</td>
      <td>${escapeHtml(item.firstName)}</td>
      <td>${escapeHtml(item.lastName || '—')}</td>
      <td><a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a></td>
      <td>${escapeHtml(item.attendance)}</td>
    </tr>`).join('') : '<tr><td colspan="5">No registrations yet.</td></tr>';
    document.querySelector('#registrations-page').textContent = result.total ? `${offset + 1}–${offset + result.registrations.length} of ${result.total}` : '0 registrations';
    document.querySelector('#registrations-previous').disabled = offset === 0;
    document.querySelector('#registrations-next').disabled = offset + result.registrations.length >= result.total;
    registrationStatus.textContent = '';
  } catch (error) {
    registrationStatus.textContent = error.message;
  }
}

countsPanel.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  renderApplications();
});

async function loadGenerated(offset = generatedOffset) {
  generatedStatus.textContent = 'Loading saved experiences…';
  try {
    const {records, total} = await experienceApi('list', {offset});
    generatedOffset = offset;
    generatedBody.innerHTML = records.length ? records.map((item) => `<tr>
      <td><strong>${escapeHtml(item.applicationName)}</strong><a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a><small>User ID: ${escapeHtml(item.userId)}</small></td>
      <td>${escapeHtml(item.birthName)}<br>${escapeHtml(item.birthDate)} · ${escapeHtml(item.birthTime || item.timeCertainty)}<br>${escapeHtml(item.birthplace || 'Place not supplied')}</td>
      <td>${escapeHtml(item.symbolicSunSign || '—')}<br>${escapeHtml(item.astronomicalSunSign || '—')}</td>
      <td>${escapeHtml((item.angels || []).map((angel) => angel.name).filter(Boolean).join(', ') || '—')}</td>
      <td>${new Date(item.createdAt).toLocaleString()}</td>
      <td><div class="decision"><button type="button" data-record="${escapeHtml(item.id)}">View report</button><button type="button" class="reject" data-delete-record="${escapeHtml(item.id)}">Delete</button></div></td>
    </tr>`).join('') : '<tr><td colspan="6">No saved experiences yet.</td></tr>';
    document.querySelector('#generated-page').textContent = total ? `${offset + 1}–${offset + records.length} of ${total}` : '0 records';
    document.querySelector('#generated-previous').disabled = offset === 0;
    document.querySelector('#generated-next').disabled = offset + records.length >= total;
    generatedStatus.textContent = '';
  } catch (error) {
    generatedStatus.textContent = error.message;
  }
}

generatedBody.addEventListener('click', async (event) => {
  const view = event.target.closest('button[data-record]');
  const remove = event.target.closest('button[data-delete-record]');
  if (remove) {
    if (!window.confirm('Permanently delete this stored experience and its birth details?')) return;
    try {
      await experienceApi('record', {id:remove.dataset.deleteRecord, method:'DELETE'});
      generatedDetail.hidden = true;
      selectedRecord = null;
      await loadGenerated(generatedOffset);
    } catch (error) { generatedStatus.textContent = error.message; }
    return;
  }
  if (!view) return;
  try {
    const {record} = await experienceApi('record', {id:view.dataset.record});
    selectedRecord = record;
    generatedReport.innerHTML = renderExperienceReport(record);
    generatedDetail.hidden = false;
    generatedReport.querySelector('.report-year-list .active')?.scrollIntoView({block:'nearest', inline:'center'});
    generatedDetail.scrollIntoView({behavior:'smooth',block:'start'});
  } catch (error) { generatedStatus.textContent = error.message; }
});

generatedDetail.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-report-year]');
  if (!button || !selectedRecord) return;
  const years = selectedRecord.result?.years;
  const index = Number(button.dataset.reportYear);
  if (!Array.isArray(years) || !Number.isInteger(index) || index < 0 || index >= years.length) return;
  generatedDetail.querySelectorAll('button[data-report-year]').forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  generatedDetail.querySelector('#generated-year-detail').innerHTML = renderYearDetail(years[index]);
});

document.querySelector('#generated-download').addEventListener('click', () => {
  if (!selectedRecord) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(selectedRecord, null, 2)], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `redeeming-experience-${selectedRecord.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelector('#generated-previous').addEventListener('click', () => loadGenerated(Math.max(0, generatedOffset - 50)));
document.querySelector('#generated-next').addEventListener('click', () => loadGenerated(generatedOffset + 50));
document.querySelector('#registrations-previous').addEventListener('click', () => loadRegistrations(Math.max(0, registrationsOffset - 50)));
document.querySelector('#registrations-next').addEventListener('click', () => loadRegistrations(registrationsOffset + 50));

async function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await Promise.all([load(), loadRegistrations(0), loadGenerated(0), loadMetrics(), loadMailing()]);
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
  if (decision === 'rejected' && !window.confirm('Reject this application and revoke any existing experience access?')) return;
  button.disabled = true;
  status.textContent = `${decision === 'resend' ? 'Sending' : 'Saving'}…`;
  try {
    const result = await api('review', {id:button.dataset.id, decision});
    await load();
    status.textContent = result.emailSent === false ? 'Application approved, but the email could not be sent. Use Resend email.' : 'Application updated.';
  } catch (error) { status.textContent = error.message; button.disabled = false; }
});

document.querySelector('#admin-refresh').addEventListener('click', () => { load(); loadRegistrations(registrationsOffset); loadGenerated(generatedOffset); loadMetrics(); loadMailing(); });
document.querySelector('#admin-logout').addEventListener('click', async () => {
  try { await api('logout', {}); window.location.reload(); }
  catch (error) { status.textContent = error.message; }
});
