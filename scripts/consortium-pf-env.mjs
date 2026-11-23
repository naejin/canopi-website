// The set-up the pf node tests share (consortium-pf-0w, -pf-a, -pf-b; the locale reader also for the P5
// seam tests): the page's words in each locale, the core with English words, and the installed release
// opened as the page opens it. One copy, so a change to how the page reads its words or its export is
// made once.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// A locale file of the site (src/i18n/translations/<l>.json), and the 11 locales.
export const locale = (l) => JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
export const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

// The page's English words, as ConsortiumPage.astro writes them into #ct-data (consortium.* without the
// prefix), set in the strings module; `say` then reads a core Line in English.
export async function english() {
  const en = locale('en');
  (await import('../src/islands/palette/strings.ts')).setStrings(Object.fromEntries(Object.entries(en).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice(11), v])), 'en');
  const words = await import('../src/islands/palette/words.ts');
  return { en, say: (l) => words.say(l) };
}

// The installed release (src/data/consortium-index.json and its export under public/), opened as the
// page opens it, with the scenario fixtures and the store.
export async function installedRelease() {
  const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
  const scenarios = JSON.parse(readFileSync(new URL('./fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
  const [{ openBytes }, { createSqliteSource }, store, { state }] = await Promise.all([
    import('../src/islands/palette/data/load.ts'), import('../src/islands/palette/data/sqlite-source.ts'),
    import('../src/islands/palette/store.ts'), import('../src/islands/palette/state/schema.ts'),
  ]);
  const exportBytes = new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url))));
  const real = createSqliteSource((await openBytes(exportBytes, { releaseId: index.release_id, climates: index.climates })).db, { images: {} });
  return { index, scenarios, store, state, real };
}
