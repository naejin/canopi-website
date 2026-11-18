// The one browser-test hook (H16), imported only by main.ts, in the test build, before the first
// render (A13). A page whose script set window.__ctTest = true before the island loaded gets
// { store, openSheet, openFind, bandsOf, failSheets, mountMoreList } there; nothing in the site sets the flag. The browser tests use
// it only for what no control does: reading the store, a consortium no control makes in one step, and
// a sheet chunk that fails to load (failSheets; views/lazy.tsx lazyPart; Find's chunk fails by the
// harness's block: { find }).
// Compiled in only for the browser-test build: __CT_TEST_HOOK__ is true only when astro.config.mjs
// sees CANOPI_BROWSER_TEST=1 (npm run build:browser-test); a production build replaces it with false
// and drops the block, and check-built-site fails if __ctTest or failSheets reach dist/.
import { h, render } from 'preact';
import * as store from './store.ts';
import { bandsOf } from '../../lib/consortium/index.ts';
import { MoreList, type MoreListProps } from './views/kit/more.tsx';

// (Read as __CT_TEST_HOOK__ where it is used, not through an exported const, so the production build
// drops each guarded line and testFault with it.)
declare global { const __CT_TEST_HOOK__: boolean }

// sheets: the next sheet chunk fails (views/lazy.tsx lazyPart); find: the next chunk of the find role
// (Find's parts, Paste) fails. later: the after-the-matrix chunk
// (views/lazy.tsx) fails, or waits until released.
// The same object is globalThis.__ctFaults (test-seam.d.ts), which views/lazy.tsx reads inline under
// __CT_TEST_HOOK__ (A13); nothing imports it.
const StringList = (p: MoreListProps<string>) => MoreList<string>(p);
const testFault: { sheets: boolean; later: 'fail' | 'hold' | null; release: Promise<void> | null } = { sheets: false, later: null, release: null };

if (__CT_TEST_HOOK__) {
  globalThis.__ctFaults = testFault;
  const probe = globalThis as { __ctTest?: unknown };
  let release = () => {};
  if (probe.__ctTest === true) probe.__ctTest = {
    store, openSheet: store.openSheet, openFind: store.openFind,
    // The bands core draws for a plant (Details' band numbers are checked against them).
    bandsOf,
    failSheets: () => { testFault.sheets = true; },
    failLater: () => { testFault.later = 'fail'; },
    holdLater: () => { testFault.later = 'hold'; testFault.release = new Promise((r) => { release = r; }); },
    releaseLater: () => { testFault.later = null; release(); },
    // The list fold (views/kit/more.tsx, v14 pf commit 0W) before any stream mounts it: n rows "Plant 1"…
    // in a palette of paletteSize plants, under <main class="ct"> beside the island (never inside #ct-root).
    mountMoreList: (n: number, paletteSize: number) => {
      let el = document.getElementById('ct-more-test');
      if (!el) { el = document.createElement('section'); el.id = 'ct-more-test'; document.querySelector<HTMLElement>('main.ct')?.appendChild(el); }
      const items = Array.from({ length: n }, (_, i) => `Plant ${i + 1}`);
      render(null, el);
      const props: MoreListProps<string> = { items, keyOf: (s) => s, render: (s) => s, paletteSize, label: 'Plants' };
      render(h(StringList, props), el);
    },
  };
}
