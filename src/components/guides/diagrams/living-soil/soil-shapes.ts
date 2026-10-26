// Shapes for the Soil guides' drawings (living-soil, fungal-or-bacterial): an irregular soil crumb
// and a fine fungal thread between two points. Both take the diagram's seeded random (rng() from
// src/lib/svg.ts), so every build draws the same crumbs.
import { r1 } from '../../../../lib/svg';

// An irregular crumb: a closed curve through nine jittered points around cx, cy.
export function crumbPath(rand: () => number, cx: number, cy: number, rad: number): string {
  const n = 9;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, rr = rad * (0.78 + rand() * 0.36);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86];
  });
  const mid = (p: number[], q: number[]) => `${r1((p[0] + q[0]) / 2)} ${r1((p[1] + q[1]) / 2)}`;
  return `M${mid(pts[n - 1], pts[0])}` + pts.map((p, i) => `Q${r1(p[0])} ${r1(p[1])} ${mid(p, pts[(i + 1) % n])}`).join('') + 'Z';
}

// A fungal thread: a gentle curve from a to b with a jittered middle.
export function threadPath(rand: () => number, ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2 + (rand() - 0.5) * 14, my = (ay + by) / 2 + (rand() - 0.5) * 14;
  return `M${r1(ax)} ${r1(ay)}Q${r1(mx)} ${r1(my)} ${r1(bx)} ${r1(by)}`;
}
