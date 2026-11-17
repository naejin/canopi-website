/** @jsxImportSource preact */
// Paste a list (stream S3; mockup 01 `paste`, design check A8): one name per line (or a spreadsheet
// column, picked when the paste has several; comma or semicolon columns read every cell unless one is picked), matched against this climate's list, then the other
// climates' lists (views/find/paste.ts, through Find's search: data/search.ts, synonyms and the names
// file's names included). The other lists are the release's plants as Find reads them (views/find/
// names.ts releasePlants): opening Paste loads no list; a plant of another list loads its list only
// when it is added (fix round 1, A8), so its warnings show once it is in. Each line is found, to choose
// (a genus, a shared name, a word of a name), found in another climate's list, already in, listed
// twice, or not found, one row a line in the paste's order with the count of names read (board Paste,
// fix round 1 B10); opened from Find it is drawn in Find's sheet and goes back to it (B11). Every
// warning stays on its row in words, a plant outside its range says so. Owner row "Inform, don't block"
// (2026-11-14, knowledge/decisions/consortium-user-decisions.md): nothing asks first. A row's "Add
// anyway" (a guest, labelled "From the {climate} list", A9) adds it in one tap and "Add all" adds the
// found and ticked plants; a plant with a warning (rules/find-query.ts addsWithWarning, as in Find) makes the toast say
// "n added with a warning" with Show. Each added plant is kept. The text is read a moment after typing stops (and at once on "Add all"), at most
// MAX_LINES lines.
// Loaded on first use with Find, one chunk (views/find/index.ts, views/Sheets.tsx).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { addsWithWarning } from '../../rules/find-query.ts';
import { EVERY_CELL, pasteColumn, pasteNames, pasteTable, readPaste, type Named } from './paste.ts';
import { addMembers, closeSheet, flagsOfPlant } from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { SheetWaiting, WARN, type Frame } from '../kit/sheet.tsx';
import { flagLines } from '../kit/flags.ts';
import { FitLine } from '../kit/fit.tsx';
import { nameOf, zoneName } from '../kit/names.ts';
import { finder, releasePlants, wantNames } from './names.ts';

const MAX_LINES = 500;
const SETTLE_MS = 200;
const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;
const OK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

// onBack: opened from Find, Paste is drawn in Find's sheet and Cancel or an add goes back to it (B11);
// "Search by hand" goes back with the line's name for Find's search.
export default function Paste({ Frame, onBack }: { Frame: Frame; onBack?: (name?: string) => void }) {
  const pool = store.pool.value;
  const climate = store.climate.value;
  const scene = store.flagScene.value;
  const members = store.members.value;
  const guests = store.guests.value;
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const [settled, setSettled] = useState('');
  const [column, setColumn] = useState<number | null>(null); // null: the default (every cell for comma columns)
  const [ticked, setTicked] = useState<PlantId[]>([]);
  const zones = store.curatedClimates.value;
  const release = releasePlants.value;
  const source = store.source.value, index = finder.value ?? undefined;
  useEffect(() => { if (source) wantNames(source, pageLang() as Locale); }, [source]);
  useEffect(() => { const id = setTimeout(() => setSettled(text), SETTLE_MS); return () => clearTimeout(id); }, [text]);

  const table = pasteTable(settled);
  const col = pasteColumn(settled, column);
  // The plants only other lists hold, each under its first list in the export's order.
  const lists = useMemo(() => {
    const here = new Set(pool?.map((t) => t.id) ?? []), by = new Map<ClimateZone, Named[]>();
    for (const p of release.values()) {
      const z = here.has(p.id) ? undefined : zones.find((c) => c !== climate && p.lists.includes(c));
      if (z) by.set(z, [...(by.get(z) ?? []), { id: p.id, canonical_name: p.canonical, genus: p.canonical.split(' ')[0], names: p.names }]);
    }
    return zones.flatMap((z) => (by.has(z) ? [[z, by.get(z)!] as [ClimateZone, Named[]]] : []));
  }, [release, pool, climate, zones]);
  const read = (src: string) => {
    const all = pasteNames(src, pasteColumn(src, column));
    const names = all.length > MAX_LINES ? Object.assign(all.slice(0, MAX_LINES), { header: all.header, split: all.split }) : all;
    return { capped: all.length > MAX_LINES, result: pool ? readPaste<Named>(names, { here: pool, others: lists, members, index }) : null };
  };
  const { capped, result } = useMemo(() => read(settled), [settled, column, pool, members, lists, index]);
  if (!climate) return null;
  if (!pool || !result) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  // What "Add all" adds from a reading: the found plants and the ticked ones, each once.
  const plan = (r: NonNullable<typeof result>) => {
    const climateOf = new Map<PlantId, ClimateZone>();
    for (const c of r.choose) if (c.climate) for (const t of c.taxa) climateOf.set(t.id, c.climate);
    const chosen = ticked.filter((id) => r.choose.some((c) => c.taxa.some((t) => t.id === id)));
    const ids = [...new Set([...r.found.map((f) => f.taxon.id), ...chosen])].filter((id) => !members.includes(id));
    return { ids, climateOf };
  };
  const toAdd = plan(result).ids;
  // A plant's warnings once its list is read (another list's plant: after its pool loads on add).
  const warnedNow = (id: PlantId) => { const t = store.taxonOf(id); return !!t && addsWithWarning(flagsOfPlant(t)); };
  const addAll = async () => {
    // The text as it is now, not as it was a moment ago.
    const current = box.current?.value ?? text;
    const now = current === settled ? result : read(current).result;
    if (!now) return;
    const { ids, climateOf } = plan(now);
    if (!ids.length) return;
    const from: Partial<Record<PlantId, ClimateZone>> = {};
    for (const id of ids) { const z = climateOf.get(id); if (z) from[id] = z; }
    // Only the lists of the plants added are read, now (A8).
    await Promise.all([...new Set(Object.values(from))].map((z) => store.loadPool(z!)));
    if (onBack) onBack(); else closeSheet();
    addMembers(ids, from, { warned: ids.filter(warnedNow) });
  };
  // The row turns to "in your palette" as the plant joins, and the focus moves on (W4): to the next
  // row's "Add anyway" (next: its plant, else the row before's), else the count line.
  const addGuest = async (t: Named, from: ClimateZone, next?: Named) => {
    await store.loadPool(from);
    addMembers([t.id], { [t.id]: from }, { warned: warnedNow(t.id) ? [t.id] : [] });
    focusAfterAdd(() => (next && document.querySelector<HTMLElement>(`button[aria-describedby="ct-p-o-${next.id}"]`)) || document.getElementById('ct-p-count'));
  };
  const toggle = (id: PlantId) => setTicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sci = (t: Named) => <i class="ct-sci">{t.canonical_name}</i>;
  // A row's warnings in words: a plant of this list (another list's plant shows its own once added).
  const warnings = (n: Named) => {
    const t = 'warnings' in n ? n as Taxon : null;
    if (!t) return null;
    const lines = flagLines(t, flagsOfPlant(t), scene);
    return lines.length ? <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span> : null;
  };
  const empty = !result.found.length && !result.choose.length && !result.other.length && !result.already.length && !result.duplicate.length && !result.none.length;
  const sample = (c: number) => table.rows.find((r, i) => i > 0 && r[c]?.trim())?.[c]?.trim().slice(0, 24) ?? table.rows[0]?.[c]?.trim().slice(0, 24) ?? '';

  // The paste in its order (board Paste, fix round 1 B10): one row a line, its reading said on it, with
  // its mark (K11): ✓ read, ⓘ a question, ✗ not found; the mark has its word on the row.
  type Status = 'found' | 'choose' | 'other' | 'already' | 'duplicate' | 'none';
  type Row = { at: number; name: string; status: Status; body: ComponentChildren };
  const pv = store.verdictFailed.value ? null : store.poolVerdicts.value;
  const rangeWarn = (n: Named) => (pv?.get(n.id)?.level === 'outside' ? <FitLine v={pv.get(n.id)} /> : null);
  // "Search by hand" (board Paste): Find with the name in its search (opened alone: Find).
  const byHand = (name: string) => (onBack ? onBack(name) : store.openFind());
  const rows: Row[] = [
    ...result.found.map((f): Row => ({ at: f.at, name: f.name, status: 'found', body: <>
      <span><strong>{nameOf(f.taxon)}</strong> {sci(f.taxon)} · {T('paste.isNew')}{f.close && <> · <span class="ct-muted">{T('paste.close', { name: f.close })}</span></>}</span>
      {rangeWarn(f.taxon)}{warnings(f.taxon)}</> })),
    ...result.choose.map((c): Row => {
      const none = !c.taxa.some((t) => ticked.includes(t.id));
      return { at: c.at, name: c.name, status: 'choose', body: <>
        <span>{P('paste.which', c.taxa.length, { name: c.word })}</span>
        {c.climate && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(c.climate) })}</span>}
        <span class="ct-paste-choices" role="group" aria-label={P('paste.which', c.taxa.length, { name: c.word })}>
          {c.taxa.map((t) => (
            members.includes(t.id)
              ? <span class="ct-paste-choice is-in">{nameOf(t)} · {T('inConsortium')}</span>
              : <button type="button" class="ct-paste-choice" aria-pressed={ticked.includes(t.id) ? 'true' : 'false'} title={t.canonical_name} onClick={() => toggle(t.id)}>{nameOf(t)}</button>
          ))}
          <button type="button" class="ct-paste-choice" aria-pressed={none ? 'true' : 'false'} onClick={() => setTicked((s) => s.filter((id) => !c.taxa.some((t) => t.id === id)))}>{T('paste.choiceNone')}</button>
        </span>
        {c.taxa.filter((t) => ticked.includes(t.id)).map((t) => <>{rangeWarn(t)}{warnings(t)}</>)}</> };
    }),
    ...result.other.map((o, i): Row => ({ at: o.at, name: o.name, status: 'other', body: <>
      <span><strong>{nameOf(o.taxon)}</strong> {sci(o.taxon)} · {T('otherLists')}</span>
      <span id={`ct-p-o-${o.taxon.id}`}>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate) })}</span>
      {warnings(o.taxon)}
      <button type="button" class="button button-secondary" aria-describedby={`ct-p-o-${o.taxon.id}`}
        onClick={() => void addGuest(o.taxon, o.climate, (result.other[i + 1] ?? result.other[i - 1])?.taxon)}>{T('addAnyway')}</button></> })),
    ...result.already.map((a): Row => ({ at: a.at, name: a.name, status: 'already', body: <>
      <span><strong>{nameOf(a.taxon)}</strong> {sci(a.taxon)} · {T('inConsortium')}</span>
      {guests[a.taxon.id] && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(guests[a.taxon.id]!) })}</span>}</> })),
    ...result.duplicate.map((d): Row => ({ at: d.at, name: d.name, status: 'duplicate', body: <span><strong>{nameOf(d.taxon)}</strong> {sci(d.taxon)} · {T('paste.twice')}</span> })),
    ...result.none.map((x): Row => ({ at: x.at, name: x.name, status: 'none', body: <>
      <span><strong>{T('paste.notFound')}</strong></span>
      <button type="button" class="text-link" data-paste-byhand="" onClick={() => byHand(x.name)}>{T('paste.byHand')}</button></> })),
  ].sort((a, b) => a.at - b.at);
  const MARK: Record<Status, ComponentChildren> = {
    found: OK, other: OK, already: OK, duplicate: OK,
    choose: <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 7v4.5M8 4.6v.8" stroke="currentColor" stroke-width="1.6" /></svg>,
    none: <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>,
  };
  const lines = rows.length;
  const sum = [
    result.found.length + result.other.length > 0 && P('paste.sumNew', result.found.length + result.other.length),
    result.already.length > 0 && P('paste.sumHave', result.already.length),
    result.none.length > 0 && P('paste.sumNone', result.none.length),
  ].filter(Boolean).join(', ');
  const back = () => (onBack ? onBack() : closeSheet());

  return (
    <Frame titleId="ct-paste-title" class="ct-paste" foot={
      <div class="ct-add-bar">
        <button type="button" class="button button-secondary" data-paste-cancel="" onClick={back}>{T('paste.cancel')}</button>
        <button type="button" class="button button-primary" disabled={!toAdd.length} onClick={() => void addAll()}>{PLUS} {P('paste.addAll', toAdd.length)}</button>
      </div>
    }>
      <div>
        <h2 id="ct-paste-title" tabIndex={-1} data-autofocus>{T('paste.title')}</h2>
        <p class="ct-muted">{T('paste.lede')}</p>
      </div>
      <div class="ct-field">
        <label for="ct-paste-text">{T('paste.label')}</label>
        <textarea ref={box} id="ct-paste-text" class="ct-paste-text" rows={6} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
      </div>
      {table.columns > 1 && (
        <div class="ct-field">
          <label for="ct-paste-col">{T(table.sep === '\t' ? 'paste.columns' : 'paste.columnsSep', { n: table.columns })}</label>
          <select id="ct-paste-col" value={String(col)} onChange={(e) => setColumn(Number((e.target as HTMLSelectElement).value))}>
            {table.sep !== '\t' && <option value={String(EVERY_CELL)}>{T('paste.everyCell')}</option>}
            {Array.from({ length: table.columns }, (_, c) => <option value={String(c)}>{T('paste.column', { n: c + 1, sample: sample(c) })}</option>)}
          </select>
        </div>
      )}
      {capped && <p class="ct-note">{T('paste.cap', { n: MAX_LINES })}</p>}
      <div aria-live="polite">
        {empty && <p class="ct-muted">{T('paste.empty')}</p>}
        {lines > 0 && <p id="ct-p-count" tabIndex={-1} data-paste-count=""><strong>{P('paste.read', lines)}</strong>{sum && <span class="ct-muted"> {sum}</span>}</p>}
        {lines > 0 && (
          <ul class="ct-rows ct-paste-rows">
            {rows.map((r) => (
              <li key={`${r.at}`} data-paste-row="" data-status={r.status}><span class="ct-paste-mark" data-status={r.status}>{MARK[r.status]}</span><span class="ct-paste-body">“{r.name}” {r.body}</span></li>
            ))}
          </ul>
        )}
        {result.none.length > 0 && <p class="ct-muted">{T('paste.noneText')}</p>}
        {lines > 0 && <p class="ct-muted" data-paste-note="">{T('paste.note')}</p>}
      </div>
    </Frame>
  );
}
