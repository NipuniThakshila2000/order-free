import {SIGNS, PORTRAIT, POINTS, HOUSE_PASS, RISING, LETTER, MONTH_START, DOUBLED, MN} from './source-data.mjs';

const clampYear = (year) => Number.isInteger(year) && year >= 1600 && year <= new Date().getFullYear();
const sumDigits = (value) => [...String(value)].reduce((sum, digit) => sum + Number(digit), 0);

export function nameValue(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters) throw new Error('Names must contain Latin letters for the book’s English alphabet table.');
  return [...letters].reduce((sum, letter, index) => sum + LETTER[letter] * (letters.length - index), 0);
}

export function bookSun(month, day) {
  let longitude = MONTH_START[month - 1] + day - 1;
  longitude -= (DOUBLED[month - 1] || []).filter((date) => day >= date).length;
  longitude = ((longitude - 1) % 360 + 360) % 360 + 1;
  const signIndex = Math.floor((longitude - 1) / 30);
  return { sign: SIGNS[signIndex], degree: longitude - signIndex * 30, signNumber: signIndex + 1 };
}

function validateInput(input) {
  const given = String(input.given || '').trim().replace(/\s+/g, ' ');
  const surname = String(input.surname || '').trim();
  const place = String(input.place || '').trim();
  const date = String(input.date || '');
  const time = String(input.time || '');
  if (!given || !surname || !date || !time) throw new Error('Enter your full given name, family name, birth date, and birth time.');
  if (!/^[A-Za-z\s'-]+$/.test(given) || !/^[A-Za-z'-]+$/.test(surname)) throw new Error('The book’s name table supports A–Z letters. Use a Latin spelling of your birth names.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) throw new Error('Enter a valid birth date and time.');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(clock[1]), minute = Number(clock[2]);
  const dateObject = new Date(Date.UTC(year, month - 1, day));
  if (!clampYear(year) || dateObject.getUTCFullYear() !== year || dateObject.getUTCMonth() !== month - 1 || dateObject.getUTCDate() !== day || hour > 23 || minute > 59) throw new Error('Enter a real birth date and time.');
  if (dateObject > new Date()) throw new Error('Birth date cannot be in the future.');
  if (place.length > 120) throw new Error('Place of birth is too long.');
  return { given, surname, place, year, month, day, hour, minute, dateObject };
}

export function calculateReading(input) {
  const person = validateInput(input);
  const morning = person.hour < 12;
  const astroDate = new Date(person.dateObject);
  if (morning) astroDate.setUTCDate(astroDate.getUTCDate() - 1);
  const astroYear = astroDate.getUTCFullYear();
  const sun = bookSun(astroDate.getUTCMonth() + 1, astroDate.getUTCDate());
  const names = person.given.split(' ').map((name) => ({name, value: nameValue(name)}));
  names.push({name: person.surname, value: nameValue(person.surname)});
  const keyString = names.map((item) => item.value).join('') + sun.degree + sun.signNumber;
  const key = sumDigits(keyString);
  const maxAge = Math.min(98, 2200 - person.year);
  const years = Array.from({length: maxAge}, (_, index) => {
    const age = index + 1;
    const year = person.year + index;
    const pointYear = morning && person.month === 1 && person.day === 1 ? astroYear + index : year;
    const pointNumber = sumDigits(pointYear + key);
    const point = POINTS[pointNumber] || ['Point beyond the major series', 'Consult the extended tables in the book.', 'mixed'];
    const houseNumber = [1,12,11,10,9,8,7,6,5,4,3,2][index % 12];
    const house = HOUSE_PASS[houseNumber];
    const rising = SIGNS[(SIGNS.indexOf(sun.sign) + index) % 12];
    const risingData = RISING[rising];
    return {
      age, year, pointYear, pointNumber, pointName: point[0], pointText: point[1], pointTone: point[2],
      house: houseNumber, houseText: house[1], rising, risingText: risingData.t,
      risingCaution: risingData.bad.includes(sun.sign)
    };
  });
  return {
    person: {given: person.given, surname: person.surname, place: person.place, birthDate: `${person.year}-${String(person.month).padStart(2,'0')}-${String(person.day).padStart(2,'0')}`},
    method: {morning, astroDate: `${astroDate.getUTCDate()} ${MN[astroDate.getUTCMonth()]} ${astroYear}`, sun, names, keyString, key},
    portrait: PORTRAIT[sun.sign],
    years,
    limits: 'This is a symbolic reading from Sepharial’s printed rules. These inputs cannot establish a death year or a sourced guardian angel assignment.'
  };
}
