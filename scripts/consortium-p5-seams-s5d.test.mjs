// P5 commit 0, stream S5d's seams (future.ts, the scenario, views/FutureSlot.tsx): stubs that keep today's behaviour until S5d lands.
// S5d owns this file and replaces each stub test with its rules' tests; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');
void ctx; void lyon; void placement; void taxon; void view;

test('future.ts futureCheck (S5d stub): null ("not checked") for every plant and scenario', () => {
  assert.equal(core.futureCheck(taxon(), lyon, 'ssp245'), null);
  assert.equal(core.futureCheck(taxon(), null, 'ssp585'), null);
  assert.deepEqual(core.scenarios, ['ssp126', 'ssp245', 'ssp370', 'ssp585']);
  assert.equal(core.DEFAULT_SCENARIO, 'ssp245');
});

test('store.scenario (S5d writes) starts at SSP2-4.5; views/FutureSlot.tsx is a shell and its panel renders nothing', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  assert.equal(store.scenario.value, 'ssp245');
  assert.match(view('FutureSlot.tsx'), /return location\.value \? <panel\.View \/> : null;/, 'a shell: the panel loads only with a location');
  assert.match(view('FutureSlot.tsx'), /import\('\.\/future\/future\.tsx'\)/, 'its content is the future feature chunk');
  assert.match(view('future/future.tsx'), /return null;/, 'the panel renders nothing until S5d lands');
});

test('future-marks.ts futureMarks (stub): no mark on any surface; loaded only through the lazy mark-providers.ts', async () => {
  const { futureMarks } = await import('../src/lib/consortium/future-marks.ts');
  for (const s of core.markSurfaces) assert.deepEqual(futureMarks(taxon(), ctx({ location: lyon }), s), [], s);
  assert.equal('futureMarks' in core, false, 'not exported from index.ts, so out of the first run');
});
