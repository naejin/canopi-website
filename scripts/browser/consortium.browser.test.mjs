// The consortium page in a real browser (design check §7): headless Chrome through puppeteer-core on
// the built site served by wrangler dev. Never part of `npm test`; run after `npm run build`, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
// "commit 0" tests hold what the hand-off commit built (probes P1–P3, P6, the load screens). BT-1…BT-9
// are the executable spec of §7, todo until their owner stream builds them: the name says who.
// Assertions read the accessibility tree (aria selectors) where the spec speaks of it.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { countPlantsInPage, loadState, startHarness, VARIANTS, variantName } from './harness.mjs';
import { ROOT } from './serve.mjs';

const index = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'consortium-index.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'translations', 'en.json'), 'utf8'));
let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

// The plants of the installed database, counted by node:sqlite: the oracle for P1.
async function installedPlants() {
  const { DatabaseSync } = await import('node:sqlite');
  const dir = mkdtempSync(join(tmpdir(), 'consortium-browser-'));
  try {
    const path = join(dir, 'db.sqlite');
    writeFileSync(path, gunzipSync(readFileSync(join(ROOT, 'public', index.files[0].url))));
    const db = new DatabaseSync(path, { readOnly: true });
    try { return db.prepare('SELECT count(*) n FROM plants').get().n; } finally { db.close(); }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Each variant of §7 (390/1280 px, light/dark) as a subtest.
const eachVariant = async (t, fn) => { for (const v of VARIANTS) await t.test(variantName(v), () => fn(v)); };
const has = async (page, selector, timeout = 2500) => !!(await page.waitForSelector(selector, { timeout }).catch(() => null));

// ---- commit 0 ----

test('commit 0 · P1: SQLite-WASM opens the real install in headless Chrome on wrangler dev, from the one hashed wasm', async () => {
  const wasm = readdirSync(join(ROOT, 'dist', 'client', '_astro')).filter((f) => f.endsWith('.wasm'));
  assert.equal(wasm.length, 1, `one wasm in the build: ${wasm.join(', ')}`);
  assert.match(wasm[0], /^sqlite3\.[\w-]{8}\.wasm$/);
  const page = await h.open('/consortium/');
  assert.equal(await loadState(page), 'ready');
  const { plants } = await countPlantsInPage(page);
  assert.equal(plants, await installedPlants());
  assert.equal(plants, 515, 'release r-2c6bdf65c35caca3 holds 515 plants');
});

test('commit 0 · P2: the wasm is served as application/wasm, and hashed files and the database as immutable', async () => {
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

test('commit 0 · P3: the database reaches the browser with its gzip magic and no content-encoding', async () => {
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

test('commit 0 · P6: with JavaScript off, the title, lede, noscript guide link and release line are there', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, javaScript: false });
    const shell = await page.evaluate(() => ({
      title: document.querySelector('h1.tool-title')?.textContent,
      lede: document.querySelector('.tool-lede')?.textContent?.trim().length ?? 0,
      guide: document.querySelector('noscript') ? true : false,
      release: document.querySelector('.tool-release')?.textContent,
      loading: document.querySelector('#ct-root .status-line')?.textContent,
    }));
    assert.equal(shell.title, en['consortium.title']);
    assert.ok(shell.lede > 20);
    assert.equal(shell.release, en['consortium.release'].replace('{id}', index.release_id));
    assert.equal(shell.loading, en['consortium.loadingTool']);
    // With JS off Chrome renders <noscript> content: the guide link is in the accessibility tree.
    assert.ok(await has(page, `::-p-aria(${en['consortium.noscript.link']})`), 'the noscript guide link');
  });
});

test('commit 0 · the island mounts with JavaScript on, the head does not move, and the fixture opens', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    const before = await page.evaluate(() => document.querySelector('.tool-head').getBoundingClientRect().height);
    assert.equal(await loadState(page), 'ready');
    const after = await page.evaluate(() => document.querySelector('.tool-head').getBoundingClientRect().height);
    assert.equal(after, before, 'no shift of the static head on mount');
  });
});

// ---- BT-1…BT-9 (design check §7), todo until built ----

test('BT-1 (S4 start; S1 data half): nothing chosen at start, country line above the cards, Temperate crops (real), Suggest gives the captioned matrix, Arid asks', { todo: 'S4 + S1' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', v);
    assert.ok(await has(page, '::-p-aria([role="radio"][checked="false"])'), 'climate choices, none chosen');
    assert.ok(await has(page, '::-p-aria(Onion)') && await has(page, '::-p-aria(European chestnut)'), 'Temperate crop examples (real)');
    assert.ok(await has(page, '::-p-aria(Suggest plants)'));
  });
});

test('BT-2 (S2 matrix): real Temperate gaps, Room Small misfits with "Show them anyway", one Tab stop per plant, phone cells ≥ 40 px and a named stepper', { todo: 'S2' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/?plant=Castanea+sativa&climate=temperate', v);
    assert.ok(await has(page, '::-p-aria(No plant in the list for this cell yet)'));
    assert.ok(await has(page, '::-p-aria(Show them anyway)'));
  });
});

test('BT-3 (S2 side view): the chosen stage, a drawing with role=img and names, the key opens details, "Layer is light, not height"', { todo: 'S2' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    assert.ok(await has(page, '::-p-aria([role="img"])'));
    assert.ok(await has(page, '::-p-aria(Layer is light, not height)'));
  });
});

test('BT-4 (S2 jobs and list): a 6-row Jobs table whose gaps name their stages; 120 plants listed once each under their start cell; the warning filter', { todo: 'S2' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    assert.ok(await has(page, '::-p-aria(Jobs)'));
    assert.ok(await has(page, '::-p-aria(With a warning)'));
  });
});

test('BT-5 (S3 details): a chip opens a focused dialog with photo credit, placement, warnings, estimates, sources and the correction form; Escape returns focus', { todo: 'S3' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    assert.ok(await has(page, '::-p-aria([role="dialog"])'));
    assert.ok(await has(page, '::-p-aria(Placed for the Temperate climate)'));
  });
});

test('BT-6 (S3 adjust): Swap shows "Also fills…", a high conflict asks, Remove then Undo, Keep pins, "Add 2 plants", Paste offers Add anyway', { todo: 'S3' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    assert.ok(await has(page, '::-p-aria(Swap)'));
    assert.ok(await has(page, '::-p-aria(Add 2 plants)'));
  });
});

test('BT-7 (S4 share): a copied link restores members, kept, site and stage in a new document; unknown token notice; reload restores; storage-blocked note', { todo: 'S4' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    assert.ok(await has(page, '::-p-aria(Share)'));
  });
});

test('BT-8 (S4 print): ≤ 20 plants print the drawing and the table, > 20 "At a glance" and the table, no controls printed', { todo: 'S4' }, async () => {
  const page = await h.open('/consortium/', { data: 'fixture' });
  await page.emulateMediaType('print');
  assert.ok(await has(page, '::-p-aria(At a glance)'));
});

test('BT-9 (S4 download, S1 load): the .canopi file validates; DB 404, corrupt bytes, wrong user_version and WebAssembly off give their §5 screens; JS-off content', { todo: 'S4 (.canopi) + S1' }, async (t) => {
  // The failure screens exist since commit 0 (data/load.ts, App.tsx); the .canopi part waits for S4.
  for (const [opts, screen] of [[{ database: 404 }, 'stale'], [{ database: 'corrupt' }, 'damaged'], [{ database: 'user-version' }, 'schema'], [{ data: 'fixture', wasm: false }, 'wasm-blocked']]) {
    await t.test(screen, async () => {
      const page = await h.open('/consortium/', opts);
      assert.equal(await loadState(page), screen);
    });
  }
  await t.test('.canopi validates against the app schema', async () => {
    const page = await h.open('/consortium/', { data: 'fixture' });
    assert.ok(await has(page, '::-p-aria(Download for Canopi)'));
  });
});
