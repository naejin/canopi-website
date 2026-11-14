// PP-B stream b2 (plant-palette-slices section 2, row b2; plant-palette-architecture 3.2-3.5): the
// lasting layer under the palette page. The core verdict engine (verdict.ts) on its vectors
// (scripts/vectors/verdicts.json, website cases) and on canopi-data's range-verdict vectors (the
// stamped copy scripts/vectors/range-verdicts.json, run here, never copied: its release-id test is in
// install-consortium.test.mjs); holes and fillers (holes.ts) on scripts/vectors/holes.json; the words
// of verdicts, holes and years (verdict-line.ts); Kiambu through the store's countFits on the real
// export. Written failing first (scripts/expect-fail.mjs failing(), owner b2 in each title).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const { verdict, verdicts, judgedPeriod, holdsBy } = await import('../src/lib/consortium/verdict.ts');
const vectors = (f) => JSON.parse(readFileSync(new URL(`vectors/${f}`, import.meta.url), 'utf8'));
const V = vectors('verdicts.json'), H = vectors('holes.json'), RV = vectors('range-verdicts.json');

// ---- the adapter from the vectors' export fields to the core's Taxon (convention palette-vectors) ----
const range = (r) => (r ? { low: r.low ?? null, median: null, high: r.high ?? null, count: 100, basis: 'thinned_cells', weak: r.weak ?? false } : null);
function plantOf(key, p) {
  const climate = p.climate ?? p; // range_source null: the export has no range for the plant
  const any = p.range_source !== null && ['tmin_cold', 'tmax_warm', 'tmean_year', 'tmean_warm', 'aridity'].some((k) => climate[k]);
  return taxon({
    id: key, canonical_name: p.name ?? key, genus: 'X', family: 'X', role: p.role ?? 'crop',
    stratum: p.stratum ? { value: p.stratum, sources: [] } : null,
    phases: p.phase_start ? { start: p.phase_start, end: p.phase_end, sources: [] } : null,
    functions: p.functions ? p.functions.map((f) => ({ function: f, sources: [] })) : null,
    traits: {
      is_annual: p.is_annual ?? null, grown_as_annual: p.grown_as_annual ?? null,
      sun: p.sun ?? null, semi_shade: p.semi_shade ?? null, full_shade: p.full_shade ?? null,
      ...(p.height_max_m ? { height_m: { min: null, max: p.height_max_m } } : {}),
    },
    warnings: { toxicity: p.toxicity ?? null, invasive_in: (p.invasive_in ?? []).map((country) => ({ country, sources: ['griis'] })), allelopathic: null, weed_potential: null },
    climate: any ? {
      source: p.range_source ?? 'gbif_occurrences', cells: 100, nativeShare: null,
      tminCold: range(climate.tmin_cold), tmaxWarm: range(climate.tmax_warm), tmeanYear: range(climate.tmean_year), tmeanWarm: range(climate.tmean_warm), aridity: range(climate.aridity),
    } : null,
  });
}
const slotOf = (r) => ({
  period: r.period, scenario: r.scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0,
  tminColdC: r.tmin_cold_c, tmaxWarmC: r.tmax_warm_c, tmeanColdC: r.tmean_cold_c, tmeanWarmC: r.tmean_warm_c, aridityIndex: r.aridity_index ?? null,
});
const lookupOf = (rows) => (rows ? { lat: 0, lon: 0, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: rows.map(slotOf) }, soil: null, regions: { wgsrpdL3: null, isoA2: null } } : null);
const placeOf = (words = {}, room) => ({ ...core.emptyPlace, room: room ?? core.emptyPlace.room, spot: { ...core.emptyPlace.spot, light: words.l ?? 'unsure', height: words.h ?? 'unsure', water: words.w ?? 'unsure' } });
const vPlant = (k) => plantOf(k, V.plants[k]);
const vCtx = (input, period = V.thresholds.today_period) => ({
  place: placeOf(V.places[input.place], input.room), lookup: lookupOf(input.climate ? V.climates[input.climate] : null),
  period, scenario: V.thresholds.scenario, canopy: core.canopyOf((input.members ?? []).map(vPlant)),
});

test('verdicts.json: a known schema id, and every plant, place and climate a case names is in the file', () => {
  assert.equal(V.schema, 'canopi-palette-verdicts/1');
  for (const c of V.cases) {
    for (const k of [c.input.plant, ...(c.input.members ?? [])]) assert.ok(V.plants[k], `${c.name}: plant ${k}`);
    if (c.input.place) assert.ok(V.places[c.input.place], `${c.name}: place ${c.input.place}`);
    if (c.input.climate) assert.ok(V.climates[c.input.climate], `${c.name}: climate ${c.input.climate}`);
  }
  assert.equal(V.thresholds.margin_c, core.RANGE_MARGIN_C);
});

test('PP-B (b2 verdict engine, 3.2): verdicts.json, website cases (shade relief, levels, not checked, notes, judgedPeriod, holdsBy)', () => {
  for (const c of V.cases) {
    const t = vPlant(c.input.plant);
    if ('page' in c.input) { assert.equal(judgedPeriod(t, c.input.page), c.expect.judged, c.name); continue; }
    if ('holds_by' in c.input) { assert.equal(holdsBy(t, vCtx(c.input), c.input.holds_by), c.expect.holds, c.name); continue; }
    const v = verdict(t, vCtx(c.input));
    assert.equal(v.level, c.expect.level, `${c.name}: level (verdict stub returns unknown)`);
    if ('limiting' in c.expect) assert.equal(v.limiting?.factor, c.expect.limiting, `${c.name}: limiting`);
    if ('light_factor' in c.expect) assert.equal(v.factors.some((f) => f.factor === 'light'), c.expect.light_factor, `${c.name}: light factor`);
    if ('factors' in c.expect) assert.deepEqual(v.factors.map((f) => f.factor), c.expect.factors, `${c.name}: factors`);
    if ('notes' in c.expect) assert.deepEqual([...v.notes].sort(), [...c.expect.notes].sort(), `${c.name}: notes`);
    assert.ok(v.factors.every((f) => f.basis === 'range' || f.level !== 'outside'), `${c.name}: a spot or soil hint is never beyond a second look`);
  }
});

// canopi-data's range-verdict vectors (DATA-1), the stamped copy: inside → fits, edge → look,
// outside → outside, unknown → not checked; each side as the vector gives it.
const LEVEL_OF = { inside: 'fits', edge: 'look', outside: 'outside', unknown: 'unknown' };
const SIDE_OF = { fits: 'inside', look: 'edge', outside: 'beyond' };
test('PP-B (b2 verdict engine, DATA-1): every range-verdict vector of the installed release gives its verdict and sides through verdict()', () => {
  assert.equal(RV.thresholds.margin_c, core.RANGE_MARGIN_C);
  let run = 0;
  for (const x of RV.vectors) {
    const p = RV.plants[x.plant], s = RV.sites[x.site];
    if (!p || !s) continue; // a plant absent from the export (source.absent_plants)
    const rows = s.no_climate ? null : [s.period === '1991-2020' ? s : { ...s, period: '1991-2020', scenario: 'historical' }, ...(s.period === '1991-2020' ? [] : [s])];
    const t = plantOf(x.plant, { ...p, phase_start: 'secondary_i', phase_end: 'climax' });
    const v = verdict(t, { place: core.emptyPlace, lookup: lookupOf(rows), period: s.period ?? '1991-2020', scenario: s.scenario === 'historical' ? 'ssp245' : s.scenario });
    const name = `${x.site} / ${x.plant}`;
    assert.equal(v.level, LEVEL_OF[x.verdict], `${name}: level (verdict stub returns unknown)`);
    for (const [side, want] of Object.entries(x.sides)) {
      const f = v.factors.find((y) => y.factor === side);
      const got = !f ? null : side === 'hot' && f.level === 'fits' && v.notes.includes('cool-season') ? 'cool_season' : SIDE_OF[f.level];
      assert.equal(got, want, `${name}: side ${side}`);
    }
    assert.equal(v.notes.includes('cool-season'), x.cool_season, `${name}: cool season`);
    run++;
  }
  assert.ok(run >= 160, `${run} vectors run`);
});

// Kiambu (concept P1; architecture 3.2 countFits): a Subtropical place borrows the nearest lists
// (Mediterranean, Tropical, Temperate: 515 plants). The site values are the climate reader's answer
// at Kiambu (-1.1714, 36.8356) on the v0.2.0 tiles, historical slot.
const KIAMBU = { lat: -1.1714, lon: 36.8356, source: 'search', label: 'Kiambu', lookup: {
  lat: -1.1714, lon: 36.8356, soil: null, regions: { wgsrpdL3: 'KEN', isoA2: 'KE' },
  climate: { cellLat: -1.25, cellLon: 36.75, distanceCells: 0, periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 12, tmaxWarmC: 26.1, tmeanColdC: 17.2, tmeanWarmC: 20.8, aridityIndex: 1.15 }] },
} };
const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
async function kiambuStore() {
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  const real = createSqliteSource(opened.db, { images: {} });
  const store = await import('../src/islands/consortium/store.ts');
  const { state } = await import('../src/islands/consortium/state/schema.ts');
  state.signals.climate.value = 'Subtropical';
  store.pools.value = { Subtropical: await real.pool('Subtropical') };
  store.location.value = KIAMBU;
  store.rangeRule.value = await core.loadRangeRule();
  store.verdictRule.value = await core.loadVerdictRule();
  return store;
}
// Open point for the coordinator: the boards' figure (concept P1, growers.md) came from the mock-up rule
// (tmin_cold both sides, tmax_warm hot side); the live rule gives 307. Parked until the plan's figure is
// confirmed or changed; never weakened.
failing('PP-B (b2 countFits, real data): Kiambu, 324 of the 515 plants on the nearest lists fit or need a second look today', { owner: 'b2', reason: /^307 \(the live range rule/ }, async () => {
  const store = await kiambuStore();
  const n = store.countFits.value;
  assert.equal(n.of, 515);
  assert.equal(n.fits + n.look, 324, `${n.fits + n.look} (the live range rule since the P5 decision row of 2026-11-12, cool and chill sides, gives 307; the boards' 324 used the earlier rule)`);
});
test('PP-B (b2 countFits, real data): Kiambu, countFits counts what the pool panel\'s range rule keeps (inside or near the edge)', async () => {
  const store = await kiambuStore();
  const n = store.countFits.value;
  const kept = store.pools.value.Subtropical.filter((t) => ['inside', 'edge'].includes(core.rangeFit(t, KIAMBU))).length;
  assert.equal(n.of, 515);
  assert.equal(n.fits + n.look, kept, `countFits ${n.fits + n.look}, the range rule keeps ${kept} (verdict stub counts none)`);
});

// ---- holes.json ----
const hPlant = (k) => plantOf(k, H.plants[k]);
const levelsOf = (levels = {}) => new Map(Object.entries(levels).map(([id, level]) => [id, { id, level, judged: '1991-2020', ownYears: false, limiting: null, factors: [], notes: [] }]));
const holesFor = (input) => core.holes({ members: (input.members ?? []).map(hPlant), verdicts: levelsOf(input.levels), pending: input.pending ?? false });

test('holes.json: a known schema id, the thresholds are the core\'s, and every plant a case names is in the file', () => {
  assert.equal(H.schema, 'canopi-palette-holes/1');
  assert.deepEqual(H.thresholds.phase_years, core.PHASE_YEARS);
  assert.equal(H.thresholds.judged_from_year, core.JUDGED_FROM_YEAR);
  assert.equal(H.thresholds.judged_to_year, core.JUDGED_TO_YEAR);
  assert.deepEqual(H.thresholds.rank_order, core.HOLE_ORDER);
  for (const c of H.cases) for (const k of [...(c.input.members ?? []), ...(c.input.pool ?? []), ...Object.keys(c.input.levels ?? {}), ...(c.input.warned ?? [])]) assert.ok(H.plants[k], `${c.name}: plant ${k}`);
});

test('PP-B (b2 holes, 3.3): holes.json (one hole for a job missing in years 3-15, not judged under a year, nothing after 60, rank order, outside members, P11 pending, month ids, fillers)', () => {
  for (const c of H.cases) {
    const i = c.input, e = c.expect;
    if (i.id) { assert.equal(core.holeId(i.id.kind, i.id.what, i.id.from, i.id.to, i.id.months), e.id, c.name); continue; }
    const list = holesFor(i);
    if (i.hole) {
      const hole = list.find((h) => h.id === i.hole);
      assert.ok(hole, `${c.name}: hole ${i.hole}`);
      const holds = new Map(Object.entries(i.holds ?? {}));
      const got = core.fillers(hole, i.pool.map(hPlant), levelsOf(i.levels), holds, new Set(i.warned), i.members.map(hPlant), list);
      assert.deepEqual(Object.fromEntries(Object.entries(got).map(([g, ts]) => [g, ts.map((t) => t.id)])), { fits: e.fits, look: e.look, outside: e.outside, unknown: e.unknown }, c.name);
      continue;
    }
    if (e.holes) assert.deepEqual(list.map((h) => ({ id: h.id, rank: h.rank, state: h.state, from: h.fromYear, to: h.toYear })), e.holes, c.name);
    if (e.ranks) assert.deepEqual(list.map((h) => h.rank), e.ranks, c.name);
    if (e.order) assert.deepEqual(list.map((h) => h.id), e.order, c.name);
    assert.equal(core.nextStep(list)?.id ?? null, e.next, `${c.name}: next step`);
  }
});

test('PP-B (b2 holes, 3.3): each neighbouring HOLE_ORDER pair ranks in order, and a hole\'s rank is read from the table', () => {
  const order = [['job', true], ['light', true], ['flowering', false], ['job', false], ['cool', false], ['soil', false]];
  for (let i = 1; i < order.length; i++) assert.ok(core.holeRank(...order[i - 1]) < core.holeRank(...order[i]), `${order[i - 1]} before ${order[i]}`);
  assert.equal(core.holeRank('light', false), core.holeRank('job', false), 'a job or a light level empty for part of the years rank together');
  const list = core.holes({ members: [], verdicts: null, pending: false });
  assert.ok(list.every((h) => h.rank === core.holeRank(h.kind, h.fromYear === 0 && h.toYear === core.JUDGED_TO_YEAR)));
  assert.ok(list.every((h) => h.kind !== 'job' || (h.preset.job === h.job && h.preset.hole === h.id)), 'a job hole opens Add preset to its job and hole');
});

test('PP-B (b2 holes, P11 restored): while a guest list loads the holes are pending, never a false hole; with every list read, the holes', () => {
  const members = [hPlant('crop_all')];
  assert.ok(core.holes({ members, verdicts: null, pending: true }).every((h) => h.state !== 'open'), 'loading: no open hole');
  assert.equal(core.nextStep(core.holes({ members, verdicts: null, pending: true })), null);
  assert.ok(core.holes({ members, verdicts: null, pending: false }).some((h) => h.state === 'open'), 'read: the holes');
});

test('PP-B (b2 holes, 3.3): fills is the one predicate (the job or light level in some year of the hole); a member is never its own filler; no hole a filler filled stays the next step', () => {
  const members = ['tree_all', 'high_any', 'medium_any', 'low_any', 'crop_early', 'crop_late'].map(hPlant);
  const [hole] = core.holes({ members, verdicts: null, pending: false });
  assert.ok(core.fills(hole, hPlant('fit_a')));
  assert.ok(!core.fills(hole, hPlant('too_early')), 'gone before year 3');
  assert.ok(!core.fills(hole, hPlant('no_food')), 'not the job');
  const after = core.holes({ members: [...members, hPlant('fit_a')], verdicts: null, pending: false });
  assert.equal(core.nextStep(after), null, 'filled: no next step');
});

test('PP-B (b2 holes, 7.3): jobGapsByPhase moved to holes.ts (one gap engine), still exported from the core', async () => {
  const jobs = readFileSync(new URL('../src/lib/consortium/jobs.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(jobs, /export function jobGapsByPhase/);
  const holes = await import('../src/lib/consortium/holes.ts');
  assert.equal(typeof holes.jobGapsByPhase, 'function');
  assert.equal(core.jobGapsByPhase, holes.jobGapsByPhase);
});

// ---- verdict-line.ts: the only words of verdicts, holes and years ----
const pv = (level, judged = '1991-2020') => ({ id: 'x', level, judged, ownYears: false, limiting: null, factors: [], notes: [] });
const hole = (fromYear, toYear, state = 'open') => ({ id: `job:mulch:${fromYear}-${toYear}`, kind: 'job', rank: 4, job: 'mulch', fromYear, toYear, state, preset: {} });
test('PP-B (b2 lines, 3.2): fitLine, holeLine and yearsLine give one key under consortium.line. with numbers and counts, never "fits" for not checked', () => {
  const L = core;
  assert.deepEqual(L.fitLine(pv('fits')), { key: 'consortium.line.fits', vars: {} });
  assert.deepEqual(L.fitLine(pv('fits', '2071-2099')), { key: 'consortium.line.fitsTo', vars: { year: 2099 } });
  assert.deepEqual(L.fitLine(pv('unknown')), { key: 'consortium.line.unknown', vars: {} });
  assert.deepEqual(L.fitLine(pv('look')), { key: 'consortium.line.look', vars: {} });
  assert.deepEqual(L.fitLine(pv('outside')), { key: 'consortium.line.outside', vars: {} });
  assert.deepEqual(L.holeLine(hole(3, 15)), { key: 'consortium.line.holeBetween', vars: { from: 3, to: 15 } });
  assert.deepEqual(L.holeLine(hole(0, 60)), { key: 'consortium.line.holeAlways', vars: {} });
  assert.deepEqual(L.holeLine(hole(0, 3)), { key: 'consortium.line.holeFirst', vars: {}, count: 3 });
  assert.deepEqual(L.holeLine(hole(15, 60)), { key: 'consortium.line.holeAfter', vars: { from: 15 } });
  assert.deepEqual(L.holeLine(hole(0, 1, 'not-judged')), { key: 'consortium.line.holeNotJudged', vars: {} });
  assert.deepEqual(L.holeLine(hole(3, 15, 'pending')), { key: 'consortium.line.holePending', vars: {} });
  assert.deepEqual(L.yearsLine(3, 15), { key: 'consortium.line.yearsSpan', vars: { from: 3, to: 15 } });
  assert.deepEqual(L.yearsLine(0, 3), { key: 'consortium.line.yearsFirst', vars: {}, count: 3 });
  assert.deepEqual(L.yearsLine(25, null), { key: 'consortium.line.yearsAfter', vars: { from: 25 } });
  assert.deepEqual(L.yearsLine(0.25, 1), { key: 'consortium.line.yearsMonths', vars: { from: 3, to: 12 } });
  assert.deepEqual(L.moreLine(4), { key: 'consortium.line.more', vars: { n: 4 }, count: 4 });
  for (const l of [L.fitLine(pv('fits')), L.holeLine(hole(3, 15)), L.yearsLine(0, null)]) assert.match(l.key, /^consortium\.line\.[A-Za-z]+$/, 'one segment after consortium.line.');
});

// The probe (slices "Probes", b2): verdicts + holes for a 200-plant palette, target under 150 ms.
test('PP-B (b2 probe): verdicts and holes for 200 plants of the real export take under 150 ms', async () => {
  const store = await kiambuStore();
  const members = store.pools.value.Subtropical.slice(0, 200);
  const ctx = { place: core.emptyPlace, lookup: KIAMBU.lookup, period: '1991-2020', scenario: 'ssp245', canopy: core.canopyOf(members) };
  const t0 = performance.now();
  const v = verdicts(members, ctx);
  core.nextStep(core.holes({ members, verdicts: v, pending: false }));
  const ms = performance.now() - t0;
  assert.ok(ms < 150, `${ms.toFixed(1)} ms`);
});
