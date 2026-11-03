import {SIGNS, PORTRAIT, POINTS, AGE_POINTS, HOUSE_PASS, RISING, LETTER, MONTH_START, DOUBLED, MN, ANGEL_NAMES} from './source-data.mjs';
import {calculateLilly, julianRecordToGregorian} from './lilly.mjs';

const clampYear = (year) => Number.isInteger(year) && year >= 1600 && year <= new Date().getFullYear();
const sumDigits = (value) => [...String(value)].reduce((sum, digit) => sum + Number(digit), 0);
export const annualPoint = (year, key) => {
  const point = sumDigits(year + key);
  return point >= 1 && point <= 28 ? point : null;
};
export const ageCyclePoint = (year, completedAge) => ((sumDigits(year + completedAge) - 1) % 22) + 1;
const dateString = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const monthLength = (year,month,calendar) => {
  const leap=calendar === 'julian' ? year % 4 === 0 : year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][month-1];
};
const birthdayInYear = (person, year) => dateString(year, person.month, person.month === 2 && person.day === 29 && monthLength(year,2,person.calendar)<29 ? 28 : person.day);
const localClock = (now, location) => {
  const parts = location?.timezone ? Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:location.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter((part)=>part.type !== 'literal').map((part)=>[part.type,Number(part.value)])) : {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate(),hour:now.getHours(),minute:now.getMinutes()};
  return `${dateString(parts.year,parts.month,parts.day)} ${String(parts.hour).padStart(2,'0')}:${String(parts.minute).padStart(2,'0')}`;
};

export function guardianAngelsFor(person) {
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
  const certainty = person.timeCertainty || 'exact';
  const timeStart = certainty === 'exact' ? Math.floor((person.hour * 60 + person.minute) / 20) * 20 : null;
  const hourCandidates = certainty === 'hour' ? [0,1,2].map((part) => Math.floor((person.hour * 60 + part * 20) / 20) + 1) : [];
  return [
    makeAngel('Physical guardian angel', hasDateAngel ? Math.floor(dayOffset / 5) + 1 : null,
      hasDateAngel ? `Born ${date}; the five-day interval is ${formatTableDate(intervalStart)}–${formatTableDate(intervalStart + 4)}.` : `${date} has no numbered birth-date correspondence.`),
    makeAngel('Character guardian angel', hasDateAngel ? dayOffset % 72 + 1 : null,
      hasDateAngel ? `Born ${date}; day ${dayOffset + 1} from 20 March gives position ${dayOffset % 72 + 1} in the repeating 72-day cycle.` : `${date} has no numbered birth-date correspondence.`),
    {...makeAngel('Spirit guardian angel', timeStart === null ? null : Math.floor(timeStart / 20) + 1,
      certainty === 'exact' ? `Local birth time ${clock(person.hour * 60 + person.minute)} falls in the ${clock(timeStart)}–${clock(timeStart + 20)} interval.` : certainty === 'hour' ? `Only the birth hour is known. Lenain's three possible twenty-minute positions are ${hourCandidates.join(', ')}; no unique spirit guardian is assigned.` : 'Birth time is unknown; no spirit guardian is assigned.'), candidates:hourCandidates}
  ];
}

export function nameValue(name) {
  if (!/^[A-Za-z\s'-]+$/.test(name)) throw new Error('Only A–Z letters and name separators are supported.');
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
  const surname = String(input.surname || '').trim().replace(/\s+/g, ' ');
  const place = String(input.place || '').trim();
  const location = input.location && Number.isFinite(input.location.latitude) && Number.isFinite(input.location.longitude) && typeof input.location.timezone === 'string' ? input.location : null;
  const date = String(input.date || '');
  const calendar = input.calendar === 'julian' ? 'julian' : 'gregorian';
  const time = String(input.time || '');
  const timeCertainty = ['exact','hour','unknown'].includes(input.timeCertainty) ? input.timeCertainty : 'exact';
  if (!given || !surname || !date || (timeCertainty !== 'unknown' && !time)) throw new Error('Enter your full given name, family name, birth date, and available birth time.');
  if (!/^[A-Za-z\s'-]+$/.test(given) || !/^[A-Za-z\s'-]+$/.test(surname)) throw new Error('This name calculation supports A–Z letters. Use a Latin spelling of your birth names.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || (timeCertainty !== 'unknown' && !clock)) throw new Error('Enter a valid birth date and time.');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = clock ? Number(clock[1]) : null, minute = clock ? Number(clock[2]) : null;
  const actual = calendar === 'julian' ? julianRecordToGregorian({year,month,day}) : {year,month,day};
  const dateObject = new Date(Date.UTC(actual.year, actual.month - 1, actual.day));
  if (!clampYear(year) || month < 1 || month > 12 || day < 1 || day > monthLength(year,month,calendar) || hour > 23 || minute > 59 || (timeCertainty === 'hour' && minute !== 0)) throw new Error('Enter a real birth date and time.');
  if (dateObject > new Date()) throw new Error('Birth date cannot be in the future.');
  if (place.length > 120) throw new Error('Place of birth is too long.');
  return { given, surname, place, location, calendar, year, month, day, hour, minute, timeCertainty, dateObject };
}

export function calculateReading(input) {
  const person = validateInput(input);
  if (person.timeCertainty === 'unknown') {
    const currentClock = localClock(input.now instanceof Date ? input.now : new Date(),person.location);
    const years = Array.from({length:Math.min(98,2200-person.year)},(_,index)=>{
      const year=person.year+index, ageAttained=index, ageCycleSum=year+ageAttained;
      const pointNumber=ageCyclePoint(year,ageAttained), point=AGE_POINTS[pointNumber];
      const periodStart=`${birthdayInYear(person,year)} 00:00`, periodEnd=`${birthdayInYear(person,year+1)} 00:00`;
      return {year,age:index+1,ageAttained,ageCycleSum,agePointDigitSum:sumDigits(ageCycleSum),agePointNumber:pointNumber,agePointName:point[0],agePointText:point[1],agePointTone:point[2],pointNumber,pointName:point[0],pointText:point[1],pointTone:point[2],periodStart,periodEnd,isCurrent:currentClock>=periodStart&&currentClock<periodEnd,isPast:currentClock>=periodEnd,lilly:null,house:null,rising:null,risingNext:null};
    });
    return {person:{given:person.given,surname:person.surname,place:person.place,calendar:person.calendar,birthDate:dateString(person.year,person.month,person.day)},method:null,portrait:null,lilly:{available:false,reason:'Birth time is unknown; a precise Ascendant, houses, and timed chart cannot be calculated.'},guardianAngels:guardianAngelsFor(person),years,limits:'Birth time is unknown. The noon-based symbolic sign, timed astronomical chart, and a unique spirit correspondence cannot be determined. Year-plus-age points remain available.'};
  }
  const morning = person.hour < 12;
  let symbolicYear=person.year, symbolicMonth=person.month, symbolicDay=person.day;
  if (morning) {
    symbolicDay--;
    if (symbolicDay===0) {
      symbolicMonth--;
      if (symbolicMonth===0) {symbolicMonth=12;symbolicYear--;}
      symbolicDay=monthLength(symbolicYear,symbolicMonth,person.calendar);
    }
  }
  const sun = bookSun(symbolicMonth,symbolicDay);
  const names = person.given.split(' ').map((name) => ({name, value: nameValue(name)}));
  names.push({name: person.surname, value: nameValue(person.surname)});
  const keyString = names.map((item) => item.value).join('') + sun.degree + sun.signNumber;
  const key = sumDigits(keyString);
  const maxAge = Math.min(98, 2200 - person.year);
  let lilly;
  try { lilly = person.timeCertainty === 'hour' ? {available:false,reason:'Only the birth hour is known; a precise Ascendant, houses, and timed chart require the minute.'} : calculateLilly(person, person.location, maxAge, Number(input.utcOffsetMinutes)); }
  catch (problem) { lilly = {available:false,reason:`Lilly chart unavailable: ${problem.message}`}; }
  const symbolicAnniversary={month:symbolicMonth,day:symbolicDay,calendar:person.calendar};
  const now = input.now instanceof Date ? input.now : new Date();
  const currentClock = localClock(now,person.location);
  const years = Array.from({length: maxAge}, (_, index) => {
    const age = index + 1;
    const year = person.year + index;
    const pointYear = symbolicYear + index;
    const pointSum = pointYear + key;
    const pointDigitSum = sumDigits(pointSum);
    const annualPointNumber = annualPoint(pointYear, key);
    const annualPointResult = annualPointNumber === null ? ['Unsupported annual point','The supplied table does not give this annual value.','neutral'] : POINTS[annualPointNumber];
    const ageAttained = index;
    const ageCycleSum = year + ageAttained;
    const agePointDigitSum = sumDigits(ageCycleSum);
    const agePointNumber = ageCyclePoint(year, ageAttained);
    const agePoint = AGE_POINTS[agePointNumber];
    const houseNumber = [1,12,11,10,9,8,7,6,5,4,3,2][index % 12];
    const house = HOUSE_PASS[houseNumber];
    const rising = SIGNS[(SIGNS.indexOf(sun.sign) + index) % 12];
    const nextRising = SIGNS[(SIGNS.indexOf(sun.sign) + index + 1) % 12];
    // Printed degree 30 is treated as the sign boundary: the next sign begins immediately.
    const risingInitialMonths = (30 - sun.degree) * 12 / 30;
    const risingData = RISING[rising];
    const symbolicPeriodStart = `${birthdayInYear(symbolicAnniversary,pointYear)} 12:00`;
    const symbolicPeriodEnd = `${birthdayInYear(symbolicAnniversary,pointYear+1)} 12:00`;
    const periodStart = `${birthdayInYear(person,year)} 00:00`;
    const periodEnd = `${birthdayInYear(person,year+1)} 00:00`;
    return {
      age, year, pointYear, pointSum, pointDigitSum,
      annualPointNumber, annualPointName: annualPointResult[0], annualPointText: annualPointResult[1], annualPointTone: annualPointResult[2],
      pointNumber: agePointNumber, pointName: agePoint[0], pointText: agePoint[1], pointTone: agePoint[2],
      ageAttained, ageCycleSum, agePointDigitSum, agePointNumber, agePointName: agePoint[0], agePointText: agePoint[1], agePointTone: agePoint[2],
      house: houseNumber, houseText: house[1], rising, risingText: risingData.t,
      risingNext: nextRising, risingNextText: RISING[nextRising].t, risingInitialMonths, periodStart, periodEnd, symbolicPeriodStart, symbolicPeriodEnd,
      isCurrent: currentClock >= periodStart && currentClock < periodEnd, isPast: currentClock >= periodEnd,
      lilly: lilly.available ? lilly.years[index] : null,
      risingCaution: risingData.bad.includes(sun.sign), risingNextCaution: RISING[nextRising].bad.includes(sun.sign)
    };
  });
  return {
    person: {given: person.given, surname: person.surname, place: person.place, calendar:person.calendar, birthDate: dateString(person.year,person.month,person.day)},
    method: {morning, astroDate: `${symbolicDay} ${MN[symbolicMonth-1]} ${symbolicYear}`, sun, names, keyString, key},
    portrait: PORTRAIT[sun.sign],
    lilly,
    guardianAngels: guardianAngelsFor(person),
    years,
    limits: 'These symbolic methods cannot establish a death year, certain future events, or the existence of a personal guardian angel. Christ is above every sign and number.'
  };
}
