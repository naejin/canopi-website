// North Star Plant Palette browser tests — Plan Surface, Dark Theme, Mobile 390px Tap Targets & /fr/ i18n.
import test from 'node:test';
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { clickNth, closeDrawerWithEscape, horizontalOverflow, openArrival, openSuggestedPalette, pageErrorsOf, PFAF_PATTERN, RAW_TECH_PATTERN } from './studio-helpers.mjs';

useHarness();

test('Plan Surface: Crown-Area Budget, Plot Area input, Harvest Timeline, Nursery Checklist, and Dark Theme @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'dark' });

  // Switch to Plan surface
  await clickNth(page, '.studio-left .seg button', 1);
  assert.ok(await has(page, '.budget-bar[role="progressbar"]', 8_000), 'Crown-area budget progressbar renders');

  const planInfo = await page.evaluate(() => ({
    hasAriaLabel: !!document.querySelector('.budget-bar[role="progressbar"]')?.getAttribute('aria-label'),
    timelineCols: document.querySelectorAll('.tl-stage').length,
    nurseryItems: document.querySelectorAll('.nursery-item').length,
    hasPlotInput: !!document.querySelector('#plot-m2'),
    text: document.querySelector('main')?.innerText ?? '',
  }));
  assert.ok(planInfo.hasAriaLabel, 'budget progressbar has accessible aria-label');
  assert.equal(planInfo.timelineCols, 3, '3 harvest timeline columns (Year 1 -> 5 -> 15) render');
  assert.ok(planInfo.nurseryItems >= 4, `nursery checklist lists palette species (got ${planInfo.nurseryItems})`);
  assert.ok(planInfo.hasPlotInput, 'plot area number input renders');
  assert.ok(!PFAF_PATTERN.test(planInfo.text), 'zero PFAF on Plan surface');

  // Check off first nursery checklist item
  await clickNth(page, '.nursery-check', 0);
  const checked = await page.evaluate(() => (document.querySelector('.nursery-check'))?.checked ?? false);
  assert.equal(checked, true, 'nursery checklist checkbox toggles to checked=true');

  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Dark Plan');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Dark Plan');
});

test('Mobile 390x844: zero overflow and all interactive controls >= 44px across Design, Atlas, Picker, and Plan @real-data', async () => {
  const page = await openSuggestedPalette({ width: 390, theme: 'light' });
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Mobile Design');

  const smallDesign = await page.evaluate(() => {
    const sels = ['.place-pill', '.studio-left .seg button', '.mobile-fab', '.btn-ghost', '.rm-btn'];
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

  // Mobile Atlas via Your land drawer -> Climate & guild atlas button
  await clickNth(page, '.place-pill', 0);
  assert.ok(await has(page, '.land-panel[role="dialog"]', 4_000), 'Mobile Your land drawer opens');
  await clickNth(page, '.land-drawer-foot .btn-ghost', 0);
  assert.ok(await has(page, '.drawer .scen-row', 8_000), 'Mobile Atlas renders scenario rows');
  const smallAtlas = await page.evaluate(() =>
    [...document.querySelectorAll('.drawer .scen-row')]
      .map((el) => Number(el.getBoundingClientRect().height.toFixed(1)))
      .filter((h) => h > 0 && h < 43.9),
  );
  assert.deepEqual(smallAtlas, [], 'Mobile Atlas .scen-row >= 44px');
  await closeDrawerWithEscape(page);

  // Mobile Picker via .mobile-fab
  await clickNth(page, '.mobile-fab', 0);
  assert.ok(await has(page, '.drawer #picker-sort', 8_000), 'Mobile Picker renders sort select');
  const pickerSelectH = await page.evaluate(() => Number(document.querySelector('.drawer #picker-sort')?.getBoundingClientRect().height.toFixed(1) ?? 0));
  assert.ok(pickerSelectH >= 43.9, `Mobile Picker sort select >= 44px (got ${pickerSelectH})`);
  await closeDrawerWithEscape(page);

  // Mobile Plan plot input >= 44px
  await clickNth(page, '.studio-left .seg button', 1);
  assert.ok(await has(page, '#plot-m2', 8_000), 'Mobile Plan renders plot input');
  const plotInputH = await page.evaluate(() => Number(document.querySelector('#plot-m2')?.getBoundingClientRect().height.toFixed(1) ?? 0));
  assert.ok(plotInputH >= 43.9, `Mobile Plan plot input >= 44px (got ${plotInputH})`);
  assert.ok((await horizontalOverflow(page)) <= 1, 'zero horizontal overflow on Mobile Plan');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on Mobile');
});

test('i18n (/fr/palette/): zero English leaks, zero PFAF, zero KTMPR across Design, Atlas, and Dossier @real-data', async () => {
  const page = await openSuggestedPalette({ path: '/fr/palette/', width: 1280, theme: 'light' });
  const designText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');

  await clickNth(page, '.studio-right .bar-btn:not(.bar-btn-add)', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'FR Atlas opens');
  const atlasText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  await closeDrawerWithEscape(page);

  await clickNth(page, '.plant-row .plant-open', 0);
  assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), 'FR Dossier opens');
  const dossierText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
  await closeDrawerWithEscape(page);

  const combined = `${designText}\n${atlasText}\n${dossierText}`;
  const FR_FORBIDDEN = [/\bToday\b/, /what-if/i, /middle road/i, /\bmm\/yr\b/, /Your site/, PFAF_PATTERN, RAW_TECH_PATTERN];
  for (const re of FR_FORBIDDEN) {
    assert.ok(!re.test(combined), `/fr/palette/ must not leak ${re}`);
  }
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors on /fr/palette/');
});

async function setSoilTexture(page, tex) {
  await page.evaluate((nextTex) => {
    const loc = window.__ctTest.store.location.value;
    if (!loc?.lookup?.soil) return;
    window.__ctTest.store.location.value = {
      ...loc,
      lookup: { ...loc.lookup, soil: { ...loc.lookup.soil, texture: nextTex } },
    };
  }, tex);
}

async function clearFieldWithBackspace(page, sel) {
  await page.click(sel);
  await page.evaluate((s) => { document.querySelector(s)?.select(); }, sel);
  await page.keyboard.press('Backspace');
}

test('Wave 7.2: localized soil textures (zero snake_case, unknown on null) across Arrival, Land Panel, Atlas, and Plan in en/fr/ru @real-data', async () => {
  const cases = [
    { path: '/palette/', expectedTex: 'silty clay loam', expectedUnknown: 'Unknown' },
    { path: '/fr/palette/', expectedTex: 'limon argilo-silteux', expectedUnknown: 'Inconnu' },
    { path: '/ru/palette/', expectedTex: 'пылеватый глинистый суглинок', expectedUnknown: 'Неизвестно' },
  ];

  for (const { path, expectedTex, expectedUnknown } of cases) {
    const page = await openArrival({ path, width: 390, theme: 'light', hook: true });

    // Force silty_clay_loam on current location
    await setSoilTexture(page, 'silty_clay_loam');
    await page.waitForFunction(
      (exp) => (document.querySelector('.arrival-metrics')?.innerText ?? '').includes(exp),
      { timeout: 5_000 },
      expectedTex,
    );
    const arrivalText = await page.evaluate(() => document.querySelector('.arrival-metrics')?.innerText ?? '');
    assert.ok(!arrivalText.includes('silty_clay_loam'), `${path} Arrival must not leak raw silty_clay_loam`);
    assert.ok(arrivalText.includes(expectedTex), `${path} Arrival renders localized "${expectedTex}"`);

    // Open Studio -> Your land -> Atlas -> Plan
    await clickNth(page, '.arrival-card .btn-primary:not([disabled])', 0);
    assert.ok(await has(page, '.studio-shell', 15_000), `${path} Studio renders`);

    await clickNth(page, '.place-pill', 0);
    assert.ok(await has(page, '.land-panel[role="dialog"]', 5_000), `${path} Land panel opens`);
    const landText = await page.evaluate(() => document.querySelector('.land-panel')?.innerText ?? '');
    assert.ok(!landText.includes('silty_clay_loam'), `${path} Land panel must not leak raw silty_clay_loam`);
    assert.ok(landText.includes(expectedTex), `${path} Land panel renders localized "${expectedTex}"`);

    // Open Atlas from Land panel footer
    await clickNth(page, '.land-drawer-foot .btn-ghost', 0);
    assert.ok(await has(page, '.drawer[role="dialog"]', 8_000), `${path} Atlas opens`);
    const atlasText = await page.evaluate(() => document.querySelector('.drawer')?.innerText ?? '');
    assert.ok(!atlasText.includes('silty_clay_loam'), `${path} Atlas must not leak raw silty_clay_loam`);
    assert.ok(atlasText.includes(expectedTex), `${path} Atlas renders localized "${expectedTex}"`);
    await closeDrawerWithEscape(page);

    // Switch to Plan surface
    await clickNth(page, '.studio-left .seg button', 1);
    assert.ok(await has(page, '.budget-bar[role="progressbar"]', 8_000), `${path} Plan renders`);
    const planText = await page.evaluate(() => document.querySelector('main')?.innerText ?? '');
    assert.ok(!planText.includes('silty_clay_loam'), `${path} Plan must not leak raw silty_clay_loam`);
    assert.ok(planText.includes(expectedTex), `${path} Plan renders localized "${expectedTex}"`);

    // Force null soil texture -> must render localized Unknown (never fake 'loam')
    await setSoilTexture(page, null);
    await page.waitForFunction(
      (unk) => (document.querySelector('main')?.innerText ?? '').includes(unk),
      { timeout: 5_000 },
      expectedUnknown,
    );
    assert.deepEqual(await pageErrorsOf(page), [], `${path} zero console/page errors`);
  }
});

test('Wave 7.2: NumericField editing (clear, decimal comma, clamp notice, Escape, Reset) on 1440px en and 390px fr @real-data', async () => {
  for (const cfg of [
    { path: '/palette/', width: 1440, decimalInput: '-12.5' },
    { path: '/fr/palette/', width: 390, decimalInput: '-12,5' },
  ]) {
    const page = await openSuggestedPalette({ path: cfg.path, width: cfg.width, theme: 'light' });
    await clickNth(page, '.place-pill', 0);
    assert.ok(await has(page, '.land-panel[role="dialog"]', 5_000), `${cfg.path} Land panel opens`);

    // Expand Climate & microclimate details to expose elev/slope/freeze/heat/cdd
    await clickNth(page, '.land-panel .tune-details summary', 1);
    assert.ok(await has(page, '#freeze-input', 5_000), `${cfg.path} #freeze-input visible`);

    // Check input type & inputMode per field
    const modes = await page.evaluate(() => ({
      plotType: document.querySelector('#land-plot-m2')?.getAttribute('type'),
      plotMode: document.querySelector('#land-plot-m2')?.getAttribute('inputmode'),
      freezeType: document.querySelector('#freeze-input')?.getAttribute('type'),
      freezeMode: document.querySelector('#freeze-input')?.getAttribute('inputmode'),
      heatMode: document.querySelector('#heat-input')?.getAttribute('inputmode'),
      elevMode: document.querySelector('#elev-input')?.getAttribute('inputmode'),
    }));
    assert.equal(modes.plotType, 'text', 'plot input is type=text');
    assert.equal(modes.plotMode, 'numeric', 'plot input has inputMode=numeric');
    assert.equal(modes.freezeType, 'text', 'freeze input is type=text');
    assert.equal(modes.freezeMode, null, 'freeze input omits inputMode so iOS keeps minus key');
    assert.equal(modes.heatMode, 'decimal', 'heat input has inputMode=decimal');
    assert.equal(modes.elevMode, null, 'elev input omits inputMode so iOS keeps minus key for below-sea-level sites');

    // Clear #freeze-input with select + Backspace -> stays empty with zero snap-back
    const origFreeze = await page.evaluate(() => document.querySelector('#freeze-input')?.value ?? '');
    await clearFieldWithBackspace(page, '#freeze-input');
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), '', 'freeze stays empty while focused');

    // Type "-" then full decimal (-12.5 or -12,5) and press Enter
    await page.keyboard.type('-');
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), '-', 'minus sign does not snap back');
    await page.keyboard.type(cfg.decimalInput.slice(1));
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), '-12.5', 'freeze commits -12.5');

    // Escape cancels draft without closing Land panel
    await clearFieldWithBackspace(page, '#freeze-input');
    await page.keyboard.type('-3');
    await page.keyboard.press('Escape');
    assert.ok(await has(page, '.land-panel[role="dialog"]', 2_000), 'Escape cancels draft without closing Land panel');
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), '-12.5', 'Escape restores committed value');

    // Clamping on blur announces used value
    await clearFieldWithBackspace(page, '#freeze-input');
    await page.keyboard.type('-99');
    await page.evaluate(() => document.querySelector('#freeze-input')?.blur());
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), '-40', 'out-of-range freeze clamps to -40');
    assert.ok(await has(page, '[data-clamp-note="freeze-input"]', 2_000), 'clamp status note renders');

    // Clearing optional freeze and blurring restores map default
    await clearFieldWithBackspace(page, '#freeze-input');
    await page.evaluate(() => document.querySelector('#freeze-input')?.blur());
    assert.equal(await page.evaluate(() => document.querySelector('#freeze-input')?.value), origFreeze, 'empty optional blur restores map default');

    // Plot area: type "5" -> "0" -> "0" with no jump at "5"
    await clearFieldWithBackspace(page, '#land-plot-m2');
    await page.keyboard.type('5');
    assert.equal(await page.evaluate(() => document.querySelector('#land-plot-m2')?.value), '5', 'plot stays "5" mid-typing without clamping to 20');
    await page.keyboard.type('00');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.querySelector('#land-plot-m2')?.value), '500', 'plot commits 500');

    assert.deepEqual(await pageErrorsOf(page), [], `${cfg.path} zero console/page errors`);
  }
});

test('Wave 7.3 regressions: FR Plan/Picker/Dossier i18n, empty filter state, 1,200 plot & 4150 m elevation @real-data', async () => {
  const page = await openSuggestedPalette({ path: '/fr/palette/', width: 1440, theme: 'light' });

  // 1. Empty palette filter shows message + Clear filter button (Lead #4)
  await page.click('#palette-filter');
  await page.keyboard.type('zzzznotaplant');
  await page.waitForFunction(() => document.querySelectorAll('.job-group').length === 0, { timeout: 3_000 });
  const emptyCardText = await page.evaluate(() => document.querySelector('.studio-main .arrival-card')?.textContent ?? '');
  assert.match(emptyCardText, /zzzznotaplant/, 'empty filter card echoes query');
  await page.click('.studio-main .arrival-card button');
  await page.waitForFunction(() => document.querySelectorAll('.job-group').length > 0, { timeout: 3_000 });

  // 2. Picker habit chips localized & active pill not raw "ground" (Lead #5)
  await page.click('.bar-btn-add');
  await page.waitForSelector('.drawer[role="dialog"]', { timeout: 5_000 });
  await page.evaluate(() => document.querySelector('.picker-controls .proto-btn')?.click());
  await page.waitForSelector('.picker-filter-panel', { timeout: 3_000 });
  const pickerPanelText = await page.evaluate(() => document.querySelector('.picker-filter-panel')?.textContent ?? '');
  assert.ok(!pickerPanelText.includes('Tree / Canopy') && !pickerPanelText.includes('Perennial / Herb'), 'FR picker habit chips localized');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer[role="dialog"]'), { timeout: 3_000 });

  // 3. Dossier correction link is /fr/contact/ (Lead #3)
  await page.click('.plant-row .plant-open');
  await page.waitForSelector('.drawer[role="dialog"]', { timeout: 5_000 });
  const contactHref = await page.evaluate(() => document.querySelector('.drawer a[href*="contact"]')?.getAttribute('href') ?? '');
  assert.equal(contactHref, '/fr/contact/', 'FR dossier correction link uses /fr/contact/');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer[role="dialog"]'), { timeout: 3_000 });

  // 4. Plan surface has 0 English leaks & honest copy (Lead #1)
  await page.evaluate(() => document.querySelectorAll('.studio-left .seg button')[1]?.click());
  await page.waitForSelector('.budget-bar[role="progressbar"]', { timeout: 5_000 });
  const planText = await page.evaluate(() => document.querySelector('.plan-grid')?.textContent ?? '');
  for (const enLeak of ['Honest crown-area budget', 'Site-prep & planting window', 'Checkmarks save on this device', 'Mobile-ready nursery pocket checklist', 'Wave 1 (']) {
    assert.ok(!planText.includes(enLeak), `FR Plan must not leak "${enLeak}"`);
  }
  assert.deepEqual(await pageErrorsOf(page), [], 'FR Wave 7.3 regression journey zero console/page errors');

  // 5. EN NumericField: "1,200" plot -> 1200 & elevation 4150 m accepted (R7)
  const enPage = await openSuggestedPalette({ path: '/palette/', width: 1440, theme: 'light' });
  await enPage.click('.place-pill');
  await enPage.waitForSelector('.land-panel[role="dialog"]', { timeout: 5_000 });
  await clearFieldWithBackspace(enPage, '#land-plot-m2');
  await enPage.keyboard.type('1,200');
  await enPage.keyboard.press('Enter');
  assert.equal(await enPage.evaluate(() => document.querySelector('#land-plot-m2')?.value), '1200', 'EN 1,200 parses as 1200');
  await enPage.evaluate(() => document.querySelectorAll('.land-panel .tune-details summary')[1]?.click());
  await enPage.waitForSelector('#elev-input', { timeout: 3_000 });
  await clearFieldWithBackspace(enPage, '#elev-input');
  await enPage.keyboard.type('4150');
  await enPage.keyboard.press('Enter');
  assert.equal(await enPage.evaluate(() => document.querySelector('#elev-input')?.value), '4150', 'elevation 4150 m accepted');

  assert.deepEqual(await pageErrorsOf(enPage), [], 'EN Wave 7.3 regression journey zero console/page errors');
});
