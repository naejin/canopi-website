// The consortium suggestion and the Swap list (stream S1; design check §2: the v1 greedy structure,
// rewritten for the 4 × 7 grid). The suggestion is a deterministic greedy fill around the plants
// already in the palette (the seed; inventory C6, PP-B commit 0a'): at each step it adds the plant
// with the highest gain, and it stops at the room's size or when no plant brings anything new.
//
//   gain = 10·new jobs + 3·open holes filled (core holes.ts holes() of the plants chosen so far, each
//          tested with fills(), the one predicate the palette's fillers share; PP-B b1b, in place of
//          the cell terms) + 6·new stratum + 4·phases with nothing to eat yet (crops)
//          + 4·second doer of feeds-soil, ground or mulch + 1·edibility − 3·weed potential
//          − 0.5·unknown site answers
//
// A member outside its range for the page period (the verdicts passed in) fills nothing, so the
// holes it leaves stay open (inventory M2). Gains are counted in tenths, as integers, so equal gains
// tie exactly. "Something new" is a new job, an open hole filled, a phase with food, or a needed
// second doer; edibility and unknowns only rank.
// A plant that misfits the site (beside the layers chosen so far), grows taller than the room (an
// advisory note elsewhere, owner request 2026-11-12: the suggestion prefers plants that fit the room
// naturally) or has a high conflict with a member is never picked; invasiveness is a warning only and never scores
// (owner, 2026-10-28), except on an exact tie (A10, owner Q1): of two plants that bring the same, the one
// not invasive in the chosen country (checked), or, with none, invasive in no GRIIS country, is picked.
// Guests (plants added from another climate's list) are never picked or offered in Swap; a seeded
// guest is a member like any other and counts for coverage, with its home placement.
import type { Alternative, Fit, Flag, Hole, Interaction, JobId, PlantId, Site, Stratum, Taxon } from './types.ts';
import { canopyOf, fits, FULL_CANOPY, misfitsBeside, raise, shadedBy, tallerThanRoom } from './site.ts';
import { jobsOf, phaseSpan } from './jobs.ts';
import { fills, holes } from './holes.ts';
import type { HoleContext } from './holes.ts';
import type { FlagContext } from './conflicts.ts';
import { warns, conflicts, flagsFor, invasiveIn, isSerious } from './conflicts.ts';

// Suggestions stay small (owner, 2026-10-28): 6, 9 or 12 plants by room; 9 with Room "Not sure"
// (design check A7, coordinator row "v2 build setup", revertible). The room limits plant size, never
// the number of plants the reader adds.
// Pots or a balcony (offered by Place since PP-B b1a) takes the small garden's count; its plant height
// limit is site.ts ROOM_LIMIT_M, which tallerThanRoom applies.
export const SIZE_LIMIT: Record<Site['room'], number> = { pots: 6, small: 6, large: 9, field: 12, unsure: 9 };

export interface SuggestOptions extends FlagContext {
  seed?: PlantId[]; // the plants already in the palette: always members, flagged or not; the seed wins over removed
  removed?: PlantId[]; // never picked automatically
  guests?: Taxon[]; // plants from other climates' lists, with `from` set; members only when seeded
  verdicts?: HoleContext['verdicts']; // the plants' verdicts for the page period (store.poolVerdicts); none: nobody is outside
}
export interface Suggestion { members: PlantId[]; limit: number }
export interface Gain { total: number; jobs: number; holes: number; strata: number; food: number; backup: number; edibility: number; weedy: number; unknowns: number }

interface Info { taxon: Taxon; jobs: JobId[]; stratum: Stratum | null; span: number[]; edibility: number; weedy: boolean; fit: Fit }
// The open holes of the members (taxa), worked out when a gain first asks and again after each add.
interface Coverage { jobs: Map<JobId, number>; strata: Set<Stratum>; food: Set<number>; canopy: number[]; taxa: Taxon[]; verdicts: HoleContext['verdicts']; open: Hole[] | null }

const BACKED_UP: readonly JobId[] = ['feeds_soil', 'ground', 'mulch'];

// Infos are cached per taxon object and site, so the Swap lists of a whole consortium stay fast.
const infoCache = new WeakMap<Taxon, Map<string, Info>>();
function infoOf(taxon: Taxon, site: Site): Info {
  const key = `${site.light} ${site.soil} ${site.water} ${site.room}`;
  let bySite = infoCache.get(taxon);
  if (!bySite) infoCache.set(taxon, (bySite = new Map()));
  let info = bySite.get(key);
  if (!info) {
    info = {
      taxon,
      jobs: jobsOf(taxon),
      stratum: taxon.stratum?.value ?? null,
      span: phaseSpan(taxon),
      edibility: taxon.traits.edibility_rating ?? 0,
      weedy: taxon.warnings.weed_potential === true,
      fit: fits(taxon, site),
    };
    bySite.set(key, info);
  }
  return info;
}

const emptyCoverage = (verdicts: HoleContext['verdicts']): Coverage => ({ jobs: new Map(), strata: new Set(), food: new Set(), canopy: [...canopyOf([])], taxa: [], verdicts, open: null });
function add(cov: Coverage, i: Info) {
  for (const j of i.jobs) cov.jobs.set(j, (cov.jobs.get(j) ?? 0) + 1);
  if (i.jobs.includes('feeds_you')) for (const p of i.span) cov.food.add(p);
  if (i.stratum) cov.strata.add(i.stratum);
  raise(cov.canopy, i.taxon);
  cov.taxa.push(i.taxon);
  cov.open = null;
}
const coverageOf = (infos: Info[], verdicts: HoleContext['verdicts'] = null) => { const cov = emptyCoverage(verdicts); for (const i of infos) add(cov, i); return cov; };
const openHoles = (cov: Coverage): Hole[] =>
  (cov.open ??= holes({ members: cov.taxa, verdicts: cov.verdicts, pending: false }).filter((h) => h.state === 'open'));

function tenths(i: Info, cov: Coverage) {
  const jobs = 100 * i.jobs.filter((j) => !cov.jobs.has(j)).length;
  // Holes scored exactly as holes() counts the plant once added: outside its range for the period, it
  // fills none (holes.ts counts), so the hole stays open and is no reason to pick it (b1br-2).
  let filled = 0;
  if (cov.verdicts?.get(i.taxon.id)?.level !== 'outside') for (const h of openHoles(cov)) if (fills(h, i.taxon)) filled++;
  const holeGain = 30 * filled;
  const strataGain = i.stratum && !cov.strata.has(i.stratum) ? 60 : 0;
  const food = i.jobs.includes('feeds_you') ? 40 * i.span.filter((p) => !cov.food.has(p)).length : 0;
  const backup = 40 * i.jobs.filter((j) => BACKED_UP.includes(j) && cov.jobs.get(j) === 1).length;
  const edibility = 10 * i.edibility;
  const weedy = i.weedy ? -30 : 0;
  const unknowns = i.fit.unknowns.length ? -5 * i.fit.unknowns.length : 0; // never -0
  return { jobs, holes: holeGain, strata: strataGain, food, backup, edibility, weedy, unknowns, total: jobs + holeGain + strataGain + food + backup + edibility + weedy + unknowns };
}
const isNew = (t: ReturnType<typeof tenths>) => t.jobs + t.holes + t.food + t.backup > 0;

// What the plant would add to these members on this site, term by term (verdicts: as suggest's).
export function gain(taxon: Taxon, members: Taxon[], site: Site, verdicts: HoleContext['verdicts'] = null): Gain {
  const t = tenths(infoOf(taxon, site), coverageOf(members.map((m) => infoOf(m, site)), verdicts));
  return { total: t.total / 10, jobs: t.jobs / 10, holes: t.holes / 10, strata: t.strata / 10, food: t.food / 10, backup: t.backup / 10, edibility: t.edibility / 10, weedy: t.weedy / 10, unknowns: t.unknowns / 10 };
}

// Ties go to the better-known plant (named in more languages), then by canonical name in code-unit
// order, the same in every browser and in Node.
const known = (t: Taxon) => Object.keys(t.names).length;
const byName = (a: Taxon, b: Taxon) =>
  a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const byKnownThenName = (a: Taxon, b: Taxon) => known(b) - known(a) || byName(a, b);

// For each plant id, the ids it has a high conflict with (either side of the row).
function seriousPartners(taxa: Taxon[], interactions: Interaction[]): Map<PlantId, Set<PlantId>> {
  const out = new Map<PlantId, Set<PlantId>>();
  const link = (a: PlantId, b: PlantId) => { if (!out.has(a)) out.set(a, new Set()); out.get(a)!.add(b); };
  for (const c of conflicts(taxa, interactions)) if (isSerious(c)) { link(c.a.id, c.b.id); link(c.b.id, c.a.id); }
  return out;
}

// Whether the plant loses a tie for invasiveness: invasive in the chosen country when GRIIS was checked
// for it; otherwise (no country, or one not checked) invasive in any GRIIS country.
function tieInvasive(options: FlagContext): (t: Taxon) => boolean {
  const { country, countryStatus } = options;
  if (country && countryStatus === 'checked') return (t) => invasiveIn(t, country, true) === true;
  return (t) => (t.warnings.invasive_in?.length ?? 0) > 0;
}

export function suggest(pool: Taxon[], options: SuggestOptions): Suggestion {
  const { site } = options;
  const invasive = tieInvasive(options);
  const limit = SIZE_LIMIT[site.room];
  const seedIds = new Set(options.seed ?? []);
  const removedIds = new Set(options.removed ?? []);
  const own = new Set(pool.map((t) => t.id));
  const guests = (options.guests ?? []).filter((g, i, all) => !own.has(g.id) && all.findIndex((x) => x.id === g.id) === i);
  const sorted = [...pool].sort(byKnownThenName);
  const infos = sorted.map((t) => infoOf(t, site));
  const partners = seriousPartners([...pool, ...guests], options.interactions);

  // The seeded plants in tie order, then the seeded guests.
  const all = [...infos, ...[...guests].sort(byKnownThenName).map((t) => infoOf(t, site))];
  const chosen: Info[] = [];
  const memberIds = new Set<PlantId>();
  for (const i of all) if (seedIds.has(i.taxon.id) && !memberIds.has(i.taxon.id)) { chosen.push(i); memberIds.add(i.taxon.id); }
  const cov = coverageOf(chosen, options.verdicts ?? null);

  // A plant whose only misfit is the light may still join under a canopy, checked at each pick.
  const lightOnly = (i: Info) => i.fit.misfits.length === 1 && i.fit.misfits[0] === 'light' && shadedBy(i.taxon, site, FULL_CANOPY);
  const candidates = infos.filter((i) => !memberIds.has(i.taxon.id) && !removedIds.has(i.taxon.id) && !tallerThanRoom(i.fit) && (!i.fit.misfits.length || lightOnly(i)));

  while (chosen.length < limit) {
    let best: Info | null = null, bestGain = -Infinity;
    for (const i of candidates) {
      if (memberIds.has(i.taxon.id)) continue;
      if (i.fit.misfits.length && misfitsBeside(i.taxon, site, cov.canopy, i.fit).length) continue;
      const p = partners.get(i.taxon.id);
      if (p) { let clash = false; for (const id of p) if (memberIds.has(id)) { clash = true; break; } if (clash) continue; }
      const t = tenths(i, cov);
      if (!isNew(t)) continue;
      if (t.total > bestGain || (t.total === bestGain && best && invasive(best.taxon) && !invasive(i.taxon))) { best = i; bestGain = t.total; }
    }
    if (!best) break;
    chosen.push(best);
    memberIds.add(best.taxon.id);
    add(cov, best);
  }
  // A seeded plant neither the pool nor the guests hold (a guest whose list failed, PP-B21, or one on
  // no list at hand) is the grower's: it stays, after the plants read (PP-B exit, warn never hide).
  const unread = [...seedIds].filter((id) => !memberIds.has(id));
  return { members: [...chosen.map((i) => i.taxon.id), ...unread], limit };
}

export interface AlternativeOptions extends FlagContext { removed?: PlantId[]; verdicts?: HoleContext['verdicts'] }

// What swapping out for inn does to the palette's holes (PP-C c2, slices 3.3): holes(members) against
// holes(members - out + inn), the candidates' verdicts read as the holes read them, compared by lane (a
// job or a light level) and the years it covers, never by hole id (an id carries its years, so a hole
// that only shrank would read as both filled and left). fills: open before and wholly closed after;
// leaves: open after over years that were not open before. A hole that only narrows is in neither and
// counts in `years` (hole-years closed, net), which the Swap list ranks on. `before` counts the member
// swapped out even when it is outside its range: the candidate is judged against what that member
// would do, so a late starter leaves its first years empty. strataGain: inn stands in a stratum no
// member stands in now (the one swapped out included).
interface SwapChange { fills: Hole[]; leaves: Hole[]; strataGain: boolean; years: number }
const openOf = (ctx: HoleContext, members: readonly Taxon[]) => holes({ ...ctx, members }).filter((h) => h.state === 'open');
const laneOf = (h: Hole): string => `${h.kind}:${h.job ?? h.stratum ?? ''}`;
const overlaps = (a: Hole, b: Hole): boolean => a.fromYear < b.toYear && b.fromYear < a.toYear;
const inside = (a: Hole, b: Hole): boolean => a.fromYear >= b.fromYear && a.toYear <= b.toYear;
const yearsOf = (hs: readonly Hole[]): number => hs.reduce((n, h) => n + h.toYear - h.fromYear, 0);
// The holes with `out` counted whatever its verdict (what the swap asks a candidate to replace).
function swapBefore(ctx: HoleContext, out: Taxon): Hole[] {
  if (ctx.verdicts?.get(out.id)?.level !== 'outside') return openOf(ctx, ctx.members);
  const verdicts = new Map(ctx.verdicts);
  verdicts.delete(out.id);
  return openOf({ ...ctx, verdicts }, ctx.members);
}
function swapChange(ctx: HoleContext, out: Taxon, inn: Taxon, before: readonly Hole[] = swapBefore(ctx, out)): SwapChange {
  const others = ctx.members.filter((t) => t.id !== out.id);
  const after = openOf(ctx, [...others, inn]);
  const same = (h: Hole, hs: readonly Hole[]) => hs.filter((x) => laneOf(x) === laneOf(h));
  const s = inn.stratum?.value ?? null;
  return {
    fills: before.filter((h) => !same(h, after).some((x) => overlaps(x, h))),
    leaves: after.filter((h) => !same(h, before).some((x) => inside(h, x))),
    strataGain: s !== null && !ctx.members.some((t) => t.stratum?.value === s),
    years: yearsOf(before) - yearsOf(after),
  };
}

// Plants of the climate that could take a member's place, the closest first (board Swap: "The closest
// in jobs and years first"): a plant taller than the room after those that fit it (pots or a balcony
// never offer a 58 m tree as a fit; its row says its size), then clean before a caution (invasive in
// the reader's country, toxic) before a warning (a site misfit, a serious conflict), then more of the
// member's jobs, more hole-years closed (the years it covers), fewer holes left open, more holes
// filled, better known, by name. Current members, removed plants and guests are not offered; plants
// that ask are listed with their flags (warn, never hide): Swap and Details show this order as it is.
const cautionOf = (flags: Flag[]): number => (warns(flags) ? 2 : flags.some((f) => f.kind === 'invasive' || f.kind === 'toxicity') ? 1 : 0);
export function alternatives(memberId: PlantId, members: Taxon[], pool: Taxon[], options: AlternativeOptions): Alternative[] {
  const member = members.find((t) => t.id === memberId) ?? pool.find((t) => t.id === memberId);
  if (!member) return [];
  const { site } = options;
  const inConsortium = new Set([...members.map((t) => t.id), memberId]);
  const removedIds = new Set(options.removed ?? []);
  const others = members.filter((t) => t.id !== memberId);
  const mInfo = infoOf(member, site);
  const memberJobs = new Set(mInfo.jobs);
  const holeCtx: HoleContext = { members, verdicts: options.verdicts ?? null, pending: false };
  const before = swapBefore(holeCtx, member);
  const out = pool
    .filter((t) => !inConsortium.has(t.id) && !removedIds.has(t.id))
    .map((t) => {
      const i = infoOf(t, site);
      const change = swapChange(holeCtx, member, t, before);
      return {
        taxon: t,
        years: change.years,
        tall: tallerThanRoom(i.fit),
        alt: {
          id: t.id,
          fills: change.fills,
          leaves: change.leaves,
          strataGain: change.strataGain,
          sharedJobs: i.jobs.filter((j) => memberJobs.has(j)),
          flags: flagsFor(t, others, options),
        } satisfies Alternative,
      };
    });
  out.sort((x, y) =>
    Number(x.tall) - Number(y.tall)
    || cautionOf(x.alt.flags) - cautionOf(y.alt.flags)
    || y.alt.sharedJobs.length - x.alt.sharedJobs.length
    || y.years - x.years
    || x.alt.leaves.length - y.alt.leaves.length
    || y.alt.fills.length - x.alt.fills.length
    || byKnownThenName(x.taxon, y.taxon));
  return out.map((x) => x.alt);
}
