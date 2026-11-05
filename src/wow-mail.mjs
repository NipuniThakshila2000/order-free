import nodemailer from 'nodemailer';

export const senderAddress = 'info@wowlife.lk';

export function mailConfigured() {
  const port = Number(process.env.WOW_SMTP_PORT);
  return Boolean(process.env.WOW_SMTP_HOST && [465, 587].includes(port) &&
    process.env.WOW_SMTP_USER?.toLowerCase() === senderAddress &&
    process.env.WOW_SMTP_PASSWORD);
}

function transporter() {
  if (!mailConfigured()) throw new Error('WOW mailbox SMTP is not configured.');
  const port = Number(process.env.WOW_SMTP_PORT);
  return nodemailer.createTransport({
    host:process.env.WOW_SMTP_HOST,
    port,
    secure:port === 465,
    requireTLS:port === 587,
    auth:{user:process.env.WOW_SMTP_USER, pass:process.env.WOW_SMTP_PASSWORD},
    connectionTimeout:15000,
    greetingTimeout:15000,
    socketTimeout:30000
  });
}

export async function mailStatus() {
  await transporter().verify();
  return {senderAddress, remainingDailyQuota:null};
}

export async function sendWowEmail({to, subject, message}) {
  await transporter().sendMail({
    from:{name:'WOWLife Church',address:senderAddress},
    replyTo:senderAddress,
    to, subject, text:message
  });
}
