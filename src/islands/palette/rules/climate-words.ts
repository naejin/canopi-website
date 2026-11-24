// Single Source of Truth for rigorous, grower-first site climate & soil wording (Stage 1G).
// Pure functions, zero DOM/WASM dependencies, safe for both first-run and lazy chunks.
// Consumed by ALL 7 studio surfaces: SitePostcard, StudioHeader, StudioRail, LivingSystemTab,
// Climate2050Tab, PlantingPlanTab, and FieldDossier.
import type { ClimateZone, SiteEdits, SiteLocation } from '../../../lib/palette/index.ts';
import { siteClimate } from '../../../lib/palette/index.ts';
import { adjustMicroclimate, type MicroclimateParams } from './climate-compat.ts';
import { pageLang, T } from '../strings.ts';

const fb = (v: string, d: string): string => (v.startsWith('studio.') ? d : v);

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

export function localMonthLong(idx: number): string {
  const EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
  const lang = pageLang();
  if (!lang || lang === 'en') return EN[idx] ?? 'January';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(Date.UTC(2024, idx, 15)));
  } catch {
    return EN[idx] ?? 'January';
  }
}

export function localMonthInitial(idx: number): string {
  const EN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;
  const lang = pageLang();
  if (!lang || lang === 'en') return EN[idx] ?? 'J';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'narrow' }).format(new Date(Date.UTC(2024, idx, 15)));
  } catch {
    return EN[idx] ?? 'J';
  }
}

type WinterTier = 'mild' | 'cool' | 'dormant';

export interface SiteClimateProfile {
  hasLive: boolean;
  /** Coldest-month mean daily minimum (°C), microclimate-adjusted when live. */
  typicalColdNightC: number | null;
  /** 1-in-10-yr hard freeze (°C) — real v0.7 tail or consistent derived estimate. */
  coldFreeze10yrC: number | null;
  coldFreezeIsEst: boolean;
  /** Warmest-month mean daily maximum (°C), microclimate-adjusted when live. */
  typicalWarmHighC: number | null;
  /** 1-in-10-yr heat-dome peak (°C) — real v0.7 tail or consistent derived estimate. */
  heatPeak10yrC: number | null;
  heatPeakIsEst: boolean;
  /** Microclimate deltas applied from slope/aspect/landform. */
  coldDeltaC: number;
  hotDeltaC: number;
  falseSpringDeltaPct: number;
  hasMicroShift: boolean;
  /** Longest typical consecutive dry days (real v0.7 CDD or derived estimate). */
  dryStreakDays: number | null;
  /** P/PET aridity index & plain-English moisture regime. */
  aridityIndex: number | null;
  moistureRegime: string | null;
  /** Topsoil pH (grower edit override or tile value) + plain-English reaction. */
  ph: number | null;
  phReaction: string | null;
  soilTexture: string | null;
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
  /** v0.7 frost calendar when available. */
  frostFreeDays: number | null;
  falseSpringPct: number | null;
  frostFree: boolean;
  /** Köppen code when available. */
  koppen: string | null;
}

const DEFAULT_MICRO: MicroclimateParams = { slopeDeg: 0, aspect: 'flat', landform: 'mid-slope' };
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
 * Single source of truth for site climate & soil metrics across all 7 studio screens.
 * Every displayed temperature, extreme freeze/heat-dome peak, dry-spell count, soil pH,
 * and winter classification comes from this function so screens stay 100% coherent.
 */
export function siteClimateProfile(
  loc: SiteLocation | null,
  zone: ClimateZone | null = null,
  mc: MicroclimateParams = DEFAULT_MICRO,
  edits?: SiteEdits | null,
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
      falseSpringDeltaPct: 0,
      hasMicroShift: false,
      dryStreakDays: null,
      aridityIndex: null,
      moistureRegime: null,
      ph,
      phReaction,
      soilTexture,
      winterClass,
      winterShortLabel: winterClass,
      winterTier,
      coldMonth,
      warmMonth,
      winterSeason,
      frostFreeDays: null,
      falseSpringPct: null,
      frostFree: isFrostFreeZone,
      koppen: sc?.koppen ?? null,
    };
  }

  const nightsShift = edits?.nightsShiftC ?? 0;
  const daysShift = edits?.daysShiftC ?? 0;
  const adj = adjustMicroclimate(
    { coldC: today.tminColdC + nightsShift, hotC: today.tmaxWarmC + daysShift, lat },
    { slopeDeg: mc.slopeDeg, aspect: mc.aspect, landform: mc.landform },
  );

  const v07 = loc.lookup.v07;
  const rawColdTail = v07?.extremesTail?.coldTail10yrC ?? null;
  const rawHeatDome = v07?.extremesTail?.heatDome10yrC ?? null;
  const coldFreezeIsEst = rawColdTail == null;
  const heatPeakIsEst = rawHeatDome == null;
  const coldFreeze10yrC = rawColdTail != null ? r1(rawColdTail + nightsShift + adj.coldDeltaC) : r1(adj.adjustedColdC - 8.5);
  const heatPeak10yrC = rawHeatDome != null ? r1(rawHeatDome + daysShift + adj.hotDeltaC) : r1(adj.adjustedHotC + 8);

  const aridityIndex = today.aridityIndex ?? null;
  const moistureRegime = aridityIndex != null ? moistureRegimeLabel(aridityIndex) : null;
  const dryStreakDays =
    v07?.waterBalance?.cddDays ??
    v07?.extremesTail?.p90DryStreakDays ??
    Math.round(14 + (1 - Math.min(1, aridityIndex ?? 0.8)) * 38 + (today.dryMonths ?? 2) * 3);

  const fc = v07?.frostCalendar ?? null;
  const frostFree = fc ? fc.frostFree : (adj.adjustedColdC >= 8 || coldFreeze10yrC >= 0);
  const frostFreeDays = fc && !fc.frostFree ? fc.frostFreeDays : null;
  const falseSpringPct = fc && fc.falseSpringPct > 0 ? fc.falseSpringPct : null;

  const winterClass = winterClassFor(adj.adjustedColdC, coldFreeze10yrC);
  const winterTier: WinterTier =
    adj.adjustedColdC >= 3.5 ? 'mild' : adj.adjustedColdC >= 0 ? 'cool' : 'dormant';
  const freezeTag = formatFreezeTag(coldFreeze10yrC, coldFreezeIsEst);
  const winterShortLabel = fb(T('studio.ribbon.freezeShort', { freeze: freezeTag }), `❄ 1-in-10-yr freeze ${freezeTag}`);

  return {
    hasLive: true,
    typicalColdNightC: adj.adjustedColdC,
    coldFreeze10yrC,
    coldFreezeIsEst,
    typicalWarmHighC: adj.adjustedHotC,
    heatPeak10yrC,
    heatPeakIsEst,
    coldDeltaC: adj.coldDeltaC,
    hotDeltaC: adj.hotDeltaC,
    falseSpringDeltaPct: adj.falseSpringDeltaPct,
    hasMicroShift: adj.coldDeltaC !== 0 || adj.hotDeltaC !== 0 || adj.falseSpringDeltaPct !== 0,
    dryStreakDays,
    aridityIndex,
    moistureRegime,
    ph,
    phReaction,
    soilTexture,
    winterClass,
    winterShortLabel,
    winterTier,
    coldMonth,
    warmMonth,
    winterSeason,
    frostFreeDays,
    falseSpringPct,
    frostFree,
    koppen: sc?.koppen ?? null,
  };
}
