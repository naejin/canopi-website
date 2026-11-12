// Site fit: does a plant suit the light, soil, water and room the reader described? Each answer gives
// a three-valued verdict per plant (types.ts Verdict): 'fit', 'misfit', or 'unknown' when the catalog
// does not record the trait that decides. An unknown never filters a plant and is never a silent fit:
// the view says it ("height not recorded"). "Not sure" (every answer has it and starts at it, design
// check A7) checks nothing and gives no reason.
//
// Thresholds (ported from v1):
// - light: sun needs `sun`, part shade `semi_shade`, shade `full_shade`; false is a misfit.
// - soil, against soil_ph: acid is pH < 6, neutral 6 to 7.5, chalky > 7.5. One known bound can
//   decide: acid fits when the minimum is below 6 or the maximum is (the plant's whole range is acid),
//   chalky when the maximum is above 7.5 or the minimum is. A misfit when the known bounds leave no
//   overlap; otherwise unknown when a bound that decides is null.
// - water: dry is a misfit for drought_tolerance Low or None, or, when it is unknown, moisture_use
//   High; Medium fits with the note 'dry_months' ("needs watering in the dry months", owner, decision
//   row "Climate ranges fixed before the P5 push"; site-marks.ts says it). Wet is a misfit for a drought-adapted plant that wants good drainage (well_drained and
//   drought_tolerance High, or moisture_use Low when drought tolerance is unknown); it fits when
//   well_drained is false, moisture_use is High or drought tolerance is known and not High. Average
//   checks nothing.
// - room: small garden ≤ 6 m, large garden ≤ 12 m, for the height only (the question asks how tall;
//   mockup app.js:213). Advisory (owner request 2026-11-12): the matrix layers are relative sun
//   exposure (syntropic strata), not heights (maize fills a small garden's emergent layer in the first
//   seasons; a 12 m fig is routinely pruned to 3 m), so a taller plant fits, its reason kind
//   'wild_height' (tallerThanRoom; site-marks.ts says "Grows to N m: keep it pruned, or pick a smaller
//   plant"), and never makes a cell a misfit, a flag or an ask; only the suggestion leaves it out
//   (suggest.ts). Catalog heights are wild maximums. A missing height is "height not recorded" (unknown). A climber's recorded size can be a runner length (decision row "Side view"
//   2026-10-28), so its room verdict is unknown ('climber'). A field takes any size.
import type { Fit, FitReason, PhaseOrd, Site, SiteKey, Stratum, Taxon, Traits, Verdict } from './types.ts';
import { siteKeys, strata } from './types.ts';
import { phaseSpan } from './jobs.ts';

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
  if (site.soil === 'acid') verdict = (min !== null && min < ACID_BELOW) || (max !== null && max < ACID_BELOW) ? 'fit' : min === null ? 'unknown' : 'misfit';
  else if (site.soil === 'chalky') verdict = (max !== null && max > CHALKY_ABOVE) || (min !== null && min > CHALKY_ABOVE) ? 'fit' : max === null ? 'unknown' : 'misfit';
  else if ((max !== null && max < ACID_BELOW) || (min !== null && min > CHALKY_ABOVE)) verdict = 'misfit';
  else verdict = min === null || max === null ? 'unknown' : 'fit';
  return { key: 'soil', verdict, trait: 'soil_ph' };
};

const water: Check = (t, site) => {
  if (site.water === 'unsure' || site.water === 'average') return null;
  const { drought_tolerance: dt, moisture_use: mu, well_drained: wd } = t.traits;
  if (site.water === 'dry') {
    if (dt === 'Medium') return { key: 'water', verdict: 'fit', trait: 'drought_tolerance', note: 'dry_months' };
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
  if (t.traits.habit === 'Climber') return { key: 'room', verdict: 'unknown', kind: 'climber' };
  const height = t.traits.height_m?.max ?? null;
  if (height !== null && height > limit) return { key: 'room', verdict: 'fit', kind: 'wild_height', meters: height, limit };
  if (height === null) return { key: 'room', verdict: 'unknown', kind: 'height_not_recorded' };
  return { key: 'room', verdict: 'fit', kind: 'fits', meters: height, limit };
};

const checks: Record<SiteKey, Check> = { light, soil, water, room };

// Whether a fit holds a plant taller than the room (advisory, header).
export const tallerThanRoom = (fit: Fit): boolean => fit.reasons.some((r) => r.key === 'room' && r.kind === 'wild_height');

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
// misfit while another member grows in a layer above it in at least one phase the two share. The
// flags, the matrix and the suggestion all read this, so a plant the flags would not mark is a
// candidate and one they would is not.
//
// A Canopy is, per phase, the highest stratum (its index in `strata`, 0 = emergent) any member grows
// in, or 4 when none: built once, it answers "shaded?" for every plant of a pool in 7 steps.
export type Canopy = readonly number[];
const NONE = strata.length;
export function canopyOf(taxa: Iterable<Taxon>): Canopy {
  const top = new Array<number>(7).fill(NONE);
  for (const t of taxa) raise(top, t);
  return top;
}
// Adds one plant to a canopy being built (suggest.ts grows it pick by pick).
export function raise(top: number[], t: Taxon): void {
  const s = t.stratum?.value;
  if (!s) return;
  const at = strata.indexOf(s);
  for (const p of phaseSpan(t)) if (at < top[p]) top[p] = at;
}
// Every stratum in every phase: whether a plant could be shaded by some member at all.
export const FULL_CANOPY: Canopy = new Array<number>(7).fill(0);

const SHADED: ReadonlySet<Stratum> = new Set<Stratum>(['medium', 'low']);
export function shadedBy(taxon: Taxon, site: Site, canopy: Canopy): boolean {
  const own = taxon.stratum?.value;
  if (site.light !== 'sun' || !own || !SHADED.has(own)) return false;
  const at = strata.indexOf(own);
  return phaseSpan(taxon).some((p: PhaseOrd) => canopy[p] < at);
}

// The site answers a plant misfits beside the other members (a Canopy, or the members themselves):
// its own misfits, less the light where a layer above it in a shared phase shades it. A plant never
// shades itself (only a higher stratum shades). `fit` may be passed when already computed.
export function misfitsBeside(taxon: Taxon, site: Site, others: Canopy | Iterable<Taxon>, fit: Fit = fits(taxon, site)): SiteKey[] {
  if (!fit.misfits.length) return [];
  const canopy = isCanopy(others) ? others : canopyOf(others);
  return shadedBy(taxon, site, canopy) ? fit.misfits.filter((k) => k !== 'light') : [...fit.misfits];
}
const isCanopy = (x: Canopy | Iterable<Taxon>): x is Canopy => Array.isArray(x) && (x.length === 0 ? false : typeof x[0] === 'number');
