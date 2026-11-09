export const senderAddress = 'info@wowlife.lk';

const bridgeUrl = 'https://order.wowlife.lk/api/bulk-email-bridge';

async function bridgeRequest(action, payload, cookie) {
  if (!cookie) throw new Error('Admin sign-in required.');
  const response = await fetch(bridgeUrl, {
    method:'POST',
    headers:{'Content-Type':'application/json',Cookie:cookie},
    body:JSON.stringify({action,...payload}),
    signal:AbortSignal.timeout(25000)
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) {
    const error = new Error(result.error || 'WOW email service is unavailable.');
    error.expected = response.status >= 400 && response.status < 500;
    throw error;
  }
  return result;
}

export async function mailStatus(cookie) {
  return bridgeRequest('status', {}, cookie);
}

export async function sendWowEmail({to, subject, message, headerImageUrl = '', headerImage}, cookie) {
  const result = await bridgeRequest('send-one', {to,subject,message,headerImageUrl,...(headerImage ? {headerImage} : {})}, cookie);
  return {status:result.status, id:result.id};
}
