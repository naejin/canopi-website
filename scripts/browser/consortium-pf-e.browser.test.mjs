// pf stream e, "Many plants" (chunk 3; v14 spec section 2 'pf-e'): the boards Paste and AddMany state 4
// (every line read, three closed groups, "Add 174 plants"), Many and ManyDesk (Your plants as a list and
// a table, sort, group, ticks, "Remove 3 plants"), PaletteMore and Recife (the small form) and the bulk
// toasts, as tests. pf commit 0W (2026-11-18) opens this file with one board case, marked expected-fail
// under pf-e (scripts/expect-fail.mjs failing(), its reason the board's first missing word,
// pf-helpers.mjs BOARD); pf-e's commit 0 rewrites the file from the v14 board text and removes a marker
// in the commit that makes it pass. The 200-plant palette is pf-helpers.mjs loadPalette200 (scenario
// case kiambu-200).
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none yet: pf-e's commit 0 lists here the old tests it carries (PP-B29's 200-plant rows stay in pp-b2 until then)
import assert from 'node:assert/strict';
import { useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, done, loadPalette200, says } from './pf-helpers.mjs';

useHarness();

failing('PFE1 (pf-e Many at 390, from 0W): the 200-plant Kiambu palette shows "Your 200 plants" with Sort and Group, and its groups folded past the size rule ("+ N more")', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadPalette200({ width: 390 });
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), 200);
  await says(page, 'Your 200 plants');
  await says(page, /Sort[^]*Group/);
  await says(page, /\+ \d+ more/);
  await done(page);
});
