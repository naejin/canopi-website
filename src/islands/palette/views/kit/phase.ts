// The warnings a plant's marks count (PP-B commit 0, moved from views/tracks.ts; commit 0a' deleted
// tracks.ts with the stage numbers and step only the old screens read; plant-palette-architecture 6):
// StageBar's warnings, drawn in print's side drawing key. A kit leaf: it imports only the core.
import type { Flag, PlantId } from '../../../../lib/palette/index.ts';

// The warnings a plant's marks count: every flag but a low conflict.
export function warningCounts(flags: readonly Flag[]): Map<PlantId, number> {
  const out = new Map<PlantId, number>();
  for (const f of flags) if (!(f.kind === 'conflict' && f.severity === 'low')) out.set(f.id, (out.get(f.id) ?? 0) + 1);
  return out;
}
