/** @jsxImportSource preact */
// Paste a list (stream S3; mockup 01 `paste`, design check A8): one name per line (or a spreadsheet
// column), matched as it is typed against this climate's list, then the other climates' lists
// (views/paste.ts on S1's fold). Each line is found, to choose (a genus or a shared name), found in
// another climate's list with "Add anyway" (a guest, labelled "From the {climate} list", A9), already
// in, or not found. "Add the N found" adds the found and ticked plants and does not ask (coordinator
// row "v2 mockup choices"); each added plant is kept. Loaded on first use (Details.tsx).
import { useEffect, useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { ClimateZone, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { pasteNames, readPaste } from './paste.ts';
import { SheetFrame, addMembers, closeSheet, nameOf, zoneName } from './Details.tsx';

export default function Paste() {
  const pool = store.pool.value;
  const climate = store.climate.value;
  const members = store.members.value;
  const guests = store.guests.value;
  const [text, setText] = useState('');
  const [ticked, setTicked] = useState<PlantId[]>([]);
  const zones = store.source.value?.info().climates ?? [];
  const others = zones.filter((z) => z !== climate);
  useEffect(() => { for (const z of others) void store.loadPool(z); }, [others.join()]);

  const lists = others.flatMap((z) => { const l = store.pools.value[z]; return l ? [[z, l] as [ClimateZone, Taxon[]]] : []; });
  const result = useMemo(() => (pool ? readPaste(pasteNames(text), { here: pool, others: lists, members }) : null), [text, pool, members, store.pools.value]);
  if (!pool || !climate || !result) return null;
  const climateOf = new Map<PlantId, ClimateZone>();
  for (const c of result.choose) if (c.climate) for (const t of c.taxa) climateOf.set(t.id, c.climate);
  const toAdd = [...result.found.map((f) => f.taxon.id), ...ticked.filter((id) => result.choose.some((c) => c.taxa.some((t) => t.id === id)))];
  const addAll = () => {
    const from: Partial<Record<PlantId, ClimateZone>> = {};
    for (const id of toAdd) { const z = climateOf.get(id); if (z) from[id] = z; }
    closeSheet();
    addMembers(toAdd, from);
  };
  const toggle = (id: PlantId) => setTicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sci = (t: Taxon) => <i class="ct-sci">{t.canonical_name}</i>;
  const empty = !result.found.length && !result.choose.length && !result.other.length && !result.already.length && !result.none.length;

  return (
    <SheetFrame titleId="ct-paste-title" class="ct-paste" head={<span class="ct-muted">{T('paste.title')}</span>}>
      <div>
        <h2 id="ct-paste-title" tabIndex={-1} data-autofocus>{T('paste.title')}</h2>
        <p class="ct-muted">{T('paste.lede')}</p>
      </div>
      <div class="ct-field">
        <label for="ct-paste-text">{T('paste.label')}</label>
        <textarea id="ct-paste-text" class="ct-paste-text" rows={6} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
      </div>
      <div aria-live="polite">
        {empty && <p class="ct-muted">{T('paste.empty')}</p>}
        {result.found.length > 0 && (
          <section aria-labelledby="ct-p-found">
            <h3 id="ct-p-found">{T('paste.g.found')}</h3>
            <ul class="ct-rows ct-paste-rows">
              {result.found.map((f) => (
                <li><span><strong>{f.name}</strong> → {nameOf(f.taxon)} {sci(f.taxon)}</span>
                  {f.close && <span class="ct-muted">{T('paste.close', { name: f.close })}</span>}</li>
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
                    {c.taxa.filter((t) => !members.includes(t.id)).map((t) => (
                      <li><label class="ct-check"><input type="checkbox" checked={ticked.includes(t.id)} onChange={() => toggle(t.id)} /> {nameOf(t)} {sci(t)}
                        {c.climate && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(c.climate) })}</span>}</label></li>
                    ))}
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
              {result.other.map((o) => (
                <li>
                  <span><strong>{o.name}</strong> → {nameOf(o.taxon)} {sci(o.taxon)}</span>
                  <span id={`ct-p-o-${o.taxon.id}`}>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate) })}</span>
                  <button type="button" class="button button-secondary" aria-describedby={`ct-p-o-${o.taxon.id}`} onClick={() => addMembers([o.taxon.id], { [o.taxon.id]: o.climate })}>{T('addAnyway')}</button>
                </li>
              ))}
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
        {result.none.length > 0 && (
          <section aria-labelledby="ct-p-none">
            <h3 id="ct-p-none">{T('paste.g.none')}</h3>
            <ul class="ct-rows ct-paste-rows">{result.none.map((x) => <li><strong>{x.name}</strong></li>)}</ul>
            <p class="ct-muted">{T('paste.noneText')}</p>
          </section>
        )}
      </div>
      <div class="ct-add-bar">
        <span>{P('paste.toAdd', toAdd.length)}</span>
        <button type="button" class="button button-primary" disabled={!toAdd.length} onClick={addAll}>{P('paste.addAll', toAdd.length)}</button>
      </div>
    </SheetFrame>
  );
}
