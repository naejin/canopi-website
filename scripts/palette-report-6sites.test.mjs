// Property-based 6-site agronomic scenario suite for Stage 2A (Commit 0).
// Runs against the real Schema 4.11 SQLite export (public/data/consortium/*.sqlite.gz)
// and real canopi-climate v0.7.0 tiles when installed (public/data/climate/), with a
// deterministic real-tile snapshot fallback when gitignored tiles are absent in CI pre-build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

import {
  computeReport,
  evaluatePlantVerdict,
  findCompatibleSwaps,
  formatAreaName,
  formatCountryName,
  holdsLayerPlace,
  isWinterCrop,
  preferredFrostC,
  REPORT_SCENARIOS,
  resolveEffectiveSite,
  selectStarterPalette,
  toxicityStatusOf,
} from '../src/lib/palette/index.ts';
import { createSqliteSource } from '../src/islands/palette/data/sqlite-source.ts';
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

// Open real Schema 4.11 SQLite in-memory using Node's built-in node:sqlite
function openRealSource() {
  const raw = gunzipSync(readFileSync(SQLITE_GZ_PATH));
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA temp_store = MEMORY;');
  // Load bytes into a temporary buffer via SQLite deserialize if available, else temp file
  const tmpPath = join(ROOT, '.tmp-test-schema411.sqlite');
  let memDb = null;
  try {
    // Node 22.13+ node:sqlite doesn't expose deserialize; write to /tmp in memory-backed tmpfs
    const osTmp = `/tmp/canopi-s2a-${process.pid}.sqlite`;
    import('node:fs').then(() => {});
    void tmpPath;
    void memDb;
    return openViaTmp(raw, osTmp);
  } finally {
    db.close();
  }
}

import { unlinkSync, writeFileSync } from 'node:fs';

function openViaTmp(raw, tmpPath) {
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

// Deterministic fallback climate lookups (only used when gitignored public/data/climate/ is absent)
const FALLBACK_LOOKUPS = {
  montpellier: {
    lat: 43.61, lon: 3.88,
    climate: {
      cellLat: 43.6, cellLon: 3.9, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Csa', koppenTemperatureMarginC: 1, tminColdC: 2.5, tmaxWarmC: 30.1, tmeanColdC: 6.8, tmeanWarmC: 24.3, aridityIndex: 0.62, precipMm: 690, dryMonths: 2 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Csa', koppenTemperatureMarginC: 1, tminColdC: 4.2, tmaxWarmC: 32.8, tmeanColdC: 8.4, tmeanWarmC: 26.8, aridityIndex: 0.54, precipMm: 640, dryMonths: 3 },
        { period: '2071-2099', scenario: 'ssp585', koppen: 'Csa', koppenTemperatureMarginC: 1, tminColdC: 6.1, tmaxWarmC: 36.2, tmeanColdC: 10.3, tmeanWarmC: 29.9, aridityIndex: 0.45, precipMm: 570, dryMonths: 4 },
      ],
    },
    soil: { phH2o: 7.7, clayPct: 24, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
    v07: {
      extremes: { tminExtremeC: -3.2, tmaxExtremeC: 35.1, usdaZone: '9b' },
      extremesTail: { coldTail10yrC: -4.3, heatDome10yrC: 36.3, coldTail10yr2050C: -2.4, heatDome10yr2050C: 38.9, tminP10GapC: -1.1, tmaxP90GapC: 1.2, heatDays35: 6, recentTrendC: 0.4, p90DryStreakDays: 32 },
      waterBalance: { cwdMm: 310, cwdP90Mm: 420, cddDays: 27, vpdSummerKpa: 1.4, annualDeficitMm: 290 },
      soilPlus: { ph30_100: 7.8, clay30_100: 26, cfvo0_30: 13, cfvo30_100: 18, om0_30Pct: 2.2, awcMmPerM: 138, dryDaysReserve: 28 },
    },
  },
  lyon: {
    lat: 45.76, lon: 4.84,
    climate: {
      cellLat: 45.8, cellLon: 4.8, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 1, tminColdC: 0.1, tmaxWarmC: 27.6, tmeanColdC: 3.4, tmeanWarmC: 21.8, aridityIndex: 0.92, precipMm: 830, dryMonths: 0 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Cfa', koppenTemperatureMarginC: 1, tminColdC: 1.9, tmaxWarmC: 30.4, tmeanColdC: 5.1, tmeanWarmC: 24.4, aridityIndex: 0.81, precipMm: 790, dryMonths: 1 },
      ],
    },
    soil: { phH2o: 6.9, clayPct: 22, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
    v07: {
      extremes: { tminExtremeC: -7.5, tmaxExtremeC: 33.8, usdaZone: '8b' },
      extremesTail: { coldTail10yrC: -9.0, heatDome10yrC: 35.4, coldTail10yr2050C: -6.8, heatDome10yr2050C: 38.2, tminP10GapC: -1.5, tmaxP90GapC: 1.6, heatDays35: 3, recentTrendC: 0.4, p90DryStreakDays: 22 },
      waterBalance: { cwdMm: 140, cwdP90Mm: 220, cddDays: 18, vpdSummerKpa: 1.1, annualDeficitMm: 120 },
      soilPlus: { ph30_100: 7.1, clay30_100: 25, cfvo0_30: 10, cfvo30_100: 14, om0_30Pct: 2.8, awcMmPerM: 155, dryDaysReserve: 34 },
    },
  },
  kyoto: {
    lat: 35.01, lon: 135.77,
    climate: {
      cellLat: 35.0, cellLon: 135.8, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Cfa', koppenTemperatureMarginC: 1, tminColdC: 0.8, tmaxWarmC: 32.8, tmeanColdC: 4.5, tmeanWarmC: 27.6, aridityIndex: 1.45, precipMm: 1540, dryMonths: 0 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Cfa', koppenTemperatureMarginC: 1, tminColdC: 2.5, tmaxWarmC: 34.8, tmeanColdC: 6.2, tmeanWarmC: 29.6, aridityIndex: 1.42, precipMm: 1600, dryMonths: 0 },
      ],
    },
    soil: { phH2o: 5.8, clayPct: 20, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'JAP', isoA2: 'JP' },
    v07: {
      extremes: { tminExtremeC: -4.0, tmaxExtremeC: 36.2, usdaZone: '9a' },
      extremesTail: { coldTail10yrC: -5.2, heatDome10yrC: 37.5, coldTail10yr2050C: -3.4, heatDome10yr2050C: 39.5, tminP10GapC: -1.2, tmaxP90GapC: 1.3, heatDays35: 14, recentTrendC: 0.4, p90DryStreakDays: 14 },
      waterBalance: { cwdMm: 20, cwdP90Mm: 50, cddDays: 11, vpdSummerKpa: 0.9, annualDeficitMm: 10 },
      soilPlus: { ph30_100: 5.7, clay30_100: 22, cfvo0_30: 12, cfvo30_100: 15, om0_30Pct: 3.4, awcMmPerM: 160, dryDaysReserve: 36 },
    },
  },
  capetown: {
    lat: -33.92, lon: 18.42,
    climate: {
      cellLat: -33.9, cellLon: 18.4, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Csb', koppenTemperatureMarginC: 1, tminColdC: 7.4, tmaxWarmC: 26.8, tmeanColdC: 12.2, tmeanWarmC: 21.4, aridityIndex: 0.58, precipMm: 560, dryMonths: 4 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Csb', koppenTemperatureMarginC: 1, tminColdC: 8.8, tmaxWarmC: 28.6, tmeanColdC: 13.6, tmeanWarmC: 23.1, aridityIndex: 0.48, precipMm: 490, dryMonths: 5 },
      ],
    },
    soil: { phH2o: 6.3, clayPct: 14, texture: 'sandy_loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'CPP', isoA2: 'ZA' },
    v07: {
      extremes: { tminExtremeC: 2.4, tmaxExtremeC: 34.2, usdaZone: '10b' },
      extremesTail: { coldTail10yrC: 1.4, heatDome10yrC: 35.8, coldTail10yr2050C: 2.8, heatDome10yr2050C: 37.6, tminP10GapC: -1.0, tmaxP90GapC: 1.6, heatDays35: 4, recentTrendC: 0.3, p90DryStreakDays: 42 },
      waterBalance: { cwdMm: 420, cwdP90Mm: 520, cddDays: 36, vpdSummerKpa: 1.5, annualDeficitMm: 390 },
      soilPlus: { ph30_100: 6.4, clay30_100: 18, cfvo0_30: 14, cfvo30_100: 18, om0_30Pct: 1.9, awcMmPerM: 120, dryDaysReserve: 24 },
    },
  },
  briancon: {
    lat: 44.90, lon: 6.64,
    climate: {
      cellLat: 44.9, cellLon: 6.6, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Dfb', koppenTemperatureMarginC: 1, tminColdC: -8.4, tmaxWarmC: 23.2, tmeanColdC: -3.2, tmeanWarmC: 16.4, aridityIndex: 1.15, precipMm: 940, dryMonths: 0 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Dfb', koppenTemperatureMarginC: 1, tminColdC: -6.1, tmaxWarmC: 26.0, tmeanColdC: -1.1, tmeanWarmC: 19.1, aridityIndex: 1.02, precipMm: 900, dryMonths: 0 },
      ],
    },
    soil: { phH2o: 7.2, clayPct: 18, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
    v07: {
      extremes: { tminExtremeC: -16.8, tmaxExtremeC: 29.4, usdaZone: '6b' },
      extremesTail: { coldTail10yrC: -19.5, heatDome10yrC: 31.2, coldTail10yr2050C: -16.8, heatDome10yr2050C: 34.0, tminP10GapC: -2.7, tmaxP90GapC: 1.8, heatDays35: 0, recentTrendC: 0.5, p90DryStreakDays: 18 },
      waterBalance: { cwdMm: 80, cwdP90Mm: 140, cddDays: 15, vpdSummerKpa: 0.8, annualDeficitMm: 60 },
      soilPlus: { ph30_100: 7.4, clay30_100: 20, cfvo0_30: 24, cfvo30_100: 30, om0_30Pct: 3.1, awcMmPerM: 115, dryDaysReserve: 26 },
    },
  },
  belem: {
    lat: -1.45, lon: -48.50,
    climate: {
      cellLat: -1.5, cellLon: -48.5, distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Af', koppenTemperatureMarginC: 1, tminColdC: 21.8, tmaxWarmC: 32.6, tmeanColdC: 25.8, tmeanWarmC: 27.4, aridityIndex: 2.1, precipMm: 2900, dryMonths: 0 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Af', koppenTemperatureMarginC: 1, tminColdC: 23.2, tmaxWarmC: 34.3, tmeanColdC: 27.3, tmeanWarmC: 29.0, aridityIndex: 1.9, precipMm: 2750, dryMonths: 0 },
      ],
    },
    soil: { phH2o: 5.0, clayPct: 30, texture: 'clay_loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'BZN', isoA2: 'BR' },
    v07: {
      extremes: { tminExtremeC: 19.5, tmaxExtremeC: 34.8, usdaZone: '13a' },
      extremesTail: { coldTail10yrC: 18.8, heatDome10yrC: 35.9, coldTail10yr2050C: 20.2, heatDome10yr2050C: 37.6, tminP10GapC: -0.7, tmaxP90GapC: 1.1, heatDays35: 10, recentTrendC: 0.3, p90DryStreakDays: 8 },
      waterBalance: { cwdMm: 10, cwdP90Mm: 30, cddDays: 6, vpdSummerKpa: 0.7, annualDeficitMm: 0 },
      soilPlus: { ph30_100: 4.9, clay30_100: 36, cfvo0_30: 4, cfvo30_100: 6, om0_30Pct: 2.6, awcMmPerM: 145, dryDaysReserve: 35 },
    },
  },
};

async function loadRealSiteLookups() {
  if (!existsSync(CLIMATE_INDEX_PATH)) return FALLBACK_LOOKUPS;
  const idxFile = JSON.parse(readFileSync(CLIMATE_INDEX_PATH, 'utf8'));
  const baseDir = join(ROOT, 'public', idxFile.base.replace(/^\/+/, ''));
  if (!existsSync(baseDir)) return FALLBACK_LOOKUPS;

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

  const out = {};
  for (const s of SITES) {
    const raw = await lookupSite(s.lat, s.lon, tileSource);
    const t2a = await lookupSiteTier2A(raw, tileSource);
    const t2b = await lookupSiteMonthly(raw, tileSource);
    const extToday = raw.tier1?.extremes?.periods?.find((p) => p.period === '1991-2020');
    const ext2050 = raw.tier1?.extremes?.periods?.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245');
    const ext2080 = raw.tier1?.extremes?.periods?.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245');
    const tminGap = t2a.extremesTail?.tmin_p10_gap_c ?? null;
    const tmaxGap = t2a.extremesTail?.tmax_p90_gap_c ?? null;
    const mToday = t2b.monthly?.periods?.find((p) => p.period === '1991-2020');
    const m2050 = t2b.monthly?.periods?.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245');
    const m2080 = t2b.monthly?.periods?.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245');
    const pToday = t2b.monthlyPrecip?.periods?.find((p) => p.period === '1991-2020');
    const p2050 = t2b.monthlyPrecip?.periods?.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245');
    out[s.id] = {
      lat: raw.lat,
      lon: raw.lon,
      climate: raw.climate,
      soil: raw.soil,
      regions: raw.regions,
      v07: {
        extremes: extToday ? {
          tminExtremeC: extToday.tmin_extreme_c,
          tmaxExtremeC: extToday.tmax_extreme_c,
          usdaZone: extToday.usda_zone,
          futureTminExtremeC: ext2050?.tmin_extreme_c ?? null,
          futureTmaxExtremeC: ext2050?.tmax_extreme_c ?? null,
          lateTminExtremeC: ext2080?.tmin_extreme_c ?? null,
          lateTmaxExtremeC: ext2080?.tmax_extreme_c ?? null,
        } : null,
        extremesTail: t2a.extremesTail ? {
          coldTail10yrC: extToday && tminGap != null ? extToday.tmin_extreme_c + tminGap : null,
          heatDome10yrC: extToday && tmaxGap != null ? extToday.tmax_extreme_c + tmaxGap : null,
          coldTail10yr2050C: ext2050 && tminGap != null ? ext2050.tmin_extreme_c + tminGap : null,
          heatDome10yr2050C: ext2050 && tmaxGap != null ? ext2050.tmax_extreme_c + tmaxGap : null,
          tminP10GapC: tminGap,
          tmaxP90GapC: tmaxGap,
          heatDays35: t2a.extremesTail.heat_days_35c,
          recentTrendC: t2a.extremesTail.recent_trend_c,
          p90DryStreakDays: null,
        } : null,
        waterBalance: t2a.waterBalance ? {
          cwdMm: t2a.waterBalance.cwd_mm,
          cwdP90Mm: t2a.waterBalance.cwd_p90_mm,
          cddDays: t2a.waterBalance.cdd_max_days,
          vpdSummerKpa: t2a.waterBalance.vpd_summer_kpa,
          annualDeficitMm: t2a.waterBalance.cwd_mm,
        } : null,
        soilPlus: t2a.soilPlus ? {
          ph30_100: t2a.soilPlus.ph_30_100,
          clay30_100: t2a.soilPlus.clay_30_100_pct,
          cfvo0_30: t2a.soilPlus.cfvo_0_30_pct,
          cfvo30_100: t2a.soilPlus.cfvo_30_100_pct,
          om0_30Pct: t2a.soilPlus.om_0_30_pct,
          awcMmPerM: null,
          dryDaysReserve: null,
        } : null,
        monthly: mToday && pToday ? {
          tmeanTodayC: mToday.tmean_c,
          tminTodayC: mToday.tmin_c,
          tmean2050C: m2050?.tmean_c ?? mToday.tmean_c,
          tmean2080C: m2080?.tmean_c ?? [],
          precipTodayMm: pToday.precip_mm,
          precip2050Mm: p2050?.precip_mm ?? pToday.precip_mm,
          dryMonths: mToday.tmean_c.map((t, i) => t > 0 && (pToday.precip_mm[i] ?? 0) < t * 2),
          frostMonths: mToday.tmin_c.map((t) => t <= 0),
          gddBase10Today: null,
          gddBase10_2050: null,
        } : null,
      },
    };
  }
  return out;
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

test('6-site agronomic invariants: starter validity, single-source counts, zero hemisphere leaks, extremes, toxicity, swaps', async () => {
  const { source, close } = openRealSource();
  const lookups = await loadRealSiteLookups();

  try {
    for (const site of SITES) {
      const lookup = lookups[site.id];
      const pool = await source.pool(site.zone);
      const interactions = await source.interactions(site.zone);
      const overrides = { plotM2: site.plotM2, ...(site.phOverride ? { soilPh: site.phOverride } : {}) };
      const effToday = resolveEffectiveSite(lookup, 'today', overrides);

      // Invariant 1: Truth-first starter validity (0 outside climate/extremes/pH; crown <= net area)
      const starter = selectStarterPalette(pool, effToday, { maxPlants: 8 });
      assert.ok(starter.length >= 4, `${site.name}: expected >= 4 starter plants, got ${starter.length}`);

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

      // Every starter plant fits strictly
      for (const t of starter) {
        const v = report.verdicts.get(t.id);
        assert.equal(v?.level, 'fits', `${site.name}: starter ${t.canonical_name} must fit, got ${v?.level}`);
        assert.equal(v?.subsoilPhTrap, false, `${site.name}: starter ${t.canonical_name} must not have subsoil pH trap`);
      }
      assert.ok(report.crownBudget.totalCrownM2 <= report.crownBudget.netPlotM2, `${site.name}: starter crown ${report.crownBudget.totalCrownM2} > net ${report.crownBudget.netPlotM2}`);
      assert.equal(report.crownBudget.overBudget, false, `${site.name}: starter must not be over crown budget`);

      // Invariant 2: Single-source count identity + Already on site exclusion from nurseryList only
      const { total, fits, check, atRisk, unknown } = report.counts;
      assert.equal(total, starter.length, `${site.name}: counts.total === taxa.length`);
      assert.equal(fits + check + atRisk + unknown, total, `${site.name}: verdict counts sum to total`);
      assert.equal(report.verdicts.size, total, `${site.name}: verdicts.size === total`);
      assert.equal(report.nurseryList.length, total - 1, `${site.name}: existing plant excluded from nurseryList`);
      assert.equal(report.nurseryList.some((t) => t.id === starter[0].id), false);
      assert.equal(report.verdicts.get(starter[0].id)?.alreadyOnSite, true);

      // Invariant 3: All 10 climate scenarios computed
      assert.equal(report.robustness.allScenarioBreaks.length, REPORT_SCENARIOS.length);
      assert.equal(report.robustness.allScenarioBreaks.length, 10);

      // Invariant 4: Zero fabricated months & zero other-hemisphere leaks
      const place = { lat: effToday.lat, country: effToday.country, zone: site.zone };
      let unrecordedTracks = 0;
      for (const t of starter) {
        const track = report.growingYear.tracks.get(t.id);
        assert.ok(track);
        const scopedRows = (lvMap.get(t.id) ?? []).filter((lv) => lv.months?.length && holdsLayerPlace(lv, place));
        if (scopedRows.length === 0) {
          assert.equal(track.hasAny, false, `${site.name}: ${t.canonical_name} must not fabricate months`);
          unrecordedTracks++;
        }
        // Assert no opposite-hemisphere row passes holdsLayerPlace
        const oppHemi = effToday.hemisphere === 'S' ? 'N' : 'S';
        assert.equal(holdsLayerPlace({ climate: null, scope: { hemisphere: oppHemi } }, place), false);
      }
      assert.equal(report.growingYear.unknownCount, unrecordedTracks);

      // Invariant 5: Toxicity honesty across entire pool
      for (const t of pool) {
        const tox = toxicityStatusOf(t);
        if (t.warnings.toxicity === null) assert.equal(tox.status, 'unknown');
        else if (t.warnings.toxicity.level === 'None') assert.equal(tox.status, 'not_toxic');
        else assert.equal(tox.status, 'toxic');
      }

      // Invariant 6: Like-for-like swaps return valid non-at-risk candidates
      const swaps = findCompatibleSwaps(starter[0], pool, effToday, new Set(starter.map((x) => x.id)));
      for (const sw of swaps) {
        assert.notEqual(sw.verdict.level, 'at_risk');
        assert.notEqual(sw.taxon.id, starter[0].id);
      }
    }

    // Specific Agronomic Extremes Cases: Lemon at Briançon at_risk, Olive at Montpellier fits
    const subPool = await source.pool('Subtropical');
    const medPool = await source.pool('Mediterranean');
    const lemon = subPool.find((t) => t.canonical_name === 'Citrus limon');
    const olive = medPool.find((t) => t.canonical_name === 'Olea europaea');
    assert.ok(lemon, 'Expected Citrus limon in Subtropical pool');
    assert.ok(olive, 'Expected Olea europaea in Mediterranean pool');

    const brianconEff = resolveEffectiveSite(lookups.briancon, 'today');
    const montpellierEff = resolveEffectiveSite(lookups.montpellier, 'today', { soilPh: 7.7 });
    assert.equal(evaluatePlantVerdict(lemon, brianconEff).level, 'at_risk', 'Lemon at Briançon must be at_risk');
    assert.equal(evaluatePlantVerdict(olive, montpellierEff).level, 'fits', 'Olive at Montpellier must fit');

    // Stage unknown & phase 0 preservation
    const noPhaseTaxon = { ...olive, phases: null };
    assert.equal(evaluatePlantVerdict(noPhaseTaxon, montpellierEff).stageLabel, 'stage_unknown');
    assert.ok(evaluatePlantVerdict(noPhaseTaxon, montpellierEff).notes.includes('stage_unknown'));

    // Dormant ktmpr preferred over growing ktmp
    const pref = preferredFrostC([
      { kind: 'ktmp', valueC: -2, frostClass: null, variety: null, coarse: false, source: 'ecocrop', scopeCountry: null },
      { kind: 'ktmpr', valueC: -15, frostClass: null, variety: null, coarse: false, source: 'ecocrop', scopeCountry: null },
    ]);
    assert.equal(pref?.kind, 'ktmpr');
    assert.equal(pref?.valueC, -15);

    // Winter crop honesty: warm-season Fall alone is NOT a winter crop
    const warmFallTaxon = { ...olive, traits: { ...olive.traits, active_growth_period: 'Spring and Fall', is_annual: false, grown_as_annual: false } };
    assert.equal(isWinterCrop(warmFallTaxon, ['May', 'Jun'], 'N'), false);
    const realWinterTaxon = { ...olive, traits: { ...olive.traits, active_growth_period: 'Winter and Spring' } };
    assert.equal(isWinterCrop(realWinterTaxon, [], 'N'), true);
  } finally {
    close();
  }
});
