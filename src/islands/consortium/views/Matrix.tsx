/** @jsxImportSource preact */
// View slot of stream S2 (App.tsx renders it once the plant list is ready): the strata × phases
// matrix and every other S2 view. This module routes the view switch itself from store.view, so
// App.tsx needs no slot per view:
// - four tabs (role=tablist, roving tabindex, arrow keys): "Layers × stages", "Side view", "Jobs",
//   "All plants"; each sets store.view and shows its tabpanel (the inactive ones are hidden and empty);
// - 'matrix' (and 'start' once there are members): the desktop table below, or PhoneMatrix.tsx under
//   the phone breakpoint (StageStepper.tsx `phone`), never both;
// - 'side': SideView.tsx; 'jobs': Jobs.tsx; 'list': PlantList.tsx.
// Nothing renders before a climate is chosen, nor while store.view is 'start' with no member (Start,
// stream S4, fills the page then; its Suggest and "Start empty" set store.view to 'matrix').
//
// The desktop matrix (mockup 02; owner row 2026-11-10 "Strata × succession matrix"; coordinator row
// "v2 mockup choices" 2026-11-11) is an accessible table: a caption holding the fill meter, four row
// headers (layer, its light need, its share of cover as text: layer is light, not height), seven
// column headers with plain time words first and the phase name under them, grouped by Placenta /
// Secondary / Climax. One plant fills a cell. Plants sit on fixed tracks so a plant reads as one bar;
// its start piece is a button whose name holds its layer and phase words (one Tab stop per plant), the
// continuing pieces are text. A free cell says how many plants fit, with "+ Add"; an empty cell says
// why: "No plant in the list for this cell yet" (data gap) or "No plant fits your site here" with the
// counted reasons and "Show them anyway" (Add with every plant of the cell, flagged); neighbouring
// empty cells of one kind merge (colspan + headers). Above MAX_TRACKS tracks a row shows counts, the
// first chips (the plants starting in the cell first) and "+ N more", which opens the plant list.
import type { ComponentType } from 'preact';
import { useEffect } from 'preact/hooks';
import type { Matrix as MatrixData, MatrixCell, PhaseOrd, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { guestOf, strata } from '../../../lib/consortium/index.ts';
import { climate, marksFailed, matrix, memberTaxa, members, missingMembers, view, type View } from '../store.ts';
import { P, T } from '../strings.ts';
import { COLLAPSED_CHIPS, MAX_TRACKS, PHASE_ORDS, SHARE_AIM, cellOrder, rowPieces, spanOf, spans, tracksOf } from './tracks.ts';
import { Explain, Marks, byName, cellName, openAdd, openDetails, plantLabel } from './StageBar.tsx';
import { layerName, listName, listOf, nameOf, phasePlain, phaseTerm } from './kit/names.ts';
import { AddMore, CellReason, EmptyNotice, FillMeter, FreeCell, GlyphKey } from './matrix-parts.tsx';
import { phone } from './StageStepper.tsx';
import { PhoneMatrix } from './PhoneMatrix.tsx';
import { later, prefetchLater } from './lazy.tsx';

// The other three views load after the matrix (views/lazy.tsx).
const { View: SideView } = later(() => import('./later.ts').then((m) => m.SideView));
const { View: Jobs } = later(() => import('./later.ts').then((m) => m.Jobs));
const { View: PlantList } = later(() => import('./later.ts').then((m) => m.PlantList));

type Tab = Exclude<View, 'start'>;
const TABS: readonly Tab[] = ['matrix', 'side', 'jobs', 'list'];

function Views() {
  const c = climate.value, m = matrix.value;
  if (!c || !m) return null;
  if (view.value === 'start' && members.value.length === 0) return null;
  const active: Tab = view.value === 'start' ? 'matrix' : view.value;
  const onKey = (e: KeyboardEvent) => {
    const at = TABS.indexOf(active);
    const next = e.key === 'ArrowRight' ? (at + 1) % 4 : e.key === 'ArrowLeft' ? (at + 3) % 4 : e.key === 'Home' ? 0 : e.key === 'End' ? 3 : -1;
    if (next < 0) return;
    e.preventDefault();
    view.value = TABS[next];
    requestAnimationFrame(() => document.getElementById(`ct-tab-${TABS[next]}`)?.focus());
  };
  return (
    <section class="ct-views">
      <div class="ct-tabs" role="tablist" aria-label={T('matrix.views')} onKeyDown={onKey}>
        {TABS.map((tab) => (
          <button key={tab} type="button" role="tab" class="ct-tab" id={`ct-tab-${tab}`} aria-controls={`ct-panel-${tab}`} aria-selected={tab === active} tabIndex={tab === active ? 0 : -1} onClick={() => { view.value = tab; }}>
            {T(`matrix.tab.${tab}`)}
          </button>
        ))}
      </div>
      <div class="ct-viewbar"><button type="button" class="button button-secondary ct-btn-sm" onClick={() => openAdd()}>{T('matrix.addPlants')}</button></div>
      <Notices />
      <FirstPaint />
      {TABS.map((tab) => (
        <div key={tab} role="tabpanel" class="ct-tabpanel" id={`ct-panel-${tab}`} aria-labelledby={`ct-tab-${tab}`} hidden={tab !== active}>
          {tab === active && (tab === 'matrix' ? (phone.value ? <PhoneMatrix /> : <MatrixTable m={m} />) : tab === 'side' ? <SideView /> : tab === 'jobs' ? <Jobs /> : <PlantList />)}
        </div>
      ))}
    </section>
  );
}

// Members left out of the matrix are said, never dropped silently (store.missingMembers; a member
// with no placement yet is listed under "No layer yet").
function Notices() {
  const { loading, unlisted } = missingMembers.value, c = climate.value!;
  const unplaced = memberTaxa.value.filter((t) => !spanOf(t) || !t.stratum);
  const noMarks = marksFailed.value;
  if (!loading.length && !unlisted.length && !unplaced.length && !noMarks) return null;
  return (
    <div class="ct-notes" role="status">
      {noMarks && <p class="ct-notice" data-marks-unavailable>{T('marks.unavailable')} <button type="button" class="button button-secondary ct-small" onClick={() => globalThis.location.reload()}>{T('load.reload')}</button></p>}
      {loading.length > 0 && <p>{P('matrix.loading', loading.length)}</p>}
      {unlisted.length > 0 && <p>{P('matrix.unlisted', unlisted.length, { list: listName(c) })}</p>}
      {unplaced.length > 0 && <p><strong>{T('matrix.noLayer')}.</strong> {T('matrix.noLayerBody', { names: listOf(unplaced.map(nameOf)) })}</p>}
    </div>
  );
}

// Plain words with their numbers kept unbroken ("Months 3–12" never breaks inside "3–12").
const keepNumbers = (text: string) => text.split(/(\S*\d\S*)/).map((part, i) => (i % 2 ? <span class="ct-nw" key={i}>{part}</span> : part));

const GROUPS: readonly { key: string; span: number }[] = [{ key: 'placenta', span: 3 }, { key: 'secondary', span: 3 }, { key: 'climax', span: 1 }];

// performance.mark('ct:matrix') once per page, when the consortium is first on screen, whichever view
// shows it (the matrix, the side view, Jobs or the list): S4's timing script waits for it. Rendered
// inside the views, so its effect runs after the browser painted them.
let marked = false;
function FirstPaint() {
  useEffect(() => {
    if (marked || typeof performance === 'undefined') return;
    marked = true;
    performance.mark('ct:matrix');
    prefetchLater();
  }, []);
  return null;
}

function MatrixTable({ m }: { m: MatrixData }) {
  const taxa = memberTaxa.value, empty = taxa.length === 0;
  return (
    <div class="ct-desk">
      {empty && <EmptyNotice />}
      <table class="ct-mx">
        <caption>
          <span class="ct-cap-fill"><FillMeter m={m} /></span>
          <span class="ct-cap-line">{T('matrix.caption')} <Explain kind="stage" /></span>
        </caption>
        <colgroup><col class="ct-rh" /></colgroup>
        {GROUPS.map((g) => <colgroup key={g.key} span={g.span} />)}
        <thead>
          <tr class="ct-groups">
            <th class="ct-corner" scope="col" rowSpan={2}><span class="visually-hidden">{T('matrix.layer')}</span><Explain kind="layer" /></th>
            {GROUPS.map((g) => <th key={g.key} scope="colgroup" colSpan={g.span}>{T(`phase.group.${g.key}`)}</th>)}
          </tr>
          <tr>
            {PHASE_ORDS.map((p) => (
              <th key={p} scope="col" id={`ct-col-${p}`} class="ct-col">
                <span class="ct-ph-plain">{keepNumbers(phasePlain(p))}</span>
                <span class="ct-ph-term">{phaseTerm(p)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((row) => <Row key={row.stratum} stratum={row.stratum} cells={row.cells} taxa={taxa} empty={empty} />)}
        </tbody>
      </table>
      <GlyphKey>
        <span class="ct-key"><span class="ct-key-sw filled" aria-hidden="true" />{T('matrix.key.filled')}</span>
        <span class="ct-key"><span class="ct-key-sw free" aria-hidden="true" />{T('matrix.key.free')}</span>
        <span class="ct-key"><span class="ct-key-sw cannot" aria-hidden="true">–</span>{T('matrix.key.cannot')}</span>
      </GlyphKey>
    </div>
  );
}

function Row({ stratum, cells, taxa, empty }: { stratum: Stratum; cells: MatrixCell[]; taxa: Taxon[]; empty: boolean }) {
  const s = strata.indexOf(stratum);
  const tracks = tracksOf(taxa, stratum, byName);
  const collapsed = tracks.length > MAX_TRACKS;
  return (
    <tr data-stratum-row={stratum}>
      <th scope="row" id={`ct-row-${s}`}>
        <span class="ct-rh-name">{layerName(stratum)}</span>
        <span class="ct-rh-needs">{T(`stratum.${stratum}.needs`)}</span>
        <span class="ct-lshare">{T('matrix.share', { p: SHARE_AIM[stratum] })}</span>
      </th>
      {rowPieces(cells).map((piece) => {
        if (piece.kind === 'run') {
          // Its headers name the row and every column it covers; the cell's words are its content.
          const cols = PHASE_ORDS.filter((p) => p >= piece.from && p <= piece.to).map((p) => `ct-col-${p}`).join(' ');
          return (
            <td key={piece.from} class="cannot" colSpan={piece.to - piece.from + 1} headers={`ct-row-${s} ${cols}`}>
              <div class="ct-cell-msg"><CellReason stratum={stratum} from={piece.from} to={piece.to} kind={piece.empty} /></div>
            </td>
          );
        }
        const cell = piece.cell, p = cell.phase;
        if (!cell.members.length) {
          return (
            <td key={p} class={empty ? 'potential' : 'free'}>
              <div class="ct-cell-msg">{empty ? <span>{P('matrix.inList', cell.fitting)}</span> : <FreeCell stratum={stratum} phase={p} fitting={cell.fitting} />}</div>
            </td>
          );
        }
        if (collapsed) {
          const here = cellOrder(taxa.filter((t) => cell.members.includes(t.id)), p, byName);
          return (
            <td key={p}>
              <div class="ct-cell-count">{P('matrix.plants', here.length)}</div>
              {here.slice(0, COLLAPSED_CHIPS).map((t) => <div class="ct-lane" key={t.id}><Chip taxon={t} phase={p} compact /></div>)}
              {here.length > COLLAPSED_CHIPS && (
                <div class="ct-more-cell">
                  <button type="button" class="ct-link-button" aria-label={T('matrix.moreIn', { n: here.length - COLLAPSED_CHIPS, cell: cellName(stratum, p) })} onClick={() => { view.value = 'list'; }}>
                    {T('matrix.more', { n: here.length - COLLAPSED_CHIPS })}
                  </button>
                </div>
              )}
              <AddMore stratum={stratum} phase={p} />
            </td>
          );
        }
        return (
          <td key={p}>
            {tracks.map((track, i) => {
              const t = track.find((x) => spans(x, p));
              return <div class="ct-lane" key={i}>{t && <Chip taxon={t} phase={p} />}</div>;
            })}
            <AddMore stratum={stratum} phase={p} />
          </td>
        );
      })}
    </tr>
  );
}

// One piece of a plant's bar. Its start piece is the button (in a collapsed row too, where the cell
// lists its starters first: cellOrder); the others are text with a hidden "continues:".
function Chip({ taxon: t, phase, compact = false }: { taxon: Taxon; phase: PhaseOrd; compact?: boolean }) {
  const span = spanOf(t)!, start = phase === span.from, end = phase === span.to;
  const cls = ['ct-pchip'];
  if (!compact) { if (!end) cls.push('cont-r'); if (!start) cls.push('cont-l'); }
  if (guestOf(t)) cls.push('is-guest');
  if (start) {
    return (
      <button type="button" class={cls.join(' ')} data-plant-id={t.id} aria-label={plantLabel(t)} title={`${nameOf(t)} — ${t.canonical_name}`} onClick={() => openDetails(t.id)}>
        <span class="ct-nm"><span>{nameOf(t)}</span></span>
        <span class="ct-sc2"><span class="ct-sc">{t.canonical_name}</span><Marks taxon={t} tight /></span>
      </button>
    );
  }
  cls.push('seg-mid');
  return <span class={cls.join(' ')} data-plant-id={t.id}><span class="ct-nm"><span><span class="visually-hidden">{T('matrix.continues')}: </span>{nameOf(t)}</span></span></span>;
}

export const Matrix: ComponentType | null = Views;
