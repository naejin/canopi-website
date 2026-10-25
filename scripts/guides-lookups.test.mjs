// Field Guides lookups: the search matching of CrossLookup (will-they-cross) and HybridLookup
// (hybrids-heirlooms-landraces), run against the real crop rows each guide lists.
import test from 'node:test';
import assert from 'node:assert/strict';

const { crop, crops } = await import('../src/data/crops.ts');
const { cropTerms, matchLookup, parseEntry } = await import('../src/components/guides/diagrams/will-they-cross/lookup-match.ts');

// The crops the will-they-cross MDX passes to <CrossLookup>.
const crossIds = ['squash-pepo', 'squash-moschata', 'squash-maxima', 'melon', 'cucumber', 'watermelon', 'corn', 'spinach', 'fava-bean', 'runner-bean', 'common-bean', 'pea', 'chickpea', 'tomato-garden', 'pepper', 'eggplant', 'lettuce', 'cabbage-kale-broccoli', 'turnip', 'radish', 'beet', 'carrot', 'parsnip', 'onion', 'sunflower', 'wheat', 'barley'];
const entriesOf = (ids) => ids.map((id) => {
  const { terms, phrases } = cropTerms(crop(id));
  return parseEntry(terms, phrases);
});
const cross = entriesOf(crossIds);
const ids = (indexes, list) => indexes.map((i) => list[i]).sort();
const crossRun = (query) => {
  const r = matchLookup(query, cross);
  return { shown: ids(r.shown, crossIds), open: ids(r.open, crossIds), none: r.none };
};

test('cross lookup: two crops typed open both, and a generic word adds nothing', () => {
  assert.deepEqual(crossRun('zucchini butternut squash').open, ['squash-moschata', 'squash-pepo']);
  assert.deepEqual(crossRun('zucchini butternut').open, ['squash-moschata', 'squash-pepo']);
  assert.deepEqual(crossRun('butternut squash').open, ['squash-moschata']);
  assert.deepEqual(crossRun('courgette butternut').open, ['squash-moschata', 'squash-pepo']);
});

test('cross lookup: words match at word starts, not inside other words', () => {
  const corn = crossRun('sweet corn popcorn');
  assert.deepEqual(corn.open, ['corn']);
  assert.deepEqual(corn.shown, ['corn']);
  const pepper = crossRun('hot pepper sweet pepper');
  assert.deepEqual(pepper.open, ['pepper']);
  assert.deepEqual(pepper.shown, ['pepper']);
  assert.deepEqual(crossRun('melon').shown, ['melon'], 'melongena is not melon');
  assert.deepEqual(crossRun('piment fort, poivron doux').shown, ['pepper']);
});

test('cross lookup: a generic word alone lists its crops without opening them', () => {
  const squash = crossRun('squash');
  assert.deepEqual(squash.shown, ['squash-maxima', 'squash-moschata', 'squash-pepo']);
  assert.deepEqual(squash.open, []);
  assert.deepEqual(crossRun('bean').open, []);
  assert.equal(crossRun('bean').shown.length, 3);
  assert.deepEqual(crossRun('fava bean').open, ['fava-bean']);
});

test('cross lookup: accents fold, an empty query shows everything, an unknown crop says none', () => {
  assert.deepEqual(crossRun('Maïs').open, ['corn']);
  assert.deepEqual(crossRun('mais').open, ['corn']);
  assert.deepEqual(crossRun('épinard').open, ['spinach']);
  assert.deepEqual(crossRun('EPINARD').open, ['spinach']);
  const empty = matchLookup('  ', cross);
  assert.equal(empty.shown.length, crossIds.length);
  assert.deepEqual(empty.open, []);
  assert.equal(empty.none, false);
  assert.equal(crossRun('okra').none, true);
  assert.deepEqual(crossRun('zuc').open, ['squash-pepo'], 'a word being typed matches by prefix');
});

// HybridLookup lists his groups (fine, unlisted, check, avoid); the matcher sees one flat list.
const hybridIds = crops.filter((c) => c.cms && !c.id.startsWith('tomato-p')).map((c) => c.id);
const hybrid = entriesOf(hybridIds);
const hybridRun = (query) => {
  const r = matchLookup(query, hybrid, { ignore: ['f1', 'hybrid', 'hybrids', 'hybride', 'hybrides'] });
  return { shown: ids(r.shown, hybridIds), none: r.none };
};

test('hybrid lookup: several crops, commas and the words F1 or hybrid all work', () => {
  assert.deepEqual(hybridRun('broccoli onion').shown, ['cabbage-kale-broccoli', 'onion']);
  assert.deepEqual(hybridRun('broccoli, onion').shown, ['cabbage-kale-broccoli', 'onion']);
  assert.deepEqual(hybridRun('broccoli; onion & carrot').shown, ['cabbage-kale-broccoli', 'carrot', 'onion']);
  assert.deepEqual(hybridRun('F1 zucchini').shown, ['squash-pepo']);
  assert.deepEqual(hybridRun('courgette hybride F1').shown, ['squash-pepo']);
  assert.deepEqual(hybridRun('onion,').shown, ['onion']);
  assert.deepEqual(hybridRun('tomato').shown, ['tomato-garden']);
  assert.equal(hybridRun('F1').none, false, 'only ignored words: show everything');
  assert.equal(hybridRun('okra').none, true);
  assert.equal(hybridRun('okra onion').none, false);
});
