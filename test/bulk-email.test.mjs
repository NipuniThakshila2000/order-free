import test from 'node:test';
import assert from 'node:assert/strict';
import {createBulkEmailHandler} from '../api/bulk-email.mjs';

function fixture(alias='info@wowlife.lk') {
  const calls=[];
  const saved=new Map();
  const logs={
    mailLogPath:(id,email)=>`${id}/${email}`,
    mailDraftHash:(...parts)=>JSON.stringify(parts),
    readMailLog:async(path)=>saved.get(path)||null,
    writeMailLog:async(path,entry)=>{const record={entry,etag:'etag'};saved.set(path,record);return record;},
    recentMailLog:async()=>[...saved.values()].map((record)=>record.entry)
  };
  const handler=createBulkEmailHandler({
    storeReady:()=>true,
    registrationRecords:async()=>[
      {firstName:'Jane',email:'JANE@example.com',attendance:'online'},
      {firstName:'Mark',email:'mark@example.com',attendance:'in-person'}
    ],
    logs,
    scriptRequest:async(_url,_token,payload)=>{calls.push(payload);return payload.action==='status'?
      {ok:true,senderAddress:alias,remainingDailyQuota:100}:{ok:true};}
  });
  async function call(body,cookie='redeeming_session=admin') {
    const result={statusCode:200};
    const response={setHeader(){return this;},status(code){result.statusCode=code;return this;},json(value){result.body=value;return this;}};
    await handler({method:'POST',headers:{cookie},body},response);
    return result;
  }
  return {call,calls};
}

test('requires admin access',async()=>{
  const {call}=fixture();
  assert.equal((await call({action:'history'},'')).statusCode,401);
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,purpose:'reader'}));
  try {assert.equal((await call({action:'history'})).statusCode,403);}
  finally {globalThis.fetch=original;}
});

test('deduplicates contacts and logs delivery without a Sheet',async()=>{
  const original=globalThis.fetch;
  const keys=['BULK_EMAIL_SCRIPT_URL','BULK_EMAIL_TOKEN','BULK_EMAIL_PROXY_URL'];
  const previous=keys.map((key)=>[key,process.env[key]]);
  process.env.BULK_EMAIL_SCRIPT_URL='https://example.com/exec';
  process.env.BULK_EMAIL_TOKEN='test-token';
  delete process.env.BULK_EMAIL_PROXY_URL;
  globalThis.fetch=async(url)=>new Response(JSON.stringify(String(url).includes('action=session')?
    {authenticated:true,purpose:'admin'}:
    {applications:[{fullName:'Jane Doe',email:'jane@example.com'},{fullName:'Alex Ray',email:'alex@example.com'}]}));
  try {
    const {call,calls}=fixture();
    const summary=await call({action:'summary',audience:'all'});
    assert.equal(summary.body.selected,3);
    assert.equal(summary.body.registrants,2);
    assert.equal(summary.body.applicants,2);
    const campaign={action:'send',audience:'all',subject:'Details',message:'Hi {{firstName}}',campaignId:'e40972d7-7488-4c58-a3fa-03345371e629',offset:0};
    const first=await call(campaign);
    assert.equal(first.statusCode,200);
    assert.equal(first.body.sent,3);
    assert.equal(first.body.remaining,0);
    assert.equal(calls.filter((entry)=>entry.action==='send-one').length,3);
    const retry=await call(campaign);
    assert.equal(retry.body.sent,0);
    assert.equal(calls.filter((entry)=>entry.action==='send-one').length,3);
    assert.equal((await call({action:'history'})).body.entries.length,3);
    assert.equal((await call({...campaign,subject:'Changed'})).statusCode,409);
  } finally {
    globalThis.fetch=original;
    for (const [key,value] of previous) if (value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});

test('test sends require the verified WOW alias',async()=>{
  const original=globalThis.fetch;
  const keys=['BULK_EMAIL_SCRIPT_URL','BULK_EMAIL_TOKEN','BULK_EMAIL_PROXY_URL'];
  const previous=keys.map((key)=>[key,process.env[key]]);
  process.env.BULK_EMAIL_SCRIPT_URL='https://example.com/exec';
  process.env.BULK_EMAIL_TOKEN='test-token';
  delete process.env.BULK_EMAIL_PROXY_URL;
  globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,purpose:'admin'}));
  const data={action:'test',audience:'registrants',subject:'Details',message:'Hi',testEmail:'me@example.com'};
  try {
    const valid=fixture();
    assert.equal((await valid.call(data)).statusCode,200);
    assert.equal(valid.calls.find((entry)=>entry.action==='send-one').to,'me@example.com');
    const invalid=fixture('personal@gmail.com');
    assert.equal((await invalid.call(data)).statusCode,503);
    assert.equal(invalid.calls.some((entry)=>entry.action==='send-one'),false);
  } finally {
    globalThis.fetch=original;
    for (const [key,value] of previous) if (value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});
