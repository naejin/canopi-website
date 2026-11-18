// The scenario file (site-inputs layer, owner 2026-11-18): every case of
// scripts/fixtures/consortium-scenarios.json, a golden file recorded from the engine, run through the
// engine on the installed release (scripts/consortium-scenarios.mjs). It is the contract a later Rust
// port meets. A case that differs is a behaviour change: when it is meant (a new release, a rule
// change), re-record with `node --experimental-strip-types scripts/consortium-scenarios.mjs --record`
// and read the diff.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FILE, consortiumIndex, releaseFile, run } from './consortium-scenarios.mjs';

const file = JSON.parse(readFileSync(FILE, 'utf8'));
const KEYS = new Set(['list', 'place', 'period', 'scenario', 'room', 'edits', 'goals', 'pots', 'members']);
const OUTPUTS = ['fit', 'why', 'holes', 'lanes', 'jobs', 'next', 'second', 'notes', 'thin', 'best', 'hints'];

test('the scenario file: format 2, 40 to 50 cases, plain JSON inputs with keys and codes, the places named with their soil', () => {
  assert.equal(file.format, 'canopi-consortium-scenarios');
  assert.equal(file.format_version, 2);
  assert.ok(file.cases.length >= 40 && file.cases.length <= 50, `${file.cases.length} cases`);
  for (const [name, p] of Object.entries(file.places)) {
    assert.ok('soil' in p, `${name}: its soil reading (null: none)`);
    if (p.soil) assert.deepEqual(Object.keys(p.soil).sort(), ['distanceCells', 'fillDistanceCells', 'filled', 'phH2o', 'texture'], name);
  }
  assert.equal(file.places.kerguelen.soil, null, 'a place with no soil value');
  assert.ok(file.places.marseille.soil.filled && file.places.marseille.soil.fillDistanceCells > 0, 'a neighbour fill');
  assert.equal(file.places.dubai.soil.filled, false, 'a measured map pH');
  for (const c of file.cases) assert.deepEqual(Object.keys(c.output), OUTPUTS, `${c.id}: the outputs, in order`);
  assert.equal(new Set(file.cases.map((c) => c.id)).size, file.cases.length, 'case ids are unique');
  for (const c of file.cases) {
    for (const k of Object.keys(c.input)) assert.ok(KEYS.has(k), `${c.id}: unknown input ${k}`);
    if (c.input.place !== null) assert.ok(file.places[c.input.place]?.periods.length === 9, `${c.id}: place ${c.input.place} holds its 9 slots`);
  }
  const ids = file.cases.map((c) => c.id);
  for (const want of ['seville-today', 'kiambu-today-temperate', 'mendoza-rain-only', 'mendoza-watered-all-year', 'oulu-today', 'oulu-2071-2099', 'recife-today', 'kumasi-today', 'osaka-balcony', 'lyon-2c-colder', 'lyon-soil-test-acid',
    'seville-board', 'mendoza-board-rain', 'mendoza-board-first-years', 'mendoza-board-all-year', 'kiambu-200', 'kiambu-8-nights-2c-colder', 'kiambu-8-goal-3', 'soil-map-ph', 'soil-near-fill', 'soil-none']) assert.ok(ids.includes(want), want);
});

const sameRelease = existsSync(releaseFile) && file.release_id === consortiumIndex.release_id;
test('every case gives its recorded output on the installed release', { skip: !sameRelease && `the file is recorded for ${file.release_id}, the install is ${existsSync(releaseFile) ? consortiumIndex.release_id : 'missing'}: re-record` }, async () => {
  for (const c of file.cases) assert.deepEqual(await run(c.input, file.places), c.output, c.id);
});

test('the file states the rules it shows: watering sets the dryness note only, a grower shift and a soil test change verdicts', () => {
  const out = (id) => file.cases.find((c) => c.id === id).output;
  const but = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
  assert.ok(Object.keys(out('mendoza-rain-only').notes).length > 0, 'rain only: dryness notes');
  assert.deepEqual(out('mendoza-watered-all-year').notes, {}, 'watered all year: none');
  assert.deepEqual(out('mendoza-board-all-year').notes, {});
  assert.deepEqual(out('mendoza-board-first-years').notes, out('mendoza-board-rain').notes, 'first years: the same notes (other words)');
  assert.deepEqual(but(out('mendoza-watered-all-year'), 'notes'), but(out('mendoza-rain-only'), 'notes'), 'watering never changes a fit');
  assert.notDeepEqual(out('lyon-2c-colder').fit, out('lyon-today').fit, '2 °C colder changes a verdict');
  assert.notDeepEqual(out('lyon-soil-test-chalky').hints, out('lyon-today').hints, 'a soil test is read, as hints (R3)');
  // Soil and drainage are hints, never a level (R3): a map pH gives hints; pots and no soil give none.
  for (const c of file.cases) for (const [id, h] of Object.entries(c.output.hints)) assert.ok(!c.output.why[id] || !h.includes(c.output.why[id]), `${c.id}: a hint never limits`);
  assert.ok(Object.keys(out('soil-map-ph').hints).length > 0, 'a map pH gives hints');
  assert.deepEqual(out('soil-map-ph-pots').hints, {}, 'pots: none');
  assert.deepEqual(out('soil-none').hints, {}, 'no soil value: none');
  assert.deepEqual(out('soil-map-ph-pots').fit, out('soil-map-ph').fit, 'and no fit changes');
  assert.equal(file.cases.find((c) => c.id === 'seville-200-plants').input.members.length, 200, 'a 200-plant palette');
  const thinJobs = (id) => out(id).lanes.filter((l) => l.thin).length;
  assert.ok(out('seville-200-plants').lanes.some((l) => Math.max(...l.counts) > 12), 'no lane is capped at a count');
  assert.ok(thinJobs('lyon-3-per-job') >= thinJobs('lyon-today'), 'a higher goal leaves at least as many thin jobs');
  for (const c of file.cases) for (const l of c.output.lanes) if (l.thin) assert.ok(l.lane.startsWith('job:'), `${c.id}: only jobs are thin`);
  assert.equal(file.cases.find((c) => c.id === 'kiambu-200').input.members.length, 200, 'the 200-plant Kiambu palette');
  // Thin targets: one per thin span of a job lane, have below want (the goal).
  for (const c of file.cases) {
    const spans = c.output.lanes.flatMap((l) => (l.thin ?? []).map((y) => `thin:${l.lane.slice(4)}:${y}`));
    assert.deepEqual(c.output.thin.map((t) => t.id), spans, `${c.id}: a thin target per thin span`);
    for (const t of c.output.thin) assert.ok(t.have < t.want, `${c.id}: ${t.id} has fewer than it wants`);
    if (c.output.best) assert.ok(c.output.best.ids.length <= (c.output.best.target.startsWith('thin:') ? 99 : (c.input.goals?.plantsPerJob ?? 2)), `${c.id}: best takes no more than the goal`);
  }
  assert.ok(out('kiambu-8-goal-3').best.ids.length > out('kiambu-8').best.ids.length || out('kiambu-8').best.ids.length === 0, 'a higher goal takes more for a hole');
  assert.deepEqual(out('no-location').fit.unknown.length, file.cases.find((c) => c.id === 'no-location').input.members.length, 'no location: every member unknown');
});
