// Field Studio browser tests — StudioHeader, My Palette & FieldDossier (Screen 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, has, useHarness } from './helpers.mjs';
import { openSuggestedPalette, pageErrorsOf } from './studio-helpers.mjs';

useHarness();

test('StudioHeader: editable design name, location badge, Open/Save menus, dirty ochre Save, Request modal, horizon & Health Ribbon, zero legacy chrome @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Zero legacy duplicate chrome above or below StudioHeader
  const chrome = await page.evaluate(() => {
    const head = document.querySelector('#ct-head');
    const headHidden = !head || getComputedStyle(head).display === 'none';
    const resultHead = document.querySelector('.ct-result-head');
    const resultHeadHidden = !resultHead || getComputedStyle(resultHead).display === 'none';
    return {
      headHidden,
      resultHeadHidden,
      hasLegacyFoot: !!document.querySelector('.ct-palette-foot'),
      hasLegacyBody: !!document.querySelector('.ct-palette-body'),
      hasRibbon: !!document.querySelector('[data-health-ribbon]'),
      hasLocBadge: !!document.querySelector('[data-studio-location]'),
      horizonBtns: document.querySelectorAll('.studio-nav-bar .ink-seg .ink-seg-btn').length,
      tabs: [...document.querySelectorAll('.studio-nav [role="tab"]')].map((el) => el.textContent?.trim()),
    };
  });
  assert.equal(chrome.headHidden, true, 'legacy #ct-head hero is hidden on palette step');
  assert.equal(chrome.resultHeadHidden, true, 'legacy .ct-result-head bar is hidden');
  assert.equal(chrome.hasLegacyFoot, false, 'legacy footBlock is retired from My Palette DOM');
  assert.equal(chrome.hasLegacyBody, false, 'legacy PP-C body is retired from My Palette DOM');
  assert.equal(chrome.hasRibbon, true, 'Health Ribbon renders');
  assert.equal(chrome.hasLocBadge, true, 'location badge renders');
  assert.equal(chrome.horizonBtns, 3, 'Today | 2050s | 2080s horizon buttons render');
  assert.equal(chrome.tabs.length, 4, '4 studio tabs render');

  // Edit design name -> Save button turns dirty (ochre)
  const nameInput = await page.waitForSelector('input.doc-title-btn');
  await nameInput.click({ clickCount: 3 });
  await nameInput.type('Hillside Orchard');
  const saveDirty = await page.evaluate(() => {
    const btn = document.querySelector('[data-studio-save]');
    return btn ? btn.classList.contains('is-dirty') : false;
  });
  assert.equal(saveDirty, true, 'Save control turns dirty ochre after editing design name');

  // Open Request a plant modal from Open .canopi menu and close with Escape
  await page.locator('.tb-menu.desktop-only .doc-action-btn').click();
  await page.locator('.tb-menu-panel .tb-menu-item:nth-child(3)').click();
  assert.ok(await has(page, 'dialog[open]', 4_000), 'Request a plant modal opens');
  await page.keyboard.press('Escape');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});

test('My Palette: 3-layer cards, 12-month sparkline, Cards/Compact List toggle, shared Filters popover, and Coach/All Plants rail @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  const initialCards = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('article.plant-card[data-plant-id]')];
    const sparks = document.querySelectorAll('.plant-card .mini-spark').length;
    const rawHeights = cards.map((c) => c.textContent ?? '').filter((t) => /\?\s*[–-]|\d+\.\d{2,}\s*m/.test(t));
    return { count: cards.length, sparks, rawHeights };
  });
  assert.ok(initialCards.count >= 4, 'suggested palette renders multiple species cards');
  assert.equal(initialCards.sparks, initialCards.count, 'each card includes a 12-month sparkline');
  assert.deepEqual(initialCards.rawHeights, [], 'no unrounded decimals or ?–X m heights on cards');

  // Toggle Cards -> Compact List -> Cards
  await page.locator(aria('button', 'Compact List')).click();
  assert.ok(await has(page, 'tr[data-plant-id]', 4_000), 'Compact List renders table rows with data-plant-id');
  await page.locator(aria('button', 'Cards')).click();
  assert.ok(await has(page, 'article.plant-card[data-plant-id]', 4_000), 'Cards view restores');

  // Open shared Filters popover and inspect filters
  await page.locator('[data-filter-trigger]').click();
  assert.ok(await has(page, '[data-filter-popover]', 4_000), 'Filters popover opens');
  const filterText = await page.evaluate(() => document.querySelector('[data-filter-popover]')?.textContent ?? '');
  assert.match(filterText, /Full sun/i);
  assert.match(filterText, /Low chill/i);
  await page.keyboard.press('Escape');

  // Switch StudioRail from Coach to All Plants and search
  await page.locator('[data-studio-rail] .ink-seg .ink-seg-btn:nth-child(2)').click();
  assert.ok(await has(page, '[data-studio-rail] input', 4_000), 'All Plants rail search renders');
  const railBadges = await page.evaluate(() => document.querySelector('[data-studio-rail]')?.textContent ?? '');
  assert.match(railBadges, /In palette|\+ Add/i, 'All Plants rail shows membership status and + Add');
});

test('FieldDossier: 1-click drawer, photo plate, Prev/Next navigation, Escape close, pH & temp tracks, hairline ledger, photoperiod calendar @real-data', async () => {
  const page = await openSuggestedPalette({ width: 1280, theme: 'light' });

  // Click first species card Dossier button to open FieldDossier
  const firstTrigger = await page.waitForSelector('article.plant-card[data-plant-id] .pc-actions button.link-btn');
  await firstTrigger.click();
  assert.ok(await has(page, '[data-field-dossier] .dossier-drawer[role="dialog"]', 8_000), 'FieldDossier slide-over drawer opens');

  const dossier1 = await page.evaluate(() => ({
    title: document.querySelector('#ct-dossier-title')?.textContent?.trim() ?? '',
    hasPlate: !!document.querySelector('[data-dossier-plate], [data-dossier-plate-empty]'),
    tracks: document.querySelectorAll('.dossier-drawer .gauge-track').length,
    ledgerRows: document.querySelectorAll('.dossier-drawer .d-spec-row').length,
    hasCalendar: !!document.querySelector('[data-dossier-calendar]'),
    singleRowNav: (() => {
      const btns = [...document.querySelectorAll('.dossier-nav-bar button')];
      if (btns.length < 2) return true;
      const top0 = btns[0].getBoundingClientRect().top;
      return btns.every((b) => Math.abs(b.getBoundingClientRect().top - top0) < 6);
    })(),
  }));
  assert.ok(dossier1.title.length > 0, 'dossier displays species title');
  assert.equal(dossier1.hasPlate, true, 'dossier displays botanical photo plate or placeholder');
  assert.ok(dossier1.tracks >= 2, 'dossier displays pH and cold/heat tracks');
  assert.ok(dossier1.ledgerRows >= 5, 'dossier displays hairline trait ledger');
  assert.ok(dossier1.hasCalendar, 'dossier displays 12-month seasonal activity');
  assert.equal(dossier1.singleRowNav, true, 'FieldDossier header controls stay single-row on desktop');

  // Step Next -> title changes, then Escape closes drawer
  await page.locator(aria('button', 'Next →')).click();
  const title2 = await page.evaluate(() => document.querySelector('#ct-dossier-title')?.textContent?.trim() ?? '');
  assert.notEqual(title2, dossier1.title, 'Next button advances FieldDossier to next species');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-field-dossier] .dossier-drawer[role="dialog"]'), { timeout: 4_000 });
});
