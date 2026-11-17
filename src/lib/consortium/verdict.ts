// The one verdict engine (plant-palette-architecture 3.2): a verdict per plant for one place, one
// period and one scenario. Reached only through verdict-load.ts loadVerdictRule (its own chunk, role
// `verdict`): no first-run module imports this file. Built on the rule files (rule L10): range.ts for
// the climate sides (slotCheck's bounds, one owner of the margin and the chill and summer rules),
// future.ts for the period a plant is judged at and the scenarios that agree, site.ts for the spot
// answers asked today (light, water, a soil word), the room note and the shade of taller members.
//
// Rules (each decided, 3.2):
// - The period judged is the page period, never later than the plant's own years (judgedPeriod:
//   future.ts futurePeriod; a short-lived plant is judged on today).
// - Each climate side of RANGE_BOUNDS against the judged period's slot (place.ts climateFor, the one
//   climate reader): inside → fits, within the margin → look, beyond → outside. An annual beyond its
//   heat range is advised to the cool season (note 'cool-season'), its hot side fits.
// - No slot (no location, a period with no projection) or no range recorded: no climate factor, the
//   level 'unknown' ("not checked"), never 'fits'.
// - Spot and soil answers are hints: a misfit is 'look' at most; an unknown trait is a factor
//   'unknown' that never lowers the level. Shade relief: a sun spot's light factor is dropped when a
//   taller member shades the plant in a phase they share (ctx.canopy, site.ts shadedBy).
// - Room is a note ('room-tall'), never a level (DEC:97). Aridity notes 'drier' or 'wetter': its factor
//   'dry' (the place's aridity index against the plant's band; 'look' beyond it, 'unknown' on ice, "not
//   checked") is said with its measure. Past the wet end it asks a second look like the hot and cold
//   edges (owner, decision row "Wetter than recorded is a second look", 2026-11-17: cause "wetter here
//   than where it is recorded"); past the dry end it stays a note that names the limit (PP-C5).
//   Drought tolerance Medium on a dry spot: note 'dry-months' ("needs watering in the dry months").
// - "Higher than the town" or a hollow: note 'cold-air' on a plant within the margin of its cold limit.
// - The level is the worst factor (outside, then look, then fits); 'unknown' when no climate factor
//   was judged and no hint asks a second look.
// - Hedges (A15): a range side passed within the margin carries confidence 'edge'; a bound from another
//   source than its row names it (`source`); a disputed low (ClimateRange weak) is `disputed`; a plant
//   placed from a nearest list is `borrowed` (its lines say "estimate"); `range` keeps "not recorded"
//   (a place climate, no range for the plant) apart from "not checked" (no climate for the period).
// - Today's verdict of a plant judged later in its own years notes what that period changes:
//   'warm-enough-later' (too cool today, within every bound then) and 'drier-later'.
// - Few records: ranges resting on fewer than FEW_RECORDS recorded places (TaxonClimate.cells, the
//   thinned GBIF cells) note 'few-records' with the count: their limits are not firm (drawn dashed,
//   said in words), never a level.
import type { Factor, FactorVerdict, Level, PeriodId, PlantId, PlantVerdict, Scenario, Taxon, VerdictContext, VerdictNote } from './types.ts';
import { periodIds, scenarios, setsLevel } from './types.ts';
import { borrowedFrom } from './placement.ts';
import { aridityFit, boundPassed, coolSeasonOf, isAnnual, passes, RANGE_BOUNDS, RANGE_MARGIN_C, slotCheck } from './range.ts';
import { futurePeriod } from './future.ts';
import { fits, misfitsBeside, shadedBy, tallerThanRoom } from './site.ts';
import { climateFor, siteFor } from './place.ts';

const TODAY: PeriodId = periodIds[0];
const FEW_RECORDS = 300;
const ORDER: Record<Level, number> = { fits: 0, unknown: 0, look: 1, outside: 2 };
const OF_PASSED = { inside: 'fits', edge: 'look', beyond: 'outside' } as const;

// The period a plant is judged for: the page period, never later than its own years.
export function judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId {
  const own = futurePeriod(taxon) ?? TODAY;
  return periodIds.indexOf(own) < periodIds.indexOf(page) ? own : page;
}

const hasRange = (t: Taxon): boolean => {
  const c = t.climate;
  return !!c && !!(c.tminCold || c.tmaxWarm || c.tmeanYear || c.tmeanWarm);
};

// The climate factors at one period and scenario, with the notes they give; null when nothing could
// be compared (no slot, no range recorded).
function climateFactors(taxon: Taxon, ctx: VerdictContext, period: PeriodId, scenario: string): { factors: FactorVerdict[]; notes: VerdictNote[] } | null {
  const slot = climateFor({ lookup: ctx.lookup, scenario }, period);
  if (!slot || !hasRange(taxon)) return null;
  const factors: FactorVerdict[] = [], notes: VerdictNote[] = [];
  for (const b of RANGE_BOUNDS) {
    const p = boundPassed(taxon, b, slot);
    if (p === null) continue;
    const range = taxon.climate?.[b.range] ?? null;
    const cool = coolSeasonOf(taxon, b, p);
    if (cool) notes.push('cool-season');
    const level: Level = cool ? 'fits' : OF_PASSED[p];
    const f: FactorVerdict = { factor: b.side as Factor, level, basis: 'range', place: b.site(slot), low: range?.low ?? null, high: range?.high ?? null };
    if (level === 'look') f.confidence = { term: 'edge' };
    const source = b.end === 'low' ? range?.lowSource : range?.highSource;
    if (source) f.source = source;
    else if (range?.weak && b.end === 'low') f.disputed = true;
    factors.push(f);
  }
  const arid = aridityFit(taxon, slot), band = taxon.climate?.aridity;
  if (arid === 'drier' || arid === 'wetter') notes.push(arid);
  if (arid === 'not-checked') factors.push({ factor: 'dry', level: 'unknown', basis: 'range', place: null, low: null, high: null });
  else if (arid !== 'unknown') factors.push({ factor: 'dry', level: arid === 'inside' ? 'fits' : 'look', basis: 'range', place: slot.aridityIndex, low: band?.low ?? null, high: band?.high ?? null });
  const height = ctx.place.spot.height;
  if ((height === 'higher' || height === 'hollow') && taxon.climate?.tminCold?.low != null && isColdLimited(taxon, slot.tminColdC)) notes.push('cold-air');
  return { factors, notes };
}
// Within the margin of the cold limit (or past it): cold air pools on a hill top or in a hollow.
function isColdLimited(taxon: Taxon, tmin: number): boolean {
  const low = taxon.climate?.tminCold?.low;
  if (low == null || isAnnual(taxon)) return false;
  return passes(tmin - RANGE_MARGIN_C, low, 'below') !== 'inside';
}

// The spot and soil hints asked today (light, water, a soil word), each at most 'look'.
// site: siteFor(ctx.place, ctx.lookup), read once per verdicts() call (resolveSoil runs in it).
type SiteOf = ReturnType<typeof siteFor>;
function hintFactors(taxon: Taxon, ctx: VerdictContext, site: SiteOf): { factors: FactorVerdict[]; roomTall: boolean; dryMonths: boolean } {
  const fit = fits(taxon, site);
  const shaded = !!ctx.canopy && shadedBy(taxon, site, ctx.canopy);
  // The misfits that hold beside the canopy: the one rule the flags read too (site.ts misfitsBeside,
  // conflicts.ts flagsFor; parity PP-C-u14).
  const beside = new Set(ctx.canopy ? misfitsBeside(taxon, site, ctx.canopy, fit) : fit.misfits);
  const factors: FactorVerdict[] = [];
  for (const r of fit.reasons) {
    if (r.key === 'room') continue;
    if (r.key === 'light' && shaded) continue;
    const level: Level = r.verdict === 'misfit' ? (beside.has(r.key) ? 'look' : 'fits') : r.verdict === 'unknown' ? 'unknown' : 'fits';
    const factor: Factor = r.key === 'soil' ? 'soil-ph' : r.key;
    factors.push({ factor, level, basis: r.key === 'soil' ? 'soil-test' : 'spot', place: null, low: null, high: null });
  }
  return { factors, roomTall: tallerThanRoom(fit), dryMonths: fit.reasons.some((r) => r.key === 'water' && r.note === 'dry_months') };
}

// The aridity factor ('dry') sets the level only past the wet end (header; types.ts setsLevel).
const worst = (fs: readonly FactorVerdict[]): FactorVerdict | null =>
  fs.reduce<FactorVerdict | null>((w, f) => (setsLevel(f) && ORDER[f.level] > (w ? ORDER[w.level] : 0) ? f : w), null);

export function verdict(taxon: Taxon, ctx: VerdictContext): PlantVerdict {
  return verdictAt(taxon, ctx, siteFor(ctx.place, ctx.lookup));
}
function verdictAt(taxon: Taxon, ctx: VerdictContext, site: SiteOf): PlantVerdict {
  const judged = judgedPeriod(taxon, ctx.period);
  const climate = climateFactors(taxon, ctx, judged, ctx.scenario);
  const hints = hintFactors(taxon, ctx, site);
  const factors = [...(climate?.factors ?? []), ...hints.factors];
  const notes: VerdictNote[] = [...new Set<VerdictNote>(climate?.notes ?? [])];
  if (hints.roomTall) notes.push('room-tall');
  if (hints.dryMonths) notes.push('dry-months');
  if (isAnnual(taxon)) notes.push('annual');
  if (judged === TODAY && climate) notes.push(...laterNotes(taxon, ctx));
  const cells = taxon.climate?.cells ?? null;
  const few = !!climate && cells !== null && cells < FEW_RECORDS;
  if (few) notes.push('few-records');
  const worstOne = worst(factors);
  // A range recorded with no side that applies (an annual with only its winter cold) is 'fits': the
  // canopi-data range-verdict contract (DATA-1, SYN:annual.grown_as_annual: "inside") says so.
  const level: Level = worstOne ? worstOne.level : climate ? 'fits' : 'unknown';
  // What limits the plant: the worst measure; when nothing else is past 'fits', a drier edge (the place
  // drier than the band) names it, still without setting the level (Mendoza: the dry edge first). A
  // wetter place is worst() itself ("needs a second look · wetter here"), never "may need watering".
  const dryEdge = factors.find((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low) ?? null;
  const limiting = dryEdge && (!worstOne || worstOne.level === 'fits') ? dryEdge : worstOne;
  const range = climate ? 'judged' : climateFor({ lookup: ctx.lookup, scenario: ctx.scenario }, judged) ? 'not-recorded' : 'no-climate';
  const out: PlantVerdict = { id: taxon.id, judged, ownYears: judged !== ctx.period, level, limiting, factors, notes, range };
  const from = borrowedFrom(taxon);
  if (from) out.borrowed = from;
  if (few) out.records = cells!;
  // The scenarios that agree on a later period (each scenario's slot judged the same way).
  if (judged !== TODAY && climate) {
    let agree = 0, of = 0;
    const loses = level === 'outside';
    for (const s of scenarios as readonly Scenario[]) {
      const c = climateFactors(taxon, ctx, judged, s);
      if (!c) continue;
      of++;
      if (c.factors.some((f) => f.level === 'outside') === loses) agree++;
    }
    if (of) { out.agree = agree; out.of = of; }
  }
  return out;
}

// What a plant's own later period changes, said on today's verdict (header): too cool today and within
// every bound then ('warm-enough-later'), drier then and not today ('drier-later'); under the scenario
// of the context.
function laterNotes(taxon: Taxon, ctx: VerdictContext): VerdictNote[] {
  const own = futurePeriod(taxon);
  const later = own && climateFor({ lookup: ctx.lookup, scenario: ctx.scenario }, own);
  const today = climateFor({ lookup: ctx.lookup, scenario: ctx.scenario }, TODAY);
  if (!later || !today) return [];
  const out: VerdictNote[] = [];
  if (slotCheck(taxon, today).beyond.some((s) => s === 'cool' || s === 'summer') && slotCheck(taxon, later).beyond.length === 0) out.push('warm-enough-later');
  if (aridityFit(taxon, later) === 'drier' && aridityFit(taxon, today) !== 'drier') out.push('drier-later');
  return out;
}

export function verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict> {
  const site = siteFor(ctx.place, ctx.lookup);
  return new Map(taxa.map((t) => [t.id, verdictAt(t, ctx, site)]));
}

// Whether a plant stays within its climate range through a period (P34, P35): judged for the years it
// stands in (a short-lived plant on today), and false when nothing can be compared (no location, no
// range, no projection): never a guess that it holds.
export function holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean {
  const judged = judgedPeriod(taxon, period);
  const c = climateFactors(taxon, ctx, judged, ctx.scenario);
  return !!c && c.factors.length > 0 && !c.factors.some((f) => f.level === 'outside');
}
