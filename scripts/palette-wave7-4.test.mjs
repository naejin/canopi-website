import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/lib/palette/index.ts';
import { slotCheck } from '../src/lib/palette/range.ts';
import { buildTier2AV07 } from '../src/islands/palette/state/climate-v07.ts';
import * as nsFile from '../src/islands/palette/views/north-star/ns-file.ts';
import * as store from '../src/islands/palette/store.ts';
import { setStrings } from '../src/islands/palette/strings.ts';

function makeTaxon(overrides = {}) {
  return {
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    canonical_name: overrides.canonical_name ?? 'Malus domestica',
    family: overrides.family ?? 'Rosaceae',
    names: { en: overrides.en ?? 'Apple' },
    stratum: overrides.stratum !== undefined ? overrides.stratum : { value: 'high', accepted: true },
    phases: overrides.phases !== undefined ? overrides.phases : { start: 'secondary1', end: 'climax', accepted: true },
    light: { preferred: 'full', sunniest: 'full', shadiest: 'part' },
    traits: {
      is_annual: false,
      grown_as_annual: false,
      height_m: { min: 4, max: 8 },
      width_max_m: 6,
      edibility_rating: 5,
      soil_ph: { min: 5.4, max: 6.1 },
      root_depth_min_cm: 60,
      taproot_persistent: false,
      drought_tolerance: 'low',
      moisture_use: 'medium',
      well_drained: true,
      nitrogen_fixer: false,
      habit: 'tree',
      ...(overrides.traits ?? {}),
    },
    role: overrides.role ?? 'crop',
    functions: overrides.functions ?? [{ function: 'pollinator_forage' }],
    climate: {
      cells: 1200,
      tminCold: { low: -15, high: 8 },
      tmaxWarm: { low: 15, high: 36 },
      tmeanYear: { low: 6, high: 20 },
      tmeanWarm: { low: 14, high: 28 },
      precip: { low: 500, high: 1600 },
      aridity: { low: 0.62, high: 2.0 },
      dryMonths: { low: 0, high: 4 },
      ...(overrides.climate ?? {}),
    },
    extremes: {
      tminExtreme: { low: -10, high: 5, weak: false },
      tmaxExtreme: { low: 20, high: 40, weak: false },
      coldTailC: -10,
      heatDomeC: 40,
      ...(overrides.extremes ?? {}),
    },
    frost: [],
    warnings: { toxicity: null, cautions: [], allergens: [] },
    native_l3: [],
    introduced_l3: [],
    ...(overrides.extra ?? {}),
  };
}

function makeLookup(overrides = {}) {
  return {
    lat: 45.5,
    lon: 5.5,
    climate: {
      cellLat: 45.55,
      cellLon: 5.55,
      periods: [
        {
          period: '1991-2020',
          scenario: 'historical',
          koppen: 'Cfb',
          koppenTemperatureMarginC: 2,
          tminColdC: -1.0,
          tmaxWarmC: 27.0,
          tmeanColdC: 2.0,
          tmeanWarmC: 21.0,
          precipMm: 900,
          dryMonths: 1,
          aridityIndex: 0.64,
        },
        {
          period: '2041-2070',
          scenario: 'ssp245',
          koppen: 'Cfa',
          koppenTemperatureMarginC: 2,
          tminColdC: 1.0,
          tmaxWarmC: 30.0,
          tmeanColdC: 4.0,
          tmeanWarmC: 24.0,
          precipMm: 850,
          dryMonths: 2,
          aridityIndex: 0.58,
        },
        {
          period: '2071-2099',
          scenario: 'ssp245',
          koppen: 'Cfa',
          koppenTemperatureMarginC: 2,
          tminColdC: 2.0,
          tmaxWarmC: 32.0,
          tmeanColdC: 5.0,
          tmeanWarmC: 26.0,
          precipMm: 800,
          dryMonths: 3,
          aridityIndex: 0.52,
        },
      ],
    },
    soil: {
      phH2o: 6.0,
      sandPct: 35,
      clayPct: 20,
      filled: false,
      fillDistanceCells: 0,
      distanceCells: 0,
    },
    v07: {
      terrain: { elevM: 200, slopeDeg: 4 },
      extremes: {
        usdaZone: '8a',
        tminExtremeC: -7.0,
        tmaxExtremeC: 34.0,
        futureTminExtremeC: -4.5,
        futureTmaxExtremeC: 37.5,
        lateTminExtremeC: -3.0,
        lateTmaxExtremeC: 39.5,
        periods: [],
      },
      extremesTail: {
        coldTail10yrC: -10.0,
        heatDome10yrC: 37.0,
        coldTail10yr2050C: -7.5,
        heatDome10yr2050C: 40.5,
        tminP10GapC: -3.0,
        tmaxP90GapC: 3.0,
        heatDays35: 4,
        recentTrendC: 1.2,
        p90DryStreakDays: 25,
      },
      waterBalance: { cddDays: 20, cwdMm: 120, cwdP90Mm: 180, vpdSummerKpa: 1.3, annualDeficitMm: 120 },
      soilPlus: { ph30_100: 6.1, clay30_100: 24, cfvo0_30: 5, cfvo30_100: 10, om0_30Pct: 3.2, awcMmPerM: 140, dryDaysReserve: 30 },
    },
    ...overrides,
  };
}

test('L1: aridityIndex keeps 3 decimals in resolveEffectiveSite and avoids false irrigation check', () => {
  const lookup = makeLookup();
  const eff = core.resolveEffectiveSite(lookup, 'today');
  assert.equal(eff.aridityIndex, 0.64);
  const droughtEff = core.resolveEffectiveSite(lookup, 'drought');
  assert.equal(droughtEff.aridityIndex, 0.448);

  const plant = makeTaxon({ climate: { aridity: { low: 0.62, high: 2.0 } } });
  const verdict = core.evaluatePlantVerdict(plant, eff);
  assert.equal(verdict.reasons.some((r) => r.code === 'water_needs_irrigation'), false);
});

test('L2: horizonPackKey does not collide across cddDays, clayPct, subsoilPh, aridityIndex, or eff2080', () => {
  const plant = makeTaxon({ traits: { drought_tolerance: 'low', moisture_use: 'high' } });
  const effShortDry = core.resolveEffectiveSite(makeLookup(), 'today', { cddDays: 10 });
  const effLongDry = core.resolveEffectiveSite(makeLookup(), 'today', { cddDays: 90 });

  const ev1 = core.scoreCandidateForGuild(plant, [], { effToday: effShortDry });
  const ev2 = core.scoreCandidateForGuild(plant, [], { effToday: effLongDry });
  assert.equal(ev1.verdictToday.reasons.some((r) => r.code === 'dry_spell_water'), false);
  assert.equal(ev2.verdictToday.reasons.some((r) => r.code === 'dry_spell_water'), true);
  assert.notEqual(ev1.verdictToday.level, ev2.verdictToday.level);

  const lkSub1 = makeLookup();
  lkSub1.v07.soilPlus.ph30_100 = 6.0;
  const lkSub2 = makeLookup();
  lkSub2.v07.soilPlus.ph30_100 = 8.2;
  const evSub1 = core.scoreCandidateForGuild(plant, [], { effToday: core.resolveEffectiveSite(lkSub1, 'today') });
  const evSub2 = core.scoreCandidateForGuild(plant, [], { effToday: core.resolveEffectiveSite(lkSub2, 'today') });
  assert.equal(evSub1.verdictToday.subsoilPhTrap, false);
  assert.equal(evSub2.verdictToday.subsoilPhTrap, true);
});

test('L3: freeze10/heat10 overrides replace terrain shifts today and preserve future warming on SSP horizons', () => {
  const lookup = makeLookup();
  // Measured at spot: -12°C freeze, 39°C heat (today map is -10 / 37, so shifts are -2 / +2)
  const todayEff = core.resolveEffectiveSite(lookup, 'today', { freeze10: -12, heat10: 39, coldAir: 'hollow', aspect: 'north' });
  assert.equal(todayEff.freeze10C, -12, 'today override is measured at spot (no double-count with hollow/aspect)');
  assert.equal(todayEff.heat10C, 39);

  // 2050 map extremes: futureTminExtremeC=-4.5 + gap(-3.0) = -7.5; with -2 override shift => -9.5 (warmer than -12!)
  const y2050Eff = core.resolveEffectiveSite(lookup, 'y2050', { freeze10: -12, heat10: 39 });
  assert.equal(y2050Eff.freeze10C, -9.5);
  assert.equal(y2050Eff.heat10C, 42.5);
  assert.ok(y2050Eff.freeze10C > todayEff.freeze10C, 'future warming is preserved under freeze10 override');
  assert.ok(y2050Eff.heat10C > todayEff.heat10C, 'future warming is preserved under heat10 override');
});

test('L4: exact pH (±0.3) and extreme (±2.0) boundaries have zero IEEE-754 float jitter', () => {
  const plant = makeTaxon({
    traits: { soil_ph: { min: 5.4, max: 6.1 }, root_depth_min_cm: 60 },
    extremes: { tminExtreme: { low: -10.0, high: 5.0, weak: false }, tmaxExtreme: { low: 20.0, high: 40.0, weak: false }, coldTailC: -10.0, heatDomeC: 40.0 },
  });
  const effLowPh = core.resolveEffectiveSite(makeLookup(), 'today', { soilPh: 5.1 });
  const effHighPh = core.resolveEffectiveSite(makeLookup(), 'today', { soilPh: 6.4 });
  assert.equal(core.evaluatePlantVerdict(plant, effLowPh).reasons.some((r) => r.code === 'topsoil_ph'), false);
  assert.equal(core.evaluatePlantVerdict(plant, effHighPh).reasons.some((r) => r.code === 'topsoil_ph'), false);

  const effBeyondLowPh = core.resolveEffectiveSite(makeLookup(), 'today', { soilPh: 5.0 });
  assert.equal(core.evaluatePlantVerdict(plant, effBeyondLowPh).reasons.some((r) => r.code === 'topsoil_ph'), true);

  // Exact -2.0°C margin from -10.0 => -12.0 should be edge (check), NOT at_risk
  const effExactFreeze = core.resolveEffectiveSite(makeLookup(), 'today', { freeze10: -12.0 });
  const vFreeze = core.evaluatePlantVerdict(plant, effExactFreeze);
  assert.equal(vFreeze.reasons.some((r) => r.code === 'extreme_freeze'), false);
  assert.equal(vFreeze.reasons.some((r) => r.code === 'extreme_freeze_edge'), true);

  // Exact +2.0°C margin from 40.0 => 42.0 should be edge (check), NOT at_risk
  const effExactHeat = core.resolveEffectiveSite(makeLookup(), 'today', { heat10: 42.0 });
  const vHeat = core.evaluatePlantVerdict(plant, effExactHeat);
  assert.equal(vHeat.reasons.some((r) => r.code === 'extreme_heat'), false);
  assert.equal(vHeat.reasons.some((r) => r.code === 'extreme_heat_edge'), true);
});

test('L5: NaN/Infinity overrides and -0 are sanitized in resolveEffectiveSite and computeCrownBudget', () => {
  const lookup = makeLookup();
  const eff = core.resolveEffectiveSite(lookup, 'today', {
    elevM: 201, // (200 - 201) / 100 * 0.65 = -0.0065 => previously round1 emitted -0
    nightsShiftC: Number.NaN,
    daysShiftC: Number.POSITIVE_INFINITY,
    freeze10: Number.NaN,
    heat10: Number.NEGATIVE_INFINITY,
    plotM2: Number.NaN,
    cddDays: Number.NaN,
    soilPh: Number.NaN,
  });
  assert.equal(Object.is(eff.elevDeltaC, -0), false);
  assert.equal(eff.elevDeltaC, 0);
  assert.ok(Number.isFinite(eff.tminColdC));
  assert.ok(Number.isFinite(eff.tmaxWarmC));
  assert.ok(Number.isFinite(eff.plotM2));
  assert.ok(Number.isFinite(eff.netPlotM2));
  assert.ok(Number.isFinite(eff.cddDays));
  assert.equal(eff.soilPh, 6.0);

  const budget = core.computeCrownBudget([makeTaxon()], Number.NaN);
  assert.ok(Number.isFinite(budget.plotM2));
  assert.ok(Number.isFinite(budget.budgetPct));
  assert.equal(budget.plotM2, 150);
});

test('L6: evaluatePlantVerdict honours eff.tmeanYearC without breaking tmeanWarmC', () => {
  const eff = {
    ...core.resolveEffectiveSite(makeLookup(), 'today'),
    tmeanColdC: null,
    tmeanWarmC: 24.0,
    tmeanYearC: 5.0, // below plant tmeanYear.low = 10.0 by 5°C => at_risk (cool_year)
  };
  const plant = makeTaxon({
    climate: {
      tminCold: null,
      tmaxWarm: null,
      tmeanYear: { low: 10.0, high: 22.0 },
      tmeanWarm: { low: 18.0, high: 30.0 },
      precip: null,
      aridity: null,
      dryMonths: null,
    },
    extremes: null,
  });
  const v = core.evaluatePlantVerdict(plant, eff);
  assert.equal(v.level, 'at_risk');
  assert.equal(v.reasons.some((r) => r.code === 'cool_year'), true);

  // Verify range.ts parity when synthetic slot matches real slot
  const realEff = core.resolveEffectiveSite(makeLookup(), 'today');
  const sc = slotCheck(plant, makeLookup().climate.periods[0]);
  const vReal = core.evaluatePlantVerdict(plant, realEff);
  assert.equal(vReal.reasons.some((r) => r.code === 'cool_year'), sc.beyond.includes('cool'));
});

test('L7, L8, R2, R3: .canopi version integer check, phase guard, safe filename, and null untitled name', () => {
  assert.throws(() => core.parseCanopiFile(JSON.stringify({ version: 1.5, name: 'Bad' })), /Unsupported \.canopi version/);
  assert.throws(() => core.parseCanopiFile(JSON.stringify({ version: 9.9, name: 'Bad' })), /Unsupported \.canopi version/);

  // Phase indexOf -1 guard
  const badPhaseTaxon = makeTaxon({ phases: { start: 'unknown_phase', end: 'climax', accepted: true } });
  const written = JSON.parse(core.canopiFile([badPhaseTaxon], { name: 'Test', description: null, at: '2026-11-26T00:00:00Z' }));
  assert.equal(written.consortiums[0].start_phase, 0);
  assert.equal(written.consortiums[0].end_phase, 2);

  // L8 + R2: Windows reserved names, dots, blank -> plant-palette.canopi
  assert.equal(core.canopiFileName('   '), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('CON'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('nul'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('COM1'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('LPT9'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('..'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('...'), 'plant-palette.canopi');
  assert.equal(core.canopiFileName('...My Garden...'), 'My Garden.canopi');

  // R3: blank/missing name returns null from parseCanopiFile (no English fallback in lib)
  const parsedBlank = core.parseCanopiFile(JSON.stringify({ version: 9, name: '   ', consortiums: [] }));
  assert.equal(parsedBlank.name, null);
  const parsedMissing = core.parseCanopiFile(JSON.stringify({ version: 9, consortiums: [] }));
  assert.equal(parsedMissing.name, null);
});

test('L9: encodeLink skips non-hex IDs without writing "undefined"', () => {
  const validId = '12345678-9abc-def0-1234-56789abcdef0';
  const badId = 'not-a-hex-id-zzz';
  const link = core.encodeLink(
    {
      climate: 'Temperate',
      room: 'large',
      members: [validId, badId],
      removed: [badId],
      guests: [{ id: badId, from: 'Arid' }],
      plot: 150,
      period: '1991-2020',
      plantsPerJob: 2,
      country: null,
      siteEdits: {},
    },
    { Temperate: [validId, badId] },
  );
  assert.equal(link.includes('undefined'), false);
  const decoded = core.decodeLink(link, { Temperate: [validId] });
  assert.equal(decoded.notice.unreadable, false);
  assert.deepEqual(decoded.state.members, [validId]);
});

test('L10: selectStarterPalette is deterministic across pool permutations and handles 0/1/200 plants', () => {
  const eff = core.resolveEffectiveSite(makeLookup(), 'today');
  assert.deepEqual(core.selectStarterPalette([], eff), []);

  const single = makeTaxon({ id: '00000000-0000-0000-0000-000000000001', canonical_name: 'Solo sp' });
  assert.equal(core.selectStarterPalette([single], eff).length, 1);

  const pool = Array.from({ length: 60 }, (_, i) => {
    const hex = i.toString(16).padStart(12, '0');
    const functions = i % 4 === 0 ? [{ function: 'nitrogen_fixer' }]
      : i % 4 === 1 ? [{ function: 'pollinator_forage' }]
        : i % 4 === 2 ? [{ function: 'ground_cover' }]
          : [{ function: 'mulch' }];
    return makeTaxon({
      id: `00000000-0000-0000-0000-${hex}`,
      canonical_name: `Species ${String(i).padStart(3, '0')}`,
      family: `Family${i % 10}`,
      role: i % 4 === 3 ? 'crop' : 'support',
      functions,
      traits: {
        habit: i < 10 ? 'tree' : i < 25 ? 'shrub' : 'herb',
        height_m: { min: 0.4, max: i < 10 ? 7 : i < 25 ? 2.5 : 0.6 },
        width_max_m: i < 10 ? 5 : i < 25 ? 2 : 0.8,
        nitrogen_fixer: i % 4 === 0,
      },
    });
  });

  const a = core.selectStarterPalette(pool, eff).map((t) => t.canonical_name);
  const b = core.selectStarterPalette([...pool].reverse(), eff).map((t) => t.canonical_name);
  assert.deepEqual(a, b, 'starter palette must be identical regardless of pool order');

  // 200-plant stress test (must stay fast and finite)
  const bigPool = Array.from({ length: 200 }, (_, i) => makeTaxon({
    id: `10000000-0000-0000-0000-${i.toString(16).padStart(12, '0')}`,
    canonical_name: `Stress ${String(i).padStart(3, '0')}`,
    traits: { habit: i < 40 ? 'tree' : 'herb', width_max_m: i < 40 ? 4 : 0.8 },
  }));
  const bigOut = core.selectStarterPalette(bigPool, eff);
  assert.ok(bigOut.length > 0 && bigOut.length <= 8);
});

test('L11: buildTier2AV07 never invents chill deltas, soil texture, or VPD defaults', async () => {
  const locNoFutureNoSoil = {
    lat: 45.5,
    lon: 5.5,
    label: 'Test',
    lookup: {
      lat: 45.5,
      lon: 5.5,
      climate: {
        cellLat: 45.55,
        cellLon: 5.55,
        periods: [
          { period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 1, tminColdC: 0, tmaxWarmC: 25, tmeanColdC: 2, tmeanWarmC: 20, precipMm: 800, dryMonths: 1, aridityIndex: 0.9 },
        ],
      },
      soil: null,
    },
  };
  const patch = await buildTier2AV07(
    locNoFutureNoSoil,
    {
      phenology: { chill_portions_0c: 80, chill_portions_1c: 70, chill_portions_2c: 60, chill_portions_3c: 50, chill_portions_4c: 40 },
      soilPlus: { ph_30_100: 6.2, clay_30_100_pct: null, cfvo_0_30_pct: 5, cfvo_30_100_pct: 10, om_0_30_pct: 2.5 },
      waterBalance: null,
      extremesTail: null,
    },
    null,
  );
  assert.equal(patch.phenology?.chillPortionsToday, 80);
  assert.equal(patch.phenology?.chillPortions2050, null, 'missing 2050 slot must stay null, never invented 1.5°C delta');
  assert.equal(patch.phenology?.chillPortions2080, null, 'missing 2080 slot must stay null, never invented 2.6°C delta');
  assert.equal(patch.soilPlus?.awcMmPerM, null, 'missing sand/clay must stay null, never invented 40/25');
  assert.equal(patch.soilPlus?.dryDaysReserve, null, 'missing VPD/texture must stay null, never invented 1.4 kPa');
});

test('L12: siteInputsOf enforces [3, 10] soilPh bounds and avoids -0', () => {
  const lookup = makeLookup();
  const badLow = core.siteInputsOf({ lookup, edits: { soilPh: 1.5 } });
  const badHigh = core.siteInputsOf({ lookup, edits: { soilPh: 14.0 } });
  assert.equal(badLow.soilPh.source, 'map', 'out-of-range pH 1.5 falls back to map');
  assert.equal(badHigh.soilPh.source, 'map', 'out-of-range pH 14 falls back to map');

  const valid = core.siteInputsOf({ lookup, edits: { soilPh: 6.5, nightsShiftC: 1.0 } });
  assert.equal(valid.soilPh.source, 'grower');
  assert.equal(valid.soilPh.value, 6.5);
  assert.equal(Object.is(valid.nights.value, -0), false);
});

test('R1 & R3: removed placed species stays removed on reopen while doc.plants stays lossless, and blank name localises', async () => {
  setStrings({ 'palette.title': 'Votre palette' }, 'fr');
  const pyrus = makeTaxon({ id: '22222222-2222-2222-2222-222222222222', canonical_name: 'Pyrus communis', en: 'Pear' });
  const malus = makeTaxon({ id: '33333333-3333-3333-3333-333333333333', canonical_name: 'Malus domestica', en: 'Apple' });
  store.pools.value = { Temperate: [pyrus, malus] };
  store.climate.value = 'Temperate';
  nsFile.registerStudioFileHooks({
    getContext: () => ({ overrides: {}, qtyById: {}, existingIds: new Set(), pathPct: 20 }),
    applyContext: () => {},
    ensureCatalog: async () => {},
    allCatalogTaxa: () => [pyrus, malus],
    guestZoneById: () => new Map(),
  });
  nsFile.resetCanopiFileState();

  const initialDoc = {
    version: 9,
    name: '   ',
    description: null,
    plants: [{ id: 'pl-1', species_canonical_name: 'Pyrus communis' }],
    consortiums: [{ target: { kind: 'species', canonical_name: 'Malus domestica' }, stratum: 'high', start_phase: 1, end_phase: 5 }],
  };

  // 1. Open: both Malus (consortiums) and Pyrus (placed) load; blank name localises to French 'Votre palette'
  const opened1 = await nsFile.openCanopiText(JSON.stringify(initialDoc));
  assert.equal(opened1.ok, true);
  assert.equal(opened1.name, 'Votre palette');
  assert.equal(nsFile.nsFileName.peek(), 'plant-palette.canopi');
  assert.deepEqual(store.members.peek(), [malus.id, pyrus.id]);

  // 2. Grower removes Pyrus (and Malus), saves
  store.members.value = [];
  const savedText = nsFile.buildCurrentCanopiText();
  const savedDoc = JSON.parse(savedText);
  assert.equal(savedDoc.plants.length, 1, 'doc.plants must remain lossless');
  assert.deepEqual(savedDoc.paletteStudio.removedPlaced, ['Pyrus communis']);

  // 3. Reopen saved file: Pyrus must NOT resurrect
  nsFile.resetCanopiFileState();
  const opened2 = await nsFile.openCanopiText(savedText);
  assert.equal(opened2.ok, true);
  assert.deepEqual(store.members.peek(), []);
  assert.equal(opened2.placedAdded, 0);
  nsFile.resetCanopiFileState();
});

test('Fuzz: hostile .canopi documents and link-v5 mutations never throw non-Errors or crash', () => {
  const hostileCanopi = [
    '', '{', 'null', '[]', '42', '"str"',
    '{"version":0}', '{"version":10}', '{"version":1.5}', '{"version":null}', '{"version":"9"}',
    '{"version":9,"consortiums":"bad","plants":123,"paletteStudio":[]}',
    '{"version":9,"__proto__":{"polluted":true},"paletteStudio":{"qtyById":{"__proto__":5,"a":1}}}',
  ];
  for (const s of hostileCanopi) {
    try {
      core.parseCanopiFile(s);
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok(err.message.length > 0);
    }
  }
  assert.equal(({}).polluted, undefined);

  const known = { Temperate: ['12345678-9abc-def0-1234-56789abcdef0', 'abcdef01-2345-6789-abcd-ef0123456789'] };
  const baseLink = core.encodeLink(
    { climate: 'Temperate', room: 'large', members: known.Temperate, removed: [], guests: [], plot: 100, period: '1991-2020', plantsPerJob: 2, country: 'FR', siteEdits: { soilPh: 6.5 } },
    known,
    { origin: { lat: 45.5, lon: 5.5 }, place: true, name: 'Test' },
  );
  // Truncations + random byte flips
  for (let i = 0; i < baseLink.length; i++) {
    const res = core.decodeLink(baseLink.slice(0, i), known);
    assert.ok(res && typeof res.notice === 'object' && typeof res.state === 'object');
  }
  for (let i = 0; i < 100; i++) {
    const pos = i % baseLink.length;
    const mutated = baseLink.slice(0, pos) + String.fromCharCode(33 + (i % 90)) + baseLink.slice(pos + 1);
    const res = core.decodeLink(mutated, known);
    assert.ok(res && typeof res.notice === 'object' && typeof res.state === 'object');
  }
});

test('A2: site hints (pH) never lift an unknown climate verdict to check or outrank a pH fit', () => {
  const noClimateEff = core.resolveEffectiveSite(null, 'today', { soilPh: 8.5 });
  const phFit = makeTaxon({ id: 'aaaa0000-0000-0000-0000-000000000001', traits: { soil_ph: { min: 7.5, max: 9.0 } } });
  const phMisfit = makeTaxon({ id: 'aaaa0000-0000-0000-0000-000000000002', traits: { soil_ph: { min: 5.0, max: 6.0 } } });

  const vFit = core.evaluatePlantVerdict(phFit, noClimateEff);
  const vMisfit = core.evaluatePlantVerdict(phMisfit, noClimateEff);
  assert.equal(vFit.level, 'unknown');
  assert.equal(vMisfit.level, 'unknown', 'pH hint must not lift unknown climate verdict to check');
  assert.equal(vMisfit.reasons.some((r) => r.code === 'topsoil_ph'), true);

  const scFit = core.scoreCandidateForGuild(phFit, [], { effToday: noClimateEff });
  const scMisfit = core.scoreCandidateForGuild(phMisfit, [], { effToday: noClimateEff });
  assert.ok(scFit.score >= scMisfit.score, `pH fit (${scFit.score}) must not be outranked by pH misfit (${scMisfit.score})`);
});

test('A3: computeHeadroom returns 0 (never +24) when a plant has no measurable climate margins', () => {
  const eff = core.resolveEffectiveSite(makeLookup(), 'today');
  const annualNoRain = makeTaxon({
    id: 'bbbb0000-0000-0000-0000-000000000001',
    traits: { is_annual: true },
    climate: { cells: 500, tminCold: null, tmaxWarm: null, tmeanYear: null, tmeanWarm: null, precip: null, aridity: null, dryMonths: null },
    extremes: null,
  });
  const ev = core.scoreCandidateForGuild(annualNoRain, [], { effToday: eff });
  assert.equal(ev.breakdown.headroom, 0, 'no climate margins must score 0 headroom, never +24');
});

test('A4: scenario breaks count climate breaks only (a pH-only check does not break all 5 core scenarios)', () => {
  const lookup = makeLookup();
  // Plant fits all core climate scenarios comfortably, but topsoil pH is outside range
  const phOnlyPlant = makeTaxon({
    id: 'cccc0000-0000-0000-0000-000000000001',
    traits: { soil_ph: { min: 4.0, max: 5.0 }, drought_tolerance: 'high' },
    climate: {
      cells: 1500,
      tminCold: { low: -25, high: 15 },
      tmaxWarm: { low: 10, high: 45 },
      tmeanYear: { low: 0, high: 28 },
      tmeanWarm: { low: 10, high: 35 },
      precip: { low: 200, high: 2500 },
      aridity: { low: 0.1, high: 3.0 },
      dryMonths: { low: 0, high: 8 },
    },
    extremes: { tminExtreme: { low: -25, high: 10, weak: false }, tmaxExtreme: { low: 15, high: 48, weak: false }, coldTailC: -25, heatDomeC: 48 },
  });
  const rep = core.computeReport({ taxa: [phOnlyPlant], lookup, overrides: { soilPh: 6.5 } });
  assert.equal(rep.verdicts.get(phOnlyPlant.id)?.level, 'check');
  assert.equal(rep.robustness.survivesAllCore, 1, 'pH-only check must not break climate scenarios');
  assert.ok(rep.robustness.coreScenarioBreaks.every((s) => s.brokenCount === 0));
});

test('A7: dry-spell check fires for rain & first-years today, and stays a note on SSP horizons', () => {
  const lookup = makeLookup();
  const thirsty = makeTaxon({ traits: { drought_tolerance: 'low', moisture_use: 'high' } });

  const effRain = core.resolveEffectiveSite(lookup, 'today', { watering: 'rain', cddDays: 60 });
  const effFirst = core.resolveEffectiveSite(lookup, 'today', { watering: 'first-years', cddDays: 60 });
  const effAll = core.resolveEffectiveSite(lookup, 'today', { watering: 'all-year', cddDays: 60 });
  const eff2050 = core.resolveEffectiveSite(lookup, 'y2050', { watering: 'rain', cddDays: 60 });

  assert.equal(core.evaluatePlantVerdict(thirsty, effRain).reasons.some((r) => r.code === 'dry_spell_water'), true);
  assert.equal(core.evaluatePlantVerdict(thirsty, effFirst).reasons.some((r) => r.code === 'dry_spell_water'), true);
  assert.equal(core.evaluatePlantVerdict(thirsty, effAll).reasons.some((r) => r.code === 'dry_spell_water'), false);
  const v2050 = core.evaluatePlantVerdict(thirsty, eff2050);
  assert.equal(v2050.reasons.some((r) => r.code === 'dry_spell_water'), false, 'SSP dry-spell must be note, never check');
  assert.equal(v2050.notes.includes('may_need_summer_water'), true);
});

test('A8: ROOM_LIMIT_M is unified between site.ts and report.ts, and isWinterCrop excludes warm-season Fall', () => {
  assert.equal(core.resolveEffectiveSite(makeLookup(), 'today', { room: 'pots' }).roomLimitM, 2);
  assert.equal(core.resolveEffectiveSite(makeLookup(), 'today', { room: 'small' }).roomLimitM, 6);
  assert.equal(core.resolveEffectiveSite(makeLookup(), 'today', { room: 'large' }).roomLimitM, 12);
  assert.equal(core.resolveEffectiveSite(makeLookup(), 'today', { room: 'field' }).roomLimitM, null);
  assert.equal(core.ROOM_LIMIT_M.pots, 2);
  assert.equal(core.ROOM_LIMIT_M.large, 12);

  const fallOnly = makeTaxon({ traits: { active_growth_period: 'Spring, Summer, Fall', is_annual: false } });
  assert.equal(core.isWinterCrop(fallOnly, [], 'N'), false, 'Fall-only warm-season crop is not a winter crop');
});
