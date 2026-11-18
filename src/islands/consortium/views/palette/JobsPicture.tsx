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
import { holeLine, jobIds, jobsOf, PHASE_YEARS, PLANTS_PER_JOB, targetPosition, thinLine, uncheckedLine } from '../../../../lib/consortium/index.ts';
import { stripStates, type StripState } from '../../rules/picture.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { HoleButton, HoleTitle, Names, SIZE_PALETTE, type PlantButtons } from '../kit/chart.tsx';
import { JobIcon, say } from '../kit/fit.tsx';
import { ReadPictures, type PictureProps } from './Years.tsx';

const cap = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1);

// The goal's buttons: the core's choices (site-inputs.ts PLANTS_PER_JOB), one row of four 44 px
// buttons, the label above them on a narrow phone (BC2).
function Goal() {
  const goal = store.plantsPerJob.value;
  return (
    <div class="ct-goal" role="group" aria-label={T('palette.goalLabel')}>
      <span class="ct-goal-label" aria-hidden="true">{T('palette.goalLabel')}</span>
      <span class="ct-goal-ns">{PLANTS_PER_JOB.map((n) => <button key={n} type="button" class="ct-goal-n" aria-pressed={n === goal} onClick={() => store.setPlantsPerJob(n)}>{n}</button>)}</span>
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

// A job's strip over the seven time spans (decorative: its words are the thin lines and hole buttons),
// its states from the engine's targets (rules/picture.ts stripStates; R1, R9, BC9): a hole only inside
// an open job hole, thin only inside an open thin spot. While a list loads there is no strip (round 2
// R4: no shape the legend explains stands for "not known yet"); the intro says the holes are checked.
function Strip({ states }: { states: StripState[] }) {
  return <span class="ct-strip" aria-hidden="true">{states.map((st, i) => <span key={i} class="ct-strip-cell" data-state={st} />)}</span>;
}

const plantsOf = (members: readonly Taxon[], j: JobId) => members.filter((t) => jobsOf(t).includes(j));
const byName = (members: readonly Taxon[]) => { const m = new Map(members.map((t) => [t.id, nameOf(t)])); return (id: string) => m.get(id) ?? id; };

// A thin line, its lead in bold ("**Thin:** 1 plant only from year 15 to year 60. Add a backup."; BC24).
const ThinLine = ({ words }: { words: string }) => <p class="ct-job-thin"><HoleTitle words={words} /></p>;

function JobRow({ j, lane, members, holes, states, showThin, b }: { j: JobId; lane: LaneCount; members: readonly Taxon[]; holes: Hole[]; states: StripState[] | null; showThin: boolean; b: PlantButtons }) {
  const mine = plantsOf(members, j);
  return (
    <li class="ct-job" data-job={j}>
      <p class="ct-job-head"><span class="ct-job-tile" aria-hidden="true"><JobIcon job={j} /></span><span class="ct-job-title"><strong>{T(`job.${j}`)}</strong>{mine.length > 0 && <> <span class="ct-grid-count">{P('palette.chart.plants', mine.length)}</span></>}</span></p>
      <div class="ct-job-body">
        {mine.length > 0 && <div class="ct-job-names"><Names ids={mine.map((t) => t.id)} name={byName(members)} size={members.length} /></div>}
        {states && <Strip states={states} />}
        {showThin && lane.thin.map((t) => <ThinLine key={`${t.fromYear}`} words={say(thinLine(t))} />)}
      </div>
      {holes.length > 0 && <div class="ct-job-holes">{holes.map((h) => <HoleButton key={h.id} id={h.id} b={b} find={T('palette.chart.findPlant')} />)}</div>}
    </li>
  );
}

// Past 40 plants: a row button opening the job's names (the count cell, 10 first, alphabetical) and its
// holes in words, each numbered as the Next step numbers it (holes.ts targetPosition; C8).
function BigRow({ j, members, holes, all, thins, size }: { j: JobId; members: readonly Taxon[]; holes: Hole[]; all: readonly Hole[]; thins: readonly Hole[]; size: number }) {
  const [open, setOpen] = useState(false);
  const mine = plantsOf(members, j);
  const id = `ct-job-${j}`;
  return (
    <li class="ct-job" data-job={j}>
      <button type="button" class="ct-job-row" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <JobIcon job={j} /><strong>{T(`job.${j}`)}</strong> <span class="ct-grid-count">{P('palette.chart.plants', mine.length)}{holes.length > 0 && <> · {T('palette.jobHoleMark')}</>}</span>
      </button>
      <div id={id} class="ct-job-open" hidden={!open}>
        {open && <Names ids={mine.map((t) => t.id)} name={byName(members)} size={size} closed={10} />}
        {open && holes.map((h) => {
          const un = uncheckedLine(h), at = targetPosition(all, thins, h);
          return <p key={h.id} class="ct-job-thin"><HoleTitle words={T('palette.jobHoleNumber', { span: cap(say(holeLine(h))), i: at.index, n: at.of })} />{un && <> · {say(un)}</>}</p>;
        })}
      </div>
    </li>
  );
}

export function JobsPicture({ members, holes, holeWords, onHole, onPlant, verdictOf, flagsOf, invasiveWord }: PictureProps) {
  const goal = store.plantsPerJob.value;
  const lanes = store.lanes.value;
  const pending = store.holesPending.value;
  const open = holes.filter((h) => h.state === 'open');
  const thins = store.thinSpots.value;
  const thin = thins.filter((h) => h.state === 'open').length;
  const big = members.length > SIZE_PALETTE;
  // Thin spots in words only once the palette is the grower's own (A19, C2) and every list is read (R1).
  const showThin = !pending && !store.untouchedSuggestion.value;
  const b = { holeWords, onHole, onPlant, verdictOf, flagsOf, invasiveWord };
  const laneOf = (j: JobId): LaneCount => lanes.find((l) => l.kind === 'job' && l.job === j) ?? { kind: 'job' as const, job: j, counts: PHASE_YEARS.map(() => 0), thin: [] };
  const jobHoles = (j: JobId) => open.filter((h) => h.kind === 'job' && h.job === j);
  // The plants whose jobs are not checked (the job lanes' unchecked), and the others with no job.
  const unchecked = new Set(lanes.filter((l) => l.kind === 'job').flatMap((l) => l.unchecked ?? []));
  const noJob = members.filter((t) => !jobsOf(t).length && !unchecked.has(t.id)).length;
  const held = goal === 2 ? P('palette.chart.plants', 1) : T('palette.goalFewer', { n: goal });
  const intro = big ? T('palette.jobsIntroMany')
    : pending ? T('palette.holesPending')
    : <>{P('palette.jobsIntro', goal)} {P('palette.goalHoles', open.length)}{goal > 1 && thin > 0 ? P('palette.goalThin', thin, { held }) : '.'}</>;
  return (
    <section class="ct-chart ct-jobs" id="ct-jobs" aria-labelledby="ct-jobs-h" data-mode={big ? 'rows' : 'strips'}>
      <div class="ct-jobs-top">
        <h3 id="ct-jobs-h">{T('palette.jobsTitle')}</h3>
        <ReadPictures />
        <p class="ct-chart-intro">{intro}</p>
        <Goal />
        {big ? <p class="ct-jobs-legend">{T('palette.goalExplain', { n: goal })}</p> : <Legend goal={goal} />}
      </div>
      <ul class="ct-jobs-list">
        {jobIds.map((j) => (big
          ? <BigRow key={j} j={j} members={members} holes={jobHoles(j)} all={holes} thins={thins} size={members.length} />
          : <JobRow key={j} j={j} lane={laneOf(j)} members={members} holes={jobHoles(j)} states={pending ? null : stripStates(laneOf(j), holes, thins)} showThin={showThin} b={b} />))}
      </ul>
      {big && (
        <p class="ct-chart-note">{T('palette.jobsFoot')}{unchecked.size > 0 && <> <HoleTitle words={P('palette.jobsUnchecked', unchecked.size)} /></>}{noJob > 0 && <> {P('palette.jobsNoJob', noJob)}</>}</p>
      )}
    </section>
  );
}
