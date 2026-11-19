/** @jsxImportSource preact */
// Through the years (v14 boards Main, Palette, Many, ManyDesk; Toasts "How to read this"): who stands
// where as the plot grows up, by the light level each plant is planted in.
// - 40 plants or fewer on a laptop (Main): the grid, every time span at once, its key, and "Further
//   down this page" naming the sections that exist;
// - 40 plants or fewer on a phone (Palette): the stepper ("Years 1–3", group "Time span 3 of 7") and
//   that span's levels, each its plants or its hole;
// - past 40 plants at every width (Many, ManyDesk; the size rule A14): the stepper with "N of your M
//   plants stand then", each level a count cell, then who else would stand then.
// A member stands in a span when its years hold it and it is not outside its climate range (the light
// lanes' counts, holes.ts laneCounts). The stepper's span is the store's yearStep; each change is
// announced through the page's status region (changeSummary; P8); at either end its button stays
// focusable (aria-disabled), so the focus never falls to the page (review r1 bugs-7). The table form
// stays as the screen-reader form, visually hidden (Q8).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Flag, Hole, PhaseOrd, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { PHASE_YEARS } from '../../../../lib/consortium/index.ts';
import { changeSummary } from '../../rules/change-summary.ts';
import { columnOf, countingIds, type PictureRow } from '../../rules/picture.ts';
import { yearsPicture } from '../../rules/picture-years.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { CountCells, HowToRead, JobKey, Names, SIZE_PALETTE, SrTable, StepLevels, YearsGrid } from '../kit/chart.tsx';
import { say, sayAll } from '../kit/fit.tsx';

const PHONE = '(max-width: 639px)';
// Past 40 plants, the plants outside their range standing then are named in the sentence up to three
// (as "Cashew, outside its climate range, is toxic too"), else the count cell.
const FEW_OUTSIDE = 3;
function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof matchMedia === 'function' && matchMedia(PHONE).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(PHONE), on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

export interface PictureProps { members: readonly Taxon[]; holes: readonly Hole[]; holeWords: (id: string) => string; onHole: (id: string) => void; onPlant: (id: PlantId) => void; announce: (text: string) => void; verdictOf?: (id: PlantId) => PlantVerdict | undefined; flagsOf?: (id: PlantId) => readonly Flag[]; invasiveWord?: string }

// Moves the focus to a section of the page by its id (a link of "Further down this page"; the page's
// address holds the palette, so no hash is written).
const toSection = (id: string) => (e: Event) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  const h = el.querySelector<HTMLElement>('h3');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
};

// "How to read this" (Toasts board, C4, BC19): its five paragraphs, the light levels and time spans,
// the Jobs strip, the unknowns and the toxicity mark, the figures, the syntropic strata; the same panel
// under each picture's title.
export const ReadPictures = () => (
  <HowToRead>
    <p>{T('palette.readYears')}</p>
    <p>{T('palette.readJobs')}</p>
    <p>{T('palette.readUnknown')}</p>
    <p>{T('palette.chart.readTox', { slight: T('palette.warningsTox_slight'), moderate: T('palette.warningsTox_moderate'), severe: T('palette.warningsTox_severe') })}</p>
    <p>{T('palette.readFigures')}</p>
    <p>{T('palette.readSyntropic')}</p>
  </HowToRead>
);

export function Years({ members, holes, holeWords, onHole, onPlant, announce, verdictOf, flagsOf, invasiveWord, warnings }: PictureProps & { warnings?: number }) {
  // A member's list being read (store.listsLoading, whatever has failed): the counts read "Loading…"
  // (F26, c4 R1); once every list is read, a failed list's plants are said as not checked (h3 R1).
  const loading = store.listsLoading.value;
  const phone = usePhone();
  const big = members.length > SIZE_PALETTE;
  const at = store.yearStep.value;
  const counts = (t: Taxon) => verdictOf?.(t.id)?.level !== 'outside';
  const picture = useMemo(() => yearsPicture({ members, holes, nameOf, counts }), [members, holes, verdictOf]);
  const b = { holeWords, onHole, onPlant, verdictOf, flagsOf, invasiveWord };
  const last = PHASE_YEARS.length - 1;
  const was = useRef(at);
  const go = (to: number) => {
    const next = Math.min(last, Math.max(0, to)) as PhaseOrd;
    if (next === at) return;
    announce(sayAll(changeSummary(columnOf(picture, was.current), columnOf(picture, next))));
    was.current = next;
    store.yearStep.value = next;
  };
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  // A level's plants standing in the stepper's span that count (the picture's rows: those outside their
  // range left out, as laneCounts), and those outside their range standing then, said apart.
  const standing = (r: PictureRow): PlantId[] => countingIds(r, r.cells[at]);
  const stand = big ? picture.rows.reduce((n, r) => n + standing(r).length, 0) : 0;
  const outsideThen = big ? picture.rows.flatMap((r) => r.cells[at].ids.filter((id) => r.outside.includes(id))) : [];
  const outsideLine = <Names ids={outsideThen} name={(id) => { const t = byId.get(id); return t ? nameOf(t) : id; }} size={members.length} few={FEW_OUTSIDE} text={(names) => P('palette.chart.othersOutside', outsideThen.length, { names })} lead={<p>{P('palette.chart.othersOutsideMany', outsideThen.length)}</p>} />;
  const stepper = (
    <div class="ct-stepper">
      <button type="button" class="button button-secondary ct-step-btn" data-dir="back" aria-disabled={at === 0 ? 'true' : undefined} onClick={() => go(at - 1)}><span class="visually-hidden">{T('palette.earlier')}</span></button>
      <div class="ct-stepper-at" role="group" aria-label={T('palette.chart.span', { n: at + 1, m: PHASE_YEARS.length })}>
        <strong>{say(picture.columns[at])}</strong>
        {big ? <span class="ct-stepper-note">{loading ? T('details.loading') : P('palette.chart.standing', stand, { m: members.length })}</span>
          : <span class="ct-stepper-dots" aria-hidden="true">{PHASE_YEARS.map((_, i) => <span key={i} data-on={i === at ? '' : undefined} />)}</span>}
      </div>
      <button type="button" class="button button-secondary ct-step-btn" data-dir="next" aria-disabled={at === last ? 'true' : undefined} onClick={() => go(at + 1)}><span class="visually-hidden">{T('palette.later')}</span></button>
    </div>
  );
  return (
    <section class="ct-chart ct-years" id="ct-years" aria-labelledby="ct-years-h" data-mode={big ? 'cells' : phone ? 'step' : 'grid'}>
      <h3 id="ct-years-h">{T('palette.yearsTitle')}</h3>
      <ReadPictures />
      <p class="ct-chart-intro">{T(big ? 'palette.yearsIntroMany' : phone ? 'palette.yearsIntroPhone' : 'palette.yearsIntro')}</p>
      {big ? (
        <>
          {stepper}
          <CountCells p={picture} column={at} size={members.length} standing={standing} b={b} loading={loading} />
          {/* Those outside their range standing then: a handful named in the others paragraph, in the
              board's sentence (c2 C2: "1 more plant … (Cashew): not counted here…"); more, the count cell. */}
          {outsideThen.length <= FEW_OUTSIDE
            ? <p class="ct-chart-note">{T('palette.chart.others')}{outsideThen.length > 0 && <> {outsideLine}</>}</p>
            : <><p class="ct-chart-note">{T('palette.chart.others')}</p><div class="ct-chart-note">{outsideLine}</div></>}
        </>
      ) : phone ? (
        <>
          {stepper}
          <StepLevels p={picture} column={at} b={b} size={members.length} />
        </>
      ) : (
        <>
          <YearsGrid p={picture} b={b} size={members.length} />
          <JobKey p={picture} />
          <p class="ct-further">{T('palette.chart.further')} <a href="#ct-jobs" onClick={toSection('ct-jobs')}>{T('palette.jobsTitle')}</a>{warnings ? <> · <a href="#ct-warnings" onClick={toSection('ct-warnings')}>{T('palette.chart.warningsLink', { n: warnings })}</a></> : null}</p>
        </>
      )}
      <SrTable p={picture} holeWords={holeWords} />
    </section>
  );
}
