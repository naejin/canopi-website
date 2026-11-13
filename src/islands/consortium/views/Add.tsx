/** @jsxImportSource preact */
// Add (stream S3; mockup 05 `add`): the plants of the climate's list, or of one cell (a free cell's
// "+ Add", "Show them anyway"), or of one job (Jobs' "Find…", for a run of stages in any layer when
// the job has a stage gap), with a search over folded names (S1's searchIndex, A6). Multi-select:
// tick several, then "Add 2 plants" in the sticky bar; 8 rows, then "Show all N". Warnings are shown
// on the row and never asked about; only a site misfit or a serious (high) conflict asks "Add it
// anyway?" (owner row 2026-10-28; coordinator row "v2 mockup choices" 2026-11-11): such a row has an
// "Add" button instead of a tick. A name found only in another climate's list is offered with "Add
// anyway" (it stays, owner row 2026-10-28 and design check A9): a guest, labelled "From the {climate}
// list"; it asks first too when it misfits or has a serious conflict (a single Add asks, 2026-10-28
// "Scale build" row), and its warnings stay on its row. With a query, rows come best match first
// (S1's score), 8 of them, then "Show all N". Search mode (Start's "Start empty and search", routed
// here by Details.tsx) is the same sheet with its own title.
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { ClimateZone, Flag, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { asks as asksFlags } from '../../../lib/consortium/index.ts';
import { searchIndex } from '../data/search.ts';
import { addMembers, closeSheet, flagsOfPlant, sheetCell } from '../store.ts';
import { Ask, Bar, NotChecked, SheetFrame, WARN } from './kit/sheet.tsx';
import { flagLines } from './kit/flags.ts';
import { nameOf, num, phasePlain, spanWords, zoneName } from './kit/names.ts';
import { PlantMarks } from './PlantMarks.tsx';
import { jobFind } from './StageBar.tsx';
import { addOrder, addQuery, listQuery } from '../rules/list-query.ts';

const FIRST_ROWS = 8;

type Search = ReturnType<typeof searchIndex>;
const searches = new WeakMap<Taxon[], Search>();
export function searchOf(list: Taxon[]): Search {
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

export default function Add({ mode = 'add' }: { mode?: 'add' | 'search' }) {
  const pool = store.pool.value;
  // P5 S5c: a plant outside its observed range at the site is listed only once its name is typed, and
  // then asks first ("outside its observed range"; owner answer 2). When nothing fits the site, the
  // search ("Search all plants") lists every plant, each marked, rather than none.
  const loc = store.location.value;
  const rule = store.rangeRule.value;
  const outside = (t: Taxon) => !!rule && rule.rangeFit(t, loc) === 'outside';
  const fitting = store.fitPool.value?.some((t) => !outside(t)) ? store.fitPool.value : null;
  const asks = (flags: Flag[], t?: Taxon) => asksFlags(flags) || (!!t && outside(t));
  const scene = store.flagScene.value;
  const askLines = (t: Taxon) => [...flagLines(t, flagsOfPlant(t), scene).filter((l) => l.asks).map((l) => l.text), ...(outside(t) ? [T('range.outsideDetails')] : [])];
  const climate = store.climate.value;
  // What Add was opened for (store.openSheet): a cell or run of one layer, a job, and `anyway`.
  const { cell, job, anyway } = mode === 'add' ? sheetCell.value : store.FOR_NOTHING;
  const members = store.members.value;
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState<PlantId[]>([]);
  const [asking, setAsking] = useState<{ t: Taxon; from: ClimateZone | null } | null>(null);
  const zones = store.source.value?.info().climates ?? [];
  const otherZones = zones.filter((z) => z !== climate);
  const q = query.trim();

  // Another climate's list is read only once a name is typed (it can only answer a query).
  useEffect(() => { if (q) for (const z of otherZones) void store.loadPool(z); }, [q !== '', otherZones.join()]);

  // A cell's "+ Add" lists the plants that fit the site there (the cell's "N fit"), counted as the
  // matrix counts them (core matrix.ts: a misfit beside the members' canopy); "Show them anyway"
  // lists every plant of the cell or run, the misfits flagged and asking first.
  const site = store.site.value, taxa = store.memberTaxa.value;
  // (rules/list-query.ts, the one filter rule of Add and the plant list.)
  const base = useMemo(() => (pool ? listQuery(query.trim() ? pool : fitting ?? pool, addQuery({ cell, job, anyway }, site, taxa)) : []),
    [pool, fitting, query.trim() !== '', cell, job, anyway, site, taxa]);
  const rows = useMemo(() => {
    if (!pool) return [];
    const list = base.filter((t) => !members.includes(t.id)).map((t) => ({ t, flags: flagsOfPlant(t) })).map((r) => ({ ...r, asks: asks(r.flags, r.t) }));
    if (q) {
      // Best match first (S1's score: whole name, name prefix, word prefix, then by name).
      const score = new Map(searchOf(pool)(q).map((x, i) => [x.id, i]));
      return list.filter((r) => score.has(r.t.id)).sort((a, b) => score.get(a.t.id)! - score.get(b.t.id)!);
    }
    return addOrder(list);
  }, [pool, base, members, q, store.flagContext.value, store.site.value]);
  // The other climates' matches not in this list: "Add anyway", each from the first list that has it.
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
        if (t) { const g = { ...t, from: z }; out.push({ t: g, from: z, flags: flagsOfPlant(g) }); }
      }
    }
    return out;
  }, [pool, q, store.pools.value, members, otherZones.join(), store.flagContext.value, store.site.value]);

  if (!pool || !climate) return null;
  const shown = all ? rows : rows.slice(0, FIRST_ROWS);
  const toggle = (id: PlantId) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addSelected = (more: PlantId[] = [], from: Partial<Record<PlantId, ClimateZone>> = {}) => {
    const ids = [...selected, ...more].filter((id, i, all) => all.indexOf(id) === i && !members.includes(id));
    closeSheet();
    addMembers(ids, from);
  };
  const title = mode === 'search' ? T('add.searchTitle')
    : cell?.stratum ? T('add.titleCell', { layer: T(`stratum.${cell.stratum}`), phase: cell.from === cell.to ? phasePlain(cell.from) : `${phasePlain(cell.from)} → ${phasePlain(cell.to)}` })
    : job ? jobFind(job, cell) : T('add.title');
  const n = selected.length;

  return (
    <SheetFrame titleId="ct-add-title" class="ct-add" head={<span class="ct-muted">{T('add.title')}</span>} foot={
      <div class="ct-add-bar">
        <span aria-live="polite">{P('add.selected', n)}</span>
        <button type="button" class="button button-primary" disabled={!n} onClick={() => addSelected()}>{P('add.addSel', n)}</button>
      </div>
    }>
      <div>
        <h2 id="ct-add-title" tabIndex={-1} data-autofocus>{title}</h2>
        <p class="ct-muted">{T('add.lede', { climate: zoneName(climate) })}</p>
        <NotChecked />
      </div>
      <div class="ct-search">
        <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="m10.5 10.5 3.5 3.5" stroke="currentColor" stroke-width="1.6" /></svg>
        <input type="search" aria-label={T('add.search')} placeholder={T('add.search')} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {shown.length > 0 ? (
        <ul class="ct-rows">
          {shown.map(({ t, flags, asks: asksFirst }) => {
            const lines = flagLines(t, flags, scene);
            const on = selected.includes(t.id);
            const label = `${nameOf(t)}, ${t.canonical_name}`;
            return (
              <li class={`${asksFirst ? 'flagged' : ''}${on ? ' is-on' : ''}`}>
                <div class="ct-row-main">
                  <strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i>
                  <Bar taxon={t} run={cell} />
                </div>
                {asksFirst
                  ? <button type="button" class="button button-secondary" aria-label={T('addOne', { name: nameOf(t) })} onClick={() => setAsking({ t, from: null })}>{T('add')}</button>
                  : <label class="ct-tick"><input type="checkbox" checked={on} aria-label={label} onChange={() => toggle(t.id)} /></label>}
                <div class="ct-row-why">
                  <span>{[spanWords(t), heightWords(t)].join(' · ')}</span>
                  {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
                  <PlantMarks taxon={t} surface="add" />
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p class="ct-muted">{T('emptyList')}</p>}
      {!all && rows.length > shown.length && (
        <p><button type="button" class="button button-secondary ct-add-showall" onClick={() => setAll(true)}>{P('add.showAll', rows.length)}</button></p>
      )}
      {elsewhere.length > 0 && (
        <section aria-labelledby="ct-add-other">
          <h3 id="ct-add-other">{T('otherLists')}</h3>
          <ul class="ct-rows">
            {elsewhere.map(({ t, from, flags }) => {
              const lines = flagLines(t, flags, scene);
              return (
                <li class={asks(flags, t) ? 'flagged' : ''}>
                  <div class="ct-row-main"><strong>{nameOf(t)}</strong> <i class="ct-sci">{t.canonical_name}</i></div>
                  <button type="button" class="button button-secondary" aria-describedby={`ct-add-o-${t.id}`}
                    onClick={() => (asks(flags, t) ? setAsking({ t, from }) : addSelected([t.id], { [t.id]: from }))}>{T('addAnyway')}</button>
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
      {asking && (
        <Ask
          title={T('add.ask')}
          lines={askLines(asking.t)}
          yes={T('addAnyway')}
          onYes={() => { const { t, from } = asking; addSelected([t.id], from ? { [t.id]: from } : {}); }}
          onCancel={() => setAsking(null)}
        />
      )}
    </SheetFrame>
  );
}
