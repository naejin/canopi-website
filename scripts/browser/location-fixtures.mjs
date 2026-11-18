// P5 (commit 0): the places the P5 browser specs use, and the stubs that stand for the services the
// location step calls (no network in tests): Nominatim answers from NOMINATIM below, keyed by the
// query; OpenFreeMap gets a one-layer style and 204 tiles (harness.mjs mapTiles). Each site's climate
// is what the climate reader answers on the built tiles (lookupAt, the Node reader over
// <build>/client/data/climate/), pinned by the P5-0 self-check so a new grid cannot change a case
// silently.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './serve.mjs';

// [lat, lon] of each case (design check §B/§C failure states).
export const SITES = {
  lyon: [45.7578, 4.832], // Cfa, warmest month 22.4 °C (0.4 from the Cfa/Cfb bound): borderline; FRA; pH 5.9 (within 0.3 of acid: no offer)
  yakutsk: [62.0272, 129.732], // Dfc: Boreal, where no plant fits ("nothing fits")
  ocean: [40, -40], // mid-Atlantic: no climate cell within 2 cells ("pick a point on land")
  coast: [48.35, -4.85], // off Brest: climate from the nearest cell (1 cell), no country, no soil
  polar: [78.2232, 15.6267], // Longyearbyen: ET (polar, its own state); SVA
  seville: [37.3891, -5.9845], // Csa: Mediterranean, a curated climate, not borderline; SPA
  manaus: [-3.119, -60.0217], // Af: Tropical; BZN; pH 4.3 (filled from 2 cells): likely acid
  nairobi: [-1.2864, 36.8172], // stored Aw, but its coldest-month mean is 17.6 °C: Cwb by its means, Subtropical, borderline with Tropical
  marseille: [43.296, 5.37], // Csa; FRA; soil pH 7.2 filled from a neighbour 2 squares away (v14 pf commit 0W: "soil map, nearest square N km away: a weaker guess")
  kiambu: [-1.1714, 36.8356], // Cfb (a cell other than Nairobi's): proposes Temperate, the reader's honest answer; the "Not this climate? Choose another" case, overridden to Subtropical (borrows the nearest lists): 305 of 515 (concept P1; PP-B b1b, coordinator 2026-11-15)
};

// Nominatim search answers (format jsonv2), keyed by the lower-cased query. Unknown queries: [].
const place = (name, display, [lat, lon], addresstype = 'city') => ({
  place_id: Math.round(Math.abs(lat * lon * 1000)), licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright',
  lat: String(lat), lon: String(lon), category: 'boundary', type: 'administrative', place_rank: 16, importance: 0.7, addresstype, name, display_name: display,
  boundingbox: [String(lat - 0.1), String(lat + 0.1), String(lon - 0.1), String(lon + 0.1)],
});
export const NOMINATIM = {
  lyon: [place('Lyon', 'Lyon, Métropole de Lyon, Rhône, Auvergne-Rhône-Alpes, France métropolitaine, France', SITES.lyon)],
  seville: [place('Sevilla', 'Sevilla, Andalucía, España', SITES.seville)],
  yakutsk: [place('Yakutsk', 'Yakutsk, Sakha Republic, Russia', SITES.yakutsk)],
  longyearbyen: [place('Longyearbyen', 'Longyearbyen, Svalbard, Norge', SITES.polar, 'town')],
  manaus: [place('Manaus', 'Manaus, Amazonas, Brasil', SITES.manaus)],
  kiambu: [place('Kiambu', 'Kiambu, Kiambu County, Central Kenya, Kenya', SITES.kiambu, 'town')],
};

// The climate reader's answer at a point, on the tiles a build installed (dist-test by default).
export async function lookupAt(lat, lon, dir = 'dist-test') {
  const C = await import('../../src/lib/climate/index.ts');
  const file = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'climate-index.json'), 'utf8'));
  const source = C.createTileSource({
    index: C.siteIndex(file),
    fetchBytes: async (url) => { const b = readFileSync(join(ROOT, dir, 'client', url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); },
  });
  return C.lookupSite(lat, lon, source);
}

// What lookupAt answers at each site on the v0.2.0 tiles (grid 04ec85f4…), the facts each spec relies
// on; the P5-0 self-check compares them with the reader.
export const EXPECTED = {
  lyon: { koppen: 'Cfa', tmeanWarmC: 22.4, l3: 'FRA', iso: 'FR', ph: 5.9 },
  yakutsk: { koppen: 'Dfc', l3: 'YAK', iso: 'RU' },
  ocean: { climate: null, soil: null, l3: null, iso: null },
  coast: { koppen: 'Cfb', distanceCells: 1, soil: null, l3: null, iso: null },
  polar: { koppen: 'ET', l3: 'SVA', iso: 'SJ' },
  seville: { koppen: 'Csa', l3: 'SPA', iso: 'ES' },
  manaus: { koppen: 'Af', l3: 'BZN', iso: 'BR', ph: 4.3 },
  nairobi: { koppen: 'Aw', l3: 'KEN', iso: 'KE' },
  kiambu: { koppen: 'Cfb', l3: 'KEN', iso: 'KE' },
  marseille: { koppen: 'Csa', l3: 'FRA', iso: 'FR', ph: 7.2, fillDistanceCells: 2 },
};
// A place with a climate and no soil value (v14 pf commit 0W, item 11): every land square of the soil
// map answers, so a spec takes a real place's lookup with its soil left out (p5-helpers atSite(page,
// name, NO_SOIL)); the sea point `coast` has none too, from a neighbouring climate cell.
export const NO_SOIL = { soil: null };

// Place's climate cards sit one link away (PP-B b1a, owner drop 10): "No location? Choose a climate",
// or "Not this climate? Choose another" once a location gives one. Pressed as a grower would when the
// link shows; nothing to do when the cards are open already (a climate chosen and no location).
export async function openCards(page) {
  await page.waitForSelector('[data-place-climates], #ct-climates:not([hidden])', { timeout: 8000 });
  if (!(await page.$('[data-place-climates]'))) return;
  // A locator click waits for the link to stop moving: a location line rendering just above it
  // shifts it, and a plain click then lands on what took its place (its Forget, seen at 1280 px).
  await page.locator('[data-place-climates]').click();
  await page.waitForSelector('#ct-climates:not([hidden])', { timeout: 4000 });
  // The press moves the focus into the cards two frames later, which may scroll the page: a click
  // computed before that lands beside its card (seen at 1280 px).
  await page.waitForFunction(() => !!document.activeElement?.closest('#ct-climates'), { timeout: 4000 });
}
// A climate card picked by its value (input[name="ct-climate"], e.g. 'mediterranean'), the cards opened first.
export async function pickCard(page, value) {
  await openCards(page);
  // Centred first: a card left at the bottom edge can sit under a fixed notice (a failed chunk's toast,
  // its close button over the card at 1280 px), which a grower would scroll past.
  const card = `input[name="ct-climate"][value="${value}"]`;
  await page.$eval(card, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); // not smooth: a click measured mid-scroll misses (seen at 1280 px)
  await page.click(card);
}
