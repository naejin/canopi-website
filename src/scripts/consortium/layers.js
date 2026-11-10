// The layer values of a plant in the details sheet (added within format 3, 2026-11-10): canopi-data's
// layer table beside the traits (bloom, ripening or fruit seen, sowing, wind), each value with where
// it holds (scope) and its source. A value a dataset records is shown plain; every other kind
// (extracted by a rule, derived from dated photos, llm) is an estimate, marked in words by app.js.
// Months come as the source gave them, never shifted for a hemisphere; they are written in the page
// language by Intl. Pure: W is the page's makeWords (words.js), so T asks consortium.* keys.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The fields in the order the sheet lists them, with the label each takes.
export const LAYER_ROWS = [
  ['bloom_months', 't.bloom'],
  ['ripening_or_fruit_seen_months', 't.fruit'],
  ['sowing_months', 't.sowing'],
  ['tolerates_wind', 't.wind'],
];

export const isEstimate = (v) => v.kind !== 'recorded';

const monthNames = new Map();
const monthName = (lang, i) => {
  if (!monthNames.has(lang)) {
    const f = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' });
    monthNames.set(lang, MONTHS.map((_, m) => f.format(Date.UTC(2001, m, 15))));
  }
  return monthNames.get(lang)[i];
};

// "Apr–May", "Nov–Feb" (a run over the new year stays one run), "Jan, Mar–Apr, and Jun"; all twelve:
// "All year". Runs are joined by the site's one list form (W.list), so they stay apart in every locale.
export function monthsText(months, W) {
  const on = MONTHS.map((m) => months.includes(m));
  if (on.every(Boolean)) return W.T('t.allYear');
  // Start where a run begins after a gap, so a run over December into January is read whole.
  const start = on.findIndex((x, i) => x && !on[(i + 11) % 12]);
  const runs = [];
  for (let k = 0; k < 12; k++) {
    const i = (start + k) % 12;
    if (!on[i]) continue;
    if (k > 0 && on[(i + 11) % 12]) runs[runs.length - 1][1] = i;
    else runs.push([i, i]);
  }
  const words = runs.map(([a, b]) => (a === b ? monthName(W.lang, a) : `${monthName(W.lang, a)}–${monthName(W.lang, b)}`));
  return W.list(words);
}

// Where a value holds: its climate, country (by name), region and latitude band (with its hemisphere),
// or the hemisphere alone; a country says the hemisphere already. null: everywhere.
export function scopeText(scope, W) {
  if (!scope) return W.T('scope.everywhere');
  const parts = [];
  if (scope.climate) parts.push(W.climate(scope.climate.toLowerCase()));
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

// The rows the sheet shows: [{ field, label, values: [{ text, where, estimate }] }], in
// LAYER_ROWS order, values in file order; a field with no value has no row. sourceLabel(id) names a
// source as the sheet's source list does.
export function layerRows(taxon, W, sourceLabel) {
  const values = taxon.layer_values ?? [];
  return LAYER_ROWS.map(([field, label]) => ({
    field,
    label: W.T(label),
    values: values.filter((v) => v.field === field).map((v) => ({
      text: typeof v.value === 'boolean' ? W.T(v.value ? 'yes' : 'no') : monthsText(v.value, W),
      where: `${scopeText(v.scope, W)} · ${sourceLabel(v.source)}`,
      estimate: isEstimate(v),
    })),
  })).filter((r) => r.values.length);
}
