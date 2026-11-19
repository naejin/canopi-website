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
// What the page reaches (store.ts siteInputs): the lookup, the room and store.siteEdits, a saved field
// (state/schema.ts) the figures panel (pf-d) writes through store.setSiteEdits; every edit from the
// panel, the save or a link is made safe once by siteEditsOf. The old spot and soil answers are gone
// (v14 0W-2 R4).
import type { ClimateInput, PaletteGoals, Room, SiteEdits, SiteInput, SiteInputs, SiteLookup, SitePeriod, SoilPhInput } from './types.ts';
import { drainages, textureIds, waterings } from './types.ts';
import type { TextureId } from './types.ts';
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
  const soil = lookup?.soil ?? null, ph = soil?.phH2o ?? null;
  const cells = soil ? soil.fillDistanceCells + soil.distanceCells : 0;
  const near = soil && (soil.filled || soil.distanceCells > 0) ? { nearKm: Math.max(1, Math.round(cells * SOIL_CELL_KM)) } : {};
  const soilPh: SoilPhInput = typeof edits.soilPh === 'number' && Number.isFinite(edits.soilPh)
    ? { value: edits.soilPh, source: 'grower', map: ph }
    : ph !== null ? { value: ph, source: 'map', map: ph, ...near } : { value: null, source: 'none', map: null };
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
    // The room "Pots or a balcony" stands in for the Pots line while it is not answered (v14 A3).
    pots: typeof edits.pots === 'boolean' ? { value: edits.pots, source: 'grower' } : room === 'pots' ? { value: true, source: 'room' } : none<boolean>(),
    room: answer(room === 'unsure' ? null : room),
    periods,
  };
}

// No location: every input unknown, no climate slot (what the rules see with no site).
export const NO_INPUTS: SiteInputs = Object.freeze(siteInputsOf({ lookup: null })) as SiteInputs;

// Whether the inputs hold a climate (a location gave one).
export const hasClimate = (inputs: SiteInputs | null): boolean => !!inputs && inputs.periods.length > 0;

// ---- The grower's edits, made safe once (v14 spec 3.1, 7) ----

// The ranges every source is held to (the panel, the save, a link): temperature shifts in °C, one
// decimal, -15..+15; rain in whole mm a year (rain itself never below 0: shifted()); dry months in
// whole months, -12..+12 (the result clamped to 0..12); pH 3.0..10.0, one decimal.
export const EDIT_LIMITS = Object.freeze({ shiftC: 15, rainMm: 10_000, dryMonths: 12, phMin: 3, phMax: 10 });
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
function within(v: unknown, lo: number, hi: number, step: number): number | null {
  const n = num(v);
  if (n === null || n < lo || n > hi) return null;
  const q = Math.round(n / step) * step;
  return (step < 1 ? Math.round(q * 10) / 10 : Math.round(q)) || 0; // || 0: never -0
}
// The two temperature shifts set as one (the nights editor's "the hottest days too" tick; review round 3
// R2, C5): data in the edits, so it travels with Undo, the save and a link like the values. Kept only
// beside two equal shifts (a link with one shift, or two that differ, says nothing true). The tick sets
// it, an edit of either line on its own drops it, and Reset on either line reads it to put both back.
// Hand-off: the field moves into types.ts SiteEdits (`tempsTogether?: true`); until then this type adds it.
export type LinkedEdits = SiteEdits & { tempsTogether?: true };
export const tempsTogether = (e: SiteEdits | null | undefined): boolean => (e as LinkedEdits | null | undefined)?.tempsTogether === true;
// Any value as edits: each key kept only when it is in range and of its kind, every other key dropped
// (an unknown key, a wrong type, out of range), so a damaged save or a hand-edited link never crashes
// and the rest is kept. A zero shift is no edit. light, wind and coldAir (PP-F) are dropped: no save or
// link holds them until their questions exist (chk #25). Nothing kept: NO_EDITS itself.
export function siteEditsOf(raw: unknown): SiteEdits {
  if (!raw || typeof raw !== 'object') return NO_EDITS;
  const r = raw as Record<string, unknown>, out: LinkedEdits = {};
  const L = EDIT_LIMITS;
  const nights = within(r.nightsShiftC, -L.shiftC, L.shiftC, 0.1), days = within(r.daysShiftC, -L.shiftC, L.shiftC, 0.1);
  if (nights) out.nightsShiftC = nights;
  if (days) out.daysShiftC = days;
  if (r.tempsTogether === true && nights && nights === days) out.tempsTogether = true;
  const rain = within(r.rainShiftMm, -L.rainMm, L.rainMm, 1), dry = within(r.dryMonthsShift, -L.dryMonths, L.dryMonths, 1);
  if (rain) out.rainShiftMm = rain;
  if (dry) out.dryMonthsShift = dry;
  const ph = within(r.soilPh, L.phMin, L.phMax, 0.1);
  if (ph !== null) out.soilPh = ph;
  if ((drainages as readonly unknown[]).includes(r.drainage)) out.drainage = r.drainage as SiteEdits['drainage'];
  if ((waterings as readonly unknown[]).includes(r.watering)) out.watering = r.watering as SiteEdits['watering'];
  if (typeof r.pots === 'boolean') out.pots = r.pots;
  return Object.keys(out).length ? out : NO_EDITS;
}
// Whether two edits are the same (key by key; both made safe).
export const sameEdits = (a: SiteEdits, b: SiteEdits): boolean => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
};

// The soil layer's cell, 0.05° (src/lib/climate/model.js LAYERS.soil.cellDeg), in kilometres north to
// south: SoilPhInput.nearKm's unit.
const SOIL_CELL_KM = 0.05 * 111.32;

// The pH every soil rule reads (v14 0W-2 R3): the grower's soil test, else the soil map's, else none;
// in pots or brought-in soil, none (the ground's pH says nothing about the pot's). A hint, never a level
// (types.ts setsLevel).
export const soilPhOf = (inputs: SiteInputs | null): number | null => (!inputs || inputs.pots.value === true ? null : inputs.soilPh.value);

// The soil map's texture at the place (lookup.ts textureClass, one of the 12 USDA classes), or null: no
// soil read, or a class the core does not name. A reading the drainage line shows while unanswered,
// and names once answered ("in place of the soil map's clay loam"); never a hint and never a drainage
// answer (v14 A8: the hint comes only from the grower's "Stays wet for days").
export function soilTextureOf(lookup: SiteLookup | null): TextureId | null {
  const t = lookup?.soil?.texture ?? null;
  return t !== null && (textureIds as readonly string[]).includes(t) ? (t as TextureId) : null;
}

// A dry place: a dryland in the UNCCD sense, the aridity index (rain over potential evapotranspiration)
// under 0.65 (hyper-arid, arid, semi-arid and dry sub-humid; UNEP 1992). The Water card says "Your
// place is dry" only there; a member drier than its band at a humid place is said without it. null
// (on ice, not known): never dry.
export const DRYLAND_AI = 0.65;
export const isDryland = (aridityIndex: number | null | undefined): boolean => typeof aridityIndex === 'number' && aridityIndex < DRYLAND_AI;

// ---- Palette goals: read beside the site inputs, never a site fact ----

// The redundancy target the engine reads today: 2 plants per job (a plant and its backup). The page
// passes it as is until a control lets the grower change it (store.ts paletteGoals).
export const DEFAULT_GOALS: PaletteGoals = Object.freeze({ plantsPerJob: 2 });
// The choices the Jobs control offers ("Plants per job 1 2 3 5"); a link's or a save's `j` other than
// these reads as the default (v14 F15).
export const PLANTS_PER_JOB = Object.freeze([1, 2, 3, 5] as const);
export function plantsPerJobOf(v: unknown): number {
  const n = typeof v === 'string' && /^\d$/.test(v) ? Number(v) : v;
  return (PLANTS_PER_JOB as readonly unknown[]).includes(n) ? (n as number) : DEFAULT_GOALS.plantsPerJob;
}
// A grower's goals, made safe: a whole number of plants per job, at least 1, with no upper bound.
export function paletteGoalsOf(goals: Partial<PaletteGoals> = {}): PaletteGoals {
  const n = goals.plantsPerJob;
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 ? { plantsPerJob: Math.floor(n) } : DEFAULT_GOALS;
}
