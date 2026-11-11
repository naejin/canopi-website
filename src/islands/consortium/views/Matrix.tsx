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
// first chips and "+ N more", which opens the plant list.
import type { ComponentType } from 'preact';
import type { Matrix as MatrixData, MatrixCell, PhaseOrd, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { ROOM_LIMIT_M, strata } from '../../../lib/consortium/index.ts';
import { climate, matrix, memberTaxa, members, missingMembers, pool, site, suggestMembers, view, type View } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { COLLAPSED_CHIPS, MAX_TRACKS, PHASE_ORDS, SHARE_AIM, fillPercent, reasonParts, rowPieces, runReasons, spanOf, spans, tracksOf } from './tracks.ts';
import { Explain, Marks, PinIcon, SproutIcon, WarnIcon, cellName, layerName, listName, nameOf, openAdd, openDetails, phasePlain, phaseTerm, plantLabel } from './StageBar.tsx';
import { phone } from './StageStepper.tsx';
import { PhoneMatrix } from './PhoneMatrix.tsx';
import { SideView } from './SideView.tsx';
import { Jobs } from './Jobs.tsx';
import { PlantList } from './PlantList.tsx';

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
      <div class="ct-viewbar"><button type="button" class="button button-secondary ct-btn-sm" onClick={() => openAdd({ cell: null, anyway: false, job: null })}>{T('matrix.addPlants')}</button></div>
      <Notices />
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
  if (!loading.length && !unlisted.length && !unplaced.length) return null;
  return (
    <div class="ct-notes" role="status">
      {loading.length > 0 && <p>{P('matrix.loading', loading.length)}</p>}
      {unlisted.length > 0 && <p>{P('matrix.unlisted', unlisted.length, { list: listName(c) })}</p>}
      {unplaced.length > 0 && <p><strong>{T('matrix.noLayer')}.</strong> {T('matrix.noLayerBody', { names: list(unplaced.map(nameOf)) })}</p>}
    </div>
  );
}

const list = (items: string[]) => new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items);
const num = (n: number) => new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 1 }).format(n);

// "24 of 27 cells that can be filled are filled · 3 free · 1 cannot be filled here", with its bar.
export function FillMeter({ m }: { m: MatrixData }) {
  return (
    <span class="ct-fill">
      <span class="ct-fill-bar" aria-hidden="true"><i style={{ width: `${fillPercent(m.filled, m.total)}%` }} /></span>
      <strong>{T('matrix.fill', { f: m.filled, t: m.total })}</strong>
      <span class="ct-dim">{P('matrix.free', m.free)} · {P('matrix.cannot', m.cannot)}</span>
    </span>
  );
}

export function EmptyNotice({ phone: small = false }: { phone?: boolean }) {
  return (
    <div class={`ct-mnotice ct-mx-empty${small ? ' is-phone' : ''}`}>
      <div><strong>{T('matrix.empty')}</strong><p>{T('matrix.emptyBody')}</p></div>
      <div class="ct-row">
        <button type="button" class="button button-primary" onClick={() => { if (suggestMembers()) view.value = 'matrix'; }}>{T('matrix.suggest')}</button>
        {!small && <button type="button" class="button button-secondary" onClick={() => openAdd({ cell: null, anyway: false, job: null })}>{T('matrix.addPlant')}</button>}
      </div>
    </div>
  );
}

export function FreeCell({ stratum, phase, fitting }: { stratum: Stratum; phase: PhaseOrd; fitting: number }) {
  return (
    <>
      <span>{P('matrix.freeCell', fitting)}</span>
      <button type="button" class="ct-add-cell" aria-label={T('matrix.addTo', { cell: cellName(stratum, phase) })} onClick={() => openAdd({ cell: [stratum, phase], anyway: false, job: null })}>+ {T('matrix.add')}</button>
    </>
  );
}

// Why a cell, or a run of neighbouring cells, cannot be filled: its heading and its sentence.
export function reasonText(stratum: Stratum, from: number, to: number, kind: 'gap' | 'misfit'): { head: string; body: string } {
  const c = climate.value!;
  if (kind === 'gap') return { head: T('matrix.gap'), body: T(from === to ? 'matrix.gapBody' : 'matrix.gapBodyRun', { list: listName(c) }) };
  const s = site.value, r = runReasons(pool.value ?? [], memberTaxa.value, s, stratum, from, to);
  const limit = ROOM_LIMIT_M[s.room];
  const parts = reasonParts(r.reasons, s).map(({ word, n }) => P(`matrix.why.${word}`, n, { m: Number.isFinite(limit) ? num(limit) : '' }));
  const why = list(parts) + (r.both ? ` ${T('matrix.both')}` : '');
  const body = from === to ? P('matrix.misfitBody', r.n, { why }) : P('matrix.misfitBodyRun', r.n, { why, a: phasePlain(from), b: phasePlain(to) });
  return { head: T('matrix.misfit'), body };
}

export function CellReason({ stratum, from, to, kind }: { stratum: Stratum; from: number; to: number; kind: 'gap' | 'misfit' }) {
  const { head, body } = reasonText(stratum, from, to, kind);
  return (
    <>
      <strong><span class="ct-blocked" aria-hidden="true">–</span> {head}</strong>
      <span>{body}</span>
      {kind === 'misfit' && (
        <span><button type="button" class="ct-link-button" aria-label={T('matrix.showAnywayIn', { cell: cellName(stratum, from, to) })} onClick={() => openAdd({ cell: [stratum, from as PhaseOrd], anyway: true, job: null })}>{T('matrix.showAnyway')}</button></span>
      )}
    </>
  );
}

// The legend under the matrix: cell states and the glyphs (never colour alone).
export function GlyphKey() {
  return (
    <p class="ct-legend">
      <span class="ct-key"><WarnIcon />{T('matrix.key.warning')}</span>
      <span class="ct-key"><PinIcon />{T('matrix.kept')}</span>
      <span class="ct-key"><SproutIcon />{T('matrix.mainCrop')}</span>
    </p>
  );
}

// Plain words with their numbers kept unbroken ("Months 3–12" never breaks inside "3–12").
const keepNumbers = (text: string) => text.split(/(\S*\d\S*)/).map((part, i) => (i % 2 ? <span class="ct-nw" key={i}>{part}</span> : part));

const GROUPS: readonly { key: string; span: number }[] = [{ key: 'placenta', span: 3 }, { key: 'secondary', span: 3 }, { key: 'climax', span: 1 }];

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
        <colgroup><col class="ct-rh" />{PHASE_ORDS.map((p) => <col key={p} />)}</colgroup>
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
      <p class="ct-legend">
        <span class="ct-key"><span class="ct-key-sw filled" aria-hidden="true" />{T('matrix.key.filled')}</span>
        <span class="ct-key"><span class="ct-key-sw free" aria-hidden="true" />{T('matrix.key.free')}</span>
        <span class="ct-key"><span class="ct-key-sw cannot" aria-hidden="true">–</span>{T('matrix.key.cannot')}</span>
        <span class="ct-key"><WarnIcon />{T('matrix.key.warning')}</span>
        <span class="ct-key"><PinIcon />{T('matrix.kept')}</span>
        <span class="ct-key"><SproutIcon />{T('matrix.mainCrop')}</span>
      </p>
    </div>
  );
}

function Row({ stratum, cells, taxa, empty }: { stratum: Stratum; cells: MatrixCell[]; taxa: Taxon[]; empty: boolean }) {
  const s = strata.indexOf(stratum);
  const tracks = tracksOf(taxa, stratum, nameOf);
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
          const { head, body } = reasonText(stratum, piece.from, piece.to, piece.empty);
          const cols = PHASE_ORDS.filter((p) => p >= piece.from && p <= piece.to).map((p) => `ct-col-${p}`).join(' ');
          return (
            <td key={piece.from} class="cannot" colSpan={piece.to - piece.from + 1} headers={`ct-row-${s} ${cols}`} aria-label={`${cellName(stratum, piece.from, piece.to)}: ${head}. ${body}`}>
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
          const here = taxa.filter((t) => cell.members.includes(t.id)).sort((a, b) => spanOf(a)!.from - spanOf(b)!.from || nameOf(a).localeCompare(nameOf(b)));
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
            </td>
          );
        }
        return (
          <td key={p}>
            {tracks.map((track, i) => {
              const t = track.find((x) => spans(x, p));
              return <div class="ct-lane" key={i}>{t && <Chip taxon={t} phase={p} />}</div>;
            })}
          </td>
        );
      })}
    </tr>
  );
}

// One piece of a plant's bar. Its start piece (or every piece of a collapsed row's start cell) is the
// button; the others are text with a hidden "continues:".
function Chip({ taxon: t, phase, compact = false }: { taxon: Taxon; phase: PhaseOrd; compact?: boolean }) {
  const span = spanOf(t)!, start = phase === span.from, end = phase === span.to;
  const cls = ['ct-pchip'];
  if (!compact) { if (!end) cls.push('cont-r'); if (!start) cls.push('cont-l'); }
  if (t.from) cls.push('is-guest');
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
