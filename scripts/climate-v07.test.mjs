// Slice 3.1 unit tests for canopi-climate v0.7.0 pure-TS helpers, additive layer decoders,
// sentinel 366 / hand_m south of 60°S handling, and decoupled climate_tiles_sha256 grid matching.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIMATE_V07_PINS,
  FROST_FREE_SENTINEL_DOY,
  NODATA,
  OPTIONAL_V07_LAYERS,
  adjustMicroclimate,
  decodeExtremesTail,
  decodeFrostCalendar,
  decodePhenology,
  decodeSoilPlus,
  decodeTerrain,
  decodeWaterBalance,
  evaluateTrajectory,
  photoperiod,
  soilAwcWithRock,
} from '../src/lib/climate/index.ts';
import { consortiumGridProblem } from './consortium-grid-check.mjs';

test('v0.7.0 pins and optional layer metadata are exported and valid', () => {
  assert.equal(CLIMATE_V07_PINS.climate_tiles_sha256, 'f689af2d4a81ed62937ec7c209fab42a15285aeac666ce60f2b2cf99d43e1e5b');
  assert.equal(CLIMATE_V07_PINS.packs_v07_sha256, '5d223909c56aa2df669e162a42f85fb6bb0be97f388e764df24eef20ea3de355');
  assert.equal(CLIMATE_V07_PINS.monolithic_tar_sha256, '1fd5ffd18197b34a7d0342f38ca8b0afa7a65182cd0a66aef03e3d0b33d2f079');
  assert.deepEqual(Object.keys(OPTIONAL_V07_LAYERS), [
    'frost_calendar', 'extremes_tail', 'phenology', 'water_balance', 'soil_plus', 'terrain',
  ]);
  assert.equal(FROST_FREE_SENTINEL_DOY, 366);
});

test('consortiumGridProblem accepts v0.7.0 decoupled climate_tiles_sha256', () => {
  const tilesSha = CLIMATE_V07_PINS.climate_tiles_sha256;
  const manifestSha = 'c'.repeat(64);
  const consortium = { release_id: 'r-d400aa2c5db28bb4', climate_grid_manifest_sha256: tilesSha };
  const climate = {
    release: { grid_manifest_sha256: manifestSha, climate_tiles_sha256: tilesSha },
    consortium_grid_check: { status: 'matched', consortium_release: 'r-d400aa2c5db28bb4' },
  };
  assert.equal(consortiumGridProblem(consortium, climate), null);
});

test('decodeFrostCalendar handles normal frost dates and sentinel 366 frost-free years', () => {
  const montpellier = decodeFrostCalendar([49, 344, 298, 72, 14]);
  assert.deepEqual(montpellier, {
    lastSpringFrostDoy: 49,
    firstAutumnFrostDoy: 344,
    frostFreeDays: 298,
    frostYearPct: 72,
    falseSpringPct: 14,
    frostFree: false,
  });

  const lisbon = decodeFrostCalendar([366, 366, 365, 0, 2]);
  assert.deepEqual(lisbon, {
    lastSpringFrostDoy: null,
    firstAutumnFrostDoy: null,
    frostFreeDays: 365,
    frostYearPct: 0,
    falseSpringPct: 2,
    frostFree: true,
  });

  assert.equal(decodeFrostCalendar([NODATA, NODATA, NODATA, NODATA]), null);
});

test('decodeExtremesTail, decodePhenology, decodeWaterBalance, decodeSoilPlus decode scaled values', () => {
  assert.deepEqual(decodeExtremesTail([-44, 425, 19, 74]), {
    coldTail10yrC: -4.4,
    heatDome10yrC: 42.5,
    heatDays35: 19,
    p90DryStreakDays: 74,
  });
  assert.deepEqual(decodePhenology([48, 34, 22]), {
    chillPortionsToday: 48,
    chillPortions2050: 34,
    chillPortions2080: 22,
  });
  assert.deepEqual(decodeWaterBalance([38, 410]), { cddDays: 38, annualDeficitMm: 410 });
  assert.deepEqual(decodeSoilPlus([78, 220, 410, 180, 26]), {
    subsoilPh: 7.8,
    subsoilClayPct: 22,
    subsoilSandPct: 41,
    stonePct: 18,
    omPct: 2.6,
  });
});

test('decodeTerrain returns handM normally north of 60°S and enforces handM = null south of 60°S', () => {
  const north = decodeTerrain([140, 85, 180, 125], 43.6);
  assert.deepEqual(north, { elevationM: 140, slopeDeg: 8.5, aspectDeg: 180, handM: 12.5 });

  const antarctic = decodeTerrain([250, 40, 90, 80], -64.5);
  assert.deepEqual(antarctic, { elevationM: 250, slopeDeg: 4, aspectDeg: 90, handM: null });
});

test('soilAwcWithRock reduces available water capacity proportionally with stone fraction', () => {
  const stoneFree = soilAwcWithRock({ sandPct: 40, clayPct: 25, omPct: 3, stonePct: 0 });
  const stony = soilAwcWithRock({ sandPct: 40, clayPct: 25, omPct: 3, stonePct: 50 });
  assert.ok(stoneFree.awcMmPerM > 100 && stoneFree.awcMmPerM < 250);
  assert.ok(Math.abs(stony.awcMmPerM - stoneFree.awcMmPerM * 0.5) <= 2);
  assert.ok(stony.dryDaysReserve < stoneFree.dryDaysReserve);
});

test('photoperiod returns ~12h at equinox, long summer day at 45°N, and polar extremes', () => {
  const eq = photoperiod(43.6, 80);
  assert.ok(eq > 11.7 && eq < 12.4, `equinox daylength ${eq}`);
  const summer = photoperiod(45, 172);
  assert.ok(summer > 15.2 && summer < 16.0, `summer solstice 45N ${summer}`);
  assert.equal(photoperiod(75, 172), 24);
  assert.equal(photoperiod(75, 355), 0);
});

test('adjustMicroclimate models hemisphere-aware aspect and valley cold-air pooling', () => {
  const valley = adjustMicroclimate({ coldC: 3.5, hotC: 30, falseSpringPct: 14, lat: 43.6 }, {
    slopeDeg: 15, aspect: 'north', landform: 'valley',
  });
  assert.ok(valley.coldDeltaC < -2.5);
  assert.ok(valley.adjustedFalseSpringPct > 14);

  const southWarm = adjustMicroclimate({ coldC: 5, hotC: 28, lat: -33.9 }, {
    slopeDeg: 15, aspect: 'north', landform: 'mid-slope',
  });
  assert.ok(southWarm.hotDeltaC > 0, 'north-facing slope is warm-facing in Southern Hemisphere');
});

test('evaluateTrajectory classifies Stable, ColdEstablishmentBarrier, FutureMaturityRisk, NovelClimate, and annuals', () => {
  assert.equal(evaluateTrajectory(
    { minColdC: -12, maxHotC: 42, chillMinCP: 20 },
    { coldTodayC: 3.5, coldTail10yrC: -4.4, hotTodayC: 30, hotFutureC: 33, chillTodayCP: 48, chillFutureCP: 34 },
  ), 'Stable');

  assert.equal(evaluateTrajectory(
    { minColdC: -2, maxHotC: 42, chillMinCP: 10 },
    { coldTodayC: 3.5, coldTail10yrC: -4.4, hotTodayC: 30, hotFutureC: 33, chillTodayCP: 48, chillFutureCP: 34 },
  ), 'ColdEstablishmentBarrier');

  assert.equal(evaluateTrajectory(
    { minColdC: -15, maxHotC: 31, chillMinCP: 20 },
    { coldTodayC: 3.5, coldTail10yrC: -4.4, hotTodayC: 30, hotFutureC: 34, chillTodayCP: 48, chillFutureCP: 34 },
  ), 'FutureMaturityRisk');

  assert.equal(evaluateTrajectory(
    { minColdC: -15, maxHotC: 31, chillMinCP: 20 },
    { coldTodayC: 3.5, coldTail10yrC: -4.4, hotTodayC: 30, hotFutureC: 36, matchQuality: 0.42 },
  ), 'NovelClimate');

  assert.equal(evaluateTrajectory(
    { minColdC: 0, maxHotC: 38, isAnnual: true },
    { coldTodayC: 3.5, coldTail10yrC: -4.4, hotTodayC: 30, hotFutureC: 33 },
  ), 'Stable', 'warm-season annual skips winter cold-tail barrier');
});
