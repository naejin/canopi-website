// Your plants at scale (v14 pf-e; boards Many, ManyDesk): each member as one item (its fit rank, the
// reason it shows, its main job, light level, years and family), sorted, grouped and searched. Pure: no
// DOM, no store, no words (the view says them), so scripts/consortium-pf-e.test.mjs runs it in Node.
//
// Fit order (board Many: "Sorted by fit: plants outside their range first, then those that need a
// second look"): outside its climate range, a second look, fits with a mark (Mildly toxic), fits, not
// checked; then by name. The groups and the second look's reasons are core weigh.ts fitGroups' (the
// lines of Warnings and fit), so a row and the line it is counted on always agree.
import type { FitGroups, JobId, PlantId, Stratum, Taxon, WarnReason } from '../../../../lib/palette/index.ts';
import { fold, jobsOf, strata, yearsOf } from '../../../../lib/palette/index.ts';

export type SortKey = 'fit' | 'name' | 'light' | 'job' | 'years';
export type GroupKey = 'light' | 'job' | 'fit' | 'family' | 'none';
const SORTS: readonly SortKey[] = ['fit', 'name', 'light', 'job', 'years'];
const GROUPS: readonly GroupKey[] = ['light', 'job', 'fit', 'family', 'none'];
// A row's line: outside, a second look, fits (with a mark or not), not checked.
type FitLevel = 'outside' | 'look' | 'fits' | 'unknown';
type Reason = WarnReason | 'mild' | null;
export interface PlantItem {
  id: PlantId; t: Taxon; name: string;
  level: FitLevel; reason: Reason; rank: number;
  jobs: JobId[]; jobsKnown: boolean; job: JobId | null;
  stratum: Stratum | null; from: number | null; family: string | null;
}

// The second look's reason a row names first: the plant's own danger before the place's.
const REASON_ORDER: readonly WarnReason[] = ['severe', 'moderate', 'invasive', 'edge', 'misfit', 'clash'];
const RANK: Record<FitLevel, number> = { outside: 0, look: 1, fits: 3, unknown: 4 };

export function plantItems(members: readonly Taxon[], g: FitGroups, nameOf: (t: Taxon) => string): PlantItem[] {
  const level = new Map<PlantId, FitLevel>();
  for (const k of ['outside', 'look', 'fits', 'unknown'] as const) for (const id of g[k]) level.set(id, k);
  const reason = new Map<PlantId, Reason>();
  for (const r of [...REASON_ORDER].reverse()) for (const id of g.reasons[r]) reason.set(id, r);
  const mild = new Set(g.mild);
  const seen = new Set<PlantId>(), out: PlantItem[] = [];
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const lv = level.get(t.id) ?? 'unknown';
    const why: Reason = lv === 'look' ? reason.get(t.id) ?? null : lv === 'fits' && mild.has(t.id) ? 'mild' : null;
    const jobs = jobsOf(t);
    out.push({
      id: t.id, t, name: nameOf(t), level: lv, reason: why, rank: lv === 'fits' && why === 'mild' ? 2 : RANK[lv],
      jobs, jobsKnown: t.functions !== null, job: jobs[0] ?? null,
      stratum: t.stratum?.value ?? null, from: yearsOf(t)?.from ?? null, family: t.family ?? null,
    });
  }
  return out;
}

// The small form's order (boards PaletteMore, Recife: "Plants with a warning come first"): the big
// list's fit rank (outside its climate range, a second look, marks only, fits, not checked), the
// palette's order within a rank. A row the page cannot show (no item) is not checked: last. A warned
// row (warnedOf: a warning in words, core yourPlants' `warned`) ranks at most as "marks only" (R4), so
// the lede's promise holds in every verdict state: a Mildly toxic plant with no verdict yet, or a fits
// plant with a medium conflict, never sits after a plain one.
const MARKS_ONLY = 2;
export function byFitRank<R>(rows: readonly R[], idOf: (r: R) => PlantId, rankOf: ReadonlyMap<PlantId, number>, warnedOf: (r: R) => boolean = () => false): R[] {
  const NOT_CHECKED = RANK.unknown;
  const key = (r: R) => { const k = rankOf.get(idOf(r)) ?? NOT_CHECKED; return warnedOf(r) ? Math.min(k, MARKS_ONLY) : k; };
  return rows.map((r, at) => ({ r, at, k: key(r) })).sort((a, b) => a.k - b.k || a.at - b.at).map((x) => x.r);
}

const LIGHT_AT = (s: Stratum | null): number => (s ? strata.indexOf(s) : strata.length);
const JOB_AT = (j: JobId | null, order: readonly JobId[]): number => (j ? order.indexOf(j) : order.length);
export function sortItems(items: readonly PlantItem[], key: SortKey, compare: (a: string, b: string) => number, jobOrder: readonly JobId[]): PlantItem[] {
  const byName = (a: PlantItem, b: PlantItem) => compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const first: Record<SortKey, (a: PlantItem, b: PlantItem) => number> = {
    fit: (a, b) => a.rank - b.rank,
    name: () => 0,
    light: (a, b) => LIGHT_AT(a.stratum) - LIGHT_AT(b.stratum),
    job: (a, b) => JOB_AT(a.job, jobOrder) - JOB_AT(b.job, jobOrder),
    years: (a, b) => (a.from ?? Infinity) - (b.from ?? Infinity),
  };
  return [...items].sort((a, b) => first[key](a, b) || byName(a, b));
}

// A group: its key (a light level, a job, a fit line, a family, or '' for none of them) and items.
export interface PlantGroup { key: string; items: PlantItem[] }
// The groups in their order (light levels sunniest first; jobs in the jobs picture's order; the fit
// lines as Warnings and fit lists them; families by name), the items keeping the sort's order. An
// item with no light level, job or family goes in the last group ('' key). 'none': one group.
export function groupItems(items: readonly PlantItem[], key: GroupKey, compare: (a: string, b: string) => number, jobOrder: readonly JobId[]): PlantGroup[] {
  if (key === 'none') return items.length ? [{ key: '', items: [...items] }] : [];
  const keyOf: Record<Exclude<GroupKey, 'none'>, (i: PlantItem) => string> = {
    light: (i) => i.stratum ?? '', job: (i) => (i.jobsKnown ? i.job ?? '' : ''), fit: (i) => i.level, family: (i) => i.family ?? '',
  };
  const by = new Map<string, PlantItem[]>();
  for (const i of items) { const k = keyOf[key](i); const l = by.get(k); if (l) l.push(i); else by.set(k, [i]); }
  const order: Record<Exclude<GroupKey, 'none'>, readonly string[]> = {
    light: strata, job: jobOrder, fit: ['outside', 'look', 'fits', 'unknown'],
    family: [...by.keys()].filter(Boolean).sort(compare),
  };
  const keys = [...order[key].filter((k) => by.has(k)), ...(by.has('') ? [''] : [])];
  return keys.map((k) => ({ key: k, items: by.get(k)! }));
}

// The items whose name or scientific name holds the query (folded: accents, case); all for none.
export function searchItems(items: readonly PlantItem[], query: string): PlantItem[] {
  const q = fold(query.trim());
  if (!q) return [...items];
  return items.filter((i) => fold(`${i.name} ${i.t.canonical_name}`).includes(q));
}

// A group's rows shown at a fold stage (board Many: "a group opens to its first 10 names, then '+ N
// more'"): 0 closed, 1 the first STEP, 2 all. A search shows every match.
const STEP = 10;
export function shownRows(count: number, stage: 0 | 1 | 2): number {
  return stage === 0 ? 0 : stage === 1 ? Math.min(count, STEP) : count;
}
