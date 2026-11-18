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
import { useId, useState } from 'preact/hooks';
import type { JobId, PlantId, PlantVerdict, Stratum } from '../../../../lib/consortium/index.ts';
import { fitLine, jobIds, phaseOfYear, strata } from '../../../../lib/consortium/index.ts';
import { tableOf, type Picture, type PictureRow } from '../../rules/picture.ts';
import { P, pageLang, T } from '../../strings.ts';
import { JobIcon, jobWord, say, sayAll } from './fit.tsx';
import { LightIcon, WARN } from './icons.tsx';
import { MoreList } from './more.tsx';

// Plants named in a line, as the boards list them: "Olive, Almond, Fig" (a list of names, not a
// sentence's "and").
export const commaList = (items: string[]): string => new Intl.ListFormat(pageLang(), { type: 'unit', style: 'short' }).format(items);

export interface PlantButtons {
  holeWords: (holeId: string) => string; // a hole's title ("Full sun: nobody in the first 3 years")
  onHole: (holeId: string) => void;
  onPlant: (id: PlantId) => void;
  // A member's verdict: one outside its range or needing a second look carries the warning mark, its
  // fit in the button's name (inform, don't block; owner 2026-11-14).
  verdictOf?: (id: PlantId) => PlantVerdict | undefined;
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

// One plant as a button: its main job's icon, its name, the warning mark when it warns; its name read
// as one phrase (the plant, its main job, its fit when it warns). A grid bar one time span long draws
// its colour behind the icon only and its name after it, in the text colour (board Main: "Crimson
// clover"), so no name is cut.
export function PlantButton({ id, p, b, cls = 'ct-chip', span }: { id: PlantId; p: Picture; b: PlantButtons; cls?: string; span?: Span }) {
  const v = b.verdictOf?.(id), job = p.jobs[id] ?? null, warn = !!v && (v.level === 'outside' || v.level === 'look');
  const label = [p.names[id] ?? id, jobWord(job), ...(warn && v ? [say(fitLine(v))] : [])].join(', ');
  return (
    <button type="button" class={cls} {...spanAttrs(span)} data-short={span && span[0] === span[1] ? '' : undefined} data-plant-id={id} data-job={job ?? 'none'} data-level={warn ? v!.level : undefined} aria-label={label} onClick={() => b.onPlant(id)}>
      <span class="ct-bar-icon"><JobIcon job={job} /></span><span class="ct-bar-name">{p.names[id] ?? id}</span>{warn && WARN}
    </button>
  );
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

function YearsGridView({ p, b }: { p: Picture; b: PlantButtons }) {
  return (
    <div class="ct-grid">
      <div class="ct-grid-head">
        <span class="ct-grid-corner">{T('palette.chart.light')}</span>
        {p.columns.map((c, i) => <span key={i} class="ct-grid-col">{say(c)}</span>)}
      </div>
      {p.rows.map((r) => {
        const ids = [...new Set(r.cells.flatMap((c) => c.ids))];
        return (
          <div key={r.key} class="ct-grid-row" data-lane={r.key} data-state={r.state}>
            <div class="ct-grid-lane">
              <span class="ct-grid-level"><LaneHead r={r} /></span>
              <span class="ct-grid-count">{P('palette.chart.plants', ids.length)}</span>
            </div>
            <div class="ct-grid-bars">
              {r.marks.map((m) => {
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

// One time span, each level its plants standing then (or its hole), every name (40 plants or fewer).
export function StepLevels({ p, column, b }: { p: Picture; column: number; b: PlantButtons }) {
  return (
    <ul class="ct-levels">
      {p.rows.map((r) => {
        const c = r.cells[column];
        return (
          <li key={r.key} class="ct-level" data-lane={r.key}>
            <span class="ct-level-head"><LaneHead r={r} /></span>
            {c.ids.length > 0 && <span class="ct-level-plants">{c.ids.map((id) => <PlantButton key={id} id={id} p={p} b={b} />)}</span>}
            {c.hole && <HoleButton id={c.hole} b={b} find={T('palette.chart.findPlant')} />}
          </li>
        );
      })}
    </ul>
  );
}

// Past 40 plants: each level a group "Full sun: 10 plants" with its count cell. `standing(key)`: the
// level's plants standing then that count (not outside their range), in the lane's order.
export function CountCells({ p, column, size, standing, b }: { p: Picture; column: number; size: number; standing: (r: PictureRow) => PlantId[]; b: PlantButtons }) {
  return (
    <div class="ct-cells">
      {p.rows.map((r) => {
        const ids = standing(r), hole = r.cells[column].hole;
        if (!ids.length && !hole) return null;
        const label = T('palette.chart.levelCount', { level: say(r.head), plants: P('palette.chart.plants', ids.length) });
        return (
          <div key={r.key} class="ct-cell" role="group" aria-label={label} data-lane={r.key}>
            <p class="ct-cell-head"><span class="ct-grid-level"><LaneHead r={r} /></span><span class="ct-grid-count">{P('palette.chart.plants', ids.length)}</span></p>
            {ids.length > 0 && <MoreList items={ids} keyOf={(id) => id} paletteSize={size} class="ct-cell-names" render={(id) => <button type="button" class="ct-name" onClick={() => b.onPlant(id)}>{p.names[id] ?? id}</button>} />}
            {hole && <HoleButton id={hole} b={b} find={T('palette.chart.findPlant')} />}
          </div>
        );
      })}
    </div>
  );
}

// The key (board Main): "Colour and icon show each plant's main job:", then each job the bars show.
export function JobKey({ p }: { p: Picture }) {
  const shown = new Set<JobId | null>(p.rows.flatMap((r) => r.marks.map((m) => m.job)));
  const jobs: (JobId | null)[] = [...jobIds.filter((j) => shown.has(j)), ...(shown.has(null) ? [null] : [])];
  if (!jobs.length) return null;
  return (
    <div class="ct-chart-key">
      <p>{T('palette.jobKey')}</p>
      <ul>{jobs.map((j) => <li key={j ?? 'none'}><JobIcon job={j} /> {jobWord(j)}</li>)}</ul>
    </div>
  );
}

// "How to read this" (Toasts board, A18): a closed disclosure under the picture's title.
export function HowToRead({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div class="ct-read">
      <button type="button" class="ct-read-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{T('palette.readTitle')}</button>
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
