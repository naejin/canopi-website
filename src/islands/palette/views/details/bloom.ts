// The Niche block's Flowers row (boards Details, DetailsDesk; fix round 1 BC2): the bloom months that
// hold near the place, merged into one span. A bloom row is scoped (a climate, a country, a hemisphere
// and a latitude band): only the rows whose scope holds the place count, so months recorded in one
// hemisphere are never shown for the other. One state for every case (fix round 2 R4, round 3 R2 R3):
// 'loading' and 'failed' (the details query still out, or failed: never a claim of none), 'unrecorded'
// (no bloom row at all: "no months recorded", place or not), 'found' (the months), 'no-place' (no
// latitude, and a row a latitude would select: "set a place to see when it flowers here"), 'none' (no
// row holds the place: "no months recorded near your place").
// Pure: no DOM, no store (scripts/palette-pf-f.test.mjs tests it).
import type { ClimateZone, LayerValue, Month } from '../../../../lib/palette/types.ts';
import { months as MONTHS } from '../../../../lib/palette/types.ts';
import { holdsLayerPlace } from '../../../../lib/palette/index.ts';
import { monthRuns } from '../layers.ts';

export interface BloomPlace { lat: number | null; country: string | null; zone: ClimateZone | null }

// The bloom months near the place, merged (in calendar order), and whether any of them is an estimate.
// `values`: the details' layer values, or 'loading' / 'failed' while they are not here.
export type Bloom = { state: 'found'; months: Month[]; estimate: boolean } | { state: 'none' | 'no-place' | 'unrecorded' | 'loading' | 'failed' };
export function bloomNear(values: readonly LayerValue[] | 'loading' | 'failed', at: BloomPlace): Bloom {
  if (values === 'loading' || values === 'failed') return { state: values };
  const all = values.filter((v) => v.field === 'bloom_months' && v.months?.length);
  if (!all.length) return { state: 'unrecorded' };
  const rows = all.filter((v) => holdsLayerPlace(v, at));
  if (!rows.length) return { state: at.lat === null && all.some((v) => holdsLayerPlace(v, at, true)) ? 'no-place' : 'none' };
  const on = new Set(rows.flatMap((r) => r.months!));
  return { state: 'found', months: MONTHS.filter((m) => on.has(m)), estimate: rows.some((r) => r.kind !== 'recorded') };
}

// Months in full names as one span or a few ("October–June", "December–March"; all twelve: allYear).
export function monthsLong(list: readonly Month[], lang: string, allYear: string): string {
  if (MONTHS.every((m) => list.includes(m))) return allYear;
  const f = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' });
  const name = (i: number) => f.format(Date.UTC(2001, i, 15));
  const words = monthRuns(list).map(([a, b]) => (a === b ? name(a) : `${name(a)}–${name(b)}`));
  return new Intl.ListFormat(lang, { type: 'conjunction' }).format(words);
}
