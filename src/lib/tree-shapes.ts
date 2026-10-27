// Shapes shared by the tree drawings of three Carbon farming guides (food-forest, trees-in-the-field,
// water-and-slopes): a scalloped crown, a shrub mound, a tuft of small plants and a trunk. All take
// plain numbers (and the seeded random from src/lib/svg.ts where they jitter), so every build draws
// the same picture.
import { r1 } from './svg';

// A cloud-like crown: n bumps round an ellipse centred on cx, cy.
export function crownPath(rand: () => number, cx: number, cy: number, rx: number, ry: number, n = 9): string {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand() * 0.2, k = 0.9 + rand() * 0.14;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const out = (p: number[], q: number[]) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    return `${r1(cx + (mx - cx) * 1.28)} ${r1(cy + (my - cy) * 1.28)}`;
  };
  return `M${r1(pts[0][0])} ${r1(pts[0][1])}` + pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    return `Q${out(p, q)} ${r1(q[0])} ${r1(q[1])}`;
  }).join('') + 'Z';
}

// A shrub: a low scalloped mound sitting on the ground line gy, w wide and h high.
export function moundPath(rand: () => number, cx: number, gy: number, w: number, h: number, bumps = 4): string {
  const x0 = cx - w / 2, step = w / bumps;
  let d = `M${r1(x0)} ${r1(gy)}`;
  for (let i = 0; i < bumps; i++) {
    const xa = x0 + i * step, xb = xa + step;
    const lift = h * (0.75 + rand() * 0.25) * Math.sin(Math.PI * (i + 0.5) / bumps) ** 0.5;
    d += `C${r1(xa)} ${r1(gy - lift * 1.3)} ${r1(xb)} ${r1(gy - lift * 1.3)} ${r1(xb)} ${r1(gy - (i === bumps - 1 ? 0 : h * 0.55))}`;
  }
  return d + 'Z';
}

// A tuft of small plants: three to five short leafy strokes rising from x, gy, h high.
export function tuftPath(x: number, gy: number, h: number, blades = 4): string {
  return Array.from({ length: blades }, (_, i) => {
    const lean = (i - (blades - 1) / 2) * h * 0.28;
    return `M${r1(x)} ${r1(gy)}Q${r1(x + lean * 0.3)} ${r1(gy - h * 0.6)} ${r1(x + lean)} ${r1(gy - h)}`;
  }).join('');
}

// A trunk from the ground gy up to top, w wide at the base and tapering.
export function trunkPath(x: number, gy: number, top: number, w: number): string {
  return `M${r1(x - w / 2)} ${r1(gy)}Q${r1(x - w * 0.3)} ${r1((gy + top) / 2)} ${r1(x - w * 0.22)} ${r1(top)}H${r1(x + w * 0.22)}Q${r1(x + w * 0.3)} ${r1((gy + top) / 2)} ${r1(x + w / 2)} ${r1(gy)}Z`;
}
