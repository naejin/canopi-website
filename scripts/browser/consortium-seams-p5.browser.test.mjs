// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
//
// This file: the seams P5 added: Jobs and its stage gaps (UX4), late sheet close events (Item 8). Split from consortium-seams by owner (E1 design check A6); shared helpers in
// ./seams-helpers.mjs. Capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-seams-p5.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { useHarness, aria, axNodes, behaviour, en, findAx, has } from './helpers.mjs';
import { PHASES, done, temperate, suggested, memberIds, addRows } from './seams-helpers.mjs';

useHarness();

// Item 8 (ho-misc's flake trace): Escape closes a sheet's <dialog> at once and fires its close event a
// task later; a sheet opened in between (another plant, "+") must survive that late event.
test('Item 8: a sheet\'s late close event never closes the next sheet, opened in the same task', async (t) => {
  // The open dialog's name, once the page has had a few tasks to deliver the close event.
  const openName = (page) => page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 50));
    const d = document.querySelector('dialog.ct-sheet[open]');
    return d ? document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim() ?? '' : null;
  });
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const ids = await memberIds(page); // the palette page's chips (All plants went in PP-B commit 0a')
    assert.ok(ids.length >= 2, 'two plants to open');
    await page.locator(`#ct-root [data-plant-id="${ids[0]}"] button, #ct-root button[data-plant-id="${ids[0]}"]`).click();
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    const second = await page.evaluate((id) => {
      const b = document.querySelector(`#ct-root [data-plant-id="${CSS.escape(id)}"] button, #ct-root button[data-plant-id="${CSS.escape(id)}"]`);
      document.querySelector('dialog.ct-sheet[open]').close(); // what Escape does
      b.click();
      return b.closest('[data-plant-id]').querySelector('.ct-sci')?.textContent.trim() ?? b.textContent.trim();
    }, ids[1]);
    const name = await openName(page);
    assert.ok(name !== null, 'Details → another plant: the second plant\'s sheet stays open');
    assert.ok(name.includes(second) || second.includes(name), `the second plant's sheet ("${name}", "${second}")`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('dialog.ct-sheet[open]').length), 1);

    // Details → Add: the Next step's "See all" (Add preset to the hole; the matrix's "+" went in PP-B
    // commit 0a') opened as the plant's sheet closes.
    await page.locator('dialog.ct-sheet[open] .ct-sheet-head .ct-icon-button').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await page.click('#ct-root .ct-chart button[data-plant-id]');
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    assert.ok(await page.$('.ct-next .ct-next-actions .button'), 'a Next step with See all');
    await page.evaluate(() => {
      const all = document.querySelector('.ct-next .ct-next-actions .button');
      document.querySelector('dialog.ct-sheet[open]').close();
      all.click();
    });
    // See all opens Find, preset to the hole (FillHole).
    assert.ok((await openName(page)) !== null && await page.$('dialog.ct-find[open]'), 'Details → See all: Find stays open');
    await done(page);
  });
});
