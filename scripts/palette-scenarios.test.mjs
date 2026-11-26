// Golden real-place scenario suite for src/lib/palette/report.ts:
// verifies every case in scripts/fixtures/consortium-scenarios.json (44 real-place cases) against
// resolveEffectiveSite + evaluatePlantVerdict + computeReport, without needing gitignored climate tiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FILE, consortiumIndex, run } from './palette-scenarios.mjs';

const file = JSON.parse(readFileSync(FILE, 'utf8'));

test('consortium-scenarios.json matches format v3 and the installed consortium release', () => {
  assert.equal(file.format, 'canopi-consortium-scenarios');
  assert.equal(file.format_version, 3);
  assert.equal(file.release_id, consortiumIndex.release_id);
  assert.ok(file.cases.length >= 44, `expected at least 44 cases, got ${file.cases.length}`);
  assert.equal(new Set(file.cases.map((c) => c.id)).size, file.cases.length, 'every case id is unique');
});

test('every real-place scenario matches report.ts exactly (44 cases)', async () => {
  for (const c of file.cases) {
    const got = await run(c.input, file.places);
    assert.deepEqual(got, c.output, `case ${c.id} drifted from scripts/fixtures/consortium-scenarios.json`);
  }
});

test('real-place scenario agronomic invariants hold across climate, soil, watering, room, and goals', () => {
  const byId = new Map(file.cases.map((c) => [c.id, c]));
  const out = (id) => byId.get(id).output;
  const allMembers = (id) => {
    const f = out(id).fit;
    return [...f.fits, ...f.check, ...f.at_risk, ...f.unknown];
  };

  // Partition invariant: every member appears in exactly one fit bucket.
  for (const c of file.cases) {
    const ids = allMembers(c.id);
    assert.equal(ids.length, c.input.members.length, `${c.id}: fit buckets partition members`);
    assert.deepEqual(new Set(ids), new Set(c.input.members), `${c.id}: no duplicate or missing member ids`);
  }

  // No location: every member is unknown.
  assert.equal(
    out('no-location').fit.unknown.length,
    byId.get('no-location').input.members.length,
    'no-location: every member unknown',
  );

  // Empty palette: zero members, zero covered jobs.
  assert.equal(byId.get('kiambu-empty-palette').input.members.length, 0);
  assert.equal(out('kiambu-empty-palette').jobs.covered, 0);

  // Scale cases: 200-plant palettes.
  assert.equal(byId.get('kiambu-200').input.members.length, 200);
  assert.equal(byId.get('seville-200-plants').input.members.length, 200);

  // Watering: Mendoza all-year removes water_needs_irrigation pressure vs rain-only.
  const mendozaRainWater = Object.values(out('mendoza-board-rain').reasons)
    .filter((rs) => rs.includes('water_needs_irrigation')).length;
  const mendozaAllWater = Object.values(out('mendoza-board-all-year').reasons)
    .filter((rs) => rs.includes('water_needs_irrigation')).length;
  assert.ok(mendozaRainWater > mendozaAllWater, 'mendoza all-year irrigation eases rain-only water stress');

  // Soil map pH vs pots: Dubai map pH is applied in ground, cleared in pots.
  assert.ok(out('soil-map-ph').effective.soil_ph !== null, 'dubai map soil pH is read');
  assert.equal(out('soil-map-ph-pots').effective.soil_ph, null, 'pots ignores map soil pH');
  assert.ok(out('soil-near-fill').effective.soil_ph !== null, 'marseille neighbour-filled soil pH is read');
  assert.equal(out('soil-none').effective.soil_ph, null, 'kerguelen has no soil pH');

  // Lyon edits: colder nights/days, frost hollow, acid/chalky soil tests, wet ground.
  assert.ok(out('lyon-2c-colder').effective.tmin_cold_c < out('lyon-today').effective.tmin_cold_c);
  assert.ok(out('lyon-frost-hollow').effective.tmin_cold_c < out('lyon-today').effective.tmin_cold_c);
  assert.equal(out('lyon-soil-test-acid').effective.soil_ph, 5.2);
  assert.equal(out('lyon-soil-test-chalky').effective.soil_ph, 8.1);
  assert.equal(out('lyon-wet-ground').effective.drainage, 'wet');

  // Oulu warming: 2071-2099 SSP5-8.5 is warmer than today.
  assert.ok(out('oulu-2071-2099-ssp585').effective.tmin_cold_c > out('oulu-today').effective.tmin_cold_c);

  // Balcony room limit: Osaka balcony flags tall plants with room_tall note.
  const osakaTall = Object.values(out('osaka-balcony').notes).filter((ns) => ns.includes('room_tall')).length;
  assert.ok(osakaTall > 0, 'osaka balcony emits room_tall notes for tall species');

  // Higher plantsPerJob goal (3 vs 2) leaves no more backed_up jobs.
  assert.ok(
    out('lyon-3-per-job').jobs.backed_up.length <= out('lyon-today').jobs.backed_up.length,
    'higher plantsPerJob goal leaves at most as many backed_up jobs',
  );
  assert.ok(
    out('kiambu-8-goal-3').jobs.backed_up.length <= out('kiambu-8').jobs.backed_up.length,
    'kiambu-8 goal 3 leaves at most as many backed_up jobs as goal 2',
  );
});
