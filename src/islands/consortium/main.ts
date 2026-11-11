// The consortium island's entry (commit 0 of P2; stream S1 owns it from here). ConsortiumPage.astro
// imports it from its page script. It reads #ct-data, renders App into #ct-root (replacing the static
// loading line) and opens the database at once, in parallel with the first render (design check A2),
// so Start works while the plant list loads. Once open, the database is wrapped in the PlantSource
// (data/sqlite-source.ts) and set on the store, which then reads the chosen climate's plants
// (store.watchPools). The other streams add their wiring to the store and views, not here.
import { h, render } from 'preact';
// The wasm's URL, for the loader to download it itself (a stall timer; review R4-4). Vite emits the one
// sqlite3.<hash>.wasm the package's own new URL('sqlite3.wasm', import.meta.url) names (checked by
// scripts/check-built-site.mjs). Here, not in load.ts: Node's unit tests import load.ts.
import wasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import { App } from './App.tsx';
import { load, setSource, watchPools } from './store.ts';
import { zoneOf } from '../../lib/consortium/index.ts';
import { setStrings, type Strings } from './strings.ts';
import type { DbRef } from './data/bytes.ts';
import type { LoadFailure } from '../../lib/consortium/source.ts';

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


// The loader and the sqlite-wasm glue are a chunk of their own (design check §8 leaves it out of the
// island's 60 KB budget); its import starts at once, beside the first render, and a failed import
// is tried again on Retry.
type Loader = typeof import('./data/load.ts');
let loader: Promise<Loader> | null = null;
const getLoader = () => (loader ??= import('./data/load.ts').catch((err: unknown) => { loader = null; throw err; }));

// Retry opens a new database: the one opened before is closed first (store.setSource).
async function open(data: PageData): Promise<void> {
  load.value = { status: 'loading', error: null };
  setSource(null);
  let LoadError: Loader['LoadError'] | null = null;
  try {
    const mod = await getLoader();
    LoadError = mod.LoadError;
    const opened = await mod.openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map((c) => zoneOf(c) ?? c) }, wasmUrl);
    setSource(mod.createSqliteSource(opened.db, { images: data.images }), () => opened.db.close());
    load.value = { status: 'ready', error: null };
  } catch (err) {
    // The loader chunk did not arrive: offline is the fetch screen; online, the chunk is gone after a
    // deploy (its hash changed), so the page is stale and Reload fetches the new one (review B2).
    // Anything else unknown after the loader arrived is damage.
    const failure: LoadFailure = LoadError
      ? (err instanceof LoadError ? err.failure : 'damaged')
      : (navigator.onLine === false ? 'fetch' : 'stale');
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
  watchPools();
  void open(data);
}
