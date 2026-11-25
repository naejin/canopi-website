// North Star Plant Palette browser tests — Climate & Guild Atlas (Why?), Scenarios, Swaps & Calendar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, closeDrawerWithEscape, horizontalOverflow, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Climate & Guild Atlas (Why?): Shift Passport, Walter-Lieth SVG, Water Tank, and 10-Scenario Matrix @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Open Atlas drawer via Why?
  await clickNth(page, '.why-btn', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Climate & Guild Atlas drawer opens');

  const atlasInfo = await page.evaluate(() => ({
    hasWlSvg: !!document.querySelector('.drawer svg'),
    scenarioRows: document.querySelectorAll('.drawer .scenario-row').length,
    tabs: document.querySelectorAll('.drawer [role="tab"]').length,
    text: document.querySelector('.drawer')?.innerText ?? '',
  }));
  assert.ok(atlasInfo.hasWlSvg, 'Walter-Lieth SVG renders inside Atlas');
  assert.equal(atlasInfo.scenarioRows, 10, '10-scenario SSP + what-if matrix renders all 10 scenarios');
  assert.equal(atlasInfo.tabs, 2, 'Atlas has Climate & Swaps tabs');
  assert.ok(!PFAF_PATTERN.test(atlasInfo.text), 'zero PFAF in Atlas');
  assert.ok(!RAW_TECH_PATTERN.test(atlasInfo.text), 'zero raw jargon in Atlas');

  // Select a future 2050s scenario from the 10-scenario matrix
  await clickNth(page, '.drawer .scenario-row', 1);
  const activeScenario = await page.evaluate(() => document.querySelector('.scenario-select')?.value ?? '');
  assert.notEqual(activeScenario, 'today', 'clicking a scenario row updates the active studio horizon');

  // Close Atlas via Escape
  await closeDrawerWithEscape(page);
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow after Atlas scenario switch');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors in Atlas');
});

test('Atlas Like-for-like Swaps tab and site-scoped Bloom & Fruit Calendar @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Open Atlas -> Swaps tab
  await clickNth(page, '.why-btn', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Atlas drawer opens');
  await clickNth(page, '.drawer [role="tab"]', 1);
  const swapsInfo = await page.evaluate(() => ({
    text: document.querySelector('.drawer')?.innerText ?? '',
    swapRows: document.querySelectorAll('.drawer .picker-item').length,
  }));
  assert.match(swapsInfo.text, /Like-for-like/i, 'Swaps tab renders Like-for-like intro');
  assert.ok(swapsInfo.swapRows >= 1, `Swaps tab renders at least 1 swap candidate (got ${swapsInfo.swapRows})`);
  assert.ok(!PFAF_PATTERN.test(swapsInfo.text), 'zero PFAF in Swaps tab');
  await closeDrawerWithEscape(page);

  // Verify Bloom & Fruit Calendar renders on Design Board with 12 month headers
  assert.ok(await has(page, '.cal-table', 6_000), 'site-scoped Bloom & Fruit calendar renders');
  const monthHeaders = await page.evaluate(() => document.querySelectorAll('.cal-table thead th').length);
  assert.ok(monthHeaders >= 13, `calendar table shows plant column + 12 months (got ${monthHeaders})`);
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors across Swaps + Calendar');
});
