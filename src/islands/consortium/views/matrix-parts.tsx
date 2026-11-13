/** @jsxImportSource preact */
// The parts of the matrix that the desktop table (Matrix.tsx) and the phone grid (PhoneMatrix.tsx)
// both draw: the fill meter, the empty matrix's notice, a cell's "+ Add" and "+", why a cell cannot be
// filled, and the glyph legend. Their own module, so the two views never import each other (E6
// design check: cycle C3).
import type { ComponentChildren } from 'preact';
import type { Matrix as MatrixData, PhaseOrd, Stratum } from '../../../lib/consortium/index.ts';
import { climate, memberTaxa, pool, site } from '../store.ts';
import { pendingSuggest, requestSuggest } from '../state/suggest-wait.ts';
import { P, T } from '../strings.ts';
import { fillPercent, reasonParts, runReasons } from './tracks.ts';
import { cellName, openAdd } from './StageBar.tsx';
import { listName, listOf, phasePlain } from './kit/names.ts';
import { PinIcon, SproutIcon, WarnIcon } from './kit/icons.tsx';
import { WhyNoSuggest, suggestBlock } from './PoolSlot.tsx';

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

// The empty matrix: its Suggest only when it can act (PoolSlot suggestBlock, the rule Start's
// "Suggest plants" reads, seam review 1), and through the same requestSuggest, so a press while a kept
// guest's list is read waits for it (round 3, 2); otherwise why not, in its place: a borrowed climate needing
// the site's location (hand-off H-S5c-6) or the range checks that did not load, or nothing on the list
// fitting the site (after "Search all plants").
export function EmptyNotice({ phone: small = false }: { phone?: boolean }) {
  const z = climate.value, block = z ? suggestBlock(z) : 'noList';
  return (
    <div class={`ct-mnotice ct-mx-empty${small ? ' is-phone' : ''}`} data-suggest-block={block ?? undefined}>
      <div><strong>{T('matrix.empty')}</strong><p>{T(block === 'nothingFits' ? 'matrix.emptyNoFit' : 'matrix.emptyBody')}</p>{z && block && <WhyNoSuggest zone={z} block={block} />}</div>
      {(!block || !small) && (
        <div class="ct-row">
          {!block && <button type="button" class="button button-primary" aria-busy={pendingSuggest.value ? 'true' : undefined} onClick={requestSuggest}>{T('matrix.suggest')}</button>}
          {!small && <button type="button" class="button button-secondary" onClick={() => openAdd()}>{T('matrix.addPlant')}</button>}
        </div>
      )}
    </div>
  );
}

// A filled cell's own "+" (owner request): opens Add for the cell as a free cell's "+ Add" does; last in
// the cell, so the keyboard reaches the cell's plants first. phone: the stage view's "+ Add" line.
export function AddMore({ stratum, phase, phone: small = false }: { stratum: Stratum; phase: PhaseOrd; phone?: boolean }) {
  return (
    <div class={small ? 'ct-pmore' : 'ct-lane-add'}>
      <button type="button" class={small ? 'ct-add-cell' : 'ct-add-more'} data-add-filled aria-label={T('matrix.addTo', { cell: cellName(stratum, phase) })} onClick={() => openAdd({ cell: { stratum, from: phase, to: phase } })}>
        {small ? `+ ${T('matrix.add')}` : '+'}
      </button>
    </div>
  );
}

export function FreeCell({ stratum, phase, fitting }: { stratum: Stratum; phase: PhaseOrd; fitting: number }) {
  return (
    <>
      <span>{P('matrix.freeCell', fitting)}</span>
      <button type="button" class="ct-add-cell" aria-label={T('matrix.addTo', { cell: cellName(stratum, phase) })} onClick={() => openAdd({ cell: { stratum, from: phase, to: phase } })}>+ {T('matrix.add')}</button>
    </>
  );
}

// Why a cell, or a run of neighbouring cells, cannot be filled: its heading and its sentence.
function reasonText(stratum: Stratum, from: number, to: number, kind: 'gap' | 'misfit'): { head: string; body: string } {
  const c = climate.value!;
  if (kind === 'gap') return { head: T(from === to ? 'matrix.gap' : 'matrix.gapRun'), body: T(from === to ? 'matrix.gapBody' : 'matrix.gapBodyRun', { list: listName(c) }) };
  const s = site.value, r = runReasons(pool.value ?? [], memberTaxa.value, s, stratum, from, to);
  const parts = reasonParts(r.reasons, s).map(({ word, n }) => P(`matrix.why.${word}`, n));
  const why = listOf(parts) + (r.both ? ` ${T('matrix.both')}` : '');
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
        <span><button type="button" class="ct-link-button" aria-label={T('matrix.showAnywayIn', { cell: cellName(stratum, from, to) })} onClick={() => openAdd({ cell: { stratum, from: from as PhaseOrd, to: to as PhaseOrd }, anyway: true })}>{T('matrix.showAnyway')}</button></span>
      )}
    </>
  );
}

// The legend of the glyphs (never colour alone), after the cell states a view puts first.
export function GlyphKey({ children }: { children?: ComponentChildren }) {
  return (
    <p class="ct-legend">
      {children}
      <span class="ct-key"><WarnIcon />{T('matrix.key.warning')}</span>
      <span class="ct-key"><PinIcon />{T('matrix.kept')}</span>
      <span class="ct-key"><SproutIcon />{T('matrix.mainCrop')}</span>
    </p>
  );
}
