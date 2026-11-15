// PP-B stream b3 (plant-palette-slices section 2, row b3; plant-palette-architecture 2, inventory P39 and
// F5): the lasting layer under "Your plants" and "Things to weigh". Core weigh.ts on its vectors
// (scripts/vectors/weigh.json, the shared envelope of conventions/palette-vectors); the three F1a
// Balance markers parked by PP-B commit 0 (scripts/plan/parked-markers.json: F1a-B1, B2, B4), restored
// from 648baf2's consortium-balance.test.mjs and rewritten on weigh.ts. Written failing first
// (scripts/expect-fail.mjs failing(), owner b3 in each title); each marker went in the commit that
// made it pass.
import assert from 'node:assert/strict';
import test from 'node:test';
import { taxon } from './consortium-p5-fixtures.mjs';

const { weighLines } = await import('../src/lib/consortium/weigh.ts');

// ---- the parked Balance markers, rewritten on weigh.ts (F1a-B1, B2, B4 at 648baf2) ----
let n = 0;
const plant = (over = {}) => taxon({ id: `00000000-ba1a-4000-8000-${String(++n).padStart(12, '0')}`, canonical_name: `Plantus ${n}`, genus: `Plantus${n}`, ...over });
// A diverse set: eight families, water needs recorded for each.
const WATER = ['Low', 'Medium', 'High'];
const diverse = () => ['Fagaceae', 'Rosaceae', 'Fabaceae', 'Lamiaceae', 'Asteraceae', 'Betulaceae', 'Juglandaceae', 'Ericaceae']
  .map((family, i) => plant({ family, traits: { drought_tolerance: WATER[i % 3], moisture_use: WATER[(i + 1) % 3] } }));
// Legume-heavy (the Tropical palette of the design check's scenario): six of eight in Fabaceae.
const legumes = () => [...Array.from({ length: 6 }, () => plant({ family: 'Fabaceae', genus: `Inga${++n}` })), plant({ family: 'Musaceae' }), plant({ family: 'Rubiaceae' })];
const lines = (members, opts) => { const out = weighLines(members, opts); assert.ok(Array.isArray(out), 'lines, not "checking"'); return out; };
const said = (l) => l.line.key.split('.').pop();

test('b3-B1 (b3 family spread on weigh.ts, F1a-B1 restored, A20): six of eight members in one family is a line to weigh naming the family and its six; eight families give no family line', () => {
  const members = legumes();
  const heavy = lines(members).find((l) => l.kind === 'family');
  assert.ok(heavy, 'family spread: six of eight in Fabaceae gives no line to weigh (none today)');
  assert.equal(heavy.line.vars.family, 'Fabaceae', 'the line names the family too many share');
  assert.deepEqual([heavy.line.vars.n, heavy.line.vars.m], [6, 8]);
  assert.deepEqual(heavy.members, members.slice(0, 6).map((t) => t.id), 'and the six members in it');
  assert.equal(lines(diverse()).filter((l) => l.kind === 'family').length, 0, 'eight families: no family line, and no pass claimed');
});

test('b3-B2 (b3 water needs on weigh.ts, F1a-B2 restored, A20): two of ten water needs recorded says "not enough to judge", 2 of 10, never a pass', () => {
  const members = [...Array.from({ length: 2 }, () => plant({ traits: { drought_tolerance: 'Low' } })), ...Array.from({ length: 8 }, () => plant({ traits: {} }))];
  const water = lines(members).find((l) => l.kind === 'water');
  assert.equal(water && said(water), 'waterFew', `water needs: 2 of 10 recorded is not "not enough to judge" (${water ? said(water) : 'no line'} today)`);
  assert.deepEqual([water.line.vars.n, water.line.vars.m], [2, 10]);
});

test('b3-B4 (b3 borrowed list on weigh.ts, F1a-B4 restored, A20, A15): on a borrowed list every weigh line carries the estimate term', () => {
  const borrowed = legumes().map((t) => ({ ...t, origin: { list: 'Mediterranean', kind: 'borrowed' } }));
  const out = lines(borrowed);
  assert.ok(out.length, 'a weigh line on a borrowed list, carries no estimate term on a borrowed list (no line today)');
  for (const l of out) assert.equal(l.line.vars.term, 'estimate', `${l.kind} carries no estimate term on a borrowed list`);
  assert.ok(lines(legumes()).every((l) => l.line.vars.term === undefined), 'an own list carries none');
});

// ---- weigh.json (the shared envelope; the adapter from the vectors' export fields lives here) ----
const W = JSON.parse((await import('node:fs')).readFileSync(new URL('vectors/weigh.json', import.meta.url), 'utf8'));
const wPlant = (key, list) => taxon({
  id: key, canonical_name: key, genus: key, family: W.plants[key].family ?? null,
  traits: { drought_tolerance: W.plants[key].drought_tolerance ?? null, moisture_use: W.plants[key].moisture_use ?? null },
  ...(list === 'borrowed' ? { origin: { list: 'Mediterranean', kind: 'borrowed' } } : {}),
});
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
// A WeighLine as the vectors say it: rule outputs only (never the i18n key).
const asVector = (l, want) => {
  const v = { kind: l.kind, says: kebab(said(l)), ...l.line.vars, members: l.members, estimate: l.line.vars.term === 'estimate' };
  delete v.term;
  return Object.fromEntries(Object.keys(want).map((k) => [k, v[k]]));
};

test('weigh.json: a known schema id, and every plant a case names is in the file', () => {
  assert.equal(W.schema, 'canopi-palette-weigh/1');
  for (const c of W.cases) for (const k of c.input.members) assert.ok(W.plants[k], `${c.name}: plant ${k}`);
});

test('weigh.json: each case gives its lines (family, water) in order, [] at 0 members, "checking" while a list loads', () => {
  for (const c of W.cases) {
    const out = weighLines(c.input.members.map((k) => wPlant(k, c.input.list)), { pending: c.input.pending ?? false });
    if (c.expect === 'checking') { assert.equal(out, 'checking', c.name); continue; }
    assert.ok(Array.isArray(out), `${c.name}: lines`);
    assert.deepEqual(out.map((l, i) => asVector(l, c.expect.lines[i] ?? {})), c.expect.lines, c.name);
  }
});

test('weigh.ts thresholds are the vectors\' (one "not enough to judge" share, the family minimum and share)', async () => {
  const w = await import('../src/lib/consortium/weigh.ts');
  assert.deepEqual({ water_judge_share: w.WATER_JUDGE_SHARE, family_min: w.FAMILY_MIN, family_share: w.FAMILY_SHARE }, W.thresholds);
});

// ---- Your plants (new form of the deleted F1a-P10: each plant once, warnings first) ----
const { yourPlants, sizeLine } = await import('../src/lib/consortium/weigh.ts');

test('Your plants lists each plant once, warnings first (a Slight or Moderate toxic, an invasive, a misfit, a high or medium conflict), in palette order within each group; a low conflict alone does not lead', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const [a, b, c, d, e, f, g, h] = ids.map((id) => plant({ id }));
  const flags = [
    { id: 'c', kind: 'toxicity' }, { id: 'e', kind: 'invasive' }, { id: 'b', kind: 'conflict', other: 'h', severity: 'low' },
    { id: 'g', kind: 'conflict', other: 'a', severity: 'medium' }, { id: 'f', kind: 'misfit' }, { id: 'c', kind: 'invasive' },
  ];
  const rows = yourPlants([a, b, c, d, a, e, f, g, h], flags);
  assert.deepEqual(rows.map((r) => r.plant.id), ['c', 'e', 'f', 'g', 'a', 'b', 'd', 'h'], 'warned first, each plant once');
  assert.deepEqual(rows.map((r) => r.warned), [true, true, true, true, false, false, false, false]);
  assert.deepEqual(yourPlants([], flags), [], 'nothing at 0 plants');
  assert.deepEqual(yourPlants([a], []).map((r) => r.plant.id), ['a'], 'one plant, one row');
});

test('size line: full-grown width and height through formatLength; height without width says the width is not recorded (135 of 600 placements), and the reverse; neither is "No size recorded"', () => {
  const s = (traits) => sizeLine(plant({ traits }));
  assert.deepEqual(s({ height_m: { min: 2, max: 12 }, width_max_m: 8 }), { key: 'consortium.plants.size', vars: { width: 8, height: 12 } });
  assert.deepEqual(s({ height_m: { min: null, max: 4 }, width_max_m: null }), { key: 'consortium.plants.sizeTall', vars: { height: 4 } });
  assert.deepEqual(s({ height_m: null, width_max_m: 0.5 }), { key: 'consortium.plants.sizeWide', vars: { width: 0.5 } });
  assert.deepEqual(s({ height_m: { min: 1, max: null }, width_max_m: null }), { key: 'consortium.plants.sizeNone', vars: {} });
  assert.deepEqual(s({}), { key: 'consortium.plants.sizeNone', vars: {} });
});

// ---- toxicity levels (inventory F5; owner: mild = warning, moderate and above = danger, words and icon) ----
const core = await import('../src/lib/consortium/index.ts');

test('conflicts.ts raises a toxicity flag for Slight, Moderate and Severe, none for None or unrecorded; toxicity alone never warns (inform, don\'t block)', () => {
  const ctx = { site: core.UNSURE_SITE, interactions: [], country: null, countryStatus: 'none' };
  const tox = (level) => plant({ warnings: { toxicity: level ? { level, sources: ['x'] } : null, invasive_in: [], allelopathic: null, weed_potential: null } });
  for (const level of ['Slight', 'Moderate', 'Severe']) {
    const fl = core.flagsFor(tox(level), [], ctx);
    assert.deepEqual(fl.map((f) => f.kind), ['toxicity'], level);
    assert.equal(core.warns(fl), false, `${level} alone never asks`);
  }
  for (const level of ['None', null]) assert.deepEqual(core.flagsFor(tox(level), [], ctx), [], String(level));
});

test('kit/flags.ts: a Slight toxicity line says "Mildly toxic" at the warning level, Moderate and Severe at the danger level', async () => {
  const strings = await import('../src/islands/consortium/strings.ts');
  const en = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  strings.setStrings(Object.fromEntries(Object.entries(en).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice(11), v])), 'en');
  const { flagLines } = await import('../src/islands/consortium/views/kit/flags.ts');
  const scene = { site: core.UNSURE_SITE, members: [], country: null, taxonOf: () => null };
  const want = { Slight: ['warning', 'Mildly toxic'], Moderate: ['danger', 'Toxic'], Severe: ['danger', 'Very toxic'] };
  for (const [level, [tone, word]] of Object.entries(want)) {
    const t = plant({ warnings: { toxicity: { level, sources: ['x'] }, invasive_in: [], allelopathic: null, weed_potential: null } });
    const [line] = flagLines(t, [{ id: t.id, kind: 'toxicity' }], scene);
    assert.equal(line.kind, 'toxicity');
    assert.equal(line.level, tone, `${level}: the ${tone} level`);
    assert.ok(line.text.startsWith(word), `${level}: "${line.text}" says ${word}`);
  }
});
