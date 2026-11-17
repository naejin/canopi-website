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

test('PP-C5 (c2 Mendoza dry edge): a plant at the dry edge shows its band, the place\'s value and the limiting measure first', async () => {
  const page = await suggestedAt(MENDOZA, 'Arid');
  const id = await page.evaluate(() => [...window.__ctTest.store.memberVerdicts.value.values()].find((v) => v.limiting?.factor === 'dry')?.id ?? window.__ctTest.store.members.value[0]);
  await details(page, id);
  await against(page);
  const first = await page.$eval(`${DETAILS} [data-against] [data-factor]`, (e) => ({ factor: e.dataset.factor, text: e.textContent })).catch(() => null);
  assert.equal(first?.factor, 'dry', 'the limiting measure first');
  assert.match(first.text, /\d/, 'the band and the place\'s value in numbers');
});

test('PP-C6 (c2 Swap; fix round 2 K12): Swap says what each candidate fills and leaves empty, or that no gap changes, never both "none" lines, with its fit line', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.evaluate((id) => window.__ctTest.openSheet('swap', id), await firstMember(page));
  assert.ok(await has(page, `${DETAILS} [data-swap-row]`, 6000), 'Swap: no candidate rows (data-swap-row)');
  const rows = await page.$$eval(`${DETAILS} [data-swap-row]`, (els) => els.map((e) => ({ fills: !!e.querySelector('[data-swap-fills]'), leaves: !!e.querySelector('[data-swap-leaves]'), same: !!e.querySelector('[data-swap-gaps-same]'), fit: /\S/.test(e.querySelector('[data-conf], .ct-fit')?.textContent ?? '') })));
  assert.ok(rows.every((r) => (r.fills || r.leaves) !== r.same && r.fit), JSON.stringify(rows));
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
  // The placement's estimate is said once (fix round 3 minor, round 4 V4): in the header, not again in Why it is here or Against.
  const said = await page.$eval(DETAILS, (d) => (d.textContent.match(/estimate: placed as on the/g) ?? []).length);
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
  ['Malus domestica', 'Temperate', '[data-audience="pets"]', /toxic to pets \(ASPCA\), no level given/],
  ['Taxus baccata', 'Temperate', '[data-audience="livestock"]', /livestock/],
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
  const page = await tool({ data: 'fixture' });
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


// Fix round 1 C10, C14 and the phone foot (owner 2026-11-17: as the boards): Swap fits at 320 px with
// its header and Keep/Remove foot; Details of a plant not in the palette offers "Add to my palette" in
// its sticky foot; from 960 px Details is two columns with Against on the right.
test('PP-C6b (c2 boards, fix round 1 C10 C14): Swap at 320 px scrolls nothing sideways; Details adds from its foot; two columns from 960 px', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical');
  const id = await firstMember(page);
  await page.setViewport({ width: 320, height: 700 });
  await page.evaluate((pid) => window.__ctTest.openSheet('swap', pid), id);
  assert.ok(await has(page, `${DETAILS} [data-swap-head]`, 10_000), 'Swap\'s header');
  await page.waitForFunction(() => document.querySelector('dialog.ct-sheet[open] [data-swap-row]'), { timeout: 10_000 });
  const sw = await page.$eval(DETAILS, (d) => [d.scrollWidth, d.clientWidth]);
  assert.equal(sw[0], sw[1], 'Swap at 320 px: nothing sideways');
  assert.ok(await has(page, `${DETAILS} .ct-swap-foot ${aria('button', 'Remove it')}`, 1000), 'the foot removes it');
  const other = await page.evaluate(() => { const { store } = window.__ctTest; return store.pool.value.find((t) => !store.members.value.includes(t.id)).id; });
  await page.evaluate((pid) => window.__ctTest.openSheet('details', pid), other);
  assert.ok(await has(page, `${DETAILS} .ct-d-foot ${aria('button', 'Add to my palette')}`, 6000), 'the foot adds it');
  await page.click(`${DETAILS} .ct-d-foot [data-add]`);
  assert.ok(await page.waitForFunction((pid) => window.__ctTest.store.members.value.includes(pid), { timeout: 4000 }, other).then(() => true, () => false), 'added');
  await page.setViewport({ width: 1280, height: 1000 });
  await page.evaluate((pid) => window.__ctTest.openSheet('details', pid), id);
  await against(page);
  const cols = await page.evaluate(() => { const d = document.querySelector('dialog.ct-sheet[open]'); const a = d.querySelector('[data-against]').getBoundingClientRect(), s = d.querySelector('[data-summary]').getBoundingClientRect(); return { right: a.left > s.right - 1, width: d.getBoundingClientRect().width }; });
  assert.ok(cols.right && cols.width > 900, `two columns, Against on the right (${JSON.stringify(cols)})`);
  assert.ok(await has(page, `${DETAILS} [data-cando] ${aria('button', 'Find one that holds')}`, 1000), 'What you can do');
});

// Fix round 4 V5 (Chrome N1): a conflict pill in the summary card says it as the board, in a few words
// ("With Olive: a shared pest or disease (Xylella)"; the long advice stays in With your other plants),
// and every pill wraps inside the card: nothing sideways at 390 px, no pill past the card on the desk.
test('PP-C6f (c2 fix round 4 V5): Seville, Almond beside Olive: the summary\'s conflict pill is short and wraps inside the card at 390 and 1280 px', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  const almond = await page.evaluate(() => {
    const { store } = window.__ctTest;
    const by = (n) => store.pool.value.find((t) => t.canonical_name === n)?.id;
    const ids = [by('Prunus dulcis'), by('Olea europaea')];
    store.members.value = [...new Set([...store.members.value, ...ids.filter(Boolean)])];
    return ids[0] ?? null;
  });
  assert.ok(almond, 'Prunus dulcis on the Mediterranean list');
  for (const width of [390, 1280]) {
    await page.setViewport({ width, height: 900 });
    await details(page, almond);
    assert.ok(await has(page, `${DETAILS} [data-summary] [data-chip="conflict"]`, 6000), `${width}: a conflict pill in the summary`);
    const pills = await page.$$eval(`${DETAILS} [data-summary] .ct-marks > li`, (els) => els.map((e) => { const r = e.getBoundingClientRect(), c = e.closest('[data-summary]').getBoundingClientRect(); return { text: e.textContent.trim(), chip: e.dataset.chip, inside: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 }; }));
    for (const p of pills) assert.ok(p.inside, `${width}: "${p.text}" inside the card`);
    const conflict = pills.find((p) => p.chip === 'conflict').text;
    assert.match(conflict, /^With Olive: (a shared pest or disease|one hosts the other’s pest or disease|one can hold back the other’s growth)( \(.+\))?$/, `${width}: the board's few words ("${conflict}")`);
    const sw = await page.$eval(DETAILS, (d) => [d.scrollWidth, d.clientWidth]);
    assert.equal(sw[0], sw[1], `${width}: nothing sideways`);
    const long = await page.$eval(`${DETAILS} [data-more="pairs"] [data-conflict]`, (e) => e.textContent.trim()).catch(() => '');
    assert.ok(long.startsWith('With Olive:') && long.length > conflict.length, `the long words in With your other plants ("${long}")`);
  }
});

// ---- fix round 2 (the boards, as the grower reads and does) ----

// K2, K5, K8, K16, R5, round 3 T3 T6: one band per measure, each with its name and its status in words;
// a band numbers exactly the ends core's bandsOf gives that measure (the ends the rule checks), at two
// decimals at most; the recorded range is drawn from its recorded ends, so the place's dot sits outside
// it exactly when the place is past them; nothing scrolls sideways at 320 px; the key says the marks.
test('PP-C6c (c2 fix round 2 K2 K8 K16 R5, round 3 T3 T6): Details draws one band per measure, each named with its status in words, numbering the ends core gives it, the place outside the drawn range only when past it; the key in words; nothing sideways at 320 px', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await page.setViewport({ width: 320, height: 700 });
  // A member with a soil pH range, so its soil card shows too.
  const id = await page.evaluate(() => { const { store } = window.__ctTest; return (store.memberTaxa.value.find((t) => t.traits.soil_ph?.min != null) ?? store.memberTaxa.value[0]).id; });
  await details(page, id);
  await against(page);
  assert.ok(await has(page, `${DETAILS} [data-against] [data-measure]`, 6000), 'no band ([data-measure])');
  // Where each mark is drawn, as the browser lays it out (getBBox): the recorded range (its dashed
  // disputed stretch included) and the place's dot.
  const bands = await page.$$eval(`${DETAILS} [data-against] [data-measure]`, (els) => els.filter((e) => e.offsetParent).map((e) => {
    const box = (el) => (el ? el.getBBox() : null);
    const rect = box(e.querySelector('.ct-bd-range')), dashed = box(e.querySelector('[data-disputed]')), dot = box(e.querySelector('.ct-bd-now-dot'));
    const x0 = Math.min(rect.x, dashed ? dashed.x : Infinity);
    return { m: e.dataset.measure, title: e.querySelector('.ct-bandcard-head b')?.textContent.trim(), status: e.querySelector('.ct-bandcard-status')?.textContent.trim(), nums: [...e.querySelectorAll('.ct-bd-num text')].map((t) => t.textContent), x0, x1: rect.x + rect.width, dot: dot ? dot.x + dot.width / 2 : null, range: e.querySelector('[data-band-range]')?.textContent.trim() ?? null };
  }));
  // The soil card names where its range comes from (the trait's corrected-value source, else the catalogue).
  const soil = bands.find((b) => b.m === 'soilPh');
  assert.ok(soil, 'the soil card of a plant with a soil pH range');
  assert.match(soil.range, /^The soil pH range sources give for it \(.+\)\.$/, `the soil card's source line ("${soil.range}")`);
  const core = await page.evaluate((pid) => {
    const { store, bandsOf } = window.__ctTest;
    const t = store.taxonOf(pid), v = store.memberVerdicts.value.get(pid);
    return Object.fromEntries(bandsOf(v, store.laterVerdictOf(t, v), t.climate).map((b) => [b.measure, b]));
  }, id);
  assert.equal(new Set(bands.map((b) => b.m)).size, bands.length, `one band per measure (${bands.map((b) => b.m)})`);
  const num = (s) => Number(s.replace('\u2212', '-').replace('?', ''));
  let checked = 0;
  for (const b of bands) {
    assert.ok(b.title && b.status, `band ${b.m}: its name and status in words`);
    assert.ok(b.nums.every((n) => !/[.,]\d{3}/.test(n)), `band ${b.m}: two decimals at most (${b.nums})`);
    const c = core[b.m];
    if (!c) continue; // the soil card (soilBandOf)
    checked++;
    assert.deepEqual(b.nums.map(num), [c.low, c.high].filter((x) => x !== null).map((x) => Math.round(x * 100) / 100), `band ${b.m}: the ends core gives (${b.nums})`);
    if (b.dot !== null) {
      assert.equal(b.dot < b.x0 - 0.5, c.place < c.recordedLow, `band ${b.m}: the dot left of the drawn range only when the place is below its recorded low (${c.place} vs ${c.recordedLow})`);
      assert.equal(b.dot > b.x1 + 0.5, c.place > c.recordedHigh, `band ${b.m}: the dot right of the drawn range only when the place is above its recorded high (${c.place} vs ${c.recordedHigh})`);
    }
  }
  assert.ok(checked > 0, 'a climate band compared with core');
  assert.match(await page.$eval(`${DETAILS} [data-band-key]`, (e) => e.textContent), /where it is recorded growing.*your place today.*not a firm limit/s);
  const sw = await page.$eval(DETAILS, (d) => [d.scrollWidth, d.clientWidth]);
  assert.equal(sw[0], sw[1], 'Details at 320 px: nothing sideways');
});

// R4, K15: on a phone the reading order is the page order (summary, Against, What you can do), and a
// member's two actions stay in the sticky foot; the desk keeps them in What you can do.
test('PP-C6d (c2 fix round 2 R4 K15, round 3 T15): on a phone the DOM order is the visual order and the foot holds Find one that holds; on the desk What you can do does', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.setViewport({ width: 390, height: 800 });
  await details(page, await firstMember(page));
  await against(page);
  const order = await page.evaluate(() => [...document.querySelectorAll('dialog.ct-sheet[open] :is([data-summary], [data-against], [data-cando])')].map((e) => [e.matches('[data-summary]') ? 'summary' : e.matches('[data-against]') ? 'against' : 'cando', e.getBoundingClientRect().top]));
  assert.deepEqual(order.map((x) => x[0]), ['summary', 'against', 'cando'], 'the DOM order');
  assert.ok(order.every((x, i) => i === 0 || x[1] > order[i - 1][1]), `the visual order is the DOM order (${JSON.stringify(order)})`);
  assert.ok(await has(page, `${DETAILS} .ct-sheet-foot ${aria('button', 'Find one that holds')}`, 1000), 'the phone foot holds Find one that holds');
  await page.setViewport({ width: 1280, height: 1000 });
  assert.ok(await has(page, `${DETAILS} [data-cando] ${aria('button', 'Find one that holds')}`, 2000), 'the desk: in What you can do');
  assert.equal(await page.$eval(`${DETAILS} .ct-d-foot-member`, (e) => e.offsetParent === null), true, 'the desk: no member foot');
  // Round 3 T15 (N3): at 960 px Find, Keep and Remove share one row; the heading that takes focus on
  // open shows no ring.
  await page.setViewport({ width: 960, height: 900 });
  const boxes = await page.$$eval(`${DETAILS} .ct-d-cando-actions > *`, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }));
  assert.ok(Math.max(...boxes.map((b) => b[0])) < Math.min(...boxes.map((b) => b[1])), `one row at 960 px (${JSON.stringify(boxes)})`);
  const ring = await page.evaluate(() => { const h = document.querySelector('dialog.ct-sheet[open] #ct-d-title'); h.focus(); return getComputedStyle(h).outlineStyle; });
  assert.equal(ring, 'none', 'no focus ring on the focused heading');
});

// K14, K19 and the board's Correction order (fix round 1 C15): "Tell us the name you use" opens the
// form on this language's name; sending it empty says what needs a look in a box with its icon,
// above Cancel, then Send.
test('PP-C6e (c2 fix round 2 K14 K19, C15): the name link opens the form on the name; an empty send says what needs a look above Cancel, then Send', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const id = await page.evaluate(() => { const { store } = window.__ctTest; return store.members.value.find((m) => Object.values(store.taxonOf(m).names).filter(Boolean).length < 11) ?? null; });
  assert.ok(id, 'a member with a language missing a name');
  await page.setViewport({ width: 390, height: 800 });
  await details(page, id);
  await page.evaluate(() => document.querySelector('dialog.ct-sheet[open] details[data-more="names"]')?.setAttribute('open', ''));
  await page.$eval(`${DETAILS} [data-tell-name]`, (e) => e.click());
  await page.waitForSelector(`${DETAILS} #ct-corr-field`, { timeout: 6000 });
  assert.equal(await page.$eval(`${DETAILS} #ct-corr-field`, (e) => e.value), 'names.en', 'the form opens on the English name');
  assert.match(await page.$eval(`${DETAILS} .ct-corr`, (e) => e.querySelector('p').textContent), new RegExp(await page.$eval('#ct-d-title', (e) => e.textContent)), 'the form names the plant');
  await page.click(`${DETAILS} .ct-corr button[type="submit"]`);
  const box = await page.waitForSelector(`${DETAILS} .ct-corr-status.is-error`, { timeout: 3000 });
  assert.ok(await box.$('svg'), 'the summary has its icon');
  assert.match(await box.evaluate((e) => e.textContent), /need a look.*Tick this box/s, 'what needs a look, in words');
  const buttons = await page.$$eval(`${DETAILS} .ct-corr .ct-actions button`, (els) => els.map((e) => e.textContent.trim()));
  assert.deepEqual(buttons, ['Cancel', 'Send suggestion'], 'Cancel, then Send');
  assert.ok(await page.$eval(`${DETAILS} .ct-corr`, (f) => !!(f.querySelector('.ct-corr-status').compareDocumentPosition(f.querySelector('.ct-actions')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'the summary above the buttons');
});
