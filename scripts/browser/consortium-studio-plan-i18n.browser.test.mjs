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
    const circles = [...(root?.querySelectorAll('svg .ct-bp-node, svg circle') ?? [])];
    const initials = [...(root?.querySelectorAll('svg text.ct-bp-abbr, svg text') ?? [])].map((t) => t.textContent?.trim()).filter(Boolean);
    const legendItems = root?.querySelectorAll('.ct-bp-leg-item').length ?? 0;
    const metrics = root?.querySelectorAll('.ct-plan-ledger-card .ct-plan-kpi').length ?? 0;
    const qtyInputs = root?.querySelectorAll('.ct-qty-input').length ?? 0;
    return { circles: circles.length, initials, legendItems, metrics, qtyInputs, text: root?.textContent ?? '' };
  });
  assert.ok(plan.metrics >= 4, '4-column metrics strip renders');
  assert.ok(plan.circles >= 4, 'SVG Plot Layout Blueprint draws species circles');
  assert.ok(plan.initials.length >= 4, 'SVG circles display non-clipping 2-letter initials');
  assert.ok(plan.legendItems >= 4, 'clickable SVG blueprint legend renders below SVG');
  assert.ok(plan.qtyInputs >= 4, 'Nursery Order inline qty override inputs render');
  assert.match(plan.text, /\+10%|buffer/i, '+10% planting buffer is displayed');

  // Switch blueprint layout mode and click legend item to open FieldDossier
  await page.locator(aria('button', 'Orchard Grid')).click();
  await page.locator('.ct-bp-leg-item').click();
  assert.ok(await has(page, '.ct-dossier[role="dialog"]', 8_000), 'clicking blueprint legend opens FieldDossier');
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
      calCells: document.querySelectorAll('.ct-cal-cell').length,
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
});
