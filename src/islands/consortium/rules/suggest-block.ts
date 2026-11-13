// "Can Suggest now" (E6 R2; design check §7.1): why a Suggest for a climate would refuse, the pool
// counts Start says under the climate cards, and "nothing fits". Pure functions over core types
// (ADR-1: rules import the core only); the store's signals and the page's curated climates come in as
// arguments (views/PoolSlot.tsx, store.ts suggestMembers). scripts/consortium-rules.test.mjs runs them.
//
// A climate has a list to suggest from when it is curated, or borrows a nearest list (core
// placement.ts NEAREST_LISTS) once the site location has a climate: only the range rule fits a
// borrowed pool to a real place (decision row "P5 fixes from the UX audit" (1)).
import type { ClimateZone, RangeRule, RangeVerdict, SiteLocation, Taxon } from '../../../lib/consortium/index.ts';
import { hasPlants } from '../../../lib/consortium/index.ts';

// What the rule reads. curated: the climates the export curates (the page's list); siteClimate: the
// site location has a climate (store.siteClimate); rangeFailed: the range rule's chunk did not load
// while one asks for it (store.rangeFailed); nothingFits: see nothingFits below.
export interface SuggestScene { curated: readonly ClimateZone[]; siteClimate: boolean; rangeFailed: boolean; nothingFits: boolean }

// Nothing fits: a list with plants, none of which holds the site (the range rule loaded). Start then
// offers no "Suggest plants" (it could only give an empty matrix); the panel's "Search all plants" is
// the step.
export const nothingFits = (list: Taxon[] | null, site: SiteLocation | null, rule: RangeRule | null): boolean =>
  !!rule && !!list?.length && rule.withinRange(list, site).length === 0;

const borrows = (z: ClimateZone, s: SuggestScene): boolean => hasPlants(z, s.curated) && !s.curated.includes(z);
// A borrowed climate without a site climate: the climate needs the site's location.
export const needsSite = (z: ClimateZone, s: SuggestScene): boolean => borrows(z, s) && !s.siteClimate;
// A borrowed climate whose range rule did not load: the same reason holds, so no palette either.
export const needsRule = (z: ClimateZone, s: SuggestScene): boolean => borrows(z, s) && s.rangeFailed;
// The climate has plants to suggest from now (its card says Ready).
export const hasList = (z: ClimateZone, s: SuggestScene): boolean => hasPlants(z, s.curated) && !needsSite(z, s) && !needsRule(z, s);

// The lasting refusals of store.suggestMembers, or null when a Suggest can act. Its passing ones (the
// pool or, with a site climate, the range rule still being read; a kept guest's list still being
// read) are waited for, not refused.
export type SuggestBlock = 'noList' | 'needsSite' | 'needsRule' | 'nothingFits';
export const suggestBlock = (z: ClimateZone, s: SuggestScene): SuggestBlock | null =>
  !hasPlants(z, s.curated) ? 'noList' : needsSite(z, s) ? 'needsSite' : needsRule(z, s) ? 'needsRule' : s.nothingFits ? 'nothingFits' : null;

// The pool under the climate cards (views/pool/pool.tsx): how many of its plants fit the site (not
// outside their observed range), how many of those are near the edge, of how many.
export function poolCounts(verdicts: readonly RangeVerdict[]): { fit: number; edge: number; total: number } {
  let fit = 0, edge = 0;
  for (const v of verdicts) { if (v !== 'outside') fit++; if (v === 'edge') edge++; }
  return { fit, edge, total: verdicts.length };
}
