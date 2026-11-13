// Pure helpers of the stream S2 views (matrix, phone grid, Jobs, plant list): no DOM, no strings, no
// signals, so scripts/consortium-tracks.test.mjs runs them in Node. The views word what these return.
//
// - tracksOf: a row's plants on fixed tracks (interval packing), so one plant's pieces line up across
//   columns and read as one bar from its start to its end (mockup 02, "Plants as bars made of cells");
// - rowPieces: a row's cells, with neighbouring empty cells of the same kind merged into one run
//   (colspan), so a blocked row reads as one sentence instead of five copies of it;
// - runReasons / reasonParts: why a run of misfit cells is empty, counted once per plant;
// - listGroups: each plant once, under the cell where it starts (owner row "v2 mockup choices");
// - warningCounts: the warnings a chip counts (low conflicts are not shown on chips, types.ts Flag);
// - nameOrder: plants by name with one Intl.Collator per page language, shared by every view.
import type { Flag, JobId, MatrixCell, PhaseOrd, PlantId, Site, SiteKey, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { fits, fold, jobsOf, misfitsBeside, plantsIn, startCell, strata } from '../../../lib/consortium/index.ts';
import { spanOf, spans } from './kit/span.ts';

// Names sort in the page's language ("Äpfel" before "Birne" in German, after "Zitron" in Swedish):
// one collator per language, made once.
export type Order = (a: Taxon, b: Taxon) => number;
const collators = new Map<string, Intl.Collator>();
export function collatorFor(lang: string): Intl.Collator {
  let c = collators.get(lang);
  if (!c) { c = new Intl.Collator(lang); collators.set(lang, c); }
  return c;
}
export const nameOrder = (nameOf: (t: Taxon) => string, lang: string): Order => {
  const c = collatorFor(lang);
  return (a, b) => c.compare(nameOf(a), nameOf(b));
};

// Götsch's share of ground cover per layer, an aim given as text, never a bar or a height
// (coordinator row "v2 mockup choices": "aim ≈ 20 % cover; layers overlap").
export const SHARE_AIM: Record<Stratum, number> = { emergent: 20, high: 40, medium: 60, low: 80 };

// Above this many tracks in a row, its cells switch to a count, the first chips and "+ N more"
// (mockup 02 state `large`; NOTES open question 4: a guess to measure at 50 / 100 / 200 plants).
export const MAX_TRACKS = 5;
// Chips a collapsed cell still shows.
export const COLLAPSED_CHIPS = 3;

export const PHASE_ORDS: readonly PhaseOrd[] = [0, 1, 2, 3, 4, 5, 6];

// A plant's span (views/kit/span.ts, the one spanOf), re-exported for the views and tests reading it here.
export { spanOf, spans };

// The members of one stratum on tracks: sorted by start, longer first, then by name; each plant goes
// on the first track whose last plant ends before it starts. Plants with no placement are left out.
export function tracksOf(members: readonly Taxon[], stratum: Stratum, byName: Order): Taxon[][] {
  const here = members.filter((t) => t.stratum?.value === stratum && spanOf(t));
  const key = (t: Taxon) => spanOf(t)!;
  here.sort((a, b) => key(a).from - key(b).from || key(b).to - key(a).to || byName(a, b));
  const tracks: Taxon[][] = [];
  for (const t of here) {
    const from = key(t).from;
    let track = tracks.find((tr) => key(tr[tr.length - 1]).to < from);
    if (!track) { track = []; tracks.push(track); }
    track.push(t);
  }
  return tracks;
}

// One row as the desktop table draws it: a cell, or a run of neighbouring empty cells of one kind.
export type RowPiece =
  | { kind: 'cell'; cell: MatrixCell }
  | { kind: 'run'; empty: 'gap' | 'misfit'; from: PhaseOrd; to: PhaseOrd };
export function rowPieces(cells: readonly MatrixCell[]): RowPiece[] {
  const out: RowPiece[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    if (cell.empty && last?.kind === 'run' && last.empty === cell.empty && last.to === cell.phase - 1) {
      last.to = cell.phase;
    } else if (cell.empty) out.push({ kind: 'run', empty: cell.empty, from: cell.phase, to: cell.phase });
    else out.push({ kind: 'cell', cell });
  }
  return out;
}

// A collapsed cell's plants (a row of more than MAX_TRACKS tracks shows COLLAPSED_CHIPS of them): the
// plants starting in this cell first, by name, then those continuing from earlier, by start and name.
// A plant's button is its start piece, so listing the starters first keeps each plant's one Tab stop
// in view rather than behind "+ N more".
export function cellOrder(taxa: readonly Taxon[], phase: number, byName: Order): Taxon[] {
  const from = (t: Taxon) => spanOf(t)?.from ?? -1;
  return [...taxa].sort((a, b) => Number(from(b) === phase) - Number(from(a) === phase) || from(a) - from(b) || byName(a, b));
}

// Why a run of misfit cells (one stratum, phases from..to) is empty: the pool's plants growing in any
// of its cells, each counted once, and how many misfit per site answer beside the members (the same
// rule as buildMatrix: core site.ts misfitsBeside). both: the counts add up to more than the plants.
export function runReasons(pool: readonly Taxon[], members: readonly Taxon[], site: Site, stratum: Stratum, from: number, to: number): { n: number; reasons: Partial<Record<SiteKey, number>>; both: boolean } {
  const seen = new Map<PlantId, Taxon>();
  for (let p = from; p <= to; p++) for (const t of plantsIn(pool as Taxon[], stratum, p)) seen.set(t.id, t);
  const reasons: Partial<Record<SiteKey, number>> = {};
  let sum = 0;
  for (const t of seen.values()) {
    for (const key of misfitsBeside(t, site, members as Taxon[], fits(t, site))) { reasons[key] = (reasons[key] ?? 0) + 1; sum++; }
  }
  return { n: seen.size, reasons, both: sum > seen.size };
}

// The worded reasons of a misfit cell, most first. A light misfit reads "need shade" on a sunny site
// and "need more light" in part shade or shade; a water misfit reads "need more water" on dry ground
// and "want drier ground" on wet ground (types.ts MatrixCell.reasons).
// Room is never a misfit (advisory, site.ts), so it has no word here.
export type ReasonWord = 'light' | 'shade' | 'soil' | 'dry' | 'wet';
export function reasonParts(reasons: Partial<Record<SiteKey, number>>, site: Site): { word: ReasonWord; n: number }[] {
  const out: { word: ReasonWord; n: number }[] = [];
  for (const [key, n] of Object.entries(reasons) as [SiteKey, number][]) {
    if (!n || key === 'room') continue;
    const word: ReasonWord = key === 'light' ? (site.light === 'sun' ? 'shade' : 'light') : key === 'water' ? (site.water === 'wet' ? 'wet' : 'dry') : 'soil';
    out.push({ word, n });
  }
  return out.sort((a, b) => b.n - a.n);
}

// The plant list's groups: each plant once, under the cell where it starts (layer × first stage), in
// matrix order, names sorted inside a group; plants with no placement yet come last (stratum null).
export interface ListGroup { stratum: Stratum | null; phase: PhaseOrd | null; plants: Taxon[] }
export function listGroups(members: readonly Taxon[], byName: Order): ListGroup[] {
  const byKey = new Map<number, ListGroup>();
  const none: ListGroup = { stratum: null, phase: null, plants: [] };
  const seen = new Set<PlantId>();
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const cell = startCell(t);
    if (!cell) { none.plants.push(t); continue; }
    const k = strata.indexOf(cell[0]) * 7 + cell[1];
    let g = byKey.get(k);
    if (!g) { g = { stratum: cell[0], phase: cell[1], plants: [] }; byKey.set(k, g); }
    g.plants.push(t);
  }
  const out = [...byKey.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  if (none.plants.length) out.push(none);
  for (const g of out) g.plants.sort(byName);
  return out;
}

// The plant list's Layer / Stage / Job filters (mockup NOTES "All plants"): its layer, a stage it
// grows in (its span holds the stage), one of its jobs; null filters nothing.
export interface ListFilters { layer: Stratum | null; stage: PhaseOrd | null; job: JobId | null }
export function matchesFilters(t: Taxon, f: ListFilters): boolean {
  if (f.layer !== null && t.stratum?.value !== f.layer) return false;
  if (f.stage !== null && !spans(t, f.stage)) return false;
  if (f.job !== null && !jobsOf(t).includes(f.job)) return false;
  return true;
}

// The warnings a plant's chip and row count: every flag but a low conflict.
export function warningCounts(flags: readonly Flag[]): Map<PlantId, number> {
  const out = new Map<PlantId, number>();
  for (const f of flags) if (!(f.kind === 'conflict' && f.severity === 'low')) out.set(f.id, (out.get(f.id) ?? 0) + 1);
  return out;
}

// The members a cell of the plant list's "Where plants start" grid counts, keyed like core cellKey.
export function startCounts(groups: readonly ListGroup[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const g of groups) if (g.stratum && g.phase !== null) out.set(strata.indexOf(g.stratum) * 7 + g.phase, g.plants.length);
  return out;
}

// One stage earlier or later, kept within the seven.
export const stepStage = (stage: number, delta: number): PhaseOrd => Math.min(6, Math.max(0, stage + delta)) as PhaseOrd;

// The fill meter's bar, in percent of the cells that can be filled.
export const fillPercent = (filled: number, total: number): number => (total > 0 ? Math.round((filled / total) * 100) : 0);


// Does a plant match a folded query: every word of the query starts a word of one of its names.
export function matchesQuery(names: readonly string[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = names.map((n) => fold(n).split(/[\s\-‐'’(),.]+/).filter(Boolean));
  return words.every((w) => hay.some((ws) => ws.some((x) => x.startsWith(w))));
}

