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
const KEYS = new Set(['list', 'place', 'period', 'scenario', 'room', 'edits', 'goals', 'members']);

test('the scenario file: 25 to 32 cases, plain JSON inputs with keys and codes, the places named', () => {
  assert.equal(file.format, 'canopi-consortium-scenarios');
  assert.ok(file.cases.length >= 25 && file.cases.length <= 32, `${file.cases.length} cases`);
  assert.equal(new Set(file.cases.map((c) => c.id)).size, file.cases.length, 'case ids are unique');
  for (const c of file.cases) {
    for (const k of Object.keys(c.input)) assert.ok(KEYS.has(k), `${c.id}: unknown input ${k}`);
    if (c.input.place !== null) assert.ok(file.places[c.input.place]?.periods.length === 9, `${c.id}: place ${c.input.place} holds its 9 slots`);
  }
  const ids = file.cases.map((c) => c.id);
  for (const want of ['seville-today', 'kiambu-today-temperate', 'mendoza-rain-only', 'mendoza-watered-all-year', 'oulu-today', 'oulu-2071-2099', 'recife-today', 'kumasi-today', 'osaka-balcony', 'lyon-2c-colder', 'lyon-soil-test-acid']) assert.ok(ids.includes(want), want);
});

const sameRelease = existsSync(releaseFile) && file.release_id === consortiumIndex.release_id;
test('every case gives its recorded output on the installed release', { skip: !sameRelease && `the file is recorded for ${file.release_id}, the install is ${existsSync(releaseFile) ? consortiumIndex.release_id : 'missing'}: re-record` }, async () => {
  for (const c of file.cases) assert.deepEqual(await run(c.input, file.places), c.output, c.id);
});

test('the file states the rules it shows: watering read by no rule yet, a grower shift and a soil test change verdicts', () => {
  const out = (id) => file.cases.find((c) => c.id === id).output;
  assert.deepEqual(out('mendoza-rain-only'), out('mendoza-watered-all-year'), 'watering waits for its rule (F4)');
  assert.notDeepEqual(out('lyon-2c-colder').fit, out('lyon-today').fit, '2 °C colder changes a verdict');
  assert.notDeepEqual(out('lyon-soil-test-chalky').fit, out('lyon-today').fit, 'a soil test is read');
  assert.equal(file.cases.find((c) => c.id === 'seville-200-plants').input.members.length, 200, 'a 200-plant palette');
  const thinJobs = (id) => out(id).lanes.filter((l) => l.thin).length;
  assert.ok(out('seville-200-plants').lanes.some((l) => Math.max(...l.counts) > 12), 'no lane is capped at a count');
  assert.ok(thinJobs('lyon-3-per-job') >= thinJobs('lyon-today'), 'a higher goal leaves at least as many thin jobs');
  for (const c of file.cases) for (const l of c.output.lanes) if (l.thin) assert.ok(l.lane.startsWith('job:'), `${c.id}: only jobs are thin`);
  assert.deepEqual(out('no-location').fit.unknown.length, file.cases.find((c) => c.id === 'no-location').input.members.length, 'no location: every member unknown');
});
