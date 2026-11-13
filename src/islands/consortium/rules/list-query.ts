// The one filter rule of the plant lists (E6 R2; design check §7.1 "Add/PlantList filter rule"): which
// plants of a list Add shows (a cell or run of one layer, a job, "Show them anyway") and which members
// the plant list's Layer / Stage / Job filters leave, plus the order of Add's rows. Pure functions
// over core types (ADR-1 layer rules: rules import the core only), so scripts/consortium-list-query.test.mjs
// runs them in Node.
import type { JobId, PhaseOrd, Site, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { canopyOf, fits, jobsOf, misfitsBeside, phaseOrd } from '../../../lib/consortium/index.ts';

// stratum: one layer, null any. from/to: a run of stages the plant grows in during any of (Add's cell
// or run; the plant list's one stage as from = to), null any (a plant with no placement then passes).
// job: one of its jobs, null any. site: the site answers a plant must fit beside the members' canopy
// (the matrix's "N fit", core matrix.ts), null no fit check (the plant list, Add with no cell);
// anyway: list the misfits too ("Show them anyway"). canopy: the members' taxa.
export interface ListQuery {
  stratum: Stratum | null;
  from: PhaseOrd | null;
  to: PhaseOrd | null;
  job: JobId | null;
  site: Site | null;
  canopy: readonly Taxon[];
  anyway: boolean;
}

// The query as a test of one plant (the canopy computed once).
export function listMatch(q: ListQuery): (t: Taxon) => boolean {
  const canopy = q.site && !q.anyway ? canopyOf(q.canopy) : null;
  return (t) => {
    if (q.job && !jobsOf(t).includes(q.job)) return false;
    if (q.stratum && t.stratum?.value !== q.stratum) return false;
    if (q.from !== null && q.to !== null && !(t.phases && phaseOrd(t.phases.start) <= q.to && phaseOrd(t.phases.end) >= q.from)) return false;
    return !canopy || !misfitsBeside(t, q.site!, canopy, fits(t, q.site!)).length;
  };
}
// The plants of a list the query keeps, in list order.
export const listQuery = (pool: readonly Taxon[], q: ListQuery): Taxon[] => pool.filter(listMatch(q));

// Add's query: what the sheet was opened for (store.openSheet: a cell or run, a job, `anyway`). With no
// cell there is no layer, stage or fit check.
export interface AddFor { cell: { stratum: Stratum | null; from: PhaseOrd; to: PhaseOrd } | null; job: JobId | null; anyway: boolean }
export const addQuery = ({ cell, job, anyway }: AddFor, site: Site, canopy: readonly Taxon[]): ListQuery =>
  ({ stratum: cell?.stratum ?? null, from: cell?.from ?? null, to: cell?.to ?? null, job, site: cell ? site : null, canopy, anyway });

// The plant list's Layer / Stage / Job filters (mockup NOTES "All plants"): its layer, a stage it grows
// in, one of its jobs; null filters nothing. No fit check: every member is listed.
export interface ListFilters { layer: Stratum | null; stage: PhaseOrd | null; job: JobId | null }
export const filtersQuery = (f: ListFilters): ListQuery =>
  ({ stratum: f.layer, from: f.stage, to: f.stage, job: f.job, site: null, canopy: [], anyway: true });
export const matchesFilters = (t: Taxon, f: ListFilters): boolean => listMatch(filtersQuery(f))(t);

// Add's row order with no query: plants that ask first last, then the better known (named in more
// languages), then by scientific name.
export function addOrder<R extends { t: Taxon; asks: boolean }>(rows: R[]): R[] {
  const known = (t: Taxon) => Object.keys(t.names).length;
  return rows.sort((a, b) => Number(a.asks) - Number(b.asks) || known(b.t) - known(a.t) || (a.t.canonical_name < b.t.canonical_name ? -1 : 1));
}
