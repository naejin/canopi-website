/** @jsxImportSource preact */
// The side view (mockup 03; owner row 2026-11-10: a slice of one phase column of the matrix;
// coordinator row "v2 mockup choices" 2026-11-11: "Layer is light, not height", full size with a
// dashed outline in a plant's first stage). One chosen stage (store.stage, shared with the phone
// stepper and print): stage chips on desktop, the stepper on phones. Stratum colours appear only in
// the drawing and its key (base.css --s-*, matrix.css rules naming a stratum).
//
// SideDrawing is the figure and its numbered key with no control, for SideView and S4's print sheet:
// - up to 20 plants are silhouettes (draw.ts), one numbered column each; above 20 each plant is a
//   thin mark at its true height;
// - one SVG and one coordinate system for the scale lines (1, 5, 20 m), the silhouettes and the marks:
//   the vertical axis is the plot's height at every width. Each silhouette is a nested SVG one unit
//   wide at its column's centre whose viewBox is scaled to the plot's height (slice), so narrowing the
//   columns never shrinks a plant below its line. A plant reaching wider than its column allows is
//   narrowed (scaled in x only, its height kept): the first and last stay inside the plot, clear of
//   the scale labels, and the others reach at most into half of each neighbouring column;
// - the drawing is role=img named with every plant by layer; the key repeats each name with its layer
//   word beside the swatch, so colour is never the only cue. Given `open`, a name is a button that
//   opens the plant's details (S3, through store.sheet); the print sheet passes none.
import { useLayoutEffect, useState } from 'preact/hooks';
import type { PhaseOrd } from '../../../lib/consortium/index.ts';
import { strata } from '../../../lib/consortium/index.ts';
import { memberTaxa, pool, stage } from '../store.ts';
import { T } from '../strings.ts';
import { PHASE_ORDS } from './tracks.ts';
import { MAX_SILHOUETTES, SCALE_LINES, lineTop, sidePlants, type SidePlant } from './side.ts';
import { DASH, MIN_COL, PLOT_H, plantStrokes, reachOf } from './draw.ts';
import { Explain, Marks, byName, openDetails } from './StageBar.tsx';
import { layerName, nameOf, num, phasePlain, phaseTerm } from './kit/names.ts';
import { StageStepper } from './StageStepper.tsx';

const pct = (x: number) => `${+x.toFixed(3)}%`;

// room: how far, in drawing units, the plant may reach from its column's centre (null: not measured).
function Silhouette({ p, x, room }: { p: SidePlant; x: number; room: number | null }) {
  const strokes = plantStrokes({ id: p.taxon.id, shape: p.shape, frac: p.frac, dashed: p.dashed });
  const sx = room === null ? 1 : Math.min(1, room / reachOf(strokes));
  return (
    <svg class="ct-sv-plant" x={pct(x)} y="0" width="1" height="100%" viewBox={`${-MIN_COL / 2} 0 ${MIN_COL} ${PLOT_H}`} preserveAspectRatio="xMidYMax slice" overflow="visible">
      <g data-stratum={p.stratum} data-shape={p.shape} data-dashed={String(p.dashed)} data-frac={p.frac.toFixed(4)} transform={sx < 1 ? `scale(${+sx.toFixed(4)} 1)` : undefined}>
        {strokes.map((s, i) => (
          <path key={i} d={s.d} fill={s.fillOpacity === null ? 'none' : undefined} fill-opacity={s.fillOpacity ?? undefined} stroke-width={s.width} stroke-dasharray={s.dashed ? DASH : undefined} stroke-linecap={s.round && !s.dashed ? 'round' : undefined} />
        ))}
      </g>
    </svg>
  );
}

// The drawing area's size in pixels, read before paint and on every resize.
// A callback ref, so the measuring starts whenever the drawing appears (it is absent with no plant).
function useSize() {
  const [el, ref] = useState<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); setSize((o) => (o && o.w === r.width && o.h === r.height ? o : { w: r.width, h: r.height })); };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, size] as const;
}

export function SideDrawing({ stage: s, open }: { stage: PhaseOrd; open?: (id: string) => void }) {
  const [svgRef, size] = useSize();
  const drawn = sidePlants(memberTaxa.value, s, pool.value ?? [], byName);
  if (drawn.length === 0) return <p class="ct-dim">{T('side.empty')}</p>;
  const title = T('side.title', { stage: phasePlain(s) });
  const plants = strata.map((st) => {
    const names = drawn.filter((p) => p.stratum === st).map((p) => nameOf(p.taxon));
    return `${layerName(st)}: ${names.length ? names.join(', ') : T('side.none')}`;
  }).join('. ');
  const marks = drawn.length > MAX_SILHOUETTES, n = drawn.length;
  const centre = (i: number) => ((i + 0.5) / n) * 100;
  // A column's width in drawing units (the units are scaled to the plot's height).
  const col = size && size.h > 0 ? size.w / n / (size.h / PLOT_H) : null;
  const room = (i: number) => (col === null ? null : i === 0 || i === n - 1 ? col / 2 : col);
  return (
    <>
      <figure class="ct-sv-figure">
        <div class={`ct-sv-plot${marks ? ' is-marks' : ''}`} role="img" aria-label={T('side.drawing', { title, plants })}>
          <div class="ct-sv-scale" aria-hidden="true">
            {SCALE_LINES.map((m) => <span key={m} style={{ top: pct(lineTop(m)) }}>{T('side.metres', { m })}</span>)}
          </div>
          <svg class="ct-sv-svg" ref={svgRef} width="100%" height="100%" aria-hidden="true" focusable="false">
            {SCALE_LINES.map((m) => <line key={m} class="ct-sv-line" x1="0" x2="100%" y1={pct(lineTop(m))} y2={pct(lineTop(m))} />)}
            {drawn.map((p, i) => (marks
              ? <rect key={p.taxon.id} class={`ct-sv-mark${p.dashed ? ' is-dashed' : ''}`} data-stratum={p.stratum} x={pct(centre(i) - 30 / n)} width={pct(60 / n)} y={pct((1 - Math.max(0.01, p.frac)) * 100)} height={pct(Math.max(0.01, p.frac) * 100)} rx="1.5" />
              : <Silhouette key={p.taxon.id} p={p} x={centre(i)} room={room(i)} />))}
          </svg>
        </div>
        {!marks && (
          <div class="ct-sv-nums" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {drawn.map((p, i) => <span key={p.taxon.id}>{i + 1}</span>)}
          </div>
        )}
        <figcaption class="ct-sv-note">{T('side.note')}{marks ? ` ${T('side.marks')}` : ''}</figcaption>
      </figure>
      <ol class="ct-sv-key">
        {drawn.map((p, i) => (
          <li key={p.taxon.id} data-plant-id={p.taxon.id}>
            <span class="ct-sv-n" aria-hidden="true">{i + 1}</span>
            <span>
              <span class="ct-sv-sw" data-stratum={p.stratum} aria-hidden="true" />
              {open
                ? <button type="button" class="ct-link-button" aria-haspopup="dialog" onClick={() => open(p.taxon.id)}>{nameOf(p.taxon)}</button>
                : <strong>{nameOf(p.taxon)}</strong>}{' '}
              <span class="ct-sc">{p.taxon.canonical_name}</span>{' '}
              <span class="ct-dim">· {layerName(p.stratum)} · {p.height !== null ? T('side.height', { m: num(p.height) }) : T('side.noHeight')}{p.first ? ` · ${T('side.first')}` : ''}</span>{' '}
              <Marks taxon={p.taxon} />
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function SideView() {
  const s = stage.value;
  return (
    <section class="ct-sv" aria-labelledby="ct-sv-h">
      <h2 id="ct-sv-h">{T('side.title', { stage: phasePlain(s) })} <span class="ct-dim ct-sv-term">· {phaseTerm(s)}</span></h2>
      <p class="ct-sv-layer"><strong>{T('side.layer')}.</strong> <Explain kind="layer" /></p>
      <div class="ct-sv-phases" role="group" aria-label={T('phase.stage')}>
        {PHASE_ORDS.map((p) => (
          <button key={p} type="button" class="ct-stchip" aria-pressed={p === s} onClick={() => { stage.value = p; }}>
            {phasePlain(p)} <span class="ct-chip-term">· {phaseTerm(p)}</span>
          </button>
        ))}
      </div>
      <div class="ct-sv-stepper"><StageStepper /></div>
      <SideDrawing stage={s} open={openDetails} />
    </section>
  );
}
