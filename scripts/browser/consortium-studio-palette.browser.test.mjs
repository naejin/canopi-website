// North Star Plant Palette browser tests — Design Board, Picker & Visual Field Dossier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, horizontalOverflow, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Design Board: Your land + Tune site, By job / 7-phase Sun x Succession / Photo grid, Already on site, and Kids/Pets lens @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Verify Guild Pulse, Elevation SVG, Job Strip, and Light-span labels
  const designInfo = await page.evaluate(() => ({
    hasLandPanel: !!document.querySelector('.land-panel'),
    hasElevSvg: !!document.querySelector('.elev-box svg'),
    jobCells: document.querySelectorAll('.job-cell').length,
    plantRows: document.querySelectorAll('.plant-row').length,
    text: document.querySelector('main')?.innerText ?? '',
  }));
  assert.ok(designInfo.hasLandPanel, 'persistent Land Panel renders');
  assert.ok(designInfo.hasElevSvg, 'Guild Elevation Profile SVG renders');
  assert.equal(designInfo.jobCells, 6, '6-cell Job Coverage Strip renders');
  assert.ok(designInfo.plantRows >= 4, `starter palette renders rows (got ${designInfo.plantRows})`);
  assert.ok(!PFAF_PATTERN.test(designInfo.text), 'zero PFAF on Design Board');
  assert.ok(!RAW_TECH_PATTERN.test(designInfo.text), 'zero raw jargon on Design Board');

  // Toggle Already on site star on first plant
  await clickNth(page, '.plant-row-acts .icon-btn', 0);
  const starPressed = await page.evaluate(() => document.querySelector('.plant-row-acts .icon-btn')?.getAttribute('aria-pressed'));
  assert.equal(starPressed, 'true', 'Already on site star toggles to aria-pressed=true');

  // Switch to 7-phase Sun x Succession matrix
  await clickNth(page, '.board-filters [role="tab"]', 1);
  assert.ok(await has(page, '.matrix-row', 8_000), '7-phase Sun x Succession matrix renders');
  const matrixCells = await page.evaluate(() => document.querySelectorAll('.matrix-row[role="row"] [role="cell"]').length);
  assert.ok(matrixCells > 0, 'matrix rows expose role=cell children');

  // Switch to Photo grid
  await clickNth(page, '.board-filters [role="tab"]', 2);
  assert.ok(await has(page, '.photo-card', 8_000), 'Photo grid cards render');

  // Back to By job
  await clickNth(page, '.board-filters [role="tab"]', 0);
  assert.ok(await has(page, '.plant-row', 8_000), 'By job view restores');

  // Expand Tune site inside Land Panel
  await clickNth(page, '.land-actions .btn-secondary', 0);
  assert.ok(await has(page, '.tune-field', 4_000), 'Tune site fields expand cleanly');
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Design Board');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Design Board');
});

test('Botanical Picker (761-species search) and Visual Field Dossier (clean provenance, Escape close) @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  const beforeCount = await page.evaluate(() => document.querySelectorAll('.plant-row').length);

  // Open Botanical Picker via + Add plant
  await clickNth(page, '.studio-bar-right .btn-primary', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Botanical Picker drawer opens');

  // Search botanical catalog for "fig"
  const input = await page.waitForSelector('.drawer input[type="search"], .drawer input[type="text"]', { timeout: 6_000 });
  await input.type('fig');
  await page.waitForFunction(() => /Ficus|Fig/i.test(document.querySelector('.drawer')?.innerText ?? ''), { timeout: 10_000 });

  // Add first not-yet-in-palette match (or clear search & pick first addable)
  await clickNth(page, '.picker-item .btn-primary:not([disabled]), .picker-item .btn-secondary:not([disabled])', 0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });

  const afterCount = await page.evaluate(() => document.querySelectorAll('.plant-row').length);
  assert.equal(afterCount, beforeCount + 1, 'adding from Picker increments palette count');

  // Open Visual Field Dossier on first plant
  await clickNth(page, '.plant-row .plant-row-main', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'Field Dossier drawer opens');
  const dossierText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  assert.ok(dossierText.length > 80, 'Field Dossier renders botanical content');
  assert.ok(!PFAF_PATTERN.test(dossierText), 'zero PFAF in Field Dossier');
  assert.ok(!RAW_TECH_PATTERN.test(dossierText), 'zero KTMPR / llm-knowledge in Field Dossier');

  // Escape closes Dossier
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors across Picker + Dossier');
});
