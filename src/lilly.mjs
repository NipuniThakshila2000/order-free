import {calculateChart, ephemeris, time} from 'celestine';
import {SIGNS} from './source-data.mjs';

const DAY = 86400000;
const RULERS = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const traditionalPlanets = new Set(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn']);
export function julianRecordToGregorian(person) {
  const a=Math.floor((14-person.month)/12);
  const y=person.year+4800-a;
  const m=person.month+12*a-3;
  const jdn=person.day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-32083;
  const date=new Date((jdn-2440588)*DAY);
  return {...person,year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};
}
const dateParts = (instant, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
}).formatToParts(new Date(instant)).filter((part) => part.type !== 'literal').map((part) => [part.type,Number(part.value)]));

export function offsetAtUTC(instant, zone) {
  const parts = dateParts(instant, zone);
  const localAsUTC = Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
  return (localAsUTC - Math.floor(instant / 1000) * 1000) / 60000;
}

export function resolveHistoricalClock(person, zone, requestedOffset) {
  const localAsUTC = Date.UTC(person.year,person.month-1,person.day,person.hour,person.minute);
  const offsets = new Set([-2,-1,0,1,2].map((days) => offsetAtUTC(localAsUTC + days * DAY,zone)));
  const candidates = [...offsets].map((minutes) => ({minutes,utc:localAsUTC-minutes*60000})).filter(({utc}) => {
    const actual = dateParts(utc,zone);
    return ['year','month','day','hour','minute'].every((field) => actual[field] === person[field]);
  }).sort((a,b) => a.utc-b.utc);
  if (!candidates.length) throw new Error('That local clock time did not occur in the birthplace time zone. Check the historical date and time.');
  if (candidates.length > 1 && !candidates.some((item) => item.minutes === requestedOffset)) {
    return {ambiguous:true,candidates};
  }
  return candidates.find((item) => item.minutes === requestedOffset) || candidates[0];
}

const wrap = (degrees) => ((degrees % 360) + 360) % 360;
const signed = (degrees) => ((degrees + 180) % 360 + 360) % 360 - 180;
// Lilly asks which place the profected Ascendant occupied in the radix.
// Use the natal Regiomontanus cusp intervals rather than assuming equal houses.
export function houseForLongitude(longitude, cusps) {
  for (let index=0; index<12; index++) {
    const start=cusps[index].longitude;
    const span=wrap(cusps[(index+1)%12].longitude-start);
    if (wrap(longitude-start)<span) return index+1;
  }
  return null;
}
function solarLongitude(utcMillis) {
  const date = new Date(utcMillis);
  const jd = time.toJulianDate({year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate(),hour:date.getUTCHours(),minute:date.getUTCMinutes(),second:date.getUTCSeconds()+date.getUTCMilliseconds()/1000,timezone:0});
  return ephemeris.getSunPosition(time.toTT(jd)).longitude;
}

export function solarReturnUTC(natalLongitude, year, month, day, hour, minute) {
  const estimate = Date.UTC(year,month-1,day,hour,minute);
  let low = estimate - 4*DAY, high = estimate + 4*DAY;
  if (!(signed(solarLongitude(low)-natalLongitude) < 0 && signed(solarLongitude(high)-natalLongitude) > 0)) {
    throw new Error('Could not bracket the solar return for this year.');
  }
  for (let step=0;step<32;step++) {
    const middle=(low+high)/2;
    if (signed(solarLongitude(middle)-natalLongitude) < 0) low=middle; else high=middle;
  }
  return Math.round((low+high)/2);
}

export function calculateLilly(person, location, count, requestedOffset) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || !location.timezone) {
    return {available:false,reason:'A resolved birth city and historical time zone are required for Lilly’s astronomical chart.'};
  }
  const civil=person.calendar === 'julian' ? julianRecordToGregorian(person) : person;
  const clock=resolveHistoricalClock(civil,location.timezone,requestedOffset);
  if (clock.ambiguous) return {available:false,reason:'This clock time occurred twice during a time change. Choose the historical UTC offset.',offsetCandidates:clock.candidates.map(({minutes}) => minutes)};
  const chart=calculateChart({year:civil.year,month:civil.month,day:civil.day,hour:civil.hour,minute:civil.minute,second:0,timezone:clock.minutes/60,latitude:location.latitude,longitude:location.longitude},{houseSystem:'regiomontanus',includeAsteroids:false,includeChiron:false,includeNodes:false,includeLilith:false,includeLots:false,includePatterns:false});
  const sun=chart.planets.find((planet) => planet.name === 'Sun');
  const ascendant=chart.angles.ascendant;
  const ascDegree=ascendant.longitude % 30;
  const years=Array.from({length:count},(_,index) => {
    const calendarYear=civil.year+index;
    const start=index===0 ? clock.utc : solarReturnUTC(sun.longitude,calendarYear,civil.month,civil.day,civil.hour,civil.minute);
    const end=solarReturnUTC(sun.longitude,calendarYear+1,civil.month,civil.day,civil.hour,civil.minute);
    const firstIndex=(ascendant.sign+index)%12;
    const secondIndex=(firstIndex+1)%12;
    const transition=start+(end-start)*(30-ascDegree)/30;
    const profectionLongitude=wrap(ascendant.longitude+30*index);
    return {start:new Date(start).toISOString(),end:new Date(end).toISOString(),isCurrent:Date.now()>=start && Date.now()<end,
      sign:SIGNS[firstIndex],ruler:RULERS[firstIndex],nextSign:SIGNS[secondIndex],nextRuler:RULERS[secondIndex],
      transition:new Date(transition).toISOString(),natalDegree:ascDegree,
      profectionLongitude,profectionHouse:houseForLongitude(profectionLongitude,chart.houses.cusps)};
  });
  return {available:true,source:'Celestine 0.8.0; geocentric tropical positions, Regiomontanus houses',location,utc:new Date(clock.utc).toISOString(),offsetMinutes:clock.minutes,
    calendar:person.calendar || 'gregorian',astronomicalCivilDate:`${civil.year}-${String(civil.month).padStart(2,'0')}-${String(civil.day).padStart(2,'0')}`,
    sun:{sign:sun.signName,longitude:sun.longitude,formatted:sun.formatted},ascendant:{sign:ascendant.signName,longitude:ascendant.longitude,formatted:ascendant.formatted},
    planets:chart.planets.filter((planet) => traditionalPlanets.has(planet.name)).map((planet) => ({name:planet.name,longitude:planet.longitude,formatted:planet.formatted,house:planet.house})),
    cusps:chart.houses.cusps.map((cusp) => ({house:cusp.house,longitude:cusp.longitude,formatted:cusp.formatted})),years};
}
