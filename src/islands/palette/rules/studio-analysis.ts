// Pure Field Studio analysis helpers for Slice 3.4:
// - Living System: 4x6 Preferred Sun x Succession Matrix, 6-Role Redundancy Ledger, Growing Year Calendar
// - 2050 Climate: 5 compound stress presets, evaluateTrajectory() 4-layer triage, Climate Twin Swap, 12-month shift
// - Planting Plan: Bounded non-overlapping pure-SVG Plot Layout Blueprint (Guild / Alley / Grid + 10x10m module)
//                  and 12-month Field Action Calendar + Weekend Briefs.
// Zero DOM, zero WASM, zero botanical-layer jargon.
import type {
  DesignEnvelope,
  JobId,
  LayoutPattern,
  PlantingPlanSummary,
  SiteEdits,
  SiteLocation,
  Stratum,
  Taxon,
} from '../../../lib/palette/index.ts';
import {
  jobsOf,
  SUCCESSION_STAGES_6,
} from '../../../lib/palette/index.ts';
import { evaluateTrajectory, type MicroclimateParams, type TrajectoryCode } from '../../../lib/climate/v07.ts';
import type { ClimateStressState } from '../state/studio.ts';
import {
  activityMonthsOf,
  MONTH_INITIALS,
  stageSpanOf,
  SUN_TIER_OPTIONS,
} from './studio-filters.ts';
import { localMonthShort, signedTemp1, siteClimateProfile } from './climate-words.ts';
import { T } from '../strings.ts';

const fb = (v: string, d: string): string => (v.startsWith('studio.') ? d : v);

export { siteClimateProfile } from './climate-words.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type YearFocus = 'all' | 'bloom' | 'harvest' | 'prune';

/* ===================== 1. LIVING SYSTEM ===================== */

interface MatrixPlantRow {
  taxon: Taxon;
  span: { start: number; end: number; label: string };
}

interface MatrixSummary {
  sunTiersFilled: number;
  stagesFilled: number;
  rolesCovered: number;
  activeMonths: number;
  rows: {
    sun: Stratum;
    label: string;
    cells: Taxon[][];
    plants: MatrixPlantRow[];
  }[];
}

function preferredSunOf(t: Taxon): Stratum {
  return t.light?.preferred ?? t.light?.sunniest ?? t.stratum?.value ?? 'high';
}

export function buildSunSuccessionMatrix(members: readonly Taxon[]): MatrixSummary {
  const rows = SUN_TIER_OPTIONS.map((opt) => ({
    sun: opt.id,
    label: opt.label,
    cells: SUCCESSION_STAGES_6.map(() => [] as Taxon[]),
    plants: [] as MatrixPlantRow[],
  }));
  const stageSet = new Set<number>();
  const roleSet = new Set<JobId>();
  const activeMonthFlags = Array<boolean>(12).fill(false);

  for (const t of members) {
    const sun = preferredSunOf(t);
    const row = rows.find((r) => r.sun === sun) ?? rows[1];
    const span = stageSpanOf(t);
    row.plants.push({ taxon: t, span });
    for (let s = span.start; s <= span.end; s++) {
      row.cells[s].push(t);
      stageSet.add(s);
    }
    for (const j of jobsOf(t)) roleSet.add(j);
    const spark = activityMonthsOf(t);
    for (let m = 0; m < 12; m++) {
      if (spark[m] !== 'dormant') activeMonthFlags[m] = true;
    }
  }

  for (const row of rows) {
    row.plants.sort((a, b) =>
      (a.span.start - b.span.start)
      || ((b.span.end - b.span.start) - (a.span.end - a.span.start))
      || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name),
    );
  }

  return {
    sunTiersFilled: rows.filter((r) => r.plants.length > 0).length,
    stagesFilled: stageSet.size,
    rolesCovered: roleSet.size,
    activeMonths: activeMonthFlags.filter(Boolean).length,
    rows,
  };
}

interface RoleLedgerRow {
  id: string;
  label: string;
  target: number;
  count: number;
  pips: number;
  status: 'Strong' | 'Thin' | 'Gap';
  species: Taxon[];
}

export function buildRoleLedger(members: readonly Taxon[]): RoleLedgerRow[] {
  const specs: { id: string; label: string; target: number; match: (t: Taxon) => boolean }[] = [
    {
      id: 'nfix',
      label: fb(T('studio.sys.role.nfix'), 'Nitrogen fixers'),
      target: 2,
      match: (t) => (t.functions ?? []).some((f) => /nitrogen/i.test(f.function)) || jobsOf(t).includes('feeds_soil'),
    },
    {
      id: 'pollinators',
      label: fb(T('studio.sys.role.helpers'), 'Pollinators & beneficials'),
      target: 3,
      match: (t) => jobsOf(t).includes('helpers'),
    },
    {
      id: 'biomass',
      label: fb(T('studio.sys.role.biomass'), 'Biomass & mulch'),
      target: 2,
      match: (t) => jobsOf(t).includes('mulch'),
    },
    {
      id: 'accumulators',
      label: fb(T('studio.sys.role.ground'), 'Dynamic accumulators'),
      target: 2,
      match: (t) => jobsOf(t).includes('ground') || (t.functions ?? []).some((f) => /accumulator|mineral|soil/i.test(f.function)),
    },
    {
      id: 'food',
      label: fb(T('studio.sys.role.food'), 'Food & harvest'),
      target: 3,
      match: (t) => jobsOf(t).includes('feeds_you'),
    },
    {
      id: 'shelter',
      label: fb(T('studio.sys.role.shelter'), 'Windbreak & shelter'),
      target: 2,
      match: (t) => jobsOf(t).includes('shelter'),
    },
  ];

  return specs.map((s) => {
    const species = members.filter(s.match);
    const count = species.length;
    const pips = Math.min(4, count);
    const status: 'Strong' | 'Thin' | 'Gap' = count >= s.target ? 'Strong' : count > 0 ? 'Thin' : 'Gap';
    return { id: s.id, label: s.label, target: s.target, count, pips, status, species };
  });
}

const SEASON_MONTHS: readonly (readonly number[])[] = [
  [11, 0, 1],
  [2, 3, 4],
  [5, 6, 7],
  [8, 9, 10],
];

export interface PlantActivityTracks {
  winter: boolean[];
  sow: boolean[];
  bloom: boolean[];
  harvest: boolean[];
}

export function activityTracksOf(t: Taxon): PlantActivityTracks {
  const spark = activityMonthsOf(t);
  const isAnnual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
  const isEvergreen = Boolean(t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen));
  const cold = t.climate?.tminCold?.low ?? -4;
  const winterGrow = isEvergreen || (!isAnnual && cold <= 0 && spark[0] !== 'dormant');

  const winter = Array<boolean>(12).fill(false);
  const sow = Array<boolean>(12).fill(false);
  const bloom = Array<boolean>(12).fill(false);
  const harvest = Array<boolean>(12).fill(false);

  for (let m = 0; m < 12; m++) {
    const lvl = spark[m];
    if (winterGrow && (m <= 1 || m === 10 || m === 11)) winter[m] = true;
    if (isAnnual ? (m === 2 || m === 3 || m === 4) : (m === 2 || m === 10)) sow[m] = true;
    if (lvl !== 'dormant' && m >= 3 && m <= 7) bloom[m] = true;
    if (lvl === 'peak' || (lvl === 'active' && m >= 7 && m <= 9)) harvest[m] = true;
  }
  return { winter, sow, bloom, harvest };
}

function isTaxonActiveInSeason(t: Taxon, seasonIdx: number): boolean {
  const months = SEASON_MONTHS[seasonIdx];
  if (!months) return false;
  const tr = activityTracksOf(t);
  return months.some((m) => tr.winter[m] || tr.sow[m] || tr.bloom[m] || tr.harvest[m]);
}

/** Exact 6x4 Role x Season active slot count shared by StudioHeader Health Ribbon and LivingSystemTab. */
export function countRoleSeasonSlots(members: readonly Taxon[]): number {
  const ledger = buildRoleLedger(members);
  let total = 0;
  for (const row of ledger) {
    for (let sIdx = 0; sIdx < SEASON_MONTHS.length; sIdx++) {
      if (row.species.some((t) => isTaxonActiveInSeason(t, sIdx))) total += 1;
    }
  }
  return total;
}

export interface RoleFillerSuggestion {
  taxon: Taxon;
  sun: Stratum;
  spanLabel: string;
  exactMatch: boolean;
  why: string;
}

const SEASON_IDS = ['winter', 'spring', 'summer', 'autumn'] as const;
const SEASON_LABELS = ['Winter', 'Spring', 'Summer', 'Autumn'] as const;

/**
 * Top climate-compatible filler species for a specific Role x Season or Role x Stage cell.
 * Pure, deterministic, excludes species already in the palette.
 */
export function suggestRoleFillers(
  roleMatch: (t: Taxon) => boolean,
  pool: readonly Taxon[],
  memberIds: ReadonlySet<string>,
  members: readonly Taxon[],
  mode: 'season' | 'succession',
  colIndex: number,
  sitePh: number | null,
  limit = 3,
): RoleFillerSuggestion[] {
  const coveredSuns = new Set(members.map((m) => preferredSunOf(m)));
  const candidates = pool.filter((t) => !memberIds.has(t.id) && roleMatch(t));

  const scored = candidates.map((t) => {
    const sun = preferredSunOf(t);
    const span = stageSpanOf(t);
    const exactMatch = mode === 'season'
      ? isTaxonActiveInSeason(t, colIndex)
      : (colIndex >= span.start && colIndex <= span.end);

    let score = exactMatch ? 100 : 10;
    if (!coveredSuns.has(sun)) score += 20;
    score += Math.min(12, (span.end - span.start + 1) * 2);

    const ph = t.traits.soil_ph;
    const phFits = sitePh != null && ph != null
      && (ph.min == null || sitePh >= ph.min - 0.2)
      && (ph.max == null || sitePh <= ph.max + 0.2);
    if (phFits) score += 12;

    const parts: string[] = [];
    if (mode === 'season') {
      const seasonId = SEASON_IDS[colIndex];
      const seasonLbl = seasonId ? fb(T(`studio.season.${seasonId}`), SEASON_LABELS[colIndex] ?? 'season') : 'season';
      parts.push(
        exactMatch
          ? fb(T('studio.sys.fillerActiveIn', { season: seasonLbl }), `Active in ${seasonLbl}`)
          : fb(T('studio.sys.fillerBackup'), 'Builds role backup'),
      );
    } else {
      const st = SUCCESSION_STAGES_6[colIndex];
      const stageName = st ? fb(T(`studio.stage.${st.id}`), st.name) : 'stage';
      parts.push(
        exactMatch
          ? fb(T('studio.sys.fillerCoversStage', { stage: stageName, span: span.label }), `Covers ${stageName} (${span.label})`)
          : fb(T('studio.sys.fillerCoversSpan', { span: span.label }), `Covers ${span.label}`),
      );
    }
    if (ph?.min != null && ph?.max != null) {
      parts.push(`pH ${ph.min.toFixed(1)}–${ph.max.toFixed(1)}`);
    } else if (!coveredSuns.has(sun)) {
      parts.push(fb(T('studio.sys.fillerOpenSun'), 'fills open sun tier'));
    }

    return {
      taxon: t,
      sun,
      spanLabel: span.label,
      exactMatch,
      why: parts.join(' · '),
      score,
    };
  });

  scored.sort((a, b) => (b.score - a.score) || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name));
  return scored.slice(0, limit).map(({ taxon, sun, spanLabel, exactMatch, why }) => ({
    taxon,
    sun,
    spanLabel,
    exactMatch,
    why,
  }));
}

interface GrowingMonthBrief {
  monthIndex: number;
  short: string;
  initial: string;
  count: number;
  brief: string;
}

export function buildGrowingYear(members: readonly Taxon[], focus: YearFocus): GrowingMonthBrief[] {
  const counts = Array<number>(12).fill(0);
  const woodyCount = members.filter((t) => (t.traits.height_m?.max ?? 0) >= 2).length;
  const foodCount = members.filter((t) => jobsOf(t).includes('feeds_you')).length;

  for (const t of members) {
    const spark = activityMonthsOf(t);
    for (let m = 0; m < 12; m++) {
      if (focus === 'all' && spark[m] !== 'dormant') counts[m]++;
      else if (focus === 'bloom' && (m >= 2 && m <= 5) && spark[m] !== 'dormant') counts[m]++;
      else if (focus === 'harvest' && (m >= 5 && m <= 9) && spark[m] === 'peak') counts[m]++;
      else if (focus === 'prune' && (m === 0 || m === 1 || m === 6 || m === 11) && (t.traits.height_m?.max ?? 0) >= 1.5) counts[m]++;
    }
  }

  return MONTH_NAMES.map((short, i) => {
    let brief = fb(T('studio.gy.default'), 'Observe soil moisture and mulch depth.');
    if (focus === 'bloom') {
      brief = i >= 2 && i <= 5
        ? fb(T('studio.gy.bloomActive', { n: counts[i] }), `${counts[i]} species flowering or opening nectar forage.`)
        : fb(T('studio.gy.bloomQuiet'), 'Quiet bloom window; protect overwintering beneficials.');
    } else if (focus === 'harvest') {
      const n = Math.max(counts[i], Math.min(foodCount, 1));
      brief = i >= 5 && i <= 9
        ? fb(T('studio.gy.harvActive', { n }), `${n} food-bearing lines approaching pickable maturity.`)
        : fb(T('studio.gy.harvQuiet'), 'Store cured harvests and prepare beds for next cycle.');
    } else if (focus === 'prune') {
      brief = i <= 1 || i === 11
        ? fb(T('studio.gy.pruneDormant', { n: woodyCount }), `Dormant structural pruning window for ${woodyCount} woody species.`)
        : i === 6
        ? fb(T('studio.gy.pruneSummer'), 'Light summer chop-and-drop to open light for mid-season crops.')
        : fb(T('studio.gy.pruneHold'), 'Hold heavy cuts until dormancy.');
    } else {
      if (i <= 1) brief = fb(T('studio.gy.allWinter'), 'Dormant inspection, bare-root planting, and mulch top-up.');
      else if (i <= 4) brief = fb(T('studio.gy.allSpring'), 'Spring budbreak, direct sowing, and early pollinator forage.');
      else if (i <= 7) brief = fb(T('studio.gy.allSummer'), 'Peak sun growth, summer chop-and-drop, and deep watering check.');
      else if (i <= 9) brief = fb(T('studio.gy.allAutumn'), 'Main harvest window and autumn cover-seed broadcast.');
      else brief = fb(T('studio.gy.allLate'), 'Leaf-litter retention and frost-sensitive mulch collar check.');
    }
    return { monthIndex: i, short: localMonthShort(i) || short, initial: MONTH_INITIALS[i], count: counts[i], brief };
  });
}

/* ===================== 2. 2050 CLIMATE ===================== */

interface StressPreset {
  id: string;
  label: string;
  stress: ClimateStressState;
}

export const STRESS_PRESETS: readonly StressPreset[] = [
  { id: 'baseline', label: 'Baseline', stress: { heatDeltaC: 0, droughtPct: 0, winterDeltaC: 0, falseSpringDeltaPct: 0, windExposure: 0, extremeRainPct: 0 } },
  { id: 'heatdome', label: 'Heat dome (+3 °C)', stress: { heatDeltaC: 3, droughtPct: 15, winterDeltaC: 0, falseSpringDeltaPct: 5, windExposure: 1, extremeRainPct: 0 } },
  { id: 'drought', label: 'Multi-year drought', stress: { heatDeltaC: 1.5, droughtPct: 35, winterDeltaC: 0, falseSpringDeltaPct: 5, windExposure: 2, extremeRainPct: -20 } },
  { id: 'falsespring', label: 'False spring (+25%)', stress: { heatDeltaC: 0.5, droughtPct: 0, winterDeltaC: -1.5, falseSpringDeltaPct: 25, windExposure: 1, extremeRainPct: 10 } },
  { id: 'polar', label: 'Polar plunge (-4 °C)', stress: { heatDeltaC: 0, droughtPct: 0, winterDeltaC: -4, falseSpringDeltaPct: 10, windExposure: 2, extremeRainPct: 5 } },
];

export interface PlantTriageItem {
  taxon: Taxon;
  code: TrajectoryCode;
  breachedLimits: string[];
  allFiveLimits: string;
  fieldInsurance: string;
  twinSwap: Taxon | null;
}

interface Climate2050Report {
  verdictTitle: string;
  verdictSeverity: 'resilient' | 'watch' | 'stressed';
  verdictDetail: string;
  novelClimate: boolean;
  forces: { label: string; today: string; future: string; delta: string }[];
  impactLine: string;
  critical: PlantTriageItem[];
  watch: PlantTriageItem[];
  holdsStrong: PlantTriageItem[];
  opportunities: Taxon[];
  monthlyShift: { month: string; todayC: number; futureC: number; heatStress: boolean; dryStress: boolean }[];
}

function estimateTaxonLimits(t: Taxon) {
  const minColdC = t.climate?.tminCold?.low ?? -6;
  const maxHotC = t.climate?.tmaxWarm?.high ?? 34;
  const isAnnual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
  const chillMinCP = isAnnual || (t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen)) ? 10 : 35;
  return { minColdC, maxHotC, chillMinCP, isAnnual };
}

export function evaluateClimate2050(
  members: readonly Taxon[],
  catalog: readonly Taxon[],
  loc: SiteLocation | null,
  period: string,
  envelope: DesignEnvelope,
  stress: ClimateStressState,
  mc?: MicroclimateParams,
  edits?: SiteEdits | null,
): Climate2050Report {
  const profile = siteClimateProfile(loc, null, mc, edits);
  const baseColdToday = profile.typicalColdNightC ?? -3;
  const baseHotToday = profile.typicalWarmHighC ?? 29;
  const baseAridity = profile.aridityIndex ?? 0.8;
  const baseColdFreeze = profile.coldFreeze10yrC ?? Math.round((baseColdToday - 8.5) * 10) / 10;
  const baseHeatPeak = profile.heatPeak10yrC ?? Math.round((baseHotToday + 8) * 10) / 10;
  const futureDeltaWarm = period === '2071-2099' ? 3.4 : 2.1;
  const winterWarmBump = Math.round(futureDeltaWarm * 0.6 * 10) / 10;
  const extremeHotBump = envelope === 'extreme10' ? 2.5 : 0;

  const coldTodayC = Math.round((baseColdToday + stress.winterDeltaC) * 10) / 10;
  const typicalWinterFutureC = Math.round((baseColdToday + winterWarmBump + stress.winterDeltaC) * 10) / 10;
  const extremeColdTailC = Math.round((baseColdToday - 3.5 + stress.winterDeltaC) * 10) / 10;
  const coldTail10yrC = envelope === 'extreme10' ? extremeColdTailC : typicalWinterFutureC;
  const hotTodayC = Math.round((baseHotToday + stress.heatDeltaC * 0.5) * 10) / 10;
  const hotFutureC = Math.round((baseHotToday + futureDeltaWarm + extremeHotBump + stress.heatDeltaC) * 10) / 10;
  const heatDomeFutureC = Math.round(baseHeatPeak + futureDeltaWarm + extremeHotBump + stress.heatDeltaC);
  const freezeFutureC = Math.round(baseColdFreeze + (envelope === 'extreme10' ? -2.0 : winterWarmBump) + stress.winterDeltaC);
  const chillTodayCP = loc?.lookup?.v07?.phenology?.chillPortionsToday ?? Math.max(5, Math.round(60 - Math.max(0, baseColdToday) * 3));
  const chillV07Future = period === '2071-2099'
    ? loc?.lookup?.v07?.phenology?.chillPortions2080
    : loc?.lookup?.v07?.phenology?.chillPortions2050;
  const chillFutureCP = chillV07Future != null
    ? Math.max(0, Math.round(chillV07Future - stress.heatDeltaC * 3))
    : Math.max(0, Math.round(chillTodayCP - futureDeltaWarm * 6 - stress.heatDeltaC * 3));
  const dryTodayPct = Math.round((1 - Math.min(1, baseAridity)) * 40);
  const dryFuturePct = Math.min(95, Math.max(0, dryTodayPct + Math.round(futureDeltaWarm * 4) + stress.droughtPct + (envelope === 'extreme10' ? 15 : 0)));
  const dryDeltaPct = dryFuturePct - dryTodayPct;
  const dryPressure = dryDeltaPct;
  const baseDryDays = profile.dryStreakDays ?? Math.round(14 + (1 - Math.min(1, baseAridity)) * 38 + 6);
  const dryFutureDays = Math.max(
    baseDryDays + 2,
    Math.round(baseDryDays * (1 + futureDeltaWarm * 0.08 + stress.droughtPct / 100 + (envelope === 'extreme10' ? 0.25 : 0))),
  );
  const novelClimate = hotFutureC >= 41 || (chillFutureCP < 15 && stress.heatDeltaC >= 2.5);
  const matchQuality = novelClimate ? 0.45 : 0.82;

  const site = { coldTodayC, coldTail10yrC, hotTodayC, hotFutureC, chillTodayCP, chillFutureCP, matchQuality };
  const memberIds = new Set(members.map((m) => m.id));

  const findTwinSwap = (t: Taxon): Taxon | null => {
    const sun = preferredSunOf(t);
    const jobs = jobsOf(t);
    for (const c of catalog) {
      if (memberIds.has(c.id) || c.id === t.id) continue;
      if (preferredSunOf(c) !== sun) continue;
      if (jobs.length && !jobsOf(c).some((j) => jobs.includes(j))) continue;
      const code = evaluateTrajectory(estimateTaxonLimits(c), site);
      if (code === 'Stable') return c;
    }
    return null;
  };

  const critical: PlantTriageItem[] = [];
  const watch: PlantTriageItem[] = [];
  const holdsStrong: PlantTriageItem[] = [];

  for (const t of members) {
    const lim = estimateTaxonLimits(t);
    const code = evaluateTrajectory(lim, site);
    const breached: string[] = [];
    if (hotFutureC > lim.maxHotC) {
      breached.push(fb(
        T('studio.clim.breach.heat', { future: `${hotFutureC} °C`, limit: `${lim.maxHotC} °C` }),
        `Summer afternoons (${hotFutureC} °C avg) exceed ${lim.maxHotC} °C heat-dome limit`,
      ));
    }
    if (!lim.isAnnual && coldTail10yrC < lim.minColdC) {
      breached.push(fb(
        T('studio.clim.breach.freeze', { freeze: `${freezeFutureC} °C`, limit: `${lim.minColdC} °C` }),
        `Hard freeze (${freezeFutureC} °C 1-in-10-yr) dips below ${lim.minColdC} °C limit`,
      ));
    }
    if (chillFutureCP < lim.chillMinCP) {
      breached.push(fb(
        T('studio.clim.breach.chill', { future: `${chillFutureCP}`, need: `${lim.chillMinCP}` }),
        `Winter chill (${chillFutureCP} CP) drops below ${lim.chillMinCP} CP need`,
      ));
    }
    if (dryPressure >= 30 && (!t.traits.drought_tolerance || !/high/i.test(t.traits.drought_tolerance))) {
      breached.push(fb(
        T('studio.clim.breach.dry', { days: dryFutureDays }),
        `Longest dry spell (${dryFutureDays}d without rain) strains moisture demand`,
      ));
    }

    const rawDrought = (t.traits.drought_tolerance ?? '').toLowerCase();
    const droughtLabel = rawDrought.includes('high')
      ? fb(T('studio.clim.droughtHigh'), 'High')
      : rawDrought.includes('low')
      ? fb(T('studio.clim.droughtLow'), 'Low')
      : fb(T('studio.clim.droughtMod'), 'Moderate');
    const phSpan = t.traits.soil_ph ? `${t.traits.soil_ph.min}–${t.traits.soil_ph.max}` : '6.0–7.5';
    const allFiveLimits = [
      fb(T('studio.clim.limit.freeze', { limit: `${lim.minColdC} °C`, freeze: `${freezeFutureC} °C` }), `Hard-freeze limit ${lim.minColdC} °C (1-in-10-yr ~${freezeFutureC} °C)`),
      fb(T('studio.clim.limit.heat', { limit: `${lim.maxHotC} °C`, future: `${hotFutureC} °C` }), `Heat-dome limit ${lim.maxHotC} °C (future avg ${hotFutureC} °C)`),
      fb(T('studio.clim.limit.chill', { need: `${lim.chillMinCP}`, future: `${chillFutureCP}` }), `Chill need ${lim.chillMinCP} CP (future ${chillFutureCP} CP)`),
      fb(T('studio.clim.limit.drought', { level: droughtLabel, days: dryFutureDays }), `Drought tolerance ${droughtLabel} (${dryFutureDays}d dry spell)`),
      fb(T('studio.clim.limit.ph', { ph: phSpan }), `Soil pH ${phSpan}`),
    ].join(' · ');

    const fieldInsurance = code === 'ColdEstablishmentBarrier'
      ? fb(T('studio.clim.ins.cold'), 'Plant on a warm mid-slope with 10 cm wood-chip collar and frost fleece for winters 1–2.')
      : code === 'FutureMaturityRisk' || code === 'NovelClimate'
      ? fb(T('studio.clim.ins.heat'), 'Pair with fast nitrogen-fixing shade nurse and deep 12 cm organic mulch to buffer soil heat.')
      : fb(T('studio.clim.ins.std'), 'Establish with autumn rain and maintain living mulch around the root zone.');

    const item: PlantTriageItem = {
      taxon: t,
      code,
      breachedLimits: breached.slice(0, 2),
      allFiveLimits,
      fieldInsurance,
      twinSwap: code === 'Stable' ? null : findTwinSwap(t),
    };

    if (code === 'OutOfRange' || code === 'NovelClimate') critical.push(item);
    else if (code === 'FutureMaturityRisk' || code === 'ColdEstablishmentBarrier' || breached.length > 0) watch.push(item);
    else holdsStrong.push(item);
  }

  // Newly thriving opportunities: warm-adapted catalog plants not yet in palette that thrive in future climate.
  const opportunities: Taxon[] = [];
  for (const c of catalog) {
    if (memberIds.has(c.id)) continue;
    const lim = estimateTaxonLimits(c);
    if (lim.maxHotC >= hotFutureC + 1 && lim.minColdC >= baseColdToday - 1 && lim.minColdC <= coldTodayC + 2) {
      if (evaluateTrajectory(lim, site) === 'Stable') {
        opportunities.push(c);
        if (opportunities.length >= 4) break;
      }
    }
  }

  const verdictSeverity: 'resilient' | 'watch' | 'stressed' =
    critical.length > 0 ? 'stressed' : watch.length > 0 ? 'watch' : 'resilient';
  const horizonTag = period === '2071-2099'
    ? fb(T('studio.horizon.2080s'), '2080s')
    : fb(T('studio.horizon.2050s'), '2050s');
  const verdictTitle =
    verdictSeverity === 'resilient'
      ? fb(T('studio.clim.verdict.resilient'), 'Palette holds strong through mid-century')
      : verdictSeverity === 'watch'
      ? fb(T('studio.clim.verdict.watch', { n: watch.length }), `${watch.length} species need microclimate buffering`)
      : fb(T('studio.clim.verdict.stressed', { n: critical.length }), `${critical.length} species cross hard climate limits`);
  const verdictDetail =
    envelope === 'extreme10'
      ? fb(T('studio.clim.verdictDetail.extreme', { cold: `${coldTail10yrC} °C`, hot: `${hotFutureC} °C` }), `Evaluated under the 1-in-10-year extreme envelope (${coldTail10yrC} °C cold tail to ${hotFutureC} °C heat dome).`)
      : fb(T('studio.clim.verdictDetail.typical', { horizon: horizonTag, cold: `${coldTodayC} °C`, hot: `${hotFutureC} °C` }), `Evaluated under typical ${horizonTag} conditions (${coldTodayC} °C winter to ${hotFutureC} °C summer).`);

  const forces = [
    {
      label: fb(T('studio.clim.forceSummer'), 'Summer afternoons & heat domes'),
      today: baseHotToday.toFixed(1),
      future: `${hotFutureC.toFixed(1)} °C`,
      delta: `${fb(T('studio.clim.forcePeak'), '1-in-10-yr peak')} ~${heatDomeFutureC} °C`,
    },
    {
      label: fb(T('studio.clim.forceWinter'), 'Winter nights & hard freezes'),
      today: signedTemp1(baseColdToday).replace(' °C', ''),
      future: signedTemp1(coldTail10yrC),
      delta: `${fb(T('studio.clim.forceFreeze'), '1-in-10-yr freeze')} ~${freezeFutureC} °C`,
    },
    {
      label: fb(T('studio.clim.forceDry'), 'Longest summer dry spell'),
      today: `~${baseDryDays}d`,
      future: `${dryFutureDays}d ${fb(T('studio.clim.forceNoRain'), 'without rain')}`,
      delta: `+${dryFutureDays - baseDryDays}d`,
    },
    {
      label: fb(T('studio.clim.forceChill'), 'Winter chill (fruit trees)'),
      today: `${chillTodayCP}`,
      future: `${chillFutureCP} CP`,
      delta: chillFutureCP < 40 ? fb(T('studio.clim.lowChillVar'), 'low-chill varieties') : `${chillFutureCP - chillTodayCP} CP`,
    },
  ];

  // 12-month Today vs Future curve (pure sinusoidal approximation anchored to site cold/hot).
  const midToday = (baseHotToday + baseColdToday) / 2;
  const ampToday = Math.max(4, (baseHotToday - baseColdToday) / 2);
  const midFut = (hotFutureC + coldTodayC) / 2;
  const ampFut = Math.max(4, (hotFutureC - coldTodayC) / 2);
  const monthlyShift = Array.from({ length: 12 }, (_, i) => {
    const wave = -Math.cos(((i) / 12) * Math.PI * 2);
    const todayC = Math.round((midToday + ampToday * wave) * 10) / 10;
    const futureC = Math.round((midFut + ampFut * wave) * 10) / 10;
    return {
      month: localMonthShort(i),
      todayC,
      futureC,
      heatStress: futureC >= 32,
      dryStress: dryPressure >= 25 && i >= 5 && i <= 8,
    };
  });

  return {
    verdictTitle,
    verdictSeverity,
    verdictDetail,
    novelClimate,
    forces,
    impactLine: fb(
      T('studio.clim.impactLine', { fit: holdsStrong.length, care: watch.length, risk: critical.length }),
      `${holdsStrong.length} resilient · ${watch.length} stressed · ${critical.length} critical`,
    ),
    critical,
    watch,
    holdsStrong,
    opportunities,
    monthlyShift,
  };
}

/* ===================== 3. PLANTING PLAN SVG LAYOUT & CALENDAR ===================== */

interface PlotLayoutNode {
  id: string;
  label: string;
  initials: string;
  sunBand: Stratum;
  x: number;
  y: number;
  r: number;
  qty: number;
}

interface PlotLayoutBlueprint {
  isModule: boolean;
  moduleLabel: string;
  widthM: number;
  heightM: number;
  viewWidth: number;
  viewHeight: number;
  nodes: PlotLayoutNode[];
  lanes: number[];
}

export function computePlotLayout(plan: PlantingPlanSummary, pattern: LayoutPattern): PlotLayoutBlueprint {
  const viewWidth = 600;
  const viewHeight = 320;
  const pad = 28;
  const isModule = plan.netAreaM2 > 400 || plan.items.length > 24;
  const areaM2 = isModule ? 100 : Math.max(12, plan.netAreaM2);
  const widthM = Math.round(Math.sqrt(areaM2 * 1.6) * 10) / 10;
  const heightM = Math.round((areaM2 / widthM) * 10) / 10;
  const moduleCount = Math.max(1, Math.round(plan.netAreaM2 / 100));
  const moduleLabel = isModule
    ? fb(T('studio.plan.bpModule', { n: moduleCount }), `Repeatable 10 m × 10 m field module (${moduleCount}× modules across plot)`)
    : fb(T('studio.plan.bpBed', { w: `${widthM} m`, h: `${heightM} m` }), `${widthM} m × ${heightM} m net planting bed`);

  const visibleItems = plan.items.filter((it) => it.qty > 0).slice(0, 18);
  const nodes: PlotLayoutNode[] = [];
  const lanes: number[] = [];
  const usedInitials = new Set<string>();
  const initialsFor = (canon: string, idx: number): string => {
    const parts = canon.trim().split(/\s+/);
    const base = ((parts[0]?.[0] ?? 'S') + (parts[1]?.[0] ?? parts[0]?.[1] ?? String(idx + 1))).replace(/[^A-Za-z0-9]/g, '');
    const code = (base.slice(0, 2) || `S${idx + 1}`);
    const cap = code[0].toUpperCase() + (code[1]?.toLowerCase() ?? '');
    if (!usedInitials.has(cap)) { usedInitials.add(cap); return cap; }
    const alt = `${cap[0]}${(idx % 9) + 1}`;
    usedInitials.add(alt);
    return alt;
  };

  if (pattern === 'alley') {
    const laneCount = 3;
    for (let l = 0; l < laneCount; l++) {
      lanes.push(Math.round(pad + ((l + 0.5) * (viewHeight - pad * 2)) / laneCount));
    }
    visibleItems.forEach((it, idx) => {
      const laneIdx = idx % laneCount;
      const colIdx = Math.floor(idx / laneCount);
      const colsInLane = Math.max(1, Math.ceil(visibleItems.length / laneCount));
      const x = pad + 26 + ((colIdx + 0.5) * (viewWidth - pad * 2 - 52)) / colsInLane;
      const y = lanes[laneIdx];
      const r = it.sunBand === 'emergent' ? 20 : it.sunBand === 'high' ? 16 : it.sunBand === 'medium' ? 13 : 11;
      nodes.push({ id: it.taxon.id, label: it.taxon.canonical_name, initials: initialsFor(it.taxon.canonical_name, idx), sunBand: it.sunBand, x, y, r, qty: it.qty });
    });
  } else if (pattern === 'grid') {
    const cols = Math.max(2, Math.ceil(Math.sqrt(visibleItems.length * 1.5)));
    const rows = Math.max(1, Math.ceil(visibleItems.length / cols));
    visibleItems.forEach((it, idx) => {
      const c = idx % cols;
      const row = Math.floor(idx / cols);
      const x = pad + 24 + ((c + 0.5) * (viewWidth - pad * 2 - 48)) / cols;
      const y = pad + 22 + ((row + 0.5) * (viewHeight - pad * 2 - 44)) / rows;
      const r = it.sunBand === 'emergent' ? 19 : it.sunBand === 'high' ? 15 : it.sunBand === 'medium' ? 13 : 11;
      nodes.push({ id: it.taxon.id, label: it.taxon.canonical_name, initials: initialsFor(it.taxon.canonical_name, idx), sunBand: it.sunBand, x, y, r, qty: it.qty });
    });
  } else {
    // Guild Clusters: place emergent/high anchors in two guild centers, ring smaller species around them.
    const centers = [
      { x: viewWidth * 0.32, y: viewHeight * 0.5 },
      { x: viewWidth * 0.68, y: viewHeight * 0.5 },
    ];
    visibleItems.forEach((it, idx) => {
      const c = centers[idx % centers.length];
      const rank = Math.floor(idx / centers.length);
      const r = it.sunBand === 'emergent' ? 21 : it.sunBand === 'high' ? 16 : it.sunBand === 'medium' ? 13 : 11;
      const ring = rank === 0 ? 0 : rank <= 4 ? 58 : 102;
      const angle = rank === 0 ? 0 : ((rank - 1) * (Math.PI * 2)) / Math.max(4, Math.min(8, Math.ceil(visibleItems.length / 2)));
      const x = c.x + Math.cos(angle) * ring;
      const y = c.y + Math.sin(angle) * ring * 0.85;
      nodes.push({ id: it.taxon.id, label: it.taxon.canonical_name, initials: initialsFor(it.taxon.canonical_name, idx), sunBand: it.sunBand, x, y, r, qty: it.qty });
    });
  }

  // Deterministic collision-separation pass + strict viewport margin clamping.
  const gap = 6;
  for (let iter = 0; iter < 18; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = a.r + b.r + gap;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
      const n = nodes[i];
      n.x = Math.max(pad + n.r, Math.min(viewWidth - pad - n.r, n.x));
      n.y = Math.max(pad + n.r, Math.min(viewHeight - pad - n.r, n.y));
    }
  }

  for (const n of nodes) {
    n.x = Math.round(n.x * 10) / 10;
    n.y = Math.round(n.y * 10) / 10;
  }

  return { isModule, moduleLabel, widthM, heightM, viewWidth, viewHeight, nodes, lanes };
}

interface PlantingActionMonth {
  month: string;
  tag: string;
  brief: string;
}

export function buildPlantingActionCalendar(plan: PlantingPlanSummary, coldC?: number): PlantingActionMonth[] {
  const mild = (coldC ?? 2) >= 0;
  const hasBareRoot = plan.stockSummary.bareroot > 0;
  const hasSeeds = plan.stockSummary.seedPacks > 0;
  return [
    { month: localMonthShort(0), tag: fb(T('studio.plan.calTag.order'), 'Order'), brief: fb(hasSeeds ? T('studio.plan.calBrief.0s') : T('studio.plan.calBrief.0'), hasSeeds ? 'Order direct-sow seed packs and check bare-root delivery dates.' : 'Confirm nursery dispatch dates and inspect soil drainage.') },
    { month: localMonthShort(1), tag: fb(T('studio.plan.calTag.prep'), 'Prep'), brief: fb(mild ? T('studio.plan.calBrief.1m') : T('studio.plan.calBrief.1'), mild ? 'Lay 10 cm wood-chip mulch and plant early bare-root stock.' : 'Order 2 L pots and plugs; stage stakes and compost.') },
    { month: localMonthShort(2), tag: fb(T('studio.plan.calTag.plant'), 'Plant'), brief: fb(hasBareRoot ? T('studio.plan.calBrief.2b') : T('studio.plan.calBrief.2'), hasBareRoot ? 'Plant dormant bare-root trees and stake against spring wind.' : 'Prepare planting pockets with compost and mycorrhizal mulch.') },
    { month: localMonthShort(3), tag: fb(T('studio.plan.calTag.establish'), 'Establish'), brief: fb(T('studio.plan.calBrief.3'), 'Set out potted shrubs and perennials; water deeply after planting.') },
    { month: localMonthShort(4), tag: fb(T('studio.plan.calTag.sow'), 'Sow'), brief: fb(hasSeeds ? T('studio.plan.calBrief.4s') : T('studio.plan.calBrief.4'), hasSeeds ? 'Direct-sow warm-season annuals and living mulch lines after last frost.' : 'Check young shoot growth and top up mulch rings.') },
    { month: localMonthShort(5), tag: fb(T('studio.plan.calTag.mulch'), 'Mulch'), brief: fb(T('studio.plan.calBrief.5'), 'Deep-soak establishment watering twice weekly during dry spells.') },
    { month: localMonthShort(6), tag: fb(T('studio.plan.calTag.buffer'), 'Buffer'), brief: fb(T('studio.plan.calBrief.6'), 'Chop-and-drop fast biomass to shade soil before peak summer heat.') },
    { month: localMonthShort(7), tag: fb(T('studio.plan.calTag.harvest'), 'Harvest'), brief: fb(T('studio.plan.calBrief.7'), 'Harvest early fruit/greens; keep young roots cool under 10 cm mulch.') },
    { month: localMonthShort(8), tag: fb(T('studio.plan.calTag.order'), 'Order'), brief: fb(T('studio.plan.calBrief.8'), 'Reserve autumn bare-root trees and spring-flowering bulbs.') },
    { month: localMonthShort(9), tag: fb(T('studio.plan.calTag.autumn'), 'Autumn'), brief: fb(T('studio.plan.calBrief.9'), 'Plant hardy divisions and bulbs while soil retains autumn warmth.') },
    { month: localMonthShort(10), tag: fb(T('studio.plan.calTag.dormant'), 'Dormant'), brief: fb(mild ? T('studio.plan.calBrief.10m') : T('studio.plan.calBrief.10'), mild ? 'Begin main winter bare-root planting wave.' : 'Add winter mulch collars around young woody stems.') },
    { month: localMonthShort(11), tag: fb(T('studio.plan.calTag.review'), 'Review'), brief: fb(T('studio.plan.calBrief.11'), 'Record survival notes and update quantities for next season.') },
  ];
}
