// P5 commit 0: the core seams the five P5 streams fill (.local/consortium/v2/p5-owners.md), each a
// stub that keeps today's behaviour until its stream lands. These tests pin the stubs' answers and
// signatures; a stream replaces the stub test of its own seam with its rules' tests.
// - range.ts rangeFit (S5c), placement.ts placeFor (S5c), future.ts futureCheck (S5d),
//   native.ts nativeHere and soil-likely.ts likelyFor (S5e), marks.ts plantMarks (all three).
import test from 'node:test';
import assert from 'node:assert/strict';

const core = await import('../src/lib/consortium/index.ts');

const placement = (stratum, start, end) => ({ role: 'crop', stratum, start, end, source: 'sample-review' });
const taxon = (over = {}) => ({
  id: '00000000-f1c7-4000-8000-000000000001', canonical_name: 'Castanea sativa', genus: 'Castanea', family: 'Fagaceae', names: {}, image: null,
  role: 'crop', stratum: { value: 'emergent', sources: [] }, phases: { start: 'secondary_i', end: 'climax', sources: [] }, functions: null,
  traits: {}, warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null },
  climate: { source: 'gbif_occurrences', tminCold: { low: -15, median: -4, high: 2.5, count: 200, basis: 'observed_cells' }, tmaxWarm: { low: 18, median: 24, high: 30, count: 200, basis: 'observed_cells' }, aridity: null, cells: 200, nativeShare: 0.2 },
  areasKnown: true,
  ...over,
});
// Lyon as the climate reader answers it (scripts/fixtures/climate/goldens.json shape, trimmed).
const lyon = {
  lat: 45.76, lon: 4.84, source: 'search', label: 'Lyon',
  lookup: {
    lat: 45.76, lon: 4.84,
    climate: { cellLat: 45.75, cellLon: 4.85, distanceCells: 0, periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfa', koppenTemperatureMarginC: 0.1, tminColdC: -0.6, tmaxWarmC: 27.9, aridityIndex: 0.9 }] },
    soil: { phH2o: 6.6, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
  },
};
const ctx = (over = {}) => ({ climate: 'Temperate', location: null, scenario: 'ssp245', source: null, ...over });

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

test('future.ts futureCheck (S5d stub): null ("not checked") for every plant and scenario', () => {
  assert.equal(core.futureCheck(taxon(), lyon, 'ssp245'), null);
  assert.equal(core.futureCheck(taxon(), null, 'ssp585'), null);
  assert.deepEqual(core.scenarios, ['ssp126', 'ssp245', 'ssp370', 'ssp585']);
  assert.equal(core.DEFAULT_SCENARIO, 'ssp245');
});

test('native.ts nativeHere and soil-likely.ts likelyFor (S5e stubs): nothing said, nothing offered', () => {
  assert.equal(core.nativeHere(taxon(), 'FRA', new Set([taxon().id])), null);
  for (const q of ['light', 'soil', 'water', 'room']) assert.equal(core.likelyFor(q, lyon.lookup), null, q);
  assert.equal(core.likelyFor('soil', null), null);
});

test('marks.ts plantMarks: the range, future and native providers in that order; empty today', () => {
  assert.deepEqual(core.plantMarks(taxon(), ctx()), []);
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon })), [], 'the stubs mark nothing, even with a location');
  const mark = (kind) => ({ kind, key: `test.${kind}`, severity: 'note' });
  const providers = [() => [mark('edge')], () => [], (t, c) => (c.location ? [mark('native')] : [])];
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), providers).map((m) => m.kind), ['edge', 'native']);
  assert.deepEqual(core.markProviders.map((p) => p.name), ['rangeMarks', 'futureMarks', 'nativeMarks']);
  assert.deepEqual(core.markKinds, ['edge', 'outside', 'unknown', 'estimate', 'future', 'native']);
});
