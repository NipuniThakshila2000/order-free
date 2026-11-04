import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/access.mjs';

function response() {
  return {
    headers:{}, statusCode:200, body:'',
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(value) { this.body = value; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

test('forwards only the reading session cookie and preserves the login cookie response', async () => {
  const previous = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = {url:String(url), options};
    return new Response(JSON.stringify({ok:true}), {
      status:200, headers:{'set-cookie':'redeeming_session=abc; Path=/; HttpOnly; SameSite=Lax'}
    });
  };
  try {
    const res = response();
    await handler({method:'POST', url:'/api/access?action=verify-code', headers:{cookie:'other=secret; redeeming_session=old'}, body:{email:'reader@example.com', code:'123456'}}, res);
    assert.match(sent.url, /\/api\/reading-access\?action=verify-code$/);
    assert.equal(sent.options.headers.Cookie, 'redeeming_session=old');
    assert.deepEqual(JSON.parse(sent.options.body), {email:'reader@example.com', code:'123456'});
    assert.equal(res.headers['Set-Cookie'], 'redeeming_session=abc; Path=/; HttpOnly; SameSite=Lax');
    assert.equal(res.statusCode, 200);
  } finally { globalThis.fetch = previous; }
});
