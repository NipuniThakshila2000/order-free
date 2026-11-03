import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateReading} from '../src/reading.mjs';
import {buildHierarchyMarkup, getHierarchyInfo, getHierarchySelection} from '../src/hierarchy.mjs';
import {ANGEL_QUALITIES} from '../src/angel-qualities.mjs';
import {SIGNS, TRIBES, ANGEL_NAMES} from '../src/source-data.mjs';

const example = calculateReading({given:'Anna', surname:'Smith', date:'2000-03-25', time:'00:20'});

test('pairs each selected sign with the traditional planet and supplied angel', () => {
  const cases = [
    [1, 'Aries', 'Mars', 'Uriel'],
    [4, 'Cancer', 'Moon', 'Raphael'],
    [5, 'Leo', 'Sun', 'Metatron'],
    [11, 'Aquarius', 'Saturn', 'Jegudiel']
  ];
  for (const [signNumber, sign, planet, archangel] of cases) {
    const reading = {...example, method:{...example.method, sun:{...example.method.sun, signNumber, sign}}};
    assert.deepEqual(
      (({constellation, planet, archangel}) => [constellation, planet, archangel])(getHierarchySelection(reading)),
      [sign, planet, archangel]
    );
  }
});

test('shows the full wheel and highlights angel positions, including duplicate names, by number', () => {
  const reading = {...example, guardianAngels:[{number:11, name:'Lauviah'}]};
  const {svg, roster} = buildHierarchyMarkup(reading);
  assert.equal((svg.match(/wheel-archangel /g) || []).length, 7);
  assert.equal((svg.match(/wheel-planet /g) || []).length, 7);
  assert.equal((svg.match(/wheel-constellation /g) || []).length, 12);
  assert.equal((svg.match(/wheel-angel-position /g) || []).length, 72);
  assert.equal((svg.match(/wheel-angel-position is-active/g) || []).length, 1);
  assert.equal((svg.match(/wheel-angel-position is-muted/g) || []).length, 71);
  assert.match(svg, /class="wheel-selected-name"[^>]*>Lauviah<\/text>/);
  assert.doesNotMatch(svg, /class="wheel-selected-name"[^>]*>11<\/text>/);
  assert.equal((roster.match(/role="listitem"/g) || []).length, 72);
  assert.equal((roster.match(/<button type="button" class="is-active"/g) || []).length, 1);
});

test('provides a distinct historical attribute and sphere for every angel position', () => {
  assert.equal(ANGEL_QUALITIES.length, 72);
  assert.ok(ANGEL_QUALITIES.every((entry) => entry.attribute && entry.governs));
  assert.equal(getHierarchyInfo('angel:10').title, 'Lauviah');
  assert.equal(getHierarchyInfo('angel:16').title, 'Lauviah');
  assert.notEqual(getHierarchyInfo('angel:10').body, getHierarchyInfo('angel:16').body);
  assert.equal(getHierarchyInfo('constellation:7').title, 'Manasseh');
  assert.match(getHierarchyInfo('constellation:7').subtitle, /Scorpio/);
  assert.match(getHierarchyInfo('planet:Mars').subtitle, /Uriel/);
});

test('uses all twelve camp-order tribes and retains the original wheel positions and angels', () => {
  assert.deepEqual(TRIBES.map((item) => item.tribe),['Judah','Issachar','Zebulun','Reuben','Simeon','Gad','Ephraim','Manasseh','Benjamin','Dan','Asher','Naphtali']);
  assert.deepEqual(SIGNS,['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']);
  assert.equal(ANGEL_NAMES[10],'Lauviah');
  assert.equal(ANGEL_NAMES[16],'Lauviah');
  const {svg}=buildHierarchyMarkup(example);
  assert.equal((svg.match(/class="wheel-tribe"/g)||[]).length,12);
  assert.equal((svg.match(/class="wheel-sign-name"/g)||[]).length,12);
  assert.match(svg,/Judah, corresponding tribe for Aries/);
});

test('highlights both tribes when the astronomical and symbolic Sun signs differ', () => {
  const reading={...example,lilly:{sun:{sign:'Taurus'}}};
  const {svg,roster}=buildHierarchyMarkup(reading);
  assert.equal((svg.match(/wheel-constellation is-active/g)||[]).length,2);
  assert.match(roster,/Lilly: Issachar \(Taurus\)/);
  assert.match(roster,/Sepharial: Judah \(Aries\)/);
});
