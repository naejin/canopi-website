// The palette's place and its projections (PP-B commit 0; plant-palette-architecture 3.1): the place
// answers (room, plot size, spot, soil) a palette is judged against, and the one translation of each
// into what a rule reads. 0a holds real bodies for emptyPlace, siteFor and a minimal resolveSoil, and
// climateFor passing the slot through; b1a extends siteFor, f1 (PP-F) completes resolveSoil.
//
// PP-B keeps today's three questions (owner, 2026-11-14, keep rows C1–C3): light goes to spot.light,
// water to spot.water, a soil word to { from: 'own', ph: null, word, texture: null }, "not sure" to
// { from: 'map' }; siteFor passes them to site.ts fits() in the old Site shape.
import type { PeriodId, Place, ResolvedSoil, Site, SitePeriod, SiteLookup, SoilAnswer, SoilWord, VerdictContext } from './types.ts';
import { ACID_BELOW, CHALKY_ABOVE } from './site.ts';
import { TODAY_PERIOD } from './source.ts';


// Every answer "not sure", no plot size, the soil map: the place a palette starts from (DEC:89).
export const emptyPlace: Place = Object.freeze({
  room: 'unsure',
  plotM2: null,
  spot: Object.freeze({ light: 'unsure', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' }),
  soil: Object.freeze({ from: 'map' }),
}) as Place;

// A measured pH in words, on site.ts's thresholds (acid below 6, chalky above 7.5).
export const soilWordOf = (ph: number): SoilWord => (ph < ACID_BELOW ? 'acid' : ph > CHALKY_ABOVE ? 'chalky' : 'neutral');

// The soil a rule reads. Minimal in 0a: the soil map is not read yet (basis 'none', nothing known),
// pots have no ground soil (basis 'pots'), an own answer is a test (its pH gives the word when no word
// was chosen). f1 reads the map from lookup.soil (filled, fill distance, depth).
export function resolveSoil(answer: SoilAnswer, lookup: SiteLookup | null): ResolvedSoil {
  void lookup;
  if (answer.from === 'own') {
    const word = answer.word ?? (answer.ph !== null ? soilWordOf(answer.ph) : null);
    return { ph: answer.ph, word, texture: answer.texture, basis: 'test', depth: null, filled: false, fillKm: null };
  }
  return { ph: null, word: null, texture: null, basis: answer.from === 'pots' ? 'pots' : 'none', depth: null, filled: false, fillKm: null };
}

// The Site site.ts fits() reads: light and water as answered ('varies' checks nothing, as 'unsure'),
// the soil word of an own answer (or of its pH), else 'unsure' (the map and pots check nothing today),
// and the room.
export function siteFor(place: Place, lookup: SiteLookup | null): Site {
  const { light, water } = place.spot;
  const soil = resolveSoil(place.soil, lookup).word ?? 'unsure';
  return { light: light === 'varies' ? 'unsure' : light, soil, water, room: place.room };
}

// The climate slot every rule reads for a period: today's historical slot, or the period's slot under
// the context's scenario; null with no location, no projection or an unknown period. The one reader
// of lookup.periods for rules (the arch-rules grep line): F4's adjusted site, F2's cautious switch and
// CLIM-4's height correction land here, so every rule reads the same climate.
export function climateFor(ctx: Pick<VerdictContext, 'lookup' | 'scenario'>, period: PeriodId): SitePeriod | null {
  const periods = ctx.lookup?.climate?.periods ?? [];
  const scenario = period === TODAY_PERIOD ? 'historical' : ctx.scenario;
  return periods.find((p) => p.period === period && p.scenario === scenario) ?? null;
}
