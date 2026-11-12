// A test that hangs, for the forced-hang self-check in consortium-commit0 (E1 design check A10,
// failure row F8): run with a short --test-timeout, it must fail by name and leave its trace
// (console, network, screenshot) under test-results/browser/hang.spec/. Outside the browser test
// glob: never part of a normal run.
import test from 'node:test';
import { h, useHarness } from '../helpers.mjs';

useHarness();

test('forced hang: a page that never shows what the test waits for', async () => {
  const page = await h.open('/consortium/', { data: 'fixture' });
  await page.evaluate(() => console.log('hang fixture: the page is up'));
  await page.waitForSelector('[data-never-built]', { timeout: 0 });
});
