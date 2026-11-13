// A plant's span as phase numbers (core phaseSpan's first and last), the one spanOf every view reads
// (E6 design check §7.1); views/tracks.ts re-exports it for its pure helpers and their tests. A kit
// leaf: it imports only the core.
import type { PhaseOrd, Taxon } from '../../../../lib/consortium/index.ts';
import { phaseSpan } from '../../../../lib/consortium/index.ts';

// A plant's span as phase numbers, or null when it has no placement yet ("no layer yet").
export function spanOf(t: Taxon): { from: PhaseOrd; to: PhaseOrd } | null {
  const span = phaseSpan(t);
  return span.length ? { from: span[0], to: span[span.length - 1] } : null;
}
// Whether a plant grows in a phase (its span holds it).
export const spans = (t: Taxon, phase: number): boolean => {
  const s = spanOf(t);
  return !!s && s.from <= phase && phase <= s.to;
};
