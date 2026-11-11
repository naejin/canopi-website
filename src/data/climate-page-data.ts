// P5 commit 0: what the consortium page hands the island about the canopi-climate tiles (#ct-climate,
// ConsortiumPage.astro), so the location reader (S5b) knows which tiles exist without fetching the
// index and without editing the page: the base path and each layer's tile names, in the shape
// lib/climate siteIndex() reads. No sizes, no hashes (the build checks those: check-built-site.mjs).
// About 1.3 KB gzip on climate 0.2.0; the budget leaves room for a finer grid.
const LAYERS = ['climate', 'soil', 'regions'] as const;
export const CLIMATE_PAGE_DATA_GZIP_BUDGET = 2048;

export interface ClimatePageData { base: string; layers: Record<(typeof LAYERS)[number], { tiles: string[] }> }
interface IndexLike { base?: unknown; layers?: Partial<Record<string, { tiles?: Record<string, number> | readonly string[] }>> }

export function climatePageData(index: IndexLike | null): ClimatePageData | null {
  if (!index || typeof index.base !== 'string' || !index.layers || !LAYERS.every((l) => index.layers?.[l]?.tiles)) return null;
  const names = (t: Record<string, number> | readonly string[]) => (Array.isArray(t) ? [...t] : Object.keys(t)).sort();
  return {
    base: index.base,
    layers: Object.fromEntries(LAYERS.map((l) => [l, { tiles: names(index.layers![l]!.tiles!) }])) as ClimatePageData['layers'],
  };
}
