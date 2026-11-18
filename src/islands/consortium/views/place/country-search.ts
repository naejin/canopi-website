// The country line's field "Your country" (board Country; pf-c, views/place/Place.tsx CountryLine):
// what a grower types finds countries by the page-language name, the English name or the ISO code.
// Pure, so node tests read it without the page.
// Accents and case aside: only the Latin combining marks (U+0300–U+036F), so "Réunion" is found by
// "reunion" while Japanese dakuten (U+3099, U+309A) keep ガ apart from カ.
export const foldName = (s: string, lang: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(lang);
// The countries a query finds among `codes`, each [code, name]: a name (page language or English) that
// holds the query, or the ISO code itself; names that start with it first, then by name. At most
// `cap` are listed; `count` is how many match.
export const COUNTRY_RESULTS = 8;
export function findCountries(query: string, codes: Iterable<string>, nameOf: (c: string) => string, englishOf: (c: string) => string, lang: string, cap = COUNTRY_RESULTS): { count: number; list: [string, string][] } {
  const q = foldName(query.trim(), lang);
  if (!q) return { count: 0, list: [] };
  const found: [string, string, number][] = [];
  for (const c of codes) {
    const name = nameOf(c), own = foldName(name, lang), en = foldName(englishOf(c), 'en');
    const rank = own.startsWith(q) || en.startsWith(q) || c.toLowerCase() === q ? 0 : own.includes(q) || en.includes(q) ? 1 : -1;
    if (rank >= 0) found.push([c, name, rank]);
  }
  found.sort((x, y) => x[2] - y[2] || x[1].localeCompare(y[1], lang));
  return { count: found.length, list: found.slice(0, cap).map(([c, n]) => [c, n]) };
}
// What Enter in the field takes: an exact full name (page language or English; accents and case
// aside), else the one match, else nothing (the focus goes to the list). Never the ISO code ahead of
// the list: many two-letter starts of names are codes ("ch" is Switzerland's, Chile starts with it).
export function enterCountry(query: string, codes: Iterable<string>, nameOf: (c: string) => string, englishOf: (c: string) => string, lang: string): string | null {
  const q = foldName(query.trim(), lang);
  if (!q) return null;
  const all = [...codes];
  const exact = all.find((c) => foldName(nameOf(c), lang) === q || foldName(englishOf(c), 'en') === q);
  if (exact) return exact;
  const found = findCountries(query, all, nameOf, englishOf, lang, 1);
  return found.count === 1 ? found.list[0][0] : null;
}
