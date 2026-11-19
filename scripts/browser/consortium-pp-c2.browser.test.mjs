// PP-C stream c2, One plant (plant-palette-slices section 3.4, c2 browser rows): Details, Swap and their
// failure states, one test per scenario, written failing in PP-C commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing(), owner c2 in its title); c2 removes a marker in the commit that
// makes it pass. Three F1a markers parked by PP-B (scripts/plan/parked-markers.json) are restored here,
// retitled "F1a-Cn → PP-C (c2 …" and rewritten against the verdict engine: C4, C5 (from
// 648baf2:scripts/browser/consortium-f1a-confidence.browser.test.mjs) and C6's Details half (its Find
// half is c1's, in consortium-pp-c1).
//
// The contract these cases propose (c2 may rename within its chunk, keeping the cases; no layout or
// wording is pinned beyond what the slices row names):
// - every surface that hedges writes its term as data-conf="<ConfidenceTerm>" (types.ts
//   confidenceTerms) on the line, so the tests compare terms, not words (F1a's contract, kept);
// - Details' "Against your place" is [data-against]; each factor line is [data-factor="<Factor>"] with
//   data-level; the limiting factor comes first; a dispute line is [data-dispute="<DisputeField>"];
//   with the verdict chunk failed the section shows a Reload button;
// - a plant not in the list (an id the release does not list, failed guest list, removed while open) shows the frame
//   with [data-gone] ("No longer in this list") and Back/Close; a details query that fails shows
//   [data-details-failed] with Try again; a borrowed or guest plant's header is [data-from-list], and
//   with no site climate its "give your location to check it" line is [data-no-site];
// - print writes the same dispute and corrected-value lines as Details (core factLines), under
//   [data-print] [data-plant-id] with the same [data-dispute] hooks;
// - Swap's candidate rows are [data-swap-row] (data-plant-id), each with what it also fills
//   [data-swap-fills] and leaves empty [data-swap-leaves], and its fit line [data-conf] or words.
// pf-f commit 0 (chunk 3, v14 boards): PP-C6 and PP-C6b to PP-C6f moved to
// consortium-pf-f.browser.test.mjs (its sweep ledger), rewritten from the v14 boards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aria, has, realDb, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { suggestedAt } from './f1a-helpers.mjs';
import { showPalette } from './seams-helpers.mjs';
import { control, done, frames, loadPalette200, press } from './pf-helpers.mjs';
import { said } from '../consortium-said.mjs';

const core = await import('../../src/lib/consortium/index.ts');

useHarness();

// Borrowed lists: the installed index curates Tropical, Arid, Mediterranean and Temperate, so Nairobi's
// Subtropical (borderline with Tropical) and Oulu's Boreal are placed from the nearest lists.
const OULU = [65.0121, 25.4651]; // Dfc: Boreal, borrowed
const MENDOZA = [-32.8895, -68.8458]; // BWk: dry, at the dry edge of many plants
const DETAILS = 'dialog.ct-sheet[open]';
const NO_AGAINST = /Details: no "Against your place" \(data-against\)/;
const against = async (page, timeout = 6000) => assert.ok(await has(page, `${DETAILS} [data-against]`, timeout), 'Details: no "Against your place" (data-against)');
const termsIn = (page, sel) => page.$$eval(`${sel} [data-conf]`, (els) => [...new Set(els.map((e) => e.dataset.conf))].sort());

const firstMember = (page) => page.evaluate(() => window.__ctTest.store.members.value[0]);
const details = (page, id) => page.evaluate((pid) => window.__ctTest.openSheet('details', pid), id);

// ---- F1a confidence restored (A16) ----

test('F1a-C4 → PP-C (c2 Nairobi borrowed plant, A16): a borrowed plant near the edge shows the same confidence terms on its row, in Details and in print', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical');
  assert.equal(await page.evaluate(() => window.__ctTest.store.curatedClimates.value.includes('Subtropical')), false, 'Subtropical is a borrowed list (the premise)');
  assert.ok(await has(page, '#ct-root [data-conf]', 8000), 'no surface carries a confidence term (data-conf) on the page');
  const id = await page.$eval('#ct-root [data-plant-id]:has([data-conf="estimate"])', (e) => e.dataset.plantId);
  const row = await termsIn(page, `#ct-root [data-plant-id="${id}"]`);
  assert.ok(row.includes('estimate'), 'the row says the placement is an estimate');
  await details(page, id);
  assert.ok(await has(page, `${DETAILS} [data-conf]`, 10_000), 'Details shows its terms');
  assert.deepEqual(await termsIn(page, DETAILS), row, 'Details: the row\'s terms');
  await page.keyboard.press('Escape');
  await page.emulateMediaType('print');
  await has(page, `[data-print] [data-plant-id="${id}"]`, 4000); // the print sheet mounts on print media (Actions PrintHost)
  assert.deepEqual(await termsIn(page, `[data-print] [data-plant-id="${id}"]`), row, 'print: the row\'s terms');
});

test('F1a-C5 → PP-C (c2 Oulu borrowed list, A9 A16): the borrowed list is named once for the palette and every borrowed plant keeps its estimate term', async () => {
  const page = await suggestedAt(OULU, 'Boreal');
  assert.ok(await has(page, '#ct-root [data-conf="estimate"]', 8000), 'no estimate term (data-conf) on the borrowed plants');
  assert.ok(await has(page, '#ct-root [data-borrowed-lists]', 4000), 'one list-level "placed from the … lists" line');
  const unmarked = await page.$$eval('#ct-root .ct-plants [data-plant-id]', (els) => els.filter((e) => !e.querySelector('[data-conf="estimate"]')).map((e) => e.dataset.plantId));
  assert.deepEqual(unmarked, [], 'every borrowed plant keeps its estimate term');
});

test('F1a-C6 → PP-C (c2 verdict chunk refused, Details half, A16 §5): with the verdict chunk refused, Details says "not checked", never a fit', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  const id = await page.evaluate(() => window.__ctTest.store.pools.value.Mediterranean[0].id);
  await details(page, id);
  await against(page);
  assert.ok(await has(page, `${DETAILS} [data-against] [data-conf="not-checked"]`, 4000), 'Details: "not checked"');
  assert.equal(await page.$(`${DETAILS} [data-against] [data-level="fits"]`), null, 'never a fit');
});

// ---- scenarios ----

// pf-f (v14 boards Details, SiteMendoza): the bands keep one order (Coldest nights, Warmth over the
// year, Hottest days, Rain against evaporation); the limiting measure is the band whose status is not
// in range in words (R2: by watering, a dryness note, not a level), its line in numbers, no longer the first line.
test('PP-C5 (c2 Mendoza dry edge; pf-f fixed band order): a plant at the dry edge shows its band, the place\'s value, and the dry band says the limit', async () => {
  const page = await suggestedAt(MENDOZA, 'Arid');
  const id = await page.evaluate(() => [...window.__ctTest.store.memberVerdicts.value.values()].find((v) => v.limiting?.factor === 'dry')?.id ?? null);
  assert.ok(id, 'a member limited by dryness at Mendoza (engine)');
  await details(page, id);
  await against(page);
  const dry = await page.$eval(`${DETAILS} [data-against] [data-measure="aridity"]`, (e) => ({ status: e.querySelector('.ct-bandcard-status')?.textContent.trim(), text: e.textContent, factor: !!e.querySelector('[data-factor="dry"]') })).catch(() => null);
  assert.ok(dry, 'the Rain against evaporation band');
  assert.ok(dry.factor && dry.status && dry.status !== 'In range', `the dry band says the limit in words (${JSON.stringify(dry)})`);
  assert.match(dry.text, /\d/, 'the band and the place\'s value in numbers');
});


// ---- failure states (3.1-3.6) ----

test('PP-C13 (c2 verdict chunk failed, 3.1; fix round 1 A5, A6, A8): "Against your place" says "not checked" with Try again in place; a retry that fails online offers Reload; the palette never goes back to loading; Swap\'s fit lines say "not checked"', async () => {
  // A saved palette (Suggest waits for the verdict rule, so it places nothing with the chunk refused).
  const page = await tool({ block: { verdict: 404 }, hash: await temperateLink() });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the palette\'s plants');
  const id = await firstMember(page);
  await details(page, id);
  await against(page);
  assert.ok(await has(page, `${DETAILS} [data-against] ${aria('button', 'Try again')}`, 2000), 'Try again in the section, first');
  assert.equal(await page.evaluate(() => document.querySelector('[data-against]').textContent.includes('Reload the page')), false, 'no "reload the page" beside Try again');
  await page.click(`${DETAILS} [data-against] ${aria('button', 'Try again')}`);
  assert.ok(await has(page, `${DETAILS} [data-against] ${aria('button', 'Reload')}`, 4000), 'the retry failed online: Reload');
  assert.ok(await page.evaluate(() => window.__ctTest.store.pool.value !== null), 'the palette kept its plants through the retry');
  await page.keyboard.press('Escape');
  await page.evaluate((pid) => window.__ctTest.openSheet('swap', pid), id);
  assert.ok(await has(page, `${DETAILS} [data-swap-row] [data-conf="not-checked"]`, 6000), 'Swap: "not checked"');
});

test('PP-C14 (c2 plant not in the list, 3.2): a removed plant\'s, an unlisted id\'s and a failed guest list\'s Details show the frame with "No longer in this list" and Back/Close, never a blank modal', async () => {
  const gone = async (page, what) => {
    assert.ok(await has(page, `${DETAILS} [data-gone]`, 4000), `no "No longer in this list" (data-gone): ${what}`);
    assert.ok(await has(page, `${DETAILS} .ct-sheet-head button[aria-label]`, 1000), `Close: ${what}`);
  };
  // Removed while open.
  const page = await suggestedAt('lyon', 'Temperate');
  const id = await firstMember(page);
  await details(page, id);
  await page.evaluate((pid) => { const { store } = window.__ctTest; store.members.value = store.members.value.filter((x) => x !== pid); store.pools.value = Object.fromEntries(Object.entries(store.pools.value).map(([z, l]) => [z, l.filter((t) => t.id !== pid)])); }, id);
  await gone(page, 'removed while open');
  // Back closes it and leaves the page where it was (one history entry for the sheet, K7).
  await page.evaluate(() => new Promise((r) => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.back(); }));
  assert.equal(await page.evaluate(() => window.__ctTest.store.sheet.value), null, 'Back closes it');
  assert.equal(await page.evaluate(() => window.__ctTest.store.step.value), 'palette', 'the palette page stays');
  // An id the release does not list (no alias handling: owner 2026-11-17): its Details is the frame.
  await details(page, '00000000-dead-4000-8000-0000000000a1');
  await gone(page, 'an unlisted id');
  await page.keyboard.press('Escape');
  // A guest whose list failed to load (PP-B21: the list named as missing).
  // (as PP-B21: the Mediterranean list's read refused, a Mediterranean-only plant added as a guest).
  const guest = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant NOT IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY 1 LIMIT 1").get()?.id);
  assert.ok(guest, 'a Mediterranean plant');
  await page.evaluate((g) => {
    const { store } = window.__ctTest, src = store.source.value, read = src.pool.bind(src);
    src.pool = (c) => (c === 'Mediterranean' ? Promise.reject(new Error('test: list unreadable')) : read(c));
    store.addMembers([g], { [g]: 'Mediterranean' });
    store.loadPool('Mediterranean');
  }, String(guest));
  await details(page, String(guest));
  await gone(page, 'a failed guest list');
});

test('PP-C15 (c2 details query fails, 3.3): Details says it could not load, with Try again', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const id = await firstMember(page);
  await page.evaluate(() => { const { store } = window.__ctTest; const src = store.source.value; src.details = () => Promise.reject(new Error('test: details query failed')); });
  await details(page, id);
  assert.ok(await has(page, `${DETAILS} [data-details-failed]`, 4000), 'no "could not load" (data-details-failed)');
  assert.ok(await has(page, `${DETAILS} ${aria('button', 'Try again')}`, 1000), 'Try again');
});

test('PP-C16 (c2 borrowed or guest plant, 3.4): Details names the list it comes from, its lines carry "estimate", and without a site climate it says the location is needed to check', async () => {
  const page = await suggestedAt(OULU, 'Boreal');
  await details(page, await firstMember(page));
  assert.ok(await has(page, `${DETAILS} [data-from-list]`, 6000), 'no "From the … list" header (data-from-list)');
  assert.ok(await has(page, `${DETAILS} [data-conf="estimate"]`, 1000), '"estimate" on its lines');
  // The placement's estimate is said once (fix round 3 minor, round 4 V4): in the header, not again in Against.
  // pf-f fix round 1 BC5 (board DetailsMore): Why it is here adds its own sentence, "At your place it is an estimate: placed as on the … list, kept because…".
  // pf-f fix round 1 BC15: the summary's chip in the board's words, "Placed as on the … list: an estimate".
  const said = await page.$eval(DETAILS, (d) => { const c = d.cloneNode(true); c.querySelectorAll('[data-why-borrowed]').forEach((e) => e.remove()); return (c.textContent.match(/Placed as on the \w+ list: an estimate/g) ?? []).length; });
  assert.equal(said, 1, `the placement's estimate said once in Details (${said})`);
  assert.equal(await page.$(`${DETAILS} [data-no-site]`), null, 'with a site climate, no "give your location" line');
  // No location: a borrowed list's plants in the palette (as a shared link brings them; Suggest itself
  // asks for the location first on a borrowed list, PoolSlot NeedsSite); its plant's Details asks for
  // the location.
  const bare = await tool();
  await choose(bare, 'Boreal');
  const plant = await bare.evaluate(async () => { const { store } = window.__ctTest; const t = (await store.loadPool('Boreal'))[0]; store.members.value = [t.id]; return t.id; });
  await details(bare, plant);
  assert.ok(await has(bare, `${DETAILS} [data-from-list]`, 6000), 'the list it comes from');
  assert.match(await bare.$eval(`${DETAILS} [data-no-site]`, (e) => e.textContent).catch(() => ''), /location/i, 'the "gives your location" line: the location is needed to check');
});

// Each disputed plant of the fixture (make-fixture.mjs FIXTURE_DISPUTES, FIXTURE_AUDIENCE): its list,
// the hook its line carries and the words it says.
const DISPUTED = [
  ['Hedera helix', 'Mediterranean', '[data-dispute="toxicity"]', /Sources disagree.*NC State.*Moderate/s],
  ['Castanea sativa', 'Temperate', '[data-dispute="tmin_cold.low"]', /Sources disagree.*TreeGOER/s],
  ['Castanea sativa', 'Temperate', '[data-dispute="tmean_year.low"]', /TreeGOER/],
  ['Pyrus communis', 'Temperate', '[data-dispute="toxicity"]', /Toxicity not recorded; PFAF names a hazard/],
  ['Corylus avellana', 'Temperate', '[data-dispute="toxicity"]', /Sources disagree: PFAF names a hazard, no level given/],
  ['Olea europaea', 'Mediterranean', '[data-dispute="plant_invasive"]', /Sources disagree/],
  ['Rubus idaeus', 'Temperate', '[data-dispute="weed_potential"]', /Sources disagree/],
  ['Sambucus nigra', 'Temperate', '[data-dispute="allelopathic"]', /Sources disagree/],
  ['Malus domestica', 'Temperate', '[data-audience="pets"]', /toxic to pets \(ASPCA\), no level given/i], // a table value starts with a capital (pf-f fix round 1 BC5)
  ['Taxus baccata', 'Temperate', '[data-audience="livestock"]', /livestock/i],
];
test('PP-C17 (c2 disputes on one plant, 3.5): Hedera helix keeps its Slight chip and names NC State\'s Moderate under "Sources disagree"; each disputed plant of the fixture shows its line, in Details and on paper', async () => {
  const page = await tool({ data: 'fixture' });
  for (const [name, zone, hook, words] of DISPUTED) {
    await choose(page, zone);
    const id = await page.evaluate(async ([n, z]) => (await window.__ctTest.store.loadPool(z)).find((t) => t.canonical_name === n)?.id ?? null, [name, zone]);
    assert.ok(id, `the fixture holds ${name} on the ${zone} list`);
    await details(page, id);
    await against(page);
    await has(page, `${DETAILS} ${hook}`, 4000); // the facts arrive with the details query, after the frame
    const line = await page.$eval(`${DETAILS} ${hook}`, (e) => e.textContent).catch(() => '');
    assert.match(line, words, `${name}: ${hook}`);
    if (name === 'Hedera helix') assert.match(await page.$eval(`${DETAILS} .ct-flag`, (e) => e.textContent).catch(() => ''), /Mildly toxic/i, 'Hedera keeps its Slight chip');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  }
  // On paper as in Details (ledger "Schema 4" Q3): Hedera in a palette, printed.
  await choose(page, 'Mediterranean');
  await page.evaluate(async () => { const { store } = window.__ctTest; const h = (await store.loadPool('Mediterranean')).find((t) => t.canonical_name === 'Hedera helix'); store.members.value = [...store.members.value, h.id]; });
  await showPalette(page); // the print sheet belongs to the palette page (Actions)
  await page.emulateMediaType('print');
  await has(page, '[data-print] [data-dispute="toxicity"]', 4000); // print reads each plant's facts from the details query
  assert.match(await page.$eval('[data-print] [data-dispute="toxicity"]', (e) => e.textContent).catch(() => ''), /Sources disagree.*NC State/s, 'print: the dispute line');
});

// 3.6, the race (review c0 round 2, 4d): Correction (sheets role) is asked on plant a while its chunk
// is held; the grower closes it and opens plant b's Details; then a's chunk fails. It holds today (a
// plain test, 2026-11-17): lazy.tsx's LazyView drops a failure once its mount is gone (`live`), so the
// late failure never runs closeSheet on b's sheet. c2 keeps it green when it reworks Details.
test('PP-C18 (c2 newer sheet stays, 3.6): ask Correction on one plant while its chunk is held, close, open another plant, let the chunk fail: the newer sheet stays', async () => {
  const page = await suggestedAt('lyon', 'Temperate', { block: { sheets: 'hold' } });
  const [a, b] = await page.evaluate(() => window.__ctTest.store.members.value.slice(0, 2));
  await details(page, a);
  assert.ok(await has(page, DETAILS, 6000), 'Details of the first plant');
  // pf-f (board DetailsMore): Suggest a correction ends the Names section.
  await page.evaluate(() => { const d = document.querySelector('dialog.ct-sheet[open] details[data-more="names"]'); if (d) d.open = true; });
  const asked = await page.locator(aria('button', 'Suggest a correction')).click().then(() => true, () => false);
  assert.ok(asked, 'Suggest a correction pressed');
  // The form is a part of the Details sheet (Details.tsx `correction`, role sheets), not a sheet kind:
  // asked means its chunk was requested and is held.
  for (let i = 0; i < 40 && page.held.length === 0; i++) await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
  assert.ok(page.held.length > 0, 'the Correction chunk is asked for the first plant and held');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await details(page, b);
  assert.ok(await has(page, DETAILS, 6000), 'Details of the second plant');
  await page.failHeld();
  await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  assert.deepEqual(await page.evaluate(() => { const s = window.__ctTest.store.sheet.value; return s && [s.kind, s.id]; }), ['details', b], 'the newer sheet stays');
});

// Schema 4.3 invasive scope in Details (coordinator 2026-11-17: the display is c2's; fixture: Tropaeolum
// majus carries the note's Arundo donax pattern in ES). The reader's country Spain: one line per source
// with its areas, [data-invasive-scope="<source>"].
test('PP-C21 (c2 invasive scope, 3.5 / schema 4.3): with Spain as the country, Tropaeolum majus\'s Details names the catálogo for the Canary Islands and the MITECO atlas for the Balearic Islands and mainland Spain, one line each', async () => {
  // On the phone: the desk leaves the Warnings section out (pf-f fix round 1 BC12, board DetailsDesk).
  const page = await tool({ data: 'fixture', width: 390 });
  await choose(page, 'Temperate');
  await page.evaluate(() => { window.__ctTest.store.country.value = { code: 'ES', source: 'chosen' }; });
  const id = await page.evaluate(async () => (await window.__ctTest.store.loadPool('Temperate')).find((t) => t.canonical_name === 'Tropaeolum majus')?.id ?? null);
  assert.ok(id, 'the fixture holds Tropaeolum majus on the Temperate list');
  await details(page, id);
  assert.ok(await has(page, `${DETAILS} [data-invasive-scope]`, 6000), 'no per-source invasive line ([data-invasive-scope])');
  const catalogo = await page.$eval(`${DETAILS} [data-invasive-scope="es_catalogo"]`, (e) => e.textContent).catch(() => '');
  const atlas = await page.$eval(`${DETAILS} [data-invasive-scope="atlas_aloctonas_es"]`, (e) => e.textContent).catch(() => '');
  assert.match(catalogo, /Canar/i);
  assert.ok(/Balear/i.test(atlas) && /mainland Spain/i.test(atlas) && /MITECO/.test(atlas), `the atlas line ("${atlas}")`);
  assert.doesNotMatch(atlas, /regulated|legal/i, 'an atlas row is never a legal listing');
});





// ---- fix round 2 (the boards, as the grower reads and does) ----




// ---- h3 G4 batch 2 (chunk 3 hand-off triage M44 to M47; Many plants, boards Many, ManyDesk, Toasts) ----

const PLANTS = '#ct-root .ct-plants';
const typeIn = (page, sel, v) => page.$eval(sel, (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const toastOf = (page) => page.evaluate(() => window.__ctTest?.store?.toast.value?.text ?? '');
// Tick one plant of the 200 as a grower does: search its name, tick its row, clear the search.
async function tickByName(page, id) {
  const sci = await page.evaluate((pid) => window.__ctTest.store.taxonOf(pid).canonical_name, id);
  const box = await page.$eval(`${PLANTS} input[type="search"], #ct-root input[aria-label^="Search your"]`, (e) => e.getAttribute('aria-label'));
  await typeIn(page, `#ct-root input[aria-label="${box}"]`, sci);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${id}"] input[type="checkbox"]`, 3000), `the search shows ${sci}`);
  await page.$eval(`${PLANTS} [data-plant-id="${id}"] input[type="checkbox"]`, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click(`${PLANTS} [data-plant-id="${id}"] input[type="checkbox"]`);
  await typeIn(page, `#ct-root input[aria-label="${box}"]`, '');
}

test('PP-C44 (c2 h3 M44, pf-e BC22, Many\'s bulk Remove): removing the plant that held a job up to the goal names the new thin spot after "No new hole."', async () => {
  const page = await loadPalette200({ width: 390 });
  // The engine on the installed release: the first member whose removal opens no hole and leaves one
  // job held by fewer plants than "Plants per job" over a stretch where it was not thin.
  const state = await page.evaluate(() => { const s = window.__ctTest.store; return { taxa: s.memberTaxa.value, verdicts: [...s.memberVerdicts.value], goals: s.paletteGoals.value }; });
  const verdicts = new Map(state.verdicts);
  const at = (taxa) => { const ctx = { members: taxa, verdicts, pending: false }; return { holes: core.holes(ctx), thins: core.thinTargets(core.laneCounts(ctx, state.goals)) }; };
  const before = at(state.taxa);
  let pick = null;
  for (const t of state.taxa) {
    const after = at(state.taxa.filter((x) => x.id !== t.id));
    const hc = core.holeChange(before.holes, after.holes);
    const added = core.thinChange(before.thins, after.thins).added;
    if (!hc.added.length && added.length) { pick = { id: t.id, hc, thins: { added, ended: [], still: [] } }; break; }
  }
  assert.ok(pick, 'the premise: a member whose removal leaves a new thin spot and no new hole');
  const want = core.holeChangeLines(pick.hc, { left: false, thins: pick.thins }).map((l) => said(l, 'en'));
  assert.ok(want.length >= 2 && want[0] === 'No new hole.', `the engine's words (${want.join(' ')})`);
  await tickByName(page, pick.id);
  await press(page, 'button', 'Remove 1 plant');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 199, { timeout: 4000 }).then(() => true, () => false), 'Remove takes it out');
  const text = await toastOf(page);
  assert.ok(text.startsWith('1 plant removed. 199 plants. '), `the count first (${text})`);
  assert.ok(text.endsWith(want.join(' ')), `the toast names the new thin spot after "No new hole." (${text}; want ${want.join(' ')})`);
  await done(page);
});

test('PP-C45 (c2 h3 M45, pf-e BC21, board Toasts, word map "A pasted list added"): a pasted list with a warned plant says one wording, "N plants added. Your palette: M plants.", with Show, then Undo', async () => {
  const page = await loadPalette200({ width: 390 });
  // Two plants with no warning and one whose flags ask a second look (the engine's warnedPlant), taken
  // out, then pasted back by name.
  const names = await page.evaluate(() => {
    const s = window.__ctTest.store, taxa = s.memberTaxa.value;
    const warned = taxa.find((t) => s.warnedPlant(t)), plain = taxa.filter((t) => !s.warnedPlant(t)).slice(0, 2);
    if (!warned) return null;
    const out = [warned, ...plain];
    s.members.value = s.members.value.filter((id) => !out.some((t) => t.id === id));
    return out.map((t) => t.canonical_name);
  });
  assert.ok(names, 'the premise: a warned plant among the 200');
  const { pasteText } = await import('./pf-e-helpers.mjs');
  await pasteText(page, names.join('\n'));
  await press(page, 'button', 'Add 3 plants', 15_000);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 200, { timeout: 8000 }).then(() => true, () => false), 'the 3 added');
  assert.equal(await toastOf(page), '3 plants added. Your palette: 200 plants.', 'board Toasts: one wording, no warned clause');
  await frames(page);
  const buttons = await page.$$eval('.ct-toast button:not(.ct-toast-dismiss)', (bs) => bs.map((b) => b.textContent.trim()));
  assert.deepEqual(buttons, ['Show', 'Undo'], 'board Toasts: Show, then Undo');
  // h3 R5: only Undo carries ct-toast-undo, the class the focus moves look for; Show has its own.
  assert.deepEqual(await page.$$eval('.ct-toast .ct-toast-undo', (bs) => bs.map((b) => b.textContent.trim())), ['Undo'], 'the focus\'s Undo is Undo');
  assert.equal(await page.$$eval('.ct-toast .ct-toast-action', (bs) => bs.length), 1, 'Show has its own class');
  // h3 R6: Show is named for the warned plant's warning, starting with its visible word (WCAG 2.4.6, 2.5.3).
  const showName = await page.$eval('.ct-toast .ct-toast-action', (b) => b.getAttribute('aria-label'));
  const warned = await page.evaluate((sci) => { const t = window.__ctTest.store.memberTaxa.value.find((x) => x.canonical_name === sci); return t.common_name ?? t.canonical_name; }, names[0]);
  assert.match(showName, /^Show the warning for /, `Show names the warning (${showName})`);
  assert.ok(showName.length > 'Show the warning for '.length, `and the plant (${showName}; ${warned})`);
  await done(page);
});

// A member's Many row opened by its name (the search shows the matching rows), and its fit words.
async function manyRow(page, id) {
  const sci = await page.evaluate((pid) => window.__ctTest.store.taxonOf(pid).canonical_name, id);
  const box = await page.$eval('#ct-root input[aria-label^="Search your"]', (e) => e.getAttribute('aria-label'));
  await typeIn(page, `#ct-root input[aria-label="${box}"]`, sci);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${id}"]`, 3000), `the search shows ${sci}`);
  await frames(page);
  return page.$eval(`${PLANTS} [data-plant-id="${id}"]`, (r) => [...r.querySelectorAll('.ct-many-word')].map((w) => {
    const probe = document.createElement('span');
    probe.style.color = w.dataset.level === 'danger' ? 'var(--danger)' : 'var(--warning)';
    w.parentElement.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    const cs = getComputedStyle(w);
    return { text: w.textContent.replace(/\s+/g, ' ').trim(), kind: w.dataset.kind ?? null, level: w.dataset.level, color: cs.color, want, border: cs.borderTopStyle === 'none' || parseFloat(cs.borderTopWidth) === 0 ? 'none' : cs.borderTopStyle, weight: cs.fontWeight, size: cs.fontSize };
  }));
}

for (const width of [390, 1280]) {
  test(`PP-C46 (c2 h3 M46, pf-e BC7, board ${width === 390 ? 'Many' : 'ManyDesk'} at ${width}): a row outside its range says its cause short, "${width === 390 ? 'Outside its climate range: the year too cool' : 'the year too cool'}", from the engine`, async () => {
    const page = await loadPalette200({ width });
    // The engine on the installed release: the members outside their range with a cause.
    const outs = await page.evaluate(() => { const s = window.__ctTest.store; return [...s.memberVerdicts.value].filter(([, v]) => v.level === 'outside' && v.limiting).map(([id, v]) => ({ id, v })); });
    const pick = outs.find((o) => core.shortWhy(o.v));
    assert.ok(pick, `the premise: a member outside its range with a cause (${outs.length} outside)`);
    const want = said(width === 390 ? core.shortLine(pick.v) : core.shortWhy(pick.v), 'en');
    const words = await manyRow(page, pick.id);
    assert.ok(words.some((w) => w.text === want), `the row says "${want}" (${JSON.stringify(words.map((w) => w.text))})`);
    assert.ok(!words.some((w) => / here than where it is recorded/.test(w.text)), 'never the cause in full');
    await done(page);
  });
}

test('PP-C47 (c2 h3 M47, pf-e#57, boards Many and ManyDesk): on the 200-plant Kenya palette a "Toxic" mark is a plain word in the warning colour, "Very toxic" in the danger colour, 13 px weight 600 with the icon, no pill border', async () => {
  const page = await loadPalette200({ width: 390 });
  const tox = await page.evaluate(() => { const s = window.__ctTest.store, by = (lv) => s.memberTaxa.value.find((t) => t.warnings.toxicity?.level === lv && s.flagsOfPlant(t).some((f) => f.kind === 'toxicity'))?.id ?? null; return { Moderate: by('Moderate'), Severe: by('Severe') }; });
  assert.ok(tox.Moderate, 'the premise: a Toxic (Moderate) member');
  for (const [lv, word, level] of [['Moderate', 'Toxic', 'warning'], ['Severe', 'Very toxic', 'danger']]) {
    if (!tox[lv]) continue;
    const mark = (await manyRow(page, tox[lv])).find((w) => w.kind === 'toxicity');
    assert.ok(mark, `${word}: a toxicity word on the row`);
    assert.equal(mark.text, word);
    assert.equal(mark.level, level, `${word}: the ${level} level`);
    assert.equal(mark.color, mark.want, `${word}: the --${level} colour`);
    assert.equal(mark.border, 'none', `${word}: a plain word, no pill border`);
    assert.equal(mark.weight, '600');
    assert.equal(mark.size, '13px');
  }
  await done(page);
});

// h3 R14 (axe label-content-name-mismatch, WCAG 2.5.3): a Your plants row's button is named by the words
// it shows, so a voice user who says "click Chives" presses it. The button holds the plant's name; its
// scientific name and detail lines follow it in the row as its description, and the whole row still opens Details.
test('PP-C48 (c2 h3 R14, pf-e Small rows): each row button\'s accessible name is its visible text; its lines describe it; a tap on a line opens Details', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  const BTN = '#ct-root .ct-plants-small [data-plant-id] button';
  assert.ok(await has(page, BTN, 8000), 'the premise: Your plants in its small form');
  const rows = await page.$$(BTN);
  assert.ok(rows.length > 0);
  for (const b of rows) {
    const text = await b.evaluate((e) => e.textContent.replace(/\s+/g, ' ').trim());
    const ax = await page.accessibility.snapshot({ root: b, interestingOnly: false });
    assert.equal(ax?.name, text, `the button's name is its text ("${text}")`);
    assert.ok(ax?.description && /\S/.test(ax.description), `the lines describe it (${ax?.description})`);
  }
  const id = await rows[0].evaluate((e) => e.closest('[data-plant-id]').dataset.plantId);
  const line = `#ct-root .ct-plants-small [data-plant-id="${id}"] .ct-line`;
  await page.$eval(line, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click(line);
  assert.ok(await has(page, DETAILS, 4000), 'a tap on a detail line opens Details');
  await done(page);
});

// h3 R2: past 40 plants on the desk, Find opened from Your plants stands in place of the table; a
// result's Details opens over it and "Back to results" brings the panel back where it was, not beside
// the chart (the panel stays open under Details: store.sheets).
test('PP-C49 (c2 h3 R2, ManyDesk): Find opened in Your plants keeps its place through a result\'s Details and "Back to results"', async () => {
  const { PLANTS, typeIn } = await import('./pf-e-helpers.mjs');
  const page = await loadPalette200({ width: 1280 });
  assert.ok(await has(page, `${PLANTS} [data-plants-add]`, 4000), 'Your plants\' "Add plants"');
  await page.click(`${PLANTS} [data-plants-add]`);
  assert.ok(await has(page, `${PLANTS} .ct-find`, 15_000), 'Find in place of the table');
  const pick = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); const t = Object.values(s.pools.value).flat().find((x) => x && !m.has(x.id)); return { id: t.id, q: t.canonical_name }; });
  await typeIn(page, `${PLANTS} [data-find-search]`, pick.q);
  const row = `${PLANTS} [data-find-row][data-plant-id="${pick.id}"]`;
  assert.ok(await has(page, row, 10_000), 'the search lists the plant');
  await page.click(`${row} [data-find-open]`);
  assert.ok(await has(page, 'dialog.ct-details[open] [data-sheet-back]', 8000), 'Details with "Back to results"');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 1000), 'Find stays in Your plants under Details');
  await page.click('dialog.ct-details[open] [data-sheet-back]');
  assert.ok(await page.waitForFunction(() => !document.querySelector('dialog.ct-details[open]'), { timeout: 4000 }).then(() => true, () => false), 'Details closed');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 2000), 'Find back in place of the table');
  assert.equal(await page.$(`${PLANTS} table`), null, 'the table not back');
  assert.equal(await page.$$eval('[data-find-panel]', (ps) => ps.length), 1, 'one Find panel, not one beside the chart');
  assert.equal(await page.$eval(`${PLANTS} [data-find-search]`, (i) => i.value), pick.q, 'the search kept');
  assert.equal(await page.evaluate((id) => document.activeElement?.closest('[data-plant-id]')?.dataset.plantId ?? null, pick.id), pick.id, 'the focus back on the row\'s name');
  await press(page, 'button', 'Done');
  assert.ok(await has(page, `${PLANTS} table`, 3000), 'Done brings the table back');
  await done(page);
});
