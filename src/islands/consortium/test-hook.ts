// The one browser-test hook (H16). A page whose script set window.__ctTest = true before the island
// loaded gets { store, openSheet, failSheets } there; nothing in the site sets the flag. The browser
// tests use it only for what no control does: reading the store, a consortium no control makes in one
// step, and a sheet chunk that fails to load (failSheets; views/Details.tsx Lazy).
// Compiled in only for the browser-test build: __CT_TEST_HOOK__ is true only when astro.config.mjs
// sees CANOPI_BROWSER_TEST=1 (npm run build:browser-test); a production build replaces it with false
// and drops the block, and check-built-site fails if __ctTest or failSheets reach dist/.
import * as store from './store.ts';

declare const __CT_TEST_HOOK__: boolean;
export const hookOn: boolean = __CT_TEST_HOOK__;

// sheets: the next sheet chunk fails (views/Details.tsx Lazy). later: the after-the-matrix chunk
// (views/lazy.tsx) fails, or waits until released.
export const testFault: { sheets: boolean; later: 'fail' | 'hold' | null; release: Promise<void> | null } = { sheets: false, later: null, release: null };

if (__CT_TEST_HOOK__) {
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
