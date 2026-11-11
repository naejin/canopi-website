// The layer values of a plant in the details dialog (stream S3; design check §2: the pure parts of
// v1 layers.js, ported): flowering, ripening or fruit seen, sowing and wind, each value with where it
// holds (scope) and its source. A value a dataset records is shown plain; every other kind (extracted
// by a rule, derived from dated photos, llm) is an estimate, marked "estimate" by the view. Months
// come as the source gave them (PlantSource.details reads them round the year from months_from),
// never shifted for a hemisphere, and are written in the page language by Intl.
// Pure: no DOM, no store; W carries the page's words, so scripts/consortium-paste.test.mjs tests it.
import type { LayerField, LayerScope, LayerValue, Month } from '../../../lib/consortium/types.ts';
import { months as MONTHS } from '../../../lib/consortium/types.ts';

// What the helpers need of the page's words (strings.ts T plus Intl names).
export interface Words {
  lang: string;
  T: (key: string, vars?: Record<string, string | number>) => string;
  climate: (zone: string) => string;
  country: (code: string) => string;
  region: (id: string) => string;
  num: (n: number) => string;
}

// The fields in the order the dialog lists them, with the label key each takes.
const LAYER_ROWS: readonly [LayerField, string][] = [
  ['bloom_months', 't.bloom'],
  ['ripening_or_fruit_seen_months', 't.fruit'],
  ['sowing_months', 't.sowing'],
  ['tolerates_wind', 't.wind'],
];

export const isEstimate = (v: Pick<LayerValue, 'kind'>): boolean => v.kind !== 'recorded';

const monthNames = new Map<string, string[]>();
function monthName(lang: string, i: number): string {
  let names = monthNames.get(lang);
  if (!names) {
    const f = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' });
    names = MONTHS.map((_, m) => f.format(Date.UTC(2001, m, 15)));
    monthNames.set(lang, names);
  }
  return names[i];
}

// The runs of months, as [first, last] month indexes (0 = January). A run over December into
// January stays one run ([10, 2] is Nov–Mar): reading starts where a run begins after a gap.
export function monthRuns(list: readonly Month[]): [number, number][] {
  const on = MONTHS.map((m) => list.includes(m));
  if (!on.some(Boolean)) return [];
  if (on.every(Boolean)) return [[0, 11]];
  const start = on.findIndex((x, i) => x && !on[(i + 11) % 12]);
  const runs: [number, number][] = [];
  for (let k = 0; k < 12; k++) {
    const i = (start + k) % 12;
    if (!on[i]) continue;
    if (k > 0 && on[(i + 11) % 12]) runs[runs.length - 1][1] = i;
    else runs.push([i, i]);
  }
  return runs;
}

// "Apr–May", "Nov–Mar", "Jan, Mar–Apr, and Jun"; all twelve: "All year". Runs are joined by the
// site's one list form (Intl.ListFormat), so they stay apart in every locale.
export function monthsText(list: readonly Month[], W: Pick<Words, 'lang' | 'T'>): string {
  if (MONTHS.every((m) => list.includes(m))) return W.T('t.allYear');
  const words = monthRuns(list).map(([a, b]) => (a === b ? monthName(W.lang, a) : `${monthName(W.lang, a)}–${monthName(W.lang, b)}`));
  return new Intl.ListFormat(W.lang, { type: 'conjunction' }).format(words);
}

// Where a value holds: its climate, country (by name), region and latitude band (with its
// hemisphere), or the hemisphere alone; a country says the hemisphere already. null: everywhere.
export function scopeText(scope: LayerScope | null, W: Words): string {
  if (!scope) return W.T('scope.everywhere');
  const parts: string[] = [];
  if (scope.climate) parts.push(W.climate(scope.climate));
  if (scope.country) parts.push(W.country(scope.country));
  if (scope.region) parts.push(W.region(scope.region));
  if (scope.latitude) {
    const [a, b] = scope.latitude.split('..').map(Number).map(Math.abs).sort((x, y) => x - y);
    const south = scope.hemisphere === 'S' || scope.latitude.startsWith('-');
    parts.push(W.T(south ? 'scope.latS' : 'scope.latN', { from: W.num(a), to: W.num(b) }));
  } else if (scope.hemisphere && !scope.country) {
    parts.push(W.T(scope.hemisphere === 'S' ? 'scope.south' : 'scope.north'));
  }
  return parts.join(' · ') || W.T('scope.everywhere');
}

export interface LayerRow { field: LayerField; label: string; values: { text: string; where: string; estimate: boolean }[] }
// The rows the dialog shows, in LAYER_ROWS order, values in file order; a field with no value has no
// row. sourceLabel names a source as the dialog's source list does.
export function layerRows(values: readonly LayerValue[], W: Words, sourceLabel: (id: string) => string): LayerRow[] {
  return LAYER_ROWS.map(([field, label]) => ({
    field,
    label: W.T(label),
    values: values.filter((v) => v.field === field).map((v) => ({
      text: v.months ? monthsText(v.months, W) : W.T(v.flag ? 'yes' : 'no'),
      where: `${scopeText(v.scope, W)} · ${sourceLabel(v.source)}`,
      estimate: isEstimate(v),
    })),
  })).filter((r) => r.values.length);
}
