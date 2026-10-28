// The consortium tool (src/components/consortium/ConsortiumPage.astro): choose a climate, get a
// consortium from the data core (src/lib/consortium/), change it, share or print it. The country is
// optional and only sets the invasive warnings: guessed from the browser (shown as a guess, never
// silent), changeable or cleared; it never changes the plants.
// After the climate, an optional question: up to three main crops, food plants of that climate; the
// suggestion is built around them (crops.js). A plant only another climate lists can still be added
// from the plant search ("Add anyway") and carries that list's name everywhere (owner, 2026-10-28).
// The page renders from one state object; every change re-renders the tool and puts the focus back
// on the control that had it (data-fk), or on the one the action names. Sheets (details, Swap, Add,
// climate, country, site) are one native <dialog>. Nothing leaves the browser: the data files are the site's
// own, the state lives in the address bar's fragment (never sent with a request: C8) and in localStorage.
import {
  fileFor, isCountry, invasiveChecked, strata, phases, phaseBands, bandsOf, jobs, jobsOf, jobOfFunction, suggest, evaluate, alternatives, flagsFor,
  SIZE_LIMIT, DEFAULT_SITE, lights, soils, waters, rooms, encodeState, decodeState, resolveState, taxonByName, isSerious, siteClimates, fits, MAX_CROPS,
} from '../../lib/consortium/index.ts';
import { loadManifest, loadLabels, loadClimate } from './data.ts';
import { makeWords, esc, plantName, searchText, fold, needsLook, capFirst } from './words.js';
import { cropHits, cropLabel, cropExamples, elsewhereHit, otherListMatches, isFood, inClimateOrder, loadLists, addFilterMatch, KEPT_FILTERS, keptCounts } from './crops.js';
import { asksCrops, shareUrl, droppedPlants, trimGaps, mayPersist, photoSource, safeHref, shown, linkMembers, afterMove, noLinkCode, keptCountry, repeatClick, withHash, swapTarget, relaxTo, licenceOf, uncheckedOnCard, guessCountry, linkCountry, langHash, chosenHere, printNoneKey, invasiveSourceIds, linkDamaged, isToolState, keepCountry, redoToastKey, siteChangeRebuilds, afterSwap, climateSourceAt } from './logic.js';
import { cardReasonHTML, reasonsHTML, countryLineParts, warnWhere, printWhere, cardInvasive, detailsInvasive, countryAnnouncement, roomHint, builtKey } from './parts.js';
import { memoryOf, startState, MINE } from './memory.js';
import { climates } from '../../data/climates.ts';
import { profileSVG } from './draw.js';
import { pestName } from './pests.js';
import { viewMode, groupOpen, roundHeight, stageSpan, stageShort, warnKinds, pestsOf, NO_FILTERS, FILTER_KEYS, filtering, matches, filterOrder, selectRange, groupTick, pasteTable, pasteNames, readPaste, columnSample, pasteColumn, pasteDefault, PEST_TYPES, CARDS_UP_TO } from './scale.js';

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
// The save, the reader's country choice (device and tab) and Start over's part of them (memory.js).
const memory = memoryOf({ storage: (() => { try { return localStorage; } catch { return null; } })(), history, location });
// The tool's state as the page opened: the fragment, else an older link's query, which arrive() moves
// into the fragment; an old link's `mine` marker already gone from it and from the address bar,
// before the manifest's await (memory.js arrive: core-fix review 3, m-1; C8).
const arrival = memory.arrive();
// The core's lists: the site answers as the core has them, and the climates in the site picker's
// order (src/data/climates.ts, seam m5).
const SITE_OPTIONS = { light: lights, soil: soils, water: waters, room: rooms };
const CLIMATES = climates.filter((c) => siteClimates.includes(c));

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
// cell: the climate file shown (the union of the climate's accepted cells).
let manifest = null, labels = null, cell = null;
// countrySource: 'guess' (the browser's, shown as a guess and never put in a link), 'user' (picked or
// cleared here), 'link' (a share link's k), 'saved' (this device's last consortium); null with no
// country and no choice. noCountry: the user chose "No country" (k=- in the saved state only).
const fresh = () => ({
  climate: null, climateSource: null, country: null, countrySource: null, noCountry: false, unknownCountry: null, linkCode: null,
  site: { ...DEFAULT_SITE }, status: 'boot', members: [], kept: new Set(), removed: new Set(), gaps: [],
  view: 'layers', explain: null, notice: null, dropped: 0, guidePlant: null, guideId: null, restoredAt: null, pending: null,
  // crops: the main crops, in the order chosen (kept once the suggestion is made); guests: plants from
  // another climate's list, id → { climate, taxon, sources }; askCrops: the crop question comes once
  // the climate's file is loaded; cropFromGuide: the crop a guide's link chose; cropsBack: the crop
  // question was opened from a result, which "Back to your consortium" returns to.
  crops: [], guests: new Map(), askCrops: false, cropFromGuide: null, cropsBack: false,
  // cutLink: the link that opened the page was cut or could not be read whole (logic.js linkDamaged),
  // and still waits to be applied (G2): false once it resolves or the reader leaves it.
  cutLink: false,
});
let S = fresh();
let O = null; // the open sheet: { type, id, filter, back, confirm }
let addQuery = '', addJob = '', addLayer = '';
let countryQuery = '', cropQuery = '';
// The other climates' files, loaded only when needed (Add anyway, the crop question's "in another
// list", a link's guests): climate → file.
const others = new Map();
// othersState: 'idle' | 'loading' | 'done' | 'failed' (some file did not load: the page says so and
// offers Retry, never auto-retrying, and never reads a guest of that list as no longer listed: B2).
let othersLoading = null, othersState = 'idle';
let focusNext = null, lastRemoved = null, undoStart = null, toastTimer = 0, lastRemoveAt = null;
const SWAP_STEP = 8;
let swapMore = 0;
// ---------- The plant list's own view state (chunk B): never in a link ----------
// mode: the reader's Cards/List choice (null: the default for the count, scale.js viewMode); F: the
// list's filters, fOrder the order they were set (the active ones come first); fMenu: the open filter
// menu; groups: the reader's open or closed layers, fgroups the ones opened or closed while a filter
// is on (a new filter forgets them, the reader's own stay: B12); foldN: the count the groups' fold
// default was read at, fixed once the list shows (a Remove never folds a group); sel: the ticked rows,
// anchor the last one ticked (Shift ranges from it); rMenu: the row whose ⋯ menu is open; lastBulk:
// what Undo restores after a bulk Keep, Remove or Add.
let mode = null, F = { ...NO_FILTERS }, fOrder = [], fMenu = null, rMenu = null, anchor = null, lastBulk = null, shiftDown = false;
const groups = new Map(), fgroups = new Map();
let sel = new Set(), foldN = null;
// The Add sheet's tab and its pasted list: the text, the column names are read from, the ticks the
// reader changed (id → ticked).
let addTab = 'search', pasteText = '', pasteCol = 0, pasteTicks = new Map(), pasteTimer = 0;
function resetList() { mode = null; F = { ...NO_FILTERS }; fOrder = []; fMenu = null; rMenu = null; anchor = null; sel = new Set(); groups.clear(); fgroups.clear(); foldN = null; }
// A new list of plants (a paste added) reads the fold default again.
function resetFold() { foldN = null; groups.clear(); fgroups.clear(); }
// B14: the Cards/List default never flips while the reader works: a Remove, an Add or a Swap first
// fixes the view the count gave.
function pinView() { if (cell && S.status === 'ready') mode = viewMode(mode, members().length); }
// What Start over → Undo gives back with the consortium (B14).
const listState = () => ({ mode, F, fOrder, sel, anchor, foldN, groups: new Map(groups), fgroups: new Map(fgroups) });
function restoreList(l) {
  if (!l) return;
  ({ mode, F, fOrder, sel, anchor, foldN } = l); fMenu = null; rMenu = null;
  groups.clear(); for (const [k, v] of l.groups) groups.set(k, v);
  fgroups.clear(); for (const [k, v] of l.fgroups) fgroups.set(k, v);
}

const inCell = (id) => !!cell?.taxa.some((t) => t.id === id);
// The other lists in the climates' order (B9): the same list names a plant on every visit.
const othersList = () => inClimateOrder(others, CLIMATES, S.climate);
function otherTaxon(id) { for (const [, f] of othersList()) { const t = f.taxa.find((x) => x.id === id); if (t) return t; } return null; }
const taxonOf = (id) => cell?.taxa.find((t) => t.id === id) ?? S.guests.get(id)?.taxon ?? otherTaxon(id);
const guestTaxa = () => [...S.guests.values()].map((g) => g.taxon);
// The other list a plant comes from (a guest's, or the list the Add search found it in); null for this climate's own.
function otherClimateOf(id) {
  if (!id || inCell(id)) return null;
  if (S.guests.has(id)) return S.guests.get(id).climate;
  for (const [c, f] of othersList()) if (f.taxa.some((t) => t.id === id)) return c;
  return null;
}
// The sources a plant's own file names (a guest's file for a guest).
const sourcesOf = (t) => { const c = otherClimateOf(t.id); return c ? S.guests.get(t.id)?.sources ?? others.get(c)?.sources ?? {} : cell.sources; };
const isCrop = (id) => S.crops.includes(id);
const listName = (c) => T('list.' + c);
const fromListLabel = (c) => T('fromList', { list: listName(c) });
// The other covered climates' files, once: the crop question and the Add search re-render when they arrive.
// A list that fails stays failed until the reader taps Retry (retryOthers): no loop of requests.
function loadOthers() {
  if (!othersLoading) {
    othersState = 'loading';
    const todo = CLIMATES.filter((c) => fileFor(manifest, c) && !others.has(c));
    othersLoading = loadLists(todo, (c) => loadClimate(fileFor(manifest, c).file)).then(({ files, failed }) => {
      for (const [c, f] of files) others.set(c, f);
      othersState = failed.length ? 'failed' : 'done';
      refreshCrops(true); refreshAdd();
    });
  }
  return othersLoading;
}
function retryOthers() { othersLoading = null; return loadOthers(); }
const retryHTML = () => btn('link-button', 'others-retry', null, esc(T('othersRetry')), fk('others-retry'));
const othersFailedHTML = () => (othersState === 'failed' ? `<p class="others-failed">${esc(T('othersFailed'))} ${retryHTML()}</p>` : '');
const stratumOf = (t) => t.stratum?.value ?? 'none';
const limit = () => SIZE_LIMIT[S.site.room];
const climateLabel = () => W.climate(S.climate);
// Whether GRIIS checked the chosen country: only then do its warnings say "invasive here" or nothing;
// otherwise every surface says "not checked in {country}" (parts.js).
const countryChecked = () => invasiveChecked(manifest, S.country);
const where = () => ({ country: S.country, countryChecked: countryChecked() });
// The reader's country as the words in parts.js take it.
const place = () => ({ country: S.country, source: S.countrySource, checked: countryChecked(), noCountry: S.noCountry });
const stratumLabel = (s) => T('stratum.' + s);
const name = (t) => { const n = plantName(t, lang); return n.lang ? `<span lang="en">${esc(n.text)}</span>` : esc(n.text); };
const nameText = (t) => plantName(t, lang).text;
// The scientific name beside a plant's name in a list (L4), unless the name shown already is it.
const sciHTML = (t, cls = 'sci') => (nameText(t) === t.canonical_name ? '' : `<i class="${cls}">${esc(t.canonical_name)}</i>`);
const keptList = () => [...S.kept];
// The climate chosen elsewhere on the site (src/scripts/climate.js), when it is one the tool knows.
const siteClimate = () => (siteClimates.includes(document.documentElement.dataset.climate) ? document.documentElement.dataset.climate : null);

// The members with their flags (evaluate never refills), cached until the state changes.
let evalKey = '', evalOut = null;
function evaluated() {
  const key = [S.members.join(), keptList().join(), [...S.guests.keys()].join(), S.site.light, S.site.soil, S.site.water, S.site.room, S.country, cell?.climate_zone].join('|');
  if (key !== evalKey) { evalKey = key; evalOut = evaluate(cell, S.members, { site: S.site, kept: keptList(), guests: guestTaxa(), ...where() }); }
  return evalOut;
}
// Both read once per evaluation (a 200-plant list asks for them per row).
let byIdSrc = null, byIdOut = null, orderedOut = null;
const flagsById = () => { const ev = evaluated(); if (ev !== byIdSrc) { byIdSrc = ev; byIdOut = new Map(ev.members.map((m) => [m.taxon.id, m.flags])); orderedOut = null; } return byIdOut; };
const members = () => evaluated().members.map((m) => m.taxon);
const height = (t) => t.traits.height_m?.max ?? 0;
const rank = (t) => (t.stratum ? strata.indexOf(t.stratum.value) : 9) * 1000 - height(t);
const ordered = () => { flagsById(); return (orderedOut ??= [...members()].sort((a, b) => rank(a) - rank(b) || a.canonical_name.localeCompare(b.canonical_name))); };
const numbering = () => new Map(ordered().map((t, i) => [t.id, i + 1]));
// The jobs nobody does come from the core (evaluate's gaps); the layers in use from the members.
const jobGaps = () => evaluated().gaps;
const strataIn = (list) => new Set(list.filter((t) => t.stratum).map((t) => t.stratum.value));
// How many plants "Fill the gaps" would add now, worked out once per state (a render asks several times).
let fillKey = '', fillOut = 0;
function fillable() {
  if (!cell || S.members.length >= limit()) return 0;
  const key = [S.members.join(), keptList().join(), [...S.removed].join(), [...S.guests.keys()].join(), S.site.light, S.site.soil, S.site.water, S.site.room, cell.climate_zone].join('|');
  if (key !== fillKey) { fillKey = key; fillOut = suggest(cell, { site: S.site, kept: [...new Set([...S.members, ...S.kept])], removed: [...S.removed], guests: guestTaxa() }).members.length - S.members.length; }
  return fillOut;
}

// ---------- Warnings: one reading for every surface (card, Swap, Add, details, print) ----------
function misfitText(t, key) {
  const tr = t.traits, v = S.site[key];
  if (key === 'light') return T('misfit.light.' + v);
  if (key === 'soil') return T('misfit.soil.' + v, { min: tr.soil_ph?.min != null ? W.num(tr.soil_ph.min) : '?', max: tr.soil_ph?.max != null ? W.num(tr.soil_ph.max) : '?' });
  if (key === 'water') return T('misfit.water.' + v);
  // C7: the size rounded as the rows round heights (scale.js roundHeight).
  const size = roundHeight(Math.max(tr.height_m?.max ?? 0, tr.width_max_m ?? 0)) ?? 0;
  return T('misfit.room.' + v, { w: W.num(size) });
}
const uncheckedKey = { tox: 'u.tox', inv: 'u.inv', spreads: 'u.spreads', jobs: 'u.jobs', jobsOther: 'u.jobsOther' };
const otherOf = (c, t) => (c.a.id === t.id ? c.b : c.a);
// severe: their own chips (kind decides the colour); soft: one merged chip, its list alone (no
// "Cautions" label: the one warning heading is "With a warning", owner 2026-10-28); unknown: merged unchecked.
function warnParts(t, flags) {
  const severe = [], soft = [], unk = [];
  const tox = t.warnings.toxicity;
  // copy-m18: slight toxicity is a caution (soft chip), not the red danger mark.
  if (tox && tox.level !== 'None') severe.push({ cls: tox.level === 'Slight' ? 'soft' : 'danger', text: T('tox.' + tox.level), look: tox.level !== 'Slight' });
  if (flags.invasive === true) severe.push({ cls: 'warning', text: esc(T('invHere', { country: W.country(S.country) })), look: true });
  // A country GRIIS has no list for is said once per view and in details, not on every card (m-2).
  const invNote = cardInvasive(W, place(), t);
  for (const c of flags.conflicts) severe.push({ cls: isSerious(c) ? 'warning' : 'soft', text: T('conflict', { other: name(otherOf(c, t)) }), look: isSerious(c), conflict: c });
  for (const k of flags.misfits) severe.push({ cls: 'warning', text: esc(misfitText(t, k)), look: true, misfit: k });
  if (t.warnings.allelopathic === true) soft.push(T('c.allelo'));
  if (t.warnings.weed_potential === true) soft.push(T('c.spreads'));
  // With a country, a card tells only that country's warning; other countries are in details (owner,
  // 2026-10-28). Without one, the soft count of countries.
  if (invNote?.cls === 'soft') soft.push(invNote.text);
  // Allelopathy not checked yet is told in details only (owner, 2026-10-28): see uncheckedOnCard.
  for (const k of uncheckedOnCard(t, jobsOf(t).length > 0)) unk.push(T(uncheckedKey[k]));
  return { severe, soft, unk };
}
function chipsHTML(t, flags) {
  const { severe, soft } = warnParts(t, flags);
  const out = severe.map((w) => `<span class="warn warn-${w.cls}">${w.cls === 'danger' ? I.danger : w.cls === 'unknown' ? I.unknown : I.warn}<span>${w.text}</span></span>`);
  if (soft.length) out.push(`<span class="warn warn-soft">${I.warn}<span>${esc(capFirst(soft.join(' · '), lang))}</span></span>`);
  // C5: what is not checked yet is said once, in the warning box, and in the plant's details.
  return out.length ? `<div class="warns">${out.join('')}</div>` : '';
}
// The same words in plain text, one per warning, for print (one line each) and the Swap/Add
// confirmation (a list in the page language): no "; " that reads wrong in Japanese (live m4).
function warnPlain(t, flags, all = true) {
  const { severe, soft, unk } = warnParts(t, flags);
  const out = severe.filter((w) => all || (w.cls !== 'soft' && w.cls !== 'unknown')).map((w) => w.text);
  if (all && soft.length) out.push(esc(capFirst(soft.join(' · '), lang)));
  if (all && unk.length) out.push(esc(T('unchecked', { list: W.list(unk) })));
  return out;
}

// ---------- Small parts ----------
// A stratum's colour swatch: in the strata legend only; the drawing (draw.js) draws its own.
const sw = (s) => `<span class="sw" data-s="${s}"></span>`;
const fk = (k) => `data-fk="${esc(k)}"`;
const btn = (cls, act, v, label, extra = '') => `<button class="${cls}" type="button" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ''} ${extra}>${label}</button>`;
function timeHTML1(t) { const w = W.timeWords(t); return esc(w.plain) + (w.term ? ` <span class="apt">· ${esc(w.term)}</span>` : ''); }
// A plant chosen in several regions of its climate has one reason per region: a row shows the first
// with its region and how many more (M2), details show them all (parts.js).
// A licence by its proper name, linked to its deed when the licence is known (L3).
function licenceHTML(raw) {
  const l = licenceOf(raw);
  if (!l) return '';
  const text = esc(l.publicDomain ? T('publicDomain') : l.name);
  return l.url ? `<a href="${esc(l.url)}" rel="license noopener">${text}</a>` : text;
}
const guide = (slug) => data.guides[slug];
const guideLink = (slug, cls = '', inner) => { const g = guide(slug); return g ? `<a class="${cls}" href="${g.url}"${g.lang !== lang ? ` hreflang="${g.lang}"` : ''}>${inner(g.lang !== lang ? `<span lang="${g.lang}">${esc(g.title)}</span>` : esc(g.title))}</a>` : ''; };
const basisText = () => [T('basis.light.' + S.site.light), T('basis.soil.' + S.site.soil), T('basis.water.' + S.site.water), T('basis.room.' + S.site.room)].join(' · ');

// ---------- Setup ----------
// Phones show a card's name, coverage pill and example places; the climates' descriptions move
// under the cards, in one "What the climates mean" list (owner, 2026-10-28).
function climateChoices() {
  return `<ul class="climate-choices" role="list">${CLIMATES.map((c) => {
    const covered = !!fileFor(manifest, c), on = S.climate === c;
    return `<li><button class="climate-choice" type="button" data-act="climate" data-v="${c}" aria-pressed="${on}" ${fk('cl-' + c)}>
      <strong>${on ? `<span class="chosen-check">${I.check}</span>` : ''}${esc(W.climate(c))}<span class="cover-pill" data-covered="${covered}">${esc(T(covered ? 'covered' : 'notYet'))}</span></strong>
      <span class="about">${esc(data.strings['climate.' + c + '.about'])}</span><span class="places">${esc(data.strings['climate.' + c + '.places'])}</span></button></li>`;
  }).join('')}</ul>
  <details class="climate-abouts"><summary>${esc(T('climatesAbout'))}</summary><dl>${CLIMATES.map((c) => `<dt>${esc(W.climate(c))}</dt><dd>${esc(data.strings['climate.' + c + '.about'])}</dd>`).join('')}</dl></details>`;
}
// The browser's country, worked out once (logic.js): shown as a guess ("guessed from your browser"),
// never put in a share link on its own.
const browserGuess = () => guessCountry(Object.keys(manifest.countries), { zone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })(), languages: navigator.languages ?? [navigator.language] });
let browserCountry = null;
function countryMatches() {
  const q = fold(countryQuery.trim());
  if (!q) return [];
  return Object.keys(manifest.countries).map((c) => ({ c, n: W.country(c) })).filter((x) => x.n !== x.c && fold(x.n).includes(q))
    .sort((a, b) => fold(a.n).indexOf(q) - fold(b.n).indexOf(q) || a.n.localeCompare(b.n, lang)).slice(0, 6);
}
// A country GRIIS has no checklist for says so in the list: its warnings would be "not checked".
const noListNote = (c) => (invasiveChecked(manifest, c) ? '' : `<small>${esc(T('countryNoList'))}</small>`);
function countryList() {
  const list = countryMatches();
  if (!countryQuery.trim()) return '';
  if (!list.length) return `<p class="place-note">${esc(T('noCountry'))}</p>`;
  return `<ul class="options" role="list">${list.map((x) => `<li>${btn('option', 'country', x.c, `<span>${esc(x.n)}</span>${noListNote(x.c)}`, `aria-pressed="${S.country === x.c}" ${fk('co-' + x.c)}`)}</li>`).join('')}</ul>`;
}
// The country sheet: the browser's guess as a one-tap card, the search, and "No country".
function countryPicker() {
  // The guess is marked as chosen only once the reader picks it (m-4).
  const g = browserCountry, inUse = chosenHere({ guess: g, country: S.country, source: S.countrySource });
  const sug = g ? `<button class="suggest-country" type="button" data-act="country" data-v="${g}" aria-pressed="${!!inUse}" ${fk('suggest')}><span class="flagless" aria-hidden="true">${g}</span><span><strong>${esc(W.country(g))}</strong><small>${esc(T('fromBrowser'))}</small>${noListNote(g)}</span><span class="go">${inUse ? `${I.check}${esc(T('inUse'))}` : esc(T('useIt'))}</span></button>` : '';
  return `${sug}<div class="field"><label for="ct-country-q">${esc(T('searchCountry'))}</label>
    <div class="search">${I.search}<input id="ct-country-q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('countryPlaceholder'))}" value="${esc(countryQuery)}" data-input="country" ${fk('country-q')}></div>
    <div id="ct-country-list">${countryList()}</div></div>
    <div class="no-country-pick">${btn('link-button', 'no-country', null, esc(T('countryNone')), `aria-pressed="${!S.country && S.noCountry}" ${fk('no-country')}`)}<p class="place-note">${esc(T('countryNoneNote'))}</p></div>`;
}
const privacy = () => `<p class="privacy">${I.lock}<span>${esc(T('privacy'))}</span></p>`;
// "Invasive warnings for [France ▾] guessed from your browser": in step 1 above the climate cards
// (so a guess is seen before it is used) and with the climate in the result. With no country, its note
// and its "Add your country" are the only ones in the view (m3); for a country GRIIS has no list for,
// the no-list reason sits beside where the country came from (m1).
function countryLineHTML(withPrivacy = false) {
  const p = countryLineParts(W, place());
  const row = p.chip
    ? `<button class="chip-button cl-chip" type="button" data-act="open-place" data-v="country" data-src="${S.country ? S.countrySource ?? 'user' : 'none'}" aria-haspopup="dialog" ${fk('pc-country')}><span class="vh">${esc(T('countryLine'))} </span><strong>${esc(p.chip)}</strong>${I.caret}</button>${p.why.map((w) => `<span class="cl-why">${esc(w)}</span>`).join('')}`
    : btn('link-button cl-add', 'open-place', 'country', esc(T('addCountry')), `aria-haspopup="dialog" ${fk('pc-country')}`);
  const notes = p.notes.map((n) => `<p class="cl-why">${esc(n)}</p>`).join('');
  return `<div class="country-line"><p class="cl-row"><span class="cl-label" aria-hidden="true">${esc(T('countryLine'))}</span>${row}</p>${notes}${withPrivacy ? privacy() : ''}</div>`;
}
// The guide's plant, found in the guide's climate file before the result, so the note names it as
// the tool will (live m3); with its scientific name, which the guide's link carried, so a guide's
// "Guásimo" and the file's "Bastard cedar" read as one plant (seam m2).
let guideTaxon = null;
async function findGuidePlant() {
  const plant = S.guidePlant, mc = S.climate && manifest ? fileFor(manifest, S.climate) : null;
  if (!plant || !mc || guideTaxon?.plant === plant) return;
  let found = null;
  try { found = taxonByName(await loadClimate(mc.file), plant); } catch {}
  if (found) { guideTaxon = { plant, taxon: found }; if (S.guidePlant === plant && (S.status === 'setup' || S.status === 'notcovered')) render(); }
}
// wait: the climate has no list yet (not covered), so the plant is not kept yet.
function guideNote(wait = false) {
  if (!S.guidePlant) return '';
  const t = (S.guideId && taxonOf(S.guideId)) || (guideTaxon?.plant === S.guidePlant ? guideTaxon.taxon : null);
  const plant = t ? name(t) + (nameText(t) !== t.canonical_name ? W.paren(`<i>${esc(t.canonical_name)}</i>`) : '') : `<i>${esc(S.guidePlant)}</i>`;
  // m4: the guide set the climate only when its link named one.
  const text = wait ? T('fromGuideClimate', { plant }) : S.climateSource === 'guide' && S.climate ? T('fromGuide', { plant, climate: esc(W.climate(S.climate)) }) : T('fromGuidePlant', { plant });
  return `<div class="note note-guide">${I.book}<div><p>${text}</p></div></div>`;
}
// One question: the climate. The country line sits above the cards.
function setupHTML() {
  return `<div class="setup">${guideNote()}
    <section class="step step-one" aria-labelledby="ct-st1"><div class="step-head step-head-solo"><h2 id="ct-st1">${esc(T('step1'))}</h2><p>${esc(T('step1.lede'))}</p></div>
      ${countryLineHTML(true)}${climateChoices()}</section></div>`;
}

// ---------- Main crops ----------
// The climate chosen, folded: its name, its cover, its places, where it came from, and Change.
// Where the climate came from (B6): a guide, this site, a shared link, this device's last consortium,
// or the reader's pick here; nothing said when unknown.
const CLIMATE_WHY = { guide: 'climateFromGuide', site: 'climateFromSite', link: 'countryLinked', saved: 'countrySaved', user: 'climateChosen' };
function chosenClimateHTML() {
  const c = S.climate, why = CLIMATE_WHY[S.climateSource] ? T(CLIMATE_WHY[S.climateSource]) : '';
  return `<div class="clim-chosen"><p><strong>${esc(W.climate(c))}</strong> <span class="cover-pill" data-covered="true">${esc(T('covered'))}</span> <span class="places">${esc(data.strings['climate.' + c + '.places'])}</span>${why ? ` <span class="cl-why">${esc(why)}</span>` : ''}</p>
    ${btn('button button-secondary button-small', 'open-place', 'climate', esc(T('change')), `aria-haspopup="dialog" aria-label="${esc(T('change'))}: ${esc(W.climate(c))}" ${fk('pc-climate')}`)}</div>`;
}
const cropFull = () => S.crops.length >= MAX_CROPS;
// The options show the first few hits; the status counts them all (B8). A hit on a hidden English
// name shows it in brackets, the option's accessible name too (C1, state 19f), and names the plant
// in full: name, scientific name, layer, height (C4).
const CROP_OPTIONS = 8;
const cropHitsNow = () => (cropFull() ? [] : cropHits(cell, cropQuery, lang, S.crops));
const hitName = (h) => (h.english ? `${name(h.taxon)}${W.paren(`<span lang="en">${esc(h.english)}</span>`)}` : name(h.taxon));
function cropOptionsHTML() {
  const hits = cropHitsNow().slice(0, CROP_OPTIONS);
  const height = (t) => (t.traits.height_m?.max != null ? T('meters', { v: W.num(t.traits.height_m.max) }) : '');
  const label = (h) => [cropLabel(h, lang, W.paren), nameText(h.taxon) === h.taxon.canonical_name ? '' : h.taxon.canonical_name, stratumLabel(stratumOf(h.taxon)), height(h.taxon)].filter(Boolean).join(', ');
  return hits.length ? `<ul class="options crop-options" role="list" aria-label="${esc(T('crops.label', { climate: climateLabel() }))}">${hits.map((h) => `<li>${btn('option', 'crop-add', h.taxon.id, `<span><b>${hitName(h)}</b> ${sciHTML(h.taxon)}</span><small>${esc(stratumLabel(stratumOf(h.taxon)))}${height(h.taxon) ? ' · ' + esc(height(h.taxon)) : ''}</small>`, `aria-label="${esc(label(h))}" ${fk('co-' + h.taxon.id)}`)}</li>`).join('')}</ul>` : '';
}
function cropExamplesHTML() {
  if (cropQuery.trim() || cropFull()) return '';
  const ex = cropExamples(cell, 4, S.crops);
  return ex.length ? `<span>${esc(T('crops.examples'))}</span> ${ex.map((t) => btn('chip-button', 'crop-add', t.id, `<span>${name(t)}</span>`, fk('ce-' + t.id))).join('')}` : '';
}
// The status under the search (role=status): how many match, how many are chosen, or, with no match,
// the whole message: the list that has the plant ("Add anyway" later), never another climate to choose.
function cropStatus() {
  const q = cropQuery.trim(), n = S.crops.length;
  if (cropFull()) return esc(T('crops.full', { max: W.num(MAX_CROPS) }));
  if (q) {
    const hits = cropHitsNow();
    if (hits.length) return esc(P('crops.matches', hits.length));
    loadOthers();
    const hit = elsewhereHit(q, lang, othersList(), cell);
    const elsewhere = hit ? `<p>${esc(T('crops.elsewhere', { name: cropLabel(hit, lang, W.paren), other: listName(hit.climate), grow: T('grow'), anyway: T('addAnyway'), label: fromListLabel(hit.climate) }))}</p>` : '';
    const failed = !hit && othersState === 'failed' ? `<p class="others-failed">${esc(T('othersFailed'))}</p>` : '';
    return `<div class="crop-none"><p><strong>${esc(T('crops.none', { list: listName(S.climate), q }))}</strong></p>${elsewhere}${failed}<p class="muted">${esc(T('crops.spelling'))}</p></div>`;
  }
  return n ? esc(P('crops.chosen', n, { max: W.num(MAX_CROPS) })) : '';
}
// The crop step's Retry, outside the live status (F5: no control inside a role=status region): shown
// while a search found nothing here or in the lists that loaded, and some list failed.
function cropRetryHTML() {
  const q = cropQuery.trim();
  if (!q || cropFull() || othersState !== 'failed' || cropHitsNow().length || elsewhereHit(q, lang, othersList(), cell)) return '';
  return `<p class="others-retry">${retryHTML()}</p>`;
}
let cropTimer = 0;
// Typing redraws the options at once and the status once typing pauses (so it is read once). A redraw
// that removes the control holding the focus (Retry while its lists load, an option) puts it back on
// that control when it is drawn again, else on the search (F5, as refreshAdd does: B13).
function refreshCrops(now = false) {
  if (S.status !== 'crops') return;
  const l = document.getElementById('ct-crop-list'), eg = document.getElementById('ct-crop-eg');
  const keep = () => {
    const a = document.activeElement;
    return a && a !== document.body && app.contains(a) ? fkOf(a) : null;
  };
  const back = (had) => { if (had && !app.contains(document.activeElement)) focusFk(had, app) || document.getElementById('ct-crop-q')?.focus(); };
  let had = keep();
  if (l) l.innerHTML = cropOptionsHTML();
  if (eg) eg.innerHTML = cropExamplesHTML();
  back(had);
  clearTimeout(cropTimer);
  const put = () => {
    const st = document.getElementById('crop-st'), r = document.getElementById('crop-retry');
    if (!st || S.status !== 'crops') return;
    had = keep();
    st.innerHTML = cropStatus();
    if (r) r.innerHTML = cropRetryHTML();
    back(had);
  };
  if (now) put(); else cropTimer = setTimeout(put, 400);
}
function cropsHTML() {
  const list = listName(S.climate), n = S.crops.length;
  const chips = n ? `<ul class="crop-chips" role="list" aria-label="${esc(T('crops.yours'))}">${S.crops.map((id) => {
    const t = taxonOf(id), g = S.cropFromGuide === id;
    return `<li class="crop-chip">${I.pinOn}<span><b>${name(t)}</b> ${sciHTML(t)}${g ? ` <span class="crop-g" aria-hidden="true">${esc(T('crops.fromGuide'))}</span><span class="vh">${esc(T('crops.guideVh'))}</span>` : ''}</span>${btn('crop-x', 'crop-remove', id, I.close, `aria-label="${esc(T('remove', { name: nameText(t) }))}" ${fk('cx-' + id)}`)}</li>`;
  }).join('')}</ul>` : '';
  // C5: the placeholder never names a crop already chosen; none when nothing is left to name.
  const phEx = cropFull() ? [] : cropExamples(cell, 3, S.crops);
  const ph = phEx.length ? new Intl.ListFormat(lang, { type: 'unit', style: 'short' }).format(phEx.map(nameText)) + '…' : '';
  const go = btn('button button-primary', 'suggest', null, esc(T(n === 0 ? 'suggest' : n === 1 ? 'suggestIt' : 'suggestThem')), fk('suggest'));
  return `<div class="setup">
    <section class="step step-one" aria-labelledby="ct-st1"><div class="step-head step-head-solo"><h2 id="ct-st1">${esc(T('step1'))}</h2><p>${esc(T('step1.lede'))}</p></div>${countryLineHTML(true)}${chosenClimateHTML()}</section>
    <section class="step crops" aria-labelledby="ct-st2"><div class="crop-head"><h2 id="ct-st2" tabindex="-1">${esc(T('crops.title'))} <span class="crop-opt">${esc(T('crops.optional'))}</span></h2><p>${esc(T('crops.lede', { max: W.num(MAX_CROPS), list }))}</p></div>
      ${chips}
      <div class="field crop-field"><label for="ct-crop-q">${esc(T('crops.label', { climate: climateLabel() }))}</label>
        <div class="search">${I.search}<input id="ct-crop-q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(ph)}" value="${esc(cropQuery)}" data-input="crop" aria-describedby="crop-st"${cropFull() ? ' disabled' : ''} ${fk('crop-q')}></div>
        <div id="ct-crop-list">${cropOptionsHTML()}</div></div>
      <div class="crop-st" id="crop-st" role="status">${cropStatus()}</div><div class="crop-retry" id="crop-retry">${cropRetryHTML()}</div>
      <p class="crop-eg" id="ct-crop-eg">${cropExamplesHTML()}</p>
      <div class="crop-acts">${go}${n ? `<p class="crop-hint">${esc(T(n === 1 ? 'withoutIt' : 'withoutThem'))}</p>` : ''}${S.cropsBack ? btn('link-button', 'crops-back', null, esc(T('backToResult')), fk('crops-back')) : ''}</div>
    </section></div>`;
}
// The result's line about the main crops it was built around, with "Change crops".
function builtHTML() {
  const crops = S.crops.map(taxonOf).filter(Boolean);
  if (!crops.length) return '';
  return `<p class="note built">${I.pinOn}<span><span>${T(builtKey(crops.length), { names: W.list(crops.map((t) => `<b>${name(t)}</b>`)) })}</span> ${btn('link-button', 'change-crops', null, esc(T('changeCrops')), fk('change-crops'))}</span></p>`;
}

// ---------- Result ----------
function seg(key) {
  const hint = key === 'soil' ? T('soilHint') : key === 'room' ? roomHint(W, S.site.room) : '';
  return `<fieldset class="seg"><legend>${esc(T('site.' + key))}</legend><div class="seg-options">${SITE_OPTIONS[key].map((o) => `<label class="seg-option"><input type="radio" name="ct-${key}${O ? '-d' : ''}" value="${o}" ${S.site[key] === o ? 'checked' : ''} data-site="${key}" ${fk(`site-${key}-${o}`)}><span>${esc(T(`site.${key}.${o}`))}</span></label>`).join('')}</div>${hint ? `<p class="seg-hint">${esc(hint)}</p>` : ''}</fieldset>`;
}
const siteFields = () => `<div class="site-fields">${Object.keys(SITE_OPTIONS).map(seg).join('')}</div>`;
// The climate chip (with where the climate came from) and the country line.
function placeChips() {
  // Only a guide's or this site's climate is said here (B6): a link's, a save's or the reader's own pick is not.
  const from = S.climateSource === 'guide' || S.climateSource === 'site' ? `<small class="cl-why">${esc(T(S.climateSource === 'guide' ? 'climateFromGuide' : 'climateFromSite'))}</small>` : '';
  return `<div class="place-chips">
    <div class="climate-line"><button class="chip-button" type="button" data-act="open-place" data-v="climate" aria-haspopup="dialog" ${fk('pc-climate')}><span class="vh">${esc(T('step1'))}: </span><strong>${esc(W.climate(S.climate))}</strong>${I.caret}</button>${from}</div>
    ${countryLineHTML()}</div>`;
}
// F4: the main actions (I want to grow…, Fill) come right after the place, before the site questions,
// so they show at the top of the panel; on desktop the panel always sticks and scrolls inside itself
// when it is taller than the window (src/styles/consortium.css), so it never changes layout mid-scroll.
function asideHTML() {
  if (noAside()) return '';
  const result = S.status === 'ready' || S.status === 'nomatch';
  return `<aside class="aside" aria-label="${esc(T('step1'))}">
    <div class="panel panel-place"><h2 class="panel-title">${esc(T('step1'))}</h2>${placeChips()}</div>
    ${result ? `<div class="panel"><h2 class="panel-title">${esc(T('grow'))}</h2>
      ${btn('button button-secondary grow-button', 'open-add', 'grow', `${I.search}<span>${esc(T('growHint'))}</span>`, fk('grow'))}
      ${fillable() ? `${btn('button button-secondary button-small', 'fill', null, esc(T('fill')), fk('fill-aside'))}<p class="seg-hint">${esc(T('fillNote'))}</p>` : ''}
    </div>
    <div class="panel" id="ct-site-panel"><h2 class="panel-title">${esc(T('yourSite'))}</h2><p class="seg-hint">${esc(T('siteOptional'))}</p>${siteFields()}</div>` : ''}
  </aside>`;
}
const resultTitle = (text) => `<h2 id="ct-result-title" tabindex="-1">${esc(text)}</h2>`;
function basisHTML() {
  return `<p class="basis"><span>${esc(T('basis', { site: basisText() }))}</span> ${btn('link-button', noAside() ? 'open-site' : 'focus-site', null, esc(T('basisChange')), fk('basis'))}</p>`;
}
// The warning box, at every size (C5, design-scale.md §2.6): one line per kind, each with its
// count, up to three names and "Show n", which sets the list's Warning filter.
function attentionHTML() { return attentionScaleHTML(); }
// Shown only while Fill would add plants; the words never count places: the room limits the
// plants' size, not their number (owner, 2026-10-28).
function freeRowHTML(can) {
  if (!can) return '';
  return `<div class="free-row"><p>${esc(T('fillable'))}</p>
    <div class="free-actions">${btn('button button-secondary button-small', 'open-add', 'grow', `${I.search}<span>${esc(T('findPlant'))}</span>`, fk('find-free'))}
    ${btn('button button-primary button-small', 'fill', null, esc(T('fill')), fk('fill'))}</div></div>`;
}
function notices(can) {
  let out = '';
  if (S.notice === 'cutlink') out += `<div class="note note-old" role="status">${I.info}<div><p><strong>${esc(T('cutLink.title'))}</strong></p><p>${esc(T('cutLink.text'))}</p><div class="note-actions">${can ? btn('button button-secondary button-small', 'fill', null, esc(T('fill'))) : ''}${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  if (S.notice === 'oldlink') out += `<div class="note note-old" role="status">${I.info}<div><p><strong>${esc(T('oldLink.title'))}</strong></p><p>${esc(P('oldLink.text', S.dropped))}</p><div class="note-actions">${can ? btn('button button-secondary button-small', 'fill', null, esc(T('fill'))) : ''}${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  if (S.notice === 'restored') {
    const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(S.restoredAt));
    out += `<div class="note note-old" role="status">${I.info}<div><p>${esc(T('restored', { date }))}</p><div class="note-actions">${btn('link-button', 'start-over', null, esc(T('startFresh')), fk('fresh'))}${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  }
  if (S.notice === 'guide') out += guideNote();
  if (S.notice === 'guideMissing') out += `<div class="note note-old" role="status">${I.info}<div><p>${T('guideMissing', { plant: `<i>${esc(S.guidePlant)}</i>`, climate: esc(climateLabel()) })}</p><div class="note-actions">${btn('link-button', 'dismiss', null, esc(T('dismiss')))}</div></div></div>`;
  // A link's country with no entry in the manifest: dropped, and said (never silent).
  if (S.unknownCountry) out += `<div class="note note-old" role="status">${I.info}<div><p>${esc(T('countryUnknown', { code: S.unknownCountry }))}</p><div class="note-actions">${btn('link-button', 'dismiss-country', null, esc(T('dismiss')))}</div></div></div>`;
  return out;
}
function summaryHTML() {
  const ms = members(), jobsDone = jobs.length - jobGaps().length;
  const lastEnd = Math.max(-1, ...ms.map((t) => (t.phases ? phases.indexOf(t.phases.end) : -1)));
  return `<span><b>${esc(P('count', ms.length))}</b> · ${esc(T('basis.room.' + S.site.room))} · ${esc(P('keptCount', ms.filter((t) => S.kept.has(t.id)).length))}</span><span>${esc(T('sumLayers', { n: strataIn(ms).size }))}</span><span>${esc(T('sumJobs', { n: jobsDone }))}</span>${lastEnd >= 0 ? `<span>${esc(T('sumTime', { end: T(W.phaseKey(lastEnd, 'to')) }))}</span>` : ''}`;
}
function mainHTML() {
  if (S.status === 'loading') return `<div class="skeleton" aria-busy="true"><p class="status-line" role="status" id="ct-result-title" tabindex="-1"><span class="spinner" aria-hidden="true"></span>${esc(T('loading', { climate: climateLabel() }))}</p>
    <div class="sk" style="height:46px;width:60%"></div><div class="sk" style="height:22px"></div><div class="sk" style="height:44px;max-width:300px;border-radius:999px"></div><div class="sk sk-draw"></div><div class="sk" style="height:84px"></div></div>`;
  if (S.status === 'error') return `<div class="callout" role="alert">${resultTitle(T('errorTitle'))}<p>${esc(T('errorText'))}</p><div class="actions">${btn('button button-primary', 'retry', null, esc(T('retry')), fk('retry'))}</div></div>`;
  if (S.status === 'notcovered') return notCoveredHTML();
  if (S.status === 'nomatch') return `${notices(fillable())}${noAside() ? placeChips() : ''}${noMatchHTML()}${basisHTML()}`;
  const flags = flagsById(), can = fillable();
  return `${notices(can)}
    <div class="result-head"><div>${resultTitle(T('yourConsortium'))}${noAside() ? '' : `<p class="result-sub">${esc(climateLabel())}${S.country ? ' · ' + esc(warnWhere(W, place())) : ''}</p>`}</div>${noAside() ? placeChips() : ''}</div>
    <p class="summary-strip" id="ct-summary">${summaryHTML()}</p>
    ${builtHTML()}${basisHTML()}${attentionHTML()}${freeRowHTML(can)}
    <div class="tabs" role="tablist" aria-label="${esc(T('yourConsortium'))}">${['layers', 'time', 'jobs'].map((v) => `<button class="tab" role="tab" type="button" id="ct-tab-${v}" aria-selected="${S.view === v}" aria-controls="ct-panel" tabindex="${S.view === v ? 0 : -1}" data-act="view" data-v="${v}" ${fk('tab-' + v)}>${esc(T('tab.' + v))}</button>`).join('')}</div>
    <div role="tabpanel" id="ct-panel" aria-labelledby="ct-tab-${S.view}" class="tabpanel">${S.view === 'layers' ? layersHTML(flags) : S.view === 'time' ? timeHTML(flags) : jobsHTML()}</div>
    ${plantsHTML(flags)}
    <div class="result-foot" role="group" aria-label="${esc(T('shareMenu'))}">${btn('button button-secondary button-small', 'share', null, `${I.link}${esc(T('share'))}`, fk('share'))}${btn('button button-secondary button-small', 'print', null, `${I.printer}${esc(T('print'))}`, fk('print'))}${btn('link-button quiet', 'start-over', null, esc(T('startOver')), fk('start-over'))}</div>`;
}
// A climate with no list yet: what is covered, another climate, and "Ask for this climate".
// The country plays no part here.
function notCoveredHTML() {
  const covered = CLIMATES.filter((c) => fileFor(manifest, c));
  // F9: a cut link waiting for its climate says so here too.
  const cut = S.cutLink ? `<div class="note note-old" role="status">${I.info}<div><p><strong>${esc(T('cutLink.title'))}</strong></p><p>${esc(T('cutLink.text'))}</p></div></div>` : '';
  return `${guideNote(true)}${cut}<div class="callout">${resultTitle(T('nc.title', { climate: climateLabel() }))}
    <p>${esc(P('nc.text', covered.length, { list: W.list(covered.map(W.climate)) }))}</p>
    <div class="actions">${btn('button button-primary', 'open-place', 'climate', esc(T('nc.other')), `aria-haspopup="dialog" ${fk('nc-change')}`)}<a class="text-link" href="${data.contact}">${esc(T('nc.ask'))}</a></div></div>`;
}
// For each site answer a "No match" button can loosen (relaxTo), how many plants it rules out on its own.
function siteCounts() {
  const out = [];
  for (const key of ['light', 'soil', 'water', 'room']) {
    if (!relaxTo(key, S.site)) continue;
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
      const value = T(`site.${c.key}.${relaxTo(c.key, S.site)}`);
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
    ? `<h4>${esc(T('ex.stratum.title'))}</h4><p>${esc(T('ex.stratum'))}</p><ul class="strata-mini" role="list">${strata.map((s) => `<li>${sw(s)}<span><b>${esc(stratumLabel(s))}</b> · ${esc(lightWords(s))}</span></li>`).join('')}</ul>`
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
    return `<button class="plabel" type="button" data-act="details" data-v="${t.id}" ${fk('pl-' + t.id)} style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%;top:${stagger ? (i % 2) * 64 : 0}px"><span class="plabel-top"><span class="num" data-s="${s}" aria-hidden="true">${nums.get(t.id)}</span>${look ? `<span class="plook">${I.warn}<span class="vh">${esc(T('withWarning'))}</span></span>` : ''}</span><span class="pname">${name(t)}</span><span class="vh">, ${esc(stratumLabel(s))}</span></button>`;
  }).join('');
  const key = small || print ? `<ol class="pkey" aria-label="${esc(T('drawingKey'))}">${placed.map((t) => `<li>${print ? `<span class="num" data-s="${t.stratum.value}" aria-hidden="true">${nums.get(t.id)}</span><span class="pkey-name"><span class="pkey-n">${name(t)}</span>${sciHTML(t, 'sci pkey-sci')}</span>` : btn('pkey-item', 'details', t.id, `<span class="num" data-s="${t.stratum.value}" aria-hidden="true">${nums.get(t.id)}</span><span class="pkey-name"><span class="pkey-n">${name(t)}</span>${sciHTML(t, 'sci pkey-sci')}</span>${needsLook(t, flags.get(t.id)) ? `<span class="plook">${I.warn}<span class="vh">${esc(T('withWarning'))}</span></span>` : ''}`, fk('pk-' + t.id))}</li>`).join('')}</ol>` : '';
  const unplaced = members().filter((t) => !t.stratum);
  return `<figure class="profile"${small || print ? '' : ` style="max-width:${Math.round(p.ratio * 320)}px"`}>
    <div class="profile-draw">${p.svg}${p.lineLabels}</div>
    <div class="profile-labels" style="height:${small || print ? 34 : stagger ? 128 : 66}px">${labels}</div>${key}
    <figcaption class="profile-foot"><span>${esc(T('layersNote'))}</span>${unplaced.length ? `<span>${T('noLayerList', { names: W.list(unplaced.map(name)) })}</span>` : ''}</figcaption></figure>`;
}
// The Layers tab: the side view only; the plants are in "Your plants" below every tab (mockup v2).
function layersHTML(flags) {
  return `<div class="view-head"><h3>${esc(T('layersTitle'))}</h3>${explainBtn('stratum', T('whatStratum'), true)}<p class="light-cue">${I.sun}<span>${esc(T('lightCue'))}</span></p></div>
    ${explainPanel('stratum')}${sideViewHTML(flags)}`;
}
// The seam for the side view at every size (scale chunk C): the result and print call only this.
const sideViewHTML = (flags, print = false) => profileHTML(flags, print);
// M19: one primary action (Swap) and two labelled icon buttons (Keep, Remove).
function plantRow(t, nums, flags) {
  const kept = S.kept.has(t.id), fromGuide = S.guideId === t.id, n = nameText(t), crop = isCrop(t.id), from = otherClimateOf(t.id);
  return `<li class="plant" data-id="${t.id}"><span class="num" data-s="${stratumOf(t)}" aria-hidden="true">${nums.get(t.id)}</span>
    <div class="plant-main">
      <button class="plant-head" type="button" data-act="details" data-v="${t.id}" ${fk('pn-' + t.id)}><span class="pn">${name(t)}</span> <span class="sci">${esc(t.canonical_name)}</span></button>
      ${kept || fromGuide ? `<div class="plant-tags">${crop ? `<span class="tag tag-main">${esc(T('mainCrop'))}</span>` : ''}${fromGuide ? `<span class="tag">${I.book}${esc(T('guideTag'))}</span>` : ''}${kept && !crop ? `<span class="tag tag-pin">${I.pinOn}${esc(T('keptTag'))}</span>` : ''}</div>` : ''}
      <p class="plant-reason">${cardReasonHTML(t, W, lang)}</p>
      ${from ? `<div class="plant-tags plant-from"><span class="tag tag-from">${esc(fromListLabel(from))}</span></div>` : ''}
      <div class="plant-meta"><span class="time">${timeHTML1(t)}${t.phases ? ' ' + explainBtn('phase-' + t.id, T('whatPhase')) : ''}</span>${jobsOf(t).map((j) => `<span class="job-tag">${esc(T('job.' + j))}</span>`).join('')}</div>
      ${explainPanel('phase-' + t.id)}${chipsHTML(t, flags)}
    </div>
    <div class="plant-actions">
      ${btn('act act-main', 'swap', t.id, `${I.swap}${esc(T('swap'))}`, `aria-haspopup="dialog" ${fk('sw-' + t.id)}`)}
      ${btn('act act-icon', 'keep', t.id, kept ? I.pinOn : I.pin, `aria-pressed="${kept}" aria-label="${esc(T('keep', { name: n }))}" title="${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}" ${fk('kp-' + t.id)}`)}
      ${btn('act act-icon', 'remove', t.id, I.remove, `aria-label="${esc(T('remove', { name: n }))}" title="${esc(T('remove', { name: n }))}" ${fk('rm-' + t.id)}`)}
    </div></li>`;
}

// ---------- Your plants: Cards or List (design-scale.md §2; chunk B) ----------
// Above 20 plants the side panel folds into the result head (M3), and the warning box has one line per kind.
const big = () => !!cell && (S.status === 'ready' || S.status === 'nomatch') && S.members.length > CARDS_UP_TO;
const noAside = () => phone() || big();
const listMode = () => viewMode(mode, members().length) === 'list';
const lightWords = (s) => (s === 'none' ? T('stratum.none.about') : T('stratum.' + s + '.needs'));
// The words of a filter's value, as its chip and its menu say them.
function filterValue(key, v) {
  if (key === 'layer') return stratumLabel(v);
  if (key === 'job') return T('job.' + v);
  if (key === 'time') return T(W.phaseKey(Number(v), 'plain'));
  if (key === 'warn') return v === 'invasive' ? T('fw.invasive', { country: W.country(S.country) }) : T('fw.' + v);
  return T('fk.' + v);
}
// The values a filter offers: the first is "all" (its empty value).
function filterValues(key) {
  if (key === 'layer') return [['', T('allLayers')], ...[...strata, 'none'].filter((s) => s !== 'none' || members().some((t) => !t.stratum)).map((s) => [s, stratumLabel(s)])];
  if (key === 'job') return [['', T('allJobs')], ...jobs.map((j) => [j, T('job.' + j)])];
  if (key === 'time') return [['', T('allStages')], ...phases.map((_, i) => [String(i), T(W.phaseKey(i, 'plain'))])];
  // C3: "invasive in {country}" only for a country whose invasive list is checked; with none chosen,
  // "invasive somewhere"; with an unchecked one, neither (its status is said once, by the country).
  if (key === 'warn') return [['', T('fk.all')], ...['any', S.country ? (countryChecked() ? 'invasive' : null) : 'somewhere', 'toxic', 'site', 'pests', 'unchecked'].filter(Boolean).map((v) => [v, filterValue('warn', v)])];
  return KEPT_FILTERS.map((v) => [v === 'all' ? '' : v, T('fk.' + v)]);
}
// What the list reads of a plant: its warning kinds (cached per state, like evaluate).
let kindsSrc = null, kindsOut = new Map();
function kindsOf(t) {
  const ev = evaluated();
  if (ev !== kindsSrc) { kindsSrc = ev; kindsOut = new Map(); }
  if (!kindsOut.has(t.id)) kindsOut.set(t.id, warnKinds(t, flagsById().get(t.id), { country: S.country }));
  return kindsOut.get(t.id);
}
const filterCtx = () => ({ kinds: kindsOf, kept: S.kept, crops: S.crops });
// The members the filters let through, by layer, in the order shown.
function listGroups() {
  const all = ordered(), ctx = filterCtx(), on = filtering(F);
  const shown = on ? all.filter((t) => matches(t, F, ctx)) : all;
  return [...strata, 'none'].map((s) => {
    const total = all.filter((t) => stratumOf(t) === s), list = shown.filter((t) => stratumOf(t) === s);
    const choices = on ? fgroups : groups;
    const open = groupOpen(s, { total: foldN ?? all.length, shown: list.length, filtering: on, choice: choices.has(s) ? choices.get(s) : null });
    return { s, total, list, open };
  }).filter((g) => g.total.length);
}
// The rows in view, in order: Shift ranges and "the next row" after Remove read them.
const visibleOrder = () => listGroups().filter((g) => g.open).flatMap((g) => g.list.map((t) => t.id));
const heightText = (t) => { const h = roundHeight(t.traits.height_m?.max); return h == null ? T('noHeight') : T('meters', { v: W.num(h) }); };
function stageShortText(t) {
  const s = stageShort(stageSpan(t));
  if (!s) return '';
  const part = (p) => (p.key ? T(p.key) : W.num(p.num));
  return s.key === 'stageSpan' ? T('stageSpan', { from: part(s.from), to: part(s.to) }) : T(s.key, { a: W.num(s.a), b: W.num(s.b) });
}
// One square per stage, filled where the plant leads; named with the plain words (m7).
function stageBar(t) {
  const sp = stageSpan(t), words = W.timeWords(t).plain;
  return `<span class="stagebar" role="img" aria-label="${esc(words)}" title="${esc(words)}">${phases.map((_, i) => `<i${sp && i >= sp.a && i <= sp.b ? ' data-on="true"' : ''}></i>`).join('')}</span>`;
}
function jobsCells(t) {
  const has = jobsOf(t);
  return jobs.map((j) => (has.includes(j) ? `<span class="ljob" title="${esc(T('job.' + j))}">${jobIcon(j, 16)}<span class="vh">${esc(T('job.' + j))}</span></span>` : '<span class="ljob" aria-hidden="true"></span>')).join('');
}
const BUG = svg(`<ellipse cx="8" cy="9" rx="3.2" ry="4.2" ${st}/><path d="M8 4.8V2.6M6.2 3.2 5 2M9.8 3.2 11 2M4.8 7.4 2.4 6.4M11.2 7.4l2.4-1M4.8 10.6l-2.4 1M11.2 10.6l2.4 1" ${st}/>`, 14);
// C8: "not suited to your site" has its own mark, a place pin, never the invasive warning's.
const SITE = svg(`<path d="M8 14.2s-4.6-4.1-4.6-7.4a4.6 4.6 0 0 1 9.2 0c0 3.3-4.6 7.4-4.6 7.4z" ${st}/><circle cx="8" cy="6.8" r="1.6" ${st}/>`, 14);
const GLOBE = svg(`<circle cx="8" cy="8" r="6.2" ${st} stroke-dasharray="2 1.6"/><path d="M1.8 8h12.4M8 1.8c2 2 2 10.4 0 12.4M8 1.8c-2 2-2 10.4 0 12.4" ${st}/>`, 14);
// A row's warnings: invasive in the chosen country (filled), toxic (red outline), shared pests (a
// quiet outline naming the first two), not suited or a serious conflict, then the soft ones; the
// first two as chips, the rest as "+n" (design-scale.md §2.2, M8).
function rowWarns(t, flags) {
  const out = [], tox = t.warnings.toxicity?.level;
  if (flags.invasive === true) out.push({ cls: 'warn-inv', icon: I.warn, text: T('invHere', { country: W.country(S.country) }) });
  if (tox === 'Moderate' || tox === 'Severe') out.push({ cls: 'warn-tox', icon: I.danger, text: T('tox.' + tox) });
  const pests = pestsOf(flags);
  // C6: the pests by their common names (pests.js); the details keep the scientific one.
  if (pests.length) out.push({ cls: 'warn-pest', icon: BUG, text: capFirst(pests.slice(0, 2).map((a) => pestName(a, lang)).join(' · '), lang) });
  for (const k of flags.misfits) out.push({ cls: 'warn-site', icon: SITE, text: misfitText(t, k) });
  for (const c of flags.conflicts) if (!PEST_TYPES.has(c.type) && isSerious(c)) out.push({ cls: 'warn-site', icon: SITE, text: T('conflict', { other: nameText(otherOf(c, t)) }) });
  if (tox === 'Slight') out.push({ cls: 'warn-soft', icon: I.warn, text: T('tox.Slight') });
  return out;
}
function warnChips(list, max = 2) {
  const shown = list.slice(0, max), rest = list.slice(max);
  return shown.map((w) => `<span class="warn-chip ${w.cls}">${w.icon}<span>${esc(w.text)}</span></span>`).join('')
    + (rest.length ? `<span class="warn-more" title="${esc(rest.map((w) => w.text).join(' · '))}">+${W.num(rest.length)}<span class="vh"> ${esc(P('moreWarnings', rest.length))}: ${esc(W.list(rest.map((w) => w.text)))}</span></span>` : '');
}
// With no country, the soft count of countries in its own muted column (M5); nothing once a country is chosen.
function invCount(t) {
  if (S.country) return '';
  const n = new Set((t.warnings.invasive_in ?? []).map((x) => x.country)).size;
  return n ? `<span class="inv-count" title="${esc(P('invCount', n))}">${GLOBE}<span><span class="vh">${esc(T('col.invIn'))} </span>${esc(P('countryCount', n))}</span></span>` : '';
}
function rowTags(t) {
  const from = otherClimateOf(t.id);
  const tags = `${isCrop(t.id) ? `<span class="tag tag-main">${esc(T('mainCrop'))}</span>` : ''}${S.guideId === t.id ? `<span class="tag">${esc(T('guideTag'))}</span>` : ''}${from ? `<span class="tag tag-from">${esc(fromListLabel(from))}</span>` : ''}`;
  return tags ? `<span class="ltags">${tags}</span>` : '';
}
const rowMenu = (t) => {
  if (rMenu !== t.id) return '';
  const n = nameText(t);
  return `<div class="lmenu" id="ct-rm-${t.id}">${btn('lmenu-item', 'details', t.id, `${I.info}<span>${esc(T('details'))}</span>`, fk('rmenu-' + t.id))}${isCrop(t.id) ? '' : btn('lmenu-item', 'swap', t.id, `${I.swap}<span>${esc(T('swap'))}</span>`, `aria-haspopup="dialog" ${fk('rmenu-' + t.id)}`)}${btn('lmenu-item', 'remove', t.id, `${I.remove}<span>${esc(T('remove', { name: n }))}</span>`, fk('rmenu-' + t.id))}</div>`;
};
function listRow(t, flags) {
  const n = nameText(t), kept = S.kept.has(t.id), picked = sel.has(t.id);
  const tick = `<label class="ltick"><input type="checkbox" data-act="sel" data-v="${t.id}" aria-label="${esc(T('selectPlant', { name: n }))}"${picked ? ' checked' : ''} ${fk('sel-' + t.id)}></label>`;
  const pin = btn('lpin', 'keep', t.id, kept ? I.pinOn : I.pin, `aria-pressed="${kept}" aria-label="${esc(T('keep', { name: n }))}" title="${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}" ${fk('kp-' + t.id)}`);
  const more = `<span class="lmore">${btn('lmore-btn', 'rmenu', t.id, '<span aria-hidden="true">⋯</span>', `aria-expanded="${rMenu === t.id}" aria-controls="ct-rm-${t.id}" aria-label="${esc(T('moreFor', { name: n }))}" ${fk('rmenu-' + t.id)}`)}${rowMenu(t)}</span>`;
  const warns = rowWarns(t, flags);
  const sci = `<i class="lsci">${esc(t.canonical_name)}</i>`;
  const height = `<span class="lheight"><span class="vh">${esc(T('t.height'))} </span>${esc(heightText(t))}</span>`;
  if (phone()) {
    const line3 = warnChips(warns) + invCount(t) + rowTags(t);
    const label = [n, t.canonical_name !== n ? t.canonical_name : '', heightText(t), W.timeWords(t).plain, ...warns.map((w) => w.text), isCrop(t.id) ? T('mainCrop') : ''].filter(Boolean).join(', ');
    return `<li class="lrow lrow-phone" data-id="${t.id}"${picked ? ' data-sel="true"' : ''}>${tick}
      <button class="lname-btn" type="button" data-act="details" data-v="${t.id}" aria-label="${esc(label)}" ${fk('pn-' + t.id)}><span class="lline1"><span class="lname">${name(t)}</span> ${sci}</span>
      <span class="lline2">${height}${stageBar(t)}<span class="ljobs">${jobsCells(t).replace(/<span class="ljob" aria-hidden="true"><\/span>/g, '')}</span></span>${line3 ? `<span class="lline3">${line3}</span>` : ''}</button>${pin}${more}</li>`;
  }
  return `<li class="lrow" data-id="${t.id}"${picked ? ' data-sel="true"' : ''}>${tick}${pin}
    <span class="lplant"><button class="lname-btn" type="button" data-act="details" data-v="${t.id}" ${fk('pn-' + t.id)}><span class="lname">${name(t)}</span>${sci}</button>${rowTags(t)}</span>
    ${height}<span class="lleads">${stageBar(t)}<span class="lstage" aria-hidden="true">${esc(stageShortText(t))}</span></span>
    <span class="ljobs">${jobsCells(t)}</span>${S.country ? '' : `<span class="linv">${invCount(t)}</span>`}<span class="lwarns">${warnChips(warns)}</span>
    ${isCrop(t.id) ? '<span></span>' : btn('act lswap', 'swap', t.id, `${I.swap}<span>${esc(T('swap'))}</span>`, `aria-haspopup="dialog" aria-label="${esc(T('swap'))} ${esc(n)}" ${fk('sw-' + t.id)}`)}${more}</li>`;
}
// The rows as last written, by plant: patchList rewrites only the ones whose markup changed.
// The rows, group heads, results line and selection bar as last written: patchList rewrites only
// the ones whose markup changed.
const rowCache = new Map(), partCache = new Map();
function rowHTML(t, flags) { const html = listRow(t, flags); rowCache.set(t.id, html); return html; }
const part = (key, html) => { partCache.set(key, html); return html; };
function groupHeadHTML(g) {
  const ids = g.list.map((t) => t.id), tick = groupTick(ids, sel), on = filtering(F);
  const warnN = g.list.filter((t) => kindsOf(t).has('any')).length;
  const count = on ? P('shownOf', g.list.length, { total: W.num(g.total.length) }) : P('count', g.total.length);
  const label = [stratumLabel(g.s), lightWords(g.s), count, warnN ? P('withWarnCount', warnN) : ''].filter(Boolean).join(', ');
  const did = new Set(g.list.flatMap(jobsOf));
  const box = `<label class="ltick"><input type="checkbox" data-act="gsel" data-v="${g.s}" aria-label="${esc(T('selectLayer', { layer: stratumLabel(g.s) }))}"${tick === 'all' ? ' checked' : ''}${tick === 'some' ? ' data-mixed="true"' : ''}${ids.length ? '' : ' disabled'} ${fk('gsel-' + g.s)}></label>`;
  return `<div class="lgroup-head">${box}
    <button class="lg-toggle" type="button" data-act="group" data-v="${g.s}" aria-expanded="${g.open}" aria-controls="ct-lg-${g.s}" aria-label="${esc(label)}" ${fk('lg-' + g.s)}>${I.caret}<span class="lg-name">${esc(stratumLabel(g.s))}</span> <span class="lg-light">${esc(lightWords(g.s))}</span></button>
    <span class="lg-count" aria-hidden="true">${esc(count)}</span><span class="lg-jobs" aria-hidden="true">${jobs.map((j) => (did.has(j) ? jobIcon(j, 14) : '<span class="lg-off">–</span>')).join('')}</span>
    <span class="lg-warn" aria-hidden="true">${warnN ? `${I.warn}${esc(P('withWarnCount', warnN))}` : ''}</span></div>`;
}
// An open group holds every row of its layer; the ones a filter hides carry `hidden` (B2: a typed
// search or a filter shows and hides rows, it does not write them again).
function groupHTML(g, flags) {
  const shown = new Set(g.list.map((t) => t.id));
  return `<section class="lgroup" data-s="${g.s}" data-open="${g.open}">${part('head-' + g.s, groupHeadHTML(g))}
    ${g.open && g.list.length ? `<ul class="lrows" id="ct-lg-${g.s}" role="list">${g.total.map((t) => rowHTML(t, flags.get(t.id)).replace('<li ', shown.has(t.id) ? '<li ' : '<li hidden ')).join('')}</ul>` : `<div id="ct-lg-${g.s}" hidden></div>`}</section>`;
}
// The list in place (B2, design-scale.md §2.10): a Keep, a tick, a typed search, a filter or a
// group rewrites the rows whose markup changed, the group heads, the results line and the
// selection bar, and shows or hides the other rows; never the whole result. False when the list
// is not on the page in the shape it was written (refreshList then writes its body again).
// only: the plants whose row may read differently (a Keep, a tick); null for every row. A search,
// a filter or a group changes no row's markup, only which rows show (an empty set).
function patchList(only = null) {
  const body = document.getElementById('ct-lbody');
  if (!body) return false;
  const flags = flagsById(), gs = listGroups(), secs = body.querySelectorAll('.lgroup');
  if (secs.length !== gs.length || gs.some((g, i) => secs[i].dataset.s !== g.s)) return false;
  gs.forEach((g, i) => {
    const sec = secs[i];
    if (sec.dataset.open !== String(g.open) || (g.open && !sec.querySelector('.lrows') !== !g.list.length)) { sec.outerHTML = groupHTML(g, flags); return; }
    const head = sec.querySelector('.lgroup-head'), html = groupHeadHTML(g);
    if (head && partCache.get('head-' + g.s) !== html) head.outerHTML = part('head-' + g.s, html);
    if (!g.open || !g.list.length) return;
    const shown = new Set(g.list.map((t) => t.id)), rows = new Map([...sec.querySelectorAll('.lrow')].map((r) => [r.dataset.id, r]));
    for (const t of g.total) {
      let row = rows.get(t.id);
      if (!row) { sec.outerHTML = groupHTML(g, flags); return; }
      const markup = only && !only.has(t.id) ? rowCache.get(t.id) : listRow(t, flags.get(t.id));
      if (rowCache.get(t.id) !== markup) { rowCache.set(t.id, markup); row.outerHTML = markup; row = [...sec.querySelectorAll('.lrow')].find((r) => r.dataset.id === t.id); }
      if (row && row.hidden !== !shown.has(t.id)) row.hidden = !shown.has(t.id);
    }
  });
  const res = body.querySelector('.fresults'), line = resultsLine();
  if (res && partCache.get('res') !== line) res.innerHTML = part('res', line);
  const bar = body.querySelector('#ct-selbar'), barHTML = selBarHTML();
  if (bar && partCache.get('bar') !== barHTML) bar.innerHTML = part('bar', barHTML);
  markMixed();
  return true;
}
// The filter chips again (their names, their order, an open menu's counts).
function patchChips() {
  const chips = app.querySelector('.fchips');
  if (chips) chips.innerHTML = filterOrder(F, fOrder).map(filterChip).join('');
}
// One chip: its menu opened or closed.
function patchChip(key) {
  const chip = key && app.querySelector(`.fchip[data-key="${key}"]`);
  if (chip) chip.outerHTML = filterChip(key);
}
// The summary line (the kept count).
function patchSummary() { const el = document.getElementById('ct-summary'); if (el) el.innerHTML = summaryHTML(); }
// B4: the selection holds only rows the filters show: Keep n and Remove n act on what the reader sees.
// Returns the plants it unticked (their rows change).
function pruneSel() {
  if (!sel.size || !filtering(F)) return new Set();
  const shown = new Set(listGroups().flatMap((g) => g.list.map((t) => t.id)));
  const gone = new Set([...sel].filter((id) => !shown.has(id)));
  if (gone.size) { sel = new Set([...sel].filter((id) => shown.has(id))); if (anchor && !sel.has(anchor)) anchor = null; }
  return gone;
}
// B3: a plant just added, swapped in or brought back shows in the list: its group opens, and the
// filters that would hide it go.
function reveal(id) {
  if (!listMode()) return;
  const t = taxonOf(id);
  if (!t) return;
  if (filtering(F) && !matches(t, F, filterCtx())) { F = { ...NO_FILTERS }; fOrder = []; fgroups.clear(); }
  (filtering(F) ? fgroups : groups).set(stratumOf(t), true);
}
// The filter row: the text search (the only role=search), then the menu buttons, the active ones
// first, named with their value, each with its own ✕ (M2).
function filterChip(key) {
  const v = F[key], on = v !== '', name = T('f.' + key), open = fMenu === key;
  const label = on ? T('filterOn', { name, value: filterValue(key, v) }) : name;
  // B13: a value's count is what the list would show with it, the other filters and the search as they are.
  const ctx = filterCtx(), ms = open ? members() : [];
  const countOf = (val) => { const probe = { ...F, [key]: val }; return ms.filter((t) => matches(t, probe, ctx)).length; };
  // On a phone the menu is a sheet at the bottom of the screen (B1): its head names the filter.
  const menu = open ? `<div class="fmenu-list" id="ct-fm-${key}"><p class="fmenu-head" aria-hidden="true">${esc(name)}</p>${filterValues(key).map(([val, l]) => btn('fmenu-item', 'fset', `${key}:${val}`, `<span>${esc(capFirst(l, lang))}</span><span class="fmenu-n">${W.num(countOf(val))}</span>`, `aria-pressed="${v === val}" ${fk(`fs-${key}-${val}`)}`)).join('')}</div>` : '';
  return `<span class="fchip${on ? ' is-on' : ''}" data-key="${key}">${btn('fchip-btn', 'fmenu', key, `<span>${esc(label)}</span>${I.caret}`, `aria-expanded="${open}" aria-controls="ct-fm-${key}" ${fk('fm-' + key)}`)}${on ? btn('fchip-x', 'fclear', key, I.close, `aria-label="${esc(T('filterClear', { name: label }))}" ${fk('fx-' + key)}`) : ''}${menu}</span>`;
}
function resultsLine() {
  if (!filtering(F)) return '';
  const n = listGroups().reduce((a, g) => a + g.list.length, 0);
  return `<span>${esc(P('showing', members().length, { n: W.num(n) }))}</span>${btn('link-button', 'fclear-all', null, esc(T('filtersClear')), fk('fclear-all'))}`;
}
// Up to three names, then "and n more" (never "and … and n more"): "A, B, C and 2 more".
function namesLine(ids) {
  const names = ids.slice(0, 3).map((id) => nameText(taxonOf(id)));
  return ids.length > 3 ? `${names.join(lang === 'zh' || lang === 'ja' ? '、' : ', ')} ${P('andMore', ids.length - 3)}` : W.list(names);
}
function selBarHTML() {
  const ids = [...sel].filter((id) => S.members.includes(id));
  if (!ids.length) return '';
  return `<div class="selbar" role="group" aria-label="${esc(T('selection'))}"><p><b>${esc(P('selected', ids.length))}</b> <span class="selnames">${esc(namesLine(ids))}</span></p>
    <div class="selbar-acts">${btn('button button-secondary button-small', 'bulk-keep', null, `${I.pin}<span>${esc(P('keepN', ids.length))}</span>`, fk('bulk-keep'))}${btn('button button-secondary button-small', 'bulk-remove', null, `${I.remove}<span>${esc(P('removeN', ids.length))}</span>`, fk('bulk-remove'))}${btn('link-button', 'unselect', null, esc(T('unselect')), fk('unselect'))}</div></div>`;
}
// The part of the list a filter, a tick or a typed search changes (the search field stays as it is).
function listBodyHTML(flags) {
  return `<p class="fresults">${part('res', resultsLine())}</p>
    <div class="lcols" aria-hidden="true"><span></span><span>${esc(T('col.kept'))}</span><span>${esc(T('p.plant'))}</span><span>${esc(T('t.height'))}</span><span>${esc(T('col.leads'))}</span><span class="lcol-jobs">${jobs.map((j) => jobIcon(j, 14)).join('')}</span>${S.country ? '' : `<span class="lcol-inv">${esc(T('col.invIn'))}</span>`}<span>${esc(T('col.warnings'))}</span></div>
    <div class="lgroups${S.country ? '' : ' no-country'}">${listGroups().map((g) => groupHTML(g, flags)).join('')}</div><div id="ct-selbar" class="selwrap">${part('bar', selBarHTML())}</div>`;
}
function listHTML(flags) {
  const keys = filterOrder(F, fOrder);
  foldN ??= members().length;
  return `<div class="plist">${btn('skip-list', 'skip-list', null, esc(T('skipList')), fk('skip-list'))}
    <div class="lkey"><p><b>${esc(T('jobsKey'))}:</b> ${jobs.map((j) => `<span>${jobIcon(j, 14)}${esc(T('job.' + j))}</span>`).join('')}</p><p><b>${esc(T('stageBar'))}:</b> <span class="stagebar stagebar-key" aria-hidden="true">${phases.map((_, i) => `<i${i >= 3 ? ' data-on="true"' : ''}></i>`).join('')}</span> <span>${esc(T('stageBarKey'))}</span></p></div>
    <div class="ftools" id="ct-ftools"><div class="find" role="search" aria-label="${esc(T('findLabel'))}">${I.search}<input type="search" autocomplete="off" spellcheck="false" aria-label="${esc(T('findLabel'))}" placeholder="${esc(P('findIn', members().length))}" value="${esc(F.q)}" data-input="find" ${fk('find')}></div>
      <div class="fchips">${keys.map(filterChip).join('')}</div></div>
    <div id="ct-lbody" class="lbody">${listBodyHTML(flags)}</div></div>`;
}
// Only the list's body, for typing in its search: the field keeps its focus and caret.
function refreshList() {
  const b = document.getElementById('ct-lbody');
  if (!b) return;
  b.innerHTML = listBodyHTML(flagsById());
  markMixed();
  persist();
}
// The column heads stick right under the sticky filter row, whatever its height (N5).
let toolsObs = null;
function measureTools() {
  const tools = document.getElementById('ct-ftools');
  if (!tools || typeof ResizeObserver === 'undefined') return;
  toolsObs?.disconnect();
  toolsObs = new ResizeObserver(() => app.style.setProperty?.('--x-tools-h', tools.offsetHeight + 'px'));
  toolsObs.observe(tools);
}
function markMixed() { for (const el of app.querySelectorAll('[data-mixed="true"]')) el.indeterminate = true; }
// The cards, grouped by layer as before (up to 20 plants by default).
function cardsHTML(flags) {
  const nums = numbering();
  return `<div class="strata-list">${[...strata, 'none'].map((s) => {
    const list = ordered().filter((t) => stratumOf(t) === s), gaps = S.gaps.filter((g) => g.stratum === s);
    if (s === 'none' && !list.length) return '';
    return `<section class="stratum-group" aria-labelledby="ct-sg-${s}">
      <div class="stratum-head"><h3 id="ct-sg-${s}">${esc(stratumLabel(s))}</h3><p>${esc(lightWords(s))}</p><span class="count">${list.length}</span></div>
      ${list.length ? `<ul class="plants" role="list">${list.map((t) => plantRow(t, nums, flags.get(t.id))).join('')}</ul>` : ''}
      ${gaps.map((g) => `<div class="gap-row"><span>${T('gapRow', { name: g.name })}</span>${btn('button button-secondary button-small', 'open-add', 'stratum:' + s, esc(T('findPlant')), fk('gap-' + g.id))}</div>`).join('')}
      ${!list.length && !gaps.length ? `<div class="gap-row"><span>${esc(T('emptyLayer'))}</span>${btn('button button-secondary button-small', 'open-add', 'stratum:' + s, esc(T('emptyLayerFind')), fk('empty-' + s))}</div>` : ''}
    </section>`;
  }).join('')}</div>`;
}
function plantsHTML(flags) {
  const list = listMode(), n = members().length;
  const modeBtn = (m) => btn('mode-btn', 'mode', m, esc(T(m === 'cards' ? 'viewCards' : 'viewList')), `aria-pressed="${(m === 'list') === list}" ${fk('mode-' + m)}`);
  return `<section class="plants-sec" aria-labelledby="ct-plants-title"><div class="plants-head">
    <h3 id="ct-plants-title" tabindex="-1" ${fk('plants-title')}>${esc(T('yourPlants'))} <span class="count">${W.num(n)}</span></h3>
    <div class="mode-switch" role="group" aria-label="${esc(T('viewAs'))}">${modeBtn('cards')}${modeBtn('list')}</div>
    ${btn('button button-primary button-small add-plants', 'open-add', 'grow', `<span aria-hidden="true">+</span><span>${esc(T('addPlants'))}</span>`, `aria-haspopup="dialog" ${fk('add-plants')}`)}</div>
    ${list ? listHTML(flags) : cardsHTML(flags)}</section>`;
}
// The warning box above 20 plants: one line per kind, each with its count, up to three names and a
// "Show n" that sets the list's Warning filter (design-scale.md §2.6).
function attentionScaleHTML() {
  const ms = members(), any = ms.filter((t) => kindsOf(t).has('any'));
  // §2.6 order: invasive here, toxic, not suited, pests, invasive somewhere, not checked yet.
  const kinds = [S.country && countryChecked() ? ['invasive', I.warn, T('invHere', { country: W.country(S.country) })] : null, ['toxic', I.danger, T('tox.Moderate')], ['site', SITE, T('d.misfit')], ['pests', BUG, T('att.pests')], S.country ? null : ['somewhere', GLOBE, T('att.somewhere')], ['unchecked', I.unknown, T('att.unchecked')]].filter(Boolean);
  const lines = kinds.map(([k, icon, label]) => {
    const list = ms.filter((t) => kindsOf(t).has(k));
    if (!list.length) return '';
    const note = k === 'unchecked' ? `<p class="att-note">${esc(T('att.uncheckedNote'))}</p>` : '';
    return `<li class="att-line att-${k}">${icon}<div><p><strong>${esc(label)}</strong> <span class="count">${W.num(list.length)}</span></p><p class="att-names">${esc(namesLine(list.map((t) => t.id)))}</p>${note}</div>${btn('button button-secondary button-small', 'fset', 'warn:' + k, esc(P('showN', list.length)), fk('att-' + k))}</li>`;
  }).join('');
  if (!lines) return '';
  return `<div class="attention attention-scale">${I.warn}<div><p><strong>${esc(T('withWarning'))}</strong> <span class="muted">${esc(P('attOf', any.length, { total: W.num(ms.length) }))}</span></p><ul class="att-lines" role="list">${lines}</ul></div></div>`;
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
      bar = `<span class="bar" data-open="${b === phases.length - 1}" style="left:calc(${((a / 7) * 100).toFixed(3)}% + 4px);width:calc(${(((b - a + 1) / 7) * 100).toFixed(3)}% - 8px)"></span>`;
    } else bar = `<span class="bar-none">${esc(T('timingUnknown'))}</span>`;
    return `<div class="tl-row"><div class="tl-name">${btn('', 'details', t.id, `<span>${name(t)}</span>${needsLook(t, flags.get(t.id)) ? `<span class="plook">${I.warn}<span class="vh">${esc(T('withWarning'))}</span></span>` : ''}`, fk('tl-' + t.id))}<small>${sciHTML(t)}${sciHTML(t) && ' · '}${timeHTML1(t)} · ${esc(stratumLabel(s))}</small></div>
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
        : `<p class="job-status">${I.check}${esc(P('doneBy', list.length))}</p><ul class="job-who" role="list">${list.map((d) => `<li>${btn('who', 'details', d.t.id, `<span class="num" data-s="${stratumOf(d.t)}" aria-hidden="true">${nums.get(d.t.id)}</span><span>${name(d.t)} <small>${sciHTML(d.t)}${sciHTML(d.t) && ' '}· ${esc(d.how)}</small></span>`, fk(`jw-${j}-${d.t.id}`))}</li>`).join('')}</ul>`}
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
// The guests the core reads beside the cell, with a plant of another list that is not one yet (so its
// warnings beside the members can be read before "Add anyway").
const withGuest = (t) => (otherClimateOf(t.id) && !S.guests.has(t.id) ? [...guestTaxa(), t] : guestTaxa());
function detailsParts(t) {
  const inMembers = S.members.includes(t.id), replacing = inMembers ? null : swapTarget(O);
  // from: the other climate's list it is in (a guest's, or an Add search hit); guest: added from it.
  const from = otherClimateOf(t.id), guest = S.guests.has(t.id), crop = inMembers && isCrop(t.id), sources = sourcesOf(t);
  // From the Swap list, the flags it would carry in that member's place (the list's own), else beside the members.
  const flags = inMembers ? flagsById().get(t.id) : (replacing && swapFlags(replacing, t.id)) || flagsFor(cell, t.id, S.members, { site: S.site, guests: withGuest(t), ...where() });
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
  // Each interaction names all its sources (one record may rest on a host page and a distribution page).
  const conflictFrom = (c) => (c.sources?.length ? `<p class="muted">${esc(T('d.conflictFrom', { sources: W.list(c.sources.map((id) => (cell.sources[id] ?? sources[id])?.label ?? id)) }))}</p>` : '');
  const items = [];
  if (tox && tox.level !== 'None') items.push(item('danger', I.danger, esc(T('tox.' + tox.level)), note(tox.note), `<p class="liab">${esc(T('d.liab'))}</p>`));
  if (flags.invasive === true) items.push(item('warning', I.warn, esc(T('invHere', { country: W.country(S.country) })), esc(T('d.invHere', { country: W.country(S.country) })), `<p class="liab">${esc(T('d.liab'))}</p>`));
  // A country GRIIS has no checklist for: "not checked" there, never "none" (m4).
  const invD = detailsInvasive(W, place(), t);
  if (invD.notChecked) items.push(item('unknown', I.unknown, esc(invD.notChecked.title), esc(invD.notChecked.text)));
  for (const c of flags.conflicts) items.push(item(isSerious(c) ? 'warning' : 'soft', I.warn, T('conflict', { other: name(otherOf(c, t)) }), note(c.note) || esc(T('ctype.' + c.type)), (c.agent ? `<p>${esc(T('d.agent', { agent: c.agent }))}</p>` : '') + conflictFrom(c)));
  for (const k of flags.misfits) items.push(item('warning', I.warn, esc(T('d.misfit')), esc(misfitText(t, k))));
  if (t.warnings.allelopathic === true) items.push(item('soft', I.warn, esc(T('c.allelo')), esc(T('d.allelo'))));
  if (t.warnings.weed_potential === true) items.push(item('soft', I.warn, esc(T('c.spreads')), esc(T('d.spreads'))));
  if (invD.list) items.push(item('soft', I.warn, esc(invD.list.title), '', `<details><summary>${esc(T('d.showList'))}</summary><p>${esc(W.list(invD.list.countries))}</p></details>`));
  if (invD.none) items.push(item('checked', I.check, esc(invD.none.title)));
  if (invD.unknown) items.push(item('unknown', I.unknown, esc(invD.unknown.title), esc(invD.unknown.text)));
  if (tox?.level === 'None') items.push(item('checked', I.check, `${esc(T('d.toxNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (!tox) items.push(item('unknown', I.unknown, esc(T('unkTox')), esc(T('d.toxUnk'))));
  if (t.functions == null) items.push(item('unknown', I.unknown, esc(T(jobsOf(t).length ? 'unkJobsOther' : 'unkJobs')), esc(T('d.jobsUnk'))));
  // M7: false is checked, null is not checked yet; neither is shown as the other.
  const al = t.warnings.allelopathic, wp = t.warnings.weed_potential;
  if (al === false) items.push(item('checked', I.check, `${esc(T('d.alleloNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (al == null) items.push(item('unknown', I.unknown, esc(T('unkAllelo')), esc(T('d.alleloUnk'))));
  if (wp === false) items.push(item('checked', I.check, `${esc(T('d.spreadsNone'))} <span class="muted">(${esc(T('d.checked'))})</span>`));
  if (wp == null) items.push(item('unknown', I.unknown, esc(T('unkSpreads')), esc(T('d.spreadsUnk'))));
  const srcIds = new Set([...(t.reasons ?? []).flatMap((r) => r.sources), ...(t.stratum?.sources ?? []), ...(t.phases?.sources ?? []), ...(t.functions ?? []).flatMap((x) => x.sources), ...(tox?.sources ?? []), ...invasiveSourceIds(inv, sources), ...flags.conflicts.flatMap((c) => c.sources)]);
  const srcs = [...srcIds].map((id) => sources[id] ?? cell.sources[id]).filter(Boolean);
  const guides = (data.plantGuides[t.canonical_name] ?? []).filter(guide);
  const img = t.image, pageHref = safeHref(img?.source_page_url);
  const photo = img ? `<figure class="photo"><img src="${esc(img.url)}" alt="${esc(nameText(t))}" loading="lazy" decoding="async" width="480" height="320"><figcaption>${esc(T('photo', { credit: img.credit ?? '' }))}${img.licence ? ` · ${licenceHTML(img.licence)}` : ''}${pageHref ? ` · <a href="${esc(pageHref)}" rel="noopener">${esc(photoSource(pageHref))}</a>` : ''}</figcaption></figure>` : '';
  const jobsList = jobsOf(t);
  const tags = `${crop ? `<span class="tag tag-main">${esc(T('mainCrop'))}</span>` : ''}${from ? `<span class="tag tag-from">${esc(fromListLabel(from))}</span>` : ''}`;
  const headHTML = `<div><h2 id="ct-dlg-title">${name(t)}</h2><p class="lede"><i>${esc(t.canonical_name)}</i> · ${esc(T('family', { family: t.family }))}</p>${tags ? `<p class="d-tags">${tags}</p>` : ''}</div>`;
  // A main crop says why it is there and what it does (owner, 2026-10-28); a plant from another list
  // says which list, and that its fit here was not checked.
  const mainSec = crop ? `<section class="d-section d-main"><h3>${esc(T('mainCrop'))}</h3><p>${esc(T('mainCropText'))}</p>${btn('link-button', 'change-crops', null, esc(T('changeCrops')), fk('d-crops'))}</section>` : '';
  const fromSec = from ? `<section class="d-section d-from"><h3>${esc(capFirst(fromListLabel(from), lang))}</h3><p>${esc(guest ? T('fromListText', { anyway: T('addAnyway'), list: listName(from), here: listName(S.climate) }) : T('inOtherList', { list: listName(from), here: listName(S.climate) }))}</p></section>` : '';
  const body = `${photo}${mainSec}${fromSec}
    <div class="d-layer"><span>${esc(stratumLabel(s))}${s !== 'none' ? ' · ' + esc(lightWords(s)) : ''}</span><span>${esc(tw.plain)}${tw.term ? ' · ' + esc(tw.term) : ''}</span></div>
    ${t.reasons?.length ? `<section class="d-section"><h3>${esc(T(from ? 'whyInList' : crop ? 'whatItDoes' : 'why'))}</h3>${reasonsHTML(t, W, lang, sources)}</section>` : ''}
    <section class="d-section"><h3>${esc(T('jobsHeading'))}</h3>${!jobsList.length ? `<p class="muted">${esc(T('d.jobsUnk'))}</p>` : `<div class="plant-meta">${jobsList.map((j) => `<span class="job-tag">${jobIcon(j, 14)}${esc(T('job.' + j))}</span>`).join('')}</div>`}</section>
    <section class="d-section"><h3>${esc(T('checks'))}</h3><ul class="w-list" role="list">${items.join('')}</ul></section>
    <section class="d-section"><h3>${esc(T('traits'))}</h3><dl class="facts">${facts.map(([k, v]) => `<dt>${esc(T(k))}</dt><dd>${v || unknown}</dd>`).join('')}</dl></section>
    ${guides.length ? `<section class="d-section"><h3>${esc(T('guides'))}</h3><ul class="guides" role="list">${guides.map((g) => `<li>${guideLink(g, '', (title) => `${I.book}<span>${title}<small>${esc(T('readGuide'))}</small></span>`)}</li>`).join('')}</ul></section>` : ''}
    <section class="d-section"><h3>${esc(T('sources'))}</h3>${srcs.length ? `<ol class="srcs">${srcs.map((x) => { const href = safeHref(x.url); return `<li>${href ? `<a href="${esc(href)}" rel="noopener">${esc(x.label)}</a>` : esc(x.label)}${x.licence ? ` <span class="muted">· ${licenceHTML(x.licence)}</span>` : ''}</li>`; }).join('')}</ol>` : `<p class="muted">${esc(T('noSource'))}</p>`}</section>`;
  const kept = S.kept.has(t.id), n = nameText(t);
  const keepBtn = (cls) => btn(cls, 'keep', t.id, `${kept ? I.pinOn : I.pin}<span>${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}</span>`, `aria-pressed="${kept}" ${fk('d-keep')}`);
  // A main crop has no Swap here: Not a main crop first, then Remove, which also ends it as a crop.
  const foot = crop
    ? `${keepBtn('button button-secondary button-small')}${btn('button button-secondary button-small', 'not-crop', t.id, esc(T('notMainCrop')), fk('d-notcrop'))}${btn('button button-secondary button-small', 'remove', t.id, `${I.remove}<span>${esc(T('remove', { name: n }))}</span>`, fk('d-remove'))}<p class="seg-hint d-foot-note">${esc(T('mainCropRemoveNote'))}</p>`
    : inMembers
    ? `${btn('button button-primary button-small', 'swap', t.id, `${I.swap}${esc(T('swap'))}`, fk('d-swap'))}${btn('button button-secondary button-small', 'keep', t.id, `${kept ? I.pinOn : I.pin}<span>${esc(T(kept ? 'unkeep' : 'keep', { name: n }))}</span>`, `aria-pressed="${kept}" ${fk('d-keep')}`)}${btn('button button-secondary button-small', 'remove', t.id, `${I.remove}<span>${esc(T('remove', { name: n }))}</span>`, fk('d-remove'))}`
    : replacing ? (O.confirm === t.id ? confirmHTML(t.id, 'use') : btn('button button-primary button-small', 'use', t.id, `${I.swap}${esc(T('useInstead'))}`, fk('d-use')))
    : from && !guest ? (O.confirm === t.id ? confirmHTML(t.id, 'add-anyway', from + ':' + t.id) : btn('button button-primary button-small', 'add-anyway', from + ':' + t.id, esc(T('addAnyway')), fk('d-anyway')))
    : O.confirm === t.id ? confirmHTML(t.id, 'add') : btn('button button-primary button-small', 'add', t.id, esc(T('add')), fk('d-add'));
  return { head: headHTML, body, foot };
}
// A flagged plant's confirmation takes the place of its button, inside its own row (a list holds
// only items).
function altRow(t, why, act, label, flags, opts = {}) {
  const confirming = O?.confirm === t.id && !opts.disabled, v = opts.v ?? t.id;
  return `<li class="alt" data-flagged="${flags.flagged}"${confirming ? ' data-confirming="true"' : ''}><div class="alt-main"><span class="alt-name">${btn('link-button alt-link', 'details-from', t.id, name(t), fk('ad-' + t.id))} <span class="sci">${esc(t.canonical_name)}</span></span>
    <span class="alt-why">${why}</span>${chipsHTML(t, flags)}</div>
    ${opts.disabled ? `<span class="already">${I.check}<span>${esc(T('inConsortium'))}</span></span>` : confirming ? confirmHTML(t.id, act, v) : btn(`button button-small ${opts.primary ? 'button-primary' : 'button-secondary'}`, act, v, esc(label), `aria-label="${esc(label)}: ${esc(nameText(t))}" ${fk(act + '-' + t.id)}`)}</li>`;
}
// The flags of a plant in the Swap list of member `from`.
const swapFlags = (from, id) => alternatives(from, S.members, cell, { site: S.site, removed: [...S.removed], guests: guestTaxa(), ...where() }).find((a) => a.taxon.id === id)?.flags ?? null;
// act: 'use', 'add' or 'add-anyway' (B3: a plant of another list asks first too, with the flags it
// would carry beside the members); v: the value its Yes acts on (add-anyway: climate:id).
function confirmHTML(id, act, v = id) {
  const t = taxonOf(id), from = act === 'use' ? swapTarget(O) : null;
  const flags = from ? swapFlags(from, id) : flagsFor(cell, id, S.members, { site: S.site, guests: act === 'add-anyway' || act === 'paste-anyway' ? [...guestTaxa(), t] : guestTaxa(), ...where() });
  return `<div class="confirm" role="alertdialog" aria-labelledby="ct-confirm-t" aria-describedby="ct-confirm-d"><p id="ct-confirm-t"><strong>${T('confirmTitle', { name: name(t) })}</strong></p><p id="ct-confirm-d">${T('confirmText', { warnings: W.list(warnPlain(t, flags, false)) })}</p>
    <div class="actions">${btn('button button-primary button-small', act + '-yes', v, esc(T(act === 'use' ? 'confirmUse' : 'confirmAdd')), fk('confirm-yes'))}${btn('button button-secondary button-small', 'confirm-no', null, esc(T('cancel')), fk('confirm-no'))}</div></div>`;
}
function swapParts(m) {
  const all = alternatives(m.id, S.members, cell, { site: S.site, removed: [...S.removed], guests: guestTaxa(), ...where() });
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
    const why = `<span>${esc(a.sameStratum ? T('sameLayer') : stratumLabel(as))}</span>${shared.length ? `<span>${esc(T('alsoJobs', { jobs: W.list(shared) }))}</span>` : ''}<span class="${lost.length ? 'loses' : 'keeps'}">${esc(lost.length ? T('loses', { jobs: W.list(lost) }) : T('keepsAll'))}</span>`;
    return altRow(a.taxon, why, 'use', T('use'), a.flags, { primary });
  };
  const headHTML = `<div><h2 id="ct-dlg-title">${T('swapTitle', { name: name(m) })}</h2><p class="lede">${esc(mJobs.length ? T('swapNow', { layer: stratumLabel(s), jobs: W.list(mJobs.map((j) => T('job.' + j))) }) : T('swapNowLayer', { layer: stratumLabel(s) }))}</p><p class="lede">${esc(T('swapLede'))}</p>${isCrop(m.id) ? `<p class="note note-dashed swap-crop">${I.pinOn}<span>${esc(T('swapCropNote', { name: nameText(m) }))}</span></p>` : ''}</div>`;
  const body = !all.length ? `<p class="muted">${esc(T('noAlt'))}</p>`
    : `${fit.length ? `<ul class="alt-list" role="list">${fit.map((a, i) => row(a, i === 0)).join('')}</ul>` : ''}
      ${flagged.length ? `<h3 class="list-label">${I.warn} ${esc(T('withWarning'))}</h3><p class="seg-hint">${esc(T('flaggedNote'))}</p><ul class="alt-list" role="list">${flagged.map((a) => row(a, false)).join('')}</ul>` : ''}
      ${more ? `<p>${btn('button button-secondary button-small', 'swap-more', null, esc(P('showMore', more)), fk('swap-more'))}</p>` : ''}`;
  return { head: headHTML, body };
}
// The Add sheet's filter: the one it opened with (job:, stratum:, phase:, grow), then the selects.
function addFilter() {
  const [fkind, fv] = (O.filter || '').split(':');
  return { fkind, fv, jobF: addJob || (fkind === 'job' ? fv : ''), layerF: addLayer || (fkind === 'stratum' ? fv : '') };
}
// The filters the sheet applies to its own list and to the other lists' plants alike (B13).
const addFilters = () => { const { fkind, fv, jobF, layerF } = addFilter(); return { job: jobF, layer: layerF, phase: fkind === 'phase' ? Number(fv) : null }; };
function addResults() {
  const { fkind, fv } = addFilter(), filters = addFilters();
  let list = cell.taxa.filter((t) => addFilterMatch(t, filters));
  const q = fold(addQuery.trim());
  if (q) list = list.filter((t) => searchText(t).includes(q));
  list = [...list].sort((a, b) => nameText(a).localeCompare(nameText(b), lang));
  const flagOf = new Map(list.map((t) => [t.id, flagsFor(cell, t.id, S.members, { site: S.site, guests: guestTaxa(), ...where() })]));
  const fit = list.filter((t) => !flagOf.get(t.id).flagged), flagged = list.filter((t) => flagOf.get(t.id).flagged);
  const row = (t) => addTick(t, flagOf.get(t.id));
  // M11: grouped by layer; plants with a warning last, in their own group.
  const byLayer = [...strata, 'none'].map((s) => {
    const g = fit.filter((t) => stratumOf(t) === s);
    return g.length ? `<h3 class="list-label">${esc(stratumLabel(s))}</h3><ul class="alt-list" role="list">${g.map(row).join('')}</ul>` : '';
  }).join('');
  return `${addCountHTML(list, fkind, fv)}
    ${!list.length ? `<p class="muted">${esc(T('emptyList'))}</p>` : ''}
    ${filters.job && !fit.length && flagged.length ? `<p class="note note-dashed">${I.unknown}<span>${esc(T('noFitForJob'))}</span></p>` : ''}
    ${byLayer}${flagged.length ? `<h3 class="list-label">${I.warn} ${esc(T('withWarning'))}</h3><p class="seg-hint">${esc(T('flaggedNote'))}</p><ul class="alt-list" role="list">${flagged.map(row).join('')}</ul>` : ''}${otherHitsHTML(filters)}`;
}
// C2 (mockup state 09): a tick per plant, kept while the search changes; the plants already in
// are ticked and disabled; each says its layer, height and jobs, and its warnings.
let addTicks = new Set();
function addTick(t, flags) {
  const inside = S.members.includes(t.id), on = inside || addTicks.has(t.id), n = nameText(t);
  const warns = rowWarns(t, flags);
  const meta = [stratumLabel(stratumOf(t)), heightText(t), W.list(jobsOf(t).map((j) => T('job.' + j)))].filter(Boolean).join(' · ');
  return `<li class="paste-row add-row" data-in="${inside}"><label><input type="checkbox" data-act="atick" data-v="${t.id}" aria-label="${esc(T('addOne', { name: n }))}"${on ? ' checked' : ''}${inside ? ' disabled' : ''} ${fk('at-' + t.id)}><span><b>${name(t)}</b> ${sciHTML(t)} <small>${esc(meta)}${inside ? ` · <strong>${esc(T('inConsortium'))}</strong>` : ''}</small>${warns.length ? `<span class="add-warns">${warnChips(warns)}</span>` : ''}</span></label></li>`;
}
// The foot: how many are ticked and which, and "Add n plants".
function addFootHTML() {
  const ids = [...addTicks].filter((id) => !S.members.includes(id) && inCell(id));
  return `<div class="paste-foot"><p class="add-foot-n"><b>${esc(P('paste.toAdd', ids.length))}</b>${ids.length ? ` · <span>${esc(namesLine(ids))}</span>` : ''}</p>${btn('button button-primary button-small', 'add-ticked', null, esc(P('paste.addAll', ids.length)), `${ids.length ? '' : 'disabled '}${fk('add-ticked')}`)}</div>`;
}
const addCountHTML = (list, fkind, fv) => `<p class="list-count" id="ct-add-count">${esc(P('count', list.length))}${fkind === 'phase' ? ' · ' + esc(T('phaseFilter', { stage: T(W.phaseKey(Number(fv), 'plain')) })) : ''}</p>
`;
// "In another climate's list": what the other lists have for a search this list lacks, each with
// "Add anyway". Their files load only once a search is typed (data.ts caches them).
function otherHitsHTML(filters) {
  if (!addQuery.trim()) return '';
  loadOthers();
  if (othersState === 'loading') return '';
  const hits = otherListMatches(addQuery, othersList(), cell).filter((h) => addFilterMatch(h.taxon, filters));
  if (!hits.length) return othersFailedHTML();
  const here = listName(S.climate);
  return `<h3 class="list-label">${esc(T('otherLists'))}</h3><ul class="alt-list" role="list">${hits.map(({ climate, taxon }) => altRow(taxon,
    `<span>${esc(T('inOtherList', { list: listName(climate), here }))}</span><span>${esc(stratumLabel(stratumOf(taxon)))}</span>`,
    'add-anyway', T('addAnyway'), flagsFor(cell, taxon.id, S.members, { site: S.site, guests: [...guestTaxa(), taxon], ...where() }) ?? { flagged: false, conflicts: [], misfits: [] },
    { disabled: S.members.includes(taxon.id), v: climate + ':' + taxon.id })).join('')}</ul>${othersFailedHTML()}`;
}
// B13: a redraw while the reader is in the results (a list arriving) puts the focus back on the
// control that had it.
function refreshAdd() {
  if (O?.type === 'add' && addTab === 'paste') { refreshPaste(); return; }
  const r = O?.type === 'add' && dlg.querySelector('#ct-add-results');
  if (!r) return;
  const had = r.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
  r.innerHTML = addResults();
  if (had) focusFk(had, r) || dlg.querySelector('#ct-add-q')?.focus();
}
function addParts() {
  const { fkind, jobF, layerF } = addFilter();
  const sel = (id, label, all, opts, cur) => `<label class="sel"><span>${esc(label)}</span><select data-filter="${id}" ${fk('f-' + id)}><option value="">${esc(all)}</option>${opts.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  // C12: the sheet "Add plants" opens is titled so; each tab says what it does.
  const title = fkind === 'grow' ? T('addPlants') : T('addTitle');
  const headHTML = `<div><h2 id="ct-dlg-title">${esc(title)}</h2><p class="lede">${esc(addTab === 'paste' ? T('paste.headLede') : T('add.lede'))}</p></div>`;
  const search = `<div class="field"><label for="ct-add-q" class="vh">${esc(T('growHint'))}</label><div class="search">${I.search}<input id="ct-add-q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('growHint'))}" value="${esc(addQuery)}" data-input="add" aria-describedby="ct-add-count" ${fk('add-q')}></div></div>
    <div class="add-filters">${sel('job', T('filterJob'), T('allJobs'), jobs.map((j) => [j, T('job.' + j)]), jobF)}${sel('layer', T('filterLayer'), T('allLayers'), strata.map((s) => [s, stratumLabel(s)]), layerF)}</div>
    <div id="ct-add-results">${addResults()}</div>`;
  // Two real tabs (m5): Search and Paste a list.
  const tabs = `<div class="add-tabs" role="tablist" aria-label="${esc(T('addPlants'))}">${['search', 'paste'].map((v) => `<button class="add-tab" role="tab" type="button" id="ct-at-${v}" aria-selected="${addTab === v}" aria-controls="ct-ap-${v}" tabindex="${addTab === v ? 0 : -1}" data-act="add-tab" data-v="${v}" ${fk('at-' + v)}>${esc(T('tab.' + v))}</button>`).join('')}</div>`;
  const body = `${tabs}<div role="tabpanel" id="ct-ap-${addTab}" aria-labelledby="ct-at-${addTab}">${addTab === 'paste' ? pasteHTML() : search}</div>`;
  return { head: headHTML, body, foot: addTab === 'paste' ? `<div id="ct-paste-foot" class="paste-foot-wrap">${pasteFootHTML()}</div>` : `<div id="ct-add-foot" class="paste-foot-wrap">${addFootHTML()}</div>` };
}
// ---------- Paste a list (design-scale.md §2.5, state 10) ----------
// The paste read against this climate's list, the other lists loaded so far and the members; once per change.
let pasteKey = '', pasteOut = null;
const pasteOpen = new Map();
function pasteResult() {
  const col = pasteColumn(pasteText, pasteCol), key = [pasteText, col, S.members.join(), othersState, others.size].join('|');
  if (key !== pasteKey) {
    pasteKey = key;
    pasteOut = readPaste(pasteNames(pasteText, col), { cell, others: othersList(), members: S.members });
    // Names no list here has: the other lists may (loaded once, as Add anyway does).
    if (pasteOut.none.length && othersState === 'idle') loadOthers();
  }
  return pasteOut;
}
// "3 plants added and kept · 1 with a warning." (B7, C1): the count of the warned ones joins the sentence.
const addedText = (n, warned) => (warned ? P('paste.added', n).replace(/([.。])$/, ` · ${P('withWarnCount', warned)}$1`) : P('paste.added', n));
// One tick per plant, wherever it shows (B8): the reader's, else pasteDefault (found: ticked).
const ticked = (id) => (pasteTicks.has(id) ? pasteTicks.get(id) : pasteDefault(pasteResult(), id));
// The plants Add all adds: the found ones still ticked, then the ones ticked in Choose, each once;
// a Choose line of another climate's list names it, so its plant joins as a guest (B5).
function pasteToAdd(withList = false) {
  const r = pasteResult(), out = new Map();
  for (const f of r.found) if (ticked(f.taxon.id)) out.set(f.taxon.id, null);
  for (const c of r.choose) for (const t of c.taxa) if (!c.inside.includes(t.id) && !out.has(t.id) && ticked(t.id)) out.set(t.id, c.climate ? { climate: c.climate, taxon: t } : null);
  return withList ? out : [...out.keys()];
}
function pasteCountText() {
  if (!pasteText.trim()) return T('paste.empty');
  const r = pasteResult();
  return [['paste.found', r.found.length], ['paste.choose', r.choose.length], ['paste.other', r.other.length], ['paste.none', r.none.length], ['paste.already', r.already.length]].filter(([, n]) => n).map(([k, n]) => P(k, n)).join(' · ');
}
function pasteColsHTML() {
  const { columns } = pasteTable(pasteText), col = pasteColumn(pasteText, pasteCol);
  if (columns < 2) return '';
  return `<label class="paste-cols"><span>${esc(T('paste.columns', { n: W.num(columns) }))}</span> <select data-paste-col ${fk('paste-col')}>${Array.from({ length: columns }, (_, i) => `<option value="${i}"${i === col ? ' selected' : ''}>${esc(T('paste.column', { n: W.num(i + 1), sample: columnSample(pasteText, i) }))}</option>`).join('')}</select></label>`;
}
const pasteFacts = (t) => `<small>${esc(stratumLabel(stratumOf(t)))} · ${esc(heightText(t))}</small>`;
function pasteTick(t, opts = {}) {
  const on = opts.inside || ticked(t.id);
  return `<li class="paste-row"><label><input type="checkbox" data-act="ptick" data-v="${t.id}"${on ? ' checked' : ''}${opts.inside ? ' disabled' : ''} ${fk('pt-' + t.id)}><span><b>${name(t)}</b> ${sciHTML(t)} ${pasteFacts(t)}${opts.close ? ` <span class="paste-close">${esc(T('paste.close', { name: opts.close }))}</span>` : ''}${opts.inside ? ` <span class="already">${esc(T('inConsortium'))}</span>` : ''}</span></label></li>`;
}
// A group that folds when long: Found above 10 rows, Already in above 10 (§2.5 item 9).
function pasteGroup(id, label, n, inner, fold = n > 10) {
  const open = pasteOpen.has(id) ? pasteOpen.get(id) : !fold;
  return `<details class="paste-group" data-g="${id}"${open ? ' open' : ''}><summary><span class="list-label">${esc(label)}</span> <span class="count">${W.num(n)}</span></summary>${inner}</details>`;
}
function pasteGroupsHTML() {
  if (!pasteText.trim()) return '';
  const r = pasteResult(), here = listName(S.climate), out = [];
  if (r.other.length) out.push(`<h3 class="list-label paste-label">${esc(T('otherLists'))} <span class="count">${W.num(r.other.length)}</span></h3><ul class="alt-list" role="list">${r.other.map(({ name: typed, climate, taxon }) => altRow(taxon,
    `<span>${esc(T('inOtherList', { list: listName(climate), here }))}</span><span class="tag tag-from">${esc(fromListLabel(climate))}</span>${fold(typed) !== fold(taxon.canonical_name) ? `<span class="paste-typed">${esc(typed)}</span>` : ''}`,
    'paste-anyway', T('addAnyway'), flagsFor(cell, taxon.id, S.members, { site: S.site, guests: [...guestTaxa(), taxon], ...where() }) ?? { flagged: false, conflicts: [], misfits: [] },
    { disabled: S.members.includes(taxon.id), v: climate + ':' + taxon.id })).join('')}</ul>`);
  if (r.none.length) out.push(`<section class="paste-none"><h3 class="list-label paste-label">${esc(T('paste.g.none'))} <span class="count">${W.num(r.none.length)}</span></h3><p>${esc(T('paste.noneText'))}</p><ul class="paste-names" role="list">${r.none.map((x) => `<li>${esc(x.name)}</li>`).join('')}</ul>
    <p class="paste-acts">${btn('button button-secondary button-small', 'paste-copy', null, esc(P('paste.copy', r.none.length)), fk('paste-copy'))}<a class="text-link" href="${data.contact}">${esc(T('paste.ask'))}</a></p></section>`);
  if (r.choose.length) out.push(pasteGroup('choose', T('paste.g.choose'), r.choose.length, `<p class="seg-hint">${esc(T('paste.chooseHint'))}</p>${r.choose.map((c) => `<fieldset class="paste-choose"><legend>${esc(c.name)}${c.climate ? ` <span class="tag tag-from">${esc(fromListLabel(c.climate))}</span>` : ''}</legend><ul role="list">${c.taxa.map((t) => pasteTick(t, { inside: c.inside.includes(t.id) })).join('')}</ul></fieldset>`).join('')}`, false));
  if (r.found.length) out.push(pasteGroup('found', T('paste.g.found'), r.found.length, `<ul class="paste-list" role="list">${r.found.map((f) => pasteTick(f.taxon, { close: f.close })).join('')}</ul>`));
  if (r.already.length) out.push(pasteGroup('already', T('paste.g.already'), r.already.length, `<ul class="paste-names" role="list">${r.already.map((f) => `<li>${name(f.taxon)} ${sciHTML(f.taxon)}${f.climate ? ` <span class="tag tag-from">${esc(fromListLabel(f.climate))}</span>` : ''}</li>`).join('')}</ul>`));
  if (othersState === 'failed' && r.none.length) out.push(othersFailedHTML());
  return out.join('');
}
function pasteHTML() {
  return `<p class="paste-lede">${esc(T('paste.lede'))}</p><label for="ct-paste" class="vh">${esc(T('paste.label'))}</label>
    <textarea id="ct-paste" class="paste-box" rows="6" spellcheck="false" autocomplete="off" data-input="paste" aria-describedby="ct-paste-count" ${fk('paste')}>${esc(pasteText)}</textarea>
    <div id="ct-paste-cols">${pasteColsHTML()}</div><p id="ct-paste-count" class="list-count" role="status">${esc(pasteCountText())}</p>
    <div id="ct-paste-out">${pasteGroupsHTML()}</div>`;
}
// The foot: "n to add" on one line, any Choose name with nothing ticked on the next, and Add all (N10).
function pasteFootHTML() {
  if (!pasteText.trim()) return '';
  const n = pasteToAdd().length, r = pasteResult();
  const untouched = r.choose.filter((c) => !c.taxa.some((t) => !c.inside.includes(t.id) && ticked(t.id)) && c.inside.length < c.taxa.length);
  return `<div class="paste-foot"><p><b>${esc(P('paste.toAdd', n))}</b>${untouched.map((c) => `<span>${esc(T('paste.noneTicked', { name: c.name }))}</span>`).join('')}</p>${btn('button button-primary button-small', 'paste-add', null, esc(P('paste.addAll', n)), `${n ? '' : 'disabled '}${fk('paste-add')}`)}</div>`;
}
// A redraw of the results and the foot: the field keeps its text and caret, the count line is written
// in place (one live region), folded groups stay as the reader left them.
function refreshPaste() {
  if (O?.type !== 'add' || addTab !== 'paste') return;
  const out = dlg.querySelector('#ct-paste-out');
  if (!out) return;
  for (const d of out.querySelectorAll('details[data-g]')) pasteOpen.set(d.dataset.g, d.open);
  const had = out.contains(document.activeElement) || dlg.querySelector('#ct-paste-foot')?.contains(document.activeElement) ? fkOf(document.activeElement) : null;
  const cols = dlg.querySelector('#ct-paste-cols');
  if (cols && !cols.contains(document.activeElement)) cols.innerHTML = pasteColsHTML();
  out.innerHTML = pasteGroupsHTML();
  const count = dlg.querySelector('#ct-paste-count');
  if (count) { const text = pasteCountText(); if (count.textContent !== text) count.textContent = text; }
  const foot = dlg.querySelector('#ct-paste-foot');
  if (foot) foot.innerHTML = pasteFootHTML();
  if (had && !dlg.contains(document.activeElement)) focusFk(had, dlg) || focusFk('paste', dlg);
}
function sheetHTML() {
  let p;
  if (O.type === 'details') p = detailsParts(taxonOf(O.id));
  else if (O.type === 'swap') p = swapParts(taxonOf(O.id));
  else if (O.type === 'add') p = addParts();
  else if (O.type === 'place') p = O.which === 'climate'
    ? { head: `<div><h2 id="ct-dlg-title">${esc(T('step1'))}</h2><p class="lede">${esc(T('step1.lede'))}</p></div>`, body: climateChoices() }
    : { head: `<div><h2 id="ct-dlg-title">${esc(T('countrySheet.title'))}</h2><p class="lede">${esc(T('countrySheet.lede'))}</p></div>`, body: countryPicker() + privacy() };
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
    const from = otherClimateOf(t.id), tags = [isCrop(t.id) && T('mainCrop'), from && fromListLabel(from)].filter(Boolean);
    return `<tr data-id="${t.id}"><td>${esc(stratumLabel(s))}</td><td><b>${nums.get(t.id)}. ${name(t)}</b><br><i class="muted">${esc(t.canonical_name)}</i>${tags.length ? `<br><span class="muted">${esc(tags.join(' · '))}</span>` : ''}</td><td>${esc(tw.plain)}<br><span class="muted">${esc(tw.term)}</span></td><td>${esc(W.list(jobsOf(t).map((j) => T('job.' + j))))}</td><td>${w || `<span class="muted">${esc(T(printNoneKey(t, place(), S.guests.has(t.id))))}</span>`}</td></tr>`;
  }).join('');
  const bands = phaseBands.map((k) => {
    const inBand = ms.filter((t) => bandsOf(t).includes(k));
    return `<div><h3>${esc(T('band.' + k + '.print'))}</h3><ul>${inBand.map((t) => `<li>${name(t)}${sciHTML(t, 'muted') && ' ' + sciHTML(t, 'muted')}</li>`).join('')}</ul></div>`;
  }).join('');
  const gapJobs = jobGaps();
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date());
  if (big()) return printTableHTML(ms, flags, date, gapJobs);
  return `<article class="sheet">
    <div class="sheet-head"><div><h2 class="sheet-title">${esc(T('printTitle'))}</h2><p class="muted">${esc(climateLabel())} · ${esc(printWhere(W, place()))} · ${esc(date)}</p>
    <p class="muted">${esc(T('basis', { site: basisText() }))} · ${esc(P('count', ms.length))}</p></div><img src="/canopi-logo.svg" width="34" height="34" alt=""></div>
    <div class="sheet-draw">${sideViewHTML(flags, true)}</div>
    <section><h3>${esc(T('tab.layers'))}</h3><table><thead><tr><th>${esc(T('p.layer'))}</th><th>${esc(T('p.plant'))}</th><th>${esc(T('p.time'))}</th><th>${esc(T('p.jobs'))}</th><th>${esc(T('withWarning'))}</th></tr></thead><tbody>${rows}</tbody></table></section>
    <section><h3>${esc(T('tab.time'))}</h3><div class="sheet-phases">${bands}</div></section>
    ${gapJobs.length ? `<section><h3>${esc(T('printGaps'))}</h3><ul>${gapJobs.map((j) => `<li>${esc(T('job.' + j + '.gap'))}</li>`).join('')}</ul></section>` : ''}
    <p class="muted small">${esc(T('d.liab'))}</p>
    <p class="sheet-foot">${esc(T('printFoot', { url: shareLink() }))}</p></article>`;
}

// Above 20 plants: "Your consortium", then one table grouped by layer with its light words: plant,
// height, leads, jobs, kept, warnings in words (design-scale.md §1c.12). The drawing joins it with
// the side view at every size (chunk C).
function printTableHTML(ms, flags, date, gapJobs) {
  const groupsOf = [...strata, 'none'].map((s) => [s, ms.filter((t) => stratumOf(t) === s)]).filter(([, l]) => l.length);
  const body = groupsOf.map(([s, list]) => `<tbody><tr class="print-layer"><th colspan="6">${esc(stratumLabel(s))} · ${esc(lightWords(s))} · ${esc(P('count', list.length))}</th></tr>${list.map((t) => {
    const w = warnPlain(t, flags.get(t.id)).join('<br>');
    const from = otherClimateOf(t.id), tags = [isCrop(t.id) && T('mainCrop'), from && fromListLabel(from)].filter(Boolean);
    return `<tr data-id="${t.id}"><td><b>${name(t)}</b> <i class="muted">${esc(t.canonical_name)}</i>${tags.length ? ` <span class="muted">· ${esc(tags.join(' · '))}</span>` : ''}</td><td>${esc(heightText(t))}</td><td>${esc(stageShortText(t) || W.timeWords(t).plain)}</td><td>${esc(W.list(jobsOf(t).map((j) => T('job.' + j))))}</td><td>${S.kept.has(t.id) ? esc(T('keptTag')) : ''}</td><td>${w || `<span class="muted">${esc(T(printNoneKey(t, place(), S.guests.has(t.id))))}</span>`}</td></tr>`;
  }).join('')}</tbody>`).join('');
  return `<article class="sheet sheet-big">
    <div class="sheet-head"><div><h2 class="sheet-title">${esc(T('yourConsortium'))}</h2><p class="muted">${esc(climateLabel())} · ${esc(printWhere(W, place()))} · ${esc(date)}</p>
    <p class="muted">${esc(T('basis', { site: basisText() }))} · ${esc(P('count', ms.length))} · ${esc(P('keptCount', ms.filter((t) => S.kept.has(t.id)).length))}</p></div><img src="/canopi-logo.svg" width="34" height="34" alt=""></div>
    <table class="print-table"><thead><tr><th>${esc(T('p.plant'))}</th><th>${esc(T('t.height'))}</th><th>${esc(T('col.leads'))}</th><th>${esc(T('p.jobs'))}</th><th>${esc(T('col.kept'))}</th><th>${esc(T('withWarning'))}</th></tr></thead>${body}</table>
    ${gapJobs.length ? `<section><h3>${esc(T('printGaps'))}</h3><ul>${gapJobs.map((j) => `<li>${esc(T('job.' + j + '.gap'))}</li>`).join('')}</ul></section>` : ''}
    <p class="muted small">${esc(T('d.liab'))}</p>
    <p class="sheet-foot">${esc(T('printFoot', { url: shareLink() }))}</p></article>`;
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
  const setup = S.status === 'setup' || S.status === 'boot', crops = S.status === 'crops';
  // The crop question keeps the head as it was: full after the climate cards, compact from a result
  // (or a guide's link, compact from the first paint: ConsortiumPage.astro).
  // A climate's file loading (or failing) before the crop question holds it too.
  const holdHead = crops || (S.askCrops && (S.status === 'loading' || S.status === 'error'));
  if (!holdHead) { head.classList.toggle('tool-head-compact', !setup); head.dataset.step = setup ? '0' : '1'; }
  if (S.status === 'boot') return;
  const asideTop = app.querySelector('.aside')?.scrollTop ?? 0;
  app.innerHTML = crops ? cropsHTML() : setup ? setupHTML() : `<div class="tool-grid${S.status === 'ready' && noAside() ? ' tool-grid-full' : ''}">${asideHTML()}<section class="result" aria-labelledby="ct-result-title">${mainHTML()}</section></div>`;
  const aside = app.querySelector('.aside');
  if (aside) aside.scrollTop = asideTop;
  markMixed(); measureTools();
  app.removeAttribute('aria-busy');
  if (O) renderSheet();
  const target = focusNext; focusNext = null;
  if (target === 'crops') document.getElementById('ct-st2')?.focus();
  else if (target === 'result') {
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
}
const headerMenuOpen = () => !!document.querySelector('[data-nav-menu][open], [data-lang-menu][open]');
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
  addTab = 'search'; pasteText = ''; pasteCol = 0; pasteTicks = new Map(); pasteOpen.clear(); clearTimeout(pasteTimer);
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
const anywayFor = (id) => !!otherClimateOf(id) && !S.guests.has(id);
const confirmFrom = (id) => (O.type === 'details' ? (swapTarget(O) ? 'd-use' : anywayFor(id) ? 'd-anyway' : 'd-add') : (O.type === 'swap' ? 'use-' : anywayFor(id) ? (addTab === 'paste' ? 'paste-anyway-' : 'add-anyway-') : 'add-') + id);
dlg.addEventListener('cancel', (e) => { if (O?.confirm) { e.preventDefault(); const id = O.confirm; O.confirm = null; renderSheet(confirmFrom(id)); } else if (O?.back) { e.preventDefault(); O = O.back; renderSheet(); } });

function toast(text, undo = null, extra = '') {
  clearTimeout(toastTimer);
  if (undo !== 'redo') undoRedo = null;
  toastEl.innerHTML = `<span>${text}</span>${extra || undo ? `<span class="toast-acts">${extra}${undo ? btn('button', 'undo', undo, esc(T('undo')), fk('undo')) : ''}</span>` : ''}`;
  toastEl.hidden = false;
  if (!undo && !extra) toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() { toastEl.hidden = true; toastEl.innerHTML = ''; }
function say(text) { sayEl.textContent = ''; setTimeout(() => { sayEl.textContent = text; }, 60); }
// m9: a search announces how many it found once typing pauses, not every list it redraws.
let sayTimer = 0;
const sayLater = (text) => { clearTimeout(sayTimer); sayTimer = setTimeout(() => say(text), 500); };

// The state in the address bar (a share link) and on this device (the last consortium).
// A link still waiting for its climate file (not covered yet) keeps its own plants, so a reload or
// a copied address loses nothing (M2). A guessed country is never written (the reader did not choose
// it); "No country" (k=-) only goes to this device's saved state.
function stateNow(saved = false) {
  const p = S.pending?.state;
  const members = p ? p.members : linkMembers(S.status, S.members);
  // A guest the consortium no longer holds leaves the link.
  const guests = [...S.guests].filter(([id]) => S.members.includes(id) || S.kept.has(id)).map(([id, g]) => ({ id, climate: g.climate }));
  return { climate: S.climate, ...linkCountry(S, saved), site: S.site, kept: p ? p.kept : keptList(), removed: p ? p.removed : [...S.removed], members, plants: p?.plants ?? [], crops: p ? p.crops : [...S.crops], guests: p ? p.guests : guests };
}
// The link's own prefixes, written back exactly as they came (shortening them without the cell
// could make two plants share one): a v3 link's tokens come back the same from encodeState; a v2
// link is written back as v2.
function pendingQuery(saved = false) {
  // F9: a link that came cut stays cut (no end marker) while it waits, so a later visit still says so.
  if (S.pending.version === 3) { const q = encodeState(stateNow(saved)); if (S.cutLink) q.delete('e'); return q; }
  const q = encodeState({ ...stateNow(saved), kept: [], removed: [], members: null, crops: [], guests: [] });
  q.set('v', '2'); q.delete('e');
  const st = S.pending.state;
  if (st.kept.length) q.set('p', st.kept.join('.'));
  if (st.removed.length) q.set('x', st.removed.join('.'));
  if (st.members) q.set('a', st.members.join('.'));
  return q;
}
// The link's query: a token is written whole only when another plant of the files at hand shares
// its first 36 bits (state.ts).
const linkQuery = (saved = false) => (S.pending ? pendingQuery(saved) : encodeState(stateNow(saved), cell, Object.fromEntries(others)));
// The address Copy link and print give: the tool's state alone, never an old link's `mine`.
const shareLink = () => shareUrl(location, linkQuery(false), MINE);
function persist() {
  // The crop question is not written: a reload asks it again, or returns to the result it came from.
  if (!S.climate || !manifest || !mayPersist(S) || S.status === 'setup' || S.status === 'crops') return;
  const query = (saved) => linkQuery(saved).toString();
  const q = query(false);
  lastHash = '#' + q;
  memory.write(location.pathname, lastHash, { countrySource: S.countrySource, climateSource: S.climateSource });
  syncLangLinks();
  if (S.status === 'ready') memory.save(query(true), S.countrySource);
}
// The fragment persist() last wrote. Another tool state typed or pasted into the address bar (or
// Back to an earlier one) opens it: the page reloads to read it. A page anchor (the skip link's
// #main, #donate) is not a state: the consortium's fragment is written back (C8).
let lastHash = location.hash;
addEventListener('hashchange', () => {
  if (isToolState(new URLSearchParams(location.hash.slice(1)))) { if (location.hash !== lastHash) location.reload(); }
  // After every other listener (the Donate dialog opens on #donate), so its anchor is read first.
  else setTimeout(persist);
});
// seam M1: the header's language links (inline menu and phone Menu) lead to this page in another
// language with the address bar's fragment, so a language switch keeps what is shown: a guide's
// preset, a link still waiting for its place, or the consortium itself.
const langLinks = [...document.querySelectorAll('[data-lang-menu] a, .nav-panel-langs a')].map((a) => [a, a.getAttribute('href')]);
// They carry nothing else: never the reader's own country choice (core-fix review 3, M-1).
function syncLangLinks() { const h = langHash(location.hash); for (const [a, href] of langLinks) a.setAttribute('href', withHash(href, h)); }

// ---------- Actions ----------
// An Undo offered for an earlier state no longer applies once the consortium is made again, refilled
// or moved to another place (B2, m1): its toast goes.
function dropUndo() {
  if (lastRemoved || undoStart || undoRedo || lastBulk) { lastRemoved = null; undoStart = null; undoRedo = null; lastBulk = null; if (toastEl.querySelector('[data-act=undo]')) hideToast(); }
}
// F2: a site or place change makes the plants that are not kept again; the result before it comes
// back with Undo. A run of changes (arrow keys through a radio group) keeps the result before the
// first one. redoNext waits for a climate's file; undoRedo is the one the toast offers.
let undoRedo = null, redoNext = null;
function holdForRedo(focus, place) {
  const snap = undoRedo ?? redoNext ?? (S.status === 'ready'
    ? { S: { ...S, site: { ...S.site }, members: [...S.members], kept: new Set(S.kept), removed: new Set(S.removed), gaps: [...S.gaps], crops: [...S.crops], guests: new Map(S.guests) }, cell, focus } : null);
  if (snap && place) snap.place = true;
  redoNext = snap;
}
function offerRedo() {
  const snap = redoNext; redoNext = null;
  if (!snap || (snap.cell === cell && S.status === 'ready' && snap.S.members.join() === S.members.join() && snap.S.gaps.length === S.gaps.length)) return;
  undoRedo = snap;
  const key = redoToastKey(snap, S.crops);
  toast(esc(key === 'redoneClimate' ? T('redoneClimate', { climate: W.climate(snap.S.climate) }) : T(key)), 'redo');
}
function recompute() {
  dropUndo();
  const r = suggest(cell, { site: S.site, kept: keptList(), removed: [...S.removed], guests: guestTaxa() });
  S.members = r.members.map((m) => m.taxon.id); S.gaps = [];
  S.status = S.members.length ? 'ready' : 'nomatch';
}
function setClimate(c) {
  // B6: only a climate the reader picks here reads "chosen by you".
  S.climate = c; S.climateSource = 'user';
  try { localStorage.setItem('canopi-climate', c); } catch {}
  document.documentElement.dataset.climate = c;
  dispatchEvent(new StorageEvent('storage', { key: 'canopi-climate', newValue: c }));
}
// Each call has a number; a file that arrives after a later call started is dropped (M1), so the
// plants shown are always the climate shown.
let loadSeq = 0;
async function resolveClimate() {
  const run = ++loadSeq;
  if (!S.climate) { S.status = 'setup'; render(); return; }
  const mc = fileFor(manifest, S.climate);
  if (!mc) { cell = null; S.status = 'notcovered'; focusNext = 'result'; render(); offerRedo(); findGuidePlant(); return; }
  S.status = 'loading';
  // min-8: the loading screen replaces whatever had the focus (Retry, a place, a closed sheet's opener),
  // so the focus waits on its status line.
  focusNext = 'result';
  render();
  let next, nextLabels;
  try {
    [next, nextLabels] = await Promise.all([loadClimate(mc.file), labels ?? loadLabels().catch(() => null)]);
  } catch {
    if (run !== loadSeq) return;
    S.status = 'error'; focusNext = 'retry'; render(); offerRedo(); return;
  }
  if (run !== loadSeq) return;
  cell = next; labels = nextLabels;
  const keep = (ids) => ids.filter((id) => cell.taxa.some((t) => t.id === id));
  S.kept = new Set(keep(keptList())); S.removed = new Set(keep([...S.removed]));
  if (S.pending) {
    // A link's plants from other lists need their lists first.
    const lists = [...new Set((S.pending.state.guests ?? []).map((g) => g.climate))].filter((c) => c !== S.climate && fileFor(manifest, c) && !others.has(c));
    if (lists.length) {
      const { files, failed } = await loadLists(lists, (c) => loadClimate(fileFor(manifest, c).file));
      if (run !== loadSeq) return;
      for (const [c, f] of files) others.set(c, f);
      // B2: a guest's list that did not load is an error with Retry, the link kept as it came (S.pending
      // stays, so persist and Copy link still carry every guest); never "no longer listed".
      if (failed.length) { S.status = 'error'; focusNext = 'retry'; render(); offerRedo(); return; }
    }
    const asked = S.pending.state.members;
    const r = resolveState(S.pending, cell, Object.fromEntries(others)), st8 = r.state;
    // G2: cutLink holds only while the cut link waits; once applied, the notice below says it.
    const cut = S.cutLink;
    S.pending = null; S.cutLink = false;
    S.guests = new Map(st8.guests.map((g) => { const f = others.get(g.climate); return [g.id, { climate: g.climate, taxon: f.taxa.find((t) => t.id === g.id), sources: f.sources }]; }));
    S.kept = new Set(st8.kept); S.removed = new Set(st8.removed); S.crops = [...st8.crops];
    if (S.guidePlant) {
      // m5: the plant the core pinned, by the core's own rule; "left out" only when it dropped it.
      S.guideId = taxonByName(cell, S.guidePlant)?.id ?? null;
      S.notice = r.dropped.some((d) => d.key === 'plant') ? 'guideMissing' : 'guide';
    }
    const lost = droppedPlants(r.dropped);
    if (lost) { S.dropped = lost; S.notice = 'oldlink'; }
    // B1: a cut or unreadable link says plants may be missing, whatever could be counted.
    if (cut) S.notice = 'cutlink';
    // A guide's food plant of this climate opens the crop question with it chosen; any other plant
    // of a guide is kept and the result shows at once, as before.
    const food = S.askCrops && S.guidePlant ? taxonOf(S.guideId) : null;
    if (S.askCrops && (!S.guidePlant || isFood(food))) {
      if (food) { S.crops = [food.id]; S.cropFromGuide = food.id; S.notice = null; }
      showCrops(); return;
    }
    S.askCrops = false;
    // m3: a link whose every member is gone gets a fresh suggestion; an emptied consortium stays empty,
    // unless the link was cut (B1): its plants were lost, not removed.
    if (st8.members && (st8.members.length || (!asked?.length && !cut))) { S.members = st8.members.filter((id) => inCell(id) || S.guests.has(id)); S.status = 'ready'; } else recompute();
  } else if (S.askCrops) { showCrops(); return; } else recompute();
  // The result takes the focus only from the loading line (or nothing): a user who moved on keeps their place.
  const at = document.activeElement;
  if (!at || at === document.body || at.id === 'ct-result-title') focusNext = 'result';
  render(); offerRedo();
  say(S.status === 'ready' ? T('announce', { summary: P('count', S.members.length) }) : T('nm.title'));
}
// The crop question, once the climate's file is loaded. The focus goes to its heading only from the
// loading line (or nothing), as for a result.
function showCrops() {
  S.status = 'crops'; cropQuery = '';
  const at = document.activeElement;
  if (!at || at === document.body || at.id === 'ct-result-title') focusNext = 'crops';
  render(); offerRedo();
}
// A shared consortium belongs to its climate: once the user picks another climate it is left behind
// (M1, M2), and only a guide's plant goes on to the new climate. An Undo for the old climate no
// longer applies (B2).
function leaveLink() {
  S.cutLink = false; // G2: a link left behind no longer waits
  if (!S.pending) return;
  const plants = S.pending.state.plants ?? [];
  S.pending = plants.length ? decodeState(new URLSearchParams({ plant: plants[0] })) : null;
}
// min-1: the notices of the link that opened the page go with it.
// The country of someone else's link goes too (keptCountry): the next consortium is the reader's.
function leaveClimate() { Object.assign(S, afterMove(S), keptCountry(S, own())); leaveLink(); }
// What keptCountry falls back to: the reader's own choice (device, else tab), else the browser's guess.
const own = () => ({ pref: memory.pref(), guess: browserCountry, known: (c) => isCountry(manifest, c) });
// The country only changes the warnings: the members stay, and no Undo is needed or dropped.
// B10: the Warning filter keeps a value the new country offers: "invasive in" and "invasive
// somewhere" trade places, and one the country has no list for is cleared.
function keepWarnFilter() {
  if (!F.warn || filterValues('warn').some(([v]) => v === F.warn)) return;
  const swap = { invasive: 'somewhere', somewhere: 'invasive' }[F.warn];
  F = { ...F, warn: swap && filterValues('warn').some(([v]) => v === swap) ? swap : '' };
  if (!F.warn) fOrder = fOrder.filter((k) => k !== 'warn');
}
function chooseCountry(code) {
  S.country = code; S.countrySource = 'user'; S.noCountry = !code; S.unknownCountry = null; S.linkCode = null; countryQuery = '';
  keepWarnFilter();
  memory.choose(code);
  // Every caller acts from the country sheet.
  closeSheet(false);
  render(); syncLangLinks(); focusFk('pc-country', app);
  say(countryAnnouncement(W, place()));
}
const act = {
  // A new climate asks the crop question again: crops and plants from other lists belong to the old one.
  climate(v) { if (S.status !== 'setup') holdForRedo('pc-climate', true); setClimate(v); dropUndo(); resetList(); leaveClimate(); Object.assign(S, { crops: [], guests: new Map(), cropFromGuide: null, askCrops: true, cropsBack: false }); if (O) closeSheet(false); resolveClimate(); },
  'crop-add'(v) {
    if (cropFull() || isCrop(v) || !isFood(taxonOf(v))) return;
    S.crops.push(v); cropQuery = ''; focusNext = cropFull() ? 'suggest' : 'crop-q'; render();
    say(cropFull() ? T('crops.full', { max: W.num(MAX_CROPS) }) : P('crops.chosen', S.crops.length, { max: W.num(MAX_CROPS) }));
  },
  // Without the crop, the suggestion is made without it: it is no longer kept either.
  'crop-remove'(v) {
    S.crops = S.crops.filter((id) => id !== v); S.kept.delete(v); if (S.cropFromGuide === v) S.cropFromGuide = null;
    focusNext = 'crop-q'; render(); if (S.crops.length) say(P('crops.chosen', S.crops.length, { max: W.num(MAX_CROPS) }));
  },
  suggest() {
    for (const id of S.crops) { S.kept.add(id); S.removed.delete(id); }
    S.askCrops = false; S.cropsBack = false; cropQuery = '';
    recompute(); focusNext = 'result'; render(); offerRedo();
    say(S.status === 'ready' ? T('announce', { summary: P('count', S.members.length) }) : T('nm.title'));
  },
  // From a result: the question again, with the crops chosen; "Back to your consortium" and Undo
  // return to the result it left.
  'change-crops'() {
    dropUndo(); redoNext = null; holdForRedo('change-crops', false);
    if (redoNext) redoNext.crops = true;
    Object.assign(S, { status: 'crops', askCrops: true, cropsBack: !!redoNext }); cropQuery = '';
    if (O) closeSheet(false);
    focusNext = 'crops'; render();
  },
  // B5: the consortium comes back; the country chosen since stays.
  'crops-back'() { const snap = redoNext; redoNext = null; if (!snap) return; S = keepCountry(snap.S, S); cell = snap.cell; evalKey = ''; fillKey = ''; focusNext = 'change-crops'; render(); },
  'not-crop'(v) { S.crops = S.crops.filter((id) => id !== v); render(); if (O) renderSheet('d-keep'); toast(T('notMainCropNow', { name: name(taxonOf(v)) })); },
  country(v) { if (isCountry(manifest, v)) chooseCountry(v.toUpperCase()); },
  'no-country'() { chooseCountry(null); },
  'dismiss-country'() { Object.assign(S, noLinkCode); focusNext = 'result'; render(); },
  'open-place'(v, el) { openSheet({ type: 'place', which: v }, el); },
  'open-site'(_, el) { openSheet({ type: 'site' }, el); },
  'focus-site'() { const p = document.getElementById('ct-site-panel'); p?.scrollIntoView({ block: 'nearest' }); focusFk('site-light-' + S.site.light, app); },
  retry() { resolveClimate(); },
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
  // Only a misfit or a serious conflict asks first; a plant invasive in the reader's country carries
  // its warning chip and asks nothing (owner, 2026-10-28).
  use(v) { const from = swapTarget(O); if (swapFlags(from, v)?.flagged) { O.confirm = v; renderSheet('confirm-yes'); } else act['use-yes'](v); },
  // B10: a main crop swapped is no longer one, and the toast says so.
  'use-yes'(v) {
    const old = swapTarget(O), a = taxonOf(old), b = taxonOf(v);
    pinView();
    const r = afterSwap(S, old, v);
    Object.assign(S, { members: r.members, kept: r.kept, removed: r.removed, crops: r.crops });
    closeSheet(false); reveal(v); focusNext = 'pn-' + v; render(); flash(v); toast(T(r.endedCrop ? 'swappedCrop' : 'swapped', { a: name(a), b: name(b) }));
  },
  'confirm-no'() { const id = O.confirm; O.confirm = null; renderSheet(confirmFrom(id)); },
  remove(v) {
    const t = taxonOf(v), idx = S.members.indexOf(v);
    pinView();
    // A plant from another list is not "removed" from this one: it simply leaves.
    S.members = S.members.filter((id) => id !== v); if (!S.guests.has(v)) S.removed.add(v); const wasKept = S.kept.delete(v);
    const crop = S.crops.indexOf(v); if (crop >= 0) S.crops.splice(crop, 1);
    S.gaps.push({ stratum: stratumOf(t), name: name(t), id: v });
    lastRemoved = { id: v, idx, wasKept, crop };
    closeSheet(false); render(); toast(T('removed', { name: name(t) }), 'remove'); focusFk('undo', toastEl);
  },
  undo(v) {
    hideToast();
    if (v === 'bulk' && lastBulk) {
      // One step back for a bulk Keep, Remove or Add: the plants, their kept pins and crops as they were.
      const b = lastBulk; lastBulk = null;
      Object.assign(S, { members: b.members, kept: b.kept, removed: b.removed, crops: b.crops, guests: b.guests, gaps: b.gaps, status: b.status });
      // The focus goes to a row the reader can see (B4): the first one back that shows, else the
      // first one back, its group opened and the filters that hide it cleared.
      const here = b.ids.filter((id) => S.members.includes(id));
      let back = here.find((id) => visibleOrder().includes(id));
      if (!back && here.length) { back = here[0]; reveal(back); }
      focusNext = back && listMode() ? 'sel-' + back : back ? 'pn-' + back : 'plants-title';
      render(); if (!app.contains(document.activeElement)) focusFk('plants-title', app);
      return;
    }
    if (v === 'start' && undoStart) {
      // B2: the state, its cell and its own Undo come back together.
      S = keepCountry(undoStart.S, S); ({ cell, lastRemoved } = undoStart); restoreList(undoStart.list); undoStart = null; evalKey = ''; focusNext = 'start-over'; render(); return;
    }
    if (v === 'redo' && undoRedo) {
      const u = undoRedo; undoRedo = null; redoNext = null; loadSeq++;
      S = keepCountry(u.S, S); cell = u.cell; evalKey = ''; focusNext = u.focus; render();
      if (!app.contains(document.activeElement)) focusFk('basis', app) || document.getElementById('ct-result-title')?.focus();
      say(T('announce', { summary: P('count', S.members.length) }));
      return;
    }
    const r = lastRemoved; if (!r) return;
    S.members.splice(r.idx, 0, r.id); S.removed.delete(r.id); if (r.wasKept) S.kept.add(r.id); if (r.crop >= 0) S.crops.splice(r.crop, 0, r.id);
    S.gaps = S.gaps.filter((g) => g.id !== r.id); lastRemoved = null; reveal(r.id); focusNext = 'pn-' + r.id; render(); flash(r.id);
  },
  keep(v) {
    const t = taxonOf(v);
    // A main crop is kept: no longer keeping it ends it as a main crop too.
    if (S.kept.has(v)) { S.kept.delete(v); S.crops = S.crops.filter((id) => id !== v); toast(T('unkeptNow', { name: name(t) })); } else { S.kept.add(v); toast(T('keptNow', { name: name(t) })); }
    // B2: in the list, a Keep rewrites its row, the heads and the summary line, not the result.
    if (listMode() && !O && !isCrop(v) && patchList(new Set([v]))) { patchSummary(); if (fMenu === 'kept') patchChip('kept'); focusFk('kp-' + v, app); persist(); return; }
    render(); if (O) renderSheet();
  },
  'open-add'(v, el) { addQuery = ''; addJob = ''; addLayer = ''; addTicks = new Set(); if (O) { O = { type: 'add', filter: v || '' }; renderSheet('add-q'); } else openSheet({ type: 'add', filter: v || '' }, el); },
  add(v) { const f = flagsFor(cell, v, S.members, { site: S.site, guests: guestTaxa(), ...where() }); if (f?.flagged) { O.confirm = v; renderSheet('confirm-yes'); } else act['add-yes'](v); },
  // M4: Add adds the one plant asked for; "Fill the free places" is the only refill.
  'add-yes'(v) {
    pinView(); S.kept.add(v); S.removed.delete(v);
    if (S.status === 'nomatch') recompute();
    else if (!S.members.includes(v)) {
      dropUndo();
      S.members.push(v); S.gaps = trimGaps(S.gaps, [stratumOf(taxonOf(v))], limit() - S.members.length);
    }
    S.view = 'layers'; closeSheet(false); reveal(v); focusNext = 'pn-' + v; render(); flash(v); toast(T('added', { name: name(taxonOf(v)) }));
  },
  // "Add anyway": a plant of another climate's list joins as a kept guest, labelled with its list.
  // A flagged one asks first, as Add does (B3); it joins only on Yes.
  'add-anyway'(v) {
    const [c, id] = String(v).split(':'), t = others.get(c)?.taxa.find((x) => x.id === id);
    if (!t || inCell(id)) return;
    const f = flagsFor(cell, id, S.members, { site: S.site, guests: [...guestTaxa(), t], ...where() });
    if (f?.flagged) { O.confirm = id; renderSheet('confirm-yes'); } else act['add-anyway-yes'](v);
  },
  'add-anyway-yes'(v) {
    const [c, id] = String(v).split(':'), f = others.get(c), t = f?.taxa.find((x) => x.id === id);
    if (!t || inCell(id)) return;
    S.guests.set(id, { climate: c, taxon: t, sources: f.sources });
    act['add-yes'](id);
  },
  atick(v) {
    if (S.members.includes(v)) return;
    addTicks = new Set(addTicks); if (addTicks.has(v)) addTicks.delete(v); else addTicks.add(v);
    const box = dlg.querySelector(`[data-act="atick"][data-v="${CSS.escape(v)}"]`); if (box) box.checked = addTicks.has(v);
    const foot = dlg.querySelector('#ct-add-foot'); if (foot) foot.innerHTML = addFootHTML();
  },
  // "Add n plants" adds the ticked plants as Add all does (decision b49117c): no question, the
  // toast counts the ones with a warning; the sheet stays open for more.
  'add-ticked'() {
    const ids = [...addTicks].filter((id) => !S.members.includes(id) && inCell(id)); if (!ids.length) return;
    dropUndo(); lastBulk = snapshot(ids); pinView();
    S.kept = new Set(S.kept); S.removed = new Set(S.removed);
    for (const id of ids) { S.members.push(id); S.kept.add(id); S.removed.delete(id); }
    if (S.status === 'nomatch') S.status = 'ready';
    S.gaps = trimGaps(S.gaps, ids.map((id) => stratumOf(taxonOf(id))), 0);
    addTicks = new Set(); render(); renderSheet('add-q');
    const warned = ids.filter((id) => kindsOf(taxonOf(id)).has('any')).length;
    toast(esc(addedText(ids.length, warned)), 'bulk',
      warned ? btn('button', 'show-warned', null, esc(P('showN', warned)), fk('show-warned')) : '');
  },
  'others-retry'() { retryOthers(); refreshCrops(true); refreshAdd(); },
  fill() {
    const before = S.members.length;
    pinView();
    S.members = suggest(cell, { site: S.site, kept: [...new Set([...S.members, ...S.kept])], removed: [...S.removed], guests: guestTaxa() }).members.map((m) => m.taxon.id);
    const added = S.members.slice(before);
    if (added.length) dropUndo();
    S.gaps = trimGaps(S.gaps, added.map((id) => stratumOf(taxonOf(id))), limit() - S.members.length);
    if (S.notice === 'oldlink' || S.notice === 'cutlink') S.notice = null;
    focusNext = added.length ? 'pn-' + added[0] : 'result'; render(); if (added.length) flash(added[0]);
    toast(esc(P('filled', added.length)));
  },
  relax(k) { const to = relaxTo(k, S.site); if (!to) return; S.site = { ...S.site, [k]: to }; recompute(); focusNext = 'result'; render(); },
  close() { if (O?.back) { O = O.back; renderSheet(); } else closeSheet(); },
  // B16: the toast says what the link holds (its plants, its size) and how it opens; a guessed
  // country is never written in it, and the toast says so, with the country to choose.
  async share() {
    persist();
    const link = shareLink();
    try { await navigator.clipboard.writeText(link); } catch { toast(esc(T('copyFailed'))); return; }
    const size = new Intl.NumberFormat(lang, { style: 'unit', unit: 'kilobyte', unitDisplay: 'short', maximumFractionDigits: 1 }).format(Math.max(0.1, link.length / 1000));
    const head = P('share.copied', S.members.length, { size }), country = S.country ? W.country(S.country) : '';
    if (S.country && S.countrySource === 'guess') toast(esc(`${head} ${T('share.guess', { country })}`), null, btn('button', 'share-guess', null, esc(T('share.useGuess', { country })), fk('share-guess')));
    else toast(esc(`${head} ${S.country ? T('share.opensWith', { country }) : T('share.opensNoCountry')}`));
  },
  'share-guess'() { if (!S.country) return; hideToast(); chooseCountry(S.country); act.share(); },
  print() { printEl.innerHTML = printHTML(); print(); },
  'start-over'() {
    // The reader's own country stays (m12); someone else's link's country and unknown code go
    // (keptCountry: core-fix review 4, m-1; m-3).
    const kept = keptCountry(S, own());
    undoStart = { S, cell, lastRemoved, list: listState() }; lastRemoved = null; redoNext = null; S = fresh(); S.status = 'setup'; cell = null; loadSeq++; resetList();
    Object.assign(S, kept);
    if (siteClimate()) { S.climate = siteClimate(); S.climateSource = 'site'; }
    memory.startOver(location.pathname);
    // F7: lastHash is always the fragment the page last wrote, so the link that was open, pasted back, opens.
    lastHash = location.hash;
    syncLangLinks(); render(); toast(esc(T('startOverDone')), 'start'); focusFk('undo', toastEl);
  },
  dismiss() { S.notice = null; focusNext = 'result'; render(); },
  // ---------- Your plants: the switch, the list, its filters and selection (chunk B) ----------
  mode(v) { mode = v === 'list' ? 'list' : 'cards'; focusNext = 'mode-' + mode; render(); },
  group(v) { const g = listGroups().find((x) => x.s === v); if (!g) return; (filtering(F) ? fgroups : groups).set(v, !g.open); relist('lg-' + v, new Set()); },
  // B2: a menu opening or closing rewrites its own chip (and the one it closes), nothing else.
  fmenu(v) {
    const was = fMenu, row = rMenu; fMenu = fMenu === v ? null : v; rMenu = null;
    if (!app.querySelector('.fchips')) { focusNext = 'fm-' + v; render(); return; }
    if (was && was !== v) patchChip(was);
    patchChip(v); if (row) patchList(new Set([row]));
    focusFk('fm-' + v, app);
  },
  fset(v) {
    const i = String(v).indexOf(':'), key = v.slice(0, i), val = v.slice(i + 1);
    if (!FILTER_KEYS.includes(key)) return;
    // "Show n" in the warning box opens the list, whatever the reader chose before.
    setFilters({ ...F, [key]: val }, [...fOrder.filter((k) => k !== key), ...(val ? [key] : [])], 'fm-' + key);
  },
  fclear(v) { setFilters({ ...F, [v]: '' }, fOrder.filter((k) => k !== v), 'fm-' + v); },
  'fclear-all'() { setFilters({ ...NO_FILTERS }, [], 'find'); },
  // A tick, or with Shift every row from the last one ticked (Shift+click, Shift+Space).
  sel(v, _el, e) {
    const on = !sel.has(v), range = anchor && anchor !== v && (e?.shiftKey || (!e?.detail && shiftDown));
    const before = sel;
    if (range) sel = selectRange(visibleOrder(), anchor, v, sel, on);
    else { sel = new Set(sel); if (on) sel.add(v); else sel.delete(v); }
    anchor = v; relist('sel-' + v, new Set([...before, ...sel].filter((id) => before.has(id) !== sel.has(id))));
  },
  gsel(v) {
    const g = listGroups().find((x) => x.s === v); if (!g) return;
    const ids = g.list.map((t) => t.id), all = groupTick(ids, sel) === 'all';
    sel = new Set(sel); for (const id of ids) { if (all) sel.delete(id); else sel.add(id); }
    relist('gsel-' + v, new Set(ids));
  },
  unselect() { const was = sel; sel = new Set(); anchor = null; relist('find', was); },
  'bulk-keep'() {
    const ids = [...sel].filter((id) => S.members.includes(id)); if (!ids.length) return;
    dropUndo(); lastBulk = snapshot(ids);
    S.kept = new Set(S.kept); for (const id of ids) S.kept.add(id);
    focusNext = 'bulk-keep'; render(); toast(esc(P('keptN', ids.length)), 'bulk');
  },
  // Remove keeps the filters, the open groups and the place in the list: the focus goes to the next row (m2).
  'bulk-remove'() {
    const ids = [...sel].filter((id) => S.members.includes(id)); if (!ids.length) return;
    const order = visibleOrder(), last = Math.max(...ids.map((id) => order.indexOf(id)));
    const next = order.slice(last + 1).find((id) => !sel.has(id)) ?? [...order].reverse().find((id) => !sel.has(id));
    const names = namesLine(ids);
    dropUndo(); lastBulk = snapshot(ids); pinView();
    const gone = new Set(ids);
    S.members = S.members.filter((id) => !gone.has(id)); S.kept = new Set([...S.kept].filter((id) => !gone.has(id))); S.crops = S.crops.filter((id) => !gone.has(id));
    S.removed = new Set(S.removed); for (const id of ids) if (!S.guests.has(id)) S.removed.add(id);
    sel = new Set(); anchor = null;
    focusNext = next ? 'sel-' + next : 'plants-title'; render();
    if (!app.contains(document.activeElement)) focusFk('plants-title', app);
    toast(esc(P('removedN', ids.length, { names })), 'bulk');
  },
  rmenu(v) {
    const was = rMenu, chip = fMenu; rMenu = rMenu === v ? null : v; fMenu = null;
    if (chip) patchChip(chip);
    relist('rmenu-' + v, new Set([was, v].filter(Boolean)));
  },
  'skip-list'() { focusFk('share', app); },
  'add-tab'(v) { addTab = v === 'paste' ? 'paste' : 'search'; O.confirm = null; renderSheet('at-' + addTab); },
  ptick(v) { pasteTicks.set(v, !ticked(v)); refreshPaste(); focusFk('pt-' + v, dlg); },
  'paste-copy'() { const names = pasteResult().none.map((x) => x.name).join('\n'); navigator.clipboard?.writeText(names).then(() => toast(esc(T('paste.copied'))), () => {}); },
  // Add all: the ticked plants join, kept (plants added by hand are kept), in one step Undo takes back.
  // Flagged plants join without a question (decision b49117c); the toast counts them, with a Show
  // that sets the Warning filter (B7, C1), and their warnings stay on their rows.
  'paste-add'() {
    const picked = pasteToAdd(true), ids = [...picked.keys()].filter((id) => !S.members.includes(id)); if (!ids.length) return;
    dropUndo(); lastBulk = snapshot(ids);
    S.kept = new Set(S.kept); S.removed = new Set(S.removed); S.guests = new Map(S.guests);
    for (const id of ids) {
      const g = picked.get(id);
      if (g) S.guests.set(id, { climate: g.climate, taxon: g.taxon, sources: others.get(g.climate)?.sources ?? {} });
      S.members.push(id); S.kept.add(id); S.removed.delete(id);
    }
    if (S.status === 'nomatch') S.status = 'ready';
    S.gaps = trimGaps(S.gaps, ids.map((id) => stratumOf(taxonOf(id))), 0);
    resetFold(); closeSheet(false); focusNext = 'plants-title'; render();
    const warned = ids.filter((id) => kindsOf(taxonOf(id)).has('any')).length;
    toast(esc(addedText(ids.length, warned)), 'bulk',
      warned ? btn('button', 'show-warned', null, esc(P('showN', warned)), fk('show-warned')) : '');
  },
  'show-warned'() { hideToast(); if (O) closeSheet(false); act.fset('warn:any'); },
  'paste-anyway'(v) {
    const [c, id] = String(v).split(':'), t = others.get(c)?.taxa.find((x) => x.id === id);
    if (!t || inCell(id)) return;
    const f = flagsFor(cell, id, S.members, { site: S.site, guests: [...guestTaxa(), t], ...where() });
    if (f?.flagged) { O.confirm = id; renderSheet('confirm-yes'); } else act['paste-anyway-yes'](v);
  },
  // From a paste, "Add anyway" adds the one plant and the sheet stays open on the rest of the list.
  'paste-anyway-yes'(v) {
    const [c, id] = String(v).split(':'), f = others.get(c), t = f?.taxa.find((x) => x.id === id);
    if (!t || inCell(id) || S.members.includes(id)) return;
    dropUndo(); pinView();
    S.guests.set(id, { climate: c, taxon: t, sources: f.sources }); S.members.push(id); S.kept.add(id); S.removed.delete(id);
    if (S.status === 'nomatch') S.status = 'ready';
    O.confirm = null; render(); renderSheet('paste'); toast(T('added', { name: name(t) }));
  },
  goto(v) { S.view = 'layers'; reveal(v); focusNext = 'pn-' + v; render(); flash(v); },
};
// What Undo restores after a bulk step, and the plants it named (the focus returns to the first).
// B15: the gaps a step leaves and the status come back too.
const snapshot = (ids) => ({ ids, members: [...S.members], kept: new Set(S.kept), removed: new Set(S.removed), crops: [...S.crops], guests: new Map(S.guests), gaps: [...S.gaps], status: S.status });
// The list in place, the focus on the control the action names.
function relist(key, only = null) { if (!patchList(only)) refreshList(); focusFk(key, app); }
// New filters: the groups opened under the old ones are forgotten, hidden ticks go (B4), and the
// list is patched where it shows (a "Show n" from the cards opens the list first).
function setFilters(next, order, focusKey) {
  F = next; fOrder = order; fgroups.clear(); fMenu = null;
  const unticked = pruneSel();
  if (listMode() && app.querySelector('.fchips') && patchList(unticked)) {
    patchChips();
    const find = app.querySelector('[data-input="find"]'); if (find && find.value !== F.q) find.value = F.q;
    focusFk(focusKey, app);
  }
  else { if (!listMode()) mode = 'list'; focusNext = focusKey; render(); }
  sayResults();
}
// m9: the filtered count, once, after the change.
const sayResults = () => { const n = listGroups().reduce((a, g) => a + g.list.length, 0); sayLater(filtering(F) ? P('showing', members().length, { n: W.num(n) }) : P('count', members().length)); };
// The menus close on any other action or a click outside them (their state is in the page, so Escape
// and a click elsewhere act the same).
function closeMenus() {
  if (!fMenu && !rMenu) return false;
  fMenu = null; rMenu = null;
  for (const m of app.querySelectorAll('.fmenu-list, .lmenu')) m.remove();
  for (const b of app.querySelectorAll('.fchip-btn[aria-expanded="true"], .lmore-btn[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
  return true;
}
// The plant's card, or its row in the list (B3); with neither in view the focus goes to the heading.
function flash(id) {
  const el = app.querySelector(`.plant[data-id="${CSS.escape(id)}"], .lrow[data-id="${CSS.escape(id)}"]`);
  if (!el) { if (!app.contains(document.activeElement)) focusFk('plants-title', app); return; }
  el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  el.dataset.flash = 'true';
}

const root = document.querySelector('.ct');
const MENU_ACTS = new Set(['fmenu', 'rmenu']);
root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  // A click anywhere but a menu button closes an open menu (its items act, then it closes too).
  if (!el || !MENU_ACTS.has(el.dataset.act)) closeMenus();
  if (!el) return;
  const fn = act[el.dataset.act];
  if (!fn) return;
  // A checkbox ticks itself: the page redraws it from the selection right after.
  if (el.getAttribute('type') !== 'checkbox') e.preventDefault();
  // A double click on Remove removes one plant: the list shifts, and the second click would land on
  // the next plant's Remove (appendix).
  if (el.dataset.act === 'remove') {
    const now = performance.now();
    if (repeatClick(e.detail, now, lastRemoveAt)) return;
    lastRemoveAt = e.detail ? now : null;
  }
  fn(el.dataset.v, el, e);
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
    const k = el.dataset.site;
    // C10, B11: the room limits the plants' size, never their number: on a result a room change only
    // flags the plants that no longer fit (evaluate), and Fill fills up to the room's suggestion size.
    if (siteChangeRebuilds(k, S.status)) {
      holdForRedo(`site-${k}-${S.site[k]}`, false);
      S.site = { ...S.site, [k]: el.value }; recompute(); render(); offerRedo();
    } else { S.site = { ...S.site, [k]: el.value }; render(); }
    if (O) renderSheet();
    say(S.status === 'ready' ? T('announce', { summary: P('count', S.members.length) }) : T('nm.title'));
  }
  if ('pasteCol' in el.dataset) { pasteCol = Number(el.value) || 0; pasteTicks = new Map(); refreshPaste(); return; }
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
  if (el.dataset.input === 'crop') { cropQuery = el.value; refreshCrops(); }
  // The list's search redraws the rows at once and says the count once typing pauses.
  if (el.dataset.input === 'find') {
    F = { ...F, q: el.value }; fgroups.clear();
    if (!patchList(pruneSel())) refreshList();
    if (fMenu) patchChip(fMenu);
    sayResults();
  }
  if (el.dataset.input === 'paste') { pasteText = el.value; clearTimeout(pasteTimer); pasteTimer = setTimeout(refreshPaste, 500); }
  if (el.dataset.input === 'add') {
    addQuery = el.value; O.confirm = null; dlg.querySelector('#ct-add-results').innerHTML = addResults();
    sayLater(dlg.querySelector('#ct-add-count')?.textContent ?? '');
  }
});
// Shift held while Space ticks a box: a range (the click a key makes carries no modifier everywhere).
addEventListener('keydown', (e) => {
  shiftDown = e.shiftKey;
  // "/" goes to the list's search when the focus is not in a field (design-scale.md §2.9).
  const at = document.activeElement, field = at && (/^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName) || at.isContentEditable);
  if (e.key === '/' && !field && !dlg.open && !e.ctrlKey && !e.metaKey) { const f = app.querySelector('[data-input="find"]'); if (f) { e.preventDefault(); f.focus(); } }
});
addEventListener('keyup', (e) => { shiftDown = e.shiftKey; });
root.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (fMenu || rMenu) && !dlg.open) {
    const back = fMenu ? 'fm-' + fMenu : 'rmenu-' + rMenu;
    e.preventDefault(); closeMenus(); focusFk(back, app); return;
  }
  if (e.key === ' ' && e.shiftKey && e.target.dataset?.act === 'sel') { shiftDown = true; }
  if (e.target.getAttribute?.('role') === 'tab' && e.target.dataset.act === 'add-tab' && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
    e.preventDefault(); act['add-tab'](addTab === 'paste' ? 'search' : 'paste'); return;
  }
  if (e.key === 'Enter' && e.target.dataset.input === 'country') { e.preventDefault(); e.target.closest('.field').querySelector('.option')?.click(); }
  if (e.key === 'Enter' && e.target.dataset.input === 'crop') { e.preventDefault(); document.querySelector('#ct-crop-list .option')?.click(); }
  if (e.key === 'Escape' && S.explain && !dlg.open) { const v = S.explain; S.explain = null; focusNext = 'ex-' + v; render(); }
  if (e.target.getAttribute('role') === 'tab' && e.target.dataset.act === 'view' && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
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
  browserCountry = browserGuess();
  // A link, else the save; the country (logic.js pickCountry): a link's own k, else the reader's
  // choice (device, else tab), else a saved consortium's, else the guess (memory.js).
  const { decoded, saved, fromLink, country } = startState({ params: arrival, memory, guess: browserCountry, known: (c) => isCountry(manifest, c) });
  if (!fromLink && decoded) S.restoredAt = saved.at;
  S.cutLink = fromLink && linkDamaged(decoded, memory.fromFragment);
  Object.assign(S, country, { linkCode: country.unknownCountry });
  syncLangLinks();
  // A fresh climate (or a guide's plant) asks the crop question; a shared or saved consortium opens as it was.
  S.askCrops = fromLink ? asksCrops(decoded) && !S.cutLink : !decoded;
  if (decoded) {
    const d = decoded.state;
    S.climate = d.climate; S.site = { ...d.site };
    S.pending = decoded;
    if (d.plants?.length) S.guidePlant = d.plants[0];
    // F2: a fragment this tab wrote keeps the climate's label from then; only a real arrival reads "from the shared link".
    S.climateSource = (fromLink && memory.written?.climateSource) || climateSourceAt({ fromLink, climate: d.climate, guide: !!(d.plants?.length && d.climate), siteClimate: siteClimate() });
    if (S.restoredAt && d.climate) S.notice = 'restored';
  }
  if (!S.climate && siteClimate()) { S.climate = siteClimate(); S.climateSource = 'site'; }
  if (S.climate) resolveClimate();
  else { S.status = 'setup'; render(); }
}
start();
