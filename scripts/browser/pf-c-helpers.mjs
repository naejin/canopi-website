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
