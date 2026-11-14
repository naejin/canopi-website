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
import { App, PalettePage } from './App.tsx';
import { effect } from '@preact/signals';
import { arrivalOpensPalette, forgetEntries, historyMoved, load, pushWaiting, opening, setPageClimates, setPageCountries, setSource, slow, start, view, wantVerdict, watchPools, watchSteps } from './store.ts';
import { arrival, startMemory } from './state/arrival.ts';
import { changeSite } from './state/draft.ts';
import { currentFragment, memory, readRecord, STORE, writeAddress } from './state/persist.ts';
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
  slow.value = false;
  setSource(null);
  let LoadError: Loader['LoadError'] | null = null;
  try {
    const mod = await getLoader();
    LoadError = mod.LoadError;
    const opened = await mod.openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map((c) => zoneOf(c) ?? c) }, wasmUrl, () => { slow.value = true; });
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
  setPageClimates(data.climates);
  watchPools();
  watchSteps();
  // A return visit (a save or a link to restore) opens on the palette page's placeholder, never the
  // Place form (P2): the memory starts before the first render, and the placeholder stays until the
  // palette shows, the load fails, or the restore has had its time once the plants are read.
  const how = arrival({ hash: location.hash, search: location.search }, readRecord(memory.read(STORE)), null, (() => { try { return history.state; } catch { return null; } })());
  opening.value = how.kind === 'saved' || how.kind === 'link';
  // That opening's step to the palette page is the page's, not the reader's: no history entry.
  arrivalOpensPalette(opening.peek());
  if (opening.peek()) {
    let after: ReturnType<typeof setTimeout> | undefined;
    const stop = effect(() => {
      const { status } = load.value;
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
  // current link at once, before the hashchange that follows reads it. Registered before the memory's
  // own hashchange listener: a link opened in the tab (not the page's own address) ends those entries.
  // The hashchange of such a move (entries whose addresses differ) is the page's own: it stops here,
  // never reaching the memory's listener, which would read the address landed on as a link to
  // restore (on Place it holds the set-aside palette's link, not the one shown: review r2 hist-1,
  // an Undo back to Place leaving the palette step's entry). Told by the address written here.
  // Only a move whose hashchange will come arms that (review r3 hash-1): a Back between two entries
  // with the same address (a sheet's, pushed with the current href) fires popstate and no hashchange,
  // and an address left armed would swallow the reader's own later hashchange to it (that link pasted
  // after an edit rewrote the address in place). The browser fires hashchange when the fragment
  // landed on differs from the one shown before the move; by popstate the address already holds the
  // one landed on, so the one before is read at the Navigation API's navigate event (a traversal,
  // the address not yet changed). Without the Navigation API the address before is unknown: every
  // move arms it until the reader's next input in the page (below).
  let moveAddress: string | null = null;
  let shownBefore: string | null = null;
  try {
    (globalThis as { navigation?: EventTarget }).navigation?.addEventListener('navigate', (e) => {
      if ((e as Event & { navigationType?: string }).navigationType === 'traverse') shownBefore = location.hash;
    });
  } catch { /* no Navigation API: shownBefore stays null */ }
  // Where the address before is unknown, the reader's next press or key in the page disarms it: a
  // move's own hashchange is queued with the traversal, before any later input, and the stale case
  // needs an edit in the page (a press) before the paste.
  const disarm = () => { moveAddress = null; };
  addEventListener('pointerdown', disarm, { capture: true, passive: true });
  addEventListener('keydown', disarm, { capture: true, passive: true });
  addEventListener('popstate', (e) => {
    const before = shownBefore, landed = location.hash;
    shownBefore = null;
    // A link opened in the tab (pasted, or a same-page link) fires popstate before its hashchange,
    // onto a new entry with no state: not a move across the page's entries (every one of those holds
    // the state persist.ts writes). Without the Navigation API historyMoved would read it as a Back.
    if (e.state == null) return;
    const moved = historyMoved();
    if (!moved) return;
    if (moved.place) changeSite();
    writeAddress(moved.force);
    moveAddress = before === null || before !== landed ? location.hash : null;
    pushWaiting();
  });
  addEventListener('hashchange', (e) => {
    const mine = moveAddress !== null && location.hash === moveAddress;
    moveAddress = null;
    if (mine) { e.stopImmediatePropagation(); return; }
    const f = location.hash.slice(1);
    if (f && f !== currentFragment()) forgetEntries();
  });
  // The database first: its loader chunk is on the way while the memory starts (the country guess).
  void open(data);
  startMemory();
  // The root keeps its static loading line, aria-busy, until App renders into it.
  const onRetry = () => void open(data);
  const show = () => { root.textContent = ''; render(h(App, { guide: data.guide, onRetry }), root); root.removeAttribute('aria-busy'); fetchAhead(); };
  // The browser-test build loads the test hook (window.__ctTest, __ctFaults) before the first
  // render, the root busy meanwhile, so a test that waits for the render (harness loadState) never
  // reads the loading line as ready, preloaded hook chunk or not; a production build folds
  // __CT_TEST_HOOK__ to false and drops the import, so test-hook.ts is in no production chunk
  // (design check A13) and the render follows at once. A hook that fails to load (or a first render
  // that throws) ends the wait with a load error naming it (harness loadState reads 'test-hook').
  if (__CT_TEST_HOOK__) {
    void import('./test-hook.ts').then(show).catch((err: unknown) => {
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
