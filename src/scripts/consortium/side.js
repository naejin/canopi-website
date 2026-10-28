// The side view's rules at every size (design-scale.md §1b.3, §1c.3, §2.3; decision rows "Scale,
// coordinator choices" and "Scale mockup approved", owner 2026-10-28): one log scale of heights,
// a plant's shape, each layer's usual height, and the facts a band spells out (typical heights,
// named exceptions, heights not known). Pure (no DOM, no strings): scripts/consortium-side.test.mjs
// tests it on the real Temperate list.

// One scale at every size: 0.05 m at the ground, 60 m at the top, logarithmic, so a 0.3 m herb and a
// 40 m linden both read (N6). The lines are drawn at 1 m, 5 m and 20 m.
export const LOG_MIN = 0.05, LOG_MAX = 60;
export const SCALE_LINES = [1, 5, 20];
const SPAN = Math.log(LOG_MAX / LOG_MIN);
// A height as a fraction of the band's height (0 at the ground, 1 at the top), clamped.
export function heightFrac(m) {
  if (!(m > 0)) return 0;
  return Math.min(1, Math.max(0, Math.log(m / LOG_MIN) / SPAN));
}

export const heightOf = (t) => t.traits?.height_m?.max ?? null;

// A plant is drawn as a tree, a shrub or a herb (its habit; climbers are drawn as shrubs, the plant
// they make on a support).
export function shapeOf(t) {
  const habit = t.traits?.habit;
  if (habit === 'Tree') return 'tree';
  if (habit === 'Shrub' || habit === 'Climber') return 'shrub';
  return 'herb';
}

// The quantile p of sorted numbers, interpolated between ranks at p × (n + 1) (Hyndman-Fan type 6,
// a spreadsheet's QUARTILE.EXC), clamped to the ends for short lists. On the Temperate Mid layer it
// gives the approved "Most 0.7–4 m" (design-scale.md §1c.3).
export function quantile(sorted, p) {
  if (!sorted.length) return null;
  const pos = Math.min(sorted.length - 1, Math.max(0, p * (sorted.length + 1) - 1)), lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// A layer's usual height, where a plant with no height is drawn (dashed): the median of the heights
// known in the band, else in the whole climate list's layer, else a fixed height for the layer.
const FALLBACK = { emergent: 20, high: 6, medium: 1.5, low: 0.3 };
export function usualHeight(stratum, bandTaxa, listTaxa = []) {
  for (const set of [bandTaxa, listTaxa.filter((t) => t.stratum?.value === stratum)]) {
    const hs = set.map(heightOf).filter((h) => h > 0).sort((a, b) => a - b);
    if (hs.length) return quantile(hs, 0.5);
  }
  return FALLBACK[stratum] ?? 1;
}

// What a band spells out (M1): its plants, the middle half of its heights (q1–q3), the named
// exceptions (High and Mid: taller than max(2 × q3, q3 + 5 m), tallest first; Emergent: shorter
// than q1 / 2, shortest first) and how many have no height. Plants with no height are counted,
// never dropped.
export function bandFacts(stratum, taxa) {
  const known = taxa.filter((t) => heightOf(t) > 0);
  const hs = known.map(heightOf).sort((a, b) => a - b);
  const q1 = quantile(hs, 0.25), q3 = quantile(hs, 0.75);
  let tall = [], short = [];
  if (hs.length && (stratum === 'high' || stratum === 'medium')) {
    const over = Math.max(2 * q3, q3 + 5);
    tall = known.filter((t) => heightOf(t) > over).sort((a, b) => heightOf(b) - heightOf(a));
  }
  if (hs.length && stratum === 'emergent') {
    const under = q1 / 2;
    short = known.filter((t) => heightOf(t) < under).sort((a, b) => heightOf(a) - heightOf(b));
  }
  return { stratum, n: taxa.length, typical: hs.length ? [q1, q3] : null, tall, short, unknown: taxa.length - known.length };
}

// The marks of a band above 20 plants, spread honestly: one per plant, tallest first, the plants with
// no height last (drawn dashed at the layer's usual height); every mark keeps its true height.
export function markOrder(taxa) {
  return [...taxa].sort((a, b) => (heightOf(b) ?? -1) - (heightOf(a) ?? -1) || a.canonical_name.localeCompare(b.canonical_name));
}
