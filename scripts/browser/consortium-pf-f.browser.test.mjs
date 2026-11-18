// pf stream f, "One plant" (chunk 3; v14 spec section 2 'pf-f'): the boards Details, DarkDetails,
// DetailsMore and DetailsDesk (the four climate bands, soil pH against the map value as a hint,
// "Drainage: no need recorded.", the dryness note by watering, "Set my own soil pH", "4 of 4 climate
// scenarios agree"), Swap (the v13 deltas) and Correction, as tests. pf commit 0W (2026-11-18) opens
// this file with one board case, marked expected-fail under pf-f (scripts/expect-fail.mjs failing(), its
// reason the board's first missing word, pf-helpers.mjs BOARD); pf-f's commit 0 rewrites the file from
// the v14 board text and removes a marker in the commit that makes it pass.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none yet: pf-f's commit 0 lists here the old tests it carries (pp-c2's Details cases stay there until then)
import { useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, done, palette, says, verdictsSettled } from './pf-helpers.mjs';

useHarness();

failing('PFF1 (pf-f Details at 390, from 0W): a plant\'s Details at Seville say how many climate scenarios agree ("4 of 4 climate scenarios agree") and "Drainage: no need recorded." where none is', { owner: 'pf-f', reason: BOARD }, async () => {
  const page = await palette({ width: 390 });
  await verdictsSettled(page);
  await page.evaluate(() => { const { store } = window.__ctTest; store.openSheet('details', store.members.value[0]); });
  await says(page, /\d of \d climate scenarios agree/, { inDialog: true });
  await says(page, 'Drainage: no need recorded.', { inDialog: true });
  await done(page);
});
