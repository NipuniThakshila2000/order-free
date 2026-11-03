import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateReading, bookSun} from '../src/reading.mjs';
import {ANGEL_NAMES} from '../src/source-data.mjs';

test('reproduces Sepharial’s worked Gladstone example', () => {
  const reading = calculateReading({given:'William Ewart', surname:'Gladstone', date:'1809-12-29', time:'06:00'});
  assert.deepEqual(reading.method.names.map((name) => name.value), [84,60,149]);
  assert.deepEqual(reading.method.sun, {sign:'Capricorn', degree:7, signNumber:10});
  assert.equal(reading.method.key, 40);
  assert.equal(reading.years.find((year) => year.year === 1894).pointNumber, 17);
});

test('uses the preceding year for a January 1 morning birth', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'2000-01-01', time:'08:00'});
  assert.equal(reading.method.astroDate, '31 December 1999');
  assert.equal(reading.years[0].pointYear, 1999);
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

test('wraps an annual signature above the 22 Tarot points', () => {
  const reading = calculateReading({given:'Anna', surname:'Smith', date:'1700-03-25', time:'08:00'});
  const year = reading.years.find((item) => item.year === 1756);
  assert.deepEqual([year.pointSum, year.pointDigitSum, year.pointNumber], [1769, 23, 1]);
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
