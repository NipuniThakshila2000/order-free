import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function scriptHarness(aliases = ['info@wowlife.lk']) {
  const sent = [];
  const context = vm.createContext({
    PropertiesService:{getScriptProperties:() => ({getProperty:(name) => name === 'BULK_EMAIL_TOKEN' ? 'secret' : null})},
    GmailApp:{getAliases:() => aliases, sendEmail:(to, subject, body, options) => sent.push({to, subject, body, options})},
    MailApp:{getRemainingDailyQuota:() => 100},
    ContentService:{MimeType:{JSON:'json'}, createTextOutput:(value) => ({setMimeType() { return JSON.parse(value); }})}
  });
  vm.runInContext(fs.readFileSync(new URL('../scripts/bulk-mail.gs', import.meta.url), 'utf8'), context);
  return {post:(data) => context.doPost({postData:{contents:JSON.stringify({token:'secret', ...data})}}), sent};
}

test('requires the verified WOW alias and sends an individual message from it', () => {
  const script = scriptHarness();
  assert.equal(script.post({action:'status'}).senderAddress, 'info@wowlife.lk');
  assert.equal(script.post({action:'send-one', to:'jane@example.com', subject:'Details', message:'Hello Jane'}).ok, true);
  assert.equal(script.sent.length, 1);
  assert.equal(script.sent[0].options.from, 'info@wowlife.lk');
  assert.equal(script.sent[0].options.replyTo, 'info@wowlife.lk');
});

test('refuses to send when the WOW alias is not verified', () => {
  const script = scriptHarness([]);
  assert.equal(script.post({action:'status'}).ok, false);
  assert.equal(script.post({action:'send-one', to:'jane@example.com', subject:'Details', message:'Hello'}).ok, false);
  assert.equal(script.sent.length, 0);
});
