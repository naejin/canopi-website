// The site-inputs layer (owner decision 2026-11-18; module concept modules/consortium-site-inputs): the
// one module that owns every site input the engine reads. The rules (range.ts, future.ts, verdict.ts,
// site.ts through place.ts siteOf, weigh.ts, holes and jobs through the verdicts) read SiteInputs only,
// never the climate grid's lookup or a stored answer. Pure and first-run safe: imports types and
// site-today.ts only, so the store builds it without pulling a rule in.
//
// Each input is { value, source }: 'map' (the climate grid or the soil map), 'grower' (an edit the
// grower made), 'none' (nothing known, or not asked: never a "no"). The four climate figures also keep
// the map's value and the grower's shift.
//
// Grower climate edits are shifts from the map, applied to every slot of every period and scenario,
// so "2 °C colder" stays 2 °C colder in 2041–2070 and 2071–2099:
// - nights (coldest-month mean daily minimum): tminColdC and tmeanColdC (the year's warmth and the
//   Köppen bounds read the coldest month's mean);
// - days (warmest-month mean daily maximum): tmaxWarmC and tmeanWarmC;
// - rain (yearly, mm): precipMm, never below 0; the aridity index (rain over PET) scaled by the same
//   ratio (PET is the map's);
// - dry months: dryMonths, clamped to 0..12.
// The Köppen class stays the map's: the climate card is the location step's (site-climate.ts).
//
// What the page reaches today (store.ts siteInputs): the lookup and the room, with NO_EDITS. Every
// grower source is reachable from tests and the scenario file (scripts/fixtures/consortium-scenarios.json)
// only, until the figures panel (v14) writes edits. Spot and soil answers are dormant until PP-F
// (owner 2026-11-18): this layer never reads store.spot or store.soil.
import type { ClimateInput, PaletteGoals, Room, SiteEdits, SiteInput, SiteInputs, SiteLookup, SitePeriod, SoilPhInput } from './types.ts';
import { todayOf } from './site-today.ts';

// No grower edit: the map as it is (the page today).
export const NO_EDITS: SiteEdits = Object.freeze({});

const none = <T>(): SiteInput<T> => ({ value: null, source: 'none' });
const answer = <T>(v: T | undefined | null): SiteInput<T> => (v === undefined || v === null ? none<T>() : { value: v, source: 'grower' });
const shiftOf = (n: number | undefined): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;


// One slot with the grower's shifts applied (the same object when there are none, so caches keyed on
// the slots hold).
function shifted(p: SitePeriod, e: { nights: number; days: number; rain: number; dry: number }): SitePeriod {
  if (!e.nights && !e.days && !e.rain && !e.dry) return p;
  const out = { ...p };
  if (e.nights) { out.tminColdC = round1(p.tminColdC + e.nights); out.tmeanColdC = round1(p.tmeanColdC + e.nights); }
  if (e.days) { out.tmaxWarmC = round1(p.tmaxWarmC + e.days); out.tmeanWarmC = round1(p.tmeanWarmC + e.days); }
  if (e.rain) {
    const rain = Math.max(0, p.precipMm + e.rain);
    out.precipMm = rain;
    if (p.aridityIndex !== null && p.precipMm > 0) out.aridityIndex = Math.round((p.aridityIndex * rain / p.precipMm) * 1000) / 1000;
  }
  if (e.dry) out.dryMonths = Math.min(12, Math.max(0, p.dryMonths + e.dry));
  return out;
}

function climateInput(map: number | null | undefined, merged: number | null | undefined, shift: number): ClimateInput {
  if (map === null || map === undefined || merged === null || merged === undefined) return { value: null, source: 'none', map: null, shift };
  return { value: merged, source: shift ? 'grower' : 'map', map, shift };
}

export interface SiteInputsArgs {
  lookup: SiteLookup | null; // the climate grid and soil map at the location (null: no location, loading, failed)
  room?: Room; // the palette's room answer ('unsure': none)
  edits?: SiteEdits; // the grower's edits (NO_EDITS today)
}

// The merged inputs every rule reads.
export function siteInputsOf({ lookup, room = 'unsure', edits = NO_EDITS }: SiteInputsArgs): SiteInputs {
  const mapPeriods = lookup?.climate?.periods ?? [];
  const e = { nights: shiftOf(edits.nightsShiftC), days: shiftOf(edits.daysShiftC), rain: shiftOf(edits.rainShiftMm), dry: shiftOf(edits.dryMonthsShift) };
  const periods = mapPeriods.map((p) => shifted(p, e));
  const mapToday = todayOf(mapPeriods), today = todayOf(periods);
  const ph = lookup?.soil?.phH2o ?? null;
  const soilPh: SoilPhInput = typeof edits.soilPh === 'number' && Number.isFinite(edits.soilPh)
    ? { value: edits.soilPh, source: 'grower', map: ph }
    : ph !== null ? { value: ph, source: 'map', map: ph } : { value: null, source: 'none', map: null };
  return {
    nights: climateInput(mapToday?.tminColdC, today?.tminColdC, e.nights),
    days: climateInput(mapToday?.tmaxWarmC, today?.tmaxWarmC, e.days),
    rain: climateInput(mapToday?.precipMm, today?.precipMm, e.rain),
    dryMonths: climateInput(mapToday?.dryMonths, today?.dryMonths, e.dry),
    soilPh,
    drainage: answer(edits.drainage),
    watering: answer(edits.watering),
    light: answer(edits.light),
    wind: answer(edits.wind),
    coldAir: answer(edits.coldAir),
    room: answer(room === 'unsure' ? null : room),
    periods,
  };
}

// No location: every input unknown, no climate slot (what the rules see with no site).
export const NO_INPUTS: SiteInputs = Object.freeze(siteInputsOf({ lookup: null })) as SiteInputs;

// Whether the inputs hold a climate (a location gave one).
export const hasClimate = (inputs: SiteInputs | null): boolean => !!inputs && inputs.periods.length > 0;

// A soil test's pH, the one soil value a rule reads today: the soil map's pH checks nothing until PP-F
// (owner 2026-11-18), as place.ts resolveSoil before this layer.
export const testedPh = (inputs: SiteInputs | null): number | null => (inputs?.soilPh.source === 'grower' ? inputs.soilPh.value : null);

// ---- Palette goals: read beside the site inputs, never a site fact ----

// The redundancy target the engine reads today: 2 plants per job (a plant and its backup). The page
// passes it as is until a control lets the grower change it (store.ts paletteGoals).
export const DEFAULT_GOALS: PaletteGoals = Object.freeze({ plantsPerJob: 2 });
// A grower's goals, made safe: a whole number of plants per job, at least 1, with no upper bound.
export function paletteGoalsOf(goals: Partial<PaletteGoals> = {}): PaletteGoals {
  const n = goals.plantsPerJob;
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 ? { plantsPerJob: Math.floor(n) } : DEFAULT_GOALS;
}
