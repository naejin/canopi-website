// Unit tests for canopi-climate v0.7.1 Rust WASM bridge (all 22 exports),
// Chill Portion interpolation, native rock-adjusted AWC, frost sentinels (0 / 366),
// and decoupled climate_tiles_sha256 + compatible v0.4.0 manifest matching.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ALL_LAYERS,
  CLIMATE_V07_PINS,
  CLIMATE_WASM_SHA256,
  CLIMATE_WASM_VERSION,
  COMPATIBLE_TILES_MANIFESTS,
  FROST_FREE_SENTINEL_DOY,
  V07_LAYERS,
  YEAR_ROUND_FROST_SENTINEL_DOY,
  initClimateWasm,
  interpolateChillPortions,
  isClimateWasmReady,
  wasmAdjustMicroclimate,
  wasmEvaluateTrajectory,
  wasmLookup,
  wasmLookupRegions,
  wasmLookupSoil,
  wasmPhotoperiod,
  wasmSoilAwc,
  wasmSoilAwcWithRock,
  wasmTextureClass,
  wasmTileName,
  wasmUsdaZone,
  wasmVersion,
} from '../src/lib/climate/index.ts';
import { consortiumGridProblem } from './palette-grid-check.mjs';

const FIXTURES = new URL('./fixtures/climate/', import.meta.url);

test('v0.7.1 WASM pins, v0.7.0 tile layer metadata, and frost sentinels (0 = frost-free, 366 = year-round) are exact', () => {
  assert.equal(CLIMATE_V07_PINS.climate_tiles_sha256, 'f689af2d4a81ed62937ec7c209fab42a15285aeac666ce60f2b2cf99d43e1e5b');
  assert.equal(CLIMATE_V07_PINS.monolithic_tar_sha256, '1fd5ffd18197b34a7d0342f38ca8b0afa7a65182cd0a66aef03e3d0b33d2f079');
  assert.equal(CLIMATE_WASM_VERSION, '0.7.1');
  assert.equal(CLIMATE_WASM_SHA256, '7abdc1871882c0105f17a960c8461a5c3111f44d7760688a5f5f594a8bd42206');
  assert.equal(FROST_FREE_SENTINEL_DOY, 0);
  assert.equal(YEAR_ROUND_FROST_SENTINEL_DOY, 366);
  assert.equal(V07_LAYERS.terrain.cellDeg, 0.1);
  assert.equal(V07_LAYERS.terrain.tileCells, 100);
  assert.equal(V07_LAYERS.terrain.bands, 4);
  assert.equal(V07_LAYERS.soil_plus.bands, 6);
  assert.equal(V07_LAYERS.frost_calendar.bands, 6);
  assert.equal(V07_LAYERS.monthly_precip.cellDeg, 0.25);
  assert.equal(V07_LAYERS.monthly_precip.tileCells, 40);
  assert.equal(Object.keys(ALL_LAYERS).length, 12);
});

test('consortiumGridProblem accepts decoupled climate_tiles_sha256 and verified compatible v0.4.0 manifest', () => {
  const tilesSha = CLIMATE_V07_PINS.climate_tiles_sha256;
  const manifestSha = 'c'.repeat(64);
  const v04Manifest = COMPATIBLE_TILES_MANIFESTS[tilesSha][0];

  for (const want of [tilesSha, v04Manifest]) {
    const consortium = { release_id: 'r-61c991c93df2effd', climate_grid_manifest_sha256: want };
    const climate = {
      release: { grid_manifest_sha256: manifestSha, climate_tiles_sha256: tilesSha },
      consortium_grid_check: { status: 'matched', consortium_release: 'r-61c991c93df2effd' },
    };
    assert.equal(consortiumGridProblem(consortium, climate), null);
  }
});

test('Rust WASM initializes in Node with SHA-256 verification and runs core lookup/helper exports', async () => {
  await initClimateWasm();
  assert.equal(isClimateWasmReady(), true);
  assert.equal(await wasmVersion(), '0.7.1');
  assert.equal(await wasmTileName(45.76, 4.84), 'n50e000.tif');
  assert.equal(await wasmTileName(95, 0), undefined);
  assert.equal(await wasmTextureClass(40, 20), 'loam');
  assert.equal(await wasmUsdaZone(-7.4), '8b');

  // Synthetic core tiles through Rust WASM lookup / lookupSoil / lookupRegions
  const climateBytes = new Uint8Array(readFileSync(new URL('synthetic-n50e000.tif', FIXTURES)));
  const soilBytes = new Uint8Array(readFileSync(new URL('synthetic-soil-n50e000.tif', FIXTURES)));
  const regionBytes = new Uint8Array(readFileSync(new URL('synthetic-regions-n50e000.tif', FIXTURES)));
  assert.ok(await wasmLookup(climateBytes, 45.76, 4.84));
  assert.ok(await wasmLookupSoil(soilBytes, 45.76, 4.84));
  assert.ok(await wasmLookupRegions(regionBytes, 45.76, 4.84));
});

test('Rust WASM photoperiod, native soilAwcWithRock (cfvo 0/30/95 & missing), and Chill Portion interpolation', async () => {
  const photo = await wasmPhotoperiod(45);
  assert.ok(photo && photo.max_hours > 15 && photo.min_hours < 9 && photo.monthly_hours.length === 12);
  const polar = await wasmPhotoperiod(75);
  assert.ok(polar && polar.midnight_sun_days > 0 && polar.polar_night_days > 0);

  const base = await wasmSoilAwc(40, 25, 3.0);
  assert.ok(base && base.awc_mm_per_m > 100 && base.awc_mm_per_m < 250);

  const r1 = (n) => Math.round(n * 10) / 10;
  // cfvo = 0% matches base fine-earth AWC exactly
  const rock0 = await wasmSoilAwcWithRock(40, 25, 3.0, 0, 0);
  assert.deepEqual(rock0, base);

  // cfvo = 30% uniform rock discount
  const rock30 = await wasmSoilAwcWithRock(40, 25, 3.0, 30, 30);
  assert.ok(rock30);
  assert.equal(rock30.awc_30cm_mm, r1(base.awc_30cm_mm * 0.7));
  assert.equal(rock30.awc_100cm_mm, r1(base.awc_30cm_mm * 0.7 + base.awc_mm_per_m * 0.7 * 0.7));
  assert.equal(rock30.awc_mm_per_m, rock30.awc_100cm_mm);

  // cfvo = 95% (clamped maximum rock discount: 5% fine earth remaining)
  const rock95 = await wasmSoilAwcWithRock(40, 25, 3.0, 95, 95);
  assert.ok(rock95);
  assert.equal(rock95.awc_30cm_mm, r1(base.awc_30cm_mm * 0.05));
  assert.equal(rock95.awc_100cm_mm, r1(base.awc_30cm_mm * 0.05 + base.awc_mm_per_m * 0.7 * 0.05));
  assert.equal(rock95.awc_mm_per_m, rock95.awc_100cm_mm);

  // Missing cfvo: both null -> 0% rock (matches base); missing subsoil falls back to topsoil cfvo
  const rockMissing = await wasmSoilAwcWithRock(40, 25, 3.0, null, null);
  assert.deepEqual(rockMissing, base);
  const rockSubMissing = await wasmSoilAwcWithRock(40, 25, 3.0, 30, null);
  assert.deepEqual(rockSubMissing, rock30);
  // Layered rock: 10% topsoil, 50% subsoil
  const rockLayered = await wasmSoilAwcWithRock(40, 25, 3.0, 10, 50);
  assert.ok(rockLayered);
  assert.equal(rockLayered.awc_30cm_mm, r1(base.awc_30cm_mm * 0.9));
  assert.equal(rockLayered.awc_100cm_mm, r1(base.awc_30cm_mm * 0.9 + base.awc_mm_per_m * 0.7 * 0.5));

  const pheno = {
    cell_lat: 45.75, cell_lon: 4.85, tile: 'n50e000',
    chill_portions_0c: 132, chill_portions_1c: 127, chill_portions_2c: 120, chill_portions_3c: 111, chill_portions_4c: 101,
  };
  assert.equal(interpolateChillPortions(pheno, 0), 132);
  assert.equal(interpolateChillPortions(pheno, 1.5), 123.5);
  assert.equal(interpolateChillPortions(pheno, 10), 101);
});

test('Rust WASM adjustMicroclimate (48-step ENU solar + lapse + katabatic pooling) and evaluateTrajectory', async () => {
  const baseSite = {
    lat: 45.75,
    tmean_cold_c: 4.3,
    tmean_warm_c: 22.4,
    tmin_cold_c: 0.1,
    tmax_warm_c: 26.6,
    tmin_extreme_c: -7.4,
    tmax_extreme_c: 34.4,
    tmin_p10_gap_c: -3.7,
    tmax_p90_gap_c: 3.7,
    cell_terrain: { elev_m: 200, relief_m: 300 },
  };
  const valley = await wasmAdjustMicroclimate(baseSite, {
    site_elev_m: 200,
    slope_deg: 15,
    aspect_deg: 0,
    topo_position: 'frost_hollow',
  });
  assert.ok(valley.delta_t_pool_extreme_c < -3, `expected cold-air pooling, got ${valley.delta_t_pool_extreme_c}`);
  assert.ok(valley.solar_ratio.growing_season < 1, 'north slope in NH receives less solar irradiance');
  assert.ok(valley.tmin_extreme_c !== null && valley.tmin_extreme_c < baseSite.tmin_extreme_c);

  const southSlope = await wasmAdjustMicroclimate(baseSite, {
    site_elev_m: 350,
    slope_deg: 20,
    aspect_deg: 180,
    topo_position: 'ridge',
  });
  assert.ok(southSlope.delta_t_lapse_c < 0, 'higher elevation is cooler via lapse rate');
  assert.ok(southSlope.solar_ratio.annual > 1, 'south slope in NH receives more solar irradiance');

  const traj = await wasmEvaluateTrajectory(
    {
      today: { label: '1991-2020', tmin_extreme_c: -14, tmax_extreme_c: 34, chill_portions: 90, cwd_mm: 250 },
      mid_century: { label: '2041-2070', tmin_extreme_c: -6, tmax_extreme_c: 37, chill_portions: 70, cwd_mm: 320 },
      late_century: { label: '2071-2099', tmin_extreme_c: -4, tmax_extreme_c: 39, chill_portions: 55, cwd_mm: 380 },
    },
    { min_tmin_extreme_c: -8, max_tmax_extreme_c: 42, min_chill_portions: 40 },
  );
  assert.equal(traj.establishment_vs_maturity_gap, 'cold_establishment_barrier');
  assert.equal(traj.has_gap, true);
});
