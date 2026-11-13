// The island's one reader of #ct-data (E6 design check §7.1: "#ct-data readers (3)"): what
// ConsortiumPage.astro hands the island, parsed once. main.ts reads the whole object (strings,
// database, countries, climates: handed to the store, store.setPageClimates); Start, PoolSlot, the
// pool panel and the print sheet read `start` through page(); the plant dialog reads `guideTitles`. A page without the element (or
// with text that does not parse) reads as null, and page() then gives empty defaults.
import type { DbRef } from '../../data/bytes.ts';
import type { Strings } from '../../strings.ts';

// Start (stream S4): every site climate in the site's order with its label and three example places,
// the contact address for "Ask for this climate", and the site's own URL for the print foot.
export interface StartData { zones: { id: string; label: string; places: string }[]; contact: string; site: string }

// What the page hands the island (ConsortiumPage.astro, checked by scripts/check-built-site.mjs).
export interface PageData {
  lang: string;
  strings: Strings;
  releaseId: string;
  db: DbRef;
  climates: string[]; // site ids, lowercase ('tropical'), in the export's order
  images: Record<string, string>; // plant uuid → self-hosted photo path
  countries?: { checked: string; unchecked: string }; // space-separated ISO codes (store.knownCountries)
  guide: { url: string; lang: string } | null;
  guideTitles?: Record<string, string>; // guide slug → title in the guide's language (en or fr)
  start?: StartData;
}

let read: Partial<PageData> | null | undefined;
export function pageData(): Partial<PageData> | null {
  if (read === undefined) {
    try {
      const raw = typeof document === 'undefined' ? null : document.getElementById('ct-data')?.textContent;
      read = raw ? (JSON.parse(raw) as Partial<PageData>) : null;
    } catch {
      read = null;
    }
  }
  return read;
}

let shown: { start: StartData } | null = null;
export function page(): { start: StartData } {
  if (!shown) {
    const d = pageData() ?? {};
    shown = { start: d.start ?? { zones: [], contact: '/', site: location.href } };
  }
  return shown;
}
