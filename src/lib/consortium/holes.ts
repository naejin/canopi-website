// Holes and the plants that fill them (plant-palette-architecture 3.3). Imports verdict types only
// (never verdict.ts or suggest.ts: no cycle). Off the first run: the palette chunk computes holes
// from memberVerdicts, poolVerdicts and verdictContext. Kinds today: a job nobody does and a light
// level nobody fills (for every judged year, or part of them); F3 and F5 insert their kinds into
// HOLE_ORDER. jobGapsByPhase moved here from jobs.ts (the one gap engine, architecture 7.3).
//
// - A plant stands in the years of its stages (years.ts yearsOf). A member outside its climate range
//   for the page period fills nothing (inventory M2): it is not counted as a doer.
// - The judged window is year 1 to year 60 (owner): a gap that ends by year 1 is 'not-judged' (a thin
//   line, never a hole); nothing after year 60 is raised; a gap ending at 60 runs "after year n".
// - While a guest list loads (ctx.pending), every hole is 'pending', never a false hole (marker P11).
import type { Fillers, Hole, HoleKind, HoleRank, JobGap, JobId, PhaseOrd, PlantId, PlantVerdict, Stratum, Taxon } from './types.ts';
import { jobIds, strata } from './types.ts';
import { jobsOf, phaseSpan } from './jobs.ts';
import { JUDGED_FROM_YEAR, JUDGED_TO_YEAR, PHASE_YEARS, yearsOf } from './years.ts';

// Rank (concept.md "Rules"), one row per kind and extent, in order: 1 a whole job nobody does, 2 a
// whole light level nobody fills, 3 flowering (two months or more), 4 a job or light level empty for
// part of the years, 5 cool season, 6 soil. A hole's rank is read from here, never a literal.
export const HOLE_ORDER: readonly { kind: HoleKind; whole?: boolean; rank: HoleRank }[] = [
  { kind: 'job', whole: true, rank: 1 },
  { kind: 'light', whole: true, rank: 2 },
  { kind: 'flowering', rank: 3 },
  { kind: 'job', whole: false, rank: 4 },
  { kind: 'light', whole: false, rank: 4 },
  { kind: 'cool', rank: 5 },
  { kind: 'soil', rank: 6 },
];

// The rank of a hole of `kind`, whole (every judged year) or for part of the years.
export function holeRank(kind: HoleKind, whole: boolean): HoleRank {
  const row = HOLE_ORDER.find((r) => r.kind === kind && (r.whole === undefined || r.whole === whole));
  return row ? row.rank : 6;
}

// What holes() reads: the members (as plants), their verdicts for the page period (null: the verdict
// rule is not here; nobody is ruled out then, and the page says the holes were computed without
// verdicts), and whether a member's list is still loading.
export interface HoleContext {
  members: readonly Taxon[];
  verdicts: ReadonlyMap<PlantId, PlantVerdict> | null;
  pending: boolean;
}

// The 12-bit month mask of a month list, in hex (the id suffix of flowering and cool holes).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthMask = (months: readonly string[]): string => months.reduce((m, x) => m | (1 << MONTHS.indexOf(x)), 0).toString(16);

export function holeId(kind: HoleKind, what: string, fromYear: number, toYear: number, months?: readonly string[]): string {
  return `${kind}:${what}:${fromYear}-${toYear}${months?.length ? `:m${monthMask(months)}` : ''}`;
}

// The phases (0..5: up to year 60) a set of plants covers, and the gaps left as year spans.
const JUDGED_PHASES = PHASE_YEARS.length - 1; // the climax phase (60 on) is never judged
function gaps(covered: ReadonlySet<number>): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (let p = 0; p <= JUDGED_PHASES; p++) {
    const free = p < JUDGED_PHASES && !covered.has(p);
    if (free && start === null) start = p;
    if (!free && start !== null) {
      out.push({ from: PHASE_YEARS[start][0], to: PHASE_YEARS[p - 1][1] as number });
      start = null;
    }
  }
  return out;
}

const counts = (ctx: HoleContext, t: Taxon): boolean => ctx.verdicts?.get(t.id)?.level !== 'outside';

function holesOf(kind: 'job' | 'light', what: JobId | Stratum, doers: readonly Taxon[], pending: boolean): Hole[] {
  const covered = new Set<number>(doers.flatMap((t) => phaseSpan(t)));
  return gaps(covered).map(({ from, to }) => {
    const notJudged = to <= JUDGED_FROM_YEAR;
    // Whole: the gap covers every judged year (year 1 to 60), so a job done only in the first months
    // is a job nobody does (rank 1), never "part of the years".
    const whole = from <= JUDGED_FROM_YEAR && to === JUDGED_TO_YEAR;
    const id = holeId(kind, what, from, to);
    const hole: Hole = {
      id, kind, rank: holeRank(kind, whole), fromYear: from, toYear: to,
      state: notJudged ? 'not-judged' : pending ? 'pending' : 'open',
      preset: kind === 'job' ? { job: what as JobId, hole: id } : { hole: id },
    };
    if (kind === 'job') hole.job = what as JobId; else hole.stratum = what as Stratum;
    return hole;
  });
}

// Every hole of the palette, sorted by rank, then fromYear, then job order (jobIds) and light order
// (strata), jobs before light levels. Not-judged gaps are listed (drawn
// as thin lines) and never chosen as the next step.
export function holes(ctx: HoleContext): Hole[] {
  const doing = ctx.members.filter((t) => counts(ctx, t));
  const out: Hole[] = [];
  for (const job of jobIds) out.push(...holesOf('job', job, doing.filter((t) => jobsOf(t).includes(job)), ctx.pending));
  for (const s of strata) out.push(...holesOf('light', s, doing.filter((t) => t.stratum?.value === s), ctx.pending));
  return out.sort((a, b) => a.rank - b.rank || a.fromYear - b.fromYear); // stable: generation order breaks ties
}

// The next hole to fill: the first open one in rank order, skipping those the grower put off ("Not
// now", this page only). A hole a suggestion filled is gone from the list, so it is never the next step.
export function nextStep(list: readonly Hole[], skip: ReadonlySet<string> = new Set()): Hole | null {
  return list.find((h) => h.state === 'open' && !skip.has(h.id)) ?? null;
}

// Whether a plant fills a hole: it does the job (or stands in the light level) in some judged year of
// it. Holes are judged from JUDGED_FROM_YEAR, so the hole's start is clipped there: a plant standing
// only before year 1 (Lettuce, first 90 days) would leave the hole open (0-60 becomes 0.25-60), and a
// plant counts as filling a hole only if adding it changes that hole (pre-push fix 1). The one
// predicate NextStep, fillers() and suggest.ts's hole gain share.
export function fills(hole: Hole, taxon: Taxon): boolean {
  if (hole.kind === 'job' ? !hole.job || !jobsOf(taxon).includes(hole.job) : hole.kind === 'light' ? taxon.stratum?.value !== hole.stratum : true) return false;
  if (hole.kind !== 'job' && hole.kind !== 'light') return false;
  const y = yearsOf(taxon);
  const from = Math.max(hole.fromYear, JUDGED_FROM_YEAR);
  return !!y && y.from < hole.toYear && (y.to === null || y.to > from);
}

// The plants that fill a hole, grouped: fits; needs a second look (level look, or a toxic or invasive
// warning: never dropped, warn never hide); outside its range; not checked. Members are left out.
// Ranked by the open holes filled (of `open`, else this one), then holding to the latest period
// (holds), then name.
export function fillers(hole: Hole, pool: readonly Taxon[], verdicts: ReadonlyMap<PlantId, PlantVerdict>,
  holds: ReadonlyMap<PlantId, boolean>, warned: ReadonlySet<PlantId>, members: readonly Taxon[], open: readonly Hole[] = [hole]): Fillers {
  const inPalette = new Set(members.map((t) => t.id));
  const out: Fillers = { fits: [], look: [], outside: [], unknown: [] };
  const score = new Map<PlantId, number>();
  for (const t of pool) {
    if (inPalette.has(t.id) || !fills(hole, t)) continue;
    score.set(t.id, open.filter((h) => h.state === 'open' && fills(h, t)).length);
    const level = verdicts.get(t.id)?.level ?? 'unknown';
    if (level === 'outside') out.outside.push(t);
    else if (level === 'look' || warned.has(t.id)) out.look.push(t);
    else if (level === 'fits') out.fits.push(t);
    else out.unknown.push(t);
  }
  const rank = (a: Taxon, b: Taxon) => (score.get(b.id)! - score.get(a.id)!)
    || (Number(holds.get(b.id) ?? false) - Number(holds.get(a.id) ?? false))
    || (a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : 0);
  for (const g of Object.values(out)) g.sort(rank);
  return out;
}

const ALL_PHASES: readonly PhaseOrd[] = [0, 1, 2, 3, 4, 5, 6];

// For each job, in order: the members that do it and the phases where none of them grows. A member
// with no placement yet does its job in no phase. (Moved from jobs.ts; print and Details read it.)
export function jobGapsByPhase(members: Taxon[]): JobGap[] {
  const doers = new Map<JobId, PlantId[]>(jobIds.map((j) => [j, []]));
  const covered = new Map<JobId, Set<PhaseOrd>>(jobIds.map((j) => [j, new Set()]));
  for (const t of members) {
    const span = phaseSpan(t);
    for (const j of jobsOf(t)) {
      doers.get(j)!.push(t.id);
      for (const p of span) covered.get(j)!.add(p);
    }
  }
  return jobIds.map((job) => ({ job, members: doers.get(job)!, missing: ALL_PHASES.filter((p) => !covered.get(job)!.has(p)) }));
}
