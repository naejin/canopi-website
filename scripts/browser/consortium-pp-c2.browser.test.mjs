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



