// The consortium page in a real browser: what commit 0 of P2 built (design check §3 probes P1–P3 and
// P6, the §5 load screens of BT-9). No todo here: every test runs and must pass (review C1;
// scripts/browser-tests.test.mjs enforces it). The streams' tests are consortium-s1…s4.browser.test.mjs.
// Headless Chrome through puppeteer-core on the built site served by wrangler dev. Never part of
// `npm test`; run after `npm run build`, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { countPlantsInPage, loadState, startHarness } from './harness.mjs';
import { ROOT } from './serve.mjs';
import { aria, eachVariant, en, has, index, realDb } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

test('P1: SQLite-WASM opens the real install in headless Chrome on wrangler dev, from the one hashed wasm', async () => {
  const wasm = readdirSync(join(ROOT, 'dist', 'client', '_astro')).filter((f) => f.endsWith('.wasm'));
  assert.equal(wasm.length, 1, `one wasm in the build: ${wasm.join(', ')}`);
  assert.match(wasm[0], /^sqlite3\.[\w-]{8}\.wasm$/);
  const page = await h.open('/consortium/');
  assert.equal(await loadState(page), 'ready');
  const { plants } = await countPlantsInPage(page);
  assert.equal(plants, await realDb((db) => db.prepare('SELECT count(*) n FROM plants').get().n));
  assert.equal(plants, 515, 'release r-2c6bdf65c35caca3 holds 515 plants');
});

test('P2: the wasm is served as application/wasm, and hashed files and the database as immutable', async () => {
  const wasm = readdirSync(join(ROOT, 'dist', 'client', '_astro')).find((f) => f.endsWith('.wasm'));
  const res = await fetch(`${h.url}/_astro/${wasm}`);
  await res.body?.cancel();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/wasm');
  assert.match(res.headers.get('cache-control') ?? '', /immutable/);
  const db = await fetch(`${h.url}${index.files[0].url}`, { method: 'HEAD' });
  assert.match(db.headers.get('cache-control') ?? '', /max-age=31536000.*immutable|immutable.*max-age=31536000/);
  const home = await fetch(`${h.url}/`, { method: 'HEAD' });
  assert.doesNotMatch(home.headers.get('cache-control') ?? '', /immutable/, 'pages are not immutable');
});

test('P3: the database reaches the browser with its gzip magic and no content-encoding', async () => {
  const page = await h.open('/consortium/');
  const seen = await page.evaluate(async (url) => {
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { encoding: res.headers.get('content-encoding'), magic: [bytes[0], bytes[1]], length: bytes.length };
  }, index.files[0].url);
  assert.equal(seen.encoding, null);
  assert.deepEqual(seen.magic, [0x1f, 0x8b]);
  assert.equal(seen.length, index.files[0].bytes);
});

test('P6 / BT-9 JS-off: the title, lede, noscript guide link, release line and loading line are there', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, javaScript: false });
    const shell = await page.evaluate(() => ({
      title: document.querySelector('h1.tool-title')?.textContent,
      lede: document.querySelector('.tool-lede')?.textContent?.trim().length ?? 0,
      release: document.querySelector('.tool-release')?.textContent,
      loading: document.querySelector('#ct-root .status-line')?.textContent,
    }));
    assert.equal(shell.title, en['consortium.title']);
    assert.ok(shell.lede > 20);
    assert.equal(shell.release, en['consortium.release'].replace('{id}', index.release_id));
    assert.equal(shell.loading, en['consortium.loadingTool']);
    // With JS off Chrome renders <noscript> content: the guide link is in the accessibility tree.
    assert.ok(await has(page, aria('link', en['consortium.noscript.link'])), 'the noscript guide link');
  });
});

test('the island mounts with JavaScript on, the head does not move, and the fixture opens', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    const before = await page.evaluate(() => document.querySelector('.tool-head').getBoundingClientRect().height);
    assert.equal(await loadState(page), 'ready');
    const after = await page.evaluate(() => document.querySelector('.tool-head').getBoundingClientRect().height);
    assert.equal(after, before, 'no shift of the static head on mount');
  });
});

// §5 screens, each with its button (Retry, Reload, or only the guide link) found by role and name.
const SCREENS = [
  ['DB 404 (a stale tab after a deploy)', { database: 404 }, 'stale', 'reload'],
  ['corrupt bytes', { database: 'corrupt' }, 'damaged', 'retry'],
  ['a digest that does not match', { database: 'digest' }, 'damaged', 'retry'],
  ['an empty body', { database: 'empty' }, 'damaged', 'retry'],
  ['wrong user_version', { database: 'user-version' }, 'schema', 'reload'],
  ['WebAssembly disabled', { data: 'fixture', wasm: false }, 'wasm-blocked', null],
  ['sqlite3.wasm refused (403; review L1)', { data: 'fixture', wasmFile: 403 }, 'wasm-fetch', 'reload'],
  ['sqlite3.wasm unreachable offline (review L1)', { data: 'fixture', wasmFile: 'offline' }, 'wasm-fetch', 'reload'],
  ['the loader chunk gone after a deploy (online)', { data: 'fixture', loader: 404 }, 'stale', 'reload'],
  ['the loader chunk unreachable offline', { data: 'fixture', loader: 'offline' }, 'fetch', 'retry'],
];
test('BT-9 load: each failure gives its §5 screen and button', async (t) => {
  for (const [what, opts, screen, button] of SCREENS) {
    await t.test(what, async (tt) => {
      await eachVariant(tt, async (v) => {
        const page = await h.open('/consortium/', { ...v, ...opts });
        assert.equal(await loadState(page), screen);
        const retry = await has(page, aria('button', en['consortium.load.retry']), 500);
        const reload = await has(page, aria('button', en['consortium.load.reload']), 500);
        assert.deepEqual({ retry, reload }, { retry: button === 'retry', reload: button === 'reload' });
        assert.ok(await has(page, '::-p-aria([role="alert"])', 500), 'the screen is announced');
        // A wasm file that did not arrive is not "WebAssembly is turned off" (review L1).
        if (opts.wasmFile) assert.equal(await page.$eval('[data-load-error] p', (el) => el.textContent.trim()), en['consortium.load.toolFailed']);
      });
    });
  }
});
