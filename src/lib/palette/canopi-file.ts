// The .canopi writer (design check A11; stream S4): a consortium as a Canopi design file, v9, that the
// Canopi app opens. Validated against the app's own format in scripts/vendor/canopi-design-format/
// (canopi 0c425fb07) by scripts/consortium-canopi-file.test.mjs and BT-9. A pure function of the
// core: no DOM, no clock, no import outside this folder. Exported from index.ts since commit 0.
//
// What the file carries: one `consortiums` entry per member, in member order (a plant listed twice is
// written once): target {kind 'species', canonical_name}, the stratum as canopi-data names it
// (emergent, high, medium, low; the app's own values) and start_phase / end_phase as phases.ord 0–6
// (the app's seven succession phases, placenta 1 to climax). A plant with no layer yet (no accepted
// placement) gets the app's own default entry: 'unassigned', phases 0–2 (createDefaultConsortiumEntry
// in the app's consortium/time-model.ts), so it is never dropped. A guest keeps its home placement.
// No plant is placed on a map (`plants` stays empty): the reader places them in the app, whose
// consortium sync only adds entries for placed plants and never removes these.
import type { Taxon } from './types.ts';
import { phases } from './types.ts';
import type { AreaUnit, DensityMode, DesignEnvelope, LayoutPattern, PlantingPlanConfig } from './planting-plan.ts';

// The app's design file format version this writer targets (CURRENT_CANOPI_FILE_VERSION at 0c425fb07).
export const CANOPI_FILE_VERSION = 9;
// The app's stratum for a plant whose layer is not known yet, and its default phases.
const CANOPI_UNASSIGNED = 'unassigned';
const DEFAULT_START = 0, DEFAULT_END = 2;
const MAX_NAME = 120;

export interface CanopiClimateStress {
  preset: string;
  custom?: boolean;
  extremes?: {
    coldSnapC?: number;
    heatDomeC?: number;
    heatDays35?: number;
    dryStreakDays?: number;
    falseSpringPct?: number;
    saturation?: string;
  };
}

export interface CanopiCustomPlant {
  id?: string;
  canonical_name: string;
  common_name?: string;
  notes?: string;
  stratum?: string;
  start_phase?: number;
  end_phase?: number;
  raw?: Record<string, unknown>;
}

export interface CanopiFileOptions {
  name: string; // the design's name in the app, also the file name (canopiFileName)
  description: string | null; // where it comes from: the tool, the climate, the data release
  at: string; // ISO 8601 time of the download, given by the caller (the writer reads no clock)
  // Additive v9 Studio metadata (valid under CANOPI_FILE_SCHEMA additionalProperties: true):
  plantingPlan?: PlantingPlanConfig | null;
  designEnvelope?: DesignEnvelope;
  climateStress?: CanopiClimateStress | null;
  customPlants?: readonly CanopiCustomPlant[];
}

export interface CanopiConsortiumEntry {
  target: { kind: 'species'; canonical_name: string };
  stratum: string;
  start_phase: number;
  end_phase: number;
}

export interface ParsedCanopiFile {
  version: number;
  name: string;
  description: string | null;
  consortiums: CanopiConsortiumEntry[];
  plantingPlan: PlantingPlanConfig | null;
  designEnvelope: DesignEnvelope | null;
  climateStress: CanopiClimateStress | null;
  customPlants: CanopiCustomPlant[];
}

function consortiumEntry(t: Taxon): CanopiConsortiumEntry {
  const target = { kind: 'species' as const, canonical_name: t.canonical_name };
  if (!t.stratum || !t.phases) return { target, stratum: CANOPI_UNASSIGNED, start_phase: DEFAULT_START, end_phase: DEFAULT_END };
  const a = phases.indexOf(t.phases.start), b = phases.indexOf(t.phases.end);
  return { target, stratum: t.stratum.value, start_phase: Math.min(a, b), end_phase: Math.max(a, b) };
}

// The design file's text (JSON, two-space indented, a final newline).
export function canopiFile(members: readonly Taxon[], opts: CanopiFileOptions): string {
  const seen = new Set<string>();
  const consortiums: CanopiConsortiumEntry[] = [];
  for (const t of members) {
    if (seen.has(t.canonical_name)) continue;
    seen.add(t.canonical_name);
    consortiums.push(consortiumEntry(t));
  }
  if (opts.customPlants?.length) {
    for (const cp of opts.customPlants) {
      if (!cp.canonical_name || seen.has(cp.canonical_name)) continue;
      seen.add(cp.canonical_name);
      consortiums.push({
        target: { kind: 'species', canonical_name: cp.canonical_name },
        stratum: cp.stratum ?? CANOPI_UNASSIGNED,
        start_phase: cp.start_phase ?? DEFAULT_START,
        end_phase: cp.end_phase ?? DEFAULT_END,
      });
    }
  }
  const doc: Record<string, unknown> = {
    version: CANOPI_FILE_VERSION,
    name: opts.name,
    description: opts.description,
    plant_species_colors: {},
    layers: [],
    plants: [],
    zones: [],
    annotations: [],
    consortiums,
    groups: [],
    timeline: [],
    budget: [],
    created_at: opts.at,
    updated_at: opts.at,
  };
  if (opts.plantingPlan) doc.plantingPlan = { ...opts.plantingPlan, quantityOverrides: { ...opts.plantingPlan.quantityOverrides } };
  if (opts.designEnvelope) doc.designEnvelope = opts.designEnvelope;
  if (opts.climateStress) doc.climateStress = opts.climateStress;
  if (opts.customPlants?.length) doc.customPlants = opts.customPlants.map((c) => ({ ...c }));
  return JSON.stringify(doc, null, 2) + '\n';
}

const AREA_UNIT_SET = new Set<AreaUnit>(['m2', 'ha', 'ft2', 'ac']);
const DENSITY_SET = new Set<DensityMode>(['spacious', 'balanced', 'dense']);
const LAYOUT_SET = new Set<LayoutPattern>(['guild', 'alley', 'grid']);

function parsePlantingPlan(raw: unknown): PlantingPlanConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const plotAreaM2 = typeof r.plotAreaM2 === 'number' && Number.isFinite(r.plotAreaM2) && r.plotAreaM2 > 0 ? Math.round(r.plotAreaM2) : 150;
  const areaUnit = AREA_UNIT_SET.has(r.areaUnit as AreaUnit) ? (r.areaUnit as AreaUnit) : 'm2';
  const densityMode = DENSITY_SET.has(r.densityMode as DensityMode) ? (r.densityMode as DensityMode) : 'balanced';
  const pathwaysPct = typeof r.pathwaysPct === 'number' && Number.isFinite(r.pathwaysPct) ? Math.max(0, Math.min(50, Math.round(r.pathwaysPct))) : 20;
  const layoutPattern = LAYOUT_SET.has(r.layoutPattern as LayoutPattern) ? (r.layoutPattern as LayoutPattern) : 'guild';
  const bufferPct: 0 | 10 = r.bufferPct === 10 ? 10 : 0;
  const quantityOverrides: Record<string, number> = {};
  if (r.quantityOverrides && typeof r.quantityOverrides === 'object' && !Array.isArray(r.quantityOverrides)) {
    for (const [k, v] of Object.entries(r.quantityOverrides as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) quantityOverrides[k] = Math.round(v);
    }
  }
  return { plotAreaM2, areaUnit, densityMode, pathwaysPct, layoutPattern, bufferPct, quantityOverrides };
}

/**
 * Pure parser for .canopi v9 files. Preserves plantingPlan, designEnvelope, climateStress,
 * and unknown/custom plants losslessly for round-tripping.
 */
export function parseCanopiFile(jsonText: string): ParsedCanopiFile {
  let raw: unknown;
  try { raw = JSON.parse(jsonText); } catch (err) { throw new Error(`Invalid .canopi JSON: ${(err as Error).message}`); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid .canopi document: expected a JSON object.');
  const doc = raw as Record<string, unknown>;
  const version = typeof doc.version === 'number' ? doc.version : 0;
  if (version < 1 || version > CANOPI_FILE_VERSION) throw new Error(`Unsupported .canopi version: ${String(doc.version)}`);
  const name = typeof doc.name === 'string' && doc.name.trim() ? doc.name.trim() : 'Untitled palette';
  const description = typeof doc.description === 'string' ? doc.description : null;
  const consortiums: CanopiConsortiumEntry[] = Array.isArray(doc.consortiums)
    ? doc.consortiums.filter((c): c is CanopiConsortiumEntry =>
        Boolean(c && typeof c === 'object' && (c as CanopiConsortiumEntry).target?.kind === 'species' && typeof (c as CanopiConsortiumEntry).target?.canonical_name === 'string'))
    : [];
  const plantingPlan = parsePlantingPlan(doc.plantingPlan);
  const designEnvelope: DesignEnvelope | null = doc.designEnvelope === 'typical' || doc.designEnvelope === 'extreme10' ? doc.designEnvelope : null;
  const climateStress = doc.climateStress && typeof doc.climateStress === 'object' && !Array.isArray(doc.climateStress)
    ? (doc.climateStress as CanopiClimateStress)
    : null;
  const customPlants: CanopiCustomPlant[] = Array.isArray(doc.customPlants)
    ? doc.customPlants.filter((c): c is CanopiCustomPlant => Boolean(c && typeof c === 'object' && typeof (c as CanopiCustomPlant).canonical_name === 'string'))
    : [];
  return { version, name, description, consortiums, plantingPlan, designEnvelope, climateStress, customPlants };
}

// A file name every system accepts: the reserved characters become "-", blank becomes "consortium",
// at most MAX_NAME characters before ".canopi".
export function canopiFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const safe = name.replace(/[\u0000-\u001f/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  return (safe || 'consortium') + '.canopi';
}
