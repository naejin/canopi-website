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

// Chromium keeps a failed import() of a URL for the page's life, so a plain second import() never
// fetches: after a failure the next call imports the same hashed file under a fresh URL (?retry=n),
// read from the error (views/lazy.tsx retryable does the same for the views; lib may not import views,
// nor read the browser's location). An error naming no /_astro/ chunk leaves the plain import, which
// fails again (the page then says so).
let loading: Promise<VerdictRule> | null = null, failed: string | null = null, tries = 0;
const chunkOf = (err: unknown): string | null => {
  const url = /https?:\/\/[^\s'"]+?\.js\b/.exec(String((err as Error)?.message ?? err))?.[0] ?? null;
  return url && /\/_astro\/[\w.-]+\.js$/.test(url) ? url : null;
};
export function loadVerdictRule(): Promise<VerdictRule> {
  if (loading) return loading;
  const chunk = failed === null ? import('./verdict.ts') : (import(/* @vite-ignore */ `${failed}?retry=${++tries}`) as Promise<typeof import('./verdict.ts')>);
  // Destructured, so Rollup keeps only these exports of the chunk's facade.
  loading = chunk.then(
    ({ verdicts, holdsBy, asksBefore, judgedPeriod }): VerdictRule => ({ verdicts, holdsBy, asksBefore, judgedPeriod }),
    (err: unknown) => { loading = null; failed ??= chunkOf(err); throw err; },
  );
  return loading;
}
