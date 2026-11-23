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
  SiteLocation,
  Stratum,
  Taxon,
} from '../../../lib/consortium/index.ts';
import {
  jobsOf,
  siteClimate,
  SUCCESSION_STAGES_6,
} from '../../../lib/consortium/index.ts';
import { evaluateTrajectory, type TrajectoryCode } from '../../../lib/climate/v07.ts';
import type { ClimateStressState } from '../state/studio.ts';
import {
  activityMonthsOf,
  MONTH_INITIALS,
  stageSpanOf,
  SUN_TIER_OPTIONS,
} from './studio-filters.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type YearFocus = 'all' | 'bloom' | 'harvest' | 'prune';

/* ===================== 1. LIVING SYSTEM ===================== */

interface MatrixSummary {
  sunTiersFilled: number;
  stagesFilled: number;
  rolesCovered: number;
  activeMonths: number;
  rows: {
    sun: Stratum;
    label: string;
    cells: Taxon[][];
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
  }));
  const stageSet = new Set<number>();
  const roleSet = new Set<JobId>();
  const activeMonthFlags = Array<boolean>(12).fill(false);

  for (const t of members) {
    const sun = preferredSunOf(t);
    const row = rows.find((r) => r.sun === sun) ?? rows[1];
    const span = stageSpanOf(t);
    row.cells[span.start].push(t);
    for (let s = span.start; s <= span.end; s++) stageSet.add(s);
    for (const j of jobsOf(t)) roleSet.add(j);
    const spark = activityMonthsOf(t);
    for (let m = 0; m < 12; m++) {
      if (spark[m] !== 'dormant') activeMonthFlags[m] = true;
    }
  }

  return {
    sunTiersFilled: rows.filter((r) => r.cells.some((c) => c.length > 0)).length,
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
      label: 'Nitrogen fixers',
      target: 2,
      match: (t) => (t.functions ?? []).some((f) => /nitrogen/i.test(f.function)) || jobsOf(t).includes('feeds_soil'),
    },
    {
      id: 'pollinators',
      label: 'Pollinators & beneficials',
      target: 3,
      match: (t) => jobsOf(t).includes('helpers'),
    },
    {
      id: 'biomass',
      label: 'Biomass & mulch',
      target: 2,
      match: (t) => jobsOf(t).includes('mulch'),
    },
    {
      id: 'accumulators',
      label: 'Dynamic accumulators',
      target: 2,
      match: (t) => jobsOf(t).includes('ground') || (t.functions ?? []).some((f) => /accumulator|mineral|soil/i.test(f.function)),
    },
    {
      id: 'food',
      label: 'Food & harvest',
      target: 3,
      match: (t) => jobsOf(t).includes('feeds_you'),
    },
    {
      id: 'shelter',
      label: 'Windbreak & shelter',
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
    let brief = 'Observe soil moisture and mulch depth.';
    if (focus === 'bloom') {
      brief = i >= 2 && i <= 5 ? `${counts[i]} species flowering or opening nectar forage.` : 'Quiet bloom window; protect overwintering beneficials.';
    } else if (focus === 'harvest') {
      brief = i >= 5 && i <= 9 ? `${Math.max(counts[i], Math.min(foodCount, 1))} food-bearing lines approaching pickable maturity.` : 'Store cured harvests and prepare beds for next cycle.';
    } else if (focus === 'prune') {
      brief = i <= 1 || i === 11 ? `Dormant structural pruning window for ${woodyCount} woody species.` : i === 6 ? 'Light summer chop-and-drop to open light for mid-season crops.' : 'Hold heavy cuts until dormancy.';
    } else {
      if (i <= 1) brief = 'Dormant inspection, bare-root planting, and mulch top-up.';
      else if (i <= 4) brief = 'Spring budbreak, direct sowing, and early pollinator forage.';
      else if (i <= 7) brief = 'Peak sun growth, summer chop-and-drop, and deep watering check.';
      else if (i <= 9) brief = 'Main harvest window and autumn cover-seed broadcast.';
      else brief = 'Leaf-litter retention and frost-sensitive mulch collar check.';
    }
    return { monthIndex: i, short, initial: MONTH_INITIALS[i], count: counts[i], brief };
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
): Climate2050Report {
  const sc = loc?.lookup ? siteClimate(loc.lookup) : null;
  const baseColdToday = sc?.today?.tminColdC ?? -3;
  const baseHotToday = sc?.today?.tmaxWarmC ?? 29;
  const baseAridity = sc?.today?.aridityIndex ?? 0.8;
  const futureDeltaWarm = period === '2071-2099' ? 3.4 : 2.1;
  const winterWarmBump = Math.round(futureDeltaWarm * 0.6 * 10) / 10;
  const extremeHotBump = envelope === 'extreme10' ? 2.5 : 0;

  const coldTodayC = Math.round((baseColdToday + stress.winterDeltaC) * 10) / 10;
  const typicalWinterFutureC = Math.round((baseColdToday + winterWarmBump + stress.winterDeltaC) * 10) / 10;
  const extremeColdTailC = Math.round((baseColdToday - 3.5 + stress.winterDeltaC) * 10) / 10;
  const coldTail10yrC = envelope === 'extreme10' ? extremeColdTailC : typicalWinterFutureC;
  const hotTodayC = Math.round((baseHotToday + stress.heatDeltaC * 0.5) * 10) / 10;
  const hotFutureC = Math.round((baseHotToday + futureDeltaWarm + extremeHotBump + stress.heatDeltaC) * 10) / 10;
  const chillTodayCP = Math.max(5, Math.round(60 - Math.max(0, baseColdToday) * 3));
  const chillFutureCP = Math.max(0, Math.round(chillTodayCP - futureDeltaWarm * 6 - stress.heatDeltaC * 3));
  const dryTodayPct = Math.round((1 - Math.min(1, baseAridity)) * 40);
  const dryFuturePct = Math.min(95, Math.max(0, dryTodayPct + Math.round(futureDeltaWarm * 4) + stress.droughtPct + (envelope === 'extreme10' ? 15 : 0)));
  const dryDeltaPct = dryFuturePct - dryTodayPct;
  const dryPressure = dryDeltaPct;
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
    if (hotFutureC > lim.maxHotC) breached.push(`Summer peak ${hotFutureC} °C exceeds ${lim.maxHotC} °C ceiling`);
    if (!lim.isAnnual && coldTail10yrC < lim.minColdC) breached.push(`Cold snap ${coldTail10yrC} °C dips below ${lim.minColdC} °C floor`);
    if (chillFutureCP < lim.chillMinCP) breached.push(`Winter chill (${chillFutureCP} CP) drops below ${lim.chillMinCP} CP need`);
    if (dryPressure >= 30 && (!t.traits.drought_tolerance || !/high/i.test(t.traits.drought_tolerance))) {
      breached.push(`Dry-spell pressure (+${dryPressure}%) strains moisture demand`);
    }

    const allFiveLimits = [
      `Cold floor ${lim.minColdC} °C (site tail ${coldTail10yrC} °C)`,
      `Heat ceiling ${lim.maxHotC} °C (future ${hotFutureC} °C)`,
      `Chill need ${lim.chillMinCP} CP (future ${chillFutureCP} CP)`,
      `Drought tolerance ${t.traits.drought_tolerance ?? 'Moderate'}`,
      `Soil pH ${t.traits.soil_ph ? `${t.traits.soil_ph.min}–${t.traits.soil_ph.max}` : '6.0–7.5'}`,
    ].join(' · ');

    const fieldInsurance = code === 'ColdEstablishmentBarrier'
      ? 'Plant on a warm mid-slope with 10 cm wood-chip collar and frost fleece for winters 1–2.'
      : code === 'FutureMaturityRisk' || code === 'NovelClimate'
      ? 'Pair with fast nitrogen-fixing shade nurse and deep 12 cm organic mulch to buffer soil heat.'
      : 'Establish with autumn rain and maintain living mulch around the root zone.';

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
  const verdictTitle =
    verdictSeverity === 'resilient'
      ? 'Palette holds strong through mid-century'
      : verdictSeverity === 'watch'
      ? `${watch.length} species need microclimate buffering`
      : `${critical.length} species cross hard climate limits`;
  const verdictDetail =
    envelope === 'extreme10'
      ? `Evaluated under the 1-in-10-year extreme envelope (${coldTail10yrC} °C cold tail to ${hotFutureC} °C heat dome).`
      : `Evaluated under typical ${period === '2071-2099' ? '2080s' : '2050s'} conditions (${coldTodayC} °C winter to ${hotFutureC} °C summer).`;

  const winterDelta = Math.round((coldTail10yrC - baseColdToday) * 10) / 10;
  const hotDelta = Math.round((hotFutureC - baseHotToday) * 10) / 10;
  const forces = [
    { label: 'Summer peak', today: `${baseHotToday.toFixed(1)} °C`, future: `${hotFutureC.toFixed(1)} °C`, delta: `${hotDelta >= 0 ? '+' : ''}${hotDelta.toFixed(1)} °C` },
    { label: 'Winter floor', today: `${baseColdToday.toFixed(1)} °C`, future: `${coldTail10yrC.toFixed(1)} °C`, delta: `${winterDelta >= 0 ? '+' : ''}${winterDelta.toFixed(1)} °C` },
    { label: 'Dry-spell pressure', today: `${dryTodayPct}%`, future: `${dryFuturePct}%`, delta: `${dryDeltaPct >= 0 ? '+' : ''}${dryDeltaPct}%` },
    { label: 'Winter chill & false spring', today: `${chillTodayCP} CP`, future: `${chillFutureCP} CP`, delta: `${chillFutureCP - chillTodayCP} CP` },
  ];

  // 12-month Today vs Future curve (pure sinusoidal approximation anchored to site cold/hot).
  const midToday = (baseHotToday + baseColdToday) / 2;
  const ampToday = Math.max(4, (baseHotToday - baseColdToday) / 2);
  const midFut = (hotFutureC + coldTodayC) / 2;
  const ampFut = Math.max(4, (hotFutureC - coldTodayC) / 2);
  const monthlyShift = MONTH_NAMES.map((month, i) => {
    const wave = -Math.cos(((i) / 12) * Math.PI * 2);
    const todayC = Math.round((midToday + ampToday * wave) * 10) / 10;
    const futureC = Math.round((midFut + ampFut * wave) * 10) / 10;
    return {
      month,
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
    impactLine: `${holdsStrong.length} resilient · ${watch.length} stressed · ${critical.length} critical`,
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
  const moduleLabel = isModule
    ? `Repeatable 10 m × 10 m field module (${Math.max(1, Math.round(plan.netAreaM2 / 100))}× modules across plot)`
    : `${widthM} m × ${heightM} m net planting bed`;

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
    { month: 'Jan', tag: 'Order', brief: hasSeeds ? 'Order direct-sow seed packs and check bare-root delivery dates.' : 'Confirm nursery dispatch dates and inspect soil drainage.' },
    { month: 'Feb', tag: 'Prep', brief: mild ? 'Lay 10 cm wood-chip mulch and plant early bare-root stock.' : 'Order 2 L pots and plugs; stage stakes and compost.' },
    { month: 'Mar', tag: 'Plant', brief: hasBareRoot ? 'Plant dormant bare-root trees and stake against spring wind.' : 'Prepare planting pockets with compost and mycorrhizal mulch.' },
    { month: 'Apr', tag: 'Establish', brief: 'Set out potted shrubs and perennials; water deeply after planting.' },
    { month: 'May', tag: 'Sow', brief: hasSeeds ? 'Direct-sow warm-season annuals and living mulch lines after last frost.' : 'Check young shoot growth and top up mulch rings.' },
    { month: 'Jun', tag: 'Mulch', brief: 'Deep-soak establishment watering twice weekly during dry spells.' },
    { month: 'Jul', tag: 'Buffer', brief: 'Chop-and-drop fast biomass to shade soil before peak summer heat.' },
    { month: 'Aug', tag: 'Harvest', brief: 'Harvest early fruit/greens; keep young roots cool under 10 cm mulch.' },
    { month: 'Sep', tag: 'Order', brief: 'Reserve autumn bare-root trees and spring-flowering bulbs.' },
    { month: 'Oct', tag: 'Autumn', brief: 'Plant hardy divisions and bulbs while soil retains autumn warmth.' },
    { month: 'Nov', tag: 'Dormant', brief: mild ? 'Begin main winter bare-root planting wave.' : 'Add winter mulch collars around young woody stems.' },
    { month: 'Dec', tag: 'Review', brief: 'Record survival notes and update quantities for next season.' },
  ];
}
