import {calculateReading} from './reading.mjs';
import {SIGNS, TRIBES} from './source-data.mjs';
import {julianRecordToGregorian} from './lilly.mjs';
import {renderCelestialHierarchy, getHierarchyInfo} from './hierarchy.mjs';
import {displaySign, birthSunLabels} from './display.mjs';
import {ASCENDANT_PROFECTION_PASSAGES, LILLY_JUDGEMENT_LIMIT} from './lilly-passages.mjs';
import {initializeReadingAccess} from './access.mjs';

const form = document.querySelector('#reading-form');
const programForm = document.querySelector('#program-registration-form');
const programButton = programForm.querySelector('[type="submit"]');
const programStatus = document.querySelector('#program-form-status');
fetch('api/register').then((response) => response.json()).then(({ready}) => {
  if (!ready) return;
  programButton.disabled = false;
  programButton.textContent = 'Register to attend ↗';
  programStatus.textContent = '';
}).catch(() => {});
programForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (programButton.disabled || !programForm.reportValidity()) return;
  programButton.disabled = true;
  programStatus.textContent = 'Saving your registration…';
  try {
    const response = await fetch('api/register', {
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
const experienceConsentRow = document.querySelector('#experience-consent-row');
const experienceConsent = document.querySelector('#experience-consent');
const experienceSaveStatus = document.querySelector('#experience-save-status');
const savedExperiences = document.querySelector('#saved-experiences');
const savedExperiencesList = document.querySelector('#saved-experiences-list');
const savedExperiencesStatus = document.querySelector('#saved-experiences-status');
const refreshSavedExperiences = document.querySelector('#refresh-saved-experiences');
const deleteAllExperiences = document.querySelector('#delete-all-experiences');
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
let accessApproved = false;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const todayYear = new Date().getFullYear();
const artPath = (number) => `assets/angels/angel-${String(number).padStart(2, '0')}.webp?v=3`;
const signGlyphs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
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

async function loadSavedExperiences() {
  if (!accessApproved) return;
  savedExperiences.hidden = false;
  savedExperiencesStatus.textContent = 'Loading saved reports…';
  try {
    const response = await fetch('api/experience-data?action=mine', {credentials:'same-origin',cache:'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Saved experiences are unavailable.');
    const records = data.records || [];
    deleteAllExperiences.hidden = records.length === 0;
    savedExperiencesStatus.textContent = records.length ? `${records.length} saved experience${records.length === 1 ? '' : 's'}.` : 'No saved reports yet. Generate a report and agree to the Terms and Conditions to save it.';
    savedExperiencesList.innerHTML = records.map((item) => `<div class="saved-experience-card">
      <div><strong>${escapeHtml(item.birthName)}</strong><small>${escapeHtml(item.birthDate)} · ${escapeHtml(item.birthplace || 'Place not supplied')} · Saved ${new Date(item.createdAt).toLocaleDateString()}</small></div>
      <div class="saved-experience-actions"><button type="button" data-action="view" data-id="${escapeHtml(item.id)}">View results</button><button type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button></div>
    </div>`).join('');
  } catch (problem) {
    savedExperiencesStatus.textContent = `${problem.message} Select Refresh reports to try again.`;
  }
}

refreshSavedExperiences.addEventListener('click', loadSavedExperiences);

savedExperiencesList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'delete') {
    if (!window.confirm('Delete this saved experience and its birth details?')) return;
    const response = await fetch(`api/experience-data?action=record&id=${encodeURIComponent(id)}`, {method:'DELETE',credentials:'same-origin'});
    const data = await response.json().catch(() => ({}));
    savedExperiencesStatus.textContent = response.ok ? 'Saved data deleted.' : data.error || 'Could not delete this experience.';
    if (response.ok) await loadSavedExperiences();
    return;
  }
  try {
    const response = await fetch(`api/experience-data?action=record&id=${encodeURIComponent(id)}`, {credentials:'same-origin',cache:'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not open this experience.');
    const details = data.record.input;
    reading = data.record.result;
    form.elements.given.value = details.given || '';
    form.elements.surname.value = details.surname || '';
    birthCalendar.value = details.calendar || 'gregorian';
    dateInput.type = birthCalendar.value === 'julian' ? 'text' : 'date';
    dateInput.value = details.date || '';
    timeCertainty.value = details.timeCertainty || 'unknown';
    if (details.time) {
      const [hour, minute] = details.time.split(':').map(Number);
      timeHour.value = String(hour % 12 || 12);
      timeMinute.value = String(minute).padStart(2, '0');
      timePeriod.value = hour >= 12 ? 'PM' : 'AM';
    }
    updateTime();
    placeInput.value = details.place || '';
    selectedLocation = details.location || null;
    locationQuery = placeInput.value;
    updateFromYears();
    fromYear.value = details.from || fromYear.value;
    experienceConsent.checked = false;
    renderReading();
    result.hidden = false;
    result.scrollIntoView({behavior:'smooth',block:'start'});
  } catch (problem) {
    savedExperiencesStatus.textContent = problem.message;
  }
});

deleteAllExperiences.addEventListener('click', async () => {
  if (!window.confirm('Delete all your saved birth details and generated results?')) return;
  const response = await fetch('api/experience-data?action=all', {method:'DELETE',credentials:'same-origin'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    savedExperiencesStatus.textContent = data.error || 'Could not delete saved data.';
    return;
  }
  await loadSavedExperiences();
});

initializeReadingAccess({
  form,
  result,
  showSample() {
    experienceConsentRow.hidden = true;
    experienceSaveStatus.hidden = true;
    form.elements.given.value = 'Grace';
    form.elements.surname.value = 'Anderson';
    birthCalendar.value = 'gregorian';
    dateInput.value = '1990-05-15';
    timeCertainty.value = 'exact';
    timeHour.value = '10';
    timeMinute.value = '30';
    timePeriod.value = 'AM';
    placeInput.value = 'Colombo, Sri Lanka';
    selectedLocation = {id:'sample-colombo', label:'Colombo, Sri Lanka', latitude:6.9271, longitude:79.8612, timezone:'Asia/Colombo'};
    locationQuery = placeInput.value;
    updateFromYears();
    fromYear.value = '2025';
    updateTime();
    reading = calculateReading({...Object.fromEntries(new FormData(form)), location:selectedLocation});
    renderReading();
    result.hidden = false;
    document.querySelector('#result-title').textContent = 'Sample Results';
    document.querySelector('#demo-result-note').hidden = false;
    form.classList.add('is-sample');
    form.querySelectorAll('input:not([type="hidden"])').forEach((input) => { input.readOnly = true; });
    form.querySelectorAll('select').forEach((input) => { input.disabled = true; });
    submitButton.disabled = true;
    submitButton.textContent = 'Sample experience shown below';
  },
  unlock(email) {
    accessApproved = true;
    document.body.classList.add('access-approved');
    form.classList.remove('is-sample');
    form.querySelectorAll('input:not([type="hidden"])').forEach((input) => { input.readOnly = false; });
    form.querySelectorAll('select').forEach((input) => { input.disabled = false; });
    form.reset();
    experienceConsentRow.hidden = false;
    experienceConsent.checked = false;
    experienceSaveStatus.hidden = true;
    selectedLocation = null;
    locationQuery = '';
    locationChoice.hidden = true;
    offsetChoice.hidden = true;
    updateFromYears();
    updateTime();
    result.hidden = true;
    document.querySelector('#demo-result-note').hidden = true;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Begin My Reflection in Christ <span aria-hidden="true">↗</span>';
    document.querySelector('#access-status').textContent = `Signed in as ${email}. Enter your own details to begin.`;
    document.querySelector('#access-preview-note').hidden = true;
    loadSavedExperiences();
  }
});
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
      const adultCutoff = new Date();
      adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
      if (year<1600 || year>todayYear || month<1 || month>12 || day<1 || day>monthDays[month-1] || date>new Date()) message='Choose a real birth-record date from 1600 through today.';
      else if (date > adultCutoff) message = 'This experience is for adults aged 18 or older.';
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
  if (!accessApproved) return;
  if (submitButton.disabled) return;
  error.hidden = true;
  experienceSaveStatus.hidden = true;
  const invalidInput = validatedInputs.filter((input) => !validateField(input))[0];
  if (invalidInput) {
    (invalidInput.name === 'time' ? [timeHour, timeMinute, timePeriod].find((control) => !control.disabled && !control.value) || timeCertainty : invalidInput).focus();
    return;
  }
  let reportRendered = false;
  try {
    const place = placeInput.value.trim();
    if (place && timeCertainty.value === 'exact' && (!selectedLocation || place !== locationQuery)) {
      const response = await fetch(`api/geocode?q=${encodeURIComponent(place)}`);
      if (!response.ok) throw new Error('Birthplace lookup is unavailable. Try again, or leave the place blank for symbolic results only.');
      locationMatches = (await response.json()).results || [];
      locationQuery = place;
      if (!locationMatches.length) throw new Error('No matching birthplace was found. Add a country or region, then try again.');
      if (locationMatches.length === 1) selectedLocation = locationMatches[0];
      else {
        locationResult.innerHTML = '<option value="">Choose a city</option>' + locationMatches.map((item,index) => `<option value="${index+1}">${escapeHtml(item.label)}</option>`).join('');
        locationChoice.hidden = false;
        locationResult.focus();
        throw new Error('Choose the matching birthplace, then begin your reflection.');
      }
    }
    if (place && timeCertainty.value === 'exact' && !selectedLocation) throw new Error('Choose the matching birthplace.');
    const details = {...Object.fromEntries(new FormData(form)),location:selectedLocation,utcOffsetMinutes:offsetResult.value === '' ? undefined : Number(offsetResult.value)};
    reading = calculateReading(details);
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
    reportRendered = true;
    requestAnimationFrame(() => centerTimelineMark(Number(select.value)));
    result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    if (experienceConsent.checked) {
      const response = await fetch('api/experience-data', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({consent:true, details, result:reading})
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok || !saved.saved) throw new Error(saved.error || 'Your results could not be saved. Please try again.');
      experienceSaveStatus.textContent = 'Saved to your account.';
      await loadSavedExperiences();
    } else {
      experienceSaveStatus.textContent = 'These results are shown in your browser only and were not saved.';
    }
    experienceSaveStatus.hidden = false;
  } catch (problem) {
    error.textContent = reportRendered ? `Your report is shown below, but it was not saved: ${problem.message}` : problem.message;
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
  timelinePreview.innerHTML = `<small>${year.year} · AGE ${year.ageAttained} · POINT ${year.pointNumber}</small><strong>${escapeHtml(year.pointName)}</strong><span class="season-badge ${tone}">${toneLabel[tone]}</span><p>${escapeHtml(year.pointText)}</p><em>Select for details</em>`;
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
    return `<button type="button" class="timeline-mark ${tone}" data-index="${index}" aria-label="${year.year}, Age ${year.ageAttained}, Point ${year.pointNumber}, ${escapeHtml(year.pointName)}, ${toneLabel[tone]}"><span aria-hidden="true"></span></button>`;
  }).join('');
  const labels = years.map((year, index) => (index === 0 || year.year % 10 === 0 || index === years.length - 1)
    ? `<span style="grid-column:${index + 1}">${year.year}</span>` : '').join('');
  timelineTrack.innerHTML = `<div class="timeline-marks" aria-label="Calendar years">${marks}</div><div class="timeline-axis" aria-hidden="true">${labels}</div>`;
}

function centerTimelineMark(index) {
  const mark = timelineTrack.querySelector(`.timeline-mark[data-index="${index}"]`);
  if (!mark) return;
  const markLeft = mark.getBoundingClientRect().left - timelineScroll.getBoundingClientRect().left + timelineScroll.scrollLeft;
  timelineScroll.scrollLeft = Math.max(0, markLeft - (timelineScroll.clientWidth - mark.clientWidth) / 2);
}

function renderReading() {
  const {person, method, portrait, years, lilly} = reading;
  document.querySelector('#result-title').textContent = 'Your Results';
  if (!method) {
    renderCelestialHierarchy(reading);
    renderGuardianAngels();
    document.querySelector('#governance-sign').innerHTML = `<h4>Your birth sun sign, under Christ</h4><p>A birth time is needed to determine the symbolic sign used here.</p>`;
    document.querySelector('#summary-content').innerHTML = '<h4>Historical sign portrait</h4><p>A birth time is needed to choose this historical correspondence. Christ remains above every sign and number.</p>';
    select.innerHTML = years.map((year, index) => `<option value="${index}">${year.year} · Age ${year.ageAttained}</option>`).join('');
    const requested = Number(fromYear.value);
    const startIndex = years.findIndex((year) => year.year >= requested);
    windowStartIndex = startIndex < 0 ? years.length - 1 : startIndex;
    renderTimeline(years);
    showYear(windowStartIndex);
    document.querySelector('#limit-text').textContent = reading.limits;
    return;
  }
  renderCelestialHierarchy(reading);
  const signIndex = method.sun.signNumber - 1;
  const signAgreement = lilly.available && lilly.sun.sign === method.sun.sign;
  const symbolicTribe = TRIBES[signIndex];
  const astronomicalTribe = lilly.available ? TRIBES[SIGNS.indexOf(lilly.sun.sign)] : null;
  const signLabels = birthSunLabels(method.sun.sign,lilly.available ? lilly.sun.sign : null);
  const signDisplay = signLabels.length === 1
    ? `<strong>${escapeHtml(signLabels[0])}</strong>`
    : signLabels.map((label)=>`<span>${escapeHtml(label)}</span>`).join('');
  const tribeDisplay = lilly.available && !signAgreement
    ? `<div class="tribe-answer" aria-label="Tribal correspondence — camp-order tradition"><small>Tribal correspondence — camp-order tradition</small><p>Lilly: <strong>${escapeHtml(astronomicalTribe.tribe)}</strong></p><p>Sepharial: <strong>${escapeHtml(symbolicTribe.tribe)}</strong></p></div>`
    : `<div class="tribe-answer" aria-label="Tribal correspondence — camp-order tradition: ${escapeHtml(symbolicTribe.tribe)}"><small>Tribal correspondence — camp-order tradition</small><strong>${escapeHtml(symbolicTribe.tribe)}</strong><span>${escapeHtml(symbolicTribe.month)}</span></div>`;
  document.querySelector('#governance-sign').innerHTML = `
    <h4>Your birth sun sign, under Christ</h4>
    <div class="sign-hero"><span class="sign-glyph" aria-hidden="true">${signGlyphs[signIndex]}</span><div>${signDisplay}</div></div>
    ${tribeDisplay}
    <div class="governance-facts">${lilly.available ? `<div><small>Lilly's Ascendant</small><strong>${escapeHtml(displaySign(lilly.ascendant.sign))}</strong></div>` : ''}<div><small>Symbolic calculation date</small><strong>${escapeHtml(method.astroDate)}</strong></div><div><small>Birth place</small><strong>${escapeHtml(person.place || 'Not supplied')}</strong></div></div>`;
  document.querySelector('#summary-content').innerHTML = `
    <h4>Historical sign portrait</h4>
    <p>${escapeHtml(portrait[1])}</p><p>These source descriptions are symbolic and do not define your identity in Christ.</p>`;
  select.innerHTML = years.map((year, index) => `<option value="${index}">${year.year} · Age ${year.ageAttained}</option>`).join('');
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
    const currentLabel = year.isCurrent ? 'CURRENT YEAR' : year.isPast ? 'PAST YEAR' : 'COMING YEAR';
    const yearIndex = windowStartIndex + visible.indexOf(year);
    return `<button class="year-card ${yearIndex === index ? 'active' : ''} ${year.isCurrent ? 'current' : ''}" type="button" data-index="${yearIndex}" aria-pressed="${yearIndex === index}" aria-label="${year.year}, Age ${year.ageAttained}, Point ${year.pointNumber}, ${escapeHtml(year.pointName)}">
      <span>${currentLabel}</span>
      <strong>${year.year}</strong><small>Age ${year.ageAttained}</small><em class="season-badge ${tone}">${toneLabel[tone]}</em>
      <span class="year-bar ${tone}" aria-hidden="true"></span><i>Point ${year.pointNumber}</i>
    </button>`;
  }).join('');
  document.querySelectorAll('.year-card').forEach((button) => button.addEventListener('click', () => showYear(Number(button.dataset.index))));
  select.value = String(index);
  const year = years[index];
  const tone = toneClass(year.pointTone);
  const lillyYear = year.lilly;
  const lillyPassage = lillyYear && ASCENDANT_PROFECTION_PASSAGES[lillyYear.profectionHouse];
  timelineTrack.querySelector('.timeline-mark.active')?.classList.remove('active');
  const activeMark = timelineTrack.querySelector(`.timeline-mark[data-index="${index}"]`);
  if (activeMark) {
    activeMark.classList.add('active');
    if (!result.hidden) centerTimelineMark(index);
  }
  document.querySelector('#timeline-selected').textContent = `${year.year} · Age ${year.ageAttained} · Point ${year.pointNumber}`;
  document.querySelector('#year-detail').innerHTML = `
    <div class="year-detail-title"><div class="year-detail-topline"><span class="section-number">${year.year} · AGE ${year.ageAttained} · POINT ${year.pointNumber}</span><a class="button button-gold year-change-cta" href="https://order.wowlife.lk/RedeemingTheSeasons" target="_blank" rel="noopener noreferrer">What can I do about this? <span aria-hidden="true">↗</span></a></div><h4>${escapeHtml(year.pointName)} <em class="season-badge ${tone}">${toneLabel[tone]}</em></h4></div>
    <div class="rising-note"><b>Christ above every season</b><span>These historical symbols invite reflection; they do not determine your future or your redemption in Christ.</span></div>
    <div class="detail-grid">
      <div><small>01 / YEAR-PLUS-AGE POINT</small><h5>Point ${year.pointNumber}</h5><p>${escapeHtml(year.pointText)}</p><span>${escapeHtml(year.pointName)} · ${toneLabel[tone]}</span></div>
      <div><small>02 / SEPHARIAL'S HOUSE CORRESPONDENCE</small><h5>${year.house ? `House ${year.house}` : 'Birth time needed'}</h5><p>${year.house ? escapeHtml(year.houseText) : 'This correspondence requires a birth time.'}</p></div>
      <div><small>03 / SEPHARIAL</small><h5>${year.rising ? `${escapeHtml(displaySign(year.rising))} → ${escapeHtml(displaySign(year.risingNext))}` : 'Birth time needed'}</h5><p>${year.rising ? escapeHtml(year.risingText) : 'This sequence requires a birth time.'}</p></div>
    </div>
    <div class="lilly-future"><small>WILLIAM LILLY · CHRISTIAN ASTROLOGY, BOOK III, CHAPTER CLXIX</small>
      ${lillyYear ? `<h5>Annual profection: ${escapeHtml(displaySign(lillyYear.sign))} · ${escapeHtml(lillyYear.ruler)} · natal house ${lillyYear.profectionHouse}</h5>
        <p class="lilly-future-lead">Lilly's description for the house reached by the profected Ascendant:</p>
        <blockquote>${lillyPassage ? escapeHtml(lillyPassage) : 'The source moves directly from the tenth to the twelfth house. Lilly supplies no eleventh-house passage in this chapter.'}</blockquote>
        <p class="lilly-future-transition">The profection then enters ${escapeHtml(displaySign(lillyYear.nextSign))}, ruled by ${escapeHtml(lillyYear.nextRuler)}, within this annual period.</p>`
        : `<h5>Birth place and exact time needed</h5><p>Lilly's Ascendant profection requires a resolved birth place and exact birth time.</p>`}
      <p class="lilly-future-limit">${escapeHtml(LILLY_JUDGEMENT_LIMIT)}</p>
    </div>
    <div class="age-cycle-note"><b>Reflection in Christ</b><p>Christ is supreme over every age, sign, and symbolic point. These historical classifications cannot determine your life in him.</p></div>`;
}

function renderGuardianAngels() {
  angelCards.innerHTML = reading.guardianAngels.map((angel) => {
    const info = angel.number ? getHierarchyInfo(`angel:${angel.number - 1}`) : null;
    const needsBirthTime = angel.role === 'Spirit guardian angel' && !angel.number;
    const hourOnly = needsBirthTime && angel.candidates?.length > 0;
    const unassignedTitle = needsBirthTime ? (hourOnly ? 'Birth minute needed' : 'Birth time needed') : 'No date assignment';
    const unassignedDescription = needsBirthTime
      ? (hourOnly ? 'The birth hour covers three possible 20-minute intervals. In Time of birth, choose Known to the minute and add the birth minute to identify one angel.' : 'This guardian angel is identified from a 20-minute birth-time interval. In Time of birth, choose Known to the minute and enter the hour, minute, and AM/PM if known.')
      : angel.basis;
    return `<article class="angel-card">
    ${angel.number ? `<div class="angel-name">${escapeHtml(angel.name)}</div><img src="${artPath(angel.number)}" alt="Illustrative artwork paired with ${escapeHtml(angel.name)}" width="720" height="1080">` : `<div class="angel-unassigned" aria-hidden="true">${unassignedTitle}</div>`}
    <div class="angel-card-copy"><span class="card-role"><i></i>${escapeHtml(angel.role)}</span><h4>${escapeHtml(angel.name || unassignedTitle)}</h4>${info ? `<p class="angel-attribute">${escapeHtml(info.subtitle)}</p><p class="angel-description">${escapeHtml(info.body)}</p>` : `<p>${escapeHtml(unassignedDescription)}</p>`}${angel.number ? '<small>The portrait is illustrative.</small>' : ''}</div>
  </article>`;
  }).join('');
}
