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

// A plant is drawn as a tree, a shrub, a herb or a climber (its habit). A climber is never drawn as a
// free-standing plant: it is a vine. The habit takes in trailing plants too, so its height is the recorded
// size (a runner's length for a squash), never a height it climbs to
// (coordinator choice, chunk C review S8/V9).
export const isClimber = (t) => t.traits?.habit === 'Climber';
export function shapeOf(t) {
  const habit = t.traits?.habit;
  if (habit === 'Tree') return 'tree';
  if (habit === 'Climber') return 'climber';
  if (habit === 'Shrub') return 'shrub';
  return 'herb';
}

// The quantile p of sorted numbers, interpolated between ranks at p × (n + 1) (Hyndman-Fan type 6,
// a spreadsheet's QUARTILE.EXC), clamped to the ends for short lists: the q1 and q3 of the exceptions'
// thresholds (design-scale.md §2.3) and of the "Most" range before its ends are snapped.
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

// What a band spells out (M1; chunk C review S1/V1): its plants, the named exceptions (High and Mid:
// taller than max(2 × q3, q3 + 5 m), tallest first; Emergent: shorter than q1 / 2, shortest first;
// q1 and q3 of the band's known heights, climbers aside), its climbing or trailing plants (tallest
// first: their recorded size is no typical height), then "Most a–b m": the middle half of the
// heights not named, each end snapped to a real plant height, so the range never spans a gap no
// plant is in. A band with SMALL_BAND known heights or fewer lists them all (`all`, tallest first; its climbing or
// trailing plants still apart).
// Plants with no height are counted, never dropped.
export const SMALL_BAND = 4;
const desc = (a, b) => heightOf(b) - heightOf(a);
const nearest = (hs, x) => hs.reduce((p, c) => (Math.abs(c - x) < Math.abs(p - x) ? c : p));
export function bandFacts(stratum, taxa) {
  const known = taxa.filter((t) => heightOf(t) > 0);
  const facts = { stratum, n: taxa.length, typical: null, tall: [], short: [], climbers: [], all: [], unknown: taxa.length - known.length };
  // Climbing or trailing plants are always named apart, in a small band too (review X2): their recorded
  // size is never a plain height.
  const climbers = known.filter(isClimber).sort(desc), rest = known.filter((t) => !isClimber(t));
  if (known.length <= SMALL_BAND) return { ...facts, all: [...rest].sort(desc), climbers };
  const hs = rest.map(heightOf).sort((a, b) => a - b);
  let tall = [], short = [];
  if (hs.length && (stratum === 'high' || stratum === 'medium')) {
    const q3 = quantile(hs, 0.75), over = Math.max(2 * q3, q3 + 5);
    tall = rest.filter((t) => heightOf(t) > over).sort(desc);
  }
  if (hs.length && stratum === 'emergent') {
    const under = quantile(hs, 0.25) / 2;
    short = rest.filter((t) => heightOf(t) < under).sort((a, b) => heightOf(a) - heightOf(b));
  }
  const named = new Set([...tall, ...short]);
  const mid = rest.filter((t) => !named.has(t)).map(heightOf).sort((a, b) => a - b);
  const typical = mid.length ? [nearest(mid, quantile(mid, 0.25)), nearest(mid, quantile(mid, 0.75))] : null;
  return { ...facts, typical, tall, short, climbers };
}

// Marks are dense (no gap between them, every other one another shade) only when they are too narrow
// for a 1 px gap at the width they are drawn (review S6/V6): the app decides it in the browser.
export const MIN_PITCH = 3;
export function denseAt(width, n) { return n > 0 && width > 0 && width / n < MIN_PITCH; }

// The marks of a band above 20 plants, spread honestly: one per plant, tallest first, the plants with
// no height last (drawn dashed at the layer's usual height); every mark keeps its true height.
export function markOrder(taxa) {
  return [...taxa].sort((a, b) => (heightOf(b) ?? -1) - (heightOf(a) ?? -1) || a.canonical_name.localeCompare(b.canonical_name));
}
