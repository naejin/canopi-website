// Runs canopi-climate's test vectors (docs/format.md "Vectors") against the website reader
// (src/lib/climate/). Two files share the shape `{ points, tables }`:
// - synthetic-expected.json: canopi-climate tests/fixtures/synthetic-expected.json at commit 5a47016
//   (tag v0.2.1), the answers on the committed synthetic tiles (scripts/climate-reader.test.mjs);
// - lookup.json: the release asset vectors/lookup.json of v0.2.1, pinned by lookup.json.sha256, the
//   answers on the release grid (scripts/climate-vectors.test.mjs).
// The website reader is the cross-tile form (`lookup_across`, like the CLI): it answers every point,
// `own_tile: false` ones included, so every `expect` is compared field by field.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const FIXTURES = new URL('./', import.meta.url);
export const readVectors = (name) => JSON.parse(readFileSync(new URL(name, FIXTURES), 'utf8'));

// The crate's JSON in the reader's names: snake_case keys to camelCase, the echoed lat/lon dropped.
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
export function fromCrate(value) {
  if (Array.isArray(value)) return value.map(fromCrate);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'lat' && k !== 'lon').map(([k, v]) => [camel(k), fromCrate(v)]));
}

/** Every point through `C.lookupSite` on `source`; returns the counts. */
export async function checkPoints(C, points, source) {
  const counts = { compared: 0, invalid: 0, crossTile: 0 };
  for (const p of points) {
    if (p.expect === 'invalid') {
      await assert.rejects(C.lookupSite(p.lat, p.lon, source), RangeError, p.name);
      counts.invalid++;
      continue;
    }
    for (const layer of ['climate', 'soil']) if (p.expect[layer]) assert.deepEqual([p.expect[layer].lat, p.expect[layer].lon], [p.lat, p.lon], `${p.name}: the crate echoes the point`);
    const got = await C.lookupSite(p.lat, p.lon, source);
    assert.deepEqual({ climate: got.climate, soil: got.soil, regions: got.regions }, fromCrate(p.expect), p.name);
    counts.compared++;
    if (!p.own_tile) counts.crossTile++;
  }
  return counts;
}

/** Every row of the rule tables: Köppen legend and margins, texture classes, region codes, scale decoding. */
export function checkTables(C, tables) {
  const round1 = (x) => C.roundHalfAway(x * 10) / 10;
  for (const { code, symbol } of tables.legend) assert.equal(C.koppenSymbol(code), symbol, `legend ${code}`);
  for (const r of tables.margin) {
    const got = C.temperatureMargin(r.code, r.t_cold, r.t_warm);
    assert.equal(got, r.margin_f32, `margin ${r.symbol} ${r.t_cold} ${r.t_warm} (f32)`);
    assert.equal(round1(got), r.margin, `margin ${r.symbol} ${r.t_cold} ${r.t_warm}`);
  }
  for (const r of tables.texture) assert.equal(C.textureClass(r.sand_pct ?? Number.NaN, r.clay_pct ?? Number.NaN), r.class, `texture ${r.sand_pct} ${r.clay_pct}`);
  for (const r of tables.codes.encode) assert.equal(C.encodeCode(r.code), r.stored, `encode ${JSON.stringify(r.code)}`);
  for (const r of tables.codes.decode) assert.equal(C.decodeCode(r.stored, r.letters), r.code, `decode ${r.stored}/${r.letters}`);
  for (const r of tables.decode) {
    if (r.variable) {
      const v = C.VARIABLES.find((x) => x.id === r.variable);
      assert.deepEqual([v.scale, v.offset], [r.scale, r.offset], `${r.variable} scale and offset`);
    }
    assert.equal(C.decodeValue(r.stored, r.scale, r.offset), r.value, `decode ${r.stored} × ${r.scale} + ${r.offset}`);
  }
  return Object.values(tables).reduce((n, t) => n + (Array.isArray(t) ? t.length : t.encode.length + t.decode.length), 0);
}
