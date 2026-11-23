/** @jsxImportSource preact */
// The palette page (plant-palette-slices row b2; boards Main, Palette, MainMore, DeskStates, Empty, Many,
// ManyDesk): under the page head's steps (ConsortiumPage.astro #ct-steps, place/steps.tsx), "What limits
// plants here" (board SiteMendoza), the Next step, Through the years and the jobs, in its own chunk
// (role `palette`, App.tsx lazyPart). On a laptop (960 px and wider) the Next step stands beside the
// pictures. Verdicts come from the core's verdict engine (store.memberVerdicts) and holes from the
// store's one list (store.paletteHoles, which Find reads too). Honest states: holes "checking" while a
// list loads, and not named while a guest list could not be read (its plants may fill one: PP-B21), a
// guest list that failed named as missing with its plants not checked, the verdict chunk refused said
// once with Retry in place, or, offline, "Needs a connection" and a retry once back online (PP-B20;
// never a page reload, architecture 9; store.ts start() asks again once back online). An empty palette
// shows no picture of nothing. Then Jobs, Warnings (past 40 plants "Warnings and fit"), Balance (v14
// boards MainMore, Many; "checking" while a list loads; the plants of a list that failed, and those on
// none of this climate's lists, counted as not checked from Your plants' rows), and Your plants.
// `foot`: the palette's foot (App.tsx passes views/Actions.tsx: "Your palette is saved on this device.
// Copy link · Print · Download for Canopi"), where boards MainMore and PaletteMore draw it: on the phone
// after Your plants; at 960 px and wider under Balance (the side column at 40 plants or fewer, Your
// plants' column past 40). Each width puts the blocks in the DOM in the order it draws them (h3 M10).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Flag, PlantId } from '../../../../lib/consortium/index.ts';
import { yourPlants } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { P, T } from '../../strings.ts';
import { markFirstView } from '../kit/start-mark.ts';
import { prefetchLater } from '../lazy.tsx';
import { holeWords } from '../kit/fit.tsx';
import { countryName, listOf, zoneName } from '../kit/names.ts';
import { JobsPicture } from './JobsPicture.tsx';
import { FindEntry } from '../Sheets.tsx';
import { FindPanelSlot } from './FindPanelSlot.tsx';
import { NextStep } from './NextStep.tsx';
import { openFillers } from '../rows.tsx';
import { Balance, Warnings, WarningsAndFit, warningGroups } from './Weigh.tsx';
import { Years } from './Years.tsx';
import { SIZE_PALETTE } from '../kit/chart.tsx';
import { YourPlants } from './YourPlants.tsx';
import { PlantSearch } from '../plants/Many.tsx';
import { wide } from '../plants/state.ts';
import { PaletteLimits } from '../figures/slots.tsx';
import { dossierId, poolOpen, studioTab } from '../../state/studio.ts';
import { lazyPart } from '../lazy.tsx';
import { StudioHeader } from './StudioHeader.tsx';
import { RequestPlantModal } from './RequestPlantModal.tsx';
import { PaletteCards } from './PaletteCards.tsx';
import { StudioRail } from './StudioRail.tsx';

const LazyLivingSystem = lazyPart(() => import('./LivingSystemTab.tsx').then((m) => m.LivingSystemTab), { page: true });
const LazyClimate2050 = lazyPart(() => import('./Climate2050Tab.tsx').then((m) => m.Climate2050Tab), { page: true });
const LazyPlantingPlan = lazyPart(() => import('./PlantingPlanTab.tsx').then((m) => m.PlantingPlanTab), { page: true });
const LazyFieldDossier = lazyPart(() => import('./FieldDossier.tsx').then((m) => m.FieldDossier), { page: true, quiet: true });

// The pictures' announcements (a time step chosen, a change summary): read by its own line only, so a
// step on the phone never re-renders the page (review r1 bugs-10).
const said = signal('');
const legacyStack = signal(false);
const announce = (text: string): void => { said.value = text; };
function Said() {
  return <p class="visually-hidden" role="status" aria-live="polite">{said.value}</p>;
}

// The verdict chunk refused: Retry fetches it again in place; offline, it needs a connection (store.ts
// start() asks again once the browser is back online). When no retry can work (store.ts
// verdictNeedsReload: the range or marks chunk failed too), Reload in place of Try again.
function VerdictNotice() {
  const off = store.offline.value;
  return (
    <p class="ct-notice" role="alert">{T('palette.verdictFailed')} {off ? T('load.needsConnection')
      : store.verdictNeedsReload.value ? <button type="button" class="button button-secondary" onClick={() => globalThis.location.reload()}>{T('load.reload')}</button>
      : <button type="button" class="button button-secondary" onClick={() => store.retryVerdict()}>{T('load.retry')}</button>}</p>
  );
}

// ct:first-view, once the palette page shows its Next step from the verdicts (or says they failed),
// never on a card still waiting for a member's list:
// the effect runs after that render is committed (review r1 perf-5); the later parts are prefetched
// then (lazy.tsx; the data ready already started them on a first visit).
function FirstView() {
  useEffect(() => { if (markFirstView()) prefetchLater(); }, []);
  return null;
}

export function Palette({ foot = null }: { foot?: ComponentChildren } = {}) {
  const members = store.memberTaxa.value;
  const verdicts = store.memberVerdicts.value;
  const missing = store.missingMembers.value;
  const pending = store.holesPending.value;
  const holes = store.paletteHoles.value;
  // Your plants' rows, the members the page cannot show among them: Things to weigh counts those rows
  // as not checked, so the rows and the count share one source (a guest of an unread list that this
  // climate lists too is shown, so never counted).
  const flags = store.flags.value, failed = store.failedMembers.value;
  const rows = useMemo(() => yourPlants(members, flags, { failed, unlisted: missing.unlisted }), [members, flags, failed, missing.unlisted]);
  const unchecked = rows.filter((r) => 'missing' in r).length;
  useEffect(() => {
    store.wantVerdict();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  // Stable while the holes and verdicts are: the pictures (memoised) redraw only when they change.
  const country = store.country.value?.code ?? null;
  const flagsById = useMemo(() => { const m = new Map<PlantId, Flag[]>(); for (const f of flags) { const l = m.get(f.id); if (l) l.push(f); else m.set(f.id, [f]); } return m; }, [flags]);
  const pic = useMemo(() => {
    const byId = new Map(holes.map((h) => [h.id, h]));
    return {
      members, holes, announce,
      holeWords: (id: string) => { const h = byId.get(id); return h ? holeWords(h) : id; },
      onHole: (id: string) => { const h = byId.get(id); if (h) openFillers(h); },
      onPlant: (id: PlantId) => store.openSheet('details', id),
      verdictOf: (id: PlantId) => verdicts?.get(id),
      flagsOf: (id: PlantId) => flagsById.get(id) ?? [],
      invasiveWord: country ? T('chip.invasiveIn', { country: countryName(country) }) : undefined,
    };
  }, [members, holes, verdicts, flagsById, country]);
  // The small Warnings card's groups (also "Warnings (N)" under Through the years): today's verdicts and
  // those of 2041–2070 at a place with projections (the leave-their-range line).
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const big = members.length > SIZE_PALETTE, desk = wide.value;
  const later = useMemo(() => (!big && rule && ctx.inputs?.periods.some((x) => x.period === '2041-2070') ? rule.verdicts(members, { ...ctx, period: '2041-2070' }) : null), [big, rule, members, ctx]);
  const groups = useMemo(() => (big ? [] : warningGroups(members, flags, verdicts, later, country)), [big, members, flags, verdicts, later, country]);
  const failedLists = store.failedPools.value;
  // A guest list is read from the opened database (no connection needed): Try again, then Reload once
  // a retry failed too (store.ts listRetry; h2 R8).
  const retry = store.listRetry.value;
  // Every member read (none loading, none of a list that failed: review r2 empty-1), so the Next step
  // shows from the verdicts, or says they failed.
  const shown = (!!verdicts || store.verdictFailed.value) && !pending;
  const weigh = big && (
    <div key="weigh" class="ct-many-weigh">
      <WarningsAndFit members={members} verdicts={verdicts} flags={flags} country={country} />
      <Balance members={members} unchecked={unchecked} />
    </div>
  );
  const footBlock = foot && <div key="foot" class="ct-palette-foot">{foot}</div>;
  const plantsBlock = <div key="plants" class="ct-many-right"><YourPlants rows={rows} /></div>;
  const activeTab = studioTab.value;
  const railVisible = poolOpen.value;
  return (
    <div class="ct-palette-page">
      <StudioHeader />
      <div class={`studio-shell${railVisible ? '' : ' rail-hidden'}`}>
        <div class="studio-main">
          {activeTab === 'system' ? (
            <LazyLivingSystem.View />
          ) : activeTab === 'climate' ? (
            <LazyClimate2050.View />
          ) : activeTab === 'plan' ? (
            <LazyPlantingPlan.View />
          ) : (
            <>
              <PaletteCards />
              <h2 class="visually-hidden ct-palette-title" data-view-heading="" tabIndex={-1}>{T('palette.title')}</h2>
              {store.verdictFailed.value && <VerdictNotice />}
              {failedLists.length > 0 && (
                <p class="ct-notice" role="alert">{P('palette.listFailed', store.failedMembers.value.length, { lists: listOf(failedLists.map(zoneName)) })} {retry === 'failed'
                  ? <button type="button" class="button button-secondary" onClick={() => globalThis.location.reload()}>{T('load.reload')}</button>
                  : <button type="button" class="button button-secondary" aria-busy={retry === 'busy' ? 'true' : undefined} aria-disabled={retry === 'busy' ? 'true' : undefined} onClick={() => void store.retryFailedLists()}>{T('load.retry')}</button>}</p>
              )}
              {legacyStack.value && (
              <>
              {footBlock}
              {big && !desk && <PlantSearch n={members.length + unchecked} class="ct-many-headsearch" />}
              {!(big && desk) && <FindEntry where="head" />}
              <PaletteLimits />
              {big ? (
                <div class="ct-palette-body" data-pictures="" data-many="">
                  <div key="left" class="ct-many-left">
                    <NextStep holes={holes} members={members} />
                    <div class="ct-palette-pictures">
                      <Years {...pic} warnings={groups.length} />
                      <JobsPicture {...pic} />
                    </div>
                  </div>
                  <FindPanelSlot key="panel" />
                  {desk ? [plantsBlock, weigh] : [weigh, plantsBlock]}
                </div>
              ) : (
                <div class="ct-palette-body" data-pictures={members.length ? '' : undefined}>
                  {members.length > 0 && <FindPanelSlot key="panel" />}
                  <NextStep key="next" holes={holes} members={members} />
                  {members.length === 0 && <FindPanelSlot key="panel" />}
                  {members.length > 0 && (
                    <div class="ct-palette-pictures">
                      <Years {...pic} warnings={groups.length} />
                      <JobsPicture {...pic} />
                    </div>
                  )}
                  {members.length > 0 && (
                    <div class="ct-palette-side">
                      <Warnings groups={groups} />
                      <Balance members={members} unchecked={unchecked} />
                    </div>
                  )}
                  <YourPlants rows={rows} />
                </div>
              )}
              <FindEntry where="bar" />
              </>
              )}
              <Said />
              {shown && <FirstView />}
            </>
          )}
        </div>
        {railVisible && <StudioRail />}
      </div>
      <RequestPlantModal />
      {dossierId.value !== null && <LazyFieldDossier.View />}
    </div>
  );
}
