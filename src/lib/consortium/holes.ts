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
import type { Fillers, Hole, HoleChange, HoleKind, HoleRank, JobGap, JobId, LaneCount, PaletteGoals, PhaseOrd, PlantId, PlantVerdict, Stratum, TargetPosition, Taxon, ThinChange } from './types.ts';
import { jobIds, strata } from './types.ts';
import { jobsOf, phaseSpan } from './jobs.ts';
import { JUDGED_FROM_YEAR, JUDGED_TO_YEAR, PHASE_YEARS, yearsOf } from './years.ts';
import { DEFAULT_GOALS } from './site-inputs.ts';

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

// Unknown is never a hole (owner, v13 hand-off item 3): the members whose data could fill it is not
// recorded (unknowns), standing in the years of a gap, are its `unchecked`: the title says "nobody known".
const standsIn = (t: Taxon, from: number, to: number): boolean => {
  const y = yearsOf(t);
  return !!y && y.from < to && (y.to === null || y.to > Math.max(from, JUDGED_FROM_YEAR));
};
function holesOf(kind: 'job' | 'light', what: JobId | Stratum, doers: readonly Taxon[], pending: boolean, unknowns: readonly Taxon[] = []): Hole[] {
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
    };
    if (kind === 'job') hole.job = what as JobId; else hole.stratum = what as Stratum;
    const unchecked = unknowns.filter((t) => standsIn(t, from, to)).map((t) => t.id);
    if (unchecked.length) hole.unchecked = unchecked;
    return hole;
  });
}

// Every hole of the palette, sorted by rank, then fromYear, then job order (jobIds) and light order
// (strata), jobs before light levels. Not-judged gaps are listed (drawn
// as thin lines) and never chosen as the next step.
export function holes(ctx: HoleContext): Hole[] {
  const doing = ctx.members.filter((t) => counts(ctx, t));
  const out: Hole[] = [];
  // Jobs not curated (functions null) leave every function job unknown; feeds_you comes from the role.
  const jobsUnknown = doing.filter((t) => t.functions === null);
  const lightUnknown = doing.filter((t) => !t.stratum);
  for (const job of jobIds) out.push(...holesOf('job', job, doing.filter((t) => jobsOf(t).includes(job)), ctx.pending, job === 'feeds_you' ? [] : jobsUnknown));
  for (const s of strata) out.push(...holesOf('light', s, doing.filter((t) => t.stratum?.value === s), ctx.pending, lightUnknown));
  return out.sort((a, b) => a.rank - b.rank || a.fromYear - b.fromYear); // stable: generation order breaks ties
}

// Every lane's plant count per time step, jobs then light levels (jobIds, strata order), and each
// job's thin years against the palette goal (redundancy: a job below its target is thin, distinct from
// a hole at 0). Counts every member that stands there (a member outside its range counts for nothing,
// as in holes()); no lane is capped at a count: 200 plants in one lane count 200.
export function laneCounts(ctx: HoleContext, goals: PaletteGoals = DEFAULT_GOALS): LaneCount[] {
  const doing = ctx.members.filter((t) => counts(ctx, t));
  const spans = new Map(doing.map((t) => [t.id, new Set<number>(phaseSpan(t))]));
  const jobsUnknown = doing.filter((t) => t.functions === null), lightUnknown = doing.filter((t) => !t.stratum);
  const judged = (p: number) => p < JUDGED_PHASES && (PHASE_YEARS[p][1] as number) > JUDGED_FROM_YEAR;
  const lane = (kind: 'job' | 'light', doers: readonly Taxon[], unknowns: readonly Taxon[], target: number): Omit<LaneCount, 'job' | 'stratum'> => {
    const n = PHASE_YEARS.map((_, p) => doers.filter((t) => spans.get(t.id)!.has(p)).length);
    const thin: LaneCount['thin'] = [];
    let start: number | null = null;
    for (let p = 0; p <= JUDGED_PHASES; p++) {
      const low = p < JUDGED_PHASES && judged(p) && n[p] > 0 && n[p] < target;
      if (low && start === null) start = p;
      if (!low && start !== null) { thin.push({ fromYear: Math.max(PHASE_YEARS[start][0], JUDGED_FROM_YEAR), toYear: PHASE_YEARS[p - 1][1] as number, have: Math.min(...n.slice(start, p)), want: target }); start = null; }
    }
    const unchecked = unknowns.filter((t) => standsIn(t, JUDGED_FROM_YEAR, JUDGED_TO_YEAR)).map((t) => t.id);
    return { kind, counts: n, thin, ...(unchecked.length ? { unchecked } : {}) };
  };
  return [
    ...jobIds.map((job) => ({ ...lane('job', doing.filter((t) => jobsOf(t).includes(job)), job === 'feeds_you' ? [] : jobsUnknown, goals.plantsPerJob), job })),
    ...strata.map((s) => ({ ...lane('light', doing.filter((t) => t.stratum?.value === s), lightUnknown, 0), stratum: s })),
  ];
}

// ---- Thin spots and the next target (v14 spec 0W-1 items 1, 2) ----

// A thin spot ranks after every hole (HoleRank 7); a put-off thin spot is keyed by its job, so it stays
// put off after a recount (a goal change, an add) as long as that job is still thin.
export const THIN_RANK: HoleRank = 7;
export const thinKey = (job: JobId): string => `thin:${job}`;
// One Hole-shaped target per thin stretch of a job, in job order then years: fills() and fillers()
// read it unchanged. pending: a member's list is still loading (every thin spot pending, never a
// false one).
export function thinTargets(lanes: readonly LaneCount[], pending = false): Hole[] {
  const out: Hole[] = [];
  for (const l of lanes) {
    if (l.kind !== 'job' || !l.job) continue;
    for (const t of l.thin) {
      out.push({ id: `${thinKey(l.job)}:${t.fromYear}-${t.toYear}`, kind: 'job', rank: THIN_RANK, job: l.job, fromYear: t.fromYear, toYear: t.toYear, state: pending ? 'pending' : 'open', thin: { have: t.have, want: t.want } });
    }
  }
  return out;
}

// Where a target stands: a hole among the open holes ("hole 1 of 7 · then 5 thin spots"), or a thin
// spot among the thin spots ("thin spot 1 of 5"). index is 1-based; thinCount the open thin spots.
const isOpen = (h: Hole): boolean => h.state === 'open';
const putOffOf = (h: Hole, putOff: ReadonlySet<string>): boolean => putOff.has(h.thin && h.job ? thinKey(h.job) : h.id);
export function targetPosition(holeList: readonly Hole[], thins: readonly Hole[], target: Hole, hasFits?: (h: Hole) => boolean): TargetPosition {
  const open = rankedHoles(holeList, hasFits).filter(isOpen), openThins = thins.filter(isOpen);
  const list = target.thin ? openThins : open;
  return { kind: target.thin ? 'thin' : 'hole', index: list.findIndex((h) => h.id === target.id) + 1, of: list.length, thinCount: openThins.length };
}
// The holes in the Next step's order (pf-decisions 2026-11-18, v13 ranking change, kept by v14 'Parked'):
// a cooler-months food hole comes first when plants that fit the place fill it (hasFits), the others
// keep their rank order. Without hasFits, or with no such hole, the list as it is.
export const isCoolFoodHole = (h: Hole): boolean => h.kind === 'cool' && (!h.job || h.job === 'feeds_you');
export function rankedHoles(holeList: readonly Hole[], hasFits?: (h: Hole) => boolean): readonly Hole[] {
  const cool = hasFits ? holeList.find((h) => isOpen(h) && isCoolFoodHole(h) && hasFits(h)) : undefined;
  return cool ? [cool, ...holeList.filter((h) => h !== cool)] : holeList;
}
// The next target: the first open hole not put off (rankedHoles' order), else the first open thin spot
// whose job is not put off. putOff holds hole ids and thin keys (thinKey).
export function nextTarget(holeList: readonly Hole[], thins: readonly Hole[], putOff: ReadonlySet<string> = new Set(), hasFits?: (h: Hole) => boolean): (TargetPosition & { target: Hole }) | null {
  const ranked = rankedHoles(holeList, hasFits);
  const target = ranked.find((h) => isOpen(h) && !putOffOf(h, putOff)) ?? thins.find((h) => isOpen(h) && !putOffOf(h, putOff));
  return target ? { target, ...targetPosition(ranked, thins, target) } : null;
}

// The plants a bulk add takes for a target: fits only, in fillers order (best fit first); a hole wants
// the goal, a thin spot want − have; never more than fit (none: []).
export function bestToAdd(target: Hole, fillers: Fillers, goals: PaletteGoals = DEFAULT_GOALS): PlantId[] {
  const n = target.thin ? Math.max(0, target.thin.want - target.thin.have) : goals.plantsPerJob;
  return fillers.fits.slice(0, n).map((t) => t.id);
}

// What a change did to the open holes, paired by kind and lane (job or light level) and overlapping
// years: added (a new hole, or one that grew), closed, narrowed (the same lane's hole, shorter), open
// (the open holes after). Holes not open (pending, not judged) are left out on both sides.
const laneOf = (h: Hole): string => `${h.kind}:${h.job ?? h.stratum ?? ''}:${h.months?.join(',') ?? ''}`;
const overlaps = (a: Hole, b: Hole): boolean => a.fromYear < b.toYear && b.fromYear < a.toYear;
export function holeChange(before: readonly Hole[], after: readonly Hole[]): HoleChange {
  const was = before.filter(isOpen), now = after.filter(isOpen);
  const out: HoleChange = { added: [], closed: [], narrowed: [], open: now };
  const matched = new Set<Hole>();
  for (const h of now) {
    const pair = was.find((b) => laneOf(b) === laneOf(h) && overlaps(b, h));
    if (!pair) { out.added.push(h); continue; }
    matched.add(pair);
    if (pair.fromYear === h.fromYear && pair.toYear === h.toYear) continue;
    if (h.fromYear >= pair.fromYear && h.toYear <= pair.toYear) out.narrowed.push({ before: pair, after: h });
    else out.added.push(h);
  }
  for (const b of was) if (!matched.has(b) && !now.some((h) => laneOf(b) === laneOf(h) && overlaps(b, h))) out.closed.push(b);
  return out;
}

// What a change did to the thin spots, paired by job and overlapping years: ended (thin before, not
// now), still (thin before and now: the counts after), added (a job newly thin).
export function thinChange(beforeThins: readonly Hole[], afterThins: readonly Hole[]): ThinChange {
  const out: ThinChange = { ended: [], still: [], added: [] };
  const sameJob = (a: Hole, b: Hole) => a.job === b.job && overlaps(a, b);
  for (const h of afterThins) {
    if (beforeThins.some((b) => sameJob(b, h))) out.still.push({ job: h.job!, have: h.thin?.have ?? 0, want: h.thin?.want ?? 0, fromYear: h.fromYear, toYear: h.toYear });
    else out.added.push(h);
  }
  for (const b of beforeThins) if (!afterThins.some((h) => sameJob(b, h))) out.ended.push(b);
  return out;
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

// The no-fit state of a target (R3; board Many, word map row 151): decided by the group counts, never
// by one group alone. "No plant on your lists fits your place and does this then." only when no plant
// fits and none is still to be checked: plants not checked were never judged, so they keep the card out
// of it. Plants that need a second look do not fit (the board's own sentence: "no plant on your lists
// fits here and does this then; 4 need a second look"), so they stay listed under their own heading
// below that sentence, with "See all N" leading to them.
export const noneFits = (f: Pick<Fillers, 'fits' | 'unknown'>): boolean => f.fits.length + f.unknown.length === 0;

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
