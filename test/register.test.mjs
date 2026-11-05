import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/register.mjs';

async function call(method, body) {
  const result = {statusCode:200};
  const response = {setHeader() {}, status(code) {result.statusCode=code;return this;}, json(value) {result.body=value;return this;}};
  await handler({method,body},response);
  return result;
}

test('registration requires private storage and the open flag', async () => {
  const keys = ['BLOB_READ_WRITE_TOKEN','REGISTRATION_OPEN','GOOGLE_SCRIPT_URL','REGISTRATION_TOKEN'];
  const previous = keys.map((key) => [key,process.env[key]]);
  try {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.GOOGLE_SCRIPT_URL='https://example.com/exec';
    process.env.REGISTRATION_TOKEN='legacy-token';
    process.env.REGISTRATION_OPEN='true';
    assert.deepEqual((await call('GET')).body,{ready:false});
    assert.equal((await call('POST',{})).statusCode,503);
    process.env.BLOB_READ_WRITE_TOKEN='blob-token';
    delete process.env.REGISTRATION_OPEN;
    assert.deepEqual((await call('GET')).body,{ready:false});
    process.env.REGISTRATION_OPEN='true';
    assert.deepEqual((await call('GET')).body,{ready:true});
    assert.equal((await call('POST',{firstName:'',lastName:'Doe',email:'jane@example.com',attendance:'online'})).statusCode,400);
  } finally {
    for (const [key,value] of previous) if (value === undefined) delete process.env[key]; else process.env[key]=value;
  }
});
