// P5 seam (commit 0), filled by stream S5e: what SoilGrids makes likely for a site question, offered
// and never prefilled (owner answer 3): "Likely: acid (pH 5.9, SoilGrids) · Use it" while the answer
// stays "Not sure". pH: acid < 6, neutral 6–7.5, alkaline > 7.5; nothing within ±0.3 of a threshold or
// filled more than 2 cells away; texture a hint under Water only; Light and Room never offered.
// Stub: nothing offered.
import type { SiteKey, SiteLookup, Site } from './types.ts';

export interface LikelyOffer<K extends SiteKey = SiteKey> {
  question: K;
  answer: Site[K] | null; // null: a hint only (texture under Water)
  key: string; // consortium.* string key without its prefix
  vars: Record<string, string | number>;
}

export function likelyFor(_question: SiteKey, _lookup: SiteLookup | null): LikelyOffer | null {
  return null;
}
