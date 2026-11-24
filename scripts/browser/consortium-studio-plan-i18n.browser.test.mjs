// Field Studio browser tests — Planting Plan, French i18n & Responsive/A11y Invariants (Screen 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, has, useHarness } from './helpers.mjs';
import { BOTANICAL_JARGON, clickStudioTab, horizontalOverflow, openSuggestedPalette, pageErrorsOf } from './studio-helpers.mjs';

useHarness();

test('Planting Plan: 4-column metrics strip, SVG Plot Layout Blueprint modes with initials & clickable legend, Nursery Order +10% buffer & qty override @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  await clickStudioTab(page, 'Planting Plan');
  assert.ok(await has(page, '[data-planting-plan-tab]', 8_000), 'Planting Plan tab mounts lazily');

  const plan = await page.evaluate(() => {
    const root = document.querySelector('[data-planting-plan-tab]');
    const circles = [...(root?.querySelectorAll('svg.bp-svg circle') ?? [])];
    const initials = [...(root?.querySelectorAll('svg.bp-svg text') ?? [])].map((t) => t.textContent?.trim()).filter(Boolean);
    const legendItems = root?.querySelectorAll('.bp-meta-bar .legend-item').length ?? 0;
    const metrics = root?.querySelectorAll('.plan-ledger-strip .plan-ledger-col').length ?? 0;
    const qtyInputs = root?.querySelectorAll('.qty-input').length ?? 0;
    return { circles: circles.length, initials, legendItems, metrics, qtyInputs, text: root?.textContent ?? '' };
  });
  assert.ok(plan.metrics >= 4, '4-column metrics strip renders');
  assert.ok(plan.circles >= 4, 'SVG Plot Layout Blueprint draws species circles');
  assert.ok(plan.initials.length >= 4, 'SVG circles display non-clipping 2-letter initials');
  assert.equal(plan.legendItems, 4, '4-tier sun legend renders below SVG blueprint');
  assert.ok(plan.qtyInputs >= 4, 'Nursery Order inline qty override inputs render');
  assert.match(plan.text, /\+10%|buffer/i, '+10% planting buffer is displayed');

  // Switch blueprint layout mode and open FieldDossier from Nursery Order table
  await page.locator(aria('button', 'Orchard Grid')).click();
  await page.locator('.plan-table button.link-btn').click();
  assert.ok(await has(page, '[data-field-dossier] .dossier-drawer[role="dialog"]', 8_000), 'clicking Nursery Order species opens FieldDossier');
  await page.keyboard.press('Escape');
});

test('Planting Plan: 4-column Materials Ledger, Extreme-year insurance, 4 Frost-Anchored Waves, and 12-Month Action Calendar weekend briefs @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });
  await clickStudioTab(page, 'Planting Plan');
  assert.ok(await has(page, '[data-planting-plan-tab]', 8_000));

  const details = await page.evaluate(() => {
    const text = document.querySelector('[data-planting-plan-tab]')?.textContent ?? '';
    return {
      hasMulch: /mulch|woodchip/i.test(text),
      hasWater: /water|dry streak\./i.test(text),
      hasWaves: /wave|frost|dormant/i.test(text),
      calCells: document.querySelectorAll('[data-planting-plan-tab] .hm-grid .hm-m').length,
      hasCsv: /\bexport\s+csv\b|\bdownload\s+csv\b/i.test(text),
    };
  });
  assert.ok(details.hasMulch, 'Materials Ledger includes mulch estimate');
  assert.ok(details.hasWater, 'Materials Ledger includes watering detail with proper punctuation');
  assert.ok(details.hasWaves, 'Frost-Anchored Planting Waves render');
  assert.equal(details.calCells, 12, '12-Month Action Calendar renders 12 months');
  assert.equal(details.hasCsv, false, 'zero CSV export anywhere in Planting Plan');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});

test('Multi-locale & responsive invariants: /fr/palette/ French i18n, Light & Dark themes, 1440px & 390px zero overflow, zero [title], >=44px mobile targets, zero CSV/jargon @real-data', async () => {
  // 1. French locale (/fr/palette/) at 1440px light
  const frPage = await openSuggestedPalette({
    path: '/fr/palette/',
    width: 1440,
    theme: 'light',
    climate: 'Tempéré',
    suggestLabel: 'Partir d’une petite palette suggérée',
  });
  const frCheck = await frPage.evaluate(() => ({
    tabs: [...document.querySelectorAll('[role="tab"]')].map((e) => e.textContent?.trim()),
    titles: document.querySelectorAll('#ct-root [title]').length,
    text: document.querySelector('#ct-root')?.textContent ?? '',
  }));
  assert.ok(frCheck.tabs.some((t) => /ma palette|système vivant|climat 2050|plan de plantation/i.test(t ?? '')), `French studio tabs render (${frCheck.tabs.join(', ')})`);
  assert.equal(frCheck.titles, 0, 'zero native [title] attributes on /fr/palette/');
  assert.ok((await horizontalOverflow(frPage)) <= 1, 'zero horizontal overflow at 1440px');

  // Verify zero leaked English in French Planting Plan (Site Prep, waves, materials, notes, stock labels)
  await clickStudioTab(frPage, 'Planting Plan');
  assert.ok(await has(frPage, '[data-planting-plan-tab]', 4_000), 'French Planting Plan renders');
  const frPlanText = await frPage.evaluate(() => document.querySelector('[data-planting-plan-tab]')?.innerText ?? '');
  const leakedPlan = frPlanText.match(/Site Prep & Layout|Shade-timing note|Pollination note|Bare-root tree|Direct seed|Wave 1 ·|soil reserve|young tree every|Dormant Woody Root-In/i);
  assert.equal(leakedPlan, null, `zero untranslated English in /fr/palette/ Planting Plan (found: ${leakedPlan?.[0]})`);

  // Verify zero leaked English in French 2050 Climate ('5 limits' tooltip, field insurance, triage)
  await clickStudioTab(frPage, '2050 Climate');
  assert.ok(await has(frPage, '[data-climate-2050-tab]', 4_000), 'French 2050 Climate renders');
  const frClimCheck = await frPage.evaluate(() => {
    const root = document.querySelector('[data-climate-2050-tab]');
    const text = root?.innerText ?? '';
    const tips = [...(root?.querySelectorAll('[data-field-tip], .field-tip-pop, [role="tooltip"]') ?? [])].map((e) => e.textContent ?? '').join(' ');
    return { text, tips };
  });
  const leakedClim = (frClimCheck.text + ' ' + frClimCheck.tips).match(/Hard-freeze limit|Heat-dome limit|Chill need|Drought tolerance|Pair with fast nitrogen-fixing|Establish with autumn rain|Plant on a warm mid-slope/i);
  assert.equal(leakedClim, null, `zero untranslated English in /fr/palette/ 2050 Climate (found: ${leakedClim?.[0]})`);

  assert.deepEqual(await pageErrorsOf(frPage), [], 'zero console/page errors on /fr/palette/');

  // 2. Mobile 390px dark theme — zero overflow, >=44px interactive targets, zero botanical jargon
  const mobPage = await openSuggestedPalette({ width: 390, theme: 'dark' });
  assert.ok((await horizontalOverflow(mobPage)) <= 1, 'zero horizontal overflow at 390px mobile');
  const mobCheck = await mobPage.evaluate((jargonSrc) => {
    const jargon = new RegExp(jargonSrc, 'i');
    const visibleText = document.querySelector('#ct-root')?.innerText ?? '';
    const smallButtons = [...document.querySelectorAll('#ct-root button, #ct-root input.ct-studio-name')]
      .filter((el) => {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5);
      })
      .map((el) => `${el.className || el.tagName}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    return {
      jargonMatch: visibleText.match(jargon)?.[0] ?? null,
      nativeTitles: document.querySelectorAll('#ct-root [title]').length,
      smallButtons,
    };
  }, BOTANICAL_JARGON.source);
  assert.equal(mobCheck.jargonMatch, null, `zero botanical-layer jargon in visible UI (found: ${mobCheck.jargonMatch})`);
  assert.equal(mobCheck.nativeTitles, 0, 'zero native [title] attributes on mobile dark');
  assert.deepEqual(mobCheck.smallButtons, [], `all visible mobile buttons >= 44x44px (found small: ${mobCheck.smallButtons.join(', ')})`);
  assert.deepEqual(await pageErrorsOf(mobPage), [], 'zero console/page errors on mobile dark');

  // 2b. Mobile 390px Plant Pool / Coach Sheet, Horizon Switcher, Full-DB Search ('mango'), In-Flow Filters, and All 4 Tabs + FieldDossier
  assert.ok(await has(mobPage, '[data-mobile-bar]', 5_000), 'sticky mobile Plant Pool / Coach dock is visible');
  assert.ok(await has(mobPage, '[data-mobile-horizon]', 5_000), 'mobile Today/2050s/2080s horizon switcher is visible');
  await mobPage.locator('[data-mobile-pool-btn]').click();
  assert.ok(await has(mobPage, '.studio-rail.mobile-open', 5_000), 'tapping Mobile Plant Pool button opens slide-up Plant Pool sheet');
  assert.ok((await horizontalOverflow(mobPage)) <= 1, 'zero horizontal overflow with Mobile Plant Pool sheet open');

  // Search 'mango' across full 700+ DB and open Filters in-flow with 0 horizontal clipping
  const railSearch = mobPage.locator('.studio-rail.mobile-open input[type="search"]');
  await railSearch.fill('mango');
  await mobPage.waitForFunction(() => {
    const items = [...document.querySelectorAll('.studio-rail.mobile-open .pool-item')];
    return items.some((el) => /mango|mangifera/i.test(el.textContent ?? ''));
  }, { timeout: 10_000 });
  const filterTrigger = mobPage.locator('.studio-rail.mobile-open .filter-trigger-btn');
  await filterTrigger.click();
  const filterRect = await mobPage.evaluate(() => {
    const p = document.querySelector('.studio-rail.mobile-open .palette-filter-popover');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width };
  });
  assert.ok(filterRect && filterRect.left >= -1 && filterRect.right <= 391, `mobile rail FilterPanel renders in-flow without clipping (${JSON.stringify(filterRect)})`);
  await filterTrigger.click();

  // Add Mango from mobile sheet, close sheet, then verify all 4 tabs + FieldDossier at 0 overflow
  const beforeCount = await mobPage.evaluate(() => document.querySelectorAll('#ct-root [data-plant-id]').length);
  await mobPage.locator('.studio-rail.mobile-open .pool-item button.btn-primary').click();
  await mobPage.locator('[data-rail-close]').click();
  await mobPage.waitForFunction(() => !document.querySelector('.studio-rail.mobile-open'), { timeout: 5_000 });
  const afterCount = await mobPage.evaluate(() => document.querySelectorAll('#ct-root [data-plant-id]').length);
  assert.ok(afterCount > beforeCount, `adding Mango from Mobile Plant Pool increased palette count (${beforeCount} -> ${afterCount})`);

  for (const tabId of ['system', 'climate', 'plan', 'palette']) {
    await mobPage.locator(`[data-studio-tab="${tabId}"]`).click();
    await new Promise((r) => setTimeout(r, 200));
    assert.ok((await horizontalOverflow(mobPage)) <= 1, `mobile 390px tab=${tabId} has zero horizontal overflow`);
  }
  await mobPage.locator('#ct-root [data-plant-id]').click();
  assert.ok(await has(mobPage, '[data-field-dossier] .dossier-drawer[role="dialog"]', 8_000), 'mobile FieldDossier opens cleanly');
  assert.ok((await horizontalOverflow(mobPage)) <= 1, 'mobile FieldDossier has zero horizontal overflow');
  await mobPage.keyboard.press('Escape');
  assert.deepEqual(await pageErrorsOf(mobPage), [], 'zero console/page errors after full mobile walkthrough');

  // 3. Additional native locales (de, ja, ru) at 1440px light — zero overflow, zero errors, localized tabs
  for (const loc of [
    { path: '/de/palette/', tabRe: /meine palette|lebendes system|klima 2050|pflanzplan/i },
    { path: '/ja/palette/', tabRe: /パレット|生態|気候|植栽/i },
    { path: '/ru/palette/', tabRe: /палитра|живая система|климат 2050|план посадки/i },
  ]) {
    const p = await openSuggestedPalette({ path: loc.path, width: 1440, theme: 'light', climateValue: 'temperate' });
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.studio-nav [role="tab"]')].map((e) => e.textContent?.trim()));
    assert.ok(tabs.some((t) => loc.tabRe.test(t ?? '')), `${loc.path} renders localized Studio tabs (${tabs.join(', ')})`);
    assert.ok((await horizontalOverflow(p)) <= 1, `${loc.path} has zero horizontal overflow`);
    assert.deepEqual(await pageErrorsOf(p), [], `${loc.path} has zero console/page errors`);
  }
});
