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
function site(mid, late = mid, { arid = [1, 1, 1, 1], tmin = 0, today = { tmax: 25, arid: 1 } } = {}) {
  const periods = today ? [slot('1991-2020', 'historical', today.tmax, today.arid)] : [];
  core.scenarios.forEach((s, i) => periods.push(slot('2041-2070', s, mid[i], arid[i], tmin)));
  core.scenarios.forEach((s, i) => periods.push(slot('2071-2099', s, late[i], arid[i], tmin)));
  return { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods } } };
}
// The fixture plant: Q95 of the warmest-month maximum 30 °C, so too hot beyond 32 °C; no aridity range.
const ends = (end) => taxon({ phases: { start: 'placenta_i', end, sources: [] } });
const withArid = (low) => taxon({ climate: { ...taxon().climate, aridity: { low, median: 1, high: 2, count: 200, basis: 'observed_cells' } } });
const check = (period, verdict, why, already, agree, of, coolSeason = false) => ({ period, verdict, why, already, agree, of, coolSeason });

test('futurePeriod: the latest period the phases reach (phase_end ≥ 3 → 2041–2070; climax → 2071–2099); short-lived plants and unplaced ones none', () => {
  assert.deepEqual(core.futurePeriods, ['2041-2070', '2071-2099']);
  for (const [end, want] of [['placenta_i', null], ['placenta_iii', null], ['secondary_i', '2041-2070'], ['secondary_iii', '2041-2070'], ['climax', '2071-2099']]) assert.equal(core.futurePeriod(ends(end)), want, end);
  assert.equal(core.futurePeriod(taxon({ phases: null })), null);
  assert.equal(core.RANGE_MARGIN_C, 2, 'the margin of today\'s range check (owner answer 2), which future.ts uses through range.ts passes');
  assert.equal('hasFutureData' in core, false, 'internal');
});

test('futureCheck: too hot beyond Q95 + 2 °C, near the edge between Q95 and the margin, the chosen period; agreement: outside for a shown reason, else not outside', () => {
  const t = ends('secondary_iii'); // 2041–2070
  assert.deepEqual(core.futureCheck(t, site([31, 32.5, 33, 34]), 'ssp245'), check('2041-2070', 'outside', ['heat'], [], 3, 4));
  assert.deepEqual(core.futureCheck(t, site([31, 32.5, 33, 34]), 'ssp126'), check('2041-2070', 'edge', [], [], 1, 4), 'stays within in 1 of 4: the others are outside');
  // Inside with the others near the edge: all 4 stay within (never "1 of 4").
  assert.deepEqual(core.futureCheck(t, site([31, 29.5, 31, 31.5]), 'ssp245'), check('2041-2070', 'inside', [], [], 4, 4));
  assert.equal(core.futureCheck(t, site([31, 32, 33, 34]), 'ssp245').verdict, 'edge', 'exactly Q95 + 2 °C is still within the margin');
  // A climax plant is checked at 2071–2099 only.
  assert.deepEqual(core.futureCheck(ends('climax'), site([29, 29, 29, 29], [31, 33, 35, 37]), 'ssp245'), check('2071-2099', 'outside', ['heat'], [], 3, 4));
  assert.equal(core.futureCheck(ends('secondary_i'), site([29, 29, 29, 29], [40, 40, 40, 40]), 'ssp245').verdict, 'inside', 'a plant gone by climax is not checked at 2071–2099');
});

test('futureCheck: too dry below the aridity Q05 (no edge band); both reasons; agreement on a shown reason only; warm winters left out', () => {
  assert.deepEqual(core.futureCheck(withArid(0.5), site([29, 29, 29, 29], undefined, { arid: [0.6, 0.45, 0.4, 0.3] }), 'ssp245'), check('2071-2099', 'outside', ['arid'], [], 3, 4));
  assert.deepEqual(core.futureCheck(withArid(0.5), site([29, 33, 34, 35], undefined, { arid: [0.4, 0.4, 0.4, 0.4] }), 'ssp245').why, ['heat', 'arid']);
  // Too dry under SSP2-4.5; SSP1-2.6 is outside only for heat, which is not the shown reason: 3 of 4.
  assert.deepEqual(core.futureCheck(withArid(0.5), site([33, 29, 29, 29], undefined, { arid: [0.6, 0.4, 0.4, 0.4] }), 'ssp245'), check('2071-2099', 'outside', ['arid'], [], 3, 4));
  // The fixture plant's coldest-month Q95 is 2.5 °C: a winter at 15 °C is warmer than anywhere it is recorded, and not a failure.
  assert.equal(core.futureCheck(ends('climax'), site([29, 29, 29, 29], undefined, { tmin: 15 }), 'ssp245').verdict, 'inside');
});

test('futureCheck: a reason must be a change from today; a plant already beyond the bound today is "already", not outside by the period', () => {
  const hot = { tmax: 33, arid: 1 }, dry = { tmax: 25, arid: 0.4 };
  assert.deepEqual(core.futureCheck(ends('climax'), site([34, 34, 34, 34], undefined, { today: hot }), 'ssp245'), check('2071-2099', 'already', [], ['heat'], 4, 4));
  assert.deepEqual(core.futureCheck(withArid(0.5), site([29, 29, 29, 29], undefined, { arid: [0.3, 0.3, 0.3, 0.3], today: dry }), 'ssp245'), check('2071-2099', 'already', [], ['arid'], 4, 4));
  // Too hot today, and newly too dry: outside for the new reason only.
  assert.deepEqual(core.futureCheck(withArid(0.5), site([34, 34, 34, 34], undefined, { arid: [0.4, 0.4, 0.4, 0.4], today: hot }), 'ssp245'), check('2071-2099', 'outside', ['arid'], ['heat'], 4, 4));
  // No today slot: nothing is known to be already beyond.
  assert.deepEqual(core.futureCheck(ends('climax'), site([34, 34, 34, 34], undefined, { today: null }), 'ssp245'), check('2071-2099', 'outside', ['heat'], [], 4, 4));
  // Near the edge today (Q95 + 1), past the margin by the period (Q95 + 3): a change, so outside for heat.
  assert.deepEqual(core.futureCheck(ends('climax'), site([33, 33, 33, 33], undefined, { today: { tmax: 31, arid: 1 } }), 'ssp245'), check('2071-2099', 'outside', ['heat'], [], 4, 4));
  // Already too dry today, near the heat edge by the period: the edge still shows, with the dry suffix.
  assert.deepEqual(core.futureCheck(withArid(0.5), site([31, 31, 31, 31], undefined, { arid: [0.4, 0.4, 0.4, 0.4], today: dry }), 'ssp245'), check('2071-2099', 'edge', [], ['arid'], 4, 4));
});

test('futureCheck: null ("not checked") without a site, without projections, without a range, or with nothing to compare', () => {
  const t = ends('climax');
  assert.equal(core.futureCheck(t, null, 'ssp245'), null);
  assert.equal(core.futureCheck(t, { ...lyon, lookup: null }, 'ssp245'), null, 'the lookup still loading or failed');
  assert.equal(core.futureCheck(t, { ...lyon, lookup: { ...lyon.lookup, climate: null } }, 'ssp245'), null, 'open sea');
  assert.equal(core.futureCheck(t, lyon, 'ssp245'), null, 'today only: no future slot');
  assert.equal(core.futureCheck(taxon({ climate: null }), site([40, 40, 40, 40]), 'ssp245'), null, 'range not recorded');
  assert.equal(core.futureCheck(ends('placenta_iii'), site([40, 40, 40, 40]), 'ssp245'), null, 'short-lived: today\'s climate only');
  const noHeat = taxon({ climate: { ...taxon().climate, tmaxWarm: null, aridity: { low: 0.5, median: 1, high: 2, count: 9, basis: 'observed_cells' } } });
  assert.equal(core.futureCheck(noHeat, site([40, 40, 40, 40], undefined, { arid: [null, null, null, null] }), 'ssp245'), null, 'no warmest-month range, and no aridity on ice');
  assert.equal(core.futureCheck(noHeat, site([40, 40, 40, 40], undefined, { arid: [0.4, 0.6, 0.6, 0.6] }), 'ssp245').verdict, 'inside');
  // A missing slot drops out of the agreement; the chosen scenario's own slot missing is "not checked".
  const three = site([33, 33, 33, 33]);
  three.lookup.climate.periods = three.lookup.climate.periods.filter((p) => p.scenario !== 'ssp585');
  assert.deepEqual(core.futureCheck(t, three, 'ssp245'), check('2071-2099', 'outside', ['heat'], [], 3, 3));
  assert.equal(core.futureCheck(t, three, 'ssp585'), null);
  assert.equal(core.scenarioName('ssp245'), 'SSP2-4.5');
  assert.equal(core.scenarioName('ssp585'), 'SSP5-8.5');
  assert.equal(core.periodName('2041-2070'), '2041–2070');
});

test('futureSummary: one entry per member; per period n of m by reason; already outside today, short-lived and unchecked apart, so the counts add up', () => {
  const s = site([33, 33, 33, 33], [29, 29, 29, 29], { arid: [0.4, 0.4, 0.4, 0.4] });
  const a = { ...ends('secondary_ii'), id: 'a' }; // 2041–2070, too hot
  const b = { ...withArid(0.5), id: 'b' }; // climax: 2071–2099, too dry
  const c = { ...ends('climax'), id: 'c' }; // 2071–2099, inside
  const d = { ...ends('placenta_ii'), id: 'd' }; // today only
  const e = { ...taxon({ climate: null }), id: 'e' }; // not checked
  const f = { ...withArid(1.5), id: 'f' }; // climax, already too dry today (1 < 1.5)
  const sum = core.futureSummary([a, b, c, d, e, f], s, 'ssp245');
  assert.equal(sum.available, true);
  assert.deepEqual(sum.periods, [
    { period: '2041-2070', checked: ['a'], outside: ['a'], heat: ['a'], arid: [] },
    { period: '2071-2099', checked: ['b', 'c'], outside: ['b'], heat: [], arid: ['b'] },
  ]);
  assert.deepEqual(sum.already, { heat: [], arid: ['f'] });
  assert.deepEqual(sum.todayOnly, ['d']);
  assert.deepEqual(sum.notChecked, ['e']);
  assert.deepEqual(Object.keys(sum.checks).sort(), ['a', 'b', 'c', 'f']);
  assert.equal(sum.checks.f.verdict, 'already');
  const none = core.futureSummary([a, b], lyon, 'ssp245');
  assert.equal(none.available, false);
  assert.deepEqual(none.periods, []);
  assert.deepEqual(none.notChecked, ['a', 'b']);
});

// ---- the installed export: whole lists through the panel's own summary (no range pre-filter; when
// S5c's range.ts lands the panel sees the filtered pool's members, a merge follow-up) ----

const ROOT = new URL('../', import.meta.url);
const index = JSON.parse(readFileSync(new URL('src/data/consortium-index.json', ROOT), 'utf8'));
const realFile = new URL(`public${index.files[0].url}`, ROOT);
let pools = null;
async function realPools() {
  if (pools) return pools;
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(realFile))), { releaseId: index.release_id, climates: index.climates });
  const src = createSqliteSource(real.db, { images: index.images });
  pools = Object.fromEntries(await Promise.all(['Temperate', 'Tropical', 'Mediterranean'].map(async (c) => [c, await src.pool(c)])));
  return pools;
}
const counts = (sum) => ({
  ...Object.fromEntries(sum.periods.map((p) => [p.period, { n: p.outside.length, m: p.checked.length, heat: p.heat.length, arid: p.arid.length }])),
  already: { heat: sum.already.heat.length, arid: sum.already.arid.length }, todayOnly: sum.todayOnly.length, notChecked: sum.notChecked.length,
});

// Cross-checked with an independent sqlite3 count of the same rule (whole lists of 200). Reasons count
// only as changes from today: at Lyon 5 of the 7 plants too dry by 2041–2070 are already too dry today, and
// one of those is near the heat edge by then, so it is checked (edge, with the dry suffix), not grouped as already.
// An annual too hot is advised to the cool season, never "too hot" nor "already" (decision row "Climate ranges
// fixed before the P5 push"): at Lyon Chenopodium bonus-henricus (stored annual, phases to secondary_i) moved
// from already-too-hot to checked within 2041–2070, and at Seville Medicago sativa likewise.
const EXPECT = {
  lyon: { '2041-2070': { n: 23, m: 94, heat: 21, arid: 2 }, '2071-2099': { n: 17, m: 33, heat: 17, arid: 0 }, already: { heat: 4, arid: 4 }, todayOnly: 65, notChecked: 0 },
  manaus: { '2041-2070': { n: 2, m: 110, heat: 0, arid: 2 }, '2071-2099': { n: 1, m: 31, heat: 0, arid: 1 }, already: { heat: 0, arid: 0 }, todayOnly: 59, notChecked: 0 },
  seville: { '2041-2070': { n: 49, m: 65, heat: 29, arid: 32 }, '2071-2099': { n: 14, m: 14, heat: 13, arid: 8 }, already: { heat: 50, arid: 49 }, todayOnly: 71, notChecked: 0 },
  oslo: { '2041-2070': { n: 0, m: 102, heat: 0, arid: 0 }, '2071-2099': { n: 0, m: 33, heat: 0, arid: 0 }, already: { heat: 0, arid: 0 }, todayOnly: 65, notChecked: 0 },
};

test('real export, SSP2-4.5: whole lists through futureSummary (Lyon Temperate, Manaus Tropical, Seville Mediterranean, Oslo Temperate)', { skip: !existsSync(realFile) && 'no real install' }, async () => {
  const p = await realPools();
  const run = (list, name) => counts(core.futureSummary(p[list], at(name), 'ssp245'));
  assert.deepEqual(run('Temperate', 'lyon'), EXPECT.lyon);
  assert.deepEqual(run('Tropical', 'manaus'), EXPECT.manaus);
  assert.deepEqual(run('Mediterranean', 'seville'), EXPECT.seville);
  assert.deepEqual(run('Temperate', 'oslo'), EXPECT.oslo);
  for (const [list, name] of [['Temperate', 'lyon'], ['Mediterranean', 'seville']]) {
    const sum = core.futureSummary(p[list], at(name), 'ssp245');
    const total = sum.periods.reduce((n, x) => n + x.checked.length, 0) + sum.todayOnly.length + sum.notChecked.length + new Set([...sum.already.heat, ...sum.already.arid]).size;
    assert.equal(total, p[list].length, `${name}: the counts add up to the list`);
  }
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
  assert.deepEqual(futureMarks(t, edge, 'details'), [{ kind: 'future', key: 'future.long.edge', vars: { period: '2071–2099', scenario: 'SSP1-2.6', agree: 1, of: 4 }, severity: 'note', state: 'edge' }]);
  const hotToday = ctx({ location: site([34, 34, 34, 34], undefined, { today: { tmax: 33, arid: 1 } }) });
  for (const s of core.markSurfaces) assert.deepEqual(futureMarks(t, hotToday, s), [], `already outside today: today's range mark (S5c) says it, not the future mark (${s})`);
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
