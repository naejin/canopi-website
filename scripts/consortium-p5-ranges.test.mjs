// P5 climate ranges (owner decision row "Climate ranges fixed before the P5 push", 2026-11-12): the
// zone the site cell's own mean temperatures give (site-climate.ts), the winter-chill rule for the
// mild-winter side (range.ts), annuals beyond the heat range advised to the cool season (range.ts,
// future.ts and their marks), and drought tolerance Medium on a dry site (site.ts, site-marks.ts).
// Site values from the grower diagnosis (canopi-climate 0.2.0 `lookup`, historical slot); plant rows
// from the real export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ctx, lyon, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const sc = await import('../src/lib/consortium/site-climate.ts');
const { rangeMarks } = await import('../src/lib/consortium/range-marks.ts');
const { futureMarks } = await import('../src/lib/consortium/future-marks.ts');
const { siteMarks } = await import('../src/lib/consortium/site-marks.ts');
const { markProviders } = await import('../src/lib/consortium/mark-providers.ts');
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');

// A lookup whose today slot is given (Lyon's regions unless replaced).
const lookupAt = (period, regions = lyon.lookup.regions) => ({
  ...lyon.lookup, regions,
  climate: { ...lyon.lookup.climate, periods: [{ period: '1991-2020', scenario: 'historical', koppenTemperatureMarginC: 0, aridityIndex: 1, ...period }] },
});
const siteAt = (period) => ({ lat: 0, lon: 0, source: 'map', lookup: lookupAt(period, { wgsrpdL3: null, isoA2: null }) });

// The diagnosis' cells (historical slot, cell centre).
const NAIROBI = { koppen: 'Aw', koppenTemperatureMarginC: 0.4, tminColdC: 12.3, tmaxWarmC: 26.5, tmeanColdC: 17.6, tmeanWarmC: 21.1, aridityIndex: 1.02 };
const MANAUS = { koppen: 'Af', tminColdC: 24.0, tmaxWarmC: 31.2, tmeanColdC: 26.7, tmeanWarmC: 28.3, aridityIndex: 1.3 };
const SINGAPORE = { koppen: 'Af', tminColdC: 24.7, tmaxWarmC: 29.2, tmeanColdC: 26.4, tmeanWarmC: 27.9, aridityIndex: 1.39 };
const SEVILLE = { koppen: 'Csa', tminColdC: 5.8, tmaxWarmC: 34.8, tmeanColdC: 11.0, tmeanWarmC: 27.8, aridityIndex: 0.58 };

const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
const real = createSqliteSource(opened.db, { images: {} });
const all = [...await real.pool('Tropical'), ...await real.pool('Mediterranean'), ...await real.pool('Temperate')];
const plant = (name) => { const t = all.find((x) => x.canonical_name === name); assert.ok(t, name); return t; };

// ---- 1. the zone the cell's own mean temperatures give ----

test('siteClimate: Nairobi (stored Aw, coldest-month mean 17.6 °C) proposes the zone its means give, Cwb → Subtropical, borderline with Tropical', () => {
  const s = sc.siteClimate(lookupAt(NAIROBI, { wgsrpdL3: 'KEN', isoA2: 'KE' }));
  assert.deepEqual({ ...s, today: null }, { state: 'borderline', today: null, zone: 'Subtropical', near: 'Tropical', suggested: 'Subtropical', koppen: 'Cwb', mapKoppen: 'Aw' });
  assert.equal(sc.MEANS_MARGIN_C, 2);
});

test('siteClimate: a class disagreeing with its means by more than the margin proposes the means\' zone, not borderline', () => {
  const s = sc.siteClimate(lookupAt({ koppen: 'Af', koppenTemperatureMarginC: 3, tminColdC: 10, tmaxWarmC: 24, tmeanColdC: 15, tmeanWarmC: 19 }));
  assert.deepEqual({ ...s, today: null }, { state: 'ready', today: null, zone: 'Temperate', near: null, suggested: 'Temperate', koppen: 'Cfb', mapKoppen: 'Af' });
});

test('siteClimate: the means across the other bounds (C/D at 0 °C, Cfa/Cfb at 22 °C, C to A at 18 °C)', () => {
  const dfb = sc.siteClimate(lookupAt({ koppen: 'Dfb', koppenTemperatureMarginC: 0.8, tminColdC: -4, tmaxWarmC: 24, tmeanColdC: 0.8, tmeanWarmC: 19 }));
  assert.deepEqual([dfb.state, dfb.koppen, dfb.suggested, dfb.near], ['borderline', 'Cfb', 'Temperate', 'Continental']);
  const cfa = sc.siteClimate(lookupAt({ koppen: 'Cfa', koppenTemperatureMarginC: 0.6, tminColdC: 1, tmaxWarmC: 27, tmeanColdC: 5, tmeanWarmC: 21.4 }));
  assert.deepEqual([cfa.state, cfa.koppen, cfa.suggested, cfa.near], ['borderline', 'Cfb', 'Temperate', 'Subtropical']);
  const cw = sc.siteClimate(lookupAt({ koppen: 'Cwa', koppenTemperatureMarginC: 1, tminColdC: 14, tmaxWarmC: 33, tmeanColdC: 19, tmeanWarmC: 28 }));
  assert.deepEqual([cw.state, cw.koppen, cw.suggested, cw.near], ['borderline', 'Aw', 'Tropical', 'Subtropical']);
});

test('siteClimate: a disagreement that changes no zone, or a class the means cannot set (B, E), keeps the stored class (borderline, nothing across)', () => {
  const same = sc.siteClimate(lookupAt({ koppen: 'Cfb', koppenTemperatureMarginC: 0.3, tminColdC: 0, tmaxWarmC: 22, tmeanColdC: 5, tmeanWarmC: 17 }));
  assert.deepEqual([same.state, same.koppen, same.mapKoppen, same.near, same.suggested], ['borderline', 'Cfb', null, null, 'Temperate']);
  const arid = sc.siteClimate(lookupAt({ koppen: 'BSh', koppenTemperatureMarginC: 0.5, tminColdC: 10, tmaxWarmC: 38, tmeanColdC: 17, tmeanWarmC: 32 }));
  assert.deepEqual([arid.koppen, arid.mapKoppen, arid.suggested], ['BSh', null, 'Arid']);
  const consistent = sc.siteClimate(lookupAt(MANAUS));
  assert.deepEqual([consistent.state, consistent.koppen, consistent.mapKoppen, consistent.suggested], ['ready', 'Af', null, 'Tropical'], 'consistent: as before');
});

test('location line: names the class the means give and the map class when they differ', () => {
  const src = view('location/location.tsx');
  assert.match(src, /koppen: sc\.koppen/, 'the why line names the class the zone comes from');
  assert.match(src, /'location\.means'/);
  assert.match(src, /'location\.meansNear'/);
});

// ---- 2. the mild-winter side only for plants that can need winter chill ----

test('rangeCheck: lowland tropical plants are never "edge" from warm winters (cacao and cassava at Manaus and Singapore)', () => {
  assert.equal(core.CHILL_CEILING_C, 12.5);
  for (const [where, s] of [['Manaus', MANAUS], ['Singapore', SINGAPORE]]) {
    for (const name of ['Theobroma cacao', 'Manihot esculenta']) {
      const c = core.rangeCheck(plant(name), siteAt(s));
      assert.equal(c.sides.includes('mild'), false, `${name} at ${where}: no mild side`);
      assert.equal(c.verdict, 'inside', `${name} at ${where}`);
    }
  }
});

test('rangeCheck: a plant that can need winter chill keeps the mild-winter side (apple at Nairobi: Q95 4.4 °C)', () => {
  const apple = plant('Malus domestica');
  assert.equal(core.canNeedChill(apple), true);
  assert.equal(core.canNeedChill(plant('Theobroma cacao')), false);
  assert.deepEqual(core.rangeCheck(apple, siteAt(NAIROBI)).beyond, ['mild']);
  assert.equal(core.canNeedChill(taxon({ climate: { ...taxon().climate, tminCold: { low: 0, median: 6, high: null, count: 1, basis: 'observed_cells' } } })), false, 'no recorded Q95: nothing to compare');
});

// ---- 3. annuals beyond the heat range: the cool season ----

test('rangeCheck: an annual beyond its heat range stays, advised to the cool season (lettuce at Seville: 34.8 vs Q95 32.1)', () => {
  const lettuce = plant('Lactuca sativa');
  const s = siteAt(SEVILLE);
  assert.deepEqual(core.rangeCheck(lettuce, s), { verdict: 'inside', sides: [], beyond: [], aridity: 'inside', coolSeason: true });
  assert.deepEqual(core.withinRange([lettuce], s), [lettuce]);
  const marks = (surface) => rangeMarks(lettuce, ctx({ location: s }), surface).map((m) => [m.kind, m.key, m.severity]);
  assert.deepEqual(marks('row'), [['season', 'range.coolSeasonShort', 'note']], 'a short tag on rows, instead of "warm-season annual"');
  assert.deepEqual(marks('add'), [['season', 'range.coolSeasonShort', 'note']]);
  assert.deepEqual(marks('details'), [['season', 'range.coolSeason', 'note']], 'the full sentence in Details');
  assert.deepEqual(marks('chip'), []);
  // Within the margin: still the edge, as for any plant.
  const near = core.rangeCheck(lettuce, siteAt({ ...SEVILLE, tmaxWarmC: 33 }));
  assert.deepEqual([near.verdict, near.sides, near.coolSeason], ['edge', ['hot'], false]);
  // A perennial with the same range is still outside.
  assert.equal(core.rangeFit({ ...lettuce, traits: { ...lettuce.traits, is_annual: false } }, s), 'outside');
});

// A site whose future slots are all hot (today 25 °C).
const slot = (period, scenario, tmaxWarmC) => ({ period, scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 0, tmaxWarmC, tmeanColdC: 3, tmeanWarmC: 18, aridityIndex: 1 });
const hotFuture = { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods: [slot('1991-2020', 'historical', 25), ...core.scenarios.map((s) => slot('2041-2070', s, 36)), ...core.scenarios.map((s) => slot('2071-2099', s, 38))] } } };

test('futureCheck: an annual "too hot by …" becomes the cool-season advice, not a loss', () => {
  const annual = taxon({ traits: { is_annual: true }, phases: { start: 'placenta_i', end: 'secondary_i', sources: [] } });
  const c = core.futureCheck(annual, hotFuture, 'ssp245');
  assert.deepEqual(c, { period: '2041-2070', verdict: 'inside', why: [], already: [], agree: 4, of: 4, coolSeason: true });
  const sum = core.futureSummary([annual], hotFuture, 'ssp245');
  assert.deepEqual(sum.periods[0].outside, []);
  assert.deepEqual(sum.periods[0].heat, []);
  const at = ctx({ location: hotFuture });
  assert.deepEqual(futureMarks(annual, at, 'row'), [], 'not a loss on rows');
  assert.deepEqual(futureMarks(annual, at, 'add').map((m) => [m.kind, m.key, m.vars.period]), [['season', 'future.coolSeason', '2041–2070']]);
  // A perennial is still too hot.
  const perennial = taxon({ phases: { start: 'placenta_i', end: 'secondary_i', sources: [] } });
  assert.deepEqual(core.futureCheck(perennial, hotFuture, 'ssp245').why, ['heat']);
  assert.equal(core.futureCheck(perennial, hotFuture, 'ssp245').coolSeason, false);
});

// ---- 4. drought tolerance Medium on a dry site ----

const DRY = { light: 'unsure', soil: 'unsure', water: 'dry', room: 'unsure' };
test('fits: on a dry site, drought tolerance Medium fits with a watering note; None and Low stay misfits', () => {
  const medium = taxon({ traits: { drought_tolerance: 'Medium' } });
  assert.deepEqual(core.fits(medium, DRY).reasons, [{ key: 'water', verdict: 'fit', trait: 'drought_tolerance', note: 'dry_months' }]);
  assert.equal(core.fits(taxon({ traits: { drought_tolerance: 'None' } }), DRY).verdict, 'misfit');
  assert.equal(core.fits(taxon({ traits: { drought_tolerance: 'Low' } }), DRY).verdict, 'misfit');
  assert.deepEqual(core.fits(taxon({ traits: { drought_tolerance: 'High' } }), DRY).reasons, [{ key: 'water', verdict: 'fit', trait: 'drought_tolerance' }]);
  assert.equal(core.fits(medium, { ...DRY, water: 'average' }).reasons.length, 0);
});

test('siteMarks: "Needs watering in the dry months" (short on rows and Add, full in Details), with or without a location; marks load for a dry site', () => {
  const lemon = plant('Citrus limon');
  const c = { ...ctx(), site: DRY };
  const marks = (surface) => siteMarks(lemon, c, surface).map((m) => [m.kind, m.key, m.severity]);
  assert.deepEqual(marks('row'), [['water', 'water.dryMonthsShort', 'note']]);
  assert.deepEqual(marks('add'), [['water', 'water.dryMonthsShort', 'note']]);
  assert.deepEqual(marks('details'), [['water', 'water.dryMonths', 'note']]);
  assert.deepEqual(marks('chip'), []);
  assert.deepEqual(siteMarks(lemon, { ...c, site: { ...DRY, water: 'average' } }, 'row'), []);
  assert.ok(markProviders.includes(siteMarks));
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: DRY }, ['Temperate']), true);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: { ...DRY, water: 'average' } }, ['Temperate']), false);
});

// ---- the seam for the warmth bound: one list of range variables ----

test('range variables: the export variables the source reads and the bounds the rule checks are listed once', async () => {
  const types = await import('../src/lib/consortium/types.ts');
  assert.deepEqual(Object.keys(types.RANGE_VARIABLES), ['tmin_cold', 'tmax_warm', 'aridity']);
  assert.deepEqual(core.RANGE_BOUNDS.map((b) => b.side), ['cold', 'mild', 'hot']);
  const source = readFileSync(new URL('../src/islands/consortium/data/sqlite-source.ts', import.meta.url), 'utf8');
  assert.match(source, /RANGE_VARIABLES/);
  assert.doesNotMatch(source, /'tmin_cold', 'tmax_warm'/, 'no second list in the SQL');
});
