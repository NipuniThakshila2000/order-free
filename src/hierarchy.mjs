import {ANGEL_NAMES, SIGNS} from './source-data.mjs';
import {ANGEL_QUALITIES} from './angel-qualities.mjs';

const CONSTELLATIONS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];
const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map((symbol) => `${symbol}\uFE0E`);
const SIGN_PLANETS = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
// The seven planet–angel pairs shown in the supplied Seven Spirits diagram.
const PLANET_ANGELS = {Saturn:'Jegudiel',Venus:'Razael',Mars:'Uriel',Moon:'Raphael',Mercury:'Gabriel',Jupiter:'Michael',Sun:'Metatron'};
const PLANET_GLYPHS = {Saturn:'♄',Venus:'♀',Mars:'♂',Moon:'☽',Mercury:'☿',Jupiter:'♃',Sun:'☉'};
const PLANET_ORDER = ['Saturn','Venus','Mars','Moon','Mercury','Jupiter','Sun'];
const CONSTELLATION_FIGURES = ['the Ram','the Bull','the Twins','the Crab','the Lion','the Maiden','the Scales','the Scorpion','the Archer','the Sea Goat','the Water Bearer','the Fishes'];
const PLANET_THEMES = {Saturn:'fear of the Lord',Venus:'knowledge',Mars:'might',Moon:'counsel',Mercury:'understanding',Jupiter:'wisdom',Sun:'the Spirit of the Lord'};
const clean = (value) => String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const point = (radius, angle) => {
  const radians = angle * Math.PI / 180;
  return {x: 500 + radius * Math.cos(radians), y: 560 + radius * Math.sin(radians)};
};
const at = (radius, angle) => {
  const {x,y} = point(radius, angle);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
};

export function getHierarchySelection(reading) {
  const signIndex = reading.method.sun.signNumber - 1;
  if (signIndex < 0 || signIndex >= CONSTELLATIONS.length) throw new Error('Unknown sign correspondence.');
  const planet = SIGN_PLANETS[signIndex];
  return {
    sign: reading.method.sun.sign,
    signIndex,
    constellation: CONSTELLATIONS[signIndex],
    planet,
    archangel: PLANET_ANGELS[planet],
    angelNumbers: reading.guardianAngels.map((angel) => angel.number),
    angelNames: reading.guardianAngels.map((angel) => angel.name || 'Unassigned')
  };
}

export function buildHierarchyMarkup(reading) {
  const selected = getHierarchySelection(reading);
  const activeAngels = new Set(selected.angelNumbers.filter(Number.isInteger));
  const circles = [455,440,425,410,380,320,275,205,185,100].map((radius, index) =>
    `<circle class="wheel-ring ${index < 4 ? 'wheel-outer-ring' : ''}" cx="500" cy="560" r="${radius}"/>`).join('');
  const selectedPositions = [...activeAngels].sort((a,b) => a - b);
  const angelMarks = ANGEL_NAMES.map((name, index) => {
    const number = index + 1;
    const angle = -90 + index * 5;
    const active = activeAngels.has(number);
    const marker = point(301, angle);
    const label = point(297, angle);
    if (!active) return `<g class="wheel-angel-position is-muted" data-hierarchy-info="angel:${index}" tabindex="-1" role="button" aria-label="${clean(name)}, position ${number}. Show qualities"><circle class="wheel-hit" cx="${label.x.toFixed(1)}" cy="${label.y.toFixed(1)}" r="12"/><text x="${label.x.toFixed(1)}" y="${(label.y + 3).toFixed(1)}" text-anchor="middle">${number}</text></g>`;
    const closeBefore = selectedPositions.filter((other) => other < number && Math.min(number - other, 72 - number + other) <= 6).length;
    const namePoint = point(344 + closeBefore * 23, angle);
    const anchor = namePoint.x < 425 ? 'end' : namePoint.x > 575 ? 'start' : 'middle';
    const nameX = namePoint.x + (anchor === 'start' ? 7 : anchor === 'end' ? -7 : 0);
    return `<g class="wheel-angel-position is-active" data-hierarchy-info="angel:${index}" tabindex="0" role="button" aria-label="${clean(name)}, position ${number}. Show qualities"><circle class="wheel-hit" cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="13"/><circle class="wheel-selected-dot" cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="3"/><line class="wheel-selected-line" x1="${marker.x.toFixed(1)}" y1="${marker.y.toFixed(1)}" x2="${namePoint.x.toFixed(1)}" y2="${namePoint.y.toFixed(1)}"/><text class="wheel-selected-name" x="${nameX.toFixed(1)}" y="${(namePoint.y + 4).toFixed(1)}" text-anchor="${anchor}">${clean(name)}</text></g>`;
  }).join('');
  const archangels = PLANET_ORDER.map((planet, index) => {
    const angle = -160 + index * (140 / 6);
    const {x,y} = point(380, angle);
    const active = planet === selected.planet;
    return `<g class="wheel-archangel ${active ? 'is-active' : 'is-muted'}"><circle cx="${x.toFixed(1)}" cy="${(y - 22).toFixed(1)}" r="3"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${clean(PLANET_ANGELS[planet])}</text></g>`;
  }).join('');
  const zodiacSeparators = Array.from({length:12}, (_, index) => {
    const angle = -105 + index * 30;
    return `<line class="wheel-sector" x1="${at(207,angle).replace(',', '" y1="')}" x2="${at(273,angle).replace(',', '" y2="')}"/>`;
  }).join('');
  const constellations = CONSTELLATIONS.map((name, index) => {
    const {x,y} = point(238, -90 + index * 30);
    const active = index === selected.signIndex;
    return `<g class="wheel-constellation ${active ? 'is-active' : 'is-muted'}" data-hierarchy-info="constellation:${index}" tabindex="0" role="button" aria-label="${clean(name)} constellation. Show description"><circle class="wheel-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="35"/><text class="wheel-glyph" x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${SIGN_GLYPHS[index]}</text><text x="${x.toFixed(1)}" y="${(y + 16).toFixed(1)}" text-anchor="middle">${clean(name)}</text></g>`;
  }).join('');
  const planetSeparators = PLANET_ORDER.map((_, index) => {
    const angle = -90 + (index + .5) * 360 / 7;
    return `<line class="wheel-sector" x1="${at(102,angle).replace(',', '" y1="')}" x2="${at(183,angle).replace(',', '" y2="')}"/>`;
  }).join('');
  const planets = PLANET_ORDER.map((planet, index) => {
    const {x,y} = point(148, -90 + index * 360 / 7);
    const active = planet === selected.planet;
    return `<g class="wheel-planet ${active ? 'is-active' : 'is-muted'}" data-hierarchy-info="planet:${planet}" tabindex="0" role="button" aria-label="${planet}. Show description"><circle class="wheel-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="32"/><text class="wheel-glyph" x="${x.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle">${PLANET_GLYPHS[planet]}</text><text x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}" text-anchor="middle">${planet}</text></g>`;
  }).join('');
  const fullName = `${reading.person.given} ${reading.person.surname}`;
  const centerName = fullName.length > 19 ? `${reading.person.given.split(' ')[0].slice(0,15)}…` : fullName;
  const svg = `<svg class="hierarchy-svg" viewBox="0 0 1000 1040" role="img" aria-labelledby="hierarchy-svg-title" xmlns="http://www.w3.org/2000/svg">
    <title id="hierarchy-svg-title">Christ above all; ${clean(selected.constellation)}, ${clean(selected.planet)}, ${clean(selected.archangel)}, and ${selected.angelNames.map(clean).join(', ')} highlighted for ${clean(fullName)}.</title>
    <rect width="1000" height="1040" fill="#0b1538"/>
    <g fill="none">${circles}${zodiacSeparators}${planetSeparators}${angelMarks}</g>
    <text class="wheel-christ" x="500" y="79" text-anchor="middle">✝ CHRIST · ABOVE ALL</text>
    <text class="wheel-order" x="500" y="118" text-anchor="middle">CHERUBIM</text>
    <text class="wheel-order" x="500" y="134" text-anchor="middle">SERAPHIM</text>
    <text class="wheel-order" x="500" y="150" text-anchor="middle">THRONES</text>
    ${archangels}${constellations}${planets}
    <text class="wheel-center-label" x="500" y="550" text-anchor="middle">YOUR PLACE</text>
    <text class="wheel-center-name" x="500" y="579" text-anchor="middle">${clean(centerName)}</text>
  </svg>`;
  const roster = `<div class="hierarchy-summary"><p><small>CONSTELLATION</small><strong>${clean(selected.constellation)}</strong></p><p><small>PLANET</small><strong>${clean(selected.planet)}</strong></p><p><small>ARCHANGEL</small><strong>${clean(selected.archangel)}</strong></p><p><small>THREE BIRTH CORRESPONDENCES</small><strong>${selected.angelNames.map(clean).join(' · ')}</strong></p></div>
    <div class="hierarchy-roster"><div class="hierarchy-roster-heading"><h4>72 angels / genies</h4><p>Hover or focus for qualities; click or tap to keep details open. Gold names correspond to this reading.</p></div><div class="hierarchy-roster-grid" role="list">${ANGEL_NAMES.map((name, index) => `<span role="listitem"><button type="button" class="${activeAngels.has(index + 1) ? 'is-active' : 'is-muted'}" data-hierarchy-info="angel:${index}" aria-label="${clean(name)}. Show qualities">${clean(name)}</button></span>`).join('')}</div></div>`;
  return {svg, roster};
}

export function renderCelestialHierarchy(reading) {
  const {svg, roster} = buildHierarchyMarkup(reading);
  document.querySelector('#celestial-map').innerHTML = svg;
  document.querySelector('#celestial-details').innerHTML = roster;
  bindHierarchyInteractions();
}

export function getHierarchyInfo(key) {
  const [kind, value] = String(key).split(':');
  if (kind === 'angel') {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= ANGEL_NAMES.length) return null;
    const quality = ANGEL_QUALITIES[index];
    return {eyebrow:`ANGEL ${index + 1} OF 72`, title:ANGEL_NAMES[index], subtitle:`Attribute: ${quality.attribute}`, body:quality.governs};
  }
  if (kind === 'constellation') {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= CONSTELLATIONS.length) return null;
    return {eyebrow:'CONSTELLATION', title:CONSTELLATIONS[index], subtitle:CONSTELLATION_FIGURES[index], body:`The traditional namesake of the ${SIGNS[index]} sign. This figure names a region of the sky; the reading does not calculate its position at birth.`};
  }
  if (kind === 'planet' && PLANET_ANGELS[value]) {
    return {eyebrow:'CLASSICAL PLANET', title:value, subtitle:`Paired angel: ${PLANET_ANGELS[value]}`, body:`Its associated theme is ${PLANET_THEMES[value]}. The Sun and Moon are included among the seven classical lights.`};
  }
  return null;
}

let hierarchyListenersBound = false;
let hierarchyTrigger = null;
let hierarchyPinned = false;

function closeHierarchyInfo() {
  if (hierarchyTrigger) hierarchyTrigger.setAttribute('aria-expanded', 'false');
  hierarchyTrigger = null;
  hierarchyPinned = false;
  document.querySelector('#hierarchy-popover').hidden = true;
}

function positionHierarchyInfo(trigger) {
  const popover = document.querySelector('#hierarchy-popover');
  const rect = trigger.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
  const below = rect.bottom + 10;
  const top = below + height < window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 10);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function showHierarchyInfo(trigger, pin = false) {
  const info = getHierarchyInfo(trigger.dataset.hierarchyInfo);
  if (!info) return;
  if (hierarchyTrigger && hierarchyTrigger !== trigger) hierarchyTrigger.setAttribute('aria-expanded', 'false');
  hierarchyTrigger = trigger;
  hierarchyPinned = pin;
  trigger.setAttribute('aria-expanded', 'true');
  const popover = document.querySelector('#hierarchy-popover');
  popover.innerHTML = `<button class="hierarchy-popover-close" type="button" aria-label="Close details">×</button><span class="hierarchy-popover-kicker">${clean(info.eyebrow)}</span><h4>${clean(info.title)}</h4><strong>${clean(info.subtitle)}</strong><p>${clean(info.body)}</p>`;
  popover.hidden = false;
  positionHierarchyInfo(trigger);
}

function hierarchyTarget(event) {
  return event.target.closest?.('[data-hierarchy-info]');
}

function bindHierarchyInteractions() {
  if (hierarchyListenersBound) {
    closeHierarchyInfo();
    return;
  }
  hierarchyListenersBound = true;
  const section = document.querySelector('.celestial-section');
  const map = document.querySelector('#celestial-map');
  const viewToggle = document.querySelector('#hierarchy-view-toggle');
  const setFitMode = (fitted) => {
    map.classList.toggle('is-fit', fitted);
    viewToggle.setAttribute('aria-pressed', String(fitted));
    viewToggle.textContent = fitted ? 'Read labels' : 'Fit whole wheel';
    document.querySelector('.celestial-swipe').textContent = fitted ? 'Tap “Read labels” to enlarge the wheel.' : 'Swipe to explore the whole wheel →';
    map.scrollLeft = 0;
  };
  if (window.matchMedia('(max-width: 600px)').matches) setFitMode(true);
  section.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch' || hierarchyPinned) return;
    const trigger = hierarchyTarget(event);
    if (trigger && trigger !== hierarchyTrigger) showHierarchyInfo(trigger);
  });
  section.addEventListener('pointerout', (event) => {
    if (hierarchyPinned) return;
    const trigger = hierarchyTarget(event);
    if (trigger && !trigger.contains(event.relatedTarget)) closeHierarchyInfo();
  });
  section.addEventListener('focusin', (event) => {
    const trigger = hierarchyTarget(event);
    if (trigger && !hierarchyPinned) showHierarchyInfo(trigger);
  });
  section.addEventListener('focusout', (event) => {
    if (hierarchyPinned) return;
    const trigger = hierarchyTarget(event);
    if (trigger && !trigger.contains(event.relatedTarget)) closeHierarchyInfo();
  });
  section.addEventListener('click', (event) => {
    if (event.target.closest('.hierarchy-popover-close')) {
      closeHierarchyInfo();
      return;
    }
    const trigger = hierarchyTarget(event);
    if (!trigger) return;
    if (hierarchyPinned && hierarchyTrigger === trigger) closeHierarchyInfo();
    else showHierarchyInfo(trigger, true);
  });
  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHierarchyInfo();
    const trigger = hierarchyTarget(event);
    if (trigger && trigger.namespaceURI === 'http://www.w3.org/2000/svg' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      showHierarchyInfo(trigger, true);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    const popover = document.querySelector('#hierarchy-popover');
    if (hierarchyPinned && hierarchyTrigger && !hierarchyTrigger.contains(event.target) && !popover.contains(event.target)) closeHierarchyInfo();
  });
  window.addEventListener('resize', () => {
    if (hierarchyTrigger) positionHierarchyInfo(hierarchyTrigger);
  });
  viewToggle.addEventListener('click', () => {
    setFitMode(!map.classList.contains('is-fit'));
    closeHierarchyInfo();
  });
}
