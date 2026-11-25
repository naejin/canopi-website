// Property-based 6-site agronomic scenario suite for Stage 2A (Commit 0).
// Runs against the real Schema 4.11 SQLite export (public/data/consortium/*.sqlite.gz)
// and real canopi-climate v0.7.0 tiles via the production climate-v07.ts builders when
// installed (public/data/climate/), with a clearly labelled synthetic fallback when
// gitignored climate tiles are absent in pre-build CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

import {
  computeGrowingYear,
  computeReport,
  evaluatePlantVerdict,
  findCompatibleSwaps,
  formatAreaName,
  formatCountryName,
  isWinterCrop,
  jobsOf,
  preferredFrostC,
  REPORT_SCENARIOS,
  resolveEffectiveSite,
  selectStarterPalette,
  toxicityStatusOf,
} from '../src/lib/palette/index.ts';
import { createSqliteSource } from '../src/islands/palette/data/sqlite-source.ts';
import {
  buildMonthlyV07,
  buildTier1V07,
  buildTier2AV07,
} from '../src/islands/palette/state/climate-v07.ts';
import {
  createTileSource,
  initClimateWasm,
  lookupSite,
  lookupSiteMonthly,
  lookupSiteTier2A,
  siteIndex,
} from '../src/lib/climate/index.ts';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const CONSORTIUM_INDEX = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'consortium-index.json'), 'utf8'));
const SQLITE_GZ_PATH = join(ROOT, 'public', 'data', 'consortium', CONSORTIUM_INDEX.files[0].file);
const CLIMATE_INDEX_PATH = join(ROOT, 'src', 'data', 'climate-index.json');
const round1 = (n) => Math.round(n * 10) / 10;

function openRealSource() {
  const raw = gunzipSync(readFileSync(SQLITE_GZ_PATH));
  const tmpPath = `/tmp/canopi-s2a-${process.pid}.sqlite`;
  writeFileSync(tmpPath, raw);
  const db = new DatabaseSync(tmpPath, { readOnly: true });
  const adapter = {
    selectObjects(sql, bind = []) {
      return db.prepare(sql).all(...bind);
    },
    selectArrays(sql, bind = []) {
      const stmt = db.prepare(sql);
      stmt.setReturnArrays(true);
      return stmt.all(...bind);
    },
  };
  const source = createSqliteSource(adapter, { images: CONSORTIUM_INDEX.images ?? {} });
  return {
    source,
    db,
    close() {
      db.close();
      try { unlinkSync(tmpPath); } catch { /* ignore */ }
    },
  };
}

// 6 real agronomic test sites spanning Mediterranean, Temperate, Subtropical, SH, Mountain, Tropical
const SITES = [
  { id: 'montpellier', name: 'Montpellier', lat: 43.61, lon: 3.88, zone: 'Mediterranean', country: 'FR', plotM2: 150, phOverride: 7.7 },
  { id: 'lyon', name: 'Lyon', lat: 45.76, lon: 4.84, zone: 'Temperate', country: 'FR', plotM2: 150 },
  { id: 'kyoto', name: 'Kyoto', lat: 35.01, lon: 135.77, zone: 'Subtropical', country: 'JP', plotM2: 150 },
  { id: 'capetown', name: 'Cape Town', lat: -33.92, lon: 18.42, zone: 'Mediterranean', country: 'ZA', plotM2: 150 },
  { id: 'briancon', name: 'Briançon', lat: 44.90, lon: 6.64, zone: 'Continental', country: 'FR', plotM2: 150 },
  { id: 'belem', name: 'Belém', lat: -1.45, lon: -48.50, zone: 'Tropical', country: 'BR', plotM2: 150 },
];

// Synthetic fallback lookups — ONLY used when gitignored public/data/climate/ is absent in pre-build CI.
// Real-tile exact-value assertions are gated on `usingRealTiles === true`.
function makeSyntheticPeriods(base) {
  const sspDeltas = [
    ['2041-2070', 'ssp126', 1.1, 1.4, 0.96],
    ['2041-2070', 'ssp245', 1.6, 2.2, 0.92],
    ['2041-2070', 'ssp370', 2.0, 2.8, 0.89],
    ['2041-2070', 'ssp585', 2.4, 3.4, 0.86],
    ['2071-2099', 'ssp245', 2.3, 3.1, 0.88],
    ['2071-2099', 'ssp585', 3.9, 5.2, 0.80],
  ];
  return [
    { period: '1991-2020', scenario: 'historical', koppenTemperatureMarginC: 1, ...base },
    ...sspDeltas.map(([period, scenario, dCold, dWarm, pMul]) => ({
      period,
      scenario,
      koppen: base.koppen,
      koppenTemperatureMarginC: 1,
      tminColdC: round1(base.tminColdC + dCold),
      tmaxWarmC: round1(base.tmaxWarmC + dWarm),
      tmeanColdC: round1(base.tmeanColdC + dCold),
      tmeanWarmC: round1(base.tmeanWarmC + dWarm),
      aridityIndex: round1(base.aridityIndex * pMul),
      precipMm: Math.round(base.precipMm * pMul),
      dryMonths: Math.min(12, base.dryMonths + (pMul < 0.9 ? 1 : 0)),
    })),
  ];
}

function makeSyntheticExtremePeriods(tmin0, tmax0, usdaZone) {
  const sspDeltas = [
    ['1991-2020', 'historical', 0, 0],
    ['2041-2070', 'ssp126', 1.2, 1.5],
    ['2041-2070', 'ssp245', 1.8, 2.3],
    ['2041-2070', 'ssp370', 2.2, 2.9],
    ['2041-2070', 'ssp585', 2.6, 3.5],
    ['2071-2099', 'ssp245', 2.5, 3.2],
    ['2071-2099', 'ssp585', 4.2, 5.4],
  ];
  return sspDeltas.map(([period, scenario, dCold, dWarm]) => ({
    period,
    scenario,
    tminExtremeC: round1(tmin0 + dCold),
    tmaxExtremeC: round1(tmax0 + dWarm),
    usdaZone,
  }));
}

function makeSyntheticSite(cfg) {
  const extPeriods = makeSyntheticExtremePeriods(cfg.tminExt, cfg.tmaxExt, cfg.usdaZone);
  return {
    lat: cfg.lat,
    lon: cfg.lon,
    climate: { cellLat: cfg.lat, cellLon: cfg.lon, distanceCells: 0, periods: makeSyntheticPeriods(cfg.base) },
    soil: { phH2o: cfg.ph, clayPct: 22, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: cfg.wgsrpdL3, isoA2: cfg.country },
    v07: {
      extremes: {
        tminExtremeC: cfg.tminExt,
        tmaxExtremeC: cfg.tmaxExt,
        usdaZone: cfg.usdaZone,
        futureTminExtremeC: extPeriods[2].tminExtremeC,
        futureTmaxExtremeC: extPeriods[2].tmaxExtremeC,
        lateTminExtremeC: extPeriods[5].tminExtremeC,
        lateTmaxExtremeC: extPeriods[5].tmaxExtremeC,
        periods: extPeriods,
      },
      extremesTail: {
        coldTail10yrC: round1(cfg.tminExt + cfg.tminGap),
        heatDome10yrC: round1(cfg.tmaxExt + cfg.tmaxGap),
        coldTail10yr2050C: round1(extPeriods[2].tminExtremeC + cfg.tminGap),
        heatDome10yr2050C: round1(extPeriods[2].tmaxExtremeC + cfg.tmaxGap),
        tminP10GapC: cfg.tminGap,
        tmaxP90GapC: cfg.tmaxGap,
        heatDays35: 5,
        recentTrendC: 0.4,
        p90DryStreakDays: cfg.cdd,
      },
      waterBalance: { cwdMm: 220, cwdP90Mm: 300, cddDays: cfg.cdd, vpdSummerKpa: 1.2, annualDeficitMm: 200 },
      soilPlus: { ph30_100: cfg.ph, clay30_100: 24, cfvo0_30: 12, cfvo30_100: 16, om0_30Pct: 2.5, awcMmPerM: 140, dryDaysReserve: 28 },
    },
  };
}

const SYNTHETIC_FALLBACK_LOOKUPS = {
  montpellier: makeSyntheticSite({ lat: 43.61, lon: 3.88, ph: 7.7, wgsrpdL3: 'FRA', country: 'FR', tminExt: -2.1, tmaxExt: 35.4, tminGap: -2.2, tmaxGap: 1.5, usdaZone: '9b', cdd: 27, base: { koppen: 'Csa', tminColdC: 4.0, tmaxWarmC: 30.1, tmeanColdC: 7.4, tmeanWarmC: 24.3, aridityIndex: 0.62, precipMm: 690, dryMonths: 2 } }),
  lyon: makeSyntheticSite({ lat: 45.76, lon: 4.84, ph: 6.9, wgsrpdL3: 'FRA', country: 'FR', tminExt: -7.5, tmaxExt: 33.8, tminGap: -1.8, tmaxGap: 1.6, usdaZone: '8b', cdd: 18, base: { koppen: 'Cfb', tminColdC: 0.1, tmaxWarmC: 27.6, tmeanColdC: 3.4, tmeanWarmC: 21.8, aridityIndex: 0.92, precipMm: 830, dryMonths: 0 } }),
  kyoto: makeSyntheticSite({ lat: 35.01, lon: 135.77, ph: 5.8, wgsrpdL3: 'JAP', country: 'JP', tminExt: -4.0, tmaxExt: 36.2, tminGap: -1.4, tmaxGap: 1.3, usdaZone: '9a', cdd: 11, base: { koppen: 'Cfa', tminColdC: 0.8, tmaxWarmC: 32.8, tmeanColdC: 4.5, tmeanWarmC: 27.6, aridityIndex: 1.45, precipMm: 1540, dryMonths: 0 } }),
  capetown: makeSyntheticSite({ lat: -33.92, lon: 18.42, ph: 6.3, wgsrpdL3: 'CPP', country: 'ZA', tminExt: 2.4, tmaxExt: 34.2, tminGap: -1.1, tmaxGap: 1.6, usdaZone: '10b', cdd: 36, base: { koppen: 'Csb', tminColdC: 7.4, tmaxWarmC: 26.8, tmeanColdC: 12.2, tmeanWarmC: 21.4, aridityIndex: 0.58, precipMm: 560, dryMonths: 4 } }),
  briancon: makeSyntheticSite({ lat: 44.90, lon: 6.64, ph: 7.2, wgsrpdL3: 'FRA', country: 'FR', tminExt: -16.8, tmaxExt: 29.4, tminGap: -2.7, tmaxGap: 1.8, usdaZone: '6b', cdd: 15, base: { koppen: 'Dfb', tminColdC: -8.4, tmaxWarmC: 23.2, tmeanColdC: -3.2, tmeanWarmC: 16.4, aridityIndex: 1.15, precipMm: 940, dryMonths: 0 } }),
  belem: makeSyntheticSite({ lat: -1.45, lon: -48.50, ph: 5.0, wgsrpdL3: 'BZN', country: 'BR', tminExt: 19.5, tmaxExt: 34.8, tminGap: -0.7, tmaxGap: 1.1, usdaZone: '13a', cdd: 6, base: { koppen: 'Af', tminColdC: 21.8, tmaxWarmC: 32.6, tmeanColdC: 25.8, tmeanWarmC: 27.4, aridityIndex: 2.1, precipMm: 2900, dryMonths: 0 } }),
};

async function loadSiteLookups() {
  if (!existsSync(CLIMATE_INDEX_PATH)) return { lookups: SYNTHETIC_FALLBACK_LOOKUPS, usingRealTiles: false };
  const idxFile = JSON.parse(readFileSync(CLIMATE_INDEX_PATH, 'utf8'));
  const baseDir = join(ROOT, 'public', idxFile.base.replace(/^\/+/, ''));
  if (!existsSync(baseDir)) return { lookups: SYNTHETIC_FALLBACK_LOOKUPS, usingRealTiles: false };

  await initClimateWasm();
  const idx = siteIndex(idxFile);
  const tileSource = createTileSource({
    index: idx,
    fetchBytes: async (url) => {
      const rel = url.replace(/^\/+/, '');
      const buf = readFileSync(join(ROOT, 'public', rel));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
  });

  // Use the exact production climate-v07.ts builders (Tier 1, Tier 2A, Tier 2B)
  const lookups = {};
  for (const s of SITES) {
    const raw = await lookupSite(s.lat, s.lon, tileSource);
    const tier1V07 = buildTier1V07(raw.tier1);
    const baseLookup = {
      lat: raw.lat,
      lon: raw.lon,
      climate: raw.climate,
      soil: raw.soil,
      regions: raw.regions,
      v07: { ...tier1V07 },
    };
    const loc = { lat: raw.lat, lon: raw.lon, source: 'search', lookup: baseLookup };
    const t2aRaw = await lookupSiteTier2A(raw, tileSource);
    const tier2AV07 = await buildTier2AV07(loc, t2aRaw, baseLookup.v07);
    const t2bRaw = await lookupSiteMonthly(raw, tileSource);
    const monthlyV07 = buildMonthlyV07(t2bRaw);
    lookups[s.id] = {
      ...baseLookup,
      v07: {
        ...tier1V07,
        ...tier2AV07,
        monthly: monthlyV07,
      },
    };
  }
  return { lookups, usingRealTiles: true };
}

test('Schema 4.11 ingestion: quotes, extremes, phase 0, WGSRPD L3 names, and layerValues bulk query', async () => {
  const { source, db, close } = openRealSource();
  try {
    assert.equal(source.info().releaseId, 'r-b5e142e37fa0deff');
    const medPool = await source.pool('Mediterranean');
    assert.ok(medPool.length >= 150, `Expected >= 150 Mediterranean taxa, got ${medPool.length}`);

    // 1. plant_climate_extremes populated on pool taxa
    const withExt = medPool.filter((t) => t.extremes?.tminExtreme?.low != null && t.extremes?.tmaxExtreme?.high != null);
    assert.ok(withExt.length >= 150, `Expected >= 150 taxa with extremes, got ${withExt.length}`);

    // 2. default_phase_start = 0 preserved cleanly ('placenta_i'), never coerced to null
    const phaseZero = medPool.filter((t) => t.phases?.start === 'placenta_i');
    assert.ok(phaseZero.length > 0, 'Expected taxa with phase_start = 0 (placenta_i)');

    // 3. Schema 4.11 trait_sources.quote & source_url read cleanly
    const quotedPlantRow = db.prepare('SELECT p.id FROM trait_sources ts JOIN plants p USING (plant) WHERE ts.quote IS NOT NULL LIMIT 1').get();
    assert.ok(quotedPlantRow, 'Expected at least one plant with trait_sources.quote in Schema 4.11');
    const details = await source.details(String(quotedPlantRow.id), 'Mediterranean', 'en');
    const quotedTs = details.traitSources.find((ts) => typeof ts.quote === 'string' && ts.quote.length > 0);
    assert.ok(quotedTs, 'Expected sqlite-source details() to expose Schema 4.11 trait_sources.quote');

    // 4. layerValues() bulk query returns real scoped rows (not empty stub)
    const lvMap = await source.layerValues(medPool.slice(0, 20).map((t) => t.id), 'Mediterranean');
    assert.ok(lvMap.size > 0, 'Expected layerValues() to return non-empty map');

    // 5. WGSRPD L3 area names: 0 raw 3-letter codes for all 358 areas in DB
    const allAreas = db.prepare('SELECT code FROM areas').all();
    for (const row of allAreas) {
      const name = formatAreaName(String(row.code));
      assert.ok(name.length > 3 || name !== String(row.code), `Raw area code leaked: ${row.code} -> ${name}`);
    }
    assert.equal(formatAreaName('FRA'), 'France');
    assert.equal(formatAreaName('CPP'), 'Cape Provinces');
    assert.equal(formatCountryName('FR', 'en'), 'France');
  } finally {
    close();
  }
});

test('6-site agronomic invariants: starter validity, per-slot extremes, zero fallbacks, swaps, frost-tender guard, SH isolation', async () => {
  const { source, close } = openRealSource();
  const { lookups, usingRealTiles } = await loadSiteLookups();

  try {
    for (const site of SITES) {
      const lookup = lookups[site.id];
      const pool = await source.pool(site.zone);
      const interactions = await source.interactions(site.zone);
      const overrides = { plotM2: site.plotM2, ...(site.phOverride ? { soilPh: site.phOverride } : {}) };
      const effToday = resolveEffectiveSite(lookup, 'today', overrides);

      // Production Tier-2A water tank ran on real tiles
      if (usingRealTiles) {
        assert.ok(effToday.tankDays !== null && effToday.tankDays > 0, `${site.name}: expected production tankDays > 0, got ${effToday.tankDays}`);
        assert.ok(effToday.cddDays !== null, `${site.name}: expected production cddDays !== null`);
      }

      // Invariant 1: Per-slot extremes for every SSP equal slot extreme + Today gap (marked est.), and each future slot differs from Today
      const tminGap = lookup.v07?.extremesTail?.tminP10GapC ?? 0;
      const tmaxGap = lookup.v07?.extremesTail?.tmaxP90GapC ?? 0;
      const sspScenarios = REPORT_SCENARIOS.filter((s) => s.kind === 'ssp');
      for (const sc of sspScenarios) {
        const scEff = resolveEffectiveSite(lookup, sc.id, overrides);
        assert.equal(scEff.hasClimate, true, `${site.name} ${sc.id}: hasClimate`);
        const slotExt = lookup.v07?.extremes?.periods?.find((p) => p.period === sc.period && p.scenario === sc.scenario);
        assert.ok(slotExt, `${site.name} ${sc.id}: expected per-slot extreme in v07.extremes.periods`);
        assert.equal(scEff.freeze10C, round1(slotExt.tminExtremeC + tminGap), `${site.name} ${sc.id}: freeze10C must equal slot extreme + gap`);
        assert.equal(scEff.heat10C, round1(slotExt.tmaxExtremeC + tmaxGap), `${site.name} ${sc.id}: heat10C must equal slot extreme + gap`);
        assert.equal(scEff.extremesEst, true, `${site.name} ${sc.id}: future extremes must be marked est.`);
        const rawSlot = lookup.climate.periods.find((p) => p.period === sc.period && p.scenario === sc.scenario);
        assert.equal(scEff.tminColdC, round1(rawSlot.tminColdC), `${site.name} ${sc.id}: uses slot tminColdC, not Today`);
        assert.equal(scEff.tmaxWarmC, round1(rawSlot.tmaxWarmC), `${site.name} ${sc.id}: uses slot tmaxWarmC, not Today`);
      }

      // Invariant 2: Truth-first starter validity (0 outside climate/extremes/pH; crown <= net area; multi-layer guild)
      const starter = selectStarterPalette(pool, effToday, { maxPlants: 8 });
      assert.equal(starter.length, 8, `${site.name}: expected 8 starter plants, got ${starter.length}`);
      const woodyCount = starter.filter((t) => /tree|shrub|palm|bamboo/i.test(t.traits.habit ?? '')).length;
      assert.ok(woodyCount >= 2, `${site.name}: expected >= 2 woody tree/shrub anchors in starter guild, got ${woodyCount}`);
      const perennialCount = starter.filter((t) => t.traits.is_annual !== true).length;
      assert.ok(perennialCount >= 6, `${site.name}: expected >= 6 perennial plants in starter guild, got ${perennialCount}`);

      const lvMap = await source.layerValues(starter.map((t) => t.id), site.zone);
      const existingIds = new Set([starter[0].id]);
      const report = computeReport({
        taxa: starter,
        lookup,
        climateZone: site.zone,
        horizon: 'today',
        overrides,
        interactions,
        layerValuesByPlant: lvMap,
        existingIds,
      });

      for (const t of starter) {
        const v = report.verdicts.get(t.id);
        assert.equal(v?.level, 'fits', `${site.name}: starter ${t.canonical_name} must fit, got ${v?.level}`);
        assert.equal(v?.subsoilPhTrap, false, `${site.name}: starter ${t.canonical_name} must not have subsoil pH trap`);
      }
      assert.ok(report.crownBudget.totalCrownM2 <= report.crownBudget.netPlotM2, `${site.name}: starter crown ${report.crownBudget.totalCrownM2} > net ${report.crownBudget.netPlotM2}`);
      assert.equal(report.crownBudget.overBudget, false, `${site.name}: starter must not be over crown budget`);

      // Invariant 3: Single-source count identity + Already on site exclusion from nurseryList only
      const { total, fits, check, atRisk, unknown } = report.counts;
      assert.equal(total, starter.length, `${site.name}: counts.total === taxa.length`);
      assert.equal(fits + check + atRisk + unknown, total, `${site.name}: verdict counts sum to total`);
      assert.equal(report.verdicts.size, total, `${site.name}: verdicts.size === total`);
      assert.equal(report.nurseryList.length, total - 1, `${site.name}: existing plant excluded from nurseryList`);
      assert.equal(report.nurseryList.some((t) => t.id === starter[0].id), false);
      assert.equal(report.verdicts.get(starter[0].id)?.alreadyOnSite, true);
      assert.equal(report.robustness.allScenarioBreaks.length, 10);

      // Invariant 4: Like-for-like swaps on EVERY starter plant keep primary job, exact habit, 0.35x-2.2x height, and fits/check verdict
      const inPalette = new Set(starter.map((x) => x.id));
      for (const target of starter) {
        const targetJobs = jobsOf(target);
        const primaryJob = targetJobs.includes('feeds_you') ? 'feeds_you' : (targetJobs[0] ?? null);
        const targetHabit = (target.traits.habit ?? '').trim().toLowerCase();
        const targetH = target.traits.height_m?.max ?? null;
        const swaps = findCompatibleSwaps(target, pool, effToday, inPalette);
        for (const sw of swaps) {
          assert.ok(sw.verdict.level === 'fits' || sw.verdict.level === 'check', `${site.name}: swap ${sw.taxon.canonical_name} must be fits/check, got ${sw.verdict.level}`);
          assert.notEqual(sw.taxon.id, target.id);
          if (primaryJob) {
            assert.ok(jobsOf(sw.taxon).includes(primaryJob), `${site.name}: swap ${sw.taxon.canonical_name} for ${target.canonical_name} must keep primary job ${primaryJob}`);
          }
          if (targetHabit) {
            assert.equal((sw.taxon.traits.habit ?? '').trim().toLowerCase(), targetHabit, `${site.name}: swap ${sw.taxon.canonical_name} must keep habit ${targetHabit}`);
          }
          const candH = sw.taxon.traits.height_m?.max ?? null;
          if (targetH !== null && targetH > 0 && candH !== null) {
            assert.ok(candH >= targetH * 0.35 && candH <= targetH * 2.2, `${site.name}: swap ${sw.taxon.canonical_name} height ${candH}m outside 0.35x-2.2x of ${target.canonical_name} (${targetH}m)`);
          }
        }
      }

      // Invariant 5: Toxicity honesty across entire pool
      for (const t of pool) {
        const tox = toxicityStatusOf(t);
        if (t.warnings.toxicity === null) assert.equal(tox.status, 'unknown');
        else if (t.warnings.toxicity.level === 'None') assert.equal(tox.status, 'not_toxic');
        else assert.equal(tox.status, 'toxic');
      }
    }

    // Invariant 6: Real-tile Montpellier 2080s SSP5-8.5 exact match with approved v7.3 (-0.1 °C)
    if (usingRealTiles) {
      const m2080_585 = resolveEffectiveSite(lookups.montpellier, 'y2080_ssp585');
      const m2050_585 = resolveEffectiveSite(lookups.montpellier, 'y2050_ssp585');
      const m2050_126 = resolveEffectiveSite(lookups.montpellier, 'y2050_ssp126');
      assert.equal(m2080_585.freeze10C, -0.1, `Montpellier 2080s SSP5-8.5 freeze10C must be -0.1, got ${m2080_585.freeze10C}`);
      assert.equal(m2050_585.freeze10C, -1.9, `Montpellier 2050s SSP5-8.5 freeze10C must be -1.9, got ${m2050_585.freeze10C}`);
      assert.equal(m2050_126.freeze10C, -3.0, `Montpellier 2050s SSP1-2.6 freeze10C must be -3.0, got ${m2050_126.freeze10C}`);
    }

    // Invariant 7: Missing scenario slot NEVER falls back to Today; missing extremes NEVER fall back to monthly-mean tminColdC
    const medPool = await source.pool('Mediterranean');
    const olive = medPool.find((t) => t.canonical_name === 'Olea europaea');
    assert.ok(olive, 'Expected Olea europaea in Mediterranean pool');

    const onlyTodayLookup = {
      ...lookups.montpellier,
      climate: {
        ...lookups.montpellier.climate,
        periods: lookups.montpellier.climate.periods.filter((p) => p.period === '1991-2020'),
      },
    };
    const missing2050 = resolveEffectiveSite(onlyTodayLookup, 'y2050');
    assert.equal(missing2050.hasClimate, false, 'Missing SSP slot must set hasClimate = false');
    assert.equal(missing2050.tminColdC, null, 'Missing SSP slot must not fall back to Today tminColdC');
    assert.equal(missing2050.freeze10C, null, 'Missing SSP slot must not fall back to Today freeze10C');
    assert.equal(evaluatePlantVerdict(olive, missing2050).level, 'unknown', 'Missing SSP slot must yield unknown verdict');

    const noExtremesLookup = {
      ...lookups.montpellier,
      v07: { ...(lookups.montpellier.v07 ?? {}), extremes: null, extremesTail: null },
    };
    const noExtEff = resolveEffectiveSite(noExtremesLookup, 'today');
    assert.equal(noExtEff.freeze10C, null, 'Missing extremes must return freeze10C = null, never monthly-mean tminColdC');
    assert.equal(noExtEff.heat10C, null, 'Missing extremes must return heat10C = null, never monthly-mean tmaxWarmC');

    // Invariant 8: Real-DB frost_tender guard — ZERO frost_tender plants across all pools are flagged as winter crops
    for (const zone of ['Mediterranean', 'Temperate', 'Subtropical', 'Tropical']) {
      const p = await source.pool(zone);
      for (const t of p) {
        if (t.traits.frost_tender === true) {
          assert.equal(isWinterCrop(t, [], 'N'), false, `${zone}: frost_tender ${t.canonical_name} must not be a winter crop`);
          assert.equal(isWinterCrop(t, ['Oct', 'Nov'], 'N'), false, `${zone}: frost_tender ${t.canonical_name} with autumn sow must not be a winter crop`);
        }
      }
    }

    // Invariant 9: Non-circular Cape Town (SH) isolation — real N-scoped rows NEVER leak into Cape Town tracks
    const allMedLv = await source.layerValues(medPool.map((t) => t.id), 'Mediterranean');
    const nOnlyTaxa = medPool.filter((t) => {
      const rows = (allMedLv.get(t.id) ?? []).filter((lv) =>
        (lv.field === 'sowing_months' || lv.field === 'bloom_months' || lv.field === 'ripening_or_fruit_seen_months')
        && lv.months?.length,
      );
      return rows.length > 0 && rows.every((lv) => lv.scope?.hemisphere === 'N');
    });
    assert.ok(nOnlyTaxa.length > 0, 'Expected real plants in Mediterranean pool with strictly N-scoped calendar rows');
    const ctGrowingYear = computeGrowingYear(
      nOnlyTaxa,
      allMedLv,
      { lat: lookups.capetown.lat, country: 'ZA', zone: 'Mediterranean' },
      'S',
    );
    for (const t of nOnlyTaxa) {
      const tr = ctGrowingYear.tracks.get(t.id);
      assert.equal(tr?.hasAny, false, `Cape Town: N-scoped row leaked into track for ${t.canonical_name}`);
    }

    // Invariant 10: Real-DB swap sanity (Hazelnut never swaps to sweet pepper; Olive never swaps to 30m Diospyros lotus)
    const montpellierEff = resolveEffectiveSite(lookups.montpellier, 'today', { soilPh: 7.7 });
    const hazelnut = medPool.find((t) => t.canonical_name === 'Corylus avellana');
    if (hazelnut) {
      const hazSwaps = findCompatibleSwaps(hazelnut, medPool, montpellierEff, new Set([hazelnut.id]), 20);
      assert.equal(hazSwaps.some((s) => s.taxon.canonical_name === 'Capsicum annuum'), false, 'Hazelnut must never swap to Capsicum annuum');
    }
    const oliveSwaps = findCompatibleSwaps(olive, medPool, montpellierEff, new Set([olive.id]), 20);
    assert.equal(oliveSwaps.some((s) => (s.taxon.traits.height_m?.max ?? 0) > (olive.traits.height_m?.max ?? 20) * 2.2), false, 'Olive swap exceeded 2.2x height band');

    // Invariant 11: Specific Agronomic Extremes Cases: Lemon at Briançon at_risk, Olive at Montpellier fits
    const subPool = await source.pool('Subtropical');
    const lemon = subPool.find((t) => t.canonical_name === 'Citrus limon');
    assert.ok(lemon, 'Expected Citrus limon in Subtropical pool');
    const brianconEff = resolveEffectiveSite(lookups.briancon, 'today');
    assert.equal(evaluatePlantVerdict(lemon, brianconEff).level, 'at_risk', 'Lemon at Briançon must be at_risk');
    assert.equal(evaluatePlantVerdict(olive, montpellierEff).level, 'fits', 'Olive at Montpellier must fit');

    // Stage unknown & dormant ktmpr preference
    const noPhaseTaxon = { ...olive, phases: null };
    assert.equal(evaluatePlantVerdict(noPhaseTaxon, montpellierEff).stageLabel, 'stage_unknown');
    assert.ok(evaluatePlantVerdict(noPhaseTaxon, montpellierEff).notes.includes('stage_unknown'));

    const pref = preferredFrostC([
      { kind: 'ktmp', valueC: -2, frostClass: null, variety: null, coarse: false, source: 'ecocrop', scopeCountry: null },
      { kind: 'ktmpr', valueC: -15, frostClass: null, variety: null, coarse: false, source: 'ecocrop', scopeCountry: null },
    ]);
    assert.equal(pref?.kind, 'ktmpr');
    assert.equal(pref?.valueC, -15);
  } finally {
    close();
  }
});
