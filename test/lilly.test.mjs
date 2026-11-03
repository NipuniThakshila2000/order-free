import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateLilly, resolveHistoricalClock, solarReturnUTC} from '../src/lilly.mjs';

// Independent Swiss Ephemeris 2.10.03 WASM fixtures (Moshier, tropical,
// geocentric, mean ecliptic / NONUT, Regiomontanus), 2000-01-01 12:00 UT,
// 51.5 N, 0.1 W. Swiss Ephemeris is used for QA only and is not shipped.
const swissPlanets={Sun:280.3727895430231,Moon:223.32764530608932,Mercury:271.89314487516725,
  Venus:241.56966819384846,Mars:327.9671831862,Jupiter:25.256900177101517,Saturn:40.39950882368168};
const swissCusps=[24.07854066014058,67.66738656014849,86.45617746647784,99.52202338093275,
  114.30451252229841,142.0545474408451,204.0785406601406,247.6673865601485,
  266.4561774664778,279.52202338093275,294.3045125222984,322.0545474408451];

test('matches independent Swiss planetary and Regiomontanus positions', () => {
  const chart=calculateLilly({year:2000,month:1,day:1,hour:12,minute:0},
    {label:'London',latitude:51.5,longitude:-0.1,timezone:'Etc/UTC'},1);
  assert.equal(chart.available,true);
  assert.equal(chart.planets.length,7);
  for (const planet of chart.planets) assert.ok(Math.abs(planet.longitude-swissPlanets[planet.name])<0.003,planet.name);
  assert.ok(Math.abs(chart.ascendant.longitude-swissCusps[0])<0.001);
  chart.cusps.forEach((cusp,index) => assert.ok(Math.abs(cusp.longitude-swissCusps[index])<0.001,`house ${index+1}`));
  assert.equal(chart.years[0].sign,'Aries');
  assert.equal(chart.years[0].ruler,'Mars');
});

test('finds the independent Swiss solar-return boundary', () => {
  // Swiss solarReturn for the above nativity: 2000-12-31 17:45:32 UT.
  const expected=Date.parse('2000-12-31T17:45:32Z');
  const actual=solarReturnUTC(swissPlanets.Sun,2001,1,1,12,0);
  assert.ok(Math.abs(actual-expected)<120000,`${new Date(actual).toISOString()}`);
});

test('historical zone rules reject nonexistent time and expose DST ambiguity', () => {
  const zone='America/New_York';
  assert.throws(() => resolveHistoricalClock({year:2024,month:3,day:10,hour:2,minute:30},zone),/did not occur/);
  const ambiguous=resolveHistoricalClock({year:2024,month:11,day:3,hour:1,minute:30},zone);
  assert.equal(ambiguous.ambiguous,true);
  assert.deepEqual(ambiguous.candidates.map((entry) => entry.minutes),[-240,-300]);
  assert.equal(resolveHistoricalClock({year:2024,month:11,day:3,hour:1,minute:30},zone,-300).minutes,-300);
});
