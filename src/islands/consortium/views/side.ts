// The side view's rules (ported from v1 src/scripts/consortium/side.js; design check §2, owner rows
// "Scale" 2026-10-28 and "v2 mockup choices" 2026-11-11). Pure: no DOM, no strings
// (scripts/consortium-print.test.mjs). The side view, print's drawing since PP-B commit 0a', is a slice
// of one stage: the members growing in that stage, drawn at their wild maximum height on one log scale. Layer is
// light, not height, so the drawing never sorts heights into layer bands.
//
// v2 adds two dashed cases: a plant in its first stage (and spanning more) is drawn full size with a
// dashed outline (it is still young), and a plant with no recorded height is drawn dashed at its
// layer's usual height.
import type { PhaseOrd, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { spanOf, strata } from '../../../lib/consortium/index.ts';
import type { Order } from './kit/names.ts';
import { heightFrac, heightOf, usualHeight } from '../rules/heights.ts';

// A plant is drawn as a tree, a shrub, a herb or a climber (its habit). A climber is a vine, never a
// free-standing plant: its recorded size can be a runner's length, never a height it climbs to.
export type Shape = 'tree' | 'shrub' | 'herb' | 'climber';
export function shapeOf(t: Taxon): Shape {
  const habit = t.traits.habit;
  return habit === 'Tree' ? 'tree' : habit === 'Climber' ? 'climber' : habit === 'Shrub' ? 'shrub' : 'herb';
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
export function sidePlants(members: readonly Taxon[], stage: PhaseOrd, list: readonly Taxon[] = [], byName: Order = (a, b) => a.canonical_name.localeCompare(b.canonical_name)): SidePlant[] {
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
  return out.sort((a, b) => strata.indexOf(a.stratum) - strata.indexOf(b.stratum) || (b.height ?? -1) - (a.height ?? -1) || byName(a.taxon, b.taxon));
}

// Where a scale line sits, in percent from the top of the plot.
export const lineTop = (m: number): number => (1 - heightFrac(m)) * 100;
