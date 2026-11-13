// The consortium island's entry (commit 0 of P2; stream S1 owns it from here). ConsortiumPage.astro
// imports it from its page script. It reads #ct-data (views/kit/page.ts PageData), renders App into
// #ct-root (replacing the static loading line) and opens the database at once, in parallel with the
// first render (design check A2), so Start works while the plant list loads. Once open, the database is wrapped in the PlantSource
// (data/sqlite-source.ts) and set on the store, which then reads the chosen climate's plants
// (store.watchPools). The store's effects start here (store.start), none on import (E6 S3).
import { h, render } from 'preact';
// The wasm's URL, for the loader to download it itself (a stall timer; review R4-4). Vite emits the one
// sqlite3.<hash>.wasm the package's own new URL('sqlite3.wasm', import.meta.url) names (checked by
// scripts/check-built-site.mjs). Here, not in load.ts: Node's unit tests import load.ts.
import wasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import { App } from './App.tsx';
import { load, setPageCountries, setSource, start, watchPools } from './store.ts';
import { provideLocationStep } from './state/restore.ts';
import { loadLocationStep } from './views/location/load.ts';
import { zoneOf } from '../../lib/consortium/index.ts';
import { setStrings } from './strings.ts';
import { pageData, type PageData } from './views/kit/page.ts';
import type { LoadFailure } from '../../lib/consortium/source.ts';

// The loader and the sqlite-wasm glue are a chunk of their own (modulepreloaded, outside the first
// run's cap: check-built-site.mjs); its import starts at once, beside the first render, and a failed
// import is tried again on Retry.
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
    let source;
    try {
      source = mod.createSqliteSource(opened.db, { images: data.images });
    } catch (err) {
      opened.db.close(); // never left open (pre-push review 4)
      throw err;
    }
    setSource(source, () => opened.db.close());
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

// What the page starts, in order (E6 S3: no module starts anything when imported): the store's
// effects (store.start), the location step's loader handed to the restore (island state never
// imports a view, ADR-1 L2), the pools watcher, the database, then the render, whose Start runs
// startMemory (state/arrival.ts: the waiting Suggest, the save and address watchers) in a layout
// effect, before the first paint (N2 layout shift).
const root = document.getElementById('ct-root');
const data = pageData() as PageData | null;
if (root && data) {
  start();
  provideLocationStep(loadLocationStep);
  setStrings(data.strings, data.lang);
  setPageCountries(data.countries);
  watchPools();
  void open(data);
  // The root stays aria-busy (its static loading line replaced) until App renders into it.
  const onRetry = () => void open(data);
  const show = () => { root.textContent = ''; render(h(App, { guide: data.guide, onRetry }), root); root.removeAttribute('aria-busy'); };
  // The browser-test build loads the test hook (window.__ctTest, __ctFaults) before the first
  // render, the root busy meanwhile, so the hook's chunk needs no modulepreload; a production build
  // folds __CT_TEST_HOOK__ to false and drops the import, so test-hook.ts is in no production chunk
  // (design check A13) and the render follows at once.
  if (__CT_TEST_HOOK__) void import('./test-hook.ts').then(show);
  else show();
}
