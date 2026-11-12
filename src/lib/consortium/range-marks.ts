// Stream S5c: the marks of the range check and of borrowed placements (a marks.ts provider). Imported
// only by mark-providers.ts, the lazy chunk, so its code never weighs on the first run; not exported
// from index.ts for the same reason.
// - With a site climate (range.ts rangeCheck): 'outside' (a warning: "outside its observed range"),
//   'edge' ("near the edge of its observed range"), 'aridity' (a mark only, never the verdict: drier
//   or wetter than where it is recorded; its own kind, so the edge marks and the panel's "N near the
//   edge" agree), 'unknown' ("range not recorded"; and in Details, aridity "not checked" on ice).
//   Details adds one line per bound passed, with the site's and the recorded values (the very values
//   the verdict compared, to the hundredth, so the gap a reader works out matches it), a line after a
//   low bound whose sources disagree (a weak row: TreeGOER stricter, no value exported, so no number:
//   'range.disputed'; the verdict is never softened), a line
//   after a bound taken from TreeGOER ('range.source.treegoer', ClimateRange low/highSource), and says
//   observed ranges include cultivation and are estimates, not reviewed (export meta ranges_review).
//   An annual (range.ts isAnnual: is_annual or grown_as_annual; no winter checks) claims no season
//   (owner, decision row "Growing months" 2026-11-12: the USDA growth period classes too few annuals
//   and some wrongly): "annual" on rows and in Add, in Details "An annual, re-sown each year: its winter
//   cold is not checked." (not on chips). An annual beyond its heat range
//   (rangeCheck coolSeason) gets instead "grow in the cool season" on rows and in Add and "Too hot in
//   summer here: grow it in the cool season." in Details (decision row "Climate ranges fixed before
//   the P5 push"); the CSS wraps every non-chip mark, so neither outgrows a phone row.
// - With or without a location: 'estimate' on a plant placed from a nearest list (placement.ts);
//   without a site climate, also "give your site's location to check it" (not on chips).
// Chips (desktop matrix) get the short words.
import type { ClimateZone, Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import type { RangeBound, RangeSide } from './range.ts';
import { isAnnual, RANGE_BOUNDS, rangeCheck, siteToday } from './range.ts';

// Every key written out (consortium.* strings, S5c block), so a key check can find them.
const VERDICT_KEYS: Record<'edge' | 'outside', Record<MarkSurface, string>> = {
  edge: { chip: 'range.edgeShort', row: 'range.edge', add: 'range.edge', details: 'range.edgeDetails' },
  outside: { chip: 'range.outsideShort', row: 'range.outside', add: 'range.outside', details: 'range.outsideDetails' },
};
const SIDE_KEYS: Record<RangeSide, string> = { cold: 'range.side.cold', mild: 'range.side.mild', cool: 'range.side.cool', summer: 'range.side.summer', hot: 'range.side.hot' };
// The bound each side reads, and the site value it is compared with (range.ts RANGE_BOUNDS).
const SIDE_BOUND = Object.fromEntries(RANGE_BOUNDS.map((b) => [b.side, b])) as Record<RangeSide, RangeBound>;
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
        const b = SIDE_BOUND[side], range = c[b.range]!;
        const kind = beyond.includes(side) ? 'outside' : 'edge';
        out.push({ kind, key: SIDE_KEYS[side], vars: { site: deg(b.site(today)), bound: deg(range[b.end]!) }, severity: 'note', state: side });
        // The bound came from TreeGOER (stricter than the thinned GBIF cells there): credited where shown.
        if ((b.end === 'low' ? range.lowSource : range.highSource) === 'treegoer_ranges') out.push({ kind, key: 'range.source.treegoer', severity: 'note', state: 'source' });
        // Sources disagree on this limit (a weak row marks a disputed cold or warmth low, canopi-data
        // export doc): said after that low only, the verdict unchanged.
        else if (range.weak && b.end === 'low') out.push({ kind, key: 'range.disputed', severity: 'note', state: 'disputed' });
      }
    }
    if (!tight && (aridity === 'drier' || aridity === 'wetter')) out.push({ kind: 'aridity', key: ARIDITY_KEYS[aridity], severity: 'note', state: aridity });
    // The sentence in Details; rows and Add get a short tag, so the note never outgrows a phone row (walk-through F1).
    if (!tight && check.coolSeason) out.push({ kind: 'season', key: surface === 'details' ? 'range.coolSeason' : 'range.coolSeasonShort', severity: 'note', state: 'cool' });
    else if (!tight && isAnnual(taxon)) out.push({ kind: 'unknown', key: surface === 'details' ? 'range.annual' : 'range.annualShort', severity: 'note', state: 'annual' });
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
