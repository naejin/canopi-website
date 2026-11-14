/** @jsxImportSource preact */
// The palette page (plant-palette-slices row b2; boards Main, Palette, MainMore, DeskStates, Empty): the
// header steps (Your place, Your palette, Planting plan), the Next step, Through the years and the
// jobs, in its own chunk (role `palette`, App.tsx lazyPart). On a laptop (960 px and wider) the Next
// step stands beside the pictures. Verdicts come from the core's verdict engine (store.memberVerdicts)
// and holes from holes.ts, computed here, never in the store. Honest states: holes "checking" while a
// list loads, and not named while a guest list could not be read (its plants may fill one: PP-B21), a
// guest list that failed named as missing with its plants not checked, the verdict chunk refused said
// once with Retry in place, or, offline, "Needs a connection" and a retry once back online (PP-B20;
// never a page reload, architecture 9). An empty palette shows no picture of nothing.
import { useEffect, useMemo } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { PlantId } from '../../../../lib/consortium/index.ts';
import { holes as holesOf } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { changeSite } from '../../state/draft.ts';
import { P, T } from '../../strings.ts';
import { markFirstView } from '../kit/start-mark.ts';
import { prefetchLater } from '../lazy.tsx';
import { holeWords } from '../kit/fit.tsx';
import { listName } from '../kit/names.ts';
import { JobsPicture } from './JobsPicture.tsx';
import { NextStep, openFillers } from './NextStep.tsx';
import { Years } from './Years.tsx';

// The pictures' announcements (a time step chosen, a change summary): read by its own line only, so a
// step on the phone never re-renders the page (review r1 bugs-10).
const said = signal('');
const announce = (text: string): void => { said.value = text; };
function Said() {
  return <p class="visually-hidden" role="status" aria-live="polite">{said.value}</p>;
}

// The verdict chunk refused: Retry fetches it again in place; offline, it needs a connection and is
// asked again once the browser is back online.
function VerdictNotice() {
  const off = store.offline.value;
  useEffect(() => {
    if (!off) return;
    const again = () => store.retryVerdict();
    addEventListener('online', again, { once: true });
    return () => removeEventListener('online', again);
  }, [off]);
  return (
    <p class="ct-notice" role="alert">{T('palette.verdictFailed')} {off ? T('load.needsConnection')
      : <button type="button" class="button button-secondary" onClick={() => store.retryVerdict()}>{T('load.retry')}</button>}</p>
  );
}

// ct:first-view, once the palette page shows its Next step from the verdicts (or says they failed):
// the effect runs after that render is committed (review r1 perf-5); the later parts are prefetched
// then (lazy.tsx; the data ready already started them on a first visit).
function FirstView() {
  useEffect(() => { if (markFirstView()) prefetchLater(); }, []);
  return null;
}

// "Your place": Back when the step to the palette took a history entry (so the browser's Forward
// returns), else the step itself.
const toPlace = (): void => { if (!store.leaveEntry('palette')) changeSite(); };

export function Palette() {
  const members = store.memberTaxa.value;
  const verdicts = store.memberVerdicts.value;
  const missing = store.missingMembers.value;
  const pending = store.guestsPending.value.length > 0 || missing.loading.length > 0 || store.failedMembers.value.length > 0;
  const holes = useMemo(() => holesOf({ members, verdicts, pending }), [members, verdicts, pending]);
  useEffect(() => { store.wantVerdict(); }, []);
  // Stable while the holes and verdicts are: the pictures (memoised) redraw only when they change.
  const pic = useMemo(() => {
    const byId = new Map(holes.map((h) => [h.id, h]));
    return {
      members, holes, announce,
      holeWords: (id: string) => { const h = byId.get(id); return h ? holeWords(h) : id; },
      onHole: (id: string) => { const h = byId.get(id); if (h) openFillers(h); },
      onPlant: (id: PlantId) => store.openSheet('details', id),
      verdictOf: (id: PlantId) => verdicts?.get(id),
    };
  }, [members, holes, verdicts]);
  const failedLists = store.failedPools.value;
  const off = store.offline.value;
  const shown = !!verdicts || store.verdictFailed.value;
  return (
    <div class="ct-palette-page">
      <nav class="ct-steps" aria-label={T('palette.stepsLabel')}>
        <ol>
          <li><button type="button" class="ct-step" onClick={toPlace}><span class="ct-step-n">1</span> {T('palette.stepPlace')}</button></li>
          <li aria-current="step"><span class="ct-step"><span class="ct-step-n">2</span> {T('palette.stepPalette')}</span></li>
          <li><span class="ct-step ct-step-later"><span class="ct-step-n">3</span> {T('palette.stepPlan')}</span></li>
        </ol>
      </nav>
      <h2 data-view-heading="" tabIndex={-1}>{T('palette.title')}</h2>
      {store.verdictFailed.value && <VerdictNotice />}
      {failedLists.length > 0 && (
        <p class="ct-notice" role="alert">{P('palette.listFailed', store.failedMembers.value.length, { lists: failedLists.map(listName).join(', ') })} {off ? T('load.needsConnection')
          : <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('load.reload')}</button>}</p>
      )}
      <div class="ct-palette-body" data-pictures={members.length ? '' : undefined}>
        <NextStep holes={holes} members={members} />
        {members.length > 0 && (
          <div class="ct-palette-pictures">
            <Years {...pic} />
            <JobsPicture {...pic} />
          </div>
        )}
      </div>
      <Said />
      {shown && <FirstView />}
    </div>
  );
}
