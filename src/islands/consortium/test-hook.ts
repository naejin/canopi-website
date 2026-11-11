// The one browser-test hook (H16). A page whose script set window.__ctTest = true before the island
// loaded gets { store, openSheet, failSheets } there; nothing in the site sets the flag. The browser
// tests use it only for what no control does: reading the store, a consortium no control makes in one
// step, and a sheet chunk that fails to load (failSheets; views/Details.tsx Lazy).
// Compiled in only for the browser-test build (PUBLIC_CT_TEST_HOOK=1, which astro.config.mjs refuses
// without CANOPI_BROWSER_TEST=1); a production build replaces the condition with false and drops the
// block, and check-built-site fails if __ctTest or failSheets reach dist/.
import * as store from './store.ts';

export const testFault = { sheets: false };

if (import.meta.env.PUBLIC_CT_TEST_HOOK === '1') {
  const probe = globalThis as { __ctTest?: unknown };
  if (probe.__ctTest === true) probe.__ctTest = { store, openSheet: store.openSheet, failSheets: () => { testFault.sheets = true; } };
}
