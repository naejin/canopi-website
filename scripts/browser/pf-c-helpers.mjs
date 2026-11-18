// pf-c's own helpers (consortium-pf-c.browser.test.mjs; v14 pf commit 0W item 11 lets each stream keep
// its own): the place search as a grower uses it, a place search that answers several places or
// holds its answer, and the words of the climate cards' lists as the installed release gives them.
// The shared ones (says, control, press, palette, …) stay in pf-helpers.mjs.
import assert from 'node:assert/strict';
import { aria, has, index } from './helpers.mjs';

export const FIELD = 'Town, region or coordinates';

// Types into the place field (found by its name) and presses Search (or Enter).
export async function searchFor(page, words, { enter = false } = {}) {
  assert.ok(await has(page, aria('textbox', FIELD), 6000) || await has(page, aria('searchbox', FIELD), 200), `board: no field "${FIELD}"`);
  const field = (await page.$(aria('textbox', FIELD))) ?? (await page.$(aria('searchbox', FIELD)));
  // Select what the field holds (a triple click can land between characters), then type over it.
  await field.focus();
  await field.evaluate((el) => el.select());
  await page.keyboard.press('Backspace');
  await field.type(words);
  if (enter) await page.keyboard.press('Enter');
  else {
    assert.ok(await has(page, aria('button', 'Search'), 2000), 'board: no button "Search"');
    await page.locator(aria('button', 'Search')).click();
  }
}

// The place search answering several places for a query (board LocStates "3 places answer “Kiambu”",
// LocDesk "4 places answer “Sevilla”"), or holding its answer until window.__releaseSearch() (the
// "Looking for …" state): Nominatim's fetch answered in the page, before the harness's own stub.
// Each answer: [name, display name, lat, lon, addresstype].
const nominatimRow = ([name, display, lat, lon, type]) => ({ place_id: Math.round(Math.abs(lat * lon * 1000)) + name.length, licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright', lat: String(lat), lon: String(lon), category: 'place', type, place_rank: 16, importance: 0.6, addresstype: type, name, display_name: display, boundingbox: [String(lat - 0.1), String(lat + 0.1), String(lon - 0.1), String(lon + 0.1)] });
export const SEVERAL = {
  kiambu: [['Kiambu', 'Kiambu, Kiambu County, Kenya', -1.1714, 36.8356, 'town'], ['Kiambu County', 'Kiambu County, Central Kenya, Kenya', -1.03, 36.86, 'county'], ['Kiambu Road', 'Kiambu Road, Nairobi, Kenya', -1.22, 36.84, 'road']],
};
export const searchStub = ({ several = SEVERAL, hold = false } = {}) => (pg) => pg.evaluateOnNewDocument((rows, held) => {
  const real = window.fetch.bind(window);
  let release = () => {};
  const gate = held ? new Promise((r) => { release = r; }) : Promise.resolve();
  window.__releaseSearch = () => release();
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.hostname !== 'nominatim.openstreetmap.org') return real(input, init);
    await gate;
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    if (!rows[q]) return real(input, init);
    return new Response(JSON.stringify(rows[q]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}, Object.fromEntries(Object.entries(several).map(([q, list]) => [q, list.map(nominatimRow)])), hold);

// How many plants each curated list holds in the installed release (the index's names), for the
// climate cards' "its own list, N plants" (board ClimateHand: re-derived, never the board's figure).
export const listSize = (climate) => index.names[climate]?.length ?? 0;

// ---- fix round 1: how a control and a notice are drawn, read from the page as a grower sees them ----

// A control's rank as the boards draw it: 'primary' (filled with the accent), 'secondary' (outlined),
// 'quiet' (a link: no fill, no border); null when no visible control has that name.
export const rankOf = (page, name) => page.evaluate((n) => {
  const label = (e) => (e.getAttribute('aria-label') ?? e.textContent).replace(/\s+/g, ' ').trim();
  const e = [...document.querySelectorAll('button, a')].find((x) => label(x) === n && x.getClientRects().length > 0);
  if (!e) return null;
  const probe = document.createElement('span');
  probe.style.color = 'var(--accent)';
  e.parentElement.appendChild(probe);
  const accent = getComputedStyle(probe).color;
  probe.remove();
  const s = getComputedStyle(e);
  if (s.backgroundColor === accent) return 'primary';
  const border = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.borderTopColor);
  return border ? 'secondary' : 'quiet';
}, name);

// A box's tone, from its border colour: 'warning' (--warning-line), 'danger' (--danger), else 'neutral'.
export const toneOf = (page, selector) => page.evaluate((sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const tok = (v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; e.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  const c = getComputedStyle(e).borderTopColor;
  return c === tok('--warning-line') ? 'warning' : c === tok('--danger') ? 'danger' : 'neutral';
}, selector);

// A notice as the Arrivals board draws it: its icon, its bold lead, and whether its actions stand on a
// row of their own (below the sentence, never inline in it).
export const noticeOf = (page, selector) => page.evaluate((sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const lead = e.querySelector('b, strong')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const icon = !!e.querySelector('svg[aria-hidden="true"]');
  const acts = [...e.querySelectorAll('button, a')].filter((b) => b.getClientRects().length);
  // The bottom of the words (text outside the controls), then every control below it.
  let bottom = 0;
  const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.textContent.trim() || n.parentElement.closest('button, a')) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const rect of r.getClientRects()) bottom = Math.max(bottom, rect.bottom);
  }
  const ownRow = acts.every((b) => b.getBoundingClientRect().top >= bottom - 1);
  return { lead, icon, ownRow, acts: acts.length };
}, selector);
