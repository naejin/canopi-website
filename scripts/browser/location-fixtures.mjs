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
};
