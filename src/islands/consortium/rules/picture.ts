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
//   table form and its vector read; main's consortium-pp-pf.test.mjs still reads it).
// - `counts` (opts): whether a plant counts toward the holes (not outside its climate range): a cell
//   whose plants all fail it is still the open hole, and their bands are marked 'outside'. A row's
//   `counted` (and its length `count`) are its plants that count, `outside` the ids of those that do not (review R8, round 2 R2: the
//   grid's "Full sun 3 plants", its fold at 12 and its names read these, the count cells too; never a
//   count beside a hole of nobody, never a fold on plants the head leaves out). countingIds(row, cell):
//   a cell's plants that count.
// - `holeRuns`: each open hole's columns in the row, stretched over the hole's own years (Hole.fromYear,
//   toYear: "Full sun: nobody in the first 3 years" also over the time spans not judged yet, board Main).
// - A row with no data is counted, never dropped (state 'not-recorded'); a column outside the judged
//   window is 'not-judged' (a thin line, never a hole). Models carry full plant names.
import type { Hole, JobId, LaneCount, Line, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { JUDGED_FROM_YEAR, PHASE_YEARS, jobIds, jobsOf, phaseOfYear } from '../../../lib/consortium/index.ts';

export interface Mark { id: PlantId; name: string; job: JobId | null; from: number; to: number | null; marked?: 'outside' }
export interface HoleRun { id: string; from: number; to: number }
export interface Cell { ids: PlantId[]; hidden: PlantId[]; hole: string | null; judged: boolean }
export interface PictureRow {
  key: string; // the lane's id (a stratum, a job), for keyed rendering
  head: Line;
  cells: Cell[];
  marks: Mark[]; // the lane's drawn plants (bands in years: from, to; to null past 60)
  counted: PlantId[]; // the lane's plants standing in some time span that count toward the holes (lane order)
  count: number; // counted.length
  outside: PlantId[]; // the lane's plants standing in some time span outside their climate range (lane order)
  holeRuns: HoleRun[]; // the lane's open holes as runs of columns, over each hole's own years
  state: 'data' | 'not-recorded' | 'not-judged';
}
// names: each plant's full name; jobs: each plant's main job (the chip's icon and accessible name read
// it here, so no view works it out again). A band's colour is its Mark's job: the main job in Through
// the years (with its key), the row's job in a job lane.
export interface Picture { title: string; summary: Line[]; columns: Line[]; rows: PictureRow[]; names: Record<PlantId, string>; jobs: Record<PlantId, JobId | null> }

// A plant's main job: its first in jobIds order, or null.
// The boards' plain list of names ("Olive, Almond, Fig"; c2 C1, B1): the names joined by the page
// language's own list separator, never a conjunction. The separator is the literal between the first two
// items of the language's conjunction list (CLDR: "、" in zh and ja, ", " in the others), so a Chinese
// row reads "橄榄、杏仁、无花果" (the 'unit' list type has no separator in zh, a bare space in ja, ko, ru).
const separators = new Map<string, string>();
export function plainList(items: readonly string[], lang: string): string {
  let sep = separators.get(lang);
  if (sep === undefined) {
    const parts = new Intl.ListFormat(lang, { type: 'conjunction' }).formatToParts(['a', 'b', 'c']);
    sep = parts.find((x) => x.type === 'literal')?.value ?? ', ';
    separators.set(lang, sep);
  }
  return items.join(sep);
}

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
  counts?: (t: Taxon) => boolean; // counts toward the holes (default: every plant)
  holeOf?: (id: string) => Hole | undefined; // a hole by its id, for its years (holeRuns)
}): PictureRow {
  const sorted = laneOrder(plants, opts.nameOf, opts.first);
  const counts = opts.counts ?? (() => true);
  const cells: Cell[] = [];
  const standing = new Set<Taxon>();
  for (let c = 0; c < columns; c++) {
    const here = sorted.filter((t) => opts.at(t, c));
    for (const t of here) standing.add(t);
    const judged = opts.judged(c);
    cells.push({ ids: here.map((t) => t.id), hidden: [], hole: here.some(counts) || !judged ? null : opts.holeAt(c), judged });
  }
  const marks = sorted.flatMap((t) => {
    const y = opts.years(t);
    if (!y) return [];
    const m: Mark = { id: t.id, name: opts.nameOf(t), job: mainJob(t), from: y.from, to: y.to };
    if (!counts(t)) m.marked = 'outside';
    return [m];
  });
  const stood = sorted.filter((t) => standing.has(t));
  const counted = stood.filter(counts).map((t) => t.id), outside = stood.filter((t) => !counts(t)).map((t) => t.id);
  return { key, head, cells, marks, counted, count: counted.length, outside, holeRuns: runsOf(cells, opts.holeOf), state: opts.state ?? 'data' };
}

// A cell's plants that count toward the holes: its plants less the row's outside ones.
export const countingIds = (r: Pick<PictureRow, 'outside'>, c: Pick<Cell, 'ids'>): PlantId[] => (r.outside.length ? c.ids.filter((id) => !r.outside.includes(id)) : c.ids);

// The runs of each hole over the cells (contiguous cells that are that hole), each stretched over the
// hole's own years when the hole is known (its first and last time span, within the columns).
function runsOf(cells: readonly Cell[], holeOf?: (id: string) => Hole | undefined): HoleRun[] {
  const out: HoleRun[] = [];
  cells.forEach((c, i) => {
    const last = out.at(-1);
    if (!c.hole) return;
    if (last && last.id === c.hole && last.to === i - 1) last.to = i;
    else out.push({ id: c.hole, from: i, to: i });
  });
  const end = cells.length - 1;
  for (const run of out) {
    const h = holeOf?.(run.id);
    if (!h) continue;
    run.from = Math.min(run.from, phaseOfYear(h.fromYear));
    run.to = Math.min(end, Math.max(run.to, phaseOfYear(h.toYear, true)));
  }
  return out;
}

// A time step is judged when it ends after year 1 and before 60 (owner: shorter gaps and after 60
// are a thin line, never a hole).
export const judgedColumn = (c: number): boolean => { const [, to] = PHASE_YEARS[c]; return to !== null && to > JUDGED_FROM_YEAR; };
// The open hole of a lane (`mine`) covering time step c, or null.
export function holeAt(holes: readonly Hole[], mine: (h: Hole) => boolean, c: number): string | null {
  const [from, to] = PHASE_YEARS[c];
  return holes.find((h) => h.state === 'open' && mine(h) && h.fromYear <= from && to !== null && h.toYear >= to)?.id ?? null;
}

// A job's strip over the time spans (boards MainMore, PaletteMore; the legend "2 or more plants · 1 plant
// between year 1 and year 60: thin · nobody: a hole"), read from the engine's targets, never from the
// counts again (reviews R1, R9, BC9): a time span inside an open hole of the job is 'hole', inside one of
// its open thin spots (store.thinSpots) 'thin' (an outline with one mark), any other span with a plant
// 'full', an empty one 'line'. A span not judged (the first year, after year 60) is never a hole nor
// thin. While a member's list loads the view draws no strip (round 2 R4: a loading state is never a
// shape the legend explains; the intro says the holes are being checked, PP-B21).
export type StripState = 'full' | 'thin' | 'hole' | 'line';
export function stripStates(l: LaneCount, holes: readonly Hole[], thins: readonly Hole[]): StripState[] {
  const mine = (h: Hole) => h.kind === 'job' && h.job === l.job && h.state === 'open';
  return PHASE_YEARS.map(([from, to], c): StripState => {
    const n = l.counts[c] ?? 0;
    if (!judgedColumn(c)) return n > 0 ? 'full' : 'line';
    if (holeAt(holes, mine, c)) return 'hole';
    const end = to ?? Infinity;
    if (thins.some((t) => mine(t) && t.fromYear < end && from < t.toYear)) return 'thin';
    return n > 0 ? 'full' : 'line';
  });
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
