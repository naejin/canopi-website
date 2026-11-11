/** @jsxImportSource preact */
// The stage stepper (mockup 02/03 phone, NOTES "Phone pattern"; owner-facing row "v2 mockup choices"
// 2026-11-11): ‹ › buttons named "Earlier stage" / "Later stage" around the chosen stage's words,
// announced through aria-live, in a group named "Stage". It reads and sets store.stage, which the
// phone matrix, the side view and the print sheet share, so the side view shows the stage being read.
// The stepper opens on the first stage (stage starts at 0) and keeps the chosen one: store.stage is
// part of the share state (ShareState.stage), which S4's link and on-device memory restore.
//
// `phone` is the site's phone breakpoint (max-width 639px) as a signal, so the matrix renders either
// the desktop table or the phone grid, never both (one table in the accessibility tree).
import { signal } from '@preact/signals';
import { stage } from '../store.ts';
import { T } from '../strings.ts';
import { stepStage } from './tracks.ts';
import { ChevronIcon, phasePlain, phaseTerm } from './StageBar.tsx';

const query = typeof matchMedia === 'function' ? matchMedia('(max-width: 639px)') : null;
export const phone = signal<boolean>(query?.matches ?? false);
query?.addEventListener('change', (e) => { phone.value = e.matches; });

export function StageStepper({ id }: { id?: string }) {
  const s = stage.value;
  return (
    <div class="ct-stepper" role="group" aria-label={T('phase.stage')} id={id}>
      <button type="button" class="ct-stepbtn" aria-label={T('phase.earlier')} disabled={s === 0} onClick={() => { stage.value = stepStage(s, -1); }}><ChevronIcon dir="left" /></button>
      <div class="ct-step-now" aria-live="polite" aria-atomic="true">
        <strong>{phasePlain(s)}</strong>
        <span>{phaseTerm(s)} · {T('phase.stepOf', { i: s + 1 })}</span>
      </div>
      <button type="button" class="ct-stepbtn" aria-label={T('phase.later')} disabled={s === 6} onClick={() => { stage.value = stepStage(s, 1); }}><ChevronIcon dir="right" /></button>
    </div>
  );
}
