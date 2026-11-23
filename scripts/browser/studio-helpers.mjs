// Shared helpers for the Field Studio browser specs (Phase 3 Plant Palette Redesign).
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { aria, en, h, has } from './helpers.mjs';
import { openCards } from './location-fixtures.mjs';

export const BOTANICAL_JARGON = /\b(canopy|understory|ground cover|shrub layer|herbaceous|climber|strata|stratum)\b/i;

export async function openSuggestedPalette(opts = {}) {
  const { path = '/palette/', width = 1280, theme = 'light', climate = 'Temperate', suggestLabel = en['consortium.start.suggest'] ?? 'Suggest plants', hook = false, nominatim = null } = opts;
  const page = await h.open(path, { width, theme, hook, nominatim });
  assert.equal(await loadState(page), 'ready', 'tool loads ready');
  await openCards(page);
  await page.locator(aria('radio', climate)).click();
  await page.locator(aria('button', suggestLabel)).click();
  assert.ok(await has(page, '[data-studio-header]', 15_000), 'StudioHeader renders');
  assert.ok(await has(page, '#ct-root [data-plant-id]', 15_000), 'suggested species render');
  return page;
}

export async function clickStudioTab(page, tabName) {
  await page.locator(aria('tab', tabName)).click();
}

export async function pageErrorsOf(page) {
  return page.trace.console.filter((c) => c.type === 'error' || c.type === 'pageerror');
}

export async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
