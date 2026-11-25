// Stream S3's paste helpers (consortium v2, design check §2 port table): reading a pasted list of
// plant names and matching it against the climate lists (views/find/paste.ts, ported from v1 scale.js on
// S1's `fold`). The layer values' helpers are tested in consortium-layers.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const { pasteNames, pasteTable, binomial, matchName, pasteLists, readPaste, looksLikeHeader, plan } = await import('../src/islands/palette/views/find/paste.ts');
const { oneOff, releaseIndex } = await import('../src/islands/palette/data/search.ts');

const plant = (id, canonical_name, names = {}) => ({ id, canonical_name, genus: canonical_name.split(' ')[0], names });
const temperate = [
  plant('t1', 'Malus domestica', { en: 'Apple', fr: 'Pommier' }),
  plant('t2', 'Castanea sativa', { en: 'European chestnut', fr: 'Châtaignier' }),
  plant('t3', 'Crataegus monogyna', { en: 'Hawthorn', de: 'Weißdorn' }),
  plant('t4', 'Rubus idaeus', { en: 'Raspberry' }),
  plant('t5', 'Rubus fruticosus', { en: 'Blackberry' }),
];
const tropical = [plant('p1', 'Inga edulis', { en: 'Ice-cream bean' }), plant('p2', 'Musa acuminata', { en: 'Banana' })];

test('a pasted list: one name per line, commas and semicolons split, each name once, blank lines dropped', () => {
  assert.deepEqual([...pasteNames('Apple\n\n  Hawthorn ; Raspberry,apple\n')], ['Apple', 'Hawthorn', 'Raspberry']);
});

test('a spreadsheet paste reads its columns; a header row of column words is left out and kept apart', () => {
  const text = 'Scientific name\tQty\nMalus domestica\t3\n"Castanea sativa"\t1\n';
  assert.equal(pasteTable(text).columns, 2);
  const names = pasteNames(text);
  assert.deepEqual([...names], ['Malus domestica', 'Castanea sativa']);
  assert.equal(names.header, 'Scientific name');
  assert.ok(looksLikeHeader('Nom latin'));
  assert.ok(!looksLikeHeader('Malus domestica'));
});

test('binomials drop authors and rank words; one letter off needs five letters or more', () => {
  assert.equal(binomial('Malus domestica Borkh.'), 'malus domestica');
  assert.equal(binomial('Rubus subsp. idaeus'), 'rubus idaeus');
  assert.equal(binomial('Apple'), null);
  assert.ok(oneOff('hawthorn', 'hawtorn'));
  assert.ok(!oneOff('rose', 'rost'));
});

test('matching: scientific name, then binomial, then a common name in any language, folded (marks, ß, case)', () => {
  const idx = pasteLists(temperate);
  assert.deepEqual(matchName('MALUS DOMESTICA', idx), { how: 'exact', taxa: [temperate[0]], sci: true });
  assert.equal(matchName('Malus domestica Borkh.', idx).taxa[0].id, 't1');
  assert.equal(matchName('chataignier', idx).taxa[0].id, 't2');
  assert.equal(matchName('Weissdorn', idx).taxa[0].id, 't3');
});

test('matching: a genus alone lets the reader choose; a close spelling is marked', () => {
  const idx = pasteLists(temperate);
  const genus = matchName('Rubus', idx);
  assert.equal(genus.how, 'choose');
  assert.deepEqual(genus.taxa.map((t) => t.id).sort(), ['t4', 't5']);
  const close = readPaste(pasteNames('Hawtorn'), { here: temperate }).found;
  assert.deepEqual(close.map((f) => [f.taxon.id, f.close]), [['t3', 'Hawthorn']]);
  assert.equal(matchName('Zzzz plant', idx), null);
});

test('readPaste sorts every line: found here, in another climate (Add anyway), to choose, already in, not found', () => {
  const r = readPaste(pasteNames('Apple\nInga edulis\nRubus\nEuropean chestnut\nNot a plant at all'), {
    here: temperate, others: [['Tropical', tropical]], members: ['t2'],
  });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['t1']);
  assert.deepEqual(r.other.map((f) => [f.taxon.id, f.climate]), [['p1', 'Tropical']]);
  assert.deepEqual(r.choose.map((c) => c.taxa.length), [2]);
  assert.deepEqual(r.already.map((f) => f.taxon.id), ['t2']);
  assert.deepEqual(r.none.map((f) => f.name), ['Not a plant at all']);
});

test('readPaste lists a plant once even when two lines name it, and prefers this climate over another', () => {
  const both = [plant('t1', 'Malus domestica', { en: 'Apple' })];
  const r = readPaste(pasteNames('Apple\nMalus domestica'), { here: temperate, others: [['Tropical', both]], members: [] });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['t1']);
  assert.equal(r.other.length, 0);
});

test('readPaste lists a later line naming a plant already matched as a duplicate', () => {
  const r = readPaste(pasteNames('Apple\nMalus domestica\nPommier'), { here: temperate, members: [] });
  assert.deepEqual(r.found.map((f) => f.name), ['Apple']);
  assert.deepEqual(r.duplicate.map((d) => [d.name, d.taxon.id]), [['Malus domestica', 't1'], ['Pommier', 't1']]);
});

test('readPaste hides plants matched by another line from the choose groups; a group they leave empty keeps its line', () => {
  const r = readPaste(pasteNames('Rubus\nRaspberry'), { here: temperate, members: [] });
  assert.deepEqual(r.found.map((f) => [f.name, f.taxon.id]), [['Raspberry', 't4']]);
  assert.deepEqual(r.choose.map((c) => [c.name, c.word, c.taxa.map((t) => t.id)]), [['Rubus', 'Rubus', ['t5']]], 'a genus the other lines left with one plant stays a question: "Which Rubus?" with Blackberry, never added unasked (c1r4 U1)');
  const gone = readPaste(pasteNames('Rubus\nRaspberry\nBlackberry'), { here: temperate, members: [] });
  assert.deepEqual(gone.choose, []);
  assert.deepEqual(gone.duplicate.map((d) => [d.at, d.name]), [[0, 'Rubus']], '"Rubus" keeps its line, covered by the next lines');
});

// Fix round 2, r2-04: a pasted line always keeps its row and is counted ("Malus" then "Malus domestica").
test('r2-04: "Malus" then "Malus domestica": both lines are read, neither dropped', () => {
  const r = readPaste(pasteNames('Malus\nMalus domestica'), { here: temperate, members: [] });
  const lines = [...r.found, ...r.choose, ...r.other, ...r.already, ...r.duplicate, ...r.none].map((x) => x.at).sort();
  assert.deepEqual(lines, [0, 1], 'two lines, two readings');
  assert.deepEqual(r.found.map((f) => [f.name, f.taxon.id]), [['Malus', 't1']], 'a genus of one plant is that plant (K11)');
  assert.deepEqual(r.duplicate.map((d) => [d.name, d.taxon.id]), [['Malus domestica', 't1']]);
});

// Fix round 2, r2-03: case does not count in a pasted scientific name with authors.
test('r2-03: "PRUNUS AVIUM L." and "Malus Domestica Borkh." are found; ficus-indica still is', () => {
  const here = [...temperate, plant('c1', 'Prunus avium', { en: 'Sweet cherry' }), plant('h1', 'Opuntia ficus-indica', { en: 'Prickly pear' }), plant('h3', 'Opuntia ficus')];
  const r = readPaste(pasteNames('PRUNUS AVIUM L.\nMalus Domestica Borkh.\nOpuntia ficus-indica (L.) Mill.'), { here });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['c1', 't1', 'h1']);
});

test('readPaste falls back to a word-prefix search for a line with no match: "Chestnut" offers European chestnut to choose', () => {
  const r = readPaste(pasteNames('Chestnut\nIce'), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(r.choose.map((c) => [c.name, c.taxa.map((t) => t.id), c.climate]), [['Chestnut', ['t2'], null], ['Ice', ['p1'], 'Tropical']], 'a search guess stays a question, even of one plant (c1r3 T1)');
  assert.deepEqual([r.found, r.other, r.none], [[], [], []], 'nothing found unasked');
});

// c1r3 T1 (review c1r3-01): only a name (exact, or a genus) of one plant is found; Find's search is a
// guess, a question the grower answers: "Date" never silently adds Date plum.
test('c1r3 T1: "Date" asks about Date plum, never adds it; "Malus" (a genus of one) is found', () => {
  const here = [...temperate, plant('d1', 'Diospyros lotus', { en: 'Date plum' })];
  const r = readPaste(pasteNames('Date\nMalus'), { here, members: [] });
  assert.deepEqual(r.choose.map((c) => [c.name, c.taxa.map((t) => t.id)]), [['Date', ['d1']]], '"Date": Which date? (Date plum)');
  assert.deepEqual(r.found.map((f) => [f.name, f.taxon.id]), [['Malus', 't1']]);
});

// c1r3 T12 (board Paste "banana … listed twice, counted once"): a name pasted twice is one row, said so.
test('c1r3 T12: a name pasted twice is read once, and said to be listed twice', () => {
  const names = pasteNames('Apple\nHawthorn\napple');
  assert.deepEqual([...names], ['Apple', 'Hawthorn']);
  const r = readPaste(names, { here: temperate, members: [] });
  assert.deepEqual([...r.twice], ['Apple'], '"Apple" listed twice, counted once');
});

// c1r3 T21 (Chrome N7): Paste reads a slip by Find's close-spelling rule, one missing letter in a word
// of a longer name: "chesnut" is read as European chestnut (a close spelling, offered, not added).
test('c1r3 T21: "chesnut" is read as European chestnut, a close spelling', () => {
  const r = readPaste(pasteNames('chesnut'), { here: temperate, members: [] });
  assert.deepEqual(r.found.map((f) => [f.taxon.id, f.close]), [['t2', 'European chestnut']]);
});

// c1r4 U4 + U6: a close spelling is a reading the grower confirms: "Add all" adds it only once ticked;
// on another list or already in the palette it is still said to be a reading ("Read as …").
test('c1r4 U4: "chesnut" unticked is not added; ticked, it is', () => {
  const r = readPaste(pasteNames('chesnut\nApple'), { here: temperate, members: [] });
  assert.deepEqual(plan(r, [], []).ids, ['t1'], 'unticked: only the found Apple');
  assert.deepEqual(plan(r, ['t2'], []).ids.sort(), ['t1', 't2'], 'ticked: European chestnut too');
  assert.deepEqual(plan(r, ['t2'], ['t2']).ids, ['t1'], 'never a plant already in the palette');
});

test('c1r4 U4 + U6: a close spelling on another list, or already in the palette, keeps its reading', () => {
  const other = readPaste(pasteNames('chesnut'), { here: tropical, others: [['Temperate', temperate]], members: [] });
  assert.deepEqual(other.other.map((o) => [o.taxon.id, o.close]), [['t2', 'European chestnut']]);
  const mine = readPaste(pasteNames('chesnut'), { here: temperate, members: ['t2'] });
  assert.deepEqual(mine.already.map((a) => [a.taxon.id, a.close]), [['t2', 'European chestnut']]);
});

test('comma or semicolon columns: the same count on every line makes a table; a split cell never goes to the word-prefix search', () => {
  const csv = 'Malus domestica,Tree,Sun\nCastanea sativa,Tree,Sun\n';
  assert.deepEqual([pasteTable(csv).columns, pasteTable(csv).sep], [3, ',']);
  assert.equal(pasteTable('"Malus domestica";"Tree"\n"Rubus idaeus";"Shrub"').columns, 2);
  assert.deepEqual([...pasteNames('"Malus domestica";"Tree"\n"Rubus idaeus";"Shrub"')], ['Malus domestica', 'Tree', 'Rubus idaeus', 'Shrub'],
    'a quoted semicolon table: every cell, quotes dropped');
  assert.equal(pasteTable('Apple, Hawthorn\nRaspberry').columns, 1, 'uneven counts stay a list');
  const one = readPaste(pasteNames('Malus domestica,Tree,Sun'), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(one.found.map((f) => f.taxon.id), ['t1']);
  assert.deepEqual(one.choose, [], 'Tree and Sun are not offered by word prefix');
  assert.deepEqual(one.none.map((x) => x.name), ['Tree', 'Sun']);
});

test('comma or semicolon columns read every cell; tabs read the first column (no column to pick, v14 pf-e)', () => {
  const list = 'Apple, Hawthorn\nRaspberry, Blackberry';
  assert.deepEqual([...pasteNames(list)], ['Apple', 'Hawthorn', 'Raspberry', 'Blackberry']);
  const csv = 'Malus domestica,Tree,Sun\nCastanea sativa,Tree,Sun\n';
  const r = readPaste(pasteNames(csv), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['t1', 't2']);
  assert.deepEqual(r.choose, [], 'cells cut from a row skip the word-prefix search');
  assert.deepEqual([...pasteNames('Malus domestica\t3\nCastanea sativa\t1')], ['Malus domestica', 'Castanea sativa'], 'tabs: the first column');
});

// The cost guard: 500 unmatched lines against a large list. It used to time the read (< 200 ms wall
// clock), which failed under machine load (the parallel test files, a build or the browser suite on
// the same cores: an unloaded read takes ~40 ms, with 2 runnable processes per core ~130 ms, and
// more under heavier load), because wall time counts the time the process waits for a core, not the
// work. What the guard protects (4658fdb: the word-prefix index built once per list) is that a line
// costs a lookup, not a pass over the list. That is counted instead, deterministically: every read of
// a plant's fields goes through a Proxy, and the reads may not grow with the number of lines.
test('500 unmatched lines read the large lists once, not once per line (work counted, not timed)', () => {
  let reads = 0;
  const counted = (t) => new Proxy(t, { get(target, key, recv) { reads++; return Reflect.get(target, key, recv); } });
  const big = Array.from({ length: 4000 }, (_, i) => counted(plant(`b${i}`, `Genus${i} species${i}`, { en: `Common plant number ${i}`, fr: `Plante commune ${i}` })));
  const read = (count) => {
    const here = big.slice(), tropical = big.slice(0, 2000); // fresh lists: their indexes are built inside the count
    const lines = Array.from({ length: count }, (_, i) => `Zzq unknown ${i}`).join('\n');
    reads = 0;
    const r = readPaste(pasteNames(lines), { here, others: [['Tropical', tropical]], members: [] });
    assert.equal(r.none.length, count);
    return reads;
  };
  const few = read(5), many = read(500);
  assert.ok(few < 20 * 6000, `building the two lists' indexes reads each plant a few times (${few} reads)`);
  assert.ok(many - few < 1000, `495 more lines add ${many - few} plant reads (${few} for 5 lines, ${many} for 500): a line must not pass over the list`);
});

// Fix round 1, A2 (review c1-03): the fold turns a hyphen into a space, so the genus and species are
// read from the pasted words before folding: a hyphenated or apostrophe epithet stays whole.
test('binomials keep a hyphenated or apostrophe epithet whole, authors dropped: "Opuntia ficus-indica (L.) Mill." and "Ribes uva-crispa L." are found', () => {
  assert.equal(binomial('Opuntia ficus-indica (L.) Mill.'), 'opuntia ficus indica');
  assert.equal(binomial('Ribes uva-crispa L.'), 'ribes uva crispa');
  assert.equal(binomial("Plantus o'brienii Hort."), 'plantus o brienii');
  assert.equal(binomial('Malus × domestica'), 'malus domestica');
  const lists = pasteLists([plant('h1', 'Opuntia ficus-indica', { en: 'Prickly pear' }), plant('h2', 'Ribes uva-crispa', { en: 'Gooseberry' }), plant('h3', 'Opuntia ficus')]);
  const read = readPaste(pasteNames('Opuntia ficus-indica (L.) Mill.\nRibes uva-crispa L.'), { here: lists.taxa.size ? [...lists.taxa.values()] : [] });
  assert.deepEqual(read.found.map((f) => f.taxon.id), ['h1', 'h2'], 'each found as its own plant (not "Opuntia ficus")');
});

// Fix round 1, B10 (board Paste): every reading keeps its line ("at"), so the sheet lists the paste in its
// order; a plural common name ("beans") reads as the plants that share it, to choose, not "not found".
test('B10: every reading keeps its line; "beans" asks which bean', () => {
  const beans = [...temperate, plant('b1', 'Phaseolus vulgaris', { en: 'Common bean' }), plant('b2', 'Phaseolus lunatus', { en: 'Lima bean' })];
  const r = readPaste(pasteNames('Hawthorn\nnot a plant\nbeans\nApple'), { here: beans, members: ['t1'] });
  assert.deepEqual([r.found[0].at, r.none[0].at, r.choose[0].at, r.already[0].at], [0, 1, 2, 3]);
  assert.deepEqual(r.choose[0].taxa.map((t) => t.id).sort(), ['b1', 'b2'], '"beans": which bean?');
  assert.equal(r.choose[0].word, 'bean', 'the question names the singular it matched (K11: "Which bean?")');
});

// A16 (v14 spec: "maize", "banana" and "beans" give the boards' choices): a plant that carries the pasted
// word as a whole name, in any language (French plantain is "Banana" in Portuguese), is offered right
// after the plants whose own name holds it, before a plant where the word is only part of a longer name
// ("Banana Squash", "Melo cantalupensis nid banana"). Shapes of the installed release's names.
test('A16: "banana" offers the two bananas first, then the plants where banana is a piece of a longer name', () => {
  const here = [plant('m1', 'Musa acuminata', { en: 'Banana' }), plant('c1', 'Cucurbita maxima', { en: 'Winter squash' }),
    plant('m2', 'Musa ×paradisiaca', { en: 'French plantain' }), plant('k1', 'Cucumis melo', { en: 'Melon' })];
  const other = { c1: [{ lang: 'en', text: 'Banana Squash' }], m2: [{ lang: 'pt', text: 'Banana' }], k1: [{ lang: 'es', text: 'Melo cantalupensis nid banana' }] };
  const index = releaseIndex({ lang: 'en', names: here.map((t) => ({ id: t.id, canonical: t.canonical_name, names: t.names, other: other[t.id] })) });
  const r = readPaste(pasteNames('banana'), { here, index, members: ['m2'] });
  assert.equal(r.choose.length, 1, 'banana asks');
  assert.deepEqual(r.choose[0].taxa.slice(0, 2).map((t) => t.id), ['m1', 'm2'], 'the two bananas first, the one you have among them');
  assert.deepEqual(r.choose[0].taxa.slice(2).map((t) => t.id).sort(), ['c1', 'k1'], 'then the rest, none dropped');
});
