// "Things to weigh" (PP-B commit 0 seam; plant-palette-architecture 2, inventory P39): one family,
// water needs, soil hints from PP-F. b3 writes the body; off the first run (palette chunk).
import type { Taxon, WeighLine } from './types.ts';

/** @public forward seam for b3, which writes the body and drops the tag. */
export function weighLines(members: readonly Taxon[]): WeighLine[] {
  void members;
  return [];
}
