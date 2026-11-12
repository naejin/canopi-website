// Stream S5c: whether a plant's observed climate range holds the site (owner answer 2, 2026-11-11).
// The site's today values (the climate reader's historical period) against the plant's observed
// range (Taxon.climate, GBIF cells, cultivation included), through the bounds of RANGE_BOUNDS: the
// coldest-month minimum on the cold side, and on the mild side for a plant that can need winter chill
// (never for an annual), and the warmest-month maximum on the hot side. Beyond the Q05/Q95 percentile
// by more than RANGE_MARGIN_C: 'outside' (left out of suggestions and lists, still addable with a
// warning); beyond it by up to the margin: 'edge' ("near the edge of its observed range"). Aridity is
// a mark only and never changes the verdict. No range: 'unknown' ("range not recorded"), never
// filtered. No site climate (no location, its lookup loading or failed, open sea): nothing is checked.
//
// Owner, decision row "Climate ranges fixed before the P5 push" (2026-11-12):
// - Winter chill. A mild winter limits only a plant that can need winter chill. In the Utah chill
//   model (Richardson et al. 1974) an hour at 12.5–15.9 °C adds no chill and one above 16 °C takes
//   some away, so a site whose coldest month's mean daily minimum is at or above CHILL_CEILING_C
//   (12.5 °C) has, on average, no chilling nights in any month. A plant recorded in such places for
//   the warmest 5 % of its cells (tmin_cold Q95 ≥ 12.5 °C) grows there without winter chill, so the mild
//   side is not checked for it (canNeedChill). On the 515-plant export the Q95s split there: below it
//   apple 4.4, peach 9.4, almond 9.8, olive 10.7; from it loquat 14.7, Opuntia 16, then the lowland
//   tropics at 20–25 (cacao and cassava 23.9), which were "edge" at Manaus and Singapore before.
// - Annuals. An annual is sown in the season that suits it: beyond its heat range (the warmest-month
//   maximum past Q95 by more than the margin) it is not outside but advised to the cool season
//   (coolSeason: "Too hot in summer here: grow it in the cool season."); within the margin it is near
//   the edge, as any plant. It never has the winter sides ("Annuals skip the winter-cold check").
import type { PlantId, SiteLocation, SitePeriod, Taxon } from './types.ts';
import { siteToday } from './site-today.ts';

// siteToday lives in its own module so the first run can ask "has the site a climate?" without the
// rule, which loads with the pool feature chunk (store.ts rangeRule).
export { siteToday };

export const rangeVerdicts = ['inside', 'edge', 'outside', 'unknown'] as const;
export type RangeVerdict = (typeof rangeVerdicts)[number];
// Which bound the site passes: colder winters than recorded, milder winters, hotter summers.
export type RangeSide = 'cold' | 'mild' | 'hot';
// The site's aridity index (precipitation / PET; lower is drier) against the plant's: a mark only.
// 'not-checked': the site has none (ice); 'unknown': the plant has none recorded.
export type AridityFit = 'inside' | 'drier' | 'wetter' | 'not-checked' | 'unknown';
// sides: every bound the site passes; beyond: those it passes by more than the margin.
// coolSeason: an annual beyond its heat range (header), advised to the cool season instead.
export interface RangeCheck { verdict: RangeVerdict; sides: RangeSide[]; beyond: RangeSide[]; aridity: AridityFit; coolSeason: boolean }

export const RANGE_MARGIN_C = 2;
export const CHILL_CEILING_C = 12.5;

// The temperature bounds the rule checks, in one place: the plant's range (a TaxonClimate field, read
// from the export variable named in types.ts RANGE_VARIABLES), which end of it, and the site value it
// is compared with (a SitePeriod field, read from the climate tiles). future.ts checks the 'hot' bound
// through this list too. A new bound (a warmth low bound, once canopi-data exports it) is one row here,
// one in RANGE_VARIABLES, its RangeSide and its site value.
export interface RangeBound {
  side: RangeSide;
  range: 'tminCold' | 'tmaxWarm';
  end: 'low' | 'high';
  site: 'tminColdC' | 'tmaxWarmC';
  // Whether the bound applies to the plant at all.
  applies: (taxon: Taxon) => boolean;
}

// The one comparison of the rule, today's check and the future one (future.ts) alike: whether value
// passes bound ('below': under a low bound; 'above': over a high one), and by more than the margin.
// In hundredths of a degree (site values have one decimal, ranges two), so that 9.8 − 7.8 is exactly
// the margin rather than a float a hair above it.
export type Passed = 'inside' | 'edge' | 'beyond';
export function passes(value: number, bound: number, side: 'below' | 'above'): Passed {
  const cents = Math.round((side === 'below' ? bound - value : value - bound) * 100);
  return cents <= 0 ? 'inside' : cents > RANGE_MARGIN_C * 100 ? 'beyond' : 'edge';
}

export const isAnnual = (taxon: Taxon): boolean => taxon.traits?.is_annual === true;
// Whether a mild winter can limit the plant (header, "Winter chill"): its tmin_cold Q95 is below the
// ceiling. No Q95 recorded: nothing to compare.
export function canNeedChill(taxon: Taxon): boolean {
  const high = taxon.climate?.tminCold?.high;
  return high != null && high < CHILL_CEILING_C;
}

// HOT_BOUND is named for future.ts (a plain constant: a lookup call at module level would count as a
// side effect and pull this rule into the island's first chunk).
export const HOT_BOUND: RangeBound = { side: 'hot', range: 'tmaxWarm', end: 'high', site: 'tmaxWarmC', applies: () => true };
export const RANGE_BOUNDS: readonly RangeBound[] = [
  { side: 'cold', range: 'tminCold', end: 'low', site: 'tminColdC', applies: (t) => !isAnnual(t) },
  { side: 'mild', range: 'tminCold', end: 'high', site: 'tminColdC', applies: (t) => !isAnnual(t) && canNeedChill(t) },
  HOT_BOUND,
];

// One bound against one site slot: inside, edge or beyond, or null when the plant has no value for it
// or the bound does not apply.
export function boundPassed(taxon: Taxon, b: RangeBound, slot: SitePeriod): Passed | null {
  const v = taxon.climate?.[b.range]?.[b.end];
  if (v == null || !b.applies(taxon)) return null;
  return passes(slot[b.site], v, b.end === 'low' ? 'below' : 'above');
}
// An annual beyond its heat range is advised to the cool season rather than counted (header).
export const coolSeasonOf = (taxon: Taxon, b: RangeBound, p: Passed | null): boolean => b.side === 'hot' && p === 'beyond' && isAnnual(taxon);

// null: nothing to check against (no site climate).
export function rangeCheck(taxon: Taxon, site: SiteLocation | null): RangeCheck | null {
  const today = siteToday(site);
  if (!today) return null;
  const c = taxon.climate;
  const cold = c?.tminCold, warm = c?.tmaxWarm, arid = c?.aridity;
  const ai = today.aridityIndex;
  const aridity: AridityFit = ai === null ? 'not-checked'
    : !arid || arid.low === null || arid.high === null ? 'unknown'
    : ai < arid.low ? 'drier' : ai > arid.high ? 'wetter' : 'inside';
  if (!c || (!cold && !warm)) return { verdict: 'unknown', sides: [], beyond: [], aridity, coolSeason: false };
  const sides: RangeSide[] = [], beyond: RangeSide[] = [];
  let coolSeason = false;
  for (const b of RANGE_BOUNDS) {
    const p = boundPassed(taxon, b, today);
    if (p === null || p === 'inside') continue;
    if (coolSeasonOf(taxon, b, p)) { coolSeason = true; continue; }
    sides.push(b.side);
    if (p === 'beyond') beyond.push(b.side);
  }
  return { verdict: beyond.length ? 'outside' : sides.length ? 'edge' : 'inside', sides, beyond, aridity, coolSeason };
}

export function rangeFit(taxon: Taxon, site: SiteLocation | null): RangeVerdict {
  return rangeCheck(taxon, site)?.verdict ?? 'unknown';
}

// What suggestions and lists draw from: the pool without the plants outside their observed range,
// except those in keep (plants the reader kept or added anyway stay theirs). The same array when
// nothing is checked (no site climate), so caches keyed on it hold.
export function withinRange(pool: Taxon[], site: SiteLocation | null, keep: readonly PlantId[] = []): Taxon[] {
  if (!siteToday(site)) return pool;
  const kept = new Set(keep);
  return pool.filter((t) => kept.has(t.id) || rangeFit(t, site) !== 'outside');
}
