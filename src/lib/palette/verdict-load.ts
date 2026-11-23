// The verdict rule's loader (PP-B commit 0 seam; plant-palette-architecture 2, ADR-1 statement): the
// one way the page reaches verdict.ts, through import(), so the rule stays in its own chunk (role
// `verdict`, scripts/built-modules.mjs ROLE_ENTRIES) and off the first run. A failed load is never
// cached: the next call tries again (retry-import.ts).
import type { PeriodId, PlantId, PlantVerdict, Taxon, VerdictContext } from './types.ts';
import { retryableImport } from './retry-import.ts';
import type { HoldCounts, HoldState, LaterLoss } from './verdict.ts';

export interface VerdictRule {
  verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict>;
  holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean;
  judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId;
  // The hold predicates (verdict.ts holdStatesOf, laterLossOf, holdCounts; M29): each candidate's hold
  // state at a period, what a later period's climate takes from a member, and the counts of a state map.
  holdStates(taxa: readonly Taxon[], ctx: VerdictContext, period: PeriodId): Map<PlantId, HoldState>;
  laterLoss(now: PlantVerdict | null, laters: readonly PlantVerdict[]): LaterLoss | null;
  holdCounts(states: ReadonlyMap<PlantId, HoldState>, ids: readonly PlantId[]): HoldCounts;
}

// A failed load is tried again under a fresh URL (retry-import.ts, shared with the views' parts).
export const loadVerdictRule: () => Promise<VerdictRule> = retryableImport(
  () => import('./verdict.ts'),
  ({ verdicts, holdsBy, judgedPeriod, holdStatesOf, laterLossOf, holdCounts }): VerdictRule => ({
    verdicts, holdsBy, judgedPeriod, laterLoss: laterLossOf, holdCounts,
    holdStates: (taxa, ctx, period) => holdStatesOf({ verdicts, holdsBy }, taxa, ctx, period),
  }),
);
