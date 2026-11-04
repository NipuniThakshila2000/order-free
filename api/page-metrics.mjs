const upstream = 'https://order.wowlife.lk/api/page-metrics';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(request.method)) return response.status(405).json({error:'Method not allowed.'});
  try {
    if (request.method === 'POST' && request.headers.origin &&
        new URL(request.headers.origin).host !== request.headers.host) {
      return response.status(403).json({error:'Invalid request origin.'});
    }
    const url = new URL(upstream);
    url.search = new URL(request.url, 'http://localhost').search;
    const headers = {'Accept':'application/json'};
    const session = String(request.headers.cookie || '').match(/(?:^|;\s*)redeeming_session=([^;]+)/);
    if (request.method === 'GET' && session) headers.Cookie = `redeeming_session=${session[1]}`;
    let body;
    if (request.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(request.body || {});
      if (body.length > 1000) return response.status(413).json({error:'Request too large.'});
    }
    const result = await fetch(url, {method:request.method, headers, body, redirect:'manual'});
    response.status(result.status);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(await result.text());
  } catch (error) {
    console.error('Page metrics proxy failed:', error);
    response.status(502).json({error:'Page metrics are unavailable.'});
  }
}
