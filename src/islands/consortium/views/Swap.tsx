/** @jsxImportSource preact */
// Swap (stream S3; boards Swap and DetailsDesk): the plants of the climate's list that could take a
// member's place, in core's one order (store.alternativesFor over core suggest.ts `alternatives`: the
// closest in jobs and years first, warned ones after, each saying why; shown as it comes). The header says why one might swap (the member's
// warnings or its fit) and the jobs it does; each candidate says how many of those jobs it does and
// names the ones it does not ("Does 3 of its 4 jobs (no mulch)"), its size, its fit and row notes
// (room, later loss), and what it does to the palette's holes. Each row swaps (Swap takes the member
// out) or adds beside (both kept; v14 board Swap); "Only plants that hold by 2041–2070" keeps the
// candidates the engine says still hold then (verdict rule holdsBy), with its count. The foot removes the
// member; no Keep (Back keeps it). Inform, don't block (owner decision 2026-11-14): one tap swaps any plant. Alternatives outside
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
import { jobsOf, periodIds, periodName, whenLine, yearsOf } from '../../../lib/consortium/index.ts';
import { addMembers, closeSheet, openSheet, removeMember, swapMember, taxonOf } from '../store.ts';
import { BACK, Bar, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { doesWords, FitLine, holeWords, jobList, lightWords, say, sizeShort, SWAP, yearsWords } from './kit/fit.tsx';
import { listOf, nameOf } from './kit/names.ts';
import { RowNotes } from './StageBar.tsx';
import { LoadFailed } from './lazy.tsx';
import { suggestWaitMs } from '../state/suggest-wait.ts';
const { flagLines } = shared; // first-run modules (kit/sheet.tsx shared)

const SHOWN = 9;
// The period the hold filter names (board Swap: "Only plants that hold by 2041–2070").
const HOLD_PERIOD = periodIds[1];

export default function Swap({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  const pool = store.pool.value;
  const scene = store.flagScene.value;
  const [all, setAll] = useState(false);
  const [holdOnly, setHoldOnly] = useState(true);
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
  // The hold filter (engine: the verdict rule's holdsBy at the period it names, on the page's context).
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const holds = (a: Alternative) => { const x = byId.get(a.id); return !!(x && rule && rule.holdsBy(x, ctx, HOLD_PERIOD)); };
  const holding = rule ? alts.filter(holds) : alts;
  const filtered = holdOnly && rule ? holding : alts;
  // Core's order as it is (closest first, warned ones after; nothing asks).
  const shown = all ? filtered : filtered.slice(0, SHOWN);
  // Plants already in the palette that do every job of this one (board Swap: "Already in your palette").
  const already = store.memberTaxa.value.filter((m) => m.id !== id && jobsOf(t).length > 0 && jobsOf(t).every((j) => jobsOf(m).includes(j)));
  const memberJobs = jobsOf(t);
  const holeList = (hs: readonly Hole[]) => listOf(hs.map(holeWords));
  const swap = (x: Taxon) => { closeSheet(); swapMember(id, x.id); };
  const beside = (x: Taxon, warned: boolean) => { closeSheet(); addMembers([x.id], {}, { warned: warned ? [x.id] : [], text: T('palette.added', { name: nameOf(x) }) }); };
  // Why one might swap it: its warnings in words, else its fit when it is not a plain fit.
  const why = flagLines(t, store.flagsOfPlant(t), scene);
  const own = store.memberVerdicts.value?.get(id) ?? null;
  const row = (a: Alternative, far = false) => {
    const x = byId.get(a.id);
    if (!x) return null;
    const lines = flagLines(x, a.flags, scene);
    const v = verdicts?.get(x.id) ?? null;
    const y = yearsOf(x);
    return (
      <li key={a.id} class={far || a.flags.length ? 'flagged' : ''} data-swap-row data-plant-id={x.id}>
        <div class="ct-swap-text">
          <div class="ct-row-main"><strong>{nameOf(x)}</strong> <i class="ct-sci">{x.canonical_name}</i></div>
          <p class="ct-swap-does" data-swap-does>{doesWords(memberJobs, a.sharedJobs)}{y ? <>, {say(whenLine(y.from, y.to))}</> : ''}</p>
        </div>
        <div class="ct-swap-acts">
          <button type="button" class="button button-secondary" aria-label={T(far ? 'swap.anywayFor' : 'swap.for', { name: nameOf(x) })} onClick={() => swap(x)}>{SWAP}{T(far ? 'swap.swapAnyway' : 'details.swap')}</button>
          <button type="button" class="ct-link-button" aria-label={T(far ? 'swap.addAnywayFor' : 'swap.besideFor', { name: nameOf(x) })} onClick={() => beside(x, far || a.flags.length > 0)}>{T(far ? 'addAnyway' : 'swap.addBeside')}</button>
        </div>
        <div class="ct-row-why">
          {/* What changes in the palette's gaps, said once (K12): what it fills, what it leaves empty, or that none change. */}
          {a.fills.length > 0 && <span class="ct-line" data-swap-fills><strong>{T('swap.fills', { list: holeList(a.fills) })}</strong></span>}
          {a.leaves.length > 0 && <span class="ct-line" data-swap-leaves><strong>{T('swap.leaves', { list: holeList(a.leaves) })}</strong></span>}
          {!a.fills.length && !a.leaves.length && <span class="ct-line" data-swap-gaps-same>{T('details.swapGapsSame')}</span>}
          {a.strataGain && <span class="ct-line" data-swap-layer>{T('details.swapNewLayer')}</span>}
          <span class="ct-line" data-swap-size>{lightWords(x).growsIn} · {sizeShort(x)}</span>
          <span class="ct-line ct-swap-status" data-conf={v ? undefined : 'not-checked'}><Bar taxon={x} /><FitLine v={v} known={far ? 'outside' : undefined} />{v && <RowNotes t={x} v={v} />}</span>
          {lines.length > 0 && <span class="ct-line ct-swap-flags">{lines.map((l) => <span class="ct-flag" data-level={l.level ?? 'warning'}>{WARN}{l.chip ?? l.text}</span>)}</span>}
        </div>
      </li>
    );
  };

  return (
    <Frame titleId="ct-sw-title" class="ct-swap" head={
      <button type="button" class="button-quiet ct-back" onClick={() => openSheet('details', id)}>{BACK}<span class="ct-back-name">{T('swap.back', { name: nameOf(t) })}</span></button>
    } foot={
      <div class="ct-add-bar ct-swap-foot">
        <button type="button" class="ct-link-button" onClick={() => { closeSheet(); removeMember(id); }}>{T('swap.remove')}</button>
      </div>
    }>
      <div>
        <h2 id="ct-sw-title" tabIndex={-1} data-autofocus>{T('swap.title', { name: nameOf(t) })}</h2>
        <p class="ct-muted">{T('swap.lede', { name: nameOf(t) })}</p>
        <div class="ct-swap-head" data-swap-head>
          {/* Why one might swap it (K12): its warnings, and its fit with the cause when it is not a plain fit. */}
          {why.map((l) => <span class="ct-flag" data-level={l.level ?? 'warning'}>{WARN}{l.chip ?? l.text}</span>)}
          {own && own.level !== 'fits' && <FitLine v={own} head />}
          <span>{memberJobs.length ? P('swap.headJobs', memberJobs.length, { jobs: jobList(memberJobs), span: yearsOf(t) ? say(whenLine(yearsOf(t)!.from, yearsOf(t)!.to)) : T('timingUnknown') }) : T('swap.headNoJobs', { span: yearsWords(t) })}</span>
        </div>
        <NotChecked ctx={store.flagContext.value} />
      </div>
      {algo && rule && alts.length > 0 && (
        <label class="ct-check ct-swap-hold">
          <input type="checkbox" checked={holdOnly} onChange={(e) => setHoldOnly((e.target as HTMLInputElement).checked)} />
          <span>{T('swap.holdsOnly', { period: periodName(HOLD_PERIOD) })}</span>
          <span class="ct-muted ct-swap-hold-count">{T('swap.holdsCount', { n: holding.length, m: alts.length })}</span>
        </label>
      )}
      {!algo ? <LoadFailed /> : shown.length || already.length ? (
        <ul class="ct-rows">
          {shown.map((a) => row(a))}
          {already.map((m) => <li data-swap-already data-plant-id={m.id}><div class="ct-swap-text"><div class="ct-row-main"><strong>{nameOf(m)}</strong> <i class="ct-sci">{m.canonical_name}</i></div><p class="ct-swap-does">{T('swap.already', { span: yearsWords(m) })}</p></div></li>)}
        </ul>
      ) : <p class="ct-muted">{T('swap.none')}</p>}
      {algo && (
        <p class="ct-small ct-swap-more">
          {T('swap.closestFirst')}
          {filtered.length > shown.length || (holdOnly && holding.length < alts.length) ? <> <button type="button" class="ct-link-button" onClick={() => { setAll(true); setHoldOnly(false); }}>{P('swap.seeAll', alts.length)}</button></> : null}
          {outsideAlts.length > 0 && !showOutside && <> · <button type="button" class="ct-link-button" onClick={() => setShowOutside(true)}>{T('swap.everyList')}</button></>}
        </p>
      )}
      {algo && showOutside && outsideAlts.length > 0 && (
        <>
          <ul class="ct-rows" data-outside="">{(allOutside ? outsideAlts : outsideAlts.slice(0, SHOWN)).map((a) => row(a, true))}</ul>
          {!allOutside && outsideAlts.length > SHOWN && (
            <p><button type="button" class="button button-secondary" onClick={() => setAllOutside(true)}>{P('add.showAll', outsideAlts.length)}</button></p>
          )}
        </>
      )}
    </Frame>
  );
}
