// Stream S5c: whether a plant's observed climate range holds the site (owner answer 2, 2026-11-11).
// The site's today values (the climate reader's historical period) against the plant's observed
// range (Taxon.climate, GBIF cells, cultivation included): the coldest-month minimum on both sides
// and the warmest-month maximum on the hot side. Beyond the Q05/Q95 percentile by more than
// RANGE_MARGIN_C: 'outside' (left out of suggestions and lists, still addable with a warning);
// beyond it by up to the margin: 'edge' ("near the edge of its observed range"). Aridity is a mark
// only and never changes the verdict. No range: 'unknown' ("range not recorded"), never filtered.
// No site climate (no location, its lookup loading or failed, open sea): nothing is checked.
import type { PlantId, SiteLocation, Taxon } from './types.ts';
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
export interface RangeCheck { verdict: RangeVerdict; sides: RangeSide[]; beyond: RangeSide[]; aridity: AridityFit }

export const RANGE_MARGIN_C = 2;

// The one comparison of the rule, today's check and the future one (future.ts) alike: whether value
// passes bound ('below': under a low bound; 'above': over a high one), and by more than the margin.
// In hundredths of a degree (site values have one decimal, ranges two), so that 9.8 − 7.8 is exactly
// the margin rather than a float a hair above it.
export type Passed = 'inside' | 'edge' | 'beyond';
export function passes(value: number, bound: number, side: 'below' | 'above'): Passed {
  const cents = Math.round((side === 'below' ? bound - value : value - bound) * 100);
  return cents <= 0 ? 'inside' : cents > RANGE_MARGIN_C * 100 ? 'beyond' : 'edge';
}

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
  if (!c || (!cold && !warm)) return { verdict: 'unknown', sides: [], beyond: [], aridity };
  const sides: RangeSide[] = [], beyond: RangeSide[] = [];
  const pass = (side: RangeSide, p: Passed) => {
    if (p === 'inside') return;
    sides.push(side);
    if (p === 'beyond') beyond.push(side);
  };
  if (cold?.low != null) pass('cold', passes(today.tminColdC, cold.low, 'below'));
  if (cold?.high != null) pass('mild', passes(today.tminColdC, cold.high, 'above'));
  if (warm?.high != null) pass('hot', passes(today.tmaxWarmC, warm.high, 'above'));
  return { verdict: beyond.length ? 'outside' : sides.length ? 'edge' : 'inside', sides, beyond, aridity };
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
