/** @jsxImportSource preact */
// Find (PP-C c1; boards Find, FindResults, FindType, FindJob, FindNone, FindFilters, FindMulti,
// FindDesk, FillHole, HoleOpen, DarkFind): one sheet to add plants. One search finds a plant by a name
// in any language the names file holds, a scientific name or synonym, or a job word; results are
// grouped by how they fit the place (fits, needs a second look, outside its climate range, not
// checked), each saying why it matched. Opened for a hole (the Next step's "See all N", a hole's
// Find: store.openFind with its SheetFor), it lists the plants that fill it, titled by the hole, with
// "Fits your place" on: the plants outside their climate range wait behind one counted button. Opened
// plain, it starts with the jobs to look by (board Find) and lists plants once the grower searches,
// picks a job or sets a filter.
//
// Inform, don't block (owner 2026-11-14): every plant adds in one tap, its warnings on its row in words;
// nothing asks and no plant is hidden without its count. A filter that cannot judge a plant says how
// many ("12 not recorded"). A hit only another climate's list holds is named with that list and adds
// as a guest (its pool read only then). With no hit: close spellings, else the other lists and "Ask us
// to add it" (the contact form with the query).
//
// One count source (fix round 2, r2-10): every number Find shows (the count line, "Show N plants", the
// fit choice, each chip and box) is `count` over the same plants with the filters in force, the one
// under the number changed, folding the outside plants exactly as the list does.
import { batch } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import type { AddResult } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Hole, JobId, Locale, PeriodId, PlantId, PlantVerdict, Taxon } from '../../../../lib/palette/index.ts';
import { fillReasonLine, fills, fitLine, jobIds, jobsOf, lookChipLine, noneFits, periodIds, periodName, laneLine, queryTokens, secondLook, uncheckedLine, yearsLine, yearsOf } from '../../../../lib/palette/index.ts';
import { namesLine, whyLines, type FindHit } from '../../data/search.ts';
import { applyFilters, bestFirst, findGroups, GROUPS, jobsMatching, LIGHTS, SIZES, STANDS, wellInside, type FilterId, type FindFilters, type Group, type Stand } from '../../rules/find-query.ts';
import { NotChecked, SheetWaiting, type Frame } from '../kit/sheet.tsx';
import { MoreList } from '../kit/more.tsx';
import { FitLine, JobIcon, holeWords, lightWords as kitLight, midSentence, say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { listName, nameOf, nameOrder, num, zoneName } from '../kit/names.ts';
import { formatLength } from '../../format.ts';
import { page } from '../kit/page.ts';
import { finder, finderFailed, namesState, releasePlants, wantNames } from './names.ts';
import Paste from './Paste.tsx';
import { addedWords, holeEndWords, holeFillers, HoleRow, Marks, openFillers, PLUS, rowRain, rowRoles, rowSize, rowSpan } from '../rows.tsx';
import { deskFind } from '../Toast.tsx';

// The later periods "Holds by …" offers (types.ts periodIds), named by verdict-line.ts periodName
// (first-run words).
const LATER = periodIds.slice(1);

// A language's name in the page's language ("French"), for "French name: Gombo".
const langName = (code: string): string => {
  try { return new Intl.DisplayNames([pageLang()], { type: 'language' }).of(code) ?? code; } catch { return code; }
};
// A group's heading: the verdict words of its level for the page's period (verdict-line.ts fitLine,
// the one owner of them: "Fits your place today", "Needs a second look", …), never Find's own copy.
const verdictOf = (level: PlantVerdict['level'], judged: PeriodId): PlantVerdict => ({ id: '', judged, ownYears: false, level, limiting: null, factors: [], notes: [], range: 'judged' });
const groupWords = (g: Group, judged: PeriodId): string => say(fitLine(verdictOf(g === 'unchecked' ? 'unknown' : g, judged)));
// Why a row matched (data/search.ts whyLines owns the words), a language code named in the page's
// language; data-lang and data-kind say which name it was.
function whyWords(h: FindHit): { text: string; lang?: string; kind: string } | null {
  const lines = whyLines(h);
  if (!lines.length) return null;
  const text = lines.map((l) => {
    const name = l.key.slice('consortium.find.why.'.length), vars = l.vars.lang ? { ...l.vars, lang: langName(String(l.vars.lang)) } : l.vars;
    return l.count === undefined ? T(`find.why.${name}`, vars) : P(`find.why.${name}`, l.count, vars);
  }).join(' · ');
  return { text, lang: h.why.lang, kind: h.why.kind === 'other' ? 'name' : h.why.kind };
}
// The names line (boards FindType, FindNone): the languages the names file holds, never a fixed count.
function namesWords(langs: readonly string[]): string {
  const line = namesLine(langs);
  return line.count === undefined ? T('find.namesCore') : P('find.namesFile', line.count);
}
// A job's words in the page's language (board FindNone): its label and the other words it answers to.
const jobWords = (job: JobId): string[] => [T(`job.${job}`), ...T(`find.jobWords.${job}`).split(',').map((w) => w.trim()).filter(Boolean)];
// The contact form, carrying the query (PP-C2; the form reads `plant`, a hand-off to Contact.astro).
function askHref(q: string): string {
  const url = new URL(page().start.contact, location.href);
  url.search = `?plant=${encodeURIComponent(q)}`; // %20, not '+', so any reader decodes it
  return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

// A row's light, size and years (board FindResults: "mostly sun · 18 m wide, 40 m tall"), measures
// through format.ts, years through verdict-line.ts. Light is the plant's stratum (layer is light),
// the same words as the palette's light rows and holes.
// C9: the light it grows in, the palette's words ("grows in: full sun – part shade"; kit/fit.tsx lightWords).
function lightWordsOf(t: Taxon): string | null {
  return t.light?.sunniest || t.stratum ? midSentence(kitLight(t).growsIn) : null;
}
// The one roles list (c1r3 T20): lower case after its first word where the language writes it so
// (kit/fit.tsx midSentence). In a job hole the hole's own job is left out, the rest "Also …" (board
// FillHole, T15): the row's first line already says it fills the hole; so is a job list's one job
// (c1r4 U7): every row does it.
// (rowRoles: views/palette/NextStep.tsx, the one owner, shared with the Next step's rows.)
// known: the job the list is filtered by, left out ("Also …") only on a row that does it (c1r5 W3: a
// searched palette plant or a close spelling may not).
// to: the last year it stays in its climate range through ("in range to 2099", board FillHole), else null.
// reason: the row carries a fit reason (BC26, board FillHole): its light is the reason's (or not said),
// so no light word here, and the years only where the reason does not say them ("Covers the ground and
// is planted in shade: fills 4 holes / Also … · month 3 to year 25 · 30 cm wide, 30 cm tall · in range
// to 2099"); `saysYears`: the reason says them ("Covers the ground from month 3 to year 25").
function metaWords(t: Taxon, known: JobId | null, to: string | null = null, reason: { saysYears: boolean } | null = null): string {
  const own = jobsOf(t), drop = known && own.includes(known) ? known : null;
  const jobs = rowRoles(own.filter((j) => j !== drop), !!drop);
  return [jobs, !reason && lightWordsOf(t), !reason?.saysYears && rowSpan(t), rowSize(t), to && T('find.inRangeTo', { year: to }), rowRain(t)].filter(Boolean).join(' · ');
}
// The add button's mark (board FindResults: "+ Add", "✓ Added"); the word carries the meaning.
const TICK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const CROSS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
// The Filters button's mark (board Find: three bars, shorter downwards).
const SLIDERS = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M6 10h8M8.5 14.5h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" /></svg>;
const CHEVRON = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

type Fit = 'fits' | 'inside' | 'all';
type BoxKey = 'fills' | 'hideNoSize' | 'hideToxic' | 'hideInvasive' | 'hideNoLight';
const BOXES: readonly BoxKey[] = ['fills', 'hideNoSize', 'hideToxic', 'hideInvasive', 'hideNoLight'];
// The boxes that keep plants ("Fills a hole or a thin job"); the others hide them (R6).
const KEEPS: readonly BoxKey[] = ['fills'];
type Option = { key: string; label: string; on: boolean; toggle: () => void; count: number };

// R9: what the grower set in one opening of Find (its search, filters, the visit's adds, the frozen
// order) lives here, keyed by that opening (store.findSheet's n), not in the component: crossing 960 px
// swaps the panel for the sheet (or back), which mounts Find again in the other frame, and the new
// mount reads the same opening's state. A new opening starts afresh.
type Kept = Record<string, unknown>;
let opening: { n: number; kept: Kept } | null = null;
const keptFor = (n: number): Kept => {
  if (opening?.n !== n) opening = { n, kept: {} };
  return opening.kept;
};
// useState over the opening's state: the first mount takes init(), a later one what the last showed.
function useKept<V>(kept: Kept, name: string, init: () => V): [V, (v: V | ((was: V) => V)) => void] {
  const [v, set] = useState<V>(() => (name in kept ? (kept[name] as V) : init()));
  kept[name] = v;
  return [v, set];
}

export default function Find({ Frame }: { Frame: Frame }) {
  const source = store.source.value;
  const climate = store.climate.value;
  const { hole, fits, title: asked } = store.sheetTarget.value;
  // R9: this opening's state, kept across a remount in the other frame (keptFor).
  const kept = keptFor(store.findSheet.value?.n ?? 0);
  // The members when Find opened: listed apart ("In your palette"); a plant added here keeps its row,
  // its button turned to "Added".
  const [atOpen] = useKept(kept, 'atOpen', () => new Set(store.members.peek()));
  const [query, setQuery] = useKept(kept, 'query', () => '');
  // Opened from a thin spot ("Find a backup", AddMany): sorted to fill it first, "Fills a hole or a
  // thin job" on.
  const [chosen, setFilters] = useKept<FindFilters>(kept, 'filters', () => (hole?.thin ? { fills: true } : {}));
  // The plants added in this visit (AddMany state 3), in the order added; the visit's count is derived
  // from it and the palette (visitIn below), never a second copy of the members (R7).
  const [visit, setVisit] = useKept<readonly string[]>(kept, 'visit', () => []);
  // The fit choice (board FindFilters, B8): fits (the outside plants folded behind one counted
  // button, in a hole and in plain Find, B3), well inside its range only, every plant.
  const [fitChoice, setFit] = useKept<Fit>(kept, 'fit', () => 'fits');
  const [outsideShown, setOutsideShown] = useKept(kept, 'outsideShown', () => false); // "Show N outside their climate range" pressed
  // The hole's preset lifted for a search ("N on your list but outside this hole · Show"): the whole
  // list for that search only; another query or none, the hole's plants again (fix round 2, r2-12).
  const [wide, setWide] = useKept(kept, 'wide', () => false);
  const ask = (text: string) => batch(() => { setQuery(text); setWide(false); });
  // The list asked for from the start (c1r3 T3): "Show N plants" or the start's "Show the N plants
  // that fit". The start is no query, no hole, no filter and not listed.
  const [listed, setListed] = useKept(kept, 'listed', () => false);
  // The palette's plants a filtered list matches, shown on "Show" (board FindResults, T18).
  const [paletteOpen, setPaletteOpen] = useKept(kept, 'paletteOpen', () => false);
  // Below 960 px the filters open in place over the results (board FindFilters, fix round 2, r2-02):
  // the focus moves to their heading, "Show N plants" or Escape returns to the results and the focus
  // to "Filters"; the query and filters stay. At 960 they are a column beside the results.
  const [showFilters, setShowFilters] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const filtersBtn = useRef<HTMLButtonElement>(null);
  const filtersHead = useRef<HTMLHeadingElement>(null);
  const filtersWas = useRef(false);
  // A layout effect: the focus moves in the same frame the panel opens or closes.
  useLayoutEffect(() => {
    if (filtersWas.current === showFilters) return;
    filtersWas.current = showFilters;
    (showFilters ? filtersHead : filtersBtn).current?.focus();
  }, [showFilters]);
  // Paste opened from Find is drawn in Find's sheet; Cancel or an add comes back here, the focus on
  // "Paste a list" (B11); "Search by hand" comes back with its name in the search.
  const [pasting, setPasting] = useState(false);
  const pasteBtn = useRef<HTMLButtonElement>(null);
  const [backFromPaste, setBackFromPaste] = useState(false);
  // "Look in another climate's list" (board Find's foot): the other curated lists as choices; one chosen
  // lists its plants this list lacks, each added from that list as a guest (addFrom).
  const [lookOther, setLookOther] = useKept(kept, 'lookOther', () => false);
  const [otherZone, setOtherZone] = useKept<ClimateZone | null>(kept, 'otherZone', () => null);
  const [otherList, setOtherList] = useKept<readonly Taxon[] | null>(kept, 'otherList', () => null);
  // Find as the panel beside the chart (board FindDesk, Q5): the filters as checkbox rows, the
  // "searched on this computer" line beside the field.
  const desk = deskFind.value;
  useEffect(() => { if (backFromPaste && !pasting) { (query ? field : pasteBtn).current?.focus(); setBackFromPaste(false); } }, [backFromPaste, pasting]);
  useEffect(() => { if (source) wantNames(source, pageLang() as Locale); }, [source]);
  // Escape while the filters are open returns to the results, never closes Find (r2-02): the sheet's
  // cancel is refused then, wherever the focus is (filtersOpen: the state the screen shows). The field
  // is drawn once the list is in and Paste is not open.
  const filtersOpen = useRef(false);
  filtersOpen.current = showFilters;
  const drawn = !!store.pool.value && !pasting;
  useEffect(() => {
    const d = field.current?.closest('dialog');
    if (!d) return;
    const back = (e: Event) => { if (filtersOpen.current) { e.preventDefault(); setShowFilters(false); } };
    d.addEventListener('cancel', back);
    return () => d.removeEventListener('cancel', back);
  }, [drawn]);

  const pool = store.pool.value, offer = store.offerPool.value;
  const members = store.members.value;
  // The hole's sheet (boards FillHole, HoleOpen; BC9): the intro, the rows that fit, "Needs a second
  // look (n)", "Not checked (n)", then the outside link and Done in the foot; no search, filters or
  // count line (a thin job's sheet is the Add sheet, AddMany state 3, with its search and its filter on).
  const holeSheet = !!hole && !hole.thin;
  // R7: the visit's adds still in the palette (a toast's Undo or a row's takes one out, a later Undo
  // can put it back): the head's count and the burst toast's.
  const visitIn = visit.filter((id) => members.includes(id));
  const verdicts = store.verdictFailed.value ? null : store.poolVerdicts.value;
  const located = store.siteClimate.value;
  const rule = store.verdictRule.value, vctx = store.verdictContext.value;
  // The one condition for the range and holds filters (fix round 1, A4): a location with a climate and
  // the verdict rule loaded, not refused. Otherwise neither is offered nor applied, so no plant is ever
  // counted "not recorded" for a rule that did not load.
  const judging = located && !!rule && !store.verdictFailed.value;
  const flagCtx = store.flagContext.value, scene = store.flagScene.value;
  const search = finder.value, names = namesState.value, searchFailed = finderFailed.value;
  const memberTaxa = store.memberTaxa.value;
  // A query of one letter browses, as an empty one (normalization v1's admission).
  const q = queryTokens(query).admission === 'active-text' ? query.trim() : '';
  const order = useMemo(() => nameOrder(nameOf, pageLang()), []);

  // The plants Find lists: a hole's fillers from the offer list (what the Next step's "See all N"
  // counts), else the climate's list; members at opening left out.
  const base = useMemo(() => {
    // A plant added in this visit stays listed ("Added" with its Undo) though it now fills the hole.
    const list = fits && !wide ? (offer ?? []).filter((t) => fits(t) || visit.includes(t.id)) : pool ?? [];
    return list.filter((t) => !atOpen.has(t.id)).sort(order);
  }, [pool, offer, hole, fits, wide, atOpen, order, visit]);
  // What fits the place: the plants judged to fit or to need a second look, never an outside or an
  // unchecked one (c1r4 U3, c1r5 W2); the subtitle, the start's button and "Fits your place" say it.
  const isFit = (t: Taxon) => { const l = verdicts?.get(t.id)?.level; return l === 'fits' || l === 'look'; };
  const judged = useMemo(() => base.filter(isFit).length, [base, verdicts]);
  // The filters in force, the only ones shown, counted and applied (fix round 2, r2-07): without
  // `judging` the range and holds choices are neither applied nor shown as on.
  // None judged (no verdicts, or a period without figures: every plant unchecked), "Fits your place"
  // and "well inside" would list nothing: "Every plant" is in force, not counted as a filter (c1r5 W2).
  const fit: Fit = !judged ? 'all' : !judging && fitChoice === 'inside' ? 'fits' : fitChoice;
  const filters: FindFilters = { ...chosen, range: fit === 'inside', holds: judging ? chosen.holds : undefined };
  // A plant with a warning in words (a site misfit, a serious conflict, toxic, invasive here).
  const flagsOf = useMemo(() => {
    const m = new Map<PlantId, ReturnType<typeof store.flagsOfPlant>>();
    for (const t of base) m.set(t.id, store.flagsOfPlant(t));
    return m;
  }, [base, flagCtx, scene]);
  // The one warned rule (store.warnedPlant: core secondLook over the flags), on the flags read once above.
  const warned = useMemo(() => new Set(base.filter((t) => secondLook(flagsOf.get(t.id) ?? [])).map((t) => t.id)), [base, flagsOf]);
  // Best first (B2, K2): by the palette's open holes a plant fills (store.holeFillCount over
  // store.openHoles, the one list the palette page reads too; pf hand-off), then the later periods a
  // plant stays in range through, then well inside its range before near its edge, then the name.
  const open = store.openHoles.value;
  const thins = store.thinSpots.value;
  // Frozen once the reader adds in this visit (AddMany state 3): an added row keeps its place, "Added"
  // with its Undo, never re-ranked out of the screenful.
  const liveFilled = useMemo(() => new Map(base.map((t) => [t.id, store.holeFillCount(t)] as const)), [base, open]);
  const frozenFilled = (kept.frozenFilled ??= { current: null }) as { current: ReadonlyMap<PlantId, number> | null };
  const filled = frozenFilled.current ?? liveFilled;
  // The periods after the one viewed (fix round 2, r2-09): an outside plant's first one in range ("In
  // range by 2071–2099", B5) and how many a plant stays in range through (best first).
  const after = periodIds.slice(periodIds.indexOf(vctx.period) + 1);
  const inRangeBy = (t: Taxon): string | null => {
    if (!judging) return null;
    const p = after.find((x) => rule!.holdsBy(t, vctx, x));
    return p ? periodName(p) : null;
  };
  const stay = useMemo(() => {
    const m = new Map<PlantId, number>();
    if (judging) for (const t of base) { let n = 0; for (const p of after) { if (!rule!.holdsBy(t, vctx, p)) break; n++; } m.set(t.id, n); }
    return m;
  }, [base, judging, rule, vctx]);
  const firm = useMemo(() => new Map(base.map((t) => [t.id, wellInside(verdicts?.get(t.id)) ? 1 : 0] as const)), [base, verdicts]);
  // Its warnings (fewer first, T7): the flags an add warns about.
  const warnCount = useMemo(() => new Map(base.map((t) => [t.id, (flagsOf.get(t.id) ?? []).filter((f) => secondLook([f])).length] as const)), [base, flagsOf]);

  // The query's hits, best first; those in the list, those in other lists, those already in the palette.
  const hits = useMemo(() => (q && search ? search(q) : null), [q, search]);
  const job = useMemo(() => (q ? jobsMatching(q, jobWords)[0] ?? null : null), [q]);
  // R1: the targets "Fills a hole or a thin job" reads, frozen at the visit's first add (as the order
  // is, frozenFilled): an add that closes a hole or a thin spot never takes the rows for that job out
  // from under the reader. A fresh opening of Find reads the targets again.
  const liveTargets = useMemo(() => [...open, ...thins.filter((h) => h.state === 'open')], [open, thins]);
  const frozenTargets = (kept.frozenTargets ??= { current: null }) as { current: readonly Hole[] | null };
  // PFA-F1: the hole sheet's intro counts frozen with them, at the visit's first add (holeF below): the
  // visit's own adds never lower its figure nor turn it to the no-fit words (board FillHole).
  const frozenHoleF = (kept.frozenHoleF ??= { current: null }) as { current: ReturnType<typeof holeFillers> | null };
  const targets = frozenTargets.current ?? liveTargets;
  // The plants added in this visit stay listed whatever the filters say ("Added" with its Undo; AddMany
  // state 3): a list snapshot for the visit, so no recompute moves a row the reader just acted on.
  const keepVisit = (rows: readonly Taxon[], from: readonly Taxon[]): Taxon[] => {
    if (!visit.length) return [...rows];
    const keep = new Set(rows.map((t) => t.id));
    return from.filter((t) => keep.has(t.id) || visit.includes(t.id));
  };
  const ctx = useMemo(() => {
    return {
      verdicts,
      holds: judging ? (t: Taxon, p: PeriodId) => rule!.holdsBy(t, vctx, p) : undefined,
      toxic: (t: Taxon) => (t.warnings.toxicity ? t.warnings.toxicity.level !== 'None' : null),
      invasive: (t: Taxon) => (flagCtx.countryStatus === 'checked' && flagCtx.country && t.warnings.invasive_in ? t.warnings.invasive_in.some((r) => r.country === flagCtx.country) : null),
      targets,
    };
  }, [verdicts, rule, judging, vctx, flagCtx, memberTaxa, targets]);
  // The plants the filters read: the query's hits in the list (hit order), else the list best first.
  const matched = useMemo(() => {
    if (!hits) return judging || hole ? bestFirst(base, filled, stay, firm, warnCount) : base;
    const rank = new Map(hits.map((h, i) => [h.id, i] as const));
    return base.filter((t) => rank.has(t.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  }, [base, hits, filled, stay, firm, warnCount, judging, hole]);
  const isOutside = (t: Taxon) => verdicts?.get(t.id)?.level === 'outside';
  // The outside plants fold without a query unless "Every plant" is chosen or "Show N outside" pressed;
  // a search shows them, marked (board FindNone).
  const folds = (v: Fit) => v !== 'all' && !q && !outsideShown;
  // "Fits your place" lists the judged plants only (c1r5 W2): an unchecked plant is listed under "Every
  // plant", in its "Not checked" group; a search lists every hit, marked. A hole's sheet keeps its
  // "Not checked (n)" group (PFA-B2): it lists every plant the Next step's "See all N" counts. The Add
  // sheet a thin spot's "Find a backup" opens is the Add sheet: "Fits your place" means the same there
  // (PFA-G1, G2), so its count line, that choice's count and the job card's "Show these N" agree.
  const drops = (v: Fit) => v === 'fits' && !q && !holeSheet;
  // The one count: how many plants the list shows under these filters and this fit choice.
  // (the job card counts the list its "Show these N plants" lists: the whole list, the query gone).
  const count = (f: FindFilters, v: Fit = fit, list = matched, fold = folds(v), drop = drops(v)): number => {
    const rows = keepVisit(applyFilters(list, { ...f, range: v === 'inside' }, ctx).rows, list);
    return rows.filter((t) => !(fold && isOutside(t)) && !(drop && !isFit(t) && !isOutside(t))).length;
  };
  const view = useMemo(() => {
    const hitOf = new Map<PlantId, FindHit>();
    hits?.forEach((h) => hitOf.set(h.id, h));
    const applied = applyFilters(matched, filters, ctx), { unknown, hidden } = applied;
    const rows = keepVisit(applied.rows, matched);
    const groups = findGroups(rows, verdicts, warned);
    const inList = new Set(base.map((t) => t.id));
    const own = new Set(pool?.map((t) => t.id) ?? []);
    const others = (hits ?? []).filter((h) => !inList.has(h.id) && !own.has(h.id) && !members.includes(h.id)).flatMap((h) => {
      const p = releasePlants.value.get(h.id);
      const lists = p ? p.lists.filter((z) => z !== climate) : [];
      return p && lists.length ? [{ hit: h, plant: p, lists }] : [];
    });
    // The hits kept out, each counted once with its way out (fix round 1, A1): in the palette (rows
    // marked Added), hidden by the filters (Clear), on the list but outside the hole (Show).
    // A job list (no query, T18): the palette's plants the filters keep, named on one line with "Show".
    const inPalette = hits
      ? hits.filter((h) => atOpen.has(h.id)).map((h) => store.taxonOf(h.id)).filter((t): t is Taxon => !!t)
      : !q && !hole && filters.jobs?.length ? applyFilters(memberTaxa.filter((t) => atOpen.has(t.id)), filters, ctx).rows : [];
    const byFilters = hits ? matched.length - rows.length : 0;
    const outsideHole = hits ? hits.filter((h) => own.has(h.id) && !inList.has(h.id) && !atOpen.has(h.id)).length : 0;
    return { hitOf, groups, unknown, hidden, others, inPalette, byFilters, outsideHole };
  }, [matched, hits, chosen, fit, judging, ctx, verdicts, warned, pool, members, climate, atOpen, memberTaxa, hole, q, releasePlants.value, visit]);

  if (!climate) return null;
  if (pasting) return <Paste Frame={Frame} onBack={(name?: string) => batch(() => { setPasting(false); setBackFromPaste(true); if (name) ask(name); })} />;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  const otherZones = store.curatedClimates.value.filter((z) => z !== climate);
  const showOther = async (z: ClimateZone) => {
    batch(() => { setOtherZone(z); setOtherList(null); });
    const list = await store.loadPool(z);
    if (list) setOtherList(list);
  };
  const inPool = new Set(pool.map((t) => t.id));
  const otherRows = otherList ? otherList.filter((t) => !inPool.has(t.id) && !atOpen.has(t.id)).sort(order) : null;
  const toggleFilter = (k: BoxKey) => setFilters((f) => ({ ...f, [k]: !f[k] }));
  type ListKey = 'jobs' | 'light' | 'size' | 'stands' | 'holds';
  const toggleIn = <K extends ListKey>(k: K, v: NonNullable<FindFilters[K]>[number]) => setFilters((f) => {
    const now = (f[k] ?? []) as readonly string[];
    return { ...f, [k]: now.includes(v) ? now.filter((x) => x !== v) : [...now, v] };
  });
  const added = (id: PlantId) => members.includes(id);
  // One tap a row (AddMany state 3, F20): the sheet stays open; one toast counts up ("2 added this
  // visit. Last: Tahitian lime."), replaced in place, its Undo taking back the last add only.
  // The first add says what it changed (board FillHole: "Pineapple added. Covers the ground: nobody after year 15.").
  // BC6: the first add names the change to the hole the sheet is for only, never the other holes it narrowed.
  const said = (t: Taxon) => (visitIn.length ? P('toast.burst', visitIn.length + 1, { name: nameOf(t) })
    : (r: AddResult) => addedWords([nameOf(t)], r.holeChange, r.thinChange, hole?.thin ? hole.job ?? null : null, false, hole ?? null));
  const addOne = (t: Taxon, from?: ClimateZone) => {
    if (added(t.id)) return;
    frozenFilled.current ??= filled;
    frozenTargets.current ??= targets;
    frozenHoleF.current ??= holeF;
    const text = said(t);
    store.addMembers([t.id], from ? { [t.id]: from } : {}, { warned: warned.has(t.id) ? [t.id] : [], text });
    setVisit((v) => (v.includes(t.id) ? v : [...v, t.id]));
    // The Add button is gone with the add: the focus moves to the row's Undo (BC27).
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`dialog[open] [data-find-row][data-plant-id="${CSS.escape(t.id)}"] [data-find-undo]`)?.focus());
  };
  const addFrom = async (id: PlantId, z: ClimateZone) => {
    frozenFilled.current ??= filled;
    frozenTargets.current ??= targets;
    frozenHoleF.current ??= holeF;
    const list = await store.loadPool(z);
    const t = list?.find((x) => x.id === id);
    if (t) { store.addMembers([id], { [id]: z }, { warned: store.warnedPlant(t) ? [id] : [], text: said(t) }); setVisit((v) => (v.includes(id) ? v : [...v, id])); }
  };

  // The filters on: each chosen value, and a fit choice other than "Fits your place".
  const lists = (['jobs', 'light', 'stands', 'size', 'holds'] as const).reduce((n, k) => n + (filters[k]?.length ?? 0), 0);
  const onCount = lists + BOXES.filter((k) => filters[k]).length + (fit === 'fits' || !judged ? 0 : 1);
  const clearAll = () => batch(() => { setFilters({}); setFit('fits'); setOutsideShown(false); });
  // The one count of what the screen lists as rows (c1r3 T14, c1r4 U2): the list's rows, the palette's
  // plants when listed as rows (a search, or "Show" pressed; folded on a job list they are a line of
  // names) and the other lists' rows; the count line, the status and "Show N plants" all say it.
  const paletteRows = q || paletteOpen ? view.inPalette.length : 0;
  const shownCount = count(filters) + paletteRows + view.others.length;
  // "Fits your place" under these filters: the judged plants only (isFit), as the list it lists.
  const fitsCount = (f: FindFilters) => applyFilters(matched, { ...f, range: false }, ctx).rows.filter(isFit).length;
  // D5 (pf-decisions 2026-11-18): the subtitle counts the whole list, members included (board Find); the
  // choice counts the plants not yet in the palette, so it adds the palette's plants that fit, and with
  // no filter the two figures add up. Counted as the choice's own figure is (h2 R6): the palette's
  // plants that pass the sheet's predicate (a hole's or Balance's "another family") and the filters.
  const inSheet = (t: Taxon) => !fits || wide || fits(t);
  const fitsInPalette = applyFilters(memberTaxa.filter((t) => atOpen.has(t.id) && inSheet(t)), { ...filters, range: false }, ctx).rows.filter(isFit).length;

  // C7 (board AddMany state 3): a thin job opens the Add sheet, titled "Add plants"; where it came from
  // is the sorted line's "Opened from …". A hole's sheet is titled by its hole.
  const title = hole && !hole.thin ? holeWords(hole) : asked ?? T('find.title');
  // The subtitle (board Find, B4, K3, T14): how many of the plants not yet in the palette fit the place,
  // the number the fit choice says with no filter; in a hole, how many fill it and fit, the number its
  // count line says; none judged to fit (nothing checked), the plain count (c1r4 U3). The start lists
  // the jobs as chips; no list until the grower searches, picks a job, sets a filter or asks for it. (The board's "Your palette lacks N holes" needs the holes in a
  // store computed: sheet chunks never import holes.ts; a seam for pf.)
  const later = store.period.value !== periodIds[0], fitsHere = judged;
  // BC8, N5: a hole's intro counts the plants that fit (no second look) from the one count source the
  // Next step reads (holeFillers), then says the order (board FillHole: "7 plants … fit your place. Best
  // fit first: …"); none fits (core noneFits), the Next step's no-fit words; only unchecked ones, no claim.
  // PFA-F1: as the sheet opened, frozen at the visit's first add (frozenHoleF).
  const holeF = hole ? frozenHoleF.current ?? holeFillers(hole, memberTaxa, open) : null;
  const holeFits = holeF?.fits.length ?? 0;
  const holeLede = holeFits ? `${P('find.holeLede', holeFits, { list: listName(climate) })}.` : holeF && noneFits(holeF) ? T('palette.next.noFit') : '';
  const holeUnchecked = hole ? uncheckedLine(hole) : null;
  // BC23 (board Find): the plain sheet's line is the place's count line after the climate's name
  // ("Subtropical · 305 of the 515 plants on the nearest lists fit your place today"), the whole list
  // counted (store.countFits, what the place line says), in the place line's own words.
  const n = store.countFits.value, own = store.curatedClimates.value.includes(climate);
  const placeLine = n && n.fits + n.look > 0
    ? P(own ? (later ? 'place.count.ownLater' : 'place.count.own') : later ? 'place.count.borrowedLater' : 'range.pool.count', n.fits + n.look, { total: num(n.of), list: listName(climate), period: periodName(store.period.value) }).replace(/[.。]$/, '')
    : null;
  // A predicate without a hole (Balance's "Find a soil feeder of another family"): the listed base,
  // counted as the hole sheet counts its own, never the whole list's line (h2 R6).
  const subtitle = !fitsHere || (fits && !wide && !hole) ? P('find.lede', base.length, { list: listName(climate) })
    : hole ? [holeUnchecked && `${say(holeUnchecked)}.`, holeLede, judging && T('find.bestFirst', { period: periodName(periodIds[periodIds.length - 1]) })].filter(Boolean).join(' ')
      : placeLine ? T('find.fitCount', { zone: zoneName(climate), line: placeLine }) : P('find.lede', base.length, { list: listName(climate) });
  const start = !q && !hole && !fits && onCount === 0 && !listed;
  // A query before the search index is in (T4): "Searching…", no rows; the core's names failed, the
  // could-not-load line (the next focus on the search tries again).
  const pending = !!q && !search;
  const { groups, unknown, hidden } = view;
  const outsideFolded = folds(fit) && groups.outside.length > 0;
  const shown = (g: Group) => groups[g].length > 0 && !(g === 'outside' && outsideFolded) && !(g === 'unchecked' && drops(fit));
  // Nothing answers at all: no plant of the release has the name (a hit kept out is counted instead).
  // No hits yet (the names still loading: not searched) is not "nothing" (fix round 2, r2-01).
  const nothing = !!hits && !hits.length;

  // A row (boards FindResults, FillHole): name, add; in a hole what it brings to it in the hole's terms;
  // why it matched; its jobs, light, size and years; its fit (to which year it fits); its marks.
  // `as`: an <li> in a plain list, a <div> inside a MoreList item (which is the <li>).
  const rowBody = (t: Taxon, as: 'li' | 'div') => {
    const Tag = as;
    const h = view.hitOf.get(t.id), why = h ? whyWords(h) : null;
    const lines = flagLines(t, flagsOf.get(t.id) ?? [], scene);
    const done = added(t.id);
    const v = verdicts?.get(t.id), outside = v?.level === 'outside', y = yearsOf(t);
    const later = outside ? inRangeBy(t) : null;
    // "Fits your place to 2099" (K1): the last later period it stays in range through.
    const n = stay.get(t.id) ?? 0, shownV = v && v.level === 'fits' && n > 0 ? { ...v, judged: after[n - 1] } : v;
    const light = hole?.kind === 'job' ? open.find((o) => o.kind === 'light' && fills(o, t))?.stratum ?? null : null;
    const reasonOf = hole && fits?.(t) ? say(fillReasonLine(hole, y, { light, holes: store.holeFillCount(t) })) : null;
    // The reason says the years unless it names the light hole it also fills (core fillReasonLine).
    const reason = reasonOf ? { saysYears: !!y && !(hole?.kind === 'job' && light && !hole.thin) } : null;
    const chip = v ? lookChipLine(v) : null;
    return (
      <Tag key={t.id} class={as === 'div' ? 'ct-find-row' : undefined} data-find-row="" data-plant-id={t.id}>
        {/* The name opens the plant's Details (board FindResults: the name is a link; board Details then
            says "‹ Back to results", stacked over Find: store.sheets, M38, h3 R1). */}
        <div class="ct-row-main"><button type="button" class="ct-link-button ct-name-open" data-find-open="" aria-haspopup="dialog" onClick={() => store.openSheet('details', t.id, {}, 'find')}>{nameOf(t)}</button> <i class="ct-sci">{t.canonical_name}</i></div>
        {/* BC27 (board AddMany state 3): an added row says "✓ Added" in words, with its Undo beside it
            at the right of the row; the Add button gives way to them, the focus to Undo. */}
        {done ? (
          <span class="ct-find-done" data-plant-done="">
            <span class="ct-find-added" data-find-add="" data-added="">{TICK} {T('find.added')}</span>
            {visit.includes(t.id) && <button type="button" class="text-link ct-find-undo" data-find-undo="" aria-label={T('find.undoAdding', { name: nameOf(t) })} onClick={() => store.takeBackAdd(t.id)}>{T('find.undo')}</button>}
          </span>
        ) : (
          <button type="button" class="button button-secondary ct-find-add" data-find-add="" aria-label={T('find.addName', { name: nameOf(t) })} onClick={() => addOne(t)}>
            {PLUS} {outside ? T('addAnyway') : T('find.add')}
          </button>
        )}
        <div class="ct-row-why">
          {/* BC26, C4: the fit reason, one line, in the target's terms (core fillReasonLine; a thin job's "a backup"). */}
          {reasonOf && <span class="ct-find-fills" data-find-fills="">{TICK} {reasonOf}</span>}
          {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
          <span class="ct-find-meta" data-find-meta="">{metaWords(t, hole?.kind === 'job' ? hole.job ?? null : filters.jobs?.length === 1 ? filters.jobs[0] : null, v?.level === 'fits' && after.length && n === after.length ? after[n - 1].split('-')[1] : null, reason)}</span>
          {/* BC11, PFA-B1: a second look says its own reason as its chip (core lookChipLine: "Near the
              edge of its range" for a range edge only, else its cause), not "Needs a second look".
              BC26: a row with a fit reason that fits says no fit line (its meta ends "in range to 2099");
              outside, not checked or with the dryness note (0W R2), it still says so in words. */}
          {!chip && !(reason && shownV?.level === 'fits' && /\.fits(?:To)?$/.test(fitLine(shownV).key)) && <FitLine v={shownV} />}
          {later && <span class="ct-line" data-find-inrange="">{T('find.inRangeBy', { period: later })}</span>}
          <Marks t={t} lines={lines} country={scene.country} look={chip} />
        </div>
      </Tag>
    );
  };
  const row = (t: Taxon) => rowBody(t, 'li');

  // ---- the filters (board FindFilters, its sections in its order; each says what it is for) ----
  const only = <K extends ListKey>(k: K, v: NonNullable<FindFilters[K]>[number]): FindFilters => ({ ...filters, [k]: [v] });
  const listOptions = <K extends ListKey>(k: K, values: readonly NonNullable<FindFilters[K]>[number][], label: (v: NonNullable<FindFilters[K]>[number]) => string): Option[] =>
    values.map((v) => ({ key: String(v), label: label(v), on: !!(filters[k] as readonly string[] | undefined)?.includes(v as string), toggle: () => toggleIn(k, v), count: count(only(k, v)) }));
  const jobOpts = listOptions('jobs', jobIds, (j) => T(`job.${j}`));
  const lightOpts = listOptions('light', LIGHTS, (l) => T(`stratum.${l}`));
  const standOpts = listOptions('stands', Object.keys(STANDS) as Stand[], (s) => { const [from, to] = STANDS[s as Stand]; return say(yearsLine(from, to)); });
  const sizeOpts = listOptions('size', SIZES, (s) => T(`find.size.${s}`, { lo: num(2), len: formatLength(s === 'small' ? 2 : 8, pageLang()) }));
  const holdOpts = listOptions('holds', LATER, (p) => T('find.holds', { period: periodName(p as PeriodId) }));
  const unknownLine = (id: FilterId, kept = false) => unknown[id] !== undefined && (
    <span class="ct-find-unknown" data-filter-unknown={id}>{P(kept ? 'find.unknownKept' : 'find.unknown', unknown[id]!)}</span>
  );
  const chipGroup = (id: FilterId, key: string, opts: Option[], extra?: ComponentChildren) => (
    <fieldset class="ct-find-fgroup">
      <legend>{T(`find.f.${key}`)}</legend>
      <p class="ct-muted ct-small">{T(`find.f.${key}For`)}</p>
      {desk ? (
        // BC13 (board FindDesk): on a laptop each value is a checkbox row, its count at the right.
        <div class="ct-find-rows">
          {opts.map((c) => (
            <label class="ct-check ct-find-check" data-on={c.on ? '' : undefined}>
              <input type="checkbox" data-filter={id} data-value={c.key} checked={c.on} onChange={c.toggle} />
              <span>{c.label}</span>
              <span class="ct-find-boxcount">{num(c.count)}</span>
            </label>
          ))}
        </div>
      ) : (
        <div class="ct-find-chips">
          {opts.map((c) => (
            <button type="button" class="ct-find-chip" data-filter={id} data-value={c.key} aria-pressed={c.on ? 'true' : 'false'} onClick={c.toggle}>
              {id === 'job' && <JobIcon job={c.key as JobId} />}{c.label} <span class="ct-find-chipcount">{num(c.count)}</span>
            </button>
          ))}
        </div>
      )}
      {id !== 'job' && unknownLine(id)}
      {extra}
    </fieldset>
  );
  // A box with its count on the right (board FindFilters): a hide box counts the plants it hides, a
  // keep box ("Fills a hole or a thin job", KEEPS) the plants it keeps, both with the other filters in
  // force: the count says what ticking it gives (R6).
  const box = (id: FilterId, k: BoxKey, label: string, sub?: string, kept = false) => {
    const n = KEEPS.includes(k) ? count({ ...filters, [k]: true }) : count({ ...filters, [k]: false }) - count({ ...filters, [k]: true });
    return (
      <label class="ct-check ct-find-check">
        <input type="checkbox" data-filter={id} checked={!!filters[k]} onChange={() => toggleFilter(k)} />
        <span>{label}{sub && <span class="ct-find-sub">{sub}</span>}{unknownLine(id, kept)}</span>
        <span class="ct-find-boxcount" data-filter-count={id}>{num(n)}</span>
      </label>
    );
  };
  const holdBox = (o: Option, first: boolean) => (
    <label class="ct-check ct-find-check">
      <input type="checkbox" data-filter="holds" data-value={o.key} checked={o.on} onChange={o.toggle} />
      <span>{o.label}{first && <span class="ct-find-sub">{T('find.holdsSub')}</span>}</span>
      <span class="ct-find-boxcount" data-filter-count="holds">{num(o.count)}</span>
    </label>
  );
  // None judged, only "Every plant" can be chosen; the others stay, with their 0 (c1r5 W2).
  const fitBox = (v: Fit, id: string, label: string, sub: string) => (
    <label class="ct-check ct-find-check">
      <input type="radio" name="ct-find-fit" data-filter={id} checked={fit === v} disabled={!judged && v !== 'all'} onChange={() => batch(() => { setFit(v); setOutsideShown(false); })} onClick={() => setListed(true)} />
      <span>{label}<span class="ct-find-sub" data-fit-count="">{sub}</span></span>
    </label>
  );
  const countryName = flagCtx.country ? new Intl.DisplayNames([pageLang()], { type: 'region' }).of(flagCtx.country) ?? flagCtx.country : '';
  const invasiveLabel = countryName ? T('find.hideInvasive', { country: countryName }) : '';
  // "they stay in your palette if already there · toxicity not checked for 250 of the 515 plants"
  const toxicUnknown = base.filter((t) => !t.warnings.toxicity).length;
  const toxicSub = toxicUnknown ? `${T('find.hideToxicSub')} · ${T('find.toxicUnchecked', { n: num(toxicUnknown), total: num(base.length) })}` : T('find.hideToxicSub');
  const outsideAll = applyFilters(matched, { ...filters, range: false }, ctx).rows.filter(isOutside).length;
  // The active filters as removable chips under the search (board FindResults, B7).
  const boxes: [BoxKey, string][] = [['fills', T('find.f.fills')], ['hideNoSize', T('find.hideNoSize')], ['hideToxic', T('find.hideToxic')], ['hideInvasive', invasiveLabel], ['hideNoLight', T('find.hideNoLight')]];
  const active = [
    ...[...jobOpts, ...lightOpts, ...standOpts, ...holdOpts, ...sizeOpts].filter((c) => c.on).map((c) => ({ key: `${c.label}`, label: c.label, off: c.toggle })),
    ...(fit === 'fits' || !judged ? [] : [{ key: 'fit', label: fit === 'inside' ? T('find.range') : T('find.fitAll'), off: () => setFit('fits') }]),
    ...boxes.filter(([k]) => filters[k]).map(([k, label]) => ({ key: k, label, off: () => toggleFilter(k) })),
  ];
  const closeFilters = () => batch(() => { setShowFilters(false); setListed(true); });
  const panel = (
    <div class="ct-find-filters" id="ct-find-filters" data-open={showFilters ? '' : undefined}>
      <div class="ct-find-fhead">
        <h3 id="ct-find-ftitle" ref={filtersHead} tabIndex={-1}>{T('find.filters')}</h3>
        {(onCount > 0 || desk) && <button type="button" class="text-link ct-find-fclear" onClick={clearAll}>{T('find.clear')}</button>}
        <p class="ct-muted ct-small ct-find-flede">{P('find.filtersLede', onCount)}</p>
      </div>
      {chipGroup('job', 'job', jobOpts, box('fills', 'fills', T('find.f.fills')))}
      {chipGroup('light', 'light', lightOpts)}
      {chipGroup('stands', 'stands', standOpts)}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.fit')}</legend>
        <p class="ct-muted ct-small">{T('find.f.fitFor')}</p>
        {fitBox('fits', 'fits', T('find.fits'), `${P('find.fitsCount', fitsCount(filters))}${fitsInPalette ? ` · ${P('find.fitsInPalette', fitsInPalette)}` : ''}`)}
        {judging && fitBox('inside', 'range', T('find.range'), P('find.count', count(filters, 'inside')))}
        {fitBox('all', 'all', T('find.fitAll'), P('find.fitAllCount', count(filters, 'all'), { outside: num(outsideAll) }))}
        {judging && unknownLine('range')}
        {judging && holdOpts.map((o, i) => holdBox(o, i === 0))}
        {judging && unknownLine('holds')}
      </fieldset>
      {chipGroup('size', 'size', sizeOpts)}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.more')}</legend>
        <p class="ct-muted ct-small">{T('find.f.moreFor')}</p>
        {box('toxic', 'hideToxic', T('find.hideToxic'), toxicSub, true)}
        {flagCtx.countryStatus === 'checked' && flagCtx.country && box('invasive', 'hideInvasive', invasiveLabel, undefined, true)}
        {box('no-light', 'hideNoLight', T('find.hideNoLight'))}
        {box('no-size', 'hideNoSize', T('find.hideNoSize'))}
      </fieldset>
      <div class="ct-find-ffoot">
        <button type="button" class="text-link" data-find-filters-clear="" onClick={clearAll}>{T('find.clear')}</button>
        <button type="button" class="button button-primary" data-find-filters-show="" onClick={closeFilters}>{P('find.showN', shownCount)}</button>
      </div>
    </div>
  );

  const status = q ? (pending ? '' : nothing ? T('find.none', { q }) : P('find.count', shownCount)) : '';
  const others = view.others.length > 0 && (
    <section class="ct-find-group ct-find-others" aria-labelledby="ct-find-others">
      <h3 id="ct-find-others">{T('find.otherLists')}</h3>
      <ul class="ct-rows">
        {view.others.map(({ hit, plant, lists: zones }) => {
          const why = whyWords(hit);
          return (
            <li key={plant.id} data-find-row="" data-plant-id={plant.id}>
              <div class="ct-row-main"><strong>{plant.names[pageLang()] || plant.names.en || plant.canonical}</strong> <i class="ct-sci">{plant.canonical}</i></div>
              <div class="ct-row-why">
                {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
                <span class="ct-find-otherlists">
                  {zones.map((z) => (
                    <button key={z} type="button" class="button button-secondary" data-find-other="" onClick={() => void addFrom(plant.id, z)}>{T('find.addFrom', { list: listName(z) })}</button>
                  ))}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
  // The close names of a query nothing answers, as rows with Add (B14, board FindNone "Did you mean:").
  const close = nothing && search
    ? search.close(q, true).map((h) => base.find((t) => t.id === h.id) ?? (atOpen.has(h.id) ? store.taxonOf(h.id) : undefined)).filter((t): t is Taxon => !!t).slice(0, 3)
    : [];
  // The count line (boards FindType, FindResults): the plants shown, then the names searched (a search)
  // or the order (only when the list is ranked: the verdict rule in, r2-08).
  const namesNote = names === 'loading' ? <span data-find-names="loading"> {T('find.namesLoading')}</span>
    : names === 'failed' || names === 'dropped' ? <span data-find-names="failed"> {T('find.namesFailed')}</span> : null;
  // No plant answers and no close name (board FindNone, T8): the names sentence goes in the grey box.
  const noneBox = nothing && !job && !close.length;
  const countLine = pending
    ? <span data-find-searching="">{searchFailed ? T('details.loadFailed') : T('find.searching')}</span>
    : start
      ? namesNote
      : q
        ? <>{!nothing && `${P('find.countSay', shownCount)} `}{namesWords(search?.langs ?? [])}{namesNote}</>
        : <>{P('find.countSay', shownCount)}{judging && ` ${T('find.bestFirst', { period: periodName(periodIds[periodIds.length - 1]) })}`}{namesNote}</>;
  const SEARCH = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>;
  const jobCount = job ? count({ ...filters, jobs: [job] }, fit, base, fit !== 'all' && !outsideShown, fit === 'fits') : 0;

  return (
    // BC7: the title sits in the sheet's head, beside its close button (boards Find, FillHole).
    // N2 (boards Find, FindResults): until the visit's first add the foot bar reads "8 plants in your
    // palette" with Done; from the first add (board AddMany state 3) the head holds the title, "2 added
    // this visit · your palette: 10 plants" and Done, and the foot bar goes. A hole's sheet keeps the
    // outside link and Done in its foot (board FillHole).
    <Frame titleId="ct-find-title" class={`ct-find${holeSheet ? ' ct-find-hole' : ''}`} head={holeSheet || !visitIn.length ? <h2 id="ct-find-title" tabIndex={-1} data-autofocus>{title}</h2> : (
      <div class="ct-find-headrow">
        <div class="ct-find-headtext">
          <h2 id="ct-find-title" tabIndex={-1} data-autofocus>{title}</h2>
          <p class="ct-find-visit" data-find-visit=""><b>{P('find.visit', visitIn.length)}</b> · {P('find.visitPalette', members.length)}</p>
        </div>
        <button type="button" class="button button-primary" onClick={() => store.closeSheet()}>{T('find.done')}</button>
      </div>
    )} foot={holeSheet ? (
      <div class="ct-add-bar">
        {outsideFolded ? <button type="button" class="text-link" data-find-outside="" onClick={() => setOutsideShown(true)}>{P('palette.showOutside', groups.outside.length)}</button> : <span />}
        <button type="button" class="button button-primary" onClick={() => store.closeSheet()}>{T('find.done')}</button>
      </div>
    ) : !visitIn.length ? (
      <div class="ct-add-bar">
        <span class="ct-find-visit" data-find-inpalette-count="">{P('find.inPalette', members.length)}</span>
        <button type="button" class="button button-primary" onClick={() => store.closeSheet()}>{T('find.done')}</button>
      </div>
    ) : null}>
      <div class="ct-find-top">
        <p class="ct-muted" data-find-fitcount="">{subtitle}</p>
        {hole?.thin && <p class="ct-muted ct-small" data-find-sorted="">{T('find.sortedFillsFrom', { lane: say(laneLine(hole)), from: hole.fromYear, to: hole.toYear })}</p>}
        <NotChecked ctx={flagCtx} />
      </div>
      {!holeSheet && <div class="ct-find-searchrow">
        <div class="ct-search">
          {SEARCH}
          <input ref={field} type="search" data-find-search="" aria-label={T('find.search')} placeholder={T('find.search')} value={query}
            onInput={(e) => ask((e.target as HTMLInputElement).value)} onFocus={() => { if (source) wantNames(source, pageLang() as Locale); }} />
          {query && (
            <button type="button" class="ct-find-x" data-find-clear="" aria-label={T('find.clearSearch')} onClick={() => { ask(''); field.current?.focus(); }}>{CROSS}</button>
          )}
        </div>
        <button ref={filtersBtn} type="button" class="button button-secondary ct-find-filters-btn" aria-expanded={showFilters} aria-controls="ct-find-filters" onClick={() => setShowFilters(!showFilters)}>
          {SLIDERS} {onCount ? T('find.filtersOn', { n: onCount }) : T('find.filters')}
        </button>
        {/* Board FindDesk: beside the field on a laptop, where the search runs. */}
        {desk && <span class="ct-find-local" data-find-local="">{T('palette.next.searchLocal')}</span>}
      </div>}
      {!holeSheet && active.length > 0 && (
        <p class="ct-find-active" data-find-active="">
          {active.map((c) => (
            <button key={c.key} type="button" class="ct-find-chip" data-active-chip="" aria-label={T('find.removeFilter', { name: c.label })} onClick={c.off}>
              {c.label} {CROSS}
            </button>
          ))}
          <button type="button" class="text-link" onClick={clearAll}>{T('find.clearShort')}</button>
        </p>
      )}
      {!noneBox && !holeSheet && !(start && !namesNote) && <p class="ct-muted ct-small ct-find-names" data-find-count="">{countLine}</p>}
      <p class="visually-hidden" data-find-status="" aria-live="polite">{status}</p>
      <div class="ct-find-layout">
        {!holeSheet && panel}
        <div class="ct-find-results">
          {job && (
            <div class="ct-find-job" data-job={job}>
              <span class="ct-find-jobtile"><JobIcon job={job} /></span>
              <div class="ct-find-jobtext">
                <p class="ct-muted ct-small">{T('find.jobIs', { q })}</p>
                <p><strong>{T(`job.${job}`)}</strong></p>
                <p class="ct-find-jobmeans">{P(`find.jobMeans.${job}`, jobCount)} {P('find.jobHas', memberTaxa.filter((t) => jobsOf(t).includes(job)).length)}</p>
              </div>
              <button type="button" class="button button-primary" onClick={() => batch(() => { setFilters((f) => ({ ...f, jobs: [job] })); ask(''); })}>
                {P('find.jobShow', jobCount)} {CHEVRON}
              </button>
            </div>
          )}
          {job && nothing && <p class="ct-small" data-find-none="">{T('find.notNamed', { q })}</p>}
          {job && (
            <p class="ct-muted ct-small" data-find-jobwords="">{T('find.jobWordsAll', { words: jobIds.map((j) => jobWords(j)[1] ?? jobWords(j)[0]).join(', ') })}</p>
          )}
          {start && open.length > 0 && members.length > 0 && (
            // The palette's holes first (board Find); each opens Find for it. C8: the size rule (A14), every
            // hole while the palette has 40 plants or fewer, else MoreList's fold; the board's 4-of-7 fold is a
            // known board difference.
            // BC25: each row counts what the Next step counts for that hole (holeFillers: the plants that
            // fit, no second look); none fits, the one ordered rule of the 200-plant sentence (PFA-R3:
            // holeEndWords, the second looks then those on the lists not checked), or that none fits.
            <section class="ct-find-holes" data-find-holes="" aria-labelledby="ct-find-holes">
              <h3 id="ct-find-holes">{P('find.holesHead', open.length)}</h3>
              <MoreList items={open} keyOf={(h) => h.id} paletteSize={members.length} group={P('find.holesHead', open.length)} render={(h) => {
                const f = holeFillers(h, memberTaxa, open), u = uncheckedLine(h);
                return <HoleRow h={h} end={holeEndWords(f)} extra={u ? say(u) : null} onClick={() => openFillers(h)} attrs={{ 'data-find-hole': h.id }} />;
              }} />
            </section>
          )}
          {start && (
            <section class="ct-find-byjob" data-find-byjob="" aria-labelledby="ct-find-byjob">
              <h3 id="ct-find-byjob">{T('find.byJob')}</h3>
              <div class="ct-find-chips">
                {jobOpts.map((c) => (
                  <button key={c.key} type="button" class="ct-find-chip" data-job-chip={c.key} aria-pressed={c.on ? 'true' : 'false'} onClick={c.toggle}>
                    <JobIcon job={c.key as JobId} />{c.label} <span class="ct-find-chipcount">{num(c.count)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {view.inPalette.length > 0 && (q || paletteOpen ? (
            <section class="ct-find-group" data-find-inpalette="" aria-labelledby="ct-find-g-palette">
              <h3 id="ct-find-g-palette">{T('find.inYourPalette')} <span class="ct-muted">{num(view.inPalette.length)}</span></h3>
              <ul class="ct-rows">{view.inPalette.map(row)}</ul>
            </section>
          ) : (
            // A job list (board FindResults, T18): the palette's plants named on one line, "Show" lists them.
            // BC13 (board FindDesk): its own group heading, the names under it.
            <section class="ct-find-group ct-find-kept" data-find-inpalette-line="" aria-labelledby="ct-find-g-palette-line">
              <h3 id="ct-find-g-palette-line">{T('find.inYourPalette')} <span class="ct-muted">{num(view.inPalette.length)}</span></h3>
              <p class="ct-muted">{view.inPalette.map(nameOf).join(', ')} · <button type="button" class="text-link" onClick={() => setPaletteOpen(true)}>{T('find.show')}</button></p>
            </section>
          ))}
          {view.byFilters > 0 && (
            <p class="ct-find-kept" data-find-hidden-filters="">{P('find.hiddenByFilters', view.byFilters)} · <button type="button" class="text-link" onClick={clearAll}>{T('find.clearShort')}</button></p>
          )}
          {view.outsideHole > 0 && (
            <p class="ct-find-kept" data-find-outside-hole="">{P('find.outsideHole', view.outsideHole)} · <button type="button" class="text-link" onClick={() => setWide(true)}>{T('find.show')}</button></p>
          )}
          {start || pending ? null : nothing && job ? null : nothing && close.length > 0 ? (
            // A typing slip (board FindNone): the close names as rows; a plant found, no "Ask us" (K13).
            <div class="ct-find-slip" data-find-none="">
              <p>{T('find.none', { q })} {T('find.closeSpell')}</p>
              <ul class="ct-rows" data-find-close-rows="" data-find-close="">{close.map(row)}</ul>
            </div>
          ) : noneBox ? (
            // Board FindNone: the grey box says it and which names are searched; the ways on below it.
            <div class="ct-find-none" data-find-none="">
              <p class="ct-find-nonebox">{SEARCH}<span><strong>{T('find.none', { q })}</strong> {namesWords(search?.langs ?? [])}{namesNote}</span></p>
              <p class="ct-muted">{T('find.askHint')}</p>
              <p class="ct-find-ask">
                <a class="button button-secondary" data-find-ask="" href={askHref(q)}>{T('find.ask', { q })}</a>
                <button type="button" class="text-link" data-find-none-clear="" onClick={() => { ask(''); field.current?.focus(); }}>{T('find.clearShort')}</button>
              </p>
            </div>
          ) : (
            <>
              {GROUPS.filter(shown).map((g) => (
                <section key={g} class="ct-find-group" data-find-group={g} aria-labelledby={holeSheet && g === 'fits' ? 'ct-find-title' : `ct-find-g-${g}`}>
                  {/* BC9: in a hole's sheet the plants that fit come first with no heading, then "Needs a second look (15)". */}
                  {/* PFA-B2: the Next step's group heading for the plants not checked, "Not checked (4)". */}
                  {holeSheet ? g !== 'fits' && <h3 id={`ct-find-g-${g}`}>{g === 'look' ? T('palette.secondLook', { n: num(groups[g].length) }) : g === 'unchecked' ? T('palette.next.notCheckedHead', { n: num(groups[g].length) }) : <>{groupWords(g, store.period.value)} <span class="ct-muted">{num(groups[g].length)}</span></>}</h3>
                    : <h3 id={`ct-find-g-${g}`}>{groupWords(g, store.period.value)} <span class="ct-muted">{g === 'look' ? T('find.lookWhy', { n: num(groups[g].length) }) : num(groups[g].length)}</span></h3>}
                  {g === 'outside' && <p class="ct-muted ct-small" data-find-anyway="">{T('find.anywayNote')}</p>}
                  {/* N4: each group is a MoreList (the size rule, A14), no other cap. */}
                  <MoreList items={groups[g]} keyOf={(t) => t.id} paletteSize={members.length} group={groupWords(g, store.period.value)} render={(t) => rowBody(t, 'div')} class="ct-find-rows-list" />
                </section>
              ))}
              {outsideFolded && !holeSheet && (
                <p><button type="button" class="button button-secondary" data-find-outside="" onClick={() => setOutsideShown(true)}>{P('palette.showOutside', groups.outside.length)}</button></p>
              )}
              {others}
            </>
          )}
          {!q && !holeSheet && (
            // Paste a list (board Find: at the foot of the start and of a list, hidden while typing, K10, K19),
            // then "Look in another climate's list" (the other curated lists, to add from as a guest).
            <p class="ct-find-pastelink ct-find-footlinks">
              <button ref={pasteBtn} type="button" class="text-link" data-find-paste="" onClick={() => setPasting(true)}>{T('find.paste')}</button>
              {otherZones.length > 0 && <>{' · '}<button type="button" class="text-link" data-find-otherlist="" aria-expanded={lookOther} onClick={() => setLookOther(!lookOther)}>{T('palette.next.otherList')}</button></>}
            </p>
          )}
          {!q && !holeSheet && lookOther && otherZones.length > 0 && (
            <p class="ct-find-otherzones" data-find-otherzones="">
              {otherZones.map((z) => (
                <button key={z} type="button" class="ct-find-chip" aria-pressed={otherZone === z ? 'true' : 'false'} onClick={() => void showOther(z)}>{zoneName(z)}</button>
              ))}
            </p>
          )}
          {!q && !holeSheet && lookOther && otherZone && otherRows && (
            <section class="ct-find-group ct-find-others" aria-labelledby="ct-find-otherzone">
              <h3 id="ct-find-otherzone">{listName(otherZone)} <span class="ct-muted">{num(otherRows.length)}</span></h3>
              <MoreList items={otherRows} keyOf={(t) => t.id} paletteSize={members.length} group={listName(otherZone)} render={(t) => (
                <div class="ct-find-otherrow" data-find-row="" data-plant-id={t.id}>
                  <div class="ct-row-main"><strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i></div>
                  <button type="button" class="button button-secondary" data-find-other="" disabled={added(t.id)} onClick={() => void addFrom(t.id, otherZone)}>{added(t.id) ? T('find.added') : T('find.addFrom', { list: listName(otherZone) })}</button>
                </div>
              )} />
            </section>
          )}
        </div>
      </div>
    </Frame>
  );
}
