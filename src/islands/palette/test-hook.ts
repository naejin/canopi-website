// The one browser-test hook (H16), imported only by main.ts, in the test build, before the first
// render (A13). Compiled in only for the browser-test build (__CT_TEST_HOOK__).
import * as store from './store.ts';

declare global { const __CT_TEST_HOOK__: boolean }

const testFault: { sheets: boolean; later: 'fail' | 'hold' | null; release: Promise<void> | null } = { sheets: false, later: null, release: null };

if (__CT_TEST_HOOK__) {
  globalThis.__ctFaults = testFault;
  const probe = globalThis as { __ctTest?: unknown };
  let release = () => {};
  if (probe.__ctTest === true) probe.__ctTest = {
    store,
    failLater: () => { testFault.later = 'fail'; },
    holdLater: () => { testFault.later = 'hold'; testFault.release = new Promise((r) => { release = r; }); },
    releaseLater: () => { testFault.later = null; release(); },
  };
}
