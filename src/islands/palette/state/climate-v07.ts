// Reactive canopi-climate v0.7.0 Rust WASM engine controller (Stage 3).
// - Tier 1/2A/2B progressive tile hydration (never blocks initial site pick or first-run JS).
// - Engine 1: Root-Zone Water Tank (Rust soilAwc + cfvo rock-fragment adjustment vs CDD/VPD).
// - Engine 3: Rust adjustMicroclimate() (48-step ENU solar + clamped elevation lapse + katabatic pooling).
// - Engine 4: In-browser analogues.bin (findAnalogues) + Fishman Chill Portions + Rust evaluateTrajectory().
// Dynamic imports keep both src/lib/climate and climateWasm 100% lazy off the first-run bundle.
import { signal } from '@preact/signals';
import type { PlantId, SiteLocation, SiteV07, Taxon } from '../../../lib/palette/index.ts';
import type {
  AnalogueResult,
  MicroclimateAdjustment,
  TopoPosition,
  TrajectoryResult,
  WasmSiteClimate,
} from '../../../lib/climate/wasm-bridge.ts';
import type { SiteLookup as ReaderSiteLookup, SiteMonthly, SiteTier1, SiteTier2A, TileSource } from '../../../lib/climate/index.ts';
import type { MicroAspect, MicroclimateState, MicroLandform } from './studio.ts';
import * as store from '../store.ts';
import { microclimate } from './studio.ts';

interface SiteAnalogueView {
  siteKey: string;
  horizon: '2041-2070' | '2071-2099';
  result: AnalogueResult;
  queryMs: number;
}

/** Latest Rust WASM adjustMicroclimate() output for the active site & tuner state. */
const wasmMicro = signal<MicroclimateAdjustment | null>(null);
/** Latest in-browser analogues.bin findAnalogues() result for the active site & horizon. */
export const siteAnalogue = signal<SiteAnalogueView | null>(null);
const analogueStatus = signal<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
/** Latest Rust WASM evaluateTrajectory() results keyed by PlantId. */
const wasmTrajectories = signal<ReadonlyMap<PlantId, TrajectoryResult>>(new Map());

let sharedSource: TileSource | null = null;
async function ensureTileSource(provided?: TileSource | null): Promise<TileSource | null> {
  if (provided) {
    sharedSource = provided;
    return provided;
  }
  if (sharedSource) return sharedSource;
  if (typeof document === 'undefined') return null;
  const raw = document.getElementById('ct-climate')?.textContent;
  if (!raw) return null;
  const { createTileSource, siteIndex } = await import('../../../lib/climate/index.ts');
  sharedSource = createTileSource({ index: siteIndex(JSON.parse(raw)) });
  return sharedSource;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

function inferLandform(handM: number | null, reliefM: number | null): MicroLandform {
  if (handM != null && handM <= 5 && (reliefM ?? 0) >= 80) return 'valley';
  if (handM != null && handM >= 80) return 'ridge';
  return 'mid-slope';
}

function aspectToDeg(aspect: MicroAspect): number {
  if (aspect === 'north') return 0;
  if (aspect === 'east') return 90;
  if (aspect === 'south') return 180;
  if (aspect === 'west') return 270;
  return 0;
}

function landformToTopo(landform: MicroLandform, frostPocket: boolean): TopoPosition {
  if (landform === 'ridge') return 'ridge';
  if (landform === 'valley') return frostPocket ? 'frost_hollow' : 'valley_bottom';
  return 'mid_slope';
}

function elevClampOf(reliefM: number | null | undefined): number {
  return Math.max(150, Math.round((reliefM ?? 0) / 2));
}

/** Build the structural SiteV07 Tier 1 slice from raw Rust WASM tier1 lookup. */
export function buildTier1V07(tier1: SiteTier1 | null | undefined): Pick<SiteV07, 'extremes' | 'frostCalendar' | 'terrain'> {
  const out: Pick<SiteV07, 'extremes' | 'frostCalendar' | 'terrain'> = {};
  if (tier1?.extremes) {
    const periods = tier1.extremes.periods;
    const pToday = periods.find((p) => p.period === '1991-2020') ?? periods[0];
    const p2050 = periods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245')
      ?? periods.find((p) => p.period === '2041-2070');
    const p2080 = periods.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245')
      ?? periods.find((p) => p.period === '2071-2099');
    if (pToday) {
      out.extremes = {
        tminExtremeC: pToday.tmin_extreme_c,
        tmaxExtremeC: pToday.tmax_extreme_c,
        usdaZone: pToday.usda_zone ?? null,
        futureTminExtremeC: p2050?.tmin_extreme_c ?? null,
        futureTmaxExtremeC: p2050?.tmax_extreme_c ?? null,
        lateTminExtremeC: p2080?.tmin_extreme_c ?? null,
        lateTmaxExtremeC: p2080?.tmax_extreme_c ?? null,
        periods: periods.map((p) => ({
          period: p.period,
          scenario: p.scenario,
          tminExtremeC: p.tmin_extreme_c,
          tmaxExtremeC: p.tmax_extreme_c,
          usdaZone: p.usda_zone ?? null,
        })),
      };
    }
  }
  if (tier1?.frostCalendar) {
    const fc = tier1.frostCalendar;
    out.frostCalendar = {
      lastSpringDoy: fc.last_spring_frost_doy,
      lastSpringP90Doy: fc.last_spring_frost_p90_doy,
      firstAutumnDoy: fc.first_autumn_frost_doy,
      frostFreeDays: fc.frost_free_days,
      frostYearPct: fc.frost_year_pct,
      falseSpringPct: fc.false_spring_pct,
      frostFree: fc.regime === 'frost_free',
      yearRoundFrost: fc.regime === 'year_round',
    };
  }
  if (tier1?.terrain) {
    const tr = tier1.terrain;
    const landform = inferLandform(tr.hand_m, tr.relief_m);
    const frostPocket = landform === 'valley' || (tr.hand_m != null && tr.hand_m <= 5 && (tr.relief_m ?? 0) >= 80);
    out.terrain = {
      elevM: Math.round(tr.elev_m),
      reliefM: tr.relief_m != null ? Math.round(tr.relief_m) : null,
      slopeDeg: tr.slope_deg != null ? r1(tr.slope_deg) : null,
      handM: tr.hand_m != null ? r1(tr.hand_m) : null,
      landform,
      frostPocket,
    };
  }
  return out;
}

/** Auto-seed SiteTuner slope & landform from v0.7.0 terrain without clobbering explicit user edits. */
export function seedMicroclimateFromTerrain(v07: SiteV07 | null | undefined, force = false): void {
  const tr = v07?.terrain;
  if (!tr) return;
  const cur = microclimate.peek();
  const next: MicroclimateState = {
    slopeDeg: (!force && cur.editedSlope) ? cur.slopeDeg : (tr.slopeDeg ?? 0),
    aspect: (!force && cur.editedAspect) ? cur.aspect : 'flat',
    landform: (!force && cur.editedLandform) ? cur.landform : tr.landform,
    elevOffsetM: (!force && cur.editedElev) ? cur.elevOffsetM : 0,
    editedSlope: force ? false : cur.editedSlope,
    editedAspect: force ? false : cur.editedAspect,
    editedLandform: force ? false : cur.editedLandform,
    editedElev: force ? false : cur.editedElev,
  };
  microclimate.value = next;
}

/** Build Tier 2A SiteV07 slice using native Rust WASM soilAwcWithRock + interpolateChillPortions. */
export async function buildTier2AV07(
  loc: SiteLocation,
  tier2A: SiteTier2A,
  existingV07?: SiteV07 | null,
): Promise<Partial<SiteV07>> {
  const { interpolateChillPortions, wasmSoilAwcWithRock } = await import('../../../lib/climate/wasm-bridge.ts');
  const out: Partial<SiteV07> = {};
  const ext = existingV07?.extremes;
  const periods = loc.lookup?.climate?.periods ?? [];
  const pToday = periods.find((p) => p.period === '1991-2020') ?? periods[0] ?? null;
  const p2050 = periods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245')
    ?? periods.find((p) => p.period === '2041-2070') ?? null;
  const p2080 = periods.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245')
    ?? periods.find((p) => p.period === '2071-2099') ?? null;

  if (tier2A.extremesTail) {
    const et = tier2A.extremesTail;
    const coldTail10yrC = ext && et.tmin_p10_gap_c != null ? r1(ext.tminExtremeC + et.tmin_p10_gap_c) : null;
    const heatDome10yrC = ext && et.tmax_p90_gap_c != null ? r1(ext.tmaxExtremeC + et.tmax_p90_gap_c) : null;
    const coldTail10yr2050C = ext?.futureTminExtremeC != null && et.tmin_p10_gap_c != null
      ? r1(ext.futureTminExtremeC + et.tmin_p10_gap_c)
      : null;
    const heatDome10yr2050C = ext?.futureTmaxExtremeC != null && et.tmax_p90_gap_c != null
      ? r1(ext.futureTmaxExtremeC + et.tmax_p90_gap_c)
      : null;
    out.extremesTail = {
      coldTail10yrC,
      heatDome10yrC,
      coldTail10yr2050C,
      heatDome10yr2050C,
      tminP10GapC: et.tmin_p10_gap_c,
      tmaxP90GapC: et.tmax_p90_gap_c,
      heatDays35: et.heat_days_35c != null ? r1(et.heat_days_35c) : null,
      recentTrendC: et.recent_trend_c != null ? r1(et.recent_trend_c) : null,
      p90DryStreakDays: tier2A.waterBalance?.cdd_max_days ?? null,
    };
  }

  if (tier2A.phenology) {
    const ph = tier2A.phenology;
    const d2050 = p2050 && pToday ? Math.max(0, p2050.tmeanColdC - pToday.tmeanColdC) : null;
    const d2080 = p2080 && pToday ? Math.max(0, p2080.tmeanColdC - pToday.tmeanColdC) : null;
    out.phenology = {
      chillPortionsToday: Math.round(interpolateChillPortions(ph, 0)),
      chillPortions2050: d2050 !== null ? Math.round(interpolateChillPortions(ph, d2050)) : null,
      chillPortions2080: d2080 !== null ? Math.round(interpolateChillPortions(ph, d2080)) : null,
      chillCurve: [
        ph.chill_portions_0c,
        ph.chill_portions_1c,
        ph.chill_portions_2c,
        ph.chill_portions_3c,
        ph.chill_portions_4c,
      ],
    };
  }

  if (tier2A.waterBalance) {
    const wb = tier2A.waterBalance;
    out.waterBalance = {
      cwdMm: wb.cwd_mm != null ? Math.round(wb.cwd_mm) : null,
      cwdP90Mm: wb.cwd_p90_mm != null ? Math.round(wb.cwd_p90_mm) : null,
      cddDays: wb.cdd_max_days != null ? Math.round(wb.cdd_max_days) : null,
      vpdSummerKpa: wb.vpd_summer_kpa != null ? Math.round(wb.vpd_summer_kpa * 100) / 100 : null,
      annualDeficitMm: wb.cwd_mm != null ? Math.round(wb.cwd_mm) : null,
    };
  }

  if (tier2A.soilPlus) {
    const sp = tier2A.soilPlus;
    const sand = loc.lookup?.soil?.sandPct ?? null;
    const clay = loc.lookup?.soil?.clayPct ?? null;
    const vpd = tier2A.waterBalance?.vpd_summer_kpa ?? null;
    let awcMmPerM: number | null = null;
    let dryDaysReserve: number | null = null;
    if (sand !== null && clay !== null) {
      try {
        const awc = await wasmSoilAwcWithRock(
          sand,
          clay,
          sp.om_0_30_pct,
          sp.cfvo_0_30_pct,
          sp.cfvo_30_100_pct,
        );
        if (awc) {
          awcMmPerM = Math.round(awc.awc_mm_per_m);
          const etMmDay = vpd !== null ? Math.max(3.0, Math.min(7.5, 3.2 + vpd * 1.4)) : null;
          dryDaysReserve = etMmDay !== null ? Math.max(1, Math.round(awc.awc_100cm_mm / etMmDay)) : null;
        }
      } catch {
        awcMmPerM = null;
        dryDaysReserve = null;
      }
    }
    out.soilPlus = {
      ph30_100: sp.ph_30_100 != null ? r1(sp.ph_30_100) : null,
      clay30_100: sp.clay_30_100_pct != null ? Math.round(sp.clay_30_100_pct) : null,
      cfvo0_30: sp.cfvo_0_30_pct != null ? Math.round(sp.cfvo_0_30_pct) : null,
      cfvo30_100: sp.cfvo_30_100_pct != null ? Math.round(sp.cfvo_30_100_pct) : null,
      om0_30Pct: sp.om_0_30_pct != null ? r1(sp.om_0_30_pct) : null,
      awcMmPerM,
      dryDaysReserve,
    };
  }

  return out;
}

/** Build Tier 2B monthly curves from monthly + monthly_precip tiles. */
export function buildMonthlyV07(data: SiteMonthly): SiteV07['monthly'] {
  const mPeriods = data.monthly?.periods ?? [];
  const pPeriods = data.monthlyPrecip?.periods ?? [];
  const mToday = mPeriods.find((p) => p.period === '1991-2020') ?? mPeriods[0];
  if (!mToday) return null;
  const m2050 = mPeriods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245')
    ?? mPeriods.find((p) => p.period === '2041-2070') ?? mToday;
  const m2080 = mPeriods.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245')
    ?? mPeriods.find((p) => p.period === '2071-2099') ?? m2050;
  const pToday = pPeriods.find((p) => p.period === '1991-2020') ?? pPeriods[0] ?? null;
  const p2050 = pPeriods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245')
    ?? pPeriods.find((p) => p.period === '2041-2070') ?? pToday;
  const p2080 = pPeriods.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245')
    ?? pPeriods.find((p) => p.period === '2071-2099') ?? null;

  const precipToday = pToday?.precip_mm.map((v) => Math.round(v)) ?? Array<number>(12).fill(50);
  const precip2050 = p2050?.precip_mm.map((v) => Math.round(v)) ?? precipToday;
  const precip2080 = p2080?.precip_mm.map((v) => Math.round(v));
  const dryMonths = Array.from({ length: 12 }, (_, i) => ((mToday.dry_mask >> i) & 1) === 1);
  const frostMonths = mToday.tmin_c.map((t) => t <= 2.0);

  return {
    tmeanTodayC: mToday.tmean_c.map(r1),
    tminTodayC: mToday.tmin_c.map(r1),
    tmean2050C: m2050.tmean_c.map(r1),
    tmean2080C: m2080.tmean_c.map(r1),
    precipTodayMm: precipToday,
    precip2050Mm: precip2050,
    ...(precip2080 ? { precip2080Mm: precip2080 } : {}),
    dryMonths,
    frostMonths,
    gddBase10Today: Math.round(mToday.gdd_base_10),
    gddBase10_2050: Math.round(m2050.gdd_base_10),
  };
}

/** Schedule Tier 2A idle prefetch (extremes_tail, phenology, water_balance, soil_plus) after site pick. */
export function scheduleTier2APrefetch(
  loc: SiteLocation,
  source: TileSource,
  patchQuietly: (patch: Partial<SiteV07>) => void,
): void {
  const run = () => {
    void (async () => {
      try {
        const { lookupSiteTier2A } = await import('../../../lib/climate/index.ts');
        if (!loc.lookup) return;
        const tier2A = await lookupSiteTier2A(loc.lookup as unknown as ReaderSiteLookup, source);
        if (store.location.peek()?.lat !== loc.lat || store.location.peek()?.lon !== loc.lon) return;
        const v07Patch = await buildTier2AV07(loc, tier2A, store.location.peek()?.lookup?.v07);
        if (store.location.peek()?.lat !== loc.lat || store.location.peek()?.lon !== loc.lon) return;
        patchQuietly(v07Patch);
      } catch {
        // Optional Tier 2A tiles degrade gracefully without blocking the site.
      }
    })();
  };
  if (typeof window !== 'undefined' && typeof (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback === 'function') {
    (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

let monthlyInFlight: string | null = null;
/** Tier 2B: On-demand monthly + monthly_precip fetch (Walter-Lieth & Growing Year sparkline). */
async function loadSiteMonthly(loc: SiteLocation | null): Promise<void> {
  if (!loc?.lookup?.climate || loc.lookup.v07?.monthly) return;
  const key = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
  if (monthlyInFlight === key) return;
  monthlyInFlight = key;
  try {
    const src = await ensureTileSource();
    if (!src) return;
    const { lookupSiteMonthly } = await import('../../../lib/climate/index.ts');
    const data = await lookupSiteMonthly(loc.lookup as unknown as ReaderSiteLookup, src);
    const monthly = buildMonthlyV07(data);
    const cur = store.location.peek();
    if (!monthly || !cur?.lookup || cur.lat !== loc.lat || cur.lon !== loc.lon) return;
    store.location.value = {
      ...cur,
      lookup: { ...cur.lookup, v07: { ...(cur.lookup.v07 ?? {}), monthly } },
    };
  } catch {
    // Graceful fallback if monthly tiles are unavailable.
  } finally {
    if (monthlyInFlight === key) monthlyInFlight = null;
  }
}

let analogueInFlight: string | null = null;
/** Tier 2B: On-demand in-browser analogues.bin k-NN lookup via Rust WASM findAnalogues(). */
export async function loadSiteAnalogues(
  loc: SiteLocation | null,
  horizon: '2041-2070' | '2071-2099' = '2041-2070',
): Promise<void> {
  if (!loc?.lookup?.climate) {
    siteAnalogue.value = null;
    analogueStatus.value = 'idle';
    return;
  }
  const siteKey = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
  const key = `${siteKey}:${horizon}`;
  if (analogueInFlight === key) return;
  const cur = siteAnalogue.peek();
  if (cur && cur.siteKey === siteKey && cur.horizon === horizon && analogueStatus.peek() === 'ready') return;
  if (cur && cur.siteKey !== siteKey) siteAnalogue.value = null;
  analogueInFlight = key;
  analogueStatus.value = 'loading';
  try {
    const src = await ensureTileSource();
    if (!src || !src.hasAnalogues?.()) {
      analogueStatus.value = 'unavailable';
      return;
    }
    const { lookupSiteAnalogues } = await import('../../../lib/climate/index.ts');
    const periods = loc.lookup.climate.periods;
    const target = periods.find((p) => p.period === horizon && p.scenario === 'ssp245')
      ?? periods.find((p) => p.period === horizon)
      ?? periods[0];
    if (!target) {
      analogueStatus.value = 'unavailable';
      return;
    }
    const monthly = loc.lookup.v07?.monthly;
    let summerRainFrac = 0.25;
    if (monthly && monthly.precip2050Mm.length === 12) {
      const total = monthly.precip2050Mm.reduce((a, b) => a + b, 0);
      const warmIdx = loc.lat < 0 ? [11, 0, 1] : [5, 6, 7];
      const warmSum = warmIdx.reduce((a, i) => a + (monthly.precip2050Mm[i] ?? 0), 0);
      if (total > 0) summerRainFrac = Math.round((warmSum / total) * 100) / 100;
    }
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = await lookupSiteAnalogues(
      src,
      {
        lat: loc.lat,
        lon: loc.lon,
        tmean_cold_c: target.tmeanColdC,
        tmean_warm_c: target.tmeanWarmC,
        tmin_cold_c: target.tminColdC,
        tmax_warm_c: target.tmaxWarmC,
        precip_mm: target.precipMm,
        aridity_index: target.aridityIndex,
        dry_months: target.dryMonths,
        summer_rain_frac: summerRainFrac,
      },
      { k: 3, exclude_radius_km: 50 },
    );
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latest = store.location.peek();
    if (latest && `${latest.lat.toFixed(3)},${latest.lon.toFixed(3)}` !== siteKey) return;
    if (!result) {
      analogueStatus.value = 'unavailable';
      return;
    }
    siteAnalogue.value = { siteKey, horizon, result, queryMs: Math.max(0.1, Math.round((t1 - t0) * 10) / 10) };
    analogueStatus.value = 'ready';
  } catch {
    analogueStatus.value = 'unavailable';
  } finally {
    if (analogueInFlight === key) analogueInFlight = null;
  }
}

let microSeq = 0;
/** Engine 3: Run Rust WASM adjustMicroclimate() whenever location or SiteTuner microclimate changes. */
export async function syncWasmMicroclimate(loc: SiteLocation | null, mc: MicroclimateState): Promise<void> {
  if (!loc?.lookup?.climate) {
    wasmMicro.value = null;
    return;
  }
  const pToday = loc.lookup.climate.periods[0];
  if (!pToday) {
    wasmMicro.value = null;
    return;
  }
  const seq = ++microSeq;
  try {
    const { wasmAdjustMicroclimate } = await import('../../../lib/climate/wasm-bridge.ts');
    const v07 = loc.lookup.v07;
    const cellElev = v07?.terrain?.elevM ?? 100;
    const siteInput: WasmSiteClimate = {
      lat: loc.lat,
      tmean_cold_c: pToday.tmeanColdC,
      tmean_warm_c: pToday.tmeanWarmC,
      tmin_cold_c: pToday.tminColdC,
      tmax_warm_c: pToday.tmaxWarmC,
      tmin_extreme_c: v07?.extremes?.tminExtremeC ?? null,
      tmax_extreme_c: v07?.extremes?.tmaxExtremeC ?? null,
      tmin_p10_gap_c: v07?.extremesTail?.tminP10GapC ?? null,
      tmax_p90_gap_c: v07?.extremesTail?.tmaxP90GapC ?? null,
      chill_portions_curve: v07?.phenology?.chillCurve ? [...v07.phenology.chillCurve] : null,
      cwd_mm: v07?.waterBalance?.cwdMm ?? null,
      cell_terrain: {
        elev_m: cellElev,
        relief_m: v07?.terrain?.reliefM ?? null,
        slope_deg: v07?.terrain?.slopeDeg ?? null,
        hand_m: v07?.terrain?.handM ?? null,
      },
    };
    const adj = await wasmAdjustMicroclimate(siteInput, {
      site_elev_m: cellElev + (mc.elevOffsetM ?? 0),
      slope_deg: mc.slopeDeg,
      aspect_deg: aspectToDeg(mc.aspect),
      topo_position: landformToTopo(mc.landform, Boolean(v07?.terrain?.frostPocket)),
    });
    if (seq === microSeq) wasmMicro.value = adj;
  } catch {
    // Keep previous or null if WASM unavailable.
  }
}

let trajSeq = 0;
/** Engine 4: Run Rust WASM evaluateTrajectory() for active palette members. */
async function syncWasmTrajectories(
  members: readonly Taxon[],
  loc: SiteLocation | null,
  winterDeltaC = 0,
  heatDeltaC = 0,
): Promise<void> {
  if (!loc?.lookup?.climate || !members.length) {
    wasmTrajectories.value = new Map();
    return;
  }
  const seq = ++trajSeq;
  try {
    const { wasmEvaluateTrajectory } = await import('../../../lib/climate/wasm-bridge.ts');
    const v07 = loc.lookup.v07;
    const pToday = loc.lookup.climate.periods[0];
    const p2050 = loc.lookup.climate.periods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245') ?? pToday;
    const p2080 = loc.lookup.climate.periods.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245') ?? p2050;
    const micro = wasmMicro.peek();

    const tminGap = v07?.extremesTail?.tminP10GapC ?? null;
    const tmaxGap = v07?.extremesTail?.tmaxP90GapC ?? null;
    const ext2050 = v07?.extremes?.periods?.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245');
    const ext2080 = v07?.extremes?.periods?.find((p) => p.period === '2071-2099' && p.scenario === 'ssp245');

    // Never invent extreme values from monthly means; leave null (unknown) when extreme tiles/gaps are absent.
    const freezeToday = micro?.tmin_p10_c ?? v07?.extremesTail?.coldTail10yrC ?? null;
    const freeze2050 = v07?.extremesTail?.coldTail10yr2050C
      ?? (ext2050 && tminGap !== null ? ext2050.tminExtremeC + tminGap : null);
    const freeze2080 = ext2080 && tminGap !== null
      ? ext2080.tminExtremeC + tminGap
      : (v07?.extremes?.lateTminExtremeC != null && tminGap !== null ? v07.extremes.lateTminExtremeC + tminGap : null);
    const heatToday = micro?.tmax_p90_c ?? v07?.extremesTail?.heatDome10yrC ?? null;
    const heat2050 = v07?.extremesTail?.heatDome10yr2050C
      ?? (ext2050 && tmaxGap !== null ? ext2050.tmaxExtremeC + tmaxGap : null);
    const heat2080 = ext2080 && tmaxGap !== null
      ? ext2080.tmaxExtremeC + tmaxGap
      : (v07?.extremes?.lateTmaxExtremeC != null && tmaxGap !== null ? v07.extremes.lateTmaxExtremeC + tmaxGap : null);

    const cwdBase = micro?.cwd_adjusted_mm ?? v07?.waterBalance?.cwdMm ?? null;
    const siteInput = {
      today: {
        label: '1991-2020',
        tmin_extreme_c: freezeToday !== null ? r1(freezeToday + winterDeltaC) : null,
        tmax_extreme_c: heatToday !== null ? r1(heatToday + heatDeltaC * 0.5) : null,
        cwd_mm: cwdBase,
        precip_mm: pToday?.precipMm ?? null,
        dry_months: pToday?.dryMonths ?? null,
        chill_portions: micro?.chill_portions ?? v07?.phenology?.chillPortionsToday ?? null,
      },
      mid_century: {
        label: '2041-2070',
        tmin_extreme_c: freeze2050 !== null ? r1(freeze2050 + winterDeltaC) : null,
        tmax_extreme_c: heat2050 !== null ? r1(heat2050 + heatDeltaC) : null,
        cwd_mm: cwdBase != null ? Math.round(cwdBase * 1.15) : null,
        precip_mm: p2050?.precipMm ?? null,
        dry_months: p2050?.dryMonths ?? null,
        chill_portions: v07?.phenology?.chillPortions2050 ?? null,
      },
      late_century: {
        label: '2071-2099',
        tmin_extreme_c: freeze2080 !== null ? r1(freeze2080 + winterDeltaC) : null,
        tmax_extreme_c: heat2080 !== null ? r1(heat2080 + heatDeltaC * 1.2) : null,
        cwd_mm: cwdBase != null ? Math.round(cwdBase * 1.28) : null,
        precip_mm: p2080?.precipMm ?? null,
        dry_months: p2080?.dryMonths ?? null,
        chill_portions: v07?.phenology?.chillPortions2080 ?? null,
      },
      ph_topsoil: loc.lookup.soil?.phH2o ?? null,
      ph_subsoil: v07?.soilPlus?.ph30_100 ?? null,
      hand_m: v07?.terrain?.handM ?? null,
      clay_30_100_pct: v07?.soilPlus?.clay30_100 ?? null,
      false_spring_pct: v07?.frostCalendar?.falseSpringPct ?? null,
      evaluated_layers: ['tiles', 'soil', 'extremes', 'frost_calendar', 'terrain', 'phenology', 'water_balance', 'soil_plus'],
    };

    const next = new Map<PlantId, TrajectoryResult>();
    for (const t of members) {
      const isAnnual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
      const isEvergreen = Boolean(t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen));
      const res = await wasmEvaluateTrajectory(siteInput, {
        min_tmin_extreme_c: isAnnual ? null : (t.climate?.tminCold?.low ?? null),
        max_tmax_extreme_c: t.climate?.tmaxWarm?.high != null ? t.climate.tmaxWarm.high + 6 : null,
        min_chill_portions: isAnnual || isEvergreen ? null : 35,
        min_ph: t.traits.soil_ph?.min ?? null,
        max_ph: t.traits.soil_ph?.max ?? null,
      });
      next.set(t.id, res);
    }
    if (seq === trajSeq) wasmTrajectories.value = next;
  } catch {
    // Graceful fallback if WASM unavailable.
  }
}

export function clearSiteV07Caches(): void {
  wasmMicro.value = null;
  siteAnalogue.value = null;
  analogueStatus.value = 'idle';
  wasmTrajectories.value = new Map();
}
