// The side view's rules (ported from v1 src/scripts/consortium/side.js; design check §2, owner rows
// "Scale" 2026-10-28 and "v2 mockup choices" 2026-11-11). Pure: no DOM, no strings
// (scripts/consortium-tracks.test.mjs). The side view is a slice of one stage column of the matrix:
// the members growing in that stage, drawn at their wild maximum height on one log scale. Layer is
// light, not height, so the drawing never sorts heights into layer bands.
//
// v2 adds two dashed cases: a plant in its first stage (and spanning more) is drawn full size with a
// dashed outline (it is still young), and a plant with no recorded height is drawn dashed at its
// layer's usual height.
import type { PhaseOrd, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { strata } from '../../../lib/consortium/index.ts';
import { spanOf } from './tracks.ts';

// One scale at every size: 0.05 m at the ground, 60 m at the top, logarithmic, so a 0.3 m herb and a
// 40 m linden both read. The lines are drawn at 1 m, 5 m and 20 m.
export const LOG_MIN = 0.05, LOG_MAX = 60;
export const SCALE_LINES = [1, 5, 20] as const;
const SPAN = Math.log(LOG_MAX / LOG_MIN);
// A height as a fraction of the plot's height (0 at the ground, 1 at the top), clamped.
export function heightFrac(m: number | null | undefined): number {
  if (!(typeof m === 'number' && m > 0)) return 0;
  return Math.min(1, Math.max(0, Math.log(m / LOG_MIN) / SPAN));
}

export const heightOf = (t: Taxon): number | null => t.traits.height_m?.max ?? null;

// A plant is drawn as a tree, a shrub, a herb or a climber (its habit). A climber is a vine, never a
// free-standing plant: its recorded size can be a runner's length, never a height it climbs to.
export type Shape = 'tree' | 'shrub' | 'herb' | 'climber';
export function shapeOf(t: Taxon): Shape {
  const habit = t.traits.habit;
  return habit === 'Tree' ? 'tree' : habit === 'Climber' ? 'climber' : habit === 'Shrub' ? 'shrub' : 'herb';
}

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

// Up to this many plants, each is a silhouette in its own numbered column; above, each is a thin mark
// at its true height (the key still names every plant).
export const MAX_SILHOUETTES = 20;

export interface SidePlant {
  taxon: Taxon;
  stratum: Stratum;
  shape: Shape;
  height: number | null; // recorded wild maximum, null when not recorded
  frac: number; // drawn height on the scale (the usual height when not recorded)
  first: boolean; // in its first stage, spanning more: dashed, drawn full size though young
  dashed: boolean; // first or height not recorded
}

// The members growing in one stage, in the order the drawing and its key number them: by layer from
// the top, then tallest first, then by name. Plants with no placement are not drawn.
export function sidePlants(members: readonly Taxon[], stage: PhaseOrd, list: readonly Taxon[] = [], nameOf: (t: Taxon) => string = (t) => t.canonical_name): SidePlant[] {
  const here = members.filter((t) => {
    const s = spanOf(t);
    return t.stratum && s && s.from <= stage && stage <= s.to;
  });
  const out = here.map((t): SidePlant => {
    const stratum = t.stratum!.value, span = spanOf(t)!, height = heightOf(t);
    const first = span.from === stage && span.to > span.from;
    const drawn = height !== null && height > 0 ? height : usualHeight(stratum, here, list);
    return { taxon: t, stratum, shape: shapeOf(t), height: height !== null && height > 0 ? height : null, frac: heightFrac(drawn), first, dashed: first || !(height !== null && height > 0) };
  });
  return out.sort((a, b) => strata.indexOf(a.stratum) - strata.indexOf(b.stratum) || (b.height ?? -1) - (a.height ?? -1) || nameOf(a.taxon).localeCompare(nameOf(b.taxon)));
}

// Where a scale line sits, in percent from the top of the plot.
export const lineTop = (m: number): number => (1 - heightFrac(m)) * 100;
