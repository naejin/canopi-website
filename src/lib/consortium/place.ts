// The palette's place and its projections (PP-B commit 0; plant-palette-architecture 3.1): the place
// answers (room, plot size, spot, soil) a palette keeps, and the translation of the merged site inputs
// (site-inputs.ts, owner 2026-11-18) into what a rule reads: siteOf for site.ts fits(), climateFor for
// a period's slot. resolveSoil (the old stored-answer soil reader) went with the site-inputs layer; PP-F
// reads the soil map through site-inputs.ts.
//
// The spot and soil answers are dormant until PP-F (owner 2026-11-18): no rule reads Place.spot or
// Place.soil; the store passes the room to the site inputs, and grower edits come through SiteEdits.
import type { PeriodId, Place, Site, SiteInputs, SitePeriod, SoilWord } from './types.ts';
import { testedPh } from './site-inputs.ts';
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

// The Site site.ts fits() reads, from the merged site inputs (site-inputs.ts), never a stored answer:
// light as given; the soil word of a soil test's pH (the soil map checks nothing until PP-F); the wet
// check from drainage 'wet' (the old spot water answer has no input: its dry check waits for watering's
// rule, F4); the room. Every answer the grower has not given checks nothing ('unsure').
export function siteOf(inputs: SiteInputs): Site {
  const ph = testedPh(inputs);
  return {
    light: inputs.light.value ?? 'unsure',
    soil: ph === null ? 'unsure' : soilWordOf(ph),
    water: inputs.drainage.value === 'wet' ? 'wet' : 'unsure',
    room: inputs.room.value ?? 'unsure',
  };
}

// The climate slot every rule reads for a period: today's historical slot, or the period's slot under
// the context's scenario; null with no location, no projection or an unknown period. The one reader
// of the merged slots for rules (the arch-rules grep line): F4's adjusted site, F2's cautious switch and
// CLIM-4's height correction land in site-inputs.ts, so every rule reads the same climate.
export function climateFor(ctx: { inputs: SiteInputs | null; scenario: string }, period: PeriodId): SitePeriod | null {
  const periods = ctx.inputs?.periods ?? [];
  const scenario = period === TODAY_PERIOD ? 'historical' : ctx.scenario;
  return periods.find((p) => p.period === period && p.scenario === scenario) ?? null;
}
