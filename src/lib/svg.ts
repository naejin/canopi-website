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
