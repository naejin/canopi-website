// The side view's silhouettes (ported from v1 src/scripts/consortium/draw.js; design check §2): one
// plant per column, drawn true to height on the log scale (side.ts heightFrac), as a tree, a shrub,
// a herb or a climber (a vine with leaves and no support: a climbing or trailing plant is never drawn
// free-standing). Pure: it returns path data and SideView.tsx draws them, filled and stroked with the
// plant's stratum colour (base.css --s-*), so colour is never the only cue (the key names the layer).
// A dashed plant (first stage, or height not recorded) has a dashed outline and a lighter fill.
//
// Units: a column is PLOT_H units tall with the ground at y = PLOT_H; the viewBox is MIN_COL units
// wide around x = 0. Crowns may spill into the neighbouring columns (overflow visible).
import type { Shape } from './side.ts';

export const PLOT_H = 72, MIN_COL = 16;
// The widest a crown reaches from its column's centre, in units.
const MAX_REACH = 13;
export const DASH = '2 1.6';

export interface Stroke {
  d: string;
  width: number;
  fillOpacity: number | null; // null: no fill (a stem or a vine)
  dashed: boolean;
  round?: boolean;
}

// A stable number in [0, 1) from a plant id, so a plant keeps its shape between renders.
export function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
const f = (n: number) => n.toFixed(1);

// A closed lumpy outline around (cx, cy), as cubic Béziers through 20 points.
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, lumps: number): string {
  const pts: [number, number][] = [], n = 20;
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

// One plant's strokes: frac is its drawn height (0..1 of the column), dashed its outline.
export function plantStrokes({ id, shape, frac, dashed }: { id: string; shape: Shape; frac: number; dashed: boolean }): Stroke[] {
  const gy = PLOT_H, h = Math.max(3, frac * PLOT_H), top = gy - h, seed = hash(id);
  const crown = (d: string): Stroke => ({ d, width: 1.1, fillOpacity: dashed ? 0.08 : 0.32, dashed });
  if (shape === 'tree') {
    // The crown's outline tops out exactly at h, on the scale the lines use.
    const lumps = 5 + Math.floor(seed * 3), crownH = h * 0.58, rx = Math.min(MAX_REACH, Math.max(3.5, crownH * 0.42));
    const cy = top - yExtent(blob(0, 0, rx, crownH / 2, seed, lumps))[0];
    return [
      { d: `M-1.3,${gy} L-0.6,${f(cy)} L0.6,${f(cy)} L1.3,${gy} Z`, width: 0.9, fillOpacity: dashed ? 0.1 : 0.6, dashed },
      crown(blob(0, cy, rx, crownH / 2, seed, lumps)),
    ];
  }
  if (shape === 'shrub') {
    // The bush's outline sits on the ground and tops out at h: its extent grows with ry in proportion,
    // so it is measured once at ry = 100 (paths are written to 0.1 unit).
    const rx = Math.min(MAX_REACH, Math.max(3.5, h * 0.55)), [a, b] = yExtent(blob(0, 0, rx, 100, seed, 7));
    const ry = (100 * h) / (b - a), cy = gy - (b / 100) * ry;
    const stems = [-2, 0, 2].map((dx): Stroke => ({ d: `M${dx / 2},${gy} L${dx},${f(cy)}`, width: 0.9, fillOpacity: null, dashed }));
    return [...stems, crown(blob(0, cy, rx, ry, seed, 7))];
  }
  if (shape === 'climber') {
    // A vine winding to its recorded size, a leaf at each turn; no support line, which would claim a
    // height it reaches upright.
    const turns = Math.max(2, Math.round(h / 9)), step = h / turns;
    let vine = `M0,${gy}`;
    const leaves: Stroke[] = [];
    for (let i = 0; i < turns; i++) {
      const y0 = gy - step * i, y1 = y0 - step, side = i % 2 ? -1 : 1;
      vine += ` Q${f(side * 4.5)},${f(y0 - step / 2)} 0,${f(y1)}`;
      leaves.push(crown(blob(side * 3.6, y0 - step / 2, 1.9, 1.3, seed + i, 3)));
    }
    return [{ d: vine, width: 1.2, fillOpacity: null, dashed, round: true }, ...leaves];
  }
  const spread = Math.min(6, Math.max(2, h * 0.4)), out: Stroke[] = [];
  for (let i = 0; i < 5; i++) {
    const k = (i - 2) / 2, hh = h * (0.82 + 0.18 * Math.cos(i * 1.3 + seed * 4));
    out.push({ d: `M${f(k * 1.2)},${gy} Q${f(k * spread * 0.4)},${f(gy - hh * 0.6)} ${f(k * spread)},${f(gy - hh)}`, width: 1.3, fillOpacity: null, dashed, round: true });
  }
  return out;
}

// The lowest and highest y a path reaches, sampled along its curves. Reads the M, L, Q and C commands
// this module writes.
function yExtent(d: string): [number, number] {
  let min = Infinity, max = -Infinity, y0 = 0;
  for (const [, cmd, args] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const ys = [...args.matchAll(/-?\d+(?:\.\d+)?,(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const k = cmd === 'C' ? 3 : cmd === 'Q' ? 2 : 1;
    for (let i = 0; i + k <= ys.length; i += k) {
      const p = [y0, ...ys.slice(i, i + k)];
      for (let j = 0; j <= 24; j++) {
        const t = j / 24, u = 1 - t;
        const y = k === 3 ? u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3] : k === 2 ? u * u * p[0] + 2 * u * t * p[1] + t * t * p[2] : p[1];
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
      y0 = p[k];
    }
  }
  return [min, max];
}

// The topmost y any stroke reaches (for tests: a plant tops out at its drawn height).
export const topOf = (strokes: readonly Stroke[]): number => Math.min(...strokes.map((s) => yExtent(s.d)[0]));
