import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/experience-data.mjs';

function response() {
  return {
    headers:{}, statusCode:200, body:'',
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(value) { this.body = value; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

test('forwards consented results and only the signed-in session cookie', async () => {
  const previous = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = {url:String(url), options};
    return new Response(JSON.stringify({saved:true, id:'example'}), {status:201});
  };
  try {
    const res = response();
    const body = {consent:true, details:{date:'1990-05-15'}, result:{years:[], guardianAngels:[]}};
    await handler({method:'POST', url:'/api/experience-data', headers:{cookie:'other=secret; redeeming_session=token'}, body}, res);
    assert.equal(sent.url, 'https://order.wowlife.lk/api/experience-data');
    assert.equal(sent.options.headers.Cookie, 'redeeming_session=token');
    assert.deepEqual(JSON.parse(sent.options.body), body);
    assert.equal(res.statusCode, 201);
  } finally { globalThis.fetch = previous; }
});

test('forwards an account deletion without other cookies', async () => {
  const previous = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = {url:String(url), options};
    return new Response(JSON.stringify({deleted:1}), {status:200});
  };
  try {
    const res = response();
    await handler({method:'DELETE', url:'/api/experience-data?action=all', headers:{cookie:'other=secret; redeeming_session=token'}}, res);
    assert.equal(sent.url, 'https://order.wowlife.lk/api/experience-data?action=all');
    assert.equal(sent.options.headers.Cookie, 'redeeming_session=token');
    assert.equal(sent.options.method, 'DELETE');
    assert.equal(res.statusCode, 200);
  } finally { globalThis.fetch = previous; }
});
