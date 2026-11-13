// E6 stream R4's user paths (design check §4.1 L8, L9; A11), written failing in commit 0: marked
// expected-fail (scripts/expect-fail.mjs failing()) with the owner in the title; R4 removes each
// marker in the commit that makes it pass. Its own file so R4 and B4 (consortium-e6, E6-2) never edit
// one file in chunk 4 (scripts/plan/e6-owners.json). Run capped: npm run test:browser.
//
// Files each pass needs: src/lib/consortium/{suggest,index}.ts (the barrel stops re-exporting
// suggest/alternatives), a core loadSuggest() (role `suggest`, scripts/built-modules.mjs
// LAZY_ENTRIES), views/Swap.tsx (alternatives through it, a loading line), store.ts (Suggest through
// it, pendingSuggest cleared on failure).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadState } from './harness.mjs';
import { aria, en, fixtureDb, h, has, useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { ctx, taxon } from '../consortium-p5-fixtures.mjs';

const core = await import('../../src/lib/consortium/index.ts');
const { rangeMarks } = await import('../../src/lib/consortium/range-marks.ts');
const { openBytes } = await import('../../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../../src/islands/consortium/data/sqlite-source.ts');

// ---- ADR-6 seams in node (R4 owns no node test file this chunk, so they run here, before the browser) ----

const fixtureDir = new URL('../fixtures/consortium-v2/export/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureDir), 'utf8'));
const fixture = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(manifest.files[0].file, fixtureDir)))), { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) })
  .then((o) => createSqliteSource(o.db, { images: {} }));
const OLD_FIELDS = ['from', 'placedFrom', 'estimate'];

test('E6-8 (R4 seams): placement origin: a borrowed plant carries origin {list, kind: borrowed}; the climate\'s own plants carry none (never stamped)', async () => {
  const sub = await fixture.pool('Subtropical');
  assert.ok(sub.length > 0);
  for (const t of sub) {
    assert.equal(t.origin?.kind, 'borrowed', t.canonical_name);
    assert.ok(manifest.climates.some((c) => c.climate_zone === t.origin.list), `${t.canonical_name}: borrowed from a curated list`);
    for (const k of OLD_FIELDS) assert.equal(k in t, false, `${t.canonical_name}: no ${k}`);
  }
  assert.equal(sub.find((t) => t.canonical_name === 'Castanea sativa').origin.list, 'Mediterranean', 'the first list of the nearest order');
  for (const t of await fixture.pool('Temperate')) assert.equal('origin' in t, false, `${t.canonical_name}: own plants are not stamped`);
});

test('E6-9 (R4 seams): placement origin: asGuest stamps a guest (a borrowed origin wins), placementZone reads the origin', () => {
  const own = taxon();
  const guest = core.asGuest(own, 'Tropical');
  assert.deepEqual(guest.origin, { list: 'Tropical', kind: 'guest' });
  assert.equal('origin' in own, false, 'the record itself is not touched');
  assert.equal(core.guestOf(guest), 'Tropical');
  assert.equal(core.borrowedFrom(guest), null);
  const borrowed = taxon({ origin: { list: 'Mediterranean', kind: 'borrowed' } });
  assert.equal(core.asGuest(borrowed, 'Subtropical').origin, borrowed.origin, 'a guest from a borrowed list keeps where its placement comes from');
  assert.equal(core.borrowedFrom(borrowed), 'Mediterranean');
  assert.equal(core.guestOf(borrowed), null);
  assert.equal(core.placementZone(borrowed, 'Subtropical'), 'Mediterranean', 'a borrowed placement');
  assert.equal(core.placementZone(guest, 'Temperate'), 'Tropical', 'a guest');
  assert.equal(core.placementZone(own, 'Temperate'), 'Temperate', 'its own placement');
  assert.equal(core.placementZone(own, null), null);
});

test('E6-10 (R4 seams): rangeMarks: the estimate mark reads the origin; its state is the site id (zones.ts), a guest gets none', () => {
  const marks = (t, surface) => rangeMarks(t, ctx(), surface).map((m) => [m.kind, m.key, m.state]);
  const borrowed = taxon({ origin: { list: 'Mediterranean', kind: 'borrowed' } });
  assert.deepEqual(marks(borrowed, 'chip'), [['estimate', 'estimate.short', 'mediterranean']]);
  assert.deepEqual(marks(borrowed, 'row'), [['estimate', 'estimate.fromMediterranean', 'mediterranean'], ['estimate', 'estimate.noSite', 'no-site']]);
  assert.deepEqual(marks(core.asGuest(taxon(), 'Tropical'), 'row'), [], 'a guest is no estimate');
});

test('E6-11 (R4 seams): factAt: the stored value of each ADR-6 fact, null when not recorded (never a misfit)', () => {
  const site = null, period = core.TODAY_PERIOD;
  const t = taxon({ traits: { is_annual: false, grown_as_annual: true, is_perennial: true, drought_tolerance: 'Medium', moisture_use: null } });
  assert.equal(period, '1991-2020');
  assert.equal(core.factAt('life_cycle', t, site, period), 'grown_as_annual');
  assert.equal(core.factAt('life_cycle', taxon({ traits: { is_annual: true, is_perennial: true } }), site, period), 'annual');
  assert.equal(core.factAt('life_cycle', taxon({ traits: { is_perennial: true } }), site, period), 'perennial');
  assert.equal(core.factAt('life_cycle', taxon(), site, period), null);
  assert.deepEqual(core.factAt('cold_limit', t, site, period), { tminColdC: -15, weak: false });
  assert.deepEqual(core.factAt('heat_limit', t, site, period), { tmaxWarmC: 30 });
  assert.deepEqual(core.factAt('water_need', t, site, period), { drought: 'Medium', moisture: null });
  assert.deepEqual(core.factAt('water_need', taxon({ traits: { drought_tolerance: null, moisture_use: 'High' } }), site, period), { drought: null, moisture: 'High' });
  const bare = taxon({ climate: null });
  for (const key of ['life_cycle', 'cold_limit', 'heat_limit', 'water_need']) assert.equal(core.factAt(key, bare, site, period), null, key);
  const weak = taxon({ climate: { ...taxon().climate, tminCold: { low: -8, median: 0, high: 4, count: 9, basis: 'thinned_cells', weak: true } } });
  assert.deepEqual(core.factAt('cold_limit', weak, site, period), { tminColdC: -8, weak: true });
});

useHarness();

const DESKTOP = { width: 1280, theme: 'light' };
const LOADING = en['consortium.details.loading'];
const RELOAD = en['consortium.details.reload'];
const SUGGEST = en['consortium.start.suggest'];
const temperateIds = () => fixtureDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name").all().map((r) => String(r.id)));

// E6-6 (L8): the suggest chunk missing at the first Suggest press: a toast with Reload, Suggest not
// left busy, the reader's choices unchanged. Still marked: clearing the waiting Suggest is
// state/suggest-wait.ts's (requestSuggest: no wait once store.suggestFailed), a file R4 does not own in
// chunk 4 (hand-off in R4's report); everything before it passes.
failing('E6-6 (R4 seams): Suggest with its chunk missing shows a toast with Reload and is not left busy; the choices stay (L8)', { owner: 'R4', reason: /Suggest is left busy/ }, async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: suggest() is still in the first run');
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 404 } });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  const before = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  await page.locator(aria('button', SUGGEST)).click();
  assert.ok(await has(page, aria('button', RELOAD), 8000), 'the toast offers Reload');
  const idle = await page.waitForFunction((name) => [...document.querySelectorAll('#ct-root button')].some((b) => b.textContent.trim() === name && b.getAttribute('aria-busy') !== 'true'), { timeout: 4000 }, SUGGEST).then(() => true, () => false);
  const after = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  assert.deepEqual(after, before, 'the reader\'s choices unchanged');
  await page.browserContext().close().catch(() => {});
  assert.ok(idle, 'Suggest is left busy (aria-busy) after the toast');
});

// E6-7 (L9): Swap opened while the suggest chunk is held shows the loading line, then alternatives.
// The plant list waits for the chunk (store.pool, as for the range rule), so the pool is not awaited here.
test('E6-7 (R4 seams): Swap opened while the suggest chunk is held shows a loading line, then the alternatives (L9)', async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: alternatives() is still in the first run');
  const ids = await temperateIds();
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 'hold' } });
  assert.equal(await loadState(page), 'ready');
  await page.evaluate((members) => {
    const { store } = window.__ctTest;
    store.climate.value = 'Temperate';
    void store.loadPool('Temperate');
    store.members.value = members;
    store.view.value = 'matrix';
    store.openSheet('swap', members[0]);
  }, ids.slice(0, 6));
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  assert.ok(await has(page, 'dialog[open] [role="status"]', 2000), 'a loading line (status)');
  assert.match(await page.$eval('dialog[open] [role="status"]', (s) => s.textContent), new RegExp(LOADING.replace('…', '')));
  assert.equal(await page.evaluate(() => window.__ctTest.store.suggestRule.value), null, 'the chunk is held');
  await page.releaseHeld();
  await page.waitForFunction((loading) => { const d = document.querySelector('dialog[open]'); return !!d && !d.textContent.includes(loading) && d.querySelectorAll('.ct-swap li').length > 0; }, { timeout: 8000 }, LOADING);
  await page.browserContext().close().catch(() => {});
});
