// Single Source of Truth report engine for Plant Palette Builder (Stage 2A, Commit 0).
// Pure, DOM-free, deterministic module inside src/lib/palette/ (obeys L1, L7, L10: imports only
// ./types.ts, ./jobs.ts, ./area-names.ts; never imports ./range.ts, ./future.ts, or ./site.ts).
import type {
  ClimateZone,
  Drainage,
  FrostFact,
  InputWind,
  Interaction,
  JobId,
  LayerValue,
  Month,
  Phase,
  PlantId,
  Room,
  SiteLookup,
  SitePeriod,
  Taxon,
  ToxicityLevel,
  Watering,
} from './types.ts';
import { jobIds, months as MONTHS } from './types.ts';
import { jobsOf } from './jobs.ts';

// ---- 10 Climate Scenarios (Today + 6 shipped canopi-climate v0.7.0 SSPs + 3 what-ifs) ----

export type ReportHorizonId =
  | 'today'
  | 'y2050_ssp126'
  | 'y2050'
  | 'y2050_ssp370'
  | 'y2050_ssp585'
  | 'y2080_ssp245'
  | 'y2080_ssp585'
  | 'freeze'
  | 'heat'
  | 'drought';

export interface ReportScenarioMeta {
  id: ReportHorizonId;
  label: string;
  short: string;
  period: string;
  scenario: string;
  kind: 'today' | 'ssp' | 'whatif';
}

export const REPORT_SCENARIOS: readonly ReportScenarioMeta[] = [
  { id: 'today', label: 'Today (1991–2020)', short: 'Today', period: '1991-2020', scenario: 'historical', kind: 'today' },
  { id: 'y2050', label: '2050s · SSP2-4.5 (middle road)', short: '2050s SSP2-4.5', period: '2041-2070', scenario: 'ssp245', kind: 'ssp' },
  { id: 'y2050_ssp126', label: '2050s · SSP1-2.6 (low emissions)', short: '2050s SSP1-2.6', period: '2041-2070', scenario: 'ssp126', kind: 'ssp' },
  { id: 'y2050_ssp370', label: '2050s · SSP3-7.0 (high emissions)', short: '2050s SSP3-7.0', period: '2041-2070', scenario: 'ssp370', kind: 'ssp' },
  { id: 'y2050_ssp585', label: '2050s · SSP5-8.5 (very high emissions)', short: '2050s SSP5-8.5', period: '2041-2070', scenario: 'ssp585', kind: 'ssp' },
  { id: 'y2080_ssp245', label: '2080s · SSP2-4.5 (middle road)', short: '2080s SSP2-4.5', period: '2071-2099', scenario: 'ssp245', kind: 'ssp' },
  { id: 'y2080_ssp585', label: '2080s · SSP5-8.5 (very high emissions)', short: '2080s SSP5-8.5', period: '2071-2099', scenario: 'ssp585', kind: 'ssp' },
  { id: 'freeze', label: '−4 °C colder what-if', short: '−4 °C what-if', period: '1991-2020', scenario: 'historical', kind: 'whatif' },
  { id: 'heat', label: '+4 °C hotter what-if', short: '+4 °C what-if', period: '1991-2020', scenario: 'historical', kind: 'whatif' },
  { id: 'drought', label: '+20 d drought what-if', short: 'Drought what-if', period: '1991-2020', scenario: 'historical', kind: 'whatif' },
];

export const CORE_SHOCK_HORIZONS: readonly ReportHorizonId[] = ['today', 'y2050', 'freeze', 'heat', 'drought'];

export type SiteAspect = 'neutral' | 'south' | 'north';
export type SiteColdAir = 'normal' | 'hollow' | 'higher';
export type SiteLightChoice = 'full_sun' | 'part_shade' | 'shade';
export type ReportDrainage = Drainage | 'sandy' | 'clay';

export interface ReportSiteOverrides {
  soilPh?: number | null;
  drainage?: ReportDrainage | null;
  watering?: Watering | null;
  room?: Room | null;
  plotM2?: number | null;
  wind?: InputWind | 'moderate' | null;
  siteLight?: SiteLightChoice | null;
  clayPct?: number | null;
  stonesPct?: number | null;
  elevM?: number | null;
  slopeDeg?: number | null;
  aspect?: SiteAspect | null;
  coldAir?: SiteColdAir | null;
  freeze10?: number | null;
  heat10?: number | null;
  cddDays?: number | null;
  nightsShiftC?: number;
  daysShiftC?: number;
}

export interface EffectiveSiteClimate {
  horizon: ReportHorizonId;
  meta: ReportScenarioMeta;
  hasClimate: boolean;
  lat: number | null;
  lon: number | null;
  hemisphere: 'N' | 'S';
  country: string | null;
  wgsrpdL3: string | null;
  koppen: string;
  usdaZone: string | null;
  tminColdC: number | null;
  tmaxWarmC: number | null;
  tmeanColdC: number | null;
  tmeanWarmC: number | null;
  tmeanYearC: number | null;
  aridityIndex: number | null;
  precipMm: number | null;
  dryMonths: number | null;
  freeze10C: number | null;
  heat10C: number | null;
  extremesEst: boolean;
  monthlyT: readonly number[] | null;
  monthlyP: readonly number[] | null;
  monthlyEst: boolean;
  isMildWinter: boolean;
  soilPh: number | null;
  subsoilPh: number | null;
  clayPct: number | null;
  stonesPct: number | null;
  tankDays: number | null;
  cddDays: number | null;
  drainage: ReportDrainage | null;
  watering: Watering;
  wind: InputWind | 'moderate' | null;
  siteLight: SiteLightChoice;
  elevBase: number | null;
  elevEff: number | null;
  elevDeltaC: number;
  slopeDeg: number | null;
  aspect: SiteAspect;
  aspectDeltaC: number;
  coldAir: SiteColdAir;
  hollowDeltaC: number;
  room: Room;
  roomLimitM: number | null;
  plotM2: number;
  netPlotM2: number;
}

const ROOM_HEIGHT_LIMIT_M: Record<Room, number | null> = {
  pots: 2,
  small: 6,
  large: 15,
  field: null,
  unsure: null,
};

function findPeriod(periods: readonly SitePeriod[] | undefined, period: string, scenario: string): SitePeriod | null {
  if (!periods?.length) return null;
  return periods.find((p) => p.period === period && p.scenario === scenario) ?? null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function resolveEffectiveSite(
  lookup: SiteLookup | null,
  horizon: ReportHorizonId = 'today',
  overrides: ReportSiteOverrides = {},
): EffectiveSiteClimate {
  const meta = REPORT_SCENARIOS.find((s) => s.id === horizon) ?? REPORT_SCENARIOS[0];
  const periods = lookup?.climate?.periods;
  const todaySlot = findPeriod(periods, '1991-2020', 'historical');
  // Never silently fall back to Today when a requested SSP slot is missing from the tile.
  const activeSlot = meta.kind === 'whatif' ? todaySlot : findPeriod(periods, meta.period, meta.scenario);
  const v07 = lookup?.v07 ?? null;

  const elevBase = v07?.terrain?.elevM ?? null;
  const elevEff = overrides.elevM != null ? overrides.elevM : elevBase;
  const elevDeltaC = elevBase != null && elevEff != null ? round1(((elevBase - elevEff) / 100) * 0.65) : 0;
  const aspect: SiteAspect = overrides.aspect ?? 'neutral';
  const aspectDeltaC = aspect === 'south' ? 1.0 : aspect === 'north' ? -1.0 : 0;
  const coldAir: SiteColdAir = overrides.coldAir ?? 'normal';
  const hollowDeltaC = coldAir === 'hollow' ? -2.5 : coldAir === 'higher' ? -1.5 : 0;
  const coldTerrainShift = round1(elevDeltaC + hollowDeltaC + aspectDeltaC);
  const warmTerrainShift = round1(elevDeltaC + aspectDeltaC);

  const nightsShift = (overrides.nightsShiftC ?? 0) + coldTerrainShift;
  const daysShift = (overrides.daysShiftC ?? 0) + warmTerrainShift;
  const freezeDelta = horizon === 'freeze' ? -4 : 0;
  const heatDelta = horizon === 'heat' ? 4 : 0;
  const droughtExtraDays = horizon === 'drought' ? 20 : 0;
  const precipFactor = horizon === 'drought' ? 0.7 : 1;

  // 1-in-10 extremes: use real v0.7.0 per-slot Tier-1 extremes + Today's P10/P90 gap (marked est. for futures).
  // Never fall back to monthly-mean tminColdC/tmaxWarmC or invent gap=0; return null (unknown) if extreme tiles or gaps are absent.
  const tminGap = v07?.extremesTail?.tminP10GapC ?? null;
  const tmaxGap = v07?.extremesTail?.tmaxP90GapC ?? null;
  const todayFreeze10 = v07?.extremesTail?.coldTail10yrC
    ?? (v07?.extremes?.tminExtremeC != null && tminGap !== null ? v07.extremes.tminExtremeC + tminGap : null);
  const todayHeat10 = v07?.extremesTail?.heatDome10yrC
    ?? (v07?.extremes?.tmaxExtremeC != null && tmaxGap !== null ? v07.extremes.tmaxExtremeC + tmaxGap : null);

  const freezeOverrideShift = overrides.freeze10 != null && todayFreeze10 !== null ? round1(overrides.freeze10 - todayFreeze10) : 0;
  const heatOverrideShift = overrides.heat10 != null && todayHeat10 !== null ? round1(overrides.heat10 - todayHeat10) : 0;
  const effectiveColdShift = overrides.freeze10 != null ? freezeOverrideShift : nightsShift;
  const effectiveWarmShift = overrides.heat10 != null ? heatOverrideShift : daysShift;

  const tminColdC = activeSlot ? round1(activeSlot.tminColdC + effectiveColdShift + freezeDelta) : null;
  const tmaxWarmC = activeSlot ? round1(activeSlot.tmaxWarmC + effectiveWarmShift + heatDelta) : null;
  const tmeanColdC = activeSlot ? round1(activeSlot.tmeanColdC + effectiveColdShift + freezeDelta) : null;
  const tmeanWarmC = activeSlot ? round1(activeSlot.tmeanWarmC + effectiveWarmShift + heatDelta) : null;
  const precipMm = activeSlot ? Math.round(activeSlot.precipMm * precipFactor) : null;
  const aridityIndex = activeSlot?.aridityIndex != null ? round1(activeSlot.aridityIndex * precipFactor) : null;
  const dryMonths = activeSlot ? Math.min(12, activeSlot.dryMonths + (horizon === 'drought' ? 2 : 0)) : null;

  let freeze10C: number | null = null;
  let heat10C: number | null = null;
  let extremesEst = false;

  if (activeSlot !== null) {
    if (horizon === 'today' || meta.kind === 'whatif') {
      freeze10C = overrides.freeze10 != null
        ? round1(overrides.freeze10 + freezeDelta)
        : (todayFreeze10 !== null ? round1(todayFreeze10 + nightsShift + freezeDelta) : null);
      heat10C = overrides.heat10 != null
        ? round1(overrides.heat10 + heatDelta)
        : (todayHeat10 !== null ? round1(todayHeat10 + daysShift + heatDelta) : null);
      extremesEst = meta.kind === 'whatif';
    } else {
      const slotExt = v07?.extremes?.periods?.find((p) => p.period === meta.period && p.scenario === meta.scenario) ?? null;
      const slotTmin = slotExt?.tminExtremeC
        ?? (horizon === 'y2050' ? (v07?.extremes?.futureTminExtremeC ?? null)
          : horizon === 'y2080_ssp245' ? (v07?.extremes?.lateTminExtremeC ?? null) : null);
      const slotTmax = slotExt?.tmaxExtremeC
        ?? (horizon === 'y2050' ? (v07?.extremes?.futureTmaxExtremeC ?? null)
          : horizon === 'y2080_ssp245' ? (v07?.extremes?.lateTmaxExtremeC ?? null) : null);
      freeze10C = overrides.freeze10 != null
        ? round1(overrides.freeze10)
        : (slotTmin !== null && tminGap !== null ? round1(slotTmin + tminGap + nightsShift) : null);
      heat10C = overrides.heat10 != null
        ? round1(overrides.heat10)
        : (slotTmax !== null && tmaxGap !== null ? round1(slotTmax + tmaxGap + daysShift) : null);
      extremesEst = freeze10C !== null || heat10C !== null;
    }
  }

  // Monthly T/P curves: real tiles for Today, 2050s & 2080s SSP2-4.5; delta-shifted for other SSPs/what-ifs; null if slot missing
  let monthlyT: readonly number[] | null = null;
  let monthlyP: readonly number[] | null = null;
  let monthlyEst = false;
  if (activeSlot !== null && v07?.monthly) {
    if (horizon === 'today') {
      monthlyT = v07.monthly.tmeanTodayC.map((t) => round1(t + (nightsShift + daysShift) / 2));
      monthlyP = v07.monthly.precipTodayMm;
      monthlyEst = false;
    } else if (horizon === 'y2050') {
      monthlyT = v07.monthly.tmean2050C.map((t) => round1(t + (nightsShift + daysShift) / 2));
      monthlyP = v07.monthly.precip2050Mm;
      monthlyEst = false;
    } else if (horizon === 'y2080_ssp245' && v07.monthly.tmean2080C.length === 12) {
      monthlyT = v07.monthly.tmean2080C.map((t) => round1(t + (nightsShift + daysShift) / 2));
      monthlyP = v07.monthly.precip2080Mm?.length === 12 ? v07.monthly.precip2080Mm : v07.monthly.precip2050Mm;
      monthlyEst = v07.monthly.precip2080Mm?.length !== 12;
    } else {
      const meanDelta = todaySlot
        ? ((activeSlot.tmeanColdC - todaySlot.tmeanColdC) + (activeSlot.tmeanWarmC - todaySlot.tmeanWarmC)) / 2
        : 0;
      const shiftT = meanDelta + (nightsShift + daysShift) / 2 + (freezeDelta + heatDelta) / 2;
      const pRatio = todaySlot && todaySlot.precipMm > 0
        ? (activeSlot.precipMm / todaySlot.precipMm) * precipFactor
        : precipFactor;
      monthlyT = v07.monthly.tmeanTodayC.map((t) => round1(t + shiftT));
      monthlyP = v07.monthly.precipTodayMm.map((p) => Math.max(0, Math.round(p * pRatio)));
      monthlyEst = true;
    }
  }

  const tmeanYearC = monthlyT && monthlyT.length === 12
    ? round1(monthlyT.reduce((sum, t) => sum + t, 0) / 12)
    : (tmeanColdC !== null && tmeanWarmC !== null ? round1((tmeanColdC + tmeanWarmC) / 2) : null);

  const room: Room = overrides.room ?? 'unsure';
  const plotM2 = Math.max(1, Math.round(overrides.plotM2 ?? 150));
  const netPlotM2 = Math.max(1, Math.round(plotM2 * 0.8));
  const baseCdd = overrides.cddDays != null ? overrides.cddDays : (v07?.waterBalance?.cddDays ?? null);
  const cddDays = baseCdd !== null ? Math.round(baseCdd + droughtExtraDays) : null;
  const rawTankDays = v07?.soilPlus?.dryDaysReserve ?? null;
  const tankDays = rawTankDays != null
    ? Math.max(1, Math.round(rawTankDays * (overrides.drainage === 'sandy' ? 0.65 : overrides.drainage === 'clay' ? 1.15 : 1)))
    : null;
  const slopeDeg = overrides.slopeDeg != null ? overrides.slopeDeg : (v07?.terrain?.slopeDeg ?? null);
  const siteLight: SiteLightChoice = overrides.siteLight ?? 'full_sun';

  return {
    horizon,
    meta,
    hasClimate: activeSlot !== null,
    lat: lookup?.lat ?? null,
    lon: lookup?.lon ?? null,
    hemisphere: (lookup?.lat ?? 1) < 0 ? 'S' : 'N',
    country: lookup?.regions?.isoA2 ?? null,
    wgsrpdL3: lookup?.regions?.wgsrpdL3 ?? null,
    koppen: activeSlot?.koppen ?? '',
    usdaZone: v07?.extremes?.usdaZone ?? null,
    tminColdC,
    tmaxWarmC,
    tmeanColdC,
    tmeanWarmC,
    tmeanYearC,
    aridityIndex,
    precipMm,
    dryMonths,
    freeze10C,
    heat10C,
    extremesEst,
    monthlyT,
    monthlyP,
    monthlyEst,
    isMildWinter: tminColdC !== null && tminColdC >= 2,
    soilPh: overrides.soilPh ?? lookup?.soil?.phH2o ?? null,
    subsoilPh: v07?.soilPlus?.ph30_100 ?? null,
    clayPct: overrides.clayPct ?? lookup?.soil?.clayPct ?? null,
    stonesPct: overrides.stonesPct ?? v07?.soilPlus?.cfvo0_30 ?? null,
    tankDays,
    cddDays,
    drainage: overrides.drainage ?? null,
    watering: overrides.watering ?? 'rain',
    wind: overrides.wind ?? null,
    siteLight,
    elevBase,
    elevEff,
    elevDeltaC,
    slopeDeg,
    aspect,
    aspectDeltaC,
    coldAir,
    hollowDeltaC,
    room,
    roomLimitM: ROOM_HEIGHT_LIMIT_M[room],
    plotM2,
    netPlotM2,
  };
}

// ---- Frost, Toxicity, and Lifecycle Helpers ----

/** Prefer dormant ktmpr over growing-season ktmp when both are present. */
export function preferredFrostC(frost: readonly FrostFact[] | null | undefined): { valueC: number; kind: 'ktmpr' | 'ktmp'; coarse: boolean } | null {
  if (!frost?.length) return null;
  const dormant = frost.find((f) => f.kind === 'ktmpr' && f.valueC !== null && !f.variety);
  if (dormant && dormant.valueC !== null) return { valueC: dormant.valueC, kind: 'ktmpr', coarse: dormant.coarse };
  const growing = frost.find((f) => f.kind === 'ktmp' && f.valueC !== null && !f.variety && !f.coarse);
  if (growing && growing.valueC !== null) return { valueC: growing.valueC, kind: 'ktmp', coarse: false };
  const anyKtmp = frost.find((f) => (f.kind === 'ktmpr' || f.kind === 'ktmp') && f.valueC !== null);
  if (anyKtmp && anyKtmp.valueC !== null) return { valueC: anyKtmp.valueC, kind: anyKtmp.kind as 'ktmpr' | 'ktmp', coarse: anyKtmp.coarse };
  return null;
}

export type ToxicityStatus = 'not_toxic' | 'toxic' | 'unknown';

export function toxicityStatusOf(taxon: Taxon): { status: ToxicityStatus; level: ToxicityLevel | null } {
  const level = taxon.warnings.toxicity?.level ?? null;
  if (level === null) return { status: 'unknown', level: null };
  if (level === 'None') return { status: 'not_toxic', level: 'None' };
  return { status: 'toxic', level };
}

export function isAnnualTaxon(taxon: Taxon): boolean {
  return taxon.traits.is_annual === true || taxon.traits.grown_as_annual === true;
}

// ---- Single Verdict Engine ----

export type ReportVerdictLevel = 'fits' | 'check' | 'at_risk' | 'unknown';

export type ReportVerdictNote =
  | 'cool_season'
  | 'few_records'
  | 'room_tall'
  | 'heavy_clay_prep'
  | 'subsoil_ph_trap'
  | 'already_on_site'
  | 'may_need_summer_water'
  | 'stage_unknown';

export interface ReportVerdictReason {
  code: string;
  severity: 'ok' | 'note' | 'check' | 'at_risk';
  detail: string;
}

export interface ReportPlantVerdict {
  id: PlantId;
  level: ReportVerdictLevel;
  reasons: ReportVerdictReason[];
  notes: ReportVerdictNote[];
  subsoilPhTrap: boolean;
  toxicityStatus: ToxicityStatus;
  toxicityLevel: ToxicityLevel | null;
  preferredFrostC: number | null;
  stageLabel: Phase | 'stage_unknown';
  alreadyOnSite: boolean;
}

const EDGE_MARGIN_C = 2.0;
const SEVERITY_RANK: Record<ReportVerdictLevel, number> = { unknown: 0, fits: 1, check: 2, at_risk: 3 };

function elevate(current: ReportVerdictLevel, next: ReportVerdictLevel): ReportVerdictLevel {
  return SEVERITY_RANK[next] > SEVERITY_RANK[current] ? next : current;
}

export function evaluatePlantVerdict(
  taxon: Taxon,
  eff: EffectiveSiteClimate,
  existingIds?: ReadonlySet<PlantId>,
): ReportPlantVerdict {
  const reasons: ReportVerdictReason[] = [];
  const notes = new Set<ReportVerdictNote>();
  const annual = isAnnualTaxon(taxon);
  let level: ReportVerdictLevel = 'unknown';
  let judgedClimate = false;

  if (taxon.phases === null) notes.add('stage_unknown');
  const alreadyOnSite = !!existingIds?.has(taxon.id);
  if (alreadyOnSite) notes.add('already_on_site');

  // 1. Monthly observed climate range checks
  const cl = taxon.climate;
  if (eff.hasClimate && cl) {
    if (cl.cells !== null && cl.cells < 300) notes.add('few_records');

    if (!annual && cl.tminCold?.low != null && eff.tminColdC !== null) {
      judgedClimate = true;
      if (eff.tminColdC < cl.tminCold.low - EDGE_MARGIN_C) {
        level = elevate(level, 'at_risk');
        reasons.push({ code: 'cold_monthly', severity: 'at_risk', detail: `Winter min ${eff.tminColdC}°C below recorded ${cl.tminCold.low}°C` });
      } else if (eff.tminColdC < cl.tminCold.low) {
        level = elevate(level, 'check');
        reasons.push({ code: 'cold_monthly_edge', severity: 'check', detail: `Winter min ${eff.tminColdC}°C near cold edge ${cl.tminCold.low}°C` });
      }
    }

    if (cl.tmaxWarm?.high != null && eff.tmaxWarmC !== null) {
      judgedClimate = true;
      if (eff.tmaxWarmC > cl.tmaxWarm.high + EDGE_MARGIN_C) {
        if (annual) {
          notes.add('cool_season');
          reasons.push({ code: 'heat_annual_cool_season', severity: 'note', detail: `Summer max ${eff.tmaxWarmC}°C above ${cl.tmaxWarm.high}°C — grow in cool season` });
        } else {
          level = elevate(level, 'at_risk');
          reasons.push({ code: 'heat_monthly', severity: 'at_risk', detail: `Summer max ${eff.tmaxWarmC}°C above recorded ${cl.tmaxWarm.high}°C` });
        }
      } else if (eff.tmaxWarmC > cl.tmaxWarm.high) {
        if (annual) {
          notes.add('cool_season');
        } else {
          level = elevate(level, 'check');
          reasons.push({ code: 'heat_monthly_edge', severity: 'check', detail: `Summer max ${eff.tmaxWarmC}°C near heat edge ${cl.tmaxWarm.high}°C` });
        }
      }
    }

    if (cl.tmeanYear?.low != null && eff.tmeanYearC !== null) {
      judgedClimate = true;
      if (eff.tmeanYearC < cl.tmeanYear.low - EDGE_MARGIN_C) {
        level = elevate(level, 'at_risk');
        reasons.push({ code: 'cool_year', severity: 'at_risk', detail: `Annual mean ${eff.tmeanYearC}°C below recorded ${cl.tmeanYear.low}°C` });
      } else if (eff.tmeanYearC < cl.tmeanYear.low) {
        level = elevate(level, 'check');
        reasons.push({ code: 'cool_year_edge', severity: 'check', detail: `Annual mean ${eff.tmeanYearC}°C near cool edge ${cl.tmeanYear.low}°C` });
      }
    }

    if (annual && cl.tmeanWarm?.low != null && eff.tmeanWarmC !== null) {
      judgedClimate = true;
      if (eff.tmeanWarmC < cl.tmeanWarm.low - EDGE_MARGIN_C) {
        level = elevate(level, 'at_risk');
        reasons.push({ code: 'cool_summer', severity: 'at_risk', detail: `Warmest-month mean ${eff.tmeanWarmC}°C below recorded ${cl.tmeanWarm.low}°C` });
      }
    }
  }

  // 2. Apples-to-apples plant_climate_extremes (1-in-10 freeze & heat)
  const ext = taxon.extremes;
  if (eff.hasClimate && ext) {
    const tminStat = ext.tminExtreme;
    const tmaxStat = ext.tmaxExtreme;
    if (tminStat?.weak || tmaxStat?.weak) notes.add('few_records');

    const coldLim = tminStat?.low ?? ext.coldTailC;
    if (!annual && coldLim != null && eff.freeze10C !== null) {
      judgedClimate = true;
      if (eff.freeze10C < coldLim - EDGE_MARGIN_C) {
        level = elevate(level, 'at_risk');
        reasons.push({ code: 'extreme_freeze', severity: 'at_risk', detail: `1-in-10 freeze ${eff.freeze10C}°C below observed extreme ${coldLim}°C` });
      } else if (eff.freeze10C < coldLim) {
        level = elevate(level, 'check');
        reasons.push({ code: 'extreme_freeze_edge', severity: 'check', detail: `1-in-10 freeze ${eff.freeze10C}°C near observed extreme ${coldLim}°C` });
      }
    }

    const heatLim = tmaxStat?.high ?? ext.heatDomeC;
    if (heatLim != null && eff.heat10C !== null) {
      judgedClimate = true;
      if (eff.heat10C > heatLim + EDGE_MARGIN_C) {
        if (annual) {
          notes.add('cool_season');
        } else {
          level = elevate(level, 'at_risk');
          reasons.push({ code: 'extreme_heat', severity: 'at_risk', detail: `1-in-10 heat ${eff.heat10C}°C above observed extreme ${heatLim}°C` });
        }
      } else if (eff.heat10C > heatLim) {
        if (annual) {
          notes.add('cool_season');
        } else {
          level = elevate(level, 'check');
          reasons.push({ code: 'extreme_heat_edge', severity: 'check', detail: `1-in-10 heat ${eff.heat10C}°C near observed extreme ${heatLim}°C` });
        }
      }
    }
  }

  if (judgedClimate && level === 'unknown') level = 'fits';

  // 3. Topsoil pH + Subsoil pH Trap (subsoil ONLY when root_depth_min_cm >= 45 or taproot_persistent)
  const ph = taxon.traits.soil_ph;
  let subsoilPhTrap = false;
  if (ph && eff.soilPh !== null) {
    if ((ph.min !== null && eff.soilPh < ph.min - 0.3) || (ph.max !== null && eff.soilPh > ph.max + 0.3)) {
      level = elevate(level, 'check');
      reasons.push({ code: 'topsoil_ph', severity: 'check', detail: `Topsoil pH ${eff.soilPh} outside recorded ${ph.min ?? '?'}–${ph.max ?? '?'}` });
    }
  }
  const isDeepRooted = (taxon.traits.root_depth_min_cm !== null && taxon.traits.root_depth_min_cm >= 45)
    || taxon.traits.taproot_persistent === true;
  if (ph && isDeepRooted && eff.subsoilPh !== null) {
    if ((ph.min !== null && eff.subsoilPh < ph.min - 0.3) || (ph.max !== null && eff.subsoilPh > ph.max + 0.3)) {
      subsoilPhTrap = true;
      notes.add('subsoil_ph_trap');
      level = elevate(level, 'check');
      reasons.push({ code: 'subsoil_ph_trap', severity: 'check', detail: `Deep roots reach subsoil pH ${eff.subsoilPh} (outside ${ph.min ?? '?'}–${ph.max ?? '?'})` });
    }
  }

  // 4. Water, drought & drainage (heavy clay = site-prep note only; waterlogged = check)
  const droughtTol = (taxon.traits.drought_tolerance ?? '').toLowerCase();
  const moistureUse = (taxon.traits.moisture_use ?? '').toLowerCase();
  const droughtAdapted = droughtTol === 'high' || moistureUse === 'low';
  const dryDeficit = eff.tankDays !== null && eff.cddDays !== null && eff.cddDays > eff.tankDays;
  if (eff.watering === 'rain' && dryDeficit) {
    if (!droughtAdapted) {
      if (taxon.traits.drought_tolerance === null && taxon.traits.moisture_use === null) {
        notes.add('may_need_summer_water');
        reasons.push({ code: 'summer_water_est', severity: 'note', detail: 'May need summer water (water traits unrecorded)' });
      } else {
        level = elevate(level, 'check');
        reasons.push({ code: 'dry_spell_water', severity: 'check', detail: `Dry spell (~${eff.cddDays} d) exceeds soil tank (~${eff.tankDays} d)` });
      }
    }
  }
  if (eff.drainage === 'wet' && taxon.traits.well_drained === true) {
    level = elevate(level, 'check');
    reasons.push({ code: 'waterlogged', severity: 'check', detail: 'Requires well-drained soil; site stays waterlogged' });
  }
  if ((eff.drainage === 'clay' || (eff.clayPct !== null && eff.clayPct >= 35)) && taxon.traits.well_drained === true) {
    notes.add('heavy_clay_prep');
    reasons.push({
      code: 'heavy_clay_prep',
      severity: 'note',
      detail: eff.clayPct !== null && eff.clayPct >= 35
        ? `Heavy clay (${eff.clayPct}%) — plant on mound or amend drainage`
        : 'Heavy clay drainage — plant on mound or amend drainage',
    });
  }

  // 5. Wind (UK records tolerates_wind vs windbreak function)
  if (eff.wind === 'windy' || eff.wind === 'sea') {
    const isWindbreak = (taxon.functions ?? []).some((f) => f.function === 'windbreak');
    if (taxon.windTolerant === false && !isWindbreak) {
      level = elevate(level, 'check');
      reasons.push({ code: 'wind_sensitive', severity: 'check', detail: 'Recorded as wind-sensitive (UK records)' });
    }
  }

  // 5b. Site light check (mockup-v73.html L2129-2136)
  const prefLight = taxon.light.preferred ?? taxon.light.sunniest ?? taxon.stratum?.value ?? null;
  const sunOnly = prefLight === 'emergent' && (taxon.light.shadiest == null || taxon.light.shadiest === 'emergent');
  if (eff.siteLight === 'shade' && (prefLight === 'emergent' || prefLight === 'high' || (taxon.traits.sun && !taxon.traits.full_shade && !taxon.traits.semi_shade))) {
    level = elevate(level, 'check');
    reasons.push({ code: 'site_light', severity: 'check', detail: 'Prefers sunnier exposure (site light: shady)' });
  } else if (eff.siteLight === 'part_shade' && (sunOnly || (taxon.traits.sun && !taxon.traits.semi_shade && !taxon.traits.full_shade))) {
    level = elevate(level, 'check');
    reasons.push({ code: 'site_light', severity: 'check', detail: 'Prefers full sun (site light: part shade)' });
  }

  // 5c. Stony soil trap note (mockup-v73.html L2119-2121)
  if (eff.stonesPct !== null && eff.stonesPct >= 25 && isDeepRooted) {
    reasons.push({ code: 'stony_soil', severity: 'note', detail: `Stony soil (${Math.round(eff.stonesPct)}% rock) may restrict deep roots` });
  }

  // 6. Room height (note only, never blocks)
  if (eff.roomLimitM !== null && taxon.traits.height_m?.max != null && taxon.traits.height_m.max > eff.roomLimitM) {
    notes.add('room_tall');
    reasons.push({ code: 'room_tall', severity: 'note', detail: `Grows to ${taxon.traits.height_m.max} m — prune to fit ${eff.roomLimitM} m room` });
  }

  const tox = toxicityStatusOf(taxon);
  const frostPref = preferredFrostC(taxon.frost);

  return {
    id: taxon.id,
    level,
    reasons,
    notes: [...notes],
    subsoilPhTrap,
    toxicityStatus: tox.status,
    toxicityLevel: tox.level,
    preferredFrostC: frostPref?.valueC ?? null,
    stageLabel: taxon.phases ? taxon.phases.start : 'stage_unknown',
    alreadyOnSite,
  };
}

// ---- Site-Scoped Growing Year (reuses bloom.ts holdsPlace semantics; 0 fabricated months, 0 blind +6 flip) ----

export interface ScopedPlace {
  lat: number | null;
  country: string | null;
  zone: ClimateZone | null;
}

export function holdsLayerPlace(v: Pick<LayerValue, 'climate' | 'scope'>, at: ScopedPlace, anyLat = false): boolean {
  if (v.climate !== null && at.zone !== null && v.climate !== at.zone) return false;
  const s = v.scope;
  if (!s) return true;
  if (s.climate && at.zone !== null && s.climate !== at.zone) return false;
  if (anyLat && at.lat === null) return !!(s.hemisphere || s.latitude);
  if (s.country && s.country.toUpperCase() !== (at.country ?? '').toUpperCase()) return false;
  if (s.hemisphere) {
    if (at.lat === null) return false;
    if ((s.hemisphere === 'S') !== (at.lat < 0)) return false;
  }
  if (s.latitude) {
    if (at.lat === null) return false;
    let [a, b] = s.latitude.split('..').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (s.hemisphere === 'S' && a >= 0 && b >= 0) [a, b] = [-b, -a];
    if (at.lat < Math.min(a, b) || at.lat > Math.max(a, b)) return false;
  }
  return true;
}

export interface PlantGrowingYearTrack {
  id: PlantId;
  sowing: Month[];
  bloom: Month[];
  fruiting: Month[];
  estimate: boolean;
  hasAny: boolean;
  winterCrop: boolean;
}

export interface GrowingYearReport {
  tracks: Map<PlantId, PlantGrowingYearTrack>;
  activeMonths: Month[];
  unknownCount: number;
  winterActiveCount: number;
}

const NH_AUTUMN_WINTER: ReadonlySet<Month> = new Set(['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']);
const SH_AUTUMN_WINTER: ReadonlySet<Month> = new Set(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);

/**
 * Winter / cool-season crop detection:
 * - active_growth_period includes 'Winter' or 'Year Round' (explicitly NOT warm-season 'Fall' alone!)
 * - OR scoped autumn/winter sowing months
 * - OR annual soil-feeder (cover crop / green manure)
 */
export function isWinterCrop(
  taxon: Taxon,
  scopedSowing: readonly Month[],
  hemisphere: 'N' | 'S',
): boolean {
  if (taxon.traits.frost_tender === true) return false;
  const agp = (taxon.traits.active_growth_period ?? '').toLowerCase();
  if (agp.includes('winter') || agp.includes('year round')) return true;
  const awSet = hemisphere === 'S' ? SH_AUTUMN_WINTER : NH_AUTUMN_WINTER;
  if (scopedSowing.some((m) => awSet.has(m))) return true;
  if (isAnnualTaxon(taxon) && jobsOf(taxon).includes('feeds_soil')) return true;
  return false;
}

export function computeGrowingYear(
  taxa: readonly Taxon[],
  layerValuesByPlant: ReadonlyMap<PlantId, readonly LayerValue[]> | undefined,
  place: ScopedPlace,
  hemisphere: 'N' | 'S',
): GrowingYearReport {
  const tracks = new Map<PlantId, PlantGrowingYearTrack>();
  const activeSet = new Set<Month>();
  let unknownCount = 0;
  let winterActiveCount = 0;

  for (const t of taxa) {
    const raw = layerValuesByPlant?.get(t.id) ?? [];
    const scoped = raw.filter((lv) => lv.months?.length && holdsLayerPlace(lv, place));
    const sowSet = new Set<Month>();
    const bloomSet = new Set<Month>();
    const fruitSet = new Set<Month>();
    let estimate = false;

    for (const lv of scoped) {
      if (lv.kind !== 'recorded') estimate = true;
      for (const m of lv.months ?? []) {
        if (lv.field === 'sowing_months') sowSet.add(m);
        else if (lv.field === 'bloom_months') bloomSet.add(m);
        else if (lv.field === 'ripening_or_fruit_seen_months') fruitSet.add(m);
      }
    }

    const sowing = MONTHS.filter((m) => sowSet.has(m));
    const bloom = MONTHS.filter((m) => bloomSet.has(m));
    const fruiting = MONTHS.filter((m) => fruitSet.has(m));
    const hasAny = sowing.length > 0 || bloom.length > 0 || fruiting.length > 0;
    if (!hasAny) unknownCount++;

    for (const m of [...sowing, ...bloom, ...fruiting]) activeSet.add(m);
    const winterCrop = isWinterCrop(t, sowing, hemisphere);
    if (winterCrop) winterActiveCount++;

    tracks.set(t.id, { id: t.id, sowing, bloom, fruiting, estimate, hasAny, winterCrop });
  }

  return {
    tracks,
    activeMonths: MONTHS.filter((m) => activeSet.has(m)),
    unknownCount,
    winterActiveCount,
  };
}

// ---- Honest Crown-Area Budget ----

export interface CrownBudget {
  plotM2: number;
  netPlotM2: number;
  totalCrownM2: number;
  budgetPct: number;
  overBudget: boolean;
  measuredCount: number;
  unrecordedWidthCount: number;
}

export function crownAreaM2(taxon: Taxon): number | null {
  const w = taxon.traits.width_max_m;
  if (w === null || !Number.isFinite(w) || w <= 0) return null;
  const r = w / 2;
  const area = Math.PI * r * r;
  // Climbers/vines grow vertically on a tree or trellis rather than occupying a flat horizontal circle of their vine length.
  return sizeClassOf(taxon) === 'climber' ? Math.min(area, 2.5) : area;
}

export function computeCrownBudget(taxa: readonly Taxon[], plotM2: number): CrownBudget {
  const safePlot = Math.max(1, Math.round(plotM2));
  const netPlotM2 = Math.max(1, Math.round(safePlot * 0.8));
  let total = 0;
  let measuredCount = 0;
  let unrecordedWidthCount = 0;
  for (const t of taxa) {
    const a = crownAreaM2(t);
    if (a === null) unrecordedWidthCount++;
    else {
      total += a;
      measuredCount++;
    }
  }
  const totalCrownM2 = Math.round(total * 10) / 10;
  const budgetPct = Math.round((total / netPlotM2) * 100);
  return {
    plotM2: safePlot,
    netPlotM2,
    totalCrownM2,
    budgetPct,
    overBudget: budgetPct > 100,
    measuredCount,
    unrecordedWidthCount,
  };
}

// ---- Habit / Size Class & Like-for-Like Swap Engine ----

export type SizeClass = 'tree' | 'shrub' | 'climber' | 'herb' | 'groundcover';

export function sizeClassOf(taxon: Taxon): SizeClass {
  const h = (taxon.traits.habit ?? '').toLowerCase();
  if (h.includes('tree')) return 'tree';
  if (h.includes('shrub') || h.includes('subshrub')) return 'shrub';
  if (h.includes('vine') || h.includes('climb') || h.includes('liana')) return 'climber';
  const maxH = taxon.traits.height_m?.max ?? null;
  if (jobsOf(taxon).includes('ground') && maxH !== null && maxH <= 0.6) return 'groundcover';
  return 'herb';
}

export interface SwapCandidate {
  taxon: Taxon;
  verdict: ReportPlantVerdict;
  sharedJobs: JobId[];
  sizeClass: SizeClass;
  score: number;
}

export function findCompatibleSwaps(
  target: Taxon,
  pool: readonly Taxon[],
  eff: EffectiveSiteClimate,
  inPaletteIds: ReadonlySet<PlantId>,
  limit = 6,
): SwapCandidate[] {
  const targetJobs = jobsOf(target);
  const primaryJob: JobId | null = targetJobs.includes('feeds_you') ? 'feeds_you' : (targetJobs[0] ?? null);
  const targetHabit = (target.traits.habit ?? '').trim().toLowerCase();
  const targetSize = sizeClassOf(target);
  const targetH = target.traits.height_m?.max ?? null;

  const candidates: SwapCandidate[] = [];
  for (const cand of pool) {
    if (cand.id === target.id || inPaletteIds.has(cand.id)) continue;

    // Like-for-like habit match (exact habit when known, else same size class)
    const candHabit = (cand.traits.habit ?? '').trim().toLowerCase();
    const candSize = sizeClassOf(cand);
    if (targetHabit) {
      if (candHabit !== targetHabit) continue;
    } else if (candSize !== targetSize) {
      continue;
    }

    // Height band: 0.35× to 2.2× of target height + respect room height cap
    const candH = cand.traits.height_m?.max ?? null;
    if (eff.roomLimitM !== null && candH !== null && candH > eff.roomLimitM) continue;
    if (targetH !== null && targetH > 0 && candH !== null) {
      if (candH < targetH * 0.35 || candH > targetH * 2.2) continue;
    }

    // Must preserve primary job (Feeds you first whenever target has it, else first job)
    const candJobs = jobsOf(cand);
    if (primaryJob && !candJobs.includes(primaryJob)) continue;
    const sharedJobs = targetJobs.filter((j) => candJobs.includes(j));

    const verdict = evaluatePlantVerdict(cand, eff);
    if (verdict.level !== 'fits' && verdict.level !== 'check') continue;

    const score =
      (verdict.level === 'fits' ? 100 : 40)
      + sharedJobs.length * 10
      + (cand.image ? 2 : 0);

    candidates.push({ taxon: cand, verdict, sharedJobs, sizeClass: candSize, score });
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name))
    .slice(0, limit);
}

// ---- Truth-First Starter Selector ----

export interface StarterOptions {
  maxPlants?: number;
  existingIds?: ReadonlySet<PlantId>;
  eff2050?: EffectiveSiteClimate | null;
}

const TRAILING_GROUND_GENERA = new Set(['Ipomoea', 'Cucurbita', 'Citrullus', 'Cucumis']);

/** True for structural climbing vines (excludes low trailing/sprawling ground crops like sweet potato or melons). */
export function isStructuralVine(taxon: Taxon): boolean {
  if (sizeClassOf(taxon) !== 'climber') return false;
  if (TRAILING_GROUND_GENERA.has(taxon.genus)) return false;
  const maxH = taxon.traits.height_m?.max ?? null;
  if (maxH !== null && maxH < 1.8 && isAnnualTaxon(taxon)) return false;
  return true;
}

/** Returns the canopy tree a vine can climb in the guild, or null when it needs a trellis. */
export function vineSupportTree(taxon: Taxon, guild: readonly Taxon[]): Taxon | null {
  if (!isStructuralVine(taxon)) return null;
  return guild.find((t) => t.id !== taxon.id && sizeClassOf(t) === 'tree') ?? null;
}

function isEdibleRootCrop(taxon: Taxon): boolean {
  const sc = sizeClassOf(taxon);
  if (sc === 'tree' || sc === 'shrub') return false;
  if ((taxon.traits.edibility_rating ?? 0) < 3) return false;
  const rs = (taxon.traits.root_system_type ?? '').toLowerCase();
  const cg = (taxon.traits.clonal_growth_form ?? '').toLowerCase();
  const h = (taxon.traits.habit ?? '').toLowerCase();
  return rs.includes('tuber') || rs.includes('bulb') || rs.includes('taproot') || rs.includes('corm')
    || cg.includes('tuber') || cg.includes('bulb') || cg.includes('corm')
    || h.includes('geophyte');
}

function siteKoppenScore(taxon: Taxon, eff: EffectiveSiteClimate): number {
  const kList = taxon.koppen;
  if (!eff.koppen || !kList?.length) return 0;
  const siteK = eff.koppen.toLowerCase();
  const exact = kList.find((k) => k.code.toLowerCase() === siteK);
  if (exact) return Math.min(36, exact.share * 120);
  const prefix2 = siteK.slice(0, 2);
  const groupShare = kList.filter((k) => k.code.toLowerCase().startsWith(prefix2)).reduce((s, k) => s + k.share, 0);
  if (groupShare > 0) return Math.min(10, groupShare * 20);
  return -10;
}

function siteMoistureScore(taxon: Taxon, eff: EffectiveSiteClimate): number {
  const cl = taxon.climate;
  let score = 0;
  if (cl && eff.precipMm != null && cl.precip?.low != null && cl.precip?.high != null) {
    const { low, high, median } = cl.precip;
    const mid = median ?? (low + high) / 2;
    if (eff.precipMm < low || eff.precipMm > high) {
      score -= 45;
    } else if (eff.precipMm < mid * 0.45 || eff.precipMm > mid * 2.2) {
      // Outside the plant's typical central moisture band (prevents wet-seep ferns in arid starters).
      score -= 35;
    } else {
      const centralHalf = Math.max(120, (high - low) * 0.35);
      const dist = Math.min(1, Math.abs(eff.precipMm - mid) / centralHalf);
      score += 18 * (1 - dist * 0.85);
    }
  }
  if (cl && eff.aridityIndex != null && cl.aridity?.low != null && cl.aridity?.high != null) {
    const { low, high, median } = cl.aridity;
    const mid = median ?? (low + high) / 2;
    if (eff.aridityIndex < low || eff.aridityIndex > high || eff.aridityIndex < mid * 0.45) {
      score -= 25;
    } else {
      const centralHalf = Math.max(0.15, (high - low) * 0.35);
      const dist = Math.min(1, Math.abs(eff.aridityIndex - mid) / centralHalf);
      score += 12 * (1 - dist * 0.85);
    }
  }
  if (eff.dryMonths != null && eff.dryMonths >= 4 && (taxon.traits.drought_tolerance ?? '').toLowerCase() === 'low') {
    score -= 18;
  }
  return score;
}

function sitePhScore(taxon: Taxon, eff: EffectiveSiteClimate): number {
  const ph = taxon.traits.soil_ph;
  if (eff.soilPh == null || ph?.min == null || ph?.max == null) return 0;
  const mid = (ph.min + ph.max) / 2;
  const half = Math.max(0.5, (ph.max - ph.min) / 2);
  const dist = Math.min(1.5, Math.abs(eff.soilPh - mid) / half);
  return 8 * (1 - dist * 0.65);
}

/**
 * Picks a balanced, per-site layered starter guild strictly from plants that `fits`
 * (0 outside climate/extremes/pH) while keeping total measured crown area <= eff.netPlotM2.
 * Never excludes toxic or invasive species (inform, don't block); ranks down severe toxicity
 * and local invasives softly while preferring regional staples, moisture/Koppen fit, and 2050 resilience.
 */
export function selectStarterPalette(
  pool: readonly Taxon[],
  eff: EffectiveSiteClimate,
  options: StarterOptions = {},
): Taxon[] {
  const maxPlants = options.maxPlants ?? 8;
  const eff2050 = options.eff2050 ?? null;
  const nicheStratumOf = (t: Taxon): string => t.stratum?.value ?? t.light.preferred ?? t.light.sunniest ?? '';
  const isSevereTox = (t: Taxon): boolean => (t.warnings.toxicity?.level ?? '').toLowerCase() === 'severe';
  const isInvasiveHere = (t: Taxon): boolean =>
    !!eff.country && (t.warnings.invasive_in?.some((r) => r.country === eff.country) ?? false);

  const fitsPool = pool
    .map((t) => {
      const verdict = evaluatePlantVerdict(t, eff, options.existingIds);
      const verdict2050 = eff2050 ? evaluatePlantVerdict(t, eff2050, options.existingIds) : null;
      const jobs = jobsOf(t);
      const area = crownAreaM2(t) ?? 0;
      const sizeClass = sizeClassOf(t);
      const stratum = nicheStratumOf(t);
      const perennial = !isAnnualTaxon(t);
      const edibility = t.traits.edibility_rating ?? 0;
      const kScore = siteKoppenScore(t, eff);
      const mScore = siteMoistureScore(t, eff);
      const pScore = sitePhScore(t, eff);
      const v50Score = verdict2050 ? (verdict2050.level === 'fits' ? 16 : verdict2050.level === 'check' ? 4 : -18) : 0;
      const maxH = t.traits.height_m?.max ?? null;
      const giantPenalty = eff.room === 'unsure' && sizeClass === 'tree' && maxH !== null && maxH > 18 ? 40 : 0;
      const baseScore =
        kScore + mScore + pScore + v50Score
        + (perennial ? 12 : 0)
        + edibility * 3.0
        + (t.image ? 3 : 0)
        + jobs.length * 1.5
        - giantPenalty
        - (isInvasiveHere(t) ? 120 : 0)
        - (isSevereTox(t) ? 60 : 0)
        - (t.warnings.weed_potential ? 16 : 0)
        - (t.warnings.allelopathic ? 10 : 0)
        - (verdict.notes.includes('few_records') ? 6 : 0);
      return {
        taxon: t,
        verdict,
        jobs,
        area,
        sizeClass,
        stratum,
        perennial,
        edibility,
        kScore,
        baseScore,
        isClimber: isStructuralVine(t),
        isRoot: isEdibleRootCrop(t),
      };
    })
    .filter((x) => x.verdict.level === 'fits' && x.jobs.length > 0 && !x.verdict.subsoilPhTrap)
    .filter((x) => eff.roomLimitM === null || eff.roomLimitM > 2 || x.taxon.traits.height_m?.max == null || x.taxon.traits.height_m.max <= eff.roomLimitM);

  const chosen: Taxon[] = [];
  const chosenIds = new Set<PlantId>();
  const usedFamilies = new Set<string>();
  const usedStrata = new Set<string>();
  let usedArea = 0;

  const nFixCount = (): number => chosen.filter((t) => jobsOf(t).includes('feeds_soil')).length;
  const canAdd = (item: (typeof fitsPool)[number]): boolean =>
    !chosenIds.has(item.taxon.id) && usedArea + item.area <= eff.netPlotM2;

  const addItem = (item: (typeof fitsPool)[number]): boolean => {
    chosen.push(item.taxon);
    chosenIds.add(item.taxon.id);
    usedArea += item.area;
    if (item.taxon.family) usedFamilies.add(item.taxon.family);
    if (item.stratum) usedStrata.add(item.stratum);
    return true;
  };

  const dynScore = (
    item: (typeof fitsPool)[number],
    bonusFn?: (x: (typeof fitsPool)[number]) => number,
  ): number => {
    let s = item.baseScore;
    if (item.taxon.family && !usedFamilies.has(item.taxon.family)) s += 8;
    if (item.stratum && !usedStrata.has(item.stratum)) s += 5;
    if (nFixCount() >= 2 && item.jobs.includes('feeds_soil')) s -= 20;
    if (bonusFn) s += bonusFn(item);
    return s;
  };

  const pickBest = (
    pred: (item: (typeof fitsPool)[number]) => boolean,
    bonusFn?: (x: (typeof fitsPool)[number]) => number,
  ): boolean => {
    const cands = fitsPool
      .filter((x) => canAdd(x) && pred(x))
      .sort((a, b) => dynScore(b, bonusFn) - dynScore(a, bonusFn) || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name));
    return cands[0] ? addItem(cands[0]) : false;
  };

  // Layer 1: Fruit or nut canopy tree sized for the room (weight yield/edibility above raw Koppen share)
  if ((eff.roomLimitM === null || eff.roomLimitM >= 3) && eff.netPlotM2 >= 25 && chosen.length < maxPlants) {
    const maxTreeArea = eff.netPlotM2 * 0.65;
    const isUnsureRoom = eff.room === 'unsure';
    pickBest(
      (x) => x.sizeClass === 'tree' && x.area <= maxTreeArea,
      (x) => {
        const h = x.taxon.traits.height_m?.max ?? 10;
        let b = -x.kScore * 0.4;
        if (x.jobs.includes('feeds_you')) b += 40 + x.edibility * 11;
        else b -= 35;
        if (isUnsureRoom) {
          if (h >= 5 && h <= 16.5) b += 22;
          else if (h >= 3.5 && h < 5) b += 6;
          else if (h > 18) b -= 35;
        } else if (eff.roomLimitM !== null && h <= eff.roomLimitM) {
          b += 15;
        }
        return b;
      },
    );
  }

  // Layer 2: Fruit or support shrub
  if ((eff.roomLimitM === null || eff.roomLimitM >= 1.5) && eff.netPlotM2 >= 12 && chosen.length < maxPlants) {
    const maxShrubArea = eff.netPlotM2 * 0.25;
    pickBest(
      (x) => x.sizeClass === 'shrub' && x.area <= maxShrubArea,
      (x) => (x.jobs.includes('feeds_you') && x.edibility >= 3 ? 14 : 0) + (x.jobs.includes('helpers') ? 6 : 0),
    );
  }

  // Layer 3: Structural perennial edible climber (excludes low trailing ground crops)
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.isClimber && x.area <= eff.netPlotM2 * 0.25,
      (x) => {
        const h = x.taxon.traits.height_m?.max ?? 2;
        let b = 0;
        if (x.perennial) b += 24;
        if (h >= 3) b += 20;
        else if (h < 2.2) b -= 22;
        if (x.jobs.includes('feeds_you') && x.edibility >= 4) b += 34;
        else if (x.jobs.includes('feeds_you') && x.edibility >= 3) b += 22;
        else if (!x.jobs.includes('feeds_you') || x.edibility < 2) b -= 24;
        if (!x.jobs.includes('feeds_soil')) b += 6;
        return b;
      },
    );
  }

  // Layer 4: Nitrogen-fixer (skip if already covered)
  if (chosen.length < maxPlants && !chosen.some((t) => jobsOf(t).includes('feeds_soil'))) {
    pickBest(
      (x) => x.jobs.includes('feeds_soil') && x.area <= eff.netPlotM2 * 0.25,
      (x) => (x.sizeClass === 'shrub' || x.sizeClass === 'herb' ? 8 : 0),
    );
  }

  // Layer 5: Herb / pollinator plant
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.sizeClass === 'herb' && x.jobs.includes('helpers') && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.perennial ? 8 : 0) + (x.jobs.includes('shelter') ? 6 : 0),
    );
  }

  // Layer 6: Groundcover / living mulch (skip if already covered)
  if (chosen.length < maxPlants && !chosen.some((t) => jobsOf(t).includes('ground'))) {
    pickBest(
      (x) => (x.sizeClass === 'groundcover' || ((x.taxon.traits.height_m?.max ?? 9) <= 0.8 && (x.jobs.includes('ground') || x.jobs.includes('mulch'))))
        && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.jobs.includes('ground') ? 10 : 0) + (x.jobs.includes('mulch') ? 8 : 0),
    );
  }

  // Layer 7: True root or tuber crop (only when database traits confirm root/tuber/bulb + edible)
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.isRoot && x.jobs.includes('feeds_you') && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.edibility >= 4 ? 10 : 0) + (x.perennial ? 6 : 0),
    );
  }

  // Pass 1: ensure all 6 canonical jobs are covered
  for (const job of jobIds) {
    if (chosen.length >= maxPlants) break;
    if (chosen.some((t) => jobsOf(t).includes(job))) continue;
    pickBest((x) => x.jobs.includes(job) && x.area <= eff.netPlotM2 * 0.3);
  }

  // Pass 2: reinforce single-species jobs with diverse perennial backups
  for (const job of jobIds) {
    if (chosen.length >= maxPlants) break;
    const count = chosen.filter((t) => jobsOf(t).includes(job)).length;
    if (count >= 2) continue;
    pickBest((x) => x.jobs.includes(job) && x.area <= eff.netPlotM2 * 0.25);
  }

  // Pass 3: fill remaining slots up to maxPlants with diverse high-fit species
  while (chosen.length < maxPlants) {
    if (!pickBest((x) => x.area <= eff.netPlotM2 * 0.25)) {
      if (!pickBest(() => true)) break;
    }
  }

  return chosen;
}

// ---- Interactions Matcher ----

export interface PalettePairInteraction {
  a: PlantId;
  b: PlantId;
  interaction: Interaction;
  positive: boolean;
}

function refMatchesTaxon(ref: Interaction['subject'], t: Taxon): boolean {
  if (ref.rank === 'species') return t.canonical_name === ref.name;
  if (ref.rank === 'genus') return t.genus === ref.name;
  if (ref.rank === 'family') return t.family === ref.name;
  return false;
}

export function matchPaletteInteractions(
  taxa: readonly Taxon[],
  interactions: readonly Interaction[],
): PalettePairInteraction[] {
  const out: PalettePairInteraction[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < taxa.length; i++) {
    for (let j = i + 1; j < taxa.length; j++) {
      const ta = taxa[i];
      const tb = taxa[j];
      for (const inter of interactions) {
        const fwd = refMatchesTaxon(inter.subject, ta) && refMatchesTaxon(inter.object, tb);
        const rev = refMatchesTaxon(inter.subject, tb) && refMatchesTaxon(inter.object, ta);
        if (!fwd && !rev) continue;
        const key = `${ta.id}|${tb.id}|${inter.type}|${inter.agent ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const positive = inter.type === 'intercropped_yield_gain' || inter.type === 'allelopathy_tolerant';
        out.push({ a: ta.id, b: tb.id, interaction: inter, positive });
      }
    }
  }
  return out;
}

// ---- Full Palette Report (Single Source of Truth) ----

export interface JobStat {
  job: JobId;
  members: PlantId[];
  total: number;
  status: 'missing' | 'no_backup' | 'backed_up';
}

export interface ScenarioBreakStat {
  id: ReportHorizonId;
  short: string;
  label: string;
  fitsCount: number;
  brokenCount: number;
}

export interface RobustnessReport {
  strongPillars: number;
  redundancyOk: boolean;
  familyDiversityOk: boolean;
  shockSurvivalOk: boolean;
  seasonalityOk: boolean;
  familyCount: number;
  unknownFamilyCount: number;
  familiesSorted: readonly [string, number][];
  monocultureWarn: boolean;
  survivesAllCore: number;
  unknownCoreCount: number;
  coreScenarioBreaks: ScenarioBreakStat[];
  allScenarioBreaks: ScenarioBreakStat[];
  worstScenario: ScenarioBreakStat | null;
}

export interface PaletteReportInput {
  taxa: readonly Taxon[];
  lookup: SiteLookup | null;
  climateZone: ClimateZone | null;
  horizon?: ReportHorizonId;
  overrides?: ReportSiteOverrides;
  interactions?: readonly Interaction[];
  layerValuesByPlant?: ReadonlyMap<PlantId, readonly LayerValue[]>;
  existingIds?: ReadonlySet<PlantId>;
  plantsPerJob?: number;
}

export interface PaletteReport {
  horizon: ReportHorizonId;
  eff: EffectiveSiteClimate;
  effToday: EffectiveSiteClimate;
  eff2050: EffectiveSiteClimate;
  taxa: readonly Taxon[];
  nurseryList: readonly Taxon[];
  verdicts: Map<PlantId, ReportPlantVerdict>;
  verdicts2050: Map<PlantId, ReportPlantVerdict>;
  counts: { total: number; fits: number; check: number; atRisk: number; unknown: number };
  jobStats: JobStat[];
  coveredJobs: number;
  missingJobs: JobId[];
  noBackupJobs: JobId[];
  interactions: PalettePairInteraction[];
  goodPairings: PalettePairInteraction[];
  conflicts: PalettePairInteraction[];
  robustness: RobustnessReport;
  growingYear: GrowingYearReport;
  crownBudget: CrownBudget;
  subsoilTrapCount: number;
}

export function computeReport(input: PaletteReportInput): PaletteReport {
  const horizon: ReportHorizonId = input.horizon ?? 'today';
  const overrides = input.overrides ?? {};
  const existingIds = input.existingIds ?? new Set<PlantId>();
  const targetPerJob = Math.max(1, input.plantsPerJob ?? 2);

  const effToday = resolveEffectiveSite(input.lookup, 'today', overrides);
  const eff2050 = resolveEffectiveSite(input.lookup, 'y2050', overrides);
  const eff = horizon === 'today' ? effToday : horizon === 'y2050' ? eff2050 : resolveEffectiveSite(input.lookup, horizon, overrides);

  const verdicts = new Map<PlantId, ReportPlantVerdict>();
  const verdicts2050 = new Map<PlantId, ReportPlantVerdict>();
  let fits = 0, check = 0, atRisk = 0, unknown = 0, subsoilTrapCount = 0;

  for (const t of input.taxa) {
    const v = evaluatePlantVerdict(t, eff, existingIds);
    verdicts.set(t.id, v);
    verdicts2050.set(t.id, horizon === 'y2050' ? v : evaluatePlantVerdict(t, eff2050, existingIds));
    if (v.level === 'fits') fits++;
    else if (v.level === 'check') check++;
    else if (v.level === 'at_risk') atRisk++;
    else unknown++;
    if (v.subsoilPhTrap) subsoilTrapCount++;
  }

  // Jobs redundancy (all 6 canonical jobs)
  const jobStats: JobStat[] = jobIds.map((job) => {
    const members = input.taxa.filter((t) => jobsOf(t).includes(job)).map((t) => t.id);
    const total = members.length;
    const status: JobStat['status'] = total === 0 ? 'missing' : total < targetPerJob ? 'no_backup' : 'backed_up';
    return { job, members, total, status };
  });
  const missingJobs = jobStats.filter((j) => j.status === 'missing').map((j) => j.job);
  const noBackupJobs = jobStats.filter((j) => j.status === 'no_backup').map((j) => j.job);
  const coveredJobs = jobIds.length - missingJobs.length;

  // Family diversity (exclude NULL families from monoculture/familyCount; count them separately)
  const famCounts = new Map<string, number>();
  let unknownFamilyCount = 0;
  for (const t of input.taxa) {
    if (!t.family) {
      unknownFamilyCount++;
      continue;
    }
    famCounts.set(t.family, (famCounts.get(t.family) ?? 0) + 1);
  }
  const familiesSorted = [...famCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const knownFamilyPlants = input.taxa.length - unknownFamilyCount;
  const topFamilyCount = familiesSorted[0]?.[1] ?? 0;
  const monocultureWarn = knownFamilyPlants >= 4 && topFamilyCount / knownFamilyPlants >= 0.4;

  // All 10 scenario breaks + 5 core shock survival (unknown verdicts are tracked separately, never counted as survivors)
  const perPlantCoreBroken = new Map<PlantId, boolean>();
  const perPlantCoreUnknown = new Map<PlantId, boolean>();
  const allScenarioBreaks: ScenarioBreakStat[] = REPORT_SCENARIOS.map((sc) => {
    const scEff = sc.id === horizon ? eff : sc.id === 'today' ? effToday : sc.id === 'y2050' ? eff2050 : resolveEffectiveSite(input.lookup, sc.id, overrides);
    let brokenCount = 0;
    let fitsCount = 0;
    const isCore = CORE_SHOCK_HORIZONS.includes(sc.id);
    for (const t of input.taxa) {
      const sv = sc.id === horizon ? verdicts.get(t.id)! : evaluatePlantVerdict(t, scEff, existingIds);
      if (sv.level === 'fits') fitsCount++;
      else if (sv.level === 'check' || sv.level === 'at_risk') {
        brokenCount++;
        if (isCore) perPlantCoreBroken.set(t.id, true);
      } else if (isCore) {
        perPlantCoreUnknown.set(t.id, true);
      }
    }
    return { id: sc.id, short: sc.short, label: sc.label, fitsCount, brokenCount };
  });

  const coreScenarioBreaks = allScenarioBreaks.filter((s) => CORE_SHOCK_HORIZONS.includes(s.id));
  const survivesAllCore = input.taxa.filter((t) => !perPlantCoreBroken.get(t.id) && !perPlantCoreUnknown.get(t.id)).length;
  const unknownCoreCount = input.taxa.filter((t) => !perPlantCoreBroken.get(t.id) && perPlantCoreUnknown.get(t.id)).length;
  const worstScenario = [...coreScenarioBreaks].sort((a, b) => b.brokenCount - a.brokenCount)[0] ?? null;

  // Growing Year (real site-scoped LayerValues; 0 fabricated months)
  const growingYear = computeGrowingYear(
    input.taxa,
    input.layerValuesByPlant,
    { lat: eff.lat, country: eff.country, zone: input.climateZone },
    eff.hemisphere,
  );

  const redundancyOk = missingJobs.length === 0 && noBackupJobs.length === 0;
  const familyDiversityOk = !monocultureWarn && input.taxa.length > 0;
  const shockSurvivalOk = input.taxa.length > 0 && survivesAllCore === input.taxa.length;
  const seasonalityOk = growingYear.activeMonths.length >= 6;
  const strongPillars = [redundancyOk, familyDiversityOk, shockSurvivalOk, seasonalityOk].filter(Boolean).length;

  const matchedInteractions = matchPaletteInteractions(input.taxa, input.interactions ?? []);
  const goodPairings = matchedInteractions.filter((x) => x.positive);
  const conflicts = matchedInteractions.filter((x) => !x.positive);

  return {
    horizon,
    eff,
    effToday,
    eff2050,
    taxa: input.taxa,
    nurseryList: input.taxa.filter((t) => !existingIds.has(t.id)),
    verdicts,
    verdicts2050,
    counts: { total: input.taxa.length, fits, check, atRisk, unknown },
    jobStats,
    coveredJobs,
    missingJobs,
    noBackupJobs,
    interactions: matchedInteractions,
    goodPairings,
    conflicts,
    robustness: {
      strongPillars,
      redundancyOk,
      familyDiversityOk,
      shockSurvivalOk,
      seasonalityOk,
      familyCount: famCounts.size,
      unknownFamilyCount,
      familiesSorted,
      monocultureWarn,
      survivesAllCore,
      unknownCoreCount,
      coreScenarioBreaks,
      allScenarioBreaks,
      worstScenario: worstScenario && worstScenario.brokenCount > 0 ? worstScenario : null,
    },
    growingYear,
    crownBudget: computeCrownBudget(input.taxa, eff.plotM2),
    subsoilTrapCount,
  };
}
