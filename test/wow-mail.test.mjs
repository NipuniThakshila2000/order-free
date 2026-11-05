import test from 'node:test';
import assert from 'node:assert/strict';
import {mailConfigured, senderAddress} from '../src/wow-mail.mjs';

test('direct SMTP requires WOW mailbox credentials and a TLS port', () => {
  const keys=['WOW_SMTP_HOST','WOW_SMTP_PORT','WOW_SMTP_USER','WOW_SMTP_PASSWORD'];
  const previous=keys.map((key)=>[key,process.env[key]]);
  try {
    process.env.WOW_SMTP_HOST='smtp.example.com';
    process.env.WOW_SMTP_PORT='587';
    process.env.WOW_SMTP_USER='personal@gmail.com';
    process.env.WOW_SMTP_PASSWORD='app-password';
    assert.equal(mailConfigured(),false);
    process.env.WOW_SMTP_USER=senderAddress;
    assert.equal(mailConfigured(),true);
    process.env.WOW_SMTP_PORT='25';
    assert.equal(mailConfigured(),false);
    process.env.WOW_SMTP_PORT='465';
    assert.equal(mailConfigured(),true);
    delete process.env.WOW_SMTP_PASSWORD;
    assert.equal(mailConfigured(),false);
  } finally {
    for (const [key,value] of previous) if (value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});
