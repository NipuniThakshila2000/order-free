import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function scriptHarness() {
  const sheets = new Map();
  const sent = [];
  const book = {
    getSheetByName(name) { return sheets.get(name); },
    insertSheet(name) {
      const rows = [];
      const sheet = {
        getLastRow:() => rows.length,
        appendRow(row) { rows.push(row); },
        getRange(start, column, count, width) {
          return {
            getDisplayValues:() => rows.slice(start - 1, start - 1 + count).map((row) => row.slice(column - 1, column - 1 + width).map(String)),
            setValues(values) { values.forEach((value, index) => value.forEach((cell, offset) => { rows[start - 1 + index][column - 1 + offset] = cell; })); }
          };
        },
        rows
      };
      sheets.set(name, sheet);
      return sheet;
    }
  };
  const context = vm.createContext({
    SpreadsheetApp:{openById:() => book},
    PropertiesService:{getScriptProperties:() => ({getProperty:(name) => name === 'REGISTRATION_TOKEN' ? 'secret' : 'info@wowlife.lk'})},
    LockService:{getScriptLock:() => ({waitLock() {}, releaseLock() {}})},
    MailApp:{getRemainingDailyQuota:() => 100},
    GmailApp:{getAliases:() => ['info@wowlife.lk'], sendEmail:(to, subject, body, options) => sent.push({to, subject, body, options})},
    ContentService:{MimeType:{JSON:'json'}, createTextOutput:(text) => ({setMimeType() { return JSON.parse(text); }})},
    Date, Set
  });
  vm.runInContext(fs.readFileSync(new URL('../scripts/registration-sheet.gs', import.meta.url), 'utf8'), context);
  return {post:(data) => context.doPost({postData:{contents:JSON.stringify({token:'secret', ...data})}}), sent, sheets};
}

test('mailing deduplicates registrants and resumes without resending completed addresses', () => {
  const harness = scriptHarness();
  for (const registration of [
    {firstName:'Jane', lastName:'Doe', email:'JANE@example.com', attendance:'online'},
    {firstName:'Jane', lastName:'Doe', email:'jane@example.com', attendance:'online'},
    {firstName:'Mark', lastName:'Lee', email:'mark@example.com', attendance:'in-person'}
  ]) assert.equal(harness.post(registration).ok, true);
  const summary = harness.post({action:'summary', audience:'all'});
  assert.equal(summary.selected, 2);
  assert.equal(harness.post({action:'summary', audience:'online'}).selected, 1);
  const campaign = {action:'send', audience:'all', subject:'Event details', message:'Hello {{firstName}}', campaignId:'e40972d7-7488-4c58-a3fa-03345371e629'};
  assert.equal(harness.post(campaign).sent, 2);
  assert.equal(harness.post(campaign).sent, 0);
  assert.equal(harness.sent.length, 2);
  assert.equal(harness.sent[0].body, 'Hello Jane');
  assert.equal(harness.sent[0].options.from, 'info@wowlife.lk');
  assert.equal(harness.sheets.get('MailLog').rows.length, 3);
});
