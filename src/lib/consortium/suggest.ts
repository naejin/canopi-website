// The consortium suggestion and the Swap list (stream S1; design check §2: the v1 greedy structure,
// rewritten for the 4 × 7 matrix). The suggestion is a deterministic greedy fill around the plants
// the reader keeps (Main crops are kept): at each step it adds the plant with the highest gain, and
// it stops at the room's size or when no plant brings anything new.
//
//   gain = 10·new jobs + 3·new cells (stratum × phase; one plant fills a cell) + 6·new stratum
//          + 4·phases with nothing to eat yet (crops) + 4·second doer of feeds-soil, ground or mulch
//          + 1·edibility − 3·weed potential − 0.5·unknown site answers
//
// Gains are counted in tenths, as integers, so equal gains tie exactly. "Something new" is a new job,
// a new cell, a phase with food, or a needed second doer; edibility and unknowns only rank.
// A plant that misfits the site (beside the layers chosen so far) or has a high conflict with a
// member is never picked; invasiveness is a warning only and never scores (owner, 2026-10-28).
// Guests (plants added from another climate's list) are never picked or offered in Swap; a kept
// guest is a member like any other and counts for coverage, with its home placement.
import type { Alternative, CellRef, CountryStatus, Fit, Flag, Interaction, JobId, PhaseOrd, PlantId, Site, Stratum, Taxon } from './types.ts';
import { strata } from './types.ts';
import type { Canopy } from './site.ts';
import { canopyOf, fits, FULL_CANOPY, misfitsBeside, raise, shadedBy } from './site.ts';
import { jobsOf, phaseSpan } from './jobs.ts';
import { cellKey, cellsOf } from './matrix.ts';
import type { Conflict } from './conflicts.ts';
import { conflicts, conflictsOf, invasiveIn, isSerious } from './conflicts.ts';

// Suggestions stay small (owner, 2026-10-28): 6, 9 or 12 plants by room; 9 with Room "Not sure"
// (design check A7, coordinator row "v2 build setup", revertible). The room limits plant size, never
// the number of plants the reader adds.
export const SIZE_LIMIT: Record<Site['room'], number> = { small: 6, large: 9, field: 12, unsure: 9 };

// What the flags need: the site, the climate's interactions and the reader's country (ISO alpha-2)
// with its countryStatus (only 'checked' gives invasive flags and "not recorded").
export interface FlagContext { site: Site; interactions: Interaction[]; country?: string | null; countryStatus?: CountryStatus }

export interface SuggestOptions extends FlagContext {
  kept?: PlantId[]; // always members, flagged or not; kept wins over removed
  crops?: PlantId[]; // Main crops: kept, and listed first
  removed?: PlantId[]; // never picked automatically
  guests?: Taxon[]; // plants from other climates' lists, with `from` set; members only when kept
}
export interface Suggestion { members: PlantId[]; limit: number }
export interface Gain { total: number; jobs: number; cells: number; strata: number; food: number; backup: number; edibility: number; weedy: number; unknowns: number }

interface Info { taxon: Taxon; jobs: JobId[]; stratum: Stratum | null; span: number[]; cells: number[]; edibility: number; weedy: boolean; fit: Fit }
interface Coverage { jobs: Map<JobId, number>; strata: Set<Stratum>; cells: Set<number>; food: Set<number>; canopy: number[] }

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
      cells: cellsOf(taxon).map(([s, p]) => cellKey(s, p)),
      edibility: taxon.traits.edibility_rating ?? 0,
      weedy: taxon.warnings.weed_potential === true,
      fit: fits(taxon, site),
    };
    bySite.set(key, info);
  }
  return info;
}

const emptyCoverage = (): Coverage => ({ jobs: new Map(), strata: new Set(), cells: new Set(), food: new Set(), canopy: [...canopyOf([])] });
function add(cov: Coverage, i: Info) {
  for (const j of i.jobs) cov.jobs.set(j, (cov.jobs.get(j) ?? 0) + 1);
  if (i.jobs.includes('feeds_you')) for (const p of i.span) cov.food.add(p);
  if (i.stratum) cov.strata.add(i.stratum);
  for (const c of i.cells) cov.cells.add(c);
  raise(cov.canopy, i.taxon);
}
const coverageOf = (infos: Info[]) => { const cov = emptyCoverage(); for (const i of infos) add(cov, i); return cov; };

function tenths(i: Info, cov: Coverage) {
  const jobs = 100 * i.jobs.filter((j) => !cov.jobs.has(j)).length;
  const cells = 30 * i.cells.filter((c) => !cov.cells.has(c)).length;
  const strataGain = i.stratum && !cov.strata.has(i.stratum) ? 60 : 0;
  const food = i.jobs.includes('feeds_you') ? 40 * i.span.filter((p) => !cov.food.has(p)).length : 0;
  const backup = 40 * i.jobs.filter((j) => BACKED_UP.includes(j) && cov.jobs.get(j) === 1).length;
  const edibility = 10 * i.edibility;
  const weedy = i.weedy ? -30 : 0;
  const unknowns = i.fit.unknowns.length ? -5 * i.fit.unknowns.length : 0; // never -0
  return { jobs, cells, strata: strataGain, food, backup, edibility, weedy, unknowns, total: jobs + cells + strataGain + food + backup + edibility + weedy + unknowns };
}
const isNew = (t: ReturnType<typeof tenths>) => t.jobs + t.cells + t.food + t.backup > 0;

// What the plant would add to these members on this site, term by term.
export function gain(taxon: Taxon, members: Taxon[], site: Site): Gain {
  const t = tenths(infoOf(taxon, site), coverageOf(members.map((m) => infoOf(m, site))));
  return { total: t.total / 10, jobs: t.jobs / 10, cells: t.cells / 10, strata: t.strata / 10, food: t.food / 10, backup: t.backup / 10, edibility: t.edibility / 10, weedy: t.weedy / 10, unknowns: t.unknowns / 10 };
}

// Ties go to the better-known plant (named in more languages), then by canonical name in code-unit
// order, the same in every browser and in Node.
const known = (t: Taxon) => Object.keys(t.names).length;
const byName = (a: Taxon, b: Taxon) =>
  a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const byKnownThenName = (a: Taxon, b: Taxon) => known(b) - known(a) || byName(a, b);

const TOXIC = new Set(['Moderate', 'Severe']);

// A conflict found for a plant: the other member and the row (severity, type, agent, note).
interface Found { other: PlantId; c: Conflict }
const rank = (s: Flag['severity'] | null | undefined) => (s === 'high' ? 3 : s === 'medium' ? 2 : s === 'low' ? 1 : 0);

// One flag per other member for its worst conflict (first row on ties), then misfit, invasive and
// toxicity flags. `canopy`: the other members' (a plant never shades itself).
function flagsWith(i: Info, canopy: Canopy, found: Found[], ctx: FlagContext): Flag[] {
  const id = i.taxon.id, out: Flag[] = [];
  const worst = new Map<PlantId, Conflict>();
  for (const f of found) { const w = worst.get(f.other); if (!w || rank(f.c.severity) > rank(w.severity)) worst.set(f.other, f.c); }
  for (const [other, c] of worst) {
    const flag: Flag = { id, kind: 'conflict', other };
    if (c.severity) flag.severity = c.severity;
    out.push(Object.assign(flag, { type: c.type, agent: c.agent, note: c.note }));
  }
  if (misfitsBeside(i.taxon, ctx.site, canopy, i.fit).length) out.push({ id, kind: 'misfit' });
  if (invasiveIn(i.taxon, ctx.country, ctx.countryStatus === 'checked') === true) out.push({ id, kind: 'invasive' });
  const tox = i.taxon.warnings.toxicity?.level;
  if (tox && TOXIC.has(tox)) out.push({ id, kind: 'toxicity' });
  return out;
}

// The flags a plant would carry beside these members (it is left out of them if it is one).
export function flagsFor(taxon: Taxon, others: Taxon[], ctx: FlagContext): Flag[] {
  const rest = others.filter((o) => o.id !== taxon.id);
  const found = conflictsOf(taxon, rest, ctx.interactions).map((c) => ({ other: c.a.id === taxon.id ? c.b.id : c.a.id, c }));
  return flagsWith(infoOf(taxon, ctx.site), canopyOf(rest), found, ctx);
}

// Every member's flags (store.ts `flags`). Conflicts are matched once for the whole consortium, so
// 200 members stay within the recompute budget (design check §8).
export function flagsOf(members: Taxon[], ctx: FlagContext): Flag[] {
  const byId = new Map<PlantId, Found[]>();
  for (const c of conflicts(members, ctx.interactions)) {
    if (!byId.has(c.a.id)) byId.set(c.a.id, []);
    if (!byId.has(c.b.id)) byId.set(c.b.id, []);
    byId.get(c.a.id)!.push({ other: c.b.id, c });
    byId.get(c.b.id)!.push({ other: c.a.id, c });
  }
  // One canopy for all: a member is shaded only by a higher stratum, so its own entry never counts.
  const canopy = canopyOf(members);
  const out: Flag[] = [], seen = new Set<PlantId>();
  for (const m of members) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(...flagsWith(infoOf(m, ctx.site), canopy, byId.get(m.id) ?? [], ctx));
  }
  return out;
}

// Add and Swap ask first only for a site misfit or a high conflict, never for an invasive or toxicity
// warning (owner row 2026-10-28; coordinator row "v2 mockup choices" 2026-11-11).
export const asks = (flags: Flag[]): boolean => flags.some((f) => f.kind === 'misfit' || (f.kind === 'conflict' && f.severity === 'high'));

// For each plant id, the ids it has a high conflict with (either side of the row).
function seriousPartners(taxa: Taxon[], interactions: Interaction[]): Map<PlantId, Set<PlantId>> {
  const out = new Map<PlantId, Set<PlantId>>();
  const link = (a: PlantId, b: PlantId) => { if (!out.has(a)) out.set(a, new Set()); out.get(a)!.add(b); };
  for (const c of conflicts(taxa, interactions)) if (isSerious(c)) { link(c.a.id, c.b.id); link(c.b.id, c.a.id); }
  return out;
}

export function suggest(pool: Taxon[], options: SuggestOptions): Suggestion {
  const { site } = options;
  const limit = SIZE_LIMIT[site.room];
  const keptIds = new Set([...(options.crops ?? []), ...(options.kept ?? [])]);
  const removedIds = new Set(options.removed ?? []);
  const own = new Set(pool.map((t) => t.id));
  const guests = (options.guests ?? []).filter((g, i, all) => !own.has(g.id) && all.findIndex((x) => x.id === g.id) === i);
  const sorted = [...pool].sort(byKnownThenName);
  const infos = sorted.map((t) => infoOf(t, site));
  const partners = seriousPartners([...pool, ...guests], options.interactions);

  // Main crops first in the order chosen, then the other kept plants in tie order, then kept guests.
  const all = [...infos, ...[...guests].sort(byKnownThenName).map((t) => infoOf(t, site))];
  const byId = new Map(all.map((i) => [i.taxon.id, i]));
  const chosen: Info[] = [];
  const memberIds = new Set<PlantId>();
  for (const id of options.crops ?? []) { const i = byId.get(id); if (i && !memberIds.has(id)) { chosen.push(i); memberIds.add(id); } }
  for (const i of all) if (keptIds.has(i.taxon.id) && !memberIds.has(i.taxon.id)) { chosen.push(i); memberIds.add(i.taxon.id); }
  const cov = coverageOf(chosen);

  // A plant whose only misfit is the light may still join under a canopy, checked at each pick.
  const lightOnly = (i: Info) => i.fit.misfits.length === 1 && i.fit.misfits[0] === 'light' && shadedBy(i.taxon, site, FULL_CANOPY);
  const candidates = infos.filter((i) => !memberIds.has(i.taxon.id) && !removedIds.has(i.taxon.id) && (!i.fit.misfits.length || lightOnly(i)));

  while (chosen.length < limit) {
    let best: Info | null = null, bestGain = -Infinity;
    for (const i of candidates) {
      if (memberIds.has(i.taxon.id)) continue;
      if (i.fit.misfits.length && misfitsBeside(i.taxon, site, cov.canopy, i.fit).length) continue;
      const p = partners.get(i.taxon.id);
      if (p) { let clash = false; for (const id of p) if (memberIds.has(id)) { clash = true; break; } if (clash) continue; }
      const t = tenths(i, cov);
      if (!isNew(t)) continue;
      if (t.total > bestGain) { best = i; bestGain = t.total; }
    }
    if (!best) break;
    chosen.push(best);
    memberIds.add(best.taxon.id);
    add(cov, best);
  }
  return { members: chosen.map((i) => i.taxon.id), limit };
}

export interface AlternativeOptions extends FlagContext { removed?: PlantId[] }

const keyToRef = (k: number): CellRef => [strata[Math.floor(k / 7)], (k % 7) as PhaseOrd];

// Plants of the climate that could take a member's place: plants that do not ask (no site misfit or
// high conflict) before those that do, then same stratum, then fewer cells left empty, more cells
// also filled, more jobs shared, higher gain, better known, by name. Current members, removed plants
// and guests are not offered; plants that ask are listed with their flags (warn, never hide).
export function alternatives(memberId: PlantId, members: Taxon[], pool: Taxon[], options: AlternativeOptions): Alternative[] {
  const member = members.find((t) => t.id === memberId) ?? pool.find((t) => t.id === memberId);
  if (!member) return [];
  const { site } = options;
  const inConsortium = new Set([...members.map((t) => t.id), memberId]);
  const removedIds = new Set(options.removed ?? []);
  const others = members.filter((t) => t.id !== memberId);
  const otherInfos = others.map((t) => infoOf(t, site));
  const cov = coverageOf(otherInfos);
  const mInfo = infoOf(member, site);
  const memberJobs = new Set(mInfo.jobs);
  const memberCells = new Set(mInfo.cells);
  const out = pool
    .filter((t) => !inConsortium.has(t.id) && !removedIds.has(t.id))
    .map((t) => {
      const i = infoOf(t, site);
      const candCells = new Set(i.cells);
      return {
        taxon: t,
        gain: tenths(i, cov).total,
        alt: {
          id: t.id,
          sameStratum: mInfo.stratum !== null && i.stratum === mInfo.stratum,
          alsoFills: i.cells.filter((c) => !cov.cells.has(c) && !memberCells.has(c)).map(keyToRef),
          leavesEmpty: mInfo.cells.filter((c) => !cov.cells.has(c) && !candCells.has(c)).map(keyToRef),
          sharedJobs: i.jobs.filter((j) => memberJobs.has(j)),
          flags: flagsFor(t, others, options),
        } satisfies Alternative,
      };
    });
  out.sort((x, y) =>
    Number(asks(x.alt.flags)) - Number(asks(y.alt.flags))
    || Number(y.alt.sameStratum) - Number(x.alt.sameStratum)
    || x.alt.leavesEmpty.length - y.alt.leavesEmpty.length
    || y.alt.alsoFills.length - x.alt.alsoFills.length
    || y.alt.sharedJobs.length - x.alt.sharedJobs.length
    || y.gain - x.gain
    || byKnownThenName(x.taxon, y.taxon));
  return out.map((x) => x.alt);
}
