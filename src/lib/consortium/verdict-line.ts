// The words of verdicts, holes and year spans (PP-B commit 0 seam; plant-palette-architecture 3.2): the
// only places that put them into a Line (an i18n key under consortium.line., its variables and the
// count P() reads). A leaf, first-run safe. Signatures in commit 0; b2 writes the bodies and the keys.
import type { Hole, Line, PlantVerdict } from './types.ts';

/** @public forward seam for b2, which writes the body and drops the tag. */
export function fitLine(v: PlantVerdict): Line {
  return { key: `consortium.line.${v.level}`, vars: {} };
}

/** @public forward seam for b2, which writes the body and drops the tag. */
export function holeLine(h: Hole): Line {
  return { key: `consortium.line.hole.${h.kind}`, vars: { from: h.fromYear, to: h.toYear } };
}

/** @public forward seam for b2, which writes the body and drops the tag. */
export function yearsLine(from: number, to: number | null): Line {
  return to === null ? { key: 'consortium.line.yearsFrom', vars: { from } } : { key: 'consortium.line.years', vars: { from, to } };
}
