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
import { aria, en, h, has, layoutVariants, realDb, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { liveLog, resetLive, saidTwice, watchLiveRegions } from './f1a-helpers.mjs';
import { openCards } from './location-fixtures.mjs';
import { showPalette } from './seams-helpers.mjs';

useHarness();

const DISMISS = aria('button', en['consortium.dismiss']);
const placed = async (page) => {
  await choose(page, 'Temperate');
  await suggestReady(page);
  // Only [data-place-suggest]: on b1a's Place ".ct-cta .button-primary" is "Show my palette" (it comes first).
  await page.locator('[data-place-suggest]').click(); // b1a's Place marks Suggest data-place-suggest
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 1, { timeout: 15_000 });
};
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));

const PHONE = { width: 390 };
const WASM = /\/sqlite3\.[\w-]+\.wasm$/;
const LOADER = /\/_astro\/load\.[\w-]+\.js$/;
// Every request of the page, in order, with the time it started (CDP-free: the page's own events).
const logRequests = (log) => async (pg) => { pg.on('request', (r) => { try { log.push({ path: new URL(r.url()).pathname, url: r.url(), at: performance.now() }); } catch { /* data: */ } }); };

// Close each page's context once used (BT-8, as consortium-s4 does).
const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };

// Needs only commit 0 and a11y1's files: store.ts hideToast calls focus.ts focusAfterToast (commit 0),
// which a11y1 implements.
test('F1a-A1 → PP-B (b2 toast focus, A25): dismissing the toast with the keyboard keeps the focus on a control of the tool, never <body>', async () => {
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
test('F1a-A2 → PP-B (b2 status regions, A25): the toast\'s and the sheets\' live regions are on the page before their message, and each line is announced once per toast or opening', async () => {
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

test('F1a-S1 → PP-B (b2 wasm preload, A24): the sqlite wasm is preloaded with the URL the loader fetches, requested once, and asked for before the loader chunk', async () => {
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

// Moved unchanged from consortium-s4 in PP-B commit 0a' (plant-palette-slices 1b), so b1a never edits a
// print case; b2 rewrites "printed above the drawing" for the year step of Through the years (PP-B18).
test('PP-B18 (b2 / BT-8 print, drawing; moved from S4 in commit 0a\'): ≤ 20 plants print the side view drawing', async (t) => {
  await layoutVariants(t, async (v) => {
    const small = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(small);
    await small.locator(aria('radio', 'Temperate')).click();
    await small.locator(aria('button', en['consortium.start.suggest'])).click();
    assert.ok(await has(small, aria('button', 'Copy link'), 8000), 'the result and its actions');
    await h.pdf(small);
    await small.waitForSelector('.ct-print', { timeout: 8000 }); // mounted for print (review r1 perf-4)
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

// ---- the palette page (PP-B rows of b2; plant-palette-slices section 2) ----

const PAGE = '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]';
const onPage = (page, timeout = 15_000) => has(page, PAGE, timeout);
const plural = (v, n) => { const m = /other:\s*([^|]*)/.exec(v); return (m ? m[1] : v).replace('#', String(n)).trim(); };
// Three Temperate plants of the real export (the paste a grower makes with their own list).
const own = (n = 3) => realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT ?").all(n).map((r) => String(r.id)));
// The reader's own plants added on Place, then "Show my palette": the palette page.
const ownPalette = async (page, n) => {
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(n));
  await showPalette(page);
  assert.ok(await onPage(page), 'the palette page');
};
// Two own plants on the palette page with its Next step's fillers, toasts lasting 0.3 s, none showing.
const fillersPalette = async () => {
  const page = await tool({ timeouts: { toast: 300 } });
  await choose(page, 'Temperate');
  await ownPalette(page, 2);
  await page.waitForSelector('.ct-fillers li .button-primary', { timeout: 8000 });
  await page.evaluate(() => window.__ctTest.store.hideToast());
  return page;
};
// Dismiss the toast from the keyboard and let the focus settle.
const dismissToast = async (page) => {
  await page.focus(DISMISS);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value === null, { timeout: 4000 });
  await frames(page);
};

test('PP-B26 (b2 marks, F1a-S2 restored, A24; review r1 perf-5): ct:start fires once on a first visit, and ct:first-view once, only when the palette page shows its Next step', async () => {
  // The fit card itself (a hole named, or "No holes"), never the title every branch shows (review r2
  // test-1: a pending or list-missing card has the same h3).
  const page = await tool({ ...PHONE, setup: (pg) => pg.evaluateOnNewDocument((none) => {
    window.__nextAt = null;
    new MutationObserver((_, o) => {
      const n = document.querySelector('.ct-next');
      if (n && (n.dataset.hole || n.textContent.includes(none))) { window.__nextAt = performance.now(); o.disconnect(); }
    }).observe(document, { childList: true, subtree: true });
  }, en['consortium.palette.noHoles']) });
  const marks = (name) => page.evaluate((n) => performance.getEntriesByName(n, 'mark').length, name);
  await frames(page);
  assert.equal(await marks('ct:start'), 1, 'ct:start once on Place');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await marks('ct:first-view'), 0, 'not on Place: the palette is not on screen yet');
  await placed(page);
  assert.ok(await page.waitForFunction(() => performance.getEntriesByName('ct:first-view', 'mark').length > 0, { timeout: 15_000 }).then(() => true, () => false), 'ct:first-view fires');
  assert.deepEqual([await marks('ct:start'), await marks('ct:first-view')], [1, 1], 'each once per page');
  const [mark, next] = await page.evaluate(() => [performance.getEntriesByName('ct:first-view', 'mark')[0].startTime, window.__nextAt]);
  assert.ok(next !== null && mark >= next, `marked once the Next step is on screen (mark ${Math.round(mark)} ms, Next step ${Math.round(next ?? -1)} ms)`);
  await done(page);
});

// Review r1 perf-3: a return visit or a link fetches the palette page's chunk and the verdict chunk
// beside the database, not one after the other once it is open.
test('PP-B30 (b2 link arrival, review r1 perf-3): the palette page\'s chunk and the verdict chunk are asked for while the database still downloads', async () => {
  const log = [];
  const page = await h.open(`/palette/${await temperateLink()}`, { hook: true, mapTiles: 'stub', database: 'hold', setup: logRequests(log) });
  await page.waitForFunction(() => window.__ctTest?.store?.load, { timeout: 15_000 });
  // Both asked for, or the database's hold outlasted: either way read the log while it is held.
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /\/_astro\/Palette\./.test(e.name)), { timeout: 5000 }).catch(() => {});
  const asked = log.map((r) => r.path);
  const held = await page.evaluate(() => window.__ctTest.store.load.value.status);
  assert.notEqual(held, 'ready', 'the database is still held');
  assert.ok(asked.some((p) => /\/_astro\/Palette\.[\w-]+\.js$/.test(p)), `the palette page's chunk asked for during the download (${asked.filter((p) => p.includes('_astro')).map((p) => p.split('/').pop()).join(', ')})`);
  assert.ok(asked.some((p) => /\/_astro\/verdict\.[\w-]+\.js$/.test(p)), 'the verdict chunk asked for during the download');
  await page.releaseHeld();
  assert.ok(await onPage(page), 'then the palette page');
  await done(page);
});

// PP-B exit (2026-11-16, flake PP-B16): the connection back in the very moment "Needs a connection"
// shows, before the line's effects ran (views/lazy.tsx LoadFailed), still retries the part. The
// browser's onLine and its events are the page's own here (no CDP round trip), flipped by a
// MutationObserver as the line lands; the palette chunk's first request fails as offline, later ones pass.
test('PP-B16b (b2 offline, PP-B exit): back online the moment "Needs a connection" shows, the palette page still loads by itself', async () => {
  const fakeNet = (p) => p.evaluateOnNewDocument(() => {
    let on = true;
    Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: () => on });
    window.__net = (v) => { on = v; dispatchEvent(new Event(v ? 'online' : 'offline')); };
  });
  const page = await tool({ block: { palette: 'offline-once' }, setup: fakeNet });
  await choose(page, 'Temperate');
  await page.evaluate(() => window.__net(false));
  assert.ok(await page.waitForFunction((t) => document.querySelector('.ct-offline')?.textContent.includes(t), { timeout: 4000 }, en['consortium.load.offline']).then(() => true, () => false), 'the offline line');
  const ids = await own(3);
  await page.evaluate((x, t) => {
    window.__flipped = false;
    new MutationObserver((_, o) => {
      if (![...document.querySelectorAll('#ct-root .ct-notice[role="alert"]')].some((n) => n.textContent.trim() === t)) return;
      o.disconnect(); window.__flipped = true; window.__net(true);
    }).observe(document.getElementById('ct-root'), { childList: true, subtree: true, characterData: true });
    window.__ctTest.store.addMembers(x);
  }, ids, en['consortium.load.needsConnection']);
  await showPalette(page);
  assert.ok(await page.waitForFunction(() => window.__flipped, { timeout: 8000 }).then(() => true, () => false), '"Needs a connection" showed, and the connection came back at once');
  assert.ok(page.blocked.some((u) => h.roles.palette.includes(u)), 'the palette chunk was refused once');
  assert.ok(await onPage(page, 10_000), 'the palette page loads by itself');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.members.value), ids, 'the added plants stay');
  await done(page);
});

test('PP-B17 (b2 toast): a toast stays while the focus is in it, then the focus returns to the control that raised it', async () => {
  const page = await fillersPalette();
  await page.evaluate(() => { document.querySelector('.ct-fillers li .button-primary').dataset.raiser = ''; });
  await page.focus('[data-raiser]');
  await page.keyboard.press('Enter');
  // The Add hands the focus to the Next step's title two frames after the render (focusNextStep); a
  // focus moved into the toast before that is taken back out, and the 0.3 s test toast then goes (CI
  // flake, 2026-11-17). Wait for that landing, then focus Undo in the page the frame it is found.
  await page.waitForFunction(() => document.activeElement?.id === 'ct-next-t', { timeout: 4000, polling: 'raf' });
  await page.waitForFunction((label) => {
    const b = [...document.querySelectorAll('.ct-toast button')].find((e) => e.textContent.trim() === label);
    b?.focus();
    return !!b && document.activeElement === b;
  }, { timeout: 4000, polling: 'raf' }, en['consortium.undo']);
  await new Promise((r) => setTimeout(r, 900));
  assert.notEqual(await page.evaluate(() => window.__ctTest.store.toast.value), null, 'the toast waits while focused (three times its 0.3 s)');
  await dismissToast(page);
  // The raiser (a Next step filler's Add) leaves as its plant joins: the focus went to the Next step's
  // title, which the toast hands it back to (review r1 conformance-3).
  const at = await page.evaluate(() => { const a = document.activeElement, r = document.querySelector('[data-raiser]'); return { raiser: !!r && a === r, next: a?.id === 'ct-next-t', connected: !!r }; });
  assert.ok(at.connected ? at.raiser : at.next, `the focus returns to the control that raised it (or the Next step's title once it is gone): ${JSON.stringify(at)}`);
  await done(page);
});

// ---- review r1 (2026-11-14) ----

const entry = (page) => page.evaluate(() => navigation.currentEntry.index);
const back = (page) => page.evaluate(() => new Promise((r) => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.back(); }));
const forward = (page) => page.evaluate(() => new Promise((r) => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.forward(); }));
const sheetKind = (page) => page.evaluate(() => window.__ctTest.store.sheet.value?.kind ?? null);
// Find from the Next step's See all, in "Select several" (c1's contract: consortium-pp-c1.browser.test.mjs).
const findTicks = async (page) => {
  await page.click('.ct-next-actions .button');
  assert.ok(await page.waitForSelector('dialog.ct-find[open]', { timeout: 10_000 }).then(() => true, () => false), 'no Find sheet (dialog.ct-find)');
  await page.click('dialog.ct-find[open] [data-find-select]');
  await page.waitForSelector('dialog.ct-find[open] [data-find-row] input[type="checkbox"]', { timeout: 4000 });
};

// Coordinator row 2026-11-14 "Sheets and browser history" (inventory K7): a full-screen sheet pushes
// one history entry; the phone's Back closes it and keeps every edit made in it; a second Back leaves
// the page; Forward never reopens a stale sheet.
// PP-C commit 0: the Add sheet's ticks went with it; written against Find's "Select several" (c1).
test('PP-B31 (b2 sheets and Back, K7; review r1 bugs-1; owner c1 \'Find ticks\'): Back closes Find keeping the plants added in it, the address keeps them, a second Back leaves the page, Forward never reopens it', async () => {
  const page = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-next-actions .button', { timeout: 10_000 });
  const arrived = await entry(page), before = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await findTicks(page);
  assert.equal(await entry(page), arrived + 1, 'the sheet took one history entry');
  const ticks = await page.$$('dialog.ct-find[open] [data-find-row] input[type="checkbox"]');
  await ticks[0].click();
  await ticks[1].click();
  await page.locator(aria('button', 'Add 2 plants')).click();
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n + 2 && !window.__ctTest.store.sheet.value, { timeout: 4000 }, before).then(() => true, () => false), '"Add 2 plants": both in, the sheet closed');
  await page.waitForFunction((a) => navigation.currentEntry.index === a, { timeout: 4000 }, arrived);
  // Open it again and press the phone's Back.
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await findTicks(page);
  await back(page);
  assert.equal(await sheetKind(page), null, 'Back closes the sheet');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), before + 2, 'the plants added stay');
  assert.equal(await entry(page), arrived, 'back on the page\'s first entry: the next Back leaves the page');
  const addr = await page.evaluate(() => ({ hash: location.hash.slice(1), ct: history.state?.ct }));
  assert.equal(addr.ct, addr.hash, 'the entry holds the page\'s own link');
  // Forward: the entry the sheet had, never the sheet again.
  await forward(page);
  assert.equal(await sheetKind(page), null, 'Forward never reopens the sheet');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), before + 2, 'nor an older palette');
  // Forward is allowed onto the entry and changes nothing on screen (owner 2026-11-14: no refused
  // Forward); the address there holds the palette as edited.
  assert.equal(await page.evaluate(() => location.hash.slice(1)), addr.hash, 'the entry Forward lands on holds the palette as it is');
  // Reloading the address the Back left shows the plants added.
  await page.reload();
  assert.ok(await page.waitForFunction((n) => window.__ctTest?.store?.members.value.length === n, { timeout: 20_000 }, before + 2).then(() => true, () => false), 'the address keeps the plants added in the sheet');
  await done(page);
});

test('PP-B32 (b2 header step and Back; review r1 bugs-1): the step from Your place to Your palette takes one history entry, so Back returns to Your place with the plants kept', async () => {
  const page = await tool({ width: 390 });
  await choose(page, 'Temperate');
  const arrived = await entry(page);
  await ownPalette(page, 2);
  assert.equal(await entry(page), arrived + 1, 'one entry for the step');
  await back(page);
  assert.equal(await page.evaluate(() => window.__ctTest.store.step.value), 'place', 'Back returns to Your place');
  assert.equal(await entry(page), arrived);
  await done(page);
});

// Review r2 hist-1: the history model holds from a palette the reader made (the palette step's entry
// is the page's), not only from a link: a sheet opened and closed above it, then "Your place", goes
// back in history, so the next Back leaves the page; a palette -> Place change made outside history
// (Undo of plants pasted on Place) drops the step's entry too; Forward never shows a stale entry.
// Place at 390 px, then three plants added there (as Paste's Add): the palette step's own entry.
const readerPalette = async () => {
  const page = await tool(PHONE);
  await choose(page, 'Temperate');
  const arrived = await entry(page);
  await ownPalette(page, 3);
  assert.equal(await entry(page), arrived + 1, 'one entry for the step');
  return { page, arrived };
};
const settled = async (page) => { await frames(page); await new Promise((r) => setTimeout(r, 300)); };
test('PP-B40 (b2 review r2 hist-1, K7): from a palette the reader made, a sheet opened and closed, then "Your place": Place on the page\'s first entry, so the next Back leaves the page, and Forward shows no stale palette or sheet', async () => {
  const { page, arrived } = await readerPalette();
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await page.waitForSelector('.ct-chart .ct-chip[data-plant-id]', { timeout: 8000 });
  await page.click('.ct-chart .ct-chip[data-plant-id]');
  await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'details', { timeout: 8000 });
  assert.equal(await entry(page), arrived + 2, 'the sheet took one entry');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  assert.ok(await page.waitForFunction((a) => navigation.currentEntry.index === a && !window.__ctTest.store.sheet.value, { timeout: 4000 }, arrived + 1).then(() => true, () => false), 'closing the sheet leaves its entry');
  await page.click('.ct-steps button.ct-step');
  await page.waitForFunction(() => window.__ctTest.store.step.value === 'place', { timeout: 4000 });
  await settled(page);
  assert.equal(await entry(page), arrived, '"Your place" went back in history: on the page\'s first entry, the next Back leaves the page');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), 3, 'the plants kept');
  await forward(page);
  await settled(page);
  // Forward lands on the entry the page left and changes nothing (owner 2026-11-14: no refused Forward).
  assert.deepEqual([await page.evaluate(() => window.__ctTest.store.step.value), await sheetKind(page)], ['place', null], 'still Your place, no sheet');
  await done(page);
});

// (Suggest offers no Undo on this branch; a paste's Add on Place does: store.addMembers, as Paste's
// Add calls it, then "Show my palette"; the add's Undo goes back to Place.)
test('PP-B41 (b2 review r2 hist-1): plants pasted on Your place, then Undo from the toast: Place on the page\'s first entry, so the next Back leaves the page', async () => {
  const { page, arrived } = await readerPalette();
  await page.click(aria('button', en['consortium.undo']));
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.step.value === 'place', { timeout: 4000 }).then(() => true, () => false), 'Undo returns to Your place');
  await settled(page);
  assert.equal(await entry(page), arrived, 'Undo went back in history: on the page\'s first entry, the next Back leaves the page');
  await done(page);
});

// A palette of four Temperate plants at a site, its verdicts in; then each member's Swap opened in
// turn, yielding the label of its "Show N outside their climate range" ('' when none).
const swapPage = async (site) => {
  const page = await tool();
  await atSite(page, site);
  await choose(page, 'Temperate');
  await ownPalette(page, 4);
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  return page;
};
async function* swaps(page) {
  for (const id of await page.evaluate(() => window.__ctTest.store.members.value.slice())) {
    await page.evaluate((x) => window.__ctTest.openSheet('swap', x), id);
    await page.waitForSelector('dialog.ct-swap[open] h2', { timeout: 10_000 });
    await page.waitForFunction(() => document.querySelector('dialog.ct-swap[open] .ct-rows, dialog.ct-swap[open] .ct-muted:last-child'), { timeout: 15_000 }).catch(() => {});
    yield await page.evaluate(() => [...document.querySelectorAll('dialog.ct-swap[open] .button')].find((b) => /outside/i.test(b.textContent))?.textContent ?? '');
    await page.evaluate(() => window.__ctTest.store.closeSheet());
  }
}
const showOutside = async (page) => {
  await page.evaluate(() => [...document.querySelectorAll('dialog.ct-swap[open] .button')].find((b) => /outside/i.test(b.textContent)).click());
  return page.waitForSelector('dialog.ct-swap[open] [data-outside] li', { timeout: 4000 });
};

test('PP-B35 (b2 Swap; review r1 bugs-4): alternatives outside their climate range are offered behind "Show N outside their climate range", each saying so in words, one tap swaps', async () => {
  const page = await swapPage('lyon');
  let found = false;
  for await (const label of swaps(page)) {
    if (label) {
      const row = await (await showOutside(page)).evaluate((x) => x.textContent);
      assert.match(row, new RegExp(en['consortium.line.outside']), 'the row says it is outside its range');
      found = true;
      break;
    }
  }
  assert.ok(found, 'a member whose alternatives include plants outside their range offers them');
  await done(page);
});

// ---- review r2 (2026-11-14) ----

// r2-swap-1: the outside group reaches every outside plant through its own "Show all N", whatever the
// in-range count. At Yakutsk (Dfc) the Temperate list leaves few plants in range and many outside.
test('PP-B42 (b2 review r2 swap-1): with few alternatives in range and more than 7 outside, Swap\'s outside group has its own "Show all N" and lists all N', { timeout: 120_000 }, async () => {
  const page = await swapPage('yakutsk');
  let seen = null;
  for await (const label of swaps(page)) {
    const n = Number(/\d+/.exec(label)?.[0] ?? 0);
    if (n > 7) {
      await showOutside(page);
      // The group's own "Show all N" (after its list), never the in-range list's.
      await page.evaluate((t) => {
        const ul = document.querySelector('dialog.ct-swap[open] [data-outside]');
        [...document.querySelectorAll('dialog.ct-swap[open] button')].find((b) => b.textContent.trim() === t && ul.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)?.click();
      }, plural(en['consortium.add.showAll'], n));
      await frames(page);
      seen = { n, rows: await page.$$eval('dialog.ct-swap[open] [data-outside] li', (els) => els.length), inRange: await page.$$eval('dialog.ct-swap[open] .ct-rows:not([data-outside]) li', (els) => els.length) };
      break;
    }
  }
  assert.ok(seen, 'a member with more than 7 alternatives outside their range');
  assert.equal(seen.rows, seen.n, `the outside rows reach all ${seen.n} the button counts (got ${seen.rows}; ${seen.inRange} in range)`);
  await done(page);
});


// r2-print-1 (hardening): the browser's own Print (Ctrl+P: beforeprint, no print media emulated)
// mounts the print sheet in the same task, before the print layout, once its chunk is in.
test('PP-B47 (b2 review r2 print-1): beforeprint without print media mounts the print sheet, with every plant, before the print layout', async () => {
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  const n = await page.evaluate(() => window.__ctTest.store.members.value.length);
  // The first time loads the chunk; then afterprint takes the sheet away.
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  await page.waitForSelector('.ct-print tbody tr', { timeout: 8000 });
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.waitForFunction(() => !document.querySelector('.ct-print'), { timeout: 4000 });
  const rows = await page.evaluate(() => { dispatchEvent(new Event('beforeprint')); return Promise.resolve().then(() => document.querySelectorAll('.ct-print tbody tr').length); });
  assert.equal(rows, n, 'every plant in the sheet by the time the print layout runs');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await done(page);
});

// r3-hash-1: a Back between two entries with the same address (a sheet's) fires popstate and no
// hashchange; the page must not then swallow a later hashchange the reader makes to that address.
async function pasteAgain({ noNavigationApi }) {
  const page = await tool({ width: 390, hash: await temperateLink(), ...(noNavigationApi ? { setup: (p) => p.evaluateOnNewDocument(() => { Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }); }) } : {}) });
  assert.ok(await onPage(page), 'the palette page');
  await settled(page);
  const link = await page.evaluate(() => location.hash);
  const n = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await page.waitForSelector('.ct-chart .ct-chip[data-plant-id]', { timeout: 8000 });
  // The chip itself is pressed, not a screen point: the chart can still shift under a loaded machine,
  // and a point press then lands on the Add button beside it.
  await page.$eval('.ct-chart .ct-chip[data-plant-id]', (el) => el.click());
  await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'details', { timeout: 8000 });
  await back(page);
  await settled(page);
  assert.equal(await sheetKind(page), null, 'Back closes Details');
  assert.equal(await page.evaluate(() => location.hash), link, 'the address still holds the link');
  // The reader's press in the page (the remove's own tap), then the remove.
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.evaluate(() => window.__ctTest.store.removeMember(window.__ctTest.store.members.value[0]));
  assert.ok(await page.waitForFunction((l) => window.__ctTest.store.members.value.length === l - 1, { timeout: 4000 }, n).then(() => true, () => false), 'one plant removed');
  await settled(page);
  assert.notEqual(await page.evaluate(() => location.hash), link, 'the address follows the edit');
  await page.evaluate((l) => { location.hash = l; }, link);
  assert.ok(await page.waitForFunction((l) => window.__ctTest.store.members.value.length === l, { timeout: 8000 }, n).then(() => true, () => false), `the pasted link opens again with its ${n} plants (kept ${await page.evaluate(() => window.__ctTest.store.members.value.length)})`);
  await done(page);
}

test('PP-B48 (b2 review r3 hash-1): a shared link, Details opened and closed with Back, a plant removed, then the same link pasted: the link opens again', () => pasteAgain({ noNavigationApi: false }));
test('PP-B48b (b2 review r3 hash-1, no Navigation API): the same, in a browser without the Navigation API', () => pasteAgain({ noNavigationApi: true }));

// ---- scale (owner directive 2026-11-14: smooth to 200 plants), CPU throttled 4× through CDP ----
// The shared 200-plant palette (scripts/palette-200.mjs), saved, reopened at 390 and 1280 px. Reference
// figures (reported, never a failure since 2026-11-16, owner row "No hard limits"):
// navigation → Next step visible 2.5 s; one Add from the Next step → the page updated 300 ms; no long task
// over LONG_TASK_MS after the page is up; the palette page's DOM at most SCALE_DOM.
// DOM budget raised at the PP-B exit (2026-11-16, row "Size budgets are a tripwire": no structural
// cause, so raised by the measured amount): measured 574 and 659 (327 and 385 on 2026-11-14, before b3's
// Your plants, about 196 elements folded to 12 rows, joined the page); nothing on it is invisible and no
// list is mounted twice (every element has a box; the two pictures at their PICTURE_LANE_MAX fold, Your
// plants at its fold). Budget: measured + about 5 %.
const SCALE_DOM = { 390: 600, 1280: 690 };
// Long-task limit raised at the PP-B exit (2026-11-16, row "Size budgets are a tripwire", coordinator:
// the long task treated as the DOM budget; the owner's scale row says 200 ms, so the owner confirms or
// reverts): 200 → 300 ms. No structural cause: a timing probe over 3 file runs found the long tasks
// after load are the palette page's first render running past the Next step (136-160 ms), the Add
// sheet opening over 200 plants (142-191 ms) and the Add (121-187 ms), each once, nothing doubled;
// they cross 200 ms only with the machine loaded (load average 5-6 of 8 cores: 248, 252, 275, 282 ms
// in 2 of 5 file runs, none in 3 runs alone). Limit: the highest measured, rounded up.
const LONG_TASK_MS = 300;
// History (owner b2, review r1, measured 2026-11-14, 4× throttle, 3 runs; ranges):
// - 200 plants: Next step 2.6-4.5 s (2.4-3.1 s with arrival.ts's country guess stubbed: its getTimeZones
//   for every country is perf-1, b1a's), Add 179-316 ms, DOM 374/459, one or two long tasks of 220-420 ms
//   after load (native compile, style and layout once the later chunks are fetched, no island JS on top).
// - 10 plants (fixed costs): Next step 2.0-2.1 s stubbed (3.1-4.4 s not), Add 89-141 ms, no long task.
// The marker went at the PP-B exit (2026-11-16): Next step 1.6-2.1 s, Add within 300 ms.
test('PP-B29 (b2 scale, 200 plants, 4× CPU throttle): a saved 200-plant palette shows its Next step and takes one Add; timings and DOM reported against reference figures @real-data', { timeout: 240_000 }, async (t) => {
  const { savedRecord200 } = await import('../palette-200.mjs');
  const record = await savedRecord200();
  const figures = [], misses = [];
  for (const width of [390, 1280]) {
    const page = await h.open('/palette/', { width, hook: true, setup: async (p) => {
      const cdp = await p.createCDPSession();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await p.evaluateOnNewDocument((rec) => {
        if (!sessionStorage.getItem('ct-scale-saved')) { localStorage.setItem('canopi-consortium', rec); sessionStorage.setItem('ct-scale-saved', '1'); }
        window.__scale = { nextAt: null, long: [] };
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__scale.long.push({ at: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: true });
        new MutationObserver((_, o) => { if (document.querySelector('.ct-next')) { window.__scale.nextAt = performance.now(); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
      }, record);
    } });
    try {
      assert.ok(await page.waitForFunction(() => window.__scale?.nextAt !== null, { timeout: 30_000 }).then(() => true, () => false), `${width} px: the Next step`);
      const next = await page.evaluate(() => window.__scale.nextAt);
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => {});
      const dom = await page.evaluate(() => document.querySelectorAll('.ct-palette-page *').length);
      const members = await page.evaluate(() => JSON.parse(localStorage.getItem('canopi-consortium')).fragment.length);
      figures.push(`${width} px: Next step ${Math.round(next)} ms, DOM ${dom}`);
      // One Add from the Next step's filler; 200 plants of this palette leave no hole, so then through Find
      // (a plant of the climate's list not yet in the palette, searched by name, its row's Add): measured
      // from the press to the second frame after the toast.
      let press = '.ct-next .ct-fillers button';
      if (!(await has(page, press, 1000))) {
        const plant = await page.evaluate(() => { const { store } = window.__ctTest, m = new Set(store.members.value); const t = (store.pool.value ?? []).find((x) => !m.has(x.id)); return t ? { id: t.id, name: t.canonical_name } : null; });
        assert.ok(plant, `${width} px: a plant not yet in the palette`);
        await page.evaluate(() => window.__ctTest.openFind());
        await page.waitForSelector('dialog.ct-find[open] [data-find-search]', { timeout: 20_000 });
        await page.type('dialog.ct-find[open] [data-find-search]', plant.name);
        press = `dialog.ct-find[open] [data-find-row][data-plant-id="${plant.id}"] [data-find-add]`;
        // The name found: its row's Add (else the press below waits for a toast that never comes).
        assert.ok(await has(page, press, 20_000), `${width} px: Find lists ${plant.name}`);
      }
      const add = await page.evaluate((sel) => new Promise((done) => {
        const t0 = performance.now();
        new MutationObserver((_, o) => { if (document.querySelector('.ct-toast')) { o.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t0))); } }).observe(document.body, { childList: true, subtree: true });
        document.querySelector(sel).click();
      }), press);
      await new Promise((r) => setTimeout(r, 900));
      const long = await page.evaluate((lim) => window.__scale.long.filter((e) => e.at > window.__scale.nextAt && e.ms > lim).map((e) => Math.round(e.ms)), LONG_TASK_MS);
      figures.push(`${width} px: Add ${Math.round(add)} ms, long tasks over ${LONG_TASK_MS} ms after load: ${long.length ? long.join(', ') : 'none'} (save ${members} chars)`);
      if (next >= 2500) misses.push(`${width} px: Next step visible in ${Math.round(next)} ms (budget 2500, throttled 4×)`);
      if (add >= 300) misses.push(`${width} px: one Add updates the page in ${Math.round(add)} ms (budget 300)`);
      if (dom > SCALE_DOM[width]) misses.push(`${width} px: ${dom} elements on the palette page (budget ${SCALE_DOM[width]})`);
      if (long.length) misses.push(`${width} px: long tasks over ${LONG_TASK_MS} ms after load (${long.join(', ')} ms)`);
    } finally {
      t.diagnostic(figures.join(' | '));
      await page.browserContext().close().catch(() => {});
    }
  }
  // Owner, 2026-11-16 (row "No hard limits"): the timings and the DOM count are measured and reported,
  // never a failure; the test fails only if a 200-plant palette does not work (no Next step, no Add).
  if (misses.length) t.diagnostic(`over the reference figures (reported, not a failure): ${misses.join('; ')}`);
});
