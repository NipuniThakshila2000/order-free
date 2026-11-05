import {createHash} from 'node:crypto';
import {put, list, get} from '@vercel/blob';

const prefix = 'mail-log/';

export function mailLogPath(campaignId, email) {
  if (!/^[a-f0-9-]{36}$/.test(campaignId)) throw new Error('Invalid campaign ID.');
  const digest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `${prefix}${campaignId}/${digest}.json`;
}

export function mailDraftHash(audience, subject, message) {
  return createHash('sha256').update(JSON.stringify([audience, subject, message])).digest('hex');
}

export async function readMailLog(pathname) {
  const result = await get(pathname, {access:'private'});
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) throw new Error('Mail log is unavailable.');
  return {entry:JSON.parse(await new Response(result.stream).text()), etag:result.blob.etag};
}

export async function writeMailLog(pathname, entry, etag) {
  return put(pathname, JSON.stringify(entry), {
    access:'private', contentType:'application/json', addRandomSuffix:false,
    ...(etag ? {allowOverwrite:true, ifMatch:etag} : {allowOverwrite:false})
  });
}

export async function recentMailLog(limit = 50) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({prefix, limit:1000, ...(cursor ? {cursor} : {})});
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const entries = await Promise.all(blobs.slice(0, limit).map(async (blob) => (await readMailLog(blob.pathname)).entry));
  return entries.map((entry) => ({
    date:entry.date, campaignId:entry.campaignId, email:entry.email,
    audience:entry.audience, subject:entry.subject, status:entry.status,
    error:entry.error || ''
  }));
}
