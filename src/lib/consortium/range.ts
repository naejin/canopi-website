// P5 seam (commit 0), filled by stream S5c: whether a plant's observed climate range holds the site
// (owner answer 2, 2026-11-11): coldest-month minimum on both sides and warmest-month maximum on the
// hot side, with a 2 °C margin beyond Q05/Q95; between the percentile and the margin "near the edge";
// aridity a mark only; no range "range not recorded" (unknown), never filtered.
// Stub: 'unknown' for every plant, so nothing is filtered or marked until S5c lands.
import type { Mark, SiteLocation, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';

export const rangeVerdicts = ['inside', 'edge', 'outside', 'unknown'] as const;
export type RangeVerdict = (typeof rangeVerdicts)[number];

export function rangeFit(_taxon: Taxon, _site: SiteLocation | null): RangeVerdict {
  return 'unknown';
}

// The matrix and Add marks of the range check (marks.ts provider). Stub: none.
export function rangeMarks(_taxon: Taxon, _ctx: MarkContext): Mark[] {
  return [];
}
