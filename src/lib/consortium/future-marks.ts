// The future check's mark (stream S5d; a marks.ts provider): a note drawn in ink, apart from the ochre
// warnings (v2 mockup choices). Imported only by mark-providers.ts, the lazy chunk, so its code never
// weighs on the first run; not exported from index.ts for the same reason. A plant outside its range
// by its period gets a short mark on the tight surfaces (chip, row: "Too hot by 2041–2070") and the
// scenario with its agreement where words fit (add, details); near the edge is said only there. No
// location, no projection or an unchecked plant: no mark (the panel says "not checked").
import type { Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import { futureCheck, periodName, scenarioName } from './future.ts';

export function futureMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  if (!ctx.location) return [];
  const c = futureCheck(taxon, ctx.location, ctx.scenario);
  if (!c || c.verdict === 'inside') return [];
  const tight = surface === 'chip' || surface === 'row';
  const period = periodName(c.period);
  if (c.verdict === 'edge') {
    return tight ? [] : [{ kind: 'future', key: 'future.long.edge', vars: { period, scenario: scenarioName(ctx.scenario) }, severity: 'note', state: 'edge' }];
  }
  const reason = c.why.length === 2 ? 'both' : c.why[0];
  return tight
    ? [{ kind: 'future', key: `future.mark.${reason}`, vars: { period }, severity: 'note', state: 'outside' }]
    : [{ kind: 'future', key: `future.long.${reason}`, vars: { period, scenario: scenarioName(ctx.scenario), agree: c.agree, of: c.of }, severity: 'note', state: 'outside' }];
}
