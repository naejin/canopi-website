// Years of the phases (PP-B commit 0; plant-palette-architecture 3.3): the one table of how many years
// after planting each phase covers, and a plant's years and span from its placement. phaseOrd moved
// here from matrix.ts, spanOf and spans from views/kit/span.ts (deleted) and views/tracks.ts (which
// re-exports them until b3 deletes it). Phase words stay in the locale files for Details.
import type { Phase, PhaseOrd, Taxon } from './types.ts';
import { phases } from './types.ts';
import { phaseSpan } from './jobs.ts';

// Years after planting, [from, to) per PhaseOrd 0..6; null: no end (climax).
export const PHASE_YEARS = [[0, 0.25], [0.25, 1], [1, 3], [3, 15], [15, 25], [25, 60], [60, null]] as const satisfies readonly (readonly [number, number | null])[];
// Owner: gaps under one year and after 60 years are not raised as holes.
export const JUDGED_FROM_YEAR = 1;
export const JUDGED_TO_YEAR = 60;

export const phaseOrd = (p: Phase): PhaseOrd => phases.indexOf(p) as PhaseOrd;
// The time step a year starts (end false) or ends (end true) on; a year past 60 (null) ends the last.
export const phaseOfYear = (y: number | null, end = false): PhaseOrd =>
  (y === null ? PHASE_YEARS.length - 1 : Math.max(0, PHASE_YEARS.findIndex((p) => p[end ? 1 : 0] === y))) as PhaseOrd;

// A plant's span as phase numbers (core phaseSpan's first and last), or null when it has no placement
// yet ("no layer yet"): the one spanOf every view reads (E6 design check §7.1).
export function spanOf(t: Taxon): { from: PhaseOrd; to: PhaseOrd } | null {
  const span = phaseSpan(t);
  return span.length ? { from: span[0], to: span[span.length - 1] } : null;
}
// Whether a plant grows in a phase (its span holds it).
export const spans = (t: Taxon, phase: number): boolean => {
  const s = spanOf(t);
  return !!s && s.from <= phase && phase <= s.to;
};

// The years a plant stands in, from the start of the first stage it is present in to the end of the
// last (null: it lasts past 60 years); null when it has no placement yet.
export function yearsOf(t: Taxon): { from: number; to: number | null } | null {
  const s = spanOf(t);
  return s ? { from: PHASE_YEARS[s.from][0], to: PHASE_YEARS[s.to][1] } : null;
}
