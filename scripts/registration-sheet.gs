// Deploy from the registration Sheet as a web app. Keep REGISTRATION_TOKEN in Script Properties.
const REGISTRATION_SHEET_ID = '18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4';
const MAIL_BATCH_SIZE = 20;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const token = PropertiesService.getScriptProperties().getProperty('REGISTRATION_TOKEN');
    if (!token || data.token !== token) throw new Error('Unauthorized');
    const book = SpreadsheetApp.openById(REGISTRATION_SHEET_ID);
    let result;
    switch (data.action || 'register') {
      case 'register': result = saveRegistration_(book, data); break;
      case 'summary': result = {ok:true, ...mailSummary_(book, data.audience)}; break;
      case 'recipients': result = {ok:true, recipients:recipients_(book, 'all')}; break;
      case 'history': result = mailHistory_(book); break;
      case 'test': result = sendTest_(data); break;
      case 'send': result = sendBatch_(book, data); break;
      default: throw new Error('Invalid action.');
    }
    return json_(result);
  } catch (error) {
    return json_({ok:false, error:error.message || 'Request failed.'});
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function safeCell_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function saveRegistration_(book, data) {
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const email = String(data.email || '').trim();
  const attendance = String(data.attendance || '');
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !['online', 'in-person'].includes(attendance)) throw new Error('Invalid registration');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = book.getSheetByName('Registrations') || book.insertSheet('Registrations');
    if (!sheet.getLastRow()) sheet.appendRow(['Submitted at', 'First name', 'Last name', 'Email address', 'Attendance']);
    sheet.appendRow([new Date(), safeCell_(firstName), safeCell_(lastName), safeCell_(email), attendance === 'online' ? 'Online' : 'In-Person (EPIC Sri Lanka)']);
  } finally { lock.releaseLock(); }
  return {ok:true};
}

function recipients_(book, audience) {
  if (!['all','online','in-person'].includes(audience)) throw new Error('Invalid audience.');
  const sheet = book.getSheetByName('Registrations');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues();
  const seen = new Set();
  const recipients = [];
  rows.forEach((row) => {
    const email = row[3].trim().toLowerCase();
    const attendance = row[4].toLowerCase().startsWith('online') ? 'online' : 'in-person';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email) || (audience !== 'all' && audience !== attendance)) return;
    seen.add(email);
    recipients.push({firstName:row[1].replace(/^'/, ''), email, attendance});
  });
  return recipients;
}

function mailSummary_(book, audience) {
  const all = recipients_(book, 'all');
  return {total:all.length, online:all.filter((person) => person.attendance === 'online').length,
    inPerson:all.filter((person) => person.attendance === 'in-person').length,
    selected:recipients_(book, audience || 'all').length, remainingDailyQuota:MailApp.getRemainingDailyQuota()};
}

function validateMail_(data) {
  const subject = String(data.subject || '').trim();
  const message = String(data.message || '').trim();
  if (!subject || subject.length > 150 || /[\r\n]/.test(subject) || !message || message.length > 10000) throw new Error('Check the subject and message.');
  if (!['all','registrants','online','in-person','applicants'].includes(data.audience)) throw new Error('Invalid audience.');
  return {subject, message};
}

function personalize_(message, person) {
  return message.replace(/{{firstName}}/g, person.firstName || 'there');
}

function sendTest_(data) {
  const mail = validateMail_(data);
  const email = String(data.testEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid test email.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota reached.');
  MailApp.sendEmail({to:email, subject:'[TEST] ' + mail.subject, body:personalize_(mail.message, {firstName:'Test recipient'}), name:'WOWLife Church'});
  return {ok:true};
}

function logSheet_(book) {
  const sheet = book.getSheetByName('MailLog') || book.insertSheet('MailLog');
  if (!sheet.getLastRow()) sheet.appendRow(['Timestamp', 'Campaign ID', 'Email address', 'Audience', 'Subject', 'Status', 'Error']);
  return sheet;
}

function sendBatch_(book, data) {
  const mail = validateMail_(data);
  const campaignId = String(data.campaignId || '');
  if (!/^[a-f0-9-]{36}$/.test(campaignId)) throw new Error('Invalid campaign ID.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const offset = Number(data.offset || 0);
    const allRecipients = Array.isArray(data.recipients) ? null : recipients_(book, data.audience);
    const recipients = Array.isArray(data.recipients) ? data.recipients : allRecipients.slice(offset, offset + MAIL_BATCH_SIZE);
    if (!Array.isArray(recipients) || recipients.length > MAIL_BATCH_SIZE ||
        recipients.some((person) => !person || typeof person.firstName !== 'string' || typeof person.email !== 'string' ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))) throw new Error('Invalid recipient batch.');
    const total = Number(data.total || allRecipients?.length || recipients.length);
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(offset) || total < recipients.length || offset < 0 || offset + recipients.length > total) throw new Error('Invalid campaign position.');
    const log = logSheet_(book);
    const rows = log.getLastRow() > 1 ? log.getRange(2, 1, log.getLastRow() - 1, 7).getDisplayValues() : [];
    const completed = new Set();
    rows.forEach((row) => {
      if (row[1] !== campaignId) return;
      if (row[3] !== data.audience || row[4] !== mail.subject) throw new Error('This campaign ID belongs to another draft.');
      if (row[5] === 'sent' || row[5] === 'sending') completed.add(row[2]);
    });
    let quota = MailApp.getRemainingDailyQuota();
    let sent = 0;
    let failed = 0;
    let held = 0;
    recipients.forEach((person) => { if (completed.has(person.email) && rows.some((row) => row[1] === campaignId && row[2] === person.email && row[5] === 'sending')) held++; });
    const pending = recipients.filter((person) => !completed.has(person.email));
    for (const person of pending.slice(0, Math.min(MAIL_BATCH_SIZE, quota))) {
      // Reserve a row before sending. A retry holds an interrupted send for manual review.
      const rowNumber = log.getLastRow() + 1;
      log.appendRow([new Date(), campaignId, safeCell_(person.email), data.audience, safeCell_(mail.subject), 'sending', '']);
      try {
        MailApp.sendEmail({to:person.email, subject:mail.subject, body:personalize_(mail.message, person), name:'WOWLife Church'});
        log.getRange(rowNumber, 6, 1, 2).setValues([['sent', '']]);
        completed.add(person.email);
        sent++;
        quota--;
      } catch (error) {
        log.getRange(rowNumber, 6, 1, 2).setValues([['failed', safeCell_(error.message || 'Send failed')]]);
        failed++;
      }
    }
    return {ok:true, sent, failed, held, completed:completed.size, total,
      nextOffset:failed || held || pending.length > sent ? offset : offset + recipients.length,
      remaining:Math.max(0, total - completed.size), remainingDailyQuota:MailApp.getRemainingDailyQuota()};
  } finally { lock.releaseLock(); }
}

function mailHistory_(book) {
  const sheet = book.getSheetByName('MailLog');
  if (!sheet || sheet.getLastRow() < 2) return {ok:true, entries:[]};
  const start = Math.max(2, sheet.getLastRow() - 49);
  const rows = sheet.getRange(start, 1, sheet.getLastRow() - start + 1, 7).getDisplayValues();
  return {ok:true, entries:rows.reverse().map((row) => ({date:row[0], campaignId:row[1], email:row[2], audience:row[3], subject:row[4], status:row[5], error:row[6]}))};
}
