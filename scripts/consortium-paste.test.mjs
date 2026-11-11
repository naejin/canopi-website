// Stream S3's pure helpers (consortium v2, design check §2 port table): reading a pasted list of
// plant names and matching it against the climate lists (views/paste.ts, ported from v1 scale.js on
// S1's `fold`), and the months of a layer value written as runs (views/layers.ts, ported from v1
// layers.js; months come in order from months_from).
import test from 'node:test';
import assert from 'node:assert/strict';

const { pasteNames, pasteTable, binomial, oneOff, matchName, nameIndex, readPaste, looksLikeHeader } = await import('../src/islands/consortium/views/paste.ts');
const { monthRuns, monthsText, scopeText, layerRows, isEstimate } = await import('../src/islands/consortium/views/layers.ts');

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

// ---- months as runs ----
const W = {
  lang: 'en',
  T: (k, v) => ({ 't.allYear': 'All year', 'scope.everywhere': 'Everywhere', 'scope.latN': '{from}–{to}° N', 'scope.latS': '{from}–{to}° S', 'scope.north': 'Northern Hemisphere', 'scope.south': 'Southern Hemisphere', yes: 'Yes', no: 'No' }[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => String(v?.[n] ?? '')),
  climate: (z) => z,
  country: (c) => ({ FR: 'France' }[c] ?? c),
  region: (r) => ({ europe: 'Europe' }[r] ?? r),
  num: (n) => String(n),
};

test('months as runs: a run over the new year stays one run, single months stand alone', () => {
  assert.deepEqual(monthRuns(['Nov', 'Dec', 'Jan', 'Feb', 'Mar']), [[10, 2]]);
  assert.deepEqual(monthRuns(['Jan', 'Mar', 'Apr', 'Jun']), [[0, 0], [2, 3], [5, 5]]);
  assert.deepEqual(monthRuns([]), []);
});

test('months text: "Nov–Mar", runs joined by the site\'s list form, all twelve "All year", in the page language', () => {
  assert.equal(monthsText(['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], W), 'Nov–Mar');
  assert.equal(monthsText(['Jan', 'Mar', 'Apr', 'Jun'], W), 'Jan, Mar–Apr, and Jun');
  assert.equal(monthsText(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], W), 'All year');
  assert.equal(monthsText(['Apr', 'May'], { ...W, lang: 'fr' }), 'avr.–mai');
});

test('scope words: everywhere, a country, a latitude band with its hemisphere', () => {
  assert.equal(scopeText(null, W), 'Everywhere');
  assert.equal(scopeText({ country: 'FR' }, W), 'France');
  assert.equal(scopeText({ latitude: '-50..-35' }, W), '35–50° S');
  assert.equal(scopeText({ region: 'europe', hemisphere: 'N' }, W), 'Europe · Northern Hemisphere');
});

test('layer rows: fields in order, values with where and source, every kind but recorded is an estimate', () => {
  const values = [
    { field: 'sowing_months', months: ['Mar', 'Apr'], flag: null, climate: null, scope: null, source: 's1', kind: 'recorded' },
    { field: 'bloom_months', months: ['Nov', 'Dec', 'Jan'], flag: null, climate: null, scope: { country: 'FR' }, source: 's2', kind: 'derived' },
    { field: 'tolerates_wind', months: null, flag: true, climate: null, scope: null, source: 's1', kind: 'extracted' },
  ];
  const rows = layerRows(values, W, (id) => `Source ${id}`);
  assert.deepEqual(rows.map((r) => r.field), ['bloom_months', 'sowing_months', 'tolerates_wind']);
  assert.deepEqual(rows[0].values[0], { text: 'Nov–Jan', where: 'France · Source s2', estimate: true });
  assert.deepEqual(rows[1].values[0], { text: 'Mar–Apr', where: 'Everywhere · Source s1', estimate: false });
  assert.equal(rows[2].values[0].text, 'Yes');
  assert.ok(isEstimate({ kind: 'llm' }) && !isEstimate({ kind: 'recorded' }));
});
