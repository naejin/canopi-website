/** @jsxImportSource preact */
// Through the years (boards Main, Palette): who stands where as the plot grows up, by light level.
// The stepper chooses a time step, the store's yearStep, which print's side drawing reads (PP-B18): on a
// phone the picture shows that step only (PP-B7); on a laptop it shows every step, the chosen one
// marked, and the stepper says it is the step printed (review r1 bugs-11). Each step change is announced
// in words through the page's polite status region (changeSummary; P8). At either end the button stays
// focusable (aria-disabled), so the keyboard focus never falls to the page (review r1 bugs-7).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Hole, PhaseOrd, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { PHASE_YEARS } from '../../../../lib/consortium/index.ts';
import { changeSummary } from '../../rules/change-summary.ts';
import { columnOf } from '../../rules/picture.ts';
import { yearsPicture } from '../../rules/picture-years.ts';
import * as store from '../../store.ts';
import { nameOf, T } from '../../strings.ts';
import { Chart } from '../kit/chart.tsx';
import { say, sayAll } from '../kit/fit.tsx';

const PHONE = '(max-width: 639px)';
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

export interface PictureProps { members: readonly Taxon[]; holes: readonly Hole[]; holeWords: (id: string) => string; onHole: (id: string) => void; onPlant: (id: PlantId) => void; announce: (text: string) => void; verdictOf?: (id: PlantId) => PlantVerdict | undefined }

export function Years({ members, holes, holeWords, onHole, onPlant, announce, verdictOf }: PictureProps) {
  const phone = usePhone();
  const at = store.yearStep.value;
  const picture = useMemo(() => yearsPicture({ members, holes, nameOf }), [members, holes]);
  const last = PHASE_YEARS.length - 1;
  const was = useRef(at);
  const go = (to: number) => {
    const next = Math.min(last, Math.max(0, to)) as PhaseOrd;
    if (next === at) return;
    announce(sayAll(changeSummary(columnOf(picture, was.current), columnOf(picture, next))));
    was.current = next;
    store.yearStep.value = next;
  };
  return (
    <div class="ct-years" data-phone={phone ? '' : undefined}>
      <div class="ct-stepper" role="group" aria-label={T('palette.stepperLabel')}>
        <button type="button" class="button button-secondary" aria-disabled={at === 0 ? 'true' : undefined} onClick={() => go(at - 1)}>{T('palette.earlier')}</button>
        <span class="ct-stepper-at">{say(picture.columns[at])}</span>
        <button type="button" class="button button-secondary" aria-disabled={at === last ? 'true' : undefined} onClick={() => go(at + 1)}>{T('palette.later')}</button>
        {!phone && <span class="ct-stepper-note">{T('palette.stepPrinted')}</span>}
      </div>
      <Chart picture={picture} intro={T('palette.yearsIntro')} column={phone ? at : null} marked={phone ? null : at} holeWords={holeWords} onHole={onHole} onPlant={onPlant} verdictOf={verdictOf} chipJobs />
    </div>
  );
}
