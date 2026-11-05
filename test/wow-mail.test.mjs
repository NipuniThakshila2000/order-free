import test from 'node:test';
import assert from 'node:assert/strict';
import {mailConfigured, mailStatus, sendWowEmail, senderAddress} from '../src/wow-mail.mjs';

test('Mandrill checks the WOW sending domain and sends from the WOW address', async () => {
  const previousKey=process.env.MANDRILL_API_KEY;
  const previousFetch=globalThis.fetch;
  const calls=[];
  process.env.MANDRILL_API_KEY='test-key';
  globalThis.fetch=async (url, options) => {
    const data=JSON.parse(options.body);
    calls.push({url:String(url),data});
    if (String(url).includes('/senders/domains')) return new Response(JSON.stringify([
      {domain:'wowlife.lk',verified_at:'2026-01-01',valid_signing:true,dmarc:{valid:true}}
    ]));
    return new Response(JSON.stringify([{email:'jane@example.com',status:'sent',_id:'provider-id'}]));
  };
  try {
    assert.equal(mailConfigured(),true);
    assert.equal((await mailStatus()).senderAddress,senderAddress);
    assert.deepEqual(await sendWowEmail({to:'jane@example.com',subject:'Details',message:'Hello'}),{status:'sent',id:'provider-id'});
    assert.equal(calls[1].data.message.from_email,'info@wowlife.lk');
    assert.equal(calls[1].data.message.headers['Reply-To'],'info@wowlife.lk');
    assert.equal(calls[1].data.message.to.length,1);
  } finally {
    globalThis.fetch=previousFetch;
    if (previousKey===undefined) delete process.env.MANDRILL_API_KEY; else process.env.MANDRILL_API_KEY=previousKey;
  }
});

test('Mandrill domain or recipient rejection prevents a successful send', async () => {
  const previousKey=process.env.MANDRILL_API_KEY;
  const previousFetch=globalThis.fetch;
  process.env.MANDRILL_API_KEY='test-key';
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify([{domain:'wowlife.lk',verified_at:null,valid_signing:false}]));
    await assert.rejects(mailStatus(),/verified/);
    globalThis.fetch=async()=>new Response(JSON.stringify([{email:'jane@example.com',status:'rejected',reject_reason:'unsigned'}]));
    await assert.rejects(sendWowEmail({to:'jane@example.com',subject:'Details',message:'Hello'}),/unsigned/);
  } finally {
    globalThis.fetch=previousFetch;
    if (previousKey===undefined) delete process.env.MANDRILL_API_KEY; else process.env.MANDRILL_API_KEY=previousKey;
  }
});
