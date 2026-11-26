// The .canopi writer (design check A11; stream S4): a consortium as a Canopi design file, v9, that the
// Canopi app opens. Validated against the app's own format in scripts/vendor/canopi-design-format/
// (canopi 0c425fb07) by scripts/palette-canopi-file.test.mjs and BT-9. A pure function of the
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

export interface CanopiPaletteStudioMeta {
  site?: {
    lat?: number | null;
    lon?: number | null;
    label?: string | null;
    climate?: string | null;
    country?: string | null;
  };
  overrides?: Record<string, unknown>;
  qtyById?: Record<string, number>;
  existingIds?: string[];
  pathPct?: number;
}

export interface CanopiFileOptions {
  name: string; // the design's name in the app, also the file name (canopiFileName)
  description: string | null; // where it comes from: the tool, the climate, the data release
  at: string; // ISO 8601 time of the download, given by the caller (the writer reads no clock)
  // Additive v9 Studio metadata (valid under CANOPI_FILE_SCHEMA):
  plantingPlan?: PlantingPlanConfig | null;
  designEnvelope?: DesignEnvelope;
  climateStress?: CanopiClimateStress | null;
  customPlants?: readonly CanopiCustomPlant[];
  paletteStudio?: CanopiPaletteStudioMeta | null;
  /** Original parsed document for lossless round-trip of Canopi app fields (plants, zones, layers, etc.). */
  baseDoc?: Record<string, unknown> | null;
  /** Original consortiums entries (species & non-species) preserved verbatim unless removed. */
  preservedEntries?: readonly Record<string, unknown>[];
}

export interface CanopiConsortiumEntry {
  target: { kind: 'species'; canonical_name: string };
  stratum: string;
  start_phase: number;
  end_phase: number;
  [key: string]: unknown;
}

export interface CanopiNonSpeciesEntry {
  target: { kind: string; [key: string]: unknown };
  stratum?: string;
  start_phase?: number;
  end_phase?: number;
  [key: string]: unknown;
}

export interface ParsedCanopiFile {
  version: number;
  name: string;
  description: string | null;
  consortiums: CanopiConsortiumEntry[];
  nonSpeciesEntries: CanopiNonSpeciesEntry[];
  rawConsortiums: Record<string, unknown>[];
  placedSpecies: string[];
  plantingPlan: PlantingPlanConfig | null;
  designEnvelope: DesignEnvelope | null;
  climateStress: CanopiClimateStress | null;
  customPlants: CanopiCustomPlant[];
  paletteStudio: CanopiPaletteStudioMeta | null;
  baseDoc: Record<string, unknown>;
}

function consortiumEntry(t: Taxon): CanopiConsortiumEntry {
  const target = { kind: 'species' as const, canonical_name: t.canonical_name };
  if (!t.stratum || !t.phases) return { target, stratum: CANOPI_UNASSIGNED, start_phase: DEFAULT_START, end_phase: DEFAULT_END };
  const a = phases.indexOf(t.phases.start), b = phases.indexOf(t.phases.end);
  return { target, stratum: t.stratum.value, start_phase: Math.min(a, b), end_phase: Math.max(a, b) };
}

function isSpeciesConsortiumEntry(raw: unknown): raw is CanopiConsortiumEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const target = (raw as { target?: unknown }).target;
  if (!target || typeof target !== 'object' || Array.isArray(target)) return false;
  return (target as { kind?: unknown }).kind === 'species'
    && typeof (target as { canonical_name?: unknown }).canonical_name === 'string'
    && (target as { canonical_name: string }).canonical_name.trim().length > 0;
}

function isNonSpeciesConsortiumEntry(raw: unknown): raw is CanopiNonSpeciesEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const target = (raw as { target?: unknown }).target;
  if (!target || typeof target !== 'object' || Array.isArray(target)) return false;
  const kind = (target as { kind?: unknown }).kind;
  return typeof kind === 'string' && kind !== 'species';
}

// The design file's text (JSON, two-space indented, a final newline).
export function canopiFile(members: readonly Taxon[], opts: CanopiFileOptions): string {
  const activeSpecies = new Set<string>();
  for (const t of members) activeSpecies.add(t.canonical_name.trim().toLowerCase());
  if (opts.customPlants?.length) {
    for (const cp of opts.customPlants) {
      if (cp.canonical_name?.trim()) activeSpecies.add(cp.canonical_name.trim().toLowerCase());
    }
  }

  const seenSpecies = new Set<string>();
  const consortiums: Record<string, unknown>[] = [];

  // 1. Preserve original file entries verbatim in order:
  //    - non-species targets (genus/family/etc.) always survive verbatim
  //    - species targets still in the palette keep their exact original stratum/phases/fields
  //    - species targets removed by the user are dropped
  const sourceEntries = opts.preservedEntries
    ?? (Array.isArray(opts.baseDoc?.consortiums) ? (opts.baseDoc.consortiums as Record<string, unknown>[]) : []);
  for (const entry of sourceEntries) {
    if (isSpeciesConsortiumEntry(entry)) {
      const key = entry.target.canonical_name.trim().toLowerCase();
      if (!activeSpecies.has(key) || seenSpecies.has(key)) continue;
      seenSpecies.add(key);
      consortiums.push(entry);
      continue;
    }
    // Preserve non-species targets (genus/family) and any unknown/malformed entries verbatim
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      consortiums.push(entry);
    }
  }

  // 2. Append newly added catalog members
  for (const t of members) {
    const key = t.canonical_name.trim().toLowerCase();
    if (seenSpecies.has(key)) continue;
    seenSpecies.add(key);
    consortiums.push(consortiumEntry(t));
  }

  // 3. Append newly added custom/unrecognized plants not already preserved above
  if (opts.customPlants?.length) {
    for (const cp of opts.customPlants) {
      const canon = cp.canonical_name?.trim();
      if (!canon) continue;
      const key = canon.toLowerCase();
      if (seenSpecies.has(key)) continue;
      seenSpecies.add(key);
      consortiums.push({
        target: { kind: 'species', canonical_name: canon },
        stratum: cp.stratum ?? CANOPI_UNASSIGNED,
        start_phase: cp.start_phase ?? DEFAULT_START,
        end_phase: cp.end_phase ?? DEFAULT_END,
      });
    }
  }

  const doc: Record<string, unknown> = opts.baseDoc
    ? {
        ...opts.baseDoc,
        version: CANOPI_FILE_VERSION,
        name: opts.name,
        description: opts.description ?? (typeof opts.baseDoc.description === 'string' ? opts.baseDoc.description : null),
        consortiums,
        created_at: typeof opts.baseDoc.created_at === 'string' ? opts.baseDoc.created_at : opts.at,
        updated_at: opts.at,
      }
    : {
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
  const coreEntryKeys = new Set(['canonical_name', 'stratum', 'start_phase', 'end_phase']);
  const hasExtraCustomMeta = (c: CanopiCustomPlant) =>
    Object.entries(c).some(([k, v]) => !coreEntryKeys.has(k) && v != null && v !== '');
  if (opts.customPlants && opts.customPlants.length > 0) {
    const keepTopLevel = opts.customPlants.filter(hasExtraCustomMeta);
    if (keepTopLevel.length > 0 || (opts.baseDoc && Array.isArray(opts.baseDoc.customPlants))) {
      doc.customPlants = opts.customPlants.map((c) => ({ ...c }));
    } else {
      delete doc.customPlants;
    }
  } else if (opts.customPlants !== undefined) {
    delete doc.customPlants;
  }
  if (opts.paletteStudio) doc.paletteStudio = opts.paletteStudio;
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

function parsePaletteStudioMeta(raw: unknown): CanopiPaletteStudioMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: CanopiPaletteStudioMeta = {};
  if (r.site && typeof r.site === 'object' && !Array.isArray(r.site)) {
    const s = r.site as Record<string, unknown>;
    out.site = {
      ...(typeof s.lat === 'number' && Number.isFinite(s.lat) ? { lat: s.lat } : {}),
      ...(typeof s.lon === 'number' && Number.isFinite(s.lon) ? { lon: s.lon } : {}),
      ...(typeof s.label === 'string' && s.label.trim() ? { label: s.label.trim() } : {}),
      ...(typeof s.climate === 'string' && s.climate.trim() ? { climate: s.climate.trim() } : {}),
      ...(typeof s.country === 'string' && /^[A-Z]{2}$/i.test(s.country.trim()) ? { country: s.country.trim().toUpperCase() } : {}),
    };
  }
  if (r.overrides && typeof r.overrides === 'object' && !Array.isArray(r.overrides)) {
    out.overrides = { ...(r.overrides as Record<string, unknown>) };
  }
  if (r.qtyById && typeof r.qtyById === 'object' && !Array.isArray(r.qtyById)) {
    const qtyById: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.qtyById as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 1) qtyById[k] = Math.round(v);
    }
    out.qtyById = qtyById;
  }
  if (Array.isArray(r.existingIds)) {
    out.existingIds = r.existingIds.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof r.pathPct === 'number' && Number.isFinite(r.pathPct)) {
    out.pathPct = Math.max(0, Math.min(50, Math.round(r.pathPct)));
  }
  return out;
}

/**
 * Pure parser for .canopi v1–v9 files. Preserves baseDoc, rawConsortiums (including non-species
 * targets like genus/family), plantingPlan, designEnvelope, climateStress, paletteStudio, and
 * custom/unrecognized plants losslessly for round-tripping.
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

  const rawConsortiums: Record<string, unknown>[] = [];
  const consortiums: CanopiConsortiumEntry[] = [];
  const nonSpeciesEntries: CanopiNonSpeciesEntry[] = [];
  const seenCanon = new Set<string>();

  if (Array.isArray(doc.consortiums)) {
    for (const c of doc.consortiums) {
      if (isSpeciesConsortiumEntry(c)) {
        rawConsortiums.push(c);
        consortiums.push(c);
        seenCanon.add(c.target.canonical_name.trim().toLowerCase());
      } else if (isNonSpeciesConsortiumEntry(c)) {
        rawConsortiums.push(c);
        nonSpeciesEntries.push(c);
      } else if (c && typeof c === 'object' && !Array.isArray(c)) {
        // Keep malformed/unknown target entries verbatim so round-tripping never drops data
        rawConsortiums.push(c as Record<string, unknown>);
      }
    }
  }

  const placedSpecies: string[] = [];
  if (Array.isArray(doc.plants)) {
    for (const pl of doc.plants) {
      if (!pl || typeof pl !== 'object' || Array.isArray(pl)) continue;
      const p = pl as Record<string, unknown>;
      const canon = (typeof p.species_canonical_name === 'string' && p.species_canonical_name.trim())
        || (typeof p.canonical_name === 'string' && p.canonical_name.trim())
        || (p.species && typeof p.species === 'object' && typeof (p.species as Record<string, unknown>).canonical_name === 'string'
          ? ((p.species as Record<string, unknown>).canonical_name as string).trim()
          : '');
      if (canon && !seenCanon.has(canon.toLowerCase())) {
        seenCanon.add(canon.toLowerCase());
        placedSpecies.push(canon);
      }
    }
  }

  const plantingPlan = parsePlantingPlan(doc.plantingPlan);
  const designEnvelope: DesignEnvelope | null = doc.designEnvelope === 'typical' || doc.designEnvelope === 'extreme10' ? doc.designEnvelope : null;
  const climateStress = doc.climateStress && typeof doc.climateStress === 'object' && !Array.isArray(doc.climateStress)
    ? (doc.climateStress as CanopiClimateStress)
    : null;
  const customPlants: CanopiCustomPlant[] = Array.isArray(doc.customPlants)
    ? doc.customPlants.filter((c): c is CanopiCustomPlant => Boolean(c && typeof c === 'object' && typeof (c as CanopiCustomPlant).canonical_name === 'string'))
    : [];
  const paletteStudio = parsePaletteStudioMeta(doc.paletteStudio);
  return {
    version,
    name,
    description,
    consortiums,
    nonSpeciesEntries,
    rawConsortiums,
    placedSpecies,
    plantingPlan,
    designEnvelope,
    climateStress,
    customPlants,
    paletteStudio,
    baseDoc: { ...doc },
  };
}

// A file name every system accepts: the reserved characters become "-", blank becomes "consortium",
// at most MAX_NAME characters before ".canopi".
export function canopiFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const safe = name.replace(/[\u0000-\u001f/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  return (safe || 'consortium') + '.canopi';
}
