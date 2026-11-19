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
// thin lines read the same counts as the Next step's thin spots. Each row's figure and names are its
// members that count (the lane's own `counted`, M25: one rule, not outside their climate range);
// those outside their range (the lane's `outside`) are named apart, never counted (c2 R1).
import { useMemo, useState } from 'preact/hooks';
import type { Hole, JobId, LaneCount, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { holeLine, jobIds, jobsOf, noneFits, PHASE_YEARS, PLANTS_PER_JOB, targetPosition, thinLine, uncheckedLine } from '../../../../lib/consortium/index.ts';
import { stripStates, type StripState } from '../../rules/picture.ts';
import { holeFillerParts, holeFillers } from '../rows.tsx';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { HoleButton, HoleTitle, Names, SIZE_PALETTE, type PlantButtons } from '../kit/chart.tsx';
import { JobIcon, say } from '../kit/fit.tsx';
import { ReadPictures, type PictureProps } from './Years.tsx';

const cap = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1);

// The goal's buttons: the core's choices (site-inputs.ts PLANTS_PER_JOB), one row of four 44 px
// buttons, the label above them on a narrow phone (BC2).
// D1 (pf-decisions 2026-11-18): at 960 px and wider the 1/2/3/5 control always shows (board ManyDesk);
// below, the intro's "Plants per job: 2" is a link (board MainMore) that opens it in place (`folded`).
const GOAL_ID = 'ct-goal';
function Goal({ folded }: { folded: boolean }) {
  const goal = store.plantsPerJob.value;
  return (
    <div class="ct-goal" id={GOAL_ID} role="group" aria-label={T('palette.goalLabel')} data-folded={folded ? '' : undefined}>
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

type NameOf = (id: PlantId) => string;
const byName = (members: readonly Taxon[]): NameOf => { const m = new Map(members.map((t) => [t.id, nameOf(t)])); return (id) => m.get(id) ?? id; };

// The job's members outside their climate range, apart: "2 more do this but are outside their climate
// range (Cashew, Coconut): not counted here." beside a counted figure; with none counted (no figure in
// the head), "1 plant does this but is outside its climate range (Mango): not counted here." (c2 B3:
// "more" never refers to nothing). Up to three named in the sentence past 40 plants, as the years'
// line; else the count cell.
const Outside = ({ ids, counted, name, size }: { ids: readonly PlantId[]; counted: number; name: NameOf; size: number }) => {
  if (!ids.length) return null;
  const n = ids.length, more = counted > 0;
  const text = (names: string) => <p>{more ? P('palette.jobOutside', n, { names }) : P('palette.chart.jobOutsideOnly', n, { names })}</p>;
  return <div class="ct-job-outside"><Names ids={ids} name={name} size={size} few={3} text={text} lead={<p>{more ? P('palette.jobOutsideMany', n) : P('palette.chart.jobOutsideOnlyMany', n)}</p>} /></div>;
};

// A thin line, its lead in bold ("**Thin:** 1 plant only from year 15 to year 60. Add a backup."; BC24).
const ThinLine = ({ words }: { words: string }) => <p class="ct-job-thin"><HoleTitle words={words} /></p>;

function JobRow({ j, lane, name, size, holes, states, showThin, b, loading }: { j: JobId; lane: LaneCount; name: NameOf; size: number; holes: Hole[]; states: StripState[] | null; showThin: boolean; b: PlantButtons; loading: boolean }) {
  const n = lane.counted.length;
  return (
    <li class="ct-job" data-job={j}>
      <p class="ct-job-head"><span class="ct-job-tile" aria-hidden="true"><JobIcon job={j} /></span><span class="ct-job-title"><strong>{T(`job.${j}`)}</strong>{loading ? <> <span class="ct-grid-count">{T('details.loading')}</span></> : n > 0 && <> <span class="ct-grid-count">{P('palette.chart.plants', n)}</span></>}</span></p>
      <div class="ct-job-body">
        {n > 0 && <div class="ct-job-names"><Names ids={lane.counted} name={name} size={size} group={T(`job.${j}`)} /></div>}
        <Outside ids={lane.outside} counted={n} name={name} size={size} />
        {states && <Strip states={states} />}
        {showThin && lane.thin.map((t) => <ThinLine key={`${t.fromYear}`} words={say(thinLine(t))} />)}
      </div>
      {holes.length > 0 && <div class="ct-job-holes">{holes.map((h) => <HoleButton key={h.id} id={h.id} b={b} find={T('palette.chart.findPlant')} />)}</div>}
    </li>
  );
}

// Past 40 plants: a row button opening the job's names (the count cell, 10 first, alphabetical) and its
// holes in words, each numbered as the Next step numbers it (holes.ts targetPosition; C8). Its count
// reads "Loading…" while a list is read (F26: never a partial count; JobRow too); a list that failed
// is not loading: the counted plants' count shows, its plants said as not checked (h3 R1).
function BigRow({ j, lane, name, holes, all, thins, size, members, loading }: { j: JobId; lane: LaneCount; members: readonly Taxon[]; name: NameOf; holes: Hole[]; all: readonly Hole[]; thins: readonly Hole[]; size: number; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const id = `ct-job-${j}`;
  // No figure when no plant counts (as JobRow; BC24 never "0 plants"): "Covers the ground · a hole".
  const n = lane.counted.length;
  return (
    <li class="ct-job" data-job={j}>
      <button type="button" class="ct-job-row" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <JobIcon job={j} /><strong>{T(`job.${j}`)}</strong>{loading ? <> <span class="ct-grid-count">{T('details.loading')}</span></>
          : (n > 0 || holes.length > 0) && <> <span class="ct-grid-count">{n > 0 && P('palette.chart.plants', n)}{holes.length > 0 && <>{n > 0 ? ' · ' : '· '}{T('palette.jobHoleMark')}</>}</span></>}
      </button>
      <div id={id} class="ct-job-open" hidden={!open}>
        {open && <Names ids={lane.counted} name={name} size={size} closed={10} group={T(`job.${j}`)} />}
        {open && <Outside ids={lane.outside} counted={n} name={name} size={size} />}
        {open && holes.map((h) => {
          const un = uncheckedLine(h), at = targetPosition(all, thins, h);
          // Board Many: "… · 7 plants not checked; no plant on your lists fits here and does this then; 5 do it but are outside their climate range." (holeFillers, the one count source).
          // With no fit, the Next step's clause order (rows.tsx holeEndWords): "no plant fits" only when
          // none is still to be checked (core noneFits; unknown is never a "no"), then those that need a
          // second look and those on lists not checked (holeFillerParts), then the outside ones.
          const f = holeFillers(h, members, all.filter((x) => x.state === 'open'));
          const tail = [...(f.fits.length ? [] : [noneFits(f) ? T('palette.jobHoleNoFit') : '', ...holeFillerParts(f)]), f.outside.length ? P('palette.jobHoleOutside', f.outside.length) : ''].filter(Boolean);
          return <p key={h.id} class="ct-job-thin"><HoleTitle words={T('palette.jobHoleNumber', { span: cap(say(holeLine(h))), i: at.index, n: at.of })} />{un && <> · {say(un)}</>}{tail.length > 0 && <>{un ? '; ' : ' · '}{tail.join('; ')}.</>}</p>;
        })}
      </div>
    </li>
  );
}

export function JobsPicture({ members, holes, holeWords, onHole, onPlant, verdictOf, flagsOf, invasiveWord, loading = false }: PictureProps) {
  const name = useMemo(() => byName(members), [members]);
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
  const laneOf = (j: JobId): LaneCount => lanes.find((l) => l.kind === 'job' && l.job === j) ?? { kind: 'job' as const, job: j, counts: PHASE_YEARS.map(() => 0), thin: [], counted: [], outside: [] };
  const jobHoles = (j: JobId) => open.filter((h) => h.kind === 'job' && h.job === j);
  // The plants whose jobs are not checked (the job lanes' unchecked), and the others with no job.
  const unchecked = new Set(lanes.filter((l) => l.kind === 'job').flatMap((l) => l.unchecked ?? []));
  const noJob = members.filter((t) => !jobsOf(t).length && !unchecked.has(t.id)).length;
  const held = goal === 2 ? P('palette.chart.plants', 1) : T('palette.goalFewer', { n: goal });
  const [goalOpen, setGoalOpen] = useState(false);
  const linked = !big && !pending;
  // The intro around its goal phrase: plain words at 960 px and wider, the link below (D1; CSS shows one).
  const goalWords = T('palette.goalLink', { n: goal });
  const [before, after = ''] = P('palette.jobsIntro', goal, { goal: '\u0000' }).split('\u0000');
  const intro = big ? T('palette.jobsIntroMany')
    : pending ? T('palette.holesPending')
    : <>{before}<span class="ct-goal-say">{goalWords}</span><button type="button" class="link-button ct-goal-link" aria-expanded={goalOpen} aria-controls={GOAL_ID} onClick={() => setGoalOpen(!goalOpen)}>{goalWords}</button>{after} {P('palette.goalHoles', open.length)}{goal > 1 && thin > 0 ? P('palette.goalThin', thin, { held }) : '.'}</>;
  return (
    <section class="ct-chart ct-jobs" id="ct-jobs" aria-labelledby="ct-jobs-h" data-mode={big ? 'rows' : 'strips'}>
      <div class="ct-jobs-top">
        <h3 id="ct-jobs-h">{T('palette.jobsTitle')}</h3>
        <ReadPictures />
        <p class="ct-chart-intro">{intro}</p>
        <Goal folded={linked && !goalOpen} />
        {big ? <p class="ct-jobs-legend">{T('palette.goalExplain', { n: goal })}</p> : <Legend goal={goal} />}
      </div>
      <ul class="ct-jobs-list">
        {jobIds.map((j) => {
          const lane = laneOf(j);
          return big
            ? <BigRow key={j} j={j} lane={lane} members={members} name={name} holes={jobHoles(j)} all={holes} thins={thins} size={members.length} loading={loading} />
            : <JobRow key={j} j={j} lane={lane} name={name} size={members.length} holes={jobHoles(j)} states={pending ? null : stripStates(lane, holes, thins)} showThin={showThin} b={b} loading={loading} />;
        })}
      </ul>
      {big && (
        <p class="ct-chart-note">{T('palette.jobsFoot')}{unchecked.size > 0 && <> <HoleTitle words={P('palette.jobsUnchecked', unchecked.size)} /></>}{noJob > 0 && <> {P('palette.jobsNoJob', noJob)}</>}</p>
      )}
    </section>
  );
}
