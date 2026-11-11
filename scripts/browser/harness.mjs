// The browser test harness (design check §7, A10; coordinator: puppeteer-core with the system Chrome,
// no browser download). It serves the built site with wrangler dev (./serve.mjs), drives one headless
// Chrome per run, and opens pages at 390 and 1280 px, light and dark, the theme stored before the
// first navigation. Chrome and wrangler are stopped in close(), by their own pids.
// Run under the memory cap: timeout 600 systemd-run --user --scope -q -p MemoryMax=3G
// -p MemorySwapMax=0 npm run test:browser
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT, serve } from './serve.mjs';

export const CHROME = process.env.CANOPI_CHROME ?? '/usr/bin/google-chrome';
export const WIDTHS = [390, 1280];
export const THEMES = ['light', 'dark'];
export const VARIANTS = WIDTHS.flatMap((width) => THEMES.map((theme) => ({ width, theme })));
export const variantName = ({ width, theme }) => `${width}px ${theme}`;

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

// The invented fixture (scripts/fixtures/consortium-v2/export/): its database and what the page
// must be told about it.
const FIXTURE_DIR = join(ROOT, 'scripts', 'fixtures', 'consortium-v2', 'export');
export function fixture() {
  const manifest = JSON.parse(readFileSync(join(FIXTURE_DIR, 'manifest.json'), 'utf8'));
  const entry = manifest.files[0];
  return {
    releaseId: manifest.release_id,
    climates: manifest.climates.map((c) => c.climate_zone.toLowerCase()),
    file: entry.file,
    gz: readFileSync(join(FIXTURE_DIR, entry.file)),
  };
}

// The fixture's plants with a photo row (6), read with node:sqlite: the {uuid: path} map the page
// gets with `photos: true`, each path answered by the harness with a small PNG.
export const FIXTURE_PHOTO_PREFIX = '/__fixture-photo/';
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
let photoMap = null;
export async function fixturePhotos() {
  if (photoMap) return photoMap;
  const { DatabaseSync } = await import('node:sqlite');
  const dir = mkdtempSync(join(tmpdir(), 'consortium-fixture-'));
  try {
    const path = join(dir, 'db.sqlite');
    writeFileSync(path, gunzipSync(fixture().gz));
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      const rows = db.prepare('SELECT DISTINCT p.id FROM plants p JOIN plant_images i ON i.plant = p.plant ORDER BY p.id').all();
      photoMap = Object.fromEntries(rows.map(({ id }) => [id, `${FIXTURE_PHOTO_PREFIX}${id}.png`]));
    } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return photoMap;
}

// The database bytes served for a variant, and the reference the page is told (its digests are those
// of the served bytes, so each broken copy fails where it is meant to, not at the digest):
// - 'corrupt': bytes overwritten inside the gzip stream (does not inflate: damaged);
// - 'user-version': a valid database with user_version 2 (schema);
// - 'digest': the right bytes under a wrong sha256 (damaged);
// - 'empty': an empty 200 body (damaged);
// - 'stall': no response ever comes (a stalled connection: fetch, after the stall timer).
export function servedDatabase(kind, fx) {
  let gz = fx.gz, raw = gunzipSync(fx.gz), wrongSha = false;
  if (kind === 'corrupt') gz = Buffer.concat([gz.subarray(0, 64), Buffer.alloc(256, 0x5a), gz.subarray(320)]);
  else if (kind === 'user-version') { raw = Buffer.from(raw); raw.writeUInt32BE(2, 60); gz = gzipSync(raw); }
  else if (kind === 'digest') wrongSha = true;
  else if (kind === 'empty' || kind === 'stall') gz = kind === 'empty' ? Buffer.alloc(0) : gz;
  else if (kind) throw new Error(`no database variant "${kind}"`);
  return { bytes: gz, ref: { sha256: wrongSha ? sha256(raw) : sha256(gz), bytes: gz.length, rawSha256: sha256(raw), rawBytes: raw.length } };
}

export async function startHarness({ log = () => {} } = {}) {
  const site = await serve({ log });
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--mute-audio'],
    });
  } catch (err) {
    await site.stop();
    throw err;
  }
  const contexts = new Set();
  // Chrome with its real cookie block (profile.default_content_setting_values.cookies = 2: site data
  // refused, localStorage and sessionStorage throw SecurityError), launched on first use (H1/W1).
  let blocked = null;
  const blockedBrowser = async () => {
    if (blocked) return blocked;
    const dir = mkdtempSync(join(tmpdir(), 'consortium-cookieblock-'));
    mkdirSync(join(dir, 'Default'));
    writeFileSync(join(dir, 'Default', 'Preferences'), JSON.stringify({ profile: { default_content_setting_values: { cookies: 2 } } }));
    const b = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: dir, args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--mute-audio'] });
    blocked = { browser: b, dir, session: await b.target().createCDPSession() };
    return blocked;
  };
  const downloadRoot = mkdtempSync(join(tmpdir(), 'consortium-downloads-'));
  const browserSession = await browser.target().createCDPSession();

  // A page in a fresh context (its own storage) at the given width and theme. Options:
  // - javaScript: false for the JS-off content (P6);
  // - data: 'real' (the installed export) or 'fixture' (the page's #ct-data rewritten to name the
  //   fixture database, served from memory); database: 404 | 'corrupt' | 'user-version' | 'digest' |
  //   'empty' for the failure screens (with the fixture);
  // - photos: true gives the fixture's 6 photo plants a self-served PNG (BT-5);
  // - wasm: false removes WebAssembly before any script runs (Lockdown Mode, P5);
  // - loader: 404 | 'offline' fails the island's loader chunk (a deploy; offline, navigator.onLine false);
  // - wasmFile: 403 | 'offline' | 'stall' fails the fetch of sqlite3.<hash>.wasm (a proxy refusing it;
  //   offline; never answered, a stalled connection);
  // - storage: false makes localStorage and sessionStorage throw (BT-7's note); the theme then comes
  //   from prefers-color-scheme, which is always emulated as well; storage: 'cookies-blocked' opens
  //   the page in a Chrome whose profile blocks site data (the real setting, not a stub);
  // - correction: 'ok' | 'offline' | status number stubs POST /api/correction; page.correctionPosts
  //   holds each request body (BT-5).
  // page.capturedDownloads() lists the files this page downloaded (BT-9 .canopi), via the CDP
  // download events; pdf(page) prints it to PDF (BT-8).
  async function open(path, { width = 1280, theme = 'light', javaScript = true, data = 'real', database = null, photos = false, wasm = true, loader = null, wasmFile = null, storage = true, correction = null } = {}) {
    const real = storage === 'cookies-blocked' ? await blockedBrowser() : null;
    // The blocked profile's setting applies to its default context (an incognito context of it
    // starts from defaults), so that page is opened there.
    const context = real ? real.browser.defaultBrowserContext() : await browser.createBrowserContext();
    if (!real) contexts.add(context);
    const page = await context.newPage();
    // Short waits: a missing control fails in seconds rather than at the test's timeout.
    page.setDefaultTimeout(4000);
    page.setDefaultNavigationTimeout(20_000);
    await page.setViewport({ width, height: width < 640 ? 844 : 900, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setJavaScriptEnabled(javaScript);
    await page.evaluateOnNewDocument((t, keepWasm, online, keepStorage) => {
      try { localStorage.setItem('canopi-theme', t); } catch { /* storage blocked */ }
      if (!keepWasm) { try { delete globalThis.WebAssembly; } catch { /* locked */ } }
      if (!online) Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true });
      if (!keepStorage) {
        for (const name of ['localStorage', 'sessionStorage']) {
          Object.defineProperty(window, name, { get() { throw new DOMException('The operation is insecure.', 'SecurityError'); }, configurable: true });
        }
      }
    }, theme, wasm, loader !== 'offline', storage !== false);

    const dir = join(downloadRoot, real ? `blocked-${Date.now()}` : String(contexts.size));
    if (!real) await browserSession.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, browserContextId: context.id, eventsEnabled: true });
    page.capturedDownloads = () => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.endsWith('.crdownload')).map((f) => ({ name: f, bytes: readFileSync(join(dir, f)) })) : []);
    page.correctionPosts = [];

    const useFixture = data === 'fixture' || database !== null || photos;
    const fx = useFixture ? fixture() : null;
    const served = useFixture && database !== 404 ? servedDatabase(database, fx) : null;
    const images = photos ? await fixturePhotos() : {};
    if (useFixture || loader || wasmFile || correction) {
      await page.setRequestInterception(true);
      page.on('request', async (request) => {
        if (request.isInterceptResolutionHandled()) return;
        const url = new URL(request.url());
        if (fx && url.pathname === `/data/consortium/${fx.file}`) {
          if (!served) return request.respond({ status: 404, contentType: 'text/plain', body: 'Not found' });
          if (database === 'stall') return; // never answered: the page's stall timer must end it
          return request.respond({ status: 200, contentType: 'application/gzip', body: served.bytes });
        }
        if (photos && url.pathname.startsWith(FIXTURE_PHOTO_PREFIX)) return request.respond({ status: 200, contentType: 'image/png', body: PNG_1PX });
        if (loader && /^\/_astro\/load\.[\w-]+\.js$/.test(url.pathname)) {
          return loader === 'offline' ? request.abort('internetdisconnected') : request.respond({ status: 404, contentType: 'text/plain', body: 'Not found' });
        }
        if (wasmFile && /\/sqlite3\.[\w-]+\.wasm$/.test(url.pathname)) {
          if (wasmFile === 'stall') return; // never answered: the page's stall timer must end it
          return wasmFile === 'offline' ? request.abort('internetdisconnected') : request.respond({ status: Number(wasmFile), contentType: 'text/plain', body: 'Forbidden' });
        }
        if (correction && url.pathname === '/api/correction' && request.method() === 'POST') {
          page.correctionPosts.push(request.postData() ?? '');
          if (correction === 'offline') return request.abort('internetdisconnected');
          const status = correction === 'ok' ? 200 : Number(correction);
          return request.respond({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { ok: true } : { ok: false, code: 'server' }) });
        }
        if (fx && request.resourceType() === 'document' && url.origin === site.url && /\/consortium\/$/.test(url.pathname)) {
          const res = await fetch(url, { headers: { 'accept-language': 'en' } });
          const html = (await res.text()).replace(/(<script type="application\/json" id="ct-data">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
            const d = JSON.parse(json);
            d.releaseId = fx.releaseId;
            d.climates = fx.climates;
            d.db = { url: `/data/consortium/${fx.file}`, ...(served?.ref ?? servedDatabase(null, fx).ref) };
            d.images = images;
            return start + JSON.stringify(d).replace(/</g, '\\u003c') + end;
          });
          return request.respond({ status: res.status, contentType: 'text/html; charset=utf-8', body: html });
        }
        return request.continue();
      });
    }
    await page.goto(`${site.url}${path}`, { waitUntil: 'domcontentloaded' });
    return page;
  }

  // The page printed to PDF (A4, backgrounds on), for BT-8; print media is also emulated so the
  // accessibility tree can be read as printed.
  async function pdf(page) {
    await page.emulateMediaType('print');
    return page.pdf({ format: 'A4', printBackground: true });
  }

  async function close() {
    for (const c of contexts) await c.close().catch(() => {});
    const pid = browser.process()?.pid;
    await browser.close().catch(() => {});
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch { /* closed */ } }
    if (blocked) {
      const bpid = blocked.browser.process()?.pid;
      await blocked.browser.close().catch(() => {});
      if (bpid) { try { process.kill(bpid, 'SIGKILL'); } catch { /* closed */ } }
      rmSync(blocked.dir, { recursive: true, force: true });
    }
    await site.stop();
    rmSync(downloadRoot, { recursive: true, force: true });
  }

  return { url: site.url, browser, open, pdf, close };
}

// The island's load state as the page shows it: 'ready' once the loading line is gone without a
// failure screen, else the failure's name, or 'loading' after the timeout.
export async function loadState(page, timeout = 20_000) {
  await page.waitForFunction(() => {
    const root = document.getElementById('ct-root');
    if (!root) return true;
    return !!root.querySelector('[data-load-error]') || (!root.hasAttribute('aria-busy') && !root.querySelector('[aria-busy="true"]'));
  }, { timeout }).catch(() => {});
  return page.evaluate(() => {
    const root = document.getElementById('ct-root');
    const failed = root?.querySelector('[data-load-error]');
    if (failed) return failed.getAttribute('data-load-error');
    return root && !root.hasAttribute('aria-busy') && !root.querySelector('[aria-busy="true"]') ? 'ready' : 'loading';
  });
}

// Probe P1: in the page, the loader chunk the island already imported (the same module), opens the
// database again and counts its plants with SQLite-WASM.
export async function countPlantsInPage(page) {
  return page.evaluate(async () => {
    const chunk = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/_astro\/load\.[\w-]+\.js$/.test(n));
    if (!chunk) throw new Error('the loader chunk was not loaded');
    const data = JSON.parse(document.getElementById('ct-data').textContent);
    const mod = await import(chunk);
    const zone = (c) => c.charAt(0).toUpperCase() + c.slice(1);
    const { db } = await mod.openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map(zone) });
    try { return { plants: db.selectValue('SELECT count(*) FROM plants'), chunk }; } finally { db.close(); }
  });
}
