// Where is your site? → which climate (P5 stream S5b; design check §B/§C; owner answer 1, 2026-11-11:
// a location suggests the climate and the reader confirms). Pure: reads the core's view of a climate
// reader lookup (types.ts SiteLookup), never the reader itself.
//
// Köppen class → the site's climate zone (src/data/climates.ts, canopi-data's families): A tropical;
// B arid; Cs mediterranean; Cw and Cfa subtropical; Cfb and Cfc temperate; D?a and D?b continental;
// D?c and D?d boreal; E (ET tundra, EF ice cap) is polar: no zone, its own state.
//
// The states the result line shows, in this order:
// - 'sea': no climate cell within 2 cells ("pick a point on land");
// - 'polar': an E class (no curated list is claimed, no card pre-checked);
// - 'borderline': the class's coldest- or warmest-month mean lies within BORDERLINE_C of a Köppen
//   temperature bound whose other side is another zone (18 °C A/C, 0 °C C/D, 22 °C Cfa/Cfb, 10 °C
//   C or D/E), or the grid's own class disagrees with its means (koppenTemperatureMarginC > 0). The
//   class's own climate is still suggested (proposed, not checked) and the line names the zone across
//   (UX audit fix 2). Bounds that change no zone (Csa/Csb, Dfa/Dfb) do not count; the D b/c bound counts
//   months above 10 °C, which the grid does not hold, so it is not checked; B classes are set by
//   rainfall, not temperature, so they are never borderline here;
//   The class from the means (owner, decision row "Climate ranges fixed before the P5 push"): the grid
//   stores the most frequent 1-km class of the cell, which can disagree with the cell's own monthly
//   means (Nairobi: stored Aw, coldest-month mean 17.6 °C, so C by its means). When the means give
//   another zone (meansKoppen: the main group A/C/D from the coldest month, 18 °C and 0 °C, and the C/D
//   summer letter a/b from the warmest, 22 °C), that zone is proposed, and named against the stored
//   class's zone as borderline while the means lie within MEANS_MARGIN_C of the stored class's bounds
//   (koppenTemperatureMarginC: the grid reads the Nairobi cell about 1 °C warm against its stations);
//   further out, the means' zone is proposed as a plain suggestion. B (rainfall) and E (polar) classes,
//   and a disagreement that changes no zone, keep the stored class;
// - 'coast': a climate from the nearest cell and no country at the point (offshore, a coast): the
//   climate is suggested, without a country or soil;
// - 'ready': the climate is suggested.
import type { ClimateZone, SiteLookup, SitePeriod } from './types.ts';

export const BORDERLINE_C = 0.5;
export const MEANS_MARGIN_C = 2;

export type SiteState = 'sea' | 'polar' | 'borderline' | 'coast' | 'ready';
export interface SiteClimate {
  state: SiteState;
  // The period the suggestion reads (slot 0, 1991–2020); null at sea.
  today: SitePeriod | null;
  // The class's zone; null at sea and for polar classes.
  zone: ClimateZone | null;
  // Borderline: the zone across the nearby bound, when it is a zone (null: polar, or the class itself
  // disagrees with its means).
  near: ClimateZone | null;
  // The climate the location suggests (proposed, confirmed by the reader): ready, coast and borderline
  // (its class's own climate); none at sea, polar or a cell without a class.
  suggested: ClimateZone | null;
  // The Köppen class the zone comes from: the stored class, or the class the cell's own means give;
  // '' at sea. mapKoppen: the stored class when it differs (the means gave another zone), else null.
  koppen: string;
  mapKoppen: string | null;
}

// The zone of a Köppen symbol ('' and unknown symbols: null; E classes: null).
export function koppenZone(k: string): ClimateZone | null {
  const [g, second, third] = k;
  if (g === 'A') return 'Tropical';
  if (g === 'B') return 'Arid';
  if (g === 'C') return second === 's' ? 'Mediterranean' : second === 'w' || third === 'a' ? 'Subtropical' : third === 'b' || third === 'c' ? 'Temperate' : null;
  if (g === 'D') return third === 'a' || third === 'b' ? 'Continental' : third === 'c' || third === 'd' ? 'Boreal' : null;
  return null;
}
export const isPolar = (k: string): boolean => k.startsWith('E');

// The class the cell's own monthly means give, for the bounds the zones turn on (header): the main group
// A/C/D from the coldest month (≥ 18 °C A, > 0 °C C, else D) and, in C and D, the summer letter a/b
// from the warmest (≥ 22 °C a). The dry-season letter is kept (A→C: Aw → Cw, As → Cs, Af/Am → Cf; C→A:
// Cw → Aw, Cs → As, Cf → Af); c and d are kept (D→C turns d into c). B and E classes are returned as stored.
export function meansKoppen(p: SitePeriod): string {
  const [g, second = '', third = ''] = p.koppen;
  if (g !== 'A' && g !== 'C' && g !== 'D') return p.koppen;
  const main = p.tmeanColdC >= 18 ? 'A' : p.tmeanColdC > 0 ? 'C' : 'D';
  const dry = second === 'w' || second === 's' ? second : 'f';
  if (main === 'A') return g === 'A' ? p.koppen : `A${dry}`;
  const summer = g === 'A' || third === 'a' || third === 'b' ? (p.tmeanWarmC >= 22 ? 'a' : 'b') : main === 'C' && third === 'd' ? 'c' : third;
  return `${main}${dry}${summer}`;
}

// The zone across the nearest temperature bound within BORDERLINE_C, if any (undefined: none near).
function across(p: SitePeriod): ClimateZone | null | undefined {
  const k = p.koppen, zone = koppenZone(k);
  const near = (t: number, bound: number) => Math.abs(t - bound) < BORDERLINE_C;
  const other = (symbol: string) => { const z = koppenZone(symbol); return z !== zone ? z : undefined; };
  const found: (ClimateZone | null)[] = [];
  const add = (z: ClimateZone | null | undefined) => { if (z !== undefined) found.push(z); };
  const [g, second = '', third = ''] = k;
  // A → C keeps the dry season (Aw → Cw, As → Cs, Af/Am → Cf) and takes its summer letter from the
  // warmest month (≥ 22 °C a, else b): a highland Af with a 19 °C warmest month is Cfb, Temperate.
  const cOf = () => `C${second === 'w' || second === 's' ? second : 'f'}${p.tmeanWarmC >= 22 ? 'a' : 'b'}`;
  if ((g === 'A' || g === 'C') && near(p.tmeanColdC, 18)) add(g === 'A' ? koppenZone(cOf()) : 'Tropical');
  if ((g === 'C' || g === 'D') && near(p.tmeanColdC, 0)) add(other((g === 'C' ? 'D' : 'C') + second + third));
  if ((g === 'C' || g === 'D') && (third === 'a' || third === 'b') && near(p.tmeanWarmC, 22)) add(other(g + second + (third === 'a' ? 'b' : 'a')));
  if ((g === 'C' || g === 'D') && near(p.tmeanWarmC, 10)) add(null);
  if (p.koppenTemperatureMarginC > 0) add(null);
  return found.length ? found.find((z) => z !== null) ?? null : undefined;
}

// What a lookup says about the site's climate today.
export function siteClimate(lookup: SiteLookup): SiteClimate {
  const today = lookup.climate?.periods[0] ?? null;
  if (!today) return { state: 'sea', today: null, zone: null, near: null, suggested: null, koppen: '', mapKoppen: null };
  const stored = today.koppen;
  if (isPolar(stored)) return { state: 'polar', today, zone: null, near: null, suggested: null, koppen: stored, mapKoppen: null };
  // A cell without a class (none in v0.2): nothing to suggest, so the reader checks the climate.
  if (!koppenZone(stored)) return { state: 'borderline', today, zone: null, near: null, suggested: null, koppen: stored, mapKoppen: null };
  const means = today.koppenTemperatureMarginC > 0 ? meansKoppen(today) : stored;
  const moved = koppenZone(means) !== koppenZone(stored);
  const koppen = moved ? means : stored, mapKoppen = moved ? stored : null;
  const zone = koppenZone(koppen);
  // The means' zone against the stored class's, while the means lie near the stored class's bounds.
  const near = moved
    ? (today.koppenTemperatureMarginC <= MEANS_MARGIN_C ? koppenZone(stored) : across({ ...today, koppen, koppenTemperatureMarginC: 0 }))
    : across(today);
  // Borderline: its own class's climate is pre-selected all the same, and the line names both (UX
  // audit fix 2, decision row "P5 fixes from the UX audit"); the reader still confirms (owner answer 1).
  if (near !== undefined) return { state: 'borderline', today, zone, near, suggested: zone, koppen, mapKoppen };
  return { state: lookup.regions.isoA2 === null ? 'coast' : 'ready', today, zone, near: null, suggested: zone, koppen, mapKoppen };
}
