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

  const atlasInfo = await page.evaluate(() => {
    const wl = document.querySelector('.drawer .wl-svg');
    const rainRects = wl ? [...wl.querySelectorAll('rect[fill="var(--climate-rain)"]')] : [];
    const minRectY = rainRects.length ? Math.min(...rainRects.map((r) => Number(r.getAttribute('y') ?? 999))) : -1;
    const allHaveStroke = rainRects.length > 0 && rainRects.every((r) => r.getAttribute('stroke') === 'var(--climate-rain)');
    const usesGreen = wl ? [...wl.querySelectorAll('[fill]')].some((el) => (el.getAttribute('fill') ?? '').includes('--pal-ok')) : false;
    return {
      hasShiftPassport: !!document.querySelector('.drawer .shift-passport'),
      hasWlSvg: !!wl,
      minRectY,
      allHaveStroke,
      usesGreen,
      scenarioRows: document.querySelectorAll('.drawer .scen-row').length,
      text: document.querySelector('.drawer')?.innerText ?? '',
    };
  });
  assert.ok(atlasInfo.hasShiftPassport, 'Shift Passport renders inside Atlas');
  assert.ok(atlasInfo.hasWlSvg, 'Walter-Lieth SVG renders inside Atlas');
  assert.ok(atlasInfo.minRectY > 28, `Walter-Lieth rain bars stay strictly inside top frame (min y=${atlasInfo.minRectY})`);
  assert.ok(atlasInfo.allHaveStroke, 'Walter-Lieth rain bars have 1px --climate-rain stroke for WCAG 1.4.11 contrast');
  assert.equal(atlasInfo.usesGreen, false, 'Walter-Lieth rain never uses plant-green --pal-ok');
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

  // Verify A1 Bloom & Fruit Calendar semantic table, ribbons, glyphs, Season Summary, and A1b Mini-Year Ribbon
  assert.ok(await has(page, '.year-table', 6_000), 'site-scoped Bloom & Fruit calendar renders');
  const calInfo = await page.evaluate(() => ({
    monthHeaders: document.querySelectorAll('.year-table thead th[scope="col"]').length,
    colCount: document.querySelectorAll('.year-table colgroup col').length,
    summaryRow: !!document.querySelector('.year-table tbody tr.yr-summary-row'),
    thisMonthTag: document.querySelector('.year-table thead th[aria-current="date"] .yr-now-tag')?.textContent?.trim() ?? '',
    yrCells: document.querySelectorAll('.year-table .yr-cell').length,
    ribbons: document.querySelectorAll('.year-table .yr-ribbon').length,
    glyphs: document.querySelectorAll('.year-card svg.glyph').length,
    miniRibbons: document.querySelectorAll('.plant-row .mini-year .mini-ribbon').length,
    oldMiniDots: document.querySelectorAll('.plant-row .mini-dot').length,
  }));
  assert.equal(calInfo.monthHeaders, 13, `calendar table shows species th + 12 month th (got ${calInfo.monthHeaders})`);
  assert.equal(calInfo.colCount, 13, 'calendar colgroup pins 13 fixed columns');
  assert.ok(calInfo.summaryRow, 'Season summary row renders in calendar');
  assert.ok(calInfo.thisMonthTag.length > 0, '"This month" tag renders in current month column header');
  assert.ok(calInfo.yrCells > 0, 'calendar month cells render');
  assert.ok(calInfo.ribbons > 0, 'seamless seasonal ribbons render');
  assert.ok(calInfo.glyphs >= 3, `shared botanical <Glyph> SVGs render in calendar legend and peaks (got ${calInfo.glyphs})`);
  assert.ok(calInfo.miniRibbons > 0, 'A1b mini-year seasonal ribbons render on plant rows');
  assert.equal(calInfo.oldMiniDots, 0, 'legacy raw mini-dot circles are removed');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors across Swaps + Calendar');
});

test('Live regressions: Header dropdown z-index, anchored overflow menu, and live Guild Pulse tuning @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1440, theme: 'light' });

  // 1. Header language dropdown sits above sticky .studio-bar (elementFromPoint hits .lang-menu, not .studio-bar)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.click('.lang-menu summary');
  await page.waitForSelector('.lang-menu[open]', { timeout: 4_000 });
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
  await page.waitForFunction(() => !document.querySelector('.more-menu'), { timeout: 4_000 });
  assert.ok(await page.evaluate(() => !document.querySelector('.more-menu')), 'Escape closes overflow menu');

  // 3. Tune site controls update Guild Pulse headline live (freeze, pH, dry spell)
  await page.evaluate(() => {
    const details = document.querySelector('.tune-details');
    if (details) details.open = true;
  });
  await page.waitForSelector('#ph-input', { timeout: 4_000 });
  const parseFits = async () => page.evaluate(() => {
    const txt = document.querySelector('.pulse-h1')?.textContent?.trim() ?? '';
    const m = txt.match(/^(\d+)\s+of\s+(\d+)/);
    return { txt, fits: m ? Number(m[1]) : -1, total: m ? Number(m[2]) : -1 };
  });
  const waitForFits = async (predicate, arg) => {
    await page.waitForFunction((fnStr, expected) => {
      const txt = document.querySelector('.pulse-h1')?.textContent?.trim() ?? '';
      const m = txt.match(/^(\d+)\s+of\s+(\d+)/);
      if (!m) return false;
      const fits = Number(m[1]);
      return fnStr === 'lt' ? fits < expected : fits === expected;
    }, { timeout: 4_000 }, predicate, arg);
    return parseFits();
  };
  const before = await parseFits();
  assert.ok(before.fits > 0, `starter guild starts with thriving plants (${before.txt})`);

  // Extreme pH (4.5) drops thriving count live
  await page.evaluate(() => {
    const el = document.getElementById('ph-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '4.5');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterPh = await waitForFits('lt', before.fits);
  assert.ok(afterPh.fits < before.fits, `tuning pH to 4.5 lowers Guild Pulse count (${before.txt} -> ${afterPh.txt})`);

  // Reset pH -> restores thriving count
  await page.click('.tune-details .edit-reset');
  const afterPhReset = await waitForFits('eq', before.fits);
  assert.equal(afterPhReset.fits, before.fits, `resetting pH restores Guild Pulse count (${afterPhReset.txt})`);

  // Extreme freeze (-30 C) drops thriving count live
  await page.evaluate(() => {
    const el = document.getElementById('freeze-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '-30');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterFreeze = await waitForFits('lt', before.fits);
  assert.ok(afterFreeze.fits < before.fits, `tuning freeze to -30 C lowers Guild Pulse count (${before.txt} -> ${afterFreeze.txt})`);

  // Reset freeze, then test extreme dry spell (120 d)
  await page.click('.tune-details .edit-reset');
  await waitForFits('eq', before.fits);
  await page.evaluate(() => {
    const el = document.getElementById('cdd-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '120');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const afterCdd = await waitForFits('lt', before.fits);
  assert.ok(afterCdd.fits < before.fits, `tuning dry spell to 120 d lowers Guild Pulse count (${before.txt} -> ${afterCdd.txt})`);

  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow after live tuning & menu checks');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors during live regression checks');
});

test('Walter-Lieth wet sites (Belém & Kyoto): true 1:10 scale never clamps rain bars flat @real-data', async () => {
  for (const presetIndex of [2, 5]) { // 2 = Kyoto, 5 = Belém
    const page = await openSuggestedPalette({ width: 1280, theme: 'light', presetIndex });
    await clickNth(page, '.studio-right .bar-btn:not(.bar-btn-add)', 0);
    assert.ok(await has(page, '.drawer .wl-svg', 8_000), `Atlas Walter-Lieth renders for preset ${presetIndex}`);
    const wl = await page.evaluate(() => {
      const svg = document.querySelector('.drawer .wl-svg');
      const rainRects = [...svg.querySelectorAll('rect[fill="var(--climate-rain)"]')];
      const ys = rainRects.map((r) => Number(r.getAttribute('y')));
      const over100Ys = rainRects.filter((r) => Number(r.getAttribute('fill-opacity')) > 0.8).map((r) => Number(r.getAttribute('y')));
      return {
        minY: Math.min(...ys),
        distinctOver100: new Set(over100Ys).size,
        over100Count: over100Ys.length,
        allStroked: rainRects.every((r) => r.getAttribute('stroke') === 'var(--climate-rain)'),
      };
    });
    assert.ok(wl.minY > 28, `preset ${presetIndex}: no rain bar clamped at padT (minY=${wl.minY})`);
    assert.ok(wl.over100Count > 0, `preset ${presetIndex}: renders solid >100 mm compressed cap(s)`);
    if (wl.over100Count >= 2) {
      assert.ok(wl.distinctOver100 >= 2, `preset ${presetIndex}: >100 mm rain bars have distinct heights (got ${wl.distinctOver100})`);
    }
    assert.ok(wl.allStroked, `preset ${presetIndex}: all rain bars stroked with --climate-rain`);
    assert.deepEqual(await pageErrorsOf(page), [], `preset ${presetIndex}: zero page errors`);
  }
});
