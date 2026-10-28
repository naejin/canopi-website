// The side view's silhouettes (1 to 20 plants; app.js sideMarkup): one plant per column, drawn true
// to height on the side view's log scale (side.js heightFrac), as a tree, a shrub, a herb or a climber
// (side.js shapeOf): a climbing or trailing plant is a vine with leaves, no support, never a free-standing plant. Colours are the strata's, with darker inks for strokes; every plant also has its number
// below and its band's name beside it, so colour is never the only cue. A plant with no height is a
// dashed outline at its layer's usual height.
//
// Units: a column is PLOT_H units tall with the ground at y = PLOT_H; the viewBox is MIN_COL units wide
// around x = 0. The <svg> is always the plot's height and MIN_COL / PLOT_H of it wide (consortium.css
// .sv-svg), whatever its column's width, so one unit is plot-height / PLOT_H pixels and every plant
// tops out on the 1, 5 and 20 m lines at any count up to 20 (review S3). Crowns may spill into the
// neighbouring columns (overflow visible), never past the frame's label margin.

export const PLOT_H = 72, MIN_COL = 16;

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const f = (n) => n.toFixed(1);

function blob(cx, cy, rx, ry, seed, lumps) {
  const pts = [], n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(a * lumps + seed * 6.3) + 0.04 * Math.sin(a * (lumps * 2 + 1) + seed * 11);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

// The widest a crown reaches from its column's centre, in units.
export const MAX_REACH = 13;

// One plant: its stratum s (colour), shape ('tree' | 'shrub' | 'herb' | 'climber'), frac (0..1 of the column's
// height), dashed (height not known: drawn at the layer's usual height). Returns the <svg>.
export function plantSVG({ id, s, shape, frac, dashed }) {
  const gy = PLOT_H, h = Math.max(3, frac * PLOT_H), top = gy - h, seed = hash(id);
  const fillA = dashed ? 'fill-opacity="0.08" stroke-dasharray="2 1.6" stroke-width="1.1"' : 'fill-opacity="0.32" stroke-width="1.1"';
  let body = '';
  if (shape === 'tree') {
    const crownH = h * 0.58, cy = top + (crownH / 2) * 1.11, rx = Math.min(MAX_REACH, Math.max(3.5, crownH * 0.42));
    body = `<path d="M-1.3,${gy} L-0.6,${f(cy)} L0.6,${f(cy)} L1.3,${gy} Z" fill-opacity="${dashed ? 0.1 : 0.6}" stroke-width="0.9"${dashed ? ' stroke-dasharray="2 1.6"' : ''}/>`
      + `<path d="${blob(0, cy, rx, crownH / 2, seed, 5 + Math.floor(seed * 3))}" ${fillA}/>`; // its lumps top out at h
  } else if (shape === 'shrub') {
    // The blob's lumps reach 11 % past its radius: the bush sits on the ground and tops out at h.
    const ry = (h / 2) / 1.11, cy = gy - h / 2, rx = Math.min(MAX_REACH, Math.max(3.5, h * 0.55));
    let stems = '';
    for (const dx of [-2, 0, 2]) stems += `<path d="M${dx / 2},${gy} L${dx},${f(cy)}" fill="none" stroke-width="0.9"${dashed ? ' stroke-dasharray="2 1.6"' : ''}/>`;
    body = stems + `<path d="${blob(0, cy, rx, ry, seed, 7)}" ${fillA}/>`;
  } else if (shape === 'climber') {
    // A vine winding to its recorded size, a leaf at each turn; no support line, which would claim a
    // height it reaches upright (review W1).
    const turns = Math.max(2, Math.round(h / 9)), step = h / turns, dash = dashed ? ' stroke-dasharray="2 1.6"' : '';
    let vine = `M0,${gy}`, leaves = '';
    for (let i = 0; i < turns; i++) {
      const y0 = gy - step * i, y1 = y0 - step, side = i % 2 ? -1 : 1;
      vine += ` Q${f(side * 4.5)},${f(y0 - step / 2)} 0,${f(y1)}`;
      leaves += `<path d="${blob(side * 3.6, y0 - step / 2, 1.9, 1.3, seed + i, 3)}" ${fillA}/>`;
    }
    body = `<path d="${vine}" fill="none" stroke-width="1.2" stroke-linecap="round"${dash}/>${leaves}`;
  } else {
    const spread = Math.min(6, Math.max(2, h * 0.4));
    for (let i = 0; i < 5; i++) {
      const k = (i - 2) / 2, hh = h * (0.82 + 0.18 * Math.cos(i * 1.3 + seed * 4));
      body += `<path d="M${f(k * 1.2)},${gy} Q${f(k * spread * 0.4)},${f(gy - hh * 0.6)} ${f(k * spread)},${f(gy - hh)}" fill="none" stroke-width="1.3" stroke-linecap="round"${dashed ? ' stroke-dasharray="2 1.6"' : ''}/>`;
    }
  }
  return `<svg class="sv-svg" viewBox="${-MIN_COL / 2} 0 ${MIN_COL} ${PLOT_H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><g class="sv-plant" data-shape="${shape}" data-h="${frac.toFixed(3)}" data-dashed="${!!dashed}" fill="var(--s-${s})" stroke="var(--s-${s}-ink)">${body}</g></svg>`;
}
