// E6 stream R4's user paths (design check §4.1 L8, L9; A11), written failing in commit 0: marked
// expected-fail (scripts/expect-fail.mjs failing()) with the owner in the title; R4 removes each
// marker in the commit that makes it pass. Its own file so R4 and B4 (consortium-e6, E6-2) never edit
// one file in chunk 4 (scripts/plan/e6-owners.json). Run capped: npm run test:browser.
//
// The suggestion and the Swap list come from their own chunk (role `suggest`, core loadSuggest(); the
// core barrel does not re-export suggest.ts): Swap shows a loading line while it is missing, and a
// Suggest pressed before it arrives waits for it (state/suggest-wait.ts) and ends in a toast with
// Reload if it fails. ADR-6's seams (origin, factAt) are node tests: consortium-p5-seams-s5c,
// consortium-source and consortium-core.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { aria, en, fixtureDb, h, has, useHarness } from './helpers.mjs';
import { atSite } from './p5-helpers.mjs';

useHarness();

const DESKTOP = { width: 1280, theme: 'light' };
const LOADING = en['consortium.details.loading'];
const RELOAD = en['consortium.details.reload'];
const SUGGEST = en['consortium.start.suggest'];
const temperateIds = () => fixtureDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name").all().map((r) => String(r.id)));

// E6-6 (L8): the suggest chunk missing at the first Suggest press: a toast with Reload, Suggest not
// left busy, the reader's choices unchanged.
test('E6-6 (R4 seams): Suggest with its chunk missing shows a toast with Reload and is not left busy; the choices stay (L8)', async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: suggest() is still in the first run');
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 404 } });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  const before = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  await page.locator(aria('button', SUGGEST)).click();
  assert.ok(await has(page, aria('button', RELOAD), 8000), 'the toast offers Reload');
  const idle = await page.waitForFunction((name) => [...document.querySelectorAll('#ct-root button')].some((b) => b.textContent.trim() === name && b.getAttribute('aria-busy') !== 'true'), { timeout: 4000 }, SUGGEST).then(() => true, () => false);
  const after = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  assert.deepEqual(after, before, 'the reader\'s choices unchanged');
  await page.browserContext().close().catch(() => {});
  assert.ok(idle, 'Suggest is left busy (aria-busy) after the toast');
});

// Swap opened on six Temperate members, the dialog open. The members are set before the pool is
// read: Swap waits for both.
async function swapOpen(page) {
  const ids = await temperateIds();
  await page.evaluate((members) => {
    const { store } = window.__ctTest;
    store.climate.value = 'Temperate';
    void store.loadPool('Temperate');
    store.members.value = members;
    store.view.value = 'matrix';
    store.openSheet('swap', members[0]);
  }, ids.slice(0, 6));
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
}

// E6-7 (L9): Swap opened while the suggest chunk is held shows the loading line, then alternatives.
test('E6-7 (R4 seams): Swap opened while the suggest chunk is held shows a loading line, then the alternatives (L9)', async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: alternatives() is still in the first run');
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 'hold' } });
  assert.equal(await loadState(page), 'ready');
  await swapOpen(page);
  assert.ok(await has(page, 'dialog[open] [role="status"]', 2000), 'a loading line (status)');
  assert.match(await page.$eval('dialog[open] [role="status"]', (s) => s.textContent), new RegExp(LOADING.replace('…', '')));
  assert.equal(await page.evaluate(() => window.__ctTest.store.suggestRule.value), null, 'the chunk is held');
  await page.releaseHeld();
  await page.waitForFunction((loading) => { const d = document.querySelector('dialog[open]'); return !!d && !d.textContent.includes(loading) && d.querySelectorAll('.ct-swap li').length > 0; }, { timeout: 8000 }, LOADING);
  await page.browserContext().close().catch(() => {});
});

// ---- R4 fix round: the suggest chunk never holds the lists; every Suggest it fails ends in the toast ----

// The suggest chunk's responses, steered by the test (CDP Fetch at the response stage, after the
// harness let the request through): request n gets plan[n] (the last repeats): 404, 'pass', or 'hold'
// until answer(404 | 'pass').
const steer = (plan) => {
  const ctl = { requests: 0, held: [], answer: () => {} };
  ctl.setup = async (page) => {
    const urls = h.roles.suggest;
    const cdp = await page.createCDPSession();
    const reply = (requestId, how) => (how === 'pass'
      ? cdp.send('Fetch.continueRequest', { requestId })
      : cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 404, body: Buffer.from('Not found').toString('base64') })).catch(() => {});
    ctl.answer = (how) => { for (const id of ctl.held.splice(0)) void reply(id, how); };
    await cdp.send('Fetch.enable', { patterns: urls.map((u) => ({ urlPattern: `*${u}`, requestStage: 'Response' })) });
    cdp.on('Fetch.requestPaused', ({ requestId, request }) => {
      if (!urls.includes(new URL(request.url).pathname)) return void reply(requestId, 'pass');
      const how = plan[Math.min(ctl.requests++, plan.length - 1)];
      if (how === 'hold') ctl.held.push(requestId);
      else void reply(requestId, how);
    });
  };
  return ctl;
};
const until = (page, fn, timeout, ...args) => page.waitForFunction(fn, { timeout }, ...args).then(() => true, () => false);
const suggestBusy = (page) => page.evaluate((name) => [...document.querySelectorAll('#ct-root button')].some((b) => b.textContent.trim() === name && b.getAttribute('aria-busy') === 'true'), SUGGEST);
const toastIdle = async (page) => ({
  reload: await has(page, aria('button', RELOAD), 8000),
  idle: await until(page, (name) => [...document.querySelectorAll('#ct-root button')].some((b) => b.textContent.trim() === name && b.getAttribute('aria-busy') !== 'true'), 4000, SUGGEST),
});
async function temperatePage(opts) {
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, ...opts });
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('radio', 'Temperate')).click();
  return page;
}

// Every toast the page shows from now on (store.toast's new lines, by id): showToast replaces the
// line, so a count of Reload buttons cannot see a second toast.
async function toastLog(page) {
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const from = store.toast.peek()?.id ?? 0;
    window.__ctToasts = [];
    store.toast.subscribe((t) => { if (t && t.id > from && !window.__ctToasts.some((x) => x.id === t.id)) window.__ctToasts.push({ id: t.id, text: t.text }); });
  });
  return () => page.evaluate(() => window.__ctToasts.map((t) => t.text));
}
const FAILED = en['consortium.details.loadFailed'];

// R4 re-review (low), done in the chunk-5 exit: every Suggest wait ends with a suggestion or one
// toast, even when the suggest chunk's request never settles (capped() used to keep that wait). A
// chunk that then arrives runs no suggestion, and takes down its "did not load" toast (fix round, 8).
test('E6-16 (R4 re-review, chunk-5 exit): a suggest chunk that never answers ends Suggest\'s wait at the cap with one toast and Reload; its late arrival removes that toast', async () => {
  // A 1.5 s cap (the test build's __ctTimeouts.suggest) for production's 10 s.
  const cap = { suggest: 1500 };
  const page = await temperatePage({ block: { suggest: 'hold' }, timeouts: cap });
  const store = (expr) => page.evaluate(`window.__ctTest.store.${expr}`);
  try {
    assert.ok(await until(page, () => window.__ctTest.store.pool.value !== null, 5000), 'Temperate read, its suggest chunk held');
    const toasts = await toastLog(page);
    await page.locator(aria('button', SUGGEST)).click();
    const waiting = await suggestBusy(page);
    const ended = await toastIdle(page);
    assert.deepEqual({ waiting, ...ended }, { waiting: true, reload: true, idle: true }, 'waits, then the toast with Reload, Suggest idle');
    await page.releaseHeld();
    assert.ok(await until(page, () => window.__ctTest.store.suggestRule.value !== null, 5000), 'the held chunk arrives');
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual({ members: await store('members.value.length'), toasts: await toasts(), showing: await store('toast.value?.text ?? null') }, { members: 0, toasts: [FAILED], showing: null },
      'the late chunk runs no suggestion the reader stopped waiting for, shows no second toast, and its "did not load" toast goes');
  } finally { await page.browserContext().close().catch(() => {}); }
});

// ... and only that toast: one the reader's later action showed stays.
test('E6-16b (R4 re-review, chunk-5 exit fix round): the late suggest chunk leaves a newer toast up', async () => {
  const page = await temperatePage({ block: { suggest: 'hold' }, timeouts: { suggest: 1500 } });
  try {
    assert.ok(await until(page, () => window.__ctTest.store.pool.value !== null, 5000));
    await page.locator(aria('button', SUGGEST)).click();
    assert.deepEqual(await toastIdle(page), { reload: true, idle: true });
    await page.evaluate(() => window.__ctTest.store.showToast('a newer line'));
    await page.releaseHeld();
    assert.ok(await until(page, () => window.__ctTest.store.suggestRule.value !== null, 5000), 'the held chunk arrives');
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await page.evaluate(() => window.__ctTest.store.toast.value?.text ?? null), 'a newer line', 'the newer toast stays');
  } finally { await page.browserContext().close().catch(() => {}); }
});

// suggest-wait.ts capped(): at the cap with the suggest chunk missing and the plant list still being
// read (the range rule held: no pool), the wait goes on for another cap, with no toast, and suggests
// once both arrive.
test('E6-18 (R4 seams, chunk-5 exit fix round): at the cap with the list still unread and the suggest chunk held, Suggest waits again, then suggests', async () => {
  const page = await temperatePage({ block: { range: 'hold', suggest: 'hold' }, timeouts: { suggest: 400 } });
  try {
    assert.ok(await until(page, () => !!window.__ctTest.store.pool.value, 5000), 'Temperate read without the range rule');
    await atSite(page, 'lyon');
    assert.ok(await until(page, () => window.__ctTest.store.pool.value === null, 5000), 'no pool: the range rule is held');
    const toasts = await toastLog(page);
    await page.locator(aria('button', SUGGEST)).click();
    await new Promise((r) => setTimeout(r, 1000)); // two and a half caps
    assert.deepEqual({ busy: await suggestBusy(page), pending: await page.evaluate(() => window.__ctTest.store.suggestRule.value === null && window.__ctTest.store.pool.value === null), toasts: await toasts() },
      { busy: true, pending: true, toasts: [] }, 'past two caps: still waiting, no toast');
    await page.releaseHeld();
    assert.ok(await until(page, () => window.__ctTest.store.members.value.length > 0, 8000), 'suggests once the list and the chunk arrive');
    assert.deepEqual(await toasts(), [], 'no toast on the way');
  } finally { await page.browserContext().close().catch(() => {}); }
});

test('E6-12 (R4 seams): the plant list is stored while the suggest chunk is held; a Suggest pressed meanwhile waits, then suggests (A11)', async () => {
  const page = await temperatePage({ block: { suggest: 'hold' } });
  try {
    assert.ok(await until(page, () => !!window.__ctTest.store.pool.value, 5000), 'the Temperate list is stored without the suggest chunk');
    assert.equal(await page.evaluate(() => window.__ctTest.store.suggestRule.value), null, 'the chunk is held');
    await page.locator(aria('button', SUGGEST)).click();
    assert.ok(await suggestBusy(page), 'Suggest waits (aria-busy)');
    await page.releaseHeld();
    assert.ok(await until(page, () => window.__ctTest.store.members.value.length > 0, 8000), 'the suggestion runs once the chunk arrives');
  } finally { await page.browserContext().close().catch(() => {}); }
});

// The store keeps no failed load (core loadSuggest clears its promise), so the press imports again.
// Chrome keeps a failed module in its module map and answers the second import from it without a
// request, so on today's Chrome the press ends in the toast; a browser that fetches again suggests.
test('E6-13 (R4 seams): a Suggest press after the chunk failed tries it again: a suggestion, or the toast with Reload', async () => {
  const ctl = steer([404, 'pass']);
  const page = await temperatePage({ setup: ctl.setup });
  const tries = [];
  page.on('console', (m) => { if (m.text().includes('the suggestion did not load')) tries.push(m.text()); });
  try {
    assert.ok(await until(page, () => window.__ctTest.store.suggestFailed.value && !!window.__ctTest.store.pool.value, 8000), 'the load at open failed');
    const failedAtOpen = tries.length;
    await page.locator(aria('button', SUGGEST)).click();
    const suggested = await until(page, () => window.__ctTest.store.members.value.length > 0, 3000);
    if (!suggested) assert.deepEqual(await toastIdle(page), { reload: true, idle: true });
    assert.equal(tries.length - failedAtOpen + (suggested ? 1 : 0), 1, `the press imported again (${ctl.requests} requests, ${tries.length} failures)`);
  } finally { await page.browserContext().close().catch(() => {}); }
});

test('E6-14 (R4 seams): Suggest pressed with the chunk failed while the range rule loads (no pool) ends in the toast with Reload, never silence', async () => {
  const page = await temperatePage({ block: { range: 'hold', suggest: 404 } });
  try {
    assert.ok(await until(page, () => !!window.__ctTest.store.pool.value, 5000));
    await atSite(page, 'lyon');
    assert.ok(await until(page, () => window.__ctTest.store.pool.value === null && window.__ctTest.store.suggestFailed.value, 5000), 'no pool (the rule held), the chunk failed');
    await page.locator(aria('button', SUGGEST)).click();
    assert.deepEqual(await toastIdle(page), { reload: true, idle: true });
  } finally { await page.browserContext().close().catch(() => {}); }
});

test('E6-15 (R4 seams): a Suggest waiting for the chunk ends in the toast with Reload when the chunk fails after the lists were stored', async () => {
  const ctl = steer(['hold']);
  const page = await temperatePage({ setup: ctl.setup });
  try {
    assert.ok(await until(page, () => !!window.__ctTest.store.pool.value, 5000), 'the list stored without the chunk');
    // The chunk's response reaches CDP's response stage on its own clock: under load, after the list.
    for (const end = Date.now() + 5000; !ctl.held.length && Date.now() < end;) await new Promise((r) => setTimeout(r, 50));
    assert.equal(ctl.held.length, 1, 'the chunk held');
    await page.locator(aria('button', SUGGEST)).click();
    assert.ok(await suggestBusy(page), 'Suggest waits (aria-busy)');
    ctl.answer(404);
    assert.deepEqual(await toastIdle(page), { reload: true, idle: true });
  } finally { await page.browserContext().close().catch(() => {}); }
});

// ---- E6 hand-off B: every Swap wait for the suggest chunk ends (regression vs live) ----

// The failed line other sheets' parts show (views/lazy.tsx LoadFailed): an alert with Reload, in the dialog.
const swapFailed = (page, timeout) => until(page, (failed, reload) => {
  const a = document.querySelector('dialog[open] [role="alert"]');
  return !!a && a.textContent.includes(failed) && [...a.querySelectorAll('button')].some((b) => b.textContent.trim() === reload);
}, timeout, FAILED, RELOAD);

test('E6-22 (R4 hand-off B): Swap opened while the suggest chunk never answers ends its wait at the cap with the failed line and Reload, then shows the alternatives if the chunk comes', async () => {
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 'hold' }, timeouts: { suggest: 1500 } });
  try {
    assert.equal(await loadState(page), 'ready');
    await swapOpen(page);
    assert.ok(await has(page, 'dialog[open] [role="status"]', 1000), 'the loading line first');
    assert.ok(await swapFailed(page, 6000), 'the wait ends at the cap with the failed line and Reload');
    await page.releaseHeld();
    assert.ok(await until(page, () => (document.querySelector('dialog[open]')?.querySelectorAll('.ct-swap li').length ?? 0) > 0, 8000), 'the late chunk brings the alternatives');
  } finally { await page.browserContext().close().catch(() => {}); }
});

test('E6-23 (R4 hand-off B): Swap opened after the suggest chunk failed asks for it again and, failed again, shows the failed line with Reload', async () => {
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 404 } });
  try {
    assert.equal(await loadState(page), 'ready');
    assert.ok(await until(page, () => window.__ctTest.store.suggestFailed.value, 8000), 'the load at open failed');
    // A retry (store.wantSuggest) clears suggestFailed while it runs.
    await page.evaluate(() => { window.__ctRetried = false; window.__ctTest.store.suggestFailed.subscribe((v) => { if (!v) window.__ctRetried = true; }); window.__ctRetried = false; });
    await swapOpen(page);
    assert.ok(await swapFailed(page, 6000), 'the failed line with Reload');
    assert.equal(await page.evaluate(() => window.__ctRetried), true, 'opening Swap asked for the chunk again');
  } finally { await page.browserContext().close().catch(() => {}); }
});

// Hand-off review 3: Swap opened with the chunk already failed says "did not load" once per opening
// (its first render does not show the old failure before asking again).
test('E6-28 (R4 hand-off review 3): Swap opened after the suggest chunk failed announces the failed line once', async () => {
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 404 } });
  try {
    assert.equal(await loadState(page), 'ready');
    assert.ok(await until(page, () => window.__ctTest.store.suggestFailed.value, 8000), 'the load at open failed');
    await page.evaluate(() => {
      window.__ctAlerts = 0;
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('[role="alert"]') || n.querySelector('[role="alert"]'))) window.__ctAlerts += 1; })
        .observe(document.body, { childList: true, subtree: true });
    });
    await swapOpen(page);
    assert.ok(await swapFailed(page, 6000), 'the failed line with Reload');
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(await page.evaluate(() => window.__ctAlerts), 1, 'one alert inserted');
  } finally { await page.browserContext().close().catch(() => {}); }
});
