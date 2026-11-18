/** @jsxImportSource preact */
// Jobs (v14 boards MainMore, PaletteMore, Many, ManyDesk; F16): what the plants do for the plot, and for
// how long, against the palette goal ("Plants per job", store.plantsPerJob, 0W).
// - The control "Plants per job 1 2 3 5": 44 px buttons, the goal pressed (store.setPlantsPerJob).
// - 40 plants or fewer: the goal sentence (the open holes, then the thin spots), the legend, and each
//   job its plants by name, its strip over the seven time spans (2 or more: filled; fewer: thin, an
//   outline with one mark; nobody: a dashed hole; after year 60: a thin line), each thin spot in words
//   (verdict-line.ts thinLine; no button in any language, A20) and each job hole a button opening its
//   fillers.
// - Past 40 plants (the size rule, A14): each job a 44 px row button "<job> N plants · a hole" opening
//   its names (MoreList, 10 first) and its holes in words; the foot counts the plants whose jobs are not
//   checked (the union of the job lanes' unchecked) and those with no job that count for no hole.
// The figures are the light and job lanes of holes.ts laneCounts (store.lanes): the strips and the
// thin lines read the same counts as the Next step's thin spots.
import { useState } from 'preact/hooks';
import type { Hole, JobId, LaneCount, Taxon } from '../../../../lib/consortium/index.ts';
import { holeLine, jobIds, jobsOf, PHASE_YEARS, thinLine, uncheckedLine } from '../../../../lib/consortium/index.ts';
import { judgedColumn } from '../../rules/picture.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { commaList, HoleButton, type PlantButtons } from '../kit/chart.tsx';
import { JobIcon, say } from '../kit/fit.tsx';
import { MoreList } from '../kit/more.tsx';
import { SIZE_PALETTE, type PictureProps } from './Years.tsx';

export const GOALS = [1, 2, 3, 5] as const;
const cap = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1);

function Goal() {
  const goal = store.plantsPerJob.value;
  return (
    <div class="ct-goal" role="group" aria-label={T('palette.goalLabel')}>
      <span class="ct-goal-label" aria-hidden="true">{T('palette.goalLabel')}</span>
      {GOALS.map((n) => <button key={n} type="button" class="ct-goal-n" aria-pressed={n === goal} onClick={() => store.setPlantsPerJob(n)}>{n}</button>)}
    </div>
  );
}

// The legend: 2 or more plants (filled) · 1 plant between year 1 and year 60: thin · nobody: a hole.
function Legend({ goal }: { goal: number }) {
  return (
    <p class="ct-jobs-legend">
      <span class="ct-strip-cell" data-state="full" aria-hidden="true" /> {P('palette.goalLegendFull', goal)}
      {goal > 1 && <> · <span class="ct-strip-cell" data-state="thin" aria-hidden="true" /> {P('palette.goalLegendThin', goal - 1)}</>}
      {' · '}<span class="ct-strip-cell" data-state="hole" aria-hidden="true" /> {T('palette.goalLegendHole')}
    </p>
  );
}

// A job's strip over the seven time spans (decorative: its words are the thin lines and hole buttons).
function Strip({ lane, goal }: { lane: LaneCount; goal: number }) {
  return (
    <span class="ct-strip" aria-hidden="true">
      {PHASE_YEARS.map((_, i) => {
        const n = lane.counts[i] ?? 0;
        const state = !judgedColumn(i) && n === 0 ? 'line' : n >= goal ? 'full' : n > 0 ? 'thin' : judgedColumn(i) ? 'hole' : 'line';
        return <span key={i} class="ct-strip-cell" data-state={state} />;
      })}
    </span>
  );
}

const plantsOf = (members: readonly Taxon[], j: JobId) => members.filter((t) => jobsOf(t).includes(j));

function JobRow({ j, lane, members, holes, goal, b }: { j: JobId; lane: LaneCount; members: readonly Taxon[]; holes: Hole[]; goal: number; b: PlantButtons }) {
  const mine = plantsOf(members, j);
  return (
    <li class="ct-job" data-job={j}>
      <p class="ct-job-head"><span class="ct-job-tile" aria-hidden="true"><JobIcon job={j} /></span><span class="ct-job-title"><strong>{T(`job.${j}`)}</strong> <span class="ct-grid-count">{P('palette.chart.plants', mine.length)}</span></span></p>
      <div class="ct-job-body">
        {mine.length > 0 && <p class="ct-job-names">{commaList(mine.map(nameOf))}</p>}
        <Strip lane={lane} goal={goal} />
        {lane.thin.map((t) => <p key={`${t.fromYear}`} class="ct-job-thin">{say(thinLine(t))}</p>)}
      </div>
      {holes.length > 0 && <div class="ct-job-holes">{holes.map((h) => <HoleButton key={h.id} id={h.id} b={b} find={T('palette.chart.findPlant')} />)}</div>}
    </li>
  );
}

// Past 40 plants: a row button opening the job's names and its holes in words.
function BigRow({ j, members, holes, all, size }: { j: JobId; members: readonly Taxon[]; holes: Hole[]; all: Hole[]; size: number }) {
  const [open, setOpen] = useState(false);
  const mine = plantsOf(members, j);
  const id = `ct-job-${j}`;
  return (
    <li class="ct-job" data-job={j}>
      <button type="button" class="ct-job-row" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <JobIcon job={j} /><strong>{T(`job.${j}`)}</strong> <span class="ct-grid-count">{P('palette.chart.plants', mine.length)}{holes.length > 0 && <> · {T('palette.jobHoleMark')}</>}</span>
      </button>
      <div id={id} class="ct-job-open" hidden={!open}>
        {open && mine.length > 0 && <MoreList items={mine} keyOf={(t) => t.id} paletteSize={size} closed={10} render={(t) => nameOf(t)} class="ct-cell-names" />}
        {open && holes.map((h) => {
          const un = uncheckedLine(h);
          return <p key={h.id} class="ct-job-thin">{T('palette.jobHoleNumber', { span: cap(say(holeLine(h))), i: all.indexOf(h) + 1, n: all.length })}{un && <> · {say(un)}</>}</p>;
        })}
      </div>
    </li>
  );
}

export function JobsPicture({ members, holes, holeWords, onHole, onPlant, verdictOf }: PictureProps) {
  const goal = store.plantsPerJob.value;
  const lanes = store.lanes.value;
  const open = holes.filter((h) => h.state === 'open');
  const thin = store.thinSpots.value.length;
  const big = members.length > SIZE_PALETTE;
  const b = { holeWords, onHole, onPlant, verdictOf };
  const laneOf = (j: JobId) => lanes.find((l) => l.kind === 'job' && l.job === j) ?? { kind: 'job' as const, job: j, counts: PHASE_YEARS.map(() => 0), thin: [] };
  const jobHoles = (j: JobId) => open.filter((h) => h.kind === 'job' && h.job === j);
  // The plants whose jobs are not checked (the job lanes' unchecked), and the others with no job.
  const unchecked = new Set(lanes.filter((l) => l.kind === 'job').flatMap((l) => l.unchecked ?? []));
  const noJob = members.filter((t) => !jobsOf(t).length && !unchecked.has(t.id)).length;
  return (
    <section class="ct-chart ct-jobs" id="ct-jobs" aria-labelledby="ct-jobs-h" data-mode={big ? 'rows' : 'strips'}>
      <div class="ct-jobs-top">
        <h3 id="ct-jobs-h">{T('palette.jobsTitle')}</h3>
        <p class="ct-chart-intro">{big ? T('palette.jobsIntroMany') : <>{T('palette.jobsIntro', { n: goal })} {P('palette.goalHoles', open.length)}{goal > 1 ? P('palette.goalThin', thin, { held: goal === 2 ? P('palette.chart.plants', 1) : T('palette.goalFewer', { n: goal }) }) : '.'}</>}</p>
        <Goal />
        {big ? <p class="ct-jobs-legend">{T('palette.goalExplain', { n: goal })}</p> : <Legend goal={goal} />}
      </div>
      <ul class="ct-jobs-list">
        {jobIds.map((j) => (big
          ? <BigRow key={j} j={j} members={members} holes={jobHoles(j)} all={open} size={members.length} />
          : <JobRow key={j} j={j} lane={laneOf(j)} members={members} holes={jobHoles(j)} goal={goal} b={b} />))}
      </ul>
      {big && (
        <p class="ct-chart-note">{T('palette.jobsFoot')}{unchecked.size > 0 && <> {P('palette.jobsUnchecked', unchecked.size)}</>}{noJob > 0 && <> {P('palette.jobsNoJob', noJob)}</>}</p>
      )}
    </section>
  );
}
