import {calculateReading} from './reading.mjs';
import {SIGNS, TRIBES} from './source-data.mjs';
import {julianRecordToGregorian} from './lilly.mjs';
import {renderCelestialHierarchy} from './hierarchy.mjs';

const form = document.querySelector('#reading-form');
const programForm = document.querySelector('#program-registration-form');
const programButton = programForm.querySelector('[type="submit"]');
const programStatus = document.querySelector('#program-form-status');
fetch('/api/register').then((response) => response.json()).then(({ready}) => {
  if (!ready) return;
  programButton.disabled = false;
  programButton.textContent = 'Register for the free program ↗';
  programStatus.textContent = '';
}).catch(() => {});
programForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (programButton.disabled || !programForm.reportValidity()) return;
  programButton.disabled = true;
  programStatus.textContent = 'Saving your registration…';
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(new FormData(programForm)))
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Registration could not be saved.');
    programForm.reset();
    programStatus.textContent = 'Your registration was received. Thank you!';
  } catch (problem) {
    programStatus.textContent = problem.message || 'Registration could not be saved. Please try again.';
  } finally {
    programButton.disabled = false;
  }
});
const result = document.querySelector('#result');
const error = document.querySelector('#form-error');
const loader = document.querySelector('#reading-loader');
const submitButton = form.querySelector('[type="submit"]');
const select = document.querySelector('#year-select');
const fromYear = document.querySelector('#from-year');
const dateInput = form.elements.date;
const birthCalendar = document.querySelector('#birth-calendar');
const timeInput = form.elements.time;
const timeHour = document.querySelector('#time-hour');
const timeCertainty = document.querySelector('#time-certainty');
const timeMinute = document.querySelector('#time-minute');
const timePeriod = document.querySelector('#time-period');
const placeInput = form.elements.place;
const locationChoice = document.querySelector('#location-choice');
const locationResult = document.querySelector('#location-result');
const offsetChoice = document.querySelector('#offset-choice');
const offsetResult = document.querySelector('#offset-result');
let locationMatches = [];
let selectedLocation = null;
let locationQuery = '';
placeInput.addEventListener('input', () => {
  selectedLocation = null;
  locationChoice.hidden = true;
  offsetChoice.hidden = true;
});
locationResult.addEventListener('change', () => {
  selectedLocation = locationMatches[Number(locationResult.value) - 1] || null;
  offsetChoice.hidden = true;
});
timeHour.insertAdjacentHTML('beforeend', Array.from({length:12}, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join(''));
timeMinute.insertAdjacentHTML('beforeend', Array.from({length:60}, (_, index) => `<option value="${String(index).padStart(2, '0')}">${String(index).padStart(2, '0')}</option>`).join(''));
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
const risingTiming = (year) => year.risingInitialMonths === 0
  ? `${year.risingNext} throughout (displayed natal degree 30 is treated as the sign boundary).`
  : `${year.rising} for about ${Number(year.risingInitialMonths.toFixed(1))} months, then ${year.risingNext} for the rest of this period.`;
const timelineTrack = document.querySelector('#timeline-track');
const timelineScroll = document.querySelector('#timeline-scroll');
const timelinePreview = document.querySelector('#timeline-preview');
let previewedMark = null;
const recoveryDialog = document.querySelector('#recovery-dialog');
document.querySelector('#recovery-open').addEventListener('click', () => recoveryDialog.showModal());
document.querySelector('#recovery-close').addEventListener('click', () => recoveryDialog.close());
recoveryDialog.addEventListener('click', (event) => {
  if (event.target === recoveryDialog) recoveryDialog.close();
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
birthCalendar.addEventListener('change', () => {
  dateInput.type = birthCalendar.value === 'julian' ? 'text' : 'date';
  dateInput.placeholder = birthCalendar.value === 'julian' ? 'YYYY-MM-DD (Old Style)' : '';
  dateInput.value = '';
  offsetResult.value = '';
  offsetChoice.hidden = true;
  updateFromYears();
});
updateFromYears();

function validateField(input) {
  const value = input.value.trim();
  let message = '';
  if (input.name === 'time' && timeCertainty.value !== 'unknown' && (!timeHour.value || (timeCertainty.value === 'exact' && !timeMinute.value) || !timePeriod.value)) message = timeCertainty.value === 'hour' ? 'Choose hour and AM or PM.' : 'Choose hour, minute, and AM or PM.';
  else if (input.name === 'time' && timeCertainty.value === 'unknown') message = '';
  else if (!value) message = 'This field is required.';
  else if (input.name === 'given' || input.name === 'surname') {
    if (!/^[A-Za-z\s'-]+$/.test(value)) message = 'Use A–Z letters, spaces, apostrophes, or hyphens.';
    else if (!/[A-Za-z]/.test(value)) message = 'Enter at least one letter.';
  } else if (input.name === 'date') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) message = 'Use a date in YYYY-MM-DD form.';
    else {
      const year=Number(parts[1]),month=Number(parts[2]),day=Number(parts[3]);
      const leap=birthCalendar.value === 'julian' ? year%4===0 : year%4===0 && (year%100!==0 || year%400===0);
      const monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
      const actual=birthCalendar.value === 'julian' ? julianRecordToGregorian({year,month,day}) : {year,month,day};
      const date=new Date(Date.UTC(actual.year,actual.month-1,actual.day));
      if (year<1600 || year>todayYear || month<1 || month>12 || day<1 || day>monthDays[month-1] || date>new Date()) message='Choose a real birth-record date from 1600 through today.';
    }
  } else if (input.name === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    message = 'Enter a valid local birth time.';
  }
  const note = document.querySelector(`#${input.name}-validation`);
  note.textContent = message || `${input.name === 'date' ? 'Date' : input.name === 'time' ? 'Time' : 'Name'} looks correct.`;
  note.classList.toggle('is-invalid', Boolean(message));
  note.classList.toggle('is-valid', !message);
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (input.name === 'time') [timeHour, timeMinute, timePeriod].forEach((control) => control.setAttribute('aria-invalid', String(Boolean(message))));
  return !message;
}
const validatedInputs = ['given', 'surname', 'date', 'time'].map((name) => form.elements[name]);
validatedInputs.filter((input) => input.name !== 'time').forEach((input) => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => validateField(input));
  input.addEventListener('change', () => validateField(input));
});
function updateTime() {
  timeHour.disabled = timeCertainty.value === 'unknown';
  timeMinute.disabled = timeCertainty.value !== 'exact';
  timePeriod.disabled = timeCertainty.value === 'unknown';
  if (timeHour.value && (timeMinute.value || timeCertainty.value === 'hour') && timePeriod.value && timeCertainty.value !== 'unknown') {
    const hour = Number(timeHour.value) % 12 + (timePeriod.value === 'PM' ? 12 : 0);
    timeInput.value = `${String(hour).padStart(2, '0')}:${timeCertainty.value === 'hour' ? '00' : timeMinute.value}`;
  } else timeInput.value = '';
  validateField(timeInput);
}
[timeHour, timeMinute, timePeriod].forEach((control) => control.addEventListener('change', updateTime));
timeCertainty.addEventListener('change', updateTime);
updateTime();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  error.hidden = true;
  const invalidInput = validatedInputs.filter((input) => !validateField(input))[0];
  if (invalidInput) {
    (invalidInput.name === 'time' ? [timeHour, timeMinute, timePeriod].find((control) => !control.disabled && !control.value) || timeCertainty : invalidInput).focus();
    return;
  }
  try {
    const place = placeInput.value.trim();
    if (place && timeCertainty.value === 'exact' && (!selectedLocation || place !== locationQuery)) {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(place)}`);
      if (!response.ok) throw new Error('Birthplace lookup is unavailable. Try again, or leave the place blank for a symbolic reading only.');
      locationMatches = (await response.json()).results || [];
      locationQuery = place;
      if (!locationMatches.length) throw new Error('No matching birthplace was found. Add a country or region, then try again.');
      if (locationMatches.length === 1) selectedLocation = locationMatches[0];
      else {
        locationResult.innerHTML = '<option value="">Choose a city</option>' + locationMatches.map((item,index) => `<option value="${index+1}">${escapeHtml(item.label)}</option>`).join('');
        locationChoice.hidden = false;
        locationResult.focus();
        throw new Error('Choose the matching birthplace, then reveal your reading.');
      }
    }
    if (place && timeCertainty.value === 'exact' && !selectedLocation) throw new Error('Choose the matching birthplace.');
    reading = calculateReading({...Object.fromEntries(new FormData(form)),location:selectedLocation,utcOffsetMinutes:offsetResult.value === '' ? undefined : Number(offsetResult.value)});
    if (reading.lilly.offsetCandidates && offsetResult.value === '') {
      offsetResult.innerHTML = '<option value="">Choose the offset used at birth</option>' + reading.lilly.offsetCandidates.map((minutes) => `<option value="${minutes}">UTC ${minutes < 0 ? '−' : '+'}${Math.floor(Math.abs(minutes)/60)}:${String(Math.round(Math.abs(minutes)%60)).padStart(2,'0')}</option>`).join('');
      offsetChoice.hidden = false;
      offsetResult.focus();
      throw new Error('Choose which historical clock offset applied at birth.');
    }
    loader.hidden = false;
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await new Promise((resolve) => setTimeout(resolve, 550));
    }
    renderReading();
    result.hidden = false;
    requestAnimationFrame(() => centerTimelineMark(Number(select.value)));
    result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  } finally {
    loader.hidden = true;
    form.removeAttribute('aria-busy');
    submitButton.disabled = false;
  }
});

document.querySelector('#print-button').addEventListener('click', () => window.print());
select.addEventListener('change', () => showYear(Number(select.value)));

function hideTimelinePreview() {
  timelinePreview.hidden = true;
  previewedMark?.removeAttribute('aria-describedby');
  previewedMark = null;
}

function showTimelinePreview(mark) {
  if (!reading || !mark) return;
  const year = reading.years[Number(mark.dataset.index)];
  if (!year) return;
  if (previewedMark !== mark) hideTimelinePreview();
  previewedMark = mark;
  const tone = toneClass(year.pointTone);
  timelinePreview.innerHTML = `<small>COMPLETED AGE ${year.ageAttained} · YEAR ${year.age} OF LIFE</small><strong>${escapeHtml(year.pointName)}</strong><span class="season-badge ${tone}">${toneLabel[tone]}</span><p>${escapeHtml(year.pointText)}</p><em>${year.periodStart} to ${year.periodEnd} · Select for details</em>`;
  timelinePreview.hidden = false;
  mark.setAttribute('aria-describedby', 'timeline-preview');
  const markBox = mark.getBoundingClientRect();
  const previewBox = timelinePreview.getBoundingClientRect();
  const left = Math.max(12, Math.min(window.innerWidth - previewBox.width - 12, markBox.left + markBox.width / 2 - previewBox.width / 2));
  const above = markBox.top - previewBox.height - 12;
  timelinePreview.style.left = `${left}px`;
  timelinePreview.style.top = `${above >= 12 ? above : Math.min(window.innerHeight - previewBox.height - 12, markBox.bottom + 12)}px`;
}

timelineTrack.addEventListener('mouseover', (event) => {
  const mark = event.target.closest('.timeline-mark');
  if (mark && mark !== previewedMark) showTimelinePreview(mark);
});
timelineTrack.addEventListener('mouseleave', hideTimelinePreview);
timelineTrack.addEventListener('focusin', (event) => {
  const mark = event.target.closest('.timeline-mark');
  if (mark) showTimelinePreview(mark);
});
timelineTrack.addEventListener('focusout', (event) => {
  if (!timelineTrack.contains(event.relatedTarget)) hideTimelinePreview();
});
timelineTrack.addEventListener('click', (event) => {
  const mark = event.target.closest('.timeline-mark');
  if (!mark) return;
  hideTimelinePreview();
  showYear(Number(mark.dataset.index));
  document.querySelector('#year-detail').scrollIntoView({behavior:'smooth', block:'start'});
});
timelineScroll.addEventListener('scroll', hideTimelinePreview, {passive:true});
window.addEventListener('resize', hideTimelinePreview);

function renderTimeline(years) {
  hideTimelinePreview();
  timelineTrack.style.setProperty('--year-count', years.length);
  const marks = years.map((year, index) => {
    const tone = toneClass(year.pointTone);
    return `<button type="button" class="timeline-mark ${tone}" data-index="${index}" aria-label="Completed age ${year.ageAttained}, year ${year.age} of life, ${year.periodStart} to ${year.periodEnd}, ${escapeHtml(year.pointName)}, ${toneLabel[tone]}"><span aria-hidden="true"></span></button>`;
  }).join('');
  const labels = years.map((year, index) => (index === 0 || year.age % 10 === 0 || index === years.length - 1)
    ? `<span style="grid-column:${index + 1}">${year.age}</span>` : '').join('');
  timelineTrack.innerHTML = `<div class="timeline-marks" aria-label="Years of life">${marks}</div><div class="timeline-axis" aria-hidden="true">${labels}</div>`;
}

function centerTimelineMark(index) {
  const mark = timelineTrack.querySelector(`.timeline-mark[data-index="${index}"]`);
  if (!mark) return;
  const markLeft = mark.getBoundingClientRect().left - timelineScroll.getBoundingClientRect().left + timelineScroll.scrollLeft;
  timelineScroll.scrollLeft = Math.max(0, markLeft - (timelineScroll.clientWidth - mark.clientWidth) / 2);
}

function renderReading() {
  const {person, method, portrait, years, lilly} = reading;
  document.querySelector('#result-title').textContent = `${person.given}’s appointed seasons`;
  if (!method) {
    renderCelestialHierarchy(reading);
    renderGuardianAngels();
    document.querySelector('#governance-sign').innerHTML = `<h4>Birth Sun sign unavailable</h4><p>Without a birth time, Sepharial’s noon boundary cannot choose the symbolic date. Lilly’s timed chart also requires a precise clock time and a resolved birthplace.</p>`;
    document.querySelector('#summary-content').innerHTML = '<h4>Numerical key unavailable</h4><p>The key depends on Sepharial’s symbolic solar degree, which cannot be selected without a birth time.</p>';
    select.innerHTML = '';
    timelineTrack.innerHTML = '';
    document.querySelector('#year-grid').innerHTML = '';
    document.querySelector('#year-detail').innerHTML = '<p>Annual and age-cycle results are unavailable until the symbolic birth date can be established.</p>';
    document.querySelector('#timeline-selected').textContent = 'Time needed';
    document.querySelector('#limit-text').textContent = reading.limits;
    return;
  }
  renderCelestialHierarchy(reading);
  const signIndex = method.sun.signNumber - 1;
  const signAgreement = lilly.available && lilly.sun.sign === method.sun.sign;
  const symbolicTribe = TRIBES[signIndex];
  const astronomicalTribe = lilly.available ? TRIBES[SIGNS.indexOf(lilly.sun.sign)] : null;
  const signDisplay = lilly.available && !signAgreement
    ? `<span>Lilly: ${escapeHtml(lilly.sun.sign)} · astronomical</span><span>Sepharial: ${escapeHtml(method.sun.sign)} · symbolic</span>`
    : `<strong>${escapeHtml(method.sun.sign)}</strong><span>${signAgreement ? 'Lilly and Sepharial agree on the sign' : 'Sepharial symbolic sign'}</span>`;
  const tribeDisplay = lilly.available && !signAgreement
    ? `<div class="tribe-answer" aria-label="Tribal correspondence — camp-order tradition"><small>Tribal correspondence — camp-order tradition</small><p>Lilly: <strong>${escapeHtml(astronomicalTribe.tribe)}</strong> <span>(${escapeHtml(lilly.sun.sign)} · ${escapeHtml(astronomicalTribe.month)})</span></p><p>Sepharial: <strong>${escapeHtml(symbolicTribe.tribe)}</strong> <span>(${escapeHtml(method.sun.sign)} · ${escapeHtml(symbolicTribe.month)})</span></p></div>`
    : `<div class="tribe-answer" aria-label="Tribal correspondence — camp-order tradition: ${escapeHtml(symbolicTribe.tribe)} for ${escapeHtml(method.sun.sign)}"><small>Tribal correspondence — camp-order tradition</small><strong>${escapeHtml(symbolicTribe.tribe)}</strong><span>${escapeHtml(method.sun.sign)} · ${escapeHtml(symbolicTribe.month)}${lilly.available ? ' · Lilly and Sepharial agree' : ' · Sepharial symbolic sign'}</span></div>`;
  const chartPositions = lilly.available ? `<div class="lilly-positions"><b>Lilly · actual birth chart</b><p>Calculated at ${escapeHtml(lilly.utc)} UTC for ${escapeHtml(lilly.location.label || person.place)} (${lilly.location.latitude.toFixed(3)}°, ${lilly.location.longitude.toFixed(3)}°), historical clock offset ${Number((lilly.offsetMinutes/60).toFixed(4))} hours. Regiomontanus houses.</p><div class="lilly-position-list">${lilly.planets.map((planet) => `<span>${escapeHtml(planet.name)} · ${escapeHtml(planet.formatted)} · house ${planet.house}</span>`).join('')}${lilly.cusps.map((cusp) => `<span>House ${cusp.house} · ${escapeHtml(cusp.formatted)}</span>`).join('')}</div></div>` : `<p class="reading-citation"><strong>Lilly chart unavailable:</strong> ${escapeHtml(lilly.reason)} Sepharial’s symbolic result is shown on its own.</p>`;
  document.querySelector('#governance-sign').innerHTML = `
    <h4>Your birth Sun sign</h4>
    <div class="sign-hero"><span class="sign-glyph" aria-hidden="true">${signGlyphs[signIndex]}</span><div>${signDisplay}</div></div>
    ${tribeDisplay}
    <div class="governance-facts"><div><small>Sepharial's symbolic Sun</small><strong>${escapeHtml(method.sun.sign)} ${method.sun.degree}°</strong><span>Fixed symbolic calendar; not an astronomical position</span></div>${lilly.available ? `<div><small>Lilly's astronomical Sun</small><strong>${escapeHtml(lilly.sun.formatted)}</strong><span>Actual civil date and clock time</span></div><div><small>Lilly's Ascendant</small><strong>${escapeHtml(lilly.ascendant.formatted)}</strong><span>Regiomontanus first house</span></div>` : ''}<div><small>Symbolic calculation date</small><strong>${escapeHtml(method.astroDate)}</strong><span>${method.morning ? 'Reckoned to the previous noon' : 'Reckoned from this noon'}</span></div><div><small>Birth place</small><strong>${escapeHtml(person.place || 'Not supplied')}</strong><span>${lilly.available ? 'Used for Lilly’s coordinates and historical clock time' : 'No astronomical result inferred'}</span></div></div>${chartPositions}`;
  document.querySelector('#summary-content').innerHTML = `
    <h4>Portrait of your sign</h4>
    <p><b>Your fortunes</b> ${escapeHtml(portrait[0])}</p><p><b>Your nature</b> ${escapeHtml(portrait[1])}</p>
    <div class="birth-seal"><small>Your key number</small><strong>${method.key}</strong><span>From your birth names, ${method.sun.degree}° of ${escapeHtml(method.sun.sign)}, and sign number ${method.sun.signNumber}</span></div>
    <div class="calculation"><strong>How it was calculated</strong><span>${method.names.map((item) => `${escapeHtml(item.name)} = ${item.value}`).join(' · ')}</span><span>${escapeHtml(method.keyString)} → digit sum ${method.key}</span></div>`;
  select.innerHTML = years.map((year, index) => `<option value="${index}">${year.year} · year ${year.age} of life (age ${year.ageAttained})</option>`).join('');
  const requested = Number(fromYear.value);
  const startIndex = years.findIndex((year) => year.year >= requested);
  windowStartIndex = startIndex < 0 ? years.length - 1 : startIndex;
  renderGuardianAngels();
  renderTimeline(years);
  showYear(windowStartIndex);
  document.querySelector('#limit-text').textContent = reading.limits;
}

function showYear(index) {
  const {years} = reading;
  if (index < 0 || index >= years.length) return;
  if (index < windowStartIndex || index >= windowStartIndex + 10) windowStartIndex = index;
  const visible = years.slice(windowStartIndex, windowStartIndex + 10);
  document.querySelector('#year-grid').innerHTML = visible.map((year) => {
    const tone = toneClass(year.pointTone);
    const currentLabel = year.lilly && year.lilly.isCurrent !== year.isCurrent ? year.lilly.isCurrent ? 'CURRENT · LILLY' : 'CURRENT · SEPHARIAL' : year.isCurrent ? 'CURRENT PERIOD' : year.isPast ? 'PAST PERIOD' : 'COMING PERIOD';
    return `<button class="year-card ${year.age === years[index].age ? 'active' : ''} ${year.isCurrent || year.lilly?.isCurrent ? 'current' : ''}" type="button" data-age="${year.age}" aria-pressed="${year.age === years[index].age}">
      <span>${currentLabel}</span>
      <strong>${year.year}–${String(year.year + 1).slice(-2)}</strong><small>Year ${year.age} of life · age ${year.ageAttained}</small><em class="season-badge ${tone}">${toneLabel[tone]}</em>
      <span class="year-bar ${tone}" aria-hidden="true"></span><i>${escapeHtml(year.risingInitialMonths === 0 ? year.risingNext : year.rising)} symbolic · Point ${year.pointNumber ?? 'unassigned'}</i>
    </button>`;
  }).join('');
  document.querySelectorAll('.year-card').forEach((button) => button.addEventListener('click', () => showYear(Number(button.dataset.age) - 1)));
  select.value = String(index);
  const year = years[index];
  const tone = toneClass(year.pointTone);
  const lillyPeriod = year.lilly ? `<p>Lilly: ${escapeHtml(year.lilly.start)} to ${escapeHtml(year.lilly.end)} (solar returns; end exclusive).</p>` : '';
  const startingSign = year.risingInitialMonths === 0 ? year.risingNext : year.rising;
  const signComparison = year.lilly ? year.lilly.sign === startingSign ? `Both methods begin in ${escapeHtml(startingSign)}; their timing and meaning remain separate.` : `Lilly: ${escapeHtml(year.lilly.sign)}. Sepharial: ${escapeHtml(startingSign)}.` : `Sepharial: ${escapeHtml(startingSign)}. Lilly’s timed result is unavailable.`;
  const lillyTiming = year.lilly ? `<span>Lilly: natal Ascendant ${year.lilly.natalDegree.toFixed(2)}° advances from ${escapeHtml(year.lilly.sign)} (ruler ${escapeHtml(year.lilly.ruler)}) to ${escapeHtml(year.lilly.nextSign)} (ruler ${escapeHtml(year.lilly.nextRuler)}) at ${escapeHtml(year.lilly.transition)}.</span>` : '';
  timelineTrack.querySelector('.timeline-mark.active')?.classList.remove('active');
  const activeMark = timelineTrack.querySelector(`.timeline-mark[data-index="${index}"]`);
  if (activeMark) {
    activeMark.classList.add('active');
    if (!result.hidden) centerTimelineMark(index);
  }
  document.querySelector('#timeline-selected').textContent = `Age ${year.ageAttained} · year ${year.age} of life`;
  document.querySelector('#year-detail').innerHTML = `
    <div class="year-detail-title"><div class="year-detail-topline"><span class="section-number">${year.year}–${year.year + 1} / YEAR ${year.age} OF LIFE · COMPLETED AGE ${year.ageAttained}</span><a class="button button-gold year-change-cta" href="https://order.wowlife.lk/" target="_blank" rel="noopener noreferrer">What can I do about this? <span aria-hidden="true">↗</span></a></div><h4>${escapeHtml(year.pointName)} <em class="season-badge ${tone}">${toneLabel[tone]}</em></h4><p>Sepharial: ${year.periodStart} to ${year.periodEnd} (birthday period; end exclusive).</p>${lillyPeriod}</div>
    <div class="rising-note ${year.risingCaution || year.risingNextCaution ? 'watchful' : ''}"><b>${signComparison}</b>${lillyTiming}<span>Sepharial: ${escapeHtml(risingTiming(year))} ${escapeHtml(year.rising)}: ${escapeHtml(year.risingText)} ${escapeHtml(year.risingNext)}: ${escapeHtml(year.risingNextText)}${year.risingCaution || year.risingNextCaution ? ` A caution applies to ${[year.risingCaution ? year.rising : null,year.risingNextCaution ? year.risingNext : null].filter(Boolean).join(' and ')} in relation to ${escapeHtml(reading.method.sun.sign)}; it does not change the annual point's rating.` : ''}</span></div>
    <div class="detail-grid">
      <div><small>01 / SEPHARIAL ANNUAL POINT</small><h5>${year.pointSum} → ${year.pointNumber ?? 'unsupported'}</h5><p>${escapeHtml(year.pointText)}</p><span>${year.pointYear} + key ${reading.method.key} = ${year.pointSum}; digit sum ${year.pointDigitSum}. Annual points 23–28 remain distinct.</span></div>
      <div><small>02 / YOUR SIGN'S HOUSE</small><h5>House ${year.house}</h5><p>${escapeHtml(year.houseText)}</p><span>One house of passage per year of life</span></div>
      <div><small>03 / PROCESSIONAL SIGN</small><h5>${escapeHtml(year.rising)} → ${escapeHtml(year.risingNext)}</h5><p>${escapeHtml(risingTiming(year))}</p><span>Symbolic timing; read alongside the annual point and house.</span></div>
    </div>
    <div class="age-cycle-note"><b>Sepharial's separate age-cycle · ${escapeHtml(year.agePointName)}</b><span>${year.year} + completed age ${year.ageAttained} = ${year.ageCycleSum}; digit sum ${year.agePointDigitSum}${year.agePointDigitSum > 22 ? `, wrapped to point ${year.agePointNumber}` : `, point ${year.agePointNumber}`}.</span><p>${escapeHtml(year.agePointText)}</p></div>`;
}

function renderGuardianAngels() {
  angelCards.innerHTML = reading.guardianAngels.map((angel) => `<article class="angel-card">
    ${angel.number ? `<div class="angel-name">${escapeHtml(angel.name)}</div><img src="${artPath(angel.number)}" alt="Illustrative artwork paired with ${escapeHtml(angel.name)}" width="720" height="1080">` : '<div class="angel-unassigned" aria-hidden="true">No date assignment</div>'}
    <div class="angel-card-copy"><span class="card-role"><i></i>${escapeHtml(angel.role)}</span><h4>${escapeHtml(angel.name || 'No date assignment')}</h4><p>${escapeHtml(angel.basis)}</p><small>The portrait is illustrative.</small></div>
  </article>`).join('');
}
