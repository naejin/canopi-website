// The consortium island's entry (commit 0 of P2; stream S1 owns it from here). PalettePage.astro
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
import { App, PalettePage } from './App.tsx';
import { effect } from '@preact/signals';
import { adoptEntry, arrivalOpensPalette, forgetEntries, historyMoved, load, loadProgress, pushWaiting, opening, setPageClimates, setPageCountries, setSource, slow, start, view, wantVerdict, watchPools, watchSteps } from './store.ts';
import { LANG_SWITCH_KEY, openingArrival, startMemory } from './state/arrival.ts';
import { backToPlace } from './state/draft.ts';
import { currentFragment, lastWritten, ownAddressState, writeAddress } from './state/persist.ts';
import { provideLocationStep } from './state/restore.ts';
import { loadLocationStep } from './views/location/load.ts';
import { zoneOf } from '../../lib/palette/index.ts';
import { setStrings } from './strings.ts';
import { watchFocus } from './focus.ts';
import { pageData, type PageData } from './views/kit/page.ts';
import type { LoadFailure } from '../../lib/palette/source.ts';

// The loader and the sqlite-wasm glue are a chunk of their own (modulepreloaded, outside the first
// run's cap: check-built-site.mjs); its import starts at once, beside the first render, and a failed
// import is tried again on Retry.
type Loader = typeof import('./data/load.ts');
let loader: Promise<Loader> | null = null;
const getLoader = () => (loader ??= import('./data/load.ts').catch((err: unknown) => { loader = null; throw err; }));

// The browser-test build's hook chunk (test-hook.ts), once asked for; null in a production build.
let testHook: Promise<unknown> | null = null;
// Retry opens a new database: the one opened before is closed first (store.setSource).
async function open(data: PageData): Promise<void> {
  load.value = { status: 'loading', error: null };
  slow.value = false;
  loadProgress.value = null;
  setSource(null);
  let LoadError: Loader['LoadError'] | null = null;
  try {
    const mod = await getLoader();
    LoadError = mod.LoadError;
    const opened = await mod.openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map((c) => zoneOf(c) ?? c) }, wasmUrl, () => { slow.value = true; }, (got, total) => {
      const step = (n: number) => Math.floor(n / 100_000);
      if (step(got) !== step(loadProgress.peek()?.got ?? -100_000)) loadProgress.value = { got, total };
    });
    let source;
    try {
      source = mod.createSqliteSource(opened.db, { images: data.images });
    } catch (err) {
      opened.db.close(); // never left open (pre-push review 4)
      throw err;
    }
    // The browser-test build hands the source over only once the test hook is in, so a test's fault on
    // the source (window.__ctTest set before the island) is in place before the first read; the hook
    // is a dynamic import racing the database (PP-B exit, P5-27i). A production build drops the line.
    if (__CT_TEST_HOOK__) await testHook?.catch(() => {});
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
// imports a view, ADR-1 L2), the pools and steps watchers, the database's open (its loader chunk's
// import starts at once, before open's first await), then startMemory (state/arrival.ts: the
// arrival, the waiting Suggest, the save and address watchers), then the first render, so the country
// guess and a stored or linked climate are in its first frame (N2 layout shift).
const root = document.getElementById('ct-root');
const data = pageData() as PageData | null;
if (root && data) {
  start();
  provideLocationStep(loadLocationStep);
  setStrings(data.strings, data.lang);
  setPageCountries(data.countries);
  setPageClimates(data.climates);
  watchPools();
  watchSteps();
  // A return visit (a save or a link to restore) opens on the palette page's placeholder, never the
  // Place form (P2): the placeholder stays until the palette shows, the load fails, or the restore
  // has had its time once the plants are read.
  const how = openingArrival();
  opening.value = how.kind === 'saved' || how.kind === 'link';
  // That opening's step to the palette page is the page's, not the reader's: no history entry.
  arrivalOpensPalette(opening.peek());
  if (opening.peek()) {
    let after: ReturnType<typeof setTimeout> | undefined;
    const stop = effect(() => {
      const { status } = load.value;
      // Ended already: a refused link or save (restore.ts endOpening) shows Place with its notice.
      if (!opening.value) { clearTimeout(after); queueMicrotask(() => stop()); return; }
      if (view.value !== 'start' || status === 'failed') { clearTimeout(after); opening.value = false; if (status === 'failed') arrivalOpensPalette(false); queueMicrotask(() => stop()); }
      else if (status === 'ready' && after === undefined) after = setTimeout(() => { opening.value = false; arrivalOpensPalette(false); }, 3000);
    });
  }
  // A palette to show (a save, a link, a guide's plant): the palette page's chunk and the verdict
  // chunk are fetched beside the database, not one after the other once it is open (perf-3), right
  // after the first render (so they never delay it). A failed prefetch leaves the page's own load to
  // try again and say so (PP-B24).
  const ahead = how.kind === 'saved' || how.kind === 'link' || how.kind === 'preset';
  const fetchAhead = () => { if (ahead) { PalettePage.prefetch().catch(() => {}); wantVerdict(); } };
  // Back and Forward across the entries a sheet or the palette step pushed (store.historyMoved;
  // coordinator row 2026-11-14): the sheet closes or Place shows, then the entry landed on takes the
  // current link at once. The hashchange that may follow then lands on the address the page last
  // wrote (persist.ts lastWritten) and stops here, before the memory's own listener (registered after
  // this one) could read it as a link to open. A hashchange onto an entry of the page's own address
  // takes that entry's entries and start; any other is the reader's: a link opened in the tab, which
  // is a new start.
  addEventListener('popstate', (e) => {
    // A link opened in the tab fires popstate onto a new entry with a fragment and no state (the page
    // writes a state with every fragment it writes); its hashchange opens it.
    if (e.state == null && location.hash.length > 1) return;
    const moved = historyMoved(e.state);
    if (moved.away) return; // off a link opened in the tab: its hashchange opens the entry landed on
    if (moved.place) backToPlace();
    writeAddress(moved.force);
    pushWaiting();
  });
  addEventListener('hashchange', (e) => {
    const f = location.hash.slice(1);
    if (f === lastWritten()) { e.stopImmediatePropagation(); return; }
    // The page's own address (a move off a link landed on it): that entry's own entries and start.
    const s = (() => { try { return history.state as { ct?: unknown } | null; } catch { return null; } })();
    if (f && s?.ct === f) adoptEntry(s);
    else if (f && f !== currentFragment()) forgetEntries();
  });
  // Preserve active palette (owned or held shared link) across header language switches without
  // touching Header.astro or writing canopi-consortium localStorage (Wave 5 N11).
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('[data-lang-menu] a[href], .nav-panel-langs a[href]') : null;
    if (!target) return;
    if (view.peek() !== 'matrix') return;
    const frag = currentFragment();
    if (!frag) return;
    try {
      const own = ownAddressState(frag);
      if (own) {
        try { sessionStorage.setItem(LANG_SWITCH_KEY, JSON.stringify(own)); } catch { /* ignore private storage */ }
      }
      const u = new URL(target.href, location.href);
      u.hash = `#${frag}`;
      target.href = u.href;
    } catch { /* ignore malformed href */ }
  }, true);
  // The test build's hook, asked for first (open() waits for it before handing over the source).
  if (__CT_TEST_HOOK__) testHook = import('./test-hook.ts');
  // The database first: its loader chunk is on the way while the memory starts (the country guess).
  void open(data);
  startMemory();
  // The root keeps its static loading line, aria-busy, until App renders into it.
  const onRetry = () => void open(data);
  const show = () => { root.textContent = ''; render(h(App, { guide: data.guide, onRetry }), root); root.removeAttribute('aria-busy'); watchFocus(root); fetchAhead(); };
  // The browser-test build loads the test hook (window.__ctTest, __ctFaults) before the first
  // render, the root busy meanwhile, so a test that waits for the render (harness loadState) never
  // reads the loading line as ready, preloaded hook chunk or not; a production build folds
  // __CT_TEST_HOOK__ to false and drops the import, so test-hook.ts is in no production chunk
  // (design check A13) and the render follows at once. A hook that fails to load (or a first render
  // that throws) ends the wait with a load error naming it (harness loadState reads 'test-hook').
  if (__CT_TEST_HOOK__) {
    void testHook!.then(show).catch((err: unknown) => {
      const why = `Consortium test build: the test hook or the first render failed: ${(err as Error)?.message ?? String(err)}`;
      console.error(why);
      const p = document.createElement('p');
      p.dataset.loadError = 'test-hook';
      p.textContent = why;
      root.replaceChildren(p);
      root.removeAttribute('aria-busy');
    });
  } else show();
}
