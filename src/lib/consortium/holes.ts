// Holes and the plants that fill them (PP-B commit 0 seam; plant-palette-architecture 3.3). Imports
// verdict types only (never verdict.ts or suggest.ts: no cycle). Off the first run: the palette chunk
// computes holes from memberVerdicts, poolVerdicts and verdictContext. b2 writes holes, nextStep,
// fills and fillers (absorbing jobs.ts jobGapsByPhase); F3 and F5 insert their kinds into HOLE_ORDER.
import type { Hole, HoleKind, HoleRank } from './types.ts';

// Rank (concept.md "Rules"), one row per kind and extent, in order: 1 a whole job nobody does, 2 a
// whole light level nobody fills, 3 flowering (two months or more), 4 a job or light level empty for
// part of the years, 5 cool season, 6 soil. A hole's rank is read from here, never a literal.
export const HOLE_ORDER: readonly { kind: HoleKind; whole?: boolean; rank: HoleRank }[] = [
  { kind: 'job', whole: true, rank: 1 },
  { kind: 'light', whole: true, rank: 2 },
  { kind: 'flowering', rank: 3 },
  { kind: 'job', whole: false, rank: 4 },
  { kind: 'light', whole: false, rank: 4 },
  { kind: 'cool', rank: 5 },
  { kind: 'soil', rank: 6 },
];

// The rank of a hole of `kind`, whole (every judged year) or for part of the years.
/** @public forward seam for b2, which drops the tag. */
export function holeRank(kind: HoleKind, whole: boolean): HoleRank {
  const row = HOLE_ORDER.find((r) => r.kind === kind && (r.whole === undefined || r.whole === whole));
  return row ? row.rank : 6;
}

// The next hole to fill: the first open one in rank order (b2: never one a suggestion filled).
/** @public forward seam for b2, which writes the body and drops the tag. */
export function nextStep(list: readonly Hole[]): Hole | null {
  return list.find((h) => h.state === 'open') ?? null;
}
