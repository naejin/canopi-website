// P5 commit 0: what the consortium page hands the island about the canopi-climate tiles (#ct-climate,
// PalettePage.astro), so the location reader (S5b) knows which tiles exist without fetching the
// index and without editing the page: the base path and each layer's tile names, in the shape
// lib/climate siteIndex() reads. No sizes, no hashes (the build checks those: check-built-site.mjs).
// About 1.9 KB gzip on climate 0.7.0 (all 12 layers + analogues flag), staying under 2 KB gzip.
import { ALL_LAYERS, LAYERS } from '../lib/climate/model.js';

const CORE_LAYERS = Object.keys(LAYERS) as Array<keyof typeof LAYERS>;
const ALL_LAYER_KEYS = Object.keys(ALL_LAYERS) as Array<keyof typeof ALL_LAYERS>;
export const CLIMATE_PAGE_DATA_GZIP_BUDGET = 2048;

export interface ClimatePageData {
  base: string;
  layers: Partial<Record<keyof typeof ALL_LAYERS, { tiles: string[] }>> &
    Record<keyof typeof LAYERS, { tiles: string[] }>;
  analogues?: boolean;
}
interface IndexLike {
  base?: unknown;
  analogues?: unknown;
  layers?: Partial<Record<string, { tiles?: Record<string, number> | readonly string[] }>>;
}

export function climatePageData(index: IndexLike | null): ClimatePageData | null {
  if (!index || typeof index.base !== 'string' || !index.layers || !CORE_LAYERS.every((l) => index.layers?.[l]?.tiles)) return null;
  const names = (t: Record<string, number> | readonly string[]) => (Array.isArray(t) ? [...t] : Object.keys(t)).sort();
  const layers = Object.fromEntries(
    ALL_LAYER_KEYS
      .filter((l) => index.layers?.[l]?.tiles)
      .map((l) => [l, { tiles: names(index.layers![l]!.tiles!) }]),
  ) as ClimatePageData['layers'];
  return {
    base: index.base,
    layers,
    ...(index.analogues ? { analogues: true } : {}),
  };
}
