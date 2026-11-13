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

// The screen-reader proxy of the F1a scenarios (A25; a11y1 may move it onto its CDP live-region log,
// scripts/browser/live-regions.mjs): every live region ([role=status], [role=alert], [aria-live]) added
// to the page with its text already in it (a screen reader may never read a message that arrives with
// its region), and every line a live region says: its text when it changes, on a region element new or
// already there. Each entry is tagged with the reader's event it belongs to (the toast shown and the
// sheet opened, from the test hook), so the same line said again for a new toast or a new opening is a
// new announcement, never a repeat. Pass as tool()'s setup; read with liveLog, clear with resetLive.
export const watchLiveRegions = async (pg) => pg.evaluateOnNewDocument(() => {
  const LIVE = '[role="status"], [role="alert"], [aria-live]';
  const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const last = new WeakMap();
  const event = () => { const s = window.__ctTest?.store; return s ? `toast ${s.toast.value?.id ?? '-'} sheet ${s.sheet.value?.n ?? '-'}` : 'boot'; };
  window.__live = { inserted: [], said: [] };
  new MutationObserver((records) => {
    const touched = new Set();
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!(n instanceof Element)) continue;
        for (const el of [n, ...n.querySelectorAll(LIVE)].filter((e) => e.matches(LIVE))) if (text(el)) window.__live.inserted.push(text(el).slice(0, 80));
      }
      const region = (r.target instanceof Element ? r.target : r.target.parentElement)?.closest(LIVE);
      if (region) touched.add(region);
    }
    for (const el of touched) {
      const t = text(el);
      if (t && last.get(el) !== t) window.__live.said.push({ event: event(), text: t });
      last.set(el, t);
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
});
export const liveLog = (page) => page.evaluate(() => window.__live);
export const resetLive = (page) => page.evaluate(() => { window.__live = { inserted: [], said: [] }; });
// The lines said more than once within one reader's event.
export const saidTwice = (said) => said.filter((s, i) => said.findIndex((x) => x.event === s.event && x.text === s.text) !== i).map((s) => `${s.event}: ${s.text.slice(0, 60)}`);
