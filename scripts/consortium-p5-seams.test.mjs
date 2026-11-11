// P5 commit 0: the shared seams the P5 streams fill (.local/consortium/v2/p5-owners.md). Each stream's
// own seams have their own file (consortium-p5-seams-s5b/c/d/e.test.mjs), so a stream edits only its
// file. This one pins what no stream changes: the marks pipeline (marks.ts, mark-providers.ts,
// store.ts markProviders), the mark context, and where the host views mount each stream's slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');

test('marks.ts plantMarks: the loaded providers concatenated in order, for one surface; none loaded, no marks', async () => {
  assert.deepEqual(core.plantMarks(taxon(), ctx(), 'chip'), [], 'no providers loaded');
  const mark = (kind, state) => ({ kind, key: `test.${kind}`, severity: 'note', ...(state ? { state } : {}) });
  const providers = [() => [mark('edge')], () => [], (t, c, surface) => (c.location && surface !== 'chip' ? [mark('native', 'native')] : [])];
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), 'details', providers).map((m) => [m.kind, m.state]), [['edge', undefined], ['native', 'native']]);
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), 'chip', providers).map((m) => m.kind), ['edge'], 'a provider keeps a mark off a surface');
  assert.deepEqual(core.markSurfaces, ['chip', 'row', 'add', 'details']);
  assert.deepEqual(core.markKinds, ['edge', 'outside', 'unknown', 'estimate', 'future', 'native']);
  const loaded = await core.loadMarkProviders();
  assert.deepEqual(loaded.map((p) => p.name), ['rangeMarks', 'futureMarks', 'nativeMarks'], 'range (S5c), future (S5d), native (S5e)');
  assert.equal(await core.loadMarkProviders(), loaded, 'loaded once');
  for (const s of core.markSurfaces) assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), s, loaded), [], `the stubs mark nothing (${s})`);
  assert.equal('markProviders' in core, false, 'the providers stay out of index.ts, so out of the first run');
});

test('marks.ts needsMarkProviders: the providers load only with a site location or a climate whose plants are borrowed', () => {
  const curated = ['Tropical', 'Mediterranean', 'Temperate'];
  assert.equal(core.needsMarkProviders({ climate: null, location: null }, curated), false);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null }, curated), false, 'today\'s path loads nothing');
  assert.equal(core.needsMarkProviders({ climate: 'Subtropical', location: null }, curated), true);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: lyon }, curated), true);
});

test('store: markContext follows the climate, location and scenario; the providers load when a location is set', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  assert.deepEqual(store.markContext.value, { climate: store.climate.value, location: null, scenario: 'ssp245', source: store.source.value });
  assert.deepEqual(store.markProviders.value, [], 'none on the first run');
  store.location.value = lyon;
  try {
    assert.equal(store.markContext.value.location, lyon);
    await core.loadMarkProviders();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(store.markProviders.value.length, 3);
  } finally { store.location.value = null; }
});

test('the host views mount every stream\'s slot, and PlantMarks names its surface everywhere', () => {
  const start = view('Start.tsx');
  assert.ok(start.indexOf('<LocationSlot />') > 0 && start.indexOf('<LocationSlot />') < start.indexOf('<Climates />'), 'S5b: LocationSlot before the cards');
  assert.match(start, /<LikelySlot question=\{k\} \/>/, 'S5e: LikelySlot in each site question');
  assert.match(start, /\{z && <PoolSlot zone=\{z\} \/>\}\s*\{z && hasList\(z\) && \(/, 'S5c: PoolSlot and hasList decide what follows the cards');
  assert.match(start, /const ready = hasList\(z\);/, 'S5c: the card\'s Ready pill');
  assert.match(start, /climate\.value \?\? pendingClimate\.value \?\? proposedClimate\.value/, 'S5b: a proposed climate shows checked');
  assert.match(view('later.ts'), /export \{ FutureSlot \} from '\.\/FutureSlot\.tsx';/, 'S5d: FutureSlot in the later chunk');
  assert.match(view('Matrix.tsx'), /later\(\(\) => import\('\.\/later\.ts'\)\.then\(\(m\) => m\.FutureSlot\), \{ idle: true \}\)/, 'idle: no download before ct:matrix');
  assert.match(view('Matrix.tsx'), /<FutureSlot \/>/);
  assert.match(view('PhoneMatrix.tsx'), /<FutureSlot \/>/);
  assert.match(view('Details.tsx'), /<NativeSlot taxon=\{t\} \/>/, 'S5e: NativeSlot in Details');
  assert.match(view('Details.tsx'), /<PlantMarks taxon=\{t\} surface="details" \/>/);
  assert.equal((view('Add.tsx').match(/<PlantMarks taxon=\{t\} surface="add" \/>/g) ?? []).length, 2);
  assert.match(view('StageBar.tsx'), /<PlantMarks taxon=\{taxon\} surface=\{tight \? 'chip' : 'row'\} \/>/);
  assert.match(view('PlantMarks.tsx'), /data-mark=\{m\.kind\} data-mark-state=\{m\.state\}/);
});
