// F1a stream 6 (accessibility; plan F1a stream 6, design check §4 stream 6, A25, §5 Cancelled/Unmounted):
// one browser test per user scenario, written failing in commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing()) for its owner a11y1 (chunk 1; scripts/plan/f1a-owners.json) with
// its plan label (F1a-An); a11y1 removes each marker in the commit that makes it pass. The screen-reader
// proxy is the focus and the live regions as the page writes them (a11y1 adds its CDP live-region log,
// scripts/browser/live-regions.mjs, and may move these tests onto it; the watcher is f1a-helpers.mjs
// watchLiveRegions). A2 covers the regions of a11y1's files (the toast, the sheets' loading lines); the
// live regions of Start and the views (Start's crops count and loading line, the lazy parts' lines) are
// pal1's files and pal1's F1a-P9. The keyboard journey through Palette ("Find…", closing a sheet back to
// its card) is pal2's F1a-P8; the axe page list is the merge agent's. No layout or wording is pinned:
// controls are found by role and accessible name (the name read from the locale file).
import assert from 'node:assert/strict';
import { aria, en, suggestReady, useHarness } from './helpers.mjs';
import { choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { liveLog, resetLive, saidTwice, watchLiveRegions } from './f1a-helpers.mjs';

useHarness();

const DISMISS = aria('button', en['consortium.dismiss']);
const placed = async (page) => {
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 1, { timeout: 15_000 });
};
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));

// Needs only commit 0 and a11y1's files: store.ts hideToast calls focus.ts focusAfterToast (commit 0),
// which a11y1 implements.
failing('F1a-A1 (a11y1 toast focus, A25): dismissing the toast with the keyboard keeps the focus on a control of the tool, never <body>', { owner: 'a11y1', reason: /focus fell to <body>/ }, async () => {
  const page = await tool();
  await placed(page);
  await page.evaluate(() => { const { store } = window.__ctTest; store.removeMember(store.members.value[0]); });
  await page.waitForFunction(() => window.__ctTest.store.toast.value !== null, { timeout: 4000 });
  const dismiss = await page.waitForSelector(DISMISS, { timeout: 4000 });
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value === null, { timeout: 4000 });
  await frames(page);
  const at = await page.evaluate(() => ({ body: document.activeElement === document.body || !document.activeElement, inTool: !!document.activeElement?.closest('#ct-root') }));
  assert.equal(at.body, false, 'the toast dismissed: focus fell to <body>');
  assert.equal(at.inTool, true, 'the focus stays in the tool');
});

// Once the consortium is placed (Start's regions are pal1's F1a-P9): a plant's sheet opened while its
// chunk loads, then the same plant removed, put back with Undo and removed again (two toasts with the
// same line: two announcements, one each).
failing('F1a-A2 (a11y1 status regions, A25): the toast\'s and the sheets\' live regions are on the page before their message, and each line is announced once per toast or opening', { owner: 'a11y1', reason: /inserted with its message/ }, async () => {
  const page = await tool({ setup: watchLiveRegions, block: { details: 'hold' } });
  await placed(page);
  await resetLive(page);
  const id = await page.evaluate(() => window.__ctTest.store.members.value[0]);
  await page.evaluate((x) => window.__ctTest.openSheet('details', x), id);
  await page.waitForFunction(() => window.__live.said.length > 0 || window.__live.inserted.length > 0, { timeout: 4000 }).catch(() => {});
  await page.releaseHeld();
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  await frames(page);
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  for (let i = 0; i < 2; i++) {
    await page.evaluate((x) => window.__ctTest.store.removeMember(x), id);
    await page.waitForFunction(() => window.__ctTest.store.toast.value !== null, { timeout: 4000 });
    await frames(page);
    await page.evaluate(() => { const { store } = window.__ctTest; const { undo } = store.toast.value; store.hideToast(); undo(); });
    await page.waitForFunction((x) => window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, id);
  }
  const live = await liveLog(page);
  assert.deepEqual(live.inserted, [], `a live region was inserted with its message (${live.inserted.length}: ${live.inserted.slice(0, 3).join(' | ')})`);
  assert.ok(live.said.length >= 2, 'each toast was announced');
  assert.deepEqual(saidTwice(live.said), [], 'each line is announced once per toast or opening');
});
