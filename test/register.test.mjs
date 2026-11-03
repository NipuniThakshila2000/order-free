import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/register.mjs';

function call(method, body) {
  const result = {statusCode: 200};
  const response = {
    setHeader() {},
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; }
  };
  return handler({method, body}, response).then(() => result);
}

test('keeps registration closed without sheet configuration', async () => {
  const previous = process.env.GOOGLE_SCRIPT_URL;
  delete process.env.GOOGLE_SCRIPT_URL;
  try {
    assert.deepEqual((await call('GET')).body, {ready: false});
    assert.equal((await call('POST', {})).statusCode, 503);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_SCRIPT_URL;
    else process.env.GOOGLE_SCRIPT_URL = previous;
  }
});

test('validates and forwards a complete registration to the sheet script', async () => {
  const previousUrl = process.env.GOOGLE_SCRIPT_URL;
  const previousToken = process.env.REGISTRATION_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_SCRIPT_URL = 'https://example.com/exec';
  process.env.REGISTRATION_TOKEN = 'private-test-token';
  let forwarded;
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return {ok: true, json: async () => ({ok: true})};
  };
  try {
    assert.equal((await call('POST', {firstName:'', lastName:'Doe', email:'jane@example.com', attendance:'online'})).statusCode, 400);
    const saved = await call('POST', {firstName:'Jane', lastName:'Doe', email:'jane@example.com', attendance:'in-person'});
    assert.deepEqual(saved.body, {ok: true});
    assert.equal(forwarded.token, 'private-test-token');
    assert.equal(forwarded.attendance, 'in-person');
  } finally {
    if (previousUrl === undefined) delete process.env.GOOGLE_SCRIPT_URL; else process.env.GOOGLE_SCRIPT_URL = previousUrl;
    if (previousToken === undefined) delete process.env.REGISTRATION_TOKEN; else process.env.REGISTRATION_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
});
