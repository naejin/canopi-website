// pf-e's board helpers (chunk 3, "Many plants"): Your plants read off the page (its rows, ticks and
// groups), the figures re-derived from the page's own store (the board-figures rule: never a board
// number), and the Paste sheet opened with a text.
import assert from 'node:assert/strict';
import { has } from './helpers.mjs';

// Your plants' section and rows ([data-plant-id] rows, in the order shown).
export const PLANTS = '#ct-root .ct-plants';
export const rowsShown = (page) => page.$$eval(`${PLANTS} [data-plant-id]`, (els) => els.map((e) => ({
  id: e.dataset.plantId, fit: e.dataset.fit ?? null, text: e.innerText.replace(/\s+/g, ' ').trim(),
  ticked: !!e.querySelector('input[type="checkbox"]')?.checked,
})));

// Each light level's member count, from the store (members with no level: 'none').
export const strataCounts = (page) => page.evaluate(() => {
  const out = {};
  for (const t of window.__ctTest.store.memberTaxa.value) { const s = t.stratum?.value ?? 'none'; out[s] = (out[s] ?? 0) + 1; }
  return out;
});
export const LIGHT_OF = { emergent: 'Full sun', high: 'Mostly sun', medium: 'Part shade', low: 'Shade' };

// The members' fit rank as Your plants sorts it (outside 0, a second look 1, fits with a mark 2, fits 3,
// not checked 4), through the engine's own rule: weigh.ts fitGroups over the page's verdicts and flags
// (as the page reads them: none while the verdict chunk failed), then the model's plantItems, run here
// in node on the page's taxa; never a copy of the second-look rule.
export async function fitRanks(page) {
  const { fitGroups } = await import('../../src/lib/consortium/weigh.ts');
  const { plantItems } = await import('../../src/islands/consortium/views/plants/model.ts');
  const { taxa, verdicts, flags } = await page.evaluate(() => {
    const s = window.__ctTest.store;
    return { taxa: s.memberTaxa.value, verdicts: s.verdictFailed.value ? null : [...(s.memberVerdicts.value ?? new Map())], flags: s.flags.value };
  });
  const items = plantItems(taxa, fitGroups(taxa, verdicts ? new Map(verdicts) : null, flags), (t) => t.id);
  return Object.fromEntries(items.map((i) => [i.id, i.rank]));
}

// Paste opened with a text, read at once ("Read the list").
export async function pasteText(page, text) {
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, 'dialog[open] #ct-paste-text', 15_000), 'board: no Paste sheet');
  await page.$eval('dialog[open] #ct-paste-text', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, text);
  await page.click('dialog[open] [data-paste-read]');
}

// A text field set as a reader types it (its input event; Puppeteer has no fill).
export const typeIn = (page, sel, v) => page.$eval(sel, (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
