// E6's user paths (design check §4.1 L1–L12, §5.7), written failing in commit 0: each test is marked
// expected-fail (scripts/expect-fail.mjs failing()) with its owner stream in the title, and the owner
// removes the marker in the commit that makes it pass (the call becomes test()). Owners per chunk
// (scripts/plan/e6-owners.json): K1 in chunk 1 (E6-1), K3 in chunk 3 (E6-3…5; E6-3b…5b, rows L6,
// L7, L12, added by K3), B4 in chunk 4 (E6-2); R4's specs are in consortium-e6-r4 (one owner per
// file per chunk). No subtests inside a marked
// test: one behaviour variant each (1280 px light). Run capped: npm run test:browser.
//
// Files each pass needs: E6-1 views/Start.tsx and src/lib/consortium/fold.ts (K1, A9); E6-2
// astro.config.mjs (modulepreload filter) and views/lazy.tsx's prefetch trigger (B4, K3; A5, A6);
// E6-3…5 views/Sheets.tsx, views/details/**, views/lazy.tsx (K3; A6) and the `details` role
// (scripts/built-modules.mjs LAZY_ENTRIES, commit 0).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadState } from './harness.mjs';
import { aria, axNodes, en, h, has, realDb, useHarness } from './helpers.mjs';
import { choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { searchIndex } from '../../src/islands/consortium/data/search.ts';

useHarness();

const DESKTOP = { width: 1280, theme: 'light' };
const LOADING = en['consortium.details.loading'];
const FAILED = en['consortium.details.loadFailed'];
const RELOAD = en['consortium.details.reload'];

// The fixture tool, Temperate suggested through the controls, the matrix shown (as seams-helpers
// suggested(), with harness options: block, setup).
async function matrixPage(opts = {}) {
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', ...opts });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000), 'the matrix');
  return page;
}
// The members' chips (accessible name "Plant · …").
const chips = async (page) => (await axNodes(page)).filter((n) => n.role === 'button' && / · /.test(n.name ?? '')).map((n) => n.name);
const memberIds = (page) => page.$$eval('#ct-root [data-plant-id]', (els) => [...new Set(els.map((e) => e.dataset.plantId))].sort());
const dialogOpen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
const focusedName = (page) => page.evaluate(() => (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim());
// L1: a chip opens a part that does not load: the sheet closes, the toast says so with Reload, and
// the focus goes back to the chip.
async function couldNotOpen(page, chip) {
  await page.locator(aria('button', chip)).click();
  assert.ok(await has(page, aria('button', RELOAD), 8000), 'the toast offers Reload');
  assert.match(await page.$eval('.ct-toast-text', (e) => e.textContent), new RegExp(FAILED.slice(0, 20)));
  assert.equal(await dialogOpen(page), false, 'the sheet is closed');
  await page.waitForFunction((name) => (document.activeElement?.getAttribute('aria-label') || '').trim() === name, { timeout: 2000 }, chip).catch(() => {});
  assert.equal(await focusedName(page), chip, 'focus back on the chip');
}
const requestsTo = (log, urls) => log.filter((p) => urls.includes(p));
const recordRequests = (log) => async (page) => { page.on('request', (r) => { try { log.push(new URL(r.url()).pathname); } catch { /* data: urls */ } }); };

// E6-1: Start's crop search and Add's search fold and match names the same way (A9). The export has
// no "Weißkohl" and no crop named with "cœur" (design check exit wording); Süßholz (Glycyrrhiza
// glabra, a Mediterranean crop) carries ß and ü, and the zh Temperate crops 葱 (onions, leek, chives,
// ramsons) an unspaced substring. Expected hits: Add's searchIndex over the climate's crops with the
// names Start shows (the page's language, English, the canonical name).
const CROP_CASES = [
  { lang: 'de', climate: 'Mediterranean', q: 'sussholz' },
  { lang: 'zh', climate: 'Temperate', q: '葱' },
];
const cropsOf = (climate, lang) => realDb((db) => db.prepare(`SELECT p.id, p.canonical_name c,
  (SELECT name FROM plant_names n WHERE n.plant = p.plant AND n.locale = ?) l, (SELECT name FROM plant_names n WHERE n.plant = p.plant AND n.locale = 'en') en
  FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? AND x.role = 'crop'`).all(lang, climate));
test('E6-1 (K1 kit): Start\'s crop search finds what Add\'s search finds for the same words: "sussholz" finds Süßholz, an unspaced CJK substring finds its crops @real-data', async () => {
  for (const { lang, climate, q } of CROP_CASES) {
    const crops = await cropsOf(climate, lang);
    const byId = new Map(crops.map((r) => [String(r.id), r.c]));
    const expected = searchIndex(crops.map((r) => ({ id: String(r.id), canonical: r.c, names: { ...(r.en ? { en: r.en } : {}), ...(r.l ? { [lang]: r.l } : {}) } })))(q).map((x) => byId.get(x.id));
    assert.ok(expected.length, `the export has a ${climate} crop matching "${q}" in ${lang}`);
    const page = await tool({ lang, ...DESKTOP });
    await choose(page, climate);
    await page.locator('.ct-crop-search input').fill(q);
    await page.waitForFunction(() => !!document.querySelector('.ct-hits, .ct-crop-search ~ p[role="status"]'), { timeout: 4000 });
    const hits = await page.$$eval('.ct-hits .ct-sci', (els) => els.map((e) => e.textContent.trim()));
    await page.browserContext().close().catch(() => {});
    assert.ok(hits.length, `Start finds no crop for "${q}" (${lang}, ${climate}); Add's search finds ${expected.join(', ')}`);
    if (expected.length <= 8) assert.deepEqual([...hits].sort(), [...expected].sort(), `Start and Add, same hits for "${q}" (${lang})`);
    else { assert.equal(hits.length, 8); for (const x of hits) assert.ok(expected.includes(x), `${x} is one of Add's hits for "${q}"`); }
  }
});

// E6-2 (L5, A5): before the data is ready nothing lazy is fetched: no modulepreload link for a sheet
// or the after-the-matrix part, and no request for one, while the database download is held.
failing('E6-2 (B4 build): before the data is ready, no sheet or after-the-matrix chunk is modulepreloaded or requested (L5)', { owner: 'B4', reason: /modulepreloaded before the data is ready \(preloaded today\)/ }, async () => {
  const { sheets, later } = h.roles;
  assert.ok(sheets.length && later.length, 'roles sheets and later have chunks in this build');
  const lazy = [...sheets, ...later];
  const log = [];
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', database: 'stall', hook: true, setup: recordRequests(log) });
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /\/_astro\/load\.[\w-]+\.js$/.test(e.name)), { timeout: 10_000 });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000, concurrency: 1 }).catch(() => {});
  assert.notEqual(await loadState(page, 100), 'ready', 'the database is still held');
  const preloaded = await page.$$eval('link[rel="modulepreload"]', (links) => links.map((l) => new URL(l.href).pathname));
  const early = lazy.filter((u) => preloaded.includes(u));
  assert.deepEqual(early, [], `sheet and after-the-matrix chunks modulepreloaded before the data is ready (preloaded today): ${early.join(', ')}`);
  assert.deepEqual(requestsTo(log, lazy), [], 'sheet and after-the-matrix chunks requested before the data is ready');
  await page.browserContext().close().catch(() => {});
});

// E6-3 (L2, L4): Details opened while its chunk is held opens at once with the plant's name and the
// loading line (a status), then its content; the prefetch and the press share one request.
test('E6-3 (K3 lazy Details): Details opened while its chunk is held shows the plant\'s name and a loading line at once, then its content, with one request (L2, L4)', async () => {
  assert.ok(h.roles.details.length, 'role `details` has no chunk in this build: Details is still in the first run');
  const log = [];
  const page = await matrixPage({ block: { details: 'hold' }, setup: recordRequests(log) });
  const [chip] = await chips(page);
  const name = chip.split(' · ')[0].split(', ')[0]; // "European chestnut, Castanea sativa. Emergent, …": the plant's name first
  await page.locator(aria('button', chip)).click();
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  assert.match(await page.$eval('dialog[open]', (d) => d.textContent), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'the plant\'s name at once');
  assert.ok(await has(page, `dialog[open] [role="status"]`, 2000), 'a loading line (status)');
  assert.match(await page.$eval('dialog[open] [role="status"]', (s) => s.textContent), new RegExp(LOADING.replace('…', '')));
  assert.ok(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement)), 'focus in the dialog');
  await page.releaseHeld();
  await page.waitForFunction((loading) => { const d = document.querySelector('dialog[open]'); return !!d && !d.textContent.includes(loading) && d.querySelectorAll('h3, section').length > 0; }, { timeout: 8000 }, LOADING);
  for (const u of h.roles.details) assert.ok(requestsTo(log, [u]).length <= 1, `one request for ${u}`);
  await page.browserContext().close().catch(() => {});
});

// E6-4 (L1, L7): the Details chunk missing (blocked, or a deploy since the page loaded): the sheet
// closes, the toast says so with Reload, the focus returns to the chip, and Reload restores the
// consortium from the save.
test('E6-4 (K3 lazy Details): a missing Details chunk closes the sheet with a toast and Reload, focus back on the chip, the consortium restored after Reload (L1)', async () => {
  assert.ok(h.roles.details.length, 'role `details` has no chunk in this build: Details is still in the first run');
  const page = await matrixPage({ block: { details: 404 } });
  const before = await memberIds(page);
  const [chip] = await chips(page);
  await couldNotOpen(page, chip);
  await page.locator(aria('button', RELOAD)).click();
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
  assert.equal(await loadState(page), 'ready');
  assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000), 'the matrix again');
  assert.deepEqual(await memberIds(page), before, 'the consortium restored from the save');
  await page.browserContext().close().catch(() => {});
});

// E6-5 (L3): offline after the idle prefetch, Details still opens.
test('E6-5 (K3 lazy Details): offline after the prefetch, Details opens with its content and no toast (L3)', async () => {
  assert.ok(h.roles.details.length, 'role `details` has no chunk in this build: Details is still in the first run');
  const log = [];
  const page = await matrixPage({ setup: recordRequests(log) });
  const deadline = Date.now() + 8000;
  while (!requestsTo(log, h.roles.details).length && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  assert.ok(requestsTo(log, h.roles.details).length, 'the Details chunk is prefetched once the data is ready');
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  await page.setOfflineMode(true);
  const [chip] = await chips(page);
  await page.locator(aria('button', chip)).click();
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  await page.waitForFunction((loading) => { const d = document.querySelector('dialog[open]'); return !!d && !d.textContent.includes(loading) && d.querySelectorAll('h3, section').length > 0; }, { timeout: 4000 }, LOADING);
  assert.equal(await has(page, aria('button', RELOAD), 300), false, 'no failure toast');
  await page.setOfflineMode(false);
  await page.browserContext().close().catch(() => {});
});

// E6-3b (L6): a sheet closed before its chunk arrives writes nothing (no toast, no sheet back); the
// chunk, once here, opens the next time at once, with no second request.
test('E6-3b (K3 lazy Details): Details closed while its chunk is held, then released: no toast, no sheet; the next open shows the content at once with one request (L6)', async () => {
  assert.ok(h.roles.details.length, 'role `details` has a chunk in this build');
  const log = [];
  const page = await matrixPage({ block: { details: 'hold' }, setup: recordRequests(log) });
  const [chip] = await chips(page);
  await page.locator(aria('button', chip)).click();
  await page.waitForSelector('dialog[open] [role="status"]', { timeout: 2000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 2000 });
  await page.releaseHeld();
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  assert.equal(await dialogOpen(page), false, 'no sheet opens by itself');
  assert.equal(await has(page, aria('button', RELOAD), 300), false, 'no failure toast');
  await page.locator(aria('button', chip)).click();
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  assert.equal(await page.$('dialog[open] .status-line[role="status"]'), null, 'the content at once, no loading line');
  assert.ok(await has(page, 'dialog[open] section', 1000), 'the dialog\'s sections');
  for (const u of h.roles.details) assert.equal(requestsTo(log, [u]).length, 1, `one request for ${u}`);
  await page.browserContext().close().catch(() => {});
});

// E6-4b (L7): the Details part whose import rejects (a chunk that throws while evaluating comes back the
// same way: the import() promise rejects; the test hook's failSheets) is an L1: the sheet closes, the
// toast says so with Reload, the focus goes back to the chip.
test('E6-4b (K3 lazy Details): a Details part whose import rejects closes the sheet with a toast and Reload, focus back on the chip (L7)', async () => {
  const page = await matrixPage({ hook: true });
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  const [chip] = await chips(page);
  await page.evaluate(() => window.__ctTest.failSheets());
  await couldNotOpen(page, chip);
  await page.browserContext().close().catch(() => {});
});

// E6-5b (L12, A6): a visitor who stays on Start (no matrix ever) still gets the prefetch once the data is
// ready, so Paste a list opens with its content, not a loading line.
test('E6-5b (K3 lazy parts): on Start only, the data ready, the plant dialog and the sheets are fetched without the matrix; Paste a list opens with its content at once (L12)', async () => {
  assert.ok(h.roles.details.length && h.roles.sheets.length, 'roles details and sheets have chunks in this build');
  const log = [];
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', setup: recordRequests(log) });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  const lazy = [...h.roles.details, ...h.roles.sheets];
  const deadline = Date.now() + 8000;
  while (lazy.some((u) => !requestsTo(log, [u]).length) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(lazy.filter((u) => !requestsTo(log, [u]).length), [], 'every sheet chunk and the dialog are fetched on Start');
  assert.equal(await page.evaluate(() => performance.getEntriesByName('ct:matrix').length), 0, 'the matrix was never shown');
  await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  await page.locator(aria('button', 'Paste a list')).click();
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  assert.equal(await page.$('dialog[open] .status-line[role="status"]'), null, 'no loading line');
  assert.ok(await has(page, 'dialog[open] textarea', 1000), 'the paste box at once');
  for (const u of lazy) assert.equal(requestsTo(log, [u]).length, 1, `one request for ${u}`);
  await page.browserContext().close().catch(() => {});
});

// E6-5c (L4, review): a prefetch that failed (a flaky connection: the Details chunk's first request
// does not come back) is retried when the reader opens a plant, so the dialog opens rather than the
// L1 toast. The first request (the page's modulepreload or the idle prefetch, whichever asks first)
// is held, then let through while the page is offline, so it fails; back online, a plant opens.
failing('E6-5c (K3 lazy Details): after the Details chunk\'s first request failed, opening a plant fetches it again and shows its content, not the toast (L4)', { owner: 'K3', reason: /no failure toast \(requests for the chunk: 1\)/ }, async () => {
  const log = [];
  const page = await matrixPage({ block: { details: 'hold' }, setup: recordRequests(log) });
  const deadline = Date.now() + 8000;
  while (!page.held.length && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  assert.ok(page.held.length, 'the Details chunk was asked for (held)');
  await page.setOfflineMode(true);
  await page.releaseHeld();
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
  await page.setOfflineMode(false);
  const [chip] = await chips(page);
  await page.locator(aria('button', chip)).click();
  await page.waitForFunction(() => !!document.querySelector('dialog[open] section, .ct-toast-text'), { timeout: 8000 }).catch(() => {});
  assert.equal(await has(page, aria('button', RELOAD), 300), false, `no failure toast (requests for the chunk: ${requestsTo(log, h.roles.details).length})`);
  assert.ok(await has(page, 'dialog[open] section', 300), `the dialog's content (requests for the chunk: ${requestsTo(log, h.roles.details).length})`);
  await page.browserContext().close().catch(() => {});
});

// E6-3c (L2, review): a sheet opened before its chunk arrives is one dialog from the loading line to
// the content: it slides in once and is announced once, its focus inside it throughout.
failing('E6-3c (K3 lazy Details): Details opened while its chunk is held stays one open dialog when its content arrives (one slide-in, one announcement)', { owner: 'K3', reason: /the same <dialog> shows the content/ }, async () => {
  const page = await matrixPage({ block: { details: 'hold' } });
  const [chip] = await chips(page);
  await page.locator(aria('button', chip)).click();
  await page.waitForSelector('dialog[open] [role="status"]', { timeout: 2000 });
  await page.evaluate(() => { window.__k3Dialog = document.querySelector('dialog[open]'); });
  await page.releaseHeld();
  await page.waitForFunction(() => !!document.querySelector('dialog[open] section'), { timeout: 8000 });
  assert.equal(await page.evaluate(() => document.querySelector('dialog[open]') === window.__k3Dialog), true, 'the same <dialog> shows the content');
  assert.equal(await page.$$eval('dialog.ct-sheet', (ds) => ds.length), 1, 'one sheet dialog in the page');
  assert.ok(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement)), 'focus in the dialog');
  assert.equal(await page.$eval('dialog[open]', (d) => d.getAttribute('aria-labelledby')), 'ct-d-title', 'named by the plant\'s heading');
  await page.browserContext().close().catch(() => {});
});
