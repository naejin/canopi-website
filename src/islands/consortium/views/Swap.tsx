/** @jsxImportSource preact */
// Swap (stream S3; boards Swap and DetailsDesk): the plants of the climate's list that could take a
// member's place (store.alternativesFor over core suggest.ts `alternatives`: clean ones first, then
// those with a caution, then those with a warning, each saying why; then the same layer, what they
// leave empty and also fill, the years they cover). The header says why one might swap (the member's
// warnings or its fit) and the jobs it does; each candidate says how many of those jobs it does and
// names the ones it does not ("Does 3 of its 4 jobs (no mulch)"), its size, its fit and row notes
// (room, later loss), and what it does to the palette's holes. The foot keeps the member or removes
// it. Inform, don't block (owner decision 2026-11-14): one tap swaps any plant. Alternatives outside
// their climate range at the site are offered too, behind "Show N outside their climate range", each
// saying so in words (review r1 bugs-4). Loaded on first use (views/Sheets.tsx). The list comes from
// the suggestion's chunk (store.suggestRule, core loadSuggest): opening Swap asks for it
// (store.wantSuggest, which tries a failed one again); while it or the pool loads, the loading line.
// Every wait for the chunk ends (E6 hand-off B): with the alternatives, or, if it failed or has not
// come within the Suggest wait's 10 s (state/suggest-wait.ts suggestWaitMs; Swap's own timer, not that
// wait), with the failed line and Reload the other parts show (views/lazy.tsx LoadFailed). A chunk that
// comes after that still brings the alternatives.
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { Alternative, Hole, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { jobsOf } from '../../../lib/consortium/index.ts';
import { closeSheet, openSheet, removeMember, swapMember, taxonOf } from '../store.ts';
import { BACK, Bar, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { FitLine, holeWords } from './kit/fit.tsx';
import { listOf, nameOf, spanWords } from './kit/names.ts';
import { doesWords, RowNotes, sizeWords } from './StageBar.tsx';
import { LoadFailed } from './lazy.tsx';
import { suggestWaitMs } from '../state/suggest-wait.ts';
const { flagLines } = shared; // first-run modules (kit/sheet.tsx shared)

const SHOWN = { fit: 7, last: 2 };

export default function Swap({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  const pool = store.pool.value;
  const scene = store.flagScene.value;
  const [all, setAll] = useState(false);
  const [showOutside, setShowOutside] = useState(false);
  // The outside group's own fold (review r2 swap-1): its "Show all N" reaches every outside plant,
  // whatever the in-range list shows.
  const [allOutside, setAllOutside] = useState(false);
  const verdicts = store.poolVerdicts.value;
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
  // None from a borrowed list not fitted to a place (store.offerPool; the palette's head says why).
  const offer = useMemo(() => store.alternativesFor(id), [algo, id, store.offerPool.value, store.memberTaxa.value, store.flagContext.value, store.removed.value, verdicts]);
  const alts = offer?.fit ?? [], outsideAlts = offer?.outside ?? [];
  // The range rule (store.pool) or the suggestion's chunk (store.suggestRule) still loading.
  if (!pool || (!algo && !(asked && store.suggestFailed.value) && !stalled)) return <SheetWaiting Frame={Frame} />;
  if (!t) return null;
  const byId = new Map(pool.map((x) => [x.id, x]));
  // Clean candidates, then those that say a caution or a warning (order only; nothing asks).
  const fit = alts.filter((a) => !a.flags.length), last = alts.filter((a) => a.flags.length);
  const shown = all ? alts : [...fit.slice(0, SHOWN.fit), ...last.slice(0, SHOWN.last)];
  const memberJobs = jobsOf(t);
  const holeList = (hs: readonly Hole[]) => listOf(hs.map(holeWords));
  const swap = (x: Taxon) => { closeSheet(); swapMember(id, x.id); };
  // Why one might swap it: its warnings in words, else its fit when it is not a plain fit.
  const why = flagLines(t, store.flagsOfPlant(t), scene);
  const own = store.memberVerdicts.value?.get(id) ?? null;
  const borrowed = !!store.climate.value && !store.curatedClimates.value.includes(store.climate.value);
  const row = (a: Alternative, far = false) => {
    const x = byId.get(a.id);
    if (!x) return null;
    const lines = flagLines(x, a.flags, scene);
    const v = verdicts?.get(x.id) ?? null;
    return (
      <li key={a.id} class={far || a.flags.length ? 'flagged' : ''} data-swap-row>
        <div class="ct-row-main">
          <strong>{nameOf(x)}</strong> <i class="ct-sci">{x.canonical_name}</i>
          <Bar taxon={x} />
        </div>
        <button type="button" class="button button-secondary" aria-label={T('swap.for', { name: nameOf(x) })} onClick={() => swap(x)}>{T('details.swap')}</button>
        <div class="ct-row-why">
          <span data-swap-does>{doesWords(memberJobs, a.sharedJobs)} · {spanWords(x)}</span>
          <span class="ct-line" data-swap-size>{sizeWords(x)}</span>
          <span class="ct-line" data-conf={v ? undefined : 'not-checked'}><FitLine v={v} known={far ? 'outside' : undefined} />{v && <RowNotes t={x} v={v} />}</span>
          <span class="ct-line" data-swap-fills>{a.fills.length ? <strong>{T('swap.fills', { list: holeList(a.fills) })}</strong> : T('details.swapFillsNone')}</span>
          <span class="ct-line" data-swap-leaves>{a.leaves.length ? <strong>{T('swap.leaves', { list: holeList(a.leaves) })}</strong> : T('details.swapLeavesNone')}</span>
          {a.strataGain && <span class="ct-line" data-swap-layer>{T('details.swapNewLayer')}</span>}
          {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
        </div>
      </li>
    );
  };

  return (
    <Frame titleId="ct-sw-title" class="ct-swap" head={
      <button type="button" class="button-quiet ct-back" onClick={() => openSheet('details', id)}>{BACK}<span class="ct-back-name">{T('swap.back', { name: nameOf(t) })}</span></button>
    } foot={
      <div class="ct-add-bar ct-swap-foot">
        <button type="button" class="button button-secondary" onClick={() => openSheet('details', id)}>{T('swap.keep', { name: nameOf(t) })}</button>
        <button type="button" class="ct-link-button" onClick={() => { closeSheet(); removeMember(id); }}>{T('swap.remove')}</button>
      </div>
    }>
      <div>
        <h2 id="ct-sw-title" tabIndex={-1} data-autofocus>{T('swap.title', { name: nameOf(t) })}</h2>
        <p class="ct-muted">{T(borrowed ? 'swap.ledeBorrowed' : 'swap.lede')}</p>
        <div class="ct-swap-head" data-swap-head>
          {why.length > 0
            ? why.map((l) => <span class="ct-flag" data-level={l.level ?? 'warning'}>{WARN}{l.text}</span>)
            : own && own.level !== 'fits' ? <FitLine v={own} /> : null}
          <span>{memberJobs.length ? T('swap.headJobs', { jobs: listOf(memberJobs.map((j) => T(`job.${j}`))), span: spanWords(t) }) : T('swap.headNoJobs', { span: spanWords(t) })}</span>
        </div>
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
