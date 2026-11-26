/* tslint:disable */
/* eslint-disable */

/**
 * Adjust a 0.1-degree site climate (`SiteClimate`) to local topography
 * (`MicroclimateInput`: `site_elev_m`, `slope_deg`, `aspect_deg`, `topo_position`).
 * Returns [`crate::microclimate::MicroclimateAdjustment`] as a plain object.
 *
 * # Errors
 * Throws on deserialization failure or invalid non-finite topography inputs.
 */
export function adjustMicroclimate(site: any, input: any): any;

/**
 * Evaluate a species' multi-decade ecological trajectory (`TrajectorySiteInput`,
 * `SpeciesEnvelope`). Returns [`crate::trajectory::TrajectoryResult`] as a plain
 * object (`periods`, `trajectory_class`, `establishment_vs_maturity_gap`, `has_gap`).
 *
 * # Errors
 * Throws on deserialization or serialization failure.
 */
export function evaluateTrajectory(site: any, envelope: any): any;

/**
 * Search an `analogues.bin` binary index for the closest historical
 * (1991–2020) climate twins matching `query` (`AnalogueQuery`) with optional
 * `options` (`SearchOptions`). Returns an [`crate::analogues::AnalogueResult`]
 * plain object (`novel_climate`, `best_sigma`, `matches[]`).
 *
 * # Errors
 * Throws when `indexBytes` is not a valid `analogues.bin` buffer or when
 * `query`/`options` cannot be deserialized.
 */
export function findAnalogues(index_bytes: Uint8Array | number[], query: any, options: any): any;

/**
 * Decode a tile and look a point up (nearest complete cell within 2
 * cells). Returns the [`crate::lookup::Lookup`] as a plain object, or `null`
 * when no land cell with data is near.
 *
 * # Errors
 * Throws when the bytes are not a grid tile, the coordinate is invalid or
 * the point lies in another tile.
 */
export function lookup(tile_bytes: Uint8Array | number[], lat: number, lon: number): any;

/**
 * Decode an extremes tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::extremes::ExtremesLookup`] as a plain object (`periods[]` with
 * `tmin_extreme_c`, `tmax_extreme_c`, `usda_zone`), or `null` when that
 * cell has no extremes.
 *
 * # Errors
 * Throws when the bytes are not an extremes tile, the coordinate is
 * invalid or the cell lies in another tile.
 */
export function lookupExtremes(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode an `extremes_tail` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::extremes_tail::ExtremesTailLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not an extremes_tail tile, the coordinate is
 * invalid or the cell lies in another tile.
 */
export function lookupExtremesTail(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode a `frost_calendar` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::frost_calendar::FrostCalendarLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a frost_calendar tile, the coordinate is
 * invalid or the cell lies in another tile.
 */
export function lookupFrostCalendar(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode a `monthly` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::monthly::MonthlyLookup`] as a plain object (`periods[]` with
 * `tmean_c`, `tmin_c`, `dry_mask`, `dry_months`, `gdd_base_10`,
 * `chill_months`), or `null` when that cell has no data.
 *
 * # Errors
 * Throws when the bytes are not a monthly tile, the coordinate is invalid
 * or the cell lies in another tile.
 */
export function lookupMonthly(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode a `monthly_precip` tile (0.25-degree grid) and look a point up
 * (own cell, else nearest valid cell within radius 1 for coastal fallback).
 * Returns the [`crate::monthly_precip::MonthlyPrecipLookup`] as a plain
 * object (`periods[]` with `precip_mm`), or `null`.
 *
 * # Errors
 * Throws when the bytes are not a monthly_precip tile, the coordinate is
 * invalid or the point lies in another tile.
 */
export function lookupMonthlyPrecip(tile_bytes: Uint8Array | number[], lat: number, lon: number): any;

/**
 * Decode a `phenology` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::phenology::PhenologyLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a phenology tile, the coordinate is invalid
 * or the cell lies in another tile.
 */
export function lookupPhenology(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode a regions tile and look a point up. Returns the
 * [`crate::regions::RegionsLookup`] as a plain object: `wgsrpd_l3` (e.g.
 * `"FRA"`) and `iso_a2` (e.g. `"FR"`), each `null` when no area is within
 * 2 cells.
 *
 * # Errors
 * Throws when the bytes are not a regions tile, the coordinate is invalid
 * or the point lies in another tile.
 */
export function lookupRegions(tile_bytes: Uint8Array | number[], lat: number, lon: number): any;

/**
 * Decode a soil tile and look a point up (its cell, else the nearest cell
 * with soil values within 2 cells). Returns the
 * [`crate::soil::SoilLookup`] as a plain object (`ph_h2o`, `sand_pct`,
 * `clay_pct`, `silt_pct`, `texture`, `filled`, ...), or `null`.
 *
 * # Errors
 * Throws when the bytes are not a soil tile, the coordinate is invalid or
 * the point lies in another tile.
 */
export function lookupSoil(tile_bytes: Uint8Array | number[], lat: number, lon: number): any;

/**
 * Decode a `soil_plus` tile (0.05-degree, 6 bands) and look a point up.
 * Returns [`crate::soil_plus::SoilPlusLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a `soil_plus` tile, the coordinate is invalid,
 * or the point lies in another tile.
 */
export function lookupSoilPlus(tile_bytes: Uint8Array | number[], lat: number, lon: number): any;

/**
 * Decode a `terrain` tile (0.1-degree, 4 bands) and read the cell holding
 * (`cellLat`, `cellLon`): pass the climate lookup's `cell_lat` and `cell_lon`.
 * Returns [`crate::terrain::TerrainLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a `terrain` tile, the coordinate is invalid,
 * or the cell lies in another tile.
 */
export function lookupTerrain(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Decode a `water_balance` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::water_balance::WaterBalanceLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a water_balance tile, the coordinate is invalid
 * or the cell lies in another tile.
 */
export function lookupWaterBalance(tile_bytes: Uint8Array | number[], cell_lat: number, cell_lon: number): any;

/**
 * Compute annual FAO-56 geometric photoperiod summary for `lat` (`-90..=90`),
 * returning `{ min_hours, max_hours, amplitude_hours, monthly_hours,
 * polar_night_days, midnight_sun_days }` or `null` if invalid.
 *
 * # Errors
 * Throws only on serialization failure.
 */
export function photoperiod(lat: number): any;

/**
 * Compute Saxton & Rawls (2006) soil Available Water Capacity from fine-earth
 * texture (`sandPct`, `clayPct`, optional `omPct` defaulting to `2.5%`),
 * returning `{ field_capacity, wilting_point, awc_mm_per_m, awc_30cm_mm,
 * awc_100cm_mm }` or `null` if out of domain.
 *
 * # Errors
 * Throws only on serialization failure.
 */
export function soilAwc(sand_pct: number, clay_pct: number, om_pct?: number | null): any;

/**
 * Compute Saxton & Rawls (2006) soil Available Water Capacity discounted for
 * coarse fragments (`cfvo_0_30_pct` for 0–30 cm topsoil and `cfvo_30_100_pct`
 * for 30–100 cm subsoil, in vol %), or `null` if out of domain.
 *
 * # Errors
 * Throws only on serialization failure.
 */
export function soilAwcWithRock(sand_pct: number, clay_pct: number, om_pct?: number | null, cfvo_0_30_pct?: number | null, cfvo_30_100_pct?: number | null): any;

/**
 * USDA texture class id (e.g. `"silt_loam"`) of sand and clay
 * percentages; `undefined` for impossible fractions.
 */
export function textureClass(sand_pct: number, clay_pct: number): string | undefined;

/**
 * File name of the tile holding a point (e.g. `n50e000.tif`); `undefined`
 * for an invalid coordinate.
 */
export function tileName(lat: number, lon: number): string | undefined;

/**
 * USDA hardiness zone (`1a` ... `13b`) of a coldest night in °C, or
 * `undefined` for non-finite input.
 */
export function usdaZone(tmin_extreme_c: number): string | undefined;

/**
 * Crate version, for logs and cache keys.
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly adjustMicroclimate: (a: any, b: any) => [number, number, number];
    readonly evaluateTrajectory: (a: any, b: any) => [number, number, number];
    readonly findAnalogues: (a: number, b: number, c: any, d: any) => [number, number, number];
    readonly lookup: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupExtremes: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupExtremesTail: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupFrostCalendar: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupMonthly: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupMonthlyPrecip: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupPhenology: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupRegions: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupSoil: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupSoilPlus: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupTerrain: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly lookupWaterBalance: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly photoperiod: (a: number) => [number, number, number];
    readonly soilAwc: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly soilAwcWithRock: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly textureClass: (a: number, b: number) => [number, number];
    readonly tileName: (a: number, b: number) => [number, number];
    readonly usdaZone: (a: number) => [number, number];
    readonly version: () => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
