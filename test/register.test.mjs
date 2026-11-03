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
  const previousProxy = process.env.REGISTRATION_PROXY_URL;
  delete process.env.GOOGLE_SCRIPT_URL;
  delete process.env.REGISTRATION_PROXY_URL;
  try {
    assert.deepEqual((await call('GET')).body, {ready: false});
    assert.equal((await call('POST', {})).statusCode, 503);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_SCRIPT_URL;
    else process.env.GOOGLE_SCRIPT_URL = previous;
    if (previousProxy === undefined) delete process.env.REGISTRATION_PROXY_URL;
    else process.env.REGISTRATION_PROXY_URL = previousProxy;
  }
});

test('validates and forwards a complete registration to the sheet script', async () => {
  const previousUrl = process.env.GOOGLE_SCRIPT_URL;
  const previousToken = process.env.REGISTRATION_TOKEN;
  const previousOpen = process.env.REGISTRATION_OPEN;
  const previousFetch = globalThis.fetch;
  const previousProxy = process.env.REGISTRATION_PROXY_URL;
  process.env.GOOGLE_SCRIPT_URL = 'https://example.com/exec';
  process.env.REGISTRATION_TOKEN = 'private-test-token';
  delete process.env.REGISTRATION_PROXY_URL;
  delete process.env.REGISTRATION_OPEN;
  let forwarded;
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return {ok: true, json: async () => ({ok: true})};
  };
  try {
    assert.deepEqual((await call('GET')).body, {ready: false});
    process.env.REGISTRATION_OPEN = 'true';
    assert.equal((await call('POST', {firstName:'', lastName:'Doe', email:'jane@example.com', attendance:'online'})).statusCode, 400);
    const saved = await call('POST', {firstName:'Jane', lastName:'Doe', email:'jane@example.com', attendance:'in-person'});
    assert.deepEqual(saved.body, {ok: true});
    assert.equal(forwarded.token, 'private-test-token');
    assert.equal(forwarded.attendance, 'in-person');
  } finally {
    if (previousUrl === undefined) delete process.env.GOOGLE_SCRIPT_URL; else process.env.GOOGLE_SCRIPT_URL = previousUrl;
    if (previousToken === undefined) delete process.env.REGISTRATION_TOKEN; else process.env.REGISTRATION_TOKEN = previousToken;
    if (previousOpen === undefined) delete process.env.REGISTRATION_OPEN; else process.env.REGISTRATION_OPEN = previousOpen;
    if (previousProxy === undefined) delete process.env.REGISTRATION_PROXY_URL; else process.env.REGISTRATION_PROXY_URL = previousProxy;
    globalThis.fetch = previousFetch;
  }
});

test('forwards a WOWMedia registration as JSON without sending the sheet token', async () => {
  const oldProxy=process.env.REGISTRATION_PROXY_URL;
  const oldOpen=process.env.REGISTRATION_OPEN;
  const oldFetch=globalThis.fetch;
  process.env.REGISTRATION_PROXY_URL='https://original.example/api/register';
  process.env.REGISTRATION_OPEN='true';
  let forwarded;
  globalThis.fetch=async (url, options) => {
    forwarded={url,headers:options.headers,body:JSON.parse(options.body)};
    return {ok:true,status:200,json:async()=>({ok:true})};
  };
  try {
    assert.deepEqual((await call('GET')).body,{ready:true});
    assert.deepEqual((await call('POST',{firstName:'Jane',lastName:'Doe',email:'jane@example.com',attendance:'online'})).body,{ok:true});
    assert.equal(forwarded.url,'https://original.example/api/register');
    assert.equal(forwarded.headers['Content-Type'],'application/json');
    assert.deepEqual(forwarded.body,{firstName:'Jane',lastName:'Doe',email:'jane@example.com',attendance:'online'});
  } finally {
    if (oldProxy === undefined) delete process.env.REGISTRATION_PROXY_URL; else process.env.REGISTRATION_PROXY_URL=oldProxy;
    if (oldOpen === undefined) delete process.env.REGISTRATION_OPEN; else process.env.REGISTRATION_OPEN=oldOpen;
    globalThis.fetch=oldFetch;
  }
});
