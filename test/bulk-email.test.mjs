import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/bulk-email.mjs';

function call(body, cookie = 'redeeming_session=admin') {
  const result = {statusCode:200, body:null};
  const response = {
    setHeader() { return this; },
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; }
  };
  return handler({method:'POST', headers:{cookie}, body}, response).then(() => result);
}

test('requires an authenticated admin before reading or sending', async () => {
  assert.equal((await call({action:'summary'}, '')).statusCode, 401);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({authenticated:true, purpose:'reader'}));
  try { assert.equal((await call({action:'summary'})).statusCode, 403); }
  finally { globalThis.fetch = oldFetch; }
});

test('validates draft and forwards mailing through original site without a sheet token', async () => {
  const oldFetch = globalThis.fetch;
  const oldProxy = process.env.BULK_EMAIL_PROXY_URL;
  const oldScript = process.env.GOOGLE_SCRIPT_URL;
  process.env.BULK_EMAIL_PROXY_URL = 'https://original.example/api/bulk-email';
  delete process.env.GOOGLE_SCRIPT_URL;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url:String(url), options});
    return new Response(JSON.stringify(String(url).includes('action=session') ? {authenticated:true, purpose:'admin'} : {ok:true, total:2}));
  };
  try {
    const invalid = await call({action:'send', audience:'all', subject:'Hello\nBcc:bad', message:'Hi', campaignId:'e40972d7-7488-4c58-a3fa-03345371e629'});
    assert.equal(invalid.statusCode, 400);
    assert.equal(calls.length, 1);
    const result = await call({action:'send', audience:'online', subject:'Details', message:'Hello {{firstName}}', campaignId:'e40972d7-7488-4c58-a3fa-03345371e629', offset:0});
    assert.equal(result.statusCode, 200);
    assert.equal(calls.length, 3);
    assert.equal(calls[2].url, 'https://original.example/api/bulk-email');
    assert.equal(calls[2].options.headers.Cookie, 'redeeming_session=admin');
    assert.equal(JSON.parse(calls[2].options.body).token, undefined);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProxy === undefined) delete process.env.BULK_EMAIL_PROXY_URL; else process.env.BULK_EMAIL_PROXY_URL = oldProxy;
    if (oldScript === undefined) delete process.env.GOOGLE_SCRIPT_URL; else process.env.GOOGLE_SCRIPT_URL = oldScript;
  }
});

test('all contacts combines registration and applicant lists without duplicate addresses', async () => {
  const oldFetch = globalThis.fetch;
  const oldProxy = process.env.BULK_EMAIL_PROXY_URL;
  const oldScript = process.env.GOOGLE_SCRIPT_URL;
  const oldMailScript = process.env.BULK_EMAIL_SCRIPT_URL;
  const oldMailToken = process.env.BULK_EMAIL_TOKEN;
  const oldToken = process.env.REGISTRATION_TOKEN;
  delete process.env.BULK_EMAIL_PROXY_URL;
  process.env.GOOGLE_SCRIPT_URL = 'https://script.example/exec';
  process.env.BULK_EMAIL_SCRIPT_URL = 'https://mail-script.example/exec';
  process.env.BULK_EMAIL_TOKEN = 'mail-secret';
  process.env.REGISTRATION_TOKEN = 'secret';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url:String(url), options});
    const action = String(url).includes('action=session') ? 'session' :
      String(url).includes('action=applications') ? 'applications' : JSON.parse(options.body).action;
    const data = {
      session:{authenticated:true, purpose:'admin'},
      applications:{applications:[{fullName:'Jane Doe', email:'jane@example.com'}, {fullName:'Alex Ray', email:'alex@example.com'}]},
      recipients:{ok:true, recipients:[{firstName:'Jane',email:'JANE@example.com',attendance:'online'}, {firstName:'Mark',email:'mark@example.com',attendance:'in-person'}]},
      summary:{ok:true, remainingDailyQuota:88, senderAddress:'info@wowlife.lk'},
      send:{ok:true, sent:3, completed:3, total:3, nextOffset:3, remaining:0, remainingDailyQuota:85}
    }[action];
    return new Response(JSON.stringify(data));
  };
  try {
    const summary = await call({action:'summary', audience:'all'});
    assert.equal(summary.body.selected, 3);
    assert.equal(summary.body.registrants, 2);
    assert.equal(summary.body.applicants, 2);
    assert.equal(summary.body.senderAddress, 'info@wowlife.lk');
    assert.equal((await call({action:'summary', audience:'applicants'})).body.selected, 2);
    const result = await call({action:'send', audience:'all', subject:'Details', message:'Hi {{firstName}}', campaignId:'e40972d7-7488-4c58-a3fa-03345371e629', offset:0});
    assert.equal(result.statusCode, 200);
    const sendCall = calls.find((entry) => entry.options.body && JSON.parse(entry.options.body).action === 'send');
    assert.equal(sendCall.url, 'https://mail-script.example/exec');
    const payload = JSON.parse(sendCall.options.body);
    assert.equal(payload.recipients.length, 3);
    assert.equal(new Set(payload.recipients.map((person) => person.email)).size, 3);
    assert.equal(payload.token, 'mail-secret');
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [['BULK_EMAIL_PROXY_URL', oldProxy], ['GOOGLE_SCRIPT_URL', oldScript], ['BULK_EMAIL_SCRIPT_URL', oldMailScript], ['BULK_EMAIL_TOKEN', oldMailToken], ['REGISTRATION_TOKEN', oldToken]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('refuses to send when the mailing script has no verified sender address', async () => {
  const oldFetch = globalThis.fetch;
  const oldProxy = process.env.BULK_EMAIL_PROXY_URL;
  const oldScript = process.env.BULK_EMAIL_SCRIPT_URL;
  const oldToken = process.env.BULK_EMAIL_TOKEN;
  delete process.env.BULK_EMAIL_PROXY_URL;
  process.env.BULK_EMAIL_SCRIPT_URL = 'https://script.example/exec';
  process.env.BULK_EMAIL_TOKEN = 'secret';
  const actions = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('action=session')) return new Response(JSON.stringify({authenticated:true, purpose:'admin'}));
    const action = JSON.parse(options.body).action;
    actions.push(action);
    return new Response(JSON.stringify({ok:true, remainingDailyQuota:100}));
  };
  try {
    const result = await call({action:'test', audience:'all', subject:'Test', message:'Hello', testEmail:'me@example.com'});
    assert.equal(result.statusCode, 503);
    assert.deepEqual(actions, ['summary']);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [['BULK_EMAIL_PROXY_URL', oldProxy], ['BULK_EMAIL_SCRIPT_URL', oldScript], ['BULK_EMAIL_TOKEN', oldToken]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
