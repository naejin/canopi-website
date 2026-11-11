// The consortium island's entry (commit 0 of P2): ConsortiumPage.astro imports it from its page
// script. It reads #ct-data, renders App into #ct-root (replacing the static loading line) and opens
// the database at once, in parallel with the first render (design check A2), so Start works while
// the plant list loads. Streams add their wiring to the store and views, not here.
import { h, render } from 'preact';
import { App } from './App.tsx';
import { load } from './store.ts';
import { setStrings, type Strings } from './strings.ts';
import { LoadError, openDatabase, type DbRef } from './data/load.ts';

// What the page hands the island (ConsortiumPage.astro, checked by scripts/check-built-site.mjs).
export interface PageData {
  lang: string;
  strings: Strings;
  releaseId: string;
  db: DbRef;
  climates: string[]; // site ids, lowercase ('tropical'), in the export's order
  images: Record<string, string>; // plant uuid → self-hosted photo path
  guide: { url: string; lang: string } | null;
}

const zoneOf = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

async function open(data: PageData): Promise<void> {
  load.value = { status: 'loading', error: null };
  try {
    const opened = await openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map(zoneOf) });
    // S1 wraps `opened` in its PlantSource (data/sqlite-source.ts) and sets store.source here.
    void opened;
    load.value = { status: 'ready', error: null };
  } catch (err) {
    const failure = err instanceof LoadError ? err.failure : 'damaged';
    console.error(`Consortium data ${data.releaseId}: ${(err as Error).message}`);
    load.value = { status: 'failed', error: failure };
  }
}

const root = document.getElementById('ct-root');
const raw = document.getElementById('ct-data')?.textContent;
if (root && raw) {
  const data = JSON.parse(raw) as PageData;
  setStrings(data.strings, data.lang);
  root.textContent = '';
  root.removeAttribute('aria-busy');
  render(h(App, { guide: data.guide, onRetry: () => void open(data) }), root);
  void open(data);
}
