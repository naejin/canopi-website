// The one browser-test hook (H16), imported only by main.ts, in the test build, before the first
// render (A13). A page whose script set window.__ctTest = true before the island loaded gets
// { store, openSheet, failSheets } there; nothing in the site sets the flag. The browser tests use
// it only for what no control does: reading the store, a consortium no control makes in one step, and
// a sheet chunk that fails to load (failSheets; views/lazy.tsx lazyPart).
// Compiled in only for the browser-test build: __CT_TEST_HOOK__ is true only when astro.config.mjs
// sees CANOPI_BROWSER_TEST=1 (npm run build:browser-test); a production build replaces it with false
// and drops the block, and check-built-site fails if __ctTest or failSheets reach dist/.
import * as store from './store.ts';

// (Read as __CT_TEST_HOOK__ where it is used, not through an exported const, so the production build
// drops each guarded line and testFault with it.)
declare global { const __CT_TEST_HOOK__: boolean }

// sheets: the next sheet chunk fails (views/lazy.tsx lazyPart). later: the after-the-matrix chunk
// (views/lazy.tsx) fails, or waits until released.
// The same object is globalThis.__ctFaults (test-seam.d.ts), which the loaders read inline under
// __CT_TEST_HOOK__ (A13); the export stays until views/lazy.tsx and Details' loader read the global.
const testFault: { sheets: boolean; later: 'fail' | 'hold' | null; release: Promise<void> | null } = { sheets: false, later: null, release: null };

if (__CT_TEST_HOOK__) {
  globalThis.__ctFaults = testFault;
  const probe = globalThis as { __ctTest?: unknown };
  let release = () => {};
  if (probe.__ctTest === true) probe.__ctTest = {
    store, openSheet: store.openSheet,
    failSheets: () => { testFault.sheets = true; },
    failLater: () => { testFault.later = 'fail'; },
    holdLater: () => { testFault.later = 'hold'; testFault.release = new Promise((r) => { release = r; }); },
    releaseLater: () => { testFault.later = null; release(); },
  };
}
