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

useHarness();

const DISMISS = aria('button', en['consortium.dismiss']);
const placed = async (page) => {
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.click('[data-place-suggest], .ct-cta .button-primary'); // b1a's Place marks Suggest data-place-suggest
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 1, { timeout: 15_000 });
};
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));

const PHONE = { width: 390 };
const WASM = /\/sqlite3\.[\w-]+\.wasm$/;
const LOADER = /\/_astro\/load\.[\w-]+\.js$/;
// Every request of the page, in order, with the time it started (CDP-free: the page's own events).
const logRequests = (log) => async (pg) => { pg.on('request', (r) => { try { log.push({ path: new URL(r.url()).pathname, at: performance.now() }); } catch { /* data: */ } }); };

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

test('PP-B26 (b2 marks, F1a-S2 restored, A24): ct:start fires once on a first visit, and ct:first-view once when the palette is first on screen', async () => {
  const page = await tool(PHONE);
  const marks = (name) => page.evaluate((n) => performance.getEntriesByName(n, 'mark').length, name);
  await frames(page);
  assert.equal(await marks('ct:start'), 1, 'ct:start once on Place');
  await placed(page);
  assert.ok(await page.waitForFunction(() => performance.getEntriesByName('ct:first-view', 'mark').length > 0, { timeout: 15_000 }).then(() => true, () => false), 'ct:first-view fires');
  assert.deepEqual([await marks('ct:start'), await marks('ct:first-view')], [1, 1], 'each once per page');
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
  await done(page);
});

test('PP-B28 (b2 keyboard journey, F1a-P8 restored, A25): with the keyboard only, the Next step\'s "See all" opens Add and closing it returns the focus to the button', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(2));
  assert.ok(await onPage(page), 'the palette page');
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
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(3));
  assert.ok(await onPage(page), 'the palette page');
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
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(2));
  assert.ok(await onPage(page), 'the palette page');
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
  const at = await page.evaluate(() => { const a = document.activeElement, r = document.querySelector('[data-raiser]'); return { raiser: !!r && a === r, heading: a?.matches('[data-view-heading]') ?? false, connected: !!r }; });
  assert.ok(at.connected ? at.raiser : at.heading, `the focus returns to the control that raised it (or the page heading once it is gone): ${JSON.stringify(at)}`);
  await done(page);
});

test('PP-B20 (b2 verdict chunk refused): fit lines say "Not checked", never "Fits", the holes say they were computed without it, and Reload works', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(2));
  assert.ok(await onPage(page), 'the palette page');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the verdict chunk failed');
  assert.ok(await has(page, '.ct-notice[role="alert"]', 4000), 'said once');
  assert.ok((await page.$eval('.ct-palette-page', (e) => e.textContent)).includes(en['consortium.palette.verdictFailed']), 'the holes computed without verdicts, in words');
  const fits = await page.$$eval('.ct-fit', (els) => els.map((e) => e.dataset.level));
  assert.ok(fits.every((l) => l === 'unknown'), `every fit line "Not checked" (${fits.join(', ')})`);
  await Promise.all([page.waitForNavigation({ timeout: 20_000 }), page.click(`.ct-palette-page .ct-notice ${aria('button', en['consortium.load.reload'])}`)]);
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.load.value.status === 'ready', { timeout: 20_000 }).then(() => true, () => false), 'Reload brings the tool back');
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
  assert.ok(await onPage(page), 'the palette page');
  const line = en['consortium.palette.listFailed'].split('{lists}')[0].replace(/^(one|other):\s*/, '').trim();
  assert.ok(await page.waitForFunction((t) => [...document.querySelectorAll('.ct-notice')].some((n) => n.textContent.includes(t) && n.textContent.includes('Mediterranean')), { timeout: 8000 }, line).then(() => true, () => false), 'the Mediterranean list named as missing');
  assert.equal(await page.evaluate(() => window.__ctTest.store.load.value.status), 'ready', 'the tool stays');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.guestsPending.value), [], 'not "loading" for ever');
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
  await page.evaluate((ids) => window.__ctTest.store.addMembers(ids), await own(1));
  assert.ok(await onPage(page), 'the palette page');
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

// ---- scale (owner directive 2026-11-14: smooth to 200 plants), CPU throttled 4× through CDP ----
// The shared 200-plant palette (scripts/palette-200.mjs), saved, reopened at 390 and 1280 px. Budgets:
// navigation → Next step visible 2.5 s; one Add from the Next step → the page updated 300 ms; no long task
// over 200 ms after the page is up; the palette page's DOM at most SCALE_DOM (measured + 20 %).
const SCALE_DOM = { 390: 393, 1280: 462 }; // measured 327 and 385 on 2026-11-14, + 20 %
// Marker (owner b2): the first measures miss the load, Add and long-task budgets (report of 2026-11-14:
// at load arrival.ts's country guess calls Intl.Locale getTimeZones for every country, ~0.4 s unthrottled).
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
