// North Star Plant Palette browser tests — Design Board, Picker & Visual Field Dossier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, closeDrawerWithEscape, horizontalOverflow, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Design Board: Your land + Tune site, By job / 7-phase Sun x Succession / Photo grid, and Kids/Pets lens @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Verify Guild Pulse, Elevation SVG, Job Strip, A4 de-chipped rows, and MiniYearRibbon
  const designInfo = await page.evaluate(() => ({
    hasLandPanel: !!document.querySelector('.land-panel'),
    hasElevSvg: !!document.querySelector('.guild-profile-svg'),
    jobCells: document.querySelectorAll('.job-cell').length,
    plantRows: document.querySelectorAll('.plant-row').length,
    plantRowBadges: document.querySelectorAll('.plant-row .badge').length,
    plantRowStamps: document.querySelectorAll('.plant-row .stamp').length,
    hasMiniYear: !!document.querySelector('.mini-year'),
    text: document.querySelector('main')?.innerText ?? '',
  }));
  assert.ok(designInfo.hasLandPanel, 'persistent Land Panel renders');
  assert.ok(designInfo.hasElevSvg, 'Guild Elevation Profile SVG renders');
  assert.equal(designInfo.jobCells, 6, '6-cell Job Coverage Strip renders');
  assert.equal(designInfo.plantRows, 8, `multi-layer 8-plant starter guild renders (got ${designInfo.plantRows})`);
  assert.equal(designInfo.plantRowBadges, 0, 'A4 de-chipped rows render zero capsule pills');
  assert.ok(designInfo.plantRowStamps >= 8, 'A4 small-caps status stamps render on plant rows');
  assert.ok(designInfo.hasMiniYear, '12-month mini phenology ribbon renders on plant rows');
  assert.ok(!PFAF_PATTERN.test(designInfo.text), 'zero PFAF on Design Board');
  assert.ok(!RAW_TECH_PATTERN.test(designInfo.text), 'zero raw jargon on Design Board');

  // Toggle Kids / Pets toxicity lens
  await clickNth(page, '.board-filters .btn-ghost', 0);
  const lensPressed = await page.evaluate(() => document.querySelector('.board-filters .btn-ghost')?.getAttribute('aria-pressed'));
  assert.equal(lensPressed, 'true', 'Kids / Pets lens toggles to aria-pressed=true');

  // Switch to A5 7-phase Sun x Succession matrix
  await clickNth(page, '.board-bar .seg button', 1);
  assert.ok(await has(page, '.matrix-grid', 8_000), '7-phase Sun x Succession matrix renders');
  const matrixInfo = await page.evaluate(() => ({
    ribbons: document.querySelectorAll('.ribbon-btn').length,
    wedges: document.querySelectorAll('.ribbon-wedge').length,
    populatedStrata: [...document.querySelectorAll('.m-row')].filter((r) => r.querySelector('.ribbon-btn')).length,
  }));
  assert.ok(matrixInfo.ribbons > 0, 'A5 tapered succession ribbons render');
  assert.equal(matrixInfo.wedges, matrixInfo.ribbons, 'each ribbon has a tapered SVG wedge');
  assert.ok(matrixInfo.populatedStrata >= 2, `ecological niche placement spreads across strata (got ${matrixInfo.populatedStrata})`);

  // Switch to Photo grid
  await clickNth(page, '.board-bar .seg button', 2);
  assert.ok(await has(page, '.photo-card', 8_000), 'Photo grid cards render');

  // Back to By job
  await clickNth(page, '.board-bar .seg button', 0);
  assert.ok(await has(page, '.plant-row', 8_000), 'By job view restores');

  // Expand Tune site inside Land Panel
  await clickNth(page, '.tune-details summary', 0);
  assert.ok(await has(page, '.tune-body .tuner-group', 4_000), 'Tune site fields expand cleanly');
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Design Board');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Design Board');
});

test('Botanical Picker (761-species search) and Visual Field Dossier (clean provenance, Escape close) @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  const beforeCount = await page.evaluate(() => document.querySelectorAll('.plant-row').length);

  // Open Botanical Picker via + Add plant
  await clickNth(page, '.bar-btn-add', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Botanical Picker drawer opens');

  // Search botanical catalog for "fig"
  const input = await page.waitForSelector('.drawer #picker-search', { timeout: 6_000 });
  await input.type('fig');
  await page.waitForFunction(() => /Ficus|Fig/i.test(document.querySelector('.drawer')?.innerText ?? ''), { timeout: 10_000 });

  // Add first not-yet-in-palette match
  await clickNth(page, '.picker-row-v7 .btn-primary, .picker-row .btn-primary', 0);
  await closeDrawerWithEscape(page);

  const afterCount = await page.evaluate(() => document.querySelectorAll('.plant-row').length);
  assert.equal(afterCount, beforeCount + 1, 'adding from Picker increments palette count');

  // Open Visual Field Dossier on first plant
  await clickNth(page, '.plant-row .plant-open', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Field Dossier drawer opens');
  const dossierText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  assert.ok(dossierText.length > 80, 'Field Dossier renders botanical content');
  assert.ok(!PFAF_PATTERN.test(dossierText), 'zero PFAF in Field Dossier');
  assert.ok(!RAW_TECH_PATTERN.test(dossierText), 'zero KTMPR / llm-knowledge in Field Dossier');

  // Escape closes Dossier and restores focus to opener
  await closeDrawerWithEscape(page);
  const restoredToRow = await page.evaluate(() => !!document.activeElement?.closest('.plant-row'));
  assert.ok(restoredToRow, 'closing Dossier restores focus to opener plant row');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors across Picker + Dossier');
});
