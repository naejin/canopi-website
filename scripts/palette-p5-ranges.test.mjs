// P5 climate ranges (owner decision row "Climate ranges fixed before the P5 push", 2026-11-12): the
// zone the site cell's own mean temperatures give (site-climate.ts), the winter-chill rule for the
// mild-winter side (range.ts), annuals beyond the heat range advised to the cool season (range.ts,
// future.ts), and drought tolerance Medium on a dry site (site.ts).
// Site values from the grower diagnosis (canopi-climate 0.2.0 `lookup`, historical slot); plant rows
// from the real export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ctx, lyon, taxon } from './palette-p5-fixtures.mjs';

// The rule files' own helpers come from the files (index.ts names only what the views read, fix round 1 B3).
const core = { ...(await import('../src/lib/palette/index.ts')), ...(await import('../src/lib/palette/site.ts')), ...(await import('../src/lib/palette/range.ts')), ...(await import('../src/lib/palette/future.ts')) };
const { SIZE_LIMIT, suggest } = await import('../src/lib/palette/suggest.ts');
const sc = await import('../src/lib/palette/site-climate.ts');
const { openBytes } = await import('../src/islands/palette/data/load.ts');
const { createSqliteSource } = await import('../src/islands/palette/data/sqlite-source.ts');
const view = (f) => readFileSync(new URL(`../src/islands/palette/views/${f}`, import.meta.url), 'utf8');

// A lookup whose today slot is given (Lyon's regions unless replaced).
const lookupAt = (period, regions = lyon.lookup.regions) => ({
  ...lyon.lookup, regions,
  climate: { ...lyon.lookup.climate, periods: [{ period: '1991-2020', scenario: 'historical', koppenTemperatureMarginC: 0, aridityIndex: 1, ...period }] },
});
// As the rules read a site: its inputs (site-inputs.ts, no grower edit).
const siteAt = (period) => core.siteInputsOf({ lookup: lookupAt(period, { wgsrpdL3: null, isoA2: null }) });

// The diagnosis' cells (historical slot, cell centre).
const NAIROBI = { koppen: 'Aw', koppenTemperatureMarginC: 0.4, tminColdC: 12.3, tmaxWarmC: 26.5, tmeanColdC: 17.6, tmeanWarmC: 21.1, aridityIndex: 1.02 };
const MANAUS = { koppen: 'Af', tminColdC: 24.0, tmaxWarmC: 31.2, tmeanColdC: 26.7, tmeanWarmC: 28.3, aridityIndex: 1.3 };
const SINGAPORE = { koppen: 'Af', tminColdC: 24.7, tmaxWarmC: 29.2, tmeanColdC: 26.4, tmeanWarmC: 27.9, aridityIndex: 1.39 };
const HARBIN = { koppen: 'Dwa', tminColdC: -24.1, tmaxWarmC: 27.3, tmeanColdC: -17.8, tmeanWarmC: 23.8, aridityIndex: 0.83 };
const SEVILLE = { koppen: 'Csa', tminColdC: 5.8, tmaxWarmC: 34.8, tmeanColdC: 11.0, tmeanWarmC: 27.8, aridityIndex: 0.58 };

const index = JSON.parse(readFileSync(new URL('../src/data/palette-index.json', import.meta.url), 'utf8'));
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

// A site whose future slots are all hot (today 25 °C).
const slot = (period, scenario, tmaxWarmC) => ({ period, scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 0, tmaxWarmC, tmeanColdC: 3, tmeanWarmC: 18, aridityIndex: 1 });
const hotFuture = core.siteInputsOf({ lookup: { ...lyon.lookup, climate: { ...lyon.lookup.climate, periods: [slot('1991-2020', 'historical', 25), ...core.scenarios.map((s) => slot('2041-2070', s, 36)), ...core.scenarios.map((s) => slot('2071-2099', s, 38))] } } });

// ---- 4. drought tolerance Medium on a dry site ----

const DRY = { light: 'unsure', soil: 'unsure', water: 'dry', room: 'unsure' };
test('fits: on a dry site, drought tolerance Medium fits (no note: watering is the aridity rule\'s, R2); None and Low stay misfits', () => {
  const medium = taxon({ traits: { drought_tolerance: 'Medium' } });
  assert.deepEqual(core.fits(medium, DRY).reasons, [{ key: 'water', verdict: 'fit', trait: 'drought_tolerance' }]);
  assert.equal(core.fits(taxon({ traits: { drought_tolerance: 'None' } }), DRY).verdict, 'misfit');
  assert.equal(core.fits(taxon({ traits: { drought_tolerance: 'Low' } }), DRY).verdict, 'misfit');
  assert.deepEqual(core.fits(taxon({ traits: { drought_tolerance: 'High' } }), DRY).reasons, [{ key: 'water', verdict: 'fit', trait: 'drought_tolerance' }]);
  assert.equal(core.fits(medium, { ...DRY, water: 'average' }).reasons.length, 0);
});

// ---- the seam: one list of range variables ----

test('range variables: the export variables the source reads and the bounds the rule checks are listed once', async () => {
  const types = await import('../src/lib/palette/types.ts');
  assert.deepEqual(Object.keys(types.RANGE_VARIABLES), ['tmin_cold', 'tmax_warm', 'tmean_year', 'tmean_warm', 'aridity']);
  assert.deepEqual(core.RANGE_BOUNDS.map((b) => b.side), ['cold', 'mild', 'cool', 'summer', 'hot']);
  const source = readFileSync(new URL('../src/islands/palette/data/sqlite-source.ts', import.meta.url), 'utf8');
  assert.match(source, /RANGE_VARIABLES/);
  assert.doesNotMatch(source, /'tmin_cold', 'tmax_warm'/, 'no second list in the SQL');
});

// ---- schema 3 (the ranges rebuild): the year's warmth, weak rows, the export's chill rule ----

// The diagnosis sites (canopi-climate 0.2.0 lookups, all 9 slots; Seville from the future fixture).
const SITES = JSON.parse(readFileSync(new URL('./fixtures/consortium-ranges/sites.json', import.meta.url), 'utf8'));
const at = (name) => { const s = SITES[name]; return core.siteInputsOf({ lookup: { lat: s.lat, lon: s.lon, climate: s.climate, soil: null, regions: { wgsrpdL3: null, isoA2: null } } }); };
const verdict = (name, site) => core.rangeCheck(plant(name), at(site));

// Written on r-60ea417b5a15c3aa (the rows of r-b958a4239cc68f73); it holds on every later schema-3
// export: the grown_as_annual and tmean_warm cases below need those columns, so no release pin.
test('acceptance (owner diagnosis, on the installed export): each site\'s plants as the growers know them', () => {
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

test('schema 4: the reader and the installer read schema 4 only (PP-C 0b), the source reads blocks, sources and weak', async () => {
  const types = await import('../src/lib/palette/types.ts');
  assert.deepEqual(types.SCHEMA_VERSIONS, [4]);
  const cacao = plant('Theobroma cacao').climate;
  assert.deepEqual(cacao.tmeanYear, { low: 21.3, median: 25.2, high: 27.5, count: cacao.tmeanYear.count, basis: 'thinned_cells', blocks: 499, lowSource: 'treegoer_ranges', highSource: null, weak: false });
  assert.equal(cacao.tmaxWarm.highSource, 'treegoer_ranges');
});

// ---- 5. the room answer is advisory (owner request 2026-11-12): the matrix layers are relative sun
// exposure, not heights, so a tall plant is pruned or replaced, never a misfit ----

const SMALL = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'small' };
const fig = taxon({ id: 'fig', canonical_name: 'Ficus carica', traits: { height_m: { min: 3, max: 12 } } });
const short = taxon({ id: 'short', canonical_name: 'Short tree', traits: { height_m: { min: 2, max: 5 } } });

test('room: a plant taller than the room fits, with the height noted; it never makes a misfit, a flag or an ask', () => {
  const f = core.fits(fig, SMALL);
  assert.equal(f.verdict, 'fit');
  assert.deepEqual(f.misfits, []);
  assert.deepEqual(f.reasons, [{ key: 'room', verdict: 'fit', kind: 'wild_height', meters: 12, limit: 6 }]);
  assert.equal(core.tallerThanRoom(f), true);
  assert.equal(core.tallerThanRoom(core.fits(short, SMALL)), false);
  // (Its matrix cell stayed free, counted in "N fit"; the matrix went in PP-B commit 0a'.)
  const flags = core.flagsOf([fig], { site: SMALL, interactions: [] });
  assert.equal(flags.some((x) => x.kind === 'misfit'), false, 'no misfit flag');
  // Light, soil and water still block.
  assert.equal(core.fits(taxon({ traits: { sun: false, height_m: { min: 3, max: 12 } } }), { ...SMALL, light: 'sun' }).verdict, 'misfit');
});

test('room: the suggestion still prefers plants that fit the room naturally (a taller one is never picked automatically)', () => {
  const s = suggest([fig, short], { site: SMALL, interactions: [] });
  assert.deepEqual(s.members, ['short']);
  assert.equal(s.limit, SIZE_LIMIT.small);
  // Already in the palette (the seed), it stays.
  assert.ok(suggest([fig, short], { site: SMALL, interactions: [], seed: ['fig'] }).members.includes('fig'));
});

// ---- 6. annuals (owner, decision row "Growing months" 2026-11-12): a plain "annual" tag, no season
// claimed (the USDA growth period classes 18 of 77 annuals, turnip and rye "warm"); a crop grown as an
// annual (grown_as_annual, schema 3) is an annual everywhere: range, future, marks ----

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
  const src = readFileSync(new URL('../src/lib/palette/range.ts', import.meta.url), 'utf8');
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
  // D8a (canopi-data r-ad27260496be31eb, kept in r-fcf4307ffd1549b3): month rows also carry the
  // hemisphere and the latitude band they were observed in; scopeText names the band, never "Everywhere".
  for (const v of pfaf) {
    assert.equal(v.scope?.country, 'GB', `${v.field}: scoped to the UK`);
    if (v.months) assert.match(v.scope.latitude ?? '', /^-?\d+\.\.-?\d+$/, `${v.field}: a month row names its latitude band`);
  }
});

// ---- review of 619e6a7 ----

// PP-C 0b: the schema the reader reads (consortium-schema.mjs DDL_READ: the base statements and every
// required 4.2 to 4.7 addition) against the installed export, allowing declared additive-tier extensions
// (4.8–4.10+ tables and trailing columns declared in index.schema_additions).
test('schema module: every base table, column and statement matches the installed export; extras are declared in schema_additions', async () => {
  const { DDL_READ } = await import('./palette-schema.mjs');
  const { DatabaseSync } = await import('node:sqlite');
  const mem = new DatabaseSync(':memory:');
  mem.exec(DDL_READ);
  const cols = (db) => Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => [name, db.prepare('SELECT name, "notnull" FROM pragma_table_info(?)').all(name).map((c) => `${c.name}${c.notnull ? '!' : ''}`)]));
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
  const declaredTables = new Set((index.schema_additions ?? []).filter((a) => !a.column && !a.index && a.value === undefined).map((a) => a.table));
  const declaredCols = new Set((index.schema_additions ?? []).filter((a) => a.column && a.value === undefined).map((a) => `${a.table}.${a.column}`));
  const sqlOf = (db) => Object.fromEntries(db.prepare('SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name').all().map((r) => [r.name, r.sql]));
  const memSql = sqlOf(mem);
  for (const [table, wantCols] of Object.entries(ours)) {
    assert.ok(table in exp, `installed export has table ${table}`);
    assert.deepEqual(exp[table].slice(0, wantCols.length), wantCols, `${table} base columns match in order`);
    const extraCols = exp[table].slice(wantCols.length);
    for (const c of extraCols) assert.ok(declaredCols.has(`${table}.${c.replace(/!$/, '')}`), `${table}.${c} is declared in schema_additions`);
    if (!extraCols.length) assert.equal(expSql[table], memSql[table], `${table} statement matches DDL_READ`);
  }
  for (const table of Object.keys(exp)) {
    if (!(table in ours)) assert.ok(declaredTables.has(table), `extra table ${table} is declared in schema_additions`);
  }
  assert.ok(ours.plants.join(',').endsWith(',grown_as_annual!,sun_exposure_sunniest,sun_exposure_shadiest,sun_exposure_preferred'), 'grown_as_annual last of the base plants columns, NOT NULL (canopi-data consortium_sqlite.py), then 4.5\'s three nullable light columns');
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
