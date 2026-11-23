// Pure Field Studio filter, sparkline, and Dossier specification helpers (Slice 3.3).
// Shared by My Palette (Cards & Compact List), the Right Rail (Coach & All Plants), and Field Dossier.
// Zero botanical-layer jargon; uses W1 t.light, unified 6-stage succession, and v0.7.0 photoperiod().
import type { Details, JobId, Month, PhaseOrd, SiteEdits, SiteLocation, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { jobsOf, months, phases, phaseToStageIndex, SUCCESSION_STAGES_6 } from '../../../lib/consortium/index.ts';
import { photoperiod, type MicroclimateParams } from '../../../lib/climate/v07.ts';
import { siteClimateProfile } from './climate-words.ts';

export type FitFilter = 'fit' | 'care' | 'risk';

export interface StudioFilterState {
  fits: FitFilter[];
  suns: Stratum[];
  stages: number[];
  roles: JobId[];
  winterPlantable: boolean;
  lowChill: boolean;
  clayWet: boolean;
  extremeHardy: boolean;
}

export const EMPTY_STUDIO_FILTERS: StudioFilterState = {
  fits: [],
  suns: [],
  stages: [],
  roles: [],
  winterPlantable: false,
  lowChill: false,
  clayWet: false,
  extremeHardy: false,
};

export const FIT_OPTIONS: readonly { id: FitFilter; label: string }[] = [
  { id: 'fit', label: '✓ Thrives' },
  { id: 'care', label: '⚠ Needs care' },
  { id: 'risk', label: '✕ At risk' },
];

export const SUN_TIER_OPTIONS: readonly { id: Stratum; label: string }[] = [
  { id: 'emergent', label: 'Full sun' },
  { id: 'high', label: 'Mostly sun' },
  { id: 'medium', label: 'Part shade' },
  { id: 'low', label: 'Shade' },
];

export const ROLE_OPTIONS: readonly { id: JobId; label: string }[] = [
  { id: 'feeds_you', label: 'Food & harvest' },
  { id: 'feeds_soil', label: 'Soil builder' },
  { id: 'helpers', label: 'Pollinators & helpers' },
  { id: 'mulch', label: 'Biomass & mulch' },
  { id: 'ground', label: 'Living soil cover' },
  { id: 'shelter', label: 'Windbreak & shelter' },
];

export function activeFilterCount(f: StudioFilterState): number {
  return (
    f.fits.length +
    f.suns.length +
    f.stages.length +
    f.roles.length +
    (f.winterPlantable ? 1 : 0) +
    (f.lowChill ? 1 : 0) +
    (f.clayWet ? 1 : 0) +
    (f.extremeHardy ? 1 : 0)
  );
}

function primarySunTier(t: Taxon): Stratum {
  return t.light?.preferred ?? t.light?.sunniest ?? t.stratum?.value ?? 'high';
}

export const sunTierOf = primarySunTier;

export function sunTierLabel(t: Taxon): string {
  const tier = primarySunTier(t);
  return SUN_TIER_OPTIONS.find((o) => o.id === tier)?.label ?? 'Mostly sun';
}

export function stageSpanOf(t: Taxon): { start: number; end: number; label: string } {
  if (!t.phases) return { start: 2, end: 4, label: 'Secondary 1–3' };
  const sOrd = Math.max(0, phases.indexOf(t.phases.start)) as PhaseOrd;
  const eOrd = Math.max(0, phases.indexOf(t.phases.end)) as PhaseOrd;
  const start = phaseToStageIndex(sOrd);
  const end = Math.max(start, phaseToStageIndex(eOrd));
  const a = SUCCESSION_STAGES_6[start].name;
  const b = SUCCESSION_STAGES_6[end].name;
  return { start, end, label: start === end ? a : `${a} → ${b}` };
}

function isLowChillTaxon(t: Taxon): boolean {
  const cold = t.climate?.tminCold?.low;
  if (cold != null && cold >= 0) return true;
  if (t.traits.is_annual === true || t.traits.grown_as_annual === true) return true;
  if (t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen)) return true;
  return false;
}

function isClayWetTaxon(t: Taxon): boolean {
  if (t.traits.well_drained === false) return true;
  if (t.traits.moisture_use && /high|wet|moist/i.test(t.traits.moisture_use)) return true;
  return false;
}

function isExtremeHardyTaxon(t: Taxon): boolean {
  const cold = t.climate?.tminCold?.low;
  const hot = t.climate?.tmaxWarm?.high;
  if (cold != null && cold <= -12) return true;
  if (hot != null && hot >= 36) return true;
  if (t.traits.drought_tolerance && /high/i.test(t.traits.drought_tolerance)) return true;
  return false;
}

function isWinterPlantableTaxon(t: Taxon): boolean {
  const cold = t.climate?.tminCold?.low;
  if (cold != null && cold <= -2) return true;
  if (t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen)) return true;
  return false;
}

export function matchesStudioFilters(t: Taxon, f: StudioFilterState, verdictLevel?: string): boolean {
  if (f.fits.length > 0) {
    const k: FitFilter = verdictLevel === 'outside' ? 'risk' : verdictLevel === 'look' ? 'care' : 'fit';
    if (!f.fits.includes(k)) return false;
  }
  if (f.suns.length > 0) {
    const order: readonly Stratum[] = ['emergent', 'high', 'medium', 'low'];
    const sunOk = f.suns.some((wantSun) => {
      if (t.light?.sunniest && t.light?.shadiest) {
        const a = order.indexOf(t.light.sunniest);
        const b = order.indexOf(t.light.shadiest);
        const want = order.indexOf(wantSun);
        return want >= Math.min(a, b) && want <= Math.max(a, b);
      }
      return primarySunTier(t) === wantSun;
    });
    if (!sunOk) return false;
  }
  if (f.stages.length > 0) {
    const span = stageSpanOf(t);
    if (!f.stages.some((st) => st >= span.start && st <= span.end)) return false;
  }
  if (f.roles.length > 0) {
    const jobs = jobsOf(t);
    if (!f.roles.some((r) => jobs.includes(r))) return false;
  }
  if (f.winterPlantable && !isWinterPlantableTaxon(t)) return false;
  if (f.lowChill && !isLowChillTaxon(t)) return false;
  if (f.clayWet && !isClayWetTaxon(t)) return false;
  if (f.extremeHardy && !isExtremeHardyTaxon(t)) return false;
  return true;
}

export type SparkLevel = 'dormant' | 'active' | 'peak';

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

export function activityMonthsOf(t: Taxon, details?: Details | null): SparkLevel[] {
  const out: SparkLevel[] = Array(12).fill('dormant');
  if (details?.layerValues?.length) {
    let any = false;
    for (const lv of details.layerValues) {
      if (!lv.months?.length) continue;
      const lvl: SparkLevel = lv.field === 'ripening_or_fruit_seen_months' || lv.field === 'bloom_months' ? 'peak' : 'active';
      for (const m of lv.months) {
        const idx = months.indexOf(m as Month);
        if (idx >= 0) {
          any = true;
          if (lvl === 'peak' || out[idx] === 'dormant') out[idx] = lvl;
        }
      }
    }
    if (any) return out;
  }
  if (t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen)) {
    return out.map((_, i) => (i >= 4 && i <= 8 ? 'peak' : 'active'));
  }
  if (t.traits.is_annual === true) {
    return out.map((_, i) => (i >= 5 && i <= 8 ? 'peak' : i >= 3 && i <= 9 ? 'active' : 'dormant'));
  }
  return out.map((_, i) => (i >= 5 && i <= 8 ? 'peak' : i >= 2 && i <= 10 ? 'active' : 'dormant'));
}

interface DossierLedgerRow {
  label: string;
  value: string;
  tip: string;
}

interface DossierBreakingPoint {
  severity: 'warn' | 'danger';
  title: string;
  detail: string;
}

export interface DossierSpec {
  phTrack: { min: number; max: number; sitePh: number | null; sitePct: number | null; barLeft: number; barWidth: number };
  tempTrack: {
    minC: number;
    maxC: number;
    siteColdC: number | null;
    siteFreezeC: number | null;
    siteHotC: number | null;
    warmMonth: 'Jul' | 'Jan';
    barLeft: number;
    barWidth: number;
    coldPin: number | null;
    hotPin: number | null;
  };
  maxDryDays: number;
  ledger: DossierLedgerRow[];
  breakingPoints: DossierBreakingPoint[];
  lifeline: { start: number; end: number; label: string };
  photoperiodInfo: { summerH: number; winterH: number; lat: number } | null;
}

const clampPct = (v: number, lo: number, hi: number): number => Math.max(0, Math.min(100, Math.round(((v - lo) / (hi - lo)) * 100)));

const fmt1 = (n: number): string => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export function formatHeightRange(h?: { min?: number | null; max?: number | null } | null): string {
  if (!h) return '';
  const lo = h.min != null && Number.isFinite(h.min) ? h.min : null;
  const hi = h.max != null && Number.isFinite(h.max) ? h.max : null;
  if (lo == null && hi == null) return '';
  if (lo == null && hi != null) return `up to ${fmt1(hi)} m`;
  if (lo != null && hi == null) return `${fmt1(lo)}+ m`;
  if (fmt1(lo!) === fmt1(hi!)) return `${fmt1(hi!)} m`;
  return `${fmt1(lo!)}–${fmt1(hi!)} m`;
}

export function buildDossierSpec(
  t: Taxon,
  details: Details | null,
  loc: SiteLocation | null,
  mc?: MicroclimateParams,
  edits?: SiteEdits | null,
): DossierSpec {
  const profile = siteClimateProfile(loc, null, mc, edits);
  const sitePh = profile.ph;
  const siteColdC = profile.typicalColdNightC;
  const siteHotC = profile.typicalWarmHighC;
  const siteFreezeC = profile.coldFreeze10yrC;
  const warmMonth: 'Jul' | 'Jan' = profile.warmMonth;

  const phMin = t.traits.soil_ph?.min ?? 5.5;
  const phMax = t.traits.soil_ph?.max ?? 7.8;
  const phTrack = {
    min: phMin,
    max: phMax,
    sitePh,
    sitePct: sitePh != null ? clampPct(sitePh, 3.5, 9.5) : null,
    barLeft: clampPct(phMin, 3.5, 9.5),
    barWidth: Math.max(6, clampPct(phMax, 3.5, 9.5) - clampPct(phMin, 3.5, 9.5)),
  };

  const minC = details?.extremes?.coldTailC ?? t.climate?.tminCold?.low ?? -5;
  const maxC = details?.extremes?.heatDomeC ?? t.climate?.tmaxWarm?.high ?? 34;
  const tempTrack = {
    minC,
    maxC,
    siteColdC,
    siteFreezeC,
    siteHotC,
    warmMonth,
    barLeft: clampPct(minC, -30, 50),
    barWidth: Math.max(6, clampPct(maxC, -30, 50) - clampPct(minC, -30, 50)),
    coldPin: siteFreezeC != null ? clampPct(siteFreezeC, -30, 50) : null,
    hotPin: siteHotC != null ? clampPct(siteHotC, -30, 50) : null,
  };

  const maxDryDays = details?.extremes?.maxDryDays != null
    ? details.extremes.maxDryDays
    : t.traits.drought_tolerance && /high/i.test(t.traits.drought_tolerance)
      ? 60
      : t.traits.drought_tolerance && /low/i.test(t.traits.drought_tolerance)
        ? 18
        : 32;

  const heightStr = formatHeightRange(t.traits.height_m) || 'Unrecorded';
  const spreadStr = t.traits.width_max_m != null ? `${fmt1(t.traits.width_max_m)} m spread` : 'spread unrecorded';
  const chillStr = details?.extremes?.chillMinCP != null
    ? `${details.extremes.chillMinCP} chill portions`
    : isLowChillTaxon(t) ? 'Low chill (< 200 h)' : 'Moderate chill';
  const dryStr = details?.extremes?.maxDryDays != null
    ? `${details.extremes.maxDryDays} dry days`
    : t.traits.drought_tolerance ? `${t.traits.drought_tolerance} drought tolerance` : 'Needs regular moisture';
  const windRow = details?.layerValues?.find((lv) => lv.field === 'tolerates_wind');
  const windStr = windRow?.flag === true ? 'Wind-hardy' : windRow?.flag === false ? 'Needs wind shelter' : 'Moderate shelter preferred';

  const ledger: DossierLedgerRow[] = [
    {
      label: 'Hard-freeze limit',
      value: `${minC} °C survival limit`,
      tip: 'Estimated 1-in-10-yr cold-snap survival limit from extreme climate bounds or Q05 occurrence distribution.',
    },
    {
      label: 'Chill & Dry Streak',
      value: `${chillStr} · ${dryStr}`,
      tip: 'Winter dormancy chill requirement paired with maximum consecutive dry-day resilience.',
    },
    {
      label: 'Deep Subsoil (30–100 cm)',
      value: t.traits.root_depth_min_cm != null ? `${Math.round(t.traits.root_depth_min_cm)} cm min rooting` : (isClayWetTaxon(t) ? 'Tolerates dense/clay subsoil' : 'Prefers aerated subsoil'),
      tip: 'Rooting depth and subsoil tolerance below the topsoil horizon.',
    },
    {
      label: 'Water & Drainage',
      value: `${t.traits.moisture_use ?? 'Moderate'} · ${t.traits.well_drained === false ? 'wet-foot tolerant' : 'well-drained'}`,
      tip: 'Moisture demand and sensitivity to standing winter water.',
    },
    {
      label: 'Wind',
      value: windStr,
      tip: 'Tolerance to exposed ridges and desiccating winds.',
    },
    {
      label: 'Mature Height & Spread',
      value: `${heightStr} · ${spreadStr}`,
      tip: 'Expected adult size used for spacing and shading plans.',
    },
  ];

  const breakingPoints: DossierBreakingPoint[] = [];
  if (siteFreezeC != null && siteFreezeC < minC) {
    breakingPoints.push({
      severity: 'danger',
      title: 'Hard-freeze limit exceeded',
      detail: `Site 1-in-10-yr freeze (~${siteFreezeC.toFixed(1)} °C) sits below this plant's ${minC} °C hard-freeze limit.`,
    });
  }
  if (siteHotC != null && siteHotC > maxC - 1.5) {
    breakingPoints.push({
      severity: siteHotC > maxC ? 'danger' : 'warn',
      title: 'Heat-dome limit near or exceeded',
      detail: `Site ${warmMonth} average highs (${siteHotC.toFixed(1)} °C) approach or exceed the ${maxC} °C heat-dome limit.`,
    });
  }
  if (sitePh != null && (sitePh < phMin - 0.3 || sitePh > phMax + 0.3)) {
    breakingPoints.push({
      severity: 'warn',
      title: 'Soil pH outside preferred band',
      detail: `Baseline soil pH ${sitePh.toFixed(1)} falls outside ${phMin.toFixed(1)}–${phMax.toFixed(1)}.`,
    });
  }

  const photoperiodInfo = loc
    ? { summerH: photoperiod(loc.lat, 172), winterH: photoperiod(loc.lat, 355), lat: loc.lat }
    : null;

  return {
    phTrack,
    tempTrack,
    maxDryDays,
    ledger,
    breakingPoints,
    lifeline: stageSpanOf(t),
    photoperiodInfo,
  };
}
