// The consortium tool at scale, chunk B, pure parts (src/scripts/consortium/scale.js): the
// Cards/List default, honest heights, the short stage words, warning kinds, filters, range
// selection and reading a pasted list (design-scale.md §2.1–2.5). On the invented fixture and the
// real Temperate list (public/data/consortium/, 200 plants).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

// ---------- Scale review B (scale-b-bugs.md, verified) ----------
test('B5: a name with several matches in another climate\'s list goes to Choose, tagged with that list, never to "none"', () => {
  const others = [['mediterranean', mediterranean], ['tropical', tropical]];
  const r = S.readPaste(['Banana', 'Citrus', 'Diospyros', 'Cistus'], { cell: temperate, others, members: [] });
  assert.deepEqual(r.none, [], 'every one of them is in some list');
  for (const n of ['Banana', 'Citrus', 'Diospyros', 'Cistus']) {
    const c = r.choose.find((x) => x.name === n);
    assert.ok(c && c.taxa.length > 1, `${n} to choose`);
    assert.ok(['mediterranean', 'tropical'].includes(c.climate), `${n} names its list`);
    assert.ok(c.taxa.every((t) => !temperate.taxa.some((x) => x.id === t.id)), `${n}: plants of that list only`);
  }
  // A choice made in this climate's own list has no list tag.
  assert.equal(S.readPaste(['Rubus'], { cell: temperate, others, members: [] }).choose[0].climate, null);
});

test('B6: names are folded once; 1,000 unmatched lines read against all three lists take well under 300 ms', () => {
  const lines = Array.from({ length: 1000 }, (_, i) => `Plantus inventus${i} ${String.fromCharCode(97 + (i % 26))}x`);
  const names = S.pasteNames(lines.join('\n'));
  const others = [['mediterranean', mediterranean], ['tropical', tropical]];
  S.readPaste(names.slice(0, 5), { cell: temperate, others, members: [] }); // the lists' indexes, built once
  const t0 = performance.now();
  const r = S.readPaste(names, { cell: temperate, others, members: [] });
  const ms = performance.now() - t0;
  assert.equal(r.none.length, 1000);
  assert.ok(ms < 300, `read in ${Math.round(ms)} ms`);
  // A close spelling is still found in every list.
  assert.equal(S.readPaste(['Coryllus avellana'], { cell: temperate, others, members: [] }).found[0].close, 'Corylus avellana');
});

test('B8: a plant found by one name and offered under a genus has one tick default everywhere', () => {
  const apple = named(temperate, 'Malus domestica');
  const r = S.readPaste(['Malus domestica', 'Malus'], { cell: temperate, members: [] });
  assert.equal(S.pasteDefault(r, apple.id), true, 'found: ticked, in Found and in Choose');
  const other = r.choose[0].taxa.find((t) => t.id !== apple.id);
  assert.equal(S.pasteDefault(r, other.id), false);
});

test('B9: the column names are read from is always one the text has', () => {
  assert.equal(S.pasteColumn('a\tb\tc', 2), 2);
  assert.equal(S.pasteColumn('Apple\nPear', 2), 0, 'a plain list after a 3-column one');
  assert.equal(S.pasteColumn('', 1), 0);
});

test('B11: spreadsheet quotes are stripped, a quoted cell may hold a line break, and a header row never reaches the groups', () => {
  assert.deepEqual(S.pasteNames('"Malus domestica"\n"Pyrus communis"'), ['Malus domestica', 'Pyrus communis']);
  assert.deepEqual(S.pasteNames('"Apple, Malus domestica"\tx'), ['Apple', 'Malus domestica']);
  const t = S.pasteTable('"Malus\ndomestica"\t1\nPear\t2');
  assert.equal(t.rows.length, 2, 'the quoted line break stays in its cell');
  assert.deepEqual(S.pasteNames('"Malus\ndomestica"\t1\nPear\t2'), ['Malus domestica', 'Pear']);
  assert.deepEqual(S.pasteNames('He said ""hi""'), ['He said ""hi""'], 'quotes inside an unquoted cell stay');
  const names = S.pasteNames('Scientific name\tCommon name\nMalus domestica\tApple\nPyrus communis\tPear');
  const r = S.readPaste(names, { cell: temperate, members: [] });
  assert.equal(r.found.length, 2);
  assert.deepEqual(r.none, [], 'the header is left out of every group');
  assert.equal(r.header, 'Scientific name', 'and said apart, as the column names');
  // Only a table's first row can be a header: a plain list's first name stays where it belongs.
  const plain = S.readPaste(S.pasteNames('Juglans nigra\nMalus domestica'), { cell: temperate, members: [] });
  assert.deepEqual(plain.none.map((x) => x.name), ['Juglans nigra']);
  assert.equal(plain.header, null);
  assert.equal(S.readPaste(S.pasteNames('Zzzz\nYyyy'), { cell: temperate, members: [] }).none.length, 2);
});

// ---------- Scale chunk B fix review (scale-b-fix-review.md, verified; coordinator rulings 2026-10-28) ----------
test('H9: a first row is dropped only when it looks like column names, in any of the 11 languages; a plant there is read like any line', () => {
  // The design's own "in no list" example: a 3-column sheet with no header row.
  const sheet = S.pasteNames('Juglans nigra\tBlack walnut\t3\nMalus domestica\tApple\t2');
  assert.deepEqual([...sheet], ['Juglans nigra', 'Malus domestica']);
  const r = S.readPaste(sheet, { cell: temperate, members: [] });
  assert.deepEqual(r.none.map((x) => x.name), ['Juglans nigra'], 'the walnut is said, under "not in any list"');
  assert.equal(r.header, null);
  for (const [row, words] of [
    ['Scientific name\tCommon name', 'Scientific name'], ['Name\tQty', 'Name'], ['Species\tNotes', 'Species'], ['Plant name\tQuantity', 'Plant name'],
    ['Nom scientifique\tNom commun', 'Nom scientifique'], ['Espèce\tQuantité', 'Espèce'], ['Nombre científico\tCantidad', 'Nombre científico'],
    ['Nome científico\tQuantidade', 'Nome científico'], ['Nome scientifico\tQuantità', 'Nome scientifico'], ['Wissenschaftlicher Name\tAnzahl', 'Wissenschaftlicher Name'],
    ['Wetenschappelijke naam\tAantal', 'Wetenschappelijke naam'], ['Научное название\tКоличество', 'Научное название'], ['学名\t数量', '学名'], ['学名\t和名', '学名'], ['학명\t수량', '학명'],
  ]) {
    const names = S.pasteNames(`${row}\nMalus domestica\tApple\nPyrus communis\tPear`);
    assert.deepEqual([...names], ['Malus domestica', 'Pyrus communis'], row);
    const out = S.readPaste(names, { cell: temperate, members: [] });
    assert.equal(out.header, words, row);
    assert.equal(out.found.length, 2, row);
  }
  // One column with a header word on top; a plain list of plants keeps its first line.
  assert.deepEqual([...S.pasteNames('Name\nMalus domestica\nPyrus communis')], ['Malus domestica', 'Pyrus communis']);
  assert.deepEqual([...S.pasteNames('Juglans nigra\nMalus domestica')], ['Juglans nigra', 'Malus domestica']);
  // A plant's name that holds a header word is still a plant.
  assert.deepEqual([...S.pasteNames('Black walnut name tag\t1\nMalus domestica\t2')], ['Black walnut name tag', 'Malus domestica']);
});

test('H10: a quote opens a quoted cell only at its start and closes on its line, or in its spreadsheet row when a tab follows; a stray quote never swallows lines', () => {
  assert.deepEqual([...S.pasteNames('"Malus domestica\nPyrus communis\nPrunus avium\n5" pot')], ['Malus domestica', 'Pyrus communis', 'Prunus avium', '5" pot']);
  const r = S.readPaste(S.pasteNames('"Malus domestica\nPyrus communis\nPrunus avium'), { cell: temperate, members: [] });
  assert.equal(r.found.length, 3, 'three plants, each found');
  // What spreadsheets write still reads as before.
  assert.deepEqual([...S.pasteNames('"Malus domestica"\n"Pyrus communis"')], ['Malus domestica', 'Pyrus communis']);
  assert.deepEqual([...S.pasteNames('"Malus\ndomestica"\t1\nPear\t2')], ['Malus domestica', 'Pear'], 'a line break inside a quoted cell, a tab after it');
  assert.deepEqual([...S.pasteNames('"Apple, ""Bramley"""\tx\nPear\ty')], ['Apple', '"Bramley"', 'Pear']);
  // A line break inside quotes with no tab after the close is a stray quote: each line stays a line.
  assert.deepEqual([...S.pasteNames('"Malus\nPyrus" communis\nPrunus avium')], ['Malus', 'Pyrus" communis', 'Prunus avium']);
  // A quote inside a cell is text.
  assert.deepEqual([...S.pasteNames('Malus "Bramley" domestica\nPear')], ['Malus "Bramley" domestica', 'Pear']);
});

test('H11: a room misfit never shows a size the room takes: the shown size is always above the limit', () => {
  assert.equal(S.misfitSize(6.096, 6), 6.1);
  assert.equal(S.misfitSize(12.192, 12), 12.2);
  assert.equal(S.misfitSize(15.2, 12), 15);
  assert.equal(S.misfitSize(22, 12), 20);
  assert.equal(S.misfitSize(6.0001, 6), 6.1);
  // Every plant of the three lists that fails a room shows a size above that room's limit.
  for (const cell of [temperate, mediterranean, tropical]) for (const t of cell.taxa) for (const room of ['small', 'large']) {
    const site = { ...core.DEFAULT_SITE, room };
    if (!core.fits(t, site).misfits.includes('room')) continue;
    const size = Math.max(t.traits.height_m?.max ?? 0, t.traits.width_max_m ?? 0);
    assert.ok(S.misfitSize(size, core.ROOM_LIMIT_M[room]) > core.ROOM_LIMIT_M[room], `${t.canonical_name} in a ${room} garden: ${size}`);
  }
});

test('K4: past a line break, a closing quote before a tab, a line break or the end closes the quoted cell when the rows keep the table\'s column count', () => {
  assert.deepEqual([...S.pasteNames('Malus domestica\t"Prune in\nwinter"\nPyrus communis\tsun')], ['Malus domestica', 'Pyrus communis']);
  assert.deepEqual([...S.pasteNames('Pyrus communis\tsun\nMalus domestica\t"Prune in\nwinter"')], ['Pyrus communis', 'Malus domestica'], 'the quoted cell in the last row');
  assert.deepEqual(S.pasteTable('Malus domestica\t"Prune in\nwinter"\nPyrus communis\tsun').rows, [['Malus domestica', 'Prune in\nwinter'], ['Pyrus communis', 'sun']]);
  // Read that way the rows would not keep the column count: the quote stays text, each line a line.
  assert.deepEqual([...S.pasteNames('Malus\t"x\nPear"\nPrunus\ty\nQuince')], ['Malus', 'Pear', 'Prunus', 'Quince']);
  // A list with no tabs has no columns to keep: a quote across lines never joins two names.
  assert.deepEqual([...S.pasteNames('"Apple\nPear"')], ['Apple', 'Pear']);
});

test('K5: a first row of column names in any of the 11 languages is a header; no real plant name in the three lists is', () => {
  for (const h of ['Nome comune', 'Nome latino', 'Lateinischer Name', 'Latijnse naam', 'Nome popular', '植物名', '植物名称', 'Common name(s)', 'Scientific name(s)', 'Nom(s) commun(s)', 'Nombre común', 'Nome científico', 'Wissenschaftlicher Name', 'Nederlandse naam', 'Научное название', '学名', '和名', '학명'])
    assert.ok(S.looksLikeHeader(h), h);
  assert.deepEqual([...S.pasteNames('Nome comune\nMelo\nPero')], ['Melo', 'Pero']);
  for (const cell of [temperate, mediterranean, tropical]) for (const t of cell.taxa)
    for (const n of [t.canonical_name, ...Object.values(t.names ?? {})]) assert.ok(!S.looksLikeHeader(n), `${n} is a plant, not a header`);
});

test('K6: when the room flags a plant by its height, the height shown is the size its warning gives', () => {
  let seen = 0;
  for (const cell of [temperate, mediterranean, tropical]) for (const t of cell.taxa) for (const room of ['small', 'large', 'field']) {
    const limit = core.ROOM_LIMIT_M[room], h = t.traits.height_m?.max ?? null, w = t.traits.width_max_m ?? 0;
    const flagged = core.fits(t, { ...core.DEFAULT_SITE, room }).misfits.includes('room');
    const shown = S.shownHeight(t, limit);
    if (flagged && h != null && h >= w) { seen++; assert.equal(shown, S.misfitSize(Math.max(h, w), limit), `${t.canonical_name} in a ${room} garden`); }
    else assert.equal(shown, S.roundHeight(h));
  }
  assert.ok(seen > 0);
  assert.equal(S.shownHeight({ traits: { height_m: { max: 6.096 } } }, 6), 6.1);
});

test('pest names come only from the data: a chip names agent_names in the page language, else the scientific name', () => {
  const sourced = { names: { en: 'agent one', nl: 'agent een' }, sources: ['eppo-x', 'usage-x'] };
  const flags = { conflicts: [
    { type: 'shared_pest', agent: 'Agentus primus', agent_names: sourced },
    { type: 'alternate_host', agent: 'Agentus secundus', agent_names: null },
    { type: 'shared_pest', agent: 'Agentus primus', agent_names: sourced },
    { type: 'allelopathic_harm', agent: 'juglone', agent_names: null },
  ] };
  assert.deepEqual(S.pestLabels(flags, 'en'), ['agent one', 'Agentus secundus']);
  assert.deepEqual(S.pestLabels(flags, 'nl'), ['agent een', 'Agentus secundus']);
  assert.deepEqual(S.pestLabels(flags, 'fr'), ['Agentus primus', 'Agentus secundus']);
  assert.deepEqual(S.pestsOf(flags), ['Agentus primus', 'Agentus secundus']);
  // No list of names written by hand: the module that held one is gone.
  assert.ok(!existsSync(new URL('../src/scripts/consortium/pests.js', import.meta.url)));
});
