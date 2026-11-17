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
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, JobId, Locale, PeriodId, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fitLine, jobIds, jobsOf, periodIds, queryTokens, yearsLine, yearsOf } from '../../../../lib/consortium/index.ts';
import { namesLine, whyLines, type FindHit } from '../../data/search.ts';
import { addsWithWarning, applyFilters, bestFirst, findGroups, GROUPS, jobsMatching, LIGHTS, LIVES, SIZES, STANDS, wellInside, type FilterId, type FindFilters, type Group, type Stand } from '../../rules/find-query.ts';
import { NotChecked, SheetWaiting, type Frame } from '../kit/sheet.tsx';
import { FitLine, JobIcon, holeWords, say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { listName, nameOf, nameOrder, num } from '../kit/names.ts';
import { formatLength } from '../../format.ts';
import { page } from '../kit/page.ts';
import { finder, finderFailed, namesState, releasePlants, wantNames } from './names.ts';
import { Marks } from './marks.tsx';
import Paste from './Paste.tsx';

// The later periods "Holds by …" offers (types.ts periodIds), named as future.ts periodName names them
// (not imported: it would bring the future and range chunks into Find's first use, as pool.tsx says).
const LATER = periodIds.slice(1);
const periodWords = (p: PeriodId): string => p.replace('-', '–');

// A language's name in the page's language ("French"), for "French name: Gombo".
const langName = (code: string): string => {
  try { return new Intl.DisplayNames([pageLang()], { type: 'language' }).of(code) ?? code; } catch { return code; }
};
// A group's heading: the verdict words of its level for the page's period (verdict-line.ts fitLine,
// the one owner of them: "Fits your place today", "Needs a second look", …), never Find's own copy.
const verdictOf = (level: PlantVerdict['level'], judged: PeriodId): PlantVerdict => ({ id: '', judged, ownYears: false, level, limiting: null, factors: [], notes: [] });
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
// A job's words in the page's language (board FindJob): its label and the other words it answers to.
const jobWords = (job: JobId): string[] => [T(`job.${job}`), ...T(`find.jobWords.${job}`).split(',').map((w) => w.trim()).filter(Boolean)];
// The contact form, carrying the query (PP-C2; the form reads `plant`, a hand-off to Contact.astro).
function askHref(q: string): string {
  const url = new URL(page().start.contact, location.href);
  url.search = `?plant=${encodeURIComponent(q)}`; // %20, not '+', so any reader decodes it
  return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

// A group lists a screenful, the rest behind "Show all N" (board FindResults; no 500-row render).
const SCREEN = 20;

// A row's light, size and years (board FindResults: "needs a lot of light · 18 m wide, 40 m tall"),
// measures through format.ts, years through verdict-line.ts. The light words name every light the
// plant takes, so a plant of some shade that also takes full sun says so (K16: never words a sun hole
// contradicts).
function lightWords(t: Taxon): string | null {
  const { sun, semi_shade: some, full_shade: deep } = t.traits;
  if (sun && deep) return T('find.lightAny');
  if (sun && some) return T('find.lightSunSome');
  return deep ? T('find.lightDeep') : some ? T('find.lightSome') : sun ? T('find.lightSun') : null;
}
function sizeWords(t: Taxon): string {
  const lang = pageLang(), w = t.traits.width_max_m, h = t.traits.height_m?.max ?? null;
  const W = w === null ? '' : formatLength(w, lang), H = h === null ? '' : formatLength(h, lang);
  return w !== null && h !== null ? T('find.sizeBoth', { w: W, h: H }) : h !== null ? T('find.sizeTall', { h: H }) : w !== null ? T('find.sizeWide', { w: W }) : T('find.sizeNone');
}
// The one roles list (c1r3 T20): lower case after its first word where the language writes it so
// (German keeps its capitals, its nouns need them; Chinese, Japanese and Korean have no case). In a job
// hole the hole's own job is left out, the rest "Also …" (board FillHole, T15): the row's first line
// already says it fills the hole; so is a job list's one job (c1r4 U7): every row does it.
const LOWER = new Set(['en', 'fr', 'es', 'pt', 'it', 'nl', 'ru']);
function rolesWords(jobs: readonly JobId[], also: boolean): string {
  const lang = pageLang(), low = (s: string) => (LOWER.has(lang) ? s.charAt(0).toLocaleLowerCase(lang) + s.slice(1) : s);
  const list = jobs.map((j, i) => (i > 0 || also ? low(T(`job.${j}`)) : T(`job.${j}`))).join(', ');
  return also && list ? T('find.also', { jobs: list }) : list;
}
// known: the job the list is filtered by, left out ("Also …") only on a row that does it (c1r5 W3: a
// searched palette plant or a close spelling may not).
function metaWords(t: Taxon, known: JobId | null): string {
  const own = jobsOf(t), drop = known && own.includes(known) ? known : null;
  const y = yearsOf(t), jobs = rolesWords(own.filter((j) => j !== drop), !!drop);
  return [jobs, lightWords(t), sizeWords(t), y && say(yearsLine(y.from, y.to))].filter(Boolean).join(' · ');
}
// A hole's lane in words ("Covers the ground", "Needs full sun"), as holeWords says it.
const laneWords = (h: NonNullable<store.SheetFor['hole']>): string => T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`);

// The add button's mark (board FindResults: "+ Add", "✓ Added"); the word carries the meaning.
const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const TICK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const CROSS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const CHEVRON = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

type Fit = 'fits' | 'inside' | 'all';
type Option = { key: string; label: string; on: boolean; toggle: () => void; count: number };

export default function Find({ Frame }: { Frame: Frame }) {
  const source = store.source.value;
  const climate = store.climate.value;
  const { hole, fits } = store.sheetTarget.value;
  // The members when Find opened: listed apart ("In your palette"); a plant added here keeps its row,
  // its button turned to "Added".
  const [atOpen] = useState(() => new Set(store.members.peek()));
  const [query, setQuery] = useState('');
  const [chosen, setFilters] = useState<FindFilters>({});
  // The fit choice (board FindFilters, B8): fits (the outside plants folded behind one counted
  // button, in a hole and in plain Find, B3), well inside its range only, every plant.
  const [fitChoice, setFit] = useState<Fit>('fits');
  const [whole, setWhole] = useState<ReadonlySet<Group>>(new Set()); // the groups shown whole ("Show all N")
  const [outsideShown, setOutsideShown] = useState(false); // "Show N outside their climate range" pressed
  // The hole's preset lifted for a search ("N on your list but outside this hole · Show"): the whole
  // list for that search only; another query or none, the hole's plants again (fix round 2, r2-12).
  const [wide, setWide] = useState(false);
  const ask = (text: string) => batch(() => { setQuery(text); setWide(false); });
  // The list asked for from the start (c1r3 T3): "Show N plants" or the start's "Show the N plants
  // that fit". The start is no query, no hole, no filter and not listed.
  const [listed, setListed] = useState(false);
  // The palette's plants a filtered list matches, shown on "Show" (board FindResults, T18).
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [select, setSelect] = useState(false);
  const [ticked, setTicked] = useState<PlantId[]>([]);
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
    const list = hole && fits && !wide ? (offer ?? []).filter(fits) : pool ?? [];
    return list.filter((t) => !atOpen.has(t.id)).sort(order);
  }, [pool, offer, hole, fits, wide, atOpen, order]);
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
  const warned = useMemo(() => new Set(base.filter((t) => addsWithWarning(flagsOf.get(t.id) ?? [])).map((t) => t.id)), [base, flagsOf]);
  // Best first (B2, K2): in a hole, the plants that fill it (its test `fits`, handed by the palette page:
  // sheet chunks never import holes.ts, E6-5d), then the later periods a plant stays in range through,
  // then well inside its range before near its edge, then the name. The palette's other holes are not
  // known here (fix round 1: a seam for pf, one store computed of the holes that Palette and Find both
  // read), so plain Find ranks by the years in range and the fit only.
  const filled = useMemo(() => new Map(hole && fits ? base.map((t) => [t.id, fits(t) ? 1 : 0] as const) : []), [base, hole, fits]);
  // The periods after the one viewed (fix round 2, r2-09): an outside plant's first one in range ("In
  // range by 2071–2099", B5) and how many a plant stays in range through (best first).
  const after = periodIds.slice(periodIds.indexOf(vctx.period) + 1);
  const inRangeBy = (t: Taxon): string | null => {
    if (!judging) return null;
    const p = after.find((x) => rule!.holdsBy(t, vctx, x));
    return p ? periodWords(p) : null;
  };
  const stay = useMemo(() => {
    const m = new Map<PlantId, number>();
    if (judging) for (const t of base) { let n = 0; for (const p of after) { if (!rule!.holdsBy(t, vctx, p)) break; n++; } m.set(t.id, n); }
    return m;
  }, [base, judging, rule, vctx]);
  const firm = useMemo(() => new Map(base.map((t) => [t.id, wellInside(verdicts?.get(t.id)) ? 1 : 0] as const)), [base, verdicts]);
  // Its warnings (fewer first, T7): the flags an add warns about.
  const warnCount = useMemo(() => new Map(base.map((t) => [t.id, (flagsOf.get(t.id) ?? []).filter((f) => addsWithWarning([f])).length] as const)), [base, flagsOf]);

  // The query's hits, best first; those in the list, those in other lists, those already in the palette.
  const hits = useMemo(() => (q && search ? search(q) : null), [q, search]);
  const job = useMemo(() => (q ? jobsMatching(q, jobWords)[0] ?? null : null), [q]);
  const ctx = useMemo(() => {
    const have = new Set(memberTaxa.flatMap((t) => jobsOf(t)));
    return {
      verdicts,
      holds: judging ? (t: Taxon, p: PeriodId) => rule!.holdsBy(t, vctx, p) : undefined,
      repeats: (t: Taxon) => { const j = jobsOf(t); return j.length ? j.every((x) => have.has(x)) : null; },
      toxic: (t: Taxon) => (t.warnings.toxicity ? t.warnings.toxicity.level !== 'None' : null),
      invasive: (t: Taxon) => (flagCtx.countryStatus === 'checked' && flagCtx.country && t.warnings.invasive_in ? t.warnings.invasive_in.some((r) => r.country === flagCtx.country) : null),
    };
  }, [verdicts, rule, judging, vctx, flagCtx, memberTaxa]);
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
  // plant", in its "Not checked" group; a search lists every hit, marked.
  const drops = (v: Fit) => v === 'fits' && !q;
  // The one count: how many plants the list shows under these filters and this fit choice.
  // (the job card counts the list its "Show these N plants" lists: the whole list, the query gone).
  const count = (f: FindFilters, v: Fit = fit, list = matched, fold = folds(v), drop = drops(v)): number => {
    const rows = applyFilters(list, { ...f, range: v === 'inside' }, ctx).rows;
    return rows.filter((t) => !(fold && isOutside(t)) && !(drop && !isFit(t) && !isOutside(t))).length;
  };
  const view = useMemo(() => {
    const hitOf = new Map<PlantId, FindHit>();
    hits?.forEach((h) => hitOf.set(h.id, h));
    const { rows, unknown, hidden } = applyFilters(matched, filters, ctx);
    const groups = findGroups(rows, verdicts, warned);
    const inList = new Set(base.map((t) => t.id));
    const own = new Set(pool?.map((t) => t.id) ?? []);
    const others = (hits ?? []).filter((h) => !inList.has(h.id) && !own.has(h.id) && !members.includes(h.id)).flatMap((h) => {
      const p = releasePlants.value.get(h.id);
      const lists = p ? p.lists.filter((z) => z !== climate) : [];
      return p && lists.length ? [{ hit: h, plant: p, lists }] : [];
    }).slice(0, 8);
    // The hits kept out, each counted once with its way out (fix round 1, A1): in the palette (rows
    // marked Added), hidden by the filters (Clear), on the list but outside the hole (Show).
    // A job list (no query, T18): the palette's plants the filters keep, named on one line with "Show".
    const inPalette = hits
      ? hits.filter((h) => atOpen.has(h.id)).map((h) => store.taxonOf(h.id)).filter((t): t is Taxon => !!t)
      : !q && !hole && filters.jobs?.length ? applyFilters(memberTaxa.filter((t) => atOpen.has(t.id)), filters, ctx).rows : [];
    const byFilters = hits ? matched.length - rows.length : 0;
    const outsideHole = hits ? hits.filter((h) => own.has(h.id) && !inList.has(h.id) && !atOpen.has(h.id)).length : 0;
    return { hitOf, groups, unknown, hidden, others, inPalette, byFilters, outsideHole };
  }, [matched, hits, chosen, fit, judging, ctx, verdicts, warned, pool, members, climate, atOpen, memberTaxa, hole, q, releasePlants.value]);

  if (!climate) return null;
  if (pasting) return <Paste Frame={Frame} onBack={(name?: string) => batch(() => { setPasting(false); setBackFromPaste(true); if (name) ask(name); })} />;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  const toggleFilter = (k: 'edible' | 'hideNoSize' | 'hideRepeats' | 'hideToxic' | 'hideInvasive') => setFilters((f) => ({ ...f, [k]: !f[k] }));
  type ListKey = 'jobs' | 'light' | 'size' | 'life' | 'stands' | 'holds';
  const toggleIn = <K extends ListKey>(k: K, v: NonNullable<FindFilters[K]>[number]) => setFilters((f) => {
    const now = (f[k] ?? []) as readonly string[];
    return { ...f, [k]: now.includes(v) ? now.filter((x) => x !== v) : [...now, v] };
  });
  const added = (id: PlantId) => members.includes(id);
  const addOne = (t: Taxon, from?: ClimateZone) => {
    if (added(t.id)) return;
    store.addMembers([t.id], from ? { [t.id]: from } : {}, { warned: warned.has(t.id) ? [t.id] : [], text: T('find.addedOne', { name: nameOf(t) }) });
  };
  const addFrom = async (id: PlantId, z: ClimateZone) => {
    const list = await store.loadPool(z);
    const t = list?.find((x) => x.id === id);
    if (t) store.addMembers([id], { [id]: z }, { warned: addsWithWarning(store.flagsOfPlant(t)) ? [id] : [], text: T('find.addedOne', { name: nameOf(t) }) });
  };
  const addTicked = () => {
    const ids = ticked.filter((id) => !added(id));
    if (!ids.length) return;
    batch(() => { store.closeSheet(); store.addMembers(ids, {}, { warned: ids.filter((id) => warned.has(id)) }); });
  };
  const tick = (id: PlantId) => setTicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // The filters on: each chosen value, and a fit choice other than "Fits your place".
  const lists = (['jobs', 'light', 'stands', 'size', 'life', 'holds'] as const).reduce((n, k) => n + (filters[k]?.length ?? 0), 0);
  const onCount = lists + (['edible', 'hideNoSize', 'hideRepeats', 'hideToxic', 'hideInvasive'] as const).filter((k) => filters[k]).length + (fit === 'fits' || !judged ? 0 : 1);
  const clearAll = () => batch(() => { setFilters({}); setFit('fits'); setOutsideShown(false); });
  // The one count of what the screen lists as rows (c1r3 T14, c1r4 U2): the list's rows, the palette's
  // plants when listed as rows (a search, or "Show" pressed; folded on a job list they are a line of
  // names) and the other lists' rows; the count line, the status and "Show N plants" all say it.
  const paletteRows = q || paletteOpen ? view.inPalette.length : 0;
  const shownCount = count(filters) + paletteRows + view.others.length;
  // "Fits your place" under these filters: the judged plants only (isFit), as the list it lists.
  const fitsCount = (f: FindFilters) => applyFilters(matched, { ...f, range: false }, ctx).rows.filter(isFit).length;

  const title = hole ? holeWords(hole) : T('find.title');
  // The subtitle (board Find, B4, K3, T14): how many of the plants not yet in the palette fit the place,
  // the number the fit choice says with no filter; in a hole, how many fill it and fit, the number its
  // count line says; none judged to fit (nothing checked), the plain count (c1r4 U3). The start lists
  // the jobs as chips; no list until the grower searches, picks a job, sets a filter or asks for it. (The board's "Your palette lacks N holes" needs the holes in a
  // store computed: sheet chunks never import holes.ts; a seam for pf.)
  const later = store.period.value !== periodIds[0], fitsHere = judged;
  const subtitle = !fitsHere ? P('find.lede', base.length, { list: listName(climate) })
    : hole ? P('find.holeLede', fitsHere, { list: listName(climate) })
      : P(later ? 'find.fitCountLater' : 'find.fitCount', fitsHere, { total: num(base.length), list: listName(climate), period: periodWords(store.period.value) });
  const start = !q && !hole && onCount === 0 && !listed;
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
  const row = (t: Taxon) => {
    const h = view.hitOf.get(t.id), why = h ? whyWords(h) : null;
    const lines = flagLines(t, flagsOf.get(t.id) ?? [], scene);
    const on = ticked.includes(t.id), done = added(t.id);
    const v = verdicts?.get(t.id), outside = v?.level === 'outside', y = yearsOf(t);
    const later = outside ? inRangeBy(t) : null;
    // "Fits your place to 2099" (K1): the last later period it stays in range through.
    const n = stay.get(t.id) ?? 0, shownV = v && v.level === 'fits' && n > 0 ? { ...v, judged: after[n - 1] } : v;
    return (
      <li key={t.id} data-find-row="" data-plant-id={t.id} class={on ? 'is-on' : undefined}>
        <div class="ct-row-main"><strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i></div>
        {select && !done && !outside
          ? <label class="ct-tick"><input type="checkbox" checked={on} aria-label={`${nameOf(t)}, ${t.canonical_name}`} onChange={() => tick(t.id)} /></label>
          : (
            <button type="button" class={`button button-secondary ct-find-add${done ? ' is-added' : ''}`} data-find-add="" data-added={done ? '' : undefined}
              aria-disabled={done ? 'true' : undefined} aria-label={done ? T('find.addedName', { name: nameOf(t) }) : T('find.addName', { name: nameOf(t) })} onClick={() => addOne(t)}>
              {done ? TICK : PLUS} {done ? T('find.added') : outside ? T('addAnyway') : T('find.add')}
            </button>
          )}
        <div class="ct-row-why">
          {hole && fits?.(t) && y && <span class="ct-find-fills" data-find-fills="">{TICK} {T('find.fillsThis', { what: laneWords(hole), years: say(yearsLine(y.from, y.to)) })}</span>}
          {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
          <span class="ct-find-meta" data-find-meta="">{metaWords(t, hole?.kind === 'job' ? hole.job ?? null : filters.jobs?.length === 1 ? filters.jobs[0] : null)}</span>
          <FitLine v={shownV} />
          {later && <span class="ct-line" data-find-inrange="">{T('find.inRangeBy', { period: later })}</span>}
          <Marks t={t} lines={lines} country={scene.country} />
        </div>
      </li>
    );
  };

  // ---- the filters (board FindFilters, its sections in its order; each says what it is for) ----
  const only = <K extends ListKey>(k: K, v: NonNullable<FindFilters[K]>[number]): FindFilters => ({ ...filters, [k]: [v] });
  const listOptions = <K extends ListKey>(k: K, values: readonly NonNullable<FindFilters[K]>[number][], label: (v: NonNullable<FindFilters[K]>[number]) => string): Option[] =>
    values.map((v) => ({ key: String(v), label: label(v), on: !!(filters[k] as readonly string[] | undefined)?.includes(v as string), toggle: () => toggleIn(k, v), count: count(only(k, v)) }));
  const jobOpts = listOptions('jobs', jobIds, (j) => T(`job.${j}`));
  const lightOpts = listOptions('light', LIGHTS, (l) => T(`find.light.${l}`));
  const standOpts = listOptions('stands', Object.keys(STANDS) as Stand[], (s) => { const [from, to] = STANDS[s as Stand]; return say(yearsLine(from, to)); });
  const sizeOpts = listOptions('size', SIZES, (s) => T(`find.size.${s}`, { lo: num(2), len: formatLength(s === 'small' ? 2 : 8, pageLang()) }));
  const lifeOpts = listOptions('life', LIVES, (l) => T(`find.life.${l}`));
  const holdOpts = listOptions('holds', LATER, (p) => T('find.holds', { period: periodWords(p as PeriodId) }));
  const unknownLine = (id: FilterId, kept = false) => unknown[id] !== undefined && (
    <span class="ct-find-unknown" data-filter-unknown={id}>{P(kept ? 'find.unknownKept' : 'find.unknown', unknown[id]!)}</span>
  );
  const chipGroup = (id: FilterId, key: string, opts: Option[], extra?: ComponentChildren) => (
    <fieldset class="ct-find-fgroup">
      <legend>{T(`find.f.${key}`)}</legend>
      <p class="ct-muted ct-small">{T(`find.f.${key}For`)}</p>
      <div class="ct-find-chips">
        {opts.map((c) => (
          <button type="button" class="ct-find-chip" data-filter={id} data-value={c.key} aria-pressed={c.on ? 'true' : 'false'} onClick={c.toggle}>
            {id === 'job' && <JobIcon job={c.key as JobId} />}{c.label} <span class="ct-find-chipcount">{num(c.count)}</span>
          </button>
        ))}
      </div>
      {id !== 'job' && unknownLine(id)}
      {extra}
    </fieldset>
  );
  // A box with its count on the right (board FindFilters): a hide box counts the plants it hides, a
  // keep box (edible, holds) the plants it keeps, both with the other filters in force.
  type BoxKey = 'edible' | 'hideNoSize' | 'hideRepeats' | 'hideToxic' | 'hideInvasive';
  const box = (id: FilterId, k: BoxKey, label: string, sub?: string, kept = false) => {
    const hides = k !== 'edible';
    const n = hides ? count({ ...filters, [k]: false }) - count({ ...filters, [k]: true }) : count({ ...filters, [k]: true });
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
      <input type="radio" name="ct-find-fit" data-filter={id} checked={fit === v} disabled={!judged && v !== 'all'} onChange={() => batch(() => { setFit(v); setOutsideShown(false); })} />
      <span>{label}<span class="ct-find-sub" data-fit-count="">{sub}</span></span>
    </label>
  );
  const countryName = flagCtx.country ? new Intl.DisplayNames([pageLang()], { type: 'region' }).of(flagCtx.country) ?? flagCtx.country : '';
  const invasiveLabel = countryName ? T('find.hideInvasive', { country: countryName }) : '';
  const outsideAll = applyFilters(matched, { ...filters, range: false }, ctx).rows.filter(isOutside).length;
  // The active filters as removable chips under the search (board FindResults, B7).
  const boxes: [BoxKey, string][] = [['edible', T('find.edible')], ['hideNoSize', T('find.hideNoSize')], ['hideRepeats', T('find.hideRepeats')], ['hideToxic', T('find.hideToxic')], ['hideInvasive', invasiveLabel]];
  const active = [
    ...[...jobOpts, ...lightOpts, ...standOpts, ...holdOpts, ...sizeOpts, ...lifeOpts].filter((c) => c.on).map((c) => ({ key: `${c.label}`, label: c.label, off: c.toggle })),
    ...(fit === 'fits' || !judged ? [] : [{ key: 'fit', label: fit === 'inside' ? T('find.range') : T('find.fitAll'), off: () => setFit('fits') }]),
    ...boxes.filter(([k]) => filters[k]).map(([k, label]) => ({ key: k, label, off: () => toggleFilter(k) })),
  ];
  const closeFilters = () => batch(() => { setShowFilters(false); setListed(true); });
  const panel = (
    <div class="ct-find-filters" id="ct-find-filters" data-open={showFilters ? '' : undefined}>
      <div class="ct-find-fhead">
        <h3 id="ct-find-ftitle" ref={filtersHead} tabIndex={-1}>{T('find.filters')}</h3>
        {onCount > 0 && <button type="button" class="text-link ct-find-fclear" onClick={clearAll}>{T('find.clear')}</button>}
        <p class="ct-muted ct-small ct-find-flede">{P('find.filtersLede', onCount)}</p>
      </div>
      {chipGroup('job', 'job', jobOpts)}
      {chipGroup('light', 'light', lightOpts)}
      {chipGroup('stands', 'stands', standOpts)}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.fit')}</legend>
        <p class="ct-muted ct-small">{T('find.f.fitFor')}</p>
        {fitBox('fits', 'fits', T('find.fits'), P('find.fitsCount', fitsCount(filters)))}
        {judging && fitBox('inside', 'range', T('find.range'), P('find.count', count(filters, 'inside')))}
        {fitBox('all', 'all', T('find.fitAll'), P('find.fitAllCount', count(filters, 'all'), { outside: num(outsideAll) }))}
        {judging && unknownLine('range')}
      </fieldset>
      {judging && (
        <fieldset class="ct-find-fgroup">
          <legend>{T('find.f.later')}</legend>
          <p class="ct-muted ct-small">{T('find.f.laterFor')}</p>
          {holdOpts.map((o, i) => holdBox(o, i === 0))}
          {unknownLine('holds')}
        </fieldset>
      )}
      {chipGroup('size', 'size', sizeOpts, box('no-size', 'hideNoSize', T('find.hideNoSize')))}
      {chipGroup('life-cycle', 'life', lifeOpts)}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.more')}</legend>
        <p class="ct-muted ct-small">{T('find.f.moreFor')}</p>
        {box('repeats', 'hideRepeats', T('find.hideRepeats'), undefined, true)}
        {box('edible', 'edible', T('find.edible'))}
        {box('toxic', 'hideToxic', T('find.hideToxic'), T('find.hideToxicSub'), true)}
        {flagCtx.countryStatus === 'checked' && flagCtx.country && box('invasive', 'hideInvasive', invasiveLabel, undefined, true)}
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
      ? <><button type="button" class="text-link" data-find-list="" onClick={() => setListed(true)}>{P(judged ? 'find.showFit' : 'find.showN', count(filters))}</button>{namesNote}</>
      : q
        ? <>{!nothing && `${P('find.countSay', shownCount)} `}{namesWords(search?.langs ?? [])}{namesNote}</>
        : <>{P('find.countSay', shownCount)}{judging && ` ${T('find.bestFirst')}`}{namesNote}</>;
  const SEARCH = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>;
  const jobCount = job ? count({ ...filters, jobs: [job] }, fit, base, fit !== 'all' && !outsideShown, fit === 'fits') : 0;
  const switchShown = (!q && !start) || select;

  return (
    <Frame titleId="ct-find-title" class="ct-find" head={hole ? <span class="ct-muted">{T('find.title')}</span> : null} foot={
      select ? (
        <div class="ct-add-bar" data-find-bar="">
          <span>{P('find.selected', ticked.length)}</span>
          <button type="button" class="button button-primary" disabled={!ticked.length} onClick={addTicked}>{PLUS} {P('find.addSel', ticked.length)}</button>
        </div>
      ) : (
        <div class="ct-add-bar">
          <span>{P('find.inPalette', members.length)}</span>
          <button type="button" class="button button-primary" onClick={() => store.closeSheet()}>{T('find.done')}</button>
        </div>
      )
    }>
      <div class="ct-find-top">
        <h2 id="ct-find-title" tabIndex={-1} data-autofocus>{title}</h2>
        <p class="ct-muted" data-find-fitcount="">{subtitle}</p>
        <NotChecked ctx={flagCtx} />
      </div>
      <div class="ct-find-searchrow">
        <div class="ct-search">
          {SEARCH}
          <input ref={field} type="search" data-find-search="" aria-label={T('find.search')} placeholder={T('find.searchShort')} value={query}
            onInput={(e) => ask((e.target as HTMLInputElement).value)} onFocus={() => { if (source) wantNames(source, pageLang() as Locale); }} />
          {query && (
            <button type="button" class="ct-find-x" data-find-clear="" aria-label={T('find.clearSearch')} onClick={() => { ask(''); field.current?.focus(); }}>{CROSS}</button>
          )}
        </div>
        <button ref={filtersBtn} type="button" class="button button-secondary ct-find-filters-btn" aria-expanded={showFilters} aria-controls="ct-find-filters" onClick={() => setShowFilters(!showFilters)}>
          {onCount ? T('find.filtersOn', { n: onCount }) : T('find.filters')}
        </button>
      </div>
      {active.length > 0 && (
        <p class="ct-find-active" data-find-active="">
          {active.map((c) => (
            <button key={c.key} type="button" class="ct-find-chip" data-active-chip="" aria-label={T('find.removeFilter', { name: c.label })} onClick={c.off}>
              {c.label} {CROSS}
            </button>
          ))}
          <button type="button" class="text-link" onClick={clearAll}>{T('find.clearShort')}</button>
        </p>
      )}
      {!noneBox && <p class="ct-muted ct-small ct-find-names" data-find-count="">{countLine}</p>}
      <p class="visually-hidden" data-find-status="" aria-live="polite">{status}</p>
      <div class="ct-find-layout">
        {panel}
        <div class="ct-find-results">
          {switchShown && (
            // One by one / Select several (board FindMulti, B9): a switch, its state shown.
            <div class="ct-find-switch" role="group">
              <button type="button" data-find-mode="one" aria-pressed={select ? 'false' : 'true'} onClick={() => { setSelect(false); setTicked([]); }}>{T('find.oneByOne')}</button>
              <button type="button" data-find-mode="several" data-find-select="" aria-pressed={select ? 'true' : 'false'} onClick={() => setSelect(true)}>{T('find.select')}</button>
            </div>
          )}
          {select && <p class="ct-muted ct-small" data-find-ticks="">{T('find.ticksStay')}</p>}
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
            <p class="ct-muted ct-small" data-find-jobwords="">{T('find.jobWordsAll', { words: jobIds.map((j) => jobWords(j)[1] ?? jobWords(j)[0]).join(', ') })} {T('find.jobWordsWait')}</p>
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
            <p class="ct-find-kept" data-find-inpalette-line="">
              <strong>{T('find.inYourPalette')}</strong> <span class="ct-muted">{num(view.inPalette.length)}</span> · {view.inPalette.map(nameOf).join(', ')} · <button type="button" class="text-link" onClick={() => setPaletteOpen(true)}>{T('find.show')}</button>
            </p>
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
                <section key={g} class="ct-find-group" data-find-group={g} aria-labelledby={`ct-find-g-${g}`}>
                  <h3 id={`ct-find-g-${g}`}>{groupWords(g, store.period.value)} <span class="ct-muted">{g === 'look' ? T('find.lookWhy', { n: num(groups[g].length) }) : num(groups[g].length)}</span></h3>
                  {g === 'outside' && <p class="ct-muted ct-small" data-find-anyway="">{T('find.anywayNote')}</p>}
                  <ul class="ct-rows">{(whole.has(g) ? groups[g] : groups[g].slice(0, SCREEN)).map(row)}</ul>
                  {!whole.has(g) && groups[g].length > SCREEN && (
                    <button type="button" class="button button-secondary ct-find-showall" data-find-showall="" onClick={() => setWhole((w) => new Set([...w, g]))}>{P('find.showAll', groups[g].length)}</button>
                  )}
                </section>
              ))}
              {outsideFolded && (
                <p><button type="button" class="button button-secondary" data-find-outside="" onClick={() => setOutsideShown(true)}>{P('palette.showOutside', groups.outside.length)}</button></p>
              )}
              {others}
              {select && <p class="ct-muted ct-small" data-find-multinote="">{T('find.multiNote')}</p>}
            </>
          )}
          {!q && (
            // Paste a list (board Find: at the foot of the start and of a list, hidden while typing, K10, K19).
            <p class="ct-find-pastelink"><button ref={pasteBtn} type="button" class="text-link" data-find-paste="" onClick={() => setPasting(true)}>{T('find.paste')}</button></p>
          )}
        </div>
      </div>
    </Frame>
  );
}
