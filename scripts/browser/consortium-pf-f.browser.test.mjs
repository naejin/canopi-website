// pf stream f, "One plant" (chunk 3; v14 spec section 2 'pf-f', failure row F10): the boards Details,
// DarkDetails, DetailsMore and DetailsDesk, Swap, SiteMendoza ("Almond against your place" is Details'
// Against section) and Correction (board check only), as behaviour tests. pf-f's commit 0 wrote them from
// the v14 board text, each marked expected-fail under pf-f (scripts/expect-fail.mjs failing(), its reason
// the board's first missing word, pf-helpers.mjs BOARD); the commit that makes a case pass removes its
// marker. Board figures come from the engine on the installed release at the boards' inputs (the 0W
// scenario cases kiambu-8, seville-board, mendoza-board-rain): the holes a candidate fills (core
// holes.ts fills on the page's open holes), the plants that hold by 2041–2070 (the verdict rule's
// holdsBy), the map squares of a plant's records (TaxonClimate.cells), the soil map's pH (the place's
// soil reading); never a board number. Words and layout come from the boards.
//
// Sweep ledger (this file carries these old screen-level tests, each as a case below or a line of one; the
// rest of consortium-pp-c2.browser.test.mjs stays there):
//   PP-C6  (Swap rows: fills / leaves / no gap changes, the fit line, job words mid-sentence, no phase jargon) -> PFF5
//   PP-C6b (Swap at 320 px nothing sideways, the foot removes; Details adds from its foot; two columns from 960 px) -> PFF5, PFF1, PFF3
//   PP-C6c (one band per measure numbered as core's bandsOf, the dot outside only when past, the key, 320 px) -> PFF25 (the soil card left the bands: PFF6)
//   PP-C6d (the DOM order is the visual order; a member's foot on the phone, What you can do on the desk) -> PFF3
//   PP-C6e (the name link opens the form on the name; an empty send's summary above Cancel, then Send) -> PFF7
//   PP-C6f (the summary's conflict pill short, inside the card at 390 and 1280 px) -> PFF3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aria, en, has, useHarness } from './helpers.mjs';
import { boardPalette } from './pf-b-helpers.mjs';
import { LIGHT, dialogText, done, frames, says, setSiteEdits } from './pf-helpers.mjs';

useHarness();

const core = await import('../../src/lib/consortium/holes.ts');
const { gapLines, jobsOf, rowBandOf, yearsOf } = await import('../../src/lib/consortium/index.ts');
// The hold predicates are the verdict rule's (M29), beside holdsBy.
const { laterLossOf } = await import('../../src/lib/consortium/verdict.ts');
// A core Line in the en words (strings.ts P for a count: its plural form, # the number; then the vars and parts).
function sayEn(l) {
  let text = en[l.key];
  assert.ok(text, `en has ${l.key}`);
  if (typeof l.count === 'number') {
    const forms = Object.fromEntries(text.split(' | ').map((f) => { const i = f.indexOf(': '); return [f.slice(0, i), f.slice(i + 2)]; }));
    text = (forms[new Intl.PluralRules('en').select(l.count)] ?? forms.other).replace('#', String(l.count));
  }
  const parts = Object.fromEntries(Object.entries(l.parts ?? {}).map(([k, p]) => [k, sayEn(p)]));
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in parts ? parts[k] : k.startsWith('temp') ? `${l.vars[k]} °C` : String(l.vars[k])));
}
// A member's verdicts today and at each later period (store periodVerdictsOf), for core's laterLossOf.
const periodVerdicts = (page, id) => page.evaluate((pid) => { const s = window.__ctTest.store; return s.periodVerdictsOf(s.taxonOf(pid)); }, id);
const DETAILS = 'dialog.ct-sheet[open]';
const BANDS = ['Coldest nights', 'Warmth over the year', 'Hottest days', 'Rain against evaporation'];
const idOf = (page, sci) => page.evaluate((n) => window.__ctTest.store.pool.value.find((t) => t.canonical_name === n || t.canonical_name.startsWith(`${n} `))?.id ?? null, sci);
const open = async (page, kind, id) => { await page.evaluate((k, pid) => window.__ctTest.openSheet(k, pid), kind, id); await frames(page); };
const openAll = (page) => page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open] details[data-more]')) d.open = true; });
const sideways = (page) => page.$eval(DETAILS, (d) => d.scrollWidth - d.clientWidth);
// The phrases appear in this order in the open dialog.
async function inDialogOrder(page, phrases) {
  const t = await dialogText(page);
  let at = -1;
  for (const p of phrases) {
    const i = t.indexOf(p, at + 1);
    assert.ok(i > at, `board: the dialog does not say "${p}" after the phrase above it`);
    at = i;
  }
}
// The holes a plant fills among the palette's open holes (core holes.ts fills, the page's own holes).
async function holesFilled(page, id) {
  const { holes, t } = await page.evaluate((pid) => { const s = window.__ctTest.store; return { holes: s.paletteHoles.value, t: s.taxonOf(pid) }; }, id);
  return holes.filter((h) => h.state === 'open' && core.fills(h, t)).length;
}
// The engine's figures for a plant at the page's place: its climate's map squares, the soil map's pH,
// the bands core draws (store laterVerdictOf, bandsOf).
const figures = (page, id) => page.evaluate((pid) => {
  const { store, bandsOf } = window.__ctTest;
  const t = store.taxonOf(pid), v = store.verdictOf(t);
  return {
    cells: t.climate?.cells ?? null, map: store.siteInputs.value.soilPh.map, ph: t.traits.soil_ph,
    bands: v ? bandsOf(v, store.laterVerdictOf(t, v), t.climate).filter(Boolean).map((b) => b.measure) : [],
    soilLevel: v?.factors.find((f) => f.factor === 'soil-ph')?.level ?? null,
    stratum: t.stratum?.value ?? null,
  };
}, id);

// Review c2r5-01 (owner rule: a drawn value comes from data or is labelled): a disputed low's dashed
// stretch ends where data puts it: the other source's value when a dispute row gives one, else a mark
// the band draws (the place's dot or ring, or the tick where it is most often recorded); a firm range
// never starts at an invented point.
async function firmStartsOnData(page, id) {
  const field = { tminCold: 'tmin_cold.low', tmeanYear: 'tmean_year.low' };
  const valued = await page.evaluate(async (pid) => {
    const { store } = window.__ctTest;
    const d = await store.source.value.details(pid, store.climate.value, 'en').catch(() => ({ disputes: [] }));
    return (d.disputes ?? []).filter((x) => x.value !== null && Number.isFinite(Number(x.value))).map((x) => x.field);
  }, id);
  const bands = await page.$$eval(`${DETAILS} [data-against] [data-measure]`, (els) => els.filter((e) => e.querySelector('[data-disputed]')).map((e) => {
    const cx = (el) => { if (!el) return null; const b = el.getBBox(); return b.x + b.width / 2; };
    return { m: e.dataset.measure, start: e.querySelector('.ct-bd-range').getBBox().x, marks: [cx(e.querySelector('.ct-bd-now-dot')), cx(e.querySelector('.ct-bd-later-dot')), cx(e.querySelector('.ct-bd-tick'))].filter((x) => x !== null) };
  }));
  for (const b of bands) {
    if (valued.includes(field[b.m])) continue; // drawn to the dispute row's own value
    assert.ok(b.marks.some((x) => Math.abs(x - b.start) < 0.6), `band ${b.m}: the firm range starts at a drawn data mark, not an invented point (${JSON.stringify(b)})`);
  }
  return bands.length;
}

// The en words of the place's soil texture (the soil map's reading), or null.
const TEXTURE_EN = { sand: 'sand', loamy_sand: 'loamy sand', sandy_loam: 'sandy loam', loam: 'loam', silt_loam: 'silt loam', silt: 'silt', sandy_clay_loam: 'sandy clay loam', clay_loam: 'clay loam', silty_clay_loam: 'silty clay loam', sandy_clay: 'sandy clay', silty_clay: 'silty clay', clay: 'clay' };
const soilOf = (page) => page.evaluate(() => { const s = window.__ctTest.store; return { texture: s.location.value?.lookup?.soil?.texture ?? null, nearKm: s.siteInputs.value.soilPh.nearKm ?? null, map: s.siteInputs.value.soilPh.map }; });

// The drainage words the data gives (C1; R3: a hint read from the grower's answer): what the release
// records (well_drained), or the engine's hint when the grower's ground stays wet (the wet check's factor
// at 'look'). The test's own table of the en words, so a wrong rule in the view or the core shows.
const drainageOf = (page, id) => page.evaluate((pid) => {
  const s = window.__ctTest.store, t = s.taxonOf(pid), v = s.verdictOf(t);
  const hint = !!v?.factors.some((f) => (f.factor === 'drainage' || (f.factor === 'water' && f.basis === 'spot')) && f.level !== 'fits' && f.level !== 'unknown');
  return { wd: t.traits.well_drained, hint };
}, id);
const DRAIN_EN = (d) => (d.hint ? 'Wants free-draining soil, and your ground stays wet for days after heavy rain' : d.wd === true ? 'Wants free-draining soil' : d.wd === false ? 'Does not need free-draining soil' : 'No need recorded');
const drainSay = (d) => { const w = DRAIN_EN(d); return `Drainage: ${w.charAt(0).toLowerCase()}${w.slice(1)}.`; };
// A plant's data changed in place for a fixture case (the taxon the store hands out), then the verdicts
// asked again (a site edit), so every part reads the changed plant.
const patchTaxon = (page, id, patch) => page.evaluate((pid, p) => { const s = window.__ctTest.store, t = s.taxonOf(pid); for (const [k, v] of Object.entries(p)) t[k] = typeof v === 'object' && v && !Array.isArray(v) && t[k] && typeof t[k] === 'object' ? { ...t[k], ...v } : v; }, id, patch);

// M40: what "Set my own soil pH" leads to, as the grower sees it: the figures' soil pH line open on the
// page (never store.figureLine, which the panel resets once it has opened the line).
const soilLineOpen = (page) => page.waitForFunction(() => document.querySelector('[data-fg-line="soilPh"]')?.classList.contains('fg-line-open') ?? false, { timeout: 8000 }).then(() => true, () => false);
const bloomM = await import('../../src/islands/consortium/views/details/bloom.ts');
const { placementZone } = await import('../../src/lib/consortium/index.ts');

// A serious shared pest between a member and another member with no conflict yet (one flag per other
// member: its worst row), added to the page's interaction list as a fixture row, so it is the one said.
// Returns the other member's name.
const seriousConflict = (page, id) => page.evaluate((pid) => {
  const s = window.__ctTest.store, a = s.taxonOf(pid), z = s.climate.value;
  const taken = new Set(s.flagsOfPlant(a).filter((f) => f.kind === 'conflict').map((f) => f.other));
  const o = s.memberTaxa.value.find((t) => t.id !== pid && !taken.has(t.id));
  const row = { subject: { name: a.canonical_name, rank: 'species' }, object: { name: o.canonical_name, rank: 'species' }, type: 'shared_pest', climate_zone: null, agent: null, agent_names: null, severity: 'high', note: { en: 'Fixture note: both carry the same canker' }, sources: [] };
  s.interactionSets.value = { ...s.interactionSets.peek(), [z]: [...(s.interactionSets.peek()[z] ?? []), row] };
  return o.names.en || o.canonical_name;
}, id);

// ---- Details (boards Details 390, DarkDetails, DetailsMore) ----

test('PFF1 (pf-f Details at 390): Pinto peanut at Kiambu, a candidate: name line, summary with the engine\'s holes, Niche, chips, the four bands in one order, scenarios, records, table, the three sections, Add from the foot', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  assert.ok(id, 'Pinto peanut on the Subtropical lists');
  await open(page, 'details', id);
  await says(page, /Arachis pintoi · from the \w+ list(, one of your nearest lists)?/, { inDialog: true });
  // The summary: its main job, light, and the holes the engine says it fills.
  const n = await holesFilled(page, id);
  assert.ok(n > 0, 'Pinto peanut fills a hole at kiambu-8 (engine)');
  await says(page, new RegExp(`: fills ${n} holes? in your palette\\.`), { inDialog: true });
  await says(page, /Stands (from )?(month|year) \d+ to year \d+ · \d+ c?m wide, \d+ c?m tall/, { inDialog: true });
  // Niche: the rows in order, light on the four-level scale, "found mostly in", "after release" tags.
  await inDialogOrder(page, ['Niche', 'Light:', 'Soil pH:', 'Moisture:', 'Root depth:', 'Flowers:']);
  await says(page, new RegExp(`Light: grows in (${LIGHT.join('|')})( – (${LIGHT.join('|')}))?`), { inDialog: true });
  assert.ok(await page.$$eval(`${DETAILS} [data-after-release]`, (e) => e.length) >= 3, 'board: Soil pH best, Moisture and Root depth say "after release"');
  await says(page, 'Toxicity: not checked yet', { inDialog: true });
  // Against: the four climate bands in the board's one order, no soil band among them.
  const f = await figures(page, id);
  const titles = await page.$$eval(`${DETAILS} [data-against] [data-measure] .ct-bandcard-head b`, (els) => els.map((e) => e.textContent.trim()));
  assert.deepEqual(titles, BANDS.filter((b) => titles.includes(b)), `board: the bands in one order (${titles})`);
  assert.ok(titles.every((b) => BANDS.includes(b)), `board: only the four bands (${titles})`);
  assert.ok(!titles.includes('Soil pH'), 'board: the soil is its own card, not a band');
  await says(page, /\d of 4 climate scenarios agree/, { inDialog: true });
  if (f.cells !== null) await says(page, `thinned to ${f.cells.toLocaleString('en')} map squares, cultivation included.`, { inDialog: true });
  await page.click(`${DETAILS} ${aria('button', 'Show as a table')}`);
  assert.ok(await has(page, `${DETAILS} [data-band-table]`, 2000), 'board: "Show as a table" shows the bands as a table');
  await inDialogOrder(page, ['What it does', 'With your other plants and warnings', 'Names, why it is here, sources']);
  assert.equal(await sideways(page), 0, 'Details at 390: nothing sideways');
  // The foot adds it (carried from PP-C6b).
  await page.click(`${DETAILS} .ct-d-foot [data-add]`);
  assert.ok(await page.waitForFunction((pid) => window.__ctTest.store.members.value.includes(pid), { timeout: 4000 }, id).then(() => true, () => false), 'board: "+ Add to my palette" adds it');
  await done(page);
});

test('PFF2 (pf-f DetailsMore): the sections open: the main job, the syntropic line, Time and size, no conflict with the palette\'s plants, Warnings, Names and Sources, Suggest a correction', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await openAll(page);
  await says(page, '· its main job here', { inDialog: true });
  await inDialogOrder(page, ['Time and size', 'Planted in', 'When it stands', 'its place in a palette, not how long it lives', 'Size', 'full grown', 'Life', 'Leaves', 'Drainage', 'Wind', 'Root partners']);
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await says(page, new RegExp(`No conflict known with your ${members} plants\\.|With [A-Z]`), { inDialog: true });
  await inDialogOrder(page, ['Toxicity', 'Invasive', 'Spreads']);
  await inDialogOrder(page, ['Names', 'Sources and how sure we are', 'Jobs, light, time', 'Climate range', 'How sure we are, in words.']);
  assert.ok(await has(page, `${DETAILS} ${aria('button', 'Suggest a correction')}`, 1000), 'board: "Suggest a correction"');
  await done(page);
});

test('PFF4 (pf-f DarkDetails): the dark sheet says what the light one says, and the soil card\'s status keeps 4.5:1 against its card', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await says(page, 'Fits the likely soil', { inDialog: true });
  const light = await dialogText(page);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await frames(page);
  assert.equal(await dialogText(page), light, 'the same words in both themes');
  const ratio = await page.$eval(`${DETAILS} [data-soil-card] .ct-bandcard-status`, (e) => {
    const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
    let bg = null;
    for (let n = e; n && !bg; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) bg = rgb(c); }
    const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const a = lum(rgb(getComputedStyle(e).color)), b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  assert.ok(ratio >= 4.5, `the soil status at ${ratio.toFixed(2)}:1 in the dark theme`);
  await done(page);
});

// ---- the soil card (boards Details, SiteMendoza; R3; failure row F10) ----

test('PFF6 (pf-f soil card, F10): the map\'s pH as a ring, the grower\'s test as a dot, a neighbour fill a weaker guess, no value "not checked on soil pH"; Set my own soil pH opens the figures', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  const f = await figures(page, id);
  assert.ok(f.map !== null && f.ph?.min != null, 'Kiambu has a soil map value and Pinto peanut a pH range');
  const num = (x) => x.toLocaleString('en', { maximumFractionDigits: 1 });
  await says(page, `soil map: pH ${num(f.map)}`, { inDialog: true });
  // The map's texture word when the reading has one (fix round 1 BC16; board SiteMendoza "8.0, sandy loam").
  const tex = (await soilOf(page)).texture;
  await says(page, `Recorded on pH ${num(f.ph.min)} to ${num(f.ph.max)}; the soil map says ${num(f.map)}${tex ? `, ${TEXTURE_EN[tex]}.` : ' here.'}`, { inDialog: true });
  await says(page, f.soilLevel === 'fits' ? 'Fits the likely soil' : 'Outside the likely soil’s pH', { inDialog: true });
  await says(page, drainSay(await drainageOf(page, id)), { inDialog: true });
  await says(page, 'Soil is not projected: the same in every period. A hint, never a reason to hide a plant.', { inDialog: true });
  // The grower's own test: a dot, the status "your soil".
  await setSiteEdits(page, { soilPh: 6.8 });
  await says(page, 'your test: pH 6.8', { inDialog: true });
  await says(page, /Fits your soil|Outside your soil’s pH/, { inDialog: true });
  await setSiteEdits(page, {});
  // Set my own soil pH: the figures panel at its soil line.
  await page.click(`${DETAILS} [data-set-ph]`);
  assert.ok(await soilLineOpen(page), 'board: "Set my own soil pH" opens the figures at the soil line (M40: the line itself, open)');
  // F10: no soil value here or next door.
  await page.evaluate(() => { const s = window.__ctTest.store, l = s.location.value; s.location.value = { ...l, lookup: { ...l.lookup, soil: null } }; });
  await open(page, 'details', id);
  await says(page, 'Not checked on soil pH', { inDialog: true });
  await says(page, 'no data for your place or the squares next to it', { inDialog: true });
  // F10: the map's value from a neighbouring square (Seville's reading is a fill).
  const sev = await boardPalette('seville-board', { width: 390 });
  const almond = await idOf(sev, 'Prunus dulcis');
  await open(sev, 'details', almond);
  await says(sev, /Soil map, nearest square [\d,]+ km away: a weaker guess\./, { inDialog: true });
  await done(page, sev);
});

test('PFF8 (pf-f SiteMendoza): Almond against Mendoza: the bands, the soil card, and the dryness note by watering', async () => {
  const page = await boardPalette('mendoza-board-rain', { width: 390 });
  await setSiteEdits(page, { watering: 'rain' });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  await says(page, 'where Almond is recorded growing', { inDialog: true });
  assert.ok(await has(page, `${DETAILS} [data-soil-card]`, 2000), 'board: the soil card under Almond against your place');
  await says(page, drainSay(await drainageOf(page, id)), { inDialog: true });
  // R2 (board SiteMendoza "Watering"): a member drier here than where it is recorded, today or later (the
  // engine's drier notes), carries the note, and the grower's watering sets its words.
  const dry = await page.evaluate(() => {
    const s = window.__ctTest.store;
    return s.memberTaxa.value.find((t) => s.periodVerdictsOf(t).some((v) => v.limiting?.factor === 'dry' || v.notes.includes('drier') || v.notes.includes('drier-later')))?.id ?? null;
  });
  assert.ok(dry, 'a member drier here than where it is recorded (engine, Mendoza)');
  await open(page, 'details', dry);
  const against = () => page.$eval(`${DETAILS} [data-against]`, (e) => e.innerText.replace(/\s+/g, ' '));
  await says(page, /may need watering/, { inDialog: true });
  assert.doesNotMatch(await against(), /water it the first years/i, 'rain only: "may need watering"');
  await setSiteEdits(page, { watering: 'first-years' });
  await says(page, /water it the first years/i, { inDialog: true });
  assert.doesNotMatch(await against(), /may need watering/, 'watered the first years: "water it the first years"');
  await setSiteEdits(page, { watering: 'all-year' });
  await page.waitForFunction(() => !/may need watering|water it the first years/i.test(document.querySelector('dialog[open] [data-against]')?.innerText ?? 'x'), { timeout: 6000 }).catch(() => {});
  assert.doesNotMatch(await against(), /may need watering|water it the first years/i, 'watered all year: no note');
  await done(page);
});

// ---- Details on the desk (board DetailsDesk), carrying PP-C6b, PP-C6d and PP-C6f ----

test('PFF3 (pf-f DetailsDesk 1280): Almond, a member at Seville: two columns, "In your palette.", Planted in, the soil map\'s say on the Niche row and no soil card, What you can do with Swap rows, Find one that holds and Remove', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  const f = await figures(page, id);
  await says(page, /, from year \d+ to year \d+\. In your palette\./, { inDialog: true });
  await says(page, `Planted in: ${en[`consortium.palette.light_${f.stratum}`]}`, { inDialog: true });
  await says(page, new RegExp(`\\(the soil map says ${f.map} here: (fits|outside its range|not checked)\\)`), { inDialog: true });
  assert.equal(await page.$eval(`${DETAILS} [data-soil-card]`, (e) => e.offsetParent === null).catch(() => true), true, 'board: no soil card on the desk');
  // F10 on the desk (C2): the neighbour fill named as a weaker guess on the Niche row.
  const near = (await soilOf(page)).nearKm;
  if (near !== null) assert.match(await page.$eval(`${DETAILS} [data-niche-row="ph"]`, (e) => e.innerText), /Soil map, nearest square [\d,]+\skm away: a weaker guess\./, 'the desk names the neighbour fill');
  await says(page, 'where Almond is recorded growing', { inDialog: true });
  const cols = await page.evaluate(() => { const d = document.querySelector('dialog.ct-sheet[open]'); const a = d.querySelector('[data-against]').getBoundingClientRect(), s = d.querySelector('[data-summary]').getBoundingClientRect(); return { right: a.left > s.right - 1, width: d.getBoundingClientRect().width }; });
  assert.ok(cols.right && cols.width > 900, `two columns, Against on the right (${JSON.stringify(cols)})`);
  assert.ok(await has(page, `${DETAILS} [data-cando] ${aria('button', 'Find one that holds')}`, 2000), 'What you can do: Find one that holds');
  // Its disputed cold limit (TreeGOER stricter), dashed with "−8.2?" and a true minus, the firm range
  // starting on a drawn data mark (PP-C6f, review c2r5-01); every band numbers the ends core gives (PP-C6c).
  const cold = await page.$eval(`${DETAILS} [data-measure="tminCold"]`, (e) => ({ dashed: !!e.querySelector('[data-disputed]'), nums: [...e.querySelectorAll('.ct-bd-num text')].map((x) => x.textContent) }));
  assert.ok(cold.dashed && cold.nums.some((n) => /^\u2212\d+(\.\d+)?\?$/.test(n)), `the disputed low as the board (${JSON.stringify(cold)})`);
  assert.ok(await firmStartsOnData(page, id) > 0, 'a disputed band checked');
  const ends = await page.evaluate((pid) => {
    const { store, bandsOf } = window.__ctTest;
    const t = store.taxonOf(pid), v = store.verdictOf(t);
    const want = Object.fromEntries(bandsOf(v, store.laterVerdictOf(t, v), t.climate).filter(Boolean).map((b) => [b.measure, [b.low, b.high].filter((x) => x !== null).map((x) => Math.round(x * 100) / 100)]));
    const got = Object.fromEntries([...document.querySelectorAll('dialog.ct-sheet[open] [data-against] [data-measure]')].map((e) => [e.dataset.measure, [...e.querySelectorAll('.ct-bd-num text')].map((x) => Number(x.textContent.replace('\u2212', '-').replace('?', '')))]));
    return { want, got };
  }, id);
  assert.deepEqual(ends.got, Object.fromEntries(Object.keys(ends.got).map((m) => [m, ends.want[m]])), 'each band numbers the ends core gives');
  assert.equal(await page.$eval(`${DETAILS} .ct-d-foot-member`, (e) => e.offsetParent === null), true, 'the desk: no member foot');
  // The conflict pill with Olive, short, inside the card (PP-C6f).
  if (await has(page, `${DETAILS} [data-summary] [data-chip="conflict"]`, 1000)) {
    const pills = await page.$$eval(`${DETAILS} [data-summary] .ct-marks > li`, (els) => els.map((e) => { const r = e.getBoundingClientRect(), c = e.closest('[data-summary]').getBoundingClientRect(); return r.left >= c.left - 0.5 && r.right <= c.right + 0.5; }));
    assert.ok(pills.every(Boolean), 'every pill inside the card');
  }
  // On a phone: the DOM order is the visual order, and the member's foot finds one that holds (PP-C6d).
  await page.setViewport({ ...page.viewport(), width: 390, height: 800 });
  await frames(page);
  const order = await page.evaluate(() => [...document.querySelectorAll('dialog.ct-sheet[open] :is([data-summary], [data-against], [data-cando])')].map((e) => [e.matches('[data-summary]') ? 'summary' : e.matches('[data-against]') ? 'against' : 'cando', e.getBoundingClientRect().top]));
  assert.deepEqual(order.map((x) => x[0]), ['summary', 'against', 'cando'], 'the DOM order');
  assert.ok(order.every((x, i) => i === 0 || x[1] > order[i - 1][1]), `the visual order is the DOM order (${JSON.stringify(order)})`);
  assert.ok(await has(page, `${DETAILS} .ct-sheet-foot ${aria('button', 'Find one that holds')}`, 1000), 'the phone foot holds Find one that holds');
  assert.equal(await sideways(page), 0, 'nothing sideways at 390');
  await done(page);
});

// ---- Swap (board Swap), carrying PP-C6 and PP-C6b ----

test('PFF5 (pf-f Swap 390): Calliandra at Kiambu: the lede, its jobs and years, "Only plants that hold by 2041–2070" with the engine\'s count, Swap and Add beside on each row, the closest first, only Remove in the foot', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Calliandra houstoniana');
  assert.ok(id, 'Calliandra in kiambu-8');
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 10_000), 'Swap: candidate rows');
  const name = await page.evaluate((pid) => { const t = window.__ctTest.store.taxonOf(pid); return t.names.en || t.canonical_name; }, id);
  await says(page, `Swap ${name} for…`, { inDialog: true });
  await says(page, `A plant that does the same jobs in the same years. Each says its own warnings. Swap takes ${name} out; Add beside keeps both.`, { inDialog: true });
  await says(page, /It does \d jobs? (from )?(month|year) \d+ to year \d+: [a-z]/, { inDialog: true });
  // The hold filter's count, from the engine (the verdict rule's holdsBy at 2041–2070 on the swap's own candidates).
  const want = await page.evaluate((pid) => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, ctx = s.verdictContext.value;
    const fit = s.alternativesFor(pid)?.fit ?? [];
    const taxa = fit.map((a) => s.pool.value.find((x) => x.id === a.id)).filter(Boolean);
    const then = rule.verdicts(taxa, { ...ctx, period: '2041-2070' });
    return { n: taxa.filter((t) => rule.holdsBy(t, ctx, '2041-2070')).length, unknown: taxa.filter((t) => then.get(t.id)?.range !== 'judged').length, m: fit.length };
  }, id);
  await says(page, `Only plants that hold by 2041–2070 ${want.n} of ${want.m}${want.unknown ? ` · ${want.unknown} not checked` : ''}`, { inDialog: true });
  const rows = await page.$$eval(`${DETAILS} [data-swap-row]`, (els) => els.map((e) => ({ buttons: [...e.querySelectorAll('button')].map((b) => b.textContent.trim()), does: e.querySelector('[data-swap-does]').textContent.trim(), fit: /\S/.test(e.querySelector('[data-conf], .ct-fit, [data-row-band]')?.textContent ?? '') })));
  assert.equal(rows.length, Math.min(want.n + want.unknown, 9), 'the rows are the holding candidates and the unjudged ones (fix round 1 R2), nine at most');
  assert.ok(rows.every((r) => r.buttons.includes('Swap') && r.buttons.includes('Add beside')), `board: Swap and Add beside on each row (${JSON.stringify(rows.map((r) => r.buttons))})`);
  // Fix round 1 BC7: one sentence per row, the gap folded in ("…: also fills the hole after year 15"), and its fit or edge words.
  assert.ok(rows.every((r) => /, (from|in|to|and stands to) [^:]+(: (also fills|leaves) .+)?$/.test(r.does) && r.fit), JSON.stringify(rows));
  const does = await page.$$eval(`${DETAILS} [data-swap-does]`, (els) => els.map((e) => e.textContent.trim()));
  for (const d of does) assert.match(d, /^Does (all its jobs|none of its jobs \([a-z][^)]*\)|\d of its \d jobs \((no [a-z ]+|[a-z][^)]*)\)), (from|in|to|and stands to) [a-z\d]/, `a candidate's first line ("${d}")`);
  await says(page, 'The closest in jobs and years first.', { inDialog: true });
  const text = await dialogText(page);
  assert.doesNotMatch(text, /Keep |Placenta|Secondary \d|Climax/, 'board: no Keep, no phase jargon');
  const foot = await page.$$eval(`${DETAILS} .ct-swap-foot button`, (els) => els.map((e) => e.textContent.trim()));
  assert.deepEqual(foot, ['Remove it'], 'board: only Remove it in the foot');
  // Add beside keeps both.
  const first = await page.$eval(`${DETAILS} [data-swap-row]`, (e) => e.dataset.plantId);
  await page.$eval(`${DETAILS} [data-swap-row] button.ct-link-button`, (b) => b.click());
  assert.ok(await page.waitForFunction((a, b) => { const m = window.__ctTest.store.members.value; return m.includes(a) && m.includes(b); }, { timeout: 4000 }, id, first).then(() => true, () => false), 'board: Add beside keeps both');
  // At 320 px nothing scrolls sideways (PP-C6b).
  await page.setViewport({ ...page.viewport(), width: 320, height: 700 });
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 10_000), 'Swap at 320');
  assert.equal(await sideways(page), 0, 'Swap at 320 px: nothing sideways');
  await done(page);
});

// ---- Correction (board Correction: board check only), carrying PP-C6e ----

test('PFF7 (pf-f Correction): the name link opens the form on the name; an empty send says what needs a look above Cancel, then Send', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await page.evaluate(() => { const { store } = window.__ctTest; return store.members.value.find((m) => Object.values(store.taxonOf(m).names).filter(Boolean).length < 11) ?? null; });
  assert.ok(id, 'a member with a language missing a name');
  await open(page, 'details', id);
  await openAll(page);
  await says(page, 'Suggest a correction', { inDialog: true });
  await page.$eval(`${DETAILS} [data-tell-name]`, (e) => e.click());
  await page.waitForSelector(`${DETAILS} #ct-corr-field`, { timeout: 6000 });
  assert.equal(await page.$eval(`${DETAILS} #ct-corr-field`, (e) => e.value), 'names.en', 'the form opens on the English name');
  const send = await page.$eval(`${DETAILS} .ct-corr button[type="submit"]`, (b) => { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); b.click(); return { w: r.width, h: r.height }; });
  assert.ok(send.w > 0 && send.h > 0, `the Send button is drawn (${JSON.stringify(send)})`);
  const box = await page.waitForSelector(`${DETAILS} .ct-corr-status.is-error`, { timeout: 3000 });
  assert.ok(await box.$('svg'), 'the summary has its icon');
  assert.match(await box.evaluate((e) => e.textContent), /need a look.*Tick this box/s, 'what needs a look, in words');
  const buttons = await page.$$eval(`${DETAILS} .ct-corr .ct-actions button`, (els) => els.map((e) => e.textContent.trim()));
  assert.deepEqual(buttons, ['Cancel', 'Send suggestion'], 'Cancel, then Send');
  await done(page);
});

// ---- fix round 1, batch 1 (review findings BC1 to BC12) ----

// Pinto peanut's records and map squares, read from the store's details (the plant's own data).
const recordsOf = (page, id) => page.evaluate(async (pid) => { const { store } = window.__ctTest; const d = await store.source.value.details(pid, store.climate.value, 'en'); return { records: d.gbifRecords ?? null, cells: store.taxonOf(pid).climate?.cells ?? null }; }, id);

test('PFF9 (pf-f BC1, sections stay open): real clicks open Names and What it does; "Tell us the name you use" keeps them open and the form opens in sight, focus on its field', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await page.evaluate(() => { const { store } = window.__ctTest; return store.members.value.find((m) => Object.values(store.taxonOf(m).names).filter(Boolean).length < 11) ?? null; });
  await open(page, 'details', id);
  for (const k of ['jobs', 'names']) {
    await page.$eval(`${DETAILS} details[data-more="${k}"] > summary`, (e) => e.scrollIntoView({ block: 'center' }));
    await page.click(`${DETAILS} details[data-more="${k}"] > summary`);
  }
  await page.$eval(`${DETAILS} [data-tell-name]`, (e) => e.scrollIntoView({ block: 'center' }));
  await page.click(`${DETAILS} [data-tell-name]`);
  await page.waitForSelector(`${DETAILS} #ct-corr-field`, { timeout: 6000 });
  await frames(page);
  const open2 = await page.$$eval(`${DETAILS} details[data-more]`, (els) => Object.fromEntries(els.map((e) => [e.dataset.more, e.open])));
  assert.equal(open2.jobs, true, 'What it does stays open');
  assert.equal(open2.names, true, 'Names stays open');
  const f = await page.evaluate(() => { const e = document.getElementById('ct-corr-field'); const r = e.getBoundingClientRect(); return { focused: document.activeElement === e, inView: r.top >= 0 && r.bottom <= innerHeight && r.height > 0 }; });
  assert.ok(f.focused && f.inView, `the form's first field is focused and in sight (${JSON.stringify(f)})`);
  await done(page);
});

test('PFF10 (pf-f BC2, Flowers): Pinto peanut at Kiambu: the months near the place as one span in full names, "estimate" once, the legend as plain text', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await says(page, 'Flowers:', { inDialog: true });
  const row = await page.waitForFunction(() => { const e = document.querySelector('dialog[open] [data-niche-row="flowers"]'); return e && !/no months|not checked/i.test(e.textContent) ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, { timeout: 8000 }).then((h) => h.jsonValue());
  assert.match(row, /^Flowers: (January|February|March|April|May|June|July|August|September|October|November|December)(–(January|February|March|April|May|June|July|August|September|October|November|December))? estimate$/, `one span, full month names, "estimate" once ("${row}")`);
  assert.equal(await page.$$eval(`${DETAILS} [data-niche] .ct-est`, (e) => e.length), 1, 'one estimate tag');
  const legend = await page.$eval(`${DETAILS} [data-est-legend]`, (e) => ({ text: e.textContent, tags: e.querySelectorAll('.ct-est').length }));
  assert.ok(legend.text.startsWith('Estimate: ') && legend.tags === 0, `the legend in plain text (${JSON.stringify(legend)})`);
  await done(page);
});

test('PFF11 (pf-f BC3, BC10, BC11, round 2 R1 R2 C5, DetailsDesk): Almond at Seville: the danger chip in the danger colour, the period-edge chip with the thermometer, the keep years, later lines warned, Find with its glyph, the warnings section kept on the desk', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  await says(page, 'In your palette.', { inDialog: true });
  // BC3: Toxic and Very toxic chips in the danger colour.
  const danger = await page.$$eval(`${DETAILS} [data-summary] .ct-flag[data-level="danger"]`, (els) => els.map((e) => { const p = document.createElement('span'); p.style.color = 'var(--danger)'; e.parentElement.append(p); const want = getComputedStyle(p).color; p.remove(); return { got: getComputedStyle(e).color, want, text: e.textContent.trim() }; }));
  for (const d of danger) assert.equal(d.got, d.want, `the danger chip "${d.text}" in --danger`);
  // BC10 + BC11: the engine's later periods for this member, as the chip and the keep line.
  // R1 (round 2): the loss is core's laterLossOf (a later climate worse than today's, never light or wind).
  const [now, ...laters] = await periodVerdicts(page, id);
  const loss = laterLossOf(now, laters);
  const want = loss ? { level: loss.level, period: loss.verdict.judged.replace('-', '–'), year: Number(loss.verdict.judged.slice(0, 4)) } : null;
  assert.ok(want, 'board DetailsDesk: Almond at Seville loses its range by a later period (engine)');
  if (want) {
    await says(page, `${want.level === 'outside' ? 'Outside its range' : 'Near the edge of its range'} by ${want.period}`, { inDialog: true });
    // C5: the board's range-edge mark, the thermometer of "Warmth over the year", whatever the limiting measure.
    const glyph = await page.evaluate(() => ({ chip: document.querySelector('dialog[open] [data-chip="period-edge"] svg path')?.getAttribute('d') ?? null, thermo: document.querySelector('dialog[open] [data-against] [data-measure="tmeanYear"] .ct-bandcard-glyph path')?.getAttribute('d') ?? null }));
    assert.ok(glyph.chip && glyph.thermo, `the chip and the year-warmth band both draw a glyph (${JSON.stringify(glyph)})`);
    assert.equal(glyph.chip, glyph.thermo, 'the period-edge chip draws the thermometer');
    await says(page, `Keeping it is a fair bet for its first ${want.year - new Date().getFullYear()} years`, { inDialog: true });
    const warned = await page.$$eval(`${DETAILS} [data-against] li[data-warned]`, (els) => els.map((e) => ({ svg: !!e.querySelector('svg'), color: getComputedStyle(e).color })));
    assert.ok(warned.length > 0 && warned.every((w) => w.svg), `the later verdict lines warned, with a glyph (${JSON.stringify(warned)})`);
  }
  // BC12: Find one that holds carries the search glyph.
  assert.ok(await page.$eval(`${DETAILS} [data-cando] .ct-d-cando-actions button.button-secondary`, (b) => /Find one that holds/.test(b.textContent) && !!b.querySelector('svg circle')), 'Find one that holds with the search glyph');
  // R2 (round 2): the desk keeps "With your other plants and warnings" (toxicity, allelopathy, the
  // liability notice), as the phone does; round 3 R1: with every conflict's full line (PFF31).
  assert.ok(await has(page, `${DETAILS} details[data-more="pairs"]`, 2000), 'the desk keeps "With your other plants and warnings"');
  await openAll(page);
  await says(page, 'Check with a local expert', { inDialog: true });
  assert.ok(await has(page, `${DETAILS} [data-allelo]`, 1000), 'the allelopathy line on the desk');
  assert.ok(await has(page, `${DETAILS} [data-warnings] [data-row="toxicity"]`, 1000), 'the toxicity row on the desk');
  const hard = await page.evaluate((pid) => { const s = window.__ctTest.store; return s.flagsOfPlant(s.taxonOf(pid)).filter((f) => f.kind === 'conflict' && f.severity !== 'low').length; }, id);
  assert.equal(await page.$$eval(`${DETAILS} [data-conflict]:not(.soft)`, (e) => e.length), hard, 'each hard conflict\'s full line on the desk too (round 3 R1)');
  // BC4: What you can do: each row holds by 2041–2070 (the engine), "holds in 2041–2070", and how far it is recorded on the member's limiting measure.
  const cando = await page.evaluate((pid) => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, ctx = s.verdictContext.value;
    return [...document.querySelectorAll('dialog[open] [data-cando] [data-swap-row]')].map((e) => { const t = s.taxonOf(e.dataset.plantId); return { id: t.id, holds: rule.holdsBy(t, ctx, '2041-2070'), does: e.querySelector('[data-swap-does]').textContent.trim(), band: e.querySelector('[data-row-band]')?.textContent.trim() ?? null, mini: !!e.querySelector('[data-mini-band]') }; });
  }, id);
  assert.ok(cando.length > 0, 'What you can do: rows');
  const LACKS = { feeds_you: 'grows no food', feeds_soil: 'does not feed the soil', mulch: 'makes no mulch', ground: 'does not cover the ground', helpers: 'brings no helpers', shelter: 'gives no shelter' };
  const DOES = { feeds_you: 'feeds you', feeds_soil: 'feeds the soil', mulch: 'makes mulch', ground: 'covers the ground', helpers: 'brings helpers', shelter: 'shelters' };
  const jobs = await page.evaluate((pid) => { const s = window.__ctTest.store; return Object.fromEntries([pid, ...s.alternativesFor(pid).fit.map((a) => a.id)].map((x) => [x, s.taxonOf(x)])); }, id);
  // M42 (board DetailsDesk): the period is said once, on the first row only.
  assert.ok(cando.length >= 2, `two holding rows, so the second one shows the period is said once (${cando.length})`);
  for (const [i, c] of cando.entries()) {
    assert.ok(c.holds, `a row that holds by 2041–2070 (${c.does})`);
    // C9 (board DetailsDesk): "Feeds you in the same years, brings no helpers; holds in 2041–2070".
    if (i === 0) assert.match(c.does, /; holds in 2041–2070$/, 'the board\'s words, then "holds in 2041–2070"');
    else assert.doesNotMatch(c.does, /holds in/, `M42: "holds in 2041–2070" on the first row only (row ${i + 1}: ${c.does})`);
    assert.doesNotMatch(c.does, /^Does \d+ of its|\(no /, `the board's words, not Swap's count (${c.does})`);
    const mine = jobsOf(jobs[id]), theirs = jobsOf(jobs[c.id]);
    for (const j of mine.filter((x) => !theirs.includes(x))) assert.ok(c.does.includes(LACKS[j]), `"${LACKS[j]}" (${c.does})`);
    for (const j of theirs.filter((x) => !mine.includes(x))) assert.match(c.does, new RegExp(`; also .*${DOES[j]}`), `"also ${DOES[j]}" (${c.does})`);
    if (JSON.stringify(yearsOf(jobs[id])) === JSON.stringify(yearsOf(jobs[c.id]))) assert.match(c.does, /same years/, c.does);
    if (c.band) assert.ok(c.mini && /^Recorded (up to|down to|from) /.test(c.band), `the mini band and "Recorded …" (${c.band})`);
  }
  await done(page);
});

test('PFF12 (pf-f BC4, What you can do, limiting heat): the member limited by heat shows "Recorded up to N °C" from its candidates\' own ranges', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  const [now, ...laters] = await periodVerdicts(page, id);
  const want = laterLossOf(now, laters)?.factor ?? now?.limiting?.factor ?? null;
  const bands = await page.$$eval(`${DETAILS} [data-cando] [data-row-band]`, (els) => els.map((e) => e.textContent.trim()));
  if (want === 'hot') for (const b of bands) assert.match(b, /Recorded up to \d+(\.\d+)?\s°C/);
  else if (want === 'cold') for (const b of bands) assert.match(b, /Recorded down to [−-]?\d+(\.\d+)?\s°C/);
  await done(page);
});

test('PFF13 (pf-f BC5, BC6, DetailsMore names, why and sources): Pinto peanut at Kiambu: the board\'s rows in order, the records line from GBIF, a long date, In other climates', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await openAll(page);
  const r = await recordsOf(page, id);
  assert.ok(r.records && r.cells, 'Pinto peanut has GBIF records and map squares');
  const fmt = (n) => n.toLocaleString('en');
  await says(page, `From ${fmt(r.records)} GBIF records of where it grows, thinned to ${fmt(r.cells)} map squares, cultivation included.`, { inDialog: true });
  await inDialogOrder(page, ['Sources and how sure we are', 'Jobs, light, time', 'Climate range', `${fmt(r.records)} GBIF records, thinned to ${fmt(r.cells)} map squares · estimate`, 'Life', 'Size', 'How sure we are, in words.']);
  await says(page, /\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/, { inDialog: true });
  await says(page, /In other climates: on the \w+ (list only|.* lists)\./, { inDialog: true });
  const text = await dialogText(page);
  assert.doesNotMatch(text, /These reasons come from|\(\d{4}-\d{2}-\d{2}\)/, 'no "These reasons come from", no raw dates');
  assert.ok(await page.$eval(`${DETAILS} [data-sure-rows]`, (e) => e.querySelectorAll('dt').length >= 5), 'a label and value table');
  await done(page);
});

test('PFF14 (pf-f BC6, Against records, Almond at Seville): "From N GBIF records…" with the plant\'s own counts', async () => {
  const page = await boardPalette('seville-board', { width: 390 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  const r = await recordsOf(page, id);
  assert.ok(r.records && r.cells);
  await says(page, `From ${r.records.toLocaleString('en')} GBIF records of where it grows, thinned to ${r.cells.toLocaleString('en')} map squares, cultivation included.`, { inDialog: true });
  await done(page);
});

test('PFF15 (pf-f BC7, BC8, BC9, Swap): rows as one sentence with the mini band, a filled hole bold with a check, the head chip "Recorded invasive in", the already row with its jobs and years', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Calliandra houstoniana');
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 10_000));
  const rows = await page.$$eval(`${DETAILS} [data-swap-row]`, (els) => els.map((e) => ({ fills: e.querySelector('[data-swap-does]').hasAttribute('data-fills'), bold: !!e.querySelector('[data-swap-does] strong svg'), text: e.querySelector('[data-swap-does]').textContent.trim(), mini: !!e.querySelector('[data-mini-band]'), band: e.querySelector('[data-row-band]')?.textContent.trim() ?? null, old: !!e.querySelector('.ct-pill, [data-swap-fills], [data-swap-leaves], [data-swap-gaps-same], [data-swap-newlight]') })));
  for (const r of rows) {
    assert.equal(r.old, false, 'no pill, tags or separate gap lines');
    if (r.fills) assert.ok(r.bold && /: also fills /.test(r.text), `a filled hole: bold with a check (${r.text})`);
    if (r.band) assert.ok(r.mini && /today/.test(r.band), `the mini band and edge words (${r.band})`);
  }
  assert.ok(rows.some((r) => r.band), 'at least one row with its edge words');
  // Round 3 C4: the board's row words ("Near its cool edge today; safer as it warms", "On its cool edge
  // today; in range by 2041–2070", "to year 3 only: leaves years 3 to 15 empty") re-derived through the
  // engine on the installed release at kiambu-8 for every row shown: core rowBandOf on the page's verdicts
  // today and by the later period, core gapLines on the swap's own holes. The board's own plants (Ice
  // cream bean, Egyptian sesban) are named with what the engine gives them here, never their board words.
  const engine = await page.evaluate((pid) => {
    const s = window.__ctTest.store, out = {};
    for (const a of s.alternativesFor(pid)?.fit ?? []) {
      const t = s.taxonOf(a.id), v = s.poolVerdicts.value?.get(a.id) ?? s.verdictOf(t);
      out[String(a.id)] = { sci: t.canonical_name, v, later: v ? s.laterVerdictOf(t, v) : null, fills: a.fills, leaves: a.leaves };
    }
    return out;
  }, id);
  const shown = await page.$$eval(`${DETAILS} [data-swap-row]`, (els) => els.map((e) => ({ id: e.dataset.plantId, band: e.querySelector('[data-row-band]')?.textContent.replace(/\s+/g, ' ').trim() ?? null, does: e.querySelector('[data-swap-does]').textContent.replace(/\s+/g, ' ').trim() })));
  const bandWords = (e) => { const b = e?.v ? rowBandOf(e.v, e.later, (p) => p.replace('-', '–')) : null; return b ? sayEn(b.line) : null; };
  for (const r of shown) {
    const e = engine[r.id];
    assert.ok(e, `a shown row is one of the swap's candidates (${r.id})`);
    assert.equal(r.band, bandWords(e), `${e.sci}: the engine's edge words`);
    const gap = gapLines(e.fills, e.leaves).leaves;
    if (gap) assert.ok(r.does.includes(sayEn(gap)), `${e.sci}: the engine's "leaves" words (${r.does})`);
  }
  assert.ok(shown.some((r) => /^(On|Near) its /.test(r.band ?? '')), `at least one row on or near its edge, as the board (${shown.map((r) => r.band).join(' | ')})`);
  const board = Object.values(engine).filter((e) => /^(Inga edulis|Sesbania sesban)\b/.test(e.sci)).map((e) => `${e.sci}: ${bandWords(e)}${shown.some((r) => engine[r.id] === e) ? '' : ' (not among the rows shown)'}`);
  console.log(`PFF15 board rows through the engine at kiambu-8: ${board.join(' ; ')}`);
  // BC8: the invasive head chip, when the engine flags it invasive at the page's country.
  const inv = await page.evaluate((pid) => { const s = window.__ctTest.store; return s.flagsOfPlant(s.taxonOf(pid)).some((f) => f.kind === 'invasive') && !!s.flagContext.value.country; }, id);
  if (inv) {
    const chip = await page.$eval(`${DETAILS} [data-swap-head] [data-chip="invasive"]`, (e) => ({ text: e.textContent.trim(), svg: !!e.querySelector('svg') }));
    assert.ok(chip.svg && /^Recorded invasive in [A-Z]/.test(chip.text), JSON.stringify(chip));
  }
  // BC9: a palette plant that does the same jobs: "Already in your palette: does the N jobs to year M".
  for (const a of await page.$$eval(`${DETAILS} [data-swap-already] .ct-swap-does`, (els) => els.map((e) => e.textContent.trim()))) assert.match(a, /^Already in your palette: does the (\d+ jobs|job) to year \d+$/, a);
  // C7: the years against the member's ("and stands to year 25", "to year 3 only", else its span), and
  // "Grows in:" only when its light differs from the member's (board: Egyptian sesban shows its size only).
  const facts = await page.evaluate((pid) => {
    const s = window.__ctTest.store, light = (t) => JSON.stringify([t.light?.sunniest ?? t.stratum?.value ?? null, t.light?.shadiest ?? t.stratum?.value ?? null]);
    const m = s.taxonOf(pid);
    return [...document.querySelectorAll('dialog[open] [data-swap-row]')].map((e) => { const t = s.taxonOf(e.dataset.plantId); return { t, text: e.querySelector('[data-swap-does]').textContent.trim(), size: e.querySelector('[data-swap-size]').textContent.trim(), sameLight: light(t) === light(m) }; }).concat([{ member: m }]);
  }, id);
  const member = facts.pop().member, my = yearsOf(member);
  for (const r of facts) {
    const cy = yearsOf(r.t);
    if (my && cy && my.to !== null && cy.to !== null && cy.from <= my.from && cy.to > my.to) assert.match(r.text, new RegExp(`, and stands to year ${cy.to}(:|$)`), r.text);
    else if (my && cy && my.to !== null && cy.to !== null && cy.from <= my.from && cy.to < my.to) assert.match(r.text, new RegExp(`, to year ${cy.to} only(:|$)`), r.text);
    assert.equal(/^Grows in/.test(r.size), !r.sameLight, `"Grows in" only for another light (${r.size})`);
  }
  await done(page);
});


// ---- fix round 1, batch 2 (review findings BC14 to BC18, R1 to R7) ----

test('PFF16 (pf-f BC14, BC15, BC17, DetailsMore): Pinto peanut at Kiambu: the summary\'s main job leads What it does, the syntropic role with its link, the estimate chip in the board\'s words, the invasive line with its source, capitalised language names, the correction beside the guide link', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await openAll(page);
  // BC14: the main job is the job of the first open hole it fills (the engine), as the summary says.
  const main = await page.evaluate((pid) => { const s = window.__ctTest.store; return { holes: s.openHoles.value, t: s.taxonOf(pid) }; }, id)
    .then(({ holes, t }) => holes.find((h) => h.kind === 'job' && h.job && core.fills(h, t))?.job ?? null);
  const summary = await page.$eval(`${DETAILS} [data-summary-main] strong`, (e) => e.textContent.trim());
  const first = await page.$eval(`${DETAILS} [data-job-tile] strong`, (e) => e.textContent.trim());
  const mainWord = first.split(' · ')[0];
  assert.match(first, / · its main job here$/, `the first job carries "its main job here" (${first})`);
  assert.ok(summary.startsWith(mainWord), `the summary and What it does name one main job ("${summary}" / "${first}")`);
  if (main) assert.equal(mainWord, en[`consortium.job.${main}`]);
  await says(page, /In syntropic words: a (support plant|crop) of the [a-z ]+ stratum, from .+ to .+\. What these words mean/, { inDialog: true });
  // BC15: the borrowed list's chip.
  await says(page, /Placed as on the \w+ list: an estimate/, { inDialog: true });
  assert.match(await page.$eval(`${DETAILS} [data-estimate-chip]`, (e) => e.textContent.trim()), /^Placed as on the \w+ list: an estimate$/, 'the chip in the board\'s words, not "estimate: placed as on"');
  // BC17: invasive at Kenya, with its source, when the engine records none there.
  const inv = await page.evaluate((pid) => { const s = window.__ctTest.store, t = s.taxonOf(pid); return { here: (t.warnings.invasive_in ?? []).some((r) => r.country === 'KE'), checked: s.flagContext.value.countryStatus === 'checked', known: t.warnings.invasive_in !== null }; }, id);
  if (inv.known && inv.checked && !inv.here) await says(page, 'Not recorded invasive in Kenya (GRIIS).', { inDialog: true });
  const langs = await page.$$eval(`${DETAILS} details[data-more="names"] dt[lang]`, (els) => els.map((e) => e.textContent.trim()));
  for (const l of langs) assert.equal(l.charAt(0), l.charAt(0).toLocaleUpperCase(), `the language name starts with a capital (${l})`);
  // The correction and the guide link on one row.
  const row = await page.evaluate(() => { const d = document.querySelector('dialog[open] .ct-d-endlinks'); const b = d.querySelector('button'), a = d.querySelector('a'); if (!b || !a) return null; const rb = b.getBoundingClientRect(), ra = a.getBoundingClientRect(); return { b: b.textContent.trim(), a: a.textContent.trim(), same: ra.top < rb.bottom && ra.bottom > rb.top }; });
  assert.ok(row && row.b.includes('Suggest a correction') && row.same, `board: "Suggest a correction" and the guide link on one row (${JSON.stringify(row)})`);
  await done(page);
});

test('PFF17 (pf-f BC16, R6, R7, soil card): the neighbour fill in kilometres, the map\'s texture word, labels inside the drawing', async () => {
  const sev = await boardPalette('seville-board', { width: 390 });
  const almond = await idOf(sev, 'Prunus dulcis');
  await open(sev, 'details', almond);
  const s = await soilOf(sev);
  assert.ok(s.nearKm !== null, 'Seville\'s soil reading is a neighbour fill (engine)');
  await says(sev, `Soil map, nearest square ${Math.round(s.nearKm).toLocaleString('en')} km away: a weaker guess.`, { inDialog: true });
  if (s.texture) await says(sev, `the soil map says ${s.map.toLocaleString('en', { maximumFractionDigits: 1 })}, ${TEXTURE_EN[s.texture]}.`, { inDialog: true });
  // R7: a value at the top of the scale keeps its label inside the drawing, in a long language too.
  await setSiteEdits(sev, { soilPh: 9.5 });
  await says(sev, 'your test: pH 9.5', { inDialog: true });
  const inside = await sev.$$eval(`${DETAILS} [data-soil-card] svg.ct-band text`, (els) => els.map((e) => { const b = e.getBBox(); return { t: e.textContent, ok: b.x >= -0.5 && b.x + b.width <= 324.5 }; }));
  assert.ok(inside.every((x) => x.ok), `every label inside the 324-wide drawing (${JSON.stringify(inside)})`);
  await done(sev);
});

test('PFF18 (pf-f BC18, Details at 390, light and dark): "Against your place" at 600, the fit box with its line, the section hint inline after its title', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await says(page, 'Fits your place today', { inDialog: true });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await frames(page);
    const st = await page.evaluate(() => {
      const d = document.querySelector('dialog[open]');
      const h = d.querySelector('[data-against] h3'), fit = d.querySelector('.ct-against-fit');
      const hint = d.querySelector('details[data-more="pairs"] > summary h3 > .ct-muted');
      const title = hint?.parentElement.firstChild;
      const r = document.createRange(); if (title) r.selectNodeContents(title);
      const lines = title ? [...r.getClientRects()] : [];
      const hr = hint ? hint.getClientRects()[0] : null;
      return { weight: getComputedStyle(h).fontWeight, border: getComputedStyle(fit).borderTopWidth, inline: !!hr && lines.length > 0 && Math.abs(hr.top - lines[lines.length - 1].top) < 4 };
    });
    assert.equal(st.weight, '600', `${theme}: "Against your place" at 600`);
    assert.equal(st.border, '1px', `${theme}: the fit box has its 1px line`);
    assert.ok(st.inline, `${theme}: the hint follows the title on its line`);
  }
  await done(page);
});

test('PFF19 (pf-f R1, real clicks): "Suggest a correction" opens the form in sight with focus; Cancel gives focus back; a draft comes back visible on reopen', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await page.evaluate(() => window.__ctTest.store.members.value[0]);
  await open(page, 'details', id);
  await page.click(`${DETAILS} .ct-d-endlinks button`);
  await page.waitForSelector(`${DETAILS} #ct-corr-field`, { visible: true, timeout: 6000 });
  await frames(page);
  assert.ok(await page.evaluate(() => document.activeElement?.id === 'ct-corr-field'), 'the form\'s first field has the focus');
  await page.click(`${DETAILS} .ct-corr .ct-actions button:not([type="submit"])`);
  await frames(page);
  const back = await page.evaluate(() => { const a = document.activeElement; return { text: a?.textContent.trim() ?? '', visible: !!a && a.offsetParent !== null }; });
  assert.ok(/Suggest a correction/.test(back.text) && back.visible, `Cancel gives focus back to a visible button (${JSON.stringify(back)})`);
  // A draft: written, the dialog closed, then opened again: the form and its text are in sight.
  await page.click(`${DETAILS} .ct-d-endlinks button`);
  await page.waitForSelector(`${DETAILS} .ct-corr textarea`, { visible: true, timeout: 6000 });
  await page.type(`${DETAILS} .ct-corr textarea`, 'Grows taller here');
  await page.keyboard.press('Escape');
  await frames(page);
  await open(page, 'details', id);
  await page.waitForSelector(`${DETAILS} .ct-corr textarea`, { visible: true, timeout: 6000 });
  assert.match(await page.$eval(`${DETAILS} .ct-corr textarea`, (e) => e.value), /Grows taller here/);
  await done(page);
});

test('PFF20 (pf-f R2, Swap without a place): no hold filter, every candidate listed, never "No other plant"; with a place, unjudged candidates stay listed and say so', async () => {
  const page = await boardPalette('seville-board', { width: 390 });
  const id = await idOf(page, 'Olea europaea');
  assert.ok(id, 'Olive in the Seville palette');
  // With a place: the rows are the holding candidates and the unjudged ones (engine), the count names both.
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 10_000));
  const want = await page.evaluate((pid) => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, ctx = s.verdictContext.value;
    const fit = (s.alternativesFor(pid)?.fit ?? []).map((a) => s.pool.value.find((x) => x.id === a.id)).filter(Boolean);
    const then = rule.verdicts(fit, { ...ctx, period: '2041-2070' });
    const unknown = fit.filter((t) => then.get(t.id)?.range !== 'judged').length;
    return { n: fit.filter((t) => rule.holdsBy(t, ctx, '2041-2070')).length, unknown, m: fit.length };
  }, id);
  const rows = await page.$$eval(`${DETAILS} [data-swap-row]:not([data-outside] *)`, (els) => els.length);
  assert.equal(rows, Math.min(want.n + want.unknown, 9), `the rows: ${want.n} that hold and ${want.unknown} not checked`);
  // Without a place: nothing can be judged by 2041–2070.
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  await frames(page);
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 10_000), 'rows without a place');
  assert.equal(await page.$(`${DETAILS} .ct-swap-hold input`), null, 'no hold filter without a place');
  assert.doesNotMatch(await dialogText(page), /No other plant in this list can take its place/);
  await done(page);
});

test('PFF21 (pf-f R3, DetailsDesk soil): with a soil test the Niche row names the test and judges it; "Set my own soil pH" on the desk; in pots it says so', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await setSiteEdits(page, { soilPh: 9.4 });
  await open(page, 'details', id);
  const lvl = await page.evaluate((pid) => { const s = window.__ctTest.store, t = s.taxonOf(pid); return s.verdictOf(t)?.factors.find((f) => f.factor === 'soil-ph')?.level ?? null; }, id);
  await says(page, `(your test says 9.4: ${lvl === 'fits' ? 'fits' : lvl === 'unknown' || lvl === null ? 'not checked' : 'outside its range'})`, { inDialog: true });
  assert.doesNotMatch(await dialogText(page), /the soil map says [\d.]+ here: /, 'never the map value beside a fit judged on the test');
  await page.click(`${DETAILS} [data-niche] [data-set-ph]`);
  assert.ok(await soilLineOpen(page), 'the desk: "Set my own soil pH" opens the figures at the soil line (M40: the line itself, open)');
  await setSiteEdits(page, { pots: true });
  await open(page, 'details', id);
  await says(page, '(in pots: not checked)', { inDialog: true });
  await done(page);
});

test('PFF22 (pf-f round 2 C3, M23): Almond against Mendoza: the aridity line ends as the boards end it, no rain sentence, in en and es', async () => {
  for (const lang of ['en', 'es']) {
    const page = await boardPalette('mendoza-board-rain', { width: 390, lang });
    const id = await idOf(page, 'Prunus dulcis');
    await open(page, 'details', id);
    const low = await page.evaluate((pid) => window.__ctTest.store.taxonOf(pid).climate?.precip?.low ?? null, id);
    assert.ok(low !== null, 'Almond has a recorded rain range (engine)');
    const mm = `${Math.round(low).toLocaleString(lang)} mm`;
    // C3 (round 2): no v14 board puts the rain words in Against; they belong to the candidate rows.
    const against = await page.$eval(`${DETAILS} [data-against]`, (e) => e.textContent);
    assert.ok(!against.includes(mm), `Against says no "${mm}" (${lang})`);
    assert.ok(await has(page, `${DETAILS} [data-against] [data-measure="aridity"]`, 1000), `the aridity band (${lang})`);
    await done(page);
  }
});

test('PFF23 (pf-f R5, site-check unknowns): a balcony grower sees what the site check could not decide, in both layouts', async () => {
  for (const width of [390, 1280]) {
    const page = await boardPalette('kiambu-8', { width, height: 1000 });
    await page.evaluate(() => { window.__ctTest.store.room.value = 'pots'; });
    const id = await page.evaluate(() => window.__ctTest.store.pool.value.find((t) => t.traits.height_m?.max == null && t.traits.habit !== 'Climber')?.id ?? null);
    assert.ok(id, 'a plant on the list with no height recorded');
    await open(page, 'details', id);
    await says(page, 'Height in the wild not recorded, so not checked against your space.', { inDialog: true });
    await done(page);
  }
});

// ---- fix round 1, batch 3 (review findings C1 to C12) ----

test('PFF24 (pf-f C1, drainage): the soil card and Time and size say the plant\'s drainage need, and the hint when the grower\'s ground stays wet', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  const row = () => page.$eval(`${DETAILS} details[data-more="jobs"] dl`, (dl) => { const dt = [...dl.querySelectorAll('dt')].find((d) => d.textContent.trim() === 'Drainage'); return dt?.nextElementSibling?.textContent.trim() ?? null; });
  for (const [wd, drainage] of [[true, null], [false, null], [null, null], [true, 'wet'], [false, 'wet']]) {
    await patchTaxon(page, id, { traits: { well_drained: wd, drought_tolerance: 'High', moisture_use: null } });
    await setSiteEdits(page, drainage ? { drainage } : {});
    await open(page, 'details', id);
    const d = await drainageOf(page, id);
    if (wd === true && drainage === 'wet') assert.ok(d.hint, 'the engine raises the drainage hint for a plant that wants free-draining soil on wet ground');
    await says(page, drainSay(d), { inDialog: true });
    await openAll(page);
    assert.equal(await row(), DRAIN_EN(d), `Time and size: the same words (well_drained ${wd}, drainage ${drainage})`);
  }
  await done(page);
});

test('PFF26 (pf-f C2, DetailsDesk soil without a value): the Niche row says "not checked on soil pH", and "Set my own soil pH" stays', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await page.evaluate(() => { const s = window.__ctTest.store, l = s.location.value; s.location.value = { ...l, lookup: { ...l.lookup, soil: null } }; });
  await open(page, 'details', id);
  await says(page, '(not known: no data for your place or the squares next to it, so not checked on soil pH)', { inDialog: true });
  assert.ok(await has(page, `${DETAILS} [data-niche] [data-set-ph]`, 1000), 'the desk keeps "Set my own soil pH"');
  await done(page);
});

test('PFF27 (pf-f C6, the four bands only): a plant that needs summer heat draws the four bands, its summer limit said in the lines under them', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await page.evaluate(() => {
    const { store, bandsOf } = window.__ctTest;
    return store.pool.value.find((t) => { const v = store.poolVerdicts.value?.get(t.id) ?? store.verdictOf(t); return v && bandsOf(v, store.laterVerdictOf(t, v), t.climate).some((b) => b?.measure === 'tmeanWarm'); })?.id ?? null;
  });
  assert.ok(id, 'a plant at Kiambu whose summer warmth the engine checks (a tmeanWarm band in core: okra, peanut…)');
  await open(page, 'details', id);
  assert.ok(await has(page, `${DETAILS} [data-against] [data-measure]`, 6000));
  const titles = await page.$$eval(`${DETAILS} [data-against] [data-measure] .ct-bandcard-head b`, (els) => els.map((e) => e.textContent.trim()));
  assert.ok(titles.every((b) => BANDS.includes(b)), `only the four board bands (${titles})`);
  assert.ok(await has(page, `${DETAILS} [data-against] li[data-factor="summer"]`, 2000), 'the summer limit stays in the lines');
  await done(page);
});

test('PFF28 (pf-f C8, Swap hold filter empties the list): "None of the N hold by 2041–2070" with "See all N", never "No other plant"', async () => {
  const page = await boardPalette('seville-board', { width: 390 });
  const id = await idOf(page, 'Olea europaea');
  // A place where every candidate leaves its range by 2041–2070: the rule says none holds (fixture).
  await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value;
    s.verdictRule.value = { ...rule, holdsBy: () => false, verdicts: (taxa, ctx) => new Map([...rule.verdicts(taxa, ctx)].map(([k, v]) => [k, { ...v, range: 'judged' }])) };
  });
  const m = await page.evaluate((pid) => window.__ctTest.store.alternativesFor(pid)?.fit.length ?? 0, id);
  assert.ok(m > 0, 'Olive has alternatives (engine)');
  await open(page, 'swap', id);
  const already = await page.$$eval(`${DETAILS} [data-swap-already]`, (e) => e.length).catch(() => 0);
  if (!already) await says(page, `None of the ${m} ${m === 1 ? 'holds' : 'hold'} by 2041–2070.`, { inDialog: true });
  assert.doesNotMatch(await dialogText(page), /No other plant in this list can take its place/);
  await page.click(`${DETAILS} ${aria('button', `See all ${m}`)}`);
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 4000), '"See all" lists them');
  await done(page);
});

test('PFF29 (pf-f C12, light span on fixtures): "grows in A – B · found mostly in C" on the Niche row when the release has a span and a preferred level', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await patchTaxon(page, id, { light: { sunniest: 'high', shadiest: 'low', preferred: 'medium' } });
  await open(page, 'details', id);
  await says(page, 'Light: grows in Mostly sun – Shade · found mostly in Part shade', { inDialog: true });
  await patchTaxon(page, id, { light: null });
  await open(page, 'details', id);
  const t = await page.$eval(`${DETAILS} [data-niche-row="light"]`, (e) => e.innerText);
  assert.doesNotMatch(t, /found mostly in/, 'no preferred level in the data: no "found mostly in"');
  await done(page);
});

// Carried from PP-C6c (c2 fix round 2 K2 K8 K16 R5, round 3 T3 T6): one band per measure, named with its
// status in words, numbering the ends core gives, two decimals at most, a true minus, the place's dot
// outside the drawn range only when past it; the key in words; nothing sideways at 320 px.
test('PFF25 (pf-f C12, bands at 320 px): Almond at Seville: the band geometry, numbers and key as core gives them', async () => {
  const page = await boardPalette('seville-board', { width: 320, height: 700 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  assert.ok(await has(page, `${DETAILS} [data-against] [data-measure]`, 6000), 'the bands');
  const bands = await page.$$eval(`${DETAILS} [data-against] [data-measure]`, (els) => els.map((e) => {
    const box = (el) => (el ? el.getBBox() : null);
    const rect = box(e.querySelector('.ct-bd-range')), dashed = box(e.querySelector('[data-disputed]')), dot = box(e.querySelector('.ct-bd-now-dot'));
    const x0 = Math.min(rect.x, dashed ? dashed.x : Infinity);
    return { m: e.dataset.measure, title: e.querySelector('.ct-bandcard-head b')?.textContent.trim(), status: e.querySelector('.ct-bandcard-status')?.textContent.trim(), nums: [...e.querySelectorAll('.ct-bd-num text')].map((t) => t.textContent), x0, x1: rect.x + rect.width, dot: dot ? dot.x + dot.width / 2 : null };
  }));
  const want = await page.evaluate((pid) => {
    const { store, bandsOf } = window.__ctTest;
    const t = store.taxonOf(pid), v = store.verdictOf(t);
    return Object.fromEntries(bandsOf(v, store.laterVerdictOf(t, v), t.climate).filter(Boolean).map((b) => [b.measure, b]));
  }, id);
  assert.equal(new Set(bands.map((b) => b.m)).size, bands.length, 'one band per measure');
  const num = (x) => Number(x.replace('\u2212', '-').replace('?', ''));
  for (const b of bands) {
    assert.ok(b.title && b.status, `band ${b.m}: its name and status in words`);
    assert.ok(b.nums.every((n) => !/[.,]\d{3}/.test(n)), `band ${b.m}: two decimals at most (${b.nums})`);
    assert.ok(b.nums.every((n) => !n.includes('-')), `band ${b.m}: a true minus sign (${b.nums})`);
    const c = want[b.m];
    assert.ok(c, `band ${b.m} is one core draws`);
    assert.deepEqual(b.nums.map(num), [c.low, c.high].filter((x) => x !== null).map((x) => Math.round(x * 100) / 100), `band ${b.m}: the ends core gives`);
    if (b.dot !== null) {
      assert.equal(b.dot < b.x0 - 0.5, c.place < c.recordedLow, `band ${b.m}: the dot left of the range only when below its recorded low`);
      assert.equal(b.dot > b.x1 + 0.5, c.place > c.recordedHigh, `band ${b.m}: the dot right of the range only when above its recorded high`);
    }
  }
  assert.match(await page.$eval(`${DETAILS} [data-band-key]`, (e) => e.textContent), /where it is recorded growing.*your place today.*not a firm limit/s, 'the key in words');
  assert.equal(await sideways(page), 0, 'Details at 320 px: nothing sideways');
  await done(page);
});

test('PFF30 (pf-f round 2 R3 R4, no place): a member on the desk before a location is set: What you can do says the hold is not checked and still lists the closest; Flowers asks for a place', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  await frames(page);
  await open(page, 'details', id);
  await says(page, 'In your palette.', { inDialog: true });
  // R3: nothing can be judged by 2041–2070 without a place: never a silent empty section.
  const fit = await page.evaluate((pid) => (window.__ctTest.store.alternativesFor(pid)?.fit ?? []).length, id);
  const cando = await page.$eval(`${DETAILS} [data-cando]`, (e) => ({ text: e.textContent, rows: e.querySelectorAll('[data-swap-row]').length }));
  assert.match(cando.text, /Not checked for 2041–2070/, `What you can do says why no row holds (${cando.text.slice(0, 200)})`);
  if (fit > 0) assert.equal(cando.rows, Math.min(fit, 2), 'the closest rows, without "holds in"');
  assert.doesNotMatch(cando.text, /holds in 2041–2070/, 'never "holds in" when nothing was compared');
  // R4: the Flowers row asks for a place instead of claiming none near it.
  // M35: Almond's own state through the engine (bloomNear on its bloom rows, no latitude), then its exact words.
  const at = await page.evaluate(async (pid) => {
    const s = window.__ctTest.store, t = s.taxonOf(pid);
    const d = await s.source.value.details(pid, s.climate.value, 'en');
    return { t, values: d.layerValues, country: s.flagContext.value.country ?? null, climate: s.climate.value };
  }, id);
  const state = bloomM.bloomNear(at.values, { lat: null, country: at.country, zone: placementZone(at.t, at.climate) }).state;
  assert.equal(state, 'no-place', 'Almond\'s bloom rows ask for a latitude: no place set is "set a place"');
  await says(page, en['consortium.details.flowersNoPlace'], { inDialog: true });
  const flowers = await page.$eval(`${DETAILS} [data-niche-row="flowers"]`, (e) => e.textContent);
  assert.ok(flowers.includes('set a place to see when it flowers here'), flowers);
  assert.doesNotMatch(flowers, /near your place/, flowers);
  await done(page);
});

// ---- fix round 3, batch 1 (review findings R1, R2, C2, C4) ----

// R1, C2: a serious conflict reads the same safety facts on the phone and the desk: the chip in the
// danger colour with the word "serious", the full line (the data's note, "serious") in the section, and
// the section's count matching the conflicts it names. The conflict row is a fixture (an interaction
// added to the page's list between Almond and another member at Seville), the words its own.
test('PFF31 (pf-f round 3 R1 C2, serious conflict): Almond beside another member with a serious shared pest: the danger chip says "serious", the full line with its note in both layouts, the count matches the list', async () => {
  for (const width of [1280, 390]) {
    const page = await boardPalette('seville-board', { width, height: 1000 });
    const id = await idOf(page, 'Prunus dulcis');
    const other = await seriousConflict(page, id);
    await frames(page);
    await open(page, 'details', id);
    await says(page, 'In your palette.', { inDialog: true });
    const chip = await page.$$eval(`${DETAILS} [data-summary] [data-chip="conflict"]`, (els, name) => els.filter((e) => e.textContent.includes(name)).map((e) => {
      const p = document.createElement('span'); p.style.color = 'var(--danger)'; e.parentElement.append(p); const want = getComputedStyle(p).color; p.remove();
      return { level: e.dataset.level, text: e.textContent.trim(), got: getComputedStyle(e).color, want };
    }), other);
    assert.equal(chip.length, 1, `${width}: one chip for the conflict with ${other}`);
    assert.equal(chip[0].level, 'danger', `${width}: the serious conflict's chip is a danger chip`);
    assert.equal(chip[0].got, chip[0].want, `${width}: in --danger`);
    assert.match(chip[0].text, /\(serious\)$/, `${width}: the word, never colour alone (${chip[0].text})`);
    const hint = await page.$eval(`${DETAILS} details[data-more="pairs"] summary`, (e) => e.textContent);
    await openAll(page);
    const lines = await page.$$eval(`${DETAILS} [data-conflict]:not(.soft)`, (els) => els.map((e) => e.textContent.trim()));
    const n = Number(/(\d+) conflicts?/.exec(hint)?.[1] ?? 0);
    assert.equal(n, lines.length, `${width}: the hint counts the conflicts the section names (${hint} / ${lines.length})`);
    assert.ok(lines.some((l) => l.includes(other) && l.includes('Fixture note: both carry the same canker') && /\(serious\)/.test(l)), `${width}: the full line with its note and "serious" (${JSON.stringify(lines)})`);
    await done(page);
  }
});

// R2: the Flowers row while the details query is out, and after it failed: never "no months recorded".
test('PFF32 (pf-f round 3 R2, Flowers): loading says "Loading…" busy; a failed details query says "not checked yet", never "no months recorded near your place"', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  assert.ok(id, 'Pinto peanut in kiambu-8');
  await page.evaluate(() => { const src = window.__ctTest.store.source.value; src.details = () => new Promise(() => {}); });
  await open(page, 'details', id);
  const loading = await page.waitForFunction(() => { const e = document.querySelector('dialog[open] [data-niche-row="flowers"]'); return e ? { text: e.textContent, busy: e.getAttribute('aria-busy') } : null; }, { timeout: 6000 }).then((h) => h.jsonValue());
  assert.match(loading.text, /Loading…/, loading.text);
  assert.equal(loading.busy, 'true');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await frames(page);
  await page.evaluate(() => { const src = window.__ctTest.store.source.value; src.details = () => Promise.reject(new Error('test: offline')); });
  await open(page, 'details', id);
  assert.ok(await has(page, `${DETAILS} [data-details-failed]`, 6000), 'the failed message');
  const failed = await page.$eval(`${DETAILS} [data-niche-row="flowers"]`, (e) => e.textContent);
  assert.match(failed, /not checked yet/, failed);
  assert.doesNotMatch(failed, /no months|set a place/, failed);
  await done(page);
});

// ---- h3 G4 batch 1 (chunk 3 hand-off triage M30, M31, M37, M38) ----

// M30: none of the alternatives holds by 2041–2070, three are judged to fail and the rest cannot be
// judged: Details and Swap both say how many fail, and that the rest is not checked. The hold states
// are set on the page's rule (the engine's counts are pf-f.test M30); the words are the views'.
test('PFF33 (pf-f M30, What you can do and Swap): 3 judged to fail and the rest not checked: both say "None of the 3 hold by 2041–2070." and "Not checked for 2041–2070"', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  const n = await page.evaluate((pid) => {
    const s = window.__ctTest.store, rule = s.verdictRule.value;
    const fit = (s.alternativesFor(pid)?.fit ?? []).map((a) => a.id);
    s.verdictRule.value = { ...rule, holdStates: (taxa) => new Map(taxa.map((t) => [t.id, fit.indexOf(t.id) < 3 ? 'not' : 'unknown'])) };
    return fit.length;
  }, id);
  assert.ok(n > 3, `more than 3 alternatives that fit (${n})`);
  await open(page, 'details', id);
  const cando = await page.$eval(`${DETAILS} [data-cando]`, (e) => e.textContent.replace(/\s+/g, ' '));
  assert.ok(cando.includes('None of the 3 hold by 2041–2070.'), `Details says how many fail (${cando.slice(0, 300)})`);
  assert.ok(cando.includes('Not checked for 2041–2070'), 'and that the rest is not checked');
  assert.doesNotMatch(cando, /holds in 2041–2070/, 'never "holds in"');
  await open(page, 'swap', id);
  await says(page, 'None of the 3 hold by 2041–2070.', { inDialog: true });
  await says(page, `0 of ${n} · ${n - 3} not checked`, { inDialog: true });
  await done(page);
});

// M31: a serious conflict reads the same in Swap as in Details: the danger chip with the word.
test('PFF34 (pf-f M31, Swap and Details): a serious conflict with another member is the same danger chip ending "(serious)" in both', async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  const other = await seriousConflict(page, id);
  await frames(page);
  const chipIn = (sel) => page.$$eval(sel, (els, name) => els.filter((e) => e.textContent.includes(name)).map((e) => {
    const p = document.createElement('span'); p.style.color = 'var(--danger)'; e.parentElement.append(p); const want = getComputedStyle(p).color; p.remove();
    return { level: e.dataset.level, text: e.textContent.trim(), danger: getComputedStyle(e).color === want };
  }), other);
  await open(page, 'details', id);
  await says(page, 'In your palette.', { inDialog: true });
  const inDetails = await chipIn(`${DETAILS} [data-summary] [data-chip="conflict"]`);
  await open(page, 'swap', id);
  assert.ok(await has(page, `${DETAILS} [data-swap-head]`, 10_000), 'Swap');
  const inSwap = await chipIn(`${DETAILS} [data-swap-head] .ct-flag`);
  assert.equal(inSwap.length, 1, `Swap names the conflict with ${other} once`);
  assert.deepEqual(inSwap, inDetails, 'Swap draws the same chip as Details');
  assert.deepEqual([inSwap[0].level, inSwap[0].danger], ['danger', true], 'the danger level, in --danger');
  assert.match(inSwap[0].text, /\(serious\)$/, `the word, never colour alone (${inSwap[0].text})`);
  await done(page);
});

// M37: the sheet's top row (boards Details, Swap, Correction): "‹ Back to …" and a plain × on one row,
// no rule under it.
test('PFF35 (pf-f M37, Swap head): the back link and a plain × share the top row; no box round the ×, no rule under the head', async () => {
  for (const width of [390, 1280]) {
    const page = await boardPalette('seville-board', { width, height: 900 });
    const id = await idOf(page, 'Prunus dulcis');
    await open(page, 'swap', id);
    const head = await page.waitForFunction(() => {
      const d = document.querySelector('dialog[open]'), back = d?.querySelector('.ct-sheet-head .ct-back'), x = d?.querySelector('.ct-sheet-head button[aria-label="Close"]');
      if (!back || !x) return null;
      const h = d.querySelector('.ct-sheet-head');
      return { backTop: back.getBoundingClientRect().top, xTop: x.getBoundingClientRect().top, xBorder: getComputedStyle(x).borderTopWidth, xBg: getComputedStyle(x).backgroundColor, headRule: getComputedStyle(h).borderBottomWidth };
    }, { timeout: 8000 }).then((h) => h.jsonValue());
    assert.ok(Math.abs(head.backTop - head.xTop) <= 4, `${width}: one row (${head.backTop} / ${head.xTop})`);
    assert.equal(head.xBorder, '0px', `${width}: the × has no box`);
    assert.equal(head.headRule, '0px', `${width}: no rule under the head`);
    await done(page);
  }
});

// M38: Details opened from Find (board Details: "‹ Back to results"); the back link returns to the same
// results, the search as the grower left it. Opened from the palette, no such link.
test('PFF36 (pf-f M38, Find and Details): a Find row\'s name opens Details with "Back to results", which returns to Find with its search; from the palette no back link', async () => {
  const page = await boardPalette('seville-board', { width: 390, height: 900 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  await says(page, 'In your palette.', { inDialog: true });
  assert.ok(!(await dialogText(page)).includes('Back to results'), 'from the palette: no "Back to results"');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await frames(page);
  await page.evaluate(() => window.__ctTest.openFind());
  assert.ok(await has(page, 'dialog[open] input[type="search"]', 10_000), 'Find');
  await page.type('dialog[open] input[type="search"]', 'fig');
  assert.ok(await has(page, 'dialog[open] [data-find-open]', 10_000), 'a row with its name to open');
  const name = await page.$eval('dialog[open] [data-find-open]', (b) => b.textContent.trim());
  await page.click('dialog[open] [data-find-open]');
  assert.ok(await page.waitForFunction((n) => document.querySelector('dialog[open] #ct-d-title')?.textContent.trim() === n, { timeout: 8000 }, name).then(() => true, () => false), `Details of ${name}`);
  await says(page, 'Back to results', { inDialog: true });
  await page.click('dialog[open] [data-sheet-back]');
  assert.ok(await has(page, 'dialog[open] input[type="search"]', 8000), 'back in Find');
  assert.equal(await page.$eval('dialog[open] input[type="search"]', (i) => i.value), 'fig', 'the search as the grower left it');
  await done(page);
});
