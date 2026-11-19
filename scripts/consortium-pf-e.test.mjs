// pf-e "Many plants" (chunk 3): the lasting layer under Your plants and Paste, in Node. Your plants'
// model (views/plants/model.ts: the fit order, sort, groups, search and fold) and the Paste matcher's
// rules (views/find/paste.ts: every line read with no cap, the repeats counted, the A16 name ranking, a
// guess never taken unasked unless you already have it). The screens are tested in
// scripts/browser/consortium-pf-e.browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../src/islands/consortium/views/plants/model.ts');
const { pasteNames, readPaste, plan, pasteCounts } = await import('../src/islands/consortium/views/find/paste.ts');
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

test('BC3 small form order: outside, a second look, marks only (Mildly toxic), fits, not checked; palette order within a rank; a row the page cannot show last', () => {
  // kiambu-8's case: two Toxic plants, a Mildly toxic one before a recorded invasive one in palette order.
  const ts = ['Bean', 'Avocado', 'Silk oak', 'Calliandra', 'Pigeon pea', 'Napier'].map((n, i) => taxon(`p${i}`, n));
  const g = groups({ look: ['p0', 'p1', 'p3'], fits: ['p2', 'p4'], mild: ['p2'], unknown: ['p5'] });
  g.reasons.moderate = ['p0', 'p1']; g.reasons.invasive = ['p3'];
  const rank = new Map(M.plantItems(ts, g, (t) => t.names.en).map((i) => [i.id, i.rank]));
  const rows = [...ts.map((t) => ({ id: t.id })), { id: 'gone' }];
  const order = M.byFitRank(rows, (r) => r.id, rank).map((r) => r.id);
  assert.deepEqual(order, ['p0', 'p1', 'p3', 'p2', 'p4', 'p5', 'gone']);
  assert.ok(order.indexOf('p2') > order.indexOf('p3'), 'a Mildly-toxic-only row never comes before a second look');
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

// ---- fix round 1, batch 2 ----

test('BC15 A16: "beans" ranks the plain names first (fewest words), then the genus most of them share, then by name; a plant you have stays a choice', () => {
  const beans = [
    plant('c1', 'Canavalia ensiformis', 'Sword bean'), plant('c2', 'Canavalia gladiata', 'Sword bean'),
    plant('i1', 'Inga edulis', 'Ice Cream Bean'), plant('p3', 'Phaseolus coccineus', 'Scarlet runner bean'),
    plant('p2', 'Phaseolus lunatus', 'Lima bean'), plant('p1', 'Phaseolus vulgaris', 'Common bean'),
    plant('r1', 'Ricinus communis', 'Castor bean'), plant('v1', 'Vicia faba', 'Fava bean'),
    plant('g1', 'Beanus grandis', 'Giant shrub'),
  ];
  const idx = releaseIndex({ lang: 'en', names: beans.map((p) => ({ id: p.id, canonical: p.canonical_name, names: p.names })) });
  const r = readPaste(pasteNames('beans'), { here: beans, index: idx, members: ['p1'] });
  assert.equal(r.choose.length, 1);
  assert.deepEqual(r.choose[0].taxa.map((t) => t.names.en), ['Common bean', 'Lima bean', 'Sword bean', 'Sword bean', 'Castor bean', 'Fava bean', 'Scarlet runner bean', 'Ice Cream Bean', 'Giant shrub']);
  assert.deepEqual(r.choose[0].inside, ['p1'], 'Common bean, in the palette, stays offered and is said to be in it');
  assert.ok(r.choose[0].loose, 'a loose word: no plant has "beans" as a whole name');
  assert.equal(readPaste(pasteNames('sword bean'), { here: beans, index: idx }).choose[0].loose, false, 'a name two plants share is no loose word');
});

test('BC20: a close spelling found only on another list is a choice like any other: ticked, it is added from that list', () => {
  const here0 = [plant('h1', 'Malus domestica', 'Apple')];
  const tropical = [plant('t1', 'Musa acuminata', 'Banana')];
  const idx = releaseIndex({ lang: 'en', names: [...here0, ...tropical].map((p) => ({ id: p.id, canonical: p.canonical_name, names: p.names })) });
  const r = readPaste(pasteNames('Bananna'), { here: here0, others: [['Tropical', tropical]], index: idx });
  assert.deepEqual(r.other.map((o) => [o.taxon.id, !!o.close]), [['t1', true]]);
  assert.deepEqual(plan(r, [], []).ids, [], 'never added unasked');
  const p = plan(r, ['t1'], []);
  assert.deepEqual([p.ids, p.climateOf.get('t1')], [['t1'], 'Tropical']);
});

// ---- fix round 1, batch 3 ----

test('R4: a repeated line counts in its own group: a name not found twice is 2 not found, a question twice 2 to choose, and neither is "recognised" or "listed twice"', () => {
  const lost = readPaste(pasteNames('sukuma wiki\nCommon bean\nsukuma wiki'), { here, index });
  assert.deepEqual(pasteCounts(lost, []), { lines: 3, rec: 1, choose: 0, none: 2, fresh: 1, other: 0, have: 0, twice: 0 });
  const asked = readPaste(pasteNames('beans\nbeans'), { here, index });
  assert.deepEqual(pasteCounts(asked, []), { lines: 2, rec: 0, choose: 2, none: 0, fresh: 0, other: 0, have: 0, twice: 0 });
  const kept = readPaste(pasteNames('Common bean\ncommon bean\nLima bean'), { here, index });
  assert.deepEqual(pasteCounts(kept, []), { lines: 3, rec: 3, choose: 0, none: 0, fresh: 2, other: 0, have: 0, twice: 1 }, 'a recognised repeat: recognised, listed twice');
});

test('R14: the Recognised head\'s "new" is what Add all adds; plants of another climate\'s list are counted apart', () => {
  const tropical = [plant('t1', 'Musa acuminata', 'Banana'), plant('t2', 'Carica papaya', 'Papaya')];
  const idx = releaseIndex({ lang: 'en', names: [...here, ...tropical].map((p) => ({ id: p.id, canonical: p.canonical_name, names: p.names })) });
  const r = readPaste(pasteNames('Common bean\nLima bean\nBanana\nPapaya'), { here, others: [['Tropical', tropical]], index: idx });
  const c = pasteCounts(r, []);
  assert.equal(c.fresh, plan(r, [], []).ids.length, 'the head and Add all read one list');
  assert.deepEqual([c.fresh, c.other, c.rec], [2, 2, 4]);
});
