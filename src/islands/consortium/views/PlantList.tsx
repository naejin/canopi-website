/** @jsxImportSource preact */
// All plants (mockup 07; coordinator row "v2 mockup choices" 2026-11-11: each plant listed once,
// under its start cell), for consortiums of 6 to 200 plants. Each plant is listed once, under the cell
// where it starts (its layer and first stage); its stage bar shows every stage it spans. A small
// "Where plants start" grid counts the plants per start cell and jumps to each group. Search (folded,
// word prefix: design check A6), "With a warning" and "Kept" narrow the list; the count of plants
// shown is announced. Each group is a table named by its heading; each row is named by the plant's
// name and scientific name, and holds its marks, stage bar, jobs, details and Swap (S3).
import { useState } from 'preact/hooks';
import { jobsOf, strata } from '../../../lib/consortium/index.ts';
import { kept, memberTaxa } from '../store.ts';
import { P, T } from '../strings.ts';
import { PHASE_ORDS, listGroups, matchesQuery, startCounts } from './tracks.ts';
import { Marks, StageBar, layerName, nameOf, openDetails, openSwap, phasePlain, phaseTerm, warnings } from './StageBar.tsx';

const groupId = (s: string | null, p: number | null) => (s ? `ct-g-${s}-${p}` : 'ct-g-none');

export function PlantList() {
  const [query, setQuery] = useState('');
  const [warnedOnly, setWarnedOnly] = useState(false);
  const [keptOnly, setKeptOnly] = useState(false);
  const taxa = memberTaxa.value, w = warnings.value, keep = new Set(kept.value);
  const all = listGroups(taxa, nameOf);
  const counts = startCounts(all);
  const warnedN = taxa.filter((t) => (w.get(t.id) ?? 0) > 0).length;
  const groups = all.map((g) => ({
    ...g,
    plants: g.plants.filter((t) => (!warnedOnly || (w.get(t.id) ?? 0) > 0) && (!keptOnly || keep.has(t.id)) && matchesQuery([nameOf(t), t.canonical_name, ...Object.values(t.names).filter((n): n is string => !!n)], query)),
  })).filter((g) => g.plants.length);
  const shown = groups.reduce((n, g) => n + g.plants.length, 0);
  return (
    <section class="ct-list" aria-labelledby="ct-list-h">
      <h2 id="ct-list-h">{T('list.title')}</h2>
      <p class="ct-dim ct-list-lede">{T('list.lede')}</p>
      <table class="ct-mini ct-jump">
        <caption>{T('list.jump')}</caption>
        <thead>
          <tr>
            <th scope="col" class="ct-mini-corner"><span class="visually-hidden">{T('matrix.layer')}</span></th>
            {PHASE_ORDS.map((p) => <th key={p} scope="col" abbr={phasePlain(p)}><span aria-hidden="true">{p + 1}</span><span class="visually-hidden">{phasePlain(p)}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {strata.map((st, s) => (
            <tr key={st}>
              <th scope="row">{layerName(st)}</th>
              {PHASE_ORDS.map((p) => {
                const n = counts.get(s * 7 + p);
                return n
                  ? <td key={p} class="filled"><a href={`#${groupId(st, p)}`} aria-label={`${T('list.group', { layer: layerName(st), stage: phasePlain(p) })}: ${P('list.count', n)}`}>{n}</a></td>
                  : <td key={p} class="none"><span /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div class="ct-list-tools">
        <label class="ct-lsearch">
          <span class="visually-hidden">{T('list.search')}</span>
          <input type="search" placeholder={T('list.search')} value={query} onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <span class="ct-check"><input type="checkbox" id="ct-list-warned" checked={warnedOnly} onChange={(e) => setWarnedOnly((e.currentTarget as HTMLInputElement).checked)} /><label for="ct-list-warned">{T('list.warned')}</label> <span class="ct-dim" aria-hidden="true">{warnedN}</span></span>
        <span class="ct-check"><input type="checkbox" id="ct-list-kept" checked={keptOnly} onChange={(e) => setKeptOnly((e.currentTarget as HTMLInputElement).checked)} /><label for="ct-list-kept">{T('list.keptOnly')}</label> <span class="ct-dim" aria-hidden="true">{keep.size}</span></span>
      </div>
      <p class="ct-dim ct-list-shown" role="status">{shown ? P('list.shown', shown) : T('list.none')}</p>
      {groups.map((g) => {
        const id = groupId(g.stratum, g.phase);
        return (
          <div class="ct-lgroup" id={id} key={id}>
            <h3 id={`${id}-h`}>
              {g.stratum && g.phase !== null ? T('list.group', { layer: layerName(g.stratum), stage: phasePlain(g.phase) }) : T('matrix.noLayer')}
              <span class="ct-dim">{g.phase !== null ? `${phaseTerm(g.phase)} · ` : ''}{P('list.count', g.plants.length)}</span>
            </h3>
            <table class="ct-lrows" role="table" aria-labelledby={`${id}-h`}>
              <tbody role="rowgroup">
                {g.plants.map((t) => (
                  <tr role="row" key={t.id} data-plant-id={t.id} aria-label={`${nameOf(t)}, ${t.canonical_name}`}>
                    <td role="cell" class="ct-lname">
                      <button type="button" class="ct-lname-btn" aria-haspopup="dialog" onClick={() => openDetails(t.id)}>{nameOf(t)}</button>{' '}
                      <span class="ct-sc">{t.canonical_name}</span> <Marks taxon={t} />
                    </td>
                    <td role="cell" class="ct-lstage"><StageBar taxon={t} /></td>
                    <td role="cell" class="ct-ljobs">{jobsOf(t).map((j) => T(`job.${j}`)).join(' · ')}</td>
                    <td role="cell" class="ct-lact"><button type="button" class="ct-quiet" aria-label={T('list.swapName', { name: nameOf(t) })} onClick={() => openSwap(t.id)}>{T('list.swap')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
