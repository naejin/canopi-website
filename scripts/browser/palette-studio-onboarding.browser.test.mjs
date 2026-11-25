// North Star Plant Palette browser tests — Arrival (Screen 0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { horizontalOverflow, openArrival, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('P1: SQLite-WASM + climate tiles load ready on Arrival, Header.astro intact, 6 presets, Land Brief, 2050s Shift Line, and Starter Preview @real-data', async () => {
  const page = await openArrival({ width: 1280, theme: 'light' });

  const info = await page.evaluate(() => ({
    hasHeader: !!document.querySelector('header.site-header, body > header'),
    hasStudioBar: !!document.querySelector('.studio-bar'),
    presets: document.querySelectorAll('.sample-strip .sample-chip').length,
    starterMinis: document.querySelectorAll('.starter-mini').length,
    hasShiftLine: !!document.querySelector('.arrival-shift-line'),
    text: document.querySelector('main')?.innerText ?? '',
  }));

  assert.ok(info.hasHeader, 'site Header.astro is present');
  assert.equal(info.hasStudioBar, false, 'studio bar stays hidden on Arrival');
  assert.ok(info.presets >= 6, `at least 6 global presets render (got ${info.presets})`);
  assert.equal(info.starterMinis, 8, `photo-rich 8-plant multi-layer starter preview renders (got ${info.starterMinis})`);
  assert.ok(info.hasShiftLine, '2050s SSP2-4.5 Shift Line renders on Arrival');
  assert.ok(!PFAF_PATTERN.test(info.text), 'zero PFAF mentions on Arrival');
  assert.ok(!RAW_TECH_PATTERN.test(info.text), 'zero raw technical jargon on Arrival');
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Arrival');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Arrival');
});

test('Arrival: switching site preset updates Land Brief and launches populated Studio @real-data', async () => {
  const page = await openArrival({ width: 1280, theme: 'light' });

  // Switch from preset 0 (Montpellier) to preset 1 (Lyon)
  await page.evaluate(() => {
    const pills = document.querySelectorAll('.sample-strip .sample-chip');
    if (pills[1]) pills[1].click();
  });
  await page.waitForFunction(() => /Lyon/i.test(document.querySelector('.arrival-wrap')?.innerText ?? ''), { timeout: 15_000 });
  assert.ok(await has(page, '.arrival-card .btn-primary:not([disabled])', 15_000), 'starter CTA ready for Lyon');

  // Launch studio
  await page.locator('.arrival-card .btn-primary').click();
  assert.ok(await has(page, '.studio-shell .plant-row', 15_000), 'Studio opens with Lyon starter plants');
  const studioText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');
  assert.match(studioText, /Lyon/i, 'Studio bar / Land Panel shows selected place Lyon');
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow after launch');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors after launch');
});

test('Arrival: Dark theme renders with zero overflow and zero console errors @real-data', async () => {
  const page = await openArrival({ width: 1280, theme: 'dark' });
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert.equal(theme, 'dark', 'dark theme active on Arrival');
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Dark Arrival');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Dark Arrival');
});
