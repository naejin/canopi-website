// The words every consortium view shares, one helper each (E6 design check §7.1): a plant's name, the
// climate and list names, a country's name, the stage words, a layer's name, the site basis, and
// numbers and lists in the page language. Helpers whose text is the same are one helper (the climate
// name: the site-wide climate.<zone> key, which is also the label #ct-data `start.zones` carries);
// helpers whose text differs stay apart (`listName` says "Temperate list", `zoneName` "Temperate").
// - stage words: plain time first, the app's term beside it ("Years 1–3 · Placenta 3", owner row
//   "Phases" 2026-10-27); a span reads "Years 3–15 → 60 years on · Secondary 1 – Climax".
import type { ClimateZone, Taxon } from '../../../../lib/palette/index.ts';
import { T, nameOf, pageLang } from '../../strings.ts';
import { formatNumber } from '../../format.ts';

type Order = (a: Taxon, b: Taxon) => number;
const collators = new Map<string, Intl.Collator>();
function collatorFor(lang: string): Intl.Collator {
  let c = collators.get(lang);
  if (!c) { c = new Intl.Collator(lang); collators.set(lang, c); }
  return c;
}
const nameOrder = (nameOf: (t: Taxon) => string, lang: string): Order => {
  const c = collatorFor(lang);
  return (a, b) => c.compare(nameOf(a), nameOf(b));
};

export { nameOf };

const num = (n: number, max = 1): string => formatNumber(n, pageLang(), max);
export const coords = (lat: number, lon: number): string =>
  T('location.coords', { lat: num(Math.abs(lat), 2), lon: num(Math.abs(lon), 2), ns: T(lat < 0 ? 'location.dir.s' : 'location.dir.n'), ew: T(lon < 0 ? 'location.dir.w' : 'location.dir.e') });

export const zoneName = (z: ClimateZone | null): string => (z ? T(`climate.${z.toLowerCase()}`) : '');
