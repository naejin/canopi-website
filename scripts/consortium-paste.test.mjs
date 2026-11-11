// Stream S3's paste helpers (consortium v2, design check §2 port table): reading a pasted list of
// plant names and matching it against the climate lists (views/paste.ts, ported from v1 scale.js on
// S1's `fold`). The layer values' helpers are tested in consortium-layers.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

const paste = await import('../src/islands/consortium/views/paste.ts');
const { pasteNames, pasteTable, binomial, oneOff, matchName, nameIndex, readPaste, looksLikeHeader } = await import('../src/islands/consortium/views/paste.ts');

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
  const names = pasteNames(text, 0);
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
  const idx = nameIndex(temperate);
  assert.deepEqual(matchName('MALUS DOMESTICA', idx), { how: 'exact', taxa: [temperate[0]] });
  assert.equal(matchName('Malus domestica Borkh.', idx).taxa[0].id, 't1');
  assert.equal(matchName('chataignier', idx).taxa[0].id, 't2');
  assert.equal(matchName('Weissdorn', idx).taxa[0].id, 't3');
});

test('matching: a genus alone lets the reader choose; a close spelling is marked', () => {
  const idx = nameIndex(temperate);
  const genus = matchName('Rubus', idx);
  assert.equal(genus.how, 'choose');
  assert.deepEqual(genus.taxa.map((t) => t.id).sort(), ['t4', 't5']);
  const close = matchName('Hawtorn', idx);
  assert.equal(close.how, 'close');
  assert.equal(close.close, 'Hawthorn');
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

test('readPaste hides plants matched by another line from the choose groups, and drops a group left empty', () => {
  const r = readPaste(pasteNames('Rubus\nRaspberry'), { here: temperate, members: [] });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['t4']);
  assert.deepEqual(r.choose.map((c) => c.taxa.map((t) => t.id)), [['t5']]);
  const gone = readPaste(pasteNames('Rubus\nRaspberry\nBlackberry'), { here: temperate, members: [] });
  assert.deepEqual(gone.choose, []);
});

test('readPaste falls back to a word-prefix search for a line with no match: "Chestnut" offers European chestnut to choose', () => {
  const r = readPaste(pasteNames('Chestnut\nIce'), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(r.choose.map((c) => [c.name, c.taxa.map((t) => t.id), c.climate]), [['Chestnut', ['t2'], null], ['Ice', ['p1'], 'Tropical']]);
  assert.equal(r.none.length, 0);
});

test('comma or semicolon columns: the same count on every line makes a table; a split cell never goes to the word-prefix search', () => {
  const csv = 'Malus domestica,Tree,Sun\nCastanea sativa,Tree,Sun\n';
  assert.deepEqual([pasteTable(csv).columns, pasteTable(csv).sep], [3, ',']);
  assert.deepEqual([...pasteNames(csv, 0)], ['Malus domestica', 'Castanea sativa']);
  assert.equal(pasteTable('"Malus domestica";"Tree"\n"Rubus idaeus";"Shrub"').columns, 2);
  assert.deepEqual([...pasteNames('"Malus domestica";"Tree"\n"Rubus idaeus";"Shrub"', 0)], ['Malus domestica', 'Rubus idaeus']);
  assert.equal(pasteTable('Apple, Hawthorn\nRaspberry').columns, 1, 'uneven counts stay a list');
  const one = readPaste(pasteNames('Malus domestica,Tree,Sun'), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(one.found.map((f) => f.taxon.id), ['t1']);
  assert.deepEqual(one.choose, [], 'Tree and Sun are not offered by word prefix');
  assert.deepEqual(one.none.map((x) => x.name), ['Tree', 'Sun']);
});

test('comma or semicolon columns read every cell unless the reader picks one; tabs keep the first column', () => {
  const { pasteColumn } = paste;
  const list = 'Apple, Hawthorn\nRaspberry, Blackberry';
  assert.equal(pasteColumn(list, null), -1, 'every cell by default');
  assert.deepEqual([...pasteNames(list, pasteColumn(list, null))], ['Apple', 'Hawthorn', 'Raspberry', 'Blackberry']);
  assert.deepEqual([...pasteNames(list, pasteColumn(list, 1))], ['Hawthorn', 'Blackberry'], 'a picked column');
  const csv = 'Malus domestica,Tree,Sun\nCastanea sativa,Tree,Sun\n';
  const r = readPaste(pasteNames(csv, pasteColumn(csv, null)), { here: temperate, others: [['Tropical', tropical]], members: [] });
  assert.deepEqual(r.found.map((f) => f.taxon.id), ['t1', 't2']);
  assert.deepEqual(r.choose, [], 'cells cut from a row skip the word-prefix search');
  const tabs = 'Malus domestica\t3\nCastanea sativa\t1';
  assert.equal(pasteColumn(tabs, null), 0, 'tabs: the first column');
  assert.equal(pasteColumn(tabs, -1), 0);
});

test('500 unmatched lines against a large list read in well under a second', () => {
  const big = Array.from({ length: 4000 }, (_, i) => plant(`b${i}`, `Genus${i} species${i}`, { en: `Common plant number ${i}`, fr: `Plante commune ${i}` }));
  const lines = Array.from({ length: 500 }, (_, i) => `Zzq unknown ${i}`).join('\n');
  readPaste(pasteNames('warm'), { here: big, others: [['Tropical', big.slice(0, 2000)]], members: [] });
  const t0 = performance.now();
  const r = readPaste(pasteNames(lines), { here: big, others: [['Tropical', big.slice(0, 2000)]], members: [] });
  const ms = performance.now() - t0;
  assert.equal(r.none.length, 500);
  assert.ok(ms < 200, `read in ${ms.toFixed(0)} ms`);
});
