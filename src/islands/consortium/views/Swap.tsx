/** @jsxImportSource preact */
// Swap (stream S3; mockup 05 `swap`): the plants of the climate's list that could take a member's
// place (core suggest.ts `alternatives`: same layer first, then what they leave empty and also fill,
// the jobs they share). Each says what it does to the matrix: "Also fills: Years 25–60." or "Leaves
// empty: Months 3–12." Warnings are shown on the row and never asked about; only a site misfit or a
// serious (high) conflict asks "Swap anyway?" (owner row 2026-10-28, coordinator row "v2 mockup
// choices" 2026-11-11), and those plants come last. Loaded on first use (views/Sheets.tsx).
import { useMemo, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { P, T } from '../strings.ts';
import type { CellRef, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { alternatives, asks } from '../../../lib/consortium/index.ts';
import { closeSheet, openSheet, swapMember, taxonOf } from '../store.ts';
import { Ask, BACK, Bar, NotChecked, SheetWaiting, WARN, shared, type Frame } from './kit/sheet.tsx';
import { listOf, nameOf, phasePlain, spanWords } from './kit/names.ts';
const { flagLines } = shared; // first-run modules (kit/sheet.tsx shared)

const SHOWN = { fit: 7, asking: 2 };

export default function Swap({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  const pool = store.pool.value;
  const members = store.memberTaxa.value;
  const ctx = store.flagContext.value;
  const scene = store.flagScene.value;
  const removed = store.removed.value;
  const [all, setAll] = useState(false);
  const [asking, setAsking] = useState<Taxon | null>(null);
  const fitting = store.fitPool.value;
  const alts = useMemo(() => (fitting ? alternatives(id, members, fitting, { ...ctx, removed }) : []), [id, fitting, members, ctx, removed]);
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)
  if (!t) return null;
  const byId = new Map(pool.map((x) => [x.id, x]));
  const fit = alts.filter((a) => !asks(a.flags)), ask = alts.filter((a) => asks(a.flags));
  const shown = all ? alts : [...fit.slice(0, SHOWN.fit), ...ask.slice(0, SHOWN.asking)];
  const cellWords = (cells: readonly CellRef[]) => listOf(cells.map(([s, p]) => (s === t.stratum?.value ? phasePlain(p) : `${T(`stratum.${s}`)} · ${phasePlain(p)}`)));
  const swap = (x: Taxon) => { closeSheet(); swapMember(id, x.id); };

  return (
    <Frame titleId="ct-sw-title" class="ct-swap" head={
      <button type="button" class="button-quiet ct-back" onClick={() => openSheet('details', id)}>{BACK}{T('swap.back', { name: nameOf(t) })}</button>
    }>
      <div>
        <h2 id="ct-sw-title" tabIndex={-1} data-autofocus>{T('swap.title', { name: nameOf(t) })}</h2>
        <p class="ct-muted">{T('swap.lede')}</p>
        <NotChecked ctx={store.flagContext.value} />
      </div>
      {shown.length ? (
        <ul class="ct-rows">
          {shown.map((a) => {
            const x = byId.get(a.id);
            if (!x) return null;
            const lines = flagLines(x, a.flags, scene);
            const asksFirst = asks(a.flags);
            return (
              <li class={asksFirst ? 'flagged' : ''}>
                <div class="ct-row-main">
                  <strong>{nameOf(x)}</strong> <i class="ct-sci">{x.canonical_name}</i>
                  <Bar taxon={x} />
                </div>
                <button type="button" class="button button-secondary" aria-label={T('swap.for', { name: nameOf(x) })} onClick={() => (asksFirst ? setAsking(x) : swap(x))}>{T('details.swap')}</button>
                <div class="ct-row-why">
                  <span>{spanWords(x)}{a.sharedJobs.length > 0 && ` · ${T('swap.shares', { jobs: listOf(a.sharedJobs.map((j) => T(`job.${j}`))) })}`}</span>
                  {a.alsoFills.length > 0 && <strong class="ct-line">{T('swap.fills', { list: cellWords(a.alsoFills) })}</strong>}
                  {a.leavesEmpty.length > 0 && <strong class="ct-line">{T('swap.leaves', { list: cellWords(a.leavesEmpty) })}</strong>}
                  {lines.length > 0 && <span class="ct-line ct-flag-line">{WARN} {lines.map((l) => l.text).join(' · ')}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p class="ct-muted">{T('swap.none')}</p>}
      {!all && alts.length > shown.length && (
        <p><button type="button" class="button button-secondary" onClick={() => setAll(true)}>{P('add.showAll', alts.length)}</button></p>
      )}
      {asking && (
        <Ask
          title={T('swap.ask')}
          lines={flagLines(asking, alts.find((a) => a.id === asking.id)?.flags ?? [], scene).filter((l) => l.asks).map((l) => l.text)}
          yes={T('swap.yes')}
          onYes={() => swap(asking)}
          onCancel={() => setAsking(null)}
        />
      )}
    </Frame>
  );
}
