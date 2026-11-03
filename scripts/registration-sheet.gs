// Paste into this Google Sheet's Apps Script project. Set REGISTRATION_TOKEN
// in Project Settings > Script Properties, then deploy as a web app.
const REGISTRATION_SHEET_ID = '18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4';
function doPost(e) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const expectedToken = properties.getProperty('REGISTRATION_TOKEN');
    const sheetId = REGISTRATION_SHEET_ID;
    const data = JSON.parse(e.postData.contents);
    if (!expectedToken || !sheetId || data.token !== expectedToken) throw new Error('Unauthorized');
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const email = String(data.email || '').trim();
    const attendance = String(data.attendance || '');
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !['online', 'in-person'].includes(attendance)) throw new Error('Invalid registration');
    const book = SpreadsheetApp.openById(sheetId);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = book.getSheetByName('Registrations') || book.insertSheet('Registrations');
      if (sheet.getLastRow() === 0) sheet.appendRow(['Submitted at', 'First name', 'Last name', 'Email address', 'Attendance']);
      const safe = (value) => /^[=+\-@]/.test(value) ? "'" + value : value;
      sheet.appendRow([new Date(), safe(firstName), safe(lastName), safe(email), attendance === 'online' ? 'Online' : 'In-Person (EPIC Sri Lanka)']);
    } finally {
      lock.releaseLock();
    }
    return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ok: false})).setMimeType(ContentService.MimeType.JSON);
  }
}
