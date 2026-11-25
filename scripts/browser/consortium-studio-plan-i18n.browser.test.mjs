// North Star Plant Palette browser tests — Plan Surface, Dark Theme, Mobile 390px Tap Targets & /fr/ i18n.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, horizontalOverflow, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Plan Surface: Crown-Area Budget, Plot Area input, 3 Planting Waves, Nursery Checklist, and Dark Theme @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'dark' });

  // Switch to Plan surface
  await clickNth(page, '.surface-tab', 1);
  assert.ok(await has(page, '.budget-bar[role="progressbar"]', 8_000), 'Crown-area budget progressbar renders');

  const planInfo = await page.evaluate(() => ({
    hasAriaLabel: !!document.querySelector('.budget-bar[role="progressbar"]')?.getAttribute('aria-label'),
    waveBoxes: document.querySelectorAll('.wave-box').length,
    nurseryItems: document.querySelectorAll('.nursery-item').length,
    hasPlotInput: !!document.querySelector('.plot-input-wrap input[type="number"]'),
    text: document.querySelector('main')?.innerText ?? '',
  }));
  assert.ok(planInfo.hasAriaLabel, 'budget progressbar has accessible aria-label');
  assert.equal(planInfo.waveBoxes, 3, '3 planting waves render');
  assert.ok(planInfo.nurseryItems >= 4, `nursery checklist lists palette species (got ${planInfo.nurseryItems})`);
  assert.ok(planInfo.hasPlotInput, 'plot area number input renders');
  assert.ok(!PFAF_PATTERN.test(planInfo.text), 'zero PFAF on Plan surface');

  // Check off first nursery checklist item
  await clickNth(page, '.nursery-check', 0);
  const checked = await page.evaluate(() => document.querySelector('.nursery-check')?.getAttribute('aria-pressed'));
  assert.equal(checked, 'true', 'nursery checklist toggle persists aria-pressed=true');

  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Dark Plan');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Dark Plan');
});

test('Mobile 390x844: zero overflow and all interactive controls >= 44px across Design, Atlas, Picker, and Plan @real-data', async () => {
  const page = await openSuggestedPalette({ width: 390, theme: 'light' });
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Mobile Design');

  const smallDesign = await page.evaluate(() => {
    const sels = ['.surface-tab', '.scenario-select', '.btn-secondary', '.btn-primary', '.land-toggle-btn', '.link-btn', '.icon-btn', '.plant-row-main'];
    const bad = [];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height < 43.9) bad.push({ s, h: Number(r.height.toFixed(1)) });
      }
    }
    return bad;
  });
  assert.deepEqual(smallDesign, [], `all Mobile Design targets >= 44px: ${JSON.stringify(smallDesign)}`);

  // Mobile Atlas .scenario-row >= 44px
  await clickNth(page, '.why-btn', 0);
  assert.ok(await has(page, '.drawer .scenario-row', 8_000), 'Mobile Atlas renders scenario rows');
  const smallAtlas = await page.evaluate(() =>
    [...document.querySelectorAll('.drawer .scenario-row')]
      .map((el) => Number(el.getBoundingClientRect().height.toFixed(1)))
      .filter((h) => h > 0 && h < 43.9),
  );
  assert.deepEqual(smallAtlas, [], 'Mobile Atlas .scenario-row >= 44px');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });

  // Mobile Picker sort <select> >= 44px
  await clickNth(page, '.studio-bar-right .btn-primary', 0);
  assert.ok(await has(page, '.drawer .picker-tools select', 8_000), 'Mobile Picker renders sort select');
  const pickerSelectH = await page.evaluate(() => Number(document.querySelector('.drawer .picker-tools select')?.getBoundingClientRect().height.toFixed(1) ?? 0));
  assert.ok(pickerSelectH >= 43.9, `Mobile Picker sort select >= 44px (got ${pickerSelectH})`);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });

  // Mobile Plan plot input >= 44px
  await clickNth(page, '.surface-tab', 1);
  assert.ok(await has(page, '.plot-input-wrap input[type="number"]', 8_000), 'Mobile Plan renders plot input');
  const plotInputH = await page.evaluate(() => Number(document.querySelector('.plot-input-wrap input[type="number"]')?.getBoundingClientRect().height.toFixed(1) ?? 0));
  assert.ok(plotInputH >= 43.9, `Mobile Plan plot input >= 44px (got ${plotInputH})`);
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Mobile Plan');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Mobile');
});

test('i18n (/fr/palette/): zero English leaks, zero PFAF, zero KTMPR across Design, Atlas, and Dossier @real-data', async () => {
  const page = await openSuggestedPalette({ path: '/fr/palette/', width: 1280, theme: 'light' });
  const designText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');

  await clickNth(page, '.why-btn', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'FR Atlas opens');
  const atlasText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });

  await clickNth(page, '.plant-row .plant-row-main', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'FR Dossier opens');
  const dossierText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  await page.keyboard.press('Escape');

  const combined = `${designText}\n${atlasText}\n${dossierText}`;
  const FR_FORBIDDEN = [/\bToday\b/, /what-if/i, /middle road/i, /\bmm\/yr\b/, /Your site/, PFAF_PATTERN, RAW_TECH_PATTERN];
  for (const re of FR_FORBIDDEN) {
    assert.ok(!re.test(combined), `/fr/palette/ must not leak ${re}`);
  }
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on /fr/palette/');
});
