// The consortium tool (src/components/consortium/ConsortiumPage.astro): choose a climate and a
// place, get a consortium from the data core (src/lib/consortium/), change it, share or print it.
// The page renders from one state object; every change re-renders the tool and puts the focus back
// on the control that had it (data-fk), or on the one the action names. Sheets (details, Swap, Add,
// place, site) are one native <dialog>. Nothing leaves the browser: the data files are the site's
// own, the state lives in the address bar and in localStorage.
import {
  cellFor, regionsOf, regions, strata, phases, phaseBands, bandsOf, jobs, jobsOf, jobOfFunction, suggest, evaluate, alternatives, flagsFor,
  SIZE_LIMIT, DEFAULT_SITE, lights, soils, waters, rooms, encodeState, decodeState, resolveState, taxonByName, invasiveCountries, isSerious, siteClimates, fits,
} from '../../lib/consortium/index.ts';
import { loadManifest, loadLabels, loadCell } from './data.ts';
import { makeWords, esc, plantName, searchText, fold, needsLook } from './words.js';
import { droppedPlants, trimGaps, mayPersist, photoSource, shown, linkMembers, afterMove, repeatClick, withQuery, presetPlace } from './logic.js';
import { climates } from '../../data/climates.ts';
import { profileSVG } from './draw.js';

const data = JSON.parse(document.getElementById('ct-data').textContent);
const W = makeWords(data.strings, data.lang);
const { T, P } = W;
const lang = data.lang;
const app = document.getElementById('ct-app');
const dlg = document.getElementById('ct-dialog');
const toastEl = document.getElementById('ct-toast');
const sayEl = document.getElementById('ct-say');
const head = document.getElementById('ct-head');
const printEl = document.getElementById('ct-print');
const phoneMQ = matchMedia('(max-width: 639px)');
const phone = () => phoneMQ.matches;
const STORE = 'canopi-consortium';
// The core's lists: regions in the page language's alphabetical order, the site answers as the core has them,
// and the climates in the site picker's order (src/data/climates.ts, seam m5).
const REGIONS = [...regions].sort((a, b) => W.region(a).localeCompare(W.region(b), data.lang));
const SITE_OPTIONS = { light: lights, soil: soils, water: waters, room: rooms };
const CLIMATES = climates.filter((c) => siteClimates.includes(c));
// "No match": the one looser answer each site question offers.
const relaxTo = (k) => ({ light: 'part', soil: 'unsure', water: 'unsure', room: S.site.room === 'small' ? 'large' : 'field' })[k];

// ---------- Icons ----------
const svg = (body, size = 16) => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const I = {
  search: svg(`<circle cx="7" cy="7" r="4.6" ${st}/><path d="M10.5 10.5 14 14" ${st}/>`, 18),
  close: svg(`<path d="M4 4l8 8M12 4l-8 8" ${st}/>`),
  caret: svg(`<path d="M4.5 6 8 9.5 11.5 6" ${st}/>`, 12),
  danger: svg(`<path d="M5.2 1.5h5.6l3.7 3.7v5.6l-3.7 3.7H5.2l-3.7-3.7V5.2z" ${st}/><path d="M8 4.6v4.2" ${st}/><circle cx="8" cy="11.2" r="0.95" fill="currentColor"/>`, 15),
  warn: svg(`<path d="M8 1.8 15 14H1z" ${st}/><path d="M8 6v3.9" ${st}/><circle cx="8" cy="11.9" r="0.9" fill="currentColor"/>`, 15),
  unknown: svg(`<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.4 2"/><path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" ${st}/><circle cx="8" cy="11.6" r="0.85" fill="currentColor"/>`, 15),
  check: svg(`<circle cx="8" cy="8" r="6.4" ${st}/><path d="M5 8.2l2 2 4-4.2" ${st}/>`, 15),
  pin: svg(`<path d="M5.5 2h5l-.8 4 2.3 2.4H4l2.3-2.4z" ${st}/><path d="M8 8.4V14" ${st}/>`),
  pinOn: svg(`<path d="M5.5 2h5l-.8 4 2.3 2.4H4l2.3-2.4z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 8.4V14" ${st}/>`),
  swap: svg(`<path d="M2.5 5.5h10l-2.5-2.5M13.5 10.5h-10l2.5 2.5" ${st}/>`),
  remove: svg(`<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" ${st}/>`),
  info: svg(`<circle cx="8" cy="8" r="6.4" ${st}/><path d="M8 7.2v4" ${st}/><circle cx="8" cy="4.9" r="0.9" fill="currentColor"/>`),
  lock: svg(`<rect x="3.5" y="7" width="9" height="6.5" rx="1.5" ${st}/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" ${st}/>`, 14),
  link: svg(`<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" ${st}/>`),
  printer: svg(`<path d="M4.5 6V2h7v4M4.5 11.5h-2V6.5h11v5h-2M4.5 9.5h7V14h-7z" ${st}/>`),
  sun: svg(`<circle cx="8" cy="8" r="2.9" ${st}/><path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M3.4 12.6l1.2-1.2M11.4 4.6l1.2-1.2" ${st}/>`, 18),
  book: svg(`<path d="M2.5 3.5c2-.8 3.8-.8 5.5.5 1.7-1.3 3.5-1.3 5.5-.5v9c-2-.8-3.8-.8-5.5.5-1.7-1.3-3.5-1.3-5.5-.5z M8 4v9" ${st}/>`, 18),
};
const JOB_ICON = {
  feeds_you: `<circle cx="8" cy="9.2" r="4.4" ${st}/><path d="M8 4.8c0-1.6.8-2.4 2.4-2.8M8 4.8c-.5-1-1.4-1.4-2.4-1.3" ${st}/>`,
  feeds_soil: `<path d="M1.6 6.4h12.8M8 6.4v6.4M8 9.6l-2.4 2.4M8 8.8l2.4 2" ${st}/><path d="M8 6.4c0-2 1.2-3.2 3.2-3.6M8 6.4C7.6 4.8 6.4 4 4.8 4" ${st}/>`,
  mulch: `<path d="M2.4 12c2.4-1.2 3.2-.8 5.6 0s3.2 1.2 5.6 0M4 10c1.2-2.4 3.2-3.6 5.6-3.6-.4 2.4-2.4 3.8-5.6 3.6zM9.6 6.4c.6-1.4 1.6-2.4 3.2-2.8" ${st}/>`,
  ground: `<path d="M1.6 12h12.8M2.8 12c0-1.8 1.3-2.8 2.8-2.8S8 10.2 8 12m0 0c0-1.8 1.3-2.8 2.8-2.8s2.4 1 2.4 2.8" ${st}/>`,
  helpers: `<circle cx="8" cy="8" r="1.6" ${st}/><path d="M8 6.4V3.6M8 9.6v2.8M6.4 8H3.6M9.6 8h2.8M6.9 6.9 5 5M9.1 9.1 11 11M6.9 9.1 5 11M9.1 6.9 11 5" ${st}/>`,
  shelter: `<path d="M8 2 12.8 4v3.6c0 3.2-2.1 5.3-4.8 6.4-2.7-1.1-4.8-3.2-4.8-6.4V4z" ${st}/>`,
};
const jobIcon = (j, size = 20) => svg(JOB_ICON[j], size);

// ---------- State ----------
let manifest = null, labels = null, cell = null;
const fresh = () => ({
  climate: null, climateSource: null, country: null, region: null, cellRegion: null,
  ratherNot: false, pickFor: null, editClimate: false,
  site: { ...DEFAULT_SITE }, status: 'boot', members: [], kept: new Set(), removed: new Set(), gaps: [],
  view: 'layers', explain: null, notice: null, dropped: 0, guidePlant: null, guideId: null, restoredAt: null, pending: null,
});
let S = fresh();
let O = null; // the open sheet: { type, id, filter, back, confirm }
let addQuery = '', addJob = '', addLayer = '';
let countryQuery = '';
let focusNext = null, lastRemoved = null, undoStart = null, toastTimer = 0, lastRemoveAt = null;
const SWAP_STEP = 8;
let swapMore = 0;

const taxonOf = (id) => cell?.taxa.find((t) => t.id === id) ?? null;
const stratumOf = (t) => t.stratum?.value ?? 'none';
const limit = () => SIZE_LIMIT[S.site.room];
const cellRegion = () => S.cellRegion ?? S.region;
const cellLabel = () => W.cell(S.climate, cellRegion());
const whereLabel = () => (S.country ? W.country(S.country) : W.region(S.region));
const stratumLabel = (s) => T('stratum.' + s);
const name = (t) => { const n = plantName(t, lang); return n.lang ? `<span lang="en">${esc(n.text)}</span>` : esc(n.text); };
const nameText = (t) => plantName(t, lang).text;
const keptList = () => [...S.kept];
// The climate chosen elsewhere on the site (src/scripts/climate.js), when it is one the tool knows.
const siteClimate = () => (siteClimates.includes(document.documentElement.dataset.climate) ? document.documentElement.dataset.climate : null);

// The members with their flags (evaluate never refills), cached until the state changes.
let evalKey = '', evalOut = null;
function evaluated() {
  const key = [S.members.join(), keptList().join(), S.site.light, S.site.soil, S.site.water, S.site.room, S.country, cell?.climate_zone, cell?.region].join('|');
  if (key !== evalKey) { evalKey = key; evalOut = evaluate(cell, S.members, { site: S.site, kept: keptList(), country: S.country }); }
  return evalOut;
}
const flagsById = () => new Map(evaluated().members.map((m) => [m.taxon.id, m.flags]));
const members = () => evaluated().members.map((m) => m.taxon);
const height = (t) => t.traits.height_m?.max ?? 0;
const rank = (t) => (t.stratum ? strata.indexOf(t.stratum.value) : 9) * 1000 - height(t);
const ordered = () => [...members()].sort((a, b) => rank(a) - rank(b) || a.canonical_name.localeCompare(b.canonical_name));
const numbering = () => new Map(ordered().map((t, i) => [t.id, i + 1]));
// The jobs nobody does come from the core (evaluate's gaps); the layers in use from the members.
const jobGaps = () => evaluated().gaps;
const strataIn = (list) => new Set(list.filter((t) => t.stratum).map((t) => t.stratum.value));
// How many plants "Fill the free places" would add now.
function fillable() {
  if (!cell || S.members.length >= limit()) return 0;
  return suggest(cell, { site: S.site, kept: [...new Set([...S.members, ...S.kept])], removed: [...S.removed], country: S.country }).members.length - S.members.length;
}

// ---------- Warnings: one reading for every surface (card, Swap, Add, details, print) ----------
function misfitText(t, key) {
  const tr = t.traits, v = S.site[key];
  if (key === 'light') return T('misfit.light.' + v);
  if (key === 'soil') return T('misfit.soil.' + v, { min: tr.soil_ph?.min != null ? W.num(tr.soil_ph.min) : '?', max: tr.soil_ph?.max != null ? W.num(tr.soil_ph.max) : '?' });
  if (key === 'water') return T('misfit.water.' + v);
  const size = Math.max(tr.height_m?.max ?? 0, tr.width_max_m ?? 0);
  return T('misfit.room.' + v, { w: W.num(size) });
}
const otherOf = (c, t) => (c.a.id === t.id ? c.b : c.a);
// severe: their own chips (kind decides the colour); soft: merged cautions; unknown: merged unchecked.
function warnParts(t, flags) {
  const severe = [], soft = [], unk = [];
  const tox = t.warnings.toxicity;
  // copy-m18: slight toxicity is a caution (soft chip), not the red danger mark.
  if (tox && tox.level !== 'None') severe.push({ cls: tox.level === 'Slight' ? 'soft' : 'danger', text: T('tox.' + tox.level), look: tox.level !== 'Slight' });
  if (flags.invasive === true) severe.push({ cls: 'warning', text: esc(T('invHere', { country: W.country(S.country) })), look: true });
  for (const c of flags.conflicts) severe.push({ cls: isSerious(c) ? 'warning' : 'soft', text: T('conflict', { other: name(otherOf(c, t)) }), look: isSerious(c), conflict: c });
  for (const k of flags.misfits) severe.push({ cls: 'warning', text: esc(misfitText(t, k)), look: true, misfit: k });
  if (t.warnings.allelopathic === true) soft.push(T('c.allelo'));
  if (t.warnings.weed_potential === true) soft.push(T('c.spreads'));
  const inv = invasiveCountries(t);
  if (inv?.length) {
    const others = S.country ? inv.filter((c) => c !== S.country).length : inv.length;
    if (others) soft.push(S.country ? P('invElse', others) : P('invCount', others));
  }
  if (!tox) unk.push(T('u.tox'));
  if (t.warnings.invasive_in == null) unk.push(T('u.inv'));
  if (t.warnings.allelopathic == null) unk.push(T('u.allelo'));
  if (t.warnings.weed_potential == null) unk.push(T('u.spreads'));
  if (t.functions == null) unk.push(jobsOf(t).length ? T('u.jobsOther') : T('u.jobs'));
  return { severe, soft, unk };
}
function chipsHTML(t, flags) {
  const { severe, soft, unk } = warnParts(t, flags);
  const out = severe.map((w) => `<span class="warn warn-${w.cls}">${w.cls === 'danger' ? I.danger : I.warn}<span>${w.text}</span></span>`);
  if (soft.length) out.push(`<span class="warn warn-soft">${I.warn}<span>${esc(T('cautions', { list: soft.join(' · ') }))}</span></span>`);
  if (unk.length) out.push(`<span class="warn warn-unknown">${I.unknown}<span>${esc(T('unchecked', { list: W.list(unk) }))}</span></span>`);
  return out.length ? `<div class="warns">${out.join('')}</div>` : '';
}
// The same words in plain text, one per warning, for print (one line each) and the Swap/Add
// confirmation (a list in the page language): no "; " that reads wrong in Japanese (live m4).
function warnPlain(t, flags, all = true) {
  const { severe, soft, unk } = warnParts(t, flags);
  const out = severe.filter((w) => all || w.cls !== 'soft').map((w) => w.text);
  if (all && soft.length) out.push(esc(T('cautions', { list: soft.join(' · ') })));
  if (all && unk.length) out.push(esc(T('unchecked', { list: W.list(unk) })));
  return out;
}

// ---------- Small parts ----------
const sw = (s) => `<span class="sw" data-s="${s}"></span>`;
const fk = (k) => `data-fk="${esc(k)}"`;
const btn = (cls, act, v, label, extra = '') => `<button class="${cls}" type="button" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ''} ${extra}>${label}</button>`;
function timeHTML1(t) { const w = W.timeWords(t); return esc(w.plain) + (w.term ? ` <span class="apt">· ${esc(w.term)}</span>` : ''); }
function reasonHTML(t) {
  if (!t.reason) return '';
  if (t.reason[lang]) return esc(t.reason[lang]);
  return `<span lang="en">${esc(t.reason.en)}</span> <span class="muted">(${esc(T('inEnglish'))})</span>`;
}
const guide = (slug) => data.guides[slug];
const guideLink = (slug, cls = '', inner) => { const g = guide(slug); return g ? `<a class="${cls}" href="${g.url}"${g.lang !== lang ? ` hreflang="${g.lang}"` : ''}>${inner(g.lang !== lang ? `<span lang="${g.lang}">${esc(g.title)}</span>` : esc(g.title))}</a>` : ''; };
const basisText = () => [T('basis.light.' + S.site.light), T('basis.soil.' + S.site.soil), T('basis.water.' + S.site.water), T('basis.room.' + S.site.room)].join(' · ');

// ---------- Setup ----------
function coveredRegions(climate) { return manifest.cells.filter((c) => c.climate_zone.toLowerCase() === climate).map((c) => c.region); }
const hasCell = (region) => !!(S.climate && cellFor(manifest, S.climate, region));
function mark(regions) {
  if (!S.climate) return '';
  return regions.some(hasCell) ? `<span class="mark mark-has">${I.check}${esc(T('hasPlants'))}</span>` : `<span class="mark mark-no">${esc(T('noPlants'))}</span>`;
}
function climateChoices() {
  return `<ul class="climate-choices" role="list">${CLIMATES.map((c) => {
    const rs = coveredRegions(c), on = S.climate === c;
    return `<li><button class="climate-choice" type="button" data-act="climate" data-v="${c}" aria-pressed="${on}" ${fk('cl-' + c)}>
      <strong>${on ? `<span class="chosen-check">${I.check}</span>` : ''}${esc(W.climate(c))}<span class="cover-pill" data-covered="${rs.length > 0}">${esc(rs.length ? T('covered', { regions: W.list(rs.map(W.region)) }) : T('notYet'))}</span></strong>
      <span>${esc(data.strings['climate.' + c + '.about'])}</span><span class="places">${esc(data.strings['climate.' + c + '.places'])}</span></button></li>`;
  }).join('')}</ul>`;
}
let browserCountry = null;
for (const l of navigator.languages ?? [navigator.language]) {
  try { const r = new Intl.Locale(l).maximize().region; if (r) { browserCountry = r; break; } } catch {}
}
function countryMatches() {
  const q = fold(countryQuery.trim());
  if (!q) return [];
  return Object.keys(manifest.country_regions).map((c) => ({ c, n: W.country(c) })).filter((x) => x.n !== x.c && fold(x.n).includes(q))
    .sort((a, b) => fold(a.n).indexOf(q) - fold(b.n).indexOf(q) || a.n.localeCompare(b.n, lang)).slice(0, 6);
}
function countryList() {
  const list = countryMatches();
  if (!countryQuery.trim()) return '';
  if (!list.length) return `<p class="place-note">${esc(T('noCountry'))}</p>`;
  return `<ul class="options" role="list">${list.map((x) => `<li>${btn('option', 'country', x.c, `<span>${esc(x.n)}</span><small>${esc(W.list(regionsOf(manifest, x.c).map(W.region)))}${mark(regionsOf(manifest, x.c))}</small>`, fk('co-' + x.c))}</li>`).join('')}</ul>`;
}
function countryPicker() {
  if (S.ratherNot) {
    return `<p class="field-label">${esc(T('regionInstead'))}</p>
      <ul class="region-choices" role="list">${REGIONS.map((r) => `<li><button class="climate-choice" type="button" data-act="region" data-v="${r}" aria-pressed="${S.region === r && !S.country}" ${fk('rg-' + r)}><strong>${esc(W.region(r))}</strong><span>${esc(T('region.' + r + '.hint'))}</span>${mark([r])}</button></li>`).join('')}</ul>
      <p class="place-note">${esc(T('noCountryNote'))}</p>
      <p>${btn('link-button', 'rather-not', '0', esc(T('backToCountry')), fk('back-country'))}</p>`;
  }
  if (S.pickFor) {
    const k = S.pickFor;
    return `<p class="field-label">${esc(T('whichPart', { country: W.country(k) }))}</p>
      <ul class="region-choices" role="list">${regionsOf(manifest, k).map((r) => `<li><button class="climate-choice" type="button" data-act="country-region" data-v="${r}" ${fk('cr-' + r)}><strong>${esc(data.strings['part.' + k + '.' + r] ?? W.region(r))}</strong><span>${esc(W.region(r))}</span>${mark([r])}</button></li>`).join('')}</ul>
      <p>${btn('link-button', 'other-country', null, esc(T('otherCountry')), fk('other-country'))}</p>`;
  }
  const sug = browserCountry && manifest.country_regions[browserCountry] && S.country !== browserCountry
    ? `<button class="suggest-country" type="button" data-act="country" data-v="${browserCountry}" ${fk('suggest')}><span class="flagless" aria-hidden="true">${browserCountry}</span><span><strong>${esc(W.country(browserCountry))}</strong><small>${esc(T('fromBrowser'))}</small>${mark(regionsOf(manifest, browserCountry))}</span><span class="go">${esc(T('useIt'))}</span></button>` : '';
  return `${sug}<div class="field"><label for="ct-country-q">${esc(T('searchCountry'))}</label>
    <div class="search">${I.search}<input id="ct-country-q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('countryPlaceholder'))}" value="${esc(countryQuery)}" data-input="country" ${fk('country-q')}></div>
    <div id="ct-country-list">${countryList()}</div></div>
    <p class="or-line">${btn('link-button', 'rather-not', '1', esc(T('ratherNot')), fk('rather'))}</p>`;
}
const privacy = () => `<p class="privacy">${I.lock}<span>${esc(T('privacy'))}</span></p>`;
// The guide's plant, found in a cell of the guide's climate before any place is chosen, so the note
// names it as the tool will (live m3); with its scientific name, which the guide's link carried, so a
// guide's "Guásimo" and the cell's "Bastard cedar" read as one plant (seam m2).
let guideTaxon = null;
async function findGuidePlant() {
  const plant = S.guidePlant;
  if (!plant || !S.climate || !manifest || guideTaxon?.plant === plant) return;
  for (const c of manifest.cells.filter((c) => c.climate_zone.toLowerCase() === S.climate)) {
    let found = null;
    try { found = taxonByName(await loadCell(c.file), plant); } catch {}
    if (found) { guideTaxon = { plant, taxon: found }; if (S.guidePlant === plant && S.status === 'setup') render(); return; }
  }
}
function guideNote() {
  if (!S.guidePlant) return '';
  const t = (S.guideId && taxonOf(S.guideId)) || (guideTaxon?.plant === S.guidePlant ? guideTaxon.taxon : null);
  const plant = t ? name(t) + (nameText(t) !== t.canonical_name ? W.paren(`<i>${esc(t.canonical_name)}</i>`) : '') : `<i>${esc(S.guidePlant)}</i>`;
  // m4: the guide set the climate only when its link named one.
  return `<div class="note note-guide">${I.book}<p>${S.climateSource === 'guide' && S.climate ? T('fromGuide', { plant, climate: esc(W.climate(S.climate)) }) : T('fromGuidePlant', { plant })}</p></div>`;
}
function setupHTML() {
  const editing = !S.climate || S.editClimate;
  const step1 = editing
    ? `<section class="step" data-done="${!!S.climate}" aria-labelledby="ct-st1"><div class="step-head"><span class="step-num">1</span><h2 id="ct-st1">${esc(T('step1'))}</h2><p>${esc(T('step1.lede'))}</p></div>${climateChoices()}</section>`
    : `<section class="step step-collapsed" data-done="true" aria-labelledby="ct-st1"><div class="step-summary"><span class="step-num step-num-done">${I.check}</span>
        <div><h2 id="ct-st1" class="field-label">${esc(T('step1'))}</h2><strong>${esc(W.climate(S.climate))}</strong>${S.climateSource ? `<small>${esc(T(S.climateSource === 'guide' ? 'climateFromGuide' : 'climateFromSite'))}</small>` : ''}</div>
        ${btn('button button-secondary button-small', 'edit-climate', null, esc(T('change')), fk('edit-climate'))}</div></section>`;
  return `<div class="setup">${guideNote()}${step1}
    <section class="step" data-done="${!!S.region}" aria-labelledby="ct-st2"><div class="step-head"><span class="step-num">2</span><h2 id="ct-st2">${esc(T('step2'))}</h2><p>${esc(T('step2.lede'))}</p></div>
      ${countryPicker()}${privacy()}</section></div>`;
}

// ---------- Result ----------
function seg(key) {
  const hint = key === 'soil' ? T('soilHint') : key === 'room' ? T('site.room.' + S.site.room + '.hint') : '';
  return `<fieldset class="seg"><legend>${esc(T('site.' + key))}</legend><div class="seg-options">${SITE_OPTIONS[key].map((o) => `<label class="seg-option"><input type="radio" name="ct-${key}${O ? '-d' : ''}" value="${o}" ${S.site[key] === o ? 'checked' : ''} data-site="${key}" ${fk(`site-${key}-${o}`)}><span>${esc(T(`site.${key}.${o}`))}</span></label>`).join('')}</div>${hint ? `<p class="seg-hint">${esc(hint)}</p>` : ''}</fieldset>`;
}
const siteFields = () => `<div class="site-fields">${Object.keys(SITE_OPTIONS).map(seg).join('')}</div>`;
function placeChips() {
  return `<div class="place-chips">
    <button class="chip-button" type="button" data-act="open-place" data-v="climate" aria-haspopup="dialog" ${fk('pc-climate')}><span class="vh">${esc(T('step1'))}: </span><strong>${esc(W.climate(S.climate))}</strong>${I.caret}</button>
    <button class="chip-button" type="button" data-act="open-place" data-v="country" aria-haspopup="dialog" ${fk('pc-country')}><span class="vh">${esc(T('step2'))} </span><strong>${esc(whereLabel())}</strong>${I.caret}</button></div>`;
}
function asideHTML() {
  if (phone()) return '';
  const result = S.status === 'ready' || S.status === 'nomatch';
  return `<aside class="aside" aria-label="${esc(T('yourPlace'))}">
    <div class="panel"><h2 class="panel-title">${esc(T('yourPlace'))}</h2>${placeChips()}
      <p class="place-note">${esc(S.country ? W.region(S.region) : T('noCountryNote'))}</p></div>
    ${result ? `<div class="panel" id="ct-site-panel"><h2 class="panel-title">${esc(T('yourSite'))}</h2><p class="seg-hint">${esc(T('siteOptional'))}</p>${siteFields()}</div>
    <div class="panel"><h2 class="panel-title">${esc(T('grow'))}</h2>
      ${btn('button button-secondary grow-button', 'open-add', 'grow', `${I.search}<span>${esc(T('growHint'))}</span>`, fk('grow'))}
      ${fillable() ? `${btn('button button-secondary button-small', 'fill', null, esc(T('fill')), fk('fill-aside'))}<p class="seg-hint">${esc(T('fillNote'))}</p>` : ''}
    </div>` : ''}
  </aside>`;
}
const resultTitle = (text) => `<h2 id="ct-result-title" tabindex="-1">${esc(text)}</h2>`;
function basisHTML() {
  return `<p class="basis"><span>${esc(T('basis', { site: basisText() }))}</span> ${btn('link-button', phone() ? 'open-site' : 'focus-site', null, esc(T('basisChange')), fk('basis'))}</p>`;
}
function attentionHTML(flags) {
  const look = ordered().filter((t) => needsLook(t, flags.get(t.id)));
  if (!look.length) return '';
  const items = look.map((t) => {
    const f = flags.get(t.id), why = warnParts(t, f).severe.filter((w) => w.look).map((w) => w.text);
    // A plant that does not fit the site (often a guide's or a kept one) says what to do next: the
    // site answer it would fit, and Swap (usability).
    const next = f.misfits.length ? `<span class="att-next">${f.misfits.map((k) => { const v = fitsWith(t, k); return v ? btn('link-button', 'fit', `${k}:${v}`, esc(T('nm.try', { value: T(`site.${k}.${v}`) })), fk(`fit-${t.id}-${k}`)) : ''; }).join('')}${btn('link-button', 'swap', t.id, esc(T('swap')), `aria-haspopup="dialog" aria-label="${esc(T('swap'))}: ${esc(nameText(t))}" ${fk('asw-' + t.id)}`)}</span>` : '';
    return `<span class="att-item">${btn('link-button', 'goto', t.id, name(t))} (${W.list(why)})${next}</span>`;
  });
  return `<div class="attention">${I.warn}<p><strong>${esc(P('attention', look.length))}</strong> ${items.join(' · ')}</p></div>`;
}
// The nearest other answer to a site question that a plant fits ("Not sure" is no answer to offer).
function fitsWith(t, key) {
  const opts = SITE_OPTIONS[key], at = opts.indexOf(S.site[key]);
  const order = opts.map((o, i) => [o, Math.abs(i - at)]).filter(([o]) => o !== S.site[key] && o !== 'unsure').sort((a, b) => a[1] - b[1]).map(([o]) => o);
  return order.find((o) => !fits(t, { ...S.site, [key]: o }).misfits.includes(key)) ?? null;
}
// Phone has no side panel: with no free place, the "I want to grow…" search sits under the views
// (growRowHTML), so the first screen still reaches the plants (M4).
function growRowHTML() {
  if (!phone() || Math.max(0, limit() - S.members.length)) return '';
  return `<div class="free-row grow-row"><div class="free-actions">${btn('button button-secondary grow-button', 'open-add', 'grow', `${I.search}<span>${esc(T('grow'))}</span>`, fk('grow'))}</div></div>`;
}
function freeRowHTML(can) {
  const free = Math.max(0, limit() - S.members.length);
  if (!free) return '';
  return `<div class="free-row"><p>${esc(can ? P('free', free) : P('freeNone', free))}</p>
    <div class="free-actions">${btn('button button-secondary button-small', 'open-add', 'grow', `${I.search}<span>${esc(T('findPlant'))}</span>`, fk('find-free'))}
    ${can ? btn('button button-primary button-small', 'fill', null, esc(T('fill')), fk('fill')) : ''}</div></div>`;
}
// A result from another region's cell: the same words on screen and on paper (M6). Without a
// country there is no invasive check where the user gardens, and the label says so (M5).
function borrowedWords() {
  return { title: T('borrowed', { cell: cellLabel() }), text: `${T('borrowedText', { where: whereLabel() })} ${S.country ? T('borrowedInv', { country: W.country(S.country) }) : T('borrowedNoInv')}` };
}
function notices(can) {
  let out = '';
  if (S.notice === 'oldlink') out += `<div class="note note-old" role="status">${I.info}<div><p><strong>${esc(T('oldLink.title'))}</strong></p><p>${esc(P('oldLink.text', S.dropped))}</p><div class="note-actions">${can ? btn('button button-secondary button-small', 'fill', null, esc(T('fill'))) : ''}${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  if (S.notice === 'restored') {
    const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(S.restoredAt));
    out += `<div class="note note-old" role="status">${I.info}<div><p>${esc(T('restored', { date }))}</p><div class="note-actions">${btn('link-button', 'start-over', null, esc(T('startFresh')), fk('fresh'))}${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  }
  if (S.notice === 'guide') out += guideNote();
  if (S.notice === 'guideMissing') out += `<div class="note note-old" role="status">${I.info}<div><p>${T('guideMissing', { plant: `<i>${esc(S.guidePlant)}</i>` })}</p><div class="note-actions">${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  if (S.cellRegion) { const b = borrowedWords(); out += `<div class="note note-borrowed">${I.warn}<div><p><strong>${esc(b.title)}</strong> ${esc(b.text)}</p><div class="note-actions">${btn('link-button', 'open-place', 'country', esc(T('change')))}</div></div></div>`; }
  return out;
}
function mainHTML() {
  if (S.status === 'loading') return `<div class="skeleton" aria-busy="true"><p class="status-line" role="status" id="ct-result-title" tabindex="-1"><span class="spinner" aria-hidden="true"></span>${esc(T('loading', { cell: cellLabel() }))}</p>
    <div class="sk" style="height:46px;width:60%"></div><div class="sk" style="height:22px"></div><div class="sk" style="height:44px;max-width:300px;border-radius:999px"></div><div class="sk sk-draw"></div><div class="sk" style="height:84px"></div></div>`;
  if (S.status === 'error') return `<div class="callout" role="alert">${resultTitle(T('errorTitle'))}<p>${esc(T('errorText'))}</p><div class="actions">${btn('button button-primary', 'retry', null, esc(T('retry')), fk('retry'))}</div></div>`;
  if (S.status === 'notcovered') return notCoveredHTML();
  if (S.status === 'nomatch') return `${notices(fillable())}${phone() ? placeChips() : ''}${noMatchHTML()}${basisHTML()}`;
  const ms = members(), flags = flagsById(), can = fillable(), jobsDone = jobs.length - jobGaps().length;
  const lastEnd = Math.max(-1, ...ms.map((t) => (t.phases ? phases.indexOf(t.phases.end) : -1)));
  return `${notices(can)}
    <div class="result-head"><div>${resultTitle(T('yourConsortium'))}<p class="result-sub">${esc(cellLabel())}${S.country ? ' · ' + esc(W.country(S.country)) : ''}</p></div>${phone() ? placeChips() : ''}</div>
    <p class="summary-strip"><span><b>${esc(P('sizeLine.' + S.site.room, ms.length))}</b></span><span>${esc(T('sumLayers', { n: strataIn(ms).size }))}</span><span>${esc(T('sumJobs', { n: jobsDone }))}</span>${lastEnd >= 0 ? `<span>${esc(T('sumTime', { end: T(W.phaseKey(lastEnd, 'to')) }))}</span>` : ''}</p>
    ${basisHTML()}${attentionHTML(flags)}${freeRowHTML(can)}
    <div class="tabs" role="tablist" aria-label="${esc(T('yourConsortium'))}">${['layers', 'time', 'jobs'].map((v) => `<button class="tab" role="tab" type="button" id="ct-tab-${v}" aria-selected="${S.view === v}" aria-controls="ct-panel" tabindex="${S.view === v ? 0 : -1}" data-act="view" data-v="${v}" ${fk('tab-' + v)}>${esc(T('tab.' + v))}</button>`).join('')}</div>
    <div role="tabpanel" id="ct-panel" aria-labelledby="ct-tab-${S.view}" class="tabpanel">${S.view === 'layers' ? layersHTML(flags) : S.view === 'time' ? timeHTML(flags) : jobsHTML()}</div>${growRowHTML()}
    <div class="result-foot" role="group" aria-label="${esc(T('shareMenu'))}">${btn('button button-secondary button-small', 'share', null, `${I.link}${esc(T('share'))}`, fk('share'))}${btn('button button-secondary button-small', 'print', null, `${I.printer}${esc(T('print'))}`, fk('print'))}${btn('link-button quiet', 'start-over', null, esc(T('startOver')), fk('start-over'))}</div>`;
}
function notCoveredHTML() {
  const same = manifest.cells.filter((c) => c.climate_zone.toLowerCase() === S.climate);
  const where = whereLabel();
  return `<div class="callout">${resultTitle(T('nc.title', { climate: W.climate(S.climate), region: where }))}
    <p>${esc(P('nc.text', manifest.cells.length))}</p>
    <ul class="covered-plain">${manifest.cells.map((c) => `<li><strong>${esc(W.cell(c.climate_zone.toLowerCase(), c.region))}</strong></li>`).join('')}</ul>
    ${same.length ? `<p class="place-note">${esc(T('nc.optNote', { where }))} ${esc(S.country ? T('borrowedInv', { country: W.country(S.country) }) : T('borrowedNoInv'))}</p><div class="actions">${same.map((c) => btn('button button-primary', 'opt-in', c.region, esc(T('nc.optIn', { cell: W.cell(S.climate, c.region) })), fk('optin-' + c.region))).join('')}</div>` : `<p class="place-note">${esc(T('nc.noneClimate'))}</p>`}
    <div class="actions">${btn('button button-secondary', 'open-place', 'country', esc(T('nc.change')), fk('nc-change'))}<a class="text-link" href="${data.contact}">${esc(T('nc.ask'))}</a></div></div>`;
}
// For each site answer, how many plants it rules out on its own.
function siteCounts() {
  const out = [];
  for (const key of ['light', 'soil', 'water', 'room']) {
    if (S.site[key] === DEFAULT_SITE[key] && key !== 'light' && key !== 'room') continue;
    if (S.site[key] === 'unsure' || S.site[key] === 'average' || (key === 'room' && S.site.room === 'field')) continue;
    const one = { ...DEFAULT_SITE, room: 'field', [key]: S.site[key] };
    const n = cell.taxa.filter((t) => !fits(t, one).ok).length;
    if (n) out.push({ key, n });
  }
  return out.sort((a, b) => b.n - a.n);
}
function noMatchHTML() {
  return `<div class="callout">${resultTitle(T('nm.title'))}<p>${esc(T('nm.text'))}</p>
    <ul class="relax" role="list">${siteCounts().map((c) => {
      const value = T(`site.${c.key}.${relaxTo(c.key)}`);
      return `<li><span>${esc(T('nm.rule', { label: T('site.' + c.key), value: T(`site.${c.key}.${S.site[c.key]}`), n: W.num(c.n), total: W.num(cell.taxa.length) }))}</span>${btn('button button-secondary button-small', 'relax', c.key, esc(c.key === 'light' && S.site.light === 'shade' ? T('nm.tryLight', { value }) : T('nm.try', { value })), fk('relax-' + c.key))}</li>`;
    }).join('')}</ul>
    <div class="actions">${btn('button button-secondary', 'open-add', 'grow', `${I.search}${esc(T('growHint'))}`, fk('nm-add'))}</div></div>`;
}

// ---------- Layers ----------
// A "?" that opens an explanation in place: with its question written out beside each view's title
// (easy to find), or as a bare "?" with the question as its name beside a plant's time words.
function explainBtn(id, label, text = false) {
  const named = text ? `><span class="q" aria-hidden="true">?</span><span>${esc(label)}</span>` : ` aria-label="${esc(label)}">?`;
  return `<button class="explain-btn${text ? ' explain-btn-text' : ''}" type="button" data-act="explain" data-v="${id}" aria-expanded="${S.explain === id}" aria-controls="ct-ex-${id}" ${fk('ex-' + id)}${named}</button>`;
}
// id: stratum, job, phase, or phase-<taxon id> for the one under a plant row.
function explainPanel(id) {
  if (S.explain !== id) return '';
  const kind = id.startsWith('phase') ? 'phase' : id;
  const body = kind === 'stratum'
    ? `<h4>${esc(T('ex.stratum.title'))}</h4><p>${esc(T('ex.stratum'))}</p><ul class="strata-mini" role="list">${strata.map((s) => `<li>${sw(s)}<span><b>${esc(stratumLabel(s))}</b> · ${esc(T('stratum.' + s + '.about'))}</span></li>`).join('')}</ul>`
    : kind === 'job'
      ? `<h4>${esc(T('ex.job.title'))}</h4><p>${esc(T('ex.job'))}</p>`
      : `<h4>${esc(T('ex.phase.title'))}</h4><p>${esc(T('ex.phase'))}</p>`;
  const label = { stratum: 'whatStratum', phase: 'whatPhase', job: 'whatJob' }[kind];
  return `<div class="explain-panel" id="ct-ex-${id}" role="region" aria-label="${esc(T(label))}">${body}${guideLink(data.explainGuide, 'guide-link', (title) => `${esc(T('readGuide'))}: ${title}`)}<button class="pop-close" type="button" data-act="explain" data-v="${id}" aria-label="${esc(T('close'))}">${I.close}</button></div>`;
}
function profileHTML(flags, print = false) {
  const placed = ordered().filter((t) => t.stratum), nums = numbering();
  const small = phone() && !print;
  const title = `${T('layersTitle')}: ${W.list(placed.map((t) => `${nums.get(t.id)} ${nameText(t)} (${stratumLabel(t.stratum.value)})`))}`;
  const p = profileSVG(placed, { phone: small || print, id: print ? 'ct-sun-p' : 'ct-sun', title, strataLabel: (s) => `${stratumLabel(s)} · ${T('stratum.' + s + '.short')}` });
  // Desktop: names under their columns, two rows when columns are narrow. Phone and print: numbers
  // under the columns, and a numbered key in reading order below (labels never overlap).
  const stagger = placed.length > 8;
  const lw = (stagger ? 2 : 1) * p.colPct;
  const labels = p.columns.map(({ t, center }, i) => {
    const look = needsLook(t, flags.get(t.id)), s = t.stratum.value;
    if (small || print) return `<span class="plabel plabel-num" style="left:${(center - p.colPct / 2).toFixed(2)}%;width:${p.colPct.toFixed(2)}%" aria-hidden="true"><span class="num" data-s="${s}">${nums.get(t.id)}</span></span>`;
    const left = Math.max(0, center - lw / 2), w = Math.min(100, center + lw / 2) - left;
    return `<button class="plabel" type="button" data-act="details" data-v="${t.id}" ${fk('pl-' + t.id)} style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%;top:${stagger ? (i % 2) * 64 : 0}px"><span class="plabel-top"><span class="num" data-s="${s}" aria-hidden="true">${nums.get(t.id)}</span>${look ? `<span class="plook">${I.warn}<span class="vh">${esc(T('needsLook'))}</span></span>` : ''}</span><span class="pname">${name(t)}</span><span class="vh">, ${esc(stratumLabel(s))}</span></button>`;
  }).join('');
  const key = small || print ? `<ol class="pkey" aria-label="${esc(T('drawingKey'))}">${placed.map((t) => `<li>${print ? `<span class="num" data-s="${t.stratum.value}" aria-hidden="true">${nums.get(t.id)}</span><span>${name(t)}</span>` : btn('pkey-item', 'details', t.id, `<span class="num" data-s="${t.stratum.value}" aria-hidden="true">${nums.get(t.id)}</span><span>${name(t)}</span>${needsLook(t, flags.get(t.id)) ? `<span class="plook">${I.warn}<span class="vh">${esc(T('needsLook'))}</span></span>` : ''}`, fk('pk-' + t.id))}</li>`).join('')}</ol>` : '';
  const unplaced = members().filter((t) => !t.stratum);
  return `<figure class="profile"${small || print ? '' : ` style="max-width:${Math.round(p.ratio * 320)}px"`}>
    <div class="profile-draw">${p.svg}${p.lineLabels}</div>
    <div class="profile-labels" style="height:${small || print ? 34 : stagger ? 128 : 66}px">${labels}</div>${key}
    <figcaption class="profile-foot"><span>${esc(T('layersNote'))}</span>${unplaced.length ? `<span>${T('noLayerList', { names: W.list(unplaced.map(name)) })}</span>` : ''}</figcaption></figure>`;
}
function layersHTML(flags) {
  const nums = numbering();
  const groups = [...strata, 'none'].map((s) => {
    const list = ordered().filter((t) => stratumOf(t) === s), gaps = S.gaps.filter((g) => g.stratum === s);
    if (s === 'none' && !list.length) return '';
    return `<section class="stratum-group" aria-labelledby="ct-sg-${s}">
      <div class="stratum-head"><h3 id="ct-sg-${s}">${sw(s)}${esc(stratumLabel(s))}</h3><p>${esc(T('stratum.' + s + '.about'))}</p><span class="count">${list.length}</span></div>
      ${list.length ? `<ul class="plants" role="list">${list.map((t) => plantRow(t, nums, flags.get(t.id))).join('')}</ul>` : ''}
      ${gaps.map((g) => `<div class="gap-row"><span>${T('gapRow', { name: g.name })}</span>${btn('button button-secondary button-small', 'open-add', 'stratum:' + s, esc(T('findPlant')), fk('gap-' + g.id))}</div>`).join('')}
      ${!list.length && !gaps.length ? `<div class="gap-row"><span>${esc(T('emptyLayer'))}</span>${btn('button button-secondary button-small', 'open-add', 'stratum:' + s, esc(T('emptyLayerFind')), fk('empty-' + s))}</div>` : ''}
    </section>`;
  }).join('');
  return `<div class="view-head"><h3>${esc(T('layersTitle'))}</h3>${explainBtn('stratum', T('whatStratum'), true)}<p class="light-cue">${I.sun}<span>${esc(T('lightCue'))}</span></p></div>
    ${explainPanel('stratum')}${profileHTML(flags)}<div class="strata-list">${groups}</div>`;
}
// M19: one primary action (Swap) and two labelled icon buttons (Keep, Remove).
function plantRow(t, nums, flags) {
  const kept = S.kept.has(t.id), fromGuide = S.guideId === t.id, n = nameText(t);
  return `<li class="plant" data-id="${t.id}"><span class="num" data-s="${stratumOf(t)}" aria-hidden="true">${nums.get(t.id)}</span>
    <div class="plant-main">
      <button class="plant-head" type="button" data-act="details" data-v="${t.id}" ${fk('pn-' + t.id)}><span class="pn">${name(t)}</span> <span class="sci">${esc(t.canonical_name)}</span></button>
      ${kept || fromGuide ? `<div class="plant-tags">${fromGuide ? `<span class="tag">${I.book}${esc(T('guideTag'))}</span>` : ''}${kept ? `<span class="tag tag-pin">${I.pinOn}${esc(T('keptTag'))}</span>` : ''}</div>` : ''}
      <p class="plant-reason">${reasonHTML(t)}</p>
      <div class="plant-meta"><span class="time">${timeHTML1(t)}${t.phases ? ' ' + explainBtn('phase-' + t.id, T('whatPhase')) : ''}</span>${jobsOf(t).map((j) => `<span class="job-tag">${esc(T('job.' + j))}</span>`).join('')}</div>
      ${explainPanel('phase-' + t.id)}${chipsHTML(t, flags)}
    </div>
    <div class="plant-actions">
      ${btn('act act-main', 'swap', t.id, `${I.swap}${esc(T('swap'))}`, `aria-haspopup="dialog" ${fk('sw-' + t.id)}`)}
      ${btn('act act-icon', 'keep', t.id, kept ? I.pinOn : I.pin, `aria-pressed="${kept}" aria-label="${esc(T('keep', { name: n }))}" title="${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}" ${fk('kp-' + t.id)}`)}
      ${btn('act act-icon', 'remove', t.id, I.remove, `aria-label="${esc(T('remove', { name: n }))}" title="${esc(T('remove', { name: n }))}" ${fk('rm-' + t.id)}`)}
    </div></li>`;
}

// ---------- Over time ----------
function timeHTML(flags) {
  const ms = members();
  const covered = phases.map((_, i) => ms.some((t) => t.phases && phases.indexOf(t.phases.start) <= i && phases.indexOf(t.phases.end) >= i));
  const start = (t) => (t.phases ? phases.indexOf(t.phases.start) : 9);
  const rows = [...ms].sort((a, b) => start(a) - start(b) || rank(a) - rank(b)).map((t) => {
    const s = stratumOf(t);
    let bar;
    if (t.phases) {
      const a = phases.indexOf(t.phases.start), b = phases.indexOf(t.phases.end);
      bar = `<span class="bar" data-s="${s}" data-open="${b === phases.length - 1}" style="left:calc(${((a / 7) * 100).toFixed(3)}% + 4px);width:calc(${(((b - a + 1) / 7) * 100).toFixed(3)}% - 8px)"></span>`;
    } else bar = `<span class="bar-none">${esc(T('timingUnknown'))}</span>`;
    return `<div class="tl-row"><div class="tl-name">${btn('', 'details', t.id, `${sw(s)}<span>${name(t)}</span>${needsLook(t, flags.get(t.id)) ? `<span class="plook">${I.warn}<span class="vh">${esc(T('needsLook'))}</span></span>` : ''}`, fk('tl-' + t.id))}<small>${timeHTML1(t)} · ${esc(stratumLabel(s))}</small></div>
      <div class="tl-track"><div class="tl-cols" aria-hidden="true">${covered.map((c) => `<i data-gap="${!c}"></i>`).join('')}${bar}</div></div></div>`;
  }).join('');
  const gaps = covered.map((c, i) => (c ? '' : `<div class="gap-row"><span>${esc(T('timeGap', { stage: T(W.phaseKey(i, 'plain')) }))}</span>${btn('button button-secondary button-small', 'open-add', 'phase:' + i, esc(i <= 2 ? T('quickCrop') : T('findPlant')), fk('tgap-' + i))}</div>`)).join('');
  return `<div class="view-head"><h3>${esc(T('timeTitle'))}</h3>${explainBtn('phase', T('whatPhase'), true)}<p>${esc(T('timeNote'))}</p></div>
    ${explainPanel('phase')}
    <div class="timeline">
      <div class="tl-row tl-groups" aria-hidden="true"><div class="tl-name"><span class="tl-scale">${esc(T('timeScale'))}</span></div><div class="tl-cols"><div>${esc(T('band.early'))}</div><div>${esc(T('band.middle'))}</div><div>${esc(T('band.mature'))}</div></div></div>
      <div class="tl-row tl-phases" aria-hidden="true"><div class="tl-name"></div><div class="tl-cols">${phases.map((_, i) => `<div data-gap="${!covered[i]}"><span class="plain">${esc(T(W.phaseKey(i, 'plain')))}</span><span class="term">${esc(T(W.phaseKey(i, 'term')))}</span><span class="plain-short">${esc(T(W.phaseKey(i, 'short')))}</span></div>`).join('')}</div></div>
      ${rows}
    </div>
    <p class="tl-scale tl-scale-phone">${esc(T('timeScale'))}</p>${gaps}
    <ul class="tl-legend" role="list">${phases.map((_, i) => `<li><b>${esc(T(W.phaseKey(i, 'short')))}</b> ${esc(T(W.phaseKey(i, 'plain')))} · ${esc(T(W.phaseKey(i, 'term')))}</li>`).join('')}</ul>`;
}

// ---------- Jobs ----------
function doers(job) {
  const out = [];
  for (const t of members()) {
    const how = [];
    if (job === 'feeds_you' && t.role === 'crop') how.push(T('fn.crop'));
    for (const f of t.functions ?? []) if (jobOfFunction[f.function] === job && !how.includes(T('fn.' + f.function))) how.push(T('fn.' + f.function));
    if (how.length) out.push({ t, how: how.join(', ') });
  }
  return out;
}
function jobsHTML() {
  const nums = numbering(), gaps = jobGaps(), unknown = members().filter((t) => t.functions == null);
  const cards = jobs.map((j) => {
    const list = doers(j), gap = !list.length;
    return `<article class="job" data-gap="${gap}"><div class="job-head"><span class="job-icon">${jobIcon(j)}</span><h4>${esc(T('job.' + j))}</h4></div>
      <p class="job-about">${esc(T('job.' + j + '.about'))}</p>
      ${gap ? `<p class="job-gap">${esc(T('job.' + j + '.gap'))}</p><div>${btn('button button-primary button-small', 'open-add', 'job:' + j, esc(T('job.' + j + '.find')), fk('jgap-' + j))}</div>`
        : `<p class="job-status">${I.check}${esc(P('doneBy', list.length))}</p><ul class="job-who" role="list">${list.map((d) => `<li>${btn('who', 'details', d.t.id, `<span class="num" data-s="${stratumOf(d.t)}" aria-hidden="true">${nums.get(d.t.id)}</span><span>${name(d.t)} <small>· ${esc(d.how)}</small></span>`, fk(`jw-${j}-${d.t.id}`))}</li>`).join('')}</ul>`}
      ${guideLink(data.jobGuides[j], 'guide-link', (title) => `${I.book}<span>${esc(T('readGuide'))}<span class="vh">: ${title}</span></span>`)}
    </article>`;
  }).join('');
  return `<div class="view-head"><h3>${esc(T('jobsTitle'))}</h3>${explainBtn('job', T('whatJob'), true)}</div>
    ${explainPanel('job')}
    <div class="jobs-meter"><ol aria-hidden="true">${jobs.map((j) => `<li data-gap="${gaps.includes(j)}"></li>`).join('')}</ol><span>${esc(!gaps.length ? T('jobsAllDone') : T('jobsNote', { n: jobs.length - gaps.length }))}</span></div>
    ${unknown.length ? `<p class="note note-dashed">${I.unknown}<span>${T('unknownJobs', { names: W.list(unknown.map(name)) })}</span></p>` : ''}
    <div class="jobs-grid">${cards}</div>`;
}

// ---------- Sheets ----------
function detailsParts(t) {
  const inMembers = S.members.includes(t.id);
  const flags = inMembers ? flagsById().get(t.id) : flagsFor(cell, t.id, S.members, { site: S.site, country: S.country });
  const tr = t.traits, s = stratumOf(t), tw = W.timeWords(t);
  const unknown = `<span class="unknown">${esc(T('unknown'))}</span>`;
  const label = (field, v) => esc(labels?.[field]?.[v]?.[lang] ?? v);
  const lightKeys = [['sun', 'sun'], ['semi_shade', 'part'], ['full_shade', 'shade']];
  const lightsYes = lightKeys.filter(([k]) => tr[k] === true).map(([, v]) => T('site.light.' + v));
  const lightsUnk = lightKeys.filter(([k]) => tr[k] == null).map(([, v]) => T('site.light.' + v));
  const facts = [
    ['t.habit', tr.habit && label('habit', tr.habit)],
    ['t.height', tr.height_m?.max != null && esc(T('meters', { v: (tr.height_m.min != null && tr.height_m.min !== tr.height_m.max ? W.num(tr.height_m.min) + '–' : '') + W.num(tr.height_m.max) }))],
    ['t.width', tr.width_max_m != null && esc(T('meters', { v: W.num(tr.width_max_m) }))],
    ['t.light', lightsYes.length && esc(W.list(lightsYes)) + (lightsUnk.length ? ` <span class="unknown">· ${esc(T('lightUnk', { list: W.list(lightsUnk) }))}</span>` : '')],
    ['t.ph', tr.soil_ph?.min != null && tr.soil_ph?.max != null && `${W.num(tr.soil_ph.min)}–${W.num(tr.soil_ph.max)}`],
    ['t.drought', tr.drought_tolerance && label('drought_tolerance', tr.drought_tolerance)],
    ['t.moisture', tr.moisture_use && label('moisture_use', tr.moisture_use)],
    ['t.leaf', tr.deciduous_evergreen && label('deciduous_evergreen', tr.deciduous_evergreen)],
    ['t.life', tr.lifespan && label('lifespan', tr.lifespan)],
    ['t.nfix', tr.nitrogen_fixer != null && esc(T(tr.nitrogen_fixer ? 'yes' : 'no'))],
  ];
  const tox = t.warnings.toxicity, inv = t.warnings.invasive_in;
  const item = (cls, icon, title, text = '', extra = '') => `<li class="w-item ${cls}">${icon}<div><strong>${title}</strong>${text ? `<p>${text}</p>` : ''}${extra}</div></li>`;
  const note = (n) => (n ? (n[lang] ? esc(n[lang]) : `<span lang="en">${esc(n.en)}</span>`) : '');
  const items = [];
  if (tox && tox.level !== 'None') items.push(item('danger', I.danger, esc(T('tox.' + tox.level)), note(tox.note), `<p class="liab">${esc(T('d.liab'))}</p>`));
  if (flags.invasive === true) items.push(item('warning', I.warn, esc(T('invHere', { country: W.country(S.country) })), esc(T('d.invHere', { country: W.country(S.country) }))));
  for (const c of flags.conflicts) items.push(item(isSerious(c) ? 'warning' : 'soft', I.warn, T('conflict', { other: name(otherOf(c, t)) }), note(c.note) || esc(T('ctype.' + c.type)), c.agent ? `<p>${esc(T('d.agent', { agent: c.agent }))}</p>` : ''));
  for (const k of flags.misfits) items.push(item('warning', I.warn, esc(T('d.misfit')), esc(misfitText(t, k))));
  if (t.warnings.allelopathic === true) items.push(item('soft', I.warn, esc(T('c.allelo')), esc(T('d.allelo'))));
  if (t.warnings.weed_potential === true) items.push(item('soft', I.warn, esc(T('c.spreads')), esc(T('d.spreads'))));
  if (inv?.length) {
    const list = inv.map((x) => W.country(x.country)).sort((a, b) => a.localeCompare(b, lang));
    items.push(item('soft', I.warn, esc(P('d.invList', inv.length)), '', `<details><summary>${esc(T('d.showList'))}</summary><p>${esc(W.list(list))}</p></details>`));
  }
  if (inv && !inv.length) items.push(item('checked', I.check, `${esc(T('d.invNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (inv == null) items.push(item('unknown', I.unknown, esc(T('unkInv')), esc(T('d.invUnk'))));
  if (tox?.level === 'None') items.push(item('checked', I.check, `${esc(T('d.toxNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (!tox) items.push(item('unknown', I.unknown, esc(T('unkTox')), esc(T('d.toxUnk'))));
  if (t.functions == null) items.push(item('unknown', I.unknown, esc(T(jobsOf(t).length ? 'unkJobsOther' : 'unkJobs')), esc(T('d.jobsUnk'))));
  // M7: false is checked, null is not checked yet; neither is shown as the other.
  const al = t.warnings.allelopathic, wp = t.warnings.weed_potential;
  if (al === false) items.push(item('checked', I.check, `${esc(T('d.alleloNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (al == null) items.push(item('unknown', I.unknown, esc(T('unkAllelo')), esc(T('d.alleloUnk'))));
  if (wp === false) items.push(item('checked', I.check, `${esc(T('d.spreadsNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (wp == null) items.push(item('unknown', I.unknown, esc(T('unkSpreads')), esc(T('d.spreadsUnk'))));
  const srcIds = new Set([...(t.stratum?.sources ?? []), ...(t.phases?.sources ?? []), ...(t.functions ?? []).flatMap((x) => x.sources), ...(tox?.sources ?? []), ...(inv ?? []).flatMap((x) => x.sources), ...flags.conflicts.flatMap((c) => c.sources)]);
  const srcs = [...srcIds].map((id) => cell.sources[id]).filter(Boolean);
  const guides = (data.plantGuides[t.canonical_name] ?? []).filter(guide);
  const img = t.image;
  const photo = img ? `<figure class="photo"><img src="${esc(img.url)}" alt="${esc(nameText(t))}" loading="lazy" decoding="async" width="480" height="320"><figcaption>${esc(T('photo', { credit: img.credit ?? '' }))}${img.licence ? ` · ${esc(img.licence)}` : ''}${img.source_page_url && photoSource(img.source_page_url) ? ` · <a href="${esc(img.source_page_url)}" rel="noopener">${esc(photoSource(img.source_page_url))}</a>` : ''}</figcaption></figure>` : '';
  const jobsList = jobsOf(t);
  const headHTML = `<div><h2 id="ct-dlg-title">${name(t)}</h2><p class="lede"><i>${esc(t.canonical_name)}</i> · ${esc(T('family', { family: t.family }))}</p></div>`;
  const body = `${photo}
    <div class="d-layer"><span>${sw(s)}${esc(stratumLabel(s))}${s !== 'none' ? ' · ' + esc(T('stratum.' + s + '.about')) : ''}</span><span>${esc(tw.plain)}${tw.term ? ' · ' + esc(tw.term) : ''}</span></div>
    ${t.reason ? `<section class="d-section"><h3>${esc(T('why'))}</h3><p>${reasonHTML(t)}</p></section>` : ''}
    <section class="d-section"><h3>${esc(T('jobsHeading'))}</h3>${!jobsList.length ? `<p class="muted">${esc(T('d.jobsUnk'))}</p>` : `<div class="plant-meta">${jobsList.map((j) => `<span class="job-tag">${jobIcon(j, 14)}${esc(T('job.' + j))}</span>`).join('')}</div>`}</section>
    <section class="d-section"><h3>${esc(T('checks'))}</h3><ul class="w-list" role="list">${items.join('')}</ul></section>
    <section class="d-section"><h3>${esc(T('traits'))}</h3><dl class="facts">${facts.map(([k, v]) => `<dt>${esc(T(k))}</dt><dd>${v || unknown}</dd>`).join('')}</dl></section>
    ${guides.length ? `<section class="d-section"><h3>${esc(T('guides'))}</h3><ul class="guides" role="list">${guides.map((g) => `<li>${guideLink(g, '', (title) => `${I.book}<span>${title}<small>${esc(T('readGuide'))}</small></span>`)}</li>`).join('')}</ul></section>` : ''}
    <section class="d-section"><h3>${esc(T('sources'))}</h3>${srcs.length ? `<ol class="srcs">${srcs.map((x) => `<li>${x.url ? `<a href="${esc(x.url)}" rel="noopener">${esc(x.label)}</a>` : esc(x.label)}${x.licence ? ` <span class="muted">· ${esc(x.licence)}</span>` : ''}</li>`).join('')}</ol>` : `<p class="muted">${esc(T('noSource'))}</p>`}</section>`;
  const kept = S.kept.has(t.id), n = nameText(t);
  const foot = inMembers
    ? `${btn('button button-primary button-small', 'swap', t.id, `${I.swap}${esc(T('swap'))}`, fk('d-swap'))}${btn('button button-secondary button-small', 'keep', t.id, `${kept ? I.pinOn : I.pin}<span>${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}</span>`, `aria-pressed="${kept}" ${fk('d-keep')}`)}${btn('button button-secondary button-small', 'remove', t.id, `${I.remove}<span>${esc(T('remove', { name: n }))}</span>`, fk('d-remove'))}`
    : O.confirm === t.id ? confirmHTML(t.id, 'add') : btn('button button-primary button-small', 'add', t.id, esc(T('add')), fk('d-add'));
  return { head: headHTML, body, foot };
}
// A flagged plant's confirmation takes the place of its button, inside its own row (a list holds
// only items).
function altRow(t, why, act, label, flags, opts = {}) {
  const confirming = O?.confirm === t.id && !opts.disabled;
  return `<li class="alt" data-flagged="${flags.flagged}"${confirming ? ' data-confirming="true"' : ''}><div class="alt-main"><span class="alt-name">${btn('link-button alt-link', 'details-from', t.id, name(t), fk('ad-' + t.id))} <span class="sci">${esc(t.canonical_name)}</span></span>
    <span class="alt-why">${why}</span>${chipsHTML(t, flags)}</div>
    ${opts.disabled ? `<span class="seg-hint">${esc(T('inConsortium'))}</span>` : confirming ? confirmHTML(t.id, act) : btn(`button button-small ${opts.primary ? 'button-primary' : 'button-secondary'}`, act, t.id, esc(label), `aria-label="${esc(label)}: ${esc(nameText(t))}" ${fk(act + '-' + t.id)}`)}</li>`;
}
function confirmHTML(id, act) {
  const t = taxonOf(id), flags = O.type === 'swap' ? alternatives(O.id, S.members, cell, { site: S.site, removed: [...S.removed], country: S.country }).find((a) => a.taxon.id === id)?.flags : flagsFor(cell, id, S.members, { site: S.site, country: S.country });
  return `<div class="confirm" role="alertdialog" aria-labelledby="ct-confirm-t" aria-describedby="ct-confirm-d"><p id="ct-confirm-t"><strong>${T('confirmTitle', { name: name(t) })}</strong></p><p id="ct-confirm-d">${T('confirmText', { warnings: W.list(warnPlain(t, flags, false)) })}</p>
    <div class="actions">${btn('button button-primary button-small', act + '-yes', id, esc(T(act === 'use' ? 'confirmUse' : 'confirmAdd')), fk('confirm-yes'))}${btn('button button-secondary button-small', 'confirm-no', null, esc(T('cancel')), fk('confirm-no'))}</div></div>`;
}
function swapParts(m) {
  const all = alternatives(m.id, S.members, cell, { site: S.site, removed: [...S.removed], country: S.country });
  // copy-m5: eight of each group at first, eight more per "Show more".
  const fitAll = all.filter((a) => !a.flags.flagged), flaggedAll = all.filter((a) => a.flags.flagged);
  const fitShown = shown(fitAll, SWAP_STEP * (1 + swapMore), SWAP_STEP), flaggedShown = shown(flaggedAll, SWAP_STEP * (1 + swapMore), SWAP_STEP);
  // min-4: the button counts what one press reveals, not everything left.
  const fit = fitShown.items, flagged = flaggedShown.items, more = fitShown.next + flaggedShown.next;
  const others = members().filter((t) => t.id !== m.id), mJobs = jobsOf(m), s = stratumOf(m);
  const othersJobs = new Set(others.flatMap(jobsOf));
  const row = (a, primary) => {
    const lost = mJobs.filter((j) => !othersJobs.has(j) && !jobsOf(a.taxon).includes(j)).map((j) => T('job.' + j));
    const shared = a.sharedJobs.map((j) => T('job.' + j));
    const as = stratumOf(a.taxon);
    const why = `<span>${sw(as)} ${esc(a.sameStratum ? T('sameLayer') : stratumLabel(as))}</span>${shared.length ? `<span>${esc(T('alsoJobs', { jobs: W.list(shared) }))}</span>` : ''}<span class="${lost.length ? 'loses' : 'keeps'}">${esc(lost.length ? T('loses', { jobs: W.list(lost) }) : T('keepsAll'))}</span>`;
    return altRow(a.taxon, why, 'use', T('use'), a.flags, { primary });
  };
  const headHTML = `<div><h2 id="ct-dlg-title">${T('swapTitle', { name: name(m) })}</h2><p class="lede">${esc(mJobs.length ? T('swapNow', { layer: stratumLabel(s), jobs: W.list(mJobs.map((j) => T('job.' + j))) }) : T('swapNowLayer', { layer: stratumLabel(s) }))}</p><p class="lede">${esc(T('swapLede'))}</p></div>`;
  const body = !all.length ? `<p class="muted">${esc(T('noAlt'))}</p>`
    : `${fit.length ? `<ul class="alt-list" role="list">${fit.map((a, i) => row(a, i === 0)).join('')}</ul>` : ''}
      ${flagged.length ? `<h3 class="list-label">${esc(T('flaggedGroup'))}</h3><ul class="alt-list" role="list">${flagged.map((a) => row(a, false)).join('')}</ul>` : ''}
      ${more ? `<p>${btn('button button-secondary button-small', 'swap-more', null, esc(P('showMore', more)), fk('swap-more'))}</p>` : ''}`;
  return { head: headHTML, body };
}
function addResults() {
  const [fkind, fv] = (O.filter || '').split(':');
  const jobF = addJob || (fkind === 'job' ? fv : ''), layerF = addLayer || (fkind === 'stratum' ? fv : '');
  let list = cell.taxa;
  if (jobF) list = list.filter((t) => jobsOf(t).includes(jobF));
  if (layerF) list = list.filter((t) => stratumOf(t) === layerF);
  if (fkind === 'phase') { const i = Number(fv); list = list.filter((t) => t.phases && phases.indexOf(t.phases.start) <= i && phases.indexOf(t.phases.end) >= i); }
  const q = fold(addQuery.trim());
  if (q) list = list.filter((t) => searchText(t).includes(q));
  list = [...list].sort((a, b) => nameText(a).localeCompare(nameText(b), lang));
  const flagOf = new Map(list.map((t) => [t.id, flagsFor(cell, t.id, S.members, { site: S.site, country: S.country })]));
  const fit = list.filter((t) => !flagOf.get(t.id).flagged), flagged = list.filter((t) => flagOf.get(t.id).flagged);
  const row = (t) => altRow(t, `<span>${sw(stratumOf(t))} ${esc(stratumLabel(stratumOf(t)))}</span><span>${esc(jobsOf(t).map((j) => T('job.' + j)).join(' · '))}</span>`, 'add', T('add'), flagOf.get(t.id), { disabled: S.members.includes(t.id) });
  // M11: grouped by layer; plants with a warning last, in their own group.
  const byLayer = [...strata, 'none'].map((s) => {
    const g = fit.filter((t) => stratumOf(t) === s);
    return g.length ? `<h3 class="list-label">${sw(s)} ${esc(stratumLabel(s))}</h3><ul class="alt-list" role="list">${g.map(row).join('')}</ul>` : '';
  }).join('');
  return `<p class="list-count" id="ct-add-count">${esc(P('count', list.length))}${fkind === 'phase' ? ' · ' + esc(T('phaseFilter', { stage: T(W.phaseKey(Number(fv), 'plain')) })) : ''}</p>
    ${!list.length ? `<p class="muted">${esc(T('emptyList'))}</p>` : ''}
    ${jobF && !fit.length && flagged.length ? `<p class="note note-dashed">${I.unknown}<span>${esc(T('noFitForJob'))}</span></p>` : ''}
    ${byLayer}${flagged.length ? `<h3 class="list-label">${I.warn} ${esc(T('flaggedGroup'))}</h3><ul class="alt-list" role="list">${flagged.map(row).join('')}</ul>` : ''}`;
}
function addParts() {
  const [fkind, fv] = (O.filter || '').split(':');
  const jobF = addJob || (fkind === 'job' ? fv : ''), layerF = addLayer || (fkind === 'stratum' ? fv : '');
  const sel = (id, label, all, opts, cur) => `<label class="sel"><span>${esc(label)}</span><select data-filter="${id}" ${fk('f-' + id)}><option value="">${esc(all)}</option>${opts.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const headHTML = `<div><h2 id="ct-dlg-title">${esc(fkind === 'grow' ? T('grow') : T('addTitle'))}</h2><p class="lede">${esc(T('addLede', { cell: cellLabel() }))}</p></div>`;
  const body = `<div class="field"><label for="ct-add-q" class="vh">${esc(T('growHint'))}</label><div class="search">${I.search}<input id="ct-add-q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('growHint'))}" value="${esc(addQuery)}" data-input="add" aria-describedby="ct-add-count" ${fk('add-q')}></div></div>
    <div class="add-filters">${sel('job', T('filterJob'), T('allJobs'), jobs.map((j) => [j, T('job.' + j)]), jobF)}${sel('layer', T('filterLayer'), T('allLayers'), strata.map((s) => [s, stratumLabel(s)]), layerF)}</div>
    <div id="ct-add-results">${addResults()}</div>`;
  return { head: headHTML, body };
}
function sheetHTML() {
  let p;
  if (O.type === 'details') p = detailsParts(taxonOf(O.id));
  else if (O.type === 'swap') p = swapParts(taxonOf(O.id));
  else if (O.type === 'add') p = addParts();
  else if (O.type === 'place') p = O.which === 'climate'
    ? { head: `<div><h2 id="ct-dlg-title">${esc(T('step1'))}</h2><p class="lede">${esc(T('step1.lede'))}</p></div>`, body: climateChoices() }
    : { head: `<div><h2 id="ct-dlg-title">${esc(T('step2'))}</h2><p class="lede">${esc(T('step2.lede'))}</p></div>`, body: countryPicker() + privacy() };
  else p = { head: `<div><h2 id="ct-dlg-title">${esc(T('yourSite'))}</h2><p class="lede">${esc(T('siteOptional'))}</p></div>`, body: siteFields() };
  return `<div class="drawer-head">${p.head}<button class="dialog-close" type="button" data-act="close" aria-label="${esc(T('close'))}" ${fk('close')}>${I.close}</button></div>
    <div class="drawer-body">${p.body}</div>${p.foot ? `<div class="drawer-foot">${p.foot}</div>` : ''}`;
}

// ---------- Print: the screen's words, on paper ----------
function printHTML() {
  if (!cell || S.status !== 'ready') return '';
  const ms = ordered(), nums = numbering(), flags = flagsById();
  const rows = ms.map((t) => {
    const s = stratumOf(t), tw = W.timeWords(t), w = warnPlain(t, flags.get(t.id)).join('<br>');
    return `<tr><td>${sw(s)} ${esc(stratumLabel(s))}</td><td><b>${nums.get(t.id)}. ${name(t)}</b><br><i class="muted">${esc(t.canonical_name)}</i></td><td>${esc(tw.plain)}<br><span class="muted">${esc(tw.term)}</span></td><td>${esc(W.list(jobsOf(t).map((j) => T('job.' + j))))}</td><td>${w || `<span class="muted">${esc(T('printNone'))}</span>`}</td></tr>`;
  }).join('');
  const bands = phaseBands.map((k) => {
    const inBand = ms.filter((t) => bandsOf(t).includes(k));
    return `<div><h3>${esc(T('band.' + k + '.print'))}</h3><ul>${inBand.map((t) => `<li>${name(t)}</li>`).join('')}</ul></div>`;
  }).join('');
  const gapJobs = jobGaps(), free = Math.max(0, limit() - ms.length);
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date());
  return `<article class="sheet">
    <div class="sheet-head"><div><h2 class="sheet-title">${esc(T('printTitle'))}</h2><p class="muted">${esc(cellLabel())}${S.country ? ' · ' + esc(W.country(S.country)) : ''} · ${esc(date)}</p>
    <p class="muted">${esc(T('basis', { site: basisText() }))} · ${esc(P('count', ms.length))}</p></div><img src="/canopi-logo.svg" width="34" height="34" alt=""></div>
    ${S.cellRegion ? (({ title, text }) => `<p class="sheet-borrowed"><strong>${esc(title)}</strong> ${esc(text)}</p>`)(borrowedWords()) : ''}
    <div class="sheet-draw">${profileHTML(flags, true)}</div>
    <section><h3>${esc(T('tab.layers'))}</h3><table><thead><tr><th>${esc(T('p.layer'))}</th><th>${esc(T('p.plant'))}</th><th>${esc(T('p.time'))}</th><th>${esc(T('p.jobs'))}</th><th>${esc(T('p.warn'))}</th></tr></thead><tbody>${rows}</tbody></table></section>
    <section><h3>${esc(T('tab.time'))}</h3><div class="sheet-phases">${bands}</div></section>
    ${gapJobs.length || free ? `<section><h3>${esc(T('printGaps'))}</h3><ul>${gapJobs.map((j) => `<li>${esc(T('job.' + j + '.gap'))}</li>`).join('')}${free ? `<li>${esc(T('printFree', { n: W.num(free) }))}</li>` : ''}</ul></section>` : ''}
    <p class="muted small">${esc(T('d.liab'))}</p>
    <p class="sheet-foot">${esc(T('printFoot', { url: location.href }))}</p></article>`;
}

// ---------- Render ----------
function fkOf(el) { return el?.closest?.('[data-fk]')?.dataset.fk ?? null; }
function focusFk(key, root = document) {
  const el = key && root.querySelector(`[data-fk="${CSS.escape(key)}"]`);
  if (el) { el.focus({ preventScroll: false }); return true; }
  return false;
}
function render() {
  const active = document.activeElement, activeFk = app.contains(active) ? fkOf(active) : null;
  const sel = active?.dataset?.input && app.contains(active) ? [active.selectionStart, active.selectionEnd] : null;
  const setup = S.status === 'setup' || S.status === 'boot';
  head.classList.toggle('tool-head-compact', !setup);
  const step = !S.climate ? 0 : !S.region || setup ? 1 : 2;
  head.dataset.step = String(step);
  head.querySelectorAll('.outline li').forEach((li, i) => {
    if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.dataset.done = String(i < step);
  });
  if (S.status === 'boot') return;
  app.innerHTML = setup ? setupHTML() : `<div class="tool-grid">${asideHTML()}<section class="result" aria-labelledby="ct-result-title">${mainHTML()}</section></div>`;
  app.removeAttribute('aria-busy');
  if (O) renderSheet();
  const target = focusNext; focusNext = null;
  if (target === 'result') {
    // M4: on phone the result starts at the top of the screen, so the drawing and its key show at once.
    // m12: while a header menu is open (Safari leaves a tapped summary unfocused), the heading takes
    // the focus without scrolling, and the menu stays open where the reader is.
    const h = document.getElementById('ct-result-title'), menu = headerMenuOpen();
    h?.focus({ preventScroll: phone() || menu });
    if (h && phone() && !menu) h.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  else if (target && !O) focusFk(target, app) || focusFk(target);
  else if (activeFk && !O) {
    focusFk(activeFk, app);
    if (sel && document.activeElement?.setSelectionRange) document.activeElement.setSelectionRange(...sel);
  }
  persist();
  fitAside();
}
const headerMenuOpen = () => !!document.querySelector('[data-nav-menu][open], [data-lang-menu][open]');
// live M2: the side panel sticks beside the result only while it fits the window; a taller one (long
// words, a short laptop screen) scrolls with the page, so no control in it is ever out of reach.
function fitAside() {
  const a = app.querySelector('.aside');
  if (a) a.classList.toggle('aside-sticky', a.offsetHeight <= innerHeight - 32);
}
addEventListener('resize', fitAside);
document.fonts?.ready.then(fitAside);
function renderSheet(focusKey) {
  const body = dlg.querySelector('.drawer-body'), scroll = body?.scrollTop ?? 0, kind = dlg.dataset.kind;
  const activeFk = dlg.contains(document.activeElement) ? fkOf(document.activeElement) : null;
  dlg.dataset.kind = O.type;
  dlg.innerHTML = sheetHTML();
  const body2 = dlg.querySelector('.drawer-body');
  if (kind === O.type && body2) body2.scrollTop = scroll;
  if (!dlg.open) {
    dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
    focusFk(focusKey ?? (O.type === 'add' ? 'add-q' : O.type === 'place' ? (O.which === 'climate' ? 'cl-' + (S.climate ?? CLIMATES[0]) : 'country-q') : 'close'), dlg);
  } else if (focusKey) focusFk(focusKey, dlg);
  else if (activeFk) focusFk(activeFk, dlg) || dlg.querySelector('.dialog-close').focus();
}
let opener = null;
function openSheet(o, from) {
  if (!O) opener = fkOf(from);
  O = o;
  renderSheet();
}
// closeSheet(true) gives the focus back to what opened the sheet; actions that move the focus
// elsewhere (the swapped-in plant, Undo) close it with false.
// The sheet's state is cleared at once (B1): HTMLDialogElement fires `close` later, and an action's
// render() in between must not see the old sheet and reopen it.
let skipClose = 0;
function resetSheet() {
  O = null; dlg.innerHTML = ''; addQuery = ''; addJob = ''; addLayer = ''; swapMore = 0;
  document.documentElement.style.overflow = '';
}
function closeSheet(back = true) {
  const from = opener; opener = null;
  resetSheet();
  if (dlg.open) { skipClose++; dlg.close(); }
  if (back && from) focusFk(from, app);
}
// Escape closes the dialog without closeSheet(): clear it and give the focus back here.
dlg.addEventListener('close', () => {
  if (skipClose) { skipClose--; return; }
  const from = opener; opener = null;
  resetSheet();
  if (from) focusFk(from, app);
});
// Back to the button a confirmation came from.
const confirmFrom = (id) => (O.type === 'details' ? 'd-add' : (O.type === 'swap' ? 'use-' : 'add-') + id);
dlg.addEventListener('cancel', (e) => { if (O?.confirm) { e.preventDefault(); const id = O.confirm; O.confirm = null; renderSheet(confirmFrom(id)); } else if (O?.back) { e.preventDefault(); O = O.back; renderSheet(); } });

function toast(text, undo = null) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = `<span>${text}</span>${undo ? btn('button', 'undo', undo, esc(T('undo')), fk('undo')) : ''}`;
  toastEl.hidden = false;
  if (!undo) toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() { toastEl.hidden = true; toastEl.innerHTML = ''; }
function say(text) { sayEl.textContent = ''; setTimeout(() => { sayEl.textContent = text; }, 60); }
// m9: a search announces how many it found once typing pauses, not every list it redraws.
let sayTimer = 0;
const sayLater = (text) => { clearTimeout(sayTimer); sayTimer = setTimeout(() => say(text), 500); };

// The state in the address bar (a share link) and on this device (the last consortium).
// A link still waiting for its cell (not covered yet, or before a place is chosen) keeps its own
// plants, so a reload or a copied address loses nothing (M2).
function stateNow() {
  const p = S.pending?.state;
  const members = p ? p.members : linkMembers(S.status, S.members);
  return { climate: S.climate, region: S.region, cellRegion: cellRegion(), country: S.country, site: S.site, kept: p ? p.kept : keptList(), removed: p ? p.removed : [...S.removed], members, plants: p?.plants ?? [] };
}
// The link's own prefixes, written back exactly as they came (shortening them without the cell
// could make two plants share one).
function pendingQuery() {
  const q = encodeState({ ...stateNow(), kept: [], removed: [], members: null });
  const st = S.pending.state;
  if (st.kept.length) q.set('p', st.kept.join('.'));
  if (st.removed.length) q.set('x', st.removed.join('.'));
  if (st.members) q.set('a', st.members.join('.'));
  return q;
}
function persist() {
  if (!S.climate || !S.region || !manifest || !mayPersist(S)) return;
  const q = (S.pending ? pendingQuery() : encodeState(stateNow(), cell)).toString();
  try { history.replaceState(history.state, '', location.pathname + '?' + q); } catch {}
  syncLangLinks();
  if (S.status === 'ready') try { localStorage.setItem(STORE, JSON.stringify({ q, at: new Date().toISOString() })); } catch {}
}
// seam M1: the header's language links (inline menu and phone Menu) lead to this page in another
// language with the address bar's query, so a language switch keeps what is shown: a guide's preset,
// a link still waiting for its place, or the consortium itself.
const langLinks = [...document.querySelectorAll('[data-lang-menu] a, .nav-panel-langs a')].map((a) => [a, a.getAttribute('href')]);
function syncLangLinks() { for (const [a, href] of langLinks) a.setAttribute('href', withQuery(href, location.search)); }

// ---------- Actions ----------
// An Undo offered for an earlier state no longer applies once the consortium is made again, refilled
// or moved to another place (B2, m1): its toast goes.
function dropUndo() {
  if (lastRemoved || undoStart) { lastRemoved = null; undoStart = null; if (toastEl.querySelector('[data-act=undo]')) hideToast(); }
}
function recompute() {
  dropUndo();
  const r = suggest(cell, { site: S.site, kept: keptList(), removed: [...S.removed], country: S.country });
  S.members = r.members.map((m) => m.taxon.id); S.gaps = [];
  S.status = S.members.length ? 'ready' : 'nomatch';
}
function setClimate(c) {
  S.climate = c; S.climateSource = null; S.editClimate = false;
  try { localStorage.setItem('canopi-climate', c); } catch {}
  document.documentElement.dataset.climate = c;
  dispatchEvent(new StorageEvent('storage', { key: 'canopi-climate', newValue: c }));
}
// Each call has a number; a cell that arrives after a later call started is dropped (M1), so the
// plants shown are always the place shown.
let loadSeq = 0;
async function resolvePlace() {
  const run = ++loadSeq;
  if (!S.climate || !S.region) { S.status = 'setup'; render(); return; }
  if (cellFor(manifest, S.climate, S.region) || (S.cellRegion && !cellFor(manifest, S.climate, S.cellRegion))) S.cellRegion = null;
  const mc = cellFor(manifest, S.climate, cellRegion());
  if (!mc) { cell = null; S.status = 'notcovered'; focusNext = 'result'; render(); return; }
  S.status = 'loading';
  // min-8: the loading screen replaces whatever had the focus (Retry, a place, a closed sheet's opener),
  // so the focus waits on its status line.
  focusNext = 'result';
  render();
  let next, nextLabels;
  try {
    [next, nextLabels] = await Promise.all([loadCell(mc.file), labels ?? loadLabels().catch(() => null)]);
  } catch {
    if (run !== loadSeq) return;
    S.status = 'error'; focusNext = 'retry'; render(); return;
  }
  if (run !== loadSeq) return;
  cell = next; labels = nextLabels;
  const keep = (ids) => ids.filter((id) => cell.taxa.some((t) => t.id === id));
  S.kept = new Set(keep(keptList())); S.removed = new Set(keep([...S.removed]));
  if (S.pending) {
    const asked = S.pending.state.members;
    const r = resolveState(S.pending, cell), st8 = r.state;
    S.pending = null;
    S.kept = new Set(st8.kept); S.removed = new Set(st8.removed);
    if (S.guidePlant) {
      // m5: the plant the core pinned, by the core's own rule; "left out" only when it dropped it.
      S.guideId = taxonByName(cell, S.guidePlant)?.id ?? null;
      S.notice = r.dropped.some((d) => d.key === 'plant') ? 'guideMissing' : 'guide';
    }
    const lost = droppedPlants(r.dropped);
    if (lost) { S.dropped = lost; S.notice = 'oldlink'; }
    // m3: a link whose every member is gone gets a fresh suggestion; an emptied consortium stays empty.
    if (st8.members && (st8.members.length || !asked?.length)) { S.members = keep(st8.members); S.status = 'ready'; } else recompute();
  } else recompute();
  // The result takes the focus only from the loading line (or nothing): a user who moved on keeps their place.
  const at = document.activeElement;
  if (!at || at === document.body || at.id === 'ct-result-title') focusNext = 'result';
  render();
  say(S.status === 'ready' ? T('announce', { summary: P('sizeLine.' + S.site.room, S.members.length) }) : T('nm.title'));
}
// A place or climate the user picks: a borrowed cell is opted into again for it (m6), and an Undo
// for the old place no longer applies (B2).
// A shared consortium belongs to its place: once the user picks another climate or place it is left
// behind (M1, M2), and only a guide's plant goes on to the new place.
function leaveLink() {
  if (!S.pending) return;
  const plants = S.pending.state.plants ?? [];
  S.pending = plants.length ? decodeState(new URLSearchParams({ plant: plants[0] })) : null;
}
// min-1: the notices of the link that opened the page go with it.
function leavePlace() { Object.assign(S, afterMove(S)); leaveLink(); }
function choosePlace(country, region) {
  S.country = country; S.region = region; S.pickFor = null; S.ratherNot = !country && S.ratherNot; countryQuery = '';
  S.cellRegion = null; dropUndo(); leavePlace();
  if (O) closeSheet(false);
  resolvePlace();
}
const act = {
  climate(v) { setClimate(v); S.cellRegion = null; dropUndo(); leavePlace(); if (O) closeSheet(false); if (S.region) resolvePlace(); else { focusNext = S.ratherNot ? 'rg-' + REGIONS[0] : browserCountry ? 'suggest' : 'country-q'; render(); findGuidePlant(); } },
  'edit-climate'() { S.editClimate = true; focusNext = 'cl-' + S.climate; render(); },
  country(v) {
    const rs = regionsOf(manifest, v);
    if (rs.length > 1) { S.pickFor = v; countryQuery = ''; focusNext = 'cr-' + rs[0]; O ? renderSheet(focusNext) : render(); return; }
    choosePlace(v, rs[0]);
  },
  'country-region'(v) { choosePlace(S.pickFor, v); },
  'other-country'() { S.pickFor = null; focusNext = 'country-q'; O ? renderSheet('country-q') : render(); },
  'rather-not'(v) { S.ratherNot = v === '1'; S.pickFor = null; const f = S.ratherNot ? 'rg-' + REGIONS[0] : 'country-q'; focusNext = f; O ? renderSheet(f) : render(); },
  region(v) { S.ratherNot = true; choosePlace(null, v); },
  'open-place'(v, el) { openSheet({ type: 'place', which: v }, el); },
  'open-site'(_, el) { openSheet({ type: 'site' }, el); },
  'focus-site'() { const p = document.getElementById('ct-site-panel'); p?.scrollIntoView({ block: 'start' }); focusFk('site-light-' + S.site.light, app); },
  'opt-in'(v) { S.cellRegion = v; resolvePlace(); },
  retry() { resolvePlace(); },
  view(v) { S.view = v; S.explain = null; focusNext = 'tab-' + v; render(); },
  explain(v) { S.explain = S.explain === v ? null : v; focusNext = 'ex-' + v; render(); },
  details(v, el) { openSheet({ type: 'details', id: v }, el); },
  'details-from'(v) { O = { type: 'details', id: v, back: O }; renderSheet('close'); },
  swap(v, el) { swapMore = 0; if (O) { O = { type: 'swap', id: v }; renderSheet('close'); } else openSheet({ type: 'swap', id: v }, el); },
  // The focus goes to the first plant the step reveals.
  'swap-more'() {
    const before = new Set([...dlg.querySelectorAll('[data-act=use]')].map((b) => b.dataset.v));
    swapMore++; renderSheet();
    const next = [...dlg.querySelectorAll('[data-act=use]')].find((b) => !before.has(b.dataset.v));
    (next ?? dlg.querySelector('.dialog-close')).focus();
  },
  use(v) { const a = alternatives(O.id, S.members, cell, { site: S.site, removed: [...S.removed], country: S.country }).find((x) => x.taxon.id === v); if (a?.flags.flagged) { O.confirm = v; renderSheet('confirm-yes'); } else act['use-yes'](v); },
  'use-yes'(v) {
    const old = O.id, a = taxonOf(old), b = taxonOf(v);
    S.members = S.members.map((id) => (id === old ? v : id)); S.kept.delete(old); S.kept.add(v); S.removed.add(old);
    closeSheet(false); focusNext = 'pn-' + v; render(); flash(v); toast(T('swapped', { a: name(a), b: name(b) }));
  },
  'confirm-no'() { const id = O.confirm; O.confirm = null; renderSheet(confirmFrom(id)); },
  remove(v) {
    const t = taxonOf(v), idx = S.members.indexOf(v);
    S.members = S.members.filter((id) => id !== v); S.removed.add(v); const wasKept = S.kept.delete(v);
    S.gaps.push({ stratum: stratumOf(t), name: name(t), id: v });
    lastRemoved = { id: v, idx, wasKept };
    closeSheet(false); render(); toast(T('removed', { name: name(t) }), 'remove'); focusFk('undo', toastEl);
  },
  undo(v) {
    hideToast();
    if (v === 'start' && undoStart) {
      // B2: the state, its cell and its own Undo come back together.
      ({ S, cell, lastRemoved } = undoStart); undoStart = null; evalKey = ''; focusNext = 'start-over'; render(); return;
    }
    const r = lastRemoved; if (!r) return;
    S.members.splice(r.idx, 0, r.id); S.removed.delete(r.id); if (r.wasKept) S.kept.add(r.id);
    S.gaps = S.gaps.filter((g) => g.id !== r.id); lastRemoved = null; focusNext = 'pn-' + r.id; render(); flash(r.id);
  },
  keep(v) {
    const t = taxonOf(v);
    if (S.kept.has(v)) { S.kept.delete(v); toast(T('unkeptNow', { name: name(t) })); } else { S.kept.add(v); toast(T('keptNow', { name: name(t) })); }
    render(); if (O) renderSheet();
  },
  'open-add'(v, el) { addQuery = ''; addJob = ''; addLayer = ''; if (O) { O = { type: 'add', filter: v || '' }; renderSheet('add-q'); } else openSheet({ type: 'add', filter: v || '' }, el); },
  add(v) { const f = flagsFor(cell, v, S.members, { site: S.site, country: S.country }); if (f?.flagged) { O.confirm = v; renderSheet('confirm-yes'); } else act['add-yes'](v); },
  // M4: Add adds the one plant asked for; "Fill the free places" is the only refill.
  'add-yes'(v) {
    S.kept.add(v); S.removed.delete(v);
    if (S.status === 'nomatch') recompute();
    else if (!S.members.includes(v)) {
      dropUndo();
      S.members.push(v); S.gaps = trimGaps(S.gaps, [stratumOf(taxonOf(v))], limit() - S.members.length);
    }
    S.view = 'layers'; closeSheet(false); focusNext = 'pn-' + v; render(); flash(v); toast(T('added', { name: name(taxonOf(v)) }));
  },
  fill() {
    const before = S.members.length;
    S.members = suggest(cell, { site: S.site, kept: [...new Set([...S.members, ...S.kept])], removed: [...S.removed], country: S.country }).members.map((m) => m.taxon.id);
    const added = S.members.slice(before);
    if (added.length) dropUndo();
    S.gaps = trimGaps(S.gaps, added.map((id) => stratumOf(taxonOf(id))), limit() - S.members.length);
    if (S.notice === 'oldlink') S.notice = null;
    focusNext = added.length ? 'pn-' + added[0] : 'result'; render(); if (added.length) flash(added[0]);
    toast(esc(P('filled', added.length)));
  },
  relax(k) { S.site = { ...S.site, [k]: relaxTo(k) }; recompute(); focusNext = 'result'; render(); },
  fit(v) {
    const [k, value] = v.split(':');
    S.site = { ...S.site, [k]: value }; recompute(); focusNext = 'result'; render();
    say(S.status === 'ready' ? T('announce', { summary: P('sizeLine.' + S.site.room, S.members.length) }) : T('nm.title'));
  },
  close() { if (O?.back) { O = O.back; renderSheet(); } else closeSheet(); },
  async share() {
    persist();
    try { await navigator.clipboard.writeText(location.href); toast(esc(T('copied'))); } catch { toast(esc(T('copyFailed'))); }
  },
  print() { printEl.innerHTML = printHTML(); print(); },
  'start-over'() {
    undoStart = { S, cell, lastRemoved }; lastRemoved = null; S = fresh(); S.status = 'setup'; cell = null; loadSeq++;
    if (siteClimate()) { S.climate = siteClimate(); S.climateSource = 'site'; }
    try { localStorage.removeItem(STORE); history.replaceState(history.state, '', location.pathname); } catch {}
    syncLangLinks(); render(); toast(esc(T('startOverDone')), 'start'); focusFk('undo', toastEl);
  },
  dismiss() { S.notice = null; focusNext = 'result'; render(); },
  goto(v) { S.view = 'layers'; focusNext = 'pn-' + v; render(); flash(v); },
};
function flash(id) {
  const el = app.querySelector(`.plant[data-id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  el.dataset.flash = 'true';
}

const root = document.querySelector('.ct');
root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = act[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  // A double click on Remove removes one plant: the list shifts, and the second click would land on
  // the next plant's Remove (appendix).
  if (el.dataset.act === 'remove') {
    const now = performance.now();
    if (repeatClick(e.detail, now, lastRemoveAt)) return;
    lastRemoveAt = e.detail ? now : null;
  }
  fn(el.dataset.v, el);
});
// The sheet's backdrop closes it (the site's dialog helper leaves this dialog to the tool: min-10).
// Only a press that starts on the backdrop closes it: a text selection dragged out of the sheet does not.
const outside = (e) => { const box = dlg.getBoundingClientRect(); return e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom; };
let pressOnBackdrop = false;
dlg.addEventListener('pointerdown', (e) => { pressOnBackdrop = e.target === dlg && outside(e); });
dlg.addEventListener('click', (e) => {
  const fromBackdrop = pressOnBackdrop;
  pressOnBackdrop = false;
  if (e.target === dlg && fromBackdrop && outside(e)) closeSheet();
});
root.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.site) {
    S.site = { ...S.site, [el.dataset.site]: el.value }; recompute(); render();
    if (O) renderSheet();
    say(S.status === 'ready' ? T('announce', { summary: P('sizeLine.' + S.site.room, S.members.length) }) : T('nm.title'));
  }
  if (el.dataset.filter) {
    if (el.dataset.filter === 'job') addJob = el.value; else addLayer = el.value;
    if (O.filter.startsWith(el.dataset.filter === 'job' ? 'job:' : 'stratum:')) O.filter = '';
    dlg.querySelector('#ct-add-results').innerHTML = addResults();
  }
});
root.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.input === 'country') {
    countryQuery = el.value; el.closest('.field').querySelector('#ct-country-list').innerHTML = countryList();
    if (countryQuery.trim()) sayLater(P('countryCount', countryMatches().length));
  }
  if (el.dataset.input === 'add') {
    addQuery = el.value; O.confirm = null; dlg.querySelector('#ct-add-results').innerHTML = addResults();
    sayLater(dlg.querySelector('#ct-add-count')?.textContent ?? '');
  }
});
root.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset.input === 'country') { e.preventDefault(); e.target.closest('.field').querySelector('.option')?.click(); }
  if (e.key === 'Escape' && S.explain && !dlg.open) { const v = S.explain; S.explain = null; focusNext = 'ex-' + v; render(); }
  if (e.target.getAttribute('role') === 'tab' && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const v = ['layers', 'time', 'jobs'], i = v.indexOf(S.view);
    act.view(e.key === 'Home' ? v[0] : e.key === 'End' ? v[2] : v[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]);
  }
});
phoneMQ.addEventListener('change', () => { if (S.status !== 'boot') render(); });
addEventListener('beforeprint', () => { if (!printEl.innerHTML) printEl.innerHTML = printHTML(); });
addEventListener('afterprint', () => { printEl.innerHTML = ''; });

// ---------- Start ----------
syncLangLinks();
async function start() {
  try { manifest = await loadManifest(); } catch {
    app.innerHTML = `<div class="callout" role="alert"><h2>${esc(T('errorTitle'))}</h2><p>${esc(T('errorText'))}</p><div class="actions"><button class="button button-primary" type="button" onclick="location.reload()">${esc(T('retry'))}</button></div></div>`;
    return;
  }
  const params = new URLSearchParams(location.search);
  let decoded = null, saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) ?? 'null'); } catch {}
  if (params.has('c') || params.has('climate') || params.has('plant')) decoded = decodeState(params);
  else if (saved?.q) { decoded = decodeState(saved.q); S.restoredAt = saved.at; saved = null; }
  if (decoded) {
    const d = decoded.state;
    // seam m4: a guide preset without a place goes to the place saved on this device.
    const place = saved?.q ? presetPlace(d, decodeState(saved.q).state) : null;
    if (place) { d.region = place.region; d.country = place.country; }
    S.climate = d.climate; S.region = d.region; S.country = d.country; S.site = { ...d.site };
    S.cellRegion = d.cellRegion && d.cellRegion !== d.region ? d.cellRegion : null;
    S.ratherNot = !!d.region && !d.country;
    S.pending = decoded;
    if (d.plants?.length) { S.guidePlant = d.plants[0]; if (d.climate) S.climateSource = 'guide'; }
    if (S.restoredAt && d.climate && d.region) S.notice = 'restored';
  }
  if (!S.climate && siteClimate()) { S.climate = siteClimate(); S.climateSource = 'site'; }
  if (S.climate && S.region) resolvePlace();
  else { S.status = 'setup'; render(); findGuidePlant(); }
}
start();
