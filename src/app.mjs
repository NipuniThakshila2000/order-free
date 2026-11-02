import {calculateReading} from './reading.mjs';

const form = document.querySelector('#reading-form');
const result = document.querySelector('#result');
const error = document.querySelector('#form-error');
const select = document.querySelector('#year-select');
const fromYear = document.querySelector('#from-year');
const dateInput = form.elements.date;
const angelCards = document.querySelector('#angel-cards');
let reading;
let windowStartIndex = 0;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const todayYear = new Date().getFullYear();
const artPath = (number) => `assets/angels/angel-${String(number).padStart(2, '0')}.webp?v=3`;
const signGlyphs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const signElements = ['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water'];
const toneLabel = {bad:'Watchful', mixed:'Mixed', good:'Favourable', neutral:'Steady'};
const toneClass = (tone) => ['bad','mixed','good'].includes(tone) ? tone : 'neutral';
const recoveryDialog = document.querySelector('#recovery-dialog');
document.querySelector('#recovery-open').addEventListener('click', () => recoveryDialog.showModal());
document.querySelector('#recovery-close').addEventListener('click', () => recoveryDialog.close());
recoveryDialog.addEventListener('click', (event) => {
  if (event.target === recoveryDialog) recoveryDialog.close();
});
document.querySelector('#recovery-cta').addEventListener('click', () => {
  recoveryDialog.close();
  document.querySelector('#reading').scrollIntoView({behavior:'smooth'});
  form.elements.given.focus({preventScroll:true});
});

function updateFromYears() {
  const birthYear = Number(dateInput.value.slice(0, 4));
  const validBirthYear = birthYear >= 1600 && birthYear <= todayYear;
  const first = validBirthYear ? birthYear : todayYear - 10;
  const last = validBirthYear ? birthYear + 97 : todayYear + 10;
  const previous = Number(fromYear.value);
  const selected = previous >= first && previous <= last ? previous : Math.min(last, Math.max(first, todayYear - 1));
  fromYear.innerHTML = Array.from({length: last - first + 1}, (_, index) => {
    const year = first + index;
    return `<option value="${year}"${year === selected ? ' selected' : ''}>${year}</option>`;
  }).join('');
}
dateInput.addEventListener('change', updateFromYears);
updateFromYears();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  error.hidden = true;
  try {
    reading = calculateReading(Object.fromEntries(new FormData(form)));
    renderReading();
    result.hidden = false;
    result.scrollIntoView({behavior:'smooth'});
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  }
});

document.querySelector('#print-button').addEventListener('click', () => window.print());
select.addEventListener('change', () => showYear(Number(select.value)));

function renderReading() {
  const {person, method, portrait, years} = reading;
  document.querySelector('#result-title').textContent = `${person.given}’s appointed seasons`;
  const signIndex = method.sun.signNumber - 1;
  document.querySelector('#governance-sign').innerHTML = `
    <h4>Your governing sign</h4>
    <div class="sign-hero"><span class="sign-glyph" aria-hidden="true">${signGlyphs[signIndex]}</span><div><strong>${escapeHtml(method.sun.sign)}</strong><span>${signElements[signIndex]} · ${method.morning ? 'Morning' : 'Evening'} birth</span></div></div>
    <div class="governance-facts"><div><small>Sign of the Sun</small><strong>${escapeHtml(method.sun.sign)} ${method.sun.degree}°</strong><span>Sepharial’s fixed calendar</span></div><div><small>Astrological date</small><strong>${escapeHtml(method.astroDate)}</strong><span>${method.morning ? 'Reckoned to the previous noon' : 'Reckoned from this noon'}</span></div><div><small>Birth place</small><strong>${escapeHtml(person.place || 'Not supplied')}</strong><span>Recorded on your profile</span></div></div>
    <p class="governance-source">Source: Sepharial, chapter I</p>`;
  document.querySelector('#summary-content').innerHTML = `
    <h4>Portrait of your sign</h4>
    <p><b>Your fortunes</b> ${escapeHtml(portrait[0])}</p><p><b>Your nature</b> ${escapeHtml(portrait[1])}</p>
    <div class="birth-seal"><small>Your key number</small><strong>${method.key}</strong><span>From your birth names, ${method.sun.degree}° of ${escapeHtml(method.sun.sign)}, and sign number ${method.sun.signNumber}</span></div>
    <div class="calculation"><strong>How it was calculated</strong><span>${method.names.map((item) => `${escapeHtml(item.name)} = ${item.value}`).join(' · ')}</span><span>${escapeHtml(method.keyString)} → digit sum ${method.key}</span></div>
    <p class="governance-source">Source: Sepharial, chapters III and VII</p>`;
  select.innerHTML = years.map((year, index) => `<option value="${index}">${year.year} · age ${year.age}</option>`).join('');
  const requested = Number(fromYear.value);
  const startIndex = years.findIndex((year) => year.year >= requested);
  windowStartIndex = startIndex < 0 ? years.length - 1 : startIndex;
  showYear(windowStartIndex);
  document.querySelector('#limit-text').textContent = reading.limits;
}

function showYear(index) {
  const {years} = reading;
  if (index < 0 || index >= years.length) return;
  if (index < windowStartIndex || index >= windowStartIndex + 10) windowStartIndex = index;
  const visible = years.slice(windowStartIndex, windowStartIndex + 10);
  document.querySelector('#year-grid').innerHTML = visible.map((year) => {
    const tone = year.risingCaution ? 'bad' : toneClass(year.pointTone);
    return `<button class="year-card ${year.age === years[index].age ? 'active' : ''} ${year.year === todayYear ? 'current' : ''}" type="button" data-age="${year.age}" aria-pressed="${year.age === years[index].age}">
      <span>${year.year === todayYear ? 'CURRENT YEAR' : year.year < todayYear ? 'PAST YEAR' : 'COMING YEAR'}</span>
      <strong>${year.year}–${String(year.year + 1).slice(-2)}</strong><small>Year ${year.age} of life</small><em class="season-badge ${tone}">${toneLabel[tone]}</em>
      <span class="year-bar ${tone}" aria-hidden="true"></span><i>${escapeHtml(year.rising)} rising · Point ${year.pointNumber}</i>
    </button>`;
  }).join('');
  document.querySelectorAll('.year-card').forEach((button) => button.addEventListener('click', () => showYear(Number(button.dataset.age) - 1)));
  select.value = String(index);
  const year = years[index];
  renderAngelCards(year);
  const tone = year.risingCaution ? 'bad' : toneClass(year.pointTone);
  document.querySelector('#year-detail').innerHTML = `
    <div class="year-detail-title"><span class="section-number">${year.year}–${year.year + 1} / YEAR ${year.age} OF LIFE</span><h4>${escapeHtml(year.pointName)} <em class="season-badge ${tone}">${toneLabel[tone]}</em></h4><p>From your birthday in ${year.year} to your birthday in ${year.year + 1}</p></div>
    <div class="rising-note ${year.risingCaution ? 'watchful' : ''}"><b>${year.risingCaution ? 'A watchful passage' : 'The rising sign'}</b><span>${escapeHtml(year.rising)} rises. ${escapeHtml(year.risingText)}${year.risingCaution ? ` Sepharial marks this pairing with ${escapeHtml(reading.method.sun.sign)} as difficult.` : ''}</span></div>
    <div class="detail-grid">
      <div><small>01 / SEAL OF THE YEAR</small><h5>${year.pointYear + reading.method.key} → ${year.pointNumber}</h5><p>${escapeHtml(year.pointText)}</p><span>${year.pointYear} + key ${reading.method.key}; digit sum ${year.pointNumber}</span></div>
      <div><small>02 / YOUR SIGN'S HOUSE</small><h5>House ${year.house}</h5><p>${escapeHtml(year.houseText)}</p><span>One house of passage per year of life</span></div>
      <div><small>03 / PROCESSIONAL SIGN</small><h5>${escapeHtml(year.rising)}</h5><p>${escapeHtml(year.risingText)}</p><span>Read alongside the annual point and house.</span></div>
    </div><p class="detail-source">Source: Sepharial, <i>Kabalistic Astrology</i>, chapter XV. These are symbolic interpretations from the text, not certain events.</p>`;
}

function renderAngelCards(year) {
  const {method, portrait} = reading;
  const candidates = [
    ((method.key - 1) % 72 + 72) % 72 + 1,
    (method.sun.signNumber - 1) * 6 + Math.ceil(method.sun.degree / 5),
    ((year.pointNumber * 7 + year.age - 1) % 72) + 1
  ];
  const used = new Set();
  const numbers = candidates.map((candidate) => {
    let number = candidate;
    while (used.has(number)) number = number % 72 + 1;
    used.add(number);
    return number;
  });
  const cards = [
    {role:'Your name number', title:`Key ${method.key}`, insight:`The values of your birth names form key number ${method.key} in Sepharial’s method.`, source:'Chapter III'},
    {role:'Your birth sign', title:`${method.sun.sign} ${method.sun.degree}°`, insight:portrait[1], source:'Chapters I and VII'},
    {role:'Your selected year', title:`${year.year} · Point ${year.pointNumber}`, insight:year.pointText, source:'Chapter XV'}
  ];
  angelCards.innerHTML = cards.map((card, index) => `<article class="angel-card">
    <div class="angel-number" aria-hidden="true">${String(numbers[index]).padStart(2, '0')}</div>
    <img src="${artPath(numbers[index])}" alt="Illustrative angel portrait for ${escapeHtml(card.role.toLowerCase())}" width="720" height="1080">
    <div class="angel-card-copy"><span class="card-role"><i></i>${escapeHtml(card.role)}</span><h4>${escapeHtml(card.title)}</h4><p>${escapeHtml(card.insight)}</p><small>Reading insight: Sepharial, ${escapeHtml(card.source)}. Portrait selection is illustrative.</small></div>
  </article>`).join('');
}
