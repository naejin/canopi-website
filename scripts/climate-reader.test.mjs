// The canopi-climate v0.2 tile reader (src/lib/climate/, P5 stream S5b; design check
// .local/consortium/v2/p5-design-check.md section A; coordinator row "P5 engineering choices").
//
// - Always: the crate's synthetic tiles (scripts/fixtures/climate/synthetic-*.tif, copied from
//   canopi-climate tests/fixtures/) against the crate's answers on them, synthetic-expected.json
//   (canopi-climate tests/fixtures/synthetic-expected.json at commit 5a47016, tag v0.2.1: 48 points
//   and the rule tables, run by scripts/fixtures/climate/vectors.mjs), the cell rules, Köppen margins,
//   USDA texture and region codes, the fetch policy and the LRU.
// - With the extracted grid (CANOPI_CLIMATE_GRID, default the canopi-cache path): the decode probe
//   and the fetch policy over the 54 points of the release vectors (lookup.json). The answers at those
//   points are scripts/climate-vectors.test.mjs's (installed grid). Without the extracted grid these
//   tests skip with a message: `npm test` never needs the 98 MB grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPoints, checkTables, readVectors } from './fixtures/climate/vectors.mjs';

const C = await import('../src/lib/climate/index.ts');
const FIXTURES = new URL('./fixtures/climate/', import.meta.url);
const GRID = process.env.CANOPI_CLIMATE_GRID ?? '/media/daylon/main_hdd/canopi-cache/climate/out-v0.2';
const hasGrid = existsSync(join(GRID, 'manifest.json'));
const noGrid = hasGrid ? false : `no extracted canopi-climate v0.2 grid at ${GRID} (set CANOPI_CLIMATE_GRID to run the probe and the fetch policy)`;

const shapeOf = (layer) => ({ side: C.LAYERS[layer].tileCells, cellDeg: C.LAYERS[layer].cellDeg, bands: C.LAYERS[layer].bands });
const fixture = (name) => readFileSync(new URL(name, FIXTURES));

// A source over files: { [url]: bytes } or a directory; records every URL fetched.
function sourceOver(index, read, opts = {}) {
  const fetched = [];
  const source = C.createTileSource({
    index,
    fetchBytes: async (url) => { fetched.push(url); return read(url); },
    ...opts,
  });
  return { source, fetched };
}

function gridIndex() {
  const m = JSON.parse(readFileSync(join(GRID, 'manifest.json'), 'utf8'));
  const names = (tiles) => new Set(tiles.map((t) => t.name));
  return { base: '/grid/', tiles: { climate: names(m.tiles), soil: names(m.layers.find((l) => l.id === 'soil').tiles), regions: names(m.layers.find((l) => l.id === 'regions').tiles) } };
}
const fromGrid = (url) => {
  const bytes = readFileSync(join(GRID, url.replace(/^\/grid\//, '')));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

test('probe: n50e000 decodes with DecompressionStream and matches the CLI at Lyon', { skip: noGrid }, async () => {
  const file = readFileSync(join(GRID, 'tiles', 'n50e000.tif'));
  const t0 = performance.now();
  const r = await C.decodeRaster(file, shapeOf('climate'));
  const t1 = performance.now();
  assert.deepEqual([r.west, r.north, r.data.length], [0, 50, 100 * 100 * 72]);
  // Lyon 45.76 N 4.84 E: cell (48, 42) of n50e000.
  const at = (band) => r.data[(42 * 100 + 48) * 72 + band];
  assert.deepEqual([at(0), at(9) / 10, at(18) / 10, at(45), at(54) / 100], [14, 0.1, 26.6, 809, 1.1]);
  console.log(`probe: n50e000 ${file.byteLength} B decoded in ${(t1 - t0).toFixed(1)} ms (Node ${process.version})`);
});

test('fetch policy: three tiles inland, neighbours only for an incomplete cell near an edge, never an unlisted tile', { skip: noGrid }, async () => {
  const index = gridIndex();
  const lookup = async (lat, lon) => {
    const { source, fetched } = sourceOver(index, fromGrid);
    const site = await C.lookupSite(lat, lon, source);
    return { site, fetched: fetched.map((u) => u.replace('/grid/', '')).sort() };
  };
  // Lyon: one tile per layer.
  let r = await lookup(45.76, 4.84);
  assert.deepEqual(r.fetched, ['regions/n50e000.tif', 'soil/n50e000.tif', 'tiles/n50e000.tif']);
  assert.equal(r.site.crossTile, false);
  // 45 N 9.999 E: one cell from n50e010, but complete: no neighbour fetched.
  r = await lookup(45, 9.999);
  assert.deepEqual(r.fetched, ['regions/n50e000.tif', 'soil/n50e000.tif', 'tiles/n50e000.tif']);
  // Cap Corse coast: sea in n50e000's last column, land 2 cells east in n50e010.
  r = await lookup(42.75, 9.95);
  assert.ok(r.fetched.includes('tiles/n50e010.tif'), 'the eastern climate tile');
  assert.equal(r.site.climate.tile, 'n50e010');
  assert.equal(r.site.crossTile, true);
  // South Pacific (s40w130): no layer lists the tile, so nothing is fetched at all.
  r = await lookup(-35, -125);
  assert.deepEqual(r.fetched, []);
  assert.equal(r.site.climate, null);
  assert.equal(r.site.soil, null);
  assert.deepEqual([r.site.regions.wgsrpdL3, r.site.regions.isoA2], [null, null]);
  // Every point of the release vectors: only listed tiles.
  const { source, fetched } = sourceOver(index, fromGrid, { maxTiles: 4 });
  for (const p of readVectors('lookup.json').points) if (p.expect !== 'invalid') await C.lookupSite(p.lat, p.lon, source);
  for (const url of fetched) {
    const [, dir, name] = /^\/grid\/(tiles|soil|regions)\/(\w+)\.tif$/.exec(url);
    const layer = dir === 'tiles' ? 'climate' : dir;
    assert.ok(index.tiles[layer].has(name), `${url} is listed`);
  }
  for (const layer of ['climate', 'soil', 'regions']) assert.ok(source.cached(layer).length <= 4, `${layer}: at most 4 decoded tiles`);
});

// ---------- Always: synthetic tiles ----------

const synth = {
  'tiles/n50e000.tif': fixture('synthetic-n50e000.tif'),
  'soil/n50e000.tif': fixture('synthetic-soil-n50e000.tif'),
  'regions/n50e000.tif': fixture('synthetic-regions-n50e000.tif'),
};
const synthIndex = { base: '/s/', tiles: { climate: new Set(['n50e000']), soil: new Set(['n50e000']), regions: new Set(['n50e000']) } };
const fromSynth = (url) => {
  const b = synth[url.replace('/s/', '')];
  if (!b) throw new Error(`404 ${url}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const at = (x, y) => [50 - (y + 0.5) * 0.1, (x + 0.5) * 0.1];
const synthetic = readVectors('synthetic-expected.json');

test('synthetic-expected.json: every point the crate answers on the synthetic tiles, field by field, and every rule-table row', async () => {
  assert.deepEqual(Object.values(synthetic.tiles).map((t) => t.split('/').pop()).sort(), ['synthetic-n50e000.tif', 'synthetic-regions-n50e000.tif', 'synthetic-soil-n50e000.tif']);
  const { source } = sourceOver(synthIndex, fromSynth);
  // The points outside n50e000 (own_tile false, or another tile with no file) are compared too: the
  // reader searches across tile edges like the crate's lookup_across, which wrote the file.
  assert.deepEqual(await checkPoints(C, synthetic.points, source), { compared: 46, invalid: 2, crossTile: 2 });
  assert.ok(checkTables(C, synthetic.tables) > 100);
});

test('synthetic climate tile: values, ocean snapping within 2 cells, incomplete cells skipped, tile edges', async () => {
  const { source } = sourceOver(synthIndex, fromSynth);
  let site = await C.lookupSite(...at(50, 40), source);
  assert.equal(site.climate.distanceCells, 0);
  assert.equal(site.climate.tile, 'n50e000');
  assert.equal(site.climate.periods.length, 9);
  const p0 = site.climate.periods[0], p8 = site.climate.periods[8];
  assert.deepEqual([p0.period, p0.scenario, p8.period, p8.scenario], ['1991-2020', 'historical', '2071-2099', 'ssp585']);
  // The values are synthetic-expected.json's (test above); here, the reader's own fields.
  assert.equal(p0.koppen, C.koppenSymbol(p0.koppenCode));
  // Land block x 20..80, y 30..70: two cells west of it snaps, three does not, a 2.83-cell diagonal does not.
  site = await C.lookupSite(...at(18, 40), source);
  assert.equal(site.climate.distanceCells, 2);
  assert.deepEqual([site.climate.cellLat, site.climate.cellLon], [45.95, 2.05]);
  assert.equal((await C.lookupSite(...at(17, 40), source)).climate, null);
  assert.equal((await C.lookupSite(...at(18, 28), source)).climate, null);
  // The island (5, 5) misses one value: nothing within 2 cells.
  assert.equal((await C.lookupSite(...at(5, 5), source)).climate, null);
  // The exact north-west corner belongs to the tile: corner cell (0, 0) is land.
  site = await C.lookupSite(50, 0, source);
  assert.deepEqual([site.climate.distanceCells, site.climate.cellLat, site.climate.cellLon], [0, 49.95, 0.05]);
  // Just north of the corner cell (in n60e000, not listed): found across the edge, 1 cell away.
  site = await C.lookupSite(50.05, 0.05, source);
  assert.deepEqual([site.tile, site.climate.tile, site.climate.distanceCells, site.crossTile], ['n60e000', 'n50e000', 1, true]);
});

test('synthetic soil and regions tiles: texture, fill flag, codes and the coast search', async () => {
  const { source } = sourceOver(synthIndex, fromSynth);
  // Soil land: 40–46 N, 0–6 E (layer cells x < 120, y >= 80). Cell (10, 100): pH (55 + 10) / 10.
  const lat = 50 - (100 + 0.5) * 0.05, lon = (10 + 0.5) * 0.05;
  const site = await C.lookupSite(lat, lon, source);
  assert.deepEqual([site.soil.phH2o, site.soil.sandPct, site.soil.clayPct, site.soil.filled, site.soil.distanceCells], [6.5, 10, 8, false, 0]);
  assert.equal(site.soil.siltPct, 82);
  assert.equal(site.soil.texture, C.textureClass(10, 8));
  assert.equal(site.soil.depth, '0-30 cm');
  assert.deepEqual([site.regions.wgsrpdL3, site.regions.isoA2, site.regions.isoA2DistanceCells], ['FRA', 'FR', 0]);
  // The "city" (y 90..100, x 60..70) was filled from 1 cell away, 2 at x = 65; east of x 60 is "SWI"/"CH".
  const city = await C.lookupSite(50 - 95.5 * 0.05, 65.5 * 0.05, source);
  assert.deepEqual([city.soil.filled, city.soil.fillDistanceCells, city.regions.wgsrpdL3, city.regions.isoA2], [true, 2, 'SWI', 'CH']);
  // One layer cell north of the land (y = 79): the coast search finds it 1 cell away; 3 cells: nothing.
  const coast = await C.lookupSite(50 - 79.5 * 0.05, 10.5 * 0.05, source);
  assert.deepEqual([coast.soil.distanceCells, coast.regions.wgsrpdL3DistanceCells], [1, 1]);
  const sea = await C.lookupSite(50 - 77.5 * 0.05, 10.5 * 0.05, source);
  assert.deepEqual([sea.soil, sea.regions.wgsrpdL3, sea.regions.isoA2], [null, null, null]);
});

test('soil decodes with model.js band specs: band order, decimal scale exact, fill distance raw (E2 item 1)', async () => {
  const { SOIL_BAND_SPECS } = await import('../src/lib/climate/model.js');
  assert.deepEqual(Object.values(C.SOIL_BAND), [0, 1, 2, 3]);
  assert.deepEqual(['ph_h2o', 'sand', 'clay', 'fill_distance'].map((id) => SOIL_BAND_SPECS.findIndex((b) => b.id === id)), Object.values(C.SOIL_BAND));
  // One soil cell at (0, 0) of n50e000, values that a × 0.1 decode would leave inexact (25.3 → 25.300000000000004).
  const side = C.LAYERS.soil.tileCells, bands = C.LAYERS.soil.bands;
  const data = new Int16Array(side * side * bands).fill(C.NODATA);
  data.set([73, 253, 147, 3], 0);
  const raster = { west: 0, north: 50, side, bands, data };
  const soil = C.soilAt((name) => (name === 'n50e000' ? raster : null), 50 - 0.025, 0.025);
  assert.deepEqual([soil.phH2o, soil.sandPct, soil.clayPct, soil.siltPct, soil.fillDistanceCells, soil.filled], [7.3, 25.3, 14.7, 60, 3, true]);
});

test('lookupSite with { soil: false } (the location step until P5.2): no soil tile fetched, soil null, climate and regions as before', async () => {
  const lat = 50 - (100 + 0.5) * 0.05, lon = (10 + 0.5) * 0.05;
  const all = await C.lookupSite(lat, lon, sourceOver(synthIndex, fromSynth).source);
  const { source, fetched } = sourceOver(synthIndex, fromSynth);
  const site = await C.lookupSite(lat, lon, source, C.DEFAULT_RADIUS, { soil: false });
  assert.deepEqual(fetched.filter((u) => /\/soil\//.test(u)), [], 'no soil request');
  assert.equal(site.soil, null);
  assert.deepEqual(site.tilesRead.soil, []);
  assert.deepEqual([site.climate, site.regions, site.tile], [all.climate, all.regions, all.tile]);
});

test('tile source: LRU of at most 4 decoded tiles per layer, shared in-flight fetches, failures not cached', async () => {
  const names = ['n50e000', 'n50e010', 'n40e000', 'n40e010', 'n60e000'];
  const index = { base: '/s/', tiles: { climate: new Set(names), soil: new Set(), regions: new Set() } };
  // Every name answers with the synthetic n50e000 file, so the position check refuses the others:
  // the cache must still hold only what decoded.
  let fetches = 0;
  const source = C.createTileSource({ index, fetchBytes: async () => { fetches++; return fromSynth('/s/tiles/n50e000.tif'); } });
  const [a, b] = await Promise.all([source.get('climate', 'n50e000'), source.get('climate', 'n50e000')]);
  assert.equal(a, b);
  assert.equal(fetches, 1, 'one fetch for two concurrent gets');
  await assert.rejects(source.get('climate', 'n50e010'), (err) => err instanceof C.ClimateTileError && err.layer === 'climate' && err.tile === 'n50e010' && /holds the tile at 50 N, 0 E/.test(err.message));
  assert.deepEqual(source.cached('climate'), ['n50e000'], 'a failed tile is not kept');
  const ok = C.createTileSource({ index, fetchBytes: async () => fromSynth('/s/tiles/n50e000.tif'), maxTiles: 4 });
  for (const n of names) await ok.get('climate', n).catch(() => {});
  assert.ok(ok.cached('climate').length <= 4);
  // Never fetched: a tile the index does not list.
  await assert.rejects(source.get('soil', 'n50e000'), /not in the climate index/);
  assert.equal(fetches, 2);
  // A fetch that fails is the page's "fetch failed" state, not "no data".
  const down = C.createTileSource({ index: synthIndex, fetchBytes: async () => { throw new Error('HTTP 503'); } });
  await assert.rejects(C.lookupSite(45, 5, down), (err) => err instanceof C.ClimateTileError && /HTTP 503/.test(err.message));
});

test('tiff: refuses what is not a canopi-climate tile', async () => {
  const good = fixture('synthetic-n50e000.tif');
  await assert.rejects(C.decodeRaster(Buffer.from('not a tiff'), shapeOf('climate')), C.TileFormatError);
  await assert.rejects(C.decodeRaster(good.subarray(0, good.length / 2), shapeOf('climate')), C.TileFormatError);
  await assert.rejects(C.decodeRaster(good, shapeOf('soil')), /200 × 200|bands/);
  await assert.rejects(C.decodeRaster(fixture('synthetic-soil-n50e000.tif'), { ...shapeOf('soil'), bands: 2 }), /4 bands, expected 2/);
  const big = Buffer.from(good);
  big[0] = 0x4d; big[1] = 0x4d;
  await assert.rejects(C.decodeRaster(big, shapeOf('climate')), /little-endian/);
  // A decompression bomb: the inflater is asked for the expected size only.
  let limit = 0;
  await C.decodeRaster(good, shapeOf('climate'), async (bytes, l) => { limit = l; return C.inflateDeflate(bytes, l); });
  assert.equal(limit, 112 * 112 * 72 * 2);
});

test('grid: cell edges, antimeridian, poles and tile names (src/grid.rs)', () => {
  const g = C.CLIMATE_GRID;
  assert.deepEqual(C.cellOf(g, 50, 0), { col: 1800, row: 400 });
  assert.deepEqual(C.cellOf(g, 49.9, 0.1), { col: 1801, row: 401 });
  assert.deepEqual(C.cellOf(g, 48.9, 0.3), { col: 1803, row: 411 });
  assert.equal(C.cellOf(g, 90, 0).row, 0);
  assert.equal(C.cellOf(g, -90, 0).row, 1799);
  assert.equal(C.cellOf(g, 0, 180).col, 0);
  assert.equal(C.cellOf(g, 0, -180).col, 0);
  assert.equal(C.cellOf(g, 0, 179.99).col, 3599);
  assert.deepEqual(C.cellOf(g, 0, 190), C.cellOf(g, 0, -170));
  assert.equal(C.cellOf(g, 90.1, 0), null);
  assert.equal(C.cellOf(g, Number.NaN, 0), null);
  assert.equal(C.cellOf(g, 0, Infinity), null);
  assert.equal(C.tileNameOf(48.8566, 2.3522), 'n50e000');
  assert.equal(C.tileNameOf(-1.29, 36.82), 'n00e030');
  assert.equal(C.tileNameOf(-23.55, -46.63), 's20w050');
  assert.equal(C.tileNameOf(-0.0001, -0.0001), 'n00w010');
  assert.equal(C.tileNameOf(-90, 180), 's80w180');
  for (let row = 0; row < 18; row++) for (let col = 0; col < 36; col++) assert.deepEqual(C.parseTileName(C.tileName({ col, row })), { col, row });
  for (const bad of ['n55e000', 'x50e000', 'n50e180', 's90e000', 'n50e00']) assert.equal(C.parseTileName(bad), null, bad);
  // A search window: north to south, then west to east; wraps at 180, stops at the poles.
  const w = C.window(g, { col: 0, row: 0 }, 2);
  assert.ok(w.every(({ cell }) => cell.row >= 0));
  assert.ok(w.some(({ cell }) => cell.col === 3599));
  assert.deepEqual(C.searchTiles(g, C.cellOf(g, 50.05, 0.05), 2), ['n60w010', 'n60e000', 'n50w010', 'n50e000']);
  assert.deepEqual(C.searchTiles(g, C.cellOf(g, 45, 5), 2), ['n50e000']);
});

test('Köppen margins, texture classes and region codes match the crate', () => {
  const k = (s) => C.KOPPEN_SYMBOLS.indexOf(s);
  assert.deepEqual([C.koppenSymbol(1), C.koppenSymbol(15), C.koppenSymbol(30), C.koppenSymbol(0), C.koppenSymbol(31)], ['Af', 'Cfb', 'EF', '', '']);
  assert.equal(C.koppenGroup(26), 'D');
  // src/koppen.rs temperature_margin_flags_contradictions.
  assert.equal(C.temperatureMargin(k('Aw'), 19, 25), 0);
  assert.ok(Math.abs(C.temperatureMargin(k('Aw'), 16, 20) - 2) < 1e-6);
  assert.equal(C.temperatureMargin(k('Cfb'), 4.8, 20.1), 0);
  assert.ok(Math.abs(C.temperatureMargin(k('Cfb'), 4.8, 23) - 1) < 1e-6);
  assert.ok(Math.abs(C.temperatureMargin(k('Cfb'), -1, 20) - 1) < 1e-6);
  assert.equal(C.temperatureMargin(k('Dwd'), -40, 19), 0);
  assert.ok(Math.abs(C.temperatureMargin(k('Dwd'), -30, 19) - 8) < 1e-6);
  assert.ok(Math.abs(C.temperatureMargin(k('Dfc'), -40, 15) - 2) < 1e-6);
  assert.ok(Math.abs(C.temperatureMargin(k('ET'), -10, 12) - 2) < 1e-6);
  assert.equal(C.temperatureMargin(k('BWh'), -50, 50), 0);
  assert.equal(C.temperatureMargin(0, 0, 0), 0);
  // src/soil.rs texture_classes_at_triangle_reference_points.
  const cases = [[92, 3, 'sand'], [82, 6, 'loamy_sand'], [65, 10, 'sandy_loam'], [40, 20, 'loam'], [20, 15, 'silt_loam'], [7, 5, 'silt'], [60, 27, 'sandy_clay_loam'], [33, 34, 'clay_loam'], [10, 34, 'silty_clay_loam'], [52, 42, 'sandy_clay'], [7, 47, 'silty_clay'], [20, 60, 'clay'], [20, 40, 'silty_clay'], [21, 40, 'clay'], [52, 7, 'loam'], [52.1, 7, 'sandy_loam']];
  for (const [sand, clay, want] of cases) assert.equal(C.textureClass(sand, clay), want, `${sand} ${clay}`);
  for (const [sand, clay] of [[Number.NaN, 10], [70, 40], [-1, 10]]) assert.equal(C.textureClass(sand, clay), null);
  // src/regions.rs codes_round_trip.
  assert.equal(C.encodeCode('FRA'), 5 * 676 + 17 * 26);
  for (const c of ['FRA', 'AAA', 'ZZZ', 'ABT', 'NWG']) assert.equal(C.decodeCode(C.encodeCode(c), 3), c);
  for (const c of ['FR', 'AA', 'ZZ', 'XK']) assert.equal(C.decodeCode(C.encodeCode(c), 2), c);
  for (const bad of ['', 'fr', '-99', 'ABCD', 'F1', 'CN-TW']) assert.equal(C.encodeCode(bad), null, bad);
  assert.deepEqual([C.decodeCode(-32768, 2), C.decodeCode(676, 2), C.decodeCode(-1, 3)], [null, null, null]);
  // src/model.rs scale decoding: -123 at scale 0.1 is exactly -12.3.
  assert.deepEqual([C.decodeValue(-123, 0.1), C.decodeValue(46, 0.01), C.decodeValue(812, 1), C.decodeValue(-32768, 0.1)], [-12.3, 0.46, 812, null]);
});

test('lookupSite refuses invalid coordinates before any fetch', async () => {
  const { source, fetched } = sourceOver(synthIndex, fromSynth);
  for (const [lat, lon] of [[91, 0], [-90.5, 0], [Number.NaN, 0], [0, Infinity]]) await assert.rejects(C.lookupSite(lat, lon, source), RangeError);
  assert.deepEqual(fetched, []);
});
