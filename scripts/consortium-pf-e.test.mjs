// pf-e "Many plants" (chunk 3): the lasting layer under Your plants and Paste, in Node. Your plants'
// model (views/plants/model.ts: the fit order, sort, groups, search and fold) and the Paste matcher's
// rules (views/find/paste.ts: every line read with no cap, the repeats counted, the A16 name ranking, a
// guess never taken unasked unless you already have it). The screens are tested in
// scripts/browser/consortium-pf-e.browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../src/islands/consortium/views/plants/model.ts');
const { pasteNames, readPaste, plan } = await import('../src/islands/consortium/views/find/paste.ts');
const { releaseIndex } = await import('../src/islands/consortium/data/search.ts');

const taxon = (id, name, { stratum = null, family = null, functions = [], years = null } = {}) => ({
  id, canonical_name: `${name} sp`, names: { en: name }, family,
  stratum: stratum ? { value: stratum } : null, functions, traits: {}, years,
});
const groups = (over = {}) => ({
  fits: [], look: [], outside: [], unknown: [], mild: [], mildFits: 0, outsideToxic: [], reasonCount: 0, several: 0,
  reasons: { edge: [], severe: [], moderate: [], invasive: [], misfit: [], clash: [] }, ...over,
});
const cmp = (a, b) => a.localeCompare(b, 'en');

test('fit order: outside, a second look, fits with a mark, fits, not checked; then by name', () => {
  const ts = ['Elm', 'Ash', 'Fig', 'Bay', 'Cob', 'Dill'].map((n, i) => taxon(`p${i}`, n));
  const g = groups({ outside: ['p0'], look: ['p1'], fits: ['p2', 'p3', 'p5'], mild: ['p3'], unknown: ['p4'] });
  g.reasons.severe = ['p1'];
  const items = M.plantItems(ts, g, (t) => t.names.en);
  assert.deepEqual(M.sortItems(items, 'fit', cmp, []).map((i) => i.name), ['Elm', 'Ash', 'Bay', 'Dill', 'Fig', 'Cob']);
  assert.equal(items.find((i) => i.id === 'p1').reason, 'severe', 'the second look names its reason');
  assert.equal(items.find((i) => i.id === 'p3').reason, 'mild', 'Mildly toxic stays under fits (R1)');
  assert.deepEqual(M.sortItems(items, 'name', cmp, []).map((i) => i.name), ['Ash', 'Bay', 'Cob', 'Dill', 'Elm', 'Fig']);
});

test('groups: light levels sunniest first, the plants with none last; one group for "No groups"', () => {
  const ts = [taxon('a', 'A', { stratum: 'low' }), taxon('b', 'B', { stratum: 'emergent' }), taxon('c', 'C'), taxon('d', 'D', { stratum: 'low' })];
  const items = M.plantItems(ts, groups({ fits: ['a', 'b', 'c', 'd'] }), (t) => t.names.en);
  assert.deepEqual(M.groupItems(items, 'light', cmp, []).map((g) => [g.key, g.items.map((i) => i.id)]), [['emergent', ['b']], ['low', ['a', 'd']], ['', ['c']]]);
  assert.equal(M.groupItems(items, 'none', cmp, []).length, 1);
  assert.deepEqual(M.groupItems([], 'none', cmp, []), []);
});

test('search: name or scientific name, accents and case folded; a group opens to 10, then all', () => {
  const items = M.plantItems([taxon('a', 'Châtaignier'), taxon('b', 'Apple')], groups({ fits: ['a', 'b'] }), (t) => t.names.en);
  assert.deepEqual(M.searchItems(items, 'CHATAI').map((i) => i.id), ['a']);
  assert.equal(M.searchItems(items, '  ').length, 2);
  assert.deepEqual([M.shownRows(25, 0), M.shownRows(25, 1), M.shownRows(25, 2), M.shownRows(4, 1)], [0, 10, 25, 4]);
});

// The matcher on a small release index.
const plant = (id, canonical_name, en) => ({ id, canonical_name, genus: canonical_name.split(' ')[0], names: { en } });
const here = [
  plant('b1', 'Phaseolus vulgaris', 'Common bean'), plant('b2', 'Phaseolus lunatus', 'Lima bean'),
  plant('l1', 'Albizia lebbeck', 'Lebbeck tree'), plant('n1', 'Cenchrus purpureus', 'Napiergrass'),
];
const index = releaseIndex({ lang: 'en', names: here.map((p) => ({ id: p.id, canonical: p.canonical_name, names: p.names, other: p.id === 'l1' ? [{ lang: 'en', text: 'Woman’s tongue bean' }] : [] })) });

test('no cap: every line is read; a repeated line counts as read and listed twice', () => {
  const text = Array.from({ length: 450 }, (_, i) => `name ${i}`).concat(['Common bean', 'common bean']).join('\n');
  const names = pasteNames(text);
  assert.equal(names.length, 451);
  assert.equal(names.repeats, 1);
  assert.ok(names.twice.has('Common bean'));
});

test('A16: "beans" asks, the plants whose own name holds "bean" first, nothing chosen; Add counts the chosen', () => {
  const r = readPaste(pasteNames('beans'), { here, index });
  assert.equal(r.choose.length, 1);
  assert.equal(r.choose[0].word, 'bean');
  assert.deepEqual(r.choose[0].taxa.slice(0, 2).map((t) => t.id).sort(), ['b1', 'b2']);
  assert.deepEqual(plan(r, [], []).ids, [], 'nothing taken unasked');
  assert.deepEqual(plan(r, ['b2'], []).ids, ['b2']);
});

test('a search guess of one plant asks, unless you already have it', () => {
  assert.deepEqual(readPaste(pasteNames('napier'), { here, index }).choose.map((c) => c.taxa.map((t) => t.id)), [['n1']]);
  const had = readPaste(pasteNames('napier'), { here, index, members: ['n1'] });
  assert.deepEqual([had.choose.length, had.already.map((a) => a.taxon.id)], [0, ['n1']]);
});

test('a hand-typed comma list is read word by word; a scientific name says so', () => {
  const r = readPaste(pasteNames('Phaseolus vulgaris, lima bean'), { here, index });
  assert.deepEqual(r.found.map((f) => [f.taxon.id, !!f.sci]), [['b1', true], ['b2', false]]);
});
