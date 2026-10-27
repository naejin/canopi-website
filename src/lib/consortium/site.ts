// Site fit: does a taxon suit the light, soil, water and room the user described? A trait the
// catalog does not know is never a misfit; it counts as an unknown instead, which the scoring
// penalises a little and the page shows as "not known".
//
// Thresholds (the plan leaves them to this module):
// - light: sun needs `sun`, part shade `semi_shade`, shade `full_shade`; false is a misfit.
// - soil, against the taxon's soil_ph range: acid is pH < 6, neutral 6 to 7.5, chalky > 7.5. A misfit
//   when the known bounds leave no overlap (acid: min ≥ 6; chalky: max ≤ 7.5; neutral: max < 6 or
//   min > 7.5); unknown when the bound that decides is null.
// - water: dry is a misfit for drought_tolerance Low or None, or, when drought tolerance is unknown,
//   for moisture_use High. Wet is a misfit for a plant that wants good drainage and is drought
//   adapted: well_drained true and drought_tolerance High or, when drought tolerance is unknown,
//   moisture_use Low (the export's thyme and sage). It fits when well_drained is false,
//   moisture_use is High or drought tolerance is known and not High.
// - room: small garden ≤ 6 m, large garden ≤ 12 m, for both height (height_m.max) and width
//   (width_max_m); a field takes any size.
// - "not sure" (soil, water) and "average" water never give a misfit or an unknown.
import type { Taxon } from './types.ts';

export const lights = ['sun', 'part', 'shade'] as const;
export const soils = ['acid', 'neutral', 'chalky', 'unsure'] as const;
export const waters = ['dry', 'average', 'wet', 'unsure'] as const;
export const rooms = ['small', 'large', 'field'] as const;

export interface Site {
  light: (typeof lights)[number];
  soil: (typeof soils)[number];
  water: (typeof waters)[number];
  room: (typeof rooms)[number];
}
export type SiteKey = keyof Site;
export const siteKeys: SiteKey[] = ['light', 'soil', 'water', 'room'];

// The site the page starts from: a large garden in full sun, soil and water not known.
export const DEFAULT_SITE: Site = { light: 'sun', soil: 'unsure', water: 'unsure', room: 'large' };

export const ROOM_LIMIT_M: Record<Site['room'], number> = { small: 6, large: 12, field: Infinity };
export const ACID_BELOW = 6;
export const CHALKY_ABOVE = 7.5;

export interface Fit { ok: boolean; misfits: SiteKey[]; unknowns: SiteKey[] }

type Verdict = 'fit' | 'misfit' | 'unknown';

function light(t: Taxon, site: Site): Verdict {
  const v = site.light === 'sun' ? t.traits.sun : site.light === 'part' ? t.traits.semi_shade : t.traits.full_shade;
  return v === null || v === undefined ? 'unknown' : v ? 'fit' : 'misfit';
}

function soil(t: Taxon, site: Site): Verdict {
  if (site.soil === 'unsure') return 'fit';
  const min = t.traits.soil_ph?.min ?? null, max = t.traits.soil_ph?.max ?? null;
  if (site.soil === 'acid') return min === null ? 'unknown' : min < ACID_BELOW ? 'fit' : 'misfit';
  if (site.soil === 'chalky') return max === null ? 'unknown' : max > CHALKY_ABOVE ? 'fit' : 'misfit';
  if ((max !== null && max < ACID_BELOW) || (min !== null && min > CHALKY_ABOVE)) return 'misfit';
  return min === null || max === null ? 'unknown' : 'fit';
}

function water(t: Taxon, site: Site): Verdict {
  const { drought_tolerance: dt, moisture_use: mu, well_drained: wd } = t.traits;
  if (site.water === 'dry') {
    if (dt !== null) return dt === 'Low' || dt === 'None' ? 'misfit' : 'fit';
    return mu === 'High' ? 'misfit' : 'unknown';
  }
  if (site.water === 'wet') {
    if (wd === true && (dt === 'High' || (dt === null && mu === 'Low'))) return 'misfit';
    if (wd === false || mu === 'High' || (dt !== null && dt !== 'High')) return 'fit';
    return 'unknown';
  }
  return 'fit';
}

function room(t: Taxon, site: Site): Verdict {
  const limit = ROOM_LIMIT_M[site.room];
  if (limit === Infinity) return 'fit';
  const sizes = [t.traits.height_m?.max ?? null, t.traits.width_max_m];
  if (sizes.some((s) => s !== null && s > limit)) return 'misfit';
  return sizes.some((s) => s === null) ? 'unknown' : 'fit';
}

const checks: Record<SiteKey, (t: Taxon, site: Site) => Verdict> = { light, soil, water, room };

export function fits(taxon: Taxon, site: Site): Fit {
  const misfits: SiteKey[] = [], unknowns: SiteKey[] = [];
  for (const key of siteKeys) {
    const v = checks[key](taxon, site);
    if (v === 'misfit') misfits.push(key);
    else if (v === 'unknown') unknowns.push(key);
  }
  return { ok: misfits.length === 0, misfits, unknowns };
}
