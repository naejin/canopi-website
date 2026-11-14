/** @jsxImportSource preact */
// Through the years (boards Main, Palette): who stands where as the plot grows up, by light level.
// On a phone, one time step at a time with a stepper (PP-B7); the step chosen is the store's yearStep,
// which print's side drawing reads (PP-B18). Each step change is announced in words through the
// page's polite status region (changeSummary; P8).
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
      {phone && (
        <div class="ct-stepper" role="group" aria-label={T('palette.stepperLabel')}>
          <button type="button" class="button button-secondary" disabled={at === 0} onClick={() => go(at - 1)}>{T('palette.earlier')}</button>
          <span class="ct-stepper-at">{say(picture.columns[at])}</span>
          <button type="button" class="button button-secondary" disabled={at === last} onClick={() => go(at + 1)}>{T('palette.later')}</button>
        </div>
      )}
      <Chart picture={picture} intro={T('palette.yearsIntro')} column={phone ? at : null} holeWords={holeWords} onHole={onHole} onPlant={onPlant} verdictOf={verdictOf} />
    </div>
  );
}
