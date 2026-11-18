// One picture model for every picture of the palette page (Through the years, the jobs, later the
// plan, climate, soil and year pictures) and print's tables (plant-palette-architecture 3.4), so the
// accessible form is decided once. Pure: no DOM, no strings (words are Lines, drawn by the view;
// verdict, hole and year words come from the core's verdict-line.ts).
//
// - Columns are the time steps (or months); rows are the lanes (a light level, a job). Each cell holds
//   the plants standing there, or the open hole it is (an HTML button in the view).
// - No fold in the model (v14 A14, the size rule): every plant is in its cells; the view decides
//   between every name and the count cell (views/kit/more.tsx MoreList). Order: plants that fill a
//   hole first, then the main job (jobIds order), then name. `hidden` stays empty (the cell shape the
//   table form and its vector read).
// - `counts` (opts): whether a plant counts toward the holes (not outside its climate range): a cell
//   whose plants all fail it is still the open hole, and their bands are marked 'outside'.
// - A row with no data is counted, never dropped (state 'not-recorded'); a column outside the judged
//   window is 'not-judged' (a thin line, never a hole). Models carry full plant names.
import type { Hole, JobId, Line, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { JUDGED_FROM_YEAR, PHASE_YEARS, jobIds, jobsOf } from '../../../lib/consortium/index.ts';

export interface Mark { id: PlantId; name: string; job: JobId | null; from: number; to: number | null; marked?: 'outside' }
export interface Cell { ids: PlantId[]; hidden: PlantId[]; hole: string | null; judged: boolean }
export interface PictureRow {
  key: string; // the lane's id (a stratum, a job), for keyed rendering
  head: Line;
  cells: Cell[];
  marks: Mark[]; // the lane's drawn plants (bands in years: from, to; to null past 60)
  state: 'data' | 'not-recorded' | 'not-judged';
}
// names: each plant's full name; jobs: each plant's main job (the chip's icon and accessible name read
// it here, so no view works it out again). A band's colour is its Mark's job: the main job in Through
// the years (with its key), the row's job in the jobs picture (picture-jobs.ts).
export interface Picture { title: string; summary: Line[]; columns: Line[]; rows: PictureRow[]; names: Record<PlantId, string>; jobs: Record<PlantId, JobId | null> }

// A plant's main job: its first in jobIds order, or null.
export const mainJob = (t: Taxon): JobId | null => jobsOf(t)[0] ?? null;

// The names and main jobs of a picture's plants (both pictures build them the same way).
export function namesAndJobs(members: readonly Taxon[], nameOf: (t: Taxon) => string): Pick<Picture, 'names' | 'jobs'> {
  const names: Record<PlantId, string> = {}, jobs: Record<PlantId, JobId | null> = {};
  for (const t of members) { names[t.id] = nameOf(t); jobs[t.id] = mainJob(t); }
  return { names, jobs };
}

// One collator for every lane (String#localeCompare builds one per call; 200 plants sort thousands of times).
const collator = typeof Intl !== 'undefined' ? new Intl.Collator() : null;
// The lane order (hole fillers, main job, name). Each plant's sort key is read once, then the lane is
// sorted on the keys.
export function laneOrder(plants: readonly Taxon[], nameOf: (t: Taxon) => string, first: ReadonlySet<PlantId> = new Set()): Taxon[] {
  const keyed = plants.map((t) => { const j = mainJob(t); return { t, first: first.has(t.id) ? 0 : 1, job: j ? jobIds.indexOf(j) : jobIds.length, name: nameOf(t) }; });
  const byName = collator ? collator.compare : (a: string, b: string) => a.localeCompare(b);
  keyed.sort((a, b) => a.first - b.first || a.job - b.job || byName(a.name, b.name));
  return keyed.map((k) => k.t);
}

// One lane: its cells over the columns (`at(t, column)`: whether the plant stands in it), its marks,
// `holeAt(column)`: the open hole an empty judged cell is (a cell of only non-counting plants too), or null.
export function lane(key: string, head: Line, plants: readonly Taxon[], columns: number, opts: {
  nameOf: (t: Taxon) => string; at: (t: Taxon, column: number) => boolean; judged: (column: number) => boolean;
  holeAt: (column: number) => string | null; years: (t: Taxon) => { from: number; to: number | null } | null; first?: ReadonlySet<PlantId>; state?: PictureRow['state'];
  markJob?: JobId | null; // every band's job (the jobs picture: its row's); else each plant's main job
  counts?: (t: Taxon) => boolean; // counts toward the holes (default: every plant)
}): PictureRow {
  const sorted = laneOrder(plants, opts.nameOf, opts.first);
  const counts = opts.counts ?? (() => true);
  const cells: Cell[] = [];
  for (let c = 0; c < columns; c++) {
    const here = sorted.filter((t) => opts.at(t, c));
    const judged = opts.judged(c);
    cells.push({ ids: here.map((t) => t.id), hidden: [], hole: here.some(counts) || !judged ? null : opts.holeAt(c), judged });
  }
  const marks = sorted.flatMap((t) => {
    const y = opts.years(t);
    if (!y) return [];
    const m: Mark = { id: t.id, name: opts.nameOf(t), job: opts.markJob === undefined ? mainJob(t) : opts.markJob, from: y.from, to: y.to };
    if (!counts(t)) m.marked = 'outside';
    return [m];
  });
  return { key, head, cells, marks, state: opts.state ?? 'data' };
}

// A time step is judged when it ends after year 1 and before 60 (owner: shorter gaps and after 60
// are a thin line, never a hole).
export const judgedColumn = (c: number): boolean => { const [, to] = PHASE_YEARS[c]; return to !== null && to > JUDGED_FROM_YEAR; };
// The open hole of a lane (`mine`) covering time step c, or null.
export function holeAt(holes: readonly Hole[], mine: (h: Hole) => boolean, c: number): string | null {
  const [from, to] = PHASE_YEARS[c];
  return holes.find((h) => h.state === 'open' && mine(h) && h.fromYear <= from && to !== null && h.toYear >= to)?.id ?? null;
}

// The table form (the pictures' screen-reader form, Q8): the same rows and columns, every plant listed.
export interface TableCell { ids: PlantId[]; names: string[]; hole: string | null; judged: boolean }
export interface Table { title: string; summary: Line[]; columns: Line[]; rows: { key: string; head: Line; state: PictureRow['state']; cells: TableCell[] }[] }
export function tableOf(p: Picture): Table {
  return {
    title: p.title, summary: p.summary, columns: p.columns,
    rows: p.rows.map((r) => ({
      key: r.key, head: r.head, state: r.state,
      cells: r.cells.map((c) => { const ids = [...c.ids, ...c.hidden]; return { ids, names: ids.map((id) => p.names[id] ?? id), hole: c.hole, judged: c.judged }; }),
    })),
  };
}

// The plants a picture shows (each once), and its open holes.
export const plantsIn = (p: Picture): Set<PlantId> => new Set(p.rows.flatMap((r) => r.cells.flatMap((c) => [...c.ids, ...c.hidden])));
export const holesIn = (p: Picture): string[] => [...new Set(p.rows.flatMap((r) => r.cells.flatMap((c) => (c.hole ? [c.hole] : []))))];

// One column of a picture (the phone's year stepper shows one time step at a time).
export function columnOf(p: Picture, column: number): Picture {
  return { ...p, columns: [p.columns[column]], rows: p.rows.map((r) => ({ ...r, cells: [r.cells[column]] })) };
}
