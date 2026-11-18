// The Niche block's Flowers row (boards Details, DetailsDesk; fix round 1 BC2): the bloom months that
// hold near the place, merged into one span. A bloom row is scoped (a climate, a country, a hemisphere
// and a latitude band): only the rows whose scope holds the place count, so months recorded in one
// hemisphere are never shown for the other. Three states (fix round 2 R4): 'found' (the months), 'none'
// (a place is set and no row holds it: "no months recorded near your place"), 'no-place' (no latitude
// and no row that holds everywhere: "set a place to see when it flowers here", never a claim of none).
// Pure: no DOM, no store (scripts/consortium-pf-f.test.mjs tests it).
import type { ClimateZone, LayerValue, Month } from '../../../../lib/consortium/types.ts';
import { months as MONTHS } from '../../../../lib/consortium/types.ts';
import { monthRuns } from '../layers.ts';

export interface BloomPlace { lat: number | null; country: string | null; zone: ClimateZone | null }

// Whether a bloom row's scope holds the place.
function holdsPlace(v: Pick<LayerValue, 'climate' | 'scope'>, at: BloomPlace): boolean {
  if (v.climate !== null && at.zone !== null && v.climate !== at.zone) return false;
  const s = v.scope;
  if (!s) return true;
  if (s.climate && at.zone !== null && s.climate !== at.zone) return false;
  if (s.country && s.country.toUpperCase() !== (at.country ?? '').toUpperCase()) return false;
  if (s.hemisphere) {
    if (at.lat === null) return false;
    if ((s.hemisphere === 'S') !== (at.lat < 0)) return false;
  }
  if (s.latitude) {
    if (at.lat === null) return false;
    let [a, b] = s.latitude.split('..').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    // A band names its hemisphere by its sign ("-23..0"); a southern scope written unsigned is turned.
    if (s.hemisphere === 'S' && a >= 0 && b >= 0) [a, b] = [-b, -a];
    if (at.lat < Math.min(a, b) || at.lat > Math.max(a, b)) return false;
  }
  return true;
}

// The bloom months near the place, merged (in calendar order), and whether any of them is an estimate.
export type Bloom = { state: 'found'; months: Month[]; estimate: boolean } | { state: 'none' } | { state: 'no-place' };
export function bloomNear(values: readonly LayerValue[], at: BloomPlace): Bloom {
  const rows = values.filter((v) => v.field === 'bloom_months' && v.months?.length && holdsPlace(v, at));
  if (!rows.length) return { state: at.lat === null ? 'no-place' : 'none' };
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
