// The verdict rule's loader (PP-B commit 0 seam; plant-palette-architecture 2, ADR-1 statement): the
// one way the page reaches verdict.ts, through import(), so the rule stays in its own chunk (role
// `verdict`, scripts/built-modules.mjs ROLE_ENTRIES) and off the first run. A failed load is never
// cached: the next call tries again (as marks.ts loadRangeRule). Outlives marks.ts (deleted in c2).
import type { PeriodId, PlantId, PlantVerdict, Taxon, VerdictContext } from './types.ts';
import type { Conflict } from './conflicts.ts';

export interface VerdictRule {
  verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict>;
  holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean;
  asksBefore(v: PlantVerdict, conflicts: readonly Conflict[]): boolean;
  judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId;
}

let loading: Promise<VerdictRule> | null = null;
export function loadVerdictRule(): Promise<VerdictRule> {
  // Destructured, so Rollup keeps only these exports of the chunk's facade.
  loading ??= import('./verdict.ts').then(
    ({ verdicts, holdsBy, asksBefore, judgedPeriod }): VerdictRule => ({ verdicts, holdsBy, asksBefore, judgedPeriod }),
    (err: unknown) => { loading = null; throw err; },
  );
  return loading;
}
