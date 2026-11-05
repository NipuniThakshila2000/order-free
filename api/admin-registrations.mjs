import {registrationPage} from '../src/registration-store.mjs';

const accessUrl = process.env.READING_ACCESS_BACKEND_URL || 'https://order.wowlife.lk/api/reading-access';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({error:'Method not allowed.'});
  const cookieMatch = String(request.headers?.cookie || '').match(/(?:^|;\s*)redeeming_session=([^;]+)/);
  if (!cookieMatch) return response.status(401).json({error:'Sign in to the admin dashboard.'});
  const offset = Number(new URL(request.url, 'http://localhost').searchParams.get('offset') || '0');
  if (!Number.isSafeInteger(offset) || offset < 0) return response.status(400).json({error:'Invalid registration page.'});
  try {
    const url = new URL(accessUrl);
    url.searchParams.set('action', 'session');
    const sessionResponse = await fetch(url, {headers:{Cookie:`redeeming_session=${cookieMatch[1]}`, Accept:'application/json'}, redirect:'manual'});
    const session = await sessionResponse.json();
    if (!sessionResponse.ok || session.authenticated !== true || session.purpose !== 'admin') {
      return response.status(403).json({error:'Admin access is required.'});
    }
    return response.status(200).json({ok:true, ...await registrationPage(offset)});
  } catch (error) {
    console.error('Admin registrations failed:', error);
    return response.status(503).json({error:'Registration records are temporarily unavailable.'});
  }
}
