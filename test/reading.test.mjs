import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateReading, bookSun, annualPoint, ageCyclePoint, guardianAngelsFor} from '../src/reading.mjs';
import {ANGEL_NAMES, POINTS, AGE_POINTS} from '../src/source-data.mjs';

test('reproduces Sepharial’s worked Gladstone example', () => {
  const reading = calculateReading({given:'William Ewart', surname:'Gladstone', date:'1809-12-29', time:'06:00'});
  assert.deepEqual(reading.method.names.map((name) => name.value), [84,60,149]);
  assert.deepEqual(reading.method.sun, {sign:'Capricorn', degree:7, signNumber:10});
  assert.equal(reading.method.key, 40);
  assert.equal(reading.years.find((year) => year.year === 1894).pointNumber, 17);
});

test('keeps the noon adjustment within Sepharial’s symbolic calendar across New Year', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'2000-01-01', time:'08:00'});
  assert.equal(reading.method.astroDate, '31 December 1999');
  assert.equal(reading.years[0].pointYear, 1999);
  assert.equal(reading.person.birthDate, '2000-01-01');
  assert.equal(reading.years[0].periodStart,'1999-12-31 12:00');
});

test('honours repeated degrees in the printed calendar', () => {
  assert.deepEqual(bookSun(5,20), bookSun(5,21));
  assert.deepEqual(bookSun(6,21), bookSun(6,22));
});

test('rejects impossible dates', () => {
  assert.throws(() => calculateReading({given:'Anna', surname:'Smith', date:'2001-02-29', time:'08:00'}), /real birth date/);
});

test('accepts a family name with two parts', () => {
  const input = {given:'Anna', surname:'Smith Jones', date:'2000-01-01', time:'08:00'};
  const reading = calculateReading(input);
  const hyphenated = calculateReading({...input, surname:'Smith-Jones'});
  assert.equal(reading.person.surname, 'Smith Jones');
  assert.equal(reading.method.key, hyphenated.method.key);
});

test('preserves the optional city without changing the calculation', () => {
  const input = {given:'William Ewart', surname:'Gladstone', date:'1809-12-29', time:'06:00'};
  const withoutPlace = calculateReading(input);
  const withPlace = calculateReading({...input, place:'Colombo'});
  assert.equal(withPlace.person.place, 'Colombo');
  assert.equal(withPlace.method.key, withoutPlace.method.key);
});

test('reproduces the 1911 age-plus-year Tarot cycle example', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'1864-04-01', time:'08:00'});
  const firstBirthday = reading.years.find((year) => year.year === 1865);
  const secondBirthday = reading.years.find((year) => year.year === 1866);
  assert.deepEqual([firstBirthday.ageAttained, firstBirthday.ageCycleSum, firstBirthday.agePointNumber], [1, 1866, 21]);
  assert.deepEqual([secondBirthday.ageAttained, secondBirthday.ageCycleSum, secondBirthday.agePointDigitSum, secondBirthday.agePointNumber], [2, 1868, 23, 1]);
});

test('keeps Sepharial annual points 23–28 distinct from the 22-point age cycle', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'1700-03-25', time:'08:00'});
  const year = reading.years.find((item) => item.year === 1756);
  assert.deepEqual([year.pointSum, year.pointDigitSum, year.pointNumber], [1769, 23, 23]);
  assert.deepEqual([1769,1995,1996,1997,1998,1999].map((sum) => annualPoint(0,sum)), [23,24,25,26,27,28]);
  assert.equal(POINTS[27][0], 'The Sceptre');
  assert.equal(ageCyclePoint(1866, 2), 1);
  assert.equal(AGE_POINTS[5][0], 'The Hierophant');
  assert.equal(AGE_POINTS[14][0], 'The Two Urns');
  assert.equal(AGE_POINTS[20][0], 'The Resurrection');
});

test('reproduces the documented 1859 and 1894 annual examples', () => {
  assert.equal(annualPoint(1859,40),27);
  assert.equal(annualPoint(1894,40),17);
  const years=calculateReading({given:'William Ewart',surname:'Gladstone',date:'1809-12-29',time:'08:00'}).years;
  assert.equal(years.find((item) => item.year === 1859).pointNumber,27);
  assert.equal(years.find((item) => item.year === 1894).pointNumber,17);
});

test('matches the full printed 1864 age-cycle sequence', () => {
  const expected=[19,21,1,16,18,20,22,2,17,19,21,1,3,18,20,22,2];
  assert.deepEqual(expected.map((_,age) => ageCyclePoint(1864+age,age)),expected);
});

test('uses four and eight symbolic months from displayed degree 20', () => {
  const reading=calculateReading({given:'Anna',surname:'Smith',date:'2000-04-09',time:'14:00'});
  const year=reading.years[0];
  assert.equal(reading.method.sun.degree,20);
  assert.equal(year.risingInitialMonths,4);
});

test('assigns guardian angels from Lenain’s three birth-date and time tables', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'2000-03-25', time:'00:20'});
  assert.equal(ANGEL_NAMES.length, 72);
  assert.deepEqual(reading.guardianAngels.map((angel) => angel.name), ['Jeliel', 'Lelahel', 'Jeliel']);
  assert.match(reading.guardianAngels[0].basis, /25 March–29 March/);
  assert.match(reading.guardianAngels[1].basis, /position 6/);
  assert.match(reading.guardianAngels[2].basis, /00:20–00:40/);
});

test('leaves Lenain’s unnumbered calendar dates unassigned', () => {
  for (const date of ['2000-02-29', '2000-03-15']) {
    const reading = calculateReading({given:'Anna', surname:'Smith', date, time:'23:59'});
    assert.deepEqual(reading.guardianAngels.map((angel) => angel.name), [null, null, 'Mumiah']);
  }
});

test('reproduces Lenain’s 17 November 10:15 worked example', () => {
  assert.deepEqual(guardianAngelsFor({month:11,day:17,hour:10,minute:15}).map((angel) => angel.number),[49,27,31]);
});

test('covers every civil clock minute in exactly one Lenain spirit interval', () => {
  for (let minute=0;minute<1440;minute++) {
    const guardian=guardianAngelsFor({month:11,day:17,hour:Math.floor(minute/60),minute:minute%60})[2];
    assert.equal(guardian.number,Math.floor(minute/20)+1);
  }
});

test('covers every numbered Lenain birth-date boundary from March 20 through March 14', () => {
  for (let offset=0;offset<360;offset++) {
    const date=new Date(Date.UTC(2001,2,20)+offset*86400000);
    const [physical,character]=guardianAngelsFor({month:date.getUTCMonth()+1,day:date.getUTCDate(),hour:0,minute:0});
    assert.equal(physical.number,Math.floor(offset/5)+1);
    assert.equal(character.number,offset%72+1);
  }
  for (let day=15;day<=19;day++) {
    assert.deepEqual(guardianAngelsFor({month:3,day,hour:0,minute:0}).slice(0,2).map((angel)=>angel.number),[null,null]);
  }
});

test('qualifies hour-only and unknown birth times without a unique spirit result', () => {
  const hour=calculateReading({given:'Anna',surname:'Smith',date:'2000-03-25',time:'10:00',timeCertainty:'hour'});
  assert.equal(hour.lilly.available,false);
  assert.equal(hour.guardianAngels[2].number,null);
  assert.deepEqual(hour.guardianAngels[2].candidates,[31,32,33]);
  const unknown=calculateReading({given:'Anna',surname:'Smith',date:'2000-03-25',timeCertainty:'unknown'});
  assert.equal(unknown.method,null);
  assert.deepEqual(unknown.guardianAngels.map((angel)=>angel.number),[2,6,null]);
});

test('converts Old Style birth dates for Lilly while preserving the recorded civil date for symbolic and guardian methods', () => {
  const reading=calculateReading({given:'Anna',surname:'Smith',date:'1700-02-29',time:'13:00',calendar:'julian'});
  assert.equal(reading.person.birthDate,'1700-02-29');
  assert.equal(reading.method.astroDate,'29 February 1700');
  assert.deepEqual(reading.guardianAngels.slice(0,2).map((angel)=>angel.number),[null,null]);
});
