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
const HARBIN = { koppen: 'Dwa', tminColdC: -24.1, tmaxWarmC: 27.3, tmeanColdC: -17.8, tmeanWarmC: 23.8, aridityIndex: 0.83 };
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
  assert.equal(core.CHILL_CEILING_C, 18, 'the export\'s rule (canopi-data docs/plant-climate-ranges.md): a winter-chill plant has tmin_cold Q95 below 18 °C');
  for (const [where, s] of [['Manaus', MANAUS], ['Singapore', SINGAPORE]]) {
    for (const name of ['Theobroma cacao', 'Manihot esculenta']) {
      const c = core.rangeCheck(plant(name), siteAt(s));
      assert.equal(c.sides.includes('mild'), false, `${name} at ${where}: no mild side`);
      assert.equal(c.verdict, 'inside', `${name} at ${where}`);
    }
  }
});

test('rangeCheck: a plant that can need winter chill keeps the mild-winter side (apple at Nairobi: high 8.4 °C; a disputed (weak) row on r-b958a4239cc68f73 is a bound as any other)', () => {
  const apple = plant('Malus domestica');
  assert.equal(core.canNeedChill(apple), true);
  assert.equal(core.canNeedChill(plant('Theobroma cacao')), false);
  const c = core.rangeCheck(apple, siteAt(NAIROBI));
  assert.deepEqual([c.verdict, c.beyond, apple.climate.tminCold.weak], ['outside', ['mild'], true], 'a weak row never softens the verdict');
  assert.equal(core.canNeedChill(taxon({ climate: { ...taxon().climate, tminCold: { low: 0, median: 6, high: null, count: 1, basis: 'thinned_cells', blocks: 30, lowSource: null, highSource: null, weak: false } } })), false, 'no recorded Q95: nothing to compare');
});

// ---- 3. annuals beyond the heat range: the cool season ----

test('rangeCheck: an annual beyond its heat range stays, advised to the cool season (Good-King-Henry, recorded annual, at Seville: 34.8 vs heat limit 30.2)', () => {
  const annual = plant('Chenopodium bonus-henricus');
  const s = siteAt(SEVILLE);
  assert.deepEqual(core.rangeCheck(annual, s), { verdict: 'inside', sides: [], beyond: [], aridity: 'drier', coolSeason: true });
  assert.deepEqual(core.withinRange([annual], s), [annual]);
  // (Seville is also drier than where it is recorded: that mark is its own kind, left out here.)
  const marks = (surface) => rangeMarks(annual, ctx({ location: s }), surface).filter((m) => m.kind !== 'aridity').map((m) => [m.kind, m.key, m.severity]);
  assert.deepEqual(marks('row'), [['season', 'range.coolSeasonShort', 'note']], 'a short tag on rows, instead of "warm-season annual"');
  assert.deepEqual(marks('add'), [['season', 'range.coolSeasonShort', 'note']]);
  assert.deepEqual(marks('details'), [['season', 'range.coolSeason', 'note']], 'the full sentence in Details');
  assert.deepEqual(marks('chip'), []);
  // Within the margin: still the edge, as for any plant.
  const near = core.rangeCheck(annual, siteAt({ ...SEVILLE, tmaxWarmC: 31.5 }));
  assert.deepEqual([near.verdict, near.sides, near.coolSeason], ['edge', ['hot'], false]);
  // A perennial with the same range is still outside.
  assert.equal(core.rangeFit({ ...annual, traits: { ...annual.traits, is_annual: false } }, s), 'outside');
});

// A site whose future slots are all hot (today 25 °C).
const slot = (period, scenario, tmaxWarmC) => ({ period, scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 0, tmaxWarmC, tmeanColdC: 3, tmeanWarmC: 18, aridityIndex: 1 });
const hotFuture = { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods: [slot('1991-2020', 'historical', 25), ...core.scenarios.map((s) => slot('2041-2070', s, 36)), ...core.scenarios.map((s) => slot('2071-2099', s, 38))] } } };

test('futureCheck: an annual "too hot by …" becomes the cool-season advice, not a loss', () => {
  const annual = taxon({ traits: { is_annual: true }, phases: { start: 'placenta_i', end: 'secondary_i', sources: [] } });
  const c = core.futureCheck(annual, hotFuture, 'ssp245');
  assert.deepEqual(c, { period: '2041-2070', verdict: 'inside', why: [], already: [], agree: 4, of: 4, coolSeason: true, warmEnough: false, drier: false });
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
  // On the island path (review 7): plantMarks adds them with no provider loaded, and a dry site alone
  // never loads the P5 providers chunk (budget row: only with a location or a borrowed climate).
  assert.equal(markProviders.includes(siteMarks), false);
  assert.deepEqual(core.plantMarks(lemon, c, 'row', []).map((m) => m.key), ['water.dryMonthsShort']);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: DRY }, ['Temperate']), false);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: { ...DRY, water: 'average' } }, ['Temperate']), false);
});

// ---- the seam: one list of range variables ----

test('range variables: the export variables the source reads and the bounds the rule checks are listed once', async () => {
  const types = await import('../src/lib/consortium/types.ts');
  assert.deepEqual(Object.keys(types.RANGE_VARIABLES), ['tmin_cold', 'tmax_warm', 'tmean_year', 'tmean_warm', 'aridity']);
  assert.deepEqual(core.RANGE_BOUNDS.map((b) => b.side), ['cold', 'mild', 'cool', 'summer', 'hot']);
  const source = readFileSync(new URL('../src/islands/consortium/data/sqlite-source.ts', import.meta.url), 'utf8');
  assert.match(source, /RANGE_VARIABLES/);
  assert.doesNotMatch(source, /'tmin_cold', 'tmax_warm'/, 'no second list in the SQL');
});

// ---- schema 3 (the ranges rebuild): the year's warmth, weak rows, the export's chill rule ----

// The diagnosis sites (canopi-climate 0.2.0 lookups, all 9 slots; Seville from the future fixture).
const SITES = JSON.parse(readFileSync(new URL('./fixtures/consortium-ranges/sites.json', import.meta.url), 'utf8'));
const at = (name) => { const s = SITES[name]; return { lat: s.lat, lon: s.lon, source: 'map', lookup: { lat: s.lat, lon: s.lon, climate: s.climate, soil: null, regions: { wgsrpdL3: null, isoA2: null } } }; };
const verdict = (name, site) => core.rangeCheck(plant(name), at(site));

test('acceptance (owner diagnosis, export r-60ea417b5a15c3aa, the rows of r-b958a4239cc68f73): each site\'s plants as the growers know them', () => {
  assert.equal(index.release_id, 'r-60ea417b5a15c3aa', 'the schema 3 export with grown_as_annual and tmean_warm is installed');
  for (const name of ['Theobroma cacao', 'Cocos nucifera']) {
    const c = verdict(name, 'nairobi');
    assert.equal(c.verdict, 'outside', `${name} at Nairobi`);
    assert.ok(c.sides.includes('cool'), `${name} at Nairobi: a cool year (year mean 19.35 °C)`);
  }
  for (const name of ['Theobroma cacao', 'Manihot esculenta']) assert.equal(verdict(name, 'manaus').verdict, 'inside', `${name} at Manaus`);
  for (const name of ['Olea europaea', 'Rosmarinus officinalis', 'Prunus dulcis', 'Ficus carica', 'Punica granatum']) assert.equal(verdict(name, 'seville').verdict, 'inside', `${name} at Seville`);
  // Crops grown as annuals (grown_as_annual, review 2): never "winters too mild" (potato tmin_cold high
  // 14.8, carrot 11.2 at Singapore), nor too cold (onion at Harbin, coldest month -24.1 °C).
  for (const name of ['Solanum tuberosum', 'Daucus carota', 'Allium cepa']) assert.equal(core.isAnnual(plant(name)), true, `${name}: grown as an annual`);
  // An annual's summer (tmean_warm low): taro and ginger grown as annuals are "summer too cool" at Rovaniemi.
  for (const name of ['Colocasia esculenta', 'Zingiber officinale']) assert.ok(verdict(name, 'rovaniemi').beyond.includes('summer'), `${name} at Rovaniemi: summer too cool`);
  for (const name of ['Solanum tuberosum', 'Daucus carota']) assert.notEqual(verdict(name, 'singapore').verdict, 'outside', `${name} at Singapore`);
  assert.notEqual(core.rangeFit(plant('Allium cepa'), siteAt(HARBIN)), 'outside', 'onion at Harbin');
  const olive = core.futureCheck(plant('Olea europaea'), at('seville'), 'ssp245');
  assert.equal(olive.period, '2071-2099');
  assert.equal(olive.why.includes('heat'), false, 'olive not too hot at Seville by 2071–2099 (SSP2-4.5)');
  // Walk-through 2 N3: dry-adapted Mediterranean plants were "too dry by 2041–2070" at Seville on aridity
  // alone; drier is a note now ("may need watering"), never outside, as today. (Lavandula latifolia stays
  // too hot there by its heat bound, a data question, not this rule.)
  for (const name of ['Arbutus unedo', 'Santolina chamaecyparissus', 'Phlomis fruticosa', 'Teucrium chamaedrys', 'Rhus coriaria']) {
    const f = core.futureCheck(plant(name), at('seville'), 'ssp245');
    assert.ok(f, `${name}: checked at Seville`);
    assert.notEqual(f.verdict, 'outside', `${name} at Seville by ${f.period}: not outside for dryness`);
  }
  assert.equal(verdict('Ficus carica', 'riyadh').verdict, 'inside', 'fig at Riyadh');
  for (const name of ['Ziziphus jujuba', 'Punica granatum', 'Moringa oleifera']) assert.equal(verdict(name, 'riyadh').verdict, 'edge', `${name} at Riyadh`);
  assert.equal(verdict('Malus domestica', 'minneapolis').verdict, 'inside', 'apple at Minneapolis');
  assert.equal(verdict('Mangifera indica', 'minneapolis').verdict, 'outside', 'mango at Minneapolis');
  assert.equal(verdict('Ficus carica', 'rovaniemi').verdict, 'outside', 'fig at Rovaniemi');
  for (const name of ['Theobroma cacao', 'Manihot esculenta', 'Cocos nucifera', 'Mangifera indica', 'Musa acuminata', 'Carica papaya', 'Artocarpus heterophyllus']) {
    assert.equal(verdict(name, 'singapore').sides.includes('mild'), false, `${name} at Singapore: not "mild"`);
  }
});

// ---- E2 scenario tests (Consortium v2 plan, stream E2; design check A14): plants growers grow at
// the site, written expectations first against the real export. A miss is a todo naming its known
// limit: the rule is not loosened for it (a weak row never softens a verdict, coordinator decision
// 2026-11-12; a wider margin would gut the cold check everywhere). A todo that starts passing shows
// as a passed todo: remove its todo then.

test('E2 sites: Yakutsk is the canopi-climate lookup in the crate\'s lookup.json vectors (historical and future slots), not a hand copy', () => {
  const g = JSON.parse(readFileSync(new URL('./fixtures/climate/lookup.json', import.meta.url), 'utf8')).points.find((p) => p.name === 'Yakutsk');
  const c = g.expect.climate;
  const fromVectors = {
    lat: g.lat, lon: g.lon,
    climate: {
      cellLat: c.cell_lat, cellLon: c.cell_lon, distanceCells: c.distance_cells,
      periods: c.periods.map((p) => ({ period: p.period, scenario: p.scenario, koppen: p.koppen, koppenTemperatureMarginC: p.koppen_temperature_margin_c, tminColdC: p.tmin_cold_c, tmaxWarmC: p.tmax_warm_c, tmeanColdC: p.tmean_cold_c, tmeanWarmC: p.tmean_warm_c, aridityIndex: p.aridity_index })),
    },
  };
  assert.deepEqual(SITES.yakutsk, fromVectors);
  assert.deepEqual([SITES.yakutsk.climate.periods[0].tminColdC, SITES.yakutsk.climate.periods[0].koppen], [-39.8, 'Dfc']);
});

test('E2 scenario setup: the four scenario plants are in the export and Riyadh\'s first future check is 2041–2070 (so a todo never hides a broken setup)', () => {
  assert.ok(verdict('Pinus sylvestris', 'yakutsk'), 'Scots pine checked at Yakutsk');
  for (const name of ['Ficus carica', 'Ziziphus jujuba', 'Punica granatum']) {
    const f = core.futureCheck(plant(name), at('riyadh'), 'ssp245');
    assert.ok(f, `${name}: checked at Riyadh`);
    assert.match(String(f.period), /^2041/, `${name}: first future period`);
  }
});

test('E2 scenario: Scots pine grows at Yakutsk (coldest month −39.8 °C): not outside today', {
  todo: 'known limit: its tmin_cold row is weak (Q05 −31 °C, TreeGOER disputed) and Yakutsk sits 8.8 °C beyond it, as does its tmean_year row; a weak row never softens a verdict (coordinator 2026-11-12) and any margin that clears Yakutsk (≥ 9 °C) guts the cold check, so no rule change; extreme cold bounds: canopi-data D2b/D6',
}, () => {
  const pine = plant('Pinus sylvestris');
  const c = verdict('Pinus sylvestris', 'yakutsk');
  assert.notEqual(c.verdict, 'outside', `Scots pine at Yakutsk: ${c.verdict} (${c.beyond.join(', ')}), tmin_cold row low ${pine.climate.tminCold?.low} weak ${pine.climate.tminCold?.weak}`);
});

for (const name of ['Ficus carica', 'Ziziphus jujuba', 'Punica granatum']) {
  test(`E2 scenario: ${name} at Riyadh (irrigated oases grow it) is not "too hot" by 2041–2070 (SSP2-4.5)`, {
    todo: 'known limit: Riyadh\'s 2041–2070 SSP2-4.5 tmax_warm 44.7 °C passes the plant\'s observed Q95 heat bound (fig 42.6, jujube 41.5, pomegranate 41.3 °C) by more than the 2 °C margin; the observed Q95 is not a physiological limit; fix in F2 (future verdicts and wording) and canopi-data D6/D8 extreme bounds, not in the E2 rule',
  }, () => {
    const t = plant(name);
    const f = core.futureCheck(t, at('riyadh'), 'ssp245');
    assert.ok(f, `${name}: checked at Riyadh`);
    const slot = SITES.riyadh.climate.periods.find((p) => p.period === f.period && p.scenario === 'ssp245');
    // `already` holds reasons that apply today and are dropped from `why`: heat there is still too hot.
    assert.equal(f.why.includes('heat') || f.already.includes('heat'), false, `${name} at Riyadh by ${f.period}: ${f.verdict} (${f.why.join(', ')}), tmax_warm ${slot?.tmaxWarmC} vs heat bound ${t.climate.tmaxWarm?.high}`);
  });
}

test('rangeCheck: the year\'s warmth (tmean_year, the mean of the coldest and warmest months\' means) is a low bound for perennials only', () => {
  const warmth = { low: 21.4, median: 25.2, high: 27.5, count: 499, basis: 'thinned_cells', blocks: 499, lowSource: null, highSource: null, weak: false };
  const tree = taxon({ climate: { ...taxon().climate, tmeanYear: warmth } });
  // Nairobi: (17.6 + 21.1) / 2 = 19.35, 2.05 below 21.4: beyond the margin.
  assert.deepEqual(core.rangeCheck(tree, siteAt(NAIROBI)).beyond.includes('cool'), true);
  const edge = core.rangeCheck(tree, siteAt({ ...NAIROBI, tmeanColdC: 18, tmeanWarmC: 21.2 }));
  assert.deepEqual([edge.sides.includes('cool'), edge.beyond.includes('cool')], [true, false], '19.6: within the margin');
  const annual = taxon({ traits: { is_annual: true }, climate: { ...taxon().climate, tmeanYear: warmth } });
  assert.equal(core.rangeCheck(annual, siteAt(NAIROBI)).sides.includes('cool'), false, 'annuals skip it, as winter cold');
  // Details names it with the values compared.
  const details = rangeMarks(tree, ctx({ location: siteAt(NAIROBI) }), 'details').find((m) => m.state === 'cool');
  assert.deepEqual([details.key, details.vars], ['range.side.cool', { site: 19.35, bound: 21.4 }]);
});

test('rangeMarks: the dispute note follows only a low bound (weak marks a disputed cold or warmth limit; the mild side reads the undisputed high of that row: apple at a mild-winter site)', () => {
  const weakCold = { low: -15.9, median: 2, high: 8.4, count: 40, basis: 'thinned_cells', blocks: 60, lowSource: null, highSource: null, weak: true };
  const apple = taxon({ climate: { ...taxon().climate, tminCold: weakCold } });
  const mildSite = siteAt({ ...SEVILLE, tminColdC: 22, tmeanColdC: 26, tmeanWarmC: 28 });
  const d = rangeMarks(apple, ctx({ location: mildSite }), 'details');
  assert.ok(d.some((m) => m.key === 'range.side.mild'), 'the mild side is shown');
  assert.equal(d.some((m) => m.key === 'range.disputed'), false, 'no dispute note after the undisputed high');
  const coldSite = siteAt({ ...SEVILLE, tminColdC: -30, tmeanColdC: -20, tmeanWarmC: 15 });
  const c = rangeMarks(apple, ctx({ location: coldSite }), 'details');
  const at = c.findIndex((m) => m.key === 'range.side.cold');
  assert.equal(c[at + 1]?.key, 'range.disputed', 'the note follows the disputed low');
});

test('rangeCheck: a weak row (a disputed limit: TreeGOER stricter by more than 4 °C, our looser bound kept) never softens a verdict; Details notes the dispute after that bound (coordinator decision 2026-11-12)', () => {
  const weakHot = { low: 15, median: 22, high: 25, count: 12, basis: 'thinned_cells', blocks: 8, lowSource: null, highSource: null, weak: true };
  const t = taxon({ climate: { ...taxon().climate, tmaxWarm: weakHot } });
  const loc = siteAt({ ...SEVILLE, tminColdC: 0, tmeanColdC: 5, tmeanWarmC: 20 });
  const c = core.rangeCheck(t, loc);
  assert.deepEqual([c.verdict, c.beyond.includes('hot')], ['outside', true], '34.8 against a weak 25: outside, as for any row');
  const d = rangeMarks(t, ctx({ location: loc }), 'details');
  const at = d.findIndex((m) => m.key === 'range.side.hot');
  assert.ok(at >= 0, 'the hot side is shown');
  assert.equal(d.some((m) => m.key === 'range.disputed'), false, 'weak marks a disputed low only: no note after a high (the low-side note: test above)');
  assert.equal(d.some((m) => m.key === 'range.weak'), false, 'no "only the edge" line any more');
  assert.equal(rangeMarks(taxon(), ctx({ location: loc }), 'details').some((m) => m.key === 'range.disputed'), false, 'a firm row: no note');
  const f = core.futureCheck({ ...t, phases: { start: 'placenta_i', end: 'secondary_i', sources: [] } }, hotFuture, 'ssp245');
  assert.equal(f.verdict, 'outside', 'the future heat check: no cap either');
  for (const l of ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']) {
    const tr = JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
    assert.ok(tr['consortium.range.disputed'] && !/\d/.test(tr['consortium.range.disputed']), `${l}: range.disputed, no number`);
    assert.equal(tr['consortium.range.weak'], undefined, `${l}: range.weak removed`);
  }
  assert.doesNotMatch(readFileSync(new URL('../src/lib/consortium/range.ts', import.meta.url), 'utf8'), /\.weak/, 'range.ts reads no weak flag');
});

test('futureCheck: warming that lifts a site out of "too cool" is said, positively, when it changes the verdict', () => {
  const warmth = { low: 20, median: 24, high: 27, count: 400, basis: 'thinned_cells', blocks: 400, lowSource: null, highSource: null, weak: false };
  const tree = taxon({ phases: { start: 'placenta_i', end: 'secondary_i', sources: [] }, climate: { ...taxon().climate, tminCold: null, tmaxWarm: { ...warmth, low: 20, high: 40 }, tmeanYear: warmth } });
  // Today (3 + 18) / 2 = 10.5: too cool; by 2041–2070, slots at 36 °C with means 18/26: 22, warm enough.
  const warm = (p) => ({ ...p, tmeanColdC: 18, tmeanWarmC: 26 });
  const site = { ...hotFuture, lookup: { ...hotFuture.lookup, climate: { ...hotFuture.lookup.climate, periods: hotFuture.lookup.climate.periods.map((p) => p.scenario === 'historical' ? p : warm(p)) } } };
  assert.equal(core.rangeFit(tree, site), 'outside');
  const c = core.futureCheck(tree, site, 'ssp245');
  assert.equal(c.warmEnough, true);
  assert.deepEqual(c.why, []);
  const marks = (surface) => futureMarks(tree, ctx({ location: site }), surface).map((m) => [m.kind, m.key, m.state]);
  assert.deepEqual(marks('details'), [['future', 'future.warmEnough', 'warm']]);
  assert.deepEqual(marks('row'), [['future', 'future.warmEnoughShort', 'warm']]);
  // Still too cool in the projection: no word (only losses are listed, as before).
  const cold = core.futureCheck(tree, hotFuture, 'ssp245');
  assert.equal(cold.warmEnough, false);
});

test('schema 3: the reader and the installer read schema 3, the source reads blocks, sources and weak', async () => {
  const types = await import('../src/lib/consortium/types.ts');
  assert.equal(types.SCHEMA_VERSION, 3);
  const cacao = plant('Theobroma cacao').climate;
  assert.deepEqual(cacao.tmeanYear, { low: 21.3, median: 25.2, high: 27.5, count: cacao.tmeanYear.count, basis: 'thinned_cells', blocks: 499, lowSource: 'treegoer_ranges', highSource: null, weak: false });
  assert.equal(cacao.tmaxWarm.highSource, 'treegoer_ranges');
});

// ---- 5. the room answer is advisory (owner request 2026-11-12): the matrix layers are relative sun
// exposure, not heights, so a tall plant is pruned or replaced, never a misfit ----

const SMALL = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'small' };
const fig = taxon({ id: 'fig', canonical_name: 'Ficus carica', traits: { height_m: { min: 3, max: 12 } } });
const short = taxon({ id: 'short', canonical_name: 'Short tree', traits: { height_m: { min: 2, max: 5 } } });

test('room: a plant taller than the room fits, with the height noted; it never makes a cell a misfit, a flag or an ask', () => {
  const f = core.fits(fig, SMALL);
  assert.equal(f.verdict, 'fit');
  assert.deepEqual(f.misfits, []);
  assert.deepEqual(f.reasons, [{ key: 'room', verdict: 'fit', kind: 'wild_height', meters: 12, limit: 6 }]);
  assert.equal(core.tallerThanRoom(f), true);
  assert.equal(core.tallerThanRoom(core.fits(short, SMALL)), false);
  const m = core.buildMatrix('Temperate', [fig], [], SMALL);
  const cell = m.rows[0].cells[3];
  assert.deepEqual([cell.empty, cell.fitting, cell.inList], [null, 1, 1], 'the emergent cell is free, with the fig counted in "N fit"');
  assert.equal(m.rows.flatMap((r) => r.cells).some((x) => x.empty === 'misfit'), false, 'no cell "can\'t be filled" for the room');
  const flags = core.flagsOf([fig], { site: SMALL, interactions: [] });
  assert.equal(flags.some((x) => x.kind === 'misfit'), false, 'no misfit flag');
  // Light, soil and water still block.
  assert.equal(core.fits(taxon({ traits: { sun: false, height_m: { min: 3, max: 12 } } }), { ...SMALL, light: 'sun' }).verdict, 'misfit');
});

test('room: the suggestion still prefers plants that fit the room naturally (a taller one is never picked automatically)', () => {
  const s = core.suggest([fig, short], { site: SMALL, interactions: [] });
  assert.deepEqual(s.members, ['short']);
  assert.equal(s.limit, core.SIZE_LIMIT.small);
  // Kept by the reader, it stays.
  assert.ok(core.suggest([fig, short], { site: SMALL, interactions: [], kept: ['fig'] }).members.includes('fig'));
});

test('room: the height note ("Grows to 12 m: keep it pruned, or pick a smaller plant") on rows, Add and Details; marks load for a sized room', () => {
  const c = { ...ctx(), site: SMALL };
  const marks = (surface) => siteMarks(fig, c, surface).map((m) => [m.kind, m.key, m.severity, m.vars]);
  assert.deepEqual(marks('row'), [['room', 'room.tallShort', 'note', { m: 12 }]]);
  assert.deepEqual(marks('add'), [['room', 'room.tallShort', 'note', { m: 12 }]]);
  assert.deepEqual(marks('details'), [['room', 'room.tall', 'note', { m: 12 }]]);
  assert.deepEqual(marks('chip'), []);
  assert.deepEqual(siteMarks(short, c, 'details'), []);
  assert.deepEqual(siteMarks(fig, { ...c, site: { ...SMALL, room: 'field' } }, 'details'), []);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: SMALL }, ['Temperate']), false, 'a sized room alone loads no P5 chunk');
  assert.deepEqual(core.plantMarks(fig, c, 'add', []).map((m) => m.key), ['room.tallShort'], 'the note shows without the providers');
  const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  assert.equal(en['consortium.room.tall'], 'Grows to {m} m: keep it pruned, or pick a smaller plant.');
  for (const k of ['consortium.matrix.why.room', 'consortium.misfit.wild.small', 'consortium.misfit.wild.large']) assert.equal(k in en, false, `${k} is gone: room is never a misfit`);
  assert.doesNotMatch(view('details/Details.tsx'), /misfit\.wild/);
  assert.ok(core.markKinds.includes('room'));
});

// ---- 6. annuals (owner, decision row "Growing months" 2026-11-12): a plain "annual" tag, no season
// claimed (the USDA growth period classes 18 of 77 annuals, turnip and rye "warm"); a crop grown as an
// annual (grown_as_annual, schema 3) is an annual everywhere: range, future, marks ----

test('annual marks: a plain "annual" tag and a season-neutral Details note, whatever the growth period says', () => {
  const s = siteAt(SEVILLE);
  const note = (name, surface) => rangeMarks(plant(name), ctx({ location: s }), surface).filter((m) => m.state === 'annual').map((m) => m.key);
  for (const name of ['Zea mays', 'Hordeum vulgare', 'Vicia faba']) {
    assert.deepEqual(note(name, 'row'), ['range.annualShort'], name);
    assert.deepEqual(note(name, 'details'), ['range.annual'], name);
  }
  assert.equal(core.annualSeason, undefined, 'no reading of active_growth_period');
  const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  assert.equal(en['consortium.range.annualShort'], 'annual');
  assert.doesNotMatch(en['consortium.range.annual'], /frost-free|warm season|cool season/);
  for (const k of ['annualCool', 'annualCoolShort', 'annualPlain', 'annualPlainShort']) assert.equal(en[`consortium.range.${k}`], undefined, k);
  assert.equal(en['consortium.range.coolSeason'], 'Too hot in summer here: grow it in the cool season.', 'the heat case stays');
});

test('grown_as_annual: a crop grown as an annual is an annual for the range, the future check and the marks', () => {
  const warm = { ...taxon().climate, tminCold: { low: 2, median: 8, high: 14, count: 90, basis: 'thinned_cells' }, tmaxWarm: { low: 20, median: 26, high: 30, count: 90, basis: 'thinned_cells' }, tmeanYear: null };
  const onion = taxon({ traits: { is_annual: false, grown_as_annual: true }, climate: warm });
  const perennial = taxon({ traits: { is_annual: false, grown_as_annual: false }, climate: warm });
  assert.equal(core.isAnnual(onion), true);
  assert.equal(core.isAnnual(perennial), false);
  const harbin = siteAt({ koppen: 'Dwa', tminColdC: -24, tmaxWarmC: 29, tmeanColdC: -18, tmeanWarmC: 23 });
  assert.equal(core.rangeFit(perennial, harbin), 'outside', 'a perennial: too cold');
  assert.equal(core.rangeFit(onion, harbin), 'inside', 'grown as an annual: no winter check');
  const hot = siteAt({ koppen: 'Csa', tminColdC: 5, tmaxWarmC: 34, tmeanColdC: 11, tmeanWarmC: 27 });
  assert.equal(core.rangeCheck(onion, hot).coolSeason, true, 'too hot: the cool-season advice, not outside');
  assert.deepEqual(rangeMarks(onion, ctx({ location: harbin }), 'row').map((m) => m.key), ['range.annualShort']);
});

test('reader: plants.grown_as_annual reaches Taxon.traits (fixture: onion)', async () => {
  const dir = new URL('fixtures/consortium-v2/export/', import.meta.url);
  const m = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  const o = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(m.files[0].file, dir)))), { releaseId: m.release_id, climates: m.files[0].climate_zones });
  const src = createSqliteSource(o.db, { images: {} });
  const pool = await src.pool('Temperate');
  assert.equal(pool.find((t) => t.canonical_name === 'Allium cepa').traits.grown_as_annual, true);
  assert.equal(pool.find((t) => t.canonical_name === 'Malus domestica').traits.grown_as_annual, false);
  assert.equal(core.isAnnual(pool.find((t) => t.canonical_name === 'Allium cepa')), true);
});

test('range.ts: which checks annuals skip is one switch (checksWinter), read by every winter-side bound', () => {
  const src = readFileSync(new URL('../src/lib/consortium/range.ts', import.meta.url), 'utf8');
  assert.equal((src.match(/export const checksWinter = /g) ?? []).length, 1);
  const bounds = src.slice(src.indexOf('export const RANGE_BOUNDS'), src.indexOf('];', src.indexOf('export const RANGE_BOUNDS')));
  for (const side of ['cold', 'mild', 'cool']) assert.match(bounds, new RegExp(`side: '${side}'[^\\n]*checksWinter`), side);
  for (const side of ['cold', 'mild', 'cool']) assert.doesNotMatch(bounds.split('\n').find((l) => l.includes(`side: '${side}'`)), /isAnnual/, `${side}: no second copy of the rule`);
  assert.match(bounds, /side: 'summer'[^\n]*applies: needsSummerHeat/, 'the summer side is the heat-demanding annuals\' own');
  assert.doesNotMatch(src.slice(src.indexOf('export const RANGE_BOUNDS')), /is_annual|grown_as_annual/, 'the traits are read once, in isAnnual');
  assert.equal(core.checksWinter(plant('Hordeum vulgare')), false, 'today: annuals skip the winter sides');
});

test('month layers: every PFAF month row of the export carries its source region, so Details never says "Everywhere" for it', async () => {
  const facts = await real.details(plant('Vicia faba').id);
  const pfaf = facts.layerValues.filter((v) => v.source === 'pfaf');
  assert.ok(pfaf.length > 0);
  for (const v of pfaf) assert.deepEqual(v.scope, { country: 'GB' }, `${v.field}: scoped to the UK`);
});

// ---- review of 619e6a7 ----

test('schema module: every table, column and statement, in order, as the installed export holds them (the fixture is built from the same DDL)', async () => {
  const { DDL } = await import('./consortium-schema.mjs');
  const { DatabaseSync } = await import('node:sqlite');
  const mem = new DatabaseSync(':memory:');
  mem.exec(DDL);
  const cols = (db) => Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => [name, db.prepare('SELECT name, "notnull" FROM pragma_table_info(?)').all(name).map((c) => `${c.name}${c.notnull ? '!' : ''}`).join(',')]));
  const ours = cols(mem);
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(`${tmpdir()}/ct-schema-`);
  writeFileSync(`${dir}/x.sqlite`, gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url))));
  const installed = new DatabaseSync(`${dir}/x.sqlite`, { readOnly: true });
  const exp = cols(installed);
  const expSql = Object.fromEntries(installed.prepare('SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name').all().map((r) => [r.name, r.sql]));
  installed.close();
  rmSync(dir, { recursive: true });
  assert.deepEqual(ours, exp);
  // And every statement as SQLite stores it (CHECK lists included: a new variable shows here).
  const sqlOf = (db) => Object.fromEntries(db.prepare('SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name').all().map((r) => [r.name, r.sql]));
  assert.deepEqual(sqlOf(mem), expSql);
  assert.ok(ours.plants.endsWith(',grown_as_annual!'), 'grown_as_annual last in plants, NOT NULL (canopi-data consortium_sqlite.py)');
});

test('marks: a height is a short, page-language number with or without the range rule ("13.7", fr "13,7")', async () => {
  const tall = taxon({ traits: { height_m: { min: 5, max: 13.716000000000001 } } });
  const m = siteMarks(tall, { ...ctx(), site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'small' } }, 'row');
  assert.deepEqual(m.map((x) => x.vars), [{ m: 13.7 }]);
  const strings = await import('../src/islands/consortium/strings.ts');
  strings.setStrings({ 'room.tallShort': 'grows to {m} m: prune' }, 'fr');
  assert.equal(strings.T('room.tallShort', strings.localVars({ m: 13.716000000000001 })), 'grows to 13,72 m: prune');
  strings.setStrings({}, 'en');
  assert.doesNotMatch(view('PlantMarks.tsx'), /rangeRule/, 'formatting does not wait for the range rule chunk');
});

test('range marks: a bound from TreeGOER says so in Details; the data-sources lede names TreeGOER', () => {
  const s = siteAt(SEVILLE);
  const tg = taxon({ climate: { ...taxon().climate, tminCold: { low: 7, median: 12, high: 16, count: 90, basis: 'thinned_cells', blocks: 40, lowSource: 'treegoer_ranges', highSource: null, weak: false }, tmaxWarm: null, tmeanYear: null } });
  const keys = rangeMarks(tg, ctx({ location: s }), 'details').map((m) => [m.key, m.state]);
  const i = keys.findIndex(([k]) => k === 'range.side.cold');
  assert.ok(i >= 0);
  assert.deepEqual(keys[i + 1], ['range.source.treegoer', 'source'], 'the source line follows its bound');
  const gbif = taxon({ climate: { ...tg.climate, tminCold: { ...tg.climate.tminCold, lowSource: null } } });
  assert.equal(rangeMarks(gbif, ctx({ location: s }), 'details').some((m) => m.key === 'range.source.treegoer'), false);
  assert.equal(rangeMarks(tg, ctx({ location: s }), 'row').some((m) => m.key === 'range.source.treegoer'), false, 'Details only');
  for (const l of ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']) {
    const d = JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
    assert.match(d['dataSources.tool.lede'], /TreeGOER/, `${l}: the lede credits TreeGOER`);
    assert.ok(d['consortium.range.source.treegoer'], l);
    assert.match(d['consortium.range.pool.count'], /\{mean\}/, `${l}: the pool line names the year's mean`);
    assert.match(d['consortium.range.empty.body'], /\{mean\}/, l);
  }
  assert.match(readFileSync(new URL('../src/islands/consortium/views/pool/pool.tsx', import.meta.url), 'utf8'), /mean: num\(yearMeanC\(today\)\)/);
});

test('future marks: an annual already too hot today gets the cool-season advice once (today\'s mark), not again for the future', () => {
  const annual = taxon({ traits: { is_annual: true }, phases: { start: 'placenta_i', end: 'secondary_i', sources: [] } });
  const hotToday = { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods: [slot('1991-2020', 'historical', 36), ...core.scenarios.map((x) => slot('2041-2070', x, 38)), ...core.scenarios.map((x) => slot('2071-2099', x, 40))] } } };
  const at = ctx({ location: hotToday });
  assert.equal(rangeMarks(annual, at, 'add').filter((m) => m.state === 'cool').length, 1, 'today says it');
  assert.deepEqual(futureMarks(annual, at, 'add').filter((m) => m.key === 'future.coolSeason'), [], 'the future does not repeat it');
  assert.equal(futureMarks(annual, ctx({ location: hotFuture }), 'add').filter((m) => m.key === 'future.coolSeason').length, 1, 'new by its period: still said');
});

// ---- the summer-warmth bound for annuals (canopi-data, schema 3 tmean_warm low; coordinator 2026-11-12) ----

// Coordinator decision 2026-11-12 (canopi-data review): one warmest-month mean says nothing about the
// season length in equatorial highlands, so only heat-demanding annuals (tmean_warm low at or above
// range.ts HEAT_DEMAND_C, 18 °C) get the summer side. Warmest-month means from the coordinator's review.
const QUITO = { koppen: 'Cfb', tminColdC: 8.5, tmaxWarmC: 20.5, tmeanColdC: 13.6, tmeanWarmC: 14.1, aridityIndex: 1.2 };
const BOGOTA = { koppen: 'Cfb', tminColdC: 5.9, tmaxWarmC: 20, tmeanColdC: 13.4, tmeanWarmC: 14.3, aridityIndex: 1.1 };
const COOL_CROPS = ['Lactuca sativa', 'Zea mays', 'Allium cepa', 'Daucus carota', 'Brassica oleracea', 'Allium sativum', 'Allium porrum', 'Beta vulgaris subsp. vulgaris'];
const HEAT_CROPS = ['Colocasia esculenta', 'Zingiber officinale', 'Curcuma longa', 'Ipomoea batatas'];
test('rangeCheck: the summer side is only for heat-demanding annuals (tmean_warm low >= HEAT_DEMAND_C): cool-season crops at Quito and Bogotá never get it; taro, ginger, turmeric, sweet potato stay "summer too cool" at Rovaniemi and Oulu', () => {
  assert.equal(core.HEAT_DEMAND_C, 18);
  assert.equal(core.HEAT_DEMAND_C, core.CHILL_CEILING_C, 'the same 18 °C as the chill rule');
  for (const [where, site] of [['Quito', QUITO], ['Bogotá', BOGOTA]]) {
    for (const name of COOL_CROPS) {
      const t = plant(name);
      assert.ok(core.isAnnual(t) && t.climate.tmeanWarm.low < 18, `${name}: an annual below the threshold`);
      assert.equal(core.needsSummerHeat(t), false, name);
      assert.equal(core.rangeCheck(t, siteAt(site)).sides.includes('summer'), false, `${name} at ${where}: no summer side`);
    }
  }
  const oulu = siteAt({ koppen: 'Dfc', tminColdC: -14, tmaxWarmC: 21, tmeanColdC: -10, tmeanWarmC: 15.5 });
  for (const name of HEAT_CROPS) {
    assert.equal(core.needsSummerHeat(plant(name)), true, name);
    for (const [where, loc] of [['Rovaniemi', at('rovaniemi')], ['Oulu', oulu]]) {
      const c = core.rangeCheck(plant(name), loc);
      assert.deepEqual([c.verdict, c.beyond.includes('summer')], ['outside', true], `${name} at ${where}`);
    }
  }
  assert.equal(core.needsSummerHeat(taxon({ traits: { is_annual: false }, climate: { ...taxon().climate, tmeanWarm: { ...SUMMER, low: 25 } } })), false, 'a perennial never');
});

const SUMMER = { low: 18, median: 24, high: 28, count: 300, basis: 'thinned_cells', blocks: 300, lowSource: null, highSource: null, weak: false };
test('rangeCheck: an annual whose site summer (warmest-month mean) is below tmean_warm low is "summer too cool here"; perennials ignore it', () => {
  const taro = taxon({ traits: { is_annual: false, grown_as_annual: true }, climate: { ...taxon().climate, tminCold: null, tmaxWarm: null, tmeanYear: null, tmeanWarm: SUMMER } });
  const oulu = siteAt({ koppen: 'Dfc', tminColdC: -14, tmaxWarmC: 21, tmeanColdC: -10, tmeanWarmC: 15.5 });
  const c = core.rangeCheck(taro, oulu);
  assert.deepEqual([c.verdict, c.beyond], ['outside', ['summer']], '15.5 against 18: beyond the margin');
  assert.deepEqual(core.rangeCheck(taro, siteAt({ koppen: 'Dfb', tminColdC: -8, tmaxWarmC: 24, tmeanColdC: -5, tmeanWarmC: 16.5 })).verdict, 'edge', '16.5: within the margin');
  const tree = taxon({ traits: { is_annual: false }, climate: taro.climate });
  assert.equal(core.rangeCheck(tree, oulu).verdict, 'inside', 'a perennial keeps tmean_year and ignores this row');
  const weak = taxon({ ...taro, climate: { ...taro.climate, tmeanWarm: { ...SUMMER, weak: true } } });
  assert.equal(core.rangeCheck(weak, oulu).verdict, 'outside', 'a weak row never softens it');
  const d = rangeMarks(taro, ctx({ location: oulu }), 'details').find((m) => m.key === 'range.side.summer');
  assert.deepEqual([d.key, d.vars], ['range.side.summer', { site: 15.5, bound: 18 }]);
  const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  assert.match(en['consortium.range.side.summer'], /summer/);
});

test('futureCheck: warming that lifts an annual\'s site summer above its low is said, positively ("warm enough by …")', () => {
  const taro = taxon({ traits: { is_annual: true }, phases: { start: 'placenta_i', end: 'secondary_i', sources: [] }, climate: { ...taxon().climate, tminCold: null, tmaxWarm: { ...SUMMER, low: 10, high: 45 }, tmeanYear: null, tmeanWarm: SUMMER } });
  const sl = (period, scenario, mean) => ({ period, scenario, koppen: 'Dfc', koppenTemperatureMarginC: 0, tminColdC: -14, tmaxWarmC: 24, tmeanColdC: -10, tmeanWarmC: mean, aridityIndex: 1 });
  const site = { ...lyon, lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods: [sl('1991-2020', 'historical', 15), ...core.scenarios.map((x) => sl('2041-2070', x, 19)), ...core.scenarios.map((x) => sl('2071-2099', x, 20))] } } };
  assert.equal(core.rangeFit(taro, site), 'outside');
  const c = core.futureCheck(taro, site, 'ssp245');
  assert.equal(c.warmEnough, true);
  assert.deepEqual(futureMarks(taro, ctx({ location: site }), 'row').map((m) => m.key), ['future.warmEnoughShort']);
});
