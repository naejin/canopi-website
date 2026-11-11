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

// The app's design file format version this writer targets (CURRENT_CANOPI_FILE_VERSION at 0c425fb07).
export const CANOPI_FILE_VERSION = 9;
// The app's stratum for a plant whose layer is not known yet, and its default phases.
export const CANOPI_UNASSIGNED = 'unassigned';
const DEFAULT_START = 0, DEFAULT_END = 2;
const MAX_NAME = 120;

export interface CanopiFileOptions {
  name: string; // the design's name in the app, also the file name (canopiFileName)
  description: string | null; // where it comes from: the tool, the climate, the data release
  at: string; // ISO 8601 time of the download, given by the caller (the writer reads no clock)
}

export interface CanopiConsortiumEntry {
  target: { kind: 'species'; canonical_name: string };
  stratum: string;
  start_phase: number;
  end_phase: number;
}

export function consortiumEntry(t: Taxon): CanopiConsortiumEntry {
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
  const doc = {
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
  return JSON.stringify(doc, null, 2) + '\n';
}

// A file name every system accepts: the reserved characters become "-", blank becomes "consortium",
// at most MAX_NAME characters before ".canopi".
export function canopiFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const safe = name.replace(/[\u0000-\u001f/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
  return (safe || 'consortium') + '.canopi';
}
