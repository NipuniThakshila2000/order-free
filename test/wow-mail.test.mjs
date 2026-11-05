import test from 'node:test';
import assert from 'node:assert/strict';
import {mailStatus, sendWowEmail} from '../src/wow-mail.mjs';

test('mail bridge forwards the admin session and one recipient to the main site',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    const action=JSON.parse(options.body).action;
    return new Response(JSON.stringify(action==='status'?
      {ok:true,senderAddress:'info@wowlife.lk',remainingDailyQuota:null}:
      {ok:true,status:'queued',id:'mandrill-id'}));
  };
  try {
    const cookie='redeeming_session=admin';
    assert.equal((await mailStatus(cookie)).senderAddress,'info@wowlife.lk');
    assert.deepEqual(await sendWowEmail({to:'jane@example.com',subject:'Details',message:'Hello'},cookie),
      {status:'queued',id:'mandrill-id'});
    assert.equal(calls[0].options.headers.Cookie,cookie);
    assert.equal(calls[1].url,'https://order.wowlife.lk/api/bulk-email-bridge');
    assert.equal(JSON.parse(calls[1].options.body).to,'jane@example.com');
    await assert.rejects(mailStatus(''),/Admin sign-in/);
  } finally {globalThis.fetch=original;}
});
