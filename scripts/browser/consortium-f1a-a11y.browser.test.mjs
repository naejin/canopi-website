// F1a stream 6 (accessibility; plan F1a stream 6, design check §4 stream 6, A25, §5 Cancelled/Unmounted):
// one browser test per user scenario, written failing in commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing()) for its owner a11y1 (chunk 1; scripts/plan/f1a-owners.json) with
// its plan label (F1a-An); a11y1 removes each marker in the commit that makes it pass. The screen-reader
// proxy is the focus and the live regions as the page writes them (a11y1 adds its CDP live-region log,
// scripts/browser/live-regions.mjs, and may move these tests onto it). The keyboard journey through
// Palette ("Find…", closing a sheet back to its card) is pal2's F1a-P8; the axe page list is the merge
// agent's. No layout or wording is pinned.
import assert from 'node:assert/strict';
import { suggestReady, useHarness } from './helpers.mjs';
import { choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

// Records every live region ([role=status], [role=alert], [aria-live]) added to the page with its text
// already in it (a screen reader may never read a message that arrives with its region), and every
// text a live region shows, in order.
const watchLiveRegions = async (pg) => pg.evaluateOnNewDocument(() => {
  const LIVE = '[role="status"], [role="alert"], [aria-live]';
  window.__live = { inserted: [], said: [] };
  const say = (el) => { const t = el.textContent.replace(/\s+/g, ' ').trim(); if (t && window.__live.said.at(-1) !== t) window.__live.said.push(t); };
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!(n instanceof Element)) continue;
        for (const el of [n, ...n.querySelectorAll(LIVE)].filter((e) => e.matches(LIVE))) if (el.textContent.trim()) window.__live.inserted.push(el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80));
      }
      const region = (r.target instanceof Element ? r.target : r.target.parentElement)?.closest(LIVE);
      if (region) say(region);
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
});

failing('F1a-A1 (a11y1 toast focus, A25): dismissing the toast with the keyboard keeps the focus on a control of the tool, never <body>', { owner: 'a11y1', reason: /focus fell to <body>/ }, async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 1, { timeout: 15_000 });
  await page.evaluate(() => { const { store } = window.__ctTest; store.removeMember(store.members.value[0]); });
  await page.waitForFunction(() => window.__ctTest.store.toast.value !== null, { timeout: 4000 });
  const dismiss = await page.waitForSelector('#ct-root [role="status"] button:last-of-type', { timeout: 4000 });
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value === null, { timeout: 4000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const at = await page.evaluate(() => ({ body: document.activeElement === document.body || !document.activeElement, inTool: !!document.activeElement?.closest('#ct-root') }));
  assert.equal(at.body, false, 'the toast dismissed: focus fell to <body>');
  assert.equal(at.inTool, true, 'the focus stays in the tool');
});

failing('F1a-A2 (a11y1 status regions, A25): every live region is on the page before its message, and the loading line is announced once', { owner: 'a11y1', reason: /inserted with its message/ }, async () => {
  const page = await tool({ setup: watchLiveRegions });
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 });
  const live = await page.evaluate(() => window.__live);
  assert.deepEqual(live.inserted, [], `a live region was inserted with its message (${live.inserted.length}: ${live.inserted.slice(0, 3).join(' | ')})`);
  const loading = live.said.filter((t, i) => live.said.indexOf(t) !== i);
  assert.deepEqual(loading, [], 'each line is announced once');
});
