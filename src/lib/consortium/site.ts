// Site fit: does a plant suit the light, soil, water and room the reader described? Each answer gives
// a three-valued verdict per plant (types.ts Verdict): 'fit', 'misfit', or 'unknown' when the catalog
// does not record the trait that decides. An unknown never filters a plant and is never a silent fit:
// the view says it ("height not recorded"). "Not sure" (every answer has it and starts at it, design
// check A7) checks nothing and gives no reason.
//
// Thresholds (ported from v1):
// - light: sun needs `sun`, part shade `semi_shade`, shade `full_shade`; false is a misfit.
// - soil, against soil_ph: acid is pH < 6, neutral 6 to 7.5, chalky > 7.5. A misfit when the known
//   bounds leave no overlap; unknown when the bound that decides is null.
// - water: dry is a misfit for drought_tolerance Low or None, or, when it is unknown, moisture_use
//   High. Wet is a misfit for a drought-adapted plant that wants good drainage (well_drained and
//   drought_tolerance High, or moisture_use Low when drought tolerance is unknown); it fits when
//   well_drained is false, moisture_use is High or drought tolerance is known and not High. Average
//   checks nothing.
// - room: small garden ≤ 6 m, large garden ≤ 12 m, for the height and the width. Catalog heights are
//   wild maximums, so a taller plant "can grow over N m in the wild" (a misfit the reader may still
//   choose, pruning it); a missing height is "height not recorded" (unknown). A field takes any size.
import type { Fit, FitReason, Site, SiteKey, Stratum, Taxon, Traits, Verdict } from './types.ts';
import { siteKeys, strata } from './types.ts';

// Every answer "Not sure": the site the page starts from (A7).
export const UNSURE_SITE: Site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };

export const ROOM_LIMIT_M: Record<Site['room'], number> = { small: 6, large: 12, field: Infinity, unsure: Infinity };
export const ACID_BELOW = 6;
export const CHALKY_ABOVE = 7.5;

type Check = (t: Taxon, site: Site) => FitReason | null;

const LIGHT_TRAIT: Record<'sun' | 'part' | 'shade', keyof Traits> = { sun: 'sun', part: 'semi_shade', shade: 'full_shade' };

const light: Check = (t, site) => {
  if (site.light === 'unsure') return null;
  const trait = LIGHT_TRAIT[site.light];
  const v = t.traits[trait];
  return { key: 'light', verdict: v === null || v === undefined ? 'unknown' : v ? 'fit' : 'misfit', trait };
};

const soil: Check = (t, site) => {
  if (site.soil === 'unsure') return null;
  const min = t.traits.soil_ph?.min ?? null, max = t.traits.soil_ph?.max ?? null;
  let verdict: Verdict;
  if (site.soil === 'acid') verdict = min === null ? 'unknown' : min < ACID_BELOW ? 'fit' : 'misfit';
  else if (site.soil === 'chalky') verdict = max === null ? 'unknown' : max > CHALKY_ABOVE ? 'fit' : 'misfit';
  else if ((max !== null && max < ACID_BELOW) || (min !== null && min > CHALKY_ABOVE)) verdict = 'misfit';
  else verdict = min === null || max === null ? 'unknown' : 'fit';
  return { key: 'soil', verdict, trait: 'soil_ph' };
};

const water: Check = (t, site) => {
  if (site.water === 'unsure' || site.water === 'average') return null;
  const { drought_tolerance: dt, moisture_use: mu, well_drained: wd } = t.traits;
  if (site.water === 'dry') {
    if (dt !== null) return { key: 'water', verdict: dt === 'Low' || dt === 'None' ? 'misfit' : 'fit', trait: 'drought_tolerance' };
    return { key: 'water', verdict: mu === 'High' ? 'misfit' : 'unknown', trait: mu === 'High' ? 'moisture_use' : 'drought_tolerance' };
  }
  if (wd === true && (dt === 'High' || (dt === null && mu === 'Low'))) return { key: 'water', verdict: 'misfit', trait: dt === 'High' ? 'drought_tolerance' : 'moisture_use' };
  if (wd === false) return { key: 'water', verdict: 'fit', trait: 'well_drained' };
  if (mu === 'High') return { key: 'water', verdict: 'fit', trait: 'moisture_use' };
  if (dt !== null && dt !== 'High') return { key: 'water', verdict: 'fit', trait: 'drought_tolerance' };
  return { key: 'water', verdict: 'unknown', trait: null };
};

const room: Check = (t, site) => {
  const limit = ROOM_LIMIT_M[site.room];
  if (limit === Infinity) return null;
  const height = t.traits.height_m?.max ?? null, width = t.traits.width_max_m;
  if (height !== null && height > limit) return { key: 'room', verdict: 'misfit', kind: 'wild_height', meters: height, limit };
  if (width !== null && width > limit) return { key: 'room', verdict: 'misfit', kind: 'wild_width', meters: width, limit };
  if (height === null) return { key: 'room', verdict: 'unknown', kind: 'height_not_recorded' };
  return { key: 'room', verdict: 'fit', kind: 'fits', meters: height, limit };
};

const checks: Record<SiteKey, Check> = { light, soil, water, room };

export function fits(taxon: Taxon, site: Site): Fit {
  const misfits: SiteKey[] = [], unknowns: SiteKey[] = [], reasons: FitReason[] = [];
  for (const key of siteKeys) {
    const r = checks[key](taxon, site);
    if (!r) continue;
    reasons.push(r);
    if (r.verdict === 'misfit') misfits.push(key);
    else if (r.verdict === 'unknown') unknowns.push(key);
  }
  return { verdict: misfits.length ? 'misfit' : unknowns.length ? 'unknown' : 'fit', misfits, unknowns, reasons };
}

// A lower layer under a canopy (v1 rule, coordinator row "Scale build, coordinator choices"
// 2026-10-28): on a sunny site, a medium or low plant that does not take full sun is not a light
// misfit while another member grows in a layer above it. The flags, the matrix and the suggestion all
// read this, so a plant the flags would not mark is a candidate and one they would is not.
const SHADED: ReadonlySet<Stratum> = new Set<Stratum>(['medium', 'low']);
export function shadedBy(taxon: Taxon, site: Site, strataOfOthers: Iterable<Stratum>): boolean {
  const own = taxon.stratum?.value;
  if (site.light !== 'sun' || !own || !SHADED.has(own)) return false;
  const at = strata.indexOf(own);
  for (const s of strataOfOthers) if (strata.indexOf(s) < at) return true;
  return false;
}

// The site answers a plant misfits beside the other members: its own misfits, less the light where a
// layer above it shades it. `fit` may be passed when already computed.
export function misfitsBeside(taxon: Taxon, site: Site, strataOfOthers: Iterable<Stratum>, fit: Fit = fits(taxon, site)): SiteKey[] {
  if (!fit.misfits.length) return [];
  return shadedBy(taxon, site, strataOfOthers) ? fit.misfits.filter((k) => k !== 'light') : [...fit.misfits];
}
