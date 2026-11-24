// Unified 8-input reactive catalog evaluator for Field Studio.
// Feeds ALL 8 site/studio inputs into one consistent, contradiction-free plant fit & ranking model:
//   1. store.period ('today' | '2041-2070' | '2071-2099')
//   2. climateStress (heatDeltaC, droughtPct, winterDeltaC, falseSpringDeltaPct, windExposure, extremeRainPct)
//   3. designEnvelope ('typical' | 'extreme10')
//   4. wateringMode ('Rain-fed' | 'Occasional' | 'Irrigated') synced with siteEdits.watering
//   5. microclimate (slopeDeg, aspect, landform)
//   6. store.siteEdits (nights, days, rain, soilPh, drainage, watering)
//   7. store.room / plantingConfig.plotAreaM2 (height/space fit)
//   8. store.members (sun/role/succession gap detection in consumers)
// Pure (zero DOM), consumed by StudioRail (Coach + All Plants), LivingSystemTab (Role Inspector),
// FieldDossier (Good Companions), and Climate2050Tab.
import type {
  ClimateZone,
  DesignEnvelope,
  PlantId,
  PlantVerdict,
  Room,
  SiteEdits,
  SiteLocation,
  Taxon,
} from '../../../lib/palette/index.ts';
import type { MicroclimateParams } from '../../../lib/climate/v07.ts';
import type { ClimateStressState, WateringMode } from '../state/studio.ts';
import { siteClimateProfile } from './climate-words.ts';

export type StudioFitLevel = 'fits' | 'look' | 'outside' | 'unknown';

export interface StudioFitInputs {
  loc: SiteLocation | null;
  climate: ClimateZone | null;
  period: string;
  envelope: DesignEnvelope;
  stress: ClimateStressState;
  microclimate: MicroclimateParams;
  siteEdits: SiteEdits;
  wateringMode: WateringMode;
  room: Room;
  plotAreaM2: number;
  baseVerdicts?: ReadonlyMap<PlantId, PlantVerdict> | null;
}

export interface StudioFitResult {
  level: StudioFitLevel;
  score: number;
  hotMarginC: number | null;
  coldMarginC: number | null;
  phFits: boolean | null;
  droughtOk: boolean;
  spaceFits: boolean;
}

export interface StudioCatalogEvaluation {
  fitMap: Map<PlantId, StudioFitResult>;
  rankedCatalog: Taxon[];
  fitPool: Taxon[];
  isStressOrFutureActive: boolean;
  effectiveHotC: number;
  effectiveColdC: number;
  effectiveDroughtPct: number;
  maxIdealHeightM: number | null;
}

const LEVEL_RANK: Record<StudioFitLevel, number> = {
  fits: 0,
  look: 1,
  unknown: 2,
  outside: 3,
};

export function hasActiveClimateStress(stress: ClimateStressState): boolean {
  return (
    stress.heatDeltaC !== 0
    || stress.droughtPct !== 0
    || stress.winterDeltaC !== 0
    || stress.falseSpringDeltaPct !== 0
    || stress.windExposure !== 0
    || stress.extremeRainPct !== 0
  );
}

/**
 * Evaluate every species in `catalog` (all ~761 species across all climates) against all 8 studio inputs.
 * Deterministic, pure, fast (<2ms for 800 species).
 */
export function evaluateStudioCatalog(
  catalog: readonly Taxon[],
  inputs: StudioFitInputs,
): StudioCatalogEvaluation {
  const profile = siteClimateProfile(inputs.loc, inputs.climate, inputs.microclimate, inputs.siteEdits);
  const baseCold = profile.typicalColdNightC ?? 0;
  const baseHot = profile.typicalWarmHighC ?? 28;
  const baseAridity = profile.aridityIndex ?? 0.85;

  const isFuture = inputs.period === '2041-2070' || inputs.period === '2071-2099';
  const futureDeltaWarm = inputs.period === '2071-2099' ? 3.4 : inputs.period === '2041-2070' ? 2.1 : 0;
  const winterWarmBump = Math.round(futureDeltaWarm * 0.6 * 10) / 10;
  const extremeHotBump = inputs.envelope === 'extreme10' ? 2.5 : 0;
  const extremeColdDrop = inputs.envelope === 'extreme10' ? -3.5 : 0;

  const effectiveHotC = Math.round((baseHot + futureDeltaWarm + extremeHotBump + inputs.stress.heatDeltaC) * 10) / 10;
  const effectiveColdC = Math.round((baseCold + winterWarmBump + extremeColdDrop + inputs.stress.winterDeltaC) * 10) / 10;

  // Watering mode buffers drought pressure: Irrigated (-40%), Occasional (-20%), Rain-fed (0%).
  const wateringBuffer = inputs.wateringMode === 'Irrigated' || inputs.siteEdits.watering === 'all-year'
    ? 40
    : inputs.wateringMode === 'Occasional' || inputs.siteEdits.watering === 'first-years'
    ? 20
    : 0;
  const baseDryPct = Math.round((1 - Math.min(1, baseAridity)) * 35);
  const rainRelief = inputs.stress.extremeRainPct > 0 ? Math.round(inputs.stress.extremeRainPct * 0.3) : Math.round(-inputs.stress.extremeRainPct * 0.4);
  const effectiveDroughtPct = Math.max(
    0,
    Math.min(100, baseDryPct + Math.round(futureDeltaWarm * 4) + inputs.stress.droughtPct + (inputs.envelope === 'extreme10' ? 15 : 0) + rainRelief - wateringBuffer),
  );

  // Wind exposure from Extremes Lab + ridge landform
  const effectiveWind = inputs.stress.windExposure + (inputs.microclimate.landform === 'ridge' ? 1 : 0);

  // Space / height ceiling from room & plotAreaM2
  const maxIdealHeightM = inputs.room === 'pots' || inputs.plotAreaM2 <= 20
    ? 2.5
    : inputs.plotAreaM2 <= 60
    ? 6.0
    : inputs.plotAreaM2 <= 150
    ? 14.0
    : null;

  const isStressOrFutureActive = isFuture
    || inputs.envelope === 'extreme10'
    || hasActiveClimateStress(inputs.stress);

  const sitePh = profile.ph;
  const drainage = inputs.siteEdits.drainage ?? null;

  const fitMap = new Map<PlantId, StudioFitResult>();

  for (const t of catalog) {
    const baseV = inputs.baseVerdicts?.get(t.id);
    const isAnnual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
    const minCold = t.climate?.tminCold?.low ?? null;
    const maxHot = t.climate?.tmaxWarm?.high ?? null;

    const hotMarginC = maxHot != null ? Math.round((maxHot - effectiveHotC) * 10) / 10 : null;
    const coldMarginC = (!isAnnual && minCold != null) ? Math.round((effectiveColdC - minCold) * 10) / 10 : null;

    // 1. Base climate level (honors baseVerdicts when Today + typical + no stress, otherwise re-evaluates live!)
    let level: StudioFitLevel = (baseV?.level as StudioFitLevel | undefined) ?? 'unknown';

    if (hotMarginC != null || coldMarginC != null) {
      const heatOutside = hotMarginC != null && hotMarginC < -2.0;
      const heatEdge = hotMarginC != null && hotMarginC < 0 && hotMarginC >= -2.0;
      const coldOutside = coldMarginC != null && coldMarginC < -2.0;
      const coldEdge = coldMarginC != null && coldMarginC < 0 && coldMarginC >= -2.0;

      if (isStressOrFutureActive || !baseV) {
        if (heatOutside || coldOutside) level = 'outside';
        else if (heatEdge || coldEdge) level = 'look';
        else level = 'fits';
      } else {
        // Even on Today + baseline, microclimate / siteEdits shifts can push a borderline plant to look/outside.
        if (heatOutside || coldOutside) level = 'outside';
        else if ((heatEdge || coldEdge) && level === 'fits') level = 'look';
      }
    }

    // 2. Drought tolerance vs effective drought pressure (modulated by wateringMode + droughtPct + rain)
    const dt = (t.traits.drought_tolerance ?? '').toLowerCase();
    const isHighDrought = dt.includes('high') || dt.includes('very');
    const isLowDrought = dt.includes('low') || dt.includes('none') || dt.includes('poor');
    const droughtOk = effectiveDroughtPct < 35 || isHighDrought || (!isLowDrought && effectiveDroughtPct < 55);
    if (effectiveDroughtPct >= 50 && isLowDrought) {
      if (level === 'fits') level = 'look';
      else if (level === 'look' && effectiveDroughtPct >= 65) level = 'outside';
    } else if (effectiveDroughtPct >= 35 && !isHighDrought && level === 'fits' && inputs.stress.droughtPct >= 25) {
      level = 'look';
    }

    // 3. Soil pH fit (from siteEdits.soilPh or soil map)
    const ph = t.traits.soil_ph;
    let phFits: boolean | null = null;
    if (sitePh != null && ph != null && (ph.min != null || ph.max != null)) {
      const lo = ph.min ?? 3.5;
      const hi = ph.max ?? 9.5;
      phFits = sitePh >= lo - 0.3 && sitePh <= hi + 0.3;
      if (sitePh < lo - 1.0 || sitePh > hi + 1.0) {
        if (level === 'fits') level = 'look';
      }
    }

    // 4. Drainage / extreme rain waterlogging check
    const wetHeavy = drainage === 'wet' || inputs.stress.extremeRainPct >= 25;
    if (wetHeavy && isHighDrought && t.traits.well_drained === true) {
      // Drought specialists requiring well-drained soil dislike standing water
      if (level === 'fits' && drainage === 'wet') level = 'look';
    }

    // 5. Space / height fit
    const heightM = t.traits.height_m?.max ?? null;
    const spaceFits = maxIdealHeightM == null || heightM == null || heightM <= maxIdealHeightM;

    // 6. Composite agronomic ranking score (higher = stronger recommendation for active 8 inputs)
    let score = level === 'fits' ? 100 : level === 'look' ? 50 : level === 'unknown' ? 30 : -40;
    if (hotMarginC != null) score += Math.max(-25, Math.min(18, hotMarginC * 2.2));
    if (coldMarginC != null) score += Math.max(-25, Math.min(14, coldMarginC * 1.4));
    if (effectiveDroughtPct >= 25) {
      if (isHighDrought) score += 22;
      else if (isLowDrought) score -= 24;
    }
    if (phFits === true) score += 12;
    else if (phFits === false) score -= 14;

    // False spring pressure favors later-blooming / hardy / non-woody species
    if (inputs.stress.falseSpringDeltaPct >= 15) {
      if (isAnnual || (minCold != null && minCold <= -12)) score += 10;
      else score -= 6;
    }

    // High wind exposure favors low-stature / wind-hardy species
    if (effectiveWind >= 2 && heightM != null) {
      if (heightM <= 3.5) score += 10;
      else if (heightM >= 12) score -= 12;
    }

    // Space fit: strongly prefer appropriately sized plants on small plots / pots
    if (maxIdealHeightM != null && heightM != null) {
      if (heightM <= maxIdealHeightM) score += 16;
      else score -= Math.min(35, Math.round((heightM - maxIdealHeightM) * 4));
    }

    fitMap.set(t.id, {
      level,
      score: Math.round(score * 10) / 10,
      hotMarginC,
      coldMarginC,
      phFits,
      droughtOk,
      spaceFits,
    });
  }

  const rankedCatalog = [...catalog].sort((a, b) => {
    const fa = fitMap.get(a.id);
    const fb = fitMap.get(b.id);
    const ra = LEVEL_RANK[fa?.level ?? 'unknown'];
    const rb = LEVEL_RANK[fb?.level ?? 'unknown'];
    if (ra !== rb) return ra - rb;
    const sa = fa?.score ?? 0;
    const sb = fb?.score ?? 0;
    if (sa !== sb) return sb - sa;
    return a.canonical_name.localeCompare(b.canonical_name);
  });

  const fitPool = rankedCatalog.filter((t) => fitMap.get(t.id)?.level !== 'outside');

  return {
    fitMap,
    rankedCatalog,
    fitPool,
    isStressOrFutureActive,
    effectiveHotC,
    effectiveColdC,
    effectiveDroughtPct,
    maxIdealHeightM,
  };
}
