// E5a stream V (design check A21–A23, rows V1–V4): canopi-climate's tile vectors, committed in
// scripts/fixtures/climate/ from release v0.2.1 (lookup.json with its release asset's
// lookup.json.sha256), pinned to the grid the site installs (src/data/climate-release.json
// grid_manifest_sha256). Nothing is fetched at build or deploy; changing the pin is one commit that
// replaces the file and its .sha256. Written failing in commit 0 (expected-fail, owner V): the
// vectors are not committed yet. V removes the marker in the commit that adds them, and adds the run of
// lookup.json against the installed grid (public/data/climate/<version dir> from
// src/data/climate-index.json): it skips with a message when the grid is not installed and fails
// when CANOPI_REQUIRE_VECTORS=1 (CI job 4, `npm run test:vectors`).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { failing } from './expect-fail.mjs';

const FIXTURES = new URL('./fixtures/climate/', import.meta.url);
const release = JSON.parse(readFileSync(new URL('../src/data/climate-release.json', import.meta.url), 'utf8'));

failing('E5a vectors (V tile vectors): the committed lookup.json matches its sha256 pin and the installed grid\'s manifest sha', { owner: 'V', reason: /ENOENT[^\n]*lookup\.json/ }, () => {
  const bytes = readFileSync(new URL('lookup.json', FIXTURES));
  const pin = readFileSync(new URL('lookup.json.sha256', FIXTURES), 'utf8').trim().split(/\s+/)[0];
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin, 'lookup.json is the release asset its .sha256 names (V1)');
  const vectors = JSON.parse(bytes.toString('utf8'));
  assert.equal(vectors.grid_manifest_sha256, release.grid_manifest_sha256, `the vectors are for grid ${vectors.grid_manifest_sha256}, the site installs ${release.grid_manifest_sha256} (V2)`);
});
