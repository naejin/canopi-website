/** @jsxImportSource preact */
// The matrix on a phone (max-width 639px; mockup 02 at 390 px, NOTES "Phone pattern"; owner-facing
// row "v2 mockup choices" 2026-11-11): an overview grid, a real 4 × 7 table whose cells are buttons of
// at least 41 × 40 px showing a count ("+" free, "–" nothing can go here), with its legend right
// under it; then the stage stepper; then the four layers of the chosen stage as cards, each plant a
// row with its stage bar (owner row 2026-10-28: phone rows show the stage bar). Tapping a cell jumps
// to its stage. An empty consortium shows its notice above the grid and the cells count the plants
// that could go there. "Back to the grid" is a button that scrolls to the grid and focuses it: a
// #fragment link would replace the page's share fragment (S4).
import type { MatrixCell, Stratum } from '../../../lib/consortium/index.ts';
import { strata } from '../../../lib/consortium/index.ts';
import { matrix, memberTaxa, stage } from '../store.ts';
import { P, T } from '../strings.ts';
import { PHASE_ORDS, SHARE_AIM, spans } from './tracks.ts';
import { ChevronIcon, Explain, Marks, StageBar, byName, cellName, layerName, nameOf, openDetails, phasePlain, plantLabel } from './StageBar.tsx';
import { StageStepper } from './StageStepper.tsx';
import { CellReason, EmptyNotice, FillMeter, FreeCell, GlyphKey, useMatrixMark } from './Matrix.tsx';

const kindOf = (cell: MatrixCell, empty: boolean) => (cell.empty ? 'cannot' : empty ? 'potential' : cell.members.length ? 'filled' : 'free');

export function PhoneMatrix() {
  const m = matrix.value!, s = stage.value, taxa = memberTaxa.value;
  const empty = taxa.length === 0;
  useMatrixMark();
  const back = () => {
    const grid = document.getElementById('ct-overview');
    grid?.scrollIntoView({ block: 'start' });
    grid?.focus({ preventScroll: true });
  };
  const jump = (p: number) => {
    stage.value = p as typeof s;
    document.getElementById('ct-stepper')?.scrollIntoView({ block: 'nearest' });
  };
  return (
    <div class="ct-phone">
      {empty && <EmptyNotice phone />}
      <table class="ct-mini" id="ct-overview" tabIndex={-1}>
        <caption>
          {!empty && <FillMeter m={m} />}
          <span class="ct-cap-line">{T('matrix.captionPhone')}</span>
        </caption>
        <thead>
          <tr>
            <th scope="col" class="ct-mini-corner"><span class="visually-hidden">{T('matrix.layer')}</span></th>
            {PHASE_ORDS.map((p) => (
              <th key={p} scope="col" abbr={phasePlain(p)} class={p === s ? 'is-current' : undefined}>
                <span aria-hidden="true">{p + 1}</span><span class="visually-hidden">{phasePlain(p)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((row) => (
            <tr key={row.stratum} data-stratum-row={row.stratum}>
              <th scope="row">{layerName(row.stratum)}</th>
              {row.cells.map((cell) => {
                const kind = kindOf(cell, empty);
                const n = kind === 'cannot' ? '–' : kind === 'potential' ? String(cell.fitting) : cell.members.length ? String(cell.members.length) : '+';
                const what = cell.empty === 'gap' ? T('matrix.gap') : cell.empty === 'misfit' ? T('matrix.misfit')
                  : kind === 'potential' ? P('matrix.inList', cell.fitting) : kind === 'filled' ? P('matrix.plants', cell.members.length) : P('matrix.freeCell', cell.fitting);
                return (
                  <td key={cell.phase} class={`${kind}${cell.phase === s ? ' is-current' : ''}`}>
                    <button type="button" aria-label={T('matrix.cellSays', { cell: cellName(row.stratum, cell.phase), what })} aria-current={cell.phase === s ? 'true' : undefined} onClick={() => jump(cell.phase)}>{n}</button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p class="ct-mini-legend">
        {empty
          ? <span><i class="ct-ml potential" aria-hidden="true">9</i>{T('matrix.key.inList')}</span>
          : <>
              <span><i class="ct-ml filled" aria-hidden="true" />{T('matrix.key.filled')}</span>
              <span><i class="ct-ml free" aria-hidden="true">+</i>{T('matrix.key.free')}</span>
            </>}
        <span><i class="ct-ml cannot" aria-hidden="true">–</i>{T('matrix.key.cannot')}</span>
      </p>
      <StageStepper id="ct-stepper" />
      {strata.map((st) => <StageLayer key={st} stratum={st} cell={m.rows[strata.indexOf(st)].cells[s]} empty={empty} />)}
      <button type="button" class="ct-back" onClick={back}>{T('matrix.back')}</button>
      <div class="ct-explains"><Explain kind="layer" /><Explain kind="stage" /></div>
      <GlyphKey />
    </div>
  );
}

function StageLayer({ stratum, cell, empty }: { stratum: Stratum; cell: MatrixCell; empty: boolean }) {
  const s = stage.value;
  const here = memberTaxa.value.filter((t) => t.stratum?.value === stratum && spans(t, s) && cell.members.includes(t.id)).sort(byName);
  const head = (
    <header>
      <h3>{layerName(stratum)} <span class="ct-needs">· {T(`stratum.${stratum}.needs`)}</span></h3>
      <span class="ct-lshare">{T('matrix.share', { p: SHARE_AIM[stratum] })}</span>
    </header>
  );
  if (here.length) {
    return (
      <section class="ct-pstratum" aria-label={layerName(stratum)}>
        {head}
        {here.map((t) => (
          <button key={t.id} type="button" data-plant-id={t.id} class={`ct-prow${t.from ? ' is-guest' : ''}`} aria-label={plantLabel(t)} onClick={() => openDetails(t.id)}>
            <span>
              <span class="ct-nm">{nameOf(t)} <Marks taxon={t} /></span>
              <span class="ct-sc">{t.canonical_name}</span>
              <StageBar taxon={t} current={s} />
            </span>
            <ChevronIcon dir="right" />
          </button>
        ))}
      </section>
    );
  }
  if (cell.empty) {
    return (
      <section class="ct-pstratum cannot" aria-label={layerName(stratum)}>
        {head}
        <div class="ct-pempty"><CellReason stratum={stratum} from={cell.phase} to={cell.phase} kind={cell.empty} /></div>
      </section>
    );
  }
  return (
    <section class="ct-pstratum" aria-label={layerName(stratum)}>
      {head}
      <div class="ct-pempty">{empty ? <span>{P('matrix.inList', cell.fitting)}</span> : <FreeCell stratum={stratum} phase={cell.phase} fitting={cell.fitting} />}</div>
    </section>
  );
}
