// Deploy this as the mailing web app. It has no Google Sheet dependency.
// The deploying Gmail account must have info@wowlife.lk as a verified Send mail as alias.
const WOW_FROM_ADDRESS = 'info@wowlife.lk';

function authorizeMail() {
  GmailApp.getAliases();
  return MailApp.getRemainingDailyQuota();
}

function senderAlias_() {
  const alias = GmailApp.getAliases().find((address) => address.toLowerCase() === WOW_FROM_ADDRESS);
  if (!alias) throw new Error(WOW_FROM_ADDRESS + ' is not a verified Gmail Send mail as alias for this account.');
  return alias;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('BULK_EMAIL_TOKEN');
    if (!token || data.token !== token) throw new Error('Unauthorized');
    const from = senderAlias_();
    if (data.action === 'status') {
      return json_({ok:true, senderAddress:from, remainingDailyQuota:MailApp.getRemainingDailyQuota()});
    }
    if (data.action !== 'send-one') throw new Error('Invalid action.');
    const to = String(data.to || '').trim();
    const subject = String(data.subject || '').trim();
    const message = String(data.message || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254 ||
        !subject || subject.length > 150 || /[\r\n]/.test(subject) ||
        !message || message.length > 10000) throw new Error('Invalid message.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota reached.');
    GmailApp.sendEmail(to, subject, message, {
      from, replyTo:from, name:'WOWLife Church'
    });
    return json_({ok:true});
  } catch (error) {
    return json_({ok:false, error:error.message || 'Mail request failed.'});
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
