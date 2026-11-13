// F1a stream 2 (Add filters and site offers, P5.1; plan F1a stream 2, design check §4 stream 2, A13 A14):
// one browser test per user scenario, written failing in commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing()) for its owner add3 (chunk 3, after the D2a reinstall;
// scripts/plan/f1a-owners.json) with its plan label (F1a-Fn). add3 writes the persona expectations first
// (row "Filters in Add (P5.1)": a filter that changes no decision is cut, and its test with it) and
// removes each marker in the commit that makes it pass. No layout or wording is pinned. The contract:
// - each filter in the Add sheet is a control [data-filter="<id>"] (fits, range, holds, life-cycle,
//   nitrogen, edible, native) whose state is aria-pressed or :checked;
// - [data-filter-unknown="<id>"]: the count of plants the filter cannot judge (shown, never hidden);
// - Add's rows: dialog[open] .ct-rows li, each with its [data-plant-id].
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { suggestedAt } from './f1a-helpers.mjs';

useHarness();

const NO_FILTERS = 'Add: no filter controls ([data-filter])';
const on = (page, id) => page.$eval(`dialog[open] [data-filter="${id}"]`, (e) => e.getAttribute('aria-pressed') === 'true' || e.checked === true).catch(() => null);
const rowIds = (page) => page.$$eval('dialog[open] .ct-rows li', (els) => els.map((e) => e.dataset.plantId ?? e.querySelector('[data-plant-id]')?.dataset.plantId).filter(Boolean).sort());
// The site, the climate, Suggest, then Add opened as a context opens it (a cell's "+ Add", or none).
async function addAt(site, zone, target = {}) {
  const page = await suggestedAt(site, zone);
  await page.evaluate((t) => window.__ctTest.openSheet('add', null, t), target);
  assert.ok(await has(page, 'dialog[open] .ct-rows li', 15_000), 'Add lists plants');
  assert.ok(await has(page, 'dialog[open] [data-filter]', 2000), NO_FILTERS);
  return page;
}
const toggle = async (page, id) => { const before = await rowIds(page); await page.click(`dialog[open] [data-filter="${id}"]`); await page.waitForFunction((n) => document.querySelectorAll('dialog[open] .ct-rows li').length !== n, { timeout: 4000 }, before.length).catch(() => {}); return before; };

failing('F1a-F1 (add3 Lyon food forest, P5.1): a cell\'s "+ Add" opens with "Fits your site" on', { owner: 'add3', reason: /Add: no filter controls/ }, async () => {
  const page = await addAt('lyon', 'Temperate', { cell: { stratum: 'low', from: 0, to: 2 } });
  assert.equal(await on(page, 'fits'), true, '"Fits your site" is on for a cell');
});

failing('F1a-F2 (add3 Seville dry garden, P5.1 A14): "Holds up in the future climate" changes the plants offered', { owner: 'add3', reason: /Add: no filter controls/ }, async () => {
  const page = await addAt('seville', 'Mediterranean');
  const before = await toggle(page, 'holds');
  assert.notDeepEqual(await rowIds(page), before, '"Holds up" changes the pick at Seville');
});

failing('F1a-F3 (add3 Nairobi smallholding, P5.1 A14): "Has edible parts" and a life cycle narrow the plants offered', { owner: 'add3', reason: /Add: no filter controls/ }, async () => {
  const page = await addAt('nairobi', 'Subtropical');
  const all = await toggle(page, 'edible');
  const edible = await rowIds(page);
  assert.ok(edible.length && edible.length < all.length, `"Has edible parts" narrows the list (${edible.length} of ${all.length})`);
  await toggle(page, 'life-cycle');
  const both = await rowIds(page);
  assert.ok(both.length <= edible.length && both.every((id) => edible.includes(id)), 'a life cycle narrows it further');
});

failing('F1a-F4 (add3 unknowns as counts, P5.1): a filter that cannot judge some plants says how many, never hides them silently', { owner: 'add3', reason: /Add: no filter controls/ }, async () => {
  const page = await addAt('seville', 'Mediterranean');
  await toggle(page, 'edible');
  const n = await page.$eval('dialog[open] [data-filter-unknown="edible"]', (e) => Number(e.textContent.replace(/\D+/g, ''))).catch(() => null);
  assert.ok(Number.isInteger(n) && n >= 0, 'the unknowns are counted');
});

failing('F1a-F5 (add3 no location, P5.1): without a site location the range and native filters are not offered, the others are', { owner: 'add3', reason: /Add: no filter controls/ }, async () => {
  const page = await addAt(null, 'Temperate');
  assert.equal(await page.$('dialog[open] [data-filter="range"]'), null, 'no range filter without a location');
  assert.equal(await page.$('dialog[open] [data-filter="native"]'), null, 'no native filter without a location');
  assert.notEqual(await page.$('dialog[open] [data-filter="fits"]'), null, '"Fits your site" is still offered');
});
