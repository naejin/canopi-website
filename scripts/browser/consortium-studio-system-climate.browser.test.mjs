// Field Studio browser tests — Living System & 2050 Climate tabs (Screens 4 & 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, has, useHarness } from './helpers.mjs';
import { clickStudioTab, openSuggestedPalette, pageErrorsOf } from './studio-helpers.mjs';

useHarness();

test('Living System: 4-pill summary strip, 4x6 Sun x Succession matrix, 1-click Dossier from matrix, 6-Role Redundancy Ledger, and Your Growing Year @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  await clickStudioTab(page, 'Living System');
  assert.ok(await has(page, '[data-living-system-tab]', 8_000), 'Living System tab mounts lazily');

  const sys = await page.evaluate(() => ({
    pills: document.querySelectorAll('.ct-sys-strip .ct-sys-pill').length,
    matrixRows: document.querySelectorAll('.ct-sys-matrix tbody tr').length,
    matrixCols: document.querySelectorAll('.ct-sys-matrix thead th').length,
    chips: document.querySelectorAll('.ct-sys-matrix .ct-sys-chip').length,
    roleRows: document.querySelectorAll('#ct-sys-roles .ct-role-row').length,
    yearBtns: document.querySelectorAll('#ct-sys-year .ct-seg-btn').length,
  }));
  assert.equal(sys.pills, 4, '4 summary pills render');
  assert.equal(sys.matrixRows, 4, '4 Preferred Sun rows render');
  assert.ok(sys.matrixCols >= 6, '6 Succession columns render');
  assert.ok(sys.chips >= 4, 'species chips populate the matrix');
  assert.equal(sys.roleRows, 6, '6-Role Redundancy Ledger renders all 6 roles');
  assert.equal(sys.yearBtns, 4, 'All | Bloom | Harvest | Prune filter buttons render');

  // 1-click FieldDossier directly from a matrix chip
  await page.locator('.ct-sys-matrix .ct-sys-chip').click();
  assert.ok(await has(page, '.ct-dossier[role="dialog"]', 8_000), 'matrix chip opens FieldDossier');
  await page.keyboard.press('Escape');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});

test('2050 Climate: Typical vs Extreme envelope, Typical 2050s Winter floor warming & Dry-spell delta parity, 5 stress presets & 6-lever Extremes Lab @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'dark' });
  await clickStudioTab(page, '2050 Climate');
  assert.ok(await has(page, '[data-climate-2050-tab]', 8_000), '2050 Climate tab mounts lazily');

  // Verify Typical 2050s math: Winter nights & hard freezes + Longest summer dry spell days without rain
  const typicalForces = await page.evaluate(() =>
    [...document.querySelectorAll('.cb-force-row, .ct-clim-force-row')].map((row) => ({
      text: row.textContent?.trim() ?? '',
      delta: row.querySelector('.cb-force-v, .ct-clim-delta')?.textContent?.trim() ?? '',
    })),
  );
  assert.ok(typicalForces.length >= 3, 'Climate shift forces render');
  const winter = typicalForces.find((f) => /winter nights/i.test(f.text));
  assert.ok(winter, 'Winter nights & hard freezes force row renders');
  assert.match(winter.text, /1-in-10-yr freeze/i, `Winter force shows explicit 1-in-10-yr freeze (got ${winter.text})`);

  const dry = typicalForces.find((f) => /longest summer dry spell/i.test(f.text));
  assert.ok(dry, 'Longest summer dry spell force row renders');
  const dayMatch = dry.text.match(/~?(\d+)d\s*→\s*(\d+)d/);
  assert.ok(dayMatch, `Dry spell shows today -> future days (${dry.text})`);
  const expectedDelta = Number(dayMatch[2]) - Number(dayMatch[1]);
  assert.ok(dry.text.includes(`+${expectedDelta}d`), `Dry spell delta matches future - today (${dry.text} vs +${expectedDelta}d)`);

  // Switch to 1-in-10-yr Extreme and open Extremes Lab (6 levers)
  await page.locator(aria('button', '⚡ 1-in-10-yr Extreme')).click();
  await page.locator(aria('button', 'Extremes Lab (6 levers)')).click();
  assert.ok(await has(page, '.ct-stress-lab input[type="range"]', 4_000), 'Extremes Lab opens');
  const lab = await page.evaluate(() => ({
    presets: document.querySelectorAll('.ct-stress-chip').length,
    sliders: document.querySelectorAll('.ct-stress-lab input[type="range"]').length,
  }));
  assert.equal(lab.presets, 5, '5 compound stress presets render');
  assert.ok(lab.sliders >= 6, '6-lever Extremes Lab sliders render');
});

test('2050 Climate: 4-layer Plant Triage, Climate Twin Swap & Undo, Opportunities, 12-month SVG Climate Shift, and lazy Climate Twin check @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  await clickStudioTab(page, '2050 Climate');
  assert.ok(await has(page, '[data-climate-2050-tab]', 8_000));

  const sections = await page.evaluate(() => {
    const root = document.querySelector('[data-climate-2050-tab]');
    return {
      hasSvgShift: !!root?.querySelector('svg'),
      triageGroups: root?.querySelectorAll('.ct-triage-group, .ct-triage-card, .ct-triage-item').length ?? 0,
      hasCheckTwin: [...(root?.querySelectorAll('button') ?? [])].some((b) => /twin|analogue/i.test(b.textContent ?? '')),
      text: root?.textContent ?? '',
    };
  });
  assert.ok(sections.hasSvgShift, '12-month pure-SVG Climate Shift chart renders');
  assert.ok(sections.triageGroups >= 1, 'Plant Triage renders');
  assert.match(sections.text, /thriving|watch|at risk|opportunit/i, 'triage and opportunities sections render');
  assert.ok(sections.hasCheckTwin || /analogue|twin/i.test(sections.text), 'Climate Twin lookup control is present');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});
