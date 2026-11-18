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
//   PP-C6c (one band per measure numbered as core's bandsOf, the dot outside only when past, the key, 320 px) -> PFF1 (the soil card left the bands: PFF6)
//   PP-C6d (the DOM order is the visual order; a member's foot on the phone, What you can do on the desk) -> PFF3
//   PP-C6e (the name link opens the form on the name; an empty send's summary above Cancel, then Send) -> PFF7
//   PP-C6f (the summary's conflict pill short, inside the card at 390 and 1280 px) -> PFF3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aria, en, has, useHarness } from './helpers.mjs';
import { boardPalette } from './pf-b-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, LIGHT, dialogText, done, frames, says, setSiteEdits } from './pf-helpers.mjs';

useHarness();

const core = await import('../../src/lib/consortium/holes.ts');
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

// ---- Details (boards Details 390, DarkDetails, DetailsMore) ----

failing('PFF1 (pf-f Details at 390): Pinto peanut at Kiambu, a candidate: name line, summary with the engine\'s holes, Niche, chips, the four bands in one order, scenarios, records, table, the three sections, Add from the foot', { owner: 'pf-f', reason: BOARD }, async () => {
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

failing('PFF2 (pf-f DetailsMore): the sections open: the main job, the syntropic line, Time and size, no conflict with the palette\'s plants, Warnings, Names and Sources, Suggest a correction', { owner: 'pf-f', reason: BOARD }, async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  await openAll(page);
  await says(page, '· its main job here', { inDialog: true });
  await inDialogOrder(page, ['Time and size', 'Planted in', 'When it stands', 'its place in a palette, not how long it lives', 'Size', 'full grown', 'Life', 'Leaves', 'Drainage', 'Wind', 'Root partners']);
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await says(page, new RegExp(`No conflict known with your ${members} plants\\.|With [A-Z]`), { inDialog: true });
  await inDialogOrder(page, ['Toxicity', 'Invasive', 'Spreads']);
  await inDialogOrder(page, ['Names', 'Sources and how sure we are', 'Jobs, light need and years', 'Climate range', 'How sure we are, in words.']);
  assert.ok(await has(page, `${DETAILS} ${aria('button', 'Suggest a correction')}`, 1000), 'board: "Suggest a correction"');
  await done(page);
});

failing('PFF4 (pf-f DarkDetails): the dark sheet says what the light one says, and the soil card\'s status keeps 4.5:1 against its card', { owner: 'pf-f', reason: BOARD }, async () => {
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

failing('PFF6 (pf-f soil card, F10): the map\'s pH as a ring, the grower\'s test as a dot, a neighbour fill a weaker guess, no value "not checked on soil pH"; Set my own soil pH opens the figures', { owner: 'pf-f', reason: BOARD }, async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const id = await idOf(page, 'Arachis pintoi');
  await open(page, 'details', id);
  const f = await figures(page, id);
  assert.ok(f.map !== null && f.ph?.min != null, 'Kiambu has a soil map value and Pinto peanut a pH range');
  const num = (x) => x.toLocaleString('en', { maximumFractionDigits: 1 });
  await says(page, `soil map: pH ${num(f.map)}`, { inDialog: true });
  await says(page, `Recorded on pH ${num(f.ph.min)} to ${num(f.ph.max)}; the soil map says ${num(f.map)} here.`, { inDialog: true });
  await says(page, f.soilLevel === 'fits' ? 'Fits the likely soil' : 'Outside the likely soil’s pH', { inDialog: true });
  await says(page, 'Drainage: no need recorded.', { inDialog: true });
  await says(page, 'Soil is not projected: the same in every period. A hint, never a reason to hide a plant.', { inDialog: true });
  // The grower's own test: a dot, the status "your soil".
  await setSiteEdits(page, { soilPh: 6.8 });
  await says(page, 'your test: pH 6.8', { inDialog: true });
  await says(page, /Fits your soil|Outside your soil’s pH/, { inDialog: true });
  await setSiteEdits(page, {});
  // Set my own soil pH: the figures panel at its soil line.
  await page.click(`${DETAILS} [data-set-ph]`);
  assert.equal(await page.evaluate(() => window.__ctTest.store.figureLine.value), 'soilPh', 'board: "Set my own soil pH" opens the figures at the soil line');
  // F10: no soil value here or next door.
  await page.evaluate(() => { const s = window.__ctTest.store, l = s.location.value; s.location.value = { ...l, lookup: { ...l.lookup, soil: null } }; });
  await open(page, 'details', id);
  await says(page, 'Not checked on soil pH', { inDialog: true });
  await says(page, 'no data for your place or the squares next to it', { inDialog: true });
  // F10: the map's value from a neighbouring square (Seville's reading is a fill).
  const sev = await boardPalette('seville-board', { width: 390 });
  const almond = await idOf(sev, 'Prunus dulcis');
  await open(sev, 'details', almond);
  await says(sev, /Soil map, nearest square [\d,]+ m away: a weaker guess\./, { inDialog: true });
  await done(page, sev);
});

failing('PFF8 (pf-f SiteMendoza): Almond against Mendoza: the bands, the soil card, and the dryness note by watering', { owner: 'pf-f', reason: BOARD }, async () => {
  const page = await boardPalette('mendoza-board-rain', { width: 390 });
  await setSiteEdits(page, { watering: 'rain' });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  await says(page, 'where Almond is recorded growing', { inDialog: true });
  assert.ok(await has(page, `${DETAILS} [data-soil-card]`, 2000), 'board: the soil card under Almond against your place');
  await says(page, 'Drainage: no need recorded.', { inDialog: true });
  await done(page);
});

// ---- Details on the desk (board DetailsDesk), carrying PP-C6b, PP-C6d and PP-C6f ----

failing('PFF3 (pf-f DetailsDesk 1280): Almond, a member at Seville: two columns, "In your palette.", Planted in, the soil map\'s say on the Niche row and no soil card, What you can do with Swap rows, Find one that holds and Remove', { owner: 'pf-f', reason: BOARD }, async () => {
  const page = await boardPalette('seville-board', { width: 1280, height: 1000 });
  const id = await idOf(page, 'Prunus dulcis');
  await open(page, 'details', id);
  const f = await figures(page, id);
  await says(page, /, from year \d+ to year \d+\. In your palette\./, { inDialog: true });
  await says(page, `Planted in: ${en[`consortium.palette.light_${f.stratum}`]}`, { inDialog: true });
  await says(page, new RegExp(`\\(the soil map says ${f.map} here: (fits|outside its range|not checked)\\)`), { inDialog: true });
  assert.equal(await page.$eval(`${DETAILS} [data-soil-card]`, (e) => e.offsetParent === null).catch(() => true), true, 'board: no soil card on the desk');
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

failing('PFF5 (pf-f Swap 390): Calliandra at Kiambu: the lede, its jobs and years, "Only plants that hold by 2041–2070" with the engine\'s count, Swap and Add beside on each row, the closest first, only Remove in the foot', { owner: 'pf-f', reason: BOARD }, async () => {
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
    return { n: fit.filter((a) => { const t = s.pool.value.find((x) => x.id === a.id); return t && rule.holdsBy(t, ctx, '2041-2070'); }).length, m: fit.length };
  }, id);
  await says(page, `Only plants that hold by 2041–2070 ${want.n} of ${want.m}`, { inDialog: true });
  const rows = await page.$$eval(`${DETAILS} [data-swap-row]`, (els) => els.map((e) => ({ buttons: [...e.querySelectorAll('button')].map((b) => b.textContent.trim()), fills: !!e.querySelector('[data-swap-fills]'), leaves: !!e.querySelector('[data-swap-leaves]'), same: !!e.querySelector('[data-swap-gaps-same]'), fit: /\S/.test(e.querySelector('[data-conf], .ct-fit')?.textContent ?? '') })));
  assert.equal(rows.length, Math.min(want.n, 9), 'the rows are the holding candidates, nine at most');
  assert.ok(rows.every((r) => r.buttons.includes('Swap') && r.buttons.includes('Add beside')), `board: Swap and Add beside on each row (${JSON.stringify(rows.map((r) => r.buttons))})`);
  assert.ok(rows.every((r) => (r.fills || r.leaves) !== r.same && r.fit), JSON.stringify(rows));
  const does = await page.$$eval(`${DETAILS} [data-swap-does]`, (els) => els.map((e) => e.textContent.trim()));
  for (const d of does) assert.match(d, /^Does (all its jobs|none of its jobs \([a-z][^)]*\)|\d of its \d jobs \((no [a-z ]+|[a-z][^)]*)\)), (from|in|to) [a-z\d]/, `a candidate's first line ("${d}")`);
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
