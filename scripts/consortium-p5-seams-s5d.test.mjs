// P5 stream S5d: the future climate check (src/lib/consortium/future.ts, future-marks.ts, the panel
// views/future/future.tsx behind the FutureSlot.tsx shell, store.scenario). Decision row "P5 engineering
// choices": the latest period a plant's phases reach (phase_end ≥ 3 → 2041–2070; climax → 2071–2099),
// SSP2-4.5 by default, the scenarios' agreement, too hot (warmest-month maximum beyond Q95 + 2 °C, the
// margin of today's check) or too dry (aridity below Q05), warm winters left out, no data "not checked".
// S5d owns this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ctx, lyon, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const { futureMarks } = await import('../src/lib/consortium/future-marks.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');
// Four sites as `canopi-climate lookup` answers them on the v0.2.0 grid (all 9 slots; see the README).
const SITES = JSON.parse(readFileSync(new URL('fixtures/consortium-future/sites.json', import.meta.url), 'utf8'));
const at = (name, lookup = SITES[name]) => ({ lat: lookup.lat, lon: lookup.lon, source: 'search', label: name, lookup: { ...lookup, soil: null, regions: { wgsrpdL3: null, isoA2: null } } });

// A site with one value per slot: today, then 2041–2070 and 2071–2099 for each scenario.
const slot = (period, scenario, tmaxWarmC, aridityIndex = 1, tminColdC = 0) => ({ period, scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC, tmaxWarmC, tmeanColdC: 3, tmeanWarmC: 18, aridityIndex });
function site(mid, late = mid, { arid = [1, 1, 1, 1], tmin = 0 } = {}) {
  const periods = [slot('1991-2020', 'historical', 25)];
  core.scenarios.forEach((s, i) => periods.push(slot('2041-2070', s, mid[i], arid[i], tmin)));
  core.scenarios.forEach((s, i) => periods.push(slot('2071-2099', s, late[i], arid[i], tmin)));
  return { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods } } };
}
// The fixture plant: Q95 of the warmest-month maximum 30 °C, so too hot beyond 32 °C; no aridity range.
const ends = (end) => taxon({ phases: { start: 'placenta_i', end, sources: [] } });
const withArid = (low) => taxon({ climate: { ...taxon().climate, aridity: { low, median: 1, high: 2, count: 200, basis: 'observed_cells' } } });

test('futurePeriod: the latest period the phases reach (phase_end ≥ 3 → 2041–2070; climax → 2071–2099); short-lived plants and unplaced ones none', () => {
  assert.deepEqual(core.futurePeriods, ['2041-2070', '2071-2099']);
  for (const [end, want] of [['placenta_i', null], ['placenta_iii', null], ['secondary_i', '2041-2070'], ['secondary_iii', '2041-2070'], ['climax', '2071-2099']]) assert.equal(core.futurePeriod(ends(end)), want, end);
  assert.equal(core.futurePeriod(taxon({ phases: null })), null);
  assert.equal(core.FUTURE_HEAT_MARGIN_C, 2, 'the margin of today\'s range check (owner answer 2)');
});

test('futureCheck: too hot beyond Q95 + 2 °C, near the edge between Q95 and the margin, the scenarios\' agreement, the chosen period', () => {
  const t = ends('secondary_iii'); // 2041–2070
  assert.deepEqual(core.futureCheck(t, site([31, 32.5, 33, 34]), 'ssp245'), { period: '2041-2070', verdict: 'outside', why: ['heat'], agree: 3, of: 4 });
  assert.deepEqual(core.futureCheck(t, site([31, 32.5, 33, 34]), 'ssp126'), { period: '2041-2070', verdict: 'edge', why: [], agree: 1, of: 4 });
  assert.deepEqual(core.futureCheck(t, site([29, 29.5, 30, 31]), 'ssp245'), { period: '2041-2070', verdict: 'inside', why: [], agree: 3, of: 4 });
  assert.equal(core.futureCheck(t, site([31, 32, 33, 34]), 'ssp245').verdict, 'edge', 'exactly Q95 + 2 °C is still within the margin');
  // A climax plant is checked at 2071–2099 only.
  assert.deepEqual(core.futureCheck(ends('climax'), site([29, 29, 29, 29], [31, 33, 35, 37]), 'ssp245'), { period: '2071-2099', verdict: 'outside', why: ['heat'], agree: 3, of: 4 });
  assert.equal(core.futureCheck(ends('secondary_i'), site([29, 29, 29, 29], [40, 40, 40, 40]), 'ssp245').verdict, 'inside', 'a plant gone by climax is not checked at 2071–2099');
});

test('futureCheck: too dry below the aridity Q05; both reasons together; warm winters left out', () => {
  assert.deepEqual(core.futureCheck(withArid(0.5), site([29, 29, 29, 29], undefined, { arid: [0.6, 0.45, 0.4, 0.3] }), 'ssp245'), { period: '2071-2099', verdict: 'outside', why: ['arid'], agree: 3, of: 4 });
  assert.deepEqual(core.futureCheck(withArid(0.5), site([29, 33, 34, 35], undefined, { arid: [0.4, 0.4, 0.4, 0.4] }), 'ssp245').why, ['heat', 'arid']);
  // The fixture plant's coldest-month Q95 is 2.5 °C: a winter at 15 °C is warmer than anywhere it is recorded, and not a failure.
  assert.equal(core.futureCheck(ends('climax'), site([29, 29, 29, 29], undefined, { tmin: 15 }), 'ssp245').verdict, 'inside');
});

test('futureCheck: null ("not checked") without a site, without projections, without a range, or with nothing to compare', () => {
  const t = ends('climax');
  assert.equal(core.futureCheck(t, null, 'ssp245'), null);
  assert.equal(core.futureCheck(t, { ...lyon, lookup: null }, 'ssp245'), null, 'the lookup still loading or failed');
  assert.equal(core.futureCheck(t, { ...lyon, lookup: { ...lyon.lookup, climate: null } }, 'ssp245'), null, 'open sea');
  assert.equal(core.futureCheck(t, lyon, 'ssp245'), null, 'today only: no future slot');
  assert.equal(core.hasFutureData(lyon), false);
  assert.equal(core.hasFutureData(site([30, 30, 30, 30])), true);
  assert.equal(core.hasFutureData(null), false);
  assert.equal(core.futureCheck(taxon({ climate: null }), site([40, 40, 40, 40]), 'ssp245'), null, 'range not recorded');
  assert.equal(core.futureCheck(ends('placenta_iii'), site([40, 40, 40, 40]), 'ssp245'), null, 'short-lived: today\'s climate only');
  const noHeat = taxon({ climate: { ...taxon().climate, tmaxWarm: null, aridity: { low: 0.5, median: 1, high: 2, count: 9, basis: 'observed_cells' } } });
  assert.equal(core.futureCheck(noHeat, site([40, 40, 40, 40], undefined, { arid: [null, null, null, null] }), 'ssp245'), null, 'no warmest-month range, and no aridity on ice');
  assert.equal(core.futureCheck(noHeat, site([40, 40, 40, 40], undefined, { arid: [0.4, 0.6, 0.6, 0.6] }), 'ssp245').verdict, 'inside');
  // A missing slot drops out of the agreement; the chosen scenario's own slot missing is "not checked".
  const three = site([33, 33, 33, 33]);
  three.lookup.climate.periods = three.lookup.climate.periods.filter((p) => p.scenario !== 'ssp585');
  assert.deepEqual(core.futureCheck(t, three, 'ssp245'), { period: '2071-2099', verdict: 'outside', why: ['heat'], agree: 3, of: 3 });
  assert.equal(core.futureCheck(t, three, 'ssp585'), null);
  assert.equal(core.scenarioName('ssp245'), 'SSP2-4.5');
  assert.equal(core.scenarioName('ssp585'), 'SSP5-8.5');
  assert.equal(core.periodName('2041-2070'), '2041–2070');
});

test('futureSummary: members grouped by period and reason, short-lived and unchecked ones apart; no projections: not available', () => {
  const s = site([33, 33, 33, 33], [29, 29, 29, 29], { arid: [0.4, 0.4, 0.4, 0.4] });
  const a = { ...ends('secondary_ii'), id: 'a' }; // 2041–2070, too hot
  const b = { ...withArid(0.5), id: 'b' }; // climax: 2071–2099, too dry
  const c = { ...ends('climax'), id: 'c' }; // 2071–2099, inside
  const d = { ...ends('placenta_ii'), id: 'd' }; // today only
  const e = { ...taxon({ climate: null }), id: 'e' }; // not checked
  const sum = core.futureSummary([a, b, c, d, e], s, 'ssp245');
  assert.equal(sum.available, true);
  assert.deepEqual(sum.periods, [
    { period: '2041-2070', checked: ['a'], outside: ['a'], heat: ['a'], arid: [] },
    { period: '2071-2099', checked: ['b', 'c'], outside: ['b'], heat: [], arid: ['b'] },
  ]);
  assert.deepEqual(sum.todayOnly, ['d']);
  assert.deepEqual(sum.notChecked, ['e']);
  const none = core.futureSummary([a, b], lyon, 'ssp245');
  assert.equal(none.available, false);
  assert.deepEqual(none.periods, []);
  assert.deepEqual(none.notChecked, ['a', 'b']);
});

// ---- the numbers of the design check (p5-design-check.md §C "Future"), on the installed export ----

const ROOT = new URL('../', import.meta.url);
const index = JSON.parse(readFileSync(new URL('src/data/consortium-index.json', ROOT), 'utf8'));
const realFile = new URL(`public${index.files[0].url}`, ROOT);
async function realPools(climates) {
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(realFile))), { releaseId: index.release_id, climates: index.climates });
  try {
    const src = createSqliteSource(real.db, { images: index.images });
    return Object.fromEntries(await Promise.all(climates.map(async (c) => [c, await src.pool(c)])));
  } finally { real.db.close?.(); }
}
// Today's range check as S5c's range.ts applies it (owner answer 2): coldest-month minimum on both
// sides and warmest-month maximum on the hot side, `margin` °C beyond Q05/Q95; aridity not a filter
// (the design check's own count used margin 0 and the aridity Q05 too).
function insideToday(t, today, margin, arid = false) {
  const c = t.climate;
  if (!c) return false;
  if (c.tminCold?.low != null && today.tminColdC < c.tminCold.low - margin) return false;
  if (margin && c.tminCold?.high != null && today.tminColdC > c.tminCold.high + margin) return false;
  if (c.tmaxWarm?.high != null && today.tmaxWarmC > c.tmaxWarm.high + margin) return false;
  if (arid && c.aridity?.low != null && today.aridityIndex != null && today.aridityIndex < c.aridity.low) return false;
  return true;
}
// Count, over plants inside today, those outside (n) of those checked (m), per period.
const count = (sum) => Object.fromEntries(sum.periods.map((p) => [p.period, [p.outside.length, p.checked.length]]));
// The design check's measure: no margin (Q95 itself), the 2041–2070 slot for every plant reaching
// phase 3 (climax plants too), and 2071–2099 for climax plants.
const shift = (t) => (t.climate?.tmaxWarm ? { ...t, climate: { ...t.climate, tmaxWarm: { ...t.climate.tmaxWarm, high: t.climate.tmaxWarm.high - core.FUTURE_HEAT_MARGIN_C } } } : t);
function designCheck(pool, s) {
  const today = s.lookup.climate.periods[0];
  const reach = pool.filter((t) => core.futurePeriod(t) && t.climate && insideToday(t, today, 0, true)).map(shift);
  const as41 = reach.map((t) => (core.futurePeriod(t) === '2071-2099' ? { ...t, phases: { ...t.phases, end: 'secondary_iii' } } : t));
  const climax = reach.filter((t) => core.futurePeriod(t) === '2071-2099');
  const out = (list) => [list.filter((t) => core.futureCheck(t, s, 'ssp245')?.verdict === 'outside').length, list.length];
  return { mid: out(as41), late: out(climax) };
}

test('real export: the design check\'s flips reproduce (Lyon on the Temperate list 51/100 and 19/26, Manaus 16/140 and 9/31, Seville 10/13, Oslo 0) with its no-margin measure', { skip: !existsSync(realFile) && 'no real install' }, async () => {
  const pools = await realPools(['Temperate', 'Tropical', 'Mediterranean']);
  assert.deepEqual(designCheck(pools.Temperate, at('lyon')), { mid: [51, 100], late: [19, 26] });
  assert.deepEqual(designCheck(pools.Tropical, at('manaus')), { mid: [16, 140], late: [9, 31] });
  assert.deepEqual(designCheck(pools.Mediterranean, at('seville')).mid, [10, 13]);
  const oslo = designCheck(pools.Temperate, at('oslo'));
  assert.deepEqual([oslo.mid[0], oslo.late[0]], [0, 0]);
});

test('real export: under the shipped rule (2 °C margin, latest period) Lyon 28/97 + 17/33, Manaus 2/99 + 1/26, Seville 29/44 + 13/13, Oslo 0', { skip: !existsSync(realFile) && 'no real install' }, async () => {
  const pools = await realPools(['Temperate', 'Tropical', 'Mediterranean']);
  const run = (pool, name) => {
    const s = at(name);
    const today = s.lookup.climate.periods[0];
    return count(core.futureSummary(pool.filter((t) => insideToday(t, today, core.FUTURE_HEAT_MARGIN_C)), s, 'ssp245'));
  };
  assert.deepEqual(run(pools.Temperate, 'lyon'), { '2041-2070': [28, 97], '2071-2099': [17, 33] });
  assert.deepEqual(run(pools.Tropical, 'manaus'), { '2041-2070': [2, 99], '2071-2099': [1, 26] });
  assert.deepEqual(run(pools.Mediterranean, 'seville'), { '2041-2070': [29, 44], '2071-2099': [13, 13] });
  assert.deepEqual(run(pools.Temperate, 'oslo'), { '2041-2070': [0, 90], '2071-2099': [0, 29] });
  // Lyon's reasons: 21 too hot and 7 too dry by 2041–2070 (none both); 17 too hot by 2071–2099.
  const lyonSum = core.futureSummary(pools.Temperate.filter((t) => insideToday(t, SITES.lyon.climate.periods[0], 2)), at('lyon'), 'ssp245');
  assert.deepEqual(lyonSum.periods.map((p) => [p.heat.length, p.arid.length]), [[21, 7], [17, 0]]);
});

// ---- the marks and the views ----

test('futureMarks: an ink note (severity note) when outside on every surface, near the edge only where words fit, nothing otherwise', () => {
  const t = ends('climax');
  const loc = site([29, 29, 29, 29], [31, 33, 35, 37]);
  const at245 = ctx({ location: loc });
  for (const s of ['chip', 'row']) assert.deepEqual(futureMarks(t, at245, s), [{ kind: 'future', key: 'future.mark.heat', vars: { period: '2071–2099' }, severity: 'note', state: 'outside' }], s);
  for (const s of ['add', 'details']) assert.deepEqual(futureMarks(t, at245, s), [{ kind: 'future', key: 'future.long.heat', vars: { period: '2071–2099', scenario: 'SSP2-4.5', agree: 3, of: 4 }, severity: 'note', state: 'outside' }], s);
  const dry = futureMarks(withArid(0.5), ctx({ location: site([29, 33, 34, 35], undefined, { arid: [0.4, 0.4, 0.4, 0.4] }) }), 'chip');
  assert.equal(dry[0].key, 'future.mark.both');
  const edge = ctx({ location: loc, scenario: 'ssp126' });
  assert.deepEqual(futureMarks(t, edge, 'chip'), []);
  assert.deepEqual(futureMarks(t, edge, 'details'), [{ kind: 'future', key: 'future.long.edge', vars: { period: '2071–2099', scenario: 'SSP1-2.6' }, severity: 'note', state: 'edge' }]);
  assert.deepEqual(futureMarks(t, ctx({ location: site([29, 29, 29, 29]) }), 'details'), [], 'inside: no mark');
  assert.deepEqual(futureMarks(t, ctx({ location: null }), 'details'), [], 'no location: nothing');
  assert.deepEqual(futureMarks(t, ctx({ location: lyon }), 'details'), [], 'no projections: no mark (the panel says "not checked")');
  assert.equal('futureMarks' in core, false, 'not exported from index.ts, so out of the first run');
});

test('store.scenario starts at SSP2-4.5; FutureSlot.tsx stays a shell; the panel is the future chunk with the scenario radios', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  assert.equal(store.scenario.value, 'ssp245');
  assert.deepEqual(core.scenarios, ['ssp126', 'ssp245', 'ssp370', 'ssp585']);
  assert.equal(core.DEFAULT_SCENARIO, 'ssp245');
  assert.match(view('FutureSlot.tsx'), /return location\.value \? <panel\.View \/> : null;/, 'a shell: the panel loads only with a location');
  assert.match(view('FutureSlot.tsx'), /import\('\.\/future\/future\.tsx'\)/, 'its content is the future feature chunk');
  const panel = view('future/future.tsx');
  assert.match(panel, /data-future-summary/);
  assert.match(panel, /data-future=\{[^}]*'not-checked'\}/);
  assert.match(panel, /name="ct-scenario"/, 'the scenario control: a radio of four');
  assert.match(panel, /scenario\.value = /, 'the panel writes store.scenario');
});
