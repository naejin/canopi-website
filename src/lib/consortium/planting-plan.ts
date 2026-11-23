// Pure, framework-free Planting Plan & Unified 6-Stage Succession Engine.
// Computes realistic agronomic quantities, density-scaled spacing, seed weights, sun-tier footprint
// budgets, contextual shade-timing & pollination notes, field materials, and frost-anchored waves.
// Zero DOM, zero external imports (stays inside src/lib/consortium/).
import type { PhaseOrd, Stratum, Taxon } from './types.ts';
import { phases } from './types.ts';

export type AreaUnit = 'm2' | 'ha' | 'ft2' | 'ac';
export type DensityMode = 'spacious' | 'balanced' | 'dense';
export type LayoutPattern = 'guild' | 'alley' | 'grid';
export type DesignEnvelope = 'typical' | 'extreme10';

export interface SuccessionStage6 {
  readonly id: 'p1' | 'p2' | 's1' | 's2' | 's3' | 'climax';
  readonly name: string;
  readonly time: string;
  readonly phaseOrds: readonly PhaseOrd[];
}

/**
 * Six unified grower-facing succession stages mapped cleanly onto Canopi's 7 internal phases (0..6).
 * Preserves 100% compatibility with #v=5 links and .canopi v9 0..6 phase numbers.
 */
export const SUCCESSION_STAGES_6: readonly SuccessionStage6[] = [
  { id: 'p1', name: 'Placenta 1', time: '0–3 mo', phaseOrds: [0] },
  { id: 'p2', name: 'Placenta 2', time: '3–12 mo', phaseOrds: [1, 2] },
  { id: 's1', name: 'Secondary 1', time: '1–3 yr', phaseOrds: [3] },
  { id: 's2', name: 'Secondary 2', time: '3–15 yr', phaseOrds: [4] },
  { id: 's3', name: 'Secondary 3', time: '15–25 yr', phaseOrds: [5] },
  { id: 'climax', name: 'Climax', time: '25–60+ yr', phaseOrds: [6] },
] as const;

/** Map internal PhaseOrd (0..6) to unified 6-stage index (0..5). */
export function phaseToStageIndex(ord: PhaseOrd): 0 | 1 | 2 | 3 | 4 | 5 {
  if (ord === 0) return 0;
  if (ord <= 2) return 1;
  return (ord - 1) as 2 | 3 | 4 | 5;
}

const AREA_TO_M2: Record<AreaUnit, number> = {
  m2: 1,
  ha: 10_000,
  ft2: 0.09290304,
  ac: 4046.8564224,
};

export const DENSITY_MULTIPLIER: Record<DensityMode, number> = {
  spacious: 0.7,
  balanced: 1.0,
  dense: 1.4,
};

export function convertArea(m2: number, unit: AreaUnit): number {
  const safe = Math.max(0, Number.isFinite(m2) ? m2 : 0);
  const raw = safe / AREA_TO_M2[unit];
  return unit === 'ha' || unit === 'ac' ? Math.round(raw * 100) / 100 : Math.round(raw);
}

export function toSquareMeters(value: number, unit: AreaUnit): number {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  return Math.max(1, Math.round(safe * AREA_TO_M2[unit]));
}

export interface PlantingPlanConfig {
  plotAreaM2: number;
  areaUnit: AreaUnit;
  densityMode: DensityMode;
  pathwaysPct: number;
  layoutPattern: LayoutPattern;
  bufferPct: 0 | 10;
  quantityOverrides: Readonly<Record<string, number>>;
}

export const DEFAULT_PLANTING_PLAN_CONFIG: PlantingPlanConfig = {
  plotAreaM2: 150,
  areaUnit: 'm2',
  densityMode: 'balanced',
  pathwaysPct: 20,
  layoutPattern: 'guild',
  bufferPct: 0,
  quantityOverrides: {},
};

export interface PlantingClimateContext {
  coldC?: number;
  hotC?: number;
  rainMm?: number;
  soilAwcDays?: number;
  soilAwcMmPerM?: number;
  cddDays?: number;
  lastSpringFrost?: string | null;
  firstAutumnFrost?: string | null;
  frostFreeDays?: number;
  falseSpringPct?: number;
}

export type StockKind = 'bareroot' | 'pot' | 'bulb' | 'seed';

export interface PlantingPlanItem {
  taxon: Taxon;
  sunBand: Stratum;
  stageLabel: string;
  spacingM: number;
  spacingLabel: string;
  unitFootprintM2: number;
  autoQty: number;
  qty: number;
  isCustom: boolean;
  isSeed: boolean;
  seedGrams: number;
  stockKind: StockKind;
  stockLabel: string;
  orderWindow: string;
  phase: 'winter' | 'spring';
  footprintM2: number;
  pctOfNet: number;
}

export interface AgronomyNote {
  kind: 'shade-timing' | 'pollination';
  label: string;
  text: string;
}

export interface StockSummary {
  bareroot: number;
  pot: number;
  bulb: number;
  seedPacks: number;
  seedGrams: number;
}

export interface PlantingPlanSummary {
  grossAreaM2: number;
  netAreaM2: number;
  pathwaysPct: number;
  densityMode: DensityMode;
  bufferPct: 0 | 10;
  items: PlantingPlanItem[];
  totalTransplants: number;
  totalUnits: number;
  totalSeedGrams: number;
  coveragePct: number;
  sunFootprint: Record<Stratum, number>;
  stockSummary: StockSummary;
  notes: AgronomyNote[];
}

export interface FieldMaterialsSummary {
  mulchM3: number;
  compostL: number;
  stakes: number;
  tags: number;
  wateringCadence: string;
  wateringDetail: string;
  effortLabel: string;
  effortHours: number;
}

export interface PlantingWave {
  id: 'w1' | 'w2' | 'w3' | 'w4';
  kicker: string;
  title: string;
  speciesIds: string[];
  tasks: string[];
}

function effectiveSunBand(t: Taxon): Stratum {
  return t.light?.preferred ?? t.stratum?.value ?? t.light?.sunniest ?? 'high';
}

function isDirectSeed(t: Taxon): boolean {
  return t.traits.is_annual === true || t.traits.grown_as_annual === true;
}

function isWoody(t: Taxon): boolean {
  const h = (t.traits.habit ?? '').toLowerCase();
  if (h.includes('tree') || h.includes('shrub')) return true;
  return (t.traits.height_m?.max ?? 0) >= 2.0 && !isDirectSeed(t);
}

function stockFor(t: Taxon): { kind: StockKind; label: string; orderWindow: string } {
  if (isDirectSeed(t)) return { kind: 'seed', label: 'Direct seed', orderWindow: 'order Jan–Feb' };
  const clonal = (t.traits.clonal_growth_form ?? '').toLowerCase();
  if (clonal.includes('bulb') || clonal.includes('rhizome') || clonal.includes('tuber')) {
    return { kind: 'bulb', label: 'Bulb / division', orderWindow: 'order Sep' };
  }
  if (isWoody(t) && (t.traits.height_m?.max ?? 0) >= 3.0) {
    return { kind: 'bareroot', label: 'Bare-root tree', orderWindow: 'order Sep–Oct' };
  }
  return { kind: 'pot', label: (t.traits.height_m?.max ?? 1) >= 1.2 ? '2 L pot' : '9 cm plug', orderWindow: 'order Feb' };
}

function formatSpacing(m: number): string {
  if (m < 1) {
    const cm = Math.max(10, Math.round((m * 100) / 5) * 5);
    return `${cm} cm × ${cm} cm`;
  }
  const r = Math.round(m * 10) / 10;
  return `${r} m × ${r} m`;
}

function stageLabelOf(t: Taxon): string {
  if (!t.phases) return isDirectSeed(t) ? 'Placenta 1' : 'Secondary 1';
  const endOrd = phases.indexOf(t.phases.end) as PhaseOrd;
  return SUCCESSION_STAGES_6[phaseToStageIndex(endOrd >= 0 ? endOrd : 3)].name;
}

/**
 * Compute an honest, density-scaled Planting Plan for a palette on a given plot area.
 */
export function computePlantingPlan(
  members: readonly Taxon[],
  config: Partial<PlantingPlanConfig> = {},
  climate: PlantingClimateContext = {},
): PlantingPlanSummary {
  const cfg: PlantingPlanConfig = { ...DEFAULT_PLANTING_PLAN_CONFIG, ...config };
  const safePlot = Number.isFinite(cfg.plotAreaM2) ? cfg.plotAreaM2 : DEFAULT_PLANTING_PLAN_CONFIG.plotAreaM2;
  const safePathways = Number.isFinite(cfg.pathwaysPct) ? cfg.pathwaysPct : DEFAULT_PLANTING_PLAN_CONFIG.pathwaysPct;
  const safeBuffer = Number.isFinite(cfg.bufferPct) ? cfg.bufferPct : DEFAULT_PLANTING_PLAN_CONFIG.bufferPct;
  const grossAreaM2 = Math.max(1, Math.round(safePlot));
  const pathwaysPct = Math.max(0, Math.min(50, Math.round(safePathways)));
  const netAreaM2 = Math.max(1, Math.round(grossAreaM2 * (1 - pathwaysPct / 100)));
  const densMult = DENSITY_MULTIPLIER[cfg.densityMode] ?? 1.0;
  const bufferMult = safeBuffer === 10 ? 1.1 : 1.0;
  const mildWinter = (climate.coldC ?? 2) >= 0;

  const byBand: Record<Stratum, Taxon[]> = { emergent: [], high: [], medium: [], low: [] };
  for (const t of members) byBand[effectiveSunBand(t)].push(t);

  // Multi-tier sun budget shares (vertical stacking allows >100% total stacked coverage).
  const bandShare: Record<Stratum, number> = { emergent: 0.42, high: 0.48, medium: 0.42, low: 0.35 };
  const sunFootprint: Record<Stratum, number> = { emergent: 0, high: 0, medium: 0, low: 0 };
  const stockSummary: StockSummary = { bareroot: 0, pot: 0, bulb: 0, seedPacks: 0, seedGrams: 0 };

  const items: PlantingPlanItem[] = members.map((t) => {
    const sunBand = effectiveSunBand(t);
    const seed = isDirectSeed(t);
    const widthM = t.traits.width_max_m ?? (isWoody(t) ? Math.max(1.5, (t.traits.height_m?.max ?? 3) * 0.65) : seed ? 0.35 : 0.7);
    const spacingM = Math.max(0.2, Math.round((widthM / Math.sqrt(densMult)) * 100) / 100);
    const unitFootprintM2 = Math.max(0.04, Math.round(spacingM * spacingM * 100) / 100);

    const peers = Math.max(1, byBand[sunBand].length);
    const targetBandM2 = netAreaM2 * bandShare[sunBand] * densMult;
    const shareM2 = targetBandM2 / peers;
    const rawQty = Math.max(1, Math.round((shareM2 / unitFootprintM2) * bufferMult));
    const maxReasonable = seed ? Math.max(10, Math.round(netAreaM2 * 2)) : Math.max(1, Math.round(netAreaM2 / Math.max(0.2, unitFootprintM2)));
    const autoQty = Math.min(rawQty, maxReasonable);

    const override = cfg.quantityOverrides[t.id];
    const isCustom = typeof override === 'number' && Number.isFinite(override) && override >= 0;
    const qty = isCustom ? Math.round(override) : autoQty;

    const stock = stockFor(t);
    const seedGrams = seed && qty > 0 ? Math.max(1, Math.ceil(qty * 0.16)) : 0;
    const footprintM2 = Math.round(qty * unitFootprintM2 * 10) / 10;
    const pctOfNet = Math.round((footprintM2 / netAreaM2) * 100);
    sunFootprint[sunBand] = Math.round((sunFootprint[sunBand] + footprintM2) * 10) / 10;

    if (qty > 0) {
      if (stock.kind === 'seed') { stockSummary.seedPacks += 1; stockSummary.seedGrams += seedGrams; }
      else if (stock.kind === 'bareroot') stockSummary.bareroot += qty;
      else if (stock.kind === 'bulb') stockSummary.bulb += qty;
      else stockSummary.pot += qty;
    }

    const phase: 'winter' | 'spring' = seed ? 'spring' : (isWoody(t) || stock.kind === 'bulb' || mildWinter) ? 'winter' : 'spring';

    return {
      taxon: t,
      sunBand,
      stageLabel: stageLabelOf(t),
      spacingM,
      spacingLabel: formatSpacing(spacingM),
      unitFootprintM2,
      autoQty,
      qty,
      isCustom,
      isSeed: seed,
      seedGrams,
      stockKind: stock.kind,
      stockLabel: stock.label,
      orderWindow: stock.orderWindow,
      phase,
      footprintM2,
      pctOfNet,
    };
  });

  const totalTransplants = items.filter((i) => !i.isSeed).reduce((s, i) => s + i.qty, 0);
  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  const totalSeedGrams = items.reduce((s, i) => s + i.seedGrams, 0);
  const totalFootprint = Object.values(sunFootprint).reduce((a, b) => a + b, 0);
  const coveragePct = Math.round((totalFootprint / netAreaM2) * 100);

  // Contextual agronomy notes (shade-timing & dioecious pollination)
  const notes: AgronomyNote[] = [];
  const shadeSpecies = items.filter((i) => i.sunBand === 'low' && i.qty > 0);
  const tallTrees = items.filter((i) => (i.sunBand === 'emergent' || i.sunBand === 'high') && isWoody(i.taxon) && i.qty > 0);
  if (shadeSpecies.length && tallTrees.length) {
    notes.push({
      kind: 'shade-timing',
      label: 'Shade-timing note',
      text: `${shadeSpecies.slice(0, 2).map((i) => i.taxon.canonical_name).join(' & ')} need dappled shade — tuck near existing walls/hedges now or plant once ${tallTrees[0].taxon.canonical_name} establishes.`,
    });
  }
  const dioecious = items.filter((i) => (i.taxon.traits.sexual_system ?? '').toLowerCase() === 'dioecious' && i.qty > 0);
  for (const d of dioecious) {
    const males = Math.max(1, Math.floor(d.qty / 5));
    const females = Math.max(0, d.qty - males);
    notes.push({
      kind: 'pollination',
      label: 'Pollination note',
      text: `${d.taxon.canonical_name} is dioecious — order ${males} male pollinator${females > 0 ? ` + ${females} female fruiting trees` : ' + at least 1 female tree'} for reliable yield.`,
    });
  }

  return {
    grossAreaM2,
    netAreaM2,
    pathwaysPct,
    densityMode: cfg.densityMode,
    bufferPct: cfg.bufferPct,
    items,
    totalTransplants,
    totalUnits,
    totalSeedGrams,
    coveragePct,
    sunFootprint,
    stockSummary,
    notes,
  };
}

/**
 * Compute concrete Year-1 field materials (mulch, compost, stakes, tags, watering, labor).
 */
export function computeFieldMaterials(
  plan: PlantingPlanSummary,
  climate: PlantingClimateContext = {},
): FieldMaterialsSummary {
  const mulchM3 = Math.max(0.5, Math.round(plan.netAreaM2 * 0.1 * 10) / 10);
  const woodyCount = plan.items.filter((i) => isWoody(i.taxon)).reduce((s, i) => s + i.qty, 0);
  const compostL = Math.max(20, woodyCount * 15 + Math.round(plan.netAreaM2 * 0.5));
  const stakes = woodyCount;
  const tags = plan.items.filter((i) => i.qty > 0).length;

  const awcDays = climate.soilAwcDays ?? 10;
  const rainMm = climate.rainMm ?? 650;
  const cddDays = climate.cddDays ?? 35;
  const dryClimate = rainMm < 700 || cddDays >= 35;
  const wateringCadence = dryClimate
    ? `~20 L / young tree every ${Math.max(4, Math.min(14, awcDays))} days`
    : `~15 L / young tree in dry spells`;
  const wateringDetail = `~${awcDays}-day soil reserve${climate.soilAwcMmPerM ? ` (${climate.soilAwcMmPerM} mm/m)` : ''} vs ${cddDays}-day summer dry streak`;

  const effortHours = Math.max(2, Math.round(plan.netAreaM2 / 25 + plan.totalTransplants * 0.18 + woodyCount * 0.35));
  const effortLabel = effortHours <= 6 ? `~${effortHours} hours · 1 person`
    : effortHours <= 16 ? `~${Math.round((effortHours / 8) * 2) / 2} days · 1–2 people`
    : `~${Math.round(effortHours / 14)} days · 2 people`;

  return { mulchM3, compostL, stakes, tags, wateringCadence, wateringDetail, effortLabel, effortHours };
}

/**
 * Build 4 chronological Year-1 planting waves anchored to the site's v0.7.0 Frost Calendar.
 */
export function computePlantingWaves(
  plan: PlantingPlanSummary,
  climate: PlantingClimateContext = {},
): PlantingWave[] {
  const mild = (climate.coldC ?? 2) >= 0;
  const frostFree = (climate.frostFreeDays ?? 280) >= 360;
  const lastSpring = climate.lastSpringFrost ?? 'mid-spring';
  const firstAutumn = climate.firstAutumnFrost ?? 'late autumn';
  const fsPct = climate.falseSpringPct ?? 12;

  const winterIds = plan.items.filter((i) => i.phase === 'winter' && i.qty > 0).map((i) => i.taxon.id);
  const springIds = plan.items.filter((i) => i.phase === 'spring' && i.qty > 0).map((i) => i.taxon.id);

  return [
    {
      id: 'w1',
      kicker: 'Wave 1 · 4–8 weeks before planting',
      title: 'Site Prep & Layout',
      speciesIds: plan.items.slice(0, 4).map((i) => i.taxon.id),
      tasks: [
        `Stake ${plan.netAreaM2} m² net planting beds with ${plan.pathwaysPct}% access paths.`,
        'Broadfork compacted zones without inverting topsoil and stage 10 cm woodchip mulch.',
      ],
    },
    {
      id: 'w2',
      kicker: mild ? `Wave 2 · Nov–Feb (First frost ${firstAutumn})` : `Wave 2 · Nov–Mar (Dormant window)`,
      title: mild ? 'Autumn / Mild-Winter Root-In' : 'Dormant Woody Root-In',
      speciesIds: winterIds,
      tasks: [
        `Plant ${winterIds.length} winter-hardy / bare-root species so winter rain settles roots deeply.`,
        'Install tree stakes, mulch rings, and weatherproof species tags.',
      ],
    },
    {
      id: 'w3',
      kicker: frostFree ? 'Wave 3 · Mar–May (Frost-free 365 days)' : `Wave 3 · After ${lastSpring} last frost (${fsPct}% false spring)`,
      title: 'Spring Sowing & Warm Planting',
      speciesIds: springIds,
      tasks: [
        frostFree
          ? `Direct-sow ~${plan.totalSeedGrams} g seed and plant warm companions early.`
          : `Wait until after ${lastSpring} last frost to direct-sow ~${plan.totalSeedGrams} g seed and set warm starts.`,
        'Keep seedbeds evenly moist until germination, then thin to recommended spacing.',
      ],
    },
    {
      id: 'w4',
      kicker: 'Wave 4 · Jun–Oct',
      title: 'Summer Care, Mulch & First Harvests',
      speciesIds: plan.items.filter((i) => i.qty > 0).slice(0, 5).map((i) => i.taxon.id),
      tasks: [
        `Top up 10 cm woodchip/straw mulch before peak heat (${climate.hotC ?? 32} °C).`,
        'Chop-and-drop biomass species and gather Year-1 harvests.',
      ],
    },
  ];
}
