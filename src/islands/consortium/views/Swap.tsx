/** @jsxImportSource preact */
// Swap (stream S3; mockup 05 `swap`): the plants of the climate's list that could take a member's
// place (core suggest.ts `alternatives`: same layer first, then what they leave empty and also fill,
// the jobs they share). Each says what it does to the matrix: "Also fills: Years 25–60." or "Leaves
// empty: Months 3–12." Inform, don't block (owner decision 2026-11-14; it replaces the 2026-10-28
// "Swap anyway?" rule): one tap swaps any plant; a site misfit or a serious (high) conflict keeps its
// reason on its row in words, and those plants come last. Alternatives outside their climate range at
// the site (as their verdict says, else the range rule) are offered too, behind "Show N outside their
// climate range", each saying so in words (review r1 bugs-4). Loaded on first use (views/Sheets.tsx). The list
// comes from the suggestion's chunk (store.suggestRule, core loadSuggest): opening Swap asks for it
// (store.wantSuggest, which tries a failed one again); while it or the pool loads, the loading line.
// Every wait for the chunk ends (E6 hand-off B): with the alternatives, or, if it failed or has not
// come within the Suggest wait's 10 s (state/suggest-wait.ts suggestWaitMs; Swap's own timer, not that
// wait), with the failed line and Reload the other parts show (views/lazy.tsx LoadFailed). A chunk that
// comes after that still brings the alternatives.
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { CellRef, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { warns } from '../../../lib/consortium/index.ts';
import { closeSheet, openSheet, swapMember, taxonOf } from '../store.ts';
import { BACK, Bar, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { FitLine } from './kit/fit.tsx';
import { listOf, nameOf, phasePlain, spanWords } from './kit/names.ts';
import { LoadFailed } from './lazy.tsx';
import { suggestWaitMs } from '../state/suggest-wait.ts';
const { flagLines } = shared; // first-run modules (kit/sheet.tsx shared)

const SHOWN = { fit: 7, last: 2 };

export default function Swap({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  const pool = store.pool.value;
  const members = store.memberTaxa.value;
  const ctx = store.flagContext.value;
  const scene = store.flagScene.value;
  const removed = store.removed.value;
  const [all, setAll] = useState(false);
  const [showOutside, setShowOutside] = useState(false);
  // The outside group's own fold (review r2 swap-1): its "Show all N" reaches every outside plant,
  // whatever the in-range list shows.
  const [allOutside, setAllOutside] = useState(false);
  const verdicts = store.poolVerdicts.value;
  const rule = store.rangeRule.value, loc = store.location.value;
  const outside = (x: Taxon) => (verdicts ? verdicts.get(x.id)?.level === 'outside' : !!rule && rule.rangeFit(x, loc) === 'outside');
  const algo = store.suggestRule.value;
  const [stalled, setStalled] = useState(false);
  // Asked once this opening rendered: until then an earlier failure reads as waiting, so the failed
  // line is announced once per opening, after this ask (review 3).
  const [asked, setAsked] = useState(false);
  useEffect(() => { store.wantSuggest(); setAsked(true); }, []);
  useEffect(() => {
    if (algo) return;
    const cap = setTimeout(() => setStalled(true), suggestWaitMs());
    return () => clearTimeout(cap);
  }, [algo]);
  // Within the list's plants inside their range, then, apart, those outside it (none without a
  // location: nothing is outside then).
  const [alts, outsideAlts] = useMemo(() => {
    if (!pool || !algo) return [[], []];
    const out = pool.filter(outside);
    const away = new Set(out.map((x) => x.id));
    return [algo.alternatives(id, members, pool.filter((x) => !away.has(x.id)), { ...ctx, removed }), out.length ? algo.alternatives(id, members, out, { ...ctx, removed }) : []];
  }, [algo, id, pool, members, ctx, removed, verdicts, rule, loc]);
  // The range rule (store.pool) or the suggestion's chunk (store.suggestRule) still loading.
  if (!pool || (!algo && !(asked && store.suggestFailed.value) && !stalled)) return <SheetWaiting Frame={Frame} />;
  if (!t) return null;
  const byId = new Map(pool.map((x) => [x.id, x]));
  // Misfits and serious conflicts after the others (order only; nothing asks).
  const fit = alts.filter((a) => !warns(a.flags)), last = alts.filter((a) => warns(a.flags));
  const shown = all ? alts : [...fit.slice(0, SHOWN.fit), ...last.slice(0, SHOWN.last)];
  const cellWords = (cells: readonly CellRef[]) => listOf(cells.map(([s, p]) => (s === t.stratum?.value ? phasePlain(p) : `${T(`stratum.${s}`)} · ${phasePlain(p)}`)));
  const swap = (x: Taxon) => { closeSheet(); swapMember(id, x.id); };
  type Alt = (typeof alts)[number];
  const row = (a: Alt, far = false) => {
    const x = byId.get(a.id);
    if (!x) return null;
    const lines = flagLines(x, a.flags, scene);
    return (
      <li key={a.id} class={far || warns(a.flags) ? 'flagged' : ''}>
        <div class="ct-row-main">
          <strong>{nameOf(x)}</strong> <i class="ct-sci">{x.canonical_name}</i>
          <Bar taxon={x} />
        </div>
        <button type="button" class="button button-secondary" aria-label={T('swap.for', { name: nameOf(x) })} onClick={() => swap(x)}>{T('details.swap')}</button>
        <div class="ct-row-why">
          <span>{spanWords(x)}{a.sharedJobs.length > 0 && ` · ${T('swap.shares', { jobs: listOf(a.sharedJobs.map((j) => T(`job.${j}`))) })}`}</span>
          {far && <FitLine v={verdicts?.get(x.id)} known="outside" />}
          {a.alsoFills.length > 0 && <strong class="ct-line">{T('swap.fills', { list: cellWords(a.alsoFills) })}</strong>}
          {a.leavesEmpty.length > 0 && <strong class="ct-line">{T('swap.leaves', { list: cellWords(a.leavesEmpty) })}</strong>}
          {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
        </div>
      </li>
    );
  };

  return (
    <Frame titleId="ct-sw-title" class="ct-swap" head={
      <button type="button" class="button-quiet ct-back" onClick={() => openSheet('details', id)}>{BACK}{T('swap.back', { name: nameOf(t) })}</button>
    }>
      <div>
        <h2 id="ct-sw-title" tabIndex={-1} data-autofocus>{T('swap.title', { name: nameOf(t) })}</h2>
        <p class="ct-muted">{T('swap.lede')}</p>
        <NotChecked ctx={store.flagContext.value} />
      </div>
      {!algo ? <LoadFailed /> : shown.length ? (
        <ul class="ct-rows">{shown.map((a) => row(a))}</ul>
      ) : <p class="ct-muted">{T('swap.none')}</p>}
      {!all && alts.length > shown.length && (
        <p><button type="button" class="button button-secondary" onClick={() => setAll(true)}>{P('add.showAll', alts.length)}</button></p>
      )}
      {algo && outsideAlts.length > 0 && (showOutside ? (
        <>
          <ul class="ct-rows" data-outside="">{(allOutside ? outsideAlts : outsideAlts.slice(0, SHOWN.fit)).map((a) => row(a, true))}</ul>
          {!allOutside && outsideAlts.length > SHOWN.fit && (
            <p><button type="button" class="button button-secondary" onClick={() => setAllOutside(true)}>{P('add.showAll', outsideAlts.length)}</button></p>
          )}
        </>
      ) : <p><button type="button" class="button button-secondary" onClick={() => setShowOutside(true)}>{P('palette.showOutside', outsideAlts.length)}</button></p>)}
    </Frame>
  );
}
