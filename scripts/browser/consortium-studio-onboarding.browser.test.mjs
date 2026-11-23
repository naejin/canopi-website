// Field Studio browser tests — Onboarding & Location Postcard (Screen 1 & 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { aria, h, has, useHarness } from './helpers.mjs';
import { openCards } from './location-fixtures.mjs';
import { openSuggestedPalette, pageErrorsOf } from './studio-helpers.mjs';

useHarness();

test('P1: SQLite-WASM loads real catalog & climate tiles, keeps Header.astro untouched and StudioHeader hidden on onboarding @real-data', async () => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light' });
  assert.equal(await loadState(page), 'ready', 'real catalog SQLite-WASM loads ready');

  const initial = await page.evaluate(() => ({
    hasHeader: !!document.querySelector('header.site-header, body > header'),
    hasStudioHeader: !!document.querySelector('[data-studio-header]'),
    hasPlaceStep: !!document.querySelector('.ct-place, [data-place-show], [data-place-climates]'),
    nativeTitles: document.querySelectorAll('#ct-root [title]').length,
  }));
  assert.ok(initial.hasHeader, 'site Header.astro is present');
  assert.equal(initial.hasStudioHeader, false, 'StudioHeader stays hidden on onboarding');
  assert.ok(initial.hasPlaceStep, 'onboarding place step is visible');
  assert.equal(initial.nativeTitles, 0, 'zero native title attributes on onboarding');
  assert.deepEqual(await pageErrorsOf(page), [], 'zero console/page errors');
});

test('Onboarding: PlaceFigures collapsed behind Advanced climate & soil overrides, Planting Area controls, and Path A/B @real-data', async () => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light' });
  assert.equal(await loadState(page), 'ready');

  // PlaceFigures starts collapsed behind <details class="ct-adv-figures">
  const advBefore = await page.evaluate(() => {
    const d = document.querySelector('details.ct-adv-figures');
    return d ? { exists: true, open: d.open, summary: d.querySelector('summary')?.textContent?.trim() ?? '' } : { exists: false };
  });
  assert.ok(advBefore.exists, 'advanced climate & soil overrides disclosure exists');
  assert.equal(advBefore.open, false, 'PlaceFigures is collapsed by default');
  assert.match(advBefore.summary, /Advanced climate/i);

  // Pick a climate zone and verify Planting Area controls (units, density, pathways, net area)
  await openCards(page);
  await page.locator(aria('radio', 'Temperate')).click();
  assert.ok(await has(page, '.ct-area-card, [data-area-step]', 6_000), 'Planting Area step renders');

  const areaInfo = await page.evaluate(() => {
    const unitSel = document.querySelector('.ct-area-select');
    const unitOptions = unitSel ? [...unitSel.querySelectorAll('option')].map((o) => o.value) : [];
    const hasOpenCanopi = [...document.querySelectorAll('#ct-root button, #ct-root label')].some((el) => /open\s+\.canopi/i.test(el.textContent ?? ''));
    const hasSuggest = !!document.querySelector('[data-place-suggest]') || [...document.querySelectorAll('#ct-root button')].some((el) => /suggest/i.test(el.textContent ?? ''));
    return { unitOptions, hasOpenCanopi, hasSuggest, text: document.querySelector('#ct-root')?.textContent ?? '' };
  });
  assert.ok(areaInfo.unitOptions.length >= 2, 'area unit selector provides multiple units');
  assert.ok(areaInfo.hasSuggest, 'Path A suggest control is available');
  assert.match(areaInfo.text, /net/i, 'net planting area readout is visible');
});

test('Onboarding: Location postcard (3 hairline rows, .field-tip, Microclimate Sliders, ODbL 1.0) and #v=5 shareable link restore @real-data', async () => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light', nominatim: 'fixture' });
  assert.equal(await loadState(page), 'ready');

  // Search for Lyon via Nominatim fixture (single result auto-selects and renders SitePostcard)
  const searchInput = await page.waitForSelector('#ct-root input[data-location-search]', { timeout: 6_000 });
  await searchInput.type('Lyon');
  await page.keyboard.press('Enter');

  assert.ok(await has(page, '[data-site-postcard], .ct-postcard', 12_000), 'SitePostcard renders after location lookup');
  const postcard = await page.evaluate(() => {
    const card = document.querySelector('[data-site-postcard], .ct-postcard');
    return {
      rows: card?.querySelectorAll('.ct-postcard-row, tr, dt').length ?? 0,
      tips: card?.querySelectorAll('.ct-tip-trigger').length ?? 0,
      hasMicro: !!document.querySelector('.ct-micro-field, [data-microclimate]'),
      hasOdbl: /ODbL|OpenStreetMap/i.test(document.querySelector('#ct-root')?.textContent ?? ''),
      hasDuplicateWeRead: !!document.querySelector('[data-place-read]'),
    };
  });
  assert.ok(postcard.rows >= 3, 'SitePostcard shows at least 3 data rows');
  assert.ok(postcard.tips >= 1, 'SitePostcard includes .field-tip triggers');
  assert.ok(postcard.hasMicro, 'Microclimate slope/aspect/landform controls render');
  assert.ok(postcard.hasOdbl, 'ODbL 1.0 / OpenStreetMap attribution is present');
  assert.equal(postcard.hasDuplicateWeRead, false, 'duplicate WeRead is suppressed when lookup postcard is active');

  // Verify #v=5 shareable link restore round-trip
  const palPage = await openSuggestedPalette({ width: 1280, theme: 'light', hook: true });
  const linkHash = await palPage.evaluate(() => {
    const { store, encodeLink } = window.__ctTest;
    return encodeLink ? encodeLink(store) : location.hash;
  });
  assert.ok(linkHash && linkHash.includes('v='), 'shareable link encodes palette state');
  const restored = await h.open(`/palette/${linkHash.startsWith('#') ? linkHash : `#${linkHash}`}`, { width: 1280, theme: 'light' });
  assert.equal(await loadState(restored), 'ready');
  assert.ok(await has(restored, '[data-studio-header], [data-place-notice="shared"]', 12_000), '#v=5 link restores palette or shared notice');
});
