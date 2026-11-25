// The smoke tier (E1 design check A12): the production build (dist/, no test hook) served as
// Cloudflare serves it, checked through its real controls only: the tool loads ready, Starter
// launches the North Star Studio with real plants, and no test hook or test timeout is on the page.
// Outside the browser test glob; run after `npm run build`, capped:
//   timeout 300 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 npm run test:browser:smoke
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from '../harness.mjs';
import { BUILDS } from '../serve.mjs';
import { h, has, useHarness } from '../helpers.mjs';

useHarness({ dir: BUILDS.production });

test('smoke (dist/, no hook): the tool loads ready, Starter launches North Star Studio, and no test hook ships', async () => {
  const page = await h.open('/palette/');
  assert.equal(await loadState(page), 'ready');
  assert.ok(await has(page, '.arrival-wrap', 15_000), 'North Star Arrival renders');
  assert.ok(await has(page, '.starter-acts .btn-primary:not([disabled])', 20_000), 'starter CTA enables after catalog + climate load');
  await page.locator('.starter-acts .btn-primary').click();
  assert.ok(await has(page, '.studio-shell .plant-row', 15_000), 'members render in North Star Studio');
  assert.deepEqual(
    await page.evaluate(() => ({ hook: typeof window.__ctTest, timeouts: typeof window.__ctTimeouts })),
    { hook: 'undefined', timeouts: 'undefined' },
  );
});
