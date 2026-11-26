// Wave 6 Climate-Resilient Agroecological Recommendation Engine (L0 core).
// Pure, framework-free, deterministic module powering:
//   1. Starter Guild Synthesis (selectStarterPalette)
//   2. Picker Companion & Gap-Fill Ranking (rankCandidatesForGuild)
//   3. Climate-Resilient Like-for-Like Swaps (findCompatibleSwaps)
//
// Hard product invariant ("Inform, don't block", owner 2026-11-25):
//   NEVER read, exclude, or penalize toxicity, invasive_in, weed_potential, or flat allelopathic flags.
//   NEVER add non-agroecological photo bias.
import type {
  ClimateZone,
  Interaction,
  JobId,
  LayerValue,
  PlantId,
  SiteLookup,
  Taxon,
} from './types.ts';
import { jobIds } from './types.ts';
import { jobsOf } from './jobs.ts';
import {
  computeGrowingYear,
  crownAreaM2,
  evaluatePlantVerdict,
  isAnnualTaxon,
  isStructuralVine,
  matchPaletteInteractions,
  resolveEffectiveSite,
  sizeClassOf,
  type EffectiveSiteClimate,
  type PalettePairInteraction,
  type ReportHorizonId,
  type ReportPlantVerdict,
  type ReportSiteOverrides,
  type SizeClass,
} from './report.ts';

// ---- A3: Documented Managed-Size Orchard Genera ----
// Genera routinely grown on dwarfing rootstocks or pruned to managed orchard scale (~8 m height, <= 50 m² Layer-1 cap).
// Large timber/nut forest trees (Juglans, Carya, Castanea, Artocarpus, Cocos, Bertholletia) are intentionally excluded
// and keep their true wild dimensions. (Lasting home: canopi-data `managed_height_m` trait.)
export const MANAGED_ORCHARD_GENERA: ReadonlySet<string> = new Set([
  'Malus', 'Pyrus', 'Prunus', 'Cydonia', 'Mespilus',
  'Citrus', 'Ficus', 'Olea', 'Punica', 'Ceratonia',
  'Diospyros', 'Eriobotrya', 'Psidium', 'Mangifera', 'Persea',
  'Morus', 'Corylus', 'Ziziphus', 'Crataegus', 'Argania',
  'Phoenix', 'Arbutus', 'Sorbus', 'Annona', 'Garcinia', 'Nephelium',
]);

export function isManagedOrchardTree(taxon: Taxon): boolean {
  return sizeClassOf(taxon) === 'tree' && MANAGED_ORCHARD_GENERA.has(taxon.genus);
}

// ---- Structured Score Breakdown & Explainable Reasons ----

export type LimitingBound = 'cold' | 'mild' | 'cool' | 'hot' | 'dry' | 'wet' | null;

export type RecommendReasonCode =
  | 'fills_gap'
  | 'backs_up_2050'
  | 'yield_gain'
  | 'shared_pest'
  | 'conflict'
  | 'understory_shade'
  | 'seasonality'
  | 'fits_2050'
  | 'unknown_2050'
  | 'response_diverse';

export interface RecommendReason {
  code: RecommendReasonCode;
  job?: JobId;
  partnerId?: PlantId;
  partnerName?: string;
}

export interface ScoreBreakdown {
  climate: number;
  headroom: number;
  ripening: number;
  koppen: number;
  ph: number;
  edibility: number;
  synergy: number;
  interactions: number;
  uncertainty: number;
  total: number;
}

export interface CandidateEvaluation {
  taxon: Taxon;
  score: number;
  breakdown: ScoreBreakdown;
  verdictToday: ReportPlantVerdict;
  verdictTarget: ReportPlantVerdict;
  verdict2050: ReportPlantVerdict | null;
  sspAgreement: number | null;
  limitingBound: LimitingBound;
  reasons: RecommendReason[];
  conflicts: PalettePairInteraction[];
  yieldGains: PalettePairInteraction[];
}

export interface RecommendContext {
  effToday: EffectiveSiteClimate;
  eff2050?: EffectiveSiteClimate | null;
  lookup?: SiteLookup | null;
  overrides?: ReportSiteOverrides;
  climateZone?: ClimateZone | null;
  interactions?: readonly Interaction[];
  layerValuesByPlant?: ReadonlyMap<PlantId, readonly LayerValue[]>;
  existingIds?: ReadonlySet<PlantId>;
}

export interface StarterOptions {
  maxPlants?: number;
  existingIds?: ReadonlySet<PlantId>;
  eff2050?: EffectiveSiteClimate | null;
  lookup?: SiteLookup | null;
  overrides?: ReportSiteOverrides;
  climateZone?: ClimateZone | null;
  interactions?: readonly Interaction[];
  layerValuesByPlant?: ReadonlyMap<PlantId, readonly LayerValue[]>;
}

export interface SwapCandidate {
  taxon: Taxon;
  verdict: ReportPlantVerdict;
  sharedJobs: JobId[];
  sizeClass: SizeClass;
  score: number;
}

// ---- Lifespan-Aware Target Horizon (A2) ----

export function targetHorizonForTaxon(taxon: Taxon): ReportHorizonId {
  if (isAnnualTaxon(taxon)) return 'today';
  const end = taxon.phases?.end ?? null;
  if (end === 'placenta_i' || end === 'placenta_ii' || end === 'placenta_iii') return 'today';
  if (end === 'climax' || sizeClassOf(taxon) === 'tree') return 'y2080_ssp245';
  return 'y2050';
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

// ---- Climate Margin, Headroom, Ripening Heat (A2, A10), Köppen & pH ----

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeHeadroom(
  taxon: Taxon,
  eff: EffectiveSiteClimate,
): { headroom: number; ripening: number; limitingBound: LimitingBound } {
  const cl = taxon.climate;
  if (!eff.hasClimate || !cl) return { headroom: 0, ripening: 0, limitingBound: null };
  const annual = isAnnualTaxon(taxon);
  const margins: { bound: Exclude<LimitingBound, null>; norm: number }[] = [];

  if (!annual && cl.tminCold?.low != null && eff.tminColdC !== null) {
    const span = Math.max(6, (cl.tminCold.high ?? cl.tminCold.low + 15) - cl.tminCold.low);
    margins.push({ bound: 'cold', norm: (eff.tminColdC - cl.tminCold.low) / span });
  }
  if (!annual && cl.tminCold?.high != null && cl.tminCold.high < 18 && eff.tminColdC !== null) {
    const span = Math.max(6, cl.tminCold.high - (cl.tminCold.low ?? cl.tminCold.high - 15));
    margins.push({ bound: 'mild', norm: (cl.tminCold.high - eff.tminColdC) / span });
  }
  if (!annual && cl.tmeanYear?.low != null && eff.tmeanYearC !== null) {
    const span = Math.max(6, (cl.tmeanYear.high ?? cl.tmeanYear.low + 12) - cl.tmeanYear.low);
    margins.push({ bound: 'cool', norm: (eff.tmeanYearC - cl.tmeanYear.low) / span });
  }
  if (cl.tmaxWarm?.high != null && eff.tmaxWarmC !== null && !annual) {
    const span = Math.max(6, cl.tmaxWarm.high - (cl.tmaxWarm.low ?? cl.tmaxWarm.high - 12));
    margins.push({ bound: 'hot', norm: (cl.tmaxWarm.high - eff.tmaxWarmC) / span });
  }

  // Moisture headroom (log-ratio inside [low, high]); dry side zeroed under regular watering (A1)
  if (cl.precip?.low != null && cl.precip.low > 0 && cl.precip.high != null && cl.precip.high > cl.precip.low && eff.precipMm != null && eff.precipMm > 0) {
    const logSpan = Math.max(0.4, Math.log(cl.precip.high / cl.precip.low));
    if (eff.watering !== 'all-year') {
      margins.push({ bound: 'dry', norm: Math.log(eff.precipMm / cl.precip.low) / logSpan });
    }
    margins.push({ bound: 'wet', norm: Math.log(cl.precip.high / eff.precipMm) / logSpan });
  }

  let limitingBound: LimitingBound = null;
  let minNorm = 0.5;
  if (margins.length) {
    margins.sort((a, b) => a.norm - b.norm);
    limitingBound = margins[0].bound;
    minNorm = margins[0].norm;
  }

  // Normalised headroom score: -12 (beyond bound) to +24 (comfortably inside center)
  const headroom = minNorm < 0
    ? Math.max(-12, minNorm * 24)
    : clamp01(minNorm / 0.45) * 24;

  // A10: Ripening & summer-warmth headroom for fruiting perennials AND warm-season annuals (ranking only, never a verdict change)
  let ripening = 0;
  if (cl.tmeanWarm?.low != null && eff.tmeanWarmC !== null && (annual || jobsOf(taxon).includes('feeds_you'))) {
    const diff = eff.tmeanWarmC - cl.tmeanWarm.low;
    if (diff < 0) ripening = annual ? Math.max(-24, diff * 4.5) : Math.max(-14, diff * 2.5);
    else if (!annual) ripening = Math.min(8, diff * 1.2);
  }

  return { headroom, ripening, limitingBound };
}

function siteKoppenScore(taxon: Taxon, eff: EffectiveSiteClimate): number {
  const kList = taxon.koppen;
  if (!eff.koppen || !kList?.length) return 0;
  const siteK = eff.koppen.toLowerCase();
  const exact = kList.find((k) => k.code.toLowerCase() === siteK);
  if (exact) return Math.min(20, exact.share * 65);
  const prefix2 = siteK.slice(0, 2);
  const groupShare = kList.filter((k) => k.code.toLowerCase().startsWith(prefix2)).reduce((s, k) => s + k.share, 0);
  if (groupShare > 0) return Math.min(8, groupShare * 16);
  return -6;
}

function sitePhScore(taxon: Taxon, eff: EffectiveSiteClimate): number {
  const ph = taxon.traits.soil_ph;
  if (eff.soilPh == null || ph?.min == null || ph?.max == null) return 0;
  const mid = (ph.min + ph.max) / 2;
  const half = Math.max(0.5, (ph.max - ph.min) / 2);
  const dist = Math.min(1.5, Math.abs(eff.soilPh - mid) / half);
  return 10 * (1 - dist * 0.65);
}

// ---- A4: Pairwise Interactions Scorer ----

function interactionScoreAgainstGuild(
  candidate: Taxon,
  guild: readonly Taxon[],
  interactions: readonly Interaction[],
  climateZone: ClimateZone | null,
): { score: number; conflicts: PalettePairInteraction[]; yieldGains: PalettePairInteraction[]; severeConflict: boolean } {
  if (!guild.length || !interactions.length) {
    return { score: 0, conflicts: [], yieldGains: [], severeConflict: false };
  }
  const zoneScoped = interactions.filter((ix) => ix.climate_zone === null || !climateZone || ix.climate_zone === climateZone);
  const pairs = matchPaletteInteractions([candidate, ...guild], zoneScoped)
    .filter((p) => p.a === candidate.id || p.b === candidate.id);

  let score = 0;
  let severeConflict = false;
  const conflicts: PalettePairInteraction[] = [];
  const yieldGains: PalettePairInteraction[] = [];

  for (const p of pairs) {
    const t = p.interaction.type;
    if (t === 'intercropped_yield_gain') {
      score += 22;
      yieldGains.push(p);
    } else if (t === 'allelopathy_tolerant') {
      score += 8;
    } else if (t === 'shared_pest') {
      // A4: soft nudge only (-6) + honest chip; never splits Apple + Pear
      score -= 6;
      conflicts.push(p);
    } else if (t === 'alternate_host' || t === 'allelopathic_harm') {
      const sev = p.interaction.severity;
      score -= sev === 'high' ? 45 : sev === 'medium' ? 28 : 14;
      if (sev === 'high' || sev === 'medium') severeConflict = true;
      conflicts.push(p);
    }
  }

  return { score, conflicts, yieldGains, severeConflict };
}

function estimateArea(taxon: Taxon): { measuredArea: number; unknownWidthPenalty: number; scoreArea: number } {
  const sc = sizeClassOf(taxon);
  const rawArea = crownAreaM2(taxon);
  const estW = sc === 'tree' || sc === 'shrub'
    ? Math.max(1.5, (taxon.traits.height_m?.max ?? 4) * 0.55)
    : 1.0;
  const measuredArea = rawArea ?? (sc === 'climber' ? 2.0 : Math.PI * (estW / 2) ** 2);
  const unknownWidthPenalty = rawArea === null && (sc === 'tree' || sc === 'shrub') ? 10 : 0;
  const scoreArea = isManagedOrchardTree(taxon) ? Math.min(measuredArea, 50) : measuredArea;
  return { measuredArea, unknownWidthPenalty, scoreArea };
}

// ---- Multi-Horizon Precomputation Helper ----

interface HorizonPack {
  effToday: EffectiveSiteClimate;
  eff2050: EffectiveSiteClimate | null;
  eff2080: EffectiveSiteClimate | null;
  sspEffs: readonly EffectiveSiteClimate[];
  shockEffs: readonly EffectiveSiteClimate[];
}

function buildHorizonPack(ctx: RecommendContext): HorizonPack {
  const { effToday, lookup, overrides } = ctx;
  const ov = overrides ?? { room: effToday.room, plotM2: effToday.plotM2, watering: effToday.watering, soilPh: effToday.soilPh, drainage: effToday.drainage };
  const eff2050 = ctx.eff2050 ?? (lookup ? resolveEffectiveSite(lookup, 'y2050', ov) : null);
  const eff2080 = lookup ? resolveEffectiveSite(lookup, 'y2080_ssp245', ov) : eff2050;
  const sspEffs: EffectiveSiteClimate[] = lookup
    ? (['y2050_ssp126', 'y2050', 'y2050_ssp370', 'y2050_ssp585'] as const).map((h) => resolveEffectiveSite(lookup, h, ov))
    : (eff2050 ? [eff2050] : []);
  const shockEffs: EffectiveSiteClimate[] = lookup
    ? (['freeze', 'heat', 'drought'] as const).map((h) => resolveEffectiveSite(lookup, h, ov))
    : [];
  return { effToday, eff2050, eff2080, sspEffs, shockEffs };
}

function verdictLevelScore(level: ReportPlantVerdict['level'], weightFits: number, weightCheck: number, weightRisk: number): number {
  if (level === 'fits') return weightFits;
  if (level === 'check') return weightCheck;
  if (level === 'at_risk') return weightRisk;
  return 0;
}

interface GuildCache {
  guild: readonly Taxon[];
  guildJobsToday: Map<JobId, Taxon[]>;
  guildJobs2050: Map<JobId, Taxon[]>;
  guildFamilies: Map<string, number>;
  guildHasCanopy: boolean;
  guildMyco: Set<string>;
  guildHasDeepRoot: boolean;
  guildHolderBounds: Map<PlantId, LimitingBound>;
  partnerById: Map<PlantId, Taxon>;
  beforeActiveMonths: Set<string> | null;
  zoneInteractions: readonly Interaction[];
  guildByIdOrGenus: Map<string, Taxon[]>;
  interactionsByKey: Map<string, Interaction[]>;
}

function taxonRefKeys(t: Taxon): string[] {
  const keys = [`species:${t.canonical_name.toLowerCase()}`];
  if (t.genus) keys.push(`genus:${t.genus.toLowerCase()}`);
  if (t.family) keys.push(`family:${t.family.toLowerCase()}`);
  return keys;
}

function buildGuildCache(guild: readonly Taxon[], hp: HorizonPack, ctx: RecommendContext): GuildCache {
  const guildJobsToday = new Map<JobId, Taxon[]>();
  const guildJobs2050 = new Map<JobId, Taxon[]>();
  const guildFamilies = new Map<string, number>();
  const guildHasCanopy = guild.some((t) => sizeClassOf(t) === 'tree');
  const guildMyco = new Set<string>();
  let guildHasDeepRoot = false;
  const guildHolderBounds = new Map<PlantId, LimitingBound>();
  const partnerById = new Map<PlantId, Taxon>();
  const guildByIdOrGenus = new Map<string, Taxon[]>();

  const boundEff = hp.eff2050 ?? hp.effToday;
  for (const g of guild) {
    partnerById.set(g.id, g);
    for (const k of taxonRefKeys(g)) {
      const list = guildByIdOrGenus.get(k);
      if (list) list.push(g);
      else guildByIdOrGenus.set(k, [g]);
    }
    if (g.family) guildFamilies.set(g.family, (guildFamilies.get(g.family) ?? 0) + 1);
    if (g.traits.mycorrhizal_type) guildMyco.add(g.traits.mycorrhizal_type);
    if ((g.traits.root_depth_min_cm ?? 0) >= 45 || g.traits.taproot_persistent === true) guildHasDeepRoot = true;
    guildHolderBounds.set(g.id, computeHeadroom(g, boundEff).limitingBound);
    const gv2050 = hp.eff2050 ? evaluatePlantVerdict(g, hp.eff2050, ctx.existingIds) : null;
    for (const j of jobsOf(g)) {
      const list = guildJobsToday.get(j) ?? [];
      list.push(g);
      guildJobsToday.set(j, list);
      if (!gv2050 || gv2050.level === 'fits') {
        const l50 = guildJobs2050.get(j) ?? [];
        l50.push(g);
        guildJobs2050.set(j, l50);
      }
    }
  }

  let beforeActiveMonths: Set<string> | null = null;
  if (ctx.layerValuesByPlant && guild.length > 0) {
    const place = { lat: hp.effToday.lat, country: hp.effToday.country, zone: ctx.climateZone ?? null };
    beforeActiveMonths = new Set(computeGrowingYear(guild, ctx.layerValuesByPlant, place, hp.effToday.hemisphere).activeMonths);
  }

  const climateZone = ctx.climateZone ?? null;
  const zoneInteractions = (ctx.interactions ?? []).filter(
    (ix) => ix.climate_zone === null || !climateZone || ix.climate_zone === climateZone,
  );
  const interactionsByKey = new Map<string, Interaction[]>();
  const addIxKey = (k: string, ix: Interaction) => {
    const arr = interactionsByKey.get(k);
    if (arr) arr.push(ix);
    else interactionsByKey.set(k, [ix]);
  };
  for (const ix of zoneInteractions) {
    addIxKey(`${ix.subject.rank}:${ix.subject.name.toLowerCase()}`, ix);
    addIxKey(`${ix.object.rank}:${ix.object.name.toLowerCase()}`, ix);
  }

  return {
    guild,
    guildJobsToday,
    guildJobs2050,
    guildFamilies,
    guildHasCanopy,
    guildMyco,
    guildHasDeepRoot,
    guildHolderBounds,
    partnerById,
    beforeActiveMonths,
    zoneInteractions,
    guildByIdOrGenus,
    interactionsByKey,
  };
}

function interactionScoreWithCache(
  candidate: Taxon,
  cache: GuildCache,
): { score: number; conflicts: PalettePairInteraction[]; yieldGains: PalettePairInteraction[]; severeConflict: boolean } {
  if (!cache.guild.length || !cache.zoneInteractions.length) {
    return { score: 0, conflicts: [], yieldGains: [], severeConflict: false };
  }
  const candIxs = new Set<Interaction>();
  for (const k of taxonRefKeys(candidate)) {
    for (const ix of cache.interactionsByKey.get(k) ?? []) candIxs.add(ix);
  }
  if (!candIxs.size) {
    return { score: 0, conflicts: [], yieldGains: [], severeConflict: false };
  }
  const relevantGuild = new Map<PlantId, Taxon>();
  for (const ix of candIxs) {
    const keys = [
      `${ix.subject.rank}:${ix.subject.name.toLowerCase()}`,
      `${ix.object.rank}:${ix.object.name.toLowerCase()}`,
    ];
    for (const k of keys) {
      for (const g of cache.guildByIdOrGenus.get(k) ?? []) {
        if (g.id !== candidate.id) relevantGuild.set(g.id, g);
      }
    }
  }
  if (!relevantGuild.size) {
    return { score: 0, conflicts: [], yieldGains: [], severeConflict: false };
  }
  return interactionScoreAgainstGuild(candidate, [...relevantGuild.values()], [...candIxs], null);
}

interface SiteBaseEval {
  verdictToday: ReportPlantVerdict;
  verdict2050: ReportPlantVerdict | null;
  verdictTarget: ReportPlantVerdict;
  sspAgreement: number | null;
  climate: number;
  headroom: number;
  ripening: number;
  limitingBound: LimitingBound;
  koppen: number;
  ph: number;
  edibility: number;
  uncertainty: number;
}

const siteBaseMemo = new WeakMap<Taxon, Map<string, SiteBaseEval>>();

function horizonPackKey(hp: HorizonPack, alreadyOnSite: boolean): string {
  const e = hp.effToday;
  const e50 = hp.eff2050;
  return [
    e.lat, e.lon, e.koppen, e.tminColdC, e.tmaxWarmC, e.tmeanWarmC, e.precipMm, e.dryMonths,
    e.freeze10C, e.heat10C, e.soilPh, e.watering, e.drainage, e.wind, e.siteLight, e.roomLimitM, e.plotM2,
    e50 ? `${e50.tminColdC},${e50.tmaxWarmC},${e50.precipMm}` : '-',
    hp.sspEffs.length, hp.shockEffs.length,
    alreadyOnSite ? 1 : 0,
  ].join('|');
}

function getSiteBaseEval(
  candidate: Taxon,
  hp: HorizonPack,
  existingIds?: ReadonlySet<PlantId>,
): SiteBaseEval {
  const alreadyOnSite = !!existingIds?.has(candidate.id);
  const key = horizonPackKey(hp, alreadyOnSite);
  let perTaxon = siteBaseMemo.get(candidate);
  const hit = perTaxon?.get(key);
  if (hit) return hit;

  const verdictToday = evaluatePlantVerdict(candidate, hp.effToday, existingIds);
  const verdict2050 = hp.eff2050 ? evaluatePlantVerdict(candidate, hp.eff2050, existingIds) : null;
  const targetH = targetHorizonForTaxon(candidate);
  const targetEff = targetH === 'today' ? hp.effToday : targetH === 'y2080_ssp245' ? (hp.eff2080 ?? hp.eff2050 ?? hp.effToday) : (hp.eff2050 ?? hp.effToday);
  const verdictTarget = targetEff === hp.effToday ? verdictToday : (targetEff === hp.eff2050 && verdict2050 ? verdict2050 : evaluatePlantVerdict(candidate, targetEff, existingIds));

  // SSP agreement across 4 SSPs (A2)
  let sspAgreement: number | null = null;
  if (hp.sspEffs.length >= 2) {
    let ok = 0;
    for (const se of hp.sspEffs) {
      const sv = evaluatePlantVerdict(candidate, se, existingIds);
      if (sv.level !== 'at_risk') ok++;
    }
    sspAgreement = ok;
  }

  // Core climate shock survival bonus (-4 °C freeze, +4 °C heat, +20d drought)
  let shockBonus = 0;
  if (hp.shockEffs.length) {
    let okShocks = 0;
    for (const se of hp.shockEffs) {
      const sv = evaluatePlantVerdict(candidate, se, existingIds);
      if (sv.level === 'fits') okShocks++;
      else if (sv.level === 'at_risk') okShocks -= 0.5;
    }
    shockBonus = Math.max(-6, okShocks * 4);
  }

  // Climate trajectory score (rebalanced so survival outranks edibility; A2)
  const climate =
    verdictLevelScore(verdictToday.level, 28, 6, -45)
    + verdictLevelScore(verdictTarget.level, 30, 10, -35)
    + (sspAgreement !== null ? (sspAgreement >= 3 ? 12 : sspAgreement <= 1 ? -14 : 0) : 0)
    + shockBonus;

  // Normalised headroom (minimum across today and target horizon; no double-counting tmin_cold & freeze10)
  const hrToday = computeHeadroom(candidate, hp.effToday);
  const hrTarget = targetEff === hp.effToday ? hrToday : computeHeadroom(candidate, targetEff);
  const headroom = Math.min(hrToday.headroom, hrTarget.headroom);
  const ripening = hrToday.ripening;
  const limitingBound = hrTarget.headroom <= hrToday.headroom ? hrTarget.limitingBound : hrToday.limitingBound;

  const koppen = siteKoppenScore(candidate, hp.effToday);
  const ph = sitePhScore(candidate, hp.effToday);

  // Edibility (secondary to survival; A2) + perennial agroforestry backbone preference
  const ed = candidate.traits.edibility_rating ?? 0;
  const perennial = !isAnnualTaxon(candidate);
  const edibility = ed * 2.2 + (perennial ? 14 : 0);

  // Uncertainty terms (A8: no photo bias, explicit uncertainty terms)
  const { unknownWidthPenalty } = estimateArea(candidate);
  const fewRecPenalty = verdictToday.notes.includes('few_records') ? 6 : 0;
  const uncertainty = -(unknownWidthPenalty + fewRecPenalty);

  const out: SiteBaseEval = {
    verdictToday,
    verdict2050,
    verdictTarget,
    sspAgreement,
    climate,
    headroom,
    ripening,
    limitingBound,
    koppen,
    ph,
    edibility,
    uncertainty,
  };
  if (!perTaxon) {
    perTaxon = new Map();
    siteBaseMemo.set(candidate, perTaxon);
  } else if (perTaxon.size > 32) {
    perTaxon.clear();
  }
  perTaxon.set(key, out);
  return out;
}

// ---- Unified Decomposed Candidate Scorer ----

export function scoreCandidateForGuild(
  candidate: Taxon,
  guild: readonly Taxon[],
  ctx: RecommendContext,
  pack?: HorizonPack,
  guildCache?: GuildCache,
): CandidateEvaluation {
  const hp = pack ?? buildHorizonPack(ctx);
  const gc = guildCache ?? buildGuildCache(guild, hp, ctx);
  const {
    verdictToday,
    verdict2050,
    verdictTarget,
    sspAgreement,
    climate,
    headroom,
    ripening,
    limitingBound,
    koppen,
    ph,
    edibility,
    uncertainty,
  } = getSiteBaseEval(candidate, hp, ctx.existingIds);

  // Guild synergy & response diversity (A4, A7)
  const jobs = jobsOf(candidate);
  let synergy = 0;
  const reasons: RecommendReason[] = [];

  const { guildJobsToday, guildJobs2050, guildFamilies, guildHasCanopy, guildMyco, guildHasDeepRoot, guildHolderBounds, partnerById, beforeActiveMonths } = gc;

  let filledMissingJob: JobId | null = null;
  let backedUp2050Job: JobId | null = null;
  let responseDiverse = false;

  if (guild.length === 0) {
    // Empty guild (Layer-1 canopy anchor or empty-palette Picker): rank purely on climate survival,
    // headroom, ripening, Köppen, pH, and dry-summer resilience without inflating multi-tag counts.
    if (jobs[0]) filledMissingJob = jobs[0];
  } else {
    for (const j of jobs) {
      const holders = guildJobsToday.get(j) ?? [];
      const holders50 = guildJobs2050.get(j) ?? [];
      if (holders.length === 0) {
        synergy += 24;
        if (!filledMissingJob) filledMissingJob = j;
      } else if (holders50.length < 2 && (!verdict2050 || verdict2050.level === 'fits')) {
        synergy += 14;
        if (!backedUp2050Job) backedUp2050Job = j;
        // A7: Response diversity — different family AND different limiting climate bound from existing holder
        const sameFamily = candidate.family !== null && holders.some((h) => h.family === candidate.family);
        const sameBound = limitingBound !== null && holders.some((h) => guildHolderBounds.get(h.id) === limitingBound);
        if (!sameFamily && !sameBound) {
          synergy += 10;
          responseDiverse = true;
        }
      }
    }
  }

  // Dry-summer resilience bonus for drought-adapted perennials on summer-dry / arid sites
  const isSummerDry = (hp.effToday.dryMonths !== null && hp.effToday.dryMonths >= 2)
    || (hp.eff2050?.dryMonths != null && hp.eff2050.dryMonths >= 3);
  const droughtAdapted = (candidate.traits.drought_tolerance ?? '').toLowerCase() === 'high'
    || (candidate.traits.moisture_use ?? '').toLowerCase() === 'low';
  if (isSummerDry && hp.effToday.watering !== 'all-year' && droughtAdapted) {
    synergy += 8;
  }

  if (filledMissingJob) reasons.push({ code: 'fills_gap', job: filledMissingJob });
  else if (backedUp2050Job) reasons.push({ code: 'backs_up_2050', job: backedUp2050Job });
  if (responseDiverse) reasons.push({ code: 'response_diverse' });

  // Family diversity (avoid >= 40% monoculture)
  if (candidate.family && guild.length > 0) {
    const cnt = guildFamilies.get(candidate.family) ?? 0;
    if (cnt === 0) synergy += 8;
    else if ((cnt + 1) / (guild.length + 1) >= 0.4) synergy -= 15;
  }

  // Understory shade tolerance when canopy tree exists
  const sc = sizeClassOf(candidate);
  const shadiest = candidate.light.shadiest;
  const shadeTolerant = shadiest === 'medium' || shadiest === 'low' || candidate.traits.semi_shade === true || candidate.traits.full_shade === true;
  if (guildHasCanopy && sc !== 'tree' && shadeTolerant) {
    synergy += 8;
    reasons.push({ code: 'understory_shade' });
  }

  // Mycorrhizal & root stratification synergy
  if (candidate.traits.mycorrhizal_type && guildMyco.has(candidate.traits.mycorrhizal_type)) {
    synergy += 3;
  }
  const isShallow = candidate.traits.root_depth_min_cm !== null && candidate.traits.root_depth_min_cm < 35;
  if (guildHasDeepRoot && sc !== 'tree' && isShallow) {
    synergy += 3;
  }

  // Seasonality stagger (new bloom/harvest months via site-scoped layerValuesByPlant)
  if (ctx.layerValuesByPlant && beforeActiveMonths) {
    const place = { lat: hp.effToday.lat, country: hp.effToday.country, zone: ctx.climateZone ?? null };
    const candGy = computeGrowingYear([candidate], ctx.layerValuesByPlant, place, hp.effToday.hemisphere);
    const newMonths = candGy.activeMonths.filter((m) => !beforeActiveMonths.has(m));
    if (newMonths.length > 0) {
      synergy += Math.min(8, newMonths.length * 3);
      reasons.push({ code: 'seasonality' });
    }
  }

  // Curated pairwise interactions (A4)
  const ix = interactionScoreWithCache(candidate, gc);
  for (const yg of ix.yieldGains) {
    const otherId = yg.a === candidate.id ? yg.b : yg.a;
    const other = partnerById.get(otherId);
    reasons.push({ code: 'yield_gain', partnerId: otherId, partnerName: other?.names.en ?? other?.canonical_name });
  }
  for (const cf of ix.conflicts) {
    const otherId = cf.a === candidate.id ? cf.b : cf.a;
    const other = partnerById.get(otherId);
    reasons.push({
      code: cf.interaction.type === 'shared_pest' ? 'shared_pest' : 'conflict',
      partnerId: otherId,
      partnerName: other?.names.en ?? other?.canonical_name,
    });
  }

  // 2050s honesty tag (Q3: say "2050s unknown" when unknown, never claim "Fits 2050s")
  if (verdict2050) {
    if (verdict2050.level === 'fits') reasons.push({ code: 'fits_2050' });
    else if (verdict2050.level === 'unknown') reasons.push({ code: 'unknown_2050' });
  }

  const total = Math.round((climate + headroom + ripening + koppen + ph + edibility + synergy + ix.score + uncertainty) * 10) / 10;

  return {
    taxon: candidate,
    score: total,
    breakdown: {
      climate: Math.round(climate * 10) / 10,
      headroom: Math.round(headroom * 10) / 10,
      ripening: Math.round(ripening * 10) / 10,
      koppen: Math.round(koppen * 10) / 10,
      ph: Math.round(ph * 10) / 10,
      edibility: Math.round(edibility * 10) / 10,
      synergy: Math.round(synergy * 10) / 10,
      interactions: Math.round(ix.score * 10) / 10,
      uncertainty: Math.round(uncertainty * 10) / 10,
      total,
    },
    verdictToday,
    verdictTarget,
    verdict2050,
    sspAgreement,
    limitingBound,
    reasons,
    conflicts: ix.conflicts,
    yieldGains: ix.yieldGains,
  };
}

// ---- Surface 2: Picker Companion & Gap-Fill Ranking ----

export function rankCandidatesForGuild(
  candidates: readonly Taxon[],
  guild: readonly Taxon[],
  ctx: RecommendContext,
): Map<PlantId, CandidateEvaluation> {
  const pack = buildHorizonPack(ctx);
  const guildCache = buildGuildCache(guild, pack, ctx);
  const out = new Map<PlantId, CandidateEvaluation>();
  for (const c of candidates) {
    out.set(c.id, scoreCandidateForGuild(c, guild, ctx, pack, guildCache));
  }
  return out;
}

// ---- Surface 1: Starter Guild Synthesis (Layered Constructive + 1-Swap Refinement) ----

export function selectStarterPalette(
  pool: readonly Taxon[],
  eff: EffectiveSiteClimate,
  options: StarterOptions = {},
): Taxon[] {
  const maxPlants = options.maxPlants ?? 8;
  const ctx: RecommendContext = {
    effToday: eff,
    eff2050: options.eff2050 ?? null,
    lookup: options.lookup ?? null,
    overrides: options.overrides,
    climateZone: options.climateZone ?? null,
    interactions: options.interactions ?? [],
    layerValuesByPlant: options.layerValuesByPlant,
    existingIds: options.existingIds,
  };
  const pack = buildHorizonPack(ctx);
  const nicheStratumOf = (t: Taxon): string => t.stratum?.value ?? t.light.preferred ?? t.light.sunniest ?? '';

  interface PoolEntry {
    taxon: Taxon;
    eval0: CandidateEvaluation;
    jobs: JobId[];
    area: number;
    scoreArea: number;
    sizeClass: SizeClass;
    stratum: string;
    perennial: boolean;
    edibility: number;
    effMaxH: number | null;
    isManaged: boolean;
    isClimber: boolean;
    isRoot: boolean;
  }

  const fitsPool: PoolEntry[] = pool
    .map((t) => {
      const eval0 = scoreCandidateForGuild(t, [], ctx, pack);
      const jobs = jobsOf(t);
      const sizeClass = sizeClassOf(t);
      const { measuredArea, scoreArea } = estimateArea(t);
      const isManaged = isManagedOrchardTree(t);
      const rawMaxH = t.traits.height_m?.max ?? null;
      const effMaxH = isManaged && rawMaxH !== null ? Math.min(rawMaxH, 8) : rawMaxH;
      return {
        taxon: t,
        eval0,
        jobs,
        area: measuredArea,
        scoreArea,
        sizeClass,
        stratum: nicheStratumOf(t),
        perennial: !isAnnualTaxon(t),
        edibility: t.traits.edibility_rating ?? 0,
        effMaxH,
        isManaged,
        isClimber: isStructuralVine(t),
        isRoot: isEdibleRootCrop(t),
      };
    })
    .filter((x) => x.eval0.verdictToday.level === 'fits' && x.jobs.length > 0 && !x.eval0.verdictToday.subsoilPhTrap)
    .filter((x) => eff.roomLimitM === null || eff.roomLimitM > 2 || x.taxon.traits.height_m?.max == null || x.taxon.traits.height_m.max <= eff.roomLimitM);

  const chosen: PoolEntry[] = [];
  const chosenIds = new Set<PlantId>();
  const usedStrata = new Set<string>();
  let usedArea = 0;

  const chosenTaxa = (): Taxon[] => chosen.map((c) => c.taxon);
  const nFixCount = (): number => chosen.filter((c) => c.jobs.includes('feeds_soil')).length;
  const canAdd = (item: PoolEntry): boolean => !chosenIds.has(item.taxon.id) && usedArea + item.area <= eff.netPlotM2;

  const addItem = (item: PoolEntry): boolean => {
    chosen.push(item);
    chosenIds.add(item.taxon.id);
    usedArea += item.area;
    if (item.stratum) usedStrata.add(item.stratum);
    return true;
  };

  const dynScore = (item: PoolEntry, bonusFn?: (x: PoolEntry) => number): number => {
    const guild = chosenTaxa();
    const ev = guild.length === 0 ? item.eval0 : scoreCandidateForGuild(item.taxon, guild, ctx, pack);
    let s = ev.score;
    if (item.stratum && !usedStrata.has(item.stratum)) s += 5;
    if (nFixCount() >= 2 && item.jobs.includes('feeds_soil')) s -= 18;
    if (bonusFn) s += bonusFn(item);
    return s;
  };

  const pickBest = (pred: (x: PoolEntry) => boolean, bonusFn?: (x: PoolEntry) => number): boolean => {
    const cands = fitsPool.filter((x) => canAdd(x) && pred(x));
    if (!cands.length) return false;
    // Prefer candidates with 0 severe (alternate_host / allelopathic_harm) conflicts against chosen guild
    const guild = chosenTaxa();
    const safe = guild.length && ctx.interactions?.length
      ? cands.filter((x) => !interactionScoreAgainstGuild(x.taxon, guild, ctx.interactions!, ctx.climateZone ?? null).severeConflict)
      : cands;
    const active = safe.length ? safe : cands;
    active.sort((a, b) => dynScore(b, bonusFn) - dynScore(a, bonusFn) || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name));
    return addItem(active[0]);
  };

  // Layer 1: Climate-resilient fruit/nut canopy anchor (A2: prefer >= 3/4 SSP agreement; A3: managed orchard genera)
  if ((eff.roomLimitM === null || eff.roomLimitM >= 3) && eff.netPlotM2 >= 25 && chosen.length < maxPlants) {
    const maxTreeArea = eff.netPlotM2 * 0.68;
    const treePred = (x: PoolEntry) => x.sizeClass === 'tree' && x.scoreArea <= maxTreeArea;
    const hasSsp3 = fitsPool.some((x) => canAdd(x) && treePred(x) && (x.eval0.sspAgreement === null || x.eval0.sspAgreement >= 3));
    pickBest(
      (x) => treePred(x) && (!hasSsp3 || x.eval0.sspAgreement === null || x.eval0.sspAgreement >= 3),
      (x) => {
        const h = x.effMaxH ?? 8;
        let b = 0;
        // Rebalanced (A2): food value matters (+25 max), never overwhelms climate survival (+95)
        if (x.jobs.includes('feeds_you')) b += 15 + x.edibility * 3;
        else b -= 20;
        if (x.isManaged) b += 6;
        if (h >= 4 && h <= 18) b += 10;
        else if (h > 22) b -= 18;
        return b;
      },
    );
  }

  // Layer 2: Fruit or support shrub
  if ((eff.roomLimitM === null || eff.roomLimitM >= 1.5) && eff.netPlotM2 >= 12 && chosen.length < maxPlants) {
    const maxShrubArea = eff.netPlotM2 * 0.25;
    pickBest(
      (x) => x.sizeClass === 'shrub' && x.area <= maxShrubArea,
      (x) => (x.jobs.includes('feeds_you') && x.edibility >= 3 ? 10 : 0) + (x.jobs.includes('helpers') ? 5 : 0),
    );
  }

  // Layer 3: Structural perennial edible climber (strictly perennial via isStructuralVine)
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.isClimber && x.perennial && x.area <= eff.netPlotM2 * 0.25,
      (x) => {
        const h = x.taxon.traits.height_m?.max ?? 2;
        let b = 0;
        if (h >= 3) b += 14;
        else if (h < 2.2) b -= 16;
        if (x.jobs.includes('feeds_you') && x.edibility >= 4) b += 20;
        else if (x.jobs.includes('feeds_you') && x.edibility >= 3) b += 12;
        else if (!x.jobs.includes('feeds_you') || x.edibility < 2) b -= 18;
        if (!x.jobs.includes('feeds_soil')) b += 4;
        return b;
      },
    );
  }

  // Layer 4: Nitrogen-fixer (skip if already covered)
  if (chosen.length < maxPlants && !chosen.some((c) => c.jobs.includes('feeds_soil'))) {
    pickBest(
      (x) => x.jobs.includes('feeds_soil') && x.area <= eff.netPlotM2 * 0.25,
      (x) => (x.sizeClass === 'shrub' || x.sizeClass === 'herb' ? 6 : 0),
    );
  }

  // Layer 5: Herb / pollinator plant
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.sizeClass === 'herb' && x.jobs.includes('helpers') && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.perennial ? 6 : 0) + (x.jobs.includes('shelter') ? 4 : 0),
    );
  }

  // Layer 6: Groundcover / living mulch (skip if already covered)
  if (chosen.length < maxPlants && !chosen.some((c) => c.jobs.includes('ground'))) {
    pickBest(
      (x) => (x.sizeClass === 'groundcover' || ((x.taxon.traits.height_m?.max ?? 9) <= 0.8 && (x.jobs.includes('ground') || x.jobs.includes('mulch'))))
        && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.jobs.includes('ground') ? 8 : 0) + (x.jobs.includes('mulch') ? 6 : 0),
    );
  }

  // Layer 7: True edible root/tuber crop
  if (chosen.length < maxPlants) {
    pickBest(
      (x) => x.isRoot && x.jobs.includes('feeds_you') && x.area <= eff.netPlotM2 * 0.15,
      (x) => (x.edibility >= 4 ? 8 : 0) + (x.perennial ? 5 : 0),
    );
  }

  // Pass 1: Cover any remaining missing canonical jobs
  for (const job of jobIds) {
    if (chosen.length >= maxPlants) break;
    if (chosen.some((c) => c.jobs.includes(job))) continue;
    pickBest((x) => x.jobs.includes(job) && x.area <= eff.netPlotM2 * 0.3);
  }

  // Pass 2: Reinforce jobs with < 2 2050-surviving species (A7 response diversity)
  for (const job of jobIds) {
    if (chosen.length >= maxPlants) break;
    const count50 = chosen.filter((c) => c.jobs.includes(job) && (!c.eval0.verdict2050 || c.eval0.verdict2050.level === 'fits')).length;
    if (count50 >= 2) continue;
    pickBest((x) => x.jobs.includes(job) && x.area <= eff.netPlotM2 * 0.25);
  }

  // Pass 3: Fill remaining slots up to maxPlants with diverse high-resilience companions
  while (chosen.length < maxPlants) {
    if (!pickBest((x) => x.area <= eff.netPlotM2 * 0.25)) {
      if (!pickBest(() => true)) break;
    }
  }

  // Stage B: Fast deterministic 1-swap refinement on non-anchor backup slots (idx >= 3)
  // Checks if any unused candidate improves total guild score while keeping all covered jobs & crown budget.
  if (chosen.length >= 4 && fitsPool.length > chosen.length) {
    const coveredJobs = new Set(chosen.flatMap((c) => c.jobs));
    for (let idx = 3; idx < chosen.length; idx++) {
      const current = chosen[idx];
      const rest = chosen.filter((_, i) => i !== idx);
      const restTaxa = rest.map((r) => r.taxon);
      const restArea = rest.reduce((s, r) => s + r.area, 0);
      const restJobs = new Set(rest.flatMap((r) => r.jobs));
      const mustCover = [...coveredJobs].filter((j) => !restJobs.has(j));
      const curScore = scoreCandidateForGuild(current.taxon, restTaxa, ctx, pack).score;

      let bestCand: PoolEntry | null = null;
      let bestScore = curScore + 4; // require meaningful improvement to avoid churn
      for (const cand of fitsPool) {
        if (chosenIds.has(cand.taxon.id)) continue;
        if (restArea + cand.area > eff.netPlotM2) continue;
        if (mustCover.some((j) => !cand.jobs.includes(j))) continue;
        if (ctx.interactions?.length && interactionScoreAgainstGuild(cand.taxon, restTaxa, ctx.interactions, ctx.climateZone ?? null).severeConflict) continue;
        const sc = scoreCandidateForGuild(cand.taxon, restTaxa, ctx, pack).score;
        if (sc > bestScore) {
          bestScore = sc;
          bestCand = cand;
        }
      }
      if (bestCand) {
        chosenIds.delete(current.taxon.id);
        chosenIds.add(bestCand.taxon.id);
        usedArea = restArea + bestCand.area;
        chosen[idx] = bestCand;
      }
    }
  }

  return chosen.map((c) => c.taxon);
}

// ---- Surface 3: Climate-Resilient Like-for-Like Swap Engine ----

export function findCompatibleSwaps(
  target: Taxon,
  pool: readonly Taxon[],
  eff: EffectiveSiteClimate,
  inPaletteIds: ReadonlySet<PlantId>,
  limit = 6,
  ctxExtra?: Omit<RecommendContext, 'effToday'>,
  otherGuildTaxa: readonly Taxon[] = [],
): SwapCandidate[] {
  const targetJobs = jobsOf(target);
  const primaryJob: JobId | null = targetJobs.includes('feeds_you') ? 'feeds_you' : (targetJobs[0] ?? null);
  const targetHabit = (target.traits.habit ?? '').trim().toLowerCase();
  const targetSize = sizeClassOf(target);
  const targetH = target.traits.height_m?.max ?? null;
  const ctx: RecommendContext = { effToday: eff, ...ctxExtra };
  const pack = buildHorizonPack(ctx);

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

    // Height band: 0.35× to 2.2× of target height + respect room height cap (except managed orchard trees in room >= 3 m)
    const candH = cand.traits.height_m?.max ?? null;
    const managedOk = isManagedOrchardTree(cand) && (eff.roomLimitM === null || eff.roomLimitM >= 3);
    if (!managedOk && eff.roomLimitM !== null && candH !== null && candH > eff.roomLimitM) continue;
    if (targetH !== null && targetH > 0 && candH !== null) {
      if (candH < targetH * 0.35 || candH > targetH * 2.2) continue;
    }

    // Must preserve primary job
    const candJobs = jobsOf(cand);
    if (primaryJob && !candJobs.includes(primaryJob)) continue;
    const sharedJobs = targetJobs.filter((j) => candJobs.includes(j));

    const ev = scoreCandidateForGuild(cand, otherGuildTaxa, ctx, pack);
    if (ev.verdictToday.level !== 'fits' && ev.verdictToday.level !== 'check') continue;

    // A8: zero photo bias; combines verdict + 2050s/headroom/interactions + shared jobs
    const score =
      (ev.verdictToday.level === 'fits' ? 100 : 40)
      + sharedJobs.length * 10
      + ev.score * 0.4;

    candidates.push({ taxon: cand, verdict: ev.verdictToday, sharedJobs, sizeClass: candSize, score });
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.taxon.canonical_name.localeCompare(b.taxon.canonical_name))
    .slice(0, limit);
}
