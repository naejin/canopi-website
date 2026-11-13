/** @jsxImportSource preact */
// Paste a list (stream S3; mockup 01 `paste`, design check A8): one name per line (or a spreadsheet
// column, picked when the paste has several; comma or semicolon columns read every cell unless one is picked), matched against this climate's list, then the other
// climates' lists (views/paste.ts on S1's fold and word-prefix search). Each line is found, to choose
// (a genus, a shared name, a word of a name), found in another climate's list, already in, listed
// twice, or not found. Every warning stays on its row. Owner and coordinator rows
// (knowledge/decisions/consortium-user-decisions.md): a single Add asks first when the plant misfits
// the site or has a serious conflict, so a row's "Add anyway" (a guest, labelled "From the {climate}
// list", A9) asks then; "Add all" adds the found and ticked plants without asking about each one, then
// says "n added with a warning" with Show (2026-10-28 "Scale build, coordinator choices"). Each added
// plant is kept. The text is read a moment after typing stops (and at once on "Add all"), at most
// MAX_LINES lines.
// Loaded on first use (views/Sheets.tsx).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { ClimateZone, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { asks } from '../../../lib/consortium/index.ts';
import { EVERY_CELL, pasteColumn, pasteNames, pasteTable, readPaste } from './paste.ts';
import { addMembers, closeSheet, flagsOfPlant } from '../store.ts';
import { Ask, WARN, type Frame } from './kit/sheet.tsx';
import { flagLines } from './kit/flags.ts';
import { nameOf, zoneName } from './kit/names.ts';

const MAX_LINES = 500;
const SETTLE_MS = 200;

export default function Paste({ Frame }: { Frame: Frame }) {
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
  const [asking, setAsking] = useState<{ t: Taxon; from: ClimateZone } | null>(null);
  const zones = store.source.value?.info().climates ?? [];
  const others = zones.filter((z) => z !== climate);
  useEffect(() => { for (const z of others) void store.loadPool(z); }, [others.join()]);
  useEffect(() => { const id = setTimeout(() => setSettled(text), SETTLE_MS); return () => clearTimeout(id); }, [text]);

  const table = pasteTable(settled);
  const col = pasteColumn(settled, column);
  const lists = others.flatMap((z) => { const l = store.pools.value[z]; return l ? [[z, l] as [ClimateZone, Taxon[]]] : []; });
  const read = (src: string) => {
    const all = pasteNames(src, pasteColumn(src, column));
    const names = all.length > MAX_LINES ? Object.assign(all.slice(0, MAX_LINES), { header: all.header, split: all.split }) : all;
    return { capped: all.length > MAX_LINES, result: pool ? readPaste(names, { here: pool, others: lists, members }) : null };
  };
  const { capped, result } = useMemo(() => read(settled), [settled, column, pool, members, store.pools.value]);
  if (!pool || !climate || !result) return null;

  // What "Add all" adds from a reading: the found plants and the ticked ones, each once.
  const plan = (r: NonNullable<typeof result>) => {
    const climateOf = new Map<PlantId, ClimateZone>();
    for (const c of r.choose) if (c.climate) for (const t of c.taxa) climateOf.set(t.id, c.climate);
    const chosen = ticked.filter((id) => r.choose.some((c) => c.taxa.some((t) => t.id === id)));
    const ids = [...new Set([...r.found.map((f) => f.taxon.id), ...chosen])].filter((id) => !members.includes(id));
    const byId = new Map<PlantId, Taxon>([...r.found.map((f) => [f.taxon.id, f.taxon] as const), ...r.choose.flatMap((c) => c.taxa.map((t) => [t.id, c.climate ? { ...t, from: c.climate } : t] as const))]);
    return { ids, climateOf, byId };
  };
  const toAdd = plan(result).ids;
  const addAll = () => {
    // The text as it is now, not as it was a moment ago.
    const current = box.current?.value ?? text;
    const now = current === settled ? result : read(current).result;
    if (!now) return;
    const { ids, climateOf, byId } = plan(now);
    if (!ids.length) return;
    const from: Partial<Record<PlantId, ClimateZone>> = {};
    for (const id of ids) { const z = climateOf.get(id); if (z) from[id] = z; }
    const warned = ids.filter((id) => { const t = byId.get(id); return t ? asks(flagsOfPlant(t)) : false; });
    closeSheet();
    addMembers(ids, from, { warned });
  };
  const addGuest = (t: Taxon, from: ClimateZone) => addMembers([t.id], { [t.id]: from });
  const toggle = (id: PlantId) => setTicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sci = (t: Taxon) => <i class="ct-sci">{t.canonical_name}</i>;
  const warnings = (t: Taxon) => {
    const lines = flagLines(t, flagsOfPlant(t), scene);
    return lines.length ? <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span> : null;
  };
  const empty = !result.found.length && !result.choose.length && !result.other.length && !result.already.length && !result.duplicate.length && !result.none.length;
  const sample = (c: number) => table.rows.find((r, i) => i > 0 && r[c]?.trim())?.[c]?.trim().slice(0, 24) ?? table.rows[0]?.[c]?.trim().slice(0, 24) ?? '';

  return (
    <Frame titleId="ct-paste-title" class="ct-paste" head={<span class="ct-muted">{T('paste.title')}</span>} foot={
      <div class="ct-add-bar">
        <span>{P('paste.toAdd', toAdd.length)}</span>
        <button type="button" class="button button-primary" disabled={!toAdd.length} onClick={addAll}>{P('paste.addAll', toAdd.length)}</button>
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
        {result.found.length > 0 && (
          <section aria-labelledby="ct-p-found">
            <h3 id="ct-p-found">{T('paste.g.found')}</h3>
            <ul class="ct-rows ct-paste-rows">
              {result.found.map((f) => (
                <li><span><strong>{f.name}</strong> → {nameOf(f.taxon)} {sci(f.taxon)}</span>
                  {f.close && <span class="ct-muted">{T('paste.close', { name: f.close })}</span>}
                  {warnings(f.taxon)}</li>
              ))}
            </ul>
          </section>
        )}
        {result.choose.length > 0 && (
          <section aria-labelledby="ct-p-choose">
            <h3 id="ct-p-choose">{T('paste.g.choose')}</h3>
            <p class="ct-muted">{T('paste.chooseHint')}</p>
            <ul class="ct-rows ct-paste-rows">
              {result.choose.map((c) => (
                <li><strong>{c.name}</strong>
                  <ul class="ct-plain">
                    {c.taxa.map((t) => {
                      const shown = c.climate ? { ...t, from: c.climate } : t;
                      return members.includes(t.id)
                        ? <li class="ct-muted">{nameOf(t)} {sci(t)} · {T('inConsortium')}</li>
                        : (
                          <li><label class="ct-check"><input type="checkbox" checked={ticked.includes(t.id)} onChange={() => toggle(t.id)} /> {nameOf(t)} {sci(t)}
                            {c.climate && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(c.climate) })}</span>}</label>
                            {warnings(shown)}</li>
                        );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.other.length > 0 && (
          <section aria-labelledby="ct-p-other">
            <h3 id="ct-p-other">{T('otherLists')}</h3>
            <ul class="ct-rows ct-paste-rows">
              {result.other.map((o) => {
                const guest = { ...o.taxon, from: o.climate };
                return (
                  <li class={asks(flagsOfPlant(guest)) ? 'flagged' : ''}>
                    <span><strong>{o.name}</strong> → {nameOf(o.taxon)} {sci(o.taxon)}</span>
                    <span id={`ct-p-o-${o.taxon.id}`}>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate) })}</span>
                    {warnings(guest)}
                    <button type="button" class="button button-secondary" aria-describedby={`ct-p-o-${o.taxon.id}`}
                      onClick={() => (asks(flagsOfPlant(guest)) ? setAsking({ t: guest, from: o.climate }) : addGuest(o.taxon, o.climate))}>{T('addAnyway')}</button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {result.already.length > 0 && (
          <section aria-labelledby="ct-p-already">
            <h3 id="ct-p-already">{T('paste.g.already')}</h3>
            <ul class="ct-rows ct-paste-rows">
              {result.already.map((a) => (
                <li><span><strong>{a.name}</strong> → {nameOf(a.taxon)} {sci(a.taxon)}</span>
                  {guests[a.taxon.id] && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(guests[a.taxon.id]!) })}</span>}</li>
              ))}
            </ul>
          </section>
        )}
        {result.duplicate.length > 0 && (
          <section aria-labelledby="ct-p-dup">
            <h3 id="ct-p-dup">{T('paste.g.duplicate')}</h3>
            <ul class="ct-rows ct-paste-rows">
              {result.duplicate.map((d) => <li><span><strong>{d.name}</strong> → {nameOf(d.taxon)} {sci(d.taxon)}</span></li>)}
            </ul>
          </section>
        )}
        {result.none.length > 0 && (
          <section aria-labelledby="ct-p-none">
            <h3 id="ct-p-none">{T('paste.g.none')}</h3>
            <ul class="ct-rows ct-paste-rows">{result.none.map((x) => <li><strong>{x.name}</strong></li>)}</ul>
            <p class="ct-muted">{T('paste.noneText')}</p>
          </section>
        )}
      </div>
      {asking && (
        <Ask
          title={T('add.ask')}
          lines={flagLines(asking.t, flagsOfPlant(asking.t), scene).filter((l) => l.asks).map((l) => l.text)}
          yes={T('addAnyway')}
          onYes={() => { const { t, from } = asking; setAsking(null); addGuest(t, from); }}
          onCancel={() => setAsking(null)}
        />
      )}
    </Frame>
  );
}
