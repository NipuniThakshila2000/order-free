import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateReading, bookSun} from '../src/reading.mjs';

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

test('preserves the optional city without changing the calculation', () => {
  const input = {given:'William Ewart', surname:'Gladstone', date:'1809-12-29', time:'06:00'};
  const withoutPlace = calculateReading(input);
  const withPlace = calculateReading({...input, place:'Colombo'});
  assert.equal(withPlace.person.place, 'Colombo');
  assert.equal(withPlace.method.key, withoutPlace.method.key);
});
