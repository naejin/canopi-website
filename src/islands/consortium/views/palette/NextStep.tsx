/** @jsxImportSource preact */
// The Next step (boards Main, Palette, AddMany, Many, HoleOpen, Empty; v14 spec pf-a): one card for the
// engine's next target (core holes.ts nextTarget: the first open hole not put off, else the first thin
// spot), its position ("hole 1 of 7 · then 5 thin spots", "thin spot 1 of 5 · you want 2 · Change"),
// its title in one form, the plants that fill it best first (core fillers: fits, Mildly toxic among
// them, R1), then "Needs a second look (n)", then the outside ones folded behind "Show N outside their
// climate range"; each group a MoreList (the size rule, A14). The bulk row (A1, whenever a plant fits)
// adds what core bestToAdd takes ("Add the 2 that fit best") or every fit; its toast says what the add
// did through core holeChange/thinChange words. "See all N plants" opens Find for the hole; "Not now"
// puts it off (this page only). Then the other holes, each with Find. No plant fits: "No plant on your
// lists fits your place and does this then.", "See the N outside their range", "Not now", no bulk
// button (F17). An untouched suggestion shows its thin spots as a count only (A19). A warned plant is
// never dropped (inform, don't block; owner 2026-11-14).
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Hole, JobId, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { bestToAdd, fillReasonLine, fillers, fills, holeChangeLines, jobsOf, nextTarget, periodIds, periodName, roomNote, thinKey, thinTitleLine, yearsLine, yearsOf, type HoleChange, type ThinChange } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusNextStep, focusSoon } from '../../focus.ts';
import { formatLength } from '../../format.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import { nameOf, P, pageLang, T } from '../../strings.ts';
import { FitLine, holeWords, midSentence, say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { WARN } from '../kit/icons.tsx';
import { MoreList } from '../kit/more.tsx';

// What Find opens for (board FillHole): the hole or thin spot itself (its plants, its words as the
// title) and its job.
export const openFillers = (h: Hole): void => store.openFind({ hole: h, fits: (t: Taxon) => fills(h, t), job: h.job ?? null });

// A row's words, shared with Find's rows (one owner): its jobs, "Also …" after the job it is listed
// for (board FillHole, T15), and its size ("1 m wide, 2.5 m tall").
export function rowRoles(jobs: readonly JobId[], also: boolean): string {
  const list = jobs.map((j, i) => (i > 0 || also ? midSentence(T(`job.${j}`)) : T(`job.${j}`))).join(', ');
  return also && list ? T('find.also', { jobs: list }) : list;
}
export function rowSize(t: Taxon): string {
  const lang = pageLang(), w = t.traits.width_max_m, h = t.traits.height_m?.max ?? null;
  const W = w === null ? '' : formatLength(w, lang), H = h === null ? '' : formatLength(h, lang);
  return w !== null && h !== null ? T('find.sizeBoth', { w: W, h: H }) : h !== null ? T('find.sizeTall', { h: H }) : w !== null ? T('find.sizeWide', { w: W }) : T('find.sizeNone');
}

// A row's years in the boards' words ("first year", "month 3 to year 3", "year 1 to year 25", "from
// year 15 on"): core yearsLine for the first years and months, the row's own form after.
export function rowSpan(t: Taxon): string | null {
  const y = yearsOf(t);
  if (!y) return null;
  if (y.from >= 1 && y.to === null) return T('palette.next.spanFrom', { from: y.from });
  if (y.from >= 1 && y.to !== null) return T('palette.next.spanBetween', { from: y.from, to: y.to });
  return midSentence(say(yearsLine(y.from, y.to)));
}

// The toast of an add from the Next step: what joined, then what it did to the hole it was added for
// (BC6: that hole only, as it is now; the others it narrowed are not listed) and, on a thin spot, to
// its job (holeChangeLines; an add opens no hole, so "No new hole." is left out). A row's Add:
// "Pineapple added. Covers the ground: nobody after year 15."; the bulk row (many): "2 plants added: Pinto
// peanut, Pineapple. Covers the ground: nobody after year 25. 7 holes left." (board AddMany).
export function addedWords(names: readonly string[], c: HoleChange, thins: ThinChange, job: JobId | null, many = names.length > 1, target: Hole | null = null): string {
  const head = many ? P('palette.next.addedMany', names.length, { names: names.join(', ') }) : T('palette.added', { name: names[0] });
  const lines = holeChangeLines(c, { left: many, thins, jobs: job ? [job] : [], target: target && !target.thin ? target : null }).filter((l) => !l.key.endsWith('.holesNoNew'));
  return [head, ...lines.map(say)].join(' ');
}

// The double tap (F19): a second tap within the window adds nothing, whatever the card shows by then.
const TAP_MS = 800;
let lastBulk = 0;

const NONE: readonly Taxon[] = [];
const isOpen = (h: Hole) => h.state === 'open';

function Card({ children, hole }: { children: ComponentChildren; hole?: string }) {
  return <section class="ct-next" aria-labelledby="ct-next-t" data-hole={hole}>{children}</section>;
}
// The room card (board Balcony): with "Balcony or pots", what room does and does not do, first in the
// card; never a filter (a plant taller than 6 m carries its note on its row).
const RoomCard = () => (store.room.value === 'pots' ? <p class="ct-next-room" data-next-room="">{T('palette.next.roomPots')}</p> : null);
const Title = ({ count }: { count?: ComponentChildren }) => <h3 id="ct-next-t" tabIndex={-1}>{T('palette.nextTitle')}{count && <> <span class="ct-next-count" data-next-position="">{count}</span></>}</h3>;

export function NextStep({ holes, members }: { holes: readonly Hole[]; members: readonly Taxon[] }) {
  const skip = store.notNow.value;
  const untouched = store.untouchedSuggestion.value;
  const thins = store.thinSpots.value;
  const goal = store.paletteGoals.value.plantsPerJob;
  const open = useMemo(() => holes.filter(isOpen), [holes]);
  const openThins = useMemo(() => thins.filter(isOpen), [thins]);
  // A19: an untouched suggestion is never offered a thin spot, only its count.
  // The whole list, outside-range plants included (folded, never hidden); nothing from a borrowed list
  // not fitted to a place (store.offerPool; the head says why).
  const pool = store.offerPool.value ?? NONE;
  const [showOutside, setShowOutside] = useState<string | null>(null);
  const pv = store.poolVerdicts.value;
  // C5: a cooler-months food hole leads when plants that fit (no second look) fill it (core rankedHoles).
  const hasFits = (h: Hole) => { const ids = new Set(members.map((t) => t.id)); return pool.some((t) => !ids.has(t.id) && fills(h, t) && pv?.get(t.id)?.level === 'fits' && !store.warnedPlant(t)); };
  const lead = nextTarget(holes, untouched ? [] : thins, skip, hasFits);
  const next = lead?.target ?? null;
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const flagCtx = store.flagContext.value;
  const found = useMemo(() => {
    if (!next) return null;
    const ids = new Set(members.map((t) => t.id));
    const cands = pool.filter((t) => !ids.has(t.id) && fills(next, t));
    const last = periodIds[periodIds.length - 1];
    const holds = new Map<PlantId, boolean>(rule ? cands.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : []);
    const warned = new Set(cands.filter((t) => store.warnedPlant(t)).map((t) => t.id));
    return { ...fillers(next, cands, pv ?? new Map(), holds, warned, members, open), warned, holds, judged: !!rule };
  }, [next, pool, pv, rule, ctx, flagCtx, members, open]);

  // Empty: no member at all; plants of a guest list still loading or that failed are members too, only
  // not read yet (review r2 empty-1), so the branches after this one say so.
  if (!store.members.value.length) {
    // Empty (board Empty): the three ways in as rows, each with what it does, then when the pictures
    // come (the place's count line is a hand-off: PFA4/PFA5).
    const row = (id: string, label: string, sub: string, run: () => void, entry?: string) => (
      <li><button type="button" class="ct-next-way" data-find-entry={entry} aria-label={label} aria-describedby={`ct-way-${id}`} onClick={run}><span class="ct-next-way-label">{label}</span><span class="ct-next-way-sub" id={`ct-way-${id}`}>{sub}</span></button></li>
    );
    return (
      <section class="ct-next" aria-labelledby="ct-next-t" data-empty="">
        <h3 id="ct-next-t" tabIndex={-1}>{T('palette.next.emptyTitle')}</h3>
        <p>{T('palette.next.emptyLine')}</p>
        <ul class="ct-next-ways">
          {row('find', T('find.findPlants'), T('palette.next.emptyFindSub'), () => store.openFind(), 'empty')}
          {row('paste', T('start.paste'), T('palette.next.emptyPasteSub'), () => store.openSheet('paste'))}
          {row('small', T('palette.next.emptySmall'), T('palette.next.emptySmallSub'), () => requestSuggest())}
        </ul>
        <p class="ct-muted ct-small">{T('palette.next.emptyPictures')}</p>
      </section>
    );
  }
  // A guest list that could not be read: its plants may fill a hole, so no hole is named (PP-B21).
  if (store.failedMembers.value.length) return <Card><Title /><p class="status-line">{T('palette.holesListMissing')}</p></Card>;
  // F18 (first: the check waits, whatever else loads): until the fit check is here no hole is named and no bulk add offered (never named, then flipped).
  if (!store.verdictsReady.value || (!store.memberVerdicts.value && !store.verdictFailed.value)) return <Card><Title /><p class="status-line">{T('palette.next.checking')}</p></Card>;
  if (store.guestsPending.value.length || store.missingMembers.value.loading.length) {
    return <Card><Title /><p class="status-line">{T('palette.holesPending')}</p></Card>;
  }
  if (!next || !found || !lead) {
    return (
      <Card>
        <Title count={openThins.length ? P('palette.next.thinCount', openThins.length) : undefined} />
        <RoomCard />
        <p>{T('palette.noHoles')}</p>
        {skip.size > 0 && <p><button type="button" class="button button-secondary" onClick={() => { store.notNow.value = new Set(); }}>{T('palette.showPutOff')}</button></p>}
      </Card>
    );
  }
  const thin = !!next.thin;
  const fits = [...found.fits, ...found.unknown];
  // BC3: "See all N" counts what Find lists before its "Show N outside": fits, second looks, unchecked.
  const all = found.fits.length + found.look.length + found.unknown.length;
  const doing = all + found.outside.length;
  // R3, BC4: no plant to offer only when none fits, needs a second look or is unchecked.
  const noFit = all === 0;
  const others = open.filter((h) => h.id !== next.id && !skip.has(h.id));
  const best = bestToAdd(next, found, store.paletteGoals.value);
  const allFits = found.fits.map((t) => t.id);
  const size = members.length;
  const lines = (t: Taxon) => flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const byId = (id: PlantId) => found.fits.find((x) => x.id === id);
  // R4: one "warned" predicate, the store's (store.warnedPlant: a second look); a mark such as Mildly
  // toxic is said on the row and in the bulk note, never as an "added with a warning" tail.
  const warnedOf = (ids: readonly PlantId[]) => ids.filter((id) => { const t = byId(id); return !!t && store.warnedPlant(t); });
  // C3, BC19, R8: each bulk button's note names what it adds and the marks it carries, in words.
  const marked = (ids: readonly PlantId[]) => ids.map(byId).filter((t): t is Taxon => !!t).map((t) => ({ t, kinds: lines(t).map((l) => l.chip ?? l.text) })).filter((m) => m.kinds.length > 0);
  const bulk = (ids: PlantId[], e: MouseEvent) => {
    const now = Date.now();
    if (e.detail > 1 || now - lastBulk < TAP_MS) return;
    lastBulk = now;
    const names = ids.map((id) => found.fits.find((t) => t.id === id)).filter((t): t is Taxon => !!t).map(nameOf);
    store.addMembers(ids, {}, { warned: warnedOf(ids), text: (r) => addedWords(names, r.holeChange, r.thinChange, thin ? next.job ?? null : null, true, next) });
    focusNextStep();
  };
  const putOff = () => { store.notNow.value = new Set([...skip, thin && next.job ? thinKey(next.job) : next.id]); };
  const outsideOpen = showOutside === next.id;
  const seeOutside = () => { setShowOutside(next.id); focusSoon(() => document.querySelector<HTMLElement>('.ct-next [data-outside] li button') ?? document.getElementById('ct-next-t')); };
  const filler = (t: Taxon) => <Filler t={t} v={pv?.get(t.id)} hole={next} open={open} />;
  const position = thin
    ? <>{T('palette.next.thinOf', { i: lead.index, n: lead.of })} · {T('palette.next.youWant', { n: goal })} · <button type="button" class="text-link" data-next-change="" onClick={() => focusSoon(() => document.getElementById('ct-plants-per-job'))}>{T('palette.next.change')}</button></>
    : `${T('palette.holeOf', { i: lead.index, n: lead.of })} · ${openThins.length ? P(untouched ? 'palette.next.thinCount' : 'palette.next.thenThin', openThins.length) : T('palette.next.noThin')}`;
  const bestNames = best.map(byId).filter((t): t is Taxon => !!t).map(nameOf).join(', ');
  const have = thin && next.thin ? next.thin.have : 0;
  const picks = thin ? T('palette.next.bulkPicksThin', { n: best.length, want: goal, have, names: bestNames }) : T('palette.next.bulkPicksHole', { n: best.length, names: bestNames });
  const bestMarks = marked(best);
  const moreMarks = marked(allFits.filter((id) => !best.includes(id))).length;
  // BC2, C2: why this hole matters, then how many plants on the lists do it then, by fit, and how many
  // of those that fit stay in their climate range to the last period.
  const why = next.kind === 'job' && next.job ? T(`palette.next.why.${next.job}`) : next.kind === 'light' && next.stratum ? T(`palette.next.why.light_${next.stratum}`) : '';
  const counts = [
    found.fits.length ? P('palette.next.countFits', found.fits.length) : '',
    found.look.length ? P('palette.next.countLook', found.look.length) : '',
    found.outside.length ? P('palette.next.countOutside', found.outside.length) : '',
    found.unknown.length ? P('palette.next.countUnchecked', found.unknown.length) : '',
  ].filter(Boolean).join(', ');
  const holding = found.fits.filter((t) => found.holds.get(t.id)).length;
  const period = periodName(periodIds[periodIds.length - 1]);
  const hold = !found.fits.length || !found.judged ? '' : holding === found.fits.length ? P('palette.next.holdAll', found.fits.length, { period }) : P('palette.next.holdSome', holding, { n: found.fits.length, period });
  const whySentence = [why, doing ? `${P('palette.next.countsHead', doing)} ${counts}.` : '', hold].filter(Boolean).join(' ');
  return (
    <Card hole={next.id}>
      <Title count={position} />
      <RoomCard />
      <h4 class="ct-next-hole" data-next-title="">{thin ? say(thinTitleLine(next)) : holeWords(next)}</h4>
      {whySentence && <p class="ct-next-why" data-next-why="">{whySentence}</p>}
      {fits.length > 0 && <MoreList items={fits} keyOf={(t) => t.id} render={filler} paletteSize={size} class="ct-fillers" />}
      {noFit && <p data-next-nofit="">{T('palette.next.noFit')}{found.outside.length > 0 && <> {P('palette.next.noFitOutside', found.outside.length)}</>}</p>}
      {found.look.length > 0 && (
        <>
          <h4 class="ct-fillers-head">{WARN} {T('palette.secondLook', { n: found.look.length })}</h4>
          <MoreList items={found.look} keyOf={(t) => t.id} render={filler} paletteSize={size} class="ct-fillers" />
        </>
      )}
      {found.outside.length > 0 && outsideOpen && <div data-outside=""><MoreList items={found.outside} keyOf={(t) => t.id} render={filler} paletteSize={size} class="ct-fillers" /></div>}
      {found.fits.length > 0 && (
        <>
          <p class="ct-next-bulk" data-next-bulk="">
            <button type="button" class="button button-primary" aria-describedby="ct-next-picks" onClick={(e) => bulk(best, e)}>{P('palette.next.addBest', best.length)}</button>
            {/* C13: the second button only when it adds more than the first. */}
            {allFits.length > best.length && <button type="button" class="button button-secondary" onClick={(e) => bulk(allFits, e)}>{P(thin ? 'palette.next.addAllThin' : 'palette.next.addAllHole', allFits.length)}</button>}
          </p>
          <p class="ct-muted ct-small" id="ct-next-picks" data-next-bulk-note="">{picks}{bestMarks.map((m) => <> {T('palette.next.bulkMark', { name: nameOf(m.t), kinds: m.kinds.join(', ') })}</>)}{allFits.length > best.length && moreMarks > 0 && <> {P('palette.next.bulkMarkMore', moreMarks)}</>}</p>
        </>
      )}
      {found.fits.length > 0 && found.outside.length > 0 && !outsideOpen && <p class="ct-next-bulk"><button type="button" class="button button-secondary" onClick={seeOutside}>{P('palette.showOutside', found.outside.length)}</button></p>}
      <p class="ct-next-actions">
        {noFit && found.outside.length > 0 && !outsideOpen && <button type="button" class="button button-secondary" onClick={seeOutside}>{P('palette.next.seeOutside', found.outside.length)}</button>}
        {thin
          ? <button type="button" class="button button-secondary" onClick={() => openFillers(next)}>{T('palette.next.findBackup')}</button>
          : all > 0 && <button type="button" class="button button-secondary" data-next-seeall="" onClick={() => openFillers(next)}>{P('palette.seeAll', all)}</button>}
        <button type="button" class="button button-secondary" onClick={putOff}>{T('palette.notNow')}</button>
      </p>
      {others.length > 0 && (
        <section class="ct-other-holes" aria-labelledby="ct-other-holes-t">
          <h4 id="ct-other-holes-t">{T('palette.next.otherHoles')} <span class="ct-next-count">{others.length}</span></h4>
          <MoreList items={others} keyOf={(h) => h.id} paletteSize={size}
            render={(h) => <>{holeWords(h)} <button type="button" class="button button-secondary" onClick={() => openFillers(h)}>{T('palette.find')}</button></>} />
        </section>
      )}
    </Card>
  );
}

// One plant that fills the target: its name, its fit in words with an icon, what else it does, its
// years and size ("Also makes mulch · first year · 20 cm wide, 90 cm tall"), its warnings in words
// with the warning icon, and Add (one tap, nothing asks; the toast names it and what it did to the
// holes, with Undo). Its row leaves as it joins, so the focus goes to the Next step's title.
function Filler({ t, v, hole, open }: { t: Taxon; v: PlantVerdict | undefined; hole: Hole; open: readonly Hole[] }) {
  const lines = flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const add = () => {
    store.addMembers([t.id], {}, { warned: store.warnedPlant(t) ? [t.id] : [], text: (r) => addedWords([nameOf(t)], r.holeChange, r.thinChange, hole.thin ? hole.job ?? null : null, false, hole) });
    focusNextStep();
  };
  // BC1, BC26, C4: the fit reason first, one line (what it does for the target and when, how many holes
  // it fills; on a thin job "a backup"), then what else it does and its size (the years are in the reason).
  const light = hole.kind === 'job' ? open.find((h) => h.kind === 'light' && fills(h, t))?.stratum ?? null : null;
  const reason = say(fillReasonLine(hole, yearsOf(t), { light, holes: store.holeFillCount(t) }));
  const own = jobsOf(t), drop = hole.job && own.includes(hole.job) ? hole.job : null;
  const meta = [rowRoles(own.filter((j) => j !== drop), !!drop), rowSize(t)].filter(Boolean).join(' · ');
  const room = roomNote(t.traits.height_m?.max ?? null, store.room.value);
  return (
    <div class="ct-filler" data-filler-id={t.id}>
      <span class="ct-filler-name">{nameOf(t)} <i lang="la">{t.canonical_name}</i></span>
      <span class="ct-line" data-filler-reason="">{reason}</span>
      <FitLine v={v} />
      <span class="ct-line" data-filler-meta="">{meta}</span>
      {room && <span class="ct-line" data-room-note="">{say(room)}</span>}
      {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
      <button type="button" class="button button-primary" aria-label={T('palette.addNamed', { name: nameOf(t) })} onClick={add}>{T('palette.add')}</button>
    </div>
  );
}
