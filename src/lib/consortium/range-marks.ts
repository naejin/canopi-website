// Stream S5c: the marks of the range check and of borrowed placements (a marks.ts provider). Imported
// only by mark-providers.ts, the lazy chunk, so its code never weighs on the first run; not exported
// from index.ts for the same reason.
// - With a site climate (range.ts rangeCheck): 'outside' (a warning: "outside its observed range"),
//   'edge' ("near the edge of its observed range"; also aridity, a mark only: drier or wetter than
//   where it is recorded), 'unknown' ("range not recorded"; and in Details, aridity "not checked" on
//   ice). Details adds one line per bound passed, with the site's and the recorded values, and says
//   observed ranges include cultivation and are estimates, not reviewed (export meta ranges_review).
// - With or without a location: 'estimate' on a plant placed from a nearest list (placement.ts).
// Chips (desktop matrix) get the short words.
import type { ClimateZone, Mark, MarkSurface, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import type { RangeSide } from './range.ts';
import { rangeCheck, siteToday } from './range.ts';

// Every key written out (consortium.* strings, S5c block), so a key check can find them.
const VERDICT_KEYS: Record<'edge' | 'outside', Record<MarkSurface, string>> = {
  edge: { chip: 'range.edgeShort', row: 'range.edge', add: 'range.edge', details: 'range.edgeDetails' },
  outside: { chip: 'range.outsideShort', row: 'range.outside', add: 'range.outside', details: 'range.outsideDetails' },
};
const SIDE_KEYS: Record<RangeSide, string> = { cold: 'range.side.cold', mild: 'range.side.mild', hot: 'range.side.hot' };
const ARIDITY_KEYS = { drier: 'range.drier', wetter: 'range.wetter' } as const;
// The curated climates a nearest list can name, each with its own "placed as on the … list" string.
const ESTIMATE_KEYS: Partial<Record<ClimateZone, string>> = { Mediterranean: 'estimate.fromMediterranean', Tropical: 'estimate.fromTropical', Temperate: 'estimate.fromTemperate' };
const deg = (n: number) => Math.round(n * 10) / 10;

export function rangeMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  const out: Mark[] = [];
  const tight = surface === 'chip';
  const check = rangeCheck(taxon, ctx.location);
  if (check) {
    const { verdict, sides, beyond, aridity } = check;
    if (verdict === 'outside' || verdict === 'edge') {
      out.push({ kind: verdict, key: VERDICT_KEYS[verdict][surface], severity: verdict === 'outside' ? 'warning' : 'note', state: sides.join(' ') });
    } else if (verdict === 'unknown') {
      out.push({ kind: 'unknown', key: 'range.unknown', severity: 'note' });
    }
    if (surface === 'details' && sides.length) {
      const today = siteToday(ctx.location)!, c = taxon.climate!;
      for (const side of sides) {
        const site = side === 'hot' ? today.tmaxWarmC : today.tminColdC;
        const bound = side === 'cold' ? c.tminCold!.low! : side === 'mild' ? c.tminCold!.high! : c.tmaxWarm!.high!;
        out.push({ kind: beyond.includes(side) ? 'outside' : 'edge', key: SIDE_KEYS[side], vars: { site: deg(site), bound: deg(bound) }, severity: 'note', state: side });
      }
    }
    if (!tight && (aridity === 'drier' || aridity === 'wetter')) out.push({ kind: 'edge', key: ARIDITY_KEYS[aridity], severity: 'note', state: aridity });
    if (surface === 'details' && aridity === 'not-checked') out.push({ kind: 'unknown', key: 'range.aridityNotChecked', severity: 'note', state: 'aridity' });
  }
  if (taxon.estimate && taxon.placedFrom) {
    const key = (!tight && ESTIMATE_KEYS[taxon.placedFrom]) || 'estimate.short';
    out.push({ kind: 'estimate', key, severity: 'note', state: taxon.placedFrom.toLowerCase() });
  }
  return out;
}
