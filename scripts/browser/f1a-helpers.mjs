// Shared steps of the F1a scenario specs (scripts/browser/consortium-f1a-*.browser.test.mjs; F1a commit 0,
// main's file in every chunk). One reader's path to a consortium: a site, the climate chosen, then the
// primary action (Suggest) pressed as a reader would.
import assert from 'node:assert/strict';
import { suggestReady } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { lookupAt } from './location-fixtures.mjs';

// The location the climate reader gives at these coordinates, set on the store as the location step would.
export async function siteAt(page, [lat, lon], label) {
  const lookup = await lookupAt(lat, lon);
  await page.evaluate((loc) => { window.__ctTest.store.location.value = loc; }, { lat, lon, source: 'map', label, lookup });
  return lookup;
}

// On an open page: the climate chosen, its pool read, Suggest pressed and plants placed.
export async function suggestOn(page, zone, label = zone) {
  await choose(page, zone);
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), `Suggest placed plants (${label})`);
  return page;
}

// A new page at a site (a p5-helpers SITES key, [lat, lon] coordinates, or none), then suggestOn.
export async function suggestedAt(site, zone, opts = {}) {
  const page = await tool(opts);
  if (Array.isArray(site)) await siteAt(page, site, zone);
  else if (site) await atSite(page, site);
  return suggestOn(page, zone);
}
