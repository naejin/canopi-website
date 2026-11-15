/** @jsxImportSource preact */
// The Next step (boards Main, Palette, HoleOpen, Empty): the first open hole in words and years, the
// three plants that fill it best (holes filled, then holding to the latest period, then name), each
// with its fit line, its warnings in words and Add, then the fillers that need a second look under
// their own heading, "See all" opening Add for the hole (store.openSheet('add', null, {job, cell,
// hole}); P1), and "Not now" (this page only). Then the other holes, each with Find. A hole a plant
// just added filled is gone from the list, so it is never the next step. An empty palette shows the
// Empty board's ways in (Paste, Suggest), not a hole.
// Outside-range fillers are grouped behind "Show N outside their climate range" and added in one tap
// like any other; a warned plant is never dropped (inform, don't block; owner 2026-11-14).
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Hole, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fillers, fills, nextStep, periodIds, phaseOfYear } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusNextStep } from '../../focus.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import { nameOf, P, T } from '../../strings.ts';
import { FitLine, holeWords } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { WARN } from '../kit/icons.tsx';

// What Add opens for: the hole itself (its plants, its words as the title), its job, and its light
// level and time steps as a cell span.
export const openFillers = (h: Hole): void => store.openSheet('add', null, {
  hole: h, fits: (t: Taxon) => fills(h, t), job: h.job ?? null, cell: { stratum: h.stratum ?? null, from: phaseOfYear(h.fromYear), to: phaseOfYear(h.toYear, true) },
});

// A plant with a warning (toxic, or invasive in the reader's country, or anywhere with none chosen)
// is listed as needing a second look, never dropped.
const warns = (t: Taxon, code: string | null): boolean =>
  (!!t.warnings.toxicity && t.warnings.toxicity.level !== 'None') || (t.warnings.invasive_in ?? []).some((r) => !code || r.country === code);

const OUTSIDE_FIRST = 8, BEST = 3;
const NONE: readonly Taxon[] = [];

function Card({ children, hole }: { children: ComponentChildren; hole?: string }) {
  return <section class="ct-next" aria-labelledby="ct-next-t" data-hole={hole}>{children}</section>;
}
const Title = ({ count }: { count?: string }) => <h3 id="ct-next-t" tabIndex={-1}>{T('palette.nextTitle')}{count && <> <span class="ct-next-count">{count}</span></>}</h3>;

export function NextStep({ holes, members }: { holes: readonly Hole[]; members: readonly Taxon[] }) {
  const skip = store.notNow.value;
  const open = useMemo(() => holes.filter((h) => h.state === 'open'), [holes]);
  const next = nextStep(holes, skip);
  // The whole list, outside-range plants included: grouped behind "Show N outside their climate
  // range", visible, never hidden, and one tap adds them (inform, don't block; owner 2026-11-14).
  // Nothing from a borrowed list not fitted to a place (store.offerPool; the head says why).
  const pool = store.offerPool.value ?? NONE;
  const [showOutside, setShowOutside] = useState(false);
  const [allOutside, setAllOutside] = useState(false);
  const pv = store.poolVerdicts.value;
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const code = store.country.value.code;
  const found = useMemo(() => {
    if (!next) return null;
    // Holding to the latest period and the warnings, for the plants that fill this hole only.
    const ids = new Set(members.map((t) => t.id));
    const cands = pool.filter((t) => !ids.has(t.id) && fills(next, t));
    const last = periodIds[periodIds.length - 1];
    const holds = new Map<PlantId, boolean>(rule ? cands.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : []);
    const warned = new Set(cands.filter((t) => warns(t, code)).map((t) => t.id));
    return { ...fillers(next, cands, pv ?? new Map(), holds, warned, members, open), warned };
  }, [next, pool, pv, rule, ctx, code, members, open]);

  // Empty: no member at all; plants of a guest list still loading or that failed are members too, only
  // not read yet (review r2 empty-1), so the branches after this one say so.
  if (!store.members.value.length) {
    return (
      <Card>
        <Title />
        <p>{T('palette.empty')}</p>
        <p class="ct-next-actions">
          <button type="button" class="button button-primary" onClick={() => requestSuggest()}>{T('start.suggest')}</button>
          <button type="button" class="button button-secondary" onClick={() => store.openSheet('paste')}>{T('start.paste')}</button>
        </p>
      </Card>
    );
  }
  // A guest list that could not be read: its plants may fill a hole, so no hole is named (PP-B21).
  if (store.failedMembers.value.length) return <Card><Title /><p class="status-line">{T('palette.holesListMissing')}</p></Card>;
  if (store.guestsPending.value.length || store.missingMembers.value.loading.length) {
    return <Card><Title /><p class="status-line">{T('palette.holesPending')}</p></Card>;
  }
  if (!next || !found) {
    return (
      <Card>
        <Title />
        <p>{T('palette.noHoles')}</p>
        {skip.size > 0 && <p><button type="button" class="button button-secondary" onClick={() => { store.notNow.value = new Set(); }}>{T('palette.showPutOff')}</button></p>}
      </Card>
    );
  }
  const best = [...found.fits, ...found.unknown].slice(0, BEST);
  const look = found.look.slice(0, BEST);
  const all = found.fits.length + found.look.length + found.outside.length + found.unknown.length;
  const others = open.filter((h) => h.id !== next.id && !skip.has(h.id));
  const filler = (t: Taxon) => <Filler key={t.id} t={t} v={pv?.get(t.id)} warned={found.warned.has(t.id)} />;
  return (
    <Card hole={next.id}>
      <Title count={T('palette.holeOf', { i: open.indexOf(next) + 1, n: open.length })} />
      <p class="ct-next-hole">{holeWords(next)}</p>
      {best.length > 0 && <ul class="ct-fillers">{best.map(filler)}</ul>}
      {look.length > 0 && (
        <>
          <h4 class="ct-fillers-head">{WARN} {T('palette.secondLook', { n: found.look.length })}</h4>
          <ul class="ct-fillers" data-look="">{look.map(filler)}</ul>
        </>
      )}
      {!best.length && !look.length && <p>{T(found.outside.length ? 'palette.noFittingFillers' : 'palette.noFillers')}</p>}
      {found.outside.length > 0 && (showOutside ? (
        <>
          {/* Folded like the pictures (200-plant directive): the first OUTSIDE_FIRST, then "Show all N". */}
          <ul class="ct-fillers" data-outside="">
            {(allOutside ? found.outside : found.outside.slice(0, OUTSIDE_FIRST)).map(filler)}
          </ul>
          {!allOutside && found.outside.length > OUTSIDE_FIRST && <p><button type="button" class="button button-secondary" onClick={() => setAllOutside(true)}>{P('add.showAll', found.outside.length)}</button></p>}
        </>
      ) : <p><button type="button" class="button button-secondary" onClick={() => setShowOutside(true)}>{P('palette.showOutside', found.outside.length)}</button></p>)}
      <p class="ct-next-actions">
        <button type="button" class="button button-secondary" onClick={() => openFillers(next)}>{P('palette.seeAll', all)}</button>
        <button type="button" class="button button-secondary" onClick={() => { store.notNow.value = new Set([...skip, next.id]); }}>{T('palette.notNow')}</button>
      </p>
      {others.length > 0 && (
        <details class="ct-other-holes">
          <summary>{P('palette.otherHoles', others.length)}</summary>
          <ul>{others.map((h) => <li key={h.id}>{holeWords(h)} <button type="button" class="button button-secondary" onClick={() => openFillers(h)}>{T('palette.find')}</button></li>)}</ul>
        </details>
      )}
    </Card>
  );
}

// One plant that fills the hole: its name, its fit in words with an icon, its warnings in words with
// the warning icon, and Add (one tap, nothing asks; the toast names it, with Undo). Its row leaves as
// it joins, so the focus goes to the Next step's title (review r1 conformance-3).
function Filler({ t, v, warned }: { t: Taxon; v: PlantVerdict | undefined; warned: boolean }) {
  const lines = flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const add = () => {
    store.addMembers([t.id], {}, { warned: warned || lines.length ? [t.id] : [], text: T('palette.added', { name: nameOf(t) }) });
    focusNextStep();
  };
  return (
    <li data-plant-id={t.id}>
      <span class="ct-filler-name">{nameOf(t)} <i lang="la">{t.canonical_name}</i></span>
      <FitLine v={v} />
      {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
      <button type="button" class="button button-primary" aria-label={T('palette.addNamed', { name: nameOf(t) })} onClick={add}>{T('palette.add')}</button>
    </li>
  );
}
