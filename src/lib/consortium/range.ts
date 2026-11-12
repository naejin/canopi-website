// Stream S5c: whether a plant's observed climate range holds the site (owner answer 2, 2026-11-11).
// The site's today values (the climate reader's historical period) against the plant's observed
// range (Taxon.climate, GBIF cells thinned per climate cell, cultivation included; schema 3, canopi-data
// docs/plant-climate-ranges.md), through the bounds of RANGE_BOUNDS: the coldest-month minimum on the
// cold side (a cold limit), and on the mild side for a plant that can need winter chill; the year's
// warmth (the mean of the coldest and warmest months' means) on the cool side; the warmest-month
// maximum on the hot side (a heat limit). Annuals skip the cold, mild and cool sides (checksWinter). Beyond a limit by
// more than RANGE_MARGIN_C: 'outside' (left out of suggestions and lists, still addable with a
// warning); beyond it by up to the margin: 'edge' ("near the edge of its observed range"). A weak row
// (the ClimateRange weak flag, a disputed limit: TreeGOER is stricter by more than 4 °C and the looser bound was
// kept) is a bound as any other: the doubt is only that it may be too lenient (coordinator decision
// 2026-11-12), so it never softens a verdict; Details notes it (range-marks.ts). Aridity is a mark only and never changes the verdict. No
// range: 'unknown' ("range not recorded"), never filtered. No site climate (no location, its lookup
// loading or failed, open sea): nothing is checked.
//
// Owner, decision row "Climate ranges fixed before the P5 push" (2026-11-12):
// - Winter chill. A mild winter limits only a plant that can need winter chill: the export's rule
//   (canopi-data docs/plant-climate-ranges.md, schema 3) reads tmin_cold's high as "winter too mild"
//   only when it is below CHILL_CEILING_C, 18 °C, the Köppen A/C bound (canNeedChill). A plant recorded
//   in places whose coldest month stays at or above it grows without winter chill, so the lowland
//   tropics (cacao 24.1, cassava 24.2 on export r-01102782139409b5) are never "edge" at Manaus or
//   Singapore, while apple (8.4) and almond (11.7) keep the mild side.
// - The year's warmth (tmean_year, schema 3). Its low is a "too cool" limit for perennials: the site's
//   value is the mean of its coldest and warmest months' means, from the slot checked (Nairobi
//   (17.6 + 21.1) / 2 = 19.35 °C, too cool for cacao, low 21.4).
// - Annuals. An annual is sown in the season that suits it: beyond its heat range (the warmest-month
//   maximum past Q95 by more than the margin) it is not outside but advised to the cool season
//   (coolSeason: "Too hot in summer here: grow it in the cool season."); within the margin it is near
//   the edge, as any plant. It never has the winter sides nor the year's warmth ("Annuals skip the winter-cold check").
// - An annual's summer (tmean_warm, schema 3; canopi-data docs/consortium-export-v2.md): its low is a
//   "summer too cool here" limit for heat-demanding annuals only (needsSummerHeat), against the site's
//   warmest-month mean: taro or ginger grown as annuals would otherwise pass boreal sites. Perennials
//   ignore the row. Coordinator decision 2026-11-12 (canopi-data review): only annuals whose tmean_warm
//   low is at or above HEAT_DEMAND_C, 18 °C (the chill rule's bound), since one warmest-month value says
//   nothing about the season length in equatorial highlands: lettuce (16.3), maize (16.8), onion (15.2)
//   would be "summer too cool" at Quito (14.1) and Bogotá (14.3), where they are staples; taro (19.9),
//   ginger (23.7), turmeric (21.2), sweet potato (19.5) and okra (23) keep the side.
import type { PlantId, SiteLocation, SitePeriod, Taxon } from './types.ts';
import { siteToday } from './site-today.ts';

// siteToday lives in its own module so the first run can ask "has the site a climate?" without the
// rule, which loads with the pool feature chunk (store.ts rangeRule).
export { siteToday };

export const rangeVerdicts = ['inside', 'edge', 'outside', 'unknown'] as const;
export type RangeVerdict = (typeof rangeVerdicts)[number];
// Which bound the site passes: colder winters than recorded, milder winters, a cooler year, a cooler
// summer (annuals), hotter summers.
export type RangeSide = 'cold' | 'mild' | 'cool' | 'summer' | 'hot';
// The site's aridity index (precipitation / PET; lower is drier) against the plant's: a mark only.
// 'not-checked': the site has none (ice); 'unknown': the plant has none recorded.
export type AridityFit = 'inside' | 'drier' | 'wetter' | 'not-checked' | 'unknown';
// sides: every bound the site passes; beyond: those it passes by more than the margin.
// coolSeason: an annual beyond its heat range (header), advised to the cool season instead.
export interface RangeCheck { verdict: RangeVerdict; sides: RangeSide[]; beyond: RangeSide[]; aridity: AridityFit; coolSeason: boolean }

export const RANGE_MARGIN_C = 2;
export const CHILL_CEILING_C = 18;
// The tmean_warm low from which an annual needs a warm summer (header, "An annual's summer"): the same
// 18 °C, coordinator decision 2026-11-12.
export const HEAT_DEMAND_C = 18;

// The temperature bounds the rule checks, in one place: the plant's range (a TaxonClimate field, read
// from the export variable named in types.ts RANGE_VARIABLES), which end of it, and the site value it
// is compared with (from a slot of the climate tiles). future.ts checks the bounds through this list
// too. A new bound is one row here, one in RANGE_VARIABLES, its RangeSide and its site value.
export interface RangeBound {
  side: RangeSide;
  range: 'tminCold' | 'tmaxWarm' | 'tmeanYear' | 'tmeanWarm';
  end: 'low' | 'high';
  site: (slot: SitePeriod) => number;
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

// Annual for the rule everywhere (range, future, marks, notes): is_annual, or grown as an annual
// (grown_as_annual: onion, garlic, carrot, cabbage, beet, leek, potato; owner, decision row "Growing
// months" 2026-11-12). No season is claimed for an annual until reviewed crop growing bands ship.
export const isAnnual = (taxon: Taxon): boolean => taxon.traits?.is_annual === true || taxon.traits?.grown_as_annual === true;
// The one switch for which plants the winter sides (cold, mild) and the year's warmth check: today
// every perennial and no annual, cool-season annuals included (owner question pending on checking a
// cool-season annual's coldest month: then `!isAnnual(t) || annualSeason(t) === 'cool'` for cold).
export const checksWinter = (taxon: Taxon): boolean => !isAnnual(taxon);
// Whether the summer side applies (header, "An annual's summer"): an annual recorded only where the
// warmest month's mean reaches HEAT_DEMAND_C.
export function needsSummerHeat(taxon: Taxon): boolean {
  const low = taxon.climate?.tmeanWarm?.low;
  return isAnnual(taxon) && low != null && low >= HEAT_DEMAND_C;
}
// Whether a mild winter can limit the plant (header, "Winter chill"): its tmin_cold Q95 is below the
// ceiling. No Q95 recorded: nothing to compare.
export function canNeedChill(taxon: Taxon): boolean {
  const high = taxon.climate?.tminCold?.high;
  return high != null && high < CHILL_CEILING_C;
}

// HOT_BOUND is named for future.ts (a plain constant: a lookup call at module level would count as a
// side effect and pull this rule into the island's first chunk).
// The year's warmth at a slot (header): the mean of its coldest and warmest months' means.
export const yearMeanC = (p: SitePeriod): number => (p.tmeanColdC + p.tmeanWarmC) / 2;
export const HOT_BOUND: RangeBound = { side: 'hot', range: 'tmaxWarm', end: 'high', site: (p) => p.tmaxWarmC, applies: () => true };
export const RANGE_BOUNDS: readonly RangeBound[] = [
  { side: 'cold', range: 'tminCold', end: 'low', site: (p) => p.tminColdC, applies: checksWinter },
  { side: 'mild', range: 'tminCold', end: 'high', site: (p) => p.tminColdC, applies: (t) => checksWinter(t) && canNeedChill(t) },
  { side: 'cool', range: 'tmeanYear', end: 'low', site: yearMeanC, applies: checksWinter },
  // A heat-demanding annual's summer (header): the site's warmest-month mean against tmean_warm low.
  { side: 'summer', range: 'tmeanWarm', end: 'low', site: (p) => p.tmeanWarmC, applies: needsSummerHeat },
  HOT_BOUND,
];

// One bound against one site slot: inside, edge or beyond, or null when the plant has no value for it
// or the bound does not apply.
export function boundPassed(taxon: Taxon, b: RangeBound, slot: SitePeriod): Passed | null {
  const v = taxon.climate?.[b.range]?.[b.end];
  if (v == null || !b.applies(taxon)) return null;
  return passes(b.site(slot), v, b.end === 'low' ? 'below' : 'above');
}
// An annual beyond its heat range is advised to the cool season rather than counted (header).
export const coolSeasonOf = (taxon: Taxon, b: RangeBound, p: Passed | null): boolean => b.side === 'hot' && p === 'beyond' && isAnnual(taxon);

// Every temperature bound against one slot: the sides passed, those beyond, the cool-season advice.
// Today's check and the future one (future.ts, "warm enough by …") read it.
export interface SlotCheck { sides: RangeSide[]; beyond: RangeSide[]; coolSeason: boolean }
export function slotCheck(taxon: Taxon, slot: SitePeriod): SlotCheck {
  const sides: RangeSide[] = [], beyond: RangeSide[] = [];
  let coolSeason = false;
  for (const b of RANGE_BOUNDS) {
    const p = boundPassed(taxon, b, slot);
    if (p === null || p === 'inside') continue;
    if (coolSeasonOf(taxon, b, p)) { coolSeason = true; continue; }
    sides.push(b.side);
    if (p === 'beyond') beyond.push(b.side);
  }
  return { sides, beyond, coolSeason };
}

// A slot's aridity against the plant's (a mark only, never a verdict): today's check and the future
// one (future.ts, "drier … by …: may need watering") read it, so the rule has one owner.
export function aridityFit(taxon: Taxon, slot: SitePeriod): AridityFit {
  const arid = taxon.climate?.aridity;
  const ai = slot.aridityIndex;
  return ai === null ? 'not-checked'
    : !arid || arid.low === null || arid.high === null ? 'unknown'
    : ai < arid.low ? 'drier' : ai > arid.high ? 'wetter' : 'inside';
}

// null: nothing to check against (no site climate).
export function rangeCheck(taxon: Taxon, site: SiteLocation | null): RangeCheck | null {
  const today = siteToday(site);
  if (!today) return null;
  const c = taxon.climate;
  const aridity = aridityFit(taxon, today);
  if (!c || (!c.tminCold && !c.tmaxWarm && !c.tmeanYear && !c.tmeanWarm)) return { verdict: 'unknown', sides: [], beyond: [], aridity, coolSeason: false };
  const { sides, beyond, coolSeason } = slotCheck(taxon, today);
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
