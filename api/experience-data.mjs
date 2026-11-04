const upstream = 'https://order.wowlife.lk/api/experience-data';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    return response.status(405).json({error:'Method not allowed.'});
  }
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
      if (body.length > 1000000) return response.status(413).json({error:'The generated data is too large to save.'});
    }
    const result = await fetch(url, {method:request.method, headers, body, redirect:'manual'});
    response.status(result.status);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(await result.text());
  } catch (error) {
    console.error('Experience data proxy failed:', error);
    response.status(502).json({error:'Your results could not be saved. Please try again.'});
  }
}
