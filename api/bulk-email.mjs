import {allRegistrations, registrationStoreReady} from '../src/registration-store.mjs';
import {mailLogPath, mailDraftHash, readMailLog, writeMailLog, recentMailLog} from '../src/mail-log-store.mjs';
import {mailConfigured, mailStatus, sendWowEmail, senderAddress} from '../src/wow-mail.mjs';

const accessUrl = process.env.READING_ACCESS_BACKEND_URL || 'https://order.wowlife.lk/api/reading-access';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const audiences = ['all','registrants','online','in-person','applicants'];
const batchSize = 5;

async function contactsFor(audience, cookie, registrationRecords) {
  const registrations = (await registrationRecords()).filter((person) => emailPattern.test(person.email)).map((person) => ({
    firstName:String(person.firstName || '').trim(),
    email:person.email.trim().toLowerCase(),
    attendance:person.attendance
  }));
  let applicants = [];
  if (audience === 'all' || audience === 'applicants') {
    const applicationsUrl = new URL(accessUrl);
    applicationsUrl.searchParams.set('action', 'applications');
    const response = await fetch(applicationsUrl, {headers:{Cookie:cookie, Accept:'application/json'}, redirect:'manual'});
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.applications)) throw new Error('The applicant list is unavailable.');
    applicants = data.applications.filter((person) => emailPattern.test(person.email)).map((person) => ({
      firstName:String(person.fullName || '').trim().split(/\s+/)[0],
      email:person.email.trim().toLowerCase()
    }));
  }
  const dedupe = (items) => [...new Map(items.map((person) => [person.email, person])).values()];
  const filtered = {
    all:dedupe([...applicants, ...registrations]),
    registrants:dedupe(registrations),
    online:dedupe(registrations.filter((person) => person.attendance === 'online')),
    'in-person':dedupe(registrations.filter((person) => person.attendance === 'in-person')),
    applicants:dedupe(applicants)
  };
  return {selected:filtered[audience], counts:{
    total:filtered.all.length,
    registrants:filtered.registrants.length,
    applicants:filtered.applicants.length,
    online:filtered.online.length,
    inPerson:filtered['in-person'].length
  }};
}

function personalize(message, firstName) {
  return message.replace(/{{firstName}}/g, firstName || 'there');
}

export function createBulkEmailHandler(deps = {}) {
  const mail = deps.mail || {configured:mailConfigured, status:mailStatus, send:sendWowEmail};
  const registrationRecords = deps.registrationRecords || allRegistrations;
  const storeReady = deps.storeReady || registrationStoreReady;
  const logs = deps.logs || {mailLogPath, mailDraftHash, readMailLog, writeMailLog, recentMailLog};
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') return response.status(405).json({error:'Method not allowed.'});
    const cookieMatch = String(request.headers?.cookie || '').match(/(?:^|;\s*)redeeming_session=([^;]+)/);
    if (!cookieMatch) return response.status(401).json({error:'Sign in to the admin dashboard.'});
    const cookie = `redeeming_session=${cookieMatch[1]}`;
    try {
      const sessionUrl = new URL(accessUrl);
      sessionUrl.searchParams.set('action', 'session');
      const sessionResponse = await fetch(sessionUrl, {headers:{Cookie:cookie, Accept:'application/json'}, redirect:'manual'});
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || session.authenticated !== true || session.purpose !== 'admin') {
        return response.status(403).json({error:'Admin access is required.'});
      }
      const data = request.body || {};
      if (!['summary','send','test','history'].includes(data.action)) return response.status(400).json({error:'Invalid action.'});
      if (data.action !== 'history' && !audiences.includes(data.audience)) return response.status(400).json({error:'Invalid audience.'});
      if (data.action === 'send' || data.action === 'test') {
        if (typeof data.subject !== 'string' || !data.subject.trim() || data.subject.length > 150 || /[\r\n]/.test(data.subject) ||
            typeof data.message !== 'string' || !data.message.trim() || data.message.length > 10000) {
          return response.status(400).json({error:'Check the subject and message.'});
        }
        if (data.action === 'send' && (!/^[a-f0-9-]{36}$/.test(data.campaignId || '') ||
            !Number.isSafeInteger(data.offset) || data.offset < 0)) return response.status(400).json({error:'Invalid campaign position.'});
        if (data.action === 'test' && (typeof data.testEmail !== 'string' || !emailPattern.test(data.testEmail) || data.testEmail.length > 254)) {
          return response.status(400).json({error:'Enter a valid test email.'});
        }
      }
      const payload = {action:data.action};
      for (const key of ['audience','subject','message','campaignId','testEmail','offset']) if (data[key] !== undefined) payload[key] = data[key];
      const proxyUrl = process.env.BULK_EMAIL_PROXY_URL;
      if (proxyUrl) {
        const upstream = await fetch(proxyUrl, {method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify(payload)});
        const result = await upstream.json();
        if (!upstream.ok) return response.status(upstream.status).json({error:result.error || 'The WOW email service is unavailable.'});
        return response.status(200).json(result);
      }
      if (!storeReady()) return response.status(503).json({error:'Private contact storage is not configured.'});
      if (data.action === 'history') return response.status(200).json({ok:true, entries:await logs.recentMailLog()});
      if (!mail.configured()) return response.status(503).json({error:'WOW mailbox SMTP is not configured.'});
      const status = await mail.status();
      if (String(status.senderAddress || '').toLowerCase() !== senderAddress) {
        return response.status(503).json({error:'The WOW sender address is not verified in Gmail.'});
      }
      if (data.action === 'test') {
        await mail.send({
          to:data.testEmail.trim(),
          subject:`[TEST] ${data.subject.trim()}`,
          message:personalize(data.message.trim(), 'Test recipient')
        });
        return response.status(200).json({ok:true});
      }
      const {selected, counts} = await contactsFor(data.audience, cookie, registrationRecords);
      if (data.action === 'summary') {
        return response.status(200).json({ok:true, ...counts, selected:selected.length,
          remainingDailyQuota:status.remainingDailyQuota, senderAddress});
      }
      if (data.offset > selected.length) return response.status(400).json({error:'Campaign position is beyond the contact list.'});
      const quota = status.remainingDailyQuota == null ? null : Math.max(0, Number(status.remainingDailyQuota) || 0);
      const batch = selected.slice(data.offset, data.offset + Math.min(batchSize, quota ?? batchSize));
      const draftHash = logs.mailDraftHash(data.audience, data.subject.trim(), data.message.trim());
      let sent = 0;
      let alreadySent = 0;
      let failed = 0;
      let held = 0;
      for (const person of batch) {
        const pathname = logs.mailLogPath(data.campaignId, person.email);
        const previous = await logs.readMailLog(pathname);
        if (previous && previous.entry.draftHash !== draftHash) {
          return response.status(409).json({error:'This campaign ID belongs to another message.'});
        }
        if (previous?.entry.status === 'sent') { alreadySent++; continue; }
        if (previous?.entry.status === 'sending') { held++; continue; }
        const entry = {
          date:new Date().toISOString(), campaignId:data.campaignId,
          email:person.email, audience:data.audience, subject:data.subject.trim(),
          draftHash, status:'sending', error:''
        };
        let reservation;
        try { reservation = await logs.writeMailLog(pathname, entry, previous?.etag); }
        catch { held++; continue; }
        try {
          await mail.send({
            to:person.email, subject:data.subject.trim(),
            message:personalize(data.message.trim(), person.firstName)
          });
        } catch (error) {
          if (error.expected) {
            await logs.writeMailLog(pathname, {...entry, status:'failed', error:error.message}, reservation.etag);
            failed++;
          } else {
            // A network failure may happen after delivery; keep the reservation to avoid a duplicate.
            held++;
          }
          continue;
        }
        await logs.writeMailLog(pathname, {...entry, status:'sent'}, reservation.etag);
        sent++;
      }
      const completed = data.offset + sent + alreadySent;
      const nextOffset = failed || held ? data.offset : data.offset + batch.length;
      return response.status(200).json({ok:true, sent, failed, held, completed,
        total:selected.length, nextOffset, remaining:Math.max(0, selected.length - completed),
        remainingDailyQuota:quota == null ? null : Math.max(0, quota - sent)});
    } catch (error) {
      console.error('Bulk email failed:', error);
      return response.status(502).json({error:error.message || 'The WOW email service is temporarily unavailable.'});
    }
  };
}

export default createBulkEmailHandler();
