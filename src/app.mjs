import {calculateReading} from './reading.mjs';
import {renderCelestialHierarchy} from './hierarchy.mjs';

const form = document.querySelector('#reading-form');
const programForm = document.querySelector('#program-registration-form');
programForm.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#program-form-status').textContent = 'Registration is being set up. Your details have not been sent.';
});
const result = document.querySelector('#result');
const error = document.querySelector('#form-error');
const loader = document.querySelector('#reading-loader');
const submitButton = form.querySelector('[type="submit"]');
const select = document.querySelector('#year-select');
const fromYear = document.querySelector('#from-year');
const dateInput = form.elements.date;
const timeInput = form.elements.time;
const timeHour = document.querySelector('#time-hour');
const timeMinute = document.querySelector('#time-minute');
const timePeriod = document.querySelector('#time-period');
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
updateFromYears();

function validateField(input) {
  const value = input.value.trim();
  let message = '';
  if (input.name === 'time' && (!timeHour.value || !timeMinute.value || !timePeriod.value)) message = 'Choose hour, minute, and AM or PM.';
  else if (!value) message = 'This field is required.';
  else if (input.name === 'given' || input.name === 'surname') {
    if (!/^[A-Za-z\s'-]+$/.test(value)) message = 'Use A–Z letters, spaces, apostrophes, or hyphens.';
    else if (!/[A-Za-z]/.test(value)) message = 'Enter at least one letter.';
  } else if (input.name === 'date') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = parts && new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
    if (!parts || Number(parts[1]) < 1600 || date.getUTCFullYear() !== Number(parts[1]) || date.getUTCMonth() !== Number(parts[2]) - 1 || date.getUTCDate() !== Number(parts[3]) || date > new Date()) message = 'Choose a real date from 1600 through today.';
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
  if (timeHour.value && timeMinute.value && timePeriod.value) {
    const hour = Number(timeHour.value) % 12 + (timePeriod.value === 'PM' ? 12 : 0);
    timeInput.value = `${String(hour).padStart(2, '0')}:${timeMinute.value}`;
  } else timeInput.value = '';
  validateField(timeInput);
}
[timeHour, timeMinute, timePeriod].forEach((control) => control.addEventListener('change', updateTime));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  error.hidden = true;
  const invalidInput = validatedInputs.filter((input) => !validateField(input))[0];
  if (invalidInput) {
    (invalidInput.name === 'time' ? [timeHour, timeMinute, timePeriod].find((control) => !control.value) || timeHour : invalidInput).focus();
    return;
  }
  try {
    reading = calculateReading(Object.fromEntries(new FormData(form)));
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
  const tone = year.risingCaution ? 'bad' : toneClass(year.pointTone);
  timelinePreview.innerHTML = `<small>AGE ${year.age} · ${year.year}–${year.year + 1}</small><strong>${escapeHtml(year.pointName)}</strong><span class="season-badge ${tone}">${toneLabel[tone]}</span><p>${escapeHtml(year.pointText)}</p><em>Select to open this year's reading</em>`;
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
    const tone = year.risingCaution ? 'bad' : toneClass(year.pointTone);
    return `<button type="button" class="timeline-mark ${tone}" data-index="${index}" aria-label="Age ${year.age}, ${year.year} to ${year.year + 1}, ${escapeHtml(year.pointName)}, ${toneLabel[tone]}"><span aria-hidden="true"></span></button>`;
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
  const {person, method, portrait, years} = reading;
  document.querySelector('#result-title').textContent = `${person.given}’s appointed seasons`;
  renderCelestialHierarchy(reading);
  const signIndex = method.sun.signNumber - 1;
  document.querySelector('#governance-sign').innerHTML = `
    <h4>Your governing sign</h4>
    <div class="sign-hero"><span class="sign-glyph" aria-hidden="true">${signGlyphs[signIndex]}</span><div><strong>${escapeHtml(method.sun.sign)}</strong><span>${signElements[signIndex]} · ${method.morning ? 'Morning' : 'Evening'} birth</span></div></div>
    <div class="governance-facts"><div><small>Sign of the Sun</small><strong>${escapeHtml(method.sun.sign)} ${method.sun.degree}°</strong><span>The reading’s calendar</span></div><div><small>Calculation date</small><strong>${escapeHtml(method.astroDate)}</strong><span>${method.morning ? 'Reckoned to the previous noon' : 'Reckoned from this noon'}</span></div><div><small>Birth place</small><strong>${escapeHtml(person.place || 'Not supplied')}</strong><span>Recorded on your profile</span></div></div>`;
  document.querySelector('#summary-content').innerHTML = `
    <h4>Portrait of your sign</h4>
    <p><b>Your fortunes</b> ${escapeHtml(portrait[0])}</p><p><b>Your nature</b> ${escapeHtml(portrait[1])}</p>
    <div class="birth-seal"><small>Your key number</small><strong>${method.key}</strong><span>From your birth names, ${method.sun.degree}° of ${escapeHtml(method.sun.sign)}, and sign number ${method.sun.signNumber}</span></div>
    <div class="calculation"><strong>How it was calculated</strong><span>${method.names.map((item) => `${escapeHtml(item.name)} = ${item.value}`).join(' · ')}</span><span>${escapeHtml(method.keyString)} → digit sum ${method.key}</span></div>`;
  select.innerHTML = years.map((year, index) => `<option value="${index}">${year.year} · age ${year.age}</option>`).join('');
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
  const tone = year.risingCaution ? 'bad' : toneClass(year.pointTone);
  timelineTrack.querySelector('.timeline-mark.active')?.classList.remove('active');
  const activeMark = timelineTrack.querySelector(`.timeline-mark[data-index="${index}"]`);
  if (activeMark) {
    activeMark.classList.add('active');
    if (!result.hidden) centerTimelineMark(index);
  }
  document.querySelector('#timeline-selected').textContent = `Age ${year.age} · ${year.year}–${year.year + 1}`;
  document.querySelector('#year-detail').innerHTML = `
    <div class="year-detail-title"><div class="year-detail-topline"><span class="section-number">${year.year}–${year.year + 1} / YEAR ${year.age} OF LIFE</span><a class="button button-gold year-change-cta" href="https://order.wowlife.lk/" target="_blank" rel="noopener noreferrer">What can I do about this? <span aria-hidden="true">↗</span></a></div><h4>${escapeHtml(year.pointName)} <em class="season-badge ${tone}">${toneLabel[tone]}</em></h4><p>From your birthday in ${year.year} to your birthday in ${year.year + 1}</p></div>
    <div class="rising-note ${year.risingCaution ? 'watchful' : ''}"><b>${year.risingCaution ? 'A season of resistance' : 'The rising sign'}</b><span>${escapeHtml(year.rising)} rises. ${escapeHtml(year.risingText)}${year.risingCaution ? ` This pairing with ${escapeHtml(reading.method.sun.sign)} is marked as difficult.` : ''}</span></div>
    <div class="detail-grid">
      <div><small>01 / SEAL OF THE YEAR</small><h5>${year.pointSum} → ${year.pointNumber}</h5><p>${escapeHtml(year.pointText)}</p><span>${year.pointYear} + key ${reading.method.key} = ${year.pointSum}; digit sum ${year.pointDigitSum}${year.pointDigitSum > 22 ? `, wrapped to ${year.pointNumber}` : ''}</span></div>
      <div><small>02 / YOUR SIGN'S HOUSE</small><h5>House ${year.house}</h5><p>${escapeHtml(year.houseText)}</p><span>One house of passage per year of life</span></div>
      <div><small>03 / PROCESSIONAL SIGN</small><h5>${escapeHtml(year.rising)}</h5><p>${escapeHtml(year.risingText)}</p><span>Read alongside the annual point and house.</span></div>
    </div>
    <div class="age-cycle-note"><b>Age-cycle pattern · ${escapeHtml(year.agePointName)}</b><span>${year.year} + age ${year.ageAttained} = ${year.ageCycleSum}; digit sum ${year.agePointDigitSum}${year.agePointDigitSum > 22 ? `, wrapped to point ${year.agePointNumber}` : `, point ${year.agePointNumber}`}.</span><p>${escapeHtml(year.agePointText)}</p></div>`;
}

function renderGuardianAngels() {
  angelCards.innerHTML = reading.guardianAngels.map((angel) => `<article class="angel-card">
    ${angel.number ? `<div class="angel-name">${escapeHtml(angel.name)}</div><img src="${artPath(angel.number)}" alt="Illustrative artwork paired with ${escapeHtml(angel.name)}" width="720" height="1080">` : '<div class="angel-unassigned" aria-hidden="true">No date assignment</div>'}
    <div class="angel-card-copy"><span class="card-role"><i></i>${escapeHtml(angel.role)}</span><h4>${escapeHtml(angel.name || 'No date assignment')}</h4><p>${escapeHtml(angel.basis)}</p><small>The portrait is illustrative.</small></div>
  </article>`).join('');
}
