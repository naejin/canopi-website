/** @jsxImportSource preact */
// One picture on the page (plant-palette-architecture 3.4): the drawing (an SVG, role img, named by the
// picture's summary, with nothing focusable inside), its lanes in HTML (each plant a button opening
// Details, each empty place a button opening its fillers, "+ n more" opening the table), and "Show as
// a table", the same cells as a table (rules/picture.ts tableOf; P17). Colours from the token block
// only (palette-page.css): a band carries its job colour and the lane its light level, always with
// the words beside them.
import { useId, useState } from 'preact/hooks';
import type { Line, PlantId, PlantVerdict } from '../../../../lib/consortium/index.ts';
import { PHASE_YEARS } from '../../../../lib/consortium/index.ts';
import { columnOf, tableOf, type Picture } from '../../rules/picture.ts';
import { T } from '../../strings.ts';
import { FitLine, say, sayAll } from './fit.tsx';

export interface ChartProps {
  picture: Picture;
  intro: string;
  column?: number | null; // one time step only (the phone's stepper)
  holeWords: (holeId: string, head: Line) => string; // a hole button's name
  onHole: (holeId: string) => void;
  onPlant: (id: PlantId) => void;
  // A member's verdict: one outside its range or needing a second look says so on its chip, in words
  // with an icon (inform, don't block; owner 2026-11-14).
  verdictOf?: (id: PlantId) => PlantVerdict | undefined;
}

const W = 700, BAND = 10, GAP = 4, LANE_PAD = 8;
const colOfYear = (y: number): number => Math.max(0, PHASE_YEARS.findIndex(([from]) => from === y));
const colOfEnd = (y: number | null): number => (y === null ? PHASE_YEARS.length - 1 : Math.max(0, PHASE_YEARS.findIndex(([, to]) => to === y)));

function Drawing({ p, first }: { p: Picture; first: number }) {
  const cols = p.columns.length, cw = W / cols;
  let y = 0;
  const lanes = p.rows.map((r) => {
    const h = Math.max(1, r.marks.length) * (BAND + GAP) + LANE_PAD * 2, top = y;
    y += h;
    return { r, top, h };
  });
  return (
    <svg class="ct-chart-svg" role="img" aria-label={sayAll(p.summary)} viewBox={`0 0 ${W} ${Math.max(y, 1)}`} preserveAspectRatio="none">
      {lanes.map(({ r, top, h }) => (
        <g key={r.key} data-lane={r.key}>
          <rect class="ct-chart-lane" data-lane={r.key} x="0" y={top} width={W} height={h} />
          {r.cells.map((c, i) => (!c.judged ? <line key={`j${i}`} class="ct-chart-unjudged" x1={i * cw} x2={(i + 1) * cw} y1={top + h / 2} y2={top + h / 2} />
            : c.hole ? <rect key={`h${i}`} class="ct-chart-hole" x={i * cw + 2} y={top + 2} width={cw - 4} height={h - 4} /> : null))}
          {r.marks.map((m, i) => {
            const a = Math.max(colOfYear(m.from) - first, 0), b = Math.min(colOfEnd(m.to) - first, cols - 1);
            return b < a ? null : <rect key={m.id} class="ct-chart-band" data-job={m.job ?? 'none'} x={a * cw + 2} y={top + LANE_PAD + i * (BAND + GAP)} width={(b - a + 1) * cw - 4} height={BAND} rx="2" />;
          })}
        </g>
      ))}
    </svg>
  );
}

export function Chart({ picture, intro, column = null, holeWords, onHole, onPlant, verdictOf }: ChartProps) {
  const [table, setTable] = useState(false);
  const id = useId();
  const p = column === null ? picture : columnOf(picture, column);
  const first = column ?? 0;
  return (
    <section class="ct-chart" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>{T(picture.title.slice('consortium.'.length))}</h3>
      <p class="ct-chart-intro">{intro}</p>
      <p><button type="button" class="button button-secondary ct-chart-toggle" aria-pressed={table} onClick={() => setTable(!table)}>{T('palette.showTable')}</button></p>
      {table ? <ChartTable p={p} holeWords={holeWords} /> : (
        <div class="ct-chart-body">
          <ol class="ct-chart-columns" aria-hidden="true">{p.columns.map((c, i) => <li key={i}>{say(c)}</li>)}</ol>
          <Drawing p={p} first={first} />
          <ul class="ct-chart-lanes">
            {p.rows.map((r) => {
              const ids = [...new Set(r.cells.flatMap((c) => c.ids))];
              const holes = [...new Set(r.cells.flatMap((c) => (c.hole ? [c.hole] : [])))];
              return (
                <li key={r.key} class="ct-chart-row" data-lane={r.key} data-state={r.state}>
                  <span class="ct-chart-head">{say(r.head)}</span>
                  {ids.map((pid) => { const v = verdictOf?.(pid); return <button key={pid} type="button" class="ct-chip" data-plant-id={pid} onClick={() => onPlant(pid)}>{p.names[pid] ?? pid}{v && (v.level === 'outside' || v.level === 'look') && <> <FitLine v={v} /></>}</button>; })}
                  {r.more && <button type="button" class="ct-chip ct-chip-more" onClick={() => setTable(true)}>{say(r.more.line)}</button>}
                  {holes.map((h) => <button key={h} type="button" class="ct-hole-button" data-hole={h} onClick={() => onHole(h)}>{holeWords(h, r.head)}</button>)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function ChartTable({ p, holeWords }: { p: Picture; holeWords: ChartProps['holeWords'] }) {
  const t = tableOf(p);
  const cols = t.columns.map(say);
  return (
    <table class="ct-chart-table">
      <caption>{sayAll(t.summary)}</caption>
      <thead><tr><td />{cols.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
      <tbody>
        {t.rows.map((r) => (
          <tr key={r.key} data-state={r.state}>
            <th scope="row">{say(r.head)}</th>
            {r.cells.map((c, i) => (
              <td key={i} data-col={cols[i]}>{c.names.length ? c.names.join(', ') : c.hole ? holeWords(c.hole, r.head) : c.judged ? T('palette.nobody') : T('palette.notJudged')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
