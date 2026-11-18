// The site-inputs layer (src/lib/consortium/site-inputs.ts; owner 2026-11-18): one module owns every
// site input the engine reads, each { value, source: 'map' | 'grower' | 'none' }; grower temperature and
// rain edits are shifts applied to every period and scenario; the rules read the merged inputs only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const core = { ...(await import('../src/lib/consortium/index.ts')), ...(await import('../src/lib/consortium/verdict.ts')) };
// The places of the scenario file: all 9 slots as the climate grid reader answers them.
const { places } = JSON.parse(readFileSync(new URL('fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
const lookupOf = (name) => ({ lat: places[name].lat, lon: places[name].lon, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: places[name].periods }, soil: { phH2o: 6.4, texture: null, filled: false, fillDistanceCells: 0, distanceCells: 0 }, regions: { wgsrpdL3: null, isoA2: null } });

test('no edits: the map as it is, every slot the same object, map sources', () => {
  const lookup = lookupOf('lyon');
  const i = core.siteInputsOf({ lookup });
  assert.equal(i.periods.length, 9);
  i.periods.forEach((p, n) => assert.equal(p, lookup.climate.periods[n]));
  const today = lookup.climate.periods.find((p) => p.scenario === 'historical');
  assert.deepEqual(i.nights, { value: today.tminColdC, source: 'map', map: today.tminColdC, shift: 0 });
  assert.equal(i.rain.value, today.precipMm);
  assert.deepEqual(i.soilPh, { value: 6.4, source: 'map', map: 6.4 });
  for (const k of ['drainage', 'watering', 'light', 'wind', 'coldAir', 'room']) assert.deepEqual(i[k], { value: null, source: 'none' }, k);
});

test('no location: every input none, no slot', () => {
  assert.equal(core.hasClimate(core.NO_INPUTS), false);
  assert.equal(core.NO_INPUTS.nights.source, 'none');
  assert.equal(core.NO_INPUTS.soilPh.source, 'none');
  assert.equal(core.siteToday(core.NO_INPUTS), null);
});

test('a grower shift applies to every slot of every period and scenario', () => {
  const lookup = lookupOf('seville');
  const i = core.siteInputsOf({ lookup, edits: { nightsShiftC: -2, daysShiftC: 1.5, rainShiftMm: -100, dryMonthsShift: 20 } });
  lookup.climate.periods.forEach((m, n) => {
    const p = i.periods[n];
    assert.equal(p.tminColdC, Math.round((m.tminColdC - 2) * 10) / 10, `${m.period} ${m.scenario} nights`);
    assert.equal(p.tmeanColdC, Math.round((m.tmeanColdC - 2) * 10) / 10);
    assert.equal(p.tmaxWarmC, Math.round((m.tmaxWarmC + 1.5) * 10) / 10);
    assert.equal(p.tmeanWarmC, Math.round((m.tmeanWarmC + 1.5) * 10) / 10);
    assert.equal(p.precipMm, Math.max(0, m.precipMm - 100));
    if (m.aridityIndex !== null) assert.ok(Math.abs(p.aridityIndex - m.aridityIndex * p.precipMm / m.precipMm) < 0.001, 'aridity scales with the rain');
    assert.equal(p.dryMonths, 12, 'dry months clamped to 12');
    assert.equal(p.koppen, m.koppen, 'the Köppen class stays the map\'s');
  });
  assert.equal(i.nights.source, 'grower');
  assert.equal(i.nights.shift, -2);
  assert.equal(i.nights.value, Math.round((i.nights.map - 2) * 10) / 10);
});

test('a soil test is the one soil value a rule reads; the soil map checks nothing', () => {
  const map = core.siteInputsOf({ lookup: lookupOf('lyon') });
  assert.equal(core.testedPh(map), null);
  assert.equal(core.siteOf(map).soil, 'unsure');
  const tested = core.siteInputsOf({ lookup: lookupOf('lyon'), edits: { soilPh: 5.2 } });
  assert.deepEqual(tested.soilPh, { value: 5.2, source: 'grower', map: 6.4 });
  assert.equal(core.testedPh(tested), 5.2);
  assert.equal(core.siteOf(tested).soil, core.soilWordOf(5.2));
});

test('answers: room, light, drainage reach siteOf; unanswered is unsure, never a "no"', () => {
  const i = core.siteInputsOf({ lookup: null, room: 'pots', edits: { light: 'shade', drainage: 'wet', watering: 'all-year' } });
  assert.deepEqual(i.room, { value: 'pots', source: 'grower' });
  assert.deepEqual(core.siteOf(i), { light: 'shade', soil: 'unsure', water: 'wet', room: 'pots' });
  assert.deepEqual(core.siteOf(core.NO_INPUTS), { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' });
  assert.deepEqual(i.watering, { value: 'all-year', source: 'grower' });
});

test('"2 °C colder": the cold check reads the shifted nights in every period', () => {
  const lookup = lookupOf('lyon');
  const plain = core.siteInputsOf({ lookup }), colder = core.siteInputsOf({ lookup, edits: { nightsShiftC: -2 } });
  for (const period of core.periodIds) {
    const a = core.climateFor({ inputs: plain, scenario: 'ssp245' }, period), b = core.climateFor({ inputs: colder, scenario: 'ssp245' }, period);
    assert.equal(b.tminColdC, Math.round((a.tminColdC - 2) * 10) / 10, period);
  }
});

test('the engine reads the merged inputs only: no rule file names the lookup, a stored spot or soil answer', () => {
  const dir = new URL('../src/lib/consortium/', import.meta.url);
  for (const f of ['verdict.ts', 'range.ts', 'future.ts', 'weigh.ts', 'holes.ts', 'site.ts', 'site-today.ts', 'place.ts']) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\blookup\b/, `${f} reads no lookup`);
    assert.doesNotMatch(src, /\bctx\.place\b|\bspot\.(light|water|wind|height)\b/, `${f} reads no stored answer`);
  }
  assert.ok(readdirSync(dir).includes('site-inputs.ts'));
  const store = readFileSync(new URL('../src/islands/consortium/store.ts', import.meta.url), 'utf8');
  assert.match(store, /siteInputsOf\(\{ lookup: location\.value\?\.lookup \?\? null, room: room\.value, edits: siteEdits\.value \}\)/, 'the store merges the lookup, the room and the edits');
  // v14 pf commit 0W: the edits are a saved state field (state/schema.ts), NO_EDITS until the grower or a link sets one.
  const schema = readFileSync(new URL('../src/islands/consortium/state/schema.ts', import.meta.url), 'utf8');
  assert.match(schema, /siteEdits: \{\s*initial: \(\): SiteEdits => NO_EDITS/, 'no edit on load: NO_EDITS until the grower or a link writes one');
});

// Palette goals (owner 2026-11-18): the redundancy target sits beside the site inputs, a palette goal,
// not a site fact; nothing caps a lane at a count.
test('palette goals: 2 plants per job by default, any whole number from 1 up, no upper bound', () => {
  assert.deepEqual(core.DEFAULT_GOALS, { plantsPerJob: 2 });
  assert.deepEqual(core.paletteGoalsOf(), core.DEFAULT_GOALS);
  assert.deepEqual(core.paletteGoalsOf({ plantsPerJob: 0 }), core.DEFAULT_GOALS);
  assert.deepEqual(core.paletteGoalsOf({ plantsPerJob: 3.7 }), { plantsPerJob: 3 });
  assert.deepEqual(core.paletteGoalsOf({ plantsPerJob: 500 }), { plantsPerJob: 500 });
});

test('laneCounts: every job and light level counts its plants per time step; a job below the goal is thin, at 0 a hole, never thin', async () => {
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const tree = (n) => taxon({ id: `t${n}`, stratum: { value: 'high', sources: [] }, phases: { start: 'secondary_i', end: 'climax', sources: [] } }); // a crop: feeds you
  const one = core.laneCounts({ members: [tree(1)], verdicts: null, pending: false });
  const fix = one.find((l) => l.job === 'feeds_you');
  assert.equal(fix.counts.length, 7, 'one count per time step');
  assert.ok(fix.thin.length > 0, 'one food plant: thin against 2');
  assert.equal(one.find((l) => l.job === 'mulch').thin.length, 0, 'nobody: a hole, never thin');
  assert.ok(one.filter((l) => l.kind === 'light').every((l) => l.thin.length === 0), 'light levels are counted, never thin');
  const many = Array.from({ length: 200 }, (_, i) => tree(i));
  const all = core.laneCounts({ members: many, verdicts: null, pending: false }).find((l) => l.job === 'feeds_you');
  assert.equal(Math.max(...all.counts), 200, '200 plants in one lane count 200');
  assert.equal(all.thin.length, 0);
  assert.ok(core.laneCounts({ members: [tree(1), tree(2)], verdicts: null, pending: false }, { plantsPerJob: 3 }).find((l) => l.job === 'feeds_you').thin.length > 0, 'the grower\'s goal is read');
});
