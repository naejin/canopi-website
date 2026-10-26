// Helpers for the Field Guides diagrams, which are drawn at build time in component frontmatter.
// A seeded random keeps every build identical; numbers are rounded so the markup stays small.

// Park–Miller minimal standard generator: the same seed gives the same drawing.
export function rng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// A stable seed from text (a guide slug, a diagram name).
export function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h) || 1;
}

export const r1 = (n: number): number => Math.round(n * 10) / 10;

// Soil shapes, shared by the soil hero row and the Soil guides' drawings. Both take a seeded random
// (rng() above), so every build draws the same crumbs.
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

// A grid of points with a little jitter.
export function grid(cols: number, rows: number, x0: number, y0: number, dx: number, dy: number, rand: () => number, jitter: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pts.push([r1(x0 + i * dx + (rand() - 0.5) * jitter), r1(y0 + j * dy + (rand() - 0.5) * jitter)]);
  return pts;
}

// Shuffle in place with the seeded random.
export function shuffle<T>(list: T[], rand: () => number): T[] {
  for (let k = list.length - 1; k > 0; k--) {
    const m = Math.floor(rand() * (k + 1));
    [list[k], list[m]] = [list[m], list[k]];
  }
  return list;
}

// A bean seen from above, about 16 × 12 units, centred on 0,0.
export const BEAN_PATH = 'M-8 0.5C-8-4.5-4-6-0.5-4.6C2.5-6.2 8-5 8 0C8 4.6 4 6 0 5.6C-4.5 6-8 4.8-8 0.5Z';
export const BEAN_SPECKS: [number, number][] = [[-4, -1.5], [-1, 2.4], [2.5, -2], [4.5, 1.8], [0.5, -0.2]];

// One bean: colour 1–6 (the --seed-N tokens), a second colour for a cross, scale, rotation,
// speckles, faded (set no seed) and shrivelled (an F2 seed that did not fill).
export interface Bean {
  x: number;
  y: number;
  c: number;
  c2?: number;
  s?: number;
  r?: number;
  speck?: boolean;
  gone?: boolean;
  shrivel?: boolean;
}

export function beanTransform(b: Bean): string {
  const sx = b.shrivel ? 0.7 : 1;
  const sy = b.shrivel ? 0.55 : 1;
  const s = b.s ?? 1;
  return `translate(${r1(b.x)} ${r1(b.y)}) rotate(${Math.round(b.r ?? 0)}) scale(${r1(s * sx * 100) / 100} ${r1(s * sy * 100) / 100})`;
}

// A plump corn kernel seen flat, crown up, about 8 × 10 units, centred on 0,0.
export const KERNEL_PATH = 'M-3.8-3C-3.8-4.4-2-4.8 0-4.8C2-4.8 3.8-4.4 3.8-3L3.4 2.6C3 4.2 1.6 4.8 0 4.8C-1.6 4.8-3 4.2-3.4 2.6Z';
// A squash seed: a flat oval, narrower at the end it hung by (+x), about 18 × 10 units, and its rim.
export const SQUASH_SEED_PATH = 'M-9 0C-9-3.4-5.4-5 -0.5-5C4.6-5 8.2-2.4 9.4 0C8.2 2.4 4.6 5-0.5 5C-5.4 5-9 3.4-9 0Z';
export const SQUASH_SEED_RIM = 'M-7.6 0C-7.6-2.6-4.6-3.8-0.5-3.8C3.6-3.8 6.6-2 7.6 0C6.6 2 3.6 3.8-0.5 3.8C-4.6 3.8-7.6 2.6-7.6 0Z';
// A grain of wheat or rye, about 10 × 4.4 units, and the crease along it.
export const GRAIN_PATH = 'M-5 0C-5-1.8-3.2-2.2 0-2.2C3.2-2.2 5-1.6 5 0C5 1.6 3.2 2.2 0 2.2C-3.2 2.2-5 1.8-5 0Z';
export const GRAIN_CREASE = 'M-3.6 0.2Q0-0.6 3.6 0.2';
// A tomato seed: flat and round, with a notch where it was attached, about 6.6 units across.
export const TOMATO_SEED_PATH = 'M0.9-3.1C2.7-2.8 3.4-1.3 3.4 0.3C3.4 2.2 1.8 3.3 0 3.3C-1.9 3.3-3.3 1.9-3.3 0C-3.3-1.8-2.2-3-0.5-3.2L0.2-2.2Z';
// A garlic clove, tip up: a full back (+x), a flatter inner side, about 8 × 13 units, and its seam.
export const CLOVE_PATH = 'M0-7C3-5 5-1.2 4.6 2.6C4.2 5.6 1.6 6.6-0.6 6.4C-3 6.2-3.6 3.4-3 0.6C-2.4-2.4-1-5 0-7Z';
export const CLOVE_SEAM = 'M0.3-5.4C2-2.6 2.6 1.6 1.4 5.6';

// A simple leaf from its base at x,y, pointing `angle` degrees from +x, `len` long.
export function leafPath(len: number, x = 0, y = 0, angle = 0): string {
  const a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  const at = (along: number, side: number) => `${r1(x + along * len * ux + side * len * uy)} ${r1(y + along * len * uy - side * len * ux)}`;
  return `M${r1(x)} ${r1(y)}Q${at(0.5, 0.38)} ${at(1, 0)}Q${at(0.5, -0.38)} ${r1(x)} ${r1(y)}Z`;
}

// A lobed leaf (an oak's) from its base at 0,0 pointing +x, `len` long, with three lobes a side.
export function lobedLeafPath(len: number): string {
  const lobes = 3;
  const steps = lobes * 4;
  const side = (sign: number) => Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const w = len * 0.3 * Math.sin(Math.PI * t ** 0.8) * (0.55 + 0.45 * Math.abs(Math.sin(Math.PI * lobes * t)));
    return `${r1(t * len)} ${r1(-sign * w)}`;
  });
  const top = side(1), bottom = side(-1).reverse();
  return `M${top[0]}L${top.slice(1).join('L')}L${bottom.slice(1).join('L')}Z`;
}

export const pick = <T>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)];

// Break a label into lines of at most `max` characters, at spaces, for SVG text (which does not
// wrap). No-break spaces (U+00A0, U+202F) are not break points, so French punctuation stays put.
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/ +/)) {
    if (!word) continue;
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
