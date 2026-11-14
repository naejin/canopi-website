// PP-B stream b2 (the palette page and its shell): its browser tests (plant-palette-slices, PP-B
// rows). Commit 0 moved four F1a markers here unchanged, each verified still failing for its stated
// reason after 0a (expected-fail, scripts/expect-fail.mjs failing(), owner b2 in each title; b2 removes
// a marker in the commit that makes it pass): A1 and A2 from consortium-f1a-a11y (toast focus, live
// regions), S1 from consortium-f1a-perf (wasm preload), P2 from consortium-f1a-palette (return visit:
// the palette page's placeholder, never the Place form). Their bodies still read F1a's contract
// (store.view 'palette', [data-head-placeholder]); b2 rewrites them against the palette page.
// Run capped: npm run test:browser (scripts/browser/run.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aria, en, h, has, layoutVariants, suggestReady, useHarness } from './helpers.mjs';
import { choose, temperateLink, tool } from './p5-helpers.mjs';
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

const PHONE = { width: 390 };
const WASM = /\/sqlite3\.[\w-]+\.wasm$/;
const LOADER = /\/_astro\/load\.[\w-]+\.js$/;
// Every request of the page, in order, with the time it started (CDP-free: the page's own events).
const logRequests = (log) => async (pg) => { pg.on('request', (r) => { try { log.push({ path: new URL(r.url()).pathname, at: performance.now() }); } catch { /* data: */ } }); };

const storeView = (page) => page.evaluate(() => window.__ctTest.store.view.value);

// Close each page's context once used (BT-8, as consortium-s4 does).
const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };

// Needs only commit 0 and a11y1's files: store.ts hideToast calls focus.ts focusAfterToast (commit 0),
// which a11y1 implements.
failing('F1a-A1 → PP-B (b2 toast focus, A25): dismissing the toast with the keyboard keeps the focus on a control of the tool, never <body>', { owner: 'b2', reason: /focus fell to <body>/ }, async () => {
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
failing('F1a-A2 → PP-B (b2 status regions, A25): the toast\'s and the sheets\' live regions are on the page before their message, and each line is announced once per toast or opening', { owner: 'b2', reason: /inserted with its message/ }, async () => {
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

failing('F1a-S1 → PP-B (b2 wasm preload, A24): the sqlite wasm is preloaded with the URL the loader fetches, requested once, and asked for before the loader chunk', { owner: 'b2', reason: /no wasm preload link on the page/ }, async () => {
  const log = [];
  const page = await tool({ ...PHONE, setup: logRequests(log) });
  const preload = await page.$eval('link[rel="preload"][href*=".wasm"]', (l) => ({ href: new URL(l.href).pathname, crossorigin: l.getAttribute('crossorigin') })).catch(() => null);
  assert.ok(preload, 'no wasm preload link on the page');
  const wasm = log.filter((r) => WASM.test(r.path));
  assert.equal(wasm.length, 1, 'the wasm is requested once (the preload is reused)');
  assert.equal(wasm[0].path, preload.href, 'the preload names the fetched wasm');
  assert.notEqual(preload.crossorigin, null, 'the preload is crossorigin, as the fetch');
  const loader = log.find((r) => LOADER.test(r.path));
  assert.ok(loader && wasm[0].at <= loader.at, 'the wasm is asked for before the loader chunk');
});

failing('F1a-P2 → PP-B (b2 return visit, A7): a saved consortium reopens on Palette with a Head placeholder while it restores; the Start form never shows', { owner: 'b2', reason: /return visit: / }, async () => {
  const save = JSON.stringify({ fragment: (await temperateLink()).slice(1), at: '2026-11-13T00:00:00.000Z', src: null });
  const page = await h.open('/consortium/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((s) => {
    if (!localStorage.getItem('canopi-consortium')) localStorage.setItem('canopi-consortium', s);
    window.__seen = { start: false, placeholder: false };
    new MutationObserver(() => {
      if (document.querySelector('#ct-root input[name="ct-climate"]')) window.__seen.start = true;
      if (document.querySelector('[data-head-placeholder]')) window.__seen.placeholder = true;
    }).observe(document, { subtree: true, childList: true, attributes: true });
  }, save) });
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length === 5, { timeout: 20_000 }).then(() => true, () => false), 'the saved members restored');
  const seen = await page.evaluate(() => window.__seen);
  assert.equal(seen.start, false, 'return visit: the Start form showed while restoring');
  assert.equal(seen.placeholder, true, 'return visit: no Head placeholder while restoring');
  assert.equal(await storeView(page), 'palette', 'return visit: opens Palette');
});

// Moved unchanged from consortium-s4 in PP-B commit 0a' (plant-palette-slices 1b), so b1a never edits a
// print case; b2 rewrites "printed above the drawing" for the year step of Through the years (PP-B18).
test('PP-B18 (b2 / BT-8 print, drawing; moved from S4 in commit 0a\'): ≤ 20 plants print the side view drawing', async (t) => {
  await layoutVariants(t, async (v) => {
    const small = await h.open('/consortium/', { ...v, data: 'fixture' });
    await small.locator(aria('radio', 'Temperate')).click();
    await small.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(small, aria('button', 'Share'), 8000), 'the result and its actions');
    await h.pdf(small);
    const drawing = await small.$eval('.ct-print', (el) => {
      const img = el.querySelector('[role="img"]');
      const r = img?.getBoundingClientRect();
      return img ? { name: img.getAttribute('aria-label'), h: r.height, w: r.width, shapes: el.querySelectorAll('svg *').length } : null;
    });
    assert.ok(drawing, '≤ 20 plants: the print sheet has the drawing');
    assert.match(drawing.name, /^Side view/, 'named as the side view');
    assert.ok(drawing.h > 50 && drawing.w > 200, `printed at a readable size (${drawing.w} × ${drawing.h})`);
    assert.ok(drawing.shapes > 4, 'with its plants drawn');
    // Which stage the drawing shows is printed above it (pre-push review 5).
    const above = await small.$eval('.ct-print [role="img"]', (img) => {
      let el = img;
      while (el && !el.previousElementSibling) el = el.parentElement;
      return el?.previousElementSibling?.textContent.trim() ?? '';
    });
    const stages = Object.keys(en).filter((k) => /^consortium\.phase\.\w+\.plain$/.test(k));
    assert.ok(stages.some((k) => above.includes(en[k]) && above.includes(en[k.replace('.plain', '.term')])), `the stage named above the drawing (got "${above}")`);
    await done(small);
  });
});
