/** @jsxImportSource preact */
// One picture on the page (plant-palette-architecture 3.4): the drawing (an SVG, role img, named by the
// picture's summary, with nothing focusable inside), its key (each main job's colour, icon and word,
// for the jobs the drawing shows), its lanes in HTML (each plant a button opening Details, with its
// main job's icon and word, each empty place a button opening its fillers, "+ n more" opening the
// table), and "Show as a table", the same cells as a table (rules/picture.ts tableOf; P17). Colours from
// the token block only (palette-page.css): a band carries its job colour and the lane its light level
// as a filled swatch with its outline, always with the words beside them (colour never alone).
// Memoised on its props: a re-render of the page with the same picture redraws nothing (perf, 200 plants).
import { Fragment } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { JobId, PlantId, PlantVerdict, Stratum } from '../../../../lib/consortium/index.ts';
import { fitLine, jobIds, phaseOfYear, strata } from '../../../../lib/consortium/index.ts';
import { columnOf, tableOf, type Picture } from '../../rules/picture.ts';
import { T } from '../../strings.ts';
import { FitLine, JobIcon, jobWord, say, sayAll } from './fit.tsx';
import { LightIcon } from './icons.tsx';

export interface ChartProps {
  picture: Picture;
  intro: string;
  column?: number | null; // one time step only (the phone's stepper)
  marked?: number | null; // the time step chosen (a laptop's stepper), marked among the others
  holeWords: (holeId: string) => string; // a hole button's name
  onHole: (holeId: string) => void;
  onPlant: (id: PlantId) => void;
  // A member's verdict: one outside its range or needing a second look says so on its chip, in words
  // with an icon (inform, don't block; owner 2026-11-14).
  verdictOf?: (id: PlantId) => PlantVerdict | undefined;
  // Each chip shows its main job's icon (Through the years, whose lanes are light levels); the jobs
  // picture's lanes are jobs, so its chips name the job in their accessible name only.
  chipJobs?: boolean;
}

const W = 700, BAND = 10, GAP = 4, LANE_PAD = 8, SWATCH = 8;

function Drawing({ p, first }: { p: Picture; first: number }) {
  const cols = p.columns.length, cw = (W - SWATCH) / cols;
  let y = 0;
  const lanes = p.rows.map((r) => {
    const h = Math.max(1, r.marks.length) * (BAND + GAP) + LANE_PAD * 2, top = y;
    y += h;
    return { r, top, h };
  });
  return (
    <svg class="ct-chart-svg" role="img" aria-label={sayAll(p.summary)} viewBox={`0 0 ${W} ${Math.max(y, 1)}`} preserveAspectRatio="none">
      {/* Flat, no group per lane (200-plant scale: few elements); a light lane's level as its swatch. */}
      {lanes.map(({ r, top, h }) => (
        <Fragment key={r.key}>
          <rect class="ct-chart-lane" data-lane={r.key} x="0" y={top} width={W} height={h} />
          {!(jobIds as readonly string[]).includes(r.key) && <rect class="ct-chart-swatch" data-lane={r.key} x="0.5" y={top + 0.5} width={SWATCH - 1} height={h - 1} />}
          {r.cells.map((c, i) => (!c.judged ? <line key={`j${i}`} class="ct-chart-unjudged" x1={SWATCH + i * cw} x2={SWATCH + (i + 1) * cw} y1={top + h / 2} y2={top + h / 2} />
            : c.hole ? <rect key={`h${i}`} class="ct-chart-hole" x={SWATCH + i * cw + 2} y={top + 2} width={cw - 4} height={h - 4} /> : null))}
          {r.marks.map((m, i) => {
            const a = Math.max(phaseOfYear(m.from) - first, 0), b = Math.min(phaseOfYear(m.to, true) - first, cols - 1);
            return b < a ? null : <rect key={m.id} class="ct-chart-band" data-job={m.job ?? 'none'} x={SWATCH + a * cw + 2} y={top + LANE_PAD + i * (BAND + GAP)} width={(b - a + 1) * cw - 4} height={BAND} rx="2" />;
          })}
        </Fragment>
      ))}
    </svg>
  );
}

// The drawing's key (board Main): "Colour and icon show each plant's main job:", then each job the
// drawing shows, in jobIds order, with its icon and word (and "No job recorded" when a band has none).
// Only where the chips show job icons: the jobs picture's lanes are the jobs, each head its icon and word.
function JobKey({ p }: { p: Picture }) {
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

function ChartView({ picture, intro, column = null, marked = null, holeWords, onHole, onPlant, verdictOf, chipJobs = false }: ChartProps) {
  // 'more': opened from a lane's "+ n more", so the table's caption takes the focus (the chip is gone).
  const [table, setTable] = useState<false | true | 'more'>(false);
  const id = useId();
  const p = column === null ? picture : columnOf(picture, column);
  const first = column ?? 0;
  return (
    <section class="ct-chart" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>{T(picture.title.slice('consortium.'.length))}</h3>
      <p class="ct-chart-intro">{intro}</p>
      <p><button type="button" class="button button-secondary ct-chart-toggle" aria-pressed={!!table} onClick={() => setTable(table ? false : true)}>{T('palette.showTable')}</button></p>
      {table ? <ChartTable p={p} holeWords={holeWords} focus={table === 'more'} /> : (
        <div class="ct-chart-body">
          <ol class="ct-chart-columns" aria-hidden="true">{p.columns.map((c, i) => <li key={i} data-at={i === marked ? '' : undefined}>{say(c)}</li>)}</ol>
          <Drawing p={p} first={first} />
          {chipJobs && <JobKey p={p} />}
          <ul class="ct-chart-lanes">
            {p.rows.map((r) => {
              const ids = [...new Set(r.cells.flatMap((c) => c.ids))];
              const holes = [...new Set(r.cells.flatMap((c) => (c.hole ? [c.hole] : [])))];
              return (
                <li key={r.key} class="ct-chart-row" data-lane={r.key} data-state={r.state}>
                  <span class="ct-chart-head">{(jobIds as readonly string[]).includes(r.key) ? <JobIcon job={r.key as JobId} /> : (strata as readonly string[]).includes(r.key) ? <LightIcon stratum={r.key as Stratum} /> : <span class="ct-light-swatch" data-lane={r.key} aria-hidden="true" />}{say(r.head)}</span>
                  {ids.map((pid) => {
                    const v = verdictOf?.(pid), job = p.jobs[pid] ?? null, warn = !!v && (v.level === 'outside' || v.level === 'look');
                    // Its name read as one phrase: the plant, its main job, its fit when it warns.
                    const label = [p.names[pid] ?? pid, jobWord(job), ...(warn && v ? [say(fitLine(v))] : [])].join(', ');
                    return (
                      <button key={pid} type="button" class="ct-chip" data-plant-id={pid} aria-label={label} onClick={() => onPlant(pid)}>
                        {chipJobs && <JobIcon job={job} />}{p.names[pid] ?? pid}
                        {warn && <> <FitLine v={v} /></>}
                      </button>
                    );
                  })}
                  {holes.map((h) => <button key={h} type="button" class="ct-hole-button" data-hole={h} onClick={() => onHole(h)}>{holeWords(h)}</button>)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
export const Chart = memo(ChartView);

function ChartTable({ p, holeWords, focus }: { p: Picture; holeWords: ChartProps['holeWords']; focus: boolean }) {
  const t = tableOf(p);
  const cols = t.columns.map(say);
  const caption = useRef<HTMLTableCaptionElement>(null);
  useEffect(() => { if (focus) caption.current?.focus(); }, []);
  return (
    <table class="ct-chart-table">
      <caption ref={caption} tabIndex={-1}>{sayAll(t.summary)}</caption>
      <thead><tr><td />{cols.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
      <tbody>
        {t.rows.map((r) => (
          <tr key={r.key} data-state={r.state}>
            <th scope="row">{say(r.head)}</th>
            {r.cells.map((c, i) => (
              <td key={i} data-col={cols[i]}>{c.names.length ? c.names.join(', ') : c.hole ? holeWords(c.hole) : c.judged ? T('palette.nobody') : T('palette.notJudged')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
