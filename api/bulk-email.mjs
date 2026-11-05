const accessUrl = process.env.READING_ACCESS_BACKEND_URL || 'https://order.wowlife.lk/api/reading-access';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const audiences = ['all','registrants','online','in-person','applicants'];

async function scriptCall(url, token, payload) {
  const response = await fetch(url, {
    method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({token, ...payload})
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error(result.error || 'The mailing service is unavailable.');
  return result;
}

async function contactsFor(audience, scriptUrl, token, cookie) {
  const applicationsUrl = new URL(accessUrl);
  applicationsUrl.searchParams.set('action', 'applications');
  const [sheet, applicationsResponse] = await Promise.all([
    scriptCall(scriptUrl, token, {action:'recipients'}),
    fetch(applicationsUrl, {headers:{Cookie:cookie, Accept:'application/json'}, redirect:'manual'})
  ]);
  const applicationsData = await applicationsResponse.json();
  if (!applicationsResponse.ok || !Array.isArray(applicationsData.applications)) throw new Error('The applicant list is unavailable.');
  const registrations = sheet.recipients.filter((person) => emailPattern.test(person.email)).map((person) => ({
    firstName:String(person.firstName || '').trim(), email:person.email.trim().toLowerCase(), attendance:person.attendance
  }));
  const applicants = applicationsData.applications.filter((person) => emailPattern.test(person.email)).map((person) => ({
    firstName:String(person.fullName || '').trim().split(/\s+/)[0], email:person.email.trim().toLowerCase()
  }));
  const dedupe = (list) => [...new Map(list.map((person) => [person.email, person])).values()];
  const all = dedupe([...applicants, ...registrations]);
  const filtered = {
    all,
    registrants:dedupe(registrations),
    online:dedupe(registrations.filter((person) => person.attendance === 'online')),
    'in-person':dedupe(registrations.filter((person) => person.attendance === 'in-person')),
    applicants:dedupe(applicants)
  };
  return {selected:filtered[audience], counts:{
    total:all.length, registrants:filtered.registrants.length, applicants:filtered.applicants.length,
    online:filtered.online.length, inPerson:filtered['in-person'].length
  }};
}

export default async function handler(request, response) {
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
    if (['summary','send','test'].includes(data.action) && !audiences.includes(data.audience)) return response.status(400).json({error:'Invalid audience.'});
    if (data.action === 'send' || data.action === 'test') {
      if (typeof data.subject !== 'string' || !data.subject.trim() || data.subject.length > 150 || /[\r\n]/.test(data.subject) ||
          typeof data.message !== 'string' || !data.message.trim() || data.message.length > 10000) return response.status(400).json({error:'Check the subject and message.'});
      if (data.action === 'send' && (!/^[a-f0-9-]{36}$/.test(data.campaignId || '') ||
          !Number.isSafeInteger(data.offset) || data.offset < 0)) return response.status(400).json({error:'Invalid campaign position.'});
      if (data.action === 'test' && (typeof data.testEmail !== 'string' || !emailPattern.test(data.testEmail) || data.testEmail.length > 254)) return response.status(400).json({error:'Enter a valid test email.'});
    }
    const proxyUrl = process.env.BULK_EMAIL_PROXY_URL;
    const scriptUrl = process.env.BULK_EMAIL_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
    const token = process.env.REGISTRATION_TOKEN;
    if (!proxyUrl && (!scriptUrl || !token)) return response.status(503).json({error:'Contact mailing is not configured on this deployment.'});
    const payload = {action:data.action};
    for (const key of ['audience','subject','message','campaignId','testEmail','offset']) if (data[key] !== undefined) payload[key] = data[key];
    if (proxyUrl) {
      const upstream = await fetch(proxyUrl, {method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify(payload)});
      const result = await upstream.json();
      if (!upstream.ok) return response.status(upstream.status).json({error:result.error || 'The mailing service is unavailable.'});
      return response.status(200).json(result);
    }
    if (data.action === 'history' || data.action === 'test') {
      return response.status(200).json(await scriptCall(scriptUrl, token, payload));
    }
    const {selected, counts} = await contactsFor(data.audience, scriptUrl, token, cookie);
    if (data.action === 'summary') {
      const quota = await scriptCall(scriptUrl, token, {action:'summary', audience:'all'});
      return response.status(200).json({ok:true, ...counts, selected:selected.length, remainingDailyQuota:quota.remainingDailyQuota});
    }
    if (data.offset > selected.length) return response.status(400).json({error:'Campaign position is beyond the recipient list.'});
    const batch = selected.slice(data.offset, data.offset + 20);
    const result = await scriptCall(scriptUrl, token, {...payload, recipients:batch, total:selected.length});
    return response.status(200).json(result);
  } catch (error) {
    console.error('Bulk email failed:', error);
    return response.status(502).json({error:error.message || 'The mailing service is temporarily unavailable.'});
  }
}
