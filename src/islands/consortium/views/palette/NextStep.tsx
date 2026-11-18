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
import type { Fillers, Hole, JobId, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { bestToAdd, dryIntroLine, edgeChipLine, fillReasonLine, fillers, fills, holeChangeLines, jobsOf, nextTarget, noneFits, periodIds, periodName, roomNote, thinKey, thinTitleLine, uncheckedLine, yearsLine, yearsOf, JUDGED_FROM_YEAR, JUDGED_TO_YEAR, type HoleChange, type ThinChange } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusNextStep, focusSoon } from '../../focus.ts';
import { formatLength } from '../../format.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import { nameOf, P, pageLang, T } from '../../strings.ts';
import { FitLine, holeWords, midSentence, say } from '../kit/fit.tsx';
import { flagLines, invasiveChip, type Line as FlagLine } from '../kit/flags.ts';
import { WARN } from '../kit/icons.tsx';
import { MoreList } from '../kit/more.tsx';
import { coords, countryName, listName, num } from '../kit/names.ts';
import { countKind } from '../../rules/suggest-block.ts';

// A plant's short marks as chips (boards Main, Palette, FillHole, FindResults; word map rows 89, 103):
// the warning icon and a few words ("Mildly toxic", "Recorded invasive in Kenya", "Near the edge of
// its range") in the warning or danger token, never colour alone; the full sentence stays in Details.
// The Next step's rows, Find's rows and Paste's rows all draw them here (views/find/marks.tsx passes it
// on), so a mark reads the same everywhere. A site misfit or a conflict keeps its sentence: it names
// its reason. `edge`: the plant needs a second look for its range edge (its verdict's level), said as
// the chip "Near the edge of its range" (BC11), the group heading already saying "Needs a second look".
const markWords = (t: Taxon, l: FlagLine, country: string | null): string =>
  l.kind === 'toxicity' && t.warnings.toxicity ? T(`tox.${t.warnings.toxicity.level}`)
    : l.kind === 'invasive' && country ? T('find.invasiveShort', { country: countryName(country) })
      : l.text;
export function Marks({ t, lines, country, edge = false }: { t: Taxon; lines: readonly FlagLine[]; country: string | null; edge?: boolean }) {
  if (!lines.length && !edge) return null;
  return (
    <span class="ct-find-marks">
      {edge && <span class="ct-find-mark" data-kind="edge" data-level="warning">{WARN} {say(edgeChipLine())}</span>}
      {lines.map((l) => (
        <span class="ct-find-mark" data-kind={l.kind} data-level={l.level ?? (l.kind === 'invasive' ? 'danger' : 'warning')}>
          {WARN} {markWords(t, l, country)}
        </span>
      ))}
    </span>
  );
}

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

// The Next step's frame (boards Main, DarkMain, Palette, AddMany; BC14, BC15, BC21): the card in its
// ochre frame, then the Other holes card under it, both in the one grid cell the palette gives the
// Next step (palette-page.css places `.ct-next`).
function Card({ children, hole, after }: { children: ComponentChildren; hole?: string; after?: ComponentChildren }) {
  return (
    <div class="ct-next ct-next-stack" data-hole={hole}>
      <RoomNote />
      <section class="ct-next-card" aria-labelledby="ct-next-t">{children}</section>
      {after}
    </div>
  );
}
// The room note (board Balcony; BC32): with "Balcony or pots", what room does and does not do, a note
// with the pot mark above the Next step card, never inside it; never a filter (a plant taller than 6 m
// carries its note on its row).
const POT = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8h10l-1.3 8H6.3ZM4 8h12M10 8V4.5M10 6c1-2 2.5-2.5 4-2.5M10 6.5C9 5 8 4.5 6.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>;
const RoomNote = () => (store.room.value === 'pots' ? (
  <p class="ct-next-room" data-next-room="">
    <span class="ct-next-room-mark">{POT}</span>
    <span><b>{T('palette.next.roomPotsTitle')}</b> {T('palette.next.roomPotsLine')} <b>{T('palette.next.roomPotsNoData')}</b> {T('palette.next.roomPotsSoil')}</span>
  </p>
) : null);
// The card's head (BC14): the small "Next step" label, the position on the same line at the right
// (each part kept whole, so a long language breaks between parts only), then the target's title.
const Title = ({ count }: { count?: ComponentChildren }) => (
  <div class="ct-next-head">
    <h3 id="ct-next-t" class="ct-next-label" tabIndex={-1}>{T('palette.nextTitle')}</h3>
    {count && <span class="ct-next-count" data-next-position="">{count}</span>}
  </div>
);
const Part = ({ children }: { children: ComponentChildren }) => <span class="ct-next-part">{children}</span>;
// The add mark (boards Main, FindResults: "+ Add"); the word carries the meaning.
export const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const TICK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

// The Empty board's marks (search, page, leaf, info) and the ways' chevron; the words carry the meaning.
const svg = (d: ComponentChildren, size = 20) => <svg class="ct-glyph" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{d}</svg>;
const SEARCH_MARK = svg(<><circle cx="8.5" cy="8.5" r="5" /><path d="M12.3 12.3l4.2 4.2" /></>, 22);
const PAGE_MARK = svg(<path d="M5.5 3h6l3.5 3.5V17h-9.5ZM11.5 3v3.5H15" />, 22);
const LEAF_MARK = svg(<path d="M4 16c0-7 4-11 12-12 0 8-4 12-11 12ZM4 16l7-7" />, 22);
const INFO_MARK = svg(<><circle cx="10" cy="10" r="7" /><path d="M10 9v4.5M10 6.5v.2" /></>, 14);
const CHEVRON = svg(<path d="M7.5 5l5 5-5 5" />, 16);

// The Empty note's count line (board Empty: "305 of the 515 plants on the three nearest lists fit near
// Kiambu today."): the place's verdicts over the chosen climate's list (store.countFits), the place
// named, the period named when it is not today. While the check loads it says so, never "0 of M";
// refused, how many plants the list holds, no fit claimed; no place with a climate, nothing (no fit
// can be claimed); none fit or none checked, the place count's own words (rules/suggest-block.ts
// countKind: never "0 of m").
function EmptyCount() {
  const zone = store.climate.value, loc = store.location.value;
  if (!zone || !loc || !store.siteClimate.value) return null;
  const n = store.countFits.value, pool = store.pool.value;
  if (!n) {
    if (store.verdictFailed.value) return pool ? <> {P('find.lede', pool.length, { list: listName(zone) })}.</> : null;
    return <> {T('place.count.checking')}</>;
  }
  const own = store.curatedClimates.value.includes(zone), p = store.period.value, later = p !== periodIds[0];
  const vars = { total: num(n.of), list: listName(zone), period: periodName(p), place: (loc.label ?? coords(loc.lat, loc.lon)).split(',')[0].trim() };
  const kind = countKind(n);
  const text = kind === 'unchecked' ? P(own ? 'place.count.uncheckedOwn' : 'place.count.unchecked', n.unknown, vars)
    : kind === 'none' ? T(own ? (later ? 'place.count.noneOwnLater' : 'place.count.noneOwn') : later ? 'place.count.noneLater' : 'place.count.none', vars)
      : P(own ? (later ? 'palette.next.emptyCountOwnLater' : 'palette.next.emptyCountOwn') : later ? 'palette.next.emptyCountLater' : 'palette.next.emptyCount', n.fits + n.look, vars);
  return <> {text}</>;
}

// The plants on the lists that fill a hole (core fillers), with the inputs the Next step reads: the
// offer list less the palette, the verdicts, holding to the last period, the store's one second-look
// rule. The one count source (BC25): the Next step's card, its other holes and Find's hole rows all
// read it, so a hole's "N plants" is the same number everywhere.
export function holeFillers(h: Hole, members: readonly Taxon[], open: readonly Hole[]): Fillers & { warned: ReadonlySet<PlantId>; holds: ReadonlyMap<PlantId, boolean>; judged: boolean } {
  const ids = new Set(members.map((t) => t.id));
  const cands = (store.offerPool.value ?? NONE).filter((t) => !ids.has(t.id) && fills(h, t));
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const last = periodIds[periodIds.length - 1];
  const holds = new Map<PlantId, boolean>(rule ? cands.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : []);
  const warned = new Set(cands.filter((t) => store.warnedPlant(t)).map((t) => t.id));
  return { ...fillers(h, cands, store.poolVerdicts.value ?? new Map(), holds, warned, members, open), warned, holds, judged: !!rule };
}

// A hole as a row (boards Main "Other holes", Find "Your palette has 7 holes"; BC21, BC23): a dashed
// box with the add mark, the hole's lane in bold ("Covers the ground:"), the rest of its title, and at
// the right what it opens, in ochre ("Find", "7 plants").
export function HoleRow({ h, end, onClick, extra, attrs = {} }: { h: Hole; end: string; onClick: () => void; extra?: string | null; attrs?: Record<string, string> }) {
  const words = holeWords(h), at = words.search(/[:：]/);
  return (
    <button type="button" class="ct-hole-row" onClick={onClick} {...attrs}>
      {PLUS}
      <span class="ct-hole-row-text">{at > 0 ? <><b>{words.slice(0, at + 1)}</b>{words.slice(at + 1)}</> : words}{extra && ` · ${extra}`}</span>
      <b class="ct-hole-row-end">{end}</b>
    </button>
  );
}

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
  const found = useMemo(() => (next ? holeFillers(next, members, open) : null), [next, pool, pv, rule, ctx, flagCtx, members, open]);

  // Empty: no member at all; plants of a guest list still loading or that failed are members too, only
  // not read yet (review r2 empty-1), so the branches after this one say so.
  if (!store.members.value.length) {
    // Empty (board Empty; BC33): a card with the three ways in as bordered buttons, each with its mark
    // (search, page, leaf), its label in ink, what it does and a chevron; under the card, a note with
    // the info mark: when the pictures come, then the place's count line (EmptyCount).
    const way = (id: string, icon: ComponentChildren, label: string, sub: string, run: () => void, entry?: string, first = false) => (
      <li><button type="button" class={`ct-next-way${first ? ' is-first' : ''}`} data-find-entry={entry} aria-label={label} aria-describedby={`ct-way-${id}`} onClick={run}>
        <span class="ct-next-way-mark">{icon}</span>
        <span class="ct-next-way-text"><span class="ct-next-way-label">{label}</span><span class="ct-next-way-sub" id={`ct-way-${id}`}>{sub}</span></span>
        {CHEVRON}
      </button></li>
    );
    return (
      <div class="ct-next ct-next-stack" data-empty="">
        <section class="ct-next-card ct-next-emptycard" aria-labelledby="ct-next-t">
          <h3 id="ct-next-t" tabIndex={-1}>{T('palette.next.emptyTitle')}</h3>
          <p>{T('palette.next.emptyLine')}</p>
          <ul class="ct-next-ways">
            {way('find', SEARCH_MARK, T('find.findPlants'), T('palette.next.emptyFindSub'), () => store.openFind(), 'empty', true)}
            {way('paste', PAGE_MARK, T('start.paste'), T('palette.next.emptyPasteSub'), () => store.openSheet('paste'))}
            {way('small', LEAF_MARK, T('palette.next.emptySmall'), T('palette.next.emptySmallSub'), () => requestSuggest())}
          </ul>
        </section>
        <p class="ct-next-emptynote" data-next-emptynote="">{INFO_MARK} {T('palette.next.emptyPictures')}<EmptyCount /></p>
      </div>
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
        <p>{T('palette.noHoles')}</p>
        {skip.size > 0 && <p><button type="button" class="button button-secondary" onClick={() => { store.notNow.value = new Set(); }}>{T('palette.showPutOff')}</button></p>}
      </Card>
    );
  }
  const thin = !!next.thin;
  // BC3: "See all N" counts what Find lists before its "Show N outside": fits, second looks, unchecked.
  const all = found.fits.length + found.look.length + found.unknown.length;
  const doing = all + found.outside.length;
  // R3, BC4 (board Many, word map row 151): the no-fit state is decided by the group counts (core
  // noneFits): no plant that fits and none still to be checked. Each group has its own heading (fits,
  // "Needs a second look (n)", "Not checked (n)"), and "See all N" shows whenever N > 0; with none to
  // see, the outside link takes its place, as the board draws it.
  const noFit = noneFits(found);
  const others = open.filter((h) => h.id !== next.id && !skip.has(h.id));
  const best = bestToAdd(next, found, store.paletteGoals.value);
  const allFits = found.fits.map((t) => t.id);
  const size = members.length;
  const lines = (t: Taxon) => flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const byId = (id: PlantId) => found.fits.find((x) => x.id === id);
  // R4: one "warned" predicate, the store's (store.warnedPlant: a second look); a mark such as Mildly
  // toxic is said on the row and in the bulk note, never as an "added with a warning" tail.
  const warnedOf = (ids: readonly PlantId[]) => ids.filter((id) => { const t = byId(id); return !!t && store.warnedPlant(t); });
  // C3, BC19, R8: each bulk button's note names what it adds and the marks it carries, in their own
  // words ("Pineapple is mildly toxic and says so on its row."; board AddMany). A plant that fits carries
  // no second look (core fillers puts those under "Needs a second look"), so a mark here is a mark only.
  const kindsOf = (t: Taxon) => lines(t).map((l) => midSentence(l.chip ?? l.text));
  const marked = (ids: readonly PlantId[]) => ids.map(byId).filter((t): t is Taxon => !!t).map((t) => ({ t, kinds: kindsOf(t) })).filter((m) => m.kinds.length > 0);
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
  const lookFiller = (t: Taxon) => <Filler t={t} v={pv?.get(t.id)} hole={next} open={open} look />;
  // "Change" and "Change the 2" go to the Plants per job control (pf-b's Jobs card renders the id).
  const changeGoal = () => focusSoon(() => document.getElementById(PLANTS_PER_JOB_ID));
  const position = thin
    ? <><Part>{T('palette.next.thinOf', { i: lead.index, n: lead.of })}</Part> · <Part>{T('palette.next.youWant', { n: goal })}</Part> · <button type="button" class="text-link" data-next-change="" onClick={changeGoal}>{T('palette.next.change')}</button></>
    : <><Part>{T('palette.holeOf', { i: lead.index, n: lead.of })}</Part> · <Part>{openThins.length ? P(untouched ? 'palette.next.thinCount' : 'palette.next.thenThin', openThins.length) : T('palette.next.noThin')}</Part></>;
  const bestNames = best.map(byId).filter((t): t is Taxon => !!t).map(nameOf).join(', ');
  const have = thin && next.thin ? next.thin.have : 0;
  const picks = thin ? T('palette.next.bulkPicksThin', { n: best.length, want: goal, have, names: bestNames }) : T('palette.next.bulkPicksHole', { n: best.length, names: bestNames });
  const bestMarks = marked(best);
  // The others the second button adds, counted by mark ("Among the others, 2 are mildly toxic …").
  const moreMarks = new Map<string, number>();
  for (const m of marked(allFits.filter((id) => !best.includes(id)))) for (const k of new Set(m.kinds)) moreMarks.set(k, (moreMarks.get(k) ?? 0) + 1);
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
  // In the no-fit state the no-fit sentence says the counts (board Many).
  // BC31 (board SiteMendoza): where the listed candidates carry the dryness note, "Little rain falls
  // here: each plant says whether it may need watering." (core dryIntroLine, by the grower's watering).
  const dry = dryIntroLine([...found.fits, ...found.look].map((t) => pv?.get(t.id)));
  const whySentence = [why, doing && !noFit ? `${P('palette.next.countsHead', doing)} ${counts}.` : '', noFit ? '' : hold, dry && say(dry)].filter(Boolean).join(' ');
  // BC2: the members not checked that stand then, named while they are few (A14: 12 or fewer), so the
  // grower sees why the title says "nobody known" ("1 plant not checked: Napier grass.").
  const unchecked = uncheckedLine(next);
  const uncheckedNames = (next.unchecked ?? []).map((id) => members.find((t) => t.id === id)).filter((t): t is Taxon => !!t).map(nameOf);
  const uncheckedText = unchecked ? (uncheckedNames.length && uncheckedNames.length <= 12 ? T('palette.next.uncheckedNames', { line: say(unchecked), names: uncheckedNames.join(', ') }) : `${say(unchecked)}.`) : '';
  // BC5 (boards Many, ManyDesk): past the size rule's 40 plants the other holes are one sentence, each
  // hole with what fits it, then the thin spots or that there is none, with "Change the 2".
  const sentence = size > 40;
  const otherHoles = !sentence && others.length > 0 && (
    <section class="ct-other-holes" aria-labelledby="ct-other-holes-t">
      <h3 id="ct-other-holes-t">{T('palette.next.otherHoles')} <span class="ct-next-count">{others.length}</span></h3>
      <MoreList items={others} keyOf={(h) => h.id} paletteSize={size} render={(h) => <OtherHole h={h} members={members} open={open} />} />
    </section>
  );
  // The card's foot (board Main; BC17): its links, "See all N plants" (or "Find a backup", or the
  // outside ones) at the left, "Not now" at the right.
  const link = 'button ct-next-link';
  return (
    <Card hole={next.id} after={otherHoles}>
      <Title count={position} />
      <h4 class="ct-next-hole" data-next-title="">{thin ? say(thinTitleLine(next)) : holeWords(next)}</h4>
      {uncheckedText && <p class="ct-next-unchecked" data-next-unchecked="">{uncheckedText}</p>}
      {whySentence && <p class="ct-next-why" data-next-why="">{whySentence}</p>}
      {found.fits.length > 0 && <MoreList items={found.fits} keyOf={(t) => t.id} render={filler} paletteSize={size} class="ct-fillers" />}
      {noFit && <p data-next-nofit="">{T('palette.next.noFit')}{found.outside.length > 0 && <> {P('palette.next.noFitOutside', found.outside.length)}</>}</p>}
      {found.look.length > 0 && (
        <>
          <h4 class="ct-fillers-head">{WARN} {T('palette.secondLook', { n: found.look.length })}</h4>
          <MoreList items={found.look} keyOf={(t) => t.id} render={lookFiller} paletteSize={size} class="ct-fillers" />
        </>
      )}
      {/* R3: plants not checked were never judged, so they are not listed as fitting: their own group. */}
      {found.unknown.length > 0 && (
        <>
          <h4 class="ct-fillers-head" data-next-unchecked-head="">{T('palette.next.notCheckedHead', { n: num(found.unknown.length) })}</h4>
          <MoreList items={found.unknown} keyOf={(t) => t.id} render={lookFiller} paletteSize={size} class="ct-fillers" />
        </>
      )}
      {found.outside.length > 0 && outsideOpen && <div data-outside=""><MoreList items={found.outside} keyOf={(t) => t.id} render={filler} paletteSize={size} class="ct-fillers" /></div>}
      {found.fits.length > 0 && (
        <>
          <p class="ct-next-bulk" data-next-bulk="">
            <button type="button" class="button button-primary" aria-describedby="ct-next-picks" onClick={(e) => bulk(best, e)}>{PLUS} {P('palette.next.addBest', best.length)}</button>
            {/* C13: the second button only when it adds more than the first. */}
            {allFits.length > best.length && <button type="button" class="button button-secondary" onClick={(e) => bulk(allFits, e)}>{P(thin ? 'palette.next.addAllThin' : 'palette.next.addAllHole', allFits.length)}</button>}
          </p>
          <p class="ct-muted ct-small" id="ct-next-picks" data-next-bulk-note="">{picks}{bestMarks.map((m) => <> {T('palette.next.bulkMark', { name: nameOf(m.t), kinds: m.kinds.join(', ') })}</>)}{allFits.length > best.length && [...moreMarks].map(([k, n]) => <> {P('palette.next.bulkMarkMore', n, { kinds: k })}</>)}</p>
        </>
      )}
      <p class="ct-next-actions">
        <span class="ct-next-actions-start">
          {thin
            ? <button type="button" class={link} onClick={() => openFillers(next)}>{T('palette.next.findBackup')}</button>
            : all > 0 && <button type="button" class={link} data-next-seeall="" onClick={() => openFillers(next)}>{P('palette.seeAll', all)}</button>}
          {found.outside.length > 0 && !outsideOpen && <button type="button" class={link} onClick={seeOutside}>{noFit ? P('palette.next.seeOutside', found.outside.length) : P('palette.showOutside', found.outside.length)}</button>}
        </span>
        <button type="button" class={link} onClick={putOff}>{T('palette.notNow')}</button>
      </p>
      {sentence && <OthersSentence others={others} openThins={untouched ? [] : openThins} thinCount={openThins.length} goal={goal} members={members} open={open} change={changeGoal} />}
    </Card>
  );
}

// One other hole (board Main, "Other holes"): its row with Find; when few plants on the lists fill
// it, they are named under it with their marks ("1 plant fills it: Giant reed", the soft invasive chip).
const FEW = 3;
function OtherHole({ h, members, open }: { h: Hole; members: readonly Taxon[]; open: readonly Hole[] }) {
  const f = holeFillers(h, members, open);
  const few = [...f.fits, ...f.look, ...f.unknown];
  const country = store.flagScene.value.country;
  return (
    <>
      <HoleRow h={h} end={T('palette.find')} onClick={() => openFillers(h)} extra={uncheckedLine(h) ? say(uncheckedLine(h)!) : null} />
      {few.length > 0 && few.length <= FEW && (
        <p class="ct-hole-fillers" data-hole-fillers="">
          {P('palette.next.fillsIt', few.length)}{' '}
          {few.map((t, i) => {
            const soft = invasiveChip(t, country);
            return (
              <>
                {i > 0 && ', '}
                <button type="button" class="text-link ct-hole-filler" onClick={() => store.openSheet('details', t.id)}>{nameOf(t)}</button>
                <Marks t={t} lines={flagLines(t, store.flagsOfPlant(t), store.flagScene.value)} country={country} />
                {soft?.tone === 'soft' && <span class="ct-find-mark" data-kind="invasive-soft" data-level="soft">{soft.text}</span>}
              </>
            );
          })}
        </p>
      )}
    </>
  );
}

// One plant that fills the target: its name, its fit in words with an icon, what else it does, its
// years and size ("Also makes mulch · first year · 20 cm wide, 90 cm tall"), its warnings in words
// with the warning icon, and Add (one tap, nothing asks; the toast names it and what it did to the
// holes, with Undo). Its row leaves as it joins, so the focus goes to the Next step's title.
function Filler({ t, v, hole, open, look = false }: { t: Taxon; v: PlantVerdict | undefined; hole: Hole; open: readonly Hole[]; look?: boolean }) {
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
  // BC16 (boards Main, Palette): the row's words at the left, its outline "+ Add" at the right.
  return (
    <div class="ct-filler" data-filler-id={t.id}>
      <div class="ct-filler-text">
        <span class="ct-filler-name">{nameOf(t)} <i lang="la">{t.canonical_name}</i></span>
        <span class="ct-line ct-filler-reason" data-filler-reason="">{TICK} {reason}</span>
        <span class="ct-line" data-filler-meta="">{meta}</span>
        {room && <span class="ct-line" data-room-note="">{say(room)}</span>}
        {/* BC1 (board SiteMendoza): the fit word after the meta; under "Needs a second look" the group
            says it and the row's chips say why (BC11: "Near the edge of its range", BC12: "Toxic"). */}
        {!look && <FitLine v={v} />}
        <Marks t={t} lines={lines} country={store.flagScene.value.country} edge={look && v?.level === 'look'} />
      </div>
      <button type="button" class="button button-secondary ct-filler-add" aria-label={T('palette.addNamed', { name: nameOf(t) })} onClick={add}>{PLUS} {T('palette.add')}</button>
    </div>
  );
}

// The id of the Plants per job control ("Plants per job 1 2 3 5", pf-b's Jobs card) that "Change" and
// "Change the 2" focus (a hand-off: the owning stream renders it on its pressed button's group).
export const PLANTS_PER_JOB_ID = 'ct-plants-per-job';

// The other holes and the thin spots as one paragraph (boards Many, ManyDesk, AddMany): "The other hole:
// Covers the ground: nobody known after year 25 · 7 plants not checked (no plant on your lists fits here
// and does this then; 4 need a second look)." then "No thin spot: every job that is done has the 2
// plants you want, from year 1 to year 60." or "Then 5 thin spots, with fewer than the 2 plants you
// want: Feeds you (years 15 to 60), …", and "Change the 2". Counts from core fills and the verdicts,
// with the store's one second-look rule.
function OthersSentence({ others, openThins, thinCount, goal, members, open, change }: { others: readonly Hole[]; openThins: readonly Hole[]; thinCount: number; goal: number; members: readonly Taxon[]; open: readonly Hole[]; change: () => void }) {
  const holeText = (h: Hole) => {
    const f = holeFillers(h, members, open), fit = f.fits.length, look = f.look.length;
    const u = uncheckedLine(h);
    const title = u ? `${holeWords(h)} · ${say(u)}` : holeWords(h);
    return fit ? P('palette.next.otherFit', fit, { hole: title }) : look ? P('palette.next.otherNoFitLook', look, { hole: title }) : T('palette.next.otherNoFit', { hole: title });
  };
  const holesPart = others.length ? P('palette.next.otherHolesSay', others.length, { holes: others.map(holeText).join('; ') }) : '';
  const thinPart = openThins.length
    ? P('palette.next.thinList', openThins.length, { want: goal, list: openThins.map((h) => T('palette.next.thinItem', { lane: T(`job.${h.job}`), from: h.fromYear, to: h.toYear })).join(', ') })
    : thinCount ? P('palette.next.thinCount', thinCount) + '.' : P('palette.next.noThinGoal', goal, { from: JUDGED_FROM_YEAR, to: JUDGED_TO_YEAR });
  return (
    <p class="ct-next-others" data-next-others="">
      {holesPart && <>{holesPart} </>}{thinPart}{' '}
      <button type="button" class="text-link" data-next-change-goal="" onClick={change}>{T('palette.next.changeGoal', { n: goal })}</button>
    </p>
  );
}
