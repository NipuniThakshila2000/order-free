import {importId, registrationPath, registrationPaths, saveRegistration} from '../src/registration-store.mjs';

const sheetId = '18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Registrations`;
const response = await fetch(url);
if (!response.ok) throw new Error('The existing registration Sheet could not be read.');
const text = await response.text();
const data = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')));
const labels = data.table?.cols?.map((column) => column.label);
if (JSON.stringify(labels) !== JSON.stringify(['Submitted at','First name','Last name','Email address','Attendance'])) {
  throw new Error('The registration Sheet columns have changed. Review the migration before continuing.');
}

function sheetDate(value) {
  const match = /^Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)$/.exec(String(value));
  if (!match) throw new Error('A Sheet registration has an unexpected date format.');
  const [, year, month, day, hour, minute, second] = match.map(Number);
  // The registration Sheet displays Asia/Colombo civil time (UTC+05:30).
  return new Date(Date.UTC(year, month, day, hour - 5, minute - 30, second)).toISOString();
}

const existing = await registrationPaths();
let imported = 0;
let skipped = 0;
for (const [index, row] of data.table.rows.entries()) {
  const values = row.c.map((cell) => cell?.v ?? '');
  const record = {
    submittedAt:sheetDate(values[0]),
    firstName:String(values[1]).trim(),
    lastName:String(values[2]).trim(),
    email:String(values[3]).trim(),
    attendance:String(values[4]).toLowerCase().startsWith('online') ? 'online' : 'in-person'
  };
  if (!record.firstName || !record.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    throw new Error(`Registration row ${index + 2} is incomplete. Nothing after this row was imported.`);
  }
  const id = importId(record, index);
  const pathname = registrationPath(record, id);
  if (existing.has(pathname)) { skipped++; continue; }
  await saveRegistration(record, id);
  existing.add(pathname);
  imported++;
}
console.log(JSON.stringify({sourceRows:data.table.rows.length, imported, alreadyPresent:skipped}));
