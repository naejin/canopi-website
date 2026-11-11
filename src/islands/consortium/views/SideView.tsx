/** @jsxImportSource preact */
// The side view (mockup 03; owner row 2026-11-10: a slice of one phase column of the matrix;
// coordinator row "v2 mockup choices" 2026-11-11: "Layer is light, not height", full size with a
// dashed outline in a plant's first stage). One chosen stage (store.stage, shared with the phone
// stepper and print): stage chips on desktop, the stepper on phones. Up to 20 plants are silhouettes
// (draw.ts), one numbered column each, on one log scale with lines at 1, 5 and 20 m (side.ts); above
// 20, each plant is a thin mark at its true height. The drawing is role=img named with every plant by
// layer; the numbered key repeats each name as a button that opens the plant's details (S3, through
// store.sheet), with its layer word beside the swatch, so colour is never the only cue. Stratum
// colours appear only here (base.css --s-*, matrix.css rules naming a stratum).
import { memberTaxa, pool, stage } from '../store.ts';
import { T, pageLang } from '../strings.ts';
import { PHASE_ORDS } from './tracks.ts';
import { MAX_SILHOUETTES, SCALE_LINES, lineTop, sidePlants, type SidePlant } from './side.ts';
import { DASH, MIN_COL, PLOT_H, plantStrokes } from './draw.ts';
import { Explain, Marks, layerName, nameOf, openDetails, phasePlain, phaseTerm } from './StageBar.tsx';
import { StageStepper } from './StageStepper.tsx';
import { strata } from '../../../lib/consortium/index.ts';

const num = (n: number) => new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 1 }).format(n);

function Silhouette({ p }: { p: SidePlant }) {
  return (
    <svg class="ct-sv-svg" viewBox={`${-MIN_COL / 2} 0 ${MIN_COL} ${PLOT_H}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <g data-stratum={p.stratum} data-shape={p.shape} data-dashed={String(p.dashed)}>
        {plantStrokes({ id: p.taxon.id, shape: p.shape, frac: p.frac, dashed: p.dashed }).map((s, i) => (
          <path key={i} d={s.d} fill={s.fillOpacity === null ? 'none' : undefined} fill-opacity={s.fillOpacity ?? undefined} stroke-width={s.width} stroke-dasharray={s.dashed ? DASH : undefined} stroke-linecap={s.round ? 'round' : undefined} />
        ))}
      </g>
    </svg>
  );
}

export function SideView() {
  const s = stage.value;
  const drawn = sidePlants(memberTaxa.value, s, pool.value ?? [], nameOf);
  const title = T('side.title', { stage: phasePlain(s) });
  const plants = strata.map((st) => {
    const names = drawn.filter((p) => p.stratum === st).map((p) => nameOf(p.taxon));
    return `${layerName(st)}: ${names.length ? names.join(', ') : T('side.none')}`;
  }).join('. ');
  const marks = drawn.length > MAX_SILHOUETTES;
  return (
    <section class="ct-sv" aria-labelledby="ct-sv-h">
      <h2 id="ct-sv-h">{title} <span class="ct-muted ct-sv-term">· {phaseTerm(s)}</span></h2>
      <p class="ct-sv-layer"><strong>{T('side.layer')}.</strong> <Explain kind="layer" /></p>
      <div class="ct-sv-phases" role="group" aria-label={T('phase.stage')}>
        {PHASE_ORDS.map((p) => (
          <button key={p} type="button" class="ct-chip" aria-pressed={p === s} onClick={() => { stage.value = p; }}>
            {phasePlain(p)} <span class="ct-chip-term">· {phaseTerm(p)}</span>
          </button>
        ))}
      </div>
      <div class="ct-sv-stepper"><StageStepper /></div>
      {drawn.length === 0 ? <p class="ct-muted">{T('side.empty')}</p> : (
        <>
          <figure class="ct-sv-figure">
            <div class={`ct-sv-plot${marks ? ' is-marks' : ''}`} role="img" aria-label={T('side.drawing', { title, plants })}>
              {SCALE_LINES.map((m) => <div key={m} class="ct-sv-line" style={{ top: `${lineTop(m)}%` }}><span>{T('side.metres', { m })}</span></div>)}
              {drawn.map((p, i) => (marks
                ? <div key={p.taxon.id} class={`ct-sv-mark${p.dashed ? ' is-dashed' : ''}`} data-stratum={p.stratum} style={{ height: `${Math.max(1, p.frac * 100)}%` }} />
                : <div key={p.taxon.id} class="ct-sv-col"><Silhouette p={p} /><span class="ct-sv-num" aria-hidden="true">{i + 1}</span></div>))}
            </div>
            <figcaption class="ct-sv-note">{T('side.note')}{marks ? ` ${T('side.marks')}` : ''}</figcaption>
          </figure>
          <ol class="ct-sv-key">
            {drawn.map((p, i) => (
              <li key={p.taxon.id}>
                <span class="ct-sv-n" aria-hidden="true">{i + 1}</span>
                <span>
                  <span class="ct-sv-sw" data-stratum={p.stratum} aria-hidden="true" />
                  <button type="button" class="ct-link-button" aria-haspopup="dialog" onClick={() => openDetails(p.taxon.id)}>{nameOf(p.taxon)}</button>{' '}
                  <span class="ct-sc">{p.taxon.canonical_name}</span>{' '}
                  <span class="ct-muted">· {layerName(p.stratum)} · {p.height !== null ? T('side.height', { m: num(p.height) }) : T('side.noHeight')}{p.first ? ` · ${T('side.first')}` : ''}</span>{' '}
                  <Marks taxon={p.taxon} />
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
