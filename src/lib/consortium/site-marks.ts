// The site answers' marks (a marks.ts provider): a fit that still asks something of the reader, today
// drought tolerance Medium on a dry site (site.ts note 'dry_months', owner, decision row "Climate
// ranges fixed before the P5 push"): "water in dry months" on rows and in Add, "Needs watering in the
// dry months." in Details, nothing on chips. With or without a location. And a plant taller than a small or large garden (advisory,
// owner request 2026-11-12): "grows to N m: prune" on rows and in Add, "Grows to N m: keep it pruned,
// or pick a smaller plant." in Details (N to a tenth: catalog heights are feet converted, 13.716). On the island path: marks.ts plantMarks adds them with or without the providers (small, and fits is
// already there).
import type { Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import { fits } from './site.ts';

export function siteMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  const site = ctx.site;
  if (surface === 'chip' || !site || (site.water !== 'dry' && site.room !== 'small' && site.room !== 'large')) return [];
  const details = surface === 'details';
  const out: Mark[] = [];
  for (const r of fits(taxon, site).reasons) {
    if (r.key === 'water' && 'note' in r && r.note === 'dry_months') out.push({ kind: 'water', key: details ? 'water.dryMonths' : 'water.dryMonthsShort', severity: 'note', state: 'dry_months' });
    if (r.key === 'room' && r.kind === 'wild_height') out.push({ kind: 'room', key: details ? 'room.tall' : 'room.tallShort', vars: { m: Math.round(r.meters * 10) / 10 }, severity: 'note', state: 'tall' });
  }
  return out;
}
