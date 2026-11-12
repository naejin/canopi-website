// The consortium page in a real browser: what commit 0 of P2 built (design check §3 probes P1–P3 and
// P6, the §5 load screens of BT-9). Every test runs and must pass (review C1;
// scripts/browser-tests.test.mjs enforces it). The streams' tests are consortium-s1…s4.browser.test.mjs.
// Headless Chrome through puppeteer-core on the built site served by wrangler dev. Never part of
// `npm test`; test:browser builds dist-test/ (npm run build:browser-test) first, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { countPlantsInPage, loadState } from './harness.mjs';
import { ROOT } from './serve.mjs';
import { aria, layoutVariants, behaviour, en, h, has, index, realDb, useHarness } from './helpers.mjs';
import { EXPECTED, NOMINATIM, SITES, lookupAt } from './location-fixtures.mjs';
import { atSite, choose, members, search, tool } from './p5-helpers.mjs';

useHarness();

test('P1: SQLite-WASM opens the real install in headless Chrome on wrangler dev, from the one hashed wasm @real-data', async () => {
  const wasm = readdirSync(join(ROOT, h.dir, 'client', '_astro')).filter((f) => f.endsWith('.wasm'));
  assert.equal(wasm.length, 1, `one wasm in the build: ${wasm.join(', ')}`);
  assert.match(wasm[0], /^sqlite3\.[\w-]{8}\.wasm$/);
  const page = await h.open('/consortium/');
  assert.equal(await loadState(page), 'ready');
  const { plants } = await countPlantsInPage(page);
  assert.equal(plants, await realDb((db) => db.prepare('SELECT count(*) n FROM plants').get().n));
  assert.equal(plants, 515, 'release r-01102782139409b5 holds 515 plants');
});

test('P2: the wasm is served as application/wasm, and hashed files and the database as immutable @real-data', async () => {
  const wasm = readdirSync(join(ROOT, h.dir, 'client', '_astro')).find((f) => f.endsWith('.wasm'));
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

test('P3: the database reaches the browser with its gzip magic and no content-encoding @real-data', async () => {
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

test('P6 / BT-9 JS-off: the title, lede, noscript guide link, release line and loading line are there @real-data', async (t) => {
  await behaviour(t, async (v) => {
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
  await layoutVariants(t, async (v) => {
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
test('R3-4, R4-4: a slow but steady download (10 KB/s, the wasm over a minute) loads', async () => {
  // Rescaled to the injected stall (A5): with no byte allowed to lag 1.5 s, a wasm that takes over
  // 10 s at 80 KB/s (879 KB) still loads: no overall cap, as at 10 KB/s against the production 15 s.
  const STALL = 1500;
  const t0 = Date.now();
  const page = await h.open('/consortium/', { width: 1280, data: 'fixture', timeouts: { stall: STALL }, setup: async (pg) => {
    const cdp = await pg.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 80_000, uploadThroughput: 80_000 });
  } });
  // The island itself arrives slowly too: the climate cards may take a while to show.
  await page.locator(aria('radio', 'Temperate')).setTimeout(60_000).click();
  assert.equal(await loadState(page, 60_000), 'ready', 'no failure screen while bytes keep arriving');
  assert.ok(Date.now() - t0 > 4 * STALL, `the download outlasted the stall timer several times over (${Date.now() - t0} ms)`);
  await page.browserContext().close();
});

for (const [what, opts, screen, button] of [
  ['the wasm', { wasmFile: 'stall' }, 'wasm-fetch', 'consortium.load.reload'],
  ['the database', { database: 'stall' }, 'fetch', 'consortium.load.retry'],
]) {
  test(`R4-4: a stalled download of ${what} (no byte for 15 s) gives the failure screen with its button`, async () => {
    // The stall timer injected at 1 s (A5) rather than waited out at 15 s.
    const page = await h.open('/consortium/', { width: 1280, data: 'fixture', timeouts: { stall: 1000 }, ...opts });
    assert.equal(await loadState(page, 10_000), screen);
    if (opts.wasmFile) assert.equal(await page.$eval('[data-load-error] p', (el) => el.textContent.trim()), en['consortium.load.toolFailed']);
    assert.ok(await has(page, aria('button', en[button]), 500));
    await page.browserContext().close();
  });
}

test('pre-push 3: the island chunk failing to load replaces the loading line with "the tool did not load" and Reload', async () => {
  const page = await h.open('/consortium/', { width: 1280, data: 'fixture', island: 404 });
  assert.ok(await page.waitForSelector('#ct-root [role="alert"]', { timeout: 8000 }).then(() => true, () => false), 'an alert in place of the loading line');
  assert.equal(await page.$eval('#ct-root [role="alert"] p', (el) => el.textContent.trim()), en['consortium.load.toolFailed']);
  assert.ok(await has(page, aria('button', en['consortium.load.reload']), 500));
  assert.equal(await page.$('#ct-root .status-line'), null, 'no loading line left');
  await page.browserContext().close();
});

test('BT-9 load: each failure gives its §5 screen and button', async (t) => {
  for (const [what, opts, screen, button] of SCREENS) {
    await t.test(what, async (tt) => {
      await behaviour(tt, async (v) => {
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

// ---- P5 commit 0: the harness and the fixtures (moved from consortium-p5, E1 design check A6) ----

// ---- commit 0: the harness and the fixtures (these run) ----

test('P5-0a (commit 0 fixtures): the reader on the built tiles answers each site as the specs expect', async () => {
  for (const [name, want] of Object.entries(EXPECTED)) {
    const l = await lookupAt(...SITES[name]);
    const p = l.climate?.periods[0];
    if ('climate' in want) assert.equal(l.climate, want.climate, name);
    if (want.koppen) assert.equal(p?.koppen, want.koppen, name);
    if (want.tmeanWarmC !== undefined) assert.equal(p?.tmeanWarmC, want.tmeanWarmC, name);
    if (want.distanceCells !== undefined) assert.equal(l.climate?.distanceCells, want.distanceCells, name);
    if ('soil' in want) assert.equal(l.soil, want.soil, name);
    if (want.ph !== undefined) assert.equal(l.soil?.phH2o, want.ph, name);
    assert.equal(l.regions.wgsrpdL3, want.l3, `${name} level 3`);
    assert.equal(l.regions.isoA2, want.iso, `${name} country`);
  }
});

test('P5-0b (commit 0 harness): geolocation granted, denied, unavailable and timeout reach the page as the browser reports them', async () => {
  const ask = (page) => page.evaluate(() => new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), (e) => resolve({ code: e.code }), { timeout: 800, maximumAge: 600_000, enableHighAccuracy: false })));
  const [lat, lon] = SITES.lyon;
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: { lat, lon } })), { lat, lon });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'denied' })), { code: 1 });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'unavailable' })), { code: 2 });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'timeout' })), { code: 3 });
});

test('P5-0c (commit 0 harness): Nominatim and OpenFreeMap are stubbed, WebGL can be off, climate tiles can fail, nothing else leaves the site', async () => {
  const page = await tool({ hook: false, nominatim: 'fixture', mapTiles: 'stub', webgl: false, climateTiles: 404 });
  const seen = await page.evaluate(async () => {
    const json = async (u) => (await fetch(u)).json();
    const status = async (u) => (await fetch(u)).status;
    const fails = async (u) => fetch(u).then(() => false, () => true);
    const tile = '/data/climate/stub/tiles/n50e000.tif';
    return {
      lyon: (await json('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=Lyon'))[0]?.name,
      none: await json('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=Nowhereville'),
      style: (await json('https://tiles.openfreemap.org/styles/positron')).version,
      tileStatus: await status('https://tiles.openfreemap.org/planet/20250101/0/0/0.pbf'),
      webgl: document.createElement('canvas').getContext('webgl2'),
      canvas2d: !!document.createElement('canvas').getContext('2d'),
      climateTile: await status(tile),
      elsewhere: await fails('https://example.org/'),
    };
  });
  assert.deepEqual(seen, { lyon: 'Lyon', none: [], style: 8, tileStatus: 204, webgl: null, canvas2d: true, climateTile: 404, elsewhere: true });
  assert.equal(page.nominatim.length, 2);
  assert.deepEqual(page.thirdParty, ['https://example.org/']);
  assert.ok(NOMINATIM.lyon[0].display_name.includes('France'));
  const offline = await tool({ hook: false, nominatim: 'offline', mapTiles: 'offline' });
  assert.deepEqual(await offline.evaluate(async () => [
    await fetch('https://nominatim.openstreetmap.org/search?q=Lyon').then(() => 'ok', () => 'failed'),
    await fetch('https://tiles.openfreemap.org/styles/positron').then(() => 'ok', () => 'failed'),
  ]), ['failed', 'failed']);
});

test('P5-0d (commit 0 seams): without a location, on a covered climate, no range, future or native mark shows, marks render only through PlantMarks, and nothing calls a third party before a click (S5b: its controls show, nothing fetched)', async () => {
  const page = await tool({ nominatim: 'fixture', mapTiles: 'stub' });
  assert.ok(await has(page, '[data-location-action="search"], [data-location-search]', 4000), 'S5b: the location controls show');
  assert.deepEqual(await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /maplibre|\/data\/climate\//.test(n))), [], 'no MapLibre and no climate tile before a click');
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await page.waitForFunction(() => document.querySelectorAll('[data-plant-id]').length > 0, { timeout: 10_000 }).then(() => true, () => false), 'members in the matrix');
  const marks = () => page.$$eval('[data-mark]', (els) => els.map((e) => ({ kind: e.getAttribute('data-mark'), surface: e.getAttribute('data-mark-surface') })));
  const promised = (list) => list.filter((m) => ['outside', 'edge', 'future', 'native'].includes(m.kind));
  assert.deepEqual(promised(await marks()), [], 'no range, future or native mark without a location');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.markProviders.value.length), 0, 'the providers do not even load without a location on a covered climate');
  // With a location the providers load; whatever marks they give carry a PlantMarks surface.
  await atSite(page, 'lyon');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.markProviders.value.length === 2, { timeout: 10_000 }).then(() => true, () => false), 'the providers (range and future; native returns with P5.2) load for a location');
  for (const m of await marks()) assert.ok(['chip', 'row', 'add', 'details'].includes(m.surface), `the ${m.kind} mark is drawn by PlantMarks on a surface`);
  assert.deepEqual(page.thirdParty, []);
  assert.deepEqual(page.nominatim, []);
});

// ---- E1: hang diagnosis and fail-fast (design check A10, failure rows F4, F5, F8) ----

// A fixture spec run as its own node --test process on its own port base (the harness moves up past
// this file's server); resolves its exit status and output.
async function runFixture(name, timeoutMs) {
  const { spawn } = await import('node:child_process');
  const args = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--test', '--experimental-test-isolation=none', `--test-timeout=${timeoutMs}`, '--test-force-exit', '--test-reporter=spec', join('scripts', 'browser', 'fixtures', name)];
  const port = Number(new URL(h.url).port) + 2;
  return new Promise((done) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, CANOPI_BROWSER_PORT: String(port), FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    child.on('close', (code) => done({ code, out }));
  });
}

test('E1 forced hang: a test that hangs fails at its timeout by name and leaves console, network and a screenshot', { timeout: 120_000 }, async () => {
  const dir = join(ROOT, 'test-results', 'browser', 'hang.spec', 'forced-hang-a-page-that-never-shows-what-the-test-waits-for');
  rmSync(dir, { recursive: true, force: true });
  const { code, out } = await runFixture('hang.spec.mjs', 8000);
  assert.notEqual(code, 0, 'the run fails');
  assert.match(out, /forced hang: a page that never shows what the test waits for/, 'the test is named');
  assert.match(out, /timed out after 8000ms/);
  for (const f of ['console.txt', 'network.txt', 'screenshot.png']) assert.ok(existsSync(join(dir, f)), `trace ${f}`);
  assert.match(readFileSync(join(dir, 'console.txt'), 'utf8'), /hang fixture: the page is up/, 'the page\'s console is in the trace');
  assert.ok(statSync(join(dir, 'screenshot.png')).size > 1000, 'a screenshot of the page');
});

test('E1 fail-fast: once wrangler or Chrome is gone, the next page fails at once, naming which', { timeout: 120_000 }, async () => {
  const { code, out } = await runFixture('fail-fast.spec.mjs', 30_000);
  assert.equal(code, 0, out);
  assert.match(out, /fail-fast wrangler: wrangler dev exited/);
  assert.match(out, /fail-fast chrome: .*Chrome exited/);
});
