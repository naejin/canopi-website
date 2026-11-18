/** @jsxImportSource preact */
// Your plants past 40 plants (v14 pf-e; boards Many at 390, ManyDesk at 1280; F22, F30, A21): a
// compact list on the phone, a table at 960 px and wider, both grouped (light level by default) with
// each group closed until opened (its first 10 rows, then "+ N more", then all), sorted by fit unless
// the reader sorts otherwise, filtered by the search (the phone's sits under the palette's head,
// Palette.tsx; the desk's in this section). Ticks (views/plants/state.ts) stay when the reader searches,
// sorts or regroups; "Remove N plants" removes the ticked plants at once with one Undo
// (store.removeMembers), and the focus goes to the next row or its group's head, never <body>. Swap
// stays on each plant (Details). At 960 px and wider "Add plants" opens Find in place of the table
// (views/Sheets.tsx findIn 'list'), open while the reader adds; Done brings the table back and the
// focus to "Add plants".
import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { PlantId, PlantRow } from '../../../../lib/consortium/index.ts';
import { fitGroups, jobIds, moreLine } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { nameOf, P, T, pageLang } from '../../strings.ts';
import { FitLine, say } from '../kit/fit.tsx';
import { collatorFor, countryName } from '../kit/names.ts';
import { WARN, CLOSE } from '../kit/icons.tsx';
import { rowSpan, PLUS } from '../rows.tsx';
import { FindPanel, findIn, openFindInList } from '../Sheets.tsx';
import { deskFind } from '../Toast.tsx';
import { GROUPS, groupItems, plantItems, searchItems, shownRows, SORTS, sortItems, type GroupKey, type PlantItem, type SortKey } from './model.ts';
import { clearTicks, groupKey, isTicked, query, removeTicked, setGroup, setStage, setTick, sortKey, stages, tickIds, ticked, wide } from './state.ts';
import { Missing } from './Small.tsx';

const CHEVRON = (up: boolean) => <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d={up ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} fill="none" stroke="currentColor" stroke-width="1.6" /></svg>;
const SEARCH_ICON = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="m10.2 10.2 3.4 3.4" stroke="currentColor" stroke-width="1.5" /></svg>;

// A row's jobs in short words ("Food, mulch"), or "Jobs not checked yet".
export function jobsShort(i: Pick<PlantItem, 'jobs' | 'jobsKnown'>): string {
  if (!i.jobsKnown && !i.jobs.length) return T('many.jobsNone');
  const words = i.jobs.map((j, n) => { const w = T(`many.job_${j}`); return n === 0 ? w : lowerMid(w); });
  return words.join(T('many.jobsSep'));
}
const LOWER = new Set(['en', 'fr', 'es', 'pt', 'it', 'nl', 'ru']);
const lowerMid = (s: string): string => (LOWER.has(pageLang()) ? s.charAt(0).toLocaleLowerCase(pageLang()) + s.slice(1) : s);

// The row's word on its fit (board Many): outside with its cause, the second look's first reason, a
// mark (Mildly toxic), or nothing for a plain fit; "Not checked" without a verdict.
function reasonWords(i: PlantItem): string | null {
  const country = store.country.value?.code ?? null;
  switch (i.reason) {
    case 'severe': return T('tox.Severe');
    case 'moderate': return T('tox.Moderate');
    case 'mild': return T('tox.Slight');
    case 'invasive': return country ? T('palette.warningsInvasive', { country: countryName(country) }) : T('many.invasive');
    case 'misfit': return T('palette.warningsMisfit');
    case 'clash': return T('palette.warningsClash');
    default: return null;
  }
}
const LEVEL_KEY = { outside: 'palette.warningsOutside', look: 'palette.warningsLook', fits: 'palette.warningsFits', unknown: 'palette.warningsUnknown' } as const;

// The phone's word line: a warned row in the warning colour, with the icon.
function FitWord({ i }: { i: PlantItem }) {
  const v = store.memberVerdicts.value?.get(i.id);
  if (i.level === 'outside' || (i.level === 'look' && (i.reason === 'edge' || !i.reason))) {
    return <span class="ct-many-word" data-level="warning"><FitLine v={v} head /></span>;
  }
  const w = i.level === 'unknown' ? T('palette.warningsUnknown') : reasonWords(i);
  if (!w) return null;
  return <span class="ct-many-word" data-level={i.level === 'unknown' ? 'plain' : i.reason === 'severe' || i.reason === 'invasive' ? 'danger' : 'warning'}>{i.level !== 'unknown' && WARN} {w}</span>;
}
// The desk's fit cell: the line's words, then its reason ("Needs a second look / Toxic").
function FitCell({ i }: { i: PlantItem }) {
  const v = store.memberVerdicts.value?.get(i.id);
  const why = i.level === 'outside' || (i.level === 'look' && (i.reason === 'edge' || !i.reason)) ? <FitLine v={v} head /> : reasonWords(i);
  return <><span class="ct-many-level" data-level={i.level}>{T(LEVEL_KEY[i.level])}</span>{why && i.level !== 'outside' && <span class="ct-many-reason">{why}</span>}
    {i.level === 'outside' && <span class="ct-many-reason">{why}</span>}</>;
}

const groupWord = (key: GroupKey, k: string): string => {
  if (key === 'light') return k ? T(`palette.light_${k}`) : T('palette.light_none');
  if (key === 'job') return k ? T(`job.${k}`) : T('many.jobsNone');
  if (key === 'fit') return T(LEVEL_KEY[k as keyof typeof LEVEL_KEY]);
  if (key === 'family') return k || T('many.familyNone');
  return T('many.allPlants');
};

const open = (id: PlantId) => store.openSheet('details', id);

function TickBox({ i }: { i: PlantItem }) {
  return (
    <label class="ct-many-tick">
      <input type="checkbox" checked={isTicked(i.id)} aria-label={T('many.tick', { name: i.name })} onChange={(e) => setTick(i.id, (e.target as HTMLInputElement).checked)} />
    </label>
  );
}

function PhoneRow({ i }: { i: PlantItem }) {
  const span = rowSpan(i.t);
  return (
    <li data-plant-id={i.id} data-fit={i.rank}>
      <TickBox i={i} />
      <span class="ct-many-main">
        <button type="button" class="ct-link-button ct-many-name" onClick={() => open(i.id)}>{i.name}</button>{' '}
        <i lang="la" class="ct-sci">{i.t.canonical_name}</i>
        <span class="ct-many-sub">{span ? `${span} · ` : ''}{jobsShort(i)}</span>
        <FitWord i={i} />
      </span>
    </li>
  );
}

function DeskRow({ i, light }: { i: PlantItem; light: boolean }) {
  return (
    <tr data-plant-id={i.id} data-fit={i.rank}>
      <td class="ct-many-tickcell"><TickBox i={i} /></td>
      <th scope="row"><button type="button" class="ct-link-button ct-many-name" onClick={() => open(i.id)}>{i.name}</button> <i lang="la" class="ct-sci">{i.t.canonical_name}</i></th>
      {light && <td>{i.stratum ? T(`palette.light_${i.stratum}`) : T('palette.light_none')}</td>}
      <td>{rowSpan(i.t) ?? T('timingUnknown')}</td>
      <td>{jobsShort(i)}</td>
      <td class="ct-many-fit"><FitCell i={i} /></td>
    </tr>
  );
}

// A group's head: open or close it, and "Tick all N".
function GroupHead({ k, word, items, stage }: { k: string; word: string; items: PlantItem[]; stage: 0 | 1 | 2 }) {
  const opened = stage > 0;
  return (
    <div class="ct-many-ghead">
      <button type="button" class="ct-many-gtoggle" aria-expanded={opened ? 'true' : 'false'} data-group={k} onClick={() => setStage(k, opened ? 0 : 1)}>
        <b>{word}</b> <span>{P('many.count', items.length)}</span>{CHEVRON(opened)}
      </button>
      <button type="button" class="button button-secondary ct-many-tickall" aria-label={T('many.tickAllIn', { n: items.length, group: word })}
        onClick={() => tickIds(items.map((x) => x.id))}>{T('many.tickAll', { n: items.length })}</button>
    </div>
  );
}

// Opening "+ N more" moves the focus to the first row it shows.
const focusRow = (id: PlantId | undefined) => {
  if (!id) return;
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`#ct-root .ct-plants [data-plant-id="${CSS.escape(id)}"] input`)?.focus());
};

function MoreButton({ k, word, rest, firstNew, desk }: { k: string; word: string; rest: number; firstNew?: PlantId; desk: boolean }) {
  return (
    <button type="button" class="ct-many-more text-link" aria-expanded="false" aria-label={T(desk ? 'many.showOtherRows' : 'many.showOther', { group: word })}
      onClick={() => { setStage(k, 2); focusRow(firstNew); }}>{say(moreLine(rest))}</button>
  );
}

// The tick bar: how many are ticked, Remove them, clear the ticks. Nothing while none is ticked.
function TickBar({ heading }: { heading: () => HTMLElement | null }) {
  const n = ticked.value.length;
  if (!n) return null;
  const remove = () => {
    const ids = new Set(ticked.peek());
    // The row after the last ticked one shown, else the group's head, else the heading.
    const rows = [...document.querySelectorAll<HTMLElement>('#ct-root .ct-plants [data-plant-id]')];
    const last = rows.map((r) => ids.has(r.dataset.plantId!)).lastIndexOf(true);
    const next = rows.slice(last + 1).find((r) => !ids.has(r.dataset.plantId!))?.dataset.plantId ?? null;
    removeTicked();
    focusAfterAdd(() => (next ? document.querySelector<HTMLElement>(`#ct-root .ct-plants [data-plant-id="${CSS.escape(next)}"] input`) : null)
      ?? document.querySelector<HTMLElement>('#ct-root .ct-plants .ct-many-gtoggle') ?? heading());
  };
  return (
    <div class="ct-many-tickbar" role="group" aria-label={P('many.tickedGroup', n)}>
      <b>{P('many.ticked', n)}</b>
      <button type="button" class="button button-secondary" onClick={remove}>{P('many.remove', n)}</button>
      <button type="button" class="ct-icon-button" aria-label={T('many.clear')} onClick={() => { clearTicks(); heading()?.focus(); }}>{CLOSE}</button>
    </div>
  );
}

// The search (the phone's under the palette's head, Palette.tsx; the desk's here).
export function PlantSearch({ n, class: cls = '' }: { n: number; class?: string }) {
  const label = P('many.search', n);
  return (
    <label class={`ct-many-search ${cls}`}>
      {SEARCH_ICON}
      <input type="text" aria-label={label} placeholder={label} value={query.value} onInput={(e) => { query.value = (e.target as HTMLInputElement).value; }} />
    </label>
  );
}

function Select<K extends string>({ label, keys, value, onChange, word, data }: { label: string; keys: readonly K[]; value: K; onChange: (k: K) => void; word: (k: K) => string; data: string }) {
  return (
    <label class="ct-many-select">{label}
      <select {...{ [data]: '' }} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as K)}>
        {keys.map((k) => <option value={k}>{word(k)}</option>)}
      </select>
    </label>
  );
}

const SORT_OF_COLUMN: Record<string, SortKey> = { plant: 'name', when: 'years', jobs: 'job', fit: 'fit', light: 'light' };

export function ManyPlants({ rows }: { rows: readonly PlantRow[] }) {
  const members = store.memberTaxa.value, verdicts = store.memberVerdicts.value, flags = store.flags.value;
  const heading = useRef<HTMLHeadingElement>(null);
  const lang = pageLang();
  const cmp = useMemo(() => collatorFor(lang).compare, [lang]);
  const failed = store.verdictFailed.value;
  const all = useMemo(() => plantItems(members, fitGroups(members, failed ? null : verdicts, flags), nameOf), [members, verdicts, flags, failed]);
  const q = query.value, sk = sortKey.value, gk = groupKey.value, st = stages.value, desk = wide.value;
  const found = useMemo(() => sortItems(searchItems(all, q), sk, cmp, jobIds), [all, q, sk, cmp]);
  const groups = useMemo(() => groupItems(found, gk, cmp, jobIds), [found, gk, cmp]);
  const missing = rows.filter((r): r is Extract<PlantRow, { missing: unknown }> => 'missing' in r);
  const searching = q.trim().length > 0;
  const n = new Set([...members.map((t) => t.id), ...missing.map((r) => r.id)]).size;
  const inList = desk && deskFind.value && findIn.value === 'list';
  const removeOne = (id: PlantId) => { store.removeMember(id); focusAfterAdd(() => heading.current); };

  const body = (render: (i: PlantItem) => ComponentChildren, k: string, word: string, list: PlantItem[], stage: 0 | 1 | 2) => {
    const s = searching ? 2 : stage, shown = shownRows(list.length, s);
    return { rows: list.slice(0, shown).map(render), more: shown < list.length && s > 0 ? <MoreButton k={k} word={word} rest={list.length - shown} firstNew={list[shown]?.id} desk={desk} /> : null };
  };
  const light = gk !== 'light';
  const colHead = (col: keyof typeof SORT_OF_COLUMN, word: string) => {
    const on = sk === SORT_OF_COLUMN[col];
    return <th scope="col" aria-sort={on ? 'ascending' : undefined}><button type="button" class="ct-many-colhead" data-on={on ? '' : undefined} onClick={() => { sortKey.value = SORT_OF_COLUMN[col]; }}>{word}{on && CHEVRON(true)}</button></th>;
  };
  const screen = desk ? groups.flatMap((g) => { const s = searching ? 2 : (gk === 'none' ? (st.get(g.key) ?? 1) : st.get(g.key) ?? 0); return g.items.slice(0, shownRows(g.items.length, s)); }) : [];
  const allScreen = screen.length > 0 && screen.every((i) => isTicked(i.id));

  return (
    <section class="ct-plants ct-many" aria-labelledby="ct-plants-t" data-many="">
      <div class="ct-many-top">
        <div class="ct-many-titles">
          <h3 id="ct-plants-t" ref={heading} tabIndex={-1}>{P('many.title', n)}</h3>
          <p class="ct-muted">{desk ? T('many.ledeDesk') : T('many.lede')}</p>
        </div>
        {desk && <button type="button" class="button button-secondary" data-plants-add="" onClick={openFindInList}>{PLUS} {T('find.title')}</button>}
      </div>
      {inList ? <FindPanel where="list" /> : <>
        <div class="ct-many-tools">
          {desk && <PlantSearch n={n} />}
          {!desk && <Select label={T('many.sort')} keys={SORTS} value={sk} onChange={(k) => { sortKey.value = k; }} word={(k) => T(`many.sort_${k}`)} data="data-plants-sort" />}
          <Select label={desk ? T('many.groupBy') : T('many.group')} keys={GROUPS} value={gk} onChange={setGroup} word={(k) => T(`many.group_${k}`)} data="data-plants-group" />
        </div>
        <TickBar heading={() => heading.current} />
        {searching && !found.length && <p class="ct-muted">{T('many.noMatch', { q: q.trim() })}</p>}
        {desk ? (
          <table class="ct-many-table">
            <thead><tr>
              <th scope="col" class="ct-many-tickcell"><label class="ct-many-tick"><input type="checkbox" checked={allScreen} aria-label={T('many.tickScreen')} onChange={(e) => tickIds(screen.map((i) => i.id), (e.target as HTMLInputElement).checked)} /></label></th>
              {colHead('plant', T('many.col_plant'))}
              {light && colHead('light', T('many.col_light'))}
              {colHead('when', T('many.col_when'))}
              {colHead('jobs', T('many.col_jobs'))}
              {colHead('fit', T('many.col_fit'))}
            </tr></thead>
            {groups.map((g) => {
              const word = groupWord(gk, g.key), stage = gk === 'none' ? (st.get(g.key) ?? 1) : st.get(g.key) ?? 0;
              const b = body((i) => <DeskRow key={i.id} i={i} light={light} />, g.key, word, g.items, stage);
              return (
                <tbody key={g.key}>
                  {gk !== 'none' && <tr><td colSpan={light ? 6 : 5} class="ct-many-gcell"><GroupHead k={g.key} word={word} items={g.items} stage={searching ? 2 : stage} /></td></tr>}
                  {b.rows}
                  {b.more && <tr><td colSpan={light ? 6 : 5}>{b.more}</td></tr>}
                </tbody>
              );
            })}
          </table>
        ) : groups.map((g) => {
          const word = groupWord(gk, g.key), stage = gk === 'none' ? (st.get(g.key) ?? 1) : st.get(g.key) ?? 0;
          const b = body((i) => <PhoneRow key={i.id} i={i} />, g.key, word, g.items, stage);
          return (
            <div class="ct-many-group" key={g.key}>
              {gk !== 'none' && <GroupHead k={g.key} word={word} items={g.items} stage={searching ? 2 : stage} />}
              {b.rows.length > 0 && <ul class="ct-many-rows">{b.rows}</ul>}
              {b.more}
            </div>
          );
        })}
        {missing.length > 0 && <ul class="ct-plant-rows">{missing.map((r) => <Missing key={r.id} id={r.id} why={r.missing} onRemove={removeOne} />)}</ul>}
        <p class="ct-muted ct-many-foot">{T('many.foot')}</p>
      </>}
    </section>
  );
}
