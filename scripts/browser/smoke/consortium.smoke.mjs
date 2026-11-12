// The smoke tier (E1 design check A12): the production build (dist/, no test hook) served as
// Cloudflare serves it, checked through its real controls only: the tool loads ready, Suggest fills
// the matrix, and no test hook or test timeout is on the page. Outside the browser test glob; run
// after `npm run build`, capped:
//   timeout 300 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 npm run test:browser:smoke
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from '../harness.mjs';
import { BUILDS } from '../serve.mjs';
import { aria, en, h, has, useHarness } from '../helpers.mjs';

useHarness({ dir: BUILDS.production });

test('smoke (dist/, no hook): the tool loads ready, Suggest fills the matrix, and no test hook ships', async () => {
  const page = await h.open('/consortium/');
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('radio', 'Temperate')).click();
  await page.locator(aria('button', en['consortium.start.suggest'] ?? 'Suggest plants')).click();
  assert.ok(await has(page, '#ct-root [data-plant-id]', 15_000), 'members in the matrix');
  assert.deepEqual(await page.evaluate(() => ({ hook: typeof window.__ctTest, timeouts: typeof window.__ctTimeouts })), { hook: 'undefined', timeouts: 'undefined' });
});
