/** @jsxImportSource preact */
// The pictures' parts (plant-palette-architecture 3.4; v14 boards Main, Palette, Many, ManyDesk, Toasts):
// - YearsGrid (Main, a laptop, 40 plants or fewer): a grid headed "Light" and the seven time spans,
//   one row per light level ("Mostly sun 8 plants"), each plant a bar over its years, a button with its
//   main job's icon, its name and its warning mark inside; each empty judged place a dashed button
//   "<level>: nobody … Find" opening its fillers;
// - StepLevels (Palette, a phone, 40 plants or fewer): the time span the stepper shows, each level its
//   plants then, or the hole button "<level>: nobody … Find a plant";
// - CountCells (Many, ManyDesk, past 40 plants at every width; the size rule A14): each level a group
//   "Full sun: 10 plants", its first names and "+ N more" (views/kit/more.tsx MoreList);
// - JobKey, HowToRead (the disclosure under a picture's title, Toasts board, A18) and SrTable (the
//   pictures' screen-reader form, visually hidden, Q8: rules/picture.ts tableOf, the same cells).
// Colours from the token block only (palette-page.css): a bar carries its main job's colour with its
// icon and word, a level its icon and words (colour never alone).
import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Flag, JobId, PlantId, PlantVerdict, Stratum } from '../../../../lib/consortium/index.ts';
import { fitLine, jobIds, phaseOfYear, strata } from '../../../../lib/consortium/index.ts';
import { tableOf, type Picture, type PictureRow } from '../../rules/picture.ts';
import { P, pageLang, T } from '../../strings.ts';
import { collatorFor, listOf } from './names.ts';
import { JobIcon, jobWord, LevelIcon, say, sayAll } from './fit.tsx';
import { LightIcon } from './icons.tsx';
import { MoreList } from './more.tsx';

// ---- The size rule (A14): the one names list of the pictures ----

// Every name while the palette has 40 plants or fewer and the group 12 or fewer; else the count cell
// (views/kit/more.tsx MoreList: its first names, "+ N more", then 10, then all, "Show fewer").
export const SIZE_PALETTE = 40;
export const SIZE_GROUP = 12;
// Words as one list in the page's language (a few example names inside a sentence).
export const wordList = (words: string[]): string => listOf(words);
export const inlineNames = (n: number, size: number): boolean => size <= SIZE_PALETTE && n <= SIZE_GROUP;

// Member plants named in words (review R2, C1): every list of member names in the pictures, Warnings
// and Balance goes through here. Inline, one sentence's list in the page's language ("Olive, Almond and
// Fig", Intl.ListFormat conjunction: one list form in every language, BC18, BC20), in palette order,
// or wrapped by `text` (a sentence holding the names); folded, `lead` then the count cell, its names
// sorted by display name (locale collation, BC12). `closed`: the names a closed count cell shows.
// `few`: a sentence naming a handful whatever the palette's size (board ManyDesk: "Cashew, outside its
// climate range, is toxic too"), inline up to that many names.
export function Names({ ids, name, size, closed = 3, few = 0, text, lead, render }: {
  ids: readonly PlantId[]; name: (id: PlantId) => string; size: number; closed?: number; few?: number;
  text?: (names: string) => ComponentChildren; lead?: ComponentChildren; render?: (id: PlantId) => ComponentChildren;
}) {
  if (!ids.length) return null;
  if (inlineNames(ids.length, size) || ids.length <= few) {
    if (render) return <span class="ct-names-inline">{ids.map((id) => <span key={id}>{render(id)}</span>)}</span>;
    const words = listOf(ids.map(name));
    return <>{text ? text(words) : words}</>;
  }
  const order = collatorFor(pageLang());
  const sorted = [...ids].sort((a, b) => order.compare(name(a), name(b)));
  return <>{lead}<MoreList items={sorted} keyOf={(id) => id} paletteSize={size} closed={Math.max(1, closed)} class="ct-cell-names" render={render ?? name} /></>;
}

export interface PlantButtons {
  holeWords: (holeId: string) => string; // a hole's title ("Full sun: nobody in the first 3 years")
  onHole: (holeId: string) => void;
  onPlant: (id: PlantId) => void;
  // A member's verdict: one outside its range or needing a second look carries its level's icon, its
  // fit in the button's name (inform, don't block; owner 2026-11-14).
  verdictOf?: (id: PlantId) => PlantVerdict | undefined;
  // A member's flags (store.flags): its toxicity mark and words on the bar or chip (BC1, C5).
  flagsOf?: (id: PlantId) => readonly Flag[];
  invasiveWord?: string; // "Recorded invasive in Spain", for a member so flagged in the chosen country
}

// A plant's toxicity in words and mark (boards Main, Palette: a triangle labelled "Toxic", "Mildly
// toxic", "Very toxic"; the warning colour for Mildly toxic, the danger colour for the others).
const TOX: Record<string, 'slight' | 'moderate' | 'severe'> = { Slight: 'slight', Moderate: 'moderate', Severe: 'severe' };
export const toxOf = (flags: readonly Flag[] | undefined): 'slight' | 'moderate' | 'severe' | null => {
  const l = flags?.find((f) => f.kind === 'toxicity')?.level;
  return l ? TOX[l] ?? null : null;
};
// `decorative`: beside its words already (a Warnings chip), hidden from assistive technology.
export function ToxMark({ tox, decorative = false }: { tox: 'slight' | 'moderate' | 'severe'; decorative?: boolean }) {
  const word = T(`palette.warningsTox_${tox}`);
  return (
    <svg class="ct-tox" data-tox={tox} viewBox="0 0 20 20" aria-hidden={decorative ? 'true' : undefined} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : word} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      {!decorative && <title>{word}</title>}<path d="M10 3.2l7.3 12.8H2.7Z" /><path d="M10 8v3.6M10 14v.2" />
    </svg>
  );
}

// A bar's or hole's first and last time span in the grid (palette-page.css places it by data-from and
// data-to: no inline style).
type Span = [number, number];
const spanAttrs = (s?: Span) => (s ? { 'data-from': s[0], 'data-to': s[1] } : {});
const isStratum = (k: string): k is Stratum => (strata as readonly string[]).includes(k);
const isJob = (k: string): k is JobId => (jobIds as readonly string[]).includes(k);
export const LaneHead = ({ r }: { r: Pick<PictureRow, 'key' | 'head'> }) => (
  <>{isJob(r.key) ? <JobIcon job={r.key} /> : isStratum(r.key) ? <LightIcon stratum={r.key} /> : <span class="ct-light-swatch" aria-hidden="true" />}{say(r.head)}</>
);

// One plant as a button: its main job's icon, its name, its toxicity mark (role img, its words) and,
// when it warns, its verdict's icon; its name read as one phrase (the plant, its main job, its toxicity,
// recorded invasive, its fit when it warns). A grid bar one time span long draws its colour behind the
// icon only and its name after it, in the text colour (board Main: "Crimson clover"), so no name is cut.
export function PlantButton({ id, p, b, cls = 'ct-chip', span }: { id: PlantId; p: Picture; b: PlantButtons; cls?: string; span?: Span }) {
  const v = b.verdictOf?.(id), job = p.jobs[id] ?? null, warn = !!v && (v.level === 'outside' || v.level === 'look');
  const flags = b.flagsOf?.(id), tox = toxOf(flags), invasive = !!flags?.some((f) => f.kind === 'invasive');
  const label = [p.names[id] ?? id, jobWord(job), ...(tox ? [T(`palette.warningsTox_${tox}`)] : []), ...(invasive && b.invasiveWord ? [b.invasiveWord] : []), ...(warn && v ? [say(fitLine(v))] : [])].join(', ');
  return (
    <button type="button" class={cls} {...spanAttrs(span)} data-short={span && span[0] === span[1] ? '' : undefined} data-plant-id={id} data-job={job ?? 'none'} data-level={warn ? v!.level : undefined} data-tox={tox ?? undefined} aria-label={label} onClick={() => b.onPlant(id)}>
      <span class="ct-bar-icon"><JobIcon job={job} /></span><span class="ct-bar-name">{p.names[id] ?? id}</span>{tox && <ToxMark tox={tox} />}{warn && <LevelIcon level={v!.level} />}
    </button>
  );
}
// A hole's title with its lane in bold, the part before the first colon ("**Part shade:** nobody, at
// any time"; BC8): holeWords' one form, consortium.palette.holeTitle, puts the lane first.
export function HoleTitle({ words }: { words: string }) {
  const m = /^([^:：]+[:：])\s*(.*)$/s.exec(words);
  return m ? <><strong>{m[1]}</strong> {m[2]}</> : <>{words}</>;
}
// A hole as a dashed button: its title, then "Find" (a laptop's grid) or "Find a plant".
export const HoleButton = ({ id, b, find, span }: { id: string; b: PlantButtons; find: string; span?: Span }) => (
  <button type="button" class="ct-hole-button" {...spanAttrs(span)} data-hole={id} onClick={() => b.onHole(id)}>
    <span>{b.holeWords(id)}</span> <span class="ct-hole-find">{find}</span>
  </button>
);

// The grid's runs of one hole: the columns of each contiguous run of cells that are that hole.
// A run spans the hole's own years when its id names them ("light:low:0-3": the first 3 years, also
// over the time spans not judged yet, as board Main draws "Full sun: nobody in the first 3 years").
function holeRuns(r: PictureRow): { id: string; from: number; to: number }[] {
  const out: { id: string; from: number; to: number }[] = [];
  r.cells.forEach((c, i) => {
    const last = out.at(-1);
    if (!c.hole) return;
    if (last && last.id === c.hole && last.to === i - 1) last.to = i;
    else out.push({ id: c.hole, from: i, to: i });
  });
  const last = r.cells.length - 1;
  for (const run of out) {
    const m = /:(\d+)-(\d+)(?::|$)/.exec(run.id);
    if (!m) continue;
    run.from = Math.min(run.from, phaseOfYear(Number(m[1])));
    run.to = Math.min(last, Math.max(run.to, phaseOfYear(Number(m[2]), true)));
  }
  return out;
}

// A row's figure (review R8): the plants standing in it that count toward the holes (PictureRow.count,
// the same rule as the holes), and those outside their climate range said apart.
function RowCount({ r }: { r: PictureRow }) {
  return <span class="ct-grid-count">{P('palette.chart.plants', r.count)}{r.outside > 0 && <span class="ct-grid-outside"> · {P('palette.cellsOutside', r.outside)}</span>}</span>;
}
// A level's plants in one time span, as chips, or (more than 12, or past 40 plants) the count cell.
const chipsOf = (ids: readonly PlantId[], p: Picture, b: PlantButtons, size: number) => (
  <Names ids={ids} name={(id) => p.names[id] ?? id} size={size} render={(id) => inlineNames(ids.length, size) ? <PlantButton id={id} p={p} b={b} /> : <button type="button" class="ct-name" onClick={() => b.onPlant(id)}>{p.names[id] ?? id}</button>} />
);

function YearsGridView({ p, b, size }: { p: Picture; b: PlantButtons; size: number }) {
  return (
    <div class="ct-grid">
      <div class="ct-grid-head">
        <span class="ct-grid-corner">{T('palette.chart.light')}</span>
        {p.columns.map((c, i) => <span key={i} class="ct-grid-col">{say(c)}</span>)}
      </div>
      {p.rows.map((r) => {
        // A level holding more than 12 plants: its count cell over the whole row, never 13 bars (C1).
        const many = r.marks.length > SIZE_GROUP;
        return (
          <div key={r.key} class="ct-grid-row" data-lane={r.key} data-state={r.state}>
            <div class="ct-grid-lane">
              <span class="ct-grid-level"><LaneHead r={r} /></span>
              <RowCount r={r} />
            </div>
            <div class="ct-grid-bars">
              {many
                ? <div class="ct-grid-many" data-from={0} data-to={p.columns.length - 1}>{chipsOf(r.marks.map((m) => m.id), p, b, size)}</div>
                : r.marks.map((m) => {
                  const a = phaseOfYear(m.from), z = phaseOfYear(m.to, true);
                  return <PlantButton key={m.id} id={m.id} p={p} b={b} cls="ct-bar" span={[a, z]} />;
                })}
              {holeRuns(r).map((h) => <HoleButton key={`${h.id}${h.from}`} id={h.id} b={b} find={T('palette.find')} span={[h.from, h.to]} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export const YearsGrid = memo(YearsGridView);

// One time span, each level its plants standing then (or its hole): every name at 12 or fewer, else
// the level's count cell (C1).
export function StepLevels({ p, column, b, size }: { p: Picture; column: number; b: PlantButtons; size: number }) {
  return (
    <ul class="ct-levels">
      {p.rows.map((r) => {
        const c = r.cells[column];
        return (
          <li key={r.key} class="ct-level" data-lane={r.key}>
            <span class="ct-level-head"><LaneHead r={r} /></span>
            {c.ids.length > 0 && <span class="ct-level-plants">{chipsOf(c.ids, p, b, size)}</span>}
            {c.hole && <HoleButton id={c.hole} b={b} find={T('palette.chart.findPlant')} />}
          </li>
        );
      })}
    </ul>
  );
}

// Past 40 plants: each level a group "Full sun: 10 plants" with its count cell. `standing(key)`: the
// level's plants standing then that count (not outside their range).
export function CountCells({ p, column, size, standing, b }: { p: Picture; column: number; size: number; standing: (r: PictureRow) => PlantId[]; b: PlantButtons }) {
  return (
    <div class="ct-cells">
      {p.rows.map((r) => {
        const ids = standing(r), hole = r.cells[column].hole;
        if (!ids.length && !hole) return null;
        const label = T('palette.chart.levelCount', { level: say(r.head), plants: P('palette.chart.plants', ids.length) });
        return (
          <div key={r.key} class="ct-cell" role="group" aria-label={label} data-lane={r.key}>
            <p class="ct-cell-head"><span class="ct-grid-level">{say(r.head)}</span><span class="ct-grid-count">{P('palette.chart.plants', ids.length)}</span></p>
            <Names ids={ids} name={(id) => p.names[id] ?? id} size={size} render={(id) => <button type="button" class="ct-name" onClick={() => b.onPlant(id)}>{p.names[id] ?? id}</button>} />
            {hole && <HoleButton id={hole} b={b} find={T('palette.chart.findPlant')} />}
          </div>
        );
      })}
    </div>
  );
}

// The key (board Main): "Colour and icon show each plant's main job:", then the six jobs in order,
// each its icon white in a square of the job's colour (BC6), and "No job recorded" when a bar has none.
export function JobKey({ p }: { p: Picture }) {
  const none = p.rows.some((r) => r.marks.some((m) => m.job === null));
  const jobs: (JobId | null)[] = [...jobIds, ...(none ? [null] : [])];
  return (
    <div class="ct-chart-key">
      <p>{T('palette.jobKey')}</p>
      <ul>{jobs.map((j) => <li key={j ?? 'none'}><span class="ct-key-chip" data-job={j ?? 'none'}><JobIcon job={j} /></span> {jobWord(j)}</li>)}</ul>
    </div>
  );
}

// "How to read this" (Toasts and DeskStates boards, A18): a closed disclosure under each picture's
// title; at 960 px and wider a small panel under its button (palette-page.css), closed by Escape with
// the focus back on the button.
export function HowToRead({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  return (
    <div class="ct-read">
      <button ref={button} type="button" class="ct-read-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{T('palette.readTitle')}</button>
      <div id={id} class="ct-read-body" hidden={!open}>{children}</div>
    </div>
  );
}

// The picture as a table, visually hidden: its screen-reader form (Q8), every plant in its cells.
function SrTableView({ p, holeWords }: { p: Picture; holeWords: (id: string) => string }) {
  const t = tableOf(p);
  const cols = t.columns.map(say);
  return (
    // Wrapped: a table ignores the 1 px box of .visually-hidden and would widen a phone's page.
    <div class="visually-hidden"><table>
      <caption>{sayAll(t.summary)}</caption>
      <thead><tr><td />{cols.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
      <tbody>
        {t.rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{say(r.head)}</th>
            {r.cells.map((c, i) => <td key={i}>{c.names.length ? c.names.join(', ') : c.hole ? holeWords(c.hole) : c.judged ? T('palette.nobody') : T('palette.notJudged')}</td>)}
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
export const SrTable = memo(SrTableView);
