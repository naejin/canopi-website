// The stage helpers every view shares (PP-B commit 0, moved from views/tracks.ts, which re-exports
// them until b3 deletes it; plant-palette-architecture 6): the seven stage numbers, one stage step,
// and the warnings a plant's chip or row counts. A kit leaf: it imports only the core.
import type { Flag, PhaseOrd, PlantId } from '../../../../lib/consortium/index.ts';

export const PHASE_ORDS: readonly PhaseOrd[] = [0, 1, 2, 3, 4, 5, 6];

// One stage earlier or later, kept within the seven.
export const stepStage = (stage: number, delta: number): PhaseOrd => Math.min(6, Math.max(0, stage + delta)) as PhaseOrd;

// The warnings a plant's chip and row count: every flag but a low conflict.
export function warningCounts(flags: readonly Flag[]): Map<PlantId, number> {
  const out = new Map<PlantId, number>();
  for (const f of flags) if (!(f.kind === 'conflict' && f.severity === 'low')) out.set(f.id, (out.get(f.id) ?? 0) + 1);
  return out;
}
