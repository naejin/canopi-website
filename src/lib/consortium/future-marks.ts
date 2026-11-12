// The future check's mark (stream S5d; a marks.ts provider): a note drawn in ink, apart from the ochre
// warnings (v2 mockup choices). Imported only by mark-providers.ts, the lazy chunk, so its code never
// weighs on the first run; not exported from index.ts for the same reason. A plant outside its range
// by its period gets a short mark on the tight surfaces (chip, row: "Too hot by 2041–2070") and the
// scenario with its agreement where words fit (add, details); near the edge is said only there. No
// location, no projection or an unchecked plant: no mark (the panel says "not checked"); a plant
// already outside today gets none either (today's range mark, S5c, says it; the panel lists it).
// An annual beyond its heat range by its period gets the cool-season advice where words fit (add,
// details), never a loss mark (decision row "Climate ranges fixed before the P5 push"). A plant too
// cool today that the projection warms within its range gets "Warm enough by …" (short where tight).
// Drier by its period than where it is recorded (and not today) is a note, never a loss (walk-through 2
// N3; today's aridity is a mark only): "drier by …: may need watering" on rows, with the scenario in Add
// and Details, never on chips (today's aridity mark is not on chips either), with any verdict.
import type { Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import { futureCheck, periodName, scenarioName } from './future.ts';

export function futureMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  if (!ctx.location) return [];
  const c = futureCheck(taxon, ctx.location, ctx.scenario);
  if (!c) return [];
  const tight = surface === 'chip' || surface === 'row';
  const period = periodName(c.period);
  const vars = { period, scenario: scenarioName(ctx.scenario), agree: c.agree, of: c.of };
  const season: Mark[] = c.coolSeason && !tight ? [{ kind: 'season', key: 'future.coolSeason', vars: { period, scenario: vars.scenario }, severity: 'note', state: 'cool' }] : [];
  const warm: Mark[] = c.warmEnough ? [{ kind: 'future', key: tight ? 'future.warmEnoughShort' : 'future.warmEnough', vars: tight ? { period } : { period, scenario: vars.scenario }, severity: 'note', state: 'warm' }] : [];
  const drier: Mark[] = !c.drier || surface === 'chip' ? []
    : [{ kind: 'future', key: tight ? 'future.drierShort' : 'future.drier', vars: tight ? { period } : { period, scenario: vars.scenario }, severity: 'note', state: 'drier' }];
  if (c.verdict === 'inside' || c.verdict === 'already') return [...warm, ...season, ...drier];
  if (c.verdict === 'edge') {
    return tight ? [...warm, ...drier] : [...warm, { kind: 'future', key: 'future.long.edge', vars, severity: 'note', state: 'edge' }, ...season, ...drier];
  }
  return tight
    ? [...warm, { kind: 'future', key: 'future.mark.heat', vars: { period }, severity: 'note', state: 'outside' }, ...drier]
    : [...warm, { kind: 'future', key: 'future.long.heat', vars, severity: 'note', state: 'outside' }, ...season, ...drier];
}
