// The one verdict engine (PP-B commit 0 seam; plant-palette-architecture 3.2): a verdict per plant for
// one place, one period and one scenario. Reached only through verdict-load.ts loadVerdictRule (its
// own chunk, role `verdict`): no first-run module imports this file. b2 writes the bodies on range.ts,
// future.ts and site.ts (rule L10); until then every plant is "not checked", never "fits".
import type { Conflict } from './conflicts.ts';
import type { PeriodId, PlantId, PlantVerdict, Taxon, VerdictContext } from './types.ts';

// The period a plant is judged for: never later than its own years (future.ts futurePeriod). Seam: b2.
/** @public forward seam for b2, which writes the body and drops the tag. */
export function judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId {
  void taxon;
  return page;
}

/** @public forward seam for b2, which writes the body and drops the tag. */
export function verdict(taxon: Taxon, ctx: VerdictContext): PlantVerdict {
  return { id: taxon.id, judged: judgedPeriod(taxon, ctx.period), ownYears: false, level: 'unknown', limiting: null, factors: [], notes: [] };
}

/** @public forward seam for b2, which writes the body and drops the tag. */
export function verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict> {
  return new Map(taxa.map((t) => [t.id, verdict(t, ctx)]));
}

// Whether a plant stays within its range in a period (P34, P35; b2 builds it on futureCheck).
/** @public forward seam for b2, which writes the body and drops the tag. */
export function holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean {
  void taxon; void ctx; void period;
  return false;
}

// Whether a plant asks before it is added (replaces conflicts.ts asks; c2).
/** @public forward seam for c2, which writes the body and drops the tag. */
export function asksBefore(v: PlantVerdict, conflicts: readonly Conflict[]): boolean {
  void v; void conflicts;
  return false;
}
