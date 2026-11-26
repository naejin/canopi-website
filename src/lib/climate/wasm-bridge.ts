// Typed lazy-loading bridge to the pinned canopi-climate v0.7.1 Rust WebAssembly build
// (src/lib/climate/wasm/canopi_climate_bg.wasm, AGPL-3.0-or-later, THIRD_PARTY_NOTICES.md).
// - In the browser: dynamically imports ./wasm/canopi_climate.js (lazy chunk, zero landing-page impact).
// - In Node: reads ./wasm/canopi_climate_bg.wasm via node:fs, verifies SHA-256 against CLIMATE_V07_PINS.wasm_sha256,
//   and initializes synchronously via initSync().

import { CLIMATE_V07_PINS } from './model.js';
import type * as WasmExports from './wasm/canopi_climate.js';

export const CLIMATE_WASM_VERSION = CLIMATE_V07_PINS.wasm_version;
export const CLIMATE_WASM_SHA256 = CLIMATE_V07_PINS.wasm_sha256;

export interface ExtremesPeriod {
  period: string;
  scenario: string;
  tmin_extreme_c: number;
  tmax_extreme_c: number;
  usda_zone: string;
}

export interface ExtremesLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  periods: ExtremesPeriod[];
}

export interface ExtremesTailLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  tmin_p10_gap_c: number | null;
  tmax_p90_gap_c: number | null;
  heat_days_35c: number | null;
  recent_trend_c: number | null;
}

export type FrostRegime = 'frost_free' | 'seasonal' | 'year_round';

export interface FrostCalendarLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  last_spring_frost_doy: number | null;
  last_spring_frost_p90_doy: number | null;
  first_autumn_frost_doy: number | null;
  frost_free_days: number;
  frost_year_pct: number;
  false_spring_pct: number;
  regime: FrostRegime;
}

export interface PhenologyLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  chill_portions_0c: number;
  chill_portions_1c: number;
  chill_portions_2c: number;
  chill_portions_3c: number;
  chill_portions_4c: number;
}

export interface WaterBalanceLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  cwd_mm: number | null;
  cwd_p90_mm: number | null;
  cdd_max_days: number | null;
  vpd_summer_kpa: number | null;
}

export interface SoilPlusLookup {
  lat: number;
  lon: number;
  cell_lat: number;
  cell_lon: number;
  distance_cells: number;
  tile: string;
  soc_0_30_g_kg: number | null;
  om_0_30_pct: number | null;
  bdod_0_30_g_cm3: number | null;
  cfvo_0_30_pct: number | null;
  cfvo_30_100_pct: number | null;
  ph_30_100: number | null;
  clay_30_100_pct: number | null;
}

export interface TerrainLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  elev_m: number;
  relief_m: number | null;
  slope_deg: number | null;
  hand_m: number | null;
}

export interface MonthlyPeriod {
  period: string;
  scenario: string;
  tmean_c: number[];
  tmin_c: number[];
  dry_mask: number;
  dry_months: number;
  gdd_base_10: number;
  chill_months: number;
}

export interface MonthlyLookup {
  cell_lat: number;
  cell_lon: number;
  tile: string;
  periods: MonthlyPeriod[];
}

export interface MonthlyPrecipPeriod {
  period: string;
  scenario: string;
  precip_mm: number[];
}

export interface MonthlyPrecipLookup {
  lat: number;
  lon: number;
  cell_lat: number;
  cell_lon: number;
  distance_cells: number;
  tile: string;
  periods: MonthlyPrecipPeriod[];
}

export interface AnalogueQuery {
  lat: number;
  lon: number;
  tmean_cold_c: number;
  tmean_warm_c: number;
  tmin_cold_c: number;
  tmax_warm_c: number;
  precip_mm: number;
  aridity_index: number | null;
  dry_months: number;
  summer_rain_frac: number;
}

export interface AnalogueSearchOptions {
  k?: number;
  min_distance_km?: number;
  exclude_radius_km?: number;
}

export type AnalogueMatchQuality = 'close' | 'moderate' | 'novel';

export interface AnalogueMatch {
  lat: number;
  lon: number;
  iso_a2: string | null;
  wgsrpd_l3: string | null;
  koppen: string;
  koppen_code: number;
  sigma: number;
  match_quality: AnalogueMatchQuality;
  distance_km: number;
  delta_lat_deg: number;
}

export interface AnalogueResult {
  novel_climate: boolean;
  best_sigma: number | null;
  matches: AnalogueMatch[];
}

export type TopoPosition =
  | 'ridge'
  | 'upper_slope'
  | 'mid_slope'
  | 'lower_slope'
  | 'valley_bottom'
  | 'frost_hollow';

export interface CellTerrainInput {
  elev_m: number;
  relief_m?: number | null;
  slope_deg?: number | null;
  hand_m?: number | null;
}

export interface WasmSiteClimate {
  lat: number;
  tmean_cold_c: number;
  tmean_warm_c: number;
  tmin_cold_c: number;
  tmax_warm_c: number;
  tmin_extreme_c?: number | null;
  tmax_extreme_c?: number | null;
  tmin_p10_gap_c?: number | null;
  tmax_p90_gap_c?: number | null;
  monthly_tmean_c?: number[] | null;
  monthly_tmin_c?: number[] | null;
  chill_portions_curve?: number[] | null;
  base_winter_delta_t_c?: number | null;
  cwd_mm?: number | null;
  cell_terrain?: CellTerrainInput | null;
}

export interface WasmMicroclimateInput {
  site_elev_m?: number | null;
  slope_deg?: number;
  aspect_deg?: number;
  topo_position?: TopoPosition;
}

export interface SolarRatio {
  monthly: number[];
  annual: number;
  growing_season: number;
}

export interface MicroclimateAdjustment {
  requested_delta_elev_m: number;
  effective_delta_elev_m: number;
  elev_clamped: boolean;
  delta_t_lapse_c: number;
  delta_t_pool_extreme_c: number;
  delta_t_pool_monthly_c: number;
  tmean_cold_c: number;
  tmean_warm_c: number;
  tmin_cold_c: number;
  tmax_warm_c: number;
  tmin_extreme_c: number | null;
  tmax_extreme_c: number | null;
  tmin_p10_c: number | null;
  tmax_p90_c: number | null;
  usda_zone: string | null;
  monthly_tmean_c: number[] | null;
  monthly_tmin_c: number[] | null;
  gdd_base_10: number | null;
  chill_months: number | null;
  chill_portions: number | null;
  frost: unknown;
  solar_ratio: SolarRatio;
  cwd_adjusted_mm: number | null;
}

export interface PeriodSiteSnapshot {
  label: string;
  tmin_extreme_c?: number | null;
  tmax_extreme_c?: number | null;
  cwd_mm?: number | null;
  precip_mm?: number | null;
  dry_months?: number | null;
  chill_portions?: number | null;
}

export interface TrajectorySiteInput {
  today: PeriodSiteSnapshot;
  mid_century: PeriodSiteSnapshot;
  late_century: PeriodSiteSnapshot;
  ph_topsoil?: number | null;
  ph_subsoil?: number | null;
  hand_m?: number | null;
  clay_30_100_pct?: number | null;
  false_spring_pct?: number | null;
  evaluated_layers?: string[];
}

export interface SpeciesEnvelope {
  min_tmin_extreme_c?: number | null;
  max_tmax_extreme_c?: number | null;
  max_heat_days_35c?: number | null;
  min_chill_portions?: number | null;
  min_gdd_base_10?: number | null;
  max_cwd_mm?: number | null;
  max_cdd_days?: number | null;
  max_vpd_kpa?: number | null;
  min_ph?: number | null;
  max_ph?: number | null;
  deep_rooted?: boolean;
  waterlogging_tolerant?: boolean;
  early_bloom?: boolean;
  hardy_to_frost_pocket?: boolean;
}

export type TrajectoryClass = 'stable' | 'improving' | 'declining' | 'transitional' | 'unsuitable';
export type EstablishmentVsMaturityGap = 'none' | 'cold_establishment_barrier' | 'future_maturity_risk' | 'both';

export interface TrajectoryResult {
  periods: {
    today: unknown;
    mid_century: unknown;
    late_century: unknown;
  };
  trajectory_class: TrajectoryClass;
  establishment_vs_maturity_gap: EstablishmentVsMaturityGap;
  has_gap: boolean;
  evaluated_layers: string[];
}

export interface PhotoperiodSummary {
  min_hours: number;
  max_hours: number;
  amplitude_hours: number;
  monthly_hours: number[];
  polar_night_days: number;
  midnight_sun_days: number;
}

export interface SoilAwcSummary {
  field_capacity: number;
  wilting_point: number;
  awc_mm_per_m: number;
  awc_30cm_mm: number;
  awc_100cm_mm: number;
}

type WasmModule = typeof WasmExports;

let readyMod: WasmModule | null = null;
let initPromise: Promise<WasmModule> | null = null;

const isNodeRuntime = (): boolean =>
  typeof process !== 'undefined' && typeof process.versions?.node === 'string';

/**
 * Lazily load and initialize the pinned canopi-climate v0.7.1 WASM module.
 * - In the browser: fetches the Vite-emitted canopi_climate_bg.*.wasm on first use.
 * - In Node: reads the pinned wasm via node:fs, verifies SHA-256, and calls initSync().
 */
export function initClimateWasm(wasmBytes?: BufferSource): Promise<WasmModule> {
  if (readyMod) return Promise.resolve(readyMod);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await import('./wasm/canopi_climate.js');
    if (wasmBytes) {
      mod.initSync({ module: wasmBytes });
    } else if (isNodeRuntime()) {
      // Dynamic builtin specifiers keep browser bundlers from trying to resolve node:* modules.
      const fsSpec = 'node:fs';
      const cryptoSpec = 'node:crypto';
      const { readFileSync } = (await import(/* @vite-ignore */ fsSpec)) as typeof import('node:fs');
      const { createHash } = (await import(/* @vite-ignore */ cryptoSpec)) as typeof import('node:crypto');
      const wasmUrl = new URL('./wasm/canopi_climate_bg.wasm', import.meta.url);
      const bytes = readFileSync(wasmUrl);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (digest !== CLIMATE_WASM_SHA256) {
        throw new Error(`canopi_climate_bg.wasm sha256 mismatch: got ${digest}, expected ${CLIMATE_WASM_SHA256}`);
      }
      mod.initSync({ module: bytes });
    } else {
      await mod.default();
    }
    const ver = mod.version();
    if (ver !== CLIMATE_WASM_VERSION) {
      throw new Error(`canopi-climate WASM version mismatch: got ${ver}, expected ${CLIMATE_WASM_VERSION}`);
    }
    readyMod = mod;
    return mod;
  })();
  initPromise.catch(() => { initPromise = null; });
  return initPromise;
}

export function isClimateWasmReady(): boolean {
  return readyMod !== null;
}

export async function wasmVersion(): Promise<string> {
  return (await initClimateWasm()).version();
}

export async function wasmTileName(lat: number, lon: number): Promise<string | undefined> {
  return (await initClimateWasm()).tileName(lat, lon);
}

export async function wasmLookup(tileBytes: Uint8Array, lat: number, lon: number): Promise<unknown> {
  return (await initClimateWasm()).lookup(tileBytes, lat, lon);
}

export async function wasmLookupSoil(tileBytes: Uint8Array, lat: number, lon: number): Promise<unknown> {
  return (await initClimateWasm()).lookupSoil(tileBytes, lat, lon);
}

export async function wasmLookupRegions(tileBytes: Uint8Array, lat: number, lon: number): Promise<unknown> {
  return (await initClimateWasm()).lookupRegions(tileBytes, lat, lon);
}

export async function wasmTextureClass(sandPct: number, clayPct: number): Promise<string | undefined> {
  return (await initClimateWasm()).textureClass(sandPct, clayPct);
}

export async function wasmUsdaZone(tminExtremeC: number): Promise<string | undefined> {
  return (await initClimateWasm()).usdaZone(tminExtremeC);
}

export async function wasmLookupExtremes(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<ExtremesLookup | null> {
  return (await initClimateWasm()).lookupExtremes(tileBytes, cellLat, cellLon) as ExtremesLookup | null;
}

export async function wasmLookupExtremesTail(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<ExtremesTailLookup | null> {
  return (await initClimateWasm()).lookupExtremesTail(tileBytes, cellLat, cellLon) as ExtremesTailLookup | null;
}

export async function wasmLookupFrostCalendar(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<FrostCalendarLookup | null> {
  return (await initClimateWasm()).lookupFrostCalendar(tileBytes, cellLat, cellLon) as FrostCalendarLookup | null;
}

export async function wasmLookupPhenology(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<PhenologyLookup | null> {
  return (await initClimateWasm()).lookupPhenology(tileBytes, cellLat, cellLon) as PhenologyLookup | null;
}

export async function wasmLookupWaterBalance(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<WaterBalanceLookup | null> {
  return (await initClimateWasm()).lookupWaterBalance(tileBytes, cellLat, cellLon) as WaterBalanceLookup | null;
}

export async function wasmLookupSoilPlus(tileBytes: Uint8Array, lat: number, lon: number): Promise<SoilPlusLookup | null> {
  return (await initClimateWasm()).lookupSoilPlus(tileBytes, lat, lon) as SoilPlusLookup | null;
}

export async function wasmLookupTerrain(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<TerrainLookup | null> {
  return (await initClimateWasm()).lookupTerrain(tileBytes, cellLat, cellLon) as TerrainLookup | null;
}

export async function wasmLookupMonthly(tileBytes: Uint8Array, cellLat: number, cellLon: number): Promise<MonthlyLookup | null> {
  return (await initClimateWasm()).lookupMonthly(tileBytes, cellLat, cellLon) as MonthlyLookup | null;
}

export async function wasmLookupMonthlyPrecip(tileBytes: Uint8Array, lat: number, lon: number): Promise<MonthlyPrecipLookup | null> {
  return (await initClimateWasm()).lookupMonthlyPrecip(tileBytes, lat, lon) as MonthlyPrecipLookup | null;
}

export async function wasmFindAnalogues(
  indexBytes: Uint8Array,
  query: AnalogueQuery,
  options?: AnalogueSearchOptions,
): Promise<AnalogueResult> {
  return (await initClimateWasm()).findAnalogues(indexBytes, query, options ?? null) as AnalogueResult;
}

export async function wasmPhotoperiod(lat: number): Promise<PhotoperiodSummary | null> {
  return (await initClimateWasm()).photoperiod(lat) as PhotoperiodSummary | null;
}

export async function wasmSoilAwc(sandPct: number, clayPct: number, omPct?: number | null): Promise<SoilAwcSummary | null> {
  return (await initClimateWasm()).soilAwc(sandPct, clayPct, omPct ?? null) as SoilAwcSummary | null;
}

export async function wasmSoilAwcWithRock(
  sandPct: number,
  clayPct: number,
  omPct?: number | null,
  cfvo0_30Pct?: number | null,
  cfvo30_100Pct?: number | null,
): Promise<SoilAwcSummary | null> {
  return (await initClimateWasm()).soilAwcWithRock(
    sandPct,
    clayPct,
    omPct ?? null,
    cfvo0_30Pct ?? null,
    cfvo30_100Pct ?? null,
  ) as SoilAwcSummary | null;
}

export async function wasmAdjustMicroclimate(
  site: WasmSiteClimate,
  input: WasmMicroclimateInput,
): Promise<MicroclimateAdjustment> {
  return (await initClimateWasm()).adjustMicroclimate(site, input) as MicroclimateAdjustment;
}

export async function wasmEvaluateTrajectory(
  site: TrajectorySiteInput,
  envelope: SpeciesEnvelope,
): Promise<TrajectoryResult> {
  return (await initClimateWasm()).evaluateTrajectory(site, envelope) as TrajectoryResult;
}

/**
 * Piecewise linear interpolation of Fishman Dynamic Chill Portions across the 5 pre-computed
 * warming deltas (+0, +1, +2, +3, +4 °C) from a v0.7.0 phenology tile.
 */
export function interpolateChillPortions(phenology: PhenologyLookup, deltaWinterC: number): number {
  const curve = [
    phenology.chill_portions_0c,
    phenology.chill_portions_1c,
    phenology.chill_portions_2c,
    phenology.chill_portions_3c,
    phenology.chill_portions_4c,
  ];
  const clamped = Math.max(0, Math.min(4, Number.isFinite(deltaWinterC) ? deltaWinterC : 0));
  const lo = Math.floor(clamped);
  const hi = Math.min(4, lo + 1);
  const frac = clamped - lo;
  return Math.round((curve[lo] + (curve[hi] - curve[lo]) * frac) * 10) / 10;
}
