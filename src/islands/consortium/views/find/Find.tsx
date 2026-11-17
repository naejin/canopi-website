/** @jsxImportSource preact */
// Find (PP-C c1; boards Find, FindResults, FindType, FindJob, FindNone, FindFilters, FindMulti,
// FindDesk, FillHole, HoleOpen, DarkFind): one sheet to add plants. One search finds a plant by a name
// in any language the names file holds, a scientific name or synonym, or a job word; results are
// grouped by how they fit the place (fits, needs a second look, outside its climate range, not
// checked), each saying why it matched. Opened for a hole (the Next step's "See all N", a hole's
// Find: store.openFind with its SheetFor), it lists the plants that fill it, titled by the hole, with
// "Fits your place" on: the plants outside their climate range wait behind one counted button.
//
// Inform, don't block (owner 2026-11-14): every plant adds in one tap, its warnings on its row in words;
// nothing asks and no plant is hidden without its count. A filter that cannot judge a plant says how
// many ("12 not recorded"). A hit only another climate's list holds is named with that list and adds
// as a guest (its pool read only then). With no hit: close spellings, the other lists, and "Ask us to
// add it" (the contact form with the query).
import { batch } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, JobId, Locale, PeriodId, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fills, fitLine, holeLine, holes, jobIds, jobsOf, periodIds, queryTokens, yearsLine, yearsOf } from '../../../../lib/consortium/index.ts';
import { namesLine, whyLines, type FindHit } from '../../data/search.ts';
import { addsWithWarning, applyFilters, bestFirst, findGroups, GROUPS, jobsMatching, LIGHTS, LIVES, SIZES, type FilterId, type FindFilters, type Group } from '../../rules/find-query.ts';
import { NotChecked, SheetWaiting, WARN, type Frame } from '../kit/sheet.tsx';
import { FitLine, JobIcon, holeWords, say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { listName, nameOf, nameOrder, num } from '../kit/names.ts';
import { formatLength } from '../../format.ts';
import { page } from '../kit/page.ts';
import { finder, namesState, releasePlants, wantNames } from './names.ts';
import Paste from './Paste.tsx';

// "Holds up by …": the first later period (types.ts periodIds), named as future.ts periodName names it
// (not imported: it would bring the future and range chunks into Find's first use, as pool.tsx says).
const HOLDS_PERIOD = periodIds[1];
const holdsName = HOLDS_PERIOD.replace('-', '–');

// A language's name in the page's language ("French"), for "French name: Gombo".
const langName = (code: string): string => {
  try { return new Intl.DisplayNames([pageLang()], { type: 'language' }).of(code) ?? code; } catch { return code; }
};
// A group's heading: the verdict words of its level for the page's period (verdict-line.ts fitLine,
// the one owner of them: "Fits your place today", "Needs a second look", …), never Find's own copy.
const groupWords = (g: Group, judged: PeriodId): string =>
  say(fitLine({ id: '', judged, ownYears: false, level: g === 'unchecked' ? 'unknown' : g, limiting: null, factors: [], notes: [] } satisfies PlantVerdict));
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
// measures through format.ts, years through verdict-line.ts.
function lightWords(t: Taxon): string | null {
  const { sun, semi_shade: some, full_shade: deep } = t.traits;
  return deep ? T('find.lightDeep') : some ? T('find.lightSome') : sun ? T('find.lightSun') : null;
}
function sizeWords(t: Taxon): string {
  const lang = pageLang(), w = t.traits.width_max_m, h = t.traits.height_m?.max ?? null;
  const W = w === null ? '' : formatLength(w, lang), H = h === null ? '' : formatLength(h, lang);
  return w !== null && h !== null ? T('find.sizeBoth', { w: W, h: H }) : h !== null ? T('find.sizeTall', { h: H }) : w !== null ? T('find.sizeWide', { w: W }) : T('find.sizeNone');
}
function metaWords(t: Taxon): string {
  const y = yearsOf(t);
  return [lightWords(t), sizeWords(t), y && say(yearsLine(y.from, y.to))].filter(Boolean).join(' · ');
}

type Chip = { id: FilterId; value: string; label: string; on: boolean; toggle: () => void; count?: number };
// The add button's mark (board FindResults: "+ Add", "✓ Added"); the word carries the meaning.
const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const TICK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

export default function Find({ Frame }: { Frame: Frame }) {
  const source = store.source.value;
  const climate = store.climate.value;
  const { hole, fits } = store.sheetTarget.value;
  // The members when Find opened: listed apart ("In your palette"); a plant added here keeps its row,
  // its button turned to "Added".
  const [atOpen] = useState(() => new Set(store.members.peek()));
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FindFilters>({});
  // The plants outside their range wait behind one counted button, in a hole and in plain Find (B3).
  const [foldOutside, setFoldOutside] = useState(true);
  const [whole, setWhole] = useState<ReadonlySet<Group>>(new Set()); // the groups shown whole ("Show all N")
  // The hole's preset lifted ("N on your list but outside this hole · Show"): the whole list.
  const [wide, setWide] = useState(false);
  const [select, setSelect] = useState(false);
  const [ticked, setTicked] = useState<PlantId[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  // Paste opened from Find is drawn in Find's sheet; Cancel or an add comes back here, the focus on
  // "Paste a list" (B11).
  const [pasting, setPasting] = useState(false);
  const pasteBtn = useRef<HTMLButtonElement>(null);
  const [backFromPaste, setBackFromPaste] = useState(false);
  useEffect(() => { if (backFromPaste && !pasting) { pasteBtn.current?.focus(); setBackFromPaste(false); } }, [backFromPaste, pasting]);
  useEffect(() => { if (source) wantNames(source, pageLang() as Locale); }, [source]);

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
  const search = finder.value, names = namesState.value;
  // A query of one letter browses, as an empty one (normalization v1's admission).
  const q = queryTokens(query).admission === 'active-text' ? query.trim() : '';
  const order = useMemo(() => nameOrder(nameOf, pageLang()), []);

  // The plants Find lists: a hole's fillers from the offer list (what the Next step's "See all N"
  // counts), else the climate's list; members at opening left out.
  const base = useMemo(() => {
    const list = hole && fits && !wide ? (offer ?? []).filter(fits) : pool ?? [];
    return list.filter((t) => !atOpen.has(t.id)).sort(order);
  }, [pool, offer, hole, fits, wide, atOpen, order]);
  // How many of the listed plants do each job (board Find: "Feeds you 58").
  const jobCounts = useMemo(() => {
    const m = new Map<JobId, number>();
    for (const t of base) for (const j of jobsOf(t)) m.set(j, (m.get(j) ?? 0) + 1);
    return m;
  }, [base]);
  // A plant with a warning in words (a site misfit, a serious conflict, toxic, invasive here).
  const flagsOf = useMemo(() => {
    const m = new Map<PlantId, ReturnType<typeof store.flagsOfPlant>>();
    for (const t of base) m.set(t.id, store.flagsOfPlant(t));
    return m;
  }, [base, flagCtx, scene]);
  const warned = useMemo(() => new Set(base.filter((t) => addsWithWarning(flagsOf.get(t.id) ?? [])).map((t) => t.id)), [base, flagsOf]);
  // The palette's open holes, computed here read-only with the core's holes() from the store's members
  // as Palette.tsx computes them (fix round 1, B: Find may not edit Palette or the store); pf will move
  // Palette and Find onto one store computed.
  const memberTaxa = store.memberTaxa.value, memberVerdicts = store.memberVerdicts.value;
  const open = useMemo(() => holes({ members: memberTaxa, verdicts: memberVerdicts, pending: false }).filter((h) => h.state === 'open'), [memberTaxa, memberVerdicts]);
  // Per plant: the open holes it fills, and the later periods it stays in its range through (best first).
  const filled = useMemo(() => new Map(base.map((t) => [t.id, open.filter((h) => fills(h, t)).length])), [base, open]);
  // An outside plant's first later period in range ("In range by 2041–2070", B5).
  const inRangeBy = (t: Taxon): string | null => {
    if (!judging) return null;
    const p = periodIds.slice(1).find((x) => rule!.holdsBy(t, vctx, x));
    return p ? p.replace('-', '–') : null;
  };
  const stay = useMemo(() => {
    const m = new Map<PlantId, number>();
    if (judging) for (const t of base) { let n = 0; for (const p of periodIds.slice(1)) { if (!rule!.holdsBy(t, vctx, p)) break; n++; } m.set(t.id, n); }
    return m;
  }, [base, judging, rule, vctx]);

  // The query's hits, best first; those in the list, those in other lists, those already in the palette.
  const hits = useMemo(() => (q && search ? search(q) : null), [q, search]);
  const job = useMemo(() => (q ? jobsMatching(q, jobWords)[0] ?? null : null), [q]);
  const ctx = useMemo(() => ({
    verdicts,
    holds: judging ? (t: Taxon) => rule!.holdsBy(t, vctx, HOLDS_PERIOD) : undefined,
    toxic: (t: Taxon) => (t.warnings.toxicity ? t.warnings.toxicity.level !== 'None' : null),
    invasive: (t: Taxon) => (flagCtx.countryStatus === 'checked' && flagCtx.country && t.warnings.invasive_in ? t.warnings.invasive_in.some((r) => r.country === flagCtx.country) : null),
  }), [verdicts, rule, judging, vctx, flagCtx]);
  // The counts the filters show (board FindFilters): the three fit choices, and each size and life chip.
  const counts = useMemo(() => {
    const n = (f: FindFilters) => applyFilters(base, f, ctx).rows.length;
    const outside = base.filter((t) => verdicts?.get(t.id)?.level === 'outside').length;
    return {
      fits: base.length - outside, inside: judging ? n({ range: true }) : 0, all: base.length, outside,
      size: new Map(SIZES.map((x) => [x, n({ size: [x] })])), life: new Map(LIVES.map((x) => [x, n({ life: [x] })])),
    };
  }, [base, ctx, verdicts, judging]);
  const view = useMemo(() => {
    const hitOf = new Map<PlantId, FindHit>(), rank = new Map<PlantId, number>();
    hits?.forEach((h, i) => { hitOf.set(h.id, h); rank.set(h.id, i); });
    const matched = hits ? base.filter((t) => hitOf.has(t.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!) : bestFirst(base, filled, stay);
    const { rows, unknown, hidden } = applyFilters(matched, judging ? filters : { ...filters, range: false, holds: false }, ctx);
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
    const inPalette = (hits ?? []).filter((h) => atOpen.has(h.id)).map((h) => store.taxonOf(h.id)).filter((t): t is Taxon => !!t);
    const byFilters = hits ? matched.length - rows.length : 0;
    const outsideHole = hits ? hits.filter((h) => own.has(h.id) && !inList.has(h.id) && !atOpen.has(h.id)).length : 0;
    return { hitOf, groups, unknown, hidden, others, inPalette, byFilters, outsideHole, count: rows.length };
  }, [base, hits, filters, judging, ctx, verdicts, warned, pool, members, climate, atOpen, filled, stay, releasePlants.value]);

  if (!climate) return null;
  if (pasting) return <Paste Frame={Frame} onBack={() => batch(() => { setPasting(false); setBackFromPaste(true); })} />;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  const toggleFilter = (k: keyof FindFilters) => setFilters((f) => ({ ...f, [k]: !f[k] }));
  const toggleIn = <K extends 'jobs' | 'light' | 'size' | 'life'>(k: K, v: NonNullable<FindFilters[K]>[number]) => setFilters((f) => {
    const now = (f[k] ?? []) as readonly string[];
    return { ...f, [k]: now.includes(v) ? now.filter((x) => x !== v) : [...now, v] };
  });
  const added = (id: PlantId) => members.includes(id);
  // What adding a plant does to the hole it fills (B12, board FillHole: "… added. The ground is covered
  // …"): the sheet's hole, else the first open hole it fills; closed, or what is left of it.
  const addedWords = (t: Taxon): string => {
    const name = nameOf(t), h = hole && fits?.(t) ? hole : open.find((x) => fills(x, t));
    if (!h) return T('find.addedOne', { name });
    const same = (x: typeof h) => x.kind === h.kind && x.job === h.job && x.stratum === h.stratum && x.fromYear < h.toYear && x.toYear > h.fromYear;
    const left = holes({ members: [...memberTaxa, t], verdicts: memberVerdicts, pending: false }).find((x) => x.state === 'open' && same(x));
    const job = T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`);
    return left ? T('find.addedShrunk', { name, job, hole: say(holeLine(left)) }) : T('find.addedFilled', { name, job });
  };
  const addOne = (t: Taxon, from?: ClimateZone) => {
    if (added(t.id)) return;
    store.addMembers([t.id], from ? { [t.id]: from } : {}, { warned: warned.has(t.id) ? [t.id] : [], text: addedWords(t) });
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

  const title = hole ? holeWords(hole) : T('find.title');
  // The start (board Find, B4): how many plants fit the place (Place's count words, consortium.place.count.*),
  // the palette's holes (each opens Find for it) and the jobs as chips.
  const fit = store.countFits.value, later = store.period.value !== periodIds[0];
  const fitCount = fit && fit.fits + fit.look > 0
    ? P(later ? 'place.count.ownLater' : 'place.count.own', fit.fits + fit.look, { total: num(fit.of), list: listName(climate), period: store.period.value.replace('-', '–') })
    : null;
  const start = !q && !hole;
  const fillersOf = (h: (typeof open)[number]) => (offer ?? []).filter((t) => !members.includes(t.id) && fills(h, t)).length;
  const openHole = (h: (typeof open)[number]) => store.openFind({ hole: h, fits: (t: Taxon) => fills(h, t), job: h.job ?? null });
  // A job's card (board FindJob, B6): what it means, what the palette has for it, the words understood.
  const jobHas = (j: JobId) => {
    const n = memberTaxa.filter((t) => jobsOf(t).includes(j)).length, gap = open.find((h) => h.kind === 'job' && h.job === j);
    return `${P('find.jobHas', n)}${gap ? `, ${say(holeLine(gap))}` : ''}.`;
  };
  const { groups, unknown, hidden } = view;
  const outsideFolded = foldOutside && !q && groups.outside.length > 0 && (groups.fits.length + groups.look.length + groups.unchecked.length) > 0;
  const shown = (g: Group) => groups[g].length > 0 && !(g === 'outside' && outsideFolded);
  // Nothing answers at all: no plant of the release has the name (a hit kept out is counted instead).
  const nothing = !!q && !hits?.length;

  const row = (t: Taxon) => {
    const h = view.hitOf.get(t.id), why = h ? whyWords(h) : null;
    // The toxic mark is short on a row ("Mildly toxic"), the full wording in Details only (B13).
    const lines = flagLines(t, flagsOf.get(t.id) ?? [], scene).map((l) => (l.kind === 'toxicity' && t.warnings.toxicity ? { ...l, text: T(`tox.${t.warnings.toxicity.level}`) } : l));
    const jobs = jobsOf(t);
    const on = ticked.includes(t.id), done = added(t.id);
    const v = verdicts?.get(t.id), outside = v?.level === 'outside', n = filled.get(t.id) ?? 0, y = yearsOf(t);
    const later = outside ? inRangeBy(t) : null;
    return (
      <li key={t.id} data-find-row="" data-plant-id={t.id} data-fills={filled.get(t.id) ?? 0} class={on ? 'is-on' : undefined}>
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
          {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
          {hole && fits?.(t) && y
            ? <span class="ct-find-fills" data-find-fills="">{T('find.fillsThis', { years: say(yearsLine(y.from, y.to)) })}</span>
            : n > 0 && <span class="ct-find-fills" data-find-fills="">{P('find.fillsN', n)}</span>}
          {jobs.length > 0 && <span class="ct-find-jobs">{jobs.map((j) => T(`job.${j}`)).join(' · ')}</span>}
          <span class="ct-find-meta" data-find-meta="">{metaWords(t)}</span>
          <FitLine v={v} />
          {later && <span class="ct-line" data-find-inrange="">{T('find.inRangeBy', { period: later })}</span>}
          {lines.length ? <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span> : null}
        </div>
      </li>
    );
  };

  // The filters (board FindFilters): each group says what it is for; range and holds need `judging`.
  const chips = (id: FilterId, list: readonly { value: string; label: string; on: boolean; toggle: () => void; count?: number }[]): Chip[] => list.map((c) => ({ id, ...c }));
  const jobChips = chips('job', jobIds.map((j) => ({ value: j, label: T(`job.${j}`), on: !!filters.jobs?.includes(j), toggle: () => toggleIn('jobs', j), count: jobCounts.get(j) ?? 0 })));
  const lightChips = chips('light', LIGHTS.map((l) => ({ value: l, label: T(`find.light.${l}`), on: !!filters.light?.includes(l), toggle: () => toggleIn('light', l) })));
  const sizeChips = chips('size', SIZES.map((s) => ({ value: s, label: T(`find.size.${s}`, { lo: num(2), len: formatLength(s === 'small' ? 2 : 8, pageLang()) }), on: !!filters.size?.includes(s), toggle: () => toggleIn('size', s), count: counts.size.get(s) ?? 0 })));
  const lifeChips = chips('life-cycle', LIVES.map((l) => ({ value: l, label: T(`find.life.${l}`), on: !!filters.life?.includes(l), toggle: () => toggleIn('life', l), count: counts.life.get(l) ?? 0 })));
  const unknownLine = (id: FilterId, kept = false) => unknown[id] !== undefined && (
    <span class="ct-find-unknown" data-filter-unknown={id} data-count={unknown[id]}>{P(kept ? 'find.unknownKept' : 'find.unknown', unknown[id]!)}</span>
  );
  const chipGroup = (key: string, list: Chip[], id: FilterId) => (
    <fieldset class="ct-find-fgroup">
      <legend>{T(`find.f.${key}`)}</legend>
      <p class="ct-muted ct-small">{T(`find.f.${key}For`)}</p>
      <div class="ct-find-chips">
        {list.map((c) => (
          <button type="button" class="ct-find-chip" data-filter={c.id} data-value={c.value} aria-pressed={c.on ? 'true' : 'false'} onClick={c.toggle}>
            {c.id === 'job' && <JobIcon job={c.value as JobId} />}{c.label}{c.count !== undefined && <span class="ct-muted">{num(c.count)}</span>}
          </button>
        ))}
      </div>
      {unknownLine(id)}
    </fieldset>
  );
  // A hide filter says how many it hid (fix round 1, A3), beside how many it could not judge.
  const hiddenLine = (id: 'toxic' | 'invasive') => hidden[id] !== undefined && (
    <span class="ct-find-unknown" data-filter-hidden={id} data-count={hidden[id]}>{id === 'toxic' ? P('find.hiddenToxic', hidden[id]!) : P('find.hiddenInvasive', hidden[id]!)}</span>
  );
  const check = (id: FilterId, k: keyof FindFilters, label: string, kept = false) => (
    <label class="ct-check ct-find-check"><input type="checkbox" data-filter={id} checked={!!filters[k]} onChange={() => toggleFilter(k)} /> {label} {(id === 'toxic' || id === 'invasive') && hiddenLine(id)} {unknownLine(id, kept)}</label>
  );
  // The filters on (the default fit choice, "Fits your place", is not one).
  const onCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v)).length;
  const clearAll = () => { setFilters({}); setFoldOutside(true); };
  // The fit filter: one three-way choice (board FindFilters, B8): fits (the outside plants folded),
  // well inside its range (needs `judging`), every plant.
  const fitNow = filters.range ? 'inside' : foldOutside ? 'fits' : 'all';
  const setFit = (v: 'fits' | 'inside' | 'all') => { setFoldOutside(v !== 'all'); setFilters((f) => ({ ...f, range: v === 'inside' })); };
  const fitChoice = (v: 'fits' | 'inside' | 'all', id: string, label: string, count: string) => (
    <label class="ct-check ct-find-check"><input type="radio" name="ct-find-fit" value={v} data-filter={id} checked={fitNow === v} onChange={() => setFit(v)} /> {label} <span class="ct-find-unknown" data-fit-count="">{count}</span></label>
  );
  const invasiveLabel = flagCtx.country ? T('find.hideInvasive', { country: new Intl.DisplayNames([pageLang()], { type: 'region' }).of(flagCtx.country) ?? flagCtx.country }) : '';
  // The active filters as removable chips under the search (board FindResults, B7).
  const bools: [keyof FindFilters, string][] = [['range', T('find.range')], ['holds', T('find.holds', { period: holdsName })], ['edible', T('find.edible')], ['hideToxic', T('find.hideToxic')], ['hideInvasive', invasiveLabel]];
  const active = [
    ...[...jobChips, ...lightChips, ...sizeChips, ...lifeChips].filter((c) => c.on).map((c) => ({ key: `${c.id}:${c.value}`, label: c.label, off: c.toggle })),
    ...bools.filter(([k]) => filters[k]).map(([k, label]) => ({ key: k, label, off: () => toggleFilter(k) })),
  ];
  const panel = (
    <div class="ct-find-filters" id="ct-find-filters" data-open={showFilters ? '' : undefined}>
      {chipGroup('job', jobChips, 'job')}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.fit')}</legend>
        <p class="ct-muted ct-small">{T('find.f.fitFor')}</p>
        {fitChoice('fits', 'fits', T('find.fits'), P('find.count', counts.fits))}
        {judging && fitChoice('inside', 'range', T('find.range'), P('find.count', counts.inside))}
        {fitChoice('all', 'all', T('find.fitAll'), P('find.fitAllCount', counts.all, { outside: num(counts.outside) }))}
        {judging && unknownLine('range')}
      </fieldset>
      {judging && (
        <fieldset class="ct-find-fgroup">
          <legend>{T('find.f.later')}</legend>
          <p class="ct-muted ct-small">{T('find.f.laterFor')}</p>
          {check('holds', 'holds', T('find.holds', { period: holdsName }))}
        </fieldset>
      )}
      {chipGroup('light', lightChips, 'light')}
      {chipGroup('size', sizeChips, 'size')}
      {chipGroup('life', lifeChips, 'life-cycle')}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.more')}</legend>
        <p class="ct-muted ct-small">{T('find.f.moreFor')}</p>
        {check('edible', 'edible', T('find.edible'))}
        {check('toxic', 'hideToxic', T('find.hideToxic'), true)}
        {flagCtx.countryStatus === 'checked' && flagCtx.country && check('invasive', 'hideInvasive', invasiveLabel, true)}
      </fieldset>
      {onCount > 0 && <p class="ct-find-clearall"><button type="button" class="text-link" onClick={clearAll}>{T('find.clear')}</button></p>}
    </div>
  );

  const status = q ? (nothing ? T('find.none', { q }) : P('find.count', view.count)) : '';
  const others = view.others.length > 0 && (
    <section class="ct-find-others" aria-labelledby="ct-find-others">
      <h3 id="ct-find-others">{T('find.otherLists')}</h3>
      <ul class="ct-rows">
        {view.others.map(({ hit, plant, lists }) => {
          const why = whyWords(hit);
          return (
            <li key={plant.id} data-find-row="" data-plant-id={plant.id}>
              <div class="ct-row-main"><strong>{plant.names[pageLang()] || plant.names.en || plant.canonical}</strong> <i class="ct-sci">{plant.canonical}</i></div>
              <div class="ct-row-why">
                {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
                <span class="ct-find-otherlists">
                  {lists.map((z) => (
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

  // Below 960 px "Filters" opens the filters as their own view (board FindFilters, B7), with "Clear all"
  // and "Show N plants" (back to the results); at 960 they are a column beside them, with no button.
  if (showFilters) return (
    <Frame titleId="ct-find-ftitle" class="ct-find" head={<span class="ct-muted">{title}</span>} foot={
      <div class="ct-add-bar">
        <button type="button" class="button button-secondary" data-find-filters-clear="" onClick={clearAll}>{T('find.clear')}</button>
        <button type="button" class="button button-primary" data-find-filters-show="" onClick={() => setShowFilters(false)}>{P('find.showN', view.count)}</button>
      </div>
    }>
      <div class="ct-find-top" data-find-filters-view="">
        <h2 id="ct-find-ftitle" tabIndex={-1} data-autofocus>{T('find.filters')}</h2>
        <p class="ct-muted">{P('find.filtersLede', onCount)}</p>
      </div>
      {panel}
    </Frame>
  );

  return (
    <Frame titleId="ct-find-title" class="ct-find" head={hole ? <span class="ct-muted">{T('find.title')}</span> : null} foot={
      select ? (
        <div class="ct-add-bar" data-find-bar="">
          <span>{P('find.selected', ticked.length)}</span>
          <button type="button" class="button button-primary" disabled={!ticked.length} onClick={addTicked}>{P('find.addSel', ticked.length)}</button>
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
        {fitCount && !hole
          ? <p class="ct-muted" data-find-fitcount="">{fitCount}</p>
          : <p class="ct-muted">{P('find.lede', base.length, { list: listName(climate) })}</p>}
        <NotChecked ctx={flagCtx} />
      </div>
      <div class="ct-find-searchrow">
        <div class="ct-search">
          <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>
          <input ref={field} type="search" data-find-search="" aria-label={T('find.search')} placeholder={T('find.searchShort')} value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)} onFocus={() => { if (source) wantNames(source, pageLang() as Locale); }} />
          {query && (
            <button type="button" class="ct-find-x" data-find-clear="" aria-label={T('find.clearSearch')} onClick={() => { setQuery(''); field.current?.focus(); }}>
              <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>
            </button>
          )}
        </div>
        <button type="button" class="button button-secondary ct-find-filters-btn" aria-expanded={showFilters} aria-controls="ct-find-filters" onClick={() => setShowFilters(!showFilters)}>
          {onCount ? T('find.filtersOn', { n: onCount }) : T('find.filters')}
        </button>
      </div>
      {active.length > 0 && (
        <p class="ct-find-active" data-find-active="">
          {active.map((c) => (
            <button key={c.key} type="button" class="ct-find-chip" data-active-chip="" aria-label={T('find.removeFilter', { name: c.label })} onClick={c.off}>
              {c.label} <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>
            </button>
          ))}
          <button type="button" class="text-link" onClick={clearAll}>{T('find.clearShort')}</button>
        </p>
      )}
      <p class="ct-muted ct-small ct-find-names">
        {namesWords(search?.langs ?? [])}
        {names === 'loading' && <span data-find-names="loading"> {T('find.namesLoading')}</span>}
        {(names === 'failed' || names === 'dropped') && <span data-find-names="failed"> {T('find.namesFailed')}</span>}
      </p>
      <p class="visually-hidden" data-find-status="" aria-live="polite">{status}</p>
      <div class="ct-find-layout">
        {panel}
        <div class="ct-find-results">
          <p class="ct-find-modes">
            {/* One by one / Select several (board FindMulti, B9): a switch, its state shown. */}
            <span class="ct-find-switch" role="group">
              <button type="button" class="ct-find-chip" data-find-mode="one" aria-pressed={select ? 'false' : 'true'} onClick={() => { setSelect(false); setTicked([]); }}>{T('find.oneByOne')}</button>
              <button type="button" class="ct-find-chip" data-find-mode="several" data-find-select="" aria-pressed={select ? 'true' : 'false'} onClick={() => setSelect(true)}>{T('find.select')}</button>
            </span>
            <button ref={pasteBtn} type="button" class="text-link" data-find-paste="" onClick={() => setPasting(true)}>{T('find.paste')}</button>
          </p>
          {job && (
            <div class="ct-find-job" data-job={job}>
              <p class="ct-muted ct-small">{T('find.jobIs', { q })}</p>
              <p><JobIcon job={job} /> <strong>{T(`job.${job}`)}</strong></p>
              <p class="ct-find-jobmeans">{T(`find.jobMeans.${job}`)} {jobHas(job)}</p>
              <button type="button" class="button button-primary" onClick={() => { setFilters((f) => ({ ...f, jobs: [job] })); setQuery(''); }}>
                {P('find.jobShow', base.filter((t) => jobsOf(t).includes(job)).length)}
              </button>
            </div>
          )}
          {select && <p class="ct-muted ct-small" data-find-ticks="">{T('find.ticksStay')}</p>}
          {job && (
            <p class="ct-muted ct-small" data-find-jobwords="">{T('find.jobWordsAll', { words: jobIds.flatMap((j) => jobWords(j).slice(1)).join(', ') })}</p>
          )}
          {start && open.length > 0 && (
            <section class="ct-find-holes" data-find-holes="" aria-labelledby="ct-find-holes">
              <h3 id="ct-find-holes">{P('find.holesLack', open.length)}</h3>
              <ul class="ct-find-holelist">
                {open.slice(0, 4).map((h) => (
                  <li key={h.id}><button type="button" class="text-link" data-find-hole="" data-title={holeWords(h)} onClick={() => openHole(h)}>{holeWords(h)}</button> <span class="ct-muted">{P('find.count', fillersOf(h))}</span></li>
                ))}
              </ul>
            </section>
          )}
          {start && (
            <section class="ct-find-byjob" data-find-byjob="" aria-labelledby="ct-find-byjob">
              <h3 id="ct-find-byjob">{T('find.byJob')}</h3>
              <div class="ct-find-chips">
                {jobIds.map((j) => (
                  <button key={j} type="button" class="ct-find-chip" data-job-chip={j} aria-pressed={filters.jobs?.includes(j) ? 'true' : 'false'} onClick={() => toggleIn('jobs', j)}>
                    <JobIcon job={j} />{T(`job.${j}`)}<span class="ct-muted">{num(jobCounts.get(j) ?? 0)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {view.inPalette.length > 0 && (
            <section class="ct-find-group" data-find-inpalette="" aria-labelledby="ct-find-g-palette">
              <h3 id="ct-find-g-palette">{T('find.inYourPalette')} <span class="ct-muted">{num(view.inPalette.length)}</span></h3>
              <ul class="ct-rows">{view.inPalette.map(row)}</ul>
            </section>
          )}
          {view.byFilters > 0 && (
            <p class="ct-find-kept" data-find-hidden-filters="" data-count={view.byFilters}>{P('find.hiddenByFilters', view.byFilters)} · <button type="button" class="text-link" onClick={() => { setFilters({}); setFoldOutside(false); }}>{T('find.clearShort')}</button></p>
          )}
          {view.outsideHole > 0 && (
            <p class="ct-find-kept" data-find-outside-hole="" data-count={view.outsideHole}>{P('find.outsideHole', view.outsideHole)} · <button type="button" class="text-link" onClick={() => setWide(true)}>{T('find.show')}</button></p>
          )}
          {!q && <p class="ct-muted ct-small" data-find-best="">{P('find.count', view.count)} {T('find.bestFirst')}</p>}
          {nothing && job && !view.others.length ? (
            // A job word (board FindJob): the job's card answers; one quiet line for the name.
            <p class="ct-muted ct-small" data-find-none="">{T('find.none', { q })}</p>
          ) : nothing ? (
            <div class="ct-find-none" data-find-none="">
              <p><strong>{T('find.none', { q })}</strong></p>
              {search && (() => {
                // The close names, as rows with Add (B14, board FindNone "Did you mean:").
                const close = search.close(q).map((h) => base.find((t) => t.id === h.id) ?? (atOpen.has(h.id) ? store.taxonOf(h.id) : undefined)).filter((t): t is Taxon => !!t).slice(0, 3);
                return close.length > 0 && (
                  <>
                    <p>{T('find.closeSpell')}</p>
                    <ul class="ct-rows" data-find-close-rows="" data-find-close="">{close.map(row)}</ul>
                  </>
                );
              })()}
              {others}
              <p class="ct-muted">{T('find.askHint')}</p>
              <p><a class="button button-secondary" data-find-ask="" href={askHref(q)}>{T('find.ask', { q })}</a></p>
            </div>
          ) : (
            <>
              {GROUPS.filter(shown).map((g) => (
                <section key={g} class="ct-find-group" data-find-group={g} aria-labelledby={`ct-find-g-${g}`}>
                  <h3 id={`ct-find-g-${g}`}>{groupWords(g, store.period.value)} <span class="ct-muted">{num(groups[g].length)}</span></h3>
                  {g === 'outside' && <p class="ct-muted ct-small" data-find-anyway="">{T('find.anywayNote')}</p>}
                  <ul class="ct-rows">{(whole.has(g) ? groups[g] : groups[g].slice(0, SCREEN)).map(row)}</ul>
                  {!whole.has(g) && groups[g].length > SCREEN && (
                    <p><button type="button" class="text-link" data-find-showall="" onClick={() => setWhole((w) => new Set([...w, g]))}>{P('find.showAll', groups[g].length)}</button></p>
                  )}
                </section>
              ))}
              {outsideFolded && (
                <p><button type="button" class="button button-secondary" data-find-outside="" onClick={() => setFoldOutside(false)}>{P('palette.showOutside', groups.outside.length)}</button></p>
              )}
              {others}
            </>
          )}
        </div>
      </div>
    </Frame>
  );
}
