// The consortium suggestion: a greedy, deterministic fill around the plants the user keeps, and
// the ranked alternatives of the Swap list. The plan (knowledge/project/consortium-tool-plan.md,
// "Scoring module") fixes the formula:
//
//   gain = 10·new jobs + 3·empty (stratum × phase band) cells + 1·cells with one member
//          + 6·new stratum + 8·phase bands with no food yet (crops) + 4·second doer of
//          feeds-soil, ground or mulch + 1·edibility − 3·weed potential − 0.5·unknown traits
//
// "Unknown traits" are the site checks fits() could not decide (light, soil, water, room), so a
// plant the catalog knows well wins over one it barely knows. Gains are counted in tenths, as
// integers, so equal gains tie exactly and the threshold is not blurred by float rounding.
import type { ClimateFile, Taxon } from './types.ts';
import type { Fit, Site, SiteKey } from './site.ts';
import type { Conflict } from './conflicts.ts';
import type { JobId } from './jobs.ts';
import { fits } from './site.ts';
import { strata as layerOrder } from './types.ts';
import type { PhaseBand } from './jobs.ts';
import { bandsOf, jobs as allJobs, jobsOf } from './jobs.ts';
import { conflicts, conflictsOf, invasiveIn, isSerious } from './conflicts.ts';

// A plant joins only while it brings something the consortium lacks: a job nobody does yet, or a
// stratum in a phase band that stands empty. Edibility and unknown traits only rank such plants,
// so a consortium fills up to its room's limit while it has gaps. (The plan's first rule, gain > 5,
// stopped real cells at 4 or 5 plants once the six jobs and four strata were covered.)
export const SIZE_LIMIT: Record<Site['room'], number> = { small: 6, large: 9, field: 12 };

export interface Gain { total: number; jobs: number; cells: number; strata: number; food: number; backup: number; edibility: number; weedy: number; unknowns: number }

export interface Flags {
  misfits: SiteKey[];
  unknowns: SiteKey[];
  invasive: boolean | null; // invasiveIn() for the user's country: a warning only, never a filter or a score
  conflicts: Conflict[]; // with the other members, any severity
  flagged: boolean; // what keeps it out of automatic picks: a misfit (beside the members: siteMisfits) or a medium/high conflict (not invasiveness)
}

export interface Member { taxon: Taxon; kept: boolean; gain: number | null; flags: Flags }
export interface Suggestion { members: Member[]; limit: number; gaps: JobId[] }
export interface Alternative { taxon: Taxon; sameStratum: boolean; sharedJobs: JobId[]; gain: number; flags: Flags }

// The user's country, for the invasive flag only: the plants picked never depend on it (owner,
// 2026-10-28). country is ISO alpha-2; countryChecked is the manifest's countries[country]
// .invasive_checked and is required with a country: only true gives "not recorded" (false), and a
// missing or false flag makes Flags.invasive null, "not checked" (review m7).
export type Country = { country?: null; countryChecked?: boolean } | { country: string; countryChecked: boolean };

// Guests: plants from another climate's list, added with "Add anyway" (owner, 2026-10-28). A kept
// guest is a member like any kept plant and counts for the coverage; a guest is never picked,
// offered in Swap or used to fill: the suggestion and its alternatives come from this climate only.
export interface WithGuests { guests?: Taxon[] }

export type SuggestOptions = Country & WithGuests & {
  site: Site;
  kept?: string[]; // taxon ids that are always members, flagged or not (kept wins over removed)
  removed?: string[]; // taxon ids never picked automatically
};

// What a taxon brings, worked out once per call.
interface Info { taxon: Taxon; jobs: JobId[]; stratum: string | null; bands: PhaseBand[]; cells: string[]; edibility: number; weedy: boolean; fit: Fit }

// jobs: members per job; cells: members per stratum × band; food: bands where something feeds you.
interface Coverage { jobs: Map<JobId, number>; strata: Set<string>; cells: Map<string, number>; food: Set<PhaseBand> }

// Jobs one plant does too fragilely: a removal would open the gap again, so a second doer counts.
const BACKED_UP: JobId[] = ['feeds_soil', 'ground', 'mulch'];

// Infos are cached per taxon object and site, so the Swap lists of a whole consortium stay fast;
// they are never changed after they are made.
const infoCache = new WeakMap<Taxon, Map<string, Info>>();

function infoOf(taxon: Taxon, site: Site): Info {
  const key = `${site.light} ${site.soil} ${site.water} ${site.room}`;
  let bySite = infoCache.get(taxon);
  if (!bySite) infoCache.set(taxon, (bySite = new Map()));
  let info = bySite.get(key);
  if (!info) bySite.set(key, (info = makeInfo(taxon, site)));
  return info;
}

function makeInfo(taxon: Taxon, site: Site): Info {
  const stratum = taxon.stratum?.value ?? null;
  return {
    taxon,
    jobs: jobsOf(taxon),
    stratum,
    bands: bandsOf(taxon),
    cells: stratum ? bandsOf(taxon).map((b) => `${stratum} ${b}`) : [],
    edibility: taxon.traits.edibility_rating ?? 0,
    weedy: taxon.warnings.weed_potential === true,
    fit: fits(taxon, site),
  };
}

function coverageOf(infos: Info[]): Coverage {
  const cov: Coverage = { jobs: new Map(), strata: new Set(), cells: new Map(), food: new Set() };
  for (const i of infos) add(cov, i);
  return cov;
}

function add(cov: Coverage, i: Info) {
  for (const j of i.jobs) cov.jobs.set(j, (cov.jobs.get(j) ?? 0) + 1);
  if (i.jobs.includes('feeds_you')) for (const b of i.bands) cov.food.add(b);
  if (i.stratum) cov.strata.add(i.stratum);
  for (const c of i.cells) cov.cells.set(c, (cov.cells.get(c) ?? 0) + 1);
}

// The gain's terms, in tenths.
function tenths(i: Info, cov: Coverage) {
  const jobs = 100 * i.jobs.filter((j) => !cov.jobs.has(j)).length;
  // Something to eat in every phase band: 8 for each band the plant feeds you in that has no food yet.
  const food = i.jobs.includes('feeds_you') ? 80 * i.bands.filter((b) => !cov.food.has(b)).length : 0;
  const backup = 40 * i.jobs.filter((j) => BACKED_UP.includes(j) && cov.jobs.get(j) === 1).length;
  // An empty stratum × band cell is worth 3, one with a single member 1: once every cell has a
  // plant, a field still fills by doubling the thinnest ones.
  const cells = i.cells.reduce((sum, c) => sum + ({ 0: 30, 1: 10 }[cov.cells.get(c) ?? 0] ?? 0), 0);
  const strata = i.stratum && !cov.strata.has(i.stratum) ? 60 : 0;
  const edibility = 10 * i.edibility;
  const weedy = i.weedy ? -30 : 0; // a known weed comes after an equal plant that is not
  const unknowns = i.fit.unknowns.length ? -5 * i.fit.unknowns.length : 0; // never -0
  return { jobs, cells, strata, food, backup, edibility, weedy, unknowns, total: jobs + cells + strata + food + backup + edibility + weedy + unknowns };
}

const toGain = (t: ReturnType<typeof tenths>): Gain =>
  ({ total: t.total / 10, jobs: t.jobs / 10, cells: t.cells / 10, strata: t.strata / 10, food: t.food / 10, backup: t.backup / 10, edibility: t.edibility / 10, weedy: t.weedy / 10, unknowns: t.unknowns / 10 });

// What the taxon would add to these members on this site, term by term.
export function gain(taxon: Taxon, members: Taxon[], site: Site): Gain {
  return toGain(tenths(infoOf(taxon, site), coverageOf(members.map((m) => infoOf(m, site)))));
}

// Ties go to the better-known plant (named in more of the site's languages: a widely grown one),
// then by canonical name in code-unit order, the same in every browser and in Node (localeCompare is not).
const known = (t: Taxon) => Object.keys(t.names).length;
const byKnownThenName = (a: Taxon, b: Taxon) => known(b) - known(a) || byName(a, b);

const byName = (a: Taxon, b: Taxon) =>
  a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// For each taxon id of the cell, the ids it has a medium or high conflict with (either side of the
// row): conflicts() over the whole cell, so the matching rule is the one the flags use.
function seriousPartners(cell: ClimateFile): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const link = (a: string, b: string) => { if (!out.has(a)) out.set(a, new Set()); out.get(a)!.add(b); };
  for (const c of conflicts(cell.taxa, cell.interactions)) if (isSerious(c)) { link(c.a.id, c.b.id); link(c.b.id, c.a.id); }
  return out;
}

// The guests that are not in this cell (a plant the cell lists is an ordinary member).
function guestsOf(cell: ClimateFile, guests: Taxon[] | undefined): Taxon[] {
  if (!guests?.length) return [];
  const own = new Set(cell.taxa.map((t) => t.id));
  return guests.filter((t, i) => !own.has(t.id) && guests.findIndex((g) => g.id === t.id) === i);
}

// A lower layer under a canopy (design-scale.md §2.6 m10; decision row "Scale build, coordinator
// choices"): on a sunny site, a Mid or Low plant that does not take full sun is not a light misfit
// while another member grows in a layer above it (Emergent or High over Mid; any of them over Low).
// A plant of a top layer, or one with nothing above it, keeps the flag.
// The one owner of the rule (H12): the flags (flagsOf) and the automatic picks (suggest, so Fill too)
// both read siteMisfits, so a plant the flags would not mark is a candidate and one they would is not.
// strataAbove: the layers the other members grow in.
const SHADED_LAYERS = new Set(['medium', 'low']);
function shaded(i: Info, strataOfOthers: Iterable<string>, site: Site): boolean {
  if (site.light !== 'sun' || !i.stratum || !SHADED_LAYERS.has(i.stratum)) return false;
  const order: readonly string[] = layerOrder, own = order.indexOf(i.stratum);
  for (const s of strataOfOthers) { const at = order.indexOf(s); if (at >= 0 && at < own) return true; }
  return false;
}
// The site checks a plant fails beside the other members: its own fit, less the light where a layer
// above it shades it.
function siteMisfits(i: Info, strataOfOthers: Iterable<string>, site: Site): SiteKey[] {
  if (!i.fit.misfits.length) return [];
  return shaded(i, strataOfOthers, site) ? i.fit.misfits.filter((k) => k !== 'light') : [...i.fit.misfits];
}
const strataOf = (taxa: Taxon[]) => taxa.flatMap((t) => (t.stratum ? [t.stratum.value] : []));

function flagsOf(i: Info, others: Taxon[], cell: ClimateFile, where: Country, site: Site): Flags {
  const invasive = invasiveIn(i.taxon, where.country, where.countryChecked);
  const found = conflictsOf(i.taxon, others, cell.interactions);
  const misfits = siteMisfits(i, strataOf(others), site);
  return {
    misfits,
    unknowns: [...i.fit.unknowns],
    invasive,
    conflicts: found,
    flagged: misfits.length > 0 || found.some(isSerious),
  };
}

export function suggest(cell: ClimateFile, options: SuggestOptions): Suggestion {
  const { site } = options;
  const keptIds = new Set(options.kept ?? []);
  const removedIds = new Set(options.removed ?? []);
  const limit = SIZE_LIMIT[site.room];
  const sorted = [...cell.taxa].sort(byKnownThenName);
  const infos = sorted.map((t) => infoOf(t, site));
  const partners = seriousPartners(cell);

  // Kept plants first, in tie order (better known first, then by name), then kept guests; ids that
  // are neither in this cell nor guests are ignored.
  const guests = guestsOf(cell, options.guests).sort(byKnownThenName).map((t) => infoOf(t, site));
  const chosen = [...infos, ...guests].filter((i) => keptIds.has(i.taxon.id));
  const gains = new Map<string, number | null>(chosen.map((i) => [i.taxon.id, null]));
  const cov = coverageOf(chosen);
  const memberIds = new Set(chosen.map((i) => i.taxon.id));

  // A plant whose only misfit is the light may still join under a canopy (siteMisfits, H12): it is a
  // candidate, checked against the layers chosen so far at each pick.
  const lightOnly = (i: Info) => i.fit.misfits.length === 1 && i.fit.misfits[0] === 'light' && shaded(i, layerOrder, site);
  const candidates = infos.filter((i) =>
    !memberIds.has(i.taxon.id) && !removedIds.has(i.taxon.id) && (i.fit.ok || lightOnly(i)));

  while (chosen.length < limit) {
    let best: Info | null = null, bestGain = -Infinity;
    for (const i of candidates) {
      if (memberIds.has(i.taxon.id)) continue;
      if (siteMisfits(i, cov.strata, site).length) continue; // not yet shaded by the layers chosen
      const p = partners.get(i.taxon.id);
      if (p && [...p].some((id) => memberIds.has(id))) continue;
      const t = tenths(i, cov);
      if (t.jobs + t.cells + t.food + t.backup <= 0) continue; // nothing new: a duplicate of what is there
      if (t.total > bestGain) { best = i; bestGain = t.total; } // strict: the first in tie order wins
    }
    if (!best) break;
    chosen.push(best);
    memberIds.add(best.taxon.id);
    gains.set(best.taxon.id, bestGain / 10);
    add(cov, best);
  }

  return result(chosen, keptIds, gains, cell, site, options);
}

// Members with their flags, and the jobs nobody does: what suggest() and evaluate() both return.
function result(chosen: Info[], keptIds: Set<string>, gains: Map<string, number | null>, cell: ClimateFile, site: Site, where: Country): Suggestion {
  const taxa = chosen.map((i) => i.taxon);
  const members = chosen.map((i) => ({
    taxon: i.taxon,
    kept: keptIds.has(i.taxon.id),
    gain: gains.get(i.taxon.id) ?? null,
    flags: flagsOf(i, taxa.filter((t) => t.id !== i.taxon.id), cell, where, site),
  }));
  return { members, limit: SIZE_LIMIT[site.room], gaps: allJobs.filter((j) => !coverageOf(chosen).jobs.has(j)) };
}

export type EvaluateOptions = Country & WithGuests & { site: Site; kept?: string[] };

// A fixed consortium, scored as it stands and never refilled: the page's state after a Remove (the
// gap stays) or a restored share link. Members come in the order of `ids` (repeats and ids not in
// the cell are ignored) with the same flags as suggest(); a member's gain is what it adds to the
// members before it, null when it is kept, so the ids of a suggestion give that suggestion back.
export function evaluate(cell: ClimateFile, ids: string[], options: EvaluateOptions): Suggestion {
  const { site } = options;
  const keptIds = new Set(options.kept ?? []);
  const byId = new Map([...cell.taxa, ...guestsOf(cell, options.guests)].map((t) => [t.id, t]));
  const chosen: Info[] = [], gains = new Map<string, number | null>();
  const cov = coverageOf([]);
  for (const id of ids) {
    const taxon = byId.get(id);
    if (!taxon || gains.has(id)) continue;
    const i = infoOf(taxon, site);
    gains.set(id, keptIds.has(id) ? null : tenths(i, cov).total / 10);
    chosen.push(i);
    add(cov, i);
  }
  return result(chosen, keptIds, gains, cell, site, options);
}

export type FlagsOptions = Country & WithGuests & { site: Site };

// The flags a plant would carry beside these members (it is left out of them if it is one): the
// same misfits, unknowns, invasive check and conflicts as a member of suggest() or evaluate(), for a
// plant the page offers to add. Ids not in the cell are ignored; null for a taxon id the cell lacks.
export function flagsFor(cell: ClimateFile, id: string, memberIds: string[], options: FlagsOptions): Flags | null {
  const pool = [...cell.taxa, ...guestsOf(cell, options.guests)];
  const taxon = pool.find((t) => t.id === id);
  if (!taxon) return null;
  const ids = new Set(memberIds);
  const others = pool.filter((t) => ids.has(t.id) && t.id !== id);
  return flagsOf(infoOf(taxon, options.site), others, cell, options, options.site);
}

export type AlternativeOptions = Country & WithGuests & { site: Site; removed?: string[] };

// Plants that could take a member's place: plants without a flag before flagged ones (a misfit or a
// serious conflict; invasive here is a warning, not a flag), then same stratum, then the most jobs shared with the member,
// then the highest gain to the rest of the consortium, then by name. Flagged plants are listed, with
// their flags, so the page can show them under a warning; current members and removed plants are not.
export function alternatives(memberId: string, consortium: string[], cell: ClimateFile, options: AlternativeOptions): Alternative[] {
  const pool = [...cell.taxa, ...guestsOf(cell, options.guests)];
  const member = pool.find((t) => t.id === memberId);
  if (!member) return [];
  const { site } = options;
  const inConsortium = new Set([...consortium, memberId]);
  const removedIds = new Set(options.removed ?? []);
  const others = pool.filter((t) => inConsortium.has(t.id) && t.id !== memberId);
  const cov = coverageOf(others.map((t) => infoOf(t, site)));
  const memberJobs = new Set(jobsOf(member));
  const memberStratum = member.stratum?.value ?? null;

  const out = cell.taxa
    .filter((t) => !inConsortium.has(t.id) && !removedIds.has(t.id))
    .map((t) => {
      const i = infoOf(t, site);
      return {
        taxon: t,
        sameStratum: memberStratum !== null && i.stratum === memberStratum,
        sharedJobs: i.jobs.filter((j) => memberJobs.has(j)),
        gain: tenths(i, cov).total / 10,
        flags: flagsOf(i, others, cell, options, site),
      };
    });
  return out.sort((x, y) =>
    Number(x.flags.flagged) - Number(y.flags.flagged) || Number(y.sameStratum) - Number(x.sameStratum) || y.sharedJobs.length - x.sharedJobs.length || y.gain - x.gain || byKnownThenName(x.taxon, y.taxon));
}
