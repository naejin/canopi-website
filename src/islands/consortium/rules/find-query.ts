// Find's rules (PP-C c1; boards Find, FindResults, FindFilters, FindJob): how a list of plants is
// grouped by how it fits the place, which plants each filter keeps and how many it cannot judge, and
// which jobs a typed word names. Pure (ADR-1: rules import the core only): the view hands in the
// verdicts, the predicates that read the store (holds up later, toxic, invasive) and the job words of
// the page's language, so scripts/consortium-pp-c1.test.mjs runs it in Node.
//
// Inform, don't block (owner 2026-11-14): no group hides a plant. A plant with a warning (a serious
// conflict, a site misfit, toxic, recorded as invasive in the country) that fits otherwise needs a
// second look; a plant with no verdict is "not checked", never a fit.
import type { JobId, Level, PlantId, PlantVerdict, Taxon } from '../../../lib/consortium/index.ts';
import { jobIds, jobsOf, queryTokens, fold } from '../../../lib/consortium/index.ts';

export interface FindGroups { fits: Taxon[]; look: Taxon[]; outside: Taxon[]; unchecked: Taxon[] }
export const GROUPS = ['fits', 'look', 'outside', 'unchecked'] as const;
export type Group = (typeof GROUPS)[number];

// A plant's group: its verdict's level, a warned fit moved to "needs a second look".
function groupOf(level: Level | undefined, warned: boolean): Group {
  if (level === 'outside') return 'outside';
  if (level === 'look' || (level === 'fits' && warned)) return 'look';
  if (level === 'fits') return 'fits';
  return 'unchecked';
}

// Plants grouped in their order; verdicts null (the rule not loaded or refused): all not checked.
export function findGroups(taxa: readonly Taxon[], verdicts: ReadonlyMap<PlantId, PlantVerdict> | null, warned: ReadonlySet<PlantId>): FindGroups {
  const out: FindGroups = { fits: [], look: [], outside: [], unchecked: [] };
  for (const t of taxa) out[groupOf(verdicts?.get(t.id)?.level, warned.has(t.id))].push(t);
  return out;
}

// ---- filters (board FindFilters: each says what it is for) ----

export const LIGHTS = ['sun', 'semi_shade', 'full_shade'] as const;
export type Light = (typeof LIGHTS)[number];
export const SIZES = ['small', 'middle', 'tall'] as const; // under 2 m, 2 to 8 m, over 8 m tall
export type Size = (typeof SIZES)[number];
export const LIVES = ['season', 'few', 'long'] as const; // one season, a few years, long-lived
export type Life = (typeof LIVES)[number];

export interface FindFilters {
  jobs?: readonly JobId[];
  light?: readonly Light[];
  size?: readonly Size[];
  life?: readonly Life[];
  edible?: boolean;
  range?: boolean; // well inside its range only (needs a location)
  holds?: boolean; // holds up by the first later period (needs a location)
  hideToxic?: boolean;
  hideInvasive?: boolean;
}
export type FilterId = 'job' | 'light' | 'size' | 'life-cycle' | 'edible' | 'range' | 'holds' | 'toxic' | 'invasive';

// What the filters read beyond the plant: its verdict, whether it holds up later, whether it is toxic
// or invasive in the country (null: not known).
export interface FilterContext {
  verdicts?: ReadonlyMap<PlantId, PlantVerdict> | null;
  holds?: (t: Taxon) => boolean | null;
  toxic?: (t: Taxon) => boolean | null;
  invasive?: (t: Taxon) => boolean | null;
}

const lightOf = (t: Taxon, l: Light): boolean | null => {
  const v = l === 'sun' ? t.traits.sun : l === 'semi_shade' ? t.traits.semi_shade : t.traits.full_shade;
  return v ?? null;
};
const sizeOf = (t: Taxon): Size | null => {
  const h = t.traits.height_m?.max;
  return h == null ? null : h < 2 ? 'small' : h <= 8 ? 'middle' : 'tall';
};
// One season: annual or grown as one; a few years: a short lifespan; long-lived: moderate or long.
const lifeOf = (t: Taxon): Life | null => {
  if (t.traits.is_annual || t.traits.grown_as_annual) return 'season';
  const span = t.traits.lifespan;
  return span === 'Short' ? 'few' : span === 'Moderate' || span === 'Long' ? 'long' : null;
};
const any = <T>(chosen: readonly T[], test: (x: T) => boolean | null): boolean | null => {
  let unknown = false;
  for (const c of chosen) { const r = test(c); if (r) return true; if (r === null) unknown = true; }
  return unknown ? null : false;
};

// Each active filter's test of one plant: true keeps it, false leaves it out, null cannot judge it.
function tests(f: FindFilters, ctx: FilterContext): [FilterId, (t: Taxon) => boolean | null][] {
  const out: [FilterId, (t: Taxon) => boolean | null][] = [];
  if (f.jobs?.length) out.push(['job', (t) => { const j = jobsOf(t); return f.jobs!.some((x) => j.includes(x)) ? true : t.functions === null && t.role !== 'crop' ? null : false; }]);
  if (f.light?.length) out.push(['light', (t) => any(f.light!, (l) => lightOf(t, l))]);
  if (f.size?.length) out.push(['size', (t) => { const s = sizeOf(t); return s === null ? null : f.size!.includes(s); }]);
  if (f.life?.length) out.push(['life-cycle', (t) => { const l = lifeOf(t); return l === null ? null : f.life!.includes(l); }]);
  if (f.edible) out.push(['edible', (t) => (t.traits.edibility_rating == null ? null : t.traits.edibility_rating > 0)]);
  if (f.range) out.push(['range', (t) => {
    const v = ctx.verdicts?.get(t.id);
    if (!v || v.level === 'unknown') return null;
    return v.level === 'fits' && !v.factors.some((x) => x.confidence?.term === 'edge');
  }]);
  if (f.holds) out.push(['holds', (t) => ctx.holds?.(t) ?? null]);
  if (f.hideToxic) out.push(['toxic', (t) => { const x = ctx.toxic?.(t) ?? null; return x === null ? null : !x; }]);
  if (f.hideInvasive) out.push(['invasive', (t) => { const x = ctx.invasive?.(t) ?? null; return x === null ? null : !x; }]);
  return out;
}

// The plants every active filter keeps, and per filter the number it could not judge (left out, and
// said: "12 with no size recorded", never hidden silently). A hide filter (toxic, invasive) keeps a
// plant it cannot judge: it hides only what is recorded.
export function applyFilters(taxa: readonly Taxon[], filters: FindFilters, ctx: FilterContext): { rows: Taxon[]; unknown: Partial<Record<FilterId, number>> } {
  const active = tests(filters, ctx), unknown: Partial<Record<FilterId, number>> = {};
  for (const [id] of active) unknown[id] = 0;
  const rows = taxa.filter((t) => {
    let keep = true;
    for (const [id, test] of active) {
      const r = test(t);
      if (r === null) { unknown[id]! += 1; if (id !== 'toxic' && id !== 'invasive') keep = false; } else if (!r) keep = false;
    }
    return keep;
  });
  return { rows, unknown };
}

// ---- job words (board FindJob) ----

// The jobs a typed word names: every token of the query begins a word of one of the job's words in
// the page's language (its label and its other words: "windbreak", "hedge" for shelter). wordsOf: a
// job's words, from the view's strings.
export function jobsMatching(query: string, wordsOf: (job: JobId) => readonly string[]): JobId[] {
  const { admission, tokens } = queryTokens(query);
  if (admission !== 'active-text') return [];
  const q = fold(query);
  return jobIds.filter((job) => wordsOf(job).some((w) => {
    const f = fold(w);
    return f === q || f.startsWith(q) || tokens.every((t) => f.startsWith(t) || f.includes(` ${t}`));
  }));
}
