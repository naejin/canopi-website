// "Can Suggest now" (E6 R2; design check §7.1): why a Suggest for a climate would refuse, and "nothing
// fits" (views/pool/pool.tsx shows its state; the count line itself reads store.countFits, PP-B b1b). Pure functions over core types
// (ADR-1: rules import the core only); the store's signals and the page's curated climates come in as
// arguments (views/PoolSlot.tsx, store.ts suggestMembers). scripts/consortium-p5-seams-s5c.test.mjs runs them.
//
// A climate has a list to suggest from when it is curated, or borrows a nearest list (core
// placement.ts NEAREST_LISTS) once the site location has a climate: only the range rule fits a
// borrowed pool to a real place (decision row "P5 fixes from the UX audit" (1)).
import type { ClimateZone, PlantId, PlantVerdict, Taxon } from '../../../lib/consortium/index.ts';
import { hasPlants } from '../../../lib/consortium/index.ts';

// What the rule reads. curated: the climates the export curates (the page's list); siteClimate: the
// site location has a climate (store.siteClimate); rangeFailed: the range rule's chunk did not load
// while one asks for it (store.rangeFailed); nothingFits: see nothingFits below.
export interface SuggestScene { curated: readonly ClimateZone[]; siteClimate: boolean; rangeFailed: boolean; nothingFits: boolean }

// The verdicts the rules read (store.poolVerdicts: the page period's, null until the verdict rule is in).
type Verdicts = ReadonlyMap<PlantId, PlantVerdict> | null;
// Nothing fits: a list with plants, every one judged outside for the page period (store.countFits says
// "none fit" from the same verdicts). Place then offers no "Start from a small suggested palette" (it
// could only give an empty palette); the nothing-fits state's "Search all plants" is the step.
export const nothingFits = (list: Taxon[] | null, verdicts: Verdicts): boolean =>
  !!verdicts && !!list?.length && list.every((t) => verdicts.get(t.id)?.level === 'outside');
// What suggestions and lists draw from (P5 S5c, owner answer 2; one verdict since PP-C c2): the list
// less the plants judged outside, except those in keep (a plant added anyway stays the reader's). The
// same array when none is left out (no verdicts, or none outside), so caches keyed on it hold.
export function notOutside(list: Taxon[], verdicts: Verdicts, keep: readonly PlantId[] = []): Taxon[] {
  if (!verdicts) return list;
  const kept = new Set(keep);
  const out = list.filter((t) => kept.has(t.id) || verdicts.get(t.id)?.level !== 'outside');
  return out.length === list.length ? list : out;
}

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

// Place's count line for the chosen list's verdicts (store.countFits; PP-B b1b fix round 1, b1br-1):
// never "0 of m". Some fit or need a second look: the count; none, every plant judged outside: none
// fit; none known to fit with some not checked (no climate figures for the period, or no range
// recorded): not checked, never "none fit".
export type CountKind = 'count' | 'none' | 'unchecked';
export const countKind = (n: { fits: number; look: number; unknown: number }): CountKind =>
  n.fits + n.look > 0 ? 'count' : n.unknown > 0 ? 'unchecked' : 'none';
