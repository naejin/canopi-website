/** @jsxImportSource preact */
// Swap (stream S3; boards Swap and DetailsDesk): the plants of the climate's list that could take a
// member's place, in core's one order (store.alternativesFor over core suggest.ts `alternatives`: the
// closest in jobs and years first, warned ones after, each saying why; shown as it comes). The header says why one might swap (the member's
// warnings or its fit) and the jobs it does; each candidate says how many of those jobs it does and
// names the ones it does not ("Does 3 of its 4 jobs (no mulch)"), its years and what it does to the
// palette's holes in the same sentence ("…, and stands to year 25: also fills the hole after year 15",
// bold with a check; core swapYearsLine and gapLines), its light when it differs from the member's, its size, and its climate as the board's mini band with
// the edge words ("Near its cool edge today; safer as it warms"; core rowBandOf; fix round 1 BC7). Each row swaps (Swap takes the member
// out) or adds beside (both kept; v14 board Swap); "Only plants that hold by 2041–2070" leaves out the
// candidates the engine judges outside their range then (verdict rule holdsBy), with its count. It shows
// only when the page can judge (a place with that period's climate: fix round 1 R2); a candidate it
// cannot judge (no range recorded) stays listed and says "Not checked for 2041–2070", counted apart
// (unknown is never a hole), and a filter that leaves none says so with See all, never "no plant". The foot removes the
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
import type { Alternative, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { gapLines, jobsOf, periodIds, periodName, rowBandOf, swapYearsLine, whenLine, yearsOf } from '../../../lib/consortium/index.ts';
import { addMembers, closeSheet, openSheet, removeMember, swapMember, taxonOf } from '../store.ts';
import { BACK, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { AltRow, doesWords, FitLine, jobList, lightWords, RowBandLine, say, sizeShort, SWAP, yearsWords } from './kit/fit.tsx';
import { countryName, nameOf } from './kit/names.ts';
import { LoadFailed } from './lazy.tsx';
import { suggestWaitMs } from '../state/suggest-wait.ts';
const { flagLines } = shared; // first-run modules (kit/sheet.tsx shared)

const SHOWN = 9;
const CHECK = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>;
// The invasive mark (board Swap's head chip "Recorded invasive in Kenya"; the word map's form everywhere).
const INVASIVE = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 10L4.5 4.5M10 10l5.5-5.5M10 10l-5.5 5.5M10 10l5.5 5.5M4.5 8V4.5H8M12 4.5h3.5V8M4.5 12v3.5H8M12 15.5h3.5V12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>;
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
  // Each candidate at the hold period: 'holds', 'not' (judged outside then), or 'unknown' (nothing to
  // compare: no place, no projection, no range recorded); the rule's holdStates, which Details reads too.
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const holdOf = useMemo(() => {
    const p = store.pool.peek();
    return rule?.holdStates(p ? alts.map((a) => p.find((x) => x.id === a.id)).filter((x): x is Taxon => !!x) : [], ctx, HOLD_PERIOD) ?? new Map<PlantId, 'unknown'>();
  }, [rule, ctx, alts]);
  // The range rule (store.pool) or the suggestion's chunk (store.suggestRule) still loading.
  if (!pool || (!algo && !(asked && store.suggestFailed.value) && !stalled)) return <SheetWaiting Frame={Frame} />;
  if (!t) return null;
  const byId = new Map(pool.map((x) => [x.id, x]));
  // The hold filter (engine: the verdict rule's holdsBy at the period it names, on the page's context),
  // offered only when at least one candidate can be judged then.
  // One count for the period (M30, the rule's holdCounts, as Details counts): hold, fail, not judged.
  const stateOf = (a: Alternative) => holdOf.get(a.id) ?? 'unknown';
  const counts = rule?.holdCounts(holdOf, alts.map((a) => a.id)) ?? { holds: 0, not: 0, unknown: alts.length };
  const canJudge = counts.unknown < alts.length;
  const filterOn = holdOnly && canJudge;
  // None holds (M30): how many are judged to fail then, beside the rows that cannot be judged.
  const noneHold = filterOn && counts.holds === 0 && counts.not > 0;
  const filtered = filterOn ? alts.filter((a) => stateOf(a) !== 'not') : alts;
  // Core's order as it is (closest first, warned ones after; nothing asks).
  const shown = all ? filtered : filtered.slice(0, SHOWN);
  // Plants already in the palette that do every job of this one (board Swap: "Already in your palette").
  const already = store.memberTaxa.value.filter((m) => m.id !== id && jobsOf(t).length > 0 && jobsOf(t).every((j) => jobsOf(m).includes(j)));
  const memberJobs = jobsOf(t);
  const swap = (x: Taxon) => { closeSheet(); swapMember(id, x.id); };
  const beside = (x: Taxon, warned: boolean) => { closeSheet(); addMembers([x.id], {}, { warned: warned ? [x.id] : [], text: T('palette.added', { name: nameOf(x) }) }); };
  // Why one might swap it: its warnings in words, else its fit when it is not a plain fit.
  const why = flagLines(t, store.flagsOfPlant(t), scene);
  const own = store.memberVerdicts.value?.get(id) ?? null;
  // Its light only when it differs from the member's (board Swap: a row in the member's light shows its size only).
  const ownLight = lightWords(t).growsIn;
  const row = (a: Alternative, far = false) => {
    const x = byId.get(a.id);
    if (!x) return null;
    const lines = flagLines(x, a.flags, scene);
    const v = verdicts?.get(x.id) ?? null;
    const y = yearsOf(x);
    // One sentence (board Swap): the jobs it does, its years against the member's ("and stands to year
    // 25", "to year 3 only"; core swapYearsLine), and what it does to the palette's holes.
    const gaps = gapLines(a.fills, a.leaves);
    const gap = [gaps.fills, gaps.leaves].filter((l) => !!l).map((l) => say(l!)).join('; ');
    const years = y ? say(swapYearsLine(yearsOf(t), y)) : T('timingUnknown');
    const does = gap ? T('swap.rowGap', { does: doesWords(memberJobs, a.sharedJobs), years, gap }) : T('swap.row', { does: doesWords(memberJobs, a.sharedJobs), years });
    const band = v ? rowBandOf(v, store.laterVerdictOf(x, v), periodName) : null;
    const growsIn = lightWords(x).growsIn;
    return (
      <AltRow key={a.id} t={x} name={nameOf(x)} fills={!!gaps.fills} flagged={far || a.flags.length > 0} does={gaps.fills ? <strong>{CHECK}{does}</strong> : does} actions={<>
        <button type="button" class="button button-secondary" aria-label={T(far ? 'swap.anywayFor' : 'swap.for', { name: nameOf(x) })} onClick={() => swap(x)}>{SWAP}{T(far ? 'swap.swapAnyway' : 'details.swap')}</button>
        <button type="button" class="ct-link-button" aria-label={T(far ? 'swap.addAnywayFor' : 'swap.besideFor', { name: nameOf(x) })} onClick={() => beside(x, far || a.flags.length > 0)}>{T(far ? 'addAnyway' : 'swap.addBeside')}</button>
      </>}>
        <span class="ct-line" data-swap-size>{growsIn !== ownLight ? <>{growsIn} · </> : null}{sizeShort(x)}</span>
        <span class="ct-line ct-swap-status" data-conf={v ? undefined : 'not-checked'}>{band ? <RowBandLine b={band} /> : <FitLine v={v} known={far ? 'outside' : undefined} />}</span>
        {!far && canJudge && stateOf(a) === 'unknown' && <span class="ct-line ct-muted" data-conf="not-checked" data-hold-unknown>{T('swap.holdUnknown', { period: periodName(HOLD_PERIOD) })}</span>}
        {lines.length > 0 && <span class="ct-line ct-swap-flags">{lines.map((l) => <span class="ct-flag" data-level={l.level ?? 'warning'}>{WARN}{l.chip ?? l.text}</span>)}</span>}
      </AltRow>
    );
  };
  const country = store.flagContext.value.country ?? null;

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
          {why.map((l) => (l.kind === 'invasive' && country
            ? <span class="ct-flag" data-level="warning" data-chip="invasive">{INVASIVE}{T('chip.invasiveIn', { country: countryName(country) })}</span>
            : <span class="ct-flag" data-level={l.level ?? 'warning'}>{WARN}{l.chip ?? l.text}</span>))}
          {own && own.level !== 'fits' && <FitLine v={own} head />}
          <span>{memberJobs.length ? P('swap.headJobs', memberJobs.length, { jobs: jobList(memberJobs), span: yearsOf(t) ? say(whenLine(yearsOf(t)!.from, yearsOf(t)!.to)) : T('timingUnknown') }) : T('swap.headNoJobs', { span: yearsWords(t) })}</span>
        </div>
        <NotChecked ctx={store.flagContext.value} />
      </div>
      {algo && canJudge && (
        <label class="ct-check ct-swap-hold">
          <input type="checkbox" checked={holdOnly} onChange={(e) => setHoldOnly((e.target as HTMLInputElement).checked)} />
          <span>{T('swap.holdsOnly', { period: periodName(HOLD_PERIOD) })}</span>
          <span class="ct-muted ct-swap-hold-count">{T('swap.holdsCount', { n: counts.holds, m: alts.length })}{counts.unknown > 0 && <> · {P('swap.holdsUnknownCount', counts.unknown)}</>}</span>
        </label>
      )}
      {algo && noneHold && <p class="ct-muted" data-swap-none data-hold-none>{P('swap.noneHold', counts.not, { period: periodName(HOLD_PERIOD) })}</p>}
      {!algo ? <LoadFailed /> : shown.length || already.length ? (
        <ul class="ct-rows">
          {shown.map((a) => row(a))}
          {already.map((m) => <li data-swap-already data-plant-id={m.id}><div class="ct-swap-text"><div class="ct-row-main"><strong>{nameOf(m)}</strong> <i class="ct-sci">{m.canonical_name}</i></div><p class="ct-swap-does">{yearsOf(m)?.to != null ? P('swap.alreadyTo', memberJobs.length, { to: yearsOf(m)!.to! }) : T('swap.already', { span: yearsWords(m) })}</p></div></li>)}
        </ul>
      ) : !noneHold && <p class="ct-muted" data-swap-none>{T('swap.none')}</p>}
      {algo && (
        <p class="ct-small ct-swap-more">
          {T('swap.closestFirst')}
          {filtered.length > shown.length || (filterOn && filtered.length < alts.length) ? <> <button type="button" class="ct-link-button" onClick={() => { setAll(true); setHoldOnly(false); }}>{P('swap.seeAll', alts.length)}</button></> : null}
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
