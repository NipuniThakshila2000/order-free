import test from 'node:test';
import assert from 'node:assert/strict';
import {initialYearIndex, renderExperienceReport, renderYearDetail} from '../src/experience-report.mjs';

test('renders a saved experience as readable sections with a current-year detail', () => {
  const record = {
    birth_name:'Grace Anderson', application_name:'Grace Anderson', birth_date:'1980-04-20',
    birth_calendar:'gregorian', birth_time:'09:15', time_certainty:'exact', birthplace:'Colombo',
    created_at:'2026-11-04T00:00:00Z',
    result:{
      method:{sun:{sign:'Aries'},astroDate:'19 April 1980'},
      lilly:{sun:{sign:'Taurus'},ascendant:{sign:'Virgo'}},
      portrait:['Aries','A historical description.'],
      guardianAngels:[{role:'Physical guardian angel',number:1,name:'Vehuiah',basis:'Born 20 April.'}],
      years:[
        {year:1980,ageAttained:0,pointNumber:1,pointName:'Magician',pointText:'First point.',pointTone:'good',isPast:true},
        {year:2026,ageAttained:46,pointNumber:2,pointName:'Wisdom',pointText:'Current point.',pointTone:'mixed',isCurrent:true,house:4,houseText:'House text.',rising:'Aries',risingNext:'Taurus',risingText:'Rising text.',lilly:{sign:'Virgo',ruler:'Mercury',profectionHouse:4,nextSign:'Libra',nextRuler:'Venus'}}
      ]
    }
  };
  const html = renderExperienceReport(record);
  assert.equal(initialYearIndex(record.result.years), 1);
  for (const text of ['Birth details','Guardian angels','The heavens at birth','Seasons, year by year','Grace Anderson','Vehuiah','Current point.','Age 0','House 4','Mercury']) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /data-report-year="1" aria-pressed="true"/);
  assert.doesNotMatch(html, /<pre>|\{\s*"result"/);
});

test('escapes saved text and handles untimed or incomplete records', () => {
  const html = renderExperienceReport({
    birth_name:'<script>alert(1)</script>', time_certainty:'unknown',
    result:{guardianAngels:[{role:'Spirit guardian angel',basis:'Unknown <time>'}],years:[]}
  });
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('Unknown &lt;time&gt;'));
  assert.ok(html.includes('No year results were saved.'));
  assert.ok(!html.includes('<script>'));
  assert.equal(initialYearIndex([]), -1);
  assert.ok(renderYearDetail({year:2026,ageAttained:0,pointNumber:1,pointName:'Start',pointText:'Text'}).includes('Age 0'));
});
