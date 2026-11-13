// F1a stream 3 surfaces (one confidence model, ADR-7; plan F1a stream 3, design check §4 stream 3, A16):
// one browser test per user scenario, written failing in commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing()) for its owner conf2 (chunk 2; scripts/plan/f1a-owners.json) with
// its plan label (F1a-Cn). conf2 removes each marker in the commit that makes it pass. No layout or
// wording is pinned: every surface that hedges writes the term it uses as data-conf="<ConfidenceTerm>"
// (types.ts confidenceTerms) on the mark, so the tests compare terms, not words.
//
// Surfaces: a Palette card (the `row` surface, A4) and a Structure chip, the plant dialog (Details), the
// print sheet ([data-print] notes), Add's rows. The sites come from the climate reader at their
// coordinates (location-fixtures.mjs lookupAt), set on the store as the location step would.
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { suggestedAt } from './f1a-helpers.mjs';

useHarness();

const RIYADH = [24.7136, 46.6753]; // BWh: Arid, a borrowed list (no curated Arid list yet)
const OULU = [65.0121, 25.4651]; // Dfc: Boreal, borrowed

// The climate the reader would confirm at the coordinates, its pool read, then Suggest pressed.
const borrowedConsortium = (coords, label, zone) => suggestedAt(coords, zone);
const termsIn = (page, sel) => page.$$eval(`${sel} [data-conf]`, (els) => [...new Set(els.map((e) => e.dataset.conf))].sort());

failing('F1a-C4 (conf2 Riyadh borrowed plant, A16): a borrowed plant near the edge shows the same confidence terms on its card, in Details and in print', { owner: 'conf2', reason: /no surface carries a confidence term/ }, async () => {
  const page = await borrowedConsortium(RIYADH, 'Riyadh', 'Arid');
  assert.ok(await has(page, '#ct-root [data-conf]', 8000), 'no surface carries a confidence term (data-conf) on the page');
  const id = await page.$eval('#ct-root [data-plant-id]:has([data-conf="estimate"])', (e) => e.dataset.plantId);
  const card = await termsIn(page, `#ct-root [data-plant-id="${id}"]`);
  assert.ok(card.includes('estimate'), 'the card says the placement is an estimate');
  await page.evaluate((pid) => window.__ctTest.openSheet('details', pid), id);
  assert.ok(await has(page, 'dialog[open] [data-conf]', 10_000), 'Details shows its terms');
  assert.deepEqual(await termsIn(page, 'dialog[open]'), card, 'Details: the card\'s terms');
  await page.keyboard.press('Escape');
  await page.emulateMediaType('print');
  assert.deepEqual(await termsIn(page, `[data-print] [data-plant-id="${id}"]`), card, 'print: the card\'s terms');
});

failing('F1a-C5 (conf2 Oulu borrowed list, A9 A16): the borrowed list is named once for the palette and every borrowed plant keeps its estimate term', { owner: 'conf2', reason: /no estimate term \(data-conf\) on the borrowed plants/ }, async () => {
  const page = await borrowedConsortium(OULU, 'Oulu', 'Boreal');
  assert.ok(await has(page, '#ct-root [data-conf="estimate"]', 8000), 'no estimate term (data-conf) on the borrowed plants');
  assert.ok(await has(page, '#ct-root [data-borrowed-lists]', 4000), 'one list-level "placed from the … lists" line');
  const unmarked = await page.$$eval('#ct-root [data-view="palette"] [data-plant-id]', (els) => els.filter((e) => !e.querySelector('[data-conf="estimate"]')).map((e) => e.dataset.plantId));
  assert.deepEqual(unmarked, [], 'every borrowed plant keeps its estimate term');
});

failing('F1a-C6 (conf2 range rule fails, A16 §5): with the range rule\'s chunk refused, plants say "not checked" in Add and in Details, never a fit', { owner: 'conf2', reason: /Add: no "not checked" term with the range rule failed/ }, async () => {
  const page = await tool({ block: { range: 404 } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean').catch(() => {});
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.rangeFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the range rule failed');
  await page.evaluate(() => window.__ctTest.openSheet('add'));
  assert.ok(await has(page, 'dialog[open] .ct-rows li', 15_000), 'Add lists plants');
  assert.ok(await has(page, 'dialog[open] .ct-rows li [data-conf="not-checked"]', 4000), 'Add: no "not checked" term with the range rule failed');
  const id = await page.$eval('dialog[open] .ct-rows li [data-plant-id], dialog[open] .ct-rows li[data-plant-id]', (e) => e.dataset.plantId);
  await page.keyboard.press('Escape');
  await page.evaluate((pid) => window.__ctTest.openSheet('details', pid), id);
  assert.ok(await has(page, 'dialog[open] [data-conf="not-checked"]', 10_000), 'Details: "not checked"');
});
