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

  // Expand all Sun x Succession rows so continuous species span bars render
  await page.locator('[data-ssm-toggle-all]').click();
  assert.ok(await has(page, '[data-ssm-bar-plant]', 4_000), 'expanded matrix shows continuous species span bars');

  const sys = await page.evaluate(() => ({
    pills: document.querySelectorAll('.ls-summary-strip .ls-sum-btn').length,
    matrixRows: document.querySelectorAll('.ssm-grid [data-ssm-row]').length,
    matrixCols: document.querySelectorAll('.ssm-grid-head .ssm-col-head').length,
    bars: document.querySelectorAll('[data-ssm-bar-plant]').length,
    roleRows: document.querySelectorAll('#ct-sys-roles tbody tr').length,
    yearBtns: document.querySelectorAll('#ct-sys-year .cal-focus-btn').length,
  }));
  assert.equal(sys.pills, 3, '3 summary anchor pills render');
  assert.equal(sys.matrixRows, 4, '4 Preferred Sun rows render');
  assert.equal(sys.matrixCols, 6, '6 Succession columns render');
  assert.ok(sys.bars >= 4, 'species span bars populate the matrix');
  assert.equal(sys.roleRows, 6, '6-Role Redundancy Ledger renders all 6 roles');
  assert.ok(sys.yearBtns >= 4, 'Growing Year filter buttons render');

  // 1-click FieldDossier directly from a matrix species button
  await page.locator('[data-ssm-bar-plant] .ssm-plant-btn').click();
  assert.ok(await has(page, '[data-field-dossier] .dossier-drawer[role="dialog"]', 8_000), 'matrix species button opens FieldDossier');
  await page.keyboard.press('Escape');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});

test('2050 Climate: Typical vs Extreme envelope, Typical 2050s Winter floor warming & Dry-spell delta parity, 5 stress presets & 6-lever Extremes Lab @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'dark' });
  await clickStudioTab(page, '2050 Climate');
  assert.ok(await has(page, '[data-climate-2050-tab]', 8_000), '2050 Climate tab mounts lazily');

  // Verify Typical 2050s math: Winter nights & hard freezes + Longest summer dry spell days without rain
  const typicalForces = await page.evaluate(() =>
    [...document.querySelectorAll('.cb-force-row')].map((row) => ({
      text: row.textContent?.trim() ?? '',
      delta: row.querySelector('.cb-force-v')?.textContent?.trim() ?? '',
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
  await page.locator('.sb-actions button[aria-expanded]').click();
  assert.ok(await has(page, '.extreme-sliders-grid input[type="range"]', 4_000), 'Extremes Lab opens');
  const lab = await page.evaluate(() => ({
    presets: document.querySelectorAll('.sb-presets .scenario-btn').length,
    sliders: document.querySelectorAll('.extreme-sliders-grid input[type="range"]').length,
  }));
  assert.equal(lab.presets, 5, '5 compound stress presets render');
  assert.ok(lab.sliders >= 6, '6-lever Extremes Lab sliders render');
});

test('2050 Climate: 4-layer Plant Triage, Climate Twin Swap & Undo, Opportunities, 12-month Climate Shift chart, and lazy Climate Twin check @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  await clickStudioTab(page, '2050 Climate');
  assert.ok(await has(page, '[data-climate-2050-tab]', 8_000));

  const sections = await page.evaluate(() => {
    const root = document.querySelector('[data-climate-2050-tab]');
    return {
      shiftMonths: root?.querySelectorAll('[data-climate-shift-studio] .cshift-chart .cshift-mo').length ?? 0,
      triageCards: root?.querySelectorAll('.triage-card').length ?? 0,
      hasCheckTwin: [...(root?.querySelectorAll('button') ?? [])].some((b) => /twin|analogue/i.test(b.textContent ?? '')),
      text: root?.textContent ?? '',
    };
  });
  assert.equal(sections.shiftMonths, 12, '12-month Climate Shift chart renders all 12 months');
  assert.ok(sections.triageCards >= 1, 'Plant Triage renders species cards');
  assert.match(sections.text, /thrives|needs care|at risk|opportunit/i, 'triage and opportunities sections render');
  assert.ok(sections.hasCheckTwin || /analogue|twin/i.test(sections.text), 'Climate Twin lookup control is present');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});
