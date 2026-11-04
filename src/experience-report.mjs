const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]
));

const show = (value, fallback = 'Not available') => escapeHtml(value === null || value === undefined || value === '' ? fallback : value);
const tones = {good:'Favourable', mixed:'Mixed', bad:'Watchful', neutral:'Steady'};

function dateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function fact(label, value) {
  return `<div><dt>${label}</dt><dd>${show(value)}</dd></div>`;
}

export function initialYearIndex(years) {
  if (!years?.length) return -1;
  const current = years.findIndex((year) => year.isCurrent);
  if (current >= 0) return current;
  const next = years.findIndex((year) => !year.isPast);
  return next >= 0 ? next : years.length - 1;
}

export function renderYearDetail(year) {
  if (!year) return '<p>No year results were saved.</p>';
  const tone = tones[year.pointTone] || tones.neutral;
  const status = year.isCurrent ? 'Current year' : year.isPast ? 'Past year' : 'Coming year';
  const lilly = year.lilly;
  return `
    <div class="report-year-title">
      <span>${show(status)} · ${show(year.year)} · Age ${show(year.ageAttained)} · Point ${show(year.pointNumber)}</span>
      <h5>${show(year.pointName)} <em class="report-tone">${tone}</em></h5>
    </div>
    <div class="report-methods">
      <section><small>01 / YEAR-PLUS-AGE POINT</small><h6>Point ${show(year.pointNumber)}</h6><p>${show(year.pointText)}</p></section>
      <section><small>02 / SEPHARIAL'S HOUSE CORRESPONDENCE</small><h6>${year.house ? `House ${show(year.house)}` : 'Birth time needed'}</h6><p>${year.house ? show(year.houseText) : 'This correspondence requires a birth time.'}</p></section>
      <section><small>03 / SEPHARIAL'S RISING SEQUENCE</small><h6>${year.rising ? `${show(year.rising)} → ${show(year.risingNext)}` : 'Birth time needed'}</h6><p>${year.rising ? show(year.risingText) : 'This sequence requires a birth time.'}</p></section>
    </div>
    <div class="report-lilly"><small>WILLIAM LILLY · ANNUAL PROFECTION</small>
      ${lilly ? `<h6>${show(lilly.sign)} · ${show(lilly.ruler)} · natal house ${show(lilly.profectionHouse)}</h6><p>The profection then enters ${show(lilly.nextSign)}, ruled by ${show(lilly.nextRuler)}, within this annual period.</p>` : '<p>A resolved birth place and exact birth time are needed for this calculation.</p>'}
    </div>`;
}

export function renderExperienceReport(record) {
  const result = record?.result || {};
  const input = record?.input || {};
  const years = Array.isArray(result.years) ? result.years : [];
  const angels = Array.isArray(result.guardianAngels) ? result.guardianAngels : [];
  const current = initialYearIndex(years);
  const symbolicSign = result.method?.sun?.sign || record.symbolic_sun_sign;
  const astronomicalSign = result.lilly?.sun?.sign || record.astronomical_sun_sign;
  const portrait = Array.isArray(result.portrait) ? result.portrait[1] : '';
  const birthTime = record.time_certainty === 'unknown' ? 'Unknown' : record.time_certainty === 'hour'
    ? `${record.birth_time || input.time || 'Hour supplied'} (hour only)`
    : record.birth_time || input.time || 'Not supplied';
  return `
    <article class="experience-report">
      <header class="report-heading"><span>REDEEMING THE SEASONS · SAVED REPORT</span><h3>${show(record.birth_name)}</h3><p>Saved ${show(dateTime(record.created_at))} · Applicant: ${show(record.application_name)}</p></header>
      <section class="report-section" aria-labelledby="report-birth-title"><h4 id="report-birth-title">Birth details</h4>
        <dl class="report-facts">
          ${fact('Birth date', record.birth_date)}
          ${fact('Calendar', record.birth_calendar)}
          ${fact('Birth time', birthTime)}
          ${fact('Birth place', record.birthplace)}
        </dl>
      </section>
      <section class="report-section" aria-labelledby="report-angels-title"><div class="report-section-heading"><span>I</span><h4 id="report-angels-title">Guardian angels</h4></div>
        <div class="report-angels">${angels.length ? angels.map((angel) => {
          const number = Number(angel.number);
          const artwork = Number.isInteger(number) && number >= 1 && number <= 72
            ? `<img src="assets/angels/angel-${String(number).padStart(2, '0')}.webp?v=3" alt="" loading="lazy">` : '';
          return `<article class="report-angel">${artwork}<div><small>${show(angel.role)}</small><h5>${show(angel.name, 'No unique assignment')}</h5><p>${show(angel.basis)}</p></div></article>`;
        }).join('') : '<p>No guardian angel results were saved.</p>'}</div>
      </section>
      <section class="report-section" aria-labelledby="report-heavens-title"><div class="report-section-heading"><span>II</span><h4 id="report-heavens-title">The heavens at birth</h4></div>
        <dl class="report-facts">
          ${fact('Sepharial symbolic Sun', symbolicSign)}
          ${fact('Lilly astronomical Sun', astronomicalSign)}
          ${fact('Lilly Ascendant', result.lilly?.ascendant?.sign)}
          ${fact('Symbolic calculation date', result.method?.astroDate)}
        </dl>
        ${portrait ? `<div class="report-portrait"><h5>Historical sign portrait</h5><p>${escapeHtml(portrait)}</p></div>` : ''}
        ${result.lilly?.reason ? `<p class="report-note">${escapeHtml(result.lilly.reason)}</p>` : ''}
      </section>
      <section class="report-section" aria-labelledby="report-seasons-title"><div class="report-section-heading"><span>III</span><h4 id="report-seasons-title">Seasons, year by year</h4></div>
        <p>Select a year to read its saved results.</p>
        <div class="report-year-list" aria-label="Saved years">${years.map((year, index) => `<button type="button" data-report-year="${index}" aria-pressed="${index === current}" class="${index === current ? 'active' : ''}"><small>${show(year.year)}</small><strong>Age ${show(year.ageAttained)}</strong></button>`).join('')}</div>
        <div id="generated-year-detail" class="report-year-detail">${renderYearDetail(years[current])}</div>
      </section>
      ${result.limits ? `<p class="report-limit">${escapeHtml(result.limits)}</p>` : ''}
    </article>`;
}
