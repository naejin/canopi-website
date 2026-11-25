// Shared helpers for the verbatim mockup-v73.html Plant Palette browser specs.
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, has } from './helpers.mjs';

export const PFAF_PATTERN = /\bPFAF\b|Plants For A Future/i;
export const RAW_TECH_PATTERN = /\bKTMPR\b|\(emergent\)|\(émergent\)|llm-knowledge/i;

export async function openArrival(opts = {}) {
  const { path = '/palette/', width = 1280, theme = 'light', hook = false, nominatim = null } = opts;
  const page = await h.open(path, { width, theme, hook, nominatim });
  assert.ok(await has(page, '.arrival-wrap', 20_000), 'North Star Arrival renders');
  assert.ok(await has(page, '.arrival-card .btn-primary:not([disabled])', 20_000), 'starter CTA enables');
  assert.equal(await loadState(page), 'ready', 'tool loads ready');
  return page;
}

export async function openSuggestedPalette(opts = {}) {
  const { presetIndex = null } = opts;
  const page = await openArrival(opts);
  if (typeof presetIndex === 'number') {
    await page.evaluate((idx) => {
      const pills = document.querySelectorAll('.sample-strip .sample-chip');
      if (pills[idx]) pills[idx].click();
    }, presetIndex);
    await page.waitForSelector('.arrival-card .btn-primary:not([disabled])', { timeout: 20_000 });
  }
  await clickNth(page, '.arrival-card .btn-primary:not([disabled])', 0);
  assert.ok(await has(page, '.studio-shell', 15_000), 'North Star Studio renders');
  assert.ok(await has(page, '.studio-shell .plant-row', 15_000), 'starter species render');
  return page;
}

export async function clickNth(page, sel, idx = 0) {
  await page.waitForSelector(sel, { timeout: 15_000 });
  const ok = await page.evaluate(({ s, i }) => {
    const els = document.querySelectorAll(s);
    if (!els[i]) return false;
    if (typeof els[i].focus === 'function') els[i].focus();
    els[i].click();
    return true;
  }, { s: sel, i: idx });
  assert.ok(ok, `could not click ${sel}[${idx}]`);
}

export async function pageErrorsOf(page) {
  return page.trace.console.filter((c) => c.type === 'error' || c.type === 'pageerror');
}

export async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

export async function closeDrawerWithEscape(page) {
  await page.waitForFunction(() => !!document.activeElement?.closest('.drawer'), { timeout: 5_000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drawer'), { timeout: 5_000 });
}
