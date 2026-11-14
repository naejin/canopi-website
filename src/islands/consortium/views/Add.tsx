/** @jsxImportSource preact */
// Add (stream S3; mockup 05 `add`): the plants of the climate's list, or the plants that fill one hole
// (the palette page's Next step, "See all" and Find, the pictures' hole buttons: core holes.ts fills, handed as the sheet's `fits`,
// the rule the Next step counts with, so "See all N" lists N), with a search over folded names (S1's
// searchIndex, A6). Site misfits are never left out (inform, don't block; review r1 bugs-3): they come
// last with their reason. Multi-select:
// tick several, then "Add 2 plants" in the sticky bar; 8 rows, then "Show all N". Inform, don't block
// (owner decision 2026-11-14; it replaces the 2026-10-28 "Add it anyway?" rule): every row has a tick
// and nothing asks; a site misfit, a serious conflict or an outside-range plant keeps its reason on
// its row in words with an icon, and the add shows the Undo toast. Outside-range plants are grouped
// behind "Show N outside their climate range" (visible, not hidden). A name found only in another
// climate's list is offered with one-tap Add (design check A9): a guest, labelled "From the {climate}
// list", its warnings on its row. With a query, rows come best match first
// (S1's score), 8 of them, then "Show all N". Search mode (Start's "Start empty and search", routed
// here by views/Sheets.tsx) is the same sheet with its own title.
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { ClimateZone, Flag, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { asGuest, warns } from '../../../lib/consortium/index.ts';
import { searchIndex } from '../data/search.ts';
import { addMembers, closeSheet, flagsOfPlant, sheetCell } from '../store.ts';
import { Bar, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { FitLine, holeWords } from './kit/fit.tsx';
import { nameOf, num, phasePlain, spanWords, zoneName } from './kit/names.ts';
import { PlantMarks } from './PlantMarks.tsx';
import { jobFind } from './StageBar.tsx';
const { addOrder, addQuery, flagLines, listQuery } = shared; // first-run modules (kit/sheet.tsx shared)

const FIRST_ROWS = 8;

type Search = ReturnType<typeof searchIndex>;
const searches = new WeakMap<Taxon[], Search>();
function searchOf(list: Taxon[]): Search {
  let s = searches.get(list);
  if (!s) searches.set(list, (s = searchIndex(list.map((t) => ({ id: t.id, canonical: t.canonical_name, names: t.names })))));
  return s;
}

// A row's height words, not a site-fit message: it says the height even for a climber (whose room the
// site check leaves unknown, 'misfit.unk.climber'), so it is kept apart from siteFitMessages (E6 R2).
function heightWords(t: Taxon): string {
  const h = t.traits.height_m?.max;
  if (h != null) return T('details.heightV', { m: num(h) });
  const room = store.site.value.room;
  return T(room === 'small' || room === 'large' ? 'misfit.unk.room' : 'details.heightNR');
}

export default function Add({ mode = 'add', Frame }: { mode?: 'add' | 'search'; Frame: Frame }) {
  const pool = store.pool.value;
  // A plant outside its climate range at the site is listed behind "Show N outside their climate
  // range", or found by name, marked in words (owner 2026-11-14). Outside as its verdict says (for the
  // page's period, as the Next step groups it; review r1 bugs-13), or, before the verdict rule is here,
  // as the range rule says today. When nothing on the list fits, every plant is listed, each marked.
  const loc = store.location.value;
  const rule = store.rangeRule.value;
  const verdicts = store.poolVerdicts.value;
  const outside = (t: Taxon) => (verdicts ? verdicts.get(t.id)?.level === 'outside' : !!rule && rule.rangeFit(t, loc) === 'outside');
  // The list order only (rules/list-query.ts addOrder): misfits, serious conflicts and outside-range
  // plants come after the others; nothing asks.
  const last = (flags: Flag[], t?: Taxon) => warns(flags) || (!!t && outside(t));
  const scene = store.flagScene.value;
  const climate = store.climate.value;
  // What Add was opened for (store.openSheet): a hole (its plants), else a job or a run of one layer.
  const { cell, job, hole, fits } = mode === 'add' ? sheetCell.value : store.FOR_NOTHING;
  const members = store.members.value;
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState<PlantId[]>([]);
  const [showOutside, setShowOutside] = useState(false);
  const zones = store.curatedClimates.value;
  const otherZones = zones.filter((z) => z !== climate);
  const q = query.trim();

  // Another climate's list is read only once a name is typed (it can only answer a query).
  useEffect(() => { if (q) for (const z of otherZones) void store.loadPool(z); }, [q !== '', otherZones.join()]);

  // A hole lists the plants that fill it (holes.ts fills, via the sheet's `fits`); otherwise the list's plants of the job or
  // run (rules/list-query.ts), every site misfit included (`anyway`: nothing is hidden for the site).
  const site = store.site.value, taxa = store.memberTaxa.value;
  const base = useMemo(() => (!pool ? [] : hole && fits ? pool.filter(fits) : listQuery(pool, addQuery({ cell, job, anyway: true }, site, taxa))),
    [pool, hole, fits, cell, job, site, taxa]);
  // Without a query, the plants outside their range go behind "Show N outside their climate range"
  // (when any other plant is listed): Add's rows and that group together are what "See all N" counts.
  const grouped = useMemo(() => !q && base.some((t) => !members.includes(t.id) && !outside(t)), [base, q, members, verdicts, rule, loc]);
  const rows = useMemo(() => {
    if (!pool) return [];
    const list = base.filter((t) => !members.includes(t.id) && !(grouped && outside(t))).map((t) => ({ t, flags: flagsOfPlant(t) })).map((r) => ({ ...r, warns: last(r.flags, r.t) }));
    if (q) {
      // Best match first (S1's score: whole name, name prefix, word prefix, then by name).
      const score = new Map(searchOf(pool)(q).map((x, i) => [x.id, i]));
      return list.filter((r) => score.has(r.t.id)).sort((a, b) => score.get(a.t.id)! - score.get(b.t.id)!);
    }
    return addOrder(list);
  }, [pool, base, grouped, members, q, store.flagContext.value, store.site.value, verdicts]);
  const outsideRows = useMemo(() => (!grouped ? [] : base.filter((t) => outside(t) && !members.includes(t.id)).map((t) => ({ t, flags: flagsOfPlant(t), warns: true }))),
    [base, grouped, members, verdicts, rule, loc]);
  // The other climates' matches not in this list: one-tap Add, each from the first list that has it.
  const elsewhere = useMemo(() => {
    if (!pool || !q) return [];
    const own = new Set(pool.map((t) => t.id)), seen = new Set<PlantId>();
    const out: { t: Taxon; from: ClimateZone; flags: Flag[] }[] = [];
    for (const z of otherZones) {
      const list = store.pools.value[z];
      if (!list) continue;
      const byId = new Map(list.map((t) => [t.id, t]));
      for (const hit of searchOf(list)(q, 20)) {
        if (own.has(hit.id) || seen.has(hit.id) || members.includes(hit.id)) continue;
        seen.add(hit.id);
        const t = byId.get(hit.id);
        if (t) { const g = asGuest(t, z); out.push({ t: g, from: z, flags: flagsOfPlant(g) }); }
      }
    }
    return out;
  }, [pool, q, store.pools.value, members, otherZones.join(), store.flagContext.value, store.site.value]);

  if (!climate) return null;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)
  const shown = all ? rows : rows.slice(0, FIRST_ROWS);
  const toggle = (id: PlantId) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addSelected = (more: PlantId[] = [], from: Partial<Record<PlantId, ClimateZone>> = {}) => {
    const ids = [...selected, ...more].filter((id, i, all) => all.indexOf(id) === i && !members.includes(id));
    closeSheet();
    addMembers(ids, from);
  };
  // Opened for a hole: titled with the hole in the Next step's words (review r1 conformance-10).
  const title = mode === 'search' ? T('add.searchTitle') : hole ? holeWords(hole)
    : cell?.stratum ? T('add.titleCell', { layer: T(`stratum.${cell.stratum}`), phase: cell.from === cell.to ? phasePlain(cell.from) : `${phasePlain(cell.from)} → ${phasePlain(cell.to)}` })
    : job ? jobFind(job, cell) : T('add.title');
  const n = selected.length;
  // One row: a tick (nothing asks), its reasons in words, an outside-range plant's verdict with an icon.
  const row = ({ t, flags, warns: flagged }: { t: Taxon; flags: Flag[]; warns: boolean }) => {
    const lines = flagLines(t, flags, scene);
    const on = selected.includes(t.id);
    const label = `${nameOf(t)}, ${t.canonical_name}`;
    return (
      <li key={t.id} class={`${flagged ? 'flagged' : ''}${on ? ' is-on' : ''}`}>
        <div class="ct-row-main">
          <strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i>
          <Bar taxon={t} run={cell} />
        </div>
        <label class="ct-tick"><input type="checkbox" checked={on} aria-label={label} onChange={() => toggle(t.id)} /></label>
        <div class="ct-row-why">
          <span>{[spanWords(t), heightWords(t)].join(' · ')}</span>
          {outside(t) && <FitLine v={verdicts?.get(t.id)} known="outside" />}
          {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
          <PlantMarks taxon={t} surface="add" />
        </div>
      </li>
    );
  };

  return (
    <Frame titleId="ct-add-title" class="ct-add" head={<span class="ct-muted">{T('add.title')}</span>} foot={
      <div class="ct-add-bar">
        <span aria-live="polite">{P('add.selected', n)}</span>
        <button type="button" class="button button-primary" disabled={!n} onClick={() => addSelected()}>{P('add.addSel', n)}</button>
      </div>
    }>
      <div>
        <h2 id="ct-add-title" tabIndex={-1} data-autofocus>{title}</h2>
        <p class="ct-muted">{T('add.lede', { climate: zoneName(climate) })}</p>
        <NotChecked ctx={store.flagContext.value} />
      </div>
      <div class="ct-search">
        <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>
        <input type="search" aria-label={T('add.search')} placeholder={T('add.search')} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {shown.length > 0 ? (
        <ul class="ct-rows">
          {shown.map((r) => row(r))}
        </ul>
      ) : <p class="ct-muted">{T('emptyList')}</p>}
      {outsideRows.length > 0 && (showOutside
        ? <ul class="ct-rows" data-outside="">{(all ? outsideRows : outsideRows.slice(0, FIRST_ROWS)).map((r) => row(r))}</ul>
        : <p><button type="button" class="button button-secondary" onClick={() => setShowOutside(true)}>{P('palette.showOutside', outsideRows.length)}</button></p>)}
      {!all && (rows.length > shown.length || (showOutside && outsideRows.length > FIRST_ROWS)) && (
        <p><button type="button" class="button button-secondary ct-add-showall" onClick={() => setAll(true)}>{P('add.showAll', rows.length + (showOutside ? outsideRows.length : 0))}</button></p>
      )}
      {elsewhere.length > 0 && (
        <section aria-labelledby="ct-add-other">
          <h3 id="ct-add-other">{T('otherLists')}</h3>
          <ul class="ct-rows">
            {elsewhere.map(({ t, from, flags }) => {
              const lines = flagLines(t, flags, scene);
              return (
                <li class={last(flags, t) ? 'flagged' : ''}>
                  <div class="ct-row-main"><strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i></div>
                  <button type="button" class="button button-secondary" aria-label={T('addOne', { name: nameOf(t) })} aria-describedby={`ct-add-o-${t.id}`}
                    onClick={() => addSelected([t.id], { [t.id]: from })}>{T('add')}</button>
                  <div class="ct-row-why" id={`ct-add-o-${t.id}`}>
                    <span>{T('add.otherLine', { other: zoneName(from), climate: zoneName(climate) })} {T('details.fromList', { climate: zoneName(from) })}.</span>
                    {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
                    <PlantMarks taxon={t} surface="add" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Frame>
  );
}
