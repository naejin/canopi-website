// The browser test harness (design check §7, A10; coordinator: puppeteer-core with the system Chrome,
// no browser download). It serves the built site with wrangler dev (./serve.mjs), drives one headless
// Chrome per run, and opens pages at 390 and 1280 px, light and dark, the theme stored before the
// first navigation. Chrome and wrangler are stopped in close(), by their own pids.
// Run under the memory cap: timeout 600 systemd-run --user --scope -q -p MemoryMax=3G
// -p MemorySwapMax=0 npm run test:browser
import { readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT, serve } from './serve.mjs';

export const CHROME = process.env.CANOPI_CHROME ?? '/usr/bin/google-chrome';
export const WIDTHS = [390, 1280];
export const THEMES = ['light', 'dark'];
export const VARIANTS = WIDTHS.flatMap((width) => THEMES.map((theme) => ({ width, theme })));
export const variantName = ({ width, theme }) => `${width}px ${theme}`;

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

// Broken copies of the fixture database for the §5 screens (BT-9).
export function brokenDatabase(kind, gz) {
  if (kind === 'corrupt') return Buffer.concat([gz.subarray(0, 64), Buffer.alloc(256, 0x5a), gz.subarray(320)]);
  if (kind === 'user-version') {
    const raw = Buffer.from(gunzipSync(gz));
    raw.writeUInt32BE(2, 60); // the SQLite header's user_version
    return gzipSync(raw);
  }
  throw new Error(`no broken database "${kind}"`);
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

  // A page in a fresh context (its own storage) at the given width and theme. Options:
  // - javaScript: false for the JS-off content (P6);
  // - data: 'real' (the installed export) or 'fixture' (the page's #ct-data rewritten to name the
  //   fixture database, which is served from memory); with database: 404 | 'corrupt' | 'user-version'
  //   for the failure screens;
  // - wasm: false removes WebAssembly before any script runs (Lockdown Mode, P5).
  async function open(path, { width = 1280, theme = 'light', javaScript = true, data = 'real', database = null, wasm = true } = {}) {
    const context = await browser.createBrowserContext();
    contexts.add(context);
    const page = await context.newPage();
    await page.setViewport({ width, height: width < 640 ? 844 : 900, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
    await page.setJavaScriptEnabled(javaScript);
    await page.evaluateOnNewDocument((t, keepWasm) => {
      try { localStorage.setItem('canopi-theme', t); } catch { /* storage blocked */ }
      if (!keepWasm) { try { delete globalThis.WebAssembly; } catch { /* locked */ } }
    }, theme, wasm);
    if (data === 'fixture' || database) {
      const fx = fixture();
      const fixtureUrl = `/data/consortium/${fx.file}`;
      const bytes = database === 404 ? null : database ? brokenDatabase(database, fx.gz) : fx.gz;
      await page.setRequestInterception(true);
      page.on('request', async (request) => {
        const url = new URL(request.url());
        if (request.isInterceptResolutionHandled()) return;
        if (url.pathname === fixtureUrl) {
          if (!bytes) return request.respond({ status: 404, contentType: 'text/plain', body: 'Not found' });
          return request.respond({ status: 200, contentType: 'application/gzip', body: bytes });
        }
        if (request.resourceType() === 'document' && url.origin === site.url && /\/consortium\/$/.test(url.pathname)) {
          const res = await fetch(url, { headers: { 'accept-language': 'en' } });
          const html = (await res.text()).replace(/(<script type="application\/json" id="ct-data">)([\s\S]*?)(<\/script>)/, (m, open, json, close) => {
            const d = JSON.parse(json);
            d.releaseId = fx.releaseId;
            d.climates = fx.climates;
            d.db = { url: fixtureUrl, sha256: '', bytes: fx.gz.length };
            d.images = {};
            return open + JSON.stringify(d).replace(/</g, '\\u003c') + close;
          });
          return request.respond({ status: res.status, contentType: 'text/html; charset=utf-8', body: html });
        }
        return request.continue();
      });
    }
    await page.goto(`${site.url}${path}`, { waitUntil: 'domcontentloaded' });
    return page;
  }

  async function close() {
    for (const c of contexts) await c.close().catch(() => {});
    const pid = browser.process()?.pid;
    await browser.close().catch(() => {});
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch { /* closed */ } }
    await site.stop();
  }

  return { url: site.url, browser, open, close };
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
