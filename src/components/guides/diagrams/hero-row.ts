// What the row of drawings under a guide's title shows, by its section (guideDomains in
// src/i18n/guides.ts): a crops guide shows its own crop's seed. Typed over every section, so a section
// with no motif fails `npm run check`; scripts/guides.test.mjs (npm test) checks it too, and
// heroMotif() fails the build for a crops guide with no seed kind. Drawn by GuideHeroRow.astro.
import type { GuideDomain } from '../../../i18n/guides';

export const heroMotifs = ['beans', 'kernels', 'squash-seeds', 'grains', 'tomato-seeds', 'cloves', 'leaves', 'autumn-leaves', 'insects', 'kernels-and-beans', 'soil-crumbs'] as const;
export type HeroMotif = (typeof heroMotifs)[number];
export type CropSeed = Extract<HeroMotif, 'kernels' | 'squash-seeds' | 'beans' | 'grains' | 'tomato-seeds' | 'cloves'>;

export const domainMotifs: Record<GuideDomain, HeroMotif | 'crop-seed'> = {
  seeds: 'beans',
  crops: 'crop-seed',
  soil: 'soil-crumbs',
  perennials: 'leaves',
  seasons: 'autumn-leaves',
  pests: 'insects',
  kitchen: 'kernels-and-beans',
};

// Each crops guide's own seed, by slug.
export const cropSeeds: Record<string, CropSeed> = {
  corn: 'kernels',
  'squash-melons-cucumbers': 'squash-seeds',
  'beans-and-legumes': 'beans',
  'small-grains': 'grains',
  tomatoes: 'tomato-seeds',
  'true-seed-potato-garlic-sunroot': 'cloves',
};

export function heroMotif(domain: GuideDomain, slug: string): HeroMotif {
  const motif = domainMotifs[domain];
  if (motif === undefined) throw new Error(`hero-row.ts: no hero motif for the "${domain}" section`);
  if (motif !== 'crop-seed') return motif;
  const seed = cropSeeds[slug];
  if (seed === undefined) throw new Error(`hero-row.ts: the crops guide "${slug}" needs its seed kind in cropSeeds`);
  return seed;
}
