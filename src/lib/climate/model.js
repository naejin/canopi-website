// Ported from canopi-climate (https://github.com/opencanopi/canopi-climate, commit 0908add): the grid's
// rules re-written in JavaScript. Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero
// General Public License, version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// What a canopi-climate v0.2 grid stores, as the site's reader expects it. Plain JavaScript so the
// installer (scripts/install-climate.mjs) and the built-site check import it under plain Node; the
// TypeScript reader beside it imports it too. Source of truth: canopi-climate src/model.rs
// (variables, slots, encoding), src/layer.rs (site layers), src/soil.rs and src/regions.rs (bands);
// the installer refuses a manifest that differs from these.

/** Grid format the reader understands (manifest.json `format`, `format_version`). */
export const GRID_FORMAT = 'canopi-climate-grid';
export const GRID_FORMAT_VERSION = 1;

/** Stored value meaning "no data". */
export const NODATA = -32768;

/** Climate variables in band order, with their encoding (decoded = stored × scale + offset). */
export const VARIABLES = Object.freeze([
  { id: 'koppen', unit: 'class', scale: 1, offset: 0 },
  { id: 'tmin_cold', unit: '°C', scale: 0.1, offset: 0 },
  { id: 'tmax_warm', unit: '°C', scale: 0.1, offset: 0 },
  { id: 'tmean_cold', unit: '°C', scale: 0.1, offset: 0 },
  { id: 'tmean_warm', unit: '°C', scale: 0.1, offset: 0 },
  { id: 'precip', unit: 'mm', scale: 1, offset: 0 },
  { id: 'aridity', unit: '1', scale: 0.01, offset: 0 },
  { id: 'dry_months', unit: 'months', scale: 1, offset: 0 },
]);

/** Period/scenario slots in band order: 0 today, 1–4 2041–2070, 5–8 2071–2099. */
export const SLOTS = Object.freeze([
  { period: '1991-2020', scenario: 'historical' },
  { period: '2041-2070', scenario: 'ssp126' },
  { period: '2041-2070', scenario: 'ssp245' },
  { period: '2041-2070', scenario: 'ssp370' },
  { period: '2041-2070', scenario: 'ssp585' },
  { period: '2071-2099', scenario: 'ssp126' },
  { period: '2071-2099', scenario: 'ssp245' },
  { period: '2071-2099', scenario: 'ssp370' },
  { period: '2071-2099', scenario: 'ssp585' },
]);

/** Bands per climate tile (8 variables × 9 slots). */
export const CLIMATE_BANDS = VARIABLES.length * SLOTS.length;

/**
 * Site-layer bands in band order, with their encoding (decoded = stored × scale + offset; soil:
 * src/pipeline/soil.rs, regions: src/pipeline/regions.rs). The installer refuses a manifest whose
 * bands differ in id, unit, scale or offset; the reader decodes soil values with these scales.
 * Region bands hold letter codes (src/lib/climate/regions.ts), so their scale is 1.
 */
export const SOIL_BAND_SPECS = Object.freeze([
  Object.freeze({ id: 'ph_h2o', unit: 'pH', scale: 0.1, offset: 0 }),
  Object.freeze({ id: 'sand', unit: '%', scale: 0.1, offset: 0 }),
  Object.freeze({ id: 'clay', unit: '%', scale: 0.1, offset: 0 }),
  Object.freeze({ id: 'fill_distance', unit: 'cells', scale: 1, offset: 0 }),
]);
export const REGION_BAND_SPECS = Object.freeze([
  Object.freeze({ id: 'wgsrpd_l3', unit: 'code', scale: 1, offset: 0 }),
  Object.freeze({ id: 'iso_a2', unit: 'code', scale: 1, offset: 0 }),
]);

/** Site-layer band ids in band order (climate-index.json format 2 lists these). */
export const SOIL_BANDS = Object.freeze(SOIL_BAND_SPECS.map((b) => b.id));
export const REGION_BANDS = Object.freeze(REGION_BAND_SPECS.map((b) => b.id));

/**
 * The three layers the site serves: the manifest's directory, cell size, cells per tile side and
 * bands. Every layer uses the same 10-degree tiles with the same names.
 */
export const LAYERS = Object.freeze({
  climate: { dir: 'tiles', cellDeg: 0.1, tileCells: 100, bands: CLIMATE_BANDS },
  soil: { dir: 'soil', cellDeg: 0.05, tileCells: 200, bands: SOIL_BANDS.length },
  regions: { dir: 'regions', cellDeg: 0.05, tileCells: 200, bands: REGION_BANDS.length },
});

/** A tile name: north-west corner, `n50e000` covers 40–50 N, 0–10 E. */
export const TILE_NAME = /^[ns]\d0[ew]\d\d0$/;

/**
 * Additive canopi-climate v0.7.0 layer metadata (served alongside v0.2 core tiles/soil/regions).
 * Core climate_tiles_sha256 is decoupled from additive layers so plant ranges sampled on the core
 * climate grid remain valid when additive v0.7.0 layers are installed.
 */
export const CLIMATE_V07_PINS = Object.freeze({
  climate_tiles_sha256: 'f689af2d4a81ed62937ec7c209fab42a15285aeac666ce60f2b2cf99d43e1e5b',
  packs_v07_sha256: '5d223909c56aa2df669e162a42f85fb6bb0be97f388e764df24eef20ea3de355',
  monolithic_tar_sha256: '1fd5ffd18197b34a7d0342f38ca8b0afa7a65182cd0a66aef03e3d0b33d2f079',
  wasm_version: '0.7.0',
  wasm_sha256: 'ba80499ce3e31df4cf67799b006740a1222b4a55f59f855273d7960f174095fc',
});

/**
 * Prior grid manifest sha256s verified to share the exact byte-for-byte climate_tiles_sha256
 * (e.g. v0.4.0 manifest c6c82ecc7cf5... has identical tiles/ to v0.7.0 f689af2d4a81...).
 */
export const COMPATIBLE_TILES_MANIFESTS = Object.freeze({
  'f689af2d4a81ed62937ec7c209fab42a15285aeac666ce60f2b2cf99d43e1e5b': Object.freeze([
    'c6c82ecc7cf5e153eafe2afa9ac32db248d96264356965cb3ad447e6392ee548', // v0.4.0
  ]),
});

/** Exact v0.7.0 additive tile layers (from manifest.json). */
export const V07_LAYERS = Object.freeze({
  extremes: Object.freeze({ dir: 'extremes', cellDeg: 0.1, tileCells: 100, bands: 18 }),
  extremes_tail: Object.freeze({ dir: 'extremes_tail', cellDeg: 0.1, tileCells: 100, bands: 4 }),
  frost_calendar: Object.freeze({ dir: 'frost_calendar', cellDeg: 0.1, tileCells: 100, bands: 6 }),
  phenology: Object.freeze({ dir: 'phenology', cellDeg: 0.1, tileCells: 100, bands: 5 }),
  water_balance: Object.freeze({ dir: 'water_balance', cellDeg: 0.1, tileCells: 100, bands: 4 }),
  soil_plus: Object.freeze({ dir: 'soil_plus', cellDeg: 0.05, tileCells: 200, bands: 6 }),
  terrain: Object.freeze({ dir: 'terrain', cellDeg: 0.1, tileCells: 100, bands: 4 }),
  monthly: Object.freeze({ dir: 'monthly', cellDeg: 0.1, tileCells: 100, bands: 75 }),
  monthly_precip: Object.freeze({ dir: 'monthly_precip', cellDeg: 0.25, tileCells: 40, bands: 36 }),
});

/** All 12 served tile layers (3 core + 9 additive v0.7.0). */
export const ALL_LAYERS = Object.freeze({
  ...LAYERS,
  ...V07_LAYERS,
});

/** Sentinel DOY in frost_calendar/ indicating a frost-free year (0 = frost-free, 366 = year-round frost). */
export const FROST_FREE_SENTINEL_DOY = 0;
export const YEAR_ROUND_FROST_SENTINEL_DOY = 366;
