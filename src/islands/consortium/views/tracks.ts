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
// - fold: accent- and case-folded text for the list's search (design check A6: never LIKE).
import type { Flag, MatrixCell, PhaseOrd, PlantId, Site, SiteKey, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { fits, misfitsBeside, phaseSpan, plantsIn, startCell, strata } from '../../../lib/consortium/index.ts';

// Götsch's share of ground cover per layer, an aim given as text, never a bar or a height
// (coordinator row "v2 mockup choices": "aim ≈ 20 % cover; layers overlap").
export const SHARE_AIM: Record<Stratum, number> = { emergent: 20, high: 40, medium: 60, low: 80 };

// Above this many tracks in a row, its cells switch to a count, the first chips and "+ N more"
// (mockup 02 state `large`; NOTES open question 4: a guess to measure at 50 / 100 / 200 plants).
export const MAX_TRACKS = 5;
// Chips a collapsed cell still shows.
export const COLLAPSED_CHIPS = 3;

export const PHASE_ORDS: readonly PhaseOrd[] = [0, 1, 2, 3, 4, 5, 6];

// A plant's span as phase numbers, or null when it has no placement yet ("no layer yet").
export function spanOf(t: Taxon): { from: PhaseOrd; to: PhaseOrd } | null {
  const span = phaseSpan(t);
  return span.length ? { from: span[0], to: span[span.length - 1] } : null;
}
export const spans = (t: Taxon, phase: number): boolean => {
  const s = spanOf(t);
  return !!s && s.from <= phase && phase <= s.to;
};

// The members of one stratum on tracks: sorted by start, longer first, then by name; each plant goes
// on the first track whose last plant ends before it starts. Plants with no placement are left out.
export function tracksOf(members: readonly Taxon[], stratum: Stratum, nameOf: (t: Taxon) => string): Taxon[][] {
  const here = members.filter((t) => t.stratum?.value === stratum && spanOf(t));
  const key = (t: Taxon) => spanOf(t)!;
  here.sort((a, b) => key(a).from - key(b).from || key(b).to - key(a).to || nameOf(a).localeCompare(nameOf(b)));
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
  | { kind: 'run'; empty: 'gap' | 'misfit'; from: PhaseOrd; to: PhaseOrd; cells: MatrixCell[] };
export function rowPieces(cells: readonly MatrixCell[]): RowPiece[] {
  const out: RowPiece[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    if (cell.empty && last?.kind === 'run' && last.empty === cell.empty && last.to === cell.phase - 1) {
      last.to = cell.phase;
      last.cells.push(cell);
    } else if (cell.empty) out.push({ kind: 'run', empty: cell.empty, from: cell.phase, to: cell.phase, cells: [cell] });
    else out.push({ kind: 'cell', cell });
  }
  return out;
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
export type ReasonWord = 'light' | 'shade' | 'soil' | 'dry' | 'wet' | 'room';
export function reasonParts(reasons: Partial<Record<SiteKey, number>>, site: Site): { word: ReasonWord; n: number }[] {
  const out: { word: ReasonWord; n: number }[] = [];
  for (const [key, n] of Object.entries(reasons) as [SiteKey, number][]) {
    if (!n) continue;
    const word: ReasonWord = key === 'light' ? (site.light === 'sun' ? 'shade' : 'light') : key === 'water' ? (site.water === 'wet' ? 'wet' : 'dry') : key;
    out.push({ word, n });
  }
  return out.sort((a, b) => b.n - a.n);
}

// The plant list's groups: each plant once, under the cell where it starts (layer × first stage), in
// matrix order, names sorted inside a group; plants with no placement yet come last (stratum null).
export interface ListGroup { stratum: Stratum | null; phase: PhaseOrd | null; plants: Taxon[] }
export function listGroups(members: readonly Taxon[], nameOf: (t: Taxon) => string): ListGroup[] {
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
  for (const g of out) g.plants.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  return out;
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

// Lower case, marks stripped after Latin, Greek and Cyrillic letters, ß œ æ written out, so "chataig"
// finds Châtaignier and "trefle" Trèfle (A6). CJK text is left as it is.
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/([A-Za-zÀ-ɏͰ-ϿЀ-ӿ])[̀-ͯ]+/g, '$1')
    .toLowerCase()
    .replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFC');
}

// Does a plant match a folded query: every word of the query starts a word of one of its names.
export function matchesQuery(names: readonly string[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = names.map((n) => fold(n).split(/[\s\-‐'’(),.]+/).filter(Boolean));
  return words.every((w) => hay.some((ws) => ws.some((x) => x.startsWith(w))));
}

