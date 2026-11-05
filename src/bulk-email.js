const form = document.querySelector('#mailing-form');
const testForm = document.querySelector('#mailing-test-form');
const summary = document.querySelector('#mailing-summary');
const status = document.querySelector('#mailing-status');
const historyBody = document.querySelector('#mailing-history');
const sendButton = document.querySelector('#mailing-send');
const stopButton = document.querySelector('#mailing-stop');
const previewContent = document.querySelector('#mailing-preview-content');
const testButton = testForm.querySelector('button');
let busy = false;
let available = false;
let currentCount = 0;
let pauseRequested = false;

async function mailingApi(data) {
  const response = await fetch('/api/bulk-email', {
    method:'POST', credentials:'same-origin', cache:'no-store',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The mailing service is unavailable.');
  return result;
}

function draft() {
  return {
    audience:form.elements.namedItem('audience').value,
    subject:form.elements.namedItem('subject').value.trim(),
    message:form.elements.namedItem('message').value.trim()
  };
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value || !available;
  testButton.disabled = value || !available;
  document.querySelector('#mailing-preview').disabled = value || !available;
  stopButton.hidden = !value;
}

setBusy(false);

export async function loadMailing() {
  try {
    const result = await mailingApi({action:'summary', audience:form.elements.namedItem('audience').value});
    currentCount = result.selected;
    available = true;
    setBusy(busy);
    summary.textContent = `From: ${result.senderAddress} · ${result.selected} selected · ${result.total} unique contacts (${result.registrants} registrants, ${result.applicants} applicants; ${result.online} online, ${result.inPerson} in person).${result.remainingDailyQuota == null ? '' : ` ${result.remainingDailyQuota} emails left in today's quota.`}`;
  } catch (error) {
    available = false;
    setBusy(busy);
    summary.textContent = `Email sending is unavailable: ${error.message}`;
  }
}

async function loadHistory() {
  try {
    const {entries} = await mailingApi({action:'history'});
    historyBody.replaceChildren();
    if (!entries.length) {
      const row = historyBody.insertRow();
      row.insertCell().textContent = 'No messages sent yet.';
      return;
    }
    for (const entry of entries) {
      const row = historyBody.insertRow();
      for (const value of [entry.date, entry.email, entry.subject, entry.status, entry.error]) {
        row.insertCell().textContent = value || '';
      }
    }
  } catch (error) { status.textContent = error.message; }
}

form.elements.namedItem('audience').addEventListener('change', loadMailing);
document.querySelector('#mailing-preview').addEventListener('click', async () => {
  await loadMailing();
  const data = draft();
  previewContent.hidden = false;
  previewContent.querySelector('pre').textContent = `Subject: ${data.subject || '(empty)'}\n\n${data.message.replace(/{{firstName}}/g, 'Test recipient')}`;
  status.textContent = `Audience: ${data.audience}; ${currentCount} unique recipients. The preview uses “Test recipient” for {{firstName}}.`;
});

stopButton.addEventListener('click', () => {
  pauseRequested = true;
  stopButton.disabled = true;
  status.textContent = 'Pausing after the current batch…';
});

testForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !available || !form.reportValidity() || !testForm.reportValidity()) return;
  setBusy(true);
  status.textContent = 'Sending test…';
  try {
    await mailingApi({action:'test', ...draft(), testEmail:testForm.elements.namedItem('testEmail').value.trim()});
    status.textContent = 'Test email sent. Check the inbox before sending to registrants.';
    await loadMailing();
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !available || !form.reportValidity()) return;
  setBusy(true);
  pauseRequested = false;
  try {
    const data = draft();
    const preview = await mailingApi({action:'summary', audience:data.audience});
    currentCount = preview.selected;
    if (!currentCount) throw new Error('There are no contacts in this audience.');
    if (!window.confirm(`Send “${data.subject}” to ${currentCount} unique contacts in ${data.audience}? This sends real email.`)) return;
    const fingerprint = JSON.stringify(data);
    const saved = JSON.parse(sessionStorage.getItem('contactMailDraft') || 'null');
    const campaignId = saved?.fingerprint === fingerprint ? saved.campaignId : crypto.randomUUID();
    let offset = saved?.fingerprint === fingerprint ? saved.offset || 0 : 0;
    sessionStorage.setItem('contactMailDraft', JSON.stringify({fingerprint, campaignId, offset}));
    let result;
    do {
      result = await mailingApi({action:'send', ...data, campaignId, offset});
      offset = result.nextOffset;
      sessionStorage.setItem('contactMailDraft', JSON.stringify({fingerprint, campaignId, offset}));
      status.textContent = `Campaign ${campaignId}: ${result.completed} of ${result.total} messages accepted by Mandrill; ${result.remaining} remaining.${result.remainingDailyQuota == null ? '' : ` ${result.remainingDailyQuota} emails left in today's quota.`}`;
      if (result.failed || result.held || !result.sent) break;
    } while (result.remaining > 0 && !pauseRequested);
    if (result.remaining === 0) {
      status.textContent = `Completed: ${result.completed} of ${result.total} messages accepted by Mandrill. Campaign ${campaignId}.`;
      sessionStorage.removeItem('contactMailDraft');
    } else if (result.failed) {
      status.textContent += ' Some sends failed. Check the delivery log, then use Send again to retry.';
    } else if (result.held) {
      status.textContent += ' An interrupted send is held for review in the delivery log.';
    } else if (pauseRequested) {
      status.textContent += ' Paused. Use Send again to resume this campaign.';
    } else if (result.remainingDailyQuota === 0) {
      status.textContent += ' Daily quota reached. Use Send again when the quota renews.';
    } else {
      status.textContent += ' Check the delivery log for held attempts before resuming.';
    }
    await Promise.all([loadMailing(), loadHistory()]);
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); stopButton.disabled = false; }
});

document.querySelector('#mailing-history-refresh').addEventListener('click', loadHistory);
