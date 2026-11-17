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
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, JobId, Locale, PeriodId, PlantId, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fitLine, jobIds, jobsOf, periodIds, queryTokens } from '../../../../lib/consortium/index.ts';
import { namesLine, whyLines, type FindHit } from '../../data/search.ts';
import { addsWithWarning, applyFilters, findGroups, GROUPS, jobsMatching, LIGHTS, LIVES, SIZES, type FilterId, type FindFilters, type Group } from '../../rules/find-query.ts';
import { NotChecked, SheetWaiting, WARN, type Frame } from '../kit/sheet.tsx';
import { FitLine, JobIcon, holeWords, say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { listName, nameOf, nameOrder, num } from '../kit/names.ts';
import { formatLength } from '../../format.ts';
import { page } from '../kit/page.ts';
import { finder, namesState, releasePlants, wantNames } from './names.ts';

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
  const [foldOutside, setFoldOutside] = useState(!!hole);
  // The hole's preset lifted ("N on your list but outside this hole · Show"): the whole list.
  const [wide, setWide] = useState(false);
  const [select, setSelect] = useState(false);
  const [ticked, setTicked] = useState<PlantId[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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

  // The query's hits, best first; those in the list, those in other lists, those already in the palette.
  const hits = useMemo(() => (q && search ? search(q) : null), [q, search]);
  const job = useMemo(() => (q ? jobsMatching(q, jobWords)[0] ?? null : null), [q]);
  const ctx = useMemo(() => ({
    verdicts,
    holds: judging ? (t: Taxon) => rule!.holdsBy(t, vctx, HOLDS_PERIOD) : undefined,
    toxic: (t: Taxon) => (t.warnings.toxicity ? t.warnings.toxicity.level !== 'None' : null),
    invasive: (t: Taxon) => (flagCtx.countryStatus === 'checked' && flagCtx.country && t.warnings.invasive_in ? t.warnings.invasive_in.some((r) => r.country === flagCtx.country) : null),
  }), [verdicts, rule, judging, vctx, flagCtx]);
  const view = useMemo(() => {
    const hitOf = new Map<PlantId, FindHit>(), rank = new Map<PlantId, number>();
    hits?.forEach((h, i) => { hitOf.set(h.id, h); rank.set(h.id, i); });
    const matched = hits ? base.filter((t) => hitOf.has(t.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!) : base;
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
  }, [base, hits, filters, judging, ctx, verdicts, warned, pool, members, climate, atOpen, releasePlants.value]);

  if (!climate) return null;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  const toggleFilter = (k: keyof FindFilters) => setFilters((f) => ({ ...f, [k]: !f[k] }));
  const toggleIn = <K extends 'jobs' | 'light' | 'size' | 'life'>(k: K, v: NonNullable<FindFilters[K]>[number]) => setFilters((f) => {
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

  const title = hole ? holeWords(hole) : T('find.title');
  const { groups, unknown, hidden } = view;
  const outsideFolded = foldOutside && !q && groups.outside.length > 0 && (groups.fits.length + groups.look.length + groups.unchecked.length) > 0;
  const shown = (g: Group) => groups[g].length > 0 && !(g === 'outside' && outsideFolded);
  // Nothing answers at all: no plant of the release has the name (a hit kept out is counted instead).
  const nothing = !!q && !hits?.length;

  const row = (t: Taxon) => {
    const h = view.hitOf.get(t.id), why = h ? whyWords(h) : null;
    const lines = flagLines(t, flagsOf.get(t.id) ?? [], scene);
    const jobs = jobsOf(t);
    const on = ticked.includes(t.id), done = added(t.id);
    return (
      <li key={t.id} data-find-row="" data-plant-id={t.id} class={on ? 'is-on' : undefined}>
        <div class="ct-row-main"><strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i></div>
        {select && !done
          ? <label class="ct-tick"><input type="checkbox" checked={on} aria-label={`${nameOf(t)}, ${t.canonical_name}`} onChange={() => tick(t.id)} /></label>
          : (
            <button type="button" class={`button button-secondary ct-find-add${done ? ' is-added' : ''}`} data-find-add="" data-added={done ? '' : undefined}
              aria-disabled={done ? 'true' : undefined} aria-label={done ? T('find.addedName', { name: nameOf(t) }) : T('find.addName', { name: nameOf(t) })} onClick={() => addOne(t)}>
              {done ? TICK : PLUS} {done ? T('find.added') : T('find.add')}
            </button>
          )}
        <div class="ct-row-why">
          {why && <span class="ct-find-why" data-find-why="" data-lang={why.lang} data-kind={why.kind}>{why.text}</span>}
          {jobs.length > 0 && <span class="ct-find-jobs">{jobs.map((j) => T(`job.${j}`)).join(' · ')}</span>}
          <FitLine v={verdicts?.get(t.id)} />
          {lines.length ? <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span> : null}
        </div>
      </li>
    );
  };

  // The filters (board FindFilters): each group says what it is for; range and holds need `judging`.
  const chips = (id: FilterId, list: readonly { value: string; label: string; on: boolean; toggle: () => void }[]): Chip[] => list.map((c) => ({ id, ...c }));
  const jobChips = chips('job', jobIds.map((j) => ({ value: j, label: T(`job.${j}`), on: !!filters.jobs?.includes(j), toggle: () => toggleIn('jobs', j), count: jobCounts.get(j) ?? 0 })));
  const lightChips = chips('light', LIGHTS.map((l) => ({ value: l, label: T(`find.light.${l}`), on: !!filters.light?.includes(l), toggle: () => toggleIn('light', l) })));
  const sizeChips = chips('size', SIZES.map((s) => ({ value: s, label: T(`find.size.${s}`, { lo: num(2), len: formatLength(s === 'small' ? 2 : 8, pageLang()) }), on: !!filters.size?.includes(s), toggle: () => toggleIn('size', s) })));
  const lifeChips = chips('life-cycle', LIVES.map((l) => ({ value: l, label: T(`find.life.${l}`), on: !!filters.life?.includes(l), toggle: () => toggleIn('life', l) })));
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
  const onCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v)).length + (foldOutside ? 1 : 0);
  const panel = (
    <div class="ct-find-filters" id="ct-find-filters" data-open={showFilters ? '' : undefined}>
      {chipGroup('job', jobChips, 'job')}
      <fieldset class="ct-find-fgroup">
        <legend>{T('find.f.fit')}</legend>
        <p class="ct-muted ct-small">{T('find.f.fitFor')}</p>
        <label class="ct-check ct-find-check"><input type="checkbox" data-filter="fits" checked={foldOutside} onChange={() => setFoldOutside(!foldOutside)} /> {T('find.fits')}</label>
        {judging && check('range', 'range', T('find.range'))}
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
        {flagCtx.countryStatus === 'checked' && flagCtx.country && check('invasive', 'hideInvasive', T('find.hideInvasive', { country: new Intl.DisplayNames([pageLang()], { type: 'region' }).of(flagCtx.country) ?? flagCtx.country }), true)}
      </fieldset>
      {onCount > 0 && <p><button type="button" class="text-link" onClick={() => { setFilters({}); setFoldOutside(false); }}>{T('find.clear')}</button></p>}
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

  return (
    <Frame titleId="ct-find-title" class="ct-find" head={<span class="ct-muted">{T('find.title')}</span>} foot={
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
        <p class="ct-muted">{P('find.lede', base.length, { list: listName(climate) })}</p>
        <NotChecked ctx={flagCtx} />
      </div>
      <div class="ct-find-searchrow">
        <div class="ct-search">
          <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>
          <input type="search" data-find-search="" aria-label={T('find.search')} placeholder={T('find.search')} value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)} onFocus={() => { if (source) wantNames(source, pageLang() as Locale); }} />
        </div>
        <button type="button" class="button button-secondary ct-find-filters-btn" aria-expanded={showFilters} aria-controls="ct-find-filters" onClick={() => setShowFilters(!showFilters)}>
          {onCount ? T('find.filtersOn', { n: onCount }) : T('find.filters')}
        </button>
      </div>
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
            <button type="button" class="button button-secondary" data-find-select="" aria-pressed={select ? 'true' : 'false'} onClick={() => { setSelect(!select); setTicked([]); }}>{T('find.select')}</button>
            <button type="button" class="text-link" data-find-paste="" onClick={() => store.openSheet('paste')}>{T('find.paste')}</button>
          </p>
          {job && (
            <div class="ct-find-job" data-job={job}>
              <p class="ct-muted ct-small">{T('find.jobIs', { q })}</p>
              <p><JobIcon job={job} /> <strong>{T(`job.${job}`)}</strong></p>
              <button type="button" class="button button-primary" onClick={() => { setFilters((f) => ({ ...f, jobs: [job] })); setQuery(''); }}>
                {P('find.jobShow', base.filter((t) => jobsOf(t).includes(job)).length)}
              </button>
            </div>
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
          {!q && <p class="ct-muted ct-small">{P('find.count', view.count)}</p>}
          {nothing && job && !view.others.length ? (
            // A job word (board FindJob): the job's card answers; one quiet line for the name.
            <p class="ct-muted ct-small" data-find-none="">{T('find.none', { q })}</p>
          ) : nothing ? (
            <div class="ct-find-none" data-find-none="">
              <p><strong>{T('find.none', { q })}</strong></p>
              {search && (() => {
                const close = search.close(q).filter((h) => base.some((t) => t.id === h.id)).slice(0, 3);
                return close.length > 0 && (
                  <p>{T('find.closeSpell')} {close.map((h) => <button key={h.id} type="button" class="text-link" data-find-close="" onClick={() => setQuery(h.why.text)}>{h.why.text}</button>)}</p>
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
                  <ul class="ct-rows">{groups[g].map(row)}</ul>
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
