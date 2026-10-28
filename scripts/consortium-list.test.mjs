// The consortium tool at scale, chunk B, pure parts (src/scripts/consortium/scale.js): the
// Cards/List default, honest heights, the short stage words, warning kinds, filters, range
// selection and reading a pasted list (design-scale.md §2.1–2.5). On the invented fixture and the
// real Temperate list (public/data/consortium/, 200 plants).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../src/scripts/consortium/scale.js';
import * as core from '../src/lib/consortium/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const real = (c) => JSON.parse(read(`public/data/consortium/${c}.json`));
const temperate = real('temperate'), mediterranean = real('mediterranean'), tropical = real('tropical');
const named = (cell, n) => cell.taxa.find((t) => t.canonical_name === n);

test('Cards up to 20 plants, the list above, and the reader\'s choice wins at any size', () => {
  assert.equal(S.viewMode(null, 9), 'cards');
  assert.equal(S.viewMode(null, 20), 'cards');
  assert.equal(S.viewMode(null, 21), 'list');
  assert.equal(S.viewMode('cards', 200), 'cards');
  assert.equal(S.viewMode('list', 1), 'list');
});

test('groups start closed above 60 plants, a filter opens the groups it matches, the reader\'s choice wins', () => {
  assert.equal(S.groupOpen('high', { total: 59, shown: 20, filtering: false, choice: null }), true);
  assert.equal(S.groupOpen('high', { total: 200, shown: 59, filtering: false, choice: null }), false);
  assert.equal(S.groupOpen('high', { total: 200, shown: 16, filtering: true, choice: null }), true);
  assert.equal(S.groupOpen('low', { total: 200, shown: 0, filtering: true, choice: null }), false);
  assert.equal(S.groupOpen('high', { total: 200, shown: 59, filtering: false, choice: true }), true);
});

test('heights are rounded honestly: one decimal below 1 m, whole metres to 20 m, 5 m steps above, none unknown', () => {
  assert.equal(S.roundHeight(0.04), 0.1);
  assert.equal(S.roundHeight(0.85), 0.9);
  assert.equal(S.roundHeight(1.4), 1);
  assert.equal(S.roundHeight(18.4), 18);
  assert.equal(S.roundHeight(20), 20);
  assert.equal(S.roundHeight(37), 35);
  assert.equal(S.roundHeight(58), 60);
  assert.equal(S.roundHeight(null), null);
  assert.equal(S.roundHeight(0), null);
});

test('the short stage words: years when both ends are years, months and days otherwise', () => {
  const span = (a, b) => S.stageShort({ a, b });
  assert.deepEqual(span(3, 4), { key: 'stageYears', a: 3, b: 25 });
  assert.deepEqual(span(3, 6), { key: 'stageYearOn', a: 3 });
  assert.deepEqual(span(0, 1), { key: 'stageSpan', from: { num: 0 }, to: { key: 'stageEnd.placenta_ii' } });
  assert.deepEqual(span(1, 3), { key: 'stageSpan', from: { key: 'stageStart.placenta_ii' }, to: { key: 'stageEnd.secondary_i' } });
  assert.deepEqual(span(0, 6), { key: 'stageSpan', from: { num: 0 }, to: { key: 'phase.climax.short' } });
  assert.equal(S.stageShort(null), null);
});

test('warning kinds on the real Temperate list with France: invasive here, toxic, shared pests; none without a record', () => {
  const ids = temperate.taxa.map((t) => t.id);
  const ev = core.evaluate(temperate, ids, { site: core.DEFAULT_SITE, kept: [], guests: [], country: 'FR', countryChecked: true });
  const by = new Map(ev.members.map((m) => [m.taxon.canonical_name, S.warnKinds(m.taxon, m.flags, { country: 'FR' })]));
  assert.ok(by.get('Robinia pseudoacacia').has('invasive'));
  assert.ok(by.get('Robinia pseudoacacia').has('any'));
  assert.ok(!by.get('Robinia pseudoacacia').has('somewhere'), 'with a country, no soft count');
  const count = (k) => [...by.values()].filter((s) => s.has(k)).length;
  assert.equal(count('invasive'), 3);
  assert.equal(count('toxic'), 6);
  assert.equal(count('pests'), 20);
  const none = core.evaluate(temperate, ids, { site: core.DEFAULT_SITE, kept: [], guests: [], country: null, countryChecked: false });
  const soft = none.members.filter((m) => S.warnKinds(m.taxon, m.flags, { country: null }).has('somewhere')).length;
  assert.equal(soft, 138, 'design-scale.md: 138 of the 200 are invasive somewhere');
  const pear = ev.members.find((m) => m.taxon.canonical_name === 'Pyrus communis');
  assert.ok(S.pestsOf(pear.flags).length >= 1);
  // design-scale.md §2.6 (m10): at 200 plants in a field, the shade plants of the lower layers sit
  // under a canopy, so "With a warning" counts 29 of 200 with France and 26 with no country.
  const field = (country) => core.evaluate(temperate, ids, { site: { ...core.DEFAULT_SITE, room: 'field' }, kept: ids, country, countryChecked: !!country })
    .members.filter((m) => S.warnKinds(m.taxon, m.flags, { country }).has('any')).length;
  assert.equal(field('FR'), 29);
  assert.equal(field(null), 26);
});

test('filters combine with AND, the text search reads every name, and the active ones come first', () => {
  const ctx = { kinds: () => new Set(['any', 'toxic']), kept: new Set([temperate.taxa[0].id]), crops: [temperate.taxa[1].id] };
  const all = temperate.taxa;
  const by = (F) => all.filter((t) => S.matches(t, { ...S.NO_FILTERS, ...F }, ctx));
  assert.equal(by({}).length, 200);
  assert.ok(by({ layer: 'emergent' }).every((t) => t.stratum?.value === 'emergent'));
  assert.ok(by({ layer: 'high', job: 'feeds_you' }).every((t) => t.stratum?.value === 'high' && core.jobsOf(t).includes('feeds_you')));
  assert.deepEqual(by({ kept: 'kept' }).map((t) => t.id), [all[0].id]);
  assert.equal(by({ kept: 'notKept' }).length, 199);
  assert.deepEqual(by({ kept: 'crops' }).map((t) => t.id), [all[1].id]);
  assert.ok(by({ q: 'robinier' }).some((t) => t.canonical_name === 'Robinia pseudoacacia'), 'a French name on any page');
  assert.ok(by({ time: '0' }).every((t) => t.phases && t.phases.start === 'placenta_i'));
  assert.equal(S.filtering(S.NO_FILTERS), false);
  assert.equal(S.filtering({ ...S.NO_FILTERS, q: '  ' }), false);
  assert.equal(S.filtering({ ...S.NO_FILTERS, kept: 'crops' }), true);
  assert.deepEqual(S.filterOrder({ ...S.NO_FILTERS, warn: 'any', kept: 'crops' }, ['kept', 'warn']), ['kept', 'warn', 'layer', 'job', 'time']);
});

test('a range selection ticks or unticks every row between the anchor and the row, in the order shown', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual([...S.selectRange(order, 'b', 'd', new Set(), true)], ['b', 'c', 'd']);
  assert.deepEqual([...S.selectRange(order, 'd', 'b', new Set(['a']), true)].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual([...S.selectRange(order, 'b', 'd', new Set(order), false)], ['a', 'e']);
  assert.deepEqual([...S.selectRange(order, 'gone', 'c', new Set(), true)], ['c'], 'no anchor in view: the one row');
  assert.equal(S.groupTick(['a', 'b'], new Set(['a'])), 'some');
  assert.equal(S.groupTick(['a', 'b'], new Set(['a', 'b', 'z'])), 'all');
  assert.equal(S.groupTick(['a', 'b'], new Set()), 'none');
});

test('a paste: lines or tab-separated columns, commas and semicolons inside a cell, each name once', () => {
  const text = 'Malus domestica\tApple\t3\nPyrus communis\tPear\t2\n\nmalus domestica\tApple again\t1\nCorylus avellana; Ribes nigrum\tx\n';
  assert.equal(S.pasteTable(text).columns, 3);
  assert.deepEqual(S.pasteNames(text, 0), ['Malus domestica', 'Pyrus communis', 'Corylus avellana', 'Ribes nigrum']);
  assert.deepEqual(S.pasteNames(text, 1), ['Apple', 'Pear', 'Apple again', 'x']);
  assert.deepEqual(S.pasteNames('Apple\nPear, Quince'), ['Apple', 'Pear', 'Quince']);
  assert.equal(S.columnSample(text, 0), 'Malus domestica');
  assert.equal(S.binomial('Malus domestica Borkh.'), 'malus domestica');
  assert.equal(S.binomial('Rubus fruticosus agg.'), 'rubus fruticosus');
  assert.equal(S.binomial('Apple'), null);
  assert.ok(S.oneOff('coryllus avellana', 'corylus avellana'));
  assert.ok(!S.oneOff('pear', 'bear'), 'short words are never close');
  assert.ok(!S.oneOff('apricot', 'apricxyz'));
});

test('a paste sorts its names into found, choose, another climate\'s list, already in, and in no list', () => {
  const apple = named(temperate, 'Malus domestica'), pear = named(temperate, 'Pyrus communis');
  const persimmon = mediterranean.taxa.find((t) => !temperate.taxa.some((x) => x.id === t.id) && t.names.en);
  const names = ['Malus domestica Borkh.', 'Pear', 'Coryllus avellana', 'Rubus', persimmon.canonical_name, 'Juglans nigra', apple.names.fr, 'Zzzz plantus'];
  const r = S.readPaste(names, { cell: temperate, others: [['tropical', tropical], ['mediterranean', mediterranean]], members: [pear.id] });
  assert.deepEqual(r.found.map((f) => f.taxon.canonical_name), ['Malus domestica', 'Corylus avellana']);
  assert.equal(r.found[1].close, 'Corylus avellana', 'a close spelling says which name it read');
  assert.equal(r.found[0].close, null);
  assert.deepEqual(r.already.map((f) => f.taxon.id), [pear.id], 'Apple by its French name is counted once');
  assert.ok(r.choose.some((c) => c.name === 'Rubus' && c.taxa.length > 1), 'a genus is chosen, not guessed');
  assert.deepEqual(r.other.map((o) => [o.climate, o.taxon.id]), [['mediterranean', persimmon.id]]);
  assert.deepEqual(r.none.map((n) => n.name), ['Juglans nigra', 'Zzzz plantus']);
});

test('all 200 Temperate names pasted over an empty design are all found, and match fast', () => {
  const names = temperate.taxa.map((t) => t.canonical_name);
  const t0 = performance.now();
  const r = S.readPaste(names, { cell: temperate, others: [['tropical', tropical], ['mediterranean', mediterranean]], members: [] });
  const ms = performance.now() - t0;
  assert.equal(r.found.length, 200);
  assert.ok(ms < 500, `matched in ${Math.round(ms)} ms`);
  // A spreadsheet of English names finds them too.
  const en = S.readPaste(temperate.taxa.filter((t) => t.names.en).map((t) => t.names.en), { cell: temperate, members: [] });
  assert.ok(en.found.length + en.choose.length >= 190, `${en.found.length} found, ${en.choose.length} to choose`);
});
