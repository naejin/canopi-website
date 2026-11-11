// P5 commit 0, stream S5e's seams (native.ts, soil-likely.ts, views/LikelySlot.tsx, views/NativeSlot.tsx): stubs that keep today's behaviour until S5e lands.
// S5e owns this file and replaces each stub test with its rules' tests; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');
void ctx; void lyon; void placement; void taxon; void view;

test('native.ts nativeHere and soil-likely.ts likelyFor (S5e stubs): nothing said, nothing offered', () => {
  assert.equal(core.nativeHere(taxon(), 'FRA', new Set([taxon().id])), null);
  for (const q of ['light', 'soil', 'water', 'room']) assert.equal(core.likelyFor(q, lyon.lookup), null, q);
  assert.equal(core.likelyFor('soil', null), null);
});

test('views/LikelySlot.tsx and views/NativeSlot.tsx (S5e stubs) render nothing', () => {
  for (const f of ['LikelySlot.tsx', 'NativeSlot.tsx']) assert.match(view(f), /return null;/, f);
});

test('native-marks.ts nativeMarks (stub): no mark on any surface; loaded only through the lazy mark-providers.ts', async () => {
  const { nativeMarks } = await import('../src/lib/consortium/native-marks.ts');
  for (const s of core.markSurfaces) assert.deepEqual(nativeMarks(taxon(), ctx({ location: lyon }), s), [], s);
  assert.equal('nativeMarks' in core, false, 'not exported from index.ts, so out of the first run');
});
