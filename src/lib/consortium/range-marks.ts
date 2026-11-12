// Stream S5c: the marks of the range check and of borrowed placements (a marks.ts provider). Imported
// only by mark-providers.ts, the lazy chunk, so its code never weighs on the first run; not exported
// from index.ts for the same reason.
// - With a site climate (range.ts rangeCheck): 'outside' (a warning: "outside its observed range"),
//   'edge' ("near the edge of its observed range"), 'aridity' (a mark only, never the verdict: drier
//   or wetter than where it is recorded; its own kind, so the edge marks and the panel's "N near the
//   edge" agree), 'unknown' ("range not recorded"; and in Details, aridity "not checked" on ice).
//   Details adds one line per bound passed, with the site's and the recorded values (the very values
//   the verdict compared, to the hundredth, so the gap a reader works out matches it), and says
//   observed ranges include cultivation and are estimates, not reviewed (export meta ranges_review).
//   An annual (no winter-cold check): "warm-season annual" on rows and in Add; in Details "grown in the
//   warm season; check the frost-free season" (not on chips).
// - With or without a location: 'estimate' on a plant placed from a nearest list (placement.ts);
//   without a site climate, also "give your site's location to check it" (not on chips).
// Chips (desktop matrix) get the short words.
import type { ClimateZone, Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import type { RangeSide } from './range.ts';
import { isAnnual, rangeCheck, siteToday } from './range.ts';

// Every key written out (consortium.* strings, S5c block), so a key check can find them.
const VERDICT_KEYS: Record<'edge' | 'outside', Record<MarkSurface, string>> = {
  edge: { chip: 'range.edgeShort', row: 'range.edge', add: 'range.edge', details: 'range.edgeDetails' },
  outside: { chip: 'range.outsideShort', row: 'range.outside', add: 'range.outside', details: 'range.outsideDetails' },
};
const SIDE_KEYS: Record<RangeSide, string> = { cold: 'range.side.cold', mild: 'range.side.mild', hot: 'range.side.hot' };
const ARIDITY_KEYS = { drier: 'range.drier', wetter: 'range.wetter' } as const;
// The curated climates a nearest list can name, each with its own "placed as on the … list" string.
const ESTIMATE_KEYS: Partial<Record<ClimateZone, string>> = { Mediterranean: 'estimate.fromMediterranean', Tropical: 'estimate.fromTropical', Temperate: 'estimate.fromTemperate' };
// To the hundredth, as the rule compares (range.ts passes): a bound of 7.84 never reads 7.8.
const deg = (n: number) => Math.round(n * 100) / 100;

export function rangeMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  const out: Mark[] = [];
  const tight = surface === 'chip';
  const check = rangeCheck(taxon, ctx.location);
  if (check) {
    const { verdict, sides, beyond, aridity } = check;
    if (verdict === 'outside' || verdict === 'edge') {
      out.push({ kind: verdict, key: VERDICT_KEYS[verdict][surface], severity: verdict === 'outside' ? 'warning' : 'note', state: sides.join(' ') });
    } else if (verdict === 'unknown') {
      out.push({ kind: 'unknown', key: tight ? 'range.unknownShort' : 'range.unknown', severity: 'note' });
    }
    if (surface === 'details' && sides.length) {
      const today = siteToday(ctx.location)!, c = taxon.climate!;
      for (const side of sides) {
        const site = side === 'hot' ? today.tmaxWarmC : today.tminColdC;
        const bound = side === 'cold' ? c.tminCold!.low! : side === 'mild' ? c.tminCold!.high! : c.tmaxWarm!.high!;
        out.push({ kind: beyond.includes(side) ? 'outside' : 'edge', key: SIDE_KEYS[side], vars: { site: deg(site), bound: deg(bound) }, severity: 'note', state: side });
      }
    }
    if (!tight && (aridity === 'drier' || aridity === 'wetter')) out.push({ kind: 'aridity', key: ARIDITY_KEYS[aridity], severity: 'note', state: aridity });
    // The sentence in Details; rows and Add get a short tag, so the note never outgrows a phone row (walk-through F1).
    if (!tight && isAnnual(taxon)) out.push({ kind: 'unknown', key: surface === 'details' ? 'range.annual' : 'range.annualShort', severity: 'note', state: 'annual' });
    if (surface === 'details' && aridity === 'not-checked') out.push({ kind: 'unknown', key: 'range.aridityNotChecked', severity: 'note', state: 'aridity' });
  }
  if (taxon.estimate && taxon.placedFrom) {
    const key = (!tight && ESTIMATE_KEYS[taxon.placedFrom]) || 'estimate.short';
    out.push({ kind: 'estimate', key, severity: 'note', state: taxon.placedFrom.toLowerCase() });
    // A borrowed plant with no site climate (a link or a saved consortium opened without a location):
    // nothing checked it against a real place yet (decision row "P5 fixes from the UX audit" (1)).
    if (!tight && !siteToday(ctx.location)) out.push({ kind: 'estimate', key: 'estimate.noSite', severity: 'note', state: 'no-site' });
  }
  return out;
}
