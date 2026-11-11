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

/** Site-layer bands in band order (soil: src/soil.rs; regions: src/regions.rs). */
export const SOIL_BANDS = Object.freeze(['ph_h2o', 'sand', 'clay', 'fill_distance']);
export const REGION_BANDS = Object.freeze(['wgsrpd_l3', 'iso_a2']);

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
