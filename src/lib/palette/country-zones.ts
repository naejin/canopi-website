// A country's time zones from the runtime's CLDR data (Intl.Locale getTimeZones, or the older
// timeZones getter); [] where the runtime has none (Firefox) or the code is not a region. One owner for
// the page's build-time table (PalettePage.astro, in Node) and the browser's fallback
// (islands/palette/state/arrival.ts guessCountry).
export function countryZones(code: string): string[] {
  try {
    const l = new Intl.Locale('und-' + code) as Intl.Locale & { getTimeZones?: () => string[]; timeZones?: string[] };
    const z = l.getTimeZones?.() ?? l.timeZones;
    return Array.isArray(z) ? z : [];
  } catch { return []; }
}
