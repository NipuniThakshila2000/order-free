import {createHash, randomUUID} from 'node:crypto';
import {put, list, get} from '@vercel/blob';

const prefix = 'program-registrations/';

export function registrationStoreReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function requireStore() {
  if (!registrationStoreReady()) throw new Error('Private registration storage is not configured.');
}

export function registrationPath(record, id = randomUUID()) {
  const timestamp = Date.parse(record.submittedAt);
  if (!Number.isFinite(timestamp)) throw new Error('Invalid registration time.');
  const reverseTime = String(9_999_999_999_999 - timestamp).padStart(13, '0');
  return `${prefix}${reverseTime}-${id}.json`;
}

export function importId(record, rowIndex = '') {
  return createHash('sha256').update(JSON.stringify([
    rowIndex, record.submittedAt, record.firstName, record.lastName, record.email, record.attendance
  ])).digest('hex').slice(0, 24);
}

export async function saveRegistration(record, id) {
  requireStore();
  const pathname = registrationPath(record, id);
  await put(pathname, JSON.stringify(record), {
    access:'private', contentType:'application/json', addRandomSuffix:false,
    cacheControlMaxAge:0
  });
  return pathname;
}

async function registrationBlobs() {
  requireStore();
  const blobs = [];
  let cursor;
  do {
    const page = await list({prefix, limit:1000, ...(cursor ? {cursor} : {})});
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

export async function registrationPaths() {
  return new Set((await registrationBlobs()).map((blob) => blob.pathname));
}

async function readBlob(blob) {
  const result = await get(blob.pathname, {access:'private'});
  if (!result?.stream || result.statusCode !== 200) throw new Error('A registration record is unavailable.');
  return JSON.parse(await new Response(result.stream).text());
}

export async function registrationPage(offset = 0, limit = 50) {
  const blobs = await registrationBlobs();
  const selected = blobs.slice(offset, offset + limit);
  const registrations = await Promise.all(selected.map(readBlob));
  return {registrations, total:blobs.length};
}

export async function allRegistrations() {
  const blobs = await registrationBlobs();
  const registrations = [];
  for (let index = 0; index < blobs.length; index += 50) {
    registrations.push(...await Promise.all(blobs.slice(index, index + 50).map(readBlob)));
  }
  return registrations;
}
