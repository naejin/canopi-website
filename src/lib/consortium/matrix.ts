// The cells of a plant on the old strata × phases grid (stream S1; the matrix screen and its
// builder were deleted in PP-B commit 0a', owner "Delete first"). What is left serves two readers
// until they move: Suggest's gain (suggest.ts, until b1b scores open holes through holes.ts `fills`)
// and Swap's "Also fills" (until PP-C c2), then the file goes.
import type { CellRef, Stratum, Taxon } from './types.ts';
import { strata } from './types.ts';
import { phaseSpan } from './jobs.ts';

// The cells a plant fills: its stratum in each phase of its span, in phase order.
export function cellsOf(taxon: Taxon): CellRef[] {
  const s = taxon.stratum?.value;
  return s ? phaseSpan(taxon).map((p) => [s, p] as const) : [];
}

export const cellKey = (stratum: Stratum, phase: number): number => strata.indexOf(stratum) * 7 + phase;
