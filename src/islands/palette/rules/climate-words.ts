// Single Source of Truth for rigorous, grower-first site climate, soil & v0.7.0 intelligence (Stage 3).
// Pure functions, zero DOM/WASM dependencies, safe for both first-run and lazy chunks.
// Consumes canopi-climate v0.7.0 layers (loc.lookup.v07) and optional Rust WASM MicroclimateAdjustment.
import type { ClimateZone, SiteEdits, SiteLocation, Taxon } from '../../../lib/palette/index.ts';
import { siteClimate } from '../../../lib/palette/index.ts';
import type { MicroclimateAdjustment } from '../../../lib/climate/wasm-bridge.ts';
import type { MicroAspect, MicroLandform } from '../state/studio.ts';
import { pageLang, T } from '../strings.ts';

const fb = (v: string, d: string): string => (v.startsWith('studio.') ? d : v);

export interface MicroclimateParams {
  slopeDeg: number;
  aspect: MicroAspect;
  landform: MicroLandform;
  elevOffsetM?: number;
}

export type TrajectoryCode =
  | 'Stable'
  | 'ColdEstablishmentBarrier'
  | 'FutureMaturityRisk'
  | 'NovelClimate'
  | 'OutOfRange';

export function localMonthShort(idx: number): string {
  const EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
  const lang = pageLang();
  if (!lang || lang === 'en') return EN[idx] ?? 'Jan';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'short' }).format(new Date(Date.UTC(2024, idx, 15)));
  } catch {
    return EN[idx] ?? 'Jan';
  }
}

function localMonthLong(idx: number): string {
  const EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
  const lang = pageLang();
  if (!lang || lang === 'en') return EN[idx] ?? 'January';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(Date.UTC(2024, idx, 15)));
  } catch {
    return EN[idx] ?? 'January';
  }
}

function localMonthInitial(idx: number): string {
  const EN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;
  const lang = pageLang();
  if (!lang || lang === 'en') return EN[idx] ?? 'J';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'narrow' }).format(new Date(Date.UTC(2024, idx, 15)));
  } catch {
    return EN[idx] ?? 'J';
  }
}

/** Convert 1-based day-of-year (1..365) into a locale-aware short date like "Mar 14". */
function doyToDateLabel(doy: number | null | undefined): string | null {
  if (doy == null || !Number.isFinite(doy) || doy <= 0 || doy >= 366) return null;
  const date = new Date(Date.UTC(2023, 0, Math.round(doy)));
  const lang = pageLang() || 'en';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    return `${localMonthShort(date.getUTCMonth())} ${date.getUTCDate()}`;
  }
}

/** CBM photoperiod length in hours (matches canopi-climate photoperiod). */
export function photoperiodHours(latDeg: number, doy: number): number {
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

/** Engine 2: Distinguish shallow herbs/groundcovers (0-30 cm) from deep-rooted trees/shrubs (30-100 cm). */
export function isDeepRootedTaxon(t: Taxon): boolean {
  if (t.traits.is_annual === true || t.traits.grown_as_annual === true) return false;
  if (t.traits.root_depth_min_cm != null) return t.traits.root_depth_min_cm >= 45;
  const h = t.traits.height_m?.max ?? null;
  if (h != null) return h > 1.2;
  const habit = (t.traits.habit ?? '').toLowerCase();
  return /tree|shrub|bamboo|palm|vine|liana/.test(habit);
}

type WinterTier = 'mild' | 'cool' | 'dormant';

export interface SiteClimateProfile {
  hasLive: boolean;
  /** Coldest-month mean daily minimum (°C), microclimate-adjusted when live. */
  typicalColdNightC: number | null;
  /** 1-in-10-yr hard freeze (°C) — real v0.7.0 measured tail or fallback estimate. */
  coldFreeze10yrC: number | null;
  coldFreezeIsEst: boolean;
  /** Warmest-month mean daily maximum (°C), microclimate-adjusted when live. */
  typicalWarmHighC: number | null;
  /** 1-in-10-yr heat-dome peak (°C) — real v0.7.0 measured tail or fallback estimate. */
  heatPeak10yrC: number | null;
  heatPeakIsEst: boolean;
  /** Microclimate deltas applied from slope/aspect/landform/elevation. */
  coldDeltaC: number;
  hotDeltaC: number;
  lapseC: number;
  valleyPenaltyC: number;
  falseSpringDeltaPct: number;
  hasMicroShift: boolean;
  solarRatioAnnual: number | null;
  solarRatioGrowing: number | null;
  /** Longest typical consecutive dry days (real v0.7.0 CDD or derived estimate). */
  dryStreakDays: number | null;
  /** P/PET aridity index & plain-English moisture regime. */
  aridityIndex: number | null;
  moistureRegime: string | null;
  /** Topsoil pH (grower edit override or tile value) + plain-English reaction. */
  ph: number | null;
  phReaction: string | null;
  soilTexture: string | null;
  /** Engine 1: Root-Zone Water Tank (v0.7.0 soil_plus + water_balance + Rust soilAwc). */
  awcMmPerM: number | null;
  dryDaysReserve: number | null;
  droughtGapDays: number | null;
  omPct: number | null;
  cfvoTopPct: number | null;
  cfvoSubPct: number | null;
  cwdP90Mm: number | null;
  vpdSummerKpa: number | null;
  /** Engine 2: Topsoil vs Subsoil Trap (30-100 cm soil_plus). */
  subsoilPh: number | null;
  subsoilClayPct: number | null;
  subsoilTrap: boolean;
  /** Engine 3: Terrain & Cold-Air Frost Pocket (v0.7.0 terrain). */
  elevM: number | null;
  elevTotalM: number | null;
  reliefM: number | null;
  slopeDeg: number | null;
  handM: number | null;
  landform: MicroLandform;
  frostPocket: boolean;
  /** Engine 4: v0.7.0 extremes, frost calendar, phenology & ERA5-Land trend. */
  heatDays35: number | null;
  recentTrendC: number | null;
  lastSpringFrostLabel: string | null;
  lateFrostP90Label: string | null;
  frostFreeDays: number | null;
  falseSpringPct: number | null;
  frostFree: boolean;
  yearRoundFrost: boolean;
  chillTodayCP: number | null;
  chill2050CP: number | null;
  chill2080CP: number | null;
  /** Grower-first winter classification. */
  winterClass: string;
  /** Compact winter label for header Health Ribbon. */
  winterShortLabel: string;
  /** 3-tier winter window: 'mild' (>= 3.5 °C), 'cool' (0..3.5 °C), 'dormant' (< 0 °C). */
  winterTier: WinterTier;
  /** Hemisphere-aware peak months & winter season. */
  coldMonth: string;
  warmMonth: string;
  winterSeason: string;
  /** Köppen code when available. */
  koppen: string | null;
}

const DEFAULT_MICRO: MicroclimateParams = { slopeDeg: 0, aspect: 'flat', landform: 'mid-slope', elevOffsetM: 0 };
const r1 = (n: number): number => Math.round(n * 10) / 10;

export function phReactionLabel(ph: number): string {
  if (ph < 5.5) return fb(T('studio.ph.strongAcid'), 'strongly acidic');
  if (ph < 6.2) return fb(T('studio.ph.mildAcid'), 'mildly acidic');
  if (ph <= 7.2) return fb(T('studio.ph.neutral'), 'neutral');
  if (ph <= 7.8) return fb(T('studio.ph.mildAlk'), 'mildly alkaline');
  return fb(T('studio.ph.alkaline'), 'alkaline');
}

function moistureRegimeLabel(aridityIndex: number): string {
  if (aridityIndex >= 0.65) return fb(T('studio.moisture.humid'), 'Humid');
  if (aridityIndex >= 0.5) return fb(T('studio.moisture.subhumid'), 'Sub-humid');
  if (aridityIndex >= 0.2) return fb(T('studio.moisture.semiarid'), 'Dry-summer / semi-arid');
  return fb(T('studio.moisture.arid'), 'Arid');
}

function winterClassFor(typicalColdNightC: number, coldFreeze10yrC: number): string {
  if (typicalColdNightC >= 8 || coldFreeze10yrC >= 0) return fb(T('studio.wclass.frostFree'), 'Frost-free');
  if (typicalColdNightC >= 2) return fb(T('studio.wclass.mild'), 'Mild winter (occasional frost)');
  if (typicalColdNightC >= -4) return fb(T('studio.wclass.hard'), 'Hard-freeze winter');
  return fb(T('studio.wclass.severe'), 'Severe winter freezes');
}

export function signedTemp1(c: number): string {
  const v = r1(c);
  if (v > 0) return `+${v.toFixed(1)} °C`;
  return `${v.toFixed(1)} °C`;
}

export function formatFreezeTag(coldFreeze10yrC: number, isEst: boolean): string {
  return `${isEst ? '~' : ''}${coldFreeze10yrC.toFixed(1)} °C`;
}

export function formatHeatPeakTag(heatPeak10yrC: number, isEst: boolean): string {
  return `${isEst ? '~' : ''}${heatPeak10yrC.toFixed(1)} °C`;
}

/**
 * Single source of truth for site climate, soil, water tank, subsoil trap, terrain, and phenology
 * across all Field Studio screens. Consumes Rust WASM MicroclimateAdjustment when provided.
 */
export function siteClimateProfile(
  loc: SiteLocation | null,
  zone: ClimateZone | null = null,
  mc: MicroclimateParams = DEFAULT_MICRO,
  edits?: SiteEdits | null,
  wasmAdj?: MicroclimateAdjustment | null,
): SiteClimateProfile {
  const sc = loc?.lookup ? siteClimate(loc.lookup) : null;
  const today = sc?.today ?? null;
  const lat = loc?.lat ?? 45;
  const southHem = lat < 0;
  const coldMonth = southHem ? localMonthShort(6) : localMonthShort(0);
  const warmMonth = southHem ? localMonthShort(0) : localMonthShort(6);
  const winterSeason = southHem
    ? `${localMonthShort(4)}–${localMonthShort(8)}`
    : `${localMonthShort(10)}–${localMonthShort(2)}`;

  const phRaw = edits?.soilPh ?? loc?.lookup?.soil?.phH2o ?? null;
  const ph = phRaw != null && Number.isFinite(phRaw) ? r1(phRaw) : null;
  const phReaction = ph != null ? phReactionLabel(ph) : null;
  const soilTexture = loc?.lookup?.soil?.texture ?? null;

  if (!loc?.lookup || !today) {
    const winterTier: WinterTier =
      zone === 'Tropical' || zone === 'Subtropical'
        ? 'mild'
        : zone === 'Mediterranean'
          ? 'cool'
          : 'dormant';
    const isFrostFreeZone = zone === 'Tropical' || zone === 'Subtropical';
    const winterClass = isFrostFreeZone
      ? fb(T('studio.wclass.frostFree'), 'Frost-free')
      : zone === 'Mediterranean'
        ? fb(T('studio.wclass.mild'), 'Mild winter (occasional frost)')
        : fb(T('studio.wclass.hard'), 'Hard-freeze winter');
    return {
      hasLive: false,
      typicalColdNightC: null,
      coldFreeze10yrC: null,
      coldFreezeIsEst: true,
      typicalWarmHighC: null,
      heatPeak10yrC: null,
      heatPeakIsEst: true,
      coldDeltaC: 0,
      hotDeltaC: 0,
      lapseC: 0,
      valleyPenaltyC: 0,
      falseSpringDeltaPct: 0,
      hasMicroShift: false,
      solarRatioAnnual: null,
      solarRatioGrowing: null,
      dryStreakDays: null,
      aridityIndex: null,
      moistureRegime: null,
      ph,
      phReaction,
      soilTexture,
      awcMmPerM: null,
      dryDaysReserve: null,
      droughtGapDays: null,
      omPct: null,
      cfvoTopPct: null,
      cfvoSubPct: null,
      cwdP90Mm: null,
      vpdSummerKpa: null,
      subsoilPh: null,
      subsoilClayPct: null,
      subsoilTrap: false,
      elevM: null,
      elevTotalM: null,
      reliefM: null,
      slopeDeg: null,
      handM: null,
      landform: mc.landform,
      frostPocket: false,
      heatDays35: null,
      recentTrendC: null,
      lastSpringFrostLabel: null,
      lateFrostP90Label: null,
      frostFreeDays: null,
      falseSpringPct: null,
      frostFree: isFrostFreeZone,
      yearRoundFrost: false,
      chillTodayCP: null,
      chill2050CP: null,
      chill2080CP: null,
      winterClass,
      winterShortLabel: winterClass,
      winterTier,
      coldMonth,
      warmMonth,
      winterSeason,
      koppen: sc?.koppen ?? null,
    };
  }

  const v07 = loc.lookup.v07;
  const nightsShift = edits?.nightsShiftC ?? 0;
  const daysShift = edits?.daysShiftC ?? 0;
  const elevOff = mc.elevOffsetM ?? 0;

  // Engine 3: Prefer exact Rust WASM MicroclimateAdjustment when available; fallback to lapse + pooling.
  const lapseC = wasmAdj ? r1(wasmAdj.delta_t_lapse_c) : r1(-(elevOff / 100) * 0.65);
  const valleyPenaltyC = wasmAdj
    ? r1(wasmAdj.delta_t_pool_extreme_c)
    : (mc.landform === 'valley' ? -2.2 : mc.landform === 'ridge' ? 0.6 : 0);
  const aspectHeatC = wasmAdj
    ? r1((wasmAdj.solar_ratio.growing_season - 1) * 4.5)
    : (mc.aspect === (southHem ? 'north' : 'south')
      ? r1(Math.min(1.8, mc.slopeDeg * 0.08))
      : mc.aspect === (southHem ? 'south' : 'north')
        ? r1(-Math.min(1.5, mc.slopeDeg * 0.07))
        : 0);

  const coldDeltaC = wasmAdj
    ? r1(wasmAdj.tmin_cold_c - today.tminColdC)
    : r1(lapseC + valleyPenaltyC);
  const hotDeltaC = wasmAdj
    ? r1(wasmAdj.tmax_warm_c - today.tmaxWarmC + aspectHeatC)
    : r1(lapseC + aspectHeatC);
  const falseSpringDeltaPct = mc.landform === 'valley' ? 8 : mc.landform === 'ridge' ? -3 : 0;

  const adjustedColdC = r1(today.tminColdC + nightsShift + coldDeltaC);
  const adjustedHotC = r1(today.tmaxWarmC + daysShift + hotDeltaC);

  // Real v0.7.0 1-in-10 freeze & heat dome (no "(est.)" when v0.7.0 extremes or extremesTail is present!)
  const rawColdTail = wasmAdj?.tmin_p10_c
    ?? v07?.extremesTail?.coldTail10yrC
    ?? v07?.extremes?.tminExtremeC
    ?? null;
  const rawHeatDome = wasmAdj?.tmax_p90_c
    ?? v07?.extremesTail?.heatDome10yrC
    ?? v07?.extremes?.tmaxExtremeC
    ?? null;
  const coldFreezeIsEst = rawColdTail == null;
  const heatPeakIsEst = rawHeatDome == null;
  const coldFreeze10yrC = rawColdTail != null
    ? r1(rawColdTail + nightsShift + (wasmAdj ? 0 : coldDeltaC))
    : r1(adjustedColdC - 8.5);
  const heatPeak10yrC = rawHeatDome != null
    ? r1(rawHeatDome + daysShift + (wasmAdj ? 0 : hotDeltaC))
    : r1(adjustedHotC + 8);

  const aridityIndex = today.aridityIndex ?? null;
  const moistureRegime = aridityIndex != null ? moistureRegimeLabel(aridityIndex) : null;
  const dryStreakDays =
    v07?.waterBalance?.cddDays
    ?? v07?.extremesTail?.p90DryStreakDays
    ?? Math.round(14 + (1 - Math.min(1, aridityIndex ?? 0.8)) * 38 + (today.dryMonths ?? 2) * 3);

  // Engine 1: Root-Zone Water Tank (modulated live by watering regime & rain edit)
  const sp = v07?.soilPlus ?? null;
  const wb = v07?.waterBalance ?? null;
  const wateringBonus = edits?.watering === 'all-year' ? 30 : edits?.watering === 'first-years' ? 8 : 0;
  const rainBonus = Math.round((edits?.rainShiftMm ?? 0) / 45);
  const baseReserve = sp?.dryDaysReserve ?? null;
  const dryDaysReserve = baseReserve != null ? Math.max(5, baseReserve + wateringBonus + rainBonus) : null;
  const droughtGapDays = dryDaysReserve != null && dryStreakDays != null
    ? Math.max(0, dryStreakDays - dryDaysReserve)
    : null;

  // Engine 2: Topsoil vs Subsoil Trap
  const subsoilPh = sp?.ph30_100 ?? null;
  const subsoilClayPct = sp?.clay30_100 ?? null;
  const subsoilTrap = ph != null && subsoilPh != null && Math.abs(subsoilPh - ph) >= 0.8;

  // Engine 3: Terrain & Frost Pocket
  const tr = v07?.terrain ?? null;
  const elevM = tr?.elevM ?? null;
  const elevTotalM = elevM != null ? Math.round(elevM + elevOff) : null;
  const reliefM = tr?.reliefM ?? null;
  const slopeDeg = mc.slopeDeg || (tr?.slopeDeg ?? null);
  const handM = tr?.handM ?? null;

  // Frost calendar
  const fc = v07?.frostCalendar ?? null;
  const frostFree = fc ? fc.frostFree : (adjustedColdC >= 8 || coldFreeze10yrC >= 0);
  const yearRoundFrost = fc ? Boolean(fc.yearRoundFrost) : false;
  const frostFreeDays = fc && !fc.frostFree ? fc.frostFreeDays : null;
  const falseSpringPct = fc && fc.falseSpringPct > 0
    ? Math.max(0, Math.min(100, fc.falseSpringPct + falseSpringDeltaPct))
    : null;
  const frostPocket = mc.landform === 'valley'
    || Boolean(tr?.frostPocket)
    || (handM != null && handM <= 5 && (reliefM ?? 0) >= 80);

  const winterClass = winterClassFor(adjustedColdC, coldFreeze10yrC);
  const winterTier: WinterTier =
    adjustedColdC >= 3.5 ? 'mild' : adjustedColdC >= 0 ? 'cool' : 'dormant';
  const freezeTag = formatFreezeTag(coldFreeze10yrC, coldFreezeIsEst);
  const winterShortLabel = fb(T('studio.ribbon.freezeShort', { freeze: freezeTag }), `❄ 1-in-10-yr freeze ${freezeTag}`);

  return {
    hasLive: true,
    typicalColdNightC: adjustedColdC,
    coldFreeze10yrC,
    coldFreezeIsEst,
    typicalWarmHighC: adjustedHotC,
    heatPeak10yrC,
    heatPeakIsEst,
    coldDeltaC,
    hotDeltaC,
    lapseC,
    valleyPenaltyC,
    falseSpringDeltaPct,
    hasMicroShift: coldDeltaC !== 0 || hotDeltaC !== 0 || falseSpringDeltaPct !== 0 || elevOff !== 0,
    solarRatioAnnual: wasmAdj ? Math.round(wasmAdj.solar_ratio.annual * 100) / 100 : null,
    solarRatioGrowing: wasmAdj ? Math.round(wasmAdj.solar_ratio.growing_season * 100) / 100 : null,
    dryStreakDays,
    aridityIndex,
    moistureRegime,
    ph,
    phReaction,
    soilTexture,
    awcMmPerM: sp?.awcMmPerM ?? null,
    dryDaysReserve,
    droughtGapDays,
    omPct: sp?.om0_30Pct ?? null,
    cfvoTopPct: sp?.cfvo0_30 ?? null,
    cfvoSubPct: sp?.cfvo30_100 ?? null,
    cwdP90Mm: wb?.cwdP90Mm ?? null,
    vpdSummerKpa: wb?.vpdSummerKpa ?? null,
    subsoilPh,
    subsoilClayPct,
    subsoilTrap,
    elevM,
    elevTotalM,
    reliefM,
    slopeDeg,
    handM,
    landform: mc.landform,
    frostPocket,
    heatDays35: v07?.extremesTail?.heatDays35 ?? null,
    recentTrendC: v07?.extremesTail?.recentTrendC ?? null,
    lastSpringFrostLabel: doyToDateLabel(fc?.lastSpringDoy),
    lateFrostP90Label: doyToDateLabel(fc?.lastSpringP90Doy),
    frostFreeDays,
    falseSpringPct,
    frostFree,
    yearRoundFrost,
    chillTodayCP: wasmAdj?.chill_portions != null ? Math.round(wasmAdj.chill_portions) : (v07?.phenology?.chillPortionsToday ?? null),
    chill2050CP: v07?.phenology?.chillPortions2050 ?? null,
    chill2080CP: v07?.phenology?.chillPortions2080 ?? null,
    winterClass,
    winterShortLabel,
    winterTier,
    coldMonth,
    warmMonth,
    winterSeason,
    koppen: sc?.koppen ?? null,
  };
}
