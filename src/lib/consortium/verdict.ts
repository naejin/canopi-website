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
// - Room is a note ('room-tall'), never a level (DEC:97). Aridity is a note ('drier'), never a level.
// - "Higher than the town" or a hollow: note 'cold-air' on a plant within the margin of its cold limit.
// - The level is the worst factor (outside, then look, then fits); 'unknown' when no climate factor
//   was judged and no hint asks a second look.
import type { Conflict } from './conflicts.ts';
import type { Factor, FactorVerdict, Level, PeriodId, PlantId, PlantVerdict, Scenario, Taxon, VerdictContext, VerdictNote } from './types.ts';
import { periodIds, scenarios } from './types.ts';
import { aridityFit, boundPassed, coolSeasonOf, isAnnual, passes, RANGE_BOUNDS, RANGE_MARGIN_C } from './range.ts';
import { futurePeriod } from './future.ts';
import { fits, shadedBy, tallerThanRoom } from './site.ts';
import { climateFor, siteFor } from './place.ts';

const TODAY: PeriodId = periodIds[0];
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
    factors.push({ factor: b.side as Factor, level: cool ? 'fits' : OF_PASSED[p], basis: 'range', place: b.site(slot), low: range?.low ?? null, high: range?.high ?? null });
  }
  if (aridityFit(taxon, slot) === 'drier') notes.push('drier');
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
function hintFactors(taxon: Taxon, ctx: VerdictContext): { factors: FactorVerdict[]; roomTall: boolean } {
  const site = siteFor(ctx.place, ctx.lookup);
  const fit = fits(taxon, site);
  const shaded = !!ctx.canopy && shadedBy(taxon, site, ctx.canopy);
  const factors: FactorVerdict[] = [];
  for (const r of fit.reasons) {
    if (r.key === 'room') continue;
    if (r.key === 'light' && shaded) continue;
    const level: Level = r.verdict === 'misfit' ? 'look' : r.verdict === 'unknown' ? 'unknown' : 'fits';
    const factor: Factor = r.key === 'soil' ? 'soil-ph' : r.key;
    factors.push({ factor, level, basis: r.key === 'soil' ? 'soil-test' : 'spot', place: null, low: null, high: null });
  }
  return { factors, roomTall: tallerThanRoom(fit) };
}

const worst = (fs: readonly FactorVerdict[]): FactorVerdict | null =>
  fs.reduce<FactorVerdict | null>((w, f) => (ORDER[f.level] > (w ? ORDER[w.level] : 0) ? f : w), null);

export function verdict(taxon: Taxon, ctx: VerdictContext): PlantVerdict {
  const judged = judgedPeriod(taxon, ctx.period);
  const climate = climateFactors(taxon, ctx, judged, ctx.scenario);
  const hints = hintFactors(taxon, ctx);
  const factors = [...(climate?.factors ?? []), ...hints.factors];
  const notes: VerdictNote[] = [...new Set<VerdictNote>(climate?.notes ?? [])];
  if (hints.roomTall) notes.push('room-tall');
  if (isAnnual(taxon)) notes.push('annual');
  const limiting = worst(factors);
  const level: Level = limiting ? limiting.level : climate ? 'fits' : 'unknown';
  const out: PlantVerdict = { id: taxon.id, judged, ownYears: judged !== ctx.period, level, limiting, factors, notes };
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

export function verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict> {
  return new Map(taxa.map((t) => [t.id, verdict(t, ctx)]));
}

// Whether a plant stays within its climate range through a period (P34, P35): judged for the years it
// stands in (a short-lived plant on today), and false when nothing can be compared (no location, no
// range, no projection): never a guess that it holds.
export function holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean {
  const judged = judgedPeriod(taxon, period);
  const c = climateFactors(taxon, ctx, judged, ctx.scenario);
  return !!c && c.factors.length > 0 && !c.factors.some((f) => f.level === 'outside');
}

// Whether a plant asks before it is added (replaces conflicts.ts asks; c2).
/** @public forward seam for c2, which writes the body and drops the tag. */
export function asksBefore(v: PlantVerdict, conflicts: readonly Conflict[]): boolean {
  void v; void conflicts;
  return false;
}
