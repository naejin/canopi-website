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

test('Onboarding: SiteTuner collapsed by default, Planting Area controls, and Path A/B @real-data', async () => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light' });
  assert.equal(await loadState(page), 'ready');

  // Pick a climate zone so SiteTuner & Planting Area render
  await openCards(page);
  await page.locator(aria('radio', 'Temperate')).click();
  assert.ok(await has(page, '[data-area-step]', 6_000), 'Planting Area step renders');

  // SiteTuner starts collapsed behind <details class="tuner-details" data-microclimate>
  const advBefore = await page.evaluate(() => {
    const d = document.querySelector('details.tuner-details[data-microclimate]');
    return d ? { exists: true, open: d.open, summary: d.querySelector('summary')?.textContent?.trim() ?? '' } : { exists: false };
  });
  assert.ok(advBefore.exists, 'SiteTuner disclosure exists');
  assert.equal(advBefore.open, false, 'SiteTuner is collapsed by default');
  assert.match(advBefore.summary, /tune|climate|microclimate/i);

  const areaInfo = await page.evaluate(() => {
    const unitBtns = [...document.querySelectorAll('[data-area-step] .ink-seg-btn')].map((b) => b.textContent?.trim());
    const hasSuggest = !!document.querySelector('[data-place-suggest]') || [...document.querySelectorAll('#ct-root button')].some((el) => /suggest/i.test(el.textContent ?? ''));
    return { unitBtns, hasSuggest, text: document.querySelector('#ct-root')?.textContent ?? '' };
  });
  assert.ok(areaInfo.unitBtns.length >= 4, 'area unit selector provides m² | ha | ft² | ac pills');
  assert.ok(areaInfo.hasSuggest, 'Path A suggest control is available');
  assert.match(areaInfo.text, /net/i, 'net planting area readout is visible');
});

test('Onboarding: Location postcard (hairline rows, SiteTuner Microclimate, ODbL 1.0) and #v=5 shareable link restore @real-data', async () => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light', nominatim: 'fixture' });
  assert.equal(await loadState(page), 'ready');

  // Search for Lyon via Nominatim fixture (single result auto-selects and renders SitePostcard)
  const searchInput = await page.waitForSelector('#ct-root input[data-location-search]', { timeout: 6_000 });
  await searchInput.type('Lyon');
  await page.keyboard.press('Enter');

  assert.ok(await has(page, '[data-site-postcard]', 12_000), 'SitePostcard renders after location lookup');
  const postcard = await page.evaluate(() => {
    const card = document.querySelector('[data-site-postcard]');
    return {
      rows: card?.querySelectorAll('.ob-force-row').length ?? 0,
      hasTuner: !!document.querySelector('[data-site-tuner]'),
      hasMicro: !!document.querySelector('details.tuner-details[data-microclimate]'),
      hasOdbl: /ODbL|OpenStreetMap/i.test(document.querySelector('#ct-root')?.textContent ?? ''),
      hasDuplicateWeRead: !!document.querySelector('[data-place-read]'),
    };
  });
  assert.ok(postcard.rows >= 3, 'SitePostcard shows at least 3 data rows');
  assert.ok(postcard.hasTuner, 'SiteTuner renders alongside SitePostcard');
  assert.ok(postcard.hasMicro, 'Microclimate slope/aspect/landform controls render inside SiteTuner');
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
