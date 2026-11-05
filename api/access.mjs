const upstream = process.env.READING_ACCESS_BACKEND_URL || 'https://architecture-of-freedom-landing-page-wowmedias-projects.vercel.app/api/reading-access';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(request.method)) return response.status(405).json({error:'Method not allowed.'});
  try {
    const incoming = new URL(request.url, 'http://localhost');
    const url = new URL(upstream);
    url.search = incoming.search;
    const headers = {'Accept':'application/json'};
    const session = String(request.headers.cookie || '').match(/(?:^|;\s*)redeeming_session=([^;]+)/);
    if (session) headers.Cookie = `redeeming_session=${session[1]}`;
    let body;
    if (request.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(request.body || {});
      if (body.length > 10_000) return response.status(413).json({error:'Request is too large.'});
    }
    const result = await fetch(url, {method:request.method, headers, body, redirect:'manual'});
    const cookie = result.headers.get('set-cookie');
    if (cookie) response.setHeader('Set-Cookie', cookie);
    response.status(result.status);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(await result.text());
  } catch (error) {
    console.error('Reading access proxy failed:', error);
    response.status(502).json({error:'The access service is temporarily unavailable. Please try again.'});
  }
}
