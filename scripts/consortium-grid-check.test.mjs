// The built site's grid check (scripts/consortium-grid-check.mjs, run by check-built-site.mjs): the
// consortium ranges and the climate tiles the reader samples must come from one canopi-climate grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { consortiumGridProblem } from './consortium-grid-check.mjs';

const A = 'a'.repeat(64), B = 'b'.repeat(64);
const consortium = (sha) => ({ release_id: 'r-0000000000000001', climate_grid_manifest_sha256: sha });
const climate = (sha, status = 'matched') => ({ release: { grid_manifest_sha256: sha }, consortium_grid_check: { status, consortium_release: 'r-0000000000000001' } });

test('the grids match: no problem', () => {
  assert.equal(consortiumGridProblem(consortium(A), climate(A)), null);
});

test('a mismatch is refused, naming both grids', () => {
  assert.match(consortiumGridProblem(consortium(A), climate(B)), /r-0000000000000001 was sampled from the grid aaaaaaaaaaaa…, the installed climate tiles are bbbbbbbbbbbb…/);
});

test('a missing grid is refused: absent, null, or an empty string', () => {
  for (const sha of [undefined, null, '']) {
    assert.match(consortiumGridProblem(consortium(sha), climate(A)), /has no climate_grid_manifest_sha256/, JSON.stringify(sha));
  }
  assert.match(consortiumGridProblem(consortium('not-a-sha'), climate(A)), /has no climate_grid_manifest_sha256/);
});

test('the climate installer must have recorded the check as matched', () => {
  for (const status of ['unchecked', 'refused', null]) {
    assert.match(consortiumGridProblem(consortium(A), climate(A, status)), /consortium_grid_check status is .*, not "matched"/, String(status));
  }
  assert.match(consortiumGridProblem(consortium(A), { release: { grid_manifest_sha256: A } }), /not "matched"/);
});
