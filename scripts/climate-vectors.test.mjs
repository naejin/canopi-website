// E5a stream V (design check A21–A23, rows V1–V4): canopi-climate's tile vectors, committed in
// scripts/fixtures/climate/ from release v0.2.1 (lookup.json with its release asset's
// lookup.json.sha256), pinned to the grid the site installs (src/data/climate-release.json
// grid_manifest_sha256). Nothing is fetched at build or deploy; changing the pin is one commit that
// replaces the file and its .sha256 (download both with
// `gh release download <tag> -R opencanopi/canopi-climate -p 'lookup.json*'`, then `sha256sum -c`).
//
// - Always: the sha pin (V1), the grid pin (V2) and every row of the rule tables.
// - With the installed grid (public/data/climate/<version dir>, named by src/data/climate-index.json,
//   which `astro build` or `npm run install:climate` writes): all 54 points through the reader, the 11
//   `own_tile: false` ones included (the reader is the cross-tile form, docs/format.md "Lookup
//   semantics"). Without it the run skips with a message; CANOPI_REQUIRE_VECTORS=1 (CI job 4,
//   `npm run test:vectors` after the build) makes a missing grid a failure (V3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { FIXTURES, checkPoints, checkTables } from './fixtures/climate/vectors.mjs';

const C = await import('../src/lib/climate/index.ts');
const ROOT = new URL('../', import.meta.url);
const release = JSON.parse(readFileSync(new URL('src/data/climate-release.json', ROOT), 'utf8'));
const bytes = readFileSync(new URL('lookup.json', FIXTURES));
const vectors = JSON.parse(bytes.toString('utf8'));

const INDEX = new URL('src/data/climate-index.json', ROOT);
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : null;
const installDir = index && new URL(`public${index.base}`, ROOT);
const missing = !index ? 'no src/data/climate-index.json (the grid is not installed)'
  : !existsSync(installDir) ? `the index names ${index.base}, which is not under public/`
  : null;
const required = process.env.CANOPI_REQUIRE_VECTORS === '1';
const noGrid = missing && !required ? `${missing}: run \`npm run build\` or \`npm run install:climate\` to compare the reader with lookup.json` : false;

test('E5a vectors: the committed lookup.json matches its sha256 pin and the installed grid\'s manifest sha', () => {
  const pin = readFileSync(new URL('lookup.json.sha256', FIXTURES), 'utf8').trim().split(/\s+/)[0];
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin, 'lookup.json is the release asset its .sha256 names (V1)');
  assert.equal(vectors.grid_manifest_sha256, release.grid_manifest_sha256, `the vectors are for grid ${vectors.grid_manifest_sha256}, the site installs ${release.grid_manifest_sha256} (V2)`);
  assert.match(vectors.cli, /^canopi-climate 0\.2\.1$/);
});

test('E5a vectors: every rule-table row of lookup.json (legend, margins, texture, codes, decoding)', () => {
  assert.ok(checkTables(C, vectors.tables) > 100);
});

test('E5a vectors: all 54 points of lookup.json through the reader on the installed grid, cross-tile ones included', { skip: noGrid }, async () => {
  assert.equal(missing, null, `CANOPI_REQUIRE_VECTORS=1: ${missing} (V3)`);
  assert.equal(index.release.grid_manifest_sha256, vectors.grid_manifest_sha256, `the installed grid is ${index.release.grid_manifest_sha256}, the vectors are for ${vectors.grid_manifest_sha256}`);
  assert.equal(vectors.points.length, 54);
  const source = C.createTileSource({
    index: C.siteIndex(index),
    fetchBytes: async (url) => {
      const b = readFileSync(new URL(`public${url}`, ROOT));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
  });
  const counts = await checkPoints(C, vectors.points, source);
  assert.deepEqual(counts, { compared: 52, invalid: 2, crossTile: 9 });
});
