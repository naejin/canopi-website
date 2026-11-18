// pf stream d, "Your place in figures" (chunk 3; v14 spec section 2 'pf-d', section 3): the boards
// SiteKiambu, PlaceDesk and SiteMendoza (the panel, "What limits plants here", the Watering line, the
// "El agua" card) and the change-summary toasts, as tests. pf commit 0W (2026-11-18) opens this file
// with one board case, marked expected-fail under pf-d (scripts/expect-fail.mjs failing(), its reason
// the board's first missing word, pf-helpers.mjs BOARD); pf-d's commit 0 rewrites the file from the v14
// board text (behaviour tests, failure rows of section 5, neighbour rows of section 6) and removes a
// marker in the commit that makes it pass. Board figures come from the engine (scenario cases
// kiambu-8*, mendoza-board-*), never a hard-coded board number.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none yet: pf-d's commit 0 lists here the old tests it carries (none known: the panel is new)
import assert from 'node:assert/strict';
import { useHarness } from './helpers.mjs';
import { atSite, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, done, section } from './pf-helpers.mjs';

useHarness();

failing('PFD1 (pf-d SiteKiambu at 390, from 0W): under the place questions, "Your place in figures" with its climate lines "Coldest nights", "Hottest days", "Rain a year", "Dry months in a row", each "From the climate map" with Change', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await tool({ width: 390 });
  await atSite(page, 'kiambu');
  const text = await section(page, 'Your place in figures');
  for (const w of ['Coldest nights', 'Hottest days', 'Rain a year', 'Dry months in a row', 'From the climate map', 'Change']) assert.ok(text.includes(w), `board: "Your place in figures" says "${w}"`);
  await done(page);
});
