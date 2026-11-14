// The verdict rule's loader (PP-B commit 0 seam; plant-palette-architecture 2, ADR-1 statement): the
// one way the page reaches verdict.ts, through import(), so the rule stays in its own chunk (role
// `verdict`, scripts/built-modules.mjs ROLE_ENTRIES) and off the first run. A failed load is never
// cached: the next call tries again (retry-import.ts). Outlives marks.ts (deleted in c2).
import type { PeriodId, PlantId, PlantVerdict, Taxon, VerdictContext } from './types.ts';
import { retryableImport } from './retry-import.ts';

export interface VerdictRule {
  verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict>;
  holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean;
  judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId;
}

// A failed load is tried again under a fresh URL (retry-import.ts, shared with the views' parts).
export const loadVerdictRule: () => Promise<VerdictRule> = retryableImport(
  () => import('./verdict.ts'),
  ({ verdicts, holdsBy, judgedPeriod }): VerdictRule => ({ verdicts, holdsBy, judgedPeriod }),
);
