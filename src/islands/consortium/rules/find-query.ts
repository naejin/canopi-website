// Find's rules (PP-C c1; boards Find, FindResults, FindFilters, FindJob): how a list of plants is
// grouped by how it fits the place, which plants each filter keeps and how many it cannot judge, and
// which jobs a typed word names. Pure (ADR-1: rules import the core only): the view hands in the
// verdicts, the predicates that read the store (holds up later, toxic, invasive) and the job words of
// the page's language, so scripts/consortium-pp-c1.test.mjs runs it in Node.
//
// Inform, don't block (owner 2026-11-14): no group hides a plant. A plant with a warning (a serious
// conflict, a site misfit, toxic, recorded as invasive in the country) that fits otherwise needs a
// second look; a plant with no verdict is "not checked", never a fit.
import type { Hole, JobId, Level, PeriodId, PlantId, PlantVerdict, Taxon } from '../../../lib/consortium/index.ts';
import { fills, jobIds, jobsOf, queryTokens, fold, strata, yearsOf } from '../../../lib/consortium/index.ts';

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

// Best first (board FindResults "Best first: the holes a plant fills, then how long it stays in its
// climate range"): by the palette's open holes a plant fills, then the later periods it stays in range
// through, then how firmly it fits (well inside its range before near its edge: 1, 0), then the fewest
// warnings, then the most jobs (c1r3 T7: ties after the years read best first, never A to Z), then the
// order it came in (stable: the name order).
export function bestFirst(taxa: readonly Taxon[], filled: ReadonlyMap<PlantId, number>, stay: ReadonlyMap<PlantId, number>, firm: ReadonlyMap<PlantId, number> = new Map(), warnings: ReadonlyMap<PlantId, number> = new Map()): Taxon[] {
  const f = (t: Taxon) => filled.get(t.id) ?? 0, y = (t: Taxon) => stay.get(t.id) ?? 0, w = (t: Taxon) => firm.get(t.id) ?? 0;
  const n = (t: Taxon) => warnings.get(t.id) ?? 0, jobs = new Map(taxa.map((t) => [t.id, jobsOf(t).length] as const));
  return [...taxa].sort((a, b) => f(b) - f(a) || y(b) - y(a) || w(b) - w(a) || n(a) - n(b) || jobs.get(b.id)! - jobs.get(a.id)!);
}
// Whether a verdict fits well inside the plant's range (fits, no factor near its edge).
export const wellInside = (v: PlantVerdict | undefined): boolean => !!v && v.level === 'fits' && !v.factors.some((x) => x.confidence?.term === 'edge');

// Whether an add says "added with a warning" (with Show), and a plant's group "needs a second look":
// the one rule in the store (store.warnedPlant over core secondLook; pf hand-off, owner answer Q2).

// ---- filters (board FindFilters: each says what it is for) ----

// Light is the plant's stratum (owner 2026-11-17, layer is light): Full sun / Mostly sun / Part shade / Shade.
export const LIGHTS = strata;
export type Light = (typeof LIGHTS)[number];
export const SIZES = ['small', 'middle', 'tall'] as const; // under 2 m, 2 to 8 m, over 8 m tall
export type Size = (typeof SIZES)[number];
// When it stands (board FindFilters "To fill a gap in time"): the years after planting each choice
// covers, [from, to) (to null: no end); a plant stands in one when its years meet them.
export const STANDS = { first: [0, 1], early: [1, 15], late: [15, null] } as const satisfies Record<string, readonly [number, number | null]>;
export type Stand = keyof typeof STANDS;

export interface FindFilters {
  jobs?: readonly JobId[];
  light?: readonly Light[];
  size?: readonly Size[];
  stands?: readonly Stand[];
  range?: boolean; // well inside its range only (needs a location)
  holds?: readonly PeriodId[]; // inside its range in each of these later periods (needs a location)
  hideNoSize?: boolean;
  hideToxic?: boolean;
  hideInvasive?: boolean;
  hideNoLight?: boolean;
  fills?: boolean; // fills a hole or a thin job (AddMany: on when Find opens from a thin spot)
}
export type FilterId = 'job' | 'light' | 'size' | 'stands' | 'range' | 'holds' | 'no-size' | 'toxic' | 'invasive' | 'fills' | 'no-light';

// What the filters read beyond the plant: its verdict, whether it holds in a later period, whether it
// is toxic or invasive in the country (null: not known).
export interface FilterContext {
  verdicts?: ReadonlyMap<PlantId, PlantVerdict> | null;
  holds?: (t: Taxon, period: PeriodId) => boolean | null;
  toxic?: (t: Taxon) => boolean | null;
  invasive?: (t: Taxon) => boolean | null;
  // The open holes and open thin spots (core holes.ts thinTargets), for "Fills a hole or a thin job".
  targets?: readonly Hole[];
}
// The filters that hide (a plant they cannot judge stays): they say how many they hide.
const HIDES: ReadonlySet<FilterId> = new Set(['toxic', 'invasive']);

const lightOf = (t: Taxon, l: Light): boolean | null => (t.stratum ? t.stratum.value === l : null);
const sizeOf = (t: Taxon): Size | null => {
  const h = t.traits.height_m?.max;
  return h == null ? null : h < 2 ? 'small' : h <= 8 ? 'middle' : 'tall';
};
const any = <T>(chosen: readonly T[], test: (x: T) => boolean | null): boolean | null => {
  let unknown = false;
  for (const c of chosen) { const r = test(c); if (r) return true; if (r === null) unknown = true; }
  return unknown ? null : false;
};

// Each active filter's test of one plant: true keeps it, false leaves it out, null cannot judge it.
function tests(f: FindFilters, ctx: FilterContext): [FilterId, (t: Taxon) => boolean | null][] {
  const out: [FilterId, (t: Taxon) => boolean | null][] = [];
  if (f.fills) out.push(['fills', (t) => (ctx.targets ?? []).some((h) => fills(h, t))]);
  if (f.jobs?.length) out.push(['job', (t) => { const j = jobsOf(t); return f.jobs!.some((x) => j.includes(x)) ? true : t.functions === null && t.role !== 'crop' ? null : false; }]);
  if (f.light?.length) out.push(['light', (t) => any(f.light!, (l) => lightOf(t, l))]);
  if (f.size?.length) out.push(['size', (t) => { const s = sizeOf(t); return s === null ? null : f.size!.includes(s); }]);
  if (f.stands?.length) out.push(['stands', (t) => {
    const y = yearsOf(t);
    return y === null ? null : f.stands!.some((s) => { const [from, to] = STANDS[s]; return (to === null || y.from < to) && (y.to === null || y.to > from); });
  }]);
  if (f.range) out.push(['range', (t) => {
    const v = ctx.verdicts?.get(t.id);
    if (!v || v.level === 'unknown') return null;
    return wellInside(v);
  }]);
  if (f.holds?.length) out.push(['holds', (t) => {
    let unknown = false;
    for (const p of f.holds!) { const r = ctx.holds?.(t, p) ?? null; if (r === false) return false; if (r === null) unknown = true; }
    return unknown ? null : true;
  }]);
  if (f.hideNoSize) out.push(['no-size', (t) => sizeOf(t) !== null]);
  if (f.hideNoLight) out.push(['no-light', (t) => !!t.stratum]);
  if (f.hideToxic) out.push(['toxic', (t) => { const x = ctx.toxic?.(t) ?? null; return x === null ? null : !x; }]);
  if (f.hideInvasive) out.push(['invasive', (t) => { const x = ctx.invasive?.(t) ?? null; return x === null ? null : !x; }]);
  return out;
}

// The plants every active filter keeps; per filter the number it could not judge (left out, and said:
// "12 with no size recorded", never hidden silently) and the number only it left out (the plants it took
// off the list; a hide filter says it: "12 hidden as toxic"). A hide filter (toxic, invasive)
// keeps a plant it cannot judge: it hides only what is recorded.
export function applyFilters(taxa: readonly Taxon[], filters: FindFilters, ctx: FilterContext): { rows: Taxon[]; unknown: Partial<Record<FilterId, number>>; hidden: Partial<Record<FilterId, number>> } {
  const active = tests(filters, ctx), unknown: Partial<Record<FilterId, number>> = {}, hidden: Partial<Record<FilterId, number>> = {};
  for (const [id] of active) { unknown[id] = 0; hidden[id] = 0; }
  const rows = taxa.filter((t) => {
    const out: [FilterId, boolean][] = []; // the filters leaving it out, and whether each judged it
    for (const [id, test] of active) {
      const r = test(t);
      if (r === null) { unknown[id]! += 1; if (!HIDES.has(id)) out.push([id, false]); } else if (!r) out.push([id, true]);
    }
    // A plant this filter alone leaves out counts as hidden by it: the plants it took off the list.
    if (out.length === 1 && out[0][1]) hidden[out[0][0]]! += 1;
    return out.length === 0;
  });
  return { rows, unknown, hidden };
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
