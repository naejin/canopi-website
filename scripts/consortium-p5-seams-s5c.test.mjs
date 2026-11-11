// P5 commit 0, stream S5c's seams (range.ts, placement.ts, views/PoolSlot.tsx): stubs that keep today's behaviour until S5c lands.
// S5c owns this file and replaces each stub test with its rules' tests; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');
void ctx; void lyon; void placement; void taxon; void view;

test('range.ts rangeFit (S5c stub): every plant is "unknown" against any site until S5c lands, so nothing is filtered', () => {
  assert.equal(core.rangeFit(taxon(), lyon), 'unknown');
  assert.equal(core.rangeFit(taxon(), null), 'unknown');
  assert.equal(core.rangeFit(taxon({ climate: null }), lyon), 'unknown');
  assert.deepEqual(core.rangeVerdicts, ['inside', 'edge', 'outside', 'unknown']);
});

test('placement.ts placeFor (S5c stub): today\'s own-list placement, never borrowed; the nearest-list table is the owner-agreed one', () => {
  const placements = { Temperate: placement('high', 'secondary_i', 'secondary_iii'), Mediterranean: placement('medium', 'secondary_i', 'secondary_iii') };
  assert.deepEqual(core.placeFor(placements, 'Temperate', core.NEAREST_LISTS.Temperate), { zone: 'Temperate', placement: placements.Temperate, estimate: false });
  // Subtropical is not curated: today nothing is borrowed (S5c reads the nearest list, marked estimate).
  assert.equal(core.placeFor(placements, 'Subtropical', core.NEAREST_LISTS.Subtropical), null);
  // P5 engineering choices row (2026-11-11): Subtropical and Arid → Mediterranean, Tropical, Temperate;
  // Continental and Boreal → Temperate, then Mediterranean.
  assert.deepEqual(core.NEAREST_LISTS.Subtropical, ['Mediterranean', 'Tropical', 'Temperate']);
  assert.deepEqual(core.NEAREST_LISTS.Arid, ['Mediterranean', 'Tropical', 'Temperate']);
  assert.deepEqual(core.NEAREST_LISTS.Continental, ['Temperate', 'Mediterranean']);
  assert.deepEqual(core.NEAREST_LISTS.Boreal, ['Temperate', 'Mediterranean']);
  for (const z of ['Tropical', 'Mediterranean', 'Temperate']) assert.deepEqual(core.NEAREST_LISTS[z], [z]);
});

test('views/PoolSlot.tsx (S5c stub): a climate has a list only when the export curates it; otherwise PoolSlot shows today\'s "Not covered yet" notice', () => {
  const text = view('PoolSlot.tsx');
  assert.match(text, /export const hasList = \(z: ClimateZone\): boolean => page\(\)\.climates\.includes\(z\.toLowerCase\(\)\);/);
  assert.match(text, /if \(hasList\(zone\)\) return null;/);
  assert.match(text, /start\.uncovered\.title/);
});

test('range-marks.ts rangeMarks (stub): no mark on any surface; loaded only through the lazy mark-providers.ts', async () => {
  const { rangeMarks } = await import('../src/lib/consortium/range-marks.ts');
  for (const s of core.markSurfaces) assert.deepEqual(rangeMarks(taxon(), ctx({ location: lyon }), s), [], s);
  assert.equal('rangeMarks' in core, false, 'not exported from index.ts, so out of the first run');
});

test('PlantSource.borrowed (S5c stub, sqlite-source.ts): an uncovered climate\'s pool goes through borrowed(zone, NEAREST_LISTS[zone]), which reads nothing today', async () => {
  const { gunzipSync } = await import('node:zlib');
  const dir = new URL('fixtures/consortium-v2/export/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const raw = new Uint8Array(gunzipSync(readFileSync(new URL(manifest.files[0].file, dir))));
  const opened = await openBytes(raw, { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) });
  const source = createSqliteSource(opened.db, { images: {} });
  const asked = [];
  const real = source.borrowed;
  source.borrowed = (zone, order) => { asked.push([zone, order]); return real(zone, order); };
  assert.deepEqual(await source.borrowed('Subtropical', core.NEAREST_LISTS.Subtropical), [], 'stub: nothing borrowed');
  asked.length = 0;
  assert.deepEqual(await source.pool('Subtropical'), [], 'today an uncovered climate has no plants');
  assert.deepEqual(asked, [['Subtropical', core.NEAREST_LISTS.Subtropical]], 'pool() of an uncovered climate asks borrowed()');
  asked.length = 0;
  assert.ok((await source.pool('Temperate')).length > 0);
  assert.deepEqual(asked, [], 'a curated climate reads its own list');
});
