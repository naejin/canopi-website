// The consortium tool at scale, chunk A: the main-crops step, "Add anyway" from another climate's
// list, link v3 on the page, and the words that no longer tie the site size to a plant count
// (design-scale.md §6b, §6c, §2.7; decision rows "Main crops first", "Scale, owner answers",
// "Scale, coordinator choices", "Scale mockup approved"). Pure parts, on the invented fixture
// (scripts/fixtures/consortium/) and the real locale files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWords } from '../src/scripts/consortium/words.js';
import { foodPlants, cropMatches, cropExamples, elsewhereHit, otherListMatches, keptFilter, keptCounts, KEPT_FILTERS } from '../src/scripts/consortium/crops.js';
import { droppedPlants, asksCrops, shareUrl, opensOnResult } from '../src/scripts/consortium/logic.js';
import { MINE } from '../src/scripts/consortium/memory.js';
import * as core from '../src/lib/consortium/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fixture = (name) => JSON.parse(read(`scripts/fixtures/consortium/${name}.json`));
const tropical = fixture('tropical'), mediterranean = fixture('mediterranean'), temperate = fixture('temperate');
const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const strings = Object.fromEntries(locales.map((lang) => {
  const all = JSON.parse(read(`src/i18n/translations/${lang}.json`));
  return [lang, Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice('consortium.'.length), v]))];
}));
const home = Object.fromEntries(locales.map((lang) => [lang, JSON.parse(read(`src/i18n/translations/${lang}.json`))]));
const named = (cell, name) => cell.taxa.find((t) => t.canonical_name === name);
const names = (list) => list.map((t) => t.canonical_name);

// ---------- Main crops: the climate's own food plants ----------
test('crops: only the climate\'s food plants (the feeds-you role) can be main crops', () => {
  const food = foodPlants(temperate);
  assert.ok(food.length > 0 && food.every((t) => t.role === 'crop'));
  assert.ok(!names(food).includes('Trifolium repens'), 'clover is a support plant');
  assert.deepEqual(names(cropMatches(temperate, 'clover', 'en')), []);
});

test('crops: the search reads the name shown in the reader\'s language and the scientific name, never a hidden name', () => {
  assert.deepEqual(names(cropMatches(temperate, 'apple', 'en')), ['Malus domestica']);
  assert.deepEqual(names(cropMatches(temperate, 'pommier', 'fr')), ['Malus domestica']);
  assert.deepEqual(names(cropMatches(temperate, 'apple', 'fr')), [], 'the English name is hidden on a French page');
  assert.deepEqual(names(cropMatches(temperate, 'pommier', 'en')), [], 'and the French one on an English page');
  assert.deepEqual(names(cropMatches(temperate, 'malus', 'fr')), ['Malus domestica'], 'the scientific name is always shown');
  assert.deepEqual(names(cropMatches(temperate, 'CASSIS', 'fr')), ['Ribes nigrum'], 'case and accents aside');
  // A locale with no name of its own shows the English one, so the English one is searched.
  assert.deepEqual(names(cropMatches(temperate, 'goumi', 'de')), ['Elaeagnus multiflora']);
  assert.deepEqual(names(cropMatches(temperate, 'hazel', 'de')), [], 'Haselnuss is shown there, so Hazel is hidden');
});

test('crops: names that start with the words typed come first; chosen crops are left out', () => {
  assert.deepEqual(names(cropMatches(temperate, 'nut', 'en')), ['Juglans nigra'], 'inside a word too (walnut)');
  assert.deepEqual(names(cropMatches(temperate, 'black', 'en')), ['Juglans nigra', 'Ribes nigrum'], 'Black walnut, Blackcurrant: by name');
  assert.deepEqual(names(cropMatches(temperate, 'w', 'en')).slice(0, 1), ['Fragaria vesca'], 'Wild strawberry starts with it; Black walnut only has a word that does');
  const apple = named(temperate, 'Malus domestica').id;
  assert.deepEqual(cropMatches(temperate, 'apple', 'en', [apple]), []);
  assert.deepEqual(cropMatches(temperate, '   ', 'en'), [], 'nothing typed, nothing listed');
});

test('crops: four well-known food plants of the climate are offered as examples, in the reader\'s language', () => {
  const ex = cropExamples(temperate, 'fr');
  assert.equal(ex.length, 4);
  assert.ok(ex.every((t) => t.role === 'crop'));
  assert.deepEqual(cropExamples(temperate, 'fr'), ex, 'the same every time');
  assert.ok(cropExamples(tropical, 'en').every((t) => tropical.taxa.includes(t)), 'each climate its own');
});

test('crops: a food plant only another climate lists is named with that list, never as a reason to change climate', () => {
  const others = [['tropical', tropical], ['mediterranean', mediterranean]];
  const hit = elsewhereHit('banana', 'en', others, temperate);
  assert.equal(hit.climate, 'tropical');
  assert.equal(hit.taxon.canonical_name, 'Musa acuminata');
  assert.equal(elsewhereHit('bananier', 'fr', others, temperate).taxon.canonical_name, 'Musa acuminata');
  assert.equal(elsewhereHit('bananier', 'en', others, temperate), null, 'the same name rule as the crop search');
  assert.equal(elsewhereHit('apple', 'en', [['temperate', temperate]], temperate), null, 'never a plant of this climate');
  assert.equal(elsewhereHit('zzz', 'en', others, temperate), null);
});

// ---------- Add anyway ----------
test('add anyway: the Add search lists plants of other climates\' lists that this one lacks, with their list', () => {
  const others = [['tropical', tropical], ['mediterranean', mediterranean]];
  const fig = otherListMatches('fig', others, temperate);
  assert.deepEqual(fig.map((h) => [h.climate, h.taxon.canonical_name]), [['mediterranean', 'Ficus carica']]);
  assert.deepEqual(otherListMatches('figuier', others, temperate).map((h) => h.taxon.canonical_name), ['Ficus carica'], 'any language, as Add searches');
  assert.deepEqual(otherListMatches('apple', [['temperate', temperate]], temperate), [], 'never a plant this climate lists');
  const twice = otherListMatches('a', [['mediterranean', mediterranean], ['mediterranean', mediterranean]], temperate);
  assert.equal(new Set(twice.map((h) => h.taxon.id)).size, twice.length, 'a plant two lists share is offered once');
  assert.deepEqual(otherListMatches('', others, temperate), []);
});

// ---------- The Kept filter's values (seam for chunk B's filter row) ----------
test('kept filter: all, kept only, not kept only and main crops, with their counts', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const sel = { kept: new Set(['a', 'b', 'c']), crops: ['b'] };
  assert.deepEqual(KEPT_FILTERS, ['all', 'kept', 'notKept', 'crops']);
  assert.deepEqual(keptFilter(ids, sel, 'all'), ids);
  assert.deepEqual(keptFilter(ids, sel, 'kept'), ['a', 'b', 'c']);
  assert.deepEqual(keptFilter(ids, sel, 'notKept'), ['d']);
  assert.deepEqual(keptFilter(ids, sel, 'crops'), ['b']);
  assert.deepEqual(keptCounts(ids, sel), { all: 4, kept: 3, notKept: 1, crops: 1 });
});

// ---------- Start: which openings ask the crop question ----------
test('start: a fresh climate and a guide\'s food plant ask the crop question; a shared consortium opens as it was', () => {
  const d = (q) => core.decodeState(q);
  assert.equal(asksCrops(null), true, 'the site climate, no link');
  assert.equal(asksCrops(d('c=temperate')), true, 'a climate alone');
  assert.equal(asksCrops(d('v=3&c=temperate&k=FR&l=sun&s=unsure&w=unsure&m=large')), true, 'with site answers and a country');
  assert.equal(asksCrops(d('plant=Malus+domestica&climate=temperate')), true, 'a guide preset: the page checks it is a food plant once the list is loaded');
  assert.equal(asksCrops(d('v=3&c=temperate&a=')), false, 'an emptied consortium');
  assert.equal(asksCrops(d('v=3&c=temperate&p=AAAAAA')), false, 'kept plants');
  assert.equal(asksCrops(d('v=2&c=temperate&x=deadbeef')), false, 'removed plants');
});

test('start: the head is compact from the first paint exactly when the page opens past the climate and crop questions', () => {
  // A guide preset keeps the compact head even when its plant then asks the crop question: the
  // first paint cannot know the plant, and a head that grows after paint would jump (prepush m5).
  assert.equal(opensOnResult({ climate: 'temperate', fromLink: true, decoded: core.decodeState('v=3&c=temperate&a=AAAAAA') }), true);
  assert.equal(opensOnResult({ climate: 'temperate', fromLink: true, decoded: core.decodeState('plant=Malus+domestica&climate=temperate') }), true);
  assert.equal(opensOnResult({ climate: 'temperate', fromLink: true, decoded: core.decodeState('c=temperate') }), false);
  assert.equal(opensOnResult({ climate: 'temperate', fromLink: false, decoded: core.decodeState('v=2&c=temperate&k=FR&l=sun&s=unsure&w=unsure&m=large') }), true, 'a saved consortium');
  assert.equal(opensOnResult({ climate: 'temperate', fromLink: false, decoded: null }), false, 'the site climate alone');
  assert.equal(opensOnResult({ climate: null, fromLink: true, decoded: core.decodeState('v=3&a=AAAAAA') }), false);
});

// ---------- Link v3 on the page ----------
test('share: the copied address is the tool\'s state only: never `mine`, never a guessed country', () => {
  const q = core.encodeState({ climate: 'temperate', country: null, site: core.DEFAULT_SITE, kept: [], removed: [], members: [] });
  q.set(MINE, 'FR');
  const url = shareUrl({ origin: 'https://projectcanopi.com', pathname: '/fr/consortium/' }, q);
  assert.equal(new URL(url).searchParams.get(MINE), null);
  assert.equal(new URL(url).searchParams.get('k'), null);
  assert.equal(new URL(url).searchParams.get('v'), '3');
  assert.ok(url.startsWith('https://projectcanopi.com/fr/consortium/?'));
});

test('old links: plants a link names past the stated limit count as lost, so the notice says so', () => {
  const d = (key, value, reason = 'unknown') => ({ key, value, reason });
  assert.equal(droppedPlants([d('a', '5', 'excess')]), 5);
  assert.equal(droppedPlants([d('a', 'deadbeef1'), d('p', '3', 'excess'), d('x', '9', 'excess')]), 4, 'removed plants are not plants the link named');
  assert.equal(droppedPlants([d('g', 'deadbeef1')]), 1, 'a plant from another list that is gone');
  assert.equal(droppedPlants([d('n', 'deadbeef1')]), 0, 'a main crop is in `a` too');
});

// ---------- Words: the site size limits plant size, never the number of plants ----------
test('words: no lede, hint or line ties the site size to a number of plants', () => {
  for (const lang of locales) {
    for (const room of core.rooms) {
      const hint = strings[lang][`site.room.${room}.hint`];
      assert.ok(hint, `${lang}: room hint ${room}`);
      // The hint limits the plants' width (6 m, 12 m, none), never their number.
      assert.deepEqual(hint.match(/\d+/g) ?? [], { small: ['6'], large: ['12'], field: [] }[room], `${lang}: ${room} hint: ${hint}`);
    }
    for (const key of ['free', 'freeNone', 'printFree', 'sizeLine.small', 'sizeLine.large', 'sizeLine.field']) assert.ok(!(key in strings[lang]), `${lang}: ${key} is gone`);
    for (const key of ['home.consortium.lede', 'consortium.description']) assert.match(home[lang][key], /6/, `${lang}: ${key} still names the suggestion`);
  }
  assert.equal(home.en['home.consortium.lede'], 'A consortium is a group of plants that help each other. Choose your climate: start from a suggestion of 6 to 12 plants, or build your own, up to hundreds.');
  assert.equal(strings.en['site.room.large.hint'], 'Plants up to 12 m across');
  assert.equal(strings.fr['site.room.large.hint'], 'Plantes jusqu’à 12 m de large');
  assert.equal(strings.en.fill, 'Fill the gaps');
});

test('words: the crop step and the "from another list" label read naturally in French', () => {
  const fr = makeWords(strings.fr, 'fr');
  assert.equal(fr.T('list.temperate'), 'du climat tempéré');
  assert.equal(fr.T('fromList', { list: fr.T('list.mediterranean') }), 'venue du climat méditerranéen');
  assert.equal(fr.T('crops.title'), 'Que voulez-vous surtout cultiver\u00a0?');
  assert.equal(fr.T('suggestIt'), 'Suggérer des plantes autour d’elle');
  assert.equal(fr.T('suggestThem'), 'Suggérer des plantes autour d’elles');
  assert.equal(fr.T('mainCrop'), 'Culture principale');
  const en = makeWords(strings.en, 'en');
  assert.equal(en.T('fromList', { list: en.T('list.tropical') }), 'from the Tropical list');
  for (const lang of locales) for (const c of core.siteClimates) assert.ok(strings[lang][`list.${c}`], `${lang}: list.${c}`);
});
