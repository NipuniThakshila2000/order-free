import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationPath, importId} from '../src/registration-store.mjs';
import handler from '../api/admin-registrations.mjs';

test('registration keys sort newest submissions first and imports are repeatable', () => {
  const early = {submittedAt:'2026-11-03T09:00:00.000Z', firstName:'Jane', lastName:'Doe', email:'jane@example.com', attendance:'online'};
  const later = {...early, submittedAt:'2026-11-05T09:00:00.000Z'};
  assert.ok(registrationPath(later, 'later') < registrationPath(early, 'early'));
  assert.equal(importId(early, 2), importId(early, 2));
  assert.notEqual(importId(early, 2), importId(early, 3));
});

function call(url, cookie = '') {
  const output = {statusCode:200, body:null};
  const response = {
    setHeader() { return this; },
    status(code) { output.statusCode = code; return this; },
    json(body) { output.body = body; return this; }
  };
  return handler({method:'GET', url, headers:{cookie}}, response).then(() => output);
}

test('registration table requires admin access', async () => {
  assert.equal((await call('/api/admin-registrations?offset=0')).statusCode, 401);
  assert.equal((await call('/api/admin-registrations?offset=-1', 'redeeming_session=abc')).statusCode, 400);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({authenticated:true, purpose:'reader'}));
  try { assert.equal((await call('/api/admin-registrations?offset=0', 'redeeming_session=abc')).statusCode, 403); }
  finally { globalThis.fetch = originalFetch; }
});
