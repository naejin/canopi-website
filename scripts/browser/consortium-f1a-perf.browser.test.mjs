// F1a stream 5 (slow phone and budgets; plan F1a stream 5 and exit, design check §4 stream 5, A1 A24, §5):
// one browser test per user scenario on the phone profile (390 px), written in commit 0. The scenarios
// F1a changes are marked expected-fail (scripts/expect-fail.mjs failing()) for their owner perf1 (chunk
// 1; scripts/plan/f1a-owners.json) with their plan label (F1a-Sn); perf1 removes each marker in the
// commit that makes it pass. The two that hold today (a Start-only visitor prefetches; a wasm 404
// shows the failure screen with one request) are plain tests, kept passing once the preload lands.
// Times are measured by consortium-timing.mjs, never asserted here (timing warns, never fails).
import assert from 'node:assert/strict';
import { h, has, useHarness } from './helpers.mjs';
import { tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import test from 'node:test';

useHarness();

const PHONE = { width: 390 };
const WASM = /\/sqlite3\.[\w-]+\.wasm$/;
const LOADER = /\/_astro\/load\.[\w-]+\.js$/;
// Every request of the page, in order, with the time it started (CDP-free: the page's own events).
const logRequests = (log) => async (pg) => { pg.on('request', (r) => { try { log.push({ path: new URL(r.url()).pathname, at: performance.now() }); } catch { /* data: */ } }); };

failing('F1a-S1 (perf1 wasm preload, A24): the sqlite wasm is preloaded with the URL the loader fetches, requested once, and asked for before the loader chunk', { owner: 'perf1', reason: /no wasm preload link on the page/ }, async () => {
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

failing('F1a-S2 (perf1 marks, A24): ct:start fires once on a first visit, and ct:first-view once when the consortium is first on screen', { owner: 'perf1', reason: /ct:start fired 0 times/ }, async () => {
  const page = await tool(PHONE);
  const marks = (name) => page.evaluate((n) => performance.getEntriesByName(n, 'mark').length, name);
  const start = await marks('ct:start');
  assert.equal(start, 1, `ct:start fired ${start} times on Start`);
  await page.evaluate(async () => { const { store } = window.__ctTest; store.climate.value = 'Temperate'; await store.loadPool('Temperate'); });
  await page.waitForFunction(() => !!window.__ctTest.store.suggestRule.value, { timeout: 10_000 });
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => performance.getEntriesByName('ct:first-view', 'mark').length > 0, { timeout: 15_000 }).then(() => true, () => false), 'ct:first-view fires');
  assert.deepEqual([await marks('ct:start'), await marks('ct:first-view')], [1, 1], 'each once per page');
});

test('F1a-S3 (perf1 Start-only visitor, A1): a reader who stays on Start still gets the later parts prefetched once the data is ready', async () => {
  const log = [];
  await tool({ ...PHONE, setup: logRequests(log) });
  const later = h.roles.later;
  assert.ok(later.length, 'the later role has a chunk');
  for (let i = 0; i < 40 && !log.some((r) => later.includes(r.path)); i++) await new Promise((r) => setTimeout(r, 200));
  assert.ok(log.some((r) => later.includes(r.path)), 'the later chunk was prefetched from Start');
});

test('F1a-S4 (perf1 wasm 404 after a deploy, §5 Unreadable): the failure screen shows, with the wasm requested once and no second error from a preload', async () => {
  const log = [];
  const page = await h.open('/consortium/', { ...PHONE, wasmFile: 404, setup: logRequests(log) });
  assert.ok(await has(page, '[data-load-error]', 20_000), 'the failure screen');
  assert.equal(await page.$$eval('[data-load-error]', (els) => els.length), 1, 'one failure screen');
  assert.equal(log.filter((r) => WASM.test(r.path)).length, 1, 'the wasm is requested once');
});
