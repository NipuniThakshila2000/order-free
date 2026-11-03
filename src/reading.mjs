import {SIGNS, PORTRAIT, POINTS, HOUSE_PASS, RISING, LETTER, MONTH_START, DOUBLED, MN, ANGEL_NAMES} from './source-data.mjs';

const clampYear = (year) => Number.isInteger(year) && year >= 1600 && year <= new Date().getFullYear();
const sumDigits = (value) => [...String(value)].reduce((sum, digit) => sum + Number(digit), 0);
const cyclePoint = (value) => ((sumDigits(value) - 1) % 22) + 1;

function guardianAngelsFor(person) {
  // Lenain's date tables start on 20 March in a 360-day cycle. The remaining
  // dates, including leap day, have no numbered date assignment in the tables.
  const leapDay = person.month === 2 && person.day === 29;
  const tableYear = person.month > 3 || (person.month === 3 && person.day >= 20) ? 2001 : 2002;
  const dayOffset = leapDay ? 365 : Math.round((Date.UTC(tableYear, person.month - 1, person.day) - Date.UTC(2001, 2, 20)) / 86400000);
  const hasDateAngel = dayOffset < 360;
  const date = `${person.day} ${MN[person.month - 1]}`;
  const makeAngel = (role, number, basis) => ({role, number, name: number ? ANGEL_NAMES[number - 1] : null, basis});
  const clock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const formatTableDate = (offset) => {
    const day = new Date(Date.UTC(2001, 2, 20) + offset * 86400000);
    return `${day.getUTCDate()} ${MN[day.getUTCMonth()]}`;
  };
  const intervalStart = Math.floor(dayOffset / 5) * 5;
  const timeStart = Math.floor((person.hour * 60 + person.minute) / 20) * 20;
  return [
    makeAngel('Physical guardian angel', hasDateAngel ? Math.floor(dayOffset / 5) + 1 : null,
      hasDateAngel ? `Born ${date}; the five-day interval is ${formatTableDate(intervalStart)}–${formatTableDate(intervalStart + 4)}.` : `${date} has no numbered birth-date correspondence.`),
    makeAngel('Character guardian angel', hasDateAngel ? dayOffset % 72 + 1 : null,
      hasDateAngel ? `Born ${date}; day ${dayOffset + 1} from 20 March gives position ${dayOffset % 72 + 1} in the repeating 72-day cycle.` : `${date} has no numbered birth-date correspondence.`),
    makeAngel('Spirit guardian angel', Math.floor(timeStart / 20) + 1,
      `Local birth time ${clock(person.hour * 60 + person.minute)} falls in the ${clock(timeStart)}–${clock(timeStart + 20)} interval.`)
  ];
}

export function nameValue(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters) throw new Error('Names must contain A–Z letters for this calculation.');
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
  if (!/^[A-Za-z\s'-]+$/.test(given) || !/^[A-Za-z'-]+$/.test(surname)) throw new Error('This name calculation supports A–Z letters. Use a Latin spelling of your birth names.');
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
    const pointSum = pointYear + key;
    const pointDigitSum = sumDigits(pointSum);
    const pointNumber = cyclePoint(pointSum);
    const point = POINTS[pointNumber];
    const ageAttained = index;
    const ageCycleSum = year + ageAttained;
    const agePointDigitSum = sumDigits(ageCycleSum);
    const agePointNumber = cyclePoint(ageCycleSum);
    const agePoint = POINTS[agePointNumber];
    const houseNumber = [1,12,11,10,9,8,7,6,5,4,3,2][index % 12];
    const house = HOUSE_PASS[houseNumber];
    const rising = SIGNS[(SIGNS.indexOf(sun.sign) + index) % 12];
    const risingData = RISING[rising];
    return {
      age, year, pointYear, pointSum, pointDigitSum, pointNumber, pointName: point[0], pointText: point[1], pointTone: point[2],
      ageAttained, ageCycleSum, agePointDigitSum, agePointNumber, agePointName: agePoint[0], agePointText: agePoint[1], agePointTone: agePoint[2],
      house: houseNumber, houseText: house[1], rising, risingText: risingData.t,
      risingCaution: risingData.bad.includes(sun.sign)
    };
  });
  return {
    person: {given: person.given, surname: person.surname, place: person.place, birthDate: `${person.year}-${String(person.month).padStart(2,'0')}-${String(person.day).padStart(2,'0')}`},
    method: {morning, astroDate: `${astroDate.getUTCDate()} ${MN[astroDate.getUTCMonth()]} ${astroYear}`, sun, names, keyString, key},
    portrait: PORTRAIT[sun.sign],
    guardianAngels: guardianAngelsFor(person),
    years,
    limits: 'This symbolic reading cannot establish a death year, certain future events, or the existence of a personal guardian angel.'
  };
}
