// Plant heights on the drawing's one log scale (moved from views/side.ts in PP-B, b2): pure, no DOM, no
// strings. Print's side drawing and the palette page's pictures read them (scripts/consortium-print.test.mjs).
import type { Stratum, Taxon } from '../../../lib/palette/index.ts';

// One scale at every size: 0.05 m at the ground, 60 m at the top, logarithmic, so a 0.3 m herb and a
// 40 m linden both read. The lines are drawn at 1 m, 5 m and 20 m.
const LOG_MIN = 0.05;
export const LOG_MAX = 60;
export const SCALE_LINES = [1, 5, 20] as const;
const SPAN = Math.log(LOG_MAX / LOG_MIN);
// A height as a fraction of the plot's height (0 at the ground, 1 at the top), clamped.
export function heightFrac(m: number | null | undefined): number {
  if (!(typeof m === 'number' && m > 0)) return 0;
  return Math.min(1, Math.max(0, Math.log(m / LOG_MIN) / SPAN));
}

export const heightOf = (t: Taxon): number | null => t.traits.height_m?.max ?? null;

// The quantile p of sorted numbers (Hyndman-Fan type 6), clamped to the ends for short lists.
export function quantile(sorted: readonly number[], p: number): number | null {
  if (!sorted.length) return null;
  const pos = Math.min(sorted.length - 1, Math.max(0, p * (sorted.length + 1) - 1)), lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// A layer's usual height, where a plant with no height is drawn (dashed): the median of the heights
// known among the plants drawn in that layer, else in the climate list's layer, else a fixed height.
export const FALLBACK_HEIGHT: Record<Stratum, number> = { emergent: 20, high: 6, medium: 1.5, low: 0.3 };
export function usualHeight(stratum: Stratum, drawn: readonly Taxon[], list: readonly Taxon[] = []): number {
  for (const set of [drawn, list]) {
    const hs = set.filter((t) => t.stratum?.value === stratum).map(heightOf).filter((h): h is number => h !== null && h > 0).sort((a, b) => a - b);
    if (hs.length) return quantile(hs, 0.5)!;
  }
  return FALLBACK_HEIGHT[stratum];
}

