// The translation of the merged site inputs (site-inputs.ts, owner 2026-11-18) into what a rule reads
// (PP-B commit 0; plant-palette-architecture 3.1): siteOf for site.ts fits(), climateFor for a period's
// slot. The old spot and soil answers are gone (v14 0W-2 R4): the grower's values come through
// SiteEdits, the soil map through site-inputs.ts soilPhOf.
import type { PeriodId, Site, SiteInputs, SitePeriod, SoilWord } from './types.ts';
import { soilPhOf } from './site-inputs.ts';
import { ACID_BELOW, CHALKY_ABOVE } from './site.ts';
import { TODAY_PERIOD } from './source.ts';

// A measured pH in words, on site.ts's thresholds (acid below 6, chalky above 7.5).
export const soilWordOf = (ph: number): SoilWord => (ph < ACID_BELOW ? 'acid' : ph > CHALKY_ABOVE ? 'chalky' : 'neutral');

// The Site site.ts fits() reads, from the merged site inputs (site-inputs.ts), never a stored answer:
// light as given; the soil word of soilPhOf (a soil test's pH, else the map's; none in pots: R3); the
// wet check from drainage 'wet' only (the map's texture gives no hint until the grower answers wet, A8) (the old spot water answer has no input: its dry check waits for watering's
// rule, F4); the room. Every answer the grower has not given checks nothing ('unsure').
export function siteOf(inputs: SiteInputs): Site {
  const ph = soilPhOf(inputs);
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
