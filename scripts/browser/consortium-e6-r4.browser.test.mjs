// E6 stream R4's user paths (design check §4.1 L8, L9; A11), written failing in commit 0: marked
// expected-fail (scripts/expect-fail.mjs failing()) with the owner in the title; R4 removes each
// marker in the commit that makes it pass. Its own file so R4 and B4 (consortium-e6, E6-2) never edit
// one file in chunk 4 (scripts/plan/e6-owners.json). Run capped: npm run test:browser.
//
// Files each pass needs: src/lib/consortium/{suggest,index}.ts (the barrel stops re-exporting
// suggest/alternatives), a core loadSuggest() (role `suggest`, scripts/built-modules.mjs
// LAZY_ENTRIES), views/Swap.tsx (alternatives through it, a loading line), store.ts (Suggest through
// it, pendingSuggest cleared on failure).
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { aria, en, fixtureDb, h, has, useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

const DESKTOP = { width: 1280, theme: 'light' };
const LOADING = en['consortium.details.loading'];
const RELOAD = en['consortium.details.reload'];
const SUGGEST = en['consortium.start.suggest'];
const temperateIds = () => fixtureDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name").all().map((r) => String(r.id)));

// E6-6 (L8): the suggest chunk missing at the first Suggest press: a toast with Reload, Suggest not
// left busy, the reader's choices unchanged.
failing('E6-6 (R4 seams): Suggest with its chunk missing shows a toast with Reload and is not left busy; the choices stay (L8)', { owner: 'R4', reason: /role `suggest` has no chunk/ }, async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: suggest() is still in the first run');
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 404 } });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  const before = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  await page.locator(aria('button', SUGGEST)).click();
  assert.ok(await has(page, aria('button', RELOAD), 8000), 'the toast offers Reload');
  await page.waitForFunction((name) => [...document.querySelectorAll('#ct-root button')].some((b) => b.textContent.trim() === name && b.getAttribute('aria-busy') !== 'true'), { timeout: 4000 }, SUGGEST);
  const after = await page.evaluate(() => ({ climate: window.__ctTest.store.climate.value, members: [...window.__ctTest.store.members.value], crops: [...window.__ctTest.store.crops.value] }));
  assert.deepEqual(after, before, 'the reader\'s choices unchanged');
  await page.browserContext().close().catch(() => {});
});

// E6-7 (L9): Swap opened while the suggest chunk is held shows the loading line, then alternatives.
failing('E6-7 (R4 seams): Swap opened while the suggest chunk is held shows a loading line, then the alternatives (L9)', { owner: 'R4', reason: /role `suggest` has no chunk/ }, async () => {
  assert.ok(h.roles.suggest.length, 'role `suggest` has no chunk in this build: alternatives() is still in the first run');
  const ids = await temperateIds();
  const page = await h.open('/consortium/', { ...DESKTOP, data: 'fixture', hook: true, block: { suggest: 'hold' } });
  assert.equal(await loadState(page), 'ready');
  const ok = await page.evaluate(async (members) => {
    const { store } = window.__ctTest;
    store.climate.value = 'Temperate';
    if (!(await store.loadPool('Temperate'))) return false;
    store.members.value = members;
    store.view.value = 'matrix';
    store.openSheet('swap', members[0]);
    return true;
  }, ids.slice(0, 6));
  assert.ok(ok, 'the Temperate pool loads');
  await page.waitForSelector('dialog[open]', { timeout: 2000 });
  assert.ok(await has(page, 'dialog[open] [role="status"]', 2000), 'a loading line (status)');
  assert.match(await page.$eval('dialog[open] [role="status"]', (s) => s.textContent), new RegExp(LOADING.replace('…', '')));
  await page.releaseHeld();
  await page.waitForFunction((loading) => { const d = document.querySelector('dialog[open]'); return !!d && !d.textContent.includes(loading) && d.querySelectorAll('li').length > 0; }, { timeout: 8000 }, LOADING);
  await page.browserContext().close().catch(() => {});
});
