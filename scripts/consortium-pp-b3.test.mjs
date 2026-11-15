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

let n = 0;
const plant = (over = {}) => taxon({ id: `00000000-ba1a-4000-8000-${String(++n).padStart(12, '0')}`, canonical_name: `Plantus ${n}`, genus: `Plantus${n}`, ...over });
const said = (l) => l.line.key.split('.').pop();
// The context weighLines takes (the (site, period) of climateFor, architecture 3.1): today, no site.
const TODAY = { lookup: null, period: '1991-2020' };

// ---- weigh.json (the shared envelope; the adapter from the vectors' export fields lives here). The
// parked F1a-B1, B2 and B4 (648baf2) are its cases "six of eight", "two of ten" and "borrowed". ----
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

test('weigh.json: each case gives its lines (family, water) in order, [] at 0 members, "checking" while a list loads, the plants not checked counted in m', () => {
  for (const c of W.cases) {
    const out = weighLines(c.input.members.map((k) => wPlant(k, c.input.list)), TODAY, { pending: c.input.pending ?? false, unchecked: c.input.unchecked ?? 0 });
    if (c.expect === 'checking') { assert.equal(out, 'checking', c.name); continue; }
    assert.ok(Array.isArray(out), `${c.name}: lines`);
    assert.deepEqual(out.map((l, i) => asVector(l, c.expect.lines[i] ?? {})), c.expect.lines, c.name);
  }
});

// The thresholds block, read against the behaviour at its boundaries (review b3f-5): exactly the
// share recorded is judged, one fewer is "not enough"; the family minimum and share both bind.
test('weigh.json thresholds: the water share and the family minimum and share are where weighLines turns', () => {
  const { water_judge_share: share, family_min: min, family_share: fshare } = W.thresholds;
  const m = 20, judged = Math.ceil(share * m);
  const wet = (i) => plant({ family: `F${i}`, traits: { drought_tolerance: i % 2 ? 'High' : 'Low' } });
  const bare = (i) => plant({ family: `G${i}`, traits: {} });
  const water = (n) => lines(weighLines([...Array.from({ length: n }, (_, i) => wet(i)), ...Array.from({ length: m - n }, (_, i) => bare(i))], TODAY)).find((l) => l.kind === 'water');
  assert.equal(said(water(judged)), 'waterMix', `${judged} of ${m} recorded is judged`);
  assert.equal(said(water(judged - 1)), 'waterFew', `${judged - 1} of ${m} is not enough to judge`);
  const fam = (k, size) => lines(weighLines([...Array.from({ length: k }, () => plant({ family: 'Fabaceae' })), ...Array.from({ length: size - k }, (_, i) => plant({ family: `H${i}` }))], TODAY)).some((l) => l.kind === 'family');
  assert.equal(fam(min, min), true, `${min} of ${min}: a family line`);
  assert.equal(fam(min - 1, min - 1), false, `${min - 1} plants are under the family minimum`);
  const big = Math.ceil(min / fshare) + 4, need = Math.ceil(fshare * big);
  assert.equal(fam(need, big), true, `${need} of ${big} is a quarter: a line`);
  assert.equal(fam(need - 1, big), false, `${need - 1} of ${big} is under the share`);
});
const lines = (out) => { assert.ok(Array.isArray(out), 'lines, not "checking"'); return out; };

// The one drought-then-moisture classifier, beside factAt, whose water_need site.ts's water check reads
// too (review b3f-6/7); weigh.ts groups by it (L10: weigh.ts may not import site.ts).
test('source.ts waterNeed: drought tolerance first (High dry, Medium medium, Low or None regular), else moisture use (Low dry, Medium medium, High regular), else not recorded', async () => {
  const { waterNeed } = await import('../src/lib/consortium/source.ts');
  const cases = [
    [{ drought: 'High', moisture: 'High' }, 'dry'], [{ drought: 'Medium', moisture: null }, 'medium'], [{ drought: 'Low', moisture: 'Low' }, 'regular'],
    [{ drought: 'None', moisture: null }, 'regular'], [{ drought: null, moisture: 'Low' }, 'dry'], [{ drought: null, moisture: 'Medium' }, 'medium'],
    [{ drought: null, moisture: 'High' }, 'regular'], [null, null],
  ];
  for (const [w, want] of cases) assert.equal(waterNeed(w), want, JSON.stringify(w));
  const w = await import('../src/lib/consortium/weigh.ts');
  assert.deepEqual(Object.keys(w).sort(), ['sizeLine', 'weighLines', 'yourPlants'], 'weigh.ts exports');
  const src = (await import('node:fs')).readFileSync(new URL('../src/lib/consortium/weigh.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /DROUGHT|MOISTURE/, 'weigh.ts keeps no water table of its own');
});

// ---- Your plants (new form of the deleted F1a-P10: each plant once, warnings first) ----
const { yourPlants, sizeLine } = await import('../src/lib/consortium/weigh.ts');

test('Your plants lists each plant once, warnings first (a Slight or Moderate toxic, an invasive, a misfit, a high or medium conflict), then the plants it cannot show (a list unread, on no list of this climate), then the rest, in palette order within each group; a low conflict alone does not lead', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const [a, b, c, d, e, f, g, h] = ids.map((id) => plant({ id }));
  const flags = [
    { id: 'c', kind: 'toxicity' }, { id: 'e', kind: 'invasive' }, { id: 'b', kind: 'conflict', other: 'h', severity: 'low' },
    { id: 'g', kind: 'conflict', other: 'a', severity: 'medium' }, { id: 'f', kind: 'misfit' }, { id: 'c', kind: 'invasive' },
  ];
  const rows = yourPlants([a, b, c, d, a, e, f, g, h], flags, { failed: ['x'], unlisted: ['y', 'x'] });
  assert.deepEqual(rows.map((r) => r.plant?.id ?? r.id), ['c', 'e', 'f', 'g', 'x', 'y', 'a', 'b', 'd', 'h'], 'warned first, then the ones not shown, each plant once');
  assert.deepEqual(rows.map((r) => r.warned ?? r.missing), [true, true, true, true, 'failed', 'unlisted', false, false, false, false]);
  assert.deepEqual(yourPlants([], flags), [], 'nothing at 0 plants');
  assert.deepEqual(yourPlants([], [], { failed: ['x'], unlisted: [] }).map((r) => [r.id, r.missing]), [['x', 'failed']], 'a palette of one unread plant still has its row');
  assert.deepEqual(yourPlants([a], []).map((r) => r.plant.id), ['a'], 'one plant, one row');
  // A guest of a list that failed which the chosen list holds too is shown (review b3f-1): no row of
  // its own, so not counted as not checked.
  assert.deepEqual(yourPlants([a, b], [], { failed: ['b', 'x'], unlisted: ['a'] }).map((r) => r.plant?.id ?? `${r.id}:${r.missing}`), ['x:failed', 'a', 'b']);
});

test('size line words: the height is the wild maximum (types.ts Traits.height_m), so each size line with a height says "in the wild", in every locale', async () => {
  const fs = await import('node:fs');
  // The words Details uses for the same fact (consortium.details.heightV).
  const WILD = { en: /in the wild/, fr: /dans la nature/, es: /en estado silvestre/, pt: /na natureza/, it: /in natura/, zh: /野生/, de: /wild/i, ja: /野生/, ko: /야생/, nl: /in het wild/, ru: /в природе/i };
  for (const [lang, wild] of Object.entries(WILD)) {
    const t = JSON.parse(fs.readFileSync(new URL(`../src/i18n/translations/${lang}.json`, import.meta.url), 'utf8'));
    for (const k of ['size', 'sizeTall']) assert.match(t[`consortium.plants.${k}`], wild, `${lang} ${k}: "${t[`consortium.plants.${k}`]}"`);
  }
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
