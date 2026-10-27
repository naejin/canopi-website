// The Layers drawing: a side view of the consortium, one silhouette per plant at its layer's height,
// tallest layer first, numbered left to right like the list. Shapes follow the plant's form (tree,
// shrub, palm-like, climber, grass, ground cover); colours are the strata's, with darker inks for
// strokes, and every plant also has its number and its layer's line, so colour is never the only cue.
import { esc } from './words.js';

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const f = (n) => n.toFixed(1);

function blob(cx, cy, rx, ry, seed, lumps) {
  const pts = [], n = 28;
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

export const STRATUM_HEIGHT = { emergent: 250, high: 185, medium: 118, low: 52 };

function silhouette(t, cx, gy, colW) {
  const s = t.stratum.value, h = STRATUM_HEIGHT[s], seed = hash(t.id);
  const g = (inner) => `<g fill="var(--s-${s})" stroke="var(--s-${s}-ink)">${inner}</g>`;
  const fillA = 'fill-opacity="0.28" stroke-width="1.6"';
  const genus = t.genus, habit = t.traits.habit, fn = (t.functions ?? []).map((x) => x.function);
  const trunk = (top, w) => `<path d="M${cx - w / 2},${gy} C${cx - w / 2},${gy - 20} ${f(cx - w / 3)},${f(top + 10)} ${cx - 1},${f(top)} L${cx + 1},${f(top)} C${f(cx + w / 3)},${f(top + 10)} ${cx + w / 2},${gy - 20} ${cx + w / 2},${gy} Z" fill-opacity="0.55" stroke-width="1.2"/>`;
  if (genus === 'Musa' || genus === 'Carica' || genus === 'Cocos' || genus === 'Bactris' || genus === 'Euterpe') {
    const palm = genus !== 'Carica', top = gy - h * 0.82, leaves = palm ? 6 : 7;
    let out = `<path d="M${cx - 4},${gy} Q${cx - 2},${f((gy + top) / 2)} ${cx - 1},${f(top)} L${cx + 1},${f(top)} Q${cx + 2},${f((gy + top) / 2)} ${cx + 4},${gy} Z" fill-opacity="0.55" stroke-width="1.2"/>`;
    for (let i = 0; i < leaves; i++) {
      const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * (palm ? 0.5 : 0.42) + (seed - 0.5) * 0.2;
      const len = (palm ? 0.42 : 0.3) * h * (0.85 + 0.3 * Math.abs(Math.sin(i * 1.7 + seed * 5)));
      const ex = cx + Math.cos(a) * len, ey = top + Math.sin(a) * len * 0.8 + len * 0.25;
      const nx = -Math.sin(a) * (palm ? 9 : 5), ny = Math.cos(a) * (palm ? 9 : 5);
      const mx = (cx + ex) / 2, my = (top + ey) / 2 - len * 0.12;
      out += `<path d="M${cx},${f(top)} Q${f(mx + nx)},${f(my + ny)} ${f(ex)},${f(ey)} Q${f(mx - nx)},${f(my - ny)} ${cx},${f(top)} Z" ${fillA}/>`;
    }
    if (!palm) for (let i = 0; i < 3; i++) out += `<ellipse cx="${cx - 5 + i * 5}" cy="${f(top + 8 + (i % 2) * 4)}" rx="3" ry="4.5" fill-opacity="0.75" stroke-width="1"/>`;
    return g(out);
  }
  if (genus === 'Manihot') {
    let out = '';
    for (const dx of [-7, 0, 7]) out += `<path d="M${f(cx + dx / 3)},${gy} L${cx + dx},${f(gy - h * 0.82)}" fill="none" stroke-width="1.6"/>`;
    for (let i = 0; i < 7; i++) {
      const lx = cx + (i - 3) * colW * 0.11, ly = gy - h * (0.62 + 0.3 * Math.abs(Math.sin(i * 1.3 + seed * 4)));
      for (const a of [-0.9, -0.3, 0.3, 0.9]) out += `<path d="M${f(lx)},${f(ly)} l${f(Math.sin(a) * 11)},${f(-Math.cos(a) * 11)}" fill="none" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return g(out);
  }
  if (habit === 'Climber' && !fn.includes('ground_cover')) {
    let out = `<path d="M${cx},${gy} V${f(gy - h * 0.95)}" fill="none" stroke-width="1.4" stroke-dasharray="2 2"/>`;
    for (let i = 0; i < 6; i++) {
      const y = gy - (i + 0.6) * h * 0.15, dir = i % 2 ? 1 : -1;
      out += `<path d="M${cx},${f(y)} q${dir * 9},-4 ${dir * 12},-12" fill="none" stroke-width="1.4"/><ellipse cx="${cx + dir * 12}" cy="${f(y - 12)}" rx="5" ry="3.6" fill-opacity="0.45" stroke-width="1"/>`;
    }
    return g(out);
  }
  if (habit === 'Tree') {
    const shape = seed < 0.34 ? 'tall' : seed < 0.67 ? 'round' : 'wide';
    const crownH = h * (s === 'emergent' ? 0.55 : 0.6) * (shape === 'tall' ? 1.12 : shape === 'wide' ? 0.82 : 1), cy = gy - h + crownH / 2;
    const rx = colW * (s === 'emergent' ? 0.62 : 0.48) * (shape === 'tall' ? 0.78 : shape === 'wide' ? 1.12 : 1);
    return g(trunk(cy + crownH * 0.38, s === 'emergent' ? 12 : 8) + `<path d="${blob(cx, cy, rx, crownH / 2, seed, 5 + Math.floor(seed * 3))}" ${fillA}/>`);
  }
  if (habit === 'Shrub' || (s === 'medium' && habit !== 'Herbaceous')) {
    const cy = gy - h * 0.48, rx = colW * 0.42;
    let stems = '';
    for (const dx of [-6, 0, 6]) stems += `<path d="M${cx + dx / 2},${gy} L${cx + dx},${f(cy + 10)}" fill="none" stroke-width="1.4"/>`;
    let flowers = '';
    if (fn.includes('insectary') || fn.includes('pollinator_forage')) for (let i = 0; i < 4; i++) flowers += `<circle cx="${f(cx - rx * 0.6 + i * rx * 0.4)}" cy="${f(cy - h * 0.3 + (i % 2) * 8)}" r="3.6" fill-opacity="0.9" stroke-width="1"/>`;
    return g(stems + `<path d="${blob(cx, cy, rx, h * 0.46, seed, 7)}" ${fillA}/>` + flowers);
  }
  if (t.family === 'Poaceae' || genus === 'Allium') {
    let out = '';
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) * 0.17, hh = h * (0.8 + 0.2 * Math.cos(i));
      out += `<path d="M${f(cx + (i - 4) * 1.5)},${gy} Q${f(cx + Math.sin(a) * hh * 0.4)},${f(gy - hh * 0.7)} ${f(cx + Math.sin(a) * hh * 0.9)},${f(gy - hh)}" fill="none" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    return g(out);
  }
  if (fn.includes('ground_cover') || habit === 'Climber') {
    const rx = colW * 0.58;
    let dots = '';
    for (let i = 0; i < 6; i++) dots += `<circle cx="${f(cx - rx * 0.7 + i * rx * 0.28)}" cy="${f(gy - h * 0.35 + (i % 2) * 5)}" r="3.2" fill-opacity="0.6" stroke-width="0"/>`;
    return g(`<path d="${blob(cx, gy - h * 0.18, rx, h * 0.36, seed, 9)}" ${fillA}/>` + dots);
  }
  if (s === 'medium') {
    let out = '';
    for (const dx of [-8, 0, 8]) out += `<path d="M${f(cx + dx / 3)},${gy} Q${cx + dx},${f(gy - h * 0.5)} ${f(cx + dx * 1.3)},${f(gy - h * 0.9)}" fill="none" stroke-width="1.6"/><circle cx="${f(cx + dx * 1.3)}" cy="${f(gy - h * 0.92)}" r="5" fill-opacity="0.7" stroke-width="1"/>`;
    return g(out + `<path d="${blob(cx, gy - h * 0.45, colW * 0.3, h * 0.3, seed, 6)}" ${fillA}/>`);
  }
  return g(`<path d="${blob(cx, gy - h * 0.45, colW * 0.36, h * 0.48, seed, 7)}" ${fillA}/>`);
}

// The drawing for `placed` (members with a layer, in drawing order). `label(t, i)` gives a plant's
// label markup under its column; `phone` draws narrower columns and numbers only (the names go in a
// key below, which the caller writes). `id` keeps the gradient ids apart (screen and print).
export function profileSVG(placed, { phone, id, title, strataLabel }) {
  const colW = phone ? 62 : 100;
  const cols = Math.max(placed.length, phone ? 5 : 6), pad = Math.floor((cols - placed.length) / 2);
  const W = cols * colW, H = 300, gy = 276;
  const present = Object.keys(STRATUM_HEIGHT).filter((s) => placed.some((t) => t.stratum.value === s));
  const lines = present.map((s) => `<line x1="0" x2="${W}" y1="${gy - STRATUM_HEIGHT[s]}" y2="${gy - STRATUM_HEIGHT[s]}" stroke="var(--border-strong)" stroke-dasharray="3 5" stroke-width="1" opacity="0.8"/>`).join('');
  const lineLabels = present.map((s) => `<span class="sline" style="top:max(2px, calc(${(((gy - STRATUM_HEIGHT[s]) / H) * 100).toFixed(2)}% - 1.45em))"><span class="sw" data-s="${s}"></span>${esc(strataLabel(s))}</span>`).join('');
  const plants = placed.map((t, i) => silhouette(t, (pad + i) * colW + colW / 2, gy, colW)).join('');
  const columns = placed.map((t, i) => ({ t, center: ((pad + i + 0.5) / cols) * 100 }));
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sun-tint);stop-opacity:0.75"/><stop offset="0.9" style="stop-color:var(--sun-tint);stop-opacity:0"/></linearGradient></defs>
    <rect x="0" y="0" width="${W}" height="${gy}" fill="url(#${id})"/>${lines}${plants}
    <rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="var(--soil)" fill-opacity="0.16"/><line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="var(--ground-ink)" stroke-width="1.5"/></svg>`;
  return { svg, lineLabels, columns, cols, ratio: W / H };
}
