// Stream S5e (native here, soil likely) moved to P5.2 (decision row "P5 ships without S5e"). Pre-push
// review 3: P5 ships none of its stubs, and the location step reads no soil tile. P5.2 restores, from
// commit 0801024: core native.ts (nativeHere), native-marks.ts (nativeMarks, third in mark-providers.ts),
// soil-likely.ts (likelyFor), views/NativeSlot.tsx (under the name in Details), views/LikelySlot.tsx (in
// each site question on Start), PlantSource.nativeIn (sqlite-source.ts, plant_areas), MarkContext.source,
// and lookupSite without { soil: false } in views/location/location.tsx. Replace these tests with its rules'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const file = (f) => new URL(`../src/${f}`, import.meta.url);
const text = (f) => readFileSync(file(f), 'utf8');
const view = (f) => text(`islands/consortium/views/${f}`);

test('S5e ships nothing in P5: no native or soil-likely module, slot or reader', async () => {
  for (const f of ['lib/consortium/native.ts', 'lib/consortium/native-marks.ts', 'lib/consortium/soil-likely.ts',
    'islands/consortium/views/NativeSlot.tsx', 'islands/consortium/views/LikelySlot.tsx']) assert.equal(existsSync(file(f)), false, f);
  assert.equal('nativeHere' in core, false);
  assert.equal('likelyFor' in core, false);
  assert.doesNotMatch(view('Start.tsx'), /LikelySlot/);
  assert.doesNotMatch(view('Details.tsx'), /NativeSlot/);
  assert.doesNotMatch(text('islands/consortium/data/sqlite-source.ts'), /nativeIn|plant_areas/);
  assert.doesNotMatch(text('lib/consortium/source.ts'), /nativeIn/);
  assert.doesNotMatch(text('lib/consortium/marks.ts'), /nativeIn/);
  assert.deepEqual((await core.loadMarkProviders()).map((p) => p.name), ['rangeMarks', 'futureMarks']);
});

test('the location step reads no soil tile until P5.2 (soil likely) uses it', () => {
  // The lookup sits in views/location/location.tsx until S2 moves it to state/location.ts: either file,
  // in code (comments left out), not in a comment.
  const code = ['views/location/location.tsx', 'state/location.ts'].map((f) => new URL(`../src/islands/consortium/${f}`, import.meta.url)).filter((u) => existsSync(u))
    .map((u) => readFileSync(u, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')).join('\n');
  assert.match(code, /lookupSite\(lat, lon, tileSource\(\), DEFAULT_RADIUS, \{ soil: false \}\)/);
});
