// Lightweight pure-TS helpers and additive layer decoders for canopi-climate v0.7.0.
// Keeps the location chunk well within budget (zero WASM, zero external dependencies).
// Handles sentinel 366 + frost_year_pct in frost_calendar/ and hand_m = null south of 60°S in terrain/.
import { FROST_FREE_SENTINEL_DOY, NODATA } from './model.js';

export interface FrostCalendarAt {
  /** 1..365, or null when frost-free (sentinel 366). */
  lastSpringFrostDoy: number | null;
  /** 1..365, or null when frost-free (sentinel 366). */
  firstAutumnFrostDoy: number | null;
  /** 0..365 frost-free days in a typical year. */
  frostFreeDays: number;
  /** 0..100 percentage of years with at least one frost event. */
  frostYearPct: number;
  /** 0..100 percentage of years with a hard freeze after warm spring bloom onset. */
  falseSpringPct: number;
  /** True when both frost dates are sentinel 366 or frostYearPct === 0. */
  frostFree: boolean;
}

export interface ExtremesTailAt {
  /** 1-in-10-year coldest night (°C). */
  coldTail10yrC: number | null;
  /** 1-in-10-year heat-dome afternoon peak (°C). */
  heatDome10yrC: number | null;
  /** Mean annual days >= 35 °C. */
  heatDays35: number | null;
  /** 90th-percentile consecutive dry days (P90 CDD). */
  p90DryStreakDays: number | null;
}

export interface PhenologyAt {
  /** Fishman Dynamic Chill Portions (today, 2050s, 2080s). */
  chillPortionsToday: number | null;
  chillPortions2050: number | null;
  chillPortions2080: number | null;
}

export interface WaterBalanceAt {
  /** Longest typical consecutive dry days (CDD). */
  cddDays: number | null;
  /** Annual climatic water deficit (mm). */
  annualDeficitMm: number | null;
}

export interface SoilPlusAt {
  /** Deep subsoil (30–100 cm) pH (H2O). */
  subsoilPh: number | null;
  subsoilClayPct: number | null;
  subsoilSandPct: number | null;
  /** Coarse fragment / stone percentage (0..100). */
  stonePct: number | null;
  /** Topsoil organic matter percentage (0..100). */
  omPct: number | null;
}

export interface TerrainAt {
  elevationM: number | null;
  slopeDeg: number | null;
  aspectDeg: number | null;
  /** Height Above Nearest Drainage (m); always null south of 60°S (no MERIT/Hydro coverage). */
  handM: number | null;
}

export interface SiteV07Layers {
  frostCalendar: FrostCalendarAt | null;
  extremesTail: ExtremesTailAt | null;
  phenology: PhenologyAt | null;
  waterBalance: WaterBalanceAt | null;
  soilPlus: SoilPlusAt | null;
  terrain: TerrainAt | null;
}

const clean = (v: number | null | undefined, scale = 1): number | null =>
  v === null || v === undefined || v === NODATA || !Number.isFinite(v) ? null : Math.round(v * scale * 100) / 100;

/**
 * Decode a frost_calendar/ pixel [lastSpringDoy, firstAutumnDoy, frostFreeDays, frostYearPct, falseSpringPct].
 * Handles sentinel 366 (frost-free year) and frost_year_pct cleanly.
 */
export function decodeFrostCalendar(raw: readonly number[] | null | undefined): FrostCalendarAt | null {
  if (!raw || raw.length < 4) return null;
  const [lastRaw, firstRaw, ffdRaw, fyPctRaw, fsPctRaw] = raw;
  if (lastRaw === NODATA && firstRaw === NODATA && ffdRaw === NODATA) return null;
  const lastSpringFrostDoy = lastRaw === FROST_FREE_SENTINEL_DOY || lastRaw === NODATA ? null : Math.max(1, Math.min(365, Math.trunc(lastRaw)));
  const firstAutumnFrostDoy = firstRaw === FROST_FREE_SENTINEL_DOY || firstRaw === NODATA ? null : Math.max(1, Math.min(365, Math.trunc(firstRaw)));
  const frostYearPct = fyPctRaw === NODATA || fyPctRaw === undefined ? (lastSpringFrostDoy === null ? 0 : 100) : Math.max(0, Math.min(100, Math.round(fyPctRaw)));
  const frostFree = (lastSpringFrostDoy === null && firstAutumnFrostDoy === null) || frostYearPct === 0;
  const frostFreeDays = frostFree ? 365 : Math.max(0, Math.min(365, ffdRaw === NODATA ? 365 : Math.trunc(ffdRaw)));
  const falseSpringPct = fsPctRaw === undefined || fsPctRaw === NODATA ? 0 : Math.max(0, Math.min(100, Math.round(fsPctRaw)));
  return { lastSpringFrostDoy, firstAutumnFrostDoy, frostFreeDays, frostYearPct, falseSpringPct, frostFree };
}

/** Decode an extremes_tail/ pixel [coldTail10yr*10, heatDome10yr*10, heatDays35, p90DryStreakDays]. */
export function decodeExtremesTail(raw: readonly number[] | null | undefined): ExtremesTailAt | null {
  if (!raw || raw.length < 4) return null;
  const coldTail10yrC = clean(raw[0], 0.1);
  const heatDome10yrC = clean(raw[1], 0.1);
  const heatDays35 = clean(raw[2], 1);
  const p90DryStreakDays = clean(raw[3], 1);
  if (coldTail10yrC === null && heatDome10yrC === null && heatDays35 === null && p90DryStreakDays === null) return null;
  return { coldTail10yrC, heatDome10yrC, heatDays35, p90DryStreakDays };
}

/** Decode a phenology/ pixel [chillToday, chill2050, chill2080]. */
export function decodePhenology(raw: readonly number[] | null | undefined): PhenologyAt | null {
  if (!raw || raw.length < 1) return null;
  const chillPortionsToday = clean(raw[0], 1);
  const chillPortions2050 = clean(raw[1], 1);
  const chillPortions2080 = clean(raw[2], 1);
  if (chillPortionsToday === null && chillPortions2050 === null && chillPortions2080 === null) return null;
  return { chillPortionsToday, chillPortions2050, chillPortions2080 };
}

/** Decode a water_balance/ pixel [cddDays, annualDeficitMm]. */
export function decodeWaterBalance(raw: readonly number[] | null | undefined): WaterBalanceAt | null {
  if (!raw || raw.length < 1) return null;
  const cddDays = clean(raw[0], 1);
  const annualDeficitMm = clean(raw[1], 1);
  if (cddDays === null && annualDeficitMm === null) return null;
  return { cddDays, annualDeficitMm };
}

/** Decode a soil_plus/ pixel [subsoilPh*10, subsoilClay*10, subsoilSand*10, stonePct*10, omPct*10]. */
export function decodeSoilPlus(raw: readonly number[] | null | undefined): SoilPlusAt | null {
  if (!raw || raw.length < 4) return null;
  const subsoilPh = clean(raw[0], 0.1);
  const subsoilClayPct = clean(raw[1], 0.1);
  const subsoilSandPct = clean(raw[2], 0.1);
  const stonePct = clean(raw[3], 0.1);
  const omPct = clean(raw[4], 0.1);
  if (subsoilPh === null && subsoilClayPct === null && stonePct === null) return null;
  return { subsoilPh, subsoilClayPct, subsoilSandPct, stonePct, omPct };
}

/**
 * Decode a terrain/ pixel [elevationM, slopeDeg*10, aspectDeg, handM*10].
 * Enforces handM = null south of 60°S (MERIT/Hydro southern coverage limit).
 */
export function decodeTerrain(raw: readonly number[] | null | undefined, lat: number): TerrainAt | null {
  if (!raw || raw.length < 3) return null;
  const elevationM = clean(raw[0], 1);
  const slopeDeg = clean(raw[1], 0.1);
  const aspectDeg = clean(raw[2], 1);
  const handM = lat < -60 ? null : clean(raw[3], 0.1);
  if (elevationM === null && slopeDeg === null && aspectDeg === null && handM === null) return null;
  return { elevationM, slopeDeg, aspectDeg, handM };
}

export interface SoilAwcInput {
  sandPct: number;
  clayPct: number;
  omPct?: number;
  stonePct?: number;
  /** Effective rooting depth in meters (default 1.0 m). */
  rootDepthM?: number;
  /** Peak summer daily evapotranspiration in mm/day (default 5 mm/day). */
  dailyEtMm?: number;
}

export interface SoilAwcResult {
  /** Available water capacity adjusted for coarse rock fragments (mm per meter of soil). */
  awcMmPerM: number;
  /** Total stored plant-available water across rootDepthM (mm). */
  totalReserveMm: number;
  /** Approximate days of stored water before stress at dailyEtMm. */
  dryDaysReserve: number;
}

/**
 * Saxton & Rawls (2006) volumetric available water capacity adjusted for stone/gravel fraction.
 */
export function soilAwcWithRock(input: SoilAwcInput): SoilAwcResult {
  const s = Math.max(0, Math.min(100, input.sandPct)) / 100;
  const c = Math.max(0, Math.min(100, input.clayPct)) / 100;
  const om = Math.max(0, Math.min(20, input.omPct ?? 2.5));
  const rockFrac = Math.max(0, Math.min(95, input.stonePct ?? 0)) / 100;
  const depthM = Math.max(0.1, input.rootDepthM ?? 1.0);
  const dailyEt = Math.max(1, input.dailyEtMm ?? 5);

  // Field capacity (theta_33) & permanent wilting point (theta_1500) approximations (m³/m³)
  const t1500t = -0.024 * s + 0.487 * c + 0.006 * om + 0.005 * s * om - 0.013 * c * om + 0.068 * s * c + 0.031;
  const t1500 = t1500t + (0.14 * t1500t - 0.02);
  const t33t = -0.251 * s + 0.195 * c + 0.011 * om + 0.006 * s * om - 0.027 * c * om + 0.452 * s * c + 0.299;
  const t33 = t33t + (1.283 * t33t * t33t - 0.374 * t33t - 0.015);

  const fineAwc = Math.max(0.03, Math.min(0.32, t33 - t1500));
  const awcMmPerM = Math.round(fineAwc * (1 - rockFrac) * 1000);
  const totalReserveMm = Math.round(awcMmPerM * depthM);
  const dryDaysReserve = Math.max(1, Math.round(totalReserveMm / dailyEt));
  return { awcMmPerM, totalReserveMm, dryDaysReserve };
}

/**
 * Astronomical photoperiod (daylength in hours, 0..24) using the CBM/Forsythe (1995) model.
 */
export function photoperiod(latDeg: number, doy: number): number {
  const lat = Math.max(-89.9, Math.min(89.9, latDeg));
  const day = ((Math.trunc(doy) - 1) % 365 + 365) % 365 + 1;
  const theta = 0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.0086 * (day - 186)));
  const phi = Math.asin(0.39795 * Math.cos(theta));
  const p = 0.8333; // civil sunrise/sunset refraction angle in degrees
  const latRad = (lat * Math.PI) / 180;
  const num = Math.sin((p * Math.PI) / 180) + Math.sin(latRad) * Math.sin(phi);
  const den = Math.cos(latRad) * Math.cos(phi);
  const ratio = num / den;
  if (ratio >= 1) return 24;
  if (ratio <= -1) return 0;
  const hours = 24 - (24 / Math.PI) * Math.acos(ratio);
  return Math.round(hours * 100) / 100;
}

export type MicroAspect = 'flat' | 'south' | 'east' | 'west' | 'north';
export type MicroLandform = 'ridge' | 'mid-slope' | 'valley';

export interface MicroclimateInput {
  coldC: number;
  hotC: number;
  falseSpringPct?: number;
  /** Latitude in degrees (determines which aspect is equator-facing). */
  lat?: number;
}

export interface MicroclimateParams {
  slopeDeg: number;
  aspect: MicroAspect;
  landform: MicroLandform;
}

export interface MicroclimateResult {
  coldDeltaC: number;
  hotDeltaC: number;
  falseSpringDeltaPct: number;
  adjustedColdC: number;
  adjustedHotC: number;
  adjustedFalseSpringPct: number;
}

/**
 * Deterministic topographic microclimate adjustment (slope, aspect, landform/cold-air pooling).
 * Respects hemisphere: south is warm-facing in Northern Hemisphere, north in Southern Hemisphere.
 */
export function adjustMicroclimate(base: MicroclimateInput, params: MicroclimateParams): MicroclimateResult {
  const slope = Math.max(0, Math.min(45, params.slopeDeg));
  const slopeFactor = slope / 15;
  const southHem = (base.lat ?? 45) < 0;
  const warmAspect: MicroAspect = southHem ? 'north' : 'south';
  const coolAspect: MicroAspect = southHem ? 'south' : 'north';

  let coldDelta = 0;
  let hotDelta = 0;
  let fsDelta = 0;

  if (params.aspect === warmAspect && slope > 0) {
    coldDelta += 0.6 * slopeFactor;
    hotDelta += 1.2 * slopeFactor;
    fsDelta += Math.round(3 * slopeFactor);
  } else if (params.aspect === coolAspect && slope > 0) {
    coldDelta -= 0.7 * slopeFactor;
    hotDelta -= 1.0 * slopeFactor;
    fsDelta -= Math.round(2 * slopeFactor);
  } else if ((params.aspect === 'east' || params.aspect === 'west') && slope > 0) {
    hotDelta += (params.aspect === 'west' ? 0.5 : -0.2) * slopeFactor;
  }

  if (params.landform === 'valley') {
    coldDelta -= 2.2;
    fsDelta += 8;
  } else if (params.landform === 'ridge') {
    coldDelta += 0.8;
    hotDelta -= 0.4;
    fsDelta -= 3;
  }

  const r1 = (n: number) => Math.round(n * 10) / 10;
  const coldDeltaC = r1(coldDelta);
  const hotDeltaC = r1(hotDelta);
  const baseFs = base.falseSpringPct ?? 0;
  const adjustedFalseSpringPct = Math.max(0, Math.min(100, baseFs + fsDelta));

  return {
    coldDeltaC,
    hotDeltaC,
    falseSpringDeltaPct: fsDelta,
    adjustedColdC: r1(base.coldC + coldDeltaC),
    adjustedHotC: r1(base.hotC + hotDeltaC),
    adjustedFalseSpringPct,
  };
}

export type TrajectoryCode =
  | 'Stable'
  | 'ColdEstablishmentBarrier'
  | 'FutureMaturityRisk'
  | 'NovelClimate'
  | 'OutOfRange';

export interface TrajectoryPlantLimits {
  minColdC: number;
  maxHotC: number;
  chillMinCP?: number;
  isAnnual?: boolean;
}

export interface TrajectorySiteClimate {
  coldTodayC: number;
  coldTail10yrC: number;
  hotTodayC: number;
  hotFutureC: number;
  chillTodayCP?: number | null;
  chillFutureCP?: number | null;
  /** Climate analogue match quality (0..1); below 0.55 flags a novel climate. */
  matchQuality?: number | null;
}

/**
 * Classify a plant's multi-decade trajectory from today's establishment window to future maturity.
 */
export function evaluateTrajectory(plant: TrajectoryPlantLimits, site: TrajectorySiteClimate): TrajectoryCode {
  const chillNeed = plant.chillMinCP ?? 0;
  const chillTodayOk = site.chillTodayCP == null || site.chillTodayCP >= chillNeed;
  const chillFutureOk = site.chillFutureCP == null || site.chillFutureCP >= chillNeed;
  const hotTodayOk = site.hotTodayC <= plant.maxHotC;
  const hotFutureOk = site.hotFutureC <= plant.maxHotC;
  const coldTodayOk = Boolean(plant.isAnnual) || site.coldTodayC >= plant.minColdC;
  const coldTailOk = Boolean(plant.isAnnual) || site.coldTail10yrC >= plant.minColdC;

  if (site.matchQuality != null && site.matchQuality < 0.55 && (!hotFutureOk || !chillFutureOk)) {
    return 'NovelClimate';
  }
  if (!coldTailOk && hotFutureOk && chillFutureOk) {
    return 'ColdEstablishmentBarrier';
  }
  if (hotTodayOk && chillTodayOk && (!hotFutureOk || !chillFutureOk)) {
    return 'FutureMaturityRisk';
  }
  if (!coldTodayOk || !hotTodayOk || !hotFutureOk || !chillFutureOk) {
    return 'OutOfRange';
  }
  return 'Stable';
}

/** Lazy-load interface for optional v0.7.0 climate analogue lookup (`analogues.bin`). */
export interface ClimateAnalogue {
  name: string;
  country: string;
  lat: number;
  lon: number;
  matchQuality: number;
}

export interface AnalogueLoader {
  lookup(lat: number, lon: number, period: string, scenario: string): Promise<ClimateAnalogue | null>;
}
