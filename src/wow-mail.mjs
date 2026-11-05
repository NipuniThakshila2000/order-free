export const senderAddress = 'info@wowlife.lk';

const apiRoot = 'https://mandrillapp.com/api/1.4/';

export function mailConfigured() {
  return Boolean(process.env.MANDRILL_API_KEY);
}

async function mandrillRequest(method, payload = {}) {
  if (!mailConfigured()) throw new Error('Mandrill API key is not configured.');
  const response = await fetch(`${apiRoot}${method}.json`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:process.env.MANDRILL_API_KEY, ...payload}),
    signal:AbortSignal.timeout(20000)
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || `Mandrill returned ${response.status}.`);
    error.expected = response.status >= 400 && response.status < 500;
    throw error;
  }
  return result;
}

export async function mailStatus() {
  const domains = await mandrillRequest('senders/domains');
  const domain = Array.isArray(domains) && domains.find((item) => String(item.domain).toLowerCase() === 'wowlife.lk');
  if (!domain?.verified_at || domain.valid_signing !== true || domain.dmarc?.valid !== true) {
    throw new Error('wowlife.lk must be verified with valid DKIM and DMARC in Mandrill.');
  }
  return {senderAddress, remainingDailyQuota:null};
}

export async function sendWowEmail({to, subject, message}) {
  const results = await mandrillRequest('messages/send', {
    async:false,
    message:{
      from_email:senderAddress,
      from_name:'WOWLife Church',
      headers:{'Reply-To':senderAddress},
      to:[{email:to,type:'to'}],
      subject,
      text:message
    }
  });
  const delivery = Array.isArray(results) && results.find((item) => String(item.email).toLowerCase() === to.toLowerCase());
  if (!delivery || !['sent','queued','scheduled'].includes(delivery.status)) {
    const error = new Error(delivery?.reject_reason || `Mandrill ${delivery?.status || 'did not accept the recipient'}.`);
    error.expected = true;
    throw error;
  }
  return {status:delivery.status, id:delivery._id || ''};
}
