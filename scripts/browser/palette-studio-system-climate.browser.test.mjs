// North Star Plant Palette browser tests — Climate & Guild Atlas (Why?), Scenarios, Swaps & Calendar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, closeDrawerWithEscape, horizontalOverflow, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Climate & Guild Atlas (Why?): Shift Passport, Walter-Lieth SVG, Water Tank, and 10-Scenario Matrix @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Open Atlas drawer via Why?
  await clickNth(page, '.studio-right .bar-btn:not(.bar-btn-add)', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Climate & Guild Atlas drawer opens');

  const atlasInfo = await page.evaluate(() => ({
    hasShiftPassport: !!document.querySelector('.drawer .shift-passport'),
    hasWlSvg: !!document.querySelector('.drawer .wl-svg'),
    scenarioRows: document.querySelectorAll('.drawer .scen-row').length,
    text: document.querySelector('.drawer')?.innerText ?? '',
  }));
  assert.ok(atlasInfo.hasShiftPassport, 'Shift Passport renders inside Atlas');
  assert.ok(atlasInfo.hasWlSvg, 'Walter-Lieth SVG renders inside Atlas');
  assert.equal(atlasInfo.scenarioRows, 10, '10-scenario SSP + what-if matrix renders all 10 scenarios');
  assert.ok(!PFAF_PATTERN.test(atlasInfo.text), 'zero PFAF in Atlas');
  assert.ok(!RAW_TECH_PATTERN.test(atlasInfo.text), 'zero raw jargon in Atlas');

  // Select a future 2050s scenario from the 10-scenario matrix
  await clickNth(page, '.drawer .scen-row', 1);
  const activeScenario = await page.evaluate(() => document.querySelector('.scenario-select')?.value ?? '');
  assert.notEqual(activeScenario, 'today', 'clicking a scenario row updates the active studio horizon');

  // Close Atlas via Escape
  await closeDrawerWithEscape(page);
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow after Atlas scenario switch');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors in Atlas');
});

test('Atlas Like-for-like Swaps and site-scoped Bloom & Fruit Calendar @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Open Atlas -> check Like-for-like Swaps section
  await clickNth(page, '.studio-right .bar-btn:not(.bar-btn-add)', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Atlas drawer opens');
  const swapsInfo = await page.evaluate(() => ({
    text: document.querySelector('.drawer')?.innerText ?? '',
    swapRows: document.querySelectorAll('.drawer .picker-row').length,
  }));
  assert.match(swapsInfo.text, /Like-for-like/i, 'Atlas renders Like-for-like Swaps intro');
  assert.ok(swapsInfo.swapRows >= 1, `Atlas renders at least 1 swap candidate (got ${swapsInfo.swapRows})`);
  assert.ok(!PFAF_PATTERN.test(swapsInfo.text), 'zero PFAF in Swaps');
  await closeDrawerWithEscape(page);

  // Verify Bloom & Fruit Calendar renders on Design Board with 12 month headers and rounded yr-cell tiles
  assert.ok(await has(page, '.year-table', 6_000), 'site-scoped Bloom & Fruit calendar renders');
  const calInfo = await page.evaluate(() => ({
    monthHeaders: document.querySelectorAll('.year-table thead th').length,
    yrCells: document.querySelectorAll('.year-table .yr-cell').length,
  }));
  assert.ok(calInfo.monthHeaders >= 13, `calendar table shows plant column + 12 months (got ${calInfo.monthHeaders})`);
  assert.ok(calInfo.yrCells > 0, 'rounded yr-cell pill tiles render');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors across Swaps + Calendar');
});

test('Live regressions: Header dropdown z-index, anchored overflow menu, and live Guild Pulse tuning @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1440, theme: 'light' });

  // 1. Header language dropdown sits above sticky .studio-bar (elementFromPoint hits .lang-menu, not .studio-bar)
  await page.click('.lang-menu summary');
  const langAboveBar = await page.evaluate(() => {
    const list = document.querySelector('.lang-menu ul, .lang-list');
    const bar = document.querySelector('.studio-bar');
    if (!list || !bar) return { ok: false, reason: 'missing element' };
    const lr = list.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const hit = document.elementFromPoint(lr.left + lr.width / 2, Math.max(lr.top + 6, br.top + 10));
    return { ok: !!hit?.closest('.lang-menu'), hitClass: hit?.className ?? '' };
  });
  assert.ok(langAboveBar.ok, `Header language dropdown must sit above .studio-bar (hit: ${langAboveBar.hitClass})`);
  await page.click('.lang-menu summary');

  // 2. Overflow menu (...) is anchored directly beneath its trigger button (not pinned to window right edge)
  await page.click('.more-menu-wrap button');
  assert.ok(await has(page, '.more-menu[role="menu"]', 4_000), 'overflow menu opens');
  const menuAnchor = await page.evaluate(() => {
    const btn = document.querySelector('.more-menu-wrap button').getBoundingClientRect();
    const menu = document.querySelector('.more-menu').getBoundingClientRect();
    return {
      rightDiff: Math.abs(menu.right - btn.right),
      belowTrigger: menu.top >= btn.bottom - 1 && menu.top <= btn.bottom + 16,
      position: getComputedStyle(document.querySelector('.more-menu')).position,
    };
  });
  assert.equal(menuAnchor.position, 'absolute', 'overflow menu uses position: absolute inside .more-menu-wrap');
  assert.ok(menuAnchor.rightDiff <= 16, `overflow menu right edge aligns with trigger (diff ${menuAnchor.rightDiff}px)`);
  assert.ok(menuAnchor.belowTrigger, 'overflow menu opens directly beneath trigger button');
  await page.keyboard.press('Escape');
  assert.ok(await page.evaluate(() => !document.querySelector('.more-menu')), 'Escape closes overflow menu');

  // 3. Tune site controls update Guild Pulse headline live (freeze, pH, dry spell)
  await page.evaluate(() => {
    const details = document.querySelector('.tune-details');
    if (details) details.open = true;
  });
  const parseFits = async () => page.evaluate(() => {
    const txt = document.querySelector('.pulse-h1')?.textContent?.trim() ?? '';
    const m = txt.match(/^(\d+)\s+of\s+(\d+)/);
    return { txt, fits: m ? Number(m[1]) : -1, total: m ? Number(m[2]) : -1 };
  });
  const before = await parseFits();
  assert.ok(before.fits > 0, `starter guild starts with thriving plants (${before.txt})`);

  // Extreme pH (4.5) drops thriving count live
  await page.evaluate(() => {
    const el = document.getElementById('ph-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '4.5');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterPh = await parseFits();
  assert.ok(afterPh.fits < before.fits, `tuning pH to 4.5 lowers Guild Pulse count (${before.txt} -> ${afterPh.txt})`);

  // Reset pH -> restores thriving count
  await page.click('.tune-details .edit-reset');
  const afterPhReset = await parseFits();
  assert.equal(afterPhReset.fits, before.fits, `resetting pH restores Guild Pulse count (${afterPhReset.txt})`);

  // Extreme freeze (-30 C) drops thriving count live
  await page.evaluate(() => {
    const el = document.getElementById('freeze-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '-30');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterFreeze = await parseFits();
  assert.ok(afterFreeze.fits < before.fits, `tuning freeze to -30 C lowers Guild Pulse count (${before.txt} -> ${afterFreeze.txt})`);

  // Reset freeze, then test extreme dry spell (120 d)
  await page.click('.tune-details .edit-reset');
  await page.evaluate(() => {
    const el = document.getElementById('cdd-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '120');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterCdd = await parseFits();
  assert.ok(afterCdd.fits < before.fits, `tuning dry spell to 120 d lowers Guild Pulse count (${before.txt} -> ${afterCdd.txt})`);

  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow after live tuning & menu checks');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors during live regression checks');
});
