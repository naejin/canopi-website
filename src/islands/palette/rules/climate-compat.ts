// Temporary Stage-2 UI-layer compatibility helpers for Field Studio rules & views
// while Stage 3 ports all 4 Grower Intelligence synthesis engines directly onto
// canopi-climate v0.7.0 Rust WASM (src/lib/climate/wasm-bridge.ts).

export type MicroAspect = 'flat' | 'south' | 'east' | 'west' | 'north';
export type MicroLandform = 'ridge' | 'mid-slope' | 'valley';

export interface MicroclimateInput {
  coldC: number;
  hotC: number;
  falseSpringPct?: number;
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

export function photoperiod(latDeg: number, doy: number): number {
  const lat = Math.max(-89.9, Math.min(89.9, latDeg));
  const day = ((Math.trunc(doy) - 1) % 365 + 365) % 365 + 1;
  const theta = 0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.0086 * (day - 186)));
  const phi = Math.asin(0.39795 * Math.cos(theta));
  const p = 0.8333;
  const latRad = (lat * Math.PI) / 180;
  const ratio = (Math.sin((p * Math.PI) / 180) + Math.sin(latRad) * Math.sin(phi)) / (Math.cos(latRad) * Math.cos(phi));
  if (ratio >= 1) return 24;
  if (ratio <= -1) return 0;
  return Math.round((24 - (24 / Math.PI) * Math.acos(ratio)) * 100) / 100;
}

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
  const adjustedFalseSpringPct = Math.max(0, Math.min(100, (base.falseSpringPct ?? 0) + fsDelta));

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
  matchQuality?: number | null;
}

export function evaluateTrajectory(plant: TrajectoryPlantLimits, site: TrajectorySiteClimate): TrajectoryCode {
  const chillNeed = plant.chillMinCP ?? 0;
  const chillTodayOk = site.chillTodayCP == null || site.chillTodayCP >= chillNeed;
  const chillFutureOk = site.chillFutureCP == null || site.chillFutureCP >= chillNeed;
  const hotTodayOk = site.hotTodayC <= plant.maxHotC;
  const hotFutureOk = site.hotFutureC <= plant.maxHotC;
  const coldTodayOk = Boolean(plant.isAnnual) || site.coldTodayC >= plant.minColdC;
  const coldTailOk = Boolean(plant.isAnnual) || site.coldTail10yrC >= plant.minColdC;

  if (site.matchQuality != null && site.matchQuality < 0.55 && (!hotFutureOk || !chillFutureOk)) return 'NovelClimate';
  if (!coldTailOk && hotFutureOk && chillFutureOk) return 'ColdEstablishmentBarrier';
  if (hotTodayOk && chillTodayOk && (!hotFutureOk || !chillFutureOk)) return 'FutureMaturityRisk';
  if (!coldTodayOk || !hotTodayOk || !hotFutureOk || !chillFutureOk) return 'OutOfRange';
  return 'Stable';
}

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
