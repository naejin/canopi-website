/** @jsxImportSource preact */
// The Next step (boards Main, Palette, HoleOpen): the first open hole in words and years, the three
// plants that fill it best (holes filled, then holding to the latest period, then name), each with
// its fit line and Add, "See all" opening Add preset to the hole (store.openSheet('add', null, {job,
// cell}); P1), and "Not now" (this page only). Then the other holes, each with Find. A hole a plant
// just added filled is gone from the list, so it is never the next step.
// Outside-range fillers are grouped behind "Show N outside their climate range" and added in one tap
// like any other (inform, don't block; owner 2026-11-14).
import { useMemo, useState } from 'preact/hooks';
import type { CellSpan, Hole, PhaseOrd, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fillers, holeLine, nextStep, PHASE_YEARS, periodIds } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { FitLine, say } from '../kit/fit.tsx';

const ord = (y: number, end: boolean): PhaseOrd => Math.max(0, PHASE_YEARS.findIndex((p) => p[end ? 1 : 0] === y)) as PhaseOrd;
// What Add opens for: the hole's job, and its light level and time steps as a cell span.
const targetOf = (h: Hole): { job: Hole['job'] | null; cell: CellSpan } => ({ job: h.job ?? null, cell: { stratum: h.stratum ?? null, from: ord(h.fromYear, false), to: ord(h.toYear, true) } });
export const openFillers = (h: Hole): void => store.openSheet('add', null, targetOf(h));
// The hole in words: its lane (a job, a light level) and its years.
export const holeWords = (h: Hole): string => `${T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`)}: ${say(holeLine(h))}`;

// A plant with a warning (toxic, or invasive in the reader's country, or anywhere with none chosen)
// is listed as needing a second look, never dropped.
function warnedOf(pool: readonly Taxon[], code: string | null): Set<PlantId> {
  return new Set(pool.filter((t) => (t.warnings.toxicity && t.warnings.toxicity.level !== 'None') || (t.warnings.invasive_in ?? []).some((r) => !code || r.country === code)).map((t) => t.id));
}

const OUTSIDE_FIRST = 8;

export function NextStep({ holes, members }: { holes: readonly Hole[]; members: readonly Taxon[] }) {
  const skip = store.notNow.value;
  const next = nextStep(holes, skip);
  const open = holes.filter((h) => h.state === 'open');
  // The whole list, outside-range plants included: grouped behind "Show N outside their climate
  // range", visible, never hidden, and one tap adds them (inform, don't block; owner 2026-11-14).
  const pool = store.pool.value ?? [];
  const [showOutside, setShowOutside] = useState(false);
  const [allOutside, setAllOutside] = useState(false);
  const pv = store.poolVerdicts.value;
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const code = store.country.value.code;
  const found = useMemo(() => {
    if (!next) return null;
    const holds = new Map<PlantId, boolean>(rule ? pool.map((t) => [t.id, rule.holdsBy(t, ctx, periodIds[periodIds.length - 1])]) : []);
    return fillers(next, pool, pv ?? new Map(), holds, warnedOf(pool, code), members, open);
  }, [next, pool, pv, rule, ctx, code, members, open]);
  if (store.guestsPending.value.length || store.missingMembers.value.loading.length) {
    return <section class="ct-next" aria-labelledby="ct-next-t"><h3 id="ct-next-t">{T('palette.nextTitle')}</h3><p class="status-line">{T('palette.holesPending')}</p></section>;
  }
  if (!next || !found) {
    return (
      <section class="ct-next" aria-labelledby="ct-next-t">
        <h3 id="ct-next-t">{T('palette.nextTitle')}</h3>
        <p>{members.length ? T('palette.noHoles') : T('palette.empty')}</p>
        {skip.size > 0 && <p><button type="button" class="button button-secondary" onClick={() => { store.notNow.value = new Set(); }}>{T('palette.showPutOff')}</button></p>}
      </section>
    );
  }
  const best = [...found.fits, ...found.look, ...found.unknown].slice(0, 3);
  const all = found.fits.length + found.look.length + found.outside.length + found.unknown.length;
  const others = open.filter((h) => h.id !== next.id && !skip.has(h.id));
  return (
    <section class="ct-next" aria-labelledby="ct-next-t" data-hole={next.id}>
      <h3 id="ct-next-t">{T('palette.nextTitle')} <span class="ct-next-count">{T('palette.holeOf', { i: open.indexOf(next) + 1, n: open.length })}</span></h3>
      <p class="ct-next-hole">{holeWords(next)}</p>
      {best.length ? (
        <ul class="ct-fillers">
          {best.map((t) => <Filler key={t.id} t={t} v={pv?.get(t.id)} />)}
        </ul>
      ) : <p>{T('palette.noFillers')}</p>}
      {found.outside.length > 0 && (showOutside ? (
        <>
          {/* Folded like the pictures (200-plant directive): the first OUTSIDE_FIRST, then "Show all N". */}
          <ul class="ct-fillers" data-outside="">
            {(allOutside ? found.outside : found.outside.slice(0, OUTSIDE_FIRST)).map((t) => <Filler key={t.id} t={t} v={pv?.get(t.id)} />)}
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
    </section>
  );
}

// One plant that fills the hole: its name, its fit in words with an icon, and Add (one tap, the Undo toast).
function Filler({ t, v }: { t: Taxon; v: PlantVerdict | undefined }) {
  return (
    <li data-plant-id={t.id}>
      <span class="ct-filler-name">{nameOf(t)} <i lang="la">{t.canonical_name}</i></span>
      <FitLine v={v} />
      <button type="button" class="button button-primary" aria-label={T('palette.addNamed', { name: nameOf(t) })} onClick={() => store.addMembers([t.id])}>{T('palette.add')}</button>
    </li>
  );
}
