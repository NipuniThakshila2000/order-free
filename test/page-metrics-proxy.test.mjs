import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/page-metrics.mjs';

function response() {
  return {
    headers:{}, statusCode:200, body:'',
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(value) { this.body = value; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

test('forwards an anonymous page count without browser cookies', async () => {
  const previous = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = {url:String(url), options};
    return new Response(null, {status:204});
  };
  try {
    const res = response();
    await handler({method:'POST', url:'/api/page-metrics', headers:{host:'order-free.vercel.app', origin:'https://order-free.vercel.app', cookie:'redeeming_session=secret'}, body:{site:'order-free.vercel.app'}}, res);
    assert.equal(res.statusCode, 204);
    assert.equal(sent.url, 'https://order.wowlife.lk/api/page-metrics');
    assert.equal(sent.options.headers.Cookie, undefined);
    assert.deepEqual(JSON.parse(sent.options.body), {site:'order-free.vercel.app'});
  } finally { globalThis.fetch = previous; }
});

test('rejects a cross-origin page count', async () => {
  const res = response();
  await handler({method:'POST', url:'/api/page-metrics', headers:{host:'order-free.vercel.app', origin:'https://example.org'}, body:{site:'order-free.vercel.app'}}, res);
  assert.equal(res.statusCode, 403);
});

test('forwards only the admin session cookie when loading metrics', async () => {
  const previous = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = {url:String(url), options};
    return new Response(JSON.stringify({summary:{total:'0'}}), {status:200});
  };
  try {
    const res = response();
    await handler({method:'GET', url:'/api/page-metrics', headers:{cookie:'other=ignored; redeeming_session=token'}}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(sent.options.headers.Cookie, 'redeeming_session=token');
  } finally { globalThis.fetch = previous; }
});
