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
import { failing } from '../expect-fail.mjs';
import { liveLog, resetLive, saidTwice, suggestedAt, watchLiveRegions } from './f1a-helpers.mjs';
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

test('F1a-P2 → PP-B (b2 return visit, A7): a saved palette reopens on the palette page with its placeholder while it restores; the Place form never shows', async () => {
  const save = JSON.stringify({ fragment: (await temperateLink()).slice(1), at: '2026-11-13T00:00:00.000Z', src: null });
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((s) => {
    if (!localStorage.getItem('canopi-consortium')) localStorage.setItem('canopi-consortium', s);
    window.__seen = { start: false, placeholder: false };
    new MutationObserver(() => {
      if (document.querySelector('#ct-root input[name="ct-climate"]')) window.__seen.start = true;
      if (document.querySelector('[data-palette-placeholder]')) window.__seen.placeholder = true;
    }).observe(document, { subtree: true, childList: true, attributes: true });
  }, save) });
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length === 5, { timeout: 20_000 }).then(() => true, () => false), 'the saved members restored');
  const seen = await page.evaluate(() => window.__seen);
  assert.equal(seen.start, false, 'return visit: the Start form showed while restoring');
  assert.equal(seen.placeholder, true, 'return visit: no palette placeholder while restoring');
  assert.equal(await page.evaluate(() => window.__ctTest.store.step.value), 'palette', 'return visit: opens the palette page');
  assert.ok(await has(page, '.ct-palette-page h2[data-view-heading]', 8000), 'the palette page shows');
  await done(page);
});

// Moved unchanged from consortium-s4 in PP-B commit 0a' (plant-palette-slices 1b), so b1a never edits a
// print case; b2 rewrites "printed above the drawing" for the year step of Through the years (PP-B18).
test('PP-B18 (b2 / BT-8 print, drawing; moved from S4 in commit 0a\'): ≤ 20 plants print the side view drawing', async (t) => {
  await layoutVariants(t, async (v) => {
    const small = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(small);
    await small.locator(aria('radio', 'Temperate')).click();
    await small.locator(aria('button', en['consortium.start.suggest'])).click();
    assert.ok(await has(small, aria('button', 'Share'), 8000), 'the result and its actions');
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
const nextHole = (page) => page.$eval('.ct-next', (e) => e.dataset.hole ?? null).catch(() => null);
// Whatever passes the right edge (or makes the page wider than the window), in words.
const pastEdge = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth, out = [];
  for (const el of document.querySelectorAll('#ct-root button, #ct-root a, #ct-root input, #ct-root select, #ct-root [data-plant-id], #ct-root h2, #ct-root h3, #ct-root td, #ct-root th, dialog[open] button')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 0.5) out.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 30)}" ends at ${Math.round(r.right)} of ${vw}`);
  }
  if (document.documentElement.scrollWidth > vw) out.push(`page ${document.documentElement.scrollWidth} px wide at ${vw}`);
  return out;
});
// Three Temperate plants of the real export (the paste a grower makes with their own list).
const own = (n = 3) => realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT ?").all(n).map((r) => String(r.id)));
// The reader's own plants added on Place, then "Show my palette": the palette page.
const ownPalette = async (page, n) => {
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(n));
  await showPalette(page);
  assert.ok(await onPage(page), 'the palette page');
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

test('PP-B27 (b2 Lyon first visit, F1a-P1 restored): after Suggest the palette page shows the Next step and both pictures, and a hole\'s Find opens Add preset to it', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  assert.ok(await onPage(page), 'Suggest opens the palette page');
  assert.equal(await page.evaluate(() => window.__ctTest.store.step.value), 'palette');
  assert.ok(await has(page, '.ct-next h3', 8000), 'the Next step');
  assert.equal(await page.$$eval('.ct-chart', (els) => els.length), 2, 'Through the years and the jobs');
  assert.ok(await has(page, '.ct-chart [data-plant-id]', 4000), 'the members in the pictures');
  await page.click('.ct-next-actions .button');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'add', { timeout: 10_000 }).then(() => true, () => false), 'the Next step\'s See all opens Add');
  assert.ok(await page.evaluate(() => { const c = window.__ctTest.store.sheetCell.value; return !!(c.job || c.cell?.stratum); }), 'Add opens preset to the hole');
  // Review r1 conformance-10: the sheet names the hole with the card's words.
  const words = await page.$eval('.ct-next-hole', (e) => e.textContent.trim());
  assert.equal(await page.waitForSelector('dialog.ct-add[open] h2', { timeout: 10_000 }).then((e) => e.evaluate((x) => x.textContent.trim())), words, 'Add titled with the hole in words');
  await done(page);
});

test('PP-B28 (b2 keyboard journey, F1a-P8 restored, A25): with the keyboard only, the Next step\'s "See all" opens Add and closing it returns the focus to the button', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await ownPalette(page, 2);
  assert.ok(await has(page, '.ct-next-actions .button', 8000), 'the Next step has See all');
  await page.focus('.ct-next-actions .button');
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'add', { timeout: 10_000 }).then(() => true, () => false), 'Add opens');
  await page.keyboard.press('Escape');
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('.ct-next-actions .button'), { timeout: 4000 }).then(() => true, () => false), 'closing Add returns the focus to "See all"');
  assert.equal(await page.$('dialog[open]'), null, 'no dialog left open');
  await done(page);
});

test('PP-B6 (b2 Lyon, own plants): three plants pasted; the Next step names the first hole in words and years, and filling it moves the Next step on', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await ownPalette(page, 3);
  await page.waitForFunction(() => document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  const first = await nextHole(page);
  const words = await page.$eval('.ct-next-hole', (e) => e.textContent.trim());
  assert.match(words, /year|month|any time/i, `the hole in words and years ("${words}")`);
  assert.doesNotMatch(words, /feeds_|job:|light:|\d-\d/, 'never the hole id');
  assert.ok(await has(page, '.ct-fillers li', 4000), 'with the plants that fill it');
  await page.click('.ct-fillers li .button-primary');
  assert.ok(await page.waitForFunction((f) => (document.querySelector('.ct-next')?.dataset.hole ?? null) !== f, { timeout: 8000 }, first).then(() => true, () => false), 'filling it moves the Next step to another hole');
  await done(page);
});

test('PP-B7 (b2 phone 390 px): Through the years shows one time step at a time, with Earlier and Later', async () => {
  const page = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  assert.ok(await has(page, '.ct-years .ct-stepper', 8000), 'the stepper on a phone');
  const cols = () => page.$eval('.ct-years .ct-chart-columns', (e) => e.children.length).catch(() => null);
  assert.equal(await cols(), 1, 'one time step');
  const at = () => page.$eval('.ct-stepper-at', (e) => e.textContent.trim());
  const before = await at();
  await page.click(`.ct-stepper ${aria('button', en['consortium.palette.later'])}`);
  await page.waitForFunction((b) => document.querySelector('.ct-stepper-at')?.textContent.trim() !== b, { timeout: 4000 }, before);
  assert.notEqual(await at(), before, 'Later moves to the next time step');
  assert.equal(await cols(), 1, 'still one time step');
  // Review r1 bugs-14: every tap target of the page is at least 44 px high on a phone.
  const small = await page.$$eval('.ct-palette-page .ct-chip, .ct-palette-page .ct-hole-button, .ct-palette-page .ct-step, .ct-palette-page .ct-other-holes summary', (els) => els.filter((e) => e.getBoundingClientRect().height && e.getBoundingClientRect().height < 44).map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().height)} px`));
  assert.deepEqual(small, [], 'tap targets of 44 px');
  // Review r1 bugs-7: with the keyboard, Later to the last time step keeps the focus on the stepper.
  await page.focus(`.ct-stepper ${aria('button', en['consortium.palette.later'])}`);
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  await frames(page);
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.ct-stepper')), 'the focus stays on the stepper at the last time step');
  assert.equal(await page.evaluate(() => window.__ctTest.store.yearStep.value), 6, 'the last time step');
  await done(page);
});

test('PP-B8 (b2 tables): "Show as a table" gives each picture\'s plants, holes and time steps as a table with headers', async () => {
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-chart [data-plant-id]', { timeout: 8000 });
  const charts = await page.$$('.ct-chart');
  assert.equal(charts.length, 2);
  for (let i = 0; i < charts.length; i++) {
    const names = await page.evaluate((n) => [...document.querySelectorAll('.ct-chart')[n].querySelectorAll('[data-plant-id]')].map((b) => b.textContent.trim()), i);
    await page.evaluate((n) => document.querySelectorAll('.ct-chart')[n].querySelector('.ct-chart-toggle').click(), i);
    const t = await page.evaluate((n) => {
      const tb = document.querySelectorAll('.ct-chart')[n].querySelector('table');
      return tb && { caption: tb.caption?.textContent.trim(), cols: tb.querySelectorAll('th[scope="col"]').length, rows: tb.querySelectorAll('th[scope="row"]').length, text: tb.textContent, pressed: document.querySelectorAll('.ct-chart')[n].querySelector('.ct-chart-toggle').getAttribute('aria-pressed') };
    }, i);
    assert.ok(t, `picture ${i}: a table`);
    assert.equal(t.pressed, 'true');
    assert.ok(t.caption, 'named by its summary');
    assert.ok(t.cols >= 6 && t.rows >= 1, `column and row headers (${t.cols} × ${t.rows})`);
    for (const n of names) assert.ok(t.text.includes(n), `picture ${i}: ${n} in the table`);
  }
  await done(page);
});

test('PP-B15 (b2 slow database): the database still coming after the threshold says "Still loading", then the tool', async () => {
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', database: 'hold', timeouts: { slow: 400 } });
  const slow = plural(en['consortium.load.slow'], 0);
  assert.ok(await page.waitForFunction((t) => document.querySelector('#ct-root')?.textContent.includes(t), { timeout: 8000 }, slow).then(() => true, () => false), '"Still loading"');
  // Review r1 bugs-12: the line is a status region on the page from the start, so the change is announced.
  assert.ok(await page.evaluate((t) => [...document.querySelectorAll('#ct-root [role="status"]')].some((e) => e.textContent.includes(t)), slow), '"Still loading" said in a status region');
  await page.releaseHeld();
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.load.value.status === 'ready', { timeout: 20_000 }).then(() => true, () => false), 'then the tool');
  assert.equal(await page.evaluate((t) => document.querySelector('#ct-root').textContent.includes(t), slow), false, 'the line goes');
  await done(page);
});

test('PP-B16 (b2 offline): the offline line shows, added plants stay, and a chunk that cannot come says "Needs a connection" and loads once back online', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  // The browser offline (navigator.onLine false, its events, every request failing), then back.
  const net = (on) => page.setOfflineMode(!on);
  await net(false);
  assert.ok(await page.waitForFunction((t) => document.querySelector('.ct-offline')?.textContent.includes(t), { timeout: 4000 }, en['consortium.load.offline']).then(() => true, () => false), 'the offline line');
  const ids = await own(3);
  await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
  await showPalette(page);
  assert.ok(await page.waitForFunction((t) => document.querySelector('#ct-root')?.textContent.includes(t), { timeout: 8000 }, en['consortium.load.needsConnection']).then(() => true, () => false), '"Needs a connection" where the palette page goes');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.members.value), ids, 'the added plants stay');
  await net(true);
  assert.ok(await onPage(page, 10_000), 'back online, the palette page loads by itself');
  assert.equal(await page.$eval('.ct-offline', (e) => e.textContent.trim()), '', 'the offline line goes');
  await done(page);
});

test('PP-B17 (b2 toast): a toast stays while the focus is in it, then the focus returns to the control that raised it', async () => {
  const page = await tool({ timeouts: { toast: 300 } });
  await choose(page, 'Temperate');
  await ownPalette(page, 2);
  await page.waitForSelector('.ct-fillers li .button-primary', { timeout: 8000 });
  await page.evaluate(() => { window.__ctTest.store.hideToast(); document.querySelector('.ct-fillers li .button-primary').dataset.raiser = ''; });
  await page.focus('[data-raiser]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value !== null, { timeout: 4000 });
  const undo = await page.waitForSelector(aria('button', en['consortium.undo']), { timeout: 4000 });
  await undo.focus();
  await new Promise((r) => setTimeout(r, 900));
  assert.notEqual(await page.evaluate(() => window.__ctTest.store.toast.value), null, 'the toast waits while focused (three times its 0.3 s)');
  await page.focus(DISMISS);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value === null, { timeout: 4000 });
  await frames(page);
  // The raiser (a Next step filler's Add) leaves as its plant joins: the focus went to the Next step's
  // title, which the toast hands it back to (review r1 conformance-3).
  const at = await page.evaluate(() => { const a = document.activeElement, r = document.querySelector('[data-raiser]'); return { raiser: !!r && a === r, next: a?.id === 'ct-next-t', connected: !!r }; });
  assert.ok(at.connected ? at.raiser : at.next, `the focus returns to the control that raised it (or the Next step's title once it is gone): ${JSON.stringify(at)}`);
  await done(page);
});

test('PP-B20 (b2 verdict chunk refused; review r1 bugs-5): fit lines say "Not checked", never "Fits", the holes say they were computed without it, Retry fetches it again in place, and offline it waits for the connection', async () => {
  const log = [];
  const page = await tool({ block: { verdict: 404 }, setup: logRequests(log) });
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await ownPalette(page, 2);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the verdict chunk failed');
  assert.ok(await has(page, '.ct-notice[role="alert"]', 4000), 'said once');
  assert.ok((await page.$eval('.ct-palette-page', (e) => e.textContent)).includes(en['consortium.palette.verdictFailed']), 'the holes computed without verdicts, in words');
  const fits = await page.$$eval('.ct-fit', (els) => els.map((e) => e.dataset.level));
  assert.ok(fits.every((l) => l === 'unknown'), `every fit line "Not checked" (${fits.join(', ')})`);
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  // The harness refuses the file for the page's life: the press fetches it under a fresh URL, in place.
  await page.click(`.ct-palette-page .ct-notice ${aria('button', en['consortium.load.retry'])}`);
  assert.ok(await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /verdict\.[\w-]+\.js\?retry=\d/.test(e.name)), { timeout: 8000 }).then(() => true, () => false) || log.some((r) => /verdict\.[\w-]+\.js\?retry=\d/.test(r.url)), 'the press fetched the verdict chunk again (?retry=n)');
  assert.ok(await has(page, `.ct-palette-page .ct-notice ${aria('button', en['consortium.load.retry'])}`, 8000), 'still refused: said again, with Retry');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), members, 'no page reload: the plants are still there');
  // Offline: no Reload that would lose the page; it says it needs a connection.
  await page.setOfflineMode(true);
  assert.ok(await page.waitForFunction((t) => [...document.querySelectorAll('.ct-palette-page .ct-notice')].some((n) => n.textContent.includes(t)), { timeout: 4000 }, en['consortium.load.needsConnection']).then(() => true, () => false), 'offline: "Needs a connection"');
  assert.equal(await page.$(`.ct-palette-page .ct-notice ${aria('button', en['consortium.load.reload'])}`), null, 'offline: no Reload');
  assert.equal(await page.$(`.ct-palette-page .ct-notice ${aria('button', en['consortium.load.retry'])}`), null, 'offline: no Retry either');
  await page.setOfflineMode(false);
  await done(page);
});

test('PP-B21 (b2 a guest list fails): the list is named as missing and its plants are not checked; the tool stays', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const guest = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant NOT IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY 1 LIMIT 1").get()?.id);
  assert.ok(guest, 'a Mediterranean plant');
  await page.evaluate((g, ids) => {
    const { store } = window.__ctTest, src = store.source.value, read = src.pool.bind(src);
    src.pool = (c) => (c === 'Mediterranean' ? Promise.reject(new Error('test: list unreadable')) : read(c));
    store.addMembers([...ids, g], { [g]: 'Mediterranean' });
    store.loadPool('Mediterranean');
  }, String(guest), await own(2));
  await showPalette(page);
  assert.ok(await onPage(page), 'the palette page');
  const line = en['consortium.palette.listFailed'].split('{lists}')[0].replace(/^(one|other):\s*/, '').trim();
  assert.ok(await page.waitForFunction((t) => [...document.querySelectorAll('.ct-notice')].some((n) => n.textContent.includes(t) && n.textContent.includes('Mediterranean')), { timeout: 8000 }, line).then(() => true, () => false), 'the Mediterranean list named as missing');
  assert.equal(await page.evaluate(() => window.__ctTest.store.load.value.status), 'ready', 'the tool stays');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.guestsPending.value), [], 'not "loading" for ever');
  // Review r1 bugs-8: a hole its missing plants may fill is never named: the Next step says why.
  assert.ok(await page.waitForFunction((t) => document.querySelector('.ct-next')?.textContent.includes(t), { timeout: 4000 }, en['consortium.palette.holesListMissing']).then(() => true, () => false), 'the holes are not computed without the missing plants, said in words');
  assert.equal(await nextHole(page), null, 'no hole named as the next step');
  await done(page);
});

test('PP-B22 (b2 320 px): the palette page, its steps, pictures, tables and a sheet fit 320 px in en, de, ru and ja', async () => {
  const hash = await temperateLink(null, 8);
  for (const lang of ['en', 'de', 'ru', 'ja']) {
    const page = await tool({ lang, width: 320, hash });
    assert.ok(await onPage(page), `${lang}: the palette page`);
    await page.waitForSelector('.ct-chart [data-plant-id]', { timeout: 8000 });
    assert.deepEqual(await pastEdge(page), [], `${lang}: the page`);
    await page.$$eval('.ct-chart-toggle', (bs) => bs.forEach((b) => b.click()));
    await page.waitForSelector('.ct-chart-table', { timeout: 4000 });
    assert.deepEqual(await pastEdge(page), [], `${lang}: the tables`);
    const see = await page.$('.ct-next-actions .button');
    if (see) {
      await see.click();
      await page.waitForSelector('dialog[open]', { timeout: 10_000 });
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))); // the sheet slides in
      await frames(page);
      assert.deepEqual(await pastEdge(page), [], `${lang}: the Add sheet`);
    }
    await done(page);
  }
});

test('PP-B24 (b2 palette chunk refused): Place stays usable, the page says it could not load with Reload, and the next press fetches ?retry=n', async () => {
  const log = [];
  const page = await tool({ block: { palette: 404 }, setup: async (pg) => { pg.on('request', (r) => log.push({ url: r.url() })); } });
  await choose(page, 'Temperate');
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(2));
  await showPalette(page);
  assert.ok(await page.waitForFunction((t) => document.querySelector('#ct-root')?.textContent.includes(t), { timeout: 8000 }, en['consortium.details.loadFailed']).then(() => true, () => false), '"could not load" where the palette page goes');
  assert.ok(await has(page, `#ct-root ${aria('button', en['consortium.palette.stepPlace'])}, #ct-root ${aria('button', en['consortium.details.reload'])}`, 2000), 'a control still answers');
  await page.click(`#ct-root .ct-notice ${aria('button', en['consortium.details.reload'])}`);
  // The harness refuses the role's file for the page's life, so the retry fails too: the press
  // fetched it again under a fresh URL, in place, and the failed line came back (no page reload).
  assert.ok(await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /Palette\.[\w-]+\.js\?retry=\d/.test(e.name)), { timeout: 8000 }).then(() => true, () => false) || log.some((r) => /Palette\.[\w-]+\.js\?retry=\d/.test(r.url)), 'the press fetched ?retry=n');
  assert.ok(await has(page, `#ct-root .ct-notice ${aria('button', en['consortium.details.reload'])}`, 8000), 'the failed line again, with Reload');
  assert.ok(await page.evaluate(() => window.__ctTest.store.members.value.length === 2), 'no page reload: the plants are still there');
  await done(page);
});

const PHASES = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
test('PP-B18 (b2 print at the year step): print draws the side view at the time step chosen in Through the years, named above it', async () => {
  const page = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-stepper', { timeout: 8000 });
  const later = `.ct-stepper ${aria('button', en['consortium.palette.later'])}`;
  await page.click(later);
  await page.click(later);
  const step = await page.evaluate(() => window.__ctTest.store.yearStep.value);
  assert.equal(step, 4, 'two steps later than years 1-3');
  await h.pdf(page);
  await page.waitForSelector('.ct-print .ct-print-stage', { timeout: 8000 }).catch(() => {}); // mounted for print (review r1 perf-4)
  const above = await page.$eval('.ct-print .ct-print-stage', (e) => e.textContent).catch(() => '');
  assert.ok(above.includes(en[`consortium.phase.${PHASES[step]}.plain`]), `the chosen time step named above the drawing ("${above}")`);
  assert.ok(await page.$('.ct-print [role="img"]'), 'the drawing');
  await done(page);
});

// Owner decision 2026-11-14, "inform, don't block; the grower decides": nothing asks "Add it anyway?".
test('PP-B25 (b2 inform, don\'t block): an outside-range plant added from a hole in one tap keeps "Outside its climate range" in words on its row, and Undo removes it', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await ownPalette(page, 1);
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await page.evaluate(() => window.__ctTest.store.hideToast());
  const show = async () => page.evaluateHandle(() => [...document.querySelectorAll('.ct-next .button')].find((b) => /outside/i.test(b.textContent)) ?? null);
  let button = await show();
  for (let i = 0; i < 10 && !(await button.jsonValue().catch(() => null)) && await page.$('.ct-next-actions'); i++) {
    await page.click(`.ct-next-actions ${aria('button', en['consortium.palette.notNow'])}`);
    await frames(page);
    button = await show();
  }
  assert.ok(await button.evaluate((b) => !!b), 'a hole with plants outside their range behind "Show N outside their climate range"');
  await button.click();
  const id = await page.waitForSelector('.ct-next [data-outside] li', { timeout: 4000 }).then((li) => li.evaluate((e) => e.dataset.plantId));
  assert.match(await page.$eval(`.ct-next [data-outside] li[data-plant-id="${id}"]`, (e) => e.textContent), new RegExp(en['consortium.line.outside']), 'its verdict in words beside Add');
  await page.click(`.ct-next [data-outside] li[data-plant-id="${id}"] .button-primary`); // one tap
  assert.equal(await page.$('dialog[open]'), null, 'nothing asks');
  assert.ok(await page.evaluate((x) => window.__ctTest.store.members.value.includes(x), id), 'added in one tap');
  const row = await page.waitForSelector(`.ct-years .ct-chip[data-plant-id="${id}"]`, { timeout: 4000 }).then((e) => e.evaluate((b) => b.textContent));
  assert.match(row, new RegExp(en['consortium.line.outside']), `its row keeps "Outside its climate range" ("${row}")`);
  await page.click(aria('button', en['consortium.undo']));
  assert.ok(await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, id).then(() => true, () => false), 'Undo removes it');
  await done(page);
});

// ---- review r1 (2026-11-14) ----

const entry = (page) => page.evaluate(() => navigation.currentEntry.index);
const back = (page) => page.evaluate(() => new Promise((r) => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.back(); }));
const forward = (page) => page.evaluate(() => new Promise((r) => { addEventListener('popstate', () => setTimeout(r, 50), { once: true }); history.forward(); }));
const sheetKind = (page) => page.evaluate(() => window.__ctTest.store.sheet.value?.kind ?? null);
const openAdd = async (page) => {
  await page.click('.ct-next-actions .button');
  await page.waitForSelector('dialog.ct-add[open] .ct-rows input[type="checkbox"]', { timeout: 10_000 });
};

// Coordinator row 2026-11-14 "Sheets and browser history" (inventory K7): a full-screen sheet pushes
// one history entry; the phone's Back closes it and keeps every edit made in it; a second Back leaves
// the page; Forward never reopens a stale sheet.
test('PP-B31 (b2 sheets and Back, K7; review r1 bugs-1): Back closes the Add sheet keeping the plants added in it, the address keeps them, a second Back leaves the page, Forward never reopens it', async () => {
  const page = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-next-actions .button', { timeout: 10_000 });
  const arrived = await entry(page), before = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openAdd(page);
  assert.equal(await entry(page), arrived + 1, 'the sheet took one history entry');
  const ticks = await page.$$('dialog.ct-add[open] .ct-rows input[type="checkbox"]');
  await ticks[0].click();
  await ticks[1].click();
  await page.click('dialog.ct-add[open] .ct-add-bar .button-primary');
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n + 2 && !window.__ctTest.store.sheet.value, { timeout: 4000 }, before).then(() => true, () => false), '"Add 2 plants": both in, the sheet closed');
  await page.waitForFunction((a) => navigation.currentEntry.index === a, { timeout: 4000 }, arrived);
  // Open it again and press the phone's Back.
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await openAdd(page);
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

test('PP-B33 (b2 keyboard Add from the Next step; review r1 bugs-2, conformance-3, conformance-9): the focus moves to the Next step, never <body>; the toast names the plant and hands the focus back there', async () => {
  const page = await tool({ timeouts: { toast: 300 } });
  await choose(page, 'Temperate');
  await ownPalette(page, 2);
  await page.waitForSelector('.ct-fillers li .button-primary', { timeout: 8000 });
  await page.evaluate(() => window.__ctTest.store.hideToast());
  const name = await page.$eval('.ct-fillers li .ct-filler-name', (e) => e.firstChild.textContent.trim());
  await page.focus('.ct-fillers li .button-primary');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value !== null, { timeout: 4000 });
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-next-t', 'the focus on the Next step\'s title');
  assert.ok((await page.evaluate(() => window.__ctTest.store.toast.value.text)).includes(name), 'the toast names the plant added');
  await page.focus(DISMISS);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ctTest.store.toast.value === null, { timeout: 4000 });
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-next-t', 'the toast hands the focus back to the Next step');
  await done(page);
});

test('PP-B34 (b2 Lyon "See all", a dry shady spot; review r1 bugs-3, conformance-1): Add lists exactly the plants "See all N" counts, the site misfits flagged, never hidden', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.spot.value = { ...store.spot.value, light: 'shade', water: 'dry' }; });
  await ownPalette(page, 3);
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value && document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  await page.evaluate(() => window.__ctTest.store.hideToast());
  const seen = [];
  for (let i = 0; i < 6 && await page.$('.ct-next-actions'); i++) {
    const hole = await nextHole(page);
    const label = await page.$eval('.ct-next-actions .button', (e) => e.textContent.trim());
    const n = Number(/\d+/.exec(label)?.[0] ?? 1);
    await openAdd(page).catch(() => {});
    if (await page.$('dialog.ct-add[open]')) {
      const outside = await page.evaluateHandle(() => [...document.querySelectorAll('dialog.ct-add[open] .button')].find((b) => /outside/i.test(b.textContent)) ?? null);
      if (await outside.evaluate((b) => !!b)) await outside.click();
      const all = await page.$('dialog.ct-add[open] .ct-add-showall');
      if (all) await all.click();
      await frames(page);
      const rows = await page.$$eval('dialog.ct-add[open] .ct-rows li', (els) => els.length);
      seen.push(`${hole}: "${label}" lists ${rows}`);
      if (rows !== n) seen.push('MISMATCH');
      await page.evaluate(() => window.__ctTest.store.closeSheet());
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
    } else if (n) seen.push(`${hole}: "${label}" opened no list`, 'MISMATCH');
    await page.click(`.ct-next-actions ${aria('button', en['consortium.palette.notNow'])}`);
    await frames(page);
  }
  assert.ok(seen.length > 0, 'a hole was checked');
  assert.ok(!seen.includes('MISMATCH'), seen.join('; '));
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

test('PP-B36 (b2 empty palette; review r1 bugs-9, conformance-8): with every plant taken out, the page says it is empty and offers Paste and Suggest, with no picture', async () => {
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.evaluate(() => { const { store } = window.__ctTest; for (const id of store.members.value.slice()) store.removeMember(id); });
  assert.ok(await page.waitForFunction((t) => document.querySelector('.ct-next')?.textContent.includes(t), { timeout: 4000 }, en['consortium.palette.empty']).then(() => true, () => false), 'says the palette is empty');
  assert.ok(await has(page, `.ct-next ${aria('button', en['consortium.start.paste'])}`, 1000), 'Paste');
  assert.ok(await has(page, `.ct-next ${aria('button', en['consortium.start.suggest'])}`, 1000), 'Suggest');
  assert.equal(await page.$('.ct-chart'), null, 'no picture of nothing');
  await done(page);
});

test('PP-B37 (b2 pictures key; review r1 conformance-6): each picture says what colour and icon mean, and each plant names its main job in words', async () => {
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-chart [data-plant-id]', { timeout: 8000 });
  const jobs = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'].map((j) => en[`consortium.job.${j}`]).concat(en['consortium.palette.jobsNone']);
  // Through the years has the key; the jobs picture's lane heads are the jobs, each with its icon and word.
  for (const key of await page.$$eval('.ct-years .ct-chart', (els) => els.map((e) => e.querySelector('.ct-chart-key')?.textContent ?? ''))) {
    assert.ok(key.includes(en['consortium.palette.jobKey']), `the key says what colour and icon mean ("${key.slice(0, 60)}")`);
    assert.ok(jobs.some((j) => key.includes(j)), 'with the jobs in words');
  }
  // Its accessible name (one attribute, no extra element per chip: 200-plant scale); Through the years
  // also shows the job's icon.
  const chips = await page.$$eval('.ct-chart .ct-chip[data-plant-id]', (els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  const bare = chips.filter((c) => !jobs.some((j) => c.includes(j)));
  assert.deepEqual(bare, [], 'every plant names its main job');
  assert.ok(await page.$$eval('.ct-years .ct-chip[data-plant-id]', (els) => els.length > 0 && els.every((e) => e.querySelector('.ct-job-icon'))), 'with its icon in Through the years');
  const heads = await page.$$eval('.ct-palette-pictures > :not(.ct-years) .ct-chart-row', (els) => els.map((e) => ({ icon: !!e.querySelector('.ct-chart-head .ct-job-icon'), text: e.querySelector('.ct-chart-head').textContent })));
  assert.ok(heads.length && heads.every((x) => x.icon && jobs.some((j) => x.text.includes(j))), `the jobs picture's lanes each name their job with its icon (${JSON.stringify(heads)})`);
  await done(page);
});

test('PP-B38 (b2 laptop; review r1 conformance-7, bugs-11): at 1280 px the Next step stands beside the pictures, and the time step for print is chosen on the page', async () => {
  const page = await tool({ width: 1280, hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-chart [data-plant-id]', { timeout: 8000 });
  const [next, chart] = await page.evaluate(() => [document.querySelector('.ct-next'), document.querySelector('.ct-chart')].map((e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top }; }));
  assert.ok(next.left >= chart.right - 1 || chart.left >= next.right - 1, `side by side (Next step ${Math.round(next.left)}–${Math.round(next.right)}, picture ${Math.round(chart.left)}–${Math.round(chart.right)})`);
  const later = `.ct-stepper ${aria('button', en['consortium.palette.later'])}`;
  assert.ok(await has(page, later, 2000), 'the time step stepper on a laptop too');
  await page.click(later);
  await page.click(later);
  const step = await page.evaluate(() => window.__ctTest.store.yearStep.value);
  assert.equal(step, 4);
  assert.ok(await page.$eval('.ct-years .ct-chart-columns', (e) => e.children.length) > 1, 'every time step still drawn');
  // Review r1 perf-4: the print sheet is not in the page until printing (no hidden sheet re-rendered per add).
  assert.equal(await page.$('.ct-print'), null, 'no print sheet on screen');
  await h.pdf(page);
  await page.waitForSelector('.ct-print .ct-print-stage', { timeout: 8000 }).catch(() => {}); // mounted for print (review r1 perf-4)
  const above = await page.$eval('.ct-print .ct-print-stage', (e) => e.textContent).catch(() => '');
  assert.ok(above.includes(en[`consortium.phase.${PHASES[step]}.plain`]), `the chosen time step printed ("${above}")`);
  await done(page);
});

// Since r-f3c6dd8b3c4391be (D2d) the first second-look fillers at Lyon are Slight-toxicity plants (dandelion,
// garlic, asparagus): conflicts.ts raises Slight with its level since b3 ('Mildly toxic'), so the flag says
// it in words (marker removed by b3, chunk 2).
test('PP-B39 (b3 the Slight flag; b2 a second look, review r1 conformance-2): a filler with a warning sits under "Needs a second look" with its warning in words, and adds in one tap', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await ownPalette(page, 1);
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value && document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  await page.evaluate(() => window.__ctTest.store.hideToast());
  const look = () => page.$('.ct-next [data-look] li');
  for (let i = 0; i < 12 && !(await look()) && await page.$('.ct-next-actions'); i++) {
    await page.click(`.ct-next-actions ${aria('button', en['consortium.palette.notNow'])}`);
    await frames(page);
  }
  const li = await look();
  assert.ok(li, 'a hole with a filler that needs a second look');
  const head = await page.$eval('.ct-next [data-look]', (e) => e.previousElementSibling?.textContent ?? '');
  assert.ok(head.includes(en['consortium.palette.secondLook'].split('{n}')[0].replace(/\($/, '').trim()), `under its heading ("${head}")`);
  // Its warning mark is text sized, not stretched to the column (P5-19b layout shift).
  const marks = await page.$$eval('.ct-next .ct-glyph', (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  assert.ok(marks.length && marks.every((n) => n <= 20), `warning marks at text size (${marks})`);
  assert.ok(await li.$('.ct-flag-line'), 'its warning in words with the icon');
  const id = await li.evaluate((e) => e.dataset.plantId);
  await li.$eval('.button-primary', (b) => b.click());
  assert.equal(await page.$('dialog[open]'), null, 'nothing asks');
  assert.ok(await page.evaluate((x) => window.__ctTest.store.members.value.includes(x), id), 'added in one tap');
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

// r2-colour-1: the jobs picture's bands are drawn in their row's job (the lane head's icon and word),
// so no band says a job by colour alone; the plants with no job recorded are neutral.
test('PP-B43 (b2 review r2 colour-1): the jobs picture fills each band with its row\'s job, the colour its lane head names', async () => {
  const page = await tool({ hash: await temperateLink(null, 8) });
  assert.ok(await onPage(page), 'the palette page');
  await page.waitForSelector('.ct-chart [data-plant-id]', { timeout: 8000 });
  const odd = await page.$$eval('.ct-palette-pictures > :not(.ct-years) .ct-chart-svg', (svgs) => {
    const out = [];
    for (const svg of svgs) {
      let lane = null;
      for (const el of svg.children) {
        if (el.classList.contains('ct-chart-lane')) lane = el.dataset.lane;
        else if (el.classList.contains('ct-chart-band') && el.dataset.job !== lane) out.push(`${lane}: ${el.dataset.job}`);
      }
    }
    return out;
  });
  assert.ok(await page.$('.ct-palette-pictures > :not(.ct-years) .ct-chart-band'), 'the jobs picture draws bands');
  assert.deepEqual(odd, [], `bands in a job other than their row's: ${odd.join(', ')}`);
  await done(page);
});

const failMediterranean = (page, ids, from) => page.evaluate((all, gs) => {
  const { store } = window.__ctTest, src = store.source.value, read = src.pool.bind(src);
  src.pool = (c) => (c === 'Mediterranean' ? Promise.reject(new Error('test: list unreadable')) : read(c));
  store.addMembers(all, Object.fromEntries(gs.map((g) => [g, 'Mediterranean'])));
  store.loadPool('Mediterranean');
}, ids, from).then(() => showPalette(page));
const mediterranean = (n) => realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant NOT IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY 1 LIMIT ?").all(n).map((r) => String(r.id)));
const listMissing = (page) => page.waitForFunction((t) => [...document.querySelectorAll('.ct-notice')].some((n) => n.textContent.includes(t) && n.textContent.includes('Mediterranean')), { timeout: 8000 }, en['consortium.palette.listFailed'].split('{lists}')[0].replace(/^(one|other):\s*/, '').trim()).then(() => true, () => false);

// r2-empty-1: the empty check counts every member, the plants of a pending or failed guest list too.
test('PP-B44 (b2 review r2 empty-1): a palette made only of plants from a guest list that fails is never called empty; the Next step says the holes wait for the list, and ct:first-view is not marked on it', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const gs = await mediterranean(2);
  assert.equal(gs.length, 2, 'two Mediterranean plants');
  await failMediterranean(page, gs, gs);
  assert.ok(await onPage(page), 'the palette page');
  assert.ok(await listMissing(page), 'the Mediterranean list named as missing');
  await page.waitForFunction(() => window.__ctTest.store.verdictRule.value, { timeout: 10_000 }).catch(() => {});
  await settled(page);
  const text = await page.$eval('.ct-next', (e) => e.textContent);
  assert.ok(!text.includes(en['consortium.palette.empty']) && text.includes(en['consortium.palette.holesListMissing']), `called empty while its plants wait for their list ("${text.slice(0, 80)}")`);
  assert.equal(await page.evaluate(() => performance.getEntriesByName('ct:first-view', 'mark').length), 0, 'ct:first-view marked on a palette whose plants are not read');
  await done(page);
});

// r2-empty-2: removing a failed list's last plant clears its "not checked" state.
test('PP-B45 (b2 review r2 empty-2): once the grower removes the plants of a list that failed, the notice goes and the Next step names a hole', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const [g] = await mediterranean(1);
  await failMediterranean(page, [...await own(2), g], [g]);
  assert.ok(await onPage(page), 'the palette page');
  assert.ok(await listMissing(page), 'the Mediterranean list named as missing');
  await page.evaluate((x) => window.__ctTest.store.removeMember(x), g);
  const ok = await page.waitForFunction(() => document.querySelector('.ct-next')?.dataset.hole, { timeout: 6000 }).then(() => true, () => false);
  const notice = await page.evaluate(() => [...document.querySelectorAll('.ct-notice')].some((n) => n.textContent.includes('Mediterranean')));
  assert.ok(ok && !notice, `the palette stays "not checked" with no plant of that list left (hole named ${ok}, notice ${notice})`);
  await done(page);
});

// r2-offline-1: Actions' could-not-load line is lazy.tsx's LoadFailed: offline, never Reload.
test('PP-B46 (b2 review r2 offline-1): offline, a Download whose chunk cannot come says "Needs a connection", with no Reload', async () => {
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await onPage(page), 'the palette page');
  await page.evaluate(() => { window.__ctFaults.later = 'fail'; });
  await page.setOfflineMode(true);
  await page.click(aria('button', en['consortium.download.button']));
  assert.ok(await has(page, '.ct-page-actions .ct-notice', 4000), 'the line says it did not load');
  const reload = await page.$(`.ct-page-actions .ct-notice ${aria('button', en['consortium.details.reload'])}`);
  const text = await page.$eval('.ct-page-actions .ct-notice', (e) => e.textContent);
  assert.ok(!reload && text.includes(en['consortium.load.needsConnection']), `Reload offline would replace the tool with the browser's offline page ("${text}")`);
  await page.setOfflineMode(false);
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
// The shared 200-plant palette (scripts/palette-200.mjs), saved, reopened at 390 and 1280 px. Budgets:
// navigation → Next step visible 2.5 s; one Add from the Next step → the page updated 300 ms; no long task
// over 200 ms after the page is up; the palette page's DOM at most SCALE_DOM (measured + 20 %).
const SCALE_DOM = { 390: 393, 1280: 462 }; // measured 327 and 385 on 2026-11-14, + 20 %
// Marker (owner b2), kept after review r1 (measured 2026-11-14, 4× throttle, 3 runs; ranges):
// - 200 plants: Next step 2.6-4.5 s (2.4-3.1 s with arrival.ts's country guess stubbed: its getTimeZones
//   for every country is perf-1, b1a's), Add 179-316 ms, DOM 374/459, one or two long tasks of 220-420 ms
//   after load (native compile, style and layout once the later chunks are fetched, no island JS on top).
// - 10 plants (fixed costs): Next step 2.0-2.1 s stubbed (3.1-4.4 s not), Add 89-141 ms, no long task.
// So load misses on fixed costs (about 2 s before any plant), and the long tasks come with 200 plants.
failing('PP-B29 (b2 scale, 200 plants, 4× CPU throttle): a saved 200-plant palette shows its Next step within 2.5 s, one Add updates the page within 300 ms, no long task over 200 ms, the DOM within budget @real-data', { owner: 'b2', reason: /scale budgets missed/, timeout: 240_000 }, async (t) => {
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
      // One Add from the Next step's filler; 200 plants of this palette leave no hole, so then from the Add
      // sheet (ticked, "Add 1 plant"): measured from the press to the second frame after the toast.
      let press = '.ct-next .ct-fillers button';
      if (!(await has(page, press, 1000))) {
        await page.evaluate(() => window.__ctTest.openSheet('add'));
        await page.waitForSelector('dialog.ct-add[open] .ct-rows input[type="checkbox"]', { timeout: 20_000 });
        await page.click('dialog.ct-add[open] .ct-rows input[type="checkbox"]');
        press = 'dialog.ct-add[open] .ct-add-bar .button-primary';
      }
      const add = await page.evaluate((sel) => new Promise((done) => {
        const t0 = performance.now();
        new MutationObserver((_, o) => { if (document.querySelector('.ct-toast')) { o.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t0))); } }).observe(document.body, { childList: true, subtree: true });
        document.querySelector(sel).click();
      }), press);
      await new Promise((r) => setTimeout(r, 900));
      const long = await page.evaluate(() => window.__scale.long.filter((e) => e.at > window.__scale.nextAt && e.ms > 200).map((e) => Math.round(e.ms)));
      figures.push(`${width} px: Add ${Math.round(add)} ms, long tasks over 200 ms after load: ${long.length ? long.join(', ') : 'none'} (save ${members} chars)`);
      if (next >= 2500) misses.push(`${width} px: Next step visible in ${Math.round(next)} ms (budget 2500, throttled 4×)`);
      if (add >= 300) misses.push(`${width} px: one Add updates the page in ${Math.round(add)} ms (budget 300)`);
      if (dom > SCALE_DOM[width]) misses.push(`${width} px: ${dom} elements on the palette page (budget ${SCALE_DOM[width]})`);
      if (long.length) misses.push(`${width} px: long tasks over 200 ms after load (${long.join(', ')} ms)`);
    } finally {
      t.diagnostic(figures.join(' | '));
      await page.browserContext().close().catch(() => {});
    }
  }
  assert.deepEqual(misses, [], `scale budgets missed: ${misses.join('; ')}`);
});
