/** @jsxImportSource preact */
// The palette page (plant-palette-slices row b2; boards Main, Palette, MainMore, DeskStates): the
// header steps (Your place, Your palette, Planting plan), the Next step, Through the years and the
// jobs, in its own chunk (role `palette`, App.tsx lazyPart). Verdicts come from the core's verdict
// engine (store.memberVerdicts) and holes from holes.ts, computed here, never in the store. Honest
// states: holes "checking" while a list loads, a guest list that failed named as missing with its
// plants not checked (PP-B21), the verdict chunk refused said once with Reload (PP-B20).
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { PlantId } from '../../../../lib/consortium/index.ts';
import { holes as holesOf } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { changeSite } from '../../state/draft.ts';
import { P, T } from '../../strings.ts';
import { listName } from '../kit/names.ts';
import { JobsPicture } from './JobsPicture.tsx';
import { holeWords, NextStep, openFillers } from './NextStep.tsx';
import { Years } from './Years.tsx';

export function Palette() {
  const members = store.memberTaxa.value;
  const verdicts = store.memberVerdicts.value;
  const missing = store.missingMembers.value;
  const pending = store.guestsPending.value.length > 0 || missing.loading.length > 0;
  const holes = useMemo(() => holesOf({ members, verdicts, pending }), [members, verdicts, pending]);
  const [said, setSaid] = useState('');
  useEffect(() => { store.wantVerdict(); }, []);
  const byId = new Map(holes.map((h) => [h.id, h]));
  const pic = {
    members, holes, announce: setSaid,
    holeWords: (id: string) => { const h = byId.get(id); return h ? holeWords(h) : id; },
    onHole: (id: string) => { const h = byId.get(id); if (h) openFillers(h); },
    onPlant: (id: PlantId) => store.openSheet('details', id),
    verdictOf: (id: PlantId) => verdicts?.get(id),
  };
  const failedLists = store.failedPools.value;
  return (
    <div class="ct-palette-page">
      <nav class="ct-steps" aria-label={T('palette.stepsLabel')}>
        <ol>
          <li><button type="button" class="ct-step" onClick={changeSite}><span class="ct-step-n">1</span> {T('palette.stepPlace')}</button></li>
          <li aria-current="step"><span class="ct-step"><span class="ct-step-n">2</span> {T('palette.stepPalette')}</span></li>
          <li><span class="ct-step ct-step-later"><span class="ct-step-n">3</span> {T('palette.stepPlan')}</span></li>
        </ol>
      </nav>
      <h2 data-view-heading="" tabIndex={-1}>{T('palette.title')}</h2>
      {store.verdictFailed.value && (
        <p class="ct-notice" role="alert">{T('palette.verdictFailed')} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('load.reload')}</button></p>
      )}
      {failedLists.length > 0 && (
        <p class="ct-notice" role="alert">{P('palette.listFailed', store.failedMembers.value.length, { lists: failedLists.map(listName).join(', ') })} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('load.reload')}</button></p>
      )}
      <NextStep holes={holes} members={members} />
      <Years {...pic} />
      <JobsPicture {...pic} />
      <p class="visually-hidden" role="status" aria-live="polite">{said}</p>
    </div>
  );
}
