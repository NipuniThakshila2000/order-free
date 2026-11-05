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
    mail:{
      configured:()=>true,
      status:async()=>({senderAddress:alias,replyToAddress:'info@wowlife.in',remainingDailyQuota:null}),
      send:async(payload)=>{calls.push(payload);return {status:'queued',id:'mandrill-id'};}
    }
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
  const keys=['BULK_EMAIL_PROXY_URL'];
  const previous=keys.map((key)=>[key,process.env[key]]);
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
    assert.equal(summary.body.replyToAddress,'info@wowlife.in');
    const campaign={action:'send',audience:'all',subject:'Details',message:'Hi {{firstName}}',campaignId:'e40972d7-7488-4c58-a3fa-03345371e629',offset:0};
    const first=await call(campaign);
    assert.equal(first.statusCode,200);
    assert.equal(first.body.sent,3);
    assert.equal(first.body.remaining,0);
    assert.equal(calls.length,3);
    const retry=await call(campaign);
    assert.equal(retry.body.sent,0);
    assert.equal(calls.length,3);
    const history=(await call({action:'history'})).body.entries;
    assert.equal(history.length,3);
    assert.equal(history[0].status,'queued');
    assert.equal((await call({...campaign,subject:'Changed'})).statusCode,409);
  } finally {
    globalThis.fetch=original;
    for (const [key,value] of previous) if (value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});

test('test sends require the WOW mailbox sender',async()=>{
  const original=globalThis.fetch;
  const keys=['BULK_EMAIL_PROXY_URL'];
  const previous=keys.map((key)=>[key,process.env[key]]);
  delete process.env.BULK_EMAIL_PROXY_URL;
  globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,purpose:'admin'}));
  const data={action:'test',audience:'registrants',subject:'Details',message:'Hi',testEmail:'me@example.com'};
  try {
    const valid=fixture();
    assert.equal((await valid.call(data)).statusCode,200);
    assert.equal(valid.calls[0].to,'me@example.com');
    const invalid=fixture('personal@gmail.com');
    assert.equal((await invalid.call(data)).statusCode,503);
    assert.equal(invalid.calls.length,0);
  } finally {
    globalThis.fetch=original;
    for (const [key,value] of previous) if (value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});
