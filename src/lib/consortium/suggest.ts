// The consortium suggestion: a greedy, deterministic fill around the plants the user keeps, and
// the ranked alternatives of the Swap list. The plan (knowledge/project/consortium-tool-plan.md,
// "Scoring module") fixes the formula:
//
//   gain = 10·new jobs + 3·new (stratum × phase band) cells + 6·new stratum
//          + 0.3·edibility − 0.5·unknown traits
//
// "Unknown traits" are the site checks fits() could not decide (light, soil, water, room), so a
// plant the catalog knows well wins over one it barely knows. Gains are counted in tenths, as
// integers, so equal gains tie exactly and the threshold is not blurred by float rounding.
import type { Cell, Taxon } from './types.ts';
import type { Fit, Site, SiteKey } from './site.ts';
import type { Conflict } from './conflicts.ts';
import type { JobId } from './jobs.ts';
import { fits } from './site.ts';
import { bandsOf, jobs as allJobs, jobsOf } from './jobs.ts';
import { conflictsOf, invasiveIn, isSerious, matches } from './conflicts.ts';

// A plant joins only while its gain is above this, and the consortium is smaller than its room's limit.
export const GAIN_THRESHOLD = 5;
export const SIZE_LIMIT: Record<Site['room'], number> = { small: 6, large: 8, field: 10 };

export interface Gain { total: number; jobs: number; cells: number; strata: number; edibility: number; unknowns: number }

export interface Flags {
  misfits: SiteKey[];
  unknowns: SiteKey[];
  invasive: boolean | null; // invasiveIn() for the user's country
  conflicts: Conflict[]; // with the other members, any severity
  flagged: boolean; // what would keep it out of automatic picks: a misfit, invasive here, a medium/high conflict
}

export interface Member { taxon: Taxon; kept: boolean; gain: number | null; flags: Flags }
export interface Suggestion { members: Member[]; limit: number; gaps: JobId[] }
export interface Alternative { taxon: Taxon; sameStratum: boolean; sharedJobs: JobId[]; gain: number; flags: Flags }

export interface SuggestOptions {
  site: Site;
  kept?: string[]; // taxon ids that are always members, flagged or not (kept wins over removed)
  removed?: string[]; // taxon ids never picked automatically
  country?: string | null; // ISO alpha-2; turns on the invasive filter
}

// What a taxon brings, worked out once per call.
interface Info { taxon: Taxon; jobs: JobId[]; stratum: string | null; cells: string[]; edibility: number; fit: Fit }

interface Coverage { jobs: Set<JobId>; strata: Set<string>; cells: Set<string> }

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
    cells: stratum ? bandsOf(taxon).map((b) => `${stratum} ${b}`) : [],
    edibility: taxon.traits.edibility_rating ?? 0,
    fit: fits(taxon, site),
  };
}

function coverageOf(infos: Info[]): Coverage {
  const cov: Coverage = { jobs: new Set(), strata: new Set(), cells: new Set() };
  for (const i of infos) add(cov, i);
  return cov;
}

function add(cov: Coverage, i: Info) {
  for (const j of i.jobs) cov.jobs.add(j);
  if (i.stratum) cov.strata.add(i.stratum);
  for (const c of i.cells) cov.cells.add(c);
}

// The gain's terms, in tenths.
function tenths(i: Info, cov: Coverage) {
  const jobs = 100 * i.jobs.filter((j) => !cov.jobs.has(j)).length;
  const cells = 30 * i.cells.filter((c) => !cov.cells.has(c)).length;
  const strata = i.stratum && !cov.strata.has(i.stratum) ? 60 : 0;
  const edibility = 3 * i.edibility;
  const unknowns = i.fit.unknowns.length ? -5 * i.fit.unknowns.length : 0; // never -0
  return { jobs, cells, strata, edibility, unknowns, total: jobs + cells + strata + edibility + unknowns };
}

const toGain = (t: ReturnType<typeof tenths>): Gain =>
  ({ total: t.total / 10, jobs: t.jobs / 10, cells: t.cells / 10, strata: t.strata / 10, edibility: t.edibility / 10, unknowns: t.unknowns / 10 });

// What the taxon would add to these members on this site, term by term.
export function gain(taxon: Taxon, members: Taxon[], site: Site): Gain {
  return toGain(tenths(infoOf(taxon, site), coverageOf(members.map((m) => infoOf(m, site)))));
}

// Code-unit order, the same in every browser and in Node (localeCompare is not).
const byName = (a: Taxon, b: Taxon) =>
  a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// For each taxon id of the cell, the ids it has a medium or high conflict with (either side of the row).
function seriousPartners(cell: Cell): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const row of cell.interactions) {
    if (row.type === 'allelopathy_tolerant' || !(row.severity === 'medium' || row.severity === 'high')) continue;
    const subjects = cell.taxa.filter((t) => matches(row.subject, t));
    if (!subjects.length) continue;
    const objects = cell.taxa.filter((t) => matches(row.object, t));
    for (const a of subjects) for (const b of objects) {
      if (a.id === b.id) continue;
      if (!out.has(a.id)) out.set(a.id, new Set());
      if (!out.has(b.id)) out.set(b.id, new Set());
      out.get(a.id)!.add(b.id);
      out.get(b.id)!.add(a.id);
    }
  }
  return out;
}

function flagsOf(i: Info, others: Taxon[], cell: Cell, country: string | null | undefined): Flags {
  const invasive = invasiveIn(i.taxon, country);
  const found = conflictsOf(i.taxon, others, cell.interactions);
  return {
    misfits: [...i.fit.misfits],
    unknowns: [...i.fit.unknowns],
    invasive,
    conflicts: found,
    flagged: !i.fit.ok || invasive === true || found.some(isSerious),
  };
}

export function suggest(cell: Cell, options: SuggestOptions): Suggestion {
  const { site, country } = options;
  const keptIds = new Set(options.kept ?? []);
  const removedIds = new Set(options.removed ?? []);
  const limit = SIZE_LIMIT[site.room];
  const sorted = [...cell.taxa].sort(byName);
  const infos = sorted.map((t) => infoOf(t, site));
  const partners = seriousPartners(cell);

  // Kept plants first, in name order; ids that are not in this cell are ignored.
  const chosen = infos.filter((i) => keptIds.has(i.taxon.id));
  const gains = new Map<string, number | null>(chosen.map((i) => [i.taxon.id, null]));
  const cov = coverageOf(chosen);
  const memberIds = new Set(chosen.map((i) => i.taxon.id));

  const candidates = infos.filter((i) =>
    !memberIds.has(i.taxon.id) && !removedIds.has(i.taxon.id) && i.fit.ok && invasiveIn(i.taxon, country) !== true);

  while (chosen.length < limit) {
    let best: Info | null = null, bestGain = -Infinity;
    for (const i of candidates) {
      if (memberIds.has(i.taxon.id)) continue;
      const p = partners.get(i.taxon.id);
      if (p && [...p].some((id) => memberIds.has(id))) continue;
      const g = tenths(i, cov).total;
      if (g > bestGain) { best = i; bestGain = g; } // strict: the first in name order wins a tie
    }
    if (!best || bestGain <= GAIN_THRESHOLD * 10) break;
    chosen.push(best);
    memberIds.add(best.taxon.id);
    gains.set(best.taxon.id, bestGain / 10);
    add(cov, best);
  }

  const taxa = chosen.map((i) => i.taxon);
  const members = chosen.map((i) => ({
    taxon: i.taxon,
    kept: keptIds.has(i.taxon.id),
    gain: gains.get(i.taxon.id) ?? null,
    flags: flagsOf(i, taxa.filter((t) => t.id !== i.taxon.id), cell, country),
  }));
  return { members, limit, gaps: allJobs.filter((j) => !cov.jobs.has(j)) };
}

export interface AlternativeOptions { site: Site; removed?: string[]; country?: string | null }

// Plants that could take a member's place: same stratum first, then the most jobs shared with the
// member, then the highest gain to the rest of the consortium, then by name. Flagged plants are
// listed too, with their flags; current members and removed plants are not.
export function alternatives(memberId: string, consortium: string[], cell: Cell, options: AlternativeOptions): Alternative[] {
  const member = cell.taxa.find((t) => t.id === memberId);
  if (!member) return [];
  const { site, country } = options;
  const inConsortium = new Set([...consortium, memberId]);
  const removedIds = new Set(options.removed ?? []);
  const others = cell.taxa.filter((t) => inConsortium.has(t.id) && t.id !== memberId);
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
        flags: flagsOf(i, others, cell, country),
      };
    });
  return out.sort((x, y) =>
    Number(y.sameStratum) - Number(x.sameStratum) || y.sharedJobs.length - x.sharedJobs.length || y.gain - x.gain || byName(x.taxon, y.taxon));
}
