// The site answers' marks (a marks.ts provider): a fit that still asks something of the reader, today
// drought tolerance Medium on a dry site (site.ts note 'dry_months', owner, decision row "Climate
// ranges fixed before the P5 push"): "water in dry months" on rows and in Add, "Needs watering in the
// dry months." in Details, nothing on chips. With or without a location (marks.ts needsMarkProviders
// loads the providers for a dry site). Imported only by mark-providers.ts, the lazy chunk.
import type { Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import { fits } from './site.ts';

export function siteMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  if (surface === 'chip' || ctx.site?.water !== 'dry') return [];
  const water = fits(taxon, ctx.site).reasons.find((r) => r.key === 'water');
  if (!water || !('note' in water) || water.note !== 'dry_months') return [];
  return [{ kind: 'water', key: surface === 'details' ? 'water.dryMonths' : 'water.dryMonthsShort', severity: 'note', state: 'dry_months' }];
}
