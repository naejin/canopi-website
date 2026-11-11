// "Download for Canopi" (design check A11, stream S4): the consortium as a Canopi design file, v9,
// written by the pure core function canopiFile (src/lib/consortium/canopi-file.ts) and validated
// against the app's own format at canopi 0c425fb07 (scripts/vendor/canopi-design-format/, test-only).
// Plants come from the invented fixture database through the island's SQLite adapter, plus invented
// records for the edge cases (no layer yet, a guest from another list).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { CANOPI_FILE_SCHEMA, CURRENT_CANOPI_FILE_VERSION } from './vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from './vendor/canopi-design-format/validate.mjs';

const core = await import('../src/lib/consortium/index.ts');
const { canopiFile, canopiFileName, CANOPI_FILE_VERSION, phases } = core;

const fixtureDir = new URL('fixtures/consortium-v2/export/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureDir), 'utf8'));
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
const raw = new Uint8Array(gunzipSync(readFileSync(new URL(manifest.files[0].file, fixtureDir))));
const opened = await openBytes(raw, { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) });
const source = createSqliteSource(opened.db, { images: {} });
const temperate = await source.pool('Temperate');
const tropical = await source.pool('Tropical');
const AT = '2026-11-11T10:00:00.000Z';
const opts = { name: 'Consortium · Temperate', description: 'Made with the Canopi consortium tool.', at: AT };

test('the writer targets the app format version the vendored schema names', () => {
  assert.equal(typeof canopiFile, 'function', 'canopiFile is built (no longer the null stub)');
  assert.equal(CANOPI_FILE_VERSION, CURRENT_CANOPI_FILE_VERSION);
});

test('a fixture consortium is a valid v9 design: one consortium entry per member, phases as phases.ord', () => {
  const members = temperate.slice(0, 9);
  const doc = JSON.parse(canopiFile(members, opts));
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), [], 'valid against the app schema');
  assert.equal(doc.version, 9);
  assert.equal(doc.name, opts.name);
  assert.equal(doc.description, opts.description);
  assert.equal(doc.created_at, AT);
  assert.equal(doc.updated_at, AT);
  assert.deepEqual(doc.plants, [], 'no plant is placed on a map: the file carries the consortium only');
  assert.equal(doc.consortiums.length, members.length);
  members.forEach((t, i) => {
    const c = doc.consortiums[i];
    assert.deepEqual(c.target, { kind: 'species', canonical_name: t.canonical_name });
    assert.equal(c.stratum, t.stratum.value);
    assert.equal(c.start_phase, phases.indexOf(t.phases.start));
    assert.equal(c.end_phase, phases.indexOf(t.phases.end));
    assert.ok(c.start_phase >= 0 && c.end_phase <= 6 && c.start_phase <= c.end_phase);
  });
});

test('every phase 0–6 maps to its own number, and the climax column is reachable', () => {
  const t = temperate[0];
  for (let s = 0; s < 7; s++) {
    const plant = { ...t, phases: { start: phases[s], end: phases[6], sources: [] } };
    const [c] = JSON.parse(canopiFile([plant], opts)).consortiums;
    assert.equal(c.start_phase, s);
    assert.equal(c.end_phase, 6);
  }
});

test('a plant with no layer yet is "unassigned" with the app defaults (0–2), never dropped', () => {
  const t = { ...temperate[0], stratum: null, phases: null };
  const doc = JSON.parse(canopiFile([t], opts));
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), []);
  assert.deepEqual(doc.consortiums[0], { target: { kind: 'species', canonical_name: t.canonical_name }, stratum: 'unassigned', start_phase: 0, end_phase: 2 });
});

test('a guest keeps its home placement; a plant listed twice is written once', () => {
  const guest = { ...tropical[0], from: 'Tropical' };
  const doc = JSON.parse(canopiFile([temperate[1], guest, temperate[1]], opts));
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), []);
  assert.deepEqual(doc.consortiums.map((c) => c.target.canonical_name), [temperate[1].canonical_name, guest.canonical_name]);
  assert.equal(doc.consortiums[1].stratum, guest.stratum.value);
});

test('an empty consortium is still a valid design', () => {
  const doc = JSON.parse(canopiFile([], opts));
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), []);
  assert.deepEqual(doc.consortiums, []);
});

test('the writer is pure: the same input gives the same bytes', () => {
  assert.equal(canopiFile(temperate, opts), canopiFile(temperate, opts));
});

test('the file name is the name made safe for every file system, ending in .canopi', () => {
  assert.equal(canopiFileName('Consortium · Temperate'), 'Consortium · Temperate.canopi');
  assert.equal(canopiFileName('a/b\\c:d*e?f"g<h>i|j'), 'a-b-c-d-e-f-g-h-i-j.canopi');
  assert.equal(canopiFileName('   '), 'consortium.canopi');
  assert.ok(canopiFileName('x'.repeat(300)).length <= 120 + '.canopi'.length);
});
