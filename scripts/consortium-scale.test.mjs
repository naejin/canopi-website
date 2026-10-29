// The consortium tool at scale, chunk A: the main-crops step, "Add anyway" from another climate's
// list, link v3 on the page, and the words that no longer tie the site size to a plant count
// (design-scale.md §6b, §6c, §2.7; decision rows "Main crops first", "Scale, owner answers",
// "Scale, coordinator choices", "Scale mockup approved"). Pure parts, on the invented fixture
// (scripts/fixtures/consortium/) and the real locale files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWords } from '../src/scripts/consortium/words.js';
import { foodPlants, cropMatches, cropHits, cropLabel, cropExamples, elsewhereHit, otherListMatches, inClimateOrder, loadLists, addFilterMatch, keptFilter, keptCounts, KEPT_FILTERS } from '../src/scripts/consortium/crops.js';
import { fold } from '../src/scripts/consortium/words.js';
import { droppedPlants, asksCrops, shareUrl, opensOnResult, linkDamaged, arrivalParams, withHash, langHash, printNoneKey, keepCountry, redoToastKey, siteChangeRebuilds, afterSwap, climateSourceAt, pickCountry } from '../src/scripts/consortium/logic.js';
import { builtKey, cardInvasive, detailsInvasive, roomHint } from '../src/scripts/consortium/parts.js';
import { MINE, memoryOf, startState, WROTE } from '../src/scripts/consortium/memory.js';
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

test('crops: the search reads the name shown and the scientific name first, then the English name, which the option then shows in brackets (C1, state 19f)', () => {
  assert.deepEqual(names(cropMatches(temperate, 'apple', 'en')), ['Malus domestica']);
  assert.deepEqual(names(cropMatches(temperate, 'pommier', 'fr')), ['Malus domestica']);
  const apple = cropHits(temperate, 'apple', 'fr');
  assert.deepEqual(apple.map((h) => [h.taxon.canonical_name, h.english]), [['Malus domestica', 'Apple']], 'an English-only hit carries the English name it matched');
  assert.equal(cropHits(temperate, 'pommier', 'fr')[0].english, null, 'a hit on the shown name needs no brackets');
  assert.deepEqual(names(cropMatches(temperate, 'pommier', 'en')), [], 'only English is the fallback: a French name stays hidden on an English page');
  assert.deepEqual(names(cropMatches(temperate, 'malus', 'fr')), ['Malus domestica'], 'the scientific name is always shown');
  assert.deepEqual(names(cropMatches(temperate, 'CASSIS', 'fr')), ['Ribes nigrum'], 'case and accents aside');
  // A locale with no name of its own shows the English one, so the English one is searched, with no brackets.
  assert.deepEqual(cropHits(temperate, 'goumi', 'de').map((h) => [h.taxon.canonical_name, h.english]), [['Elaeagnus multiflora', null]]);
  // The label is the one string for the option, its accessible name and the search (R4-m1).
  const fr = makeWords(strings.fr, 'fr');
  assert.equal(cropLabel(apple[0], 'fr', fr.paren), 'Pommier (Apple)');
  assert.equal(cropLabel(cropHits(temperate, 'pommier', 'fr')[0], 'fr', fr.paren), 'Pommier');
  for (const h of cropHits(temperate, 'a', 'fr')) assert.ok(fold(cropLabel(h, 'fr', fr.paren) + ' ' + h.taxon.canonical_name).includes('a'), 'never a match on a name the option does not show');
});

test('crops: on the real French Temperate list, « cher » finds the cherries by their English names, shown in brackets and sorted last (19f)', () => {
  const real = JSON.parse(read('public/data/consortium/temperate.json'));
  const fr = makeWords(strings.fr, 'fr');
  const labels = cropHits(real, 'cher', 'fr').map((h) => cropLabel(h, 'fr', fr.paren));
  for (const l of ['Cerisier acide (Sour cherry)', 'Merisier (Sweet cherry)', 'Cornouiller mâle (Cornelian cherry)']) assert.ok(labels.includes(l), `${l} in ${labels.join(', ')}`);
  const firstEnglish = labels.findIndex((l) => l.includes('('));
  assert.ok(labels.slice(firstEnglish).every((l) => l.includes('(')), 'names the reader sees come first');
  assert.ok(labels.slice(0, firstEnglish).length >= 1, 'Chervis, shown in French, first');
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
  const ex = cropExamples(temperate);
  assert.equal(ex.length, 4);
  assert.ok(ex.every((t) => t.role === 'crop'));
  assert.deepEqual(cropExamples(temperate), ex, 'the same every time');
  assert.ok(cropExamples(tropical).every((t) => tropical.taxa.includes(t)), 'each climate its own');
  // C5: the examples (and the field's placeholder) never name a crop already chosen.
  const chosen = ex.slice(0, 2).map((t) => t.id);
  const left = cropExamples(temperate, 3, chosen);
  assert.equal(left.length, 3);
  assert.ok(left.every((t) => !chosen.includes(t.id)));
  assert.equal(cropExamples(temperate, 3, foodPlants(temperate).map((t) => t.id)).length, 0, 'none left: the page shows no example');
});

test('crops: a food plant only another climate lists is named with that list, never as a reason to change climate', () => {
  const others = [['tropical', tropical], ['mediterranean', mediterranean]];
  const hit = elsewhereHit('banana', 'en', others, temperate);
  assert.equal(hit.climate, 'tropical');
  assert.equal(hit.taxon.canonical_name, 'Musa acuminata');
  assert.equal(elsewhereHit('bananier', 'fr', others, temperate).taxon.canonical_name, 'Musa acuminata');
  assert.equal(elsewhereHit('bananier', 'en', others, temperate), null, 'the same name rule as the crop search');
  assert.equal(elsewhereHit('banana', 'fr', others, temperate).english, 'Banana', 'an English-only hit names its English name too');
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
  const hash = new URLSearchParams(new URL(url).hash.slice(1));
  assert.equal(hash.get(MINE), null);
  assert.equal(hash.get('k'), null);
  assert.equal(hash.get('v'), '3');
  assert.ok(url.startsWith('https://projectcanopi.com/fr/consortium/#v=3&'), 'the state is in the fragment, which no request carries (C8)');
  assert.equal(new URL(url).search, '');
});

test('old links: plants a link names past the stated limit count as lost, so the notice says so', () => {
  const d = (key, value, reason = 'unknown') => ({ key, value, reason });
  assert.equal(droppedPlants([d('a', '5', 'excess')]), 5);
  assert.equal(droppedPlants([d('a', 'deadbeef1'), d('p', '3', 'excess'), d('x', '9', 'excess')]), 4, 'removed plants are not plants the link named');
  assert.equal(droppedPlants([d('g', 'deadbeef1')]), 1, 'a plant from another list that is gone');
  assert.equal(droppedPlants([d('n', 'deadbeef1')]), 0, 'a main crop is in `a` too');
});

// ---------- Words: the site size limits plant size, never the number of plants ----------
// C10, B11 (coordinator ruling): the room limits a plant's height and width, as the check does, never
// the number of plants; the suggestion size still follows it (6/9/12), and the hint says both.
test('words: the room hint names the height and width limit the check uses, and the suggestion size, from the core', () => {
  for (const lang of locales) {
    const W = makeWords(strings[lang], lang);
    for (const room of core.rooms) {
      const hint = roomHint(W, room);
      assert.doesNotMatch(hint, /\{\w+\}/, `${lang}: ${room}: ${hint}`);
      const nums = (hint.match(/\d+/g) ?? []).map(Number);
      if (room !== 'field') assert.ok(nums.includes(core.ROOM_LIMIT_M[room]), `${lang}: ${room} names its size limit: ${hint}`);
      assert.ok(nums.includes(core.SIZE_LIMIT[room]), `${lang}: ${room} names its suggestion size: ${hint}`);
    }
    for (const key of ['free', 'freeNone', 'printFree', 'sizeLine.small', 'sizeLine.large', 'sizeLine.field']) assert.ok(!(key in strings[lang]), `${lang}: ${key} is gone`);
    for (const key of ['home.consortium.lede', 'consortium.description']) assert.match(home[lang][key], /6/, `${lang}: ${key} still names the suggestion`);
  }
  const en = makeWords(strings.en, 'en'), fr = makeWords(strings.fr, 'fr');
  assert.equal(roomHint(en, 'small'), 'Plants up to 6\u00a0m tall and across · suggests 6 plants');
  assert.equal(roomHint(en, 'large'), 'Plants up to 12\u00a0m tall and across · suggests 9 plants');
  assert.equal(roomHint(en, 'field'), 'Plants of any size · suggests 12 plants');
  assert.equal(roomHint(fr, 'small'), 'Plantes jusqu’à 6\u00a0m de haut et de large · suggestions de 6 plantes');
  // F6: the suggestion size says it counts plants, in every language.
  const plantWord = { en: /6 plants/, fr: /6 plantes/, es: /6 plantas/, pt: /6 plantas/, it: /6 piante/, zh: /6 种植物/, de: /6 Pflanzen/, ja: /6種の植物/, ko: /식물 6가지/, nl: /6 planten/, ru: /6 растений/ };
  for (const lang of locales) assert.match(roomHint(makeWords(strings[lang], lang), 'small').split(' · ')[1], plantWord[lang], lang);
  assert.equal(home.en['home.consortium.lede'], 'A consortium is a group of plants that help each other. Choose your climate: start from a suggestion of 6 to 12 plants, or build your own, up to hundreds.');
  assert.equal(strings.en.fill, 'Fill the gaps');
});

test('site: a room change on a result only flags the plants that no longer fit; the other answers suggest again (C10)', () => {
  assert.equal(siteChangeRebuilds('room', 'ready'), false, 'never removes plants because of their number');
  assert.equal(siteChangeRebuilds('room', 'nomatch'), true, 'no plants yet: try again');
  for (const key of ['light', 'soil', 'water']) assert.equal(siteChangeRebuilds(key, 'ready'), true, key);
  // A 12-plant Field result read in a small garden: the 12 stay, the big ones are flagged.
  const ids = core.suggest(tropical, { site: { ...core.DEFAULT_SITE, room: 'field' } }).members.map((m) => m.taxon.id);
  const small = core.evaluate(tropical, ids, { site: { ...core.DEFAULT_SITE, room: 'small' } });
  assert.equal(small.members.length, ids.length);
  assert.ok(small.members.some((m) => m.flags.misfits.includes('room')), 'the trees too big for it are flagged');
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

// ---------- Scale chunk A review fixes (scale-a-bugs.md, scale-a-conformance.md) ----------
const enW = makeWords(strings.en, 'en'), frW = makeWords(strings.fr, 'fr');

// C8: link v3 in the fragment (design §2.7), so a shared state never reaches a server or CDN log.
test('C8: a link in the fragment is read from it; a query link (v2, an early query v3, a guide preset) moves to the fragment', () => {
  const hash = '#v=3&c=temperate&k=FR&a=AAAAAA&e=1';
  const fromHash = arrivalParams({ search: '', hash });
  assert.equal(fromHash.params.get('k'), 'FR');
  assert.equal(fromHash.fragment, true);
  assert.equal(fromHash.address, null, 'nothing to move');
  for (const search of ['?v=2&c=temperate&p=deadbeef', '?v=3&c=temperate&a=AAAAAA', '?plant=Malus+domestica&climate=temperate']) {
    const r = arrivalParams({ search, hash: '' });
    assert.equal(r.fragment, false, search);
    assert.equal(r.params.toString(), search.slice(1), search);
    // F3: a v3 query link was never held to the end marker, so it moves with one.
    assert.equal(r.address, '#' + search.slice(1) + (search.startsWith('?v=3') ? '&e=1' : ''), `${search}: moved to the fragment with replaceState`);
  }
  const moved = arrivalParams({ search: '?v=3&c=temperate&a=AAAAAA', hash: '' }).address;
  assert.equal(linkDamaged(core.decodeState(new URLSearchParams(moved.slice(1))), true), false, 'F3: read again from the fragment, it is whole');
  assert.equal(arrivalParams({ search: '?v=2&c=temperate', hash: '' }).address, '#v=2&c=temperate', 'a v2 link keeps no marker');
  // An old link's `mine` never survives, in either place.
  assert.equal(arrivalParams({ search: `?c=tropical&${MINE}=FR&k=TW`, hash: '' }).address, '#c=tropical&k=TW');
  assert.equal(arrivalParams({ search: '', hash: `#c=tropical&${MINE}=FR` }).address, '#c=tropical');
  assert.equal(arrivalParams({ search: '', hash: `#c=tropical&${MINE}=FR` }).params.has(MINE), false);
  // The fragment wins over a query; a page anchor (the skip link's #main) is not a state.
  assert.equal(arrivalParams({ search: '?c=arid', hash: '#c=tropical' }).params.get('c'), 'tropical');
  assert.equal(arrivalParams({ search: '?c=arid', hash: '#c=tropical' }).address, '#c=tropical', 'the query goes');
  const anchor = arrivalParams({ search: '', hash: '#main' });
  assert.equal([...anchor.params].length, 0);
  assert.equal(anchor.address, null);
});

test('C8: memory.arrive moves a query link into the fragment before anything else, and the language links carry the fragment only', () => {
  const tab = { state: null, location: { pathname: '/consortium/', search: '?v=2&c=temperate&k=FR', hash: '' } };
  tab.replaceState = (state, _t, url) => { tab.state = state; if (url != null) { const u = new URL(url, 'https://x.test/consortium/'); tab.location.pathname = u.pathname; tab.location.search = u.search; tab.location.hash = u.hash; } };
  const m = memoryOf({ storage: null, history: tab, location: tab.location });
  const params = m.arrive();
  assert.equal(params.get('k'), 'FR');
  assert.equal(tab.location.search, '', 'no query left for a request to carry');
  assert.equal(tab.location.hash, '#v=2&c=temperate&k=FR');
  assert.equal(m.fromFragment, false, 'a query v3 link is not checked for its end marker');
  assert.equal(withHash('/fr/consortium/', '#v=3&c=temperate&e=1'), '/fr/consortium/#v=3&c=temperate&e=1');
  assert.equal(withHash('/fr/consortium/?old=1#x', ''), '/fr/consortium/');
  assert.equal(langHash(`#v=3&c=temperate&${MINE}=DE`), '#v=3&c=temperate');
  assert.equal(langHash('#main'), '', 'a page anchor is not carried');
  assert.equal(langHash(''), '');
});

// B1: a cut or unreadable link always says plants may be missing.
test('B1: a cut, malformed or unknown-version link is damaged; a whole one, and a query link from before the end marker, are not', () => {
  const ids = temperate.taxa.slice(0, 12).map((t) => t.id);
  const q = core.encodeState({ climate: 'temperate', country: null, site: core.DEFAULT_SITE, kept: [ids[0]], removed: [], members: ids }, temperate).toString();
  assert.equal(linkDamaged(core.decodeState(q), true), false);
  const atBoundary = q.slice(0, q.indexOf('a=') + 2 + 6 * 4);
  assert.equal(droppedPlants(core.decodeState(atBoundary).dropped), 0, 'cut between two tokens: nothing reads as lost');
  assert.equal(linkDamaged(core.decodeState(atBoundary), true), true, 'but the end is missing');
  assert.equal(linkDamaged(core.decodeState(q.slice(0, q.indexOf('a=') + 9)), true), true, 'cut inside a token');
  assert.equal(linkDamaged(core.decodeState('v=3&c=temperate&a=*'), false), true, 'a list that does not parse, in a query link too');
  assert.equal(linkDamaged(core.decodeState('v=2&c=temperate&p=zz'), false), true, 'v2 too');
  assert.equal(linkDamaged(core.decodeState('v=4&c=temperate&a=AAAAAA&e=1'), true), true, 'a version this page does not know');
  assert.equal(linkDamaged(core.decodeState('v=3&c=temperate&a=AAAAAA'), false), false, 'an early query v3 link has no end marker');
  assert.equal(linkDamaged(core.decodeState('v=2&c=temperate&p=deadbeef'), true), false, 'v2 has no end marker');
  assert.equal(linkDamaged(core.decodeState('plant=Malus+domestica&climate=temperate'), true), false, 'a guide preset');
  assert.equal(linkDamaged(core.decodeState('v=3&c=temperate&l=dim&e=1'), true), false, 'a bad site answer loses no plant');
  for (const lang of locales) for (const key of ['cutLink.title', 'cutLink.text']) assert.ok(strings[lang][key], `${lang}: ${key}`);
  assert.match(strings.en['cutLink.text'], /may be missing/);
});

// B2, B9: other lists load in a fixed order, and a list that fails is a retryable error, never "no longer listed".
test('B2, B9: other lists come back in the climates\' order whatever arrives first, with the ones that failed', async () => {
  const files = { tropical, mediterranean };
  const delays = { tropical: 30, mediterranean: 0 };
  const load = (c) => new Promise((res, rej) => setTimeout(() => (c === 'arid' ? rej(new Error('timeout')) : res(files[c])), delays[c] ?? 5));
  const r = await loadLists(['tropical', 'arid', 'mediterranean'], load);
  assert.deepEqual([...r.files.keys()], ['tropical', 'mediterranean'], 'CLIMATES order, not arrival order');
  assert.deepEqual(r.failed, ['arid']);
  const map = new Map([['mediterranean', mediterranean], ['tropical', tropical]]);
  assert.deepEqual(inClimateOrder(map, ['tropical', 'subtropical', 'mediterranean', 'temperate'], 'temperate').map(([c]) => c), ['tropical', 'mediterranean']);
  // A plant in two other lists is labelled with the first in climates' order, every time.
  const both = { ...mediterranean, climate_zone: 'tropical', taxa: [...tropical.taxa, mediterranean.taxa.find((t) => t.canonical_name === 'Ficus carica')] };
  const twice = new Map([['mediterranean', mediterranean], ['tropical', both]]);
  assert.equal(otherListMatches('fig', inClimateOrder(twice, ['tropical', 'mediterranean'], 'temperate'), temperate)[0].climate, 'tropical');
  for (const lang of locales) assert.ok(strings[lang].othersFailed, `${lang}: othersFailed`);
  assert.equal(strings.en.othersFailed, 'Some other climates’ lists could not be loaded.', 'F6: only some may have failed');
});

test('B4: a plant from another list never prints "None found (all checked)": its fit here was never checked', () => {
  const t = { warnings: { allelopathic: false } };
  assert.equal(printNoneKey(t, { country: null, checked: false }), 'printNone');
  assert.equal(printNoneKey(t, { country: null, checked: false }, true), 'printNoneYet');
});

test('B5: Back and Undo restore the consortium, never the country chosen since', () => {
  const before = { climate: 'temperate', members: ['a'], country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: null, linkCode: null };
  const now = { climate: 'temperate', members: [], country: 'BR', countrySource: 'user', noCountry: false, unknownCountry: null, linkCode: null };
  const back = keepCountry(before, now);
  assert.deepEqual(back.members, ['a']);
  assert.deepEqual([back.country, back.countrySource], ['BR', 'user']);
  assert.equal(before.country, 'FR', 'the snapshot itself is left alone');
  const none = keepCountry(before, { ...now, country: null, noCountry: true, unknownCountry: 'ZZ', linkCode: 'ZZ' });
  assert.deepEqual([none.country, none.noCountry, none.unknownCountry, none.linkCode], [null, true, 'ZZ', 'ZZ']);
});

test('C11, C14: the redo toast says what is there: main crops only while some are left', () => {
  assert.equal(redoToastKey({ place: true }, []), 'redoneClimate');
  assert.equal(redoToastKey({ crops: true }, ['x']), 'redoneCrops');
  assert.equal(redoToastKey({ crops: true }, []), 'redoneSite', 'every crop removed in Change crops');
  assert.equal(redoToastKey({}, ['x']), 'redoneSite');
});

test('B10: swapping a main crop ends it as one, and says so', () => {
  const lists = { members: ['g', 'a'], kept: new Set(['g']), removed: new Set(), crops: ['g'], guests: new Map() };
  const r = afterSwap(lists, 'g', 'c');
  assert.deepEqual(r.members, ['c', 'a']);
  assert.deepEqual(r.crops, []);
  assert.equal(r.endedCrop, true);
  assert.ok(r.kept.has('c') && !r.kept.has('g') && r.removed.has('g'));
  assert.equal(afterSwap({ ...lists, crops: [] }, 'g', 'c').endedCrop, false);
  assert.equal(afterSwap({ ...lists, guests: new Map([['g', {}]]) }, 'g', 'c').removed.has('g'), false, 'a guest simply leaves');
  for (const lang of locales) for (const key of ['swapCropNote', 'swappedCrop']) assert.ok(strings[lang][key], `${lang}: ${key}`);
  assert.equal(enW.T('swappedCrop', { a: 'Garlic', b: 'Chives' }), 'Garlic swapped for Chives. Garlic is no longer a main crop.');
});

test('B13: the Add search\'s other-list plants follow the same job, layer and stage filters as its own list', () => {
  const fig = mediterranean.taxa.find((t) => t.canonical_name === 'Ficus carica');
  assert.equal(addFilterMatch(fig, {}), true);
  assert.equal(addFilterMatch(fig, { layer: 'high' }), true);
  assert.equal(addFilterMatch(fig, { layer: 'low' }), false);
  assert.equal(addFilterMatch(fig, { job: 'feeds_you' }), core.jobsOf(fig).includes('feeds_you'));
  const i = core.phases.indexOf(fig.phases.start);
  assert.equal(addFilterMatch(fig, { phase: i }), true);
  assert.equal(addFilterMatch(fig, { phase: 0 }), false, 'Fig does not lead in the first stage');
  assert.equal(addFilterMatch({ ...fig, phases: null }, { phase: i }), false);
});

// B7, F1, F4: the main crops and other-list plants read the same for every reader; nothing remembers
// who picked them (scripts/consortium-app.test.mjs runs this on the page).
test('B7: main crops and plants from another list are described neutrally, in every language, with nothing stored', () => {
  assert.equal(builtKey(1), 'builtOne');
  assert.equal(builtKey(2), 'builtMany');
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const tab = { state: null, location: { pathname: '/consortium/', search: '', hash: '' }, replaceState(state) { tab.state = state; } };
  const m = memoryOf({ storage, history: tab, location: tab.location });
  assert.equal('own' in m || 'addOwn' in m, false, 'no own-picks memory');
  const keys = ['builtOne', 'builtMany', 'mainCropText', 'fromListText', 'mainCropRemoveNote', 'redoneCrops'];
  for (const lang of locales) {
    for (const key of keys) assert.ok(strings[lang][key], `${lang}: ${key}`);
    for (const key of ['builtOneLink', 'builtManyLink', 'mainCropTextLink', 'fromListTextLink']) assert.equal(strings[lang][key], undefined, `${lang}: ${key} is gone`);
  }
  const own = { en: /\byour?\b|\byou (chose|added)/i, fr: /\b(votre|vos)\b|vous l’avez/i, es: /\btus?\b|la (elegiste|añadiste)/i, pt: /\bsuas?\b|(escolheu|adicionou)-a/i, it: /\btue?\b|l’hai/i, de: /\bdeine?n?\b|du hast/i, nl: /\bje\b(?! het)/i, ru: /\bваш(и|ей|их)?\b|вы (выбрали|добавили)/i, zh: /你/ };
  for (const [lang, re] of Object.entries(own)) for (const key of keys) assert.doesNotMatch(strings[lang][key], re, `${lang} ${key}: ${strings[lang][key]}`);
  assert.equal(enW.T('builtMany', { names: 'Garlic and Apple' }), 'Built around the main crops: Garlic and Apple. They are kept, and the other plants were chosen to grow well with them.');
});

// F2: a fragment this tab wrote is the tab's own: its country never reads as someone else's link.
test('F2: the page marks the fragment it writes; Back or a reload of it keeps the reader\'s country and its label', () => {
  const known = (c) => ['FR', 'BR', 'DE'].includes(c);
  const link = { country: 'FR' };
  assert.deepEqual([pickCountry({ link, pref: 'BR', known }).countrySource], ['link'], 'a real arrival: the sender\'s');
  const ownThen = pickCountry({ link, linkSource: 'user', pref: 'BR', known });
  assert.deepEqual([ownThen.country, ownThen.countrySource], ['BR', 'user'], 'the reader\'s own then: their choice now wins');
  const noPref = pickCountry({ link, linkSource: 'saved', pref: null, known });
  assert.deepEqual([noPref.country, noPref.countrySource], ['FR', 'saved'], 'and keeps its own label without one');
  const linkThen = pickCountry({ link, linkSource: 'link', pref: 'BR', known });
  assert.deepEqual([linkThen.country, linkThen.countrySource], ['FR', 'link'], 'a sender\'s country written back stays the sender\'s');
  // memory.write marks the entry; arrive reads the mark only when the fragment is the one written.
  const store = new Map([['canopi-country', 'BR']]);
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const loc = { pathname: '/consortium/', search: '', hash: '' };
  const tab = { state: null, replaceState(state, _t, url) { tab.state = state; if (url != null) loc.hash = url.slice(url.indexOf('#')); } };
  memoryOf({ storage, history: tab, location: loc }).write('/consortium/', '#v=3&c=temperate&k=FR&e=1', { countrySource: 'user', climateSource: 'site' });
  assert.equal(tab.state[WROTE].hash, '#v=3&c=temperate&k=FR&e=1');
  const m = memoryOf({ storage, history: tab, location: loc });
  const params = m.arrive();
  assert.equal(m.written.countrySource, 'user');
  const { country } = startState({ params, memory: m, guess: null, known });
  assert.deepEqual([country.country, country.countrySource], ['BR', 'user']);
  loc.hash = '#v=3&c=temperate&k=FR&e=1&p=x';
  const other = memoryOf({ storage, history: tab, location: loc });
  other.arrive();
  assert.equal(other.written, null, 'another fragment in the same entry (a paste) is a real arrival');
});

// B6: only the reader's own climate pick says "chosen by you".
test('B6: a climate from a shared link reads "from the shared link"; one the reader chose on this site, as before', () => {
  assert.equal(climateSourceAt({ fromLink: true, climate: 'temperate', guide: false, siteClimate: null }), 'link');
  assert.equal(climateSourceAt({ fromLink: true, climate: 'temperate', guide: false, siteClimate: 'temperate' }), 'site', 'the reader\'s own reload, or a link with the climate they chose');
  assert.equal(climateSourceAt({ fromLink: true, climate: 'temperate', guide: true, siteClimate: null }), 'guide');
  assert.equal(climateSourceAt({ fromLink: false, climate: 'temperate', guide: false, siteClimate: 'arid' }), 'saved');
  assert.equal(climateSourceAt({ fromLink: false, climate: null, guide: false, siteClimate: 'arid' }), null);
  for (const lang of locales) assert.ok(strings[lang].climateChosen, `${lang}: climateChosen`);
  assert.equal(strings.ru.climateChosen, 'выбран вами', 'agrees with «климат»');
});

// C14: the invasive words are handed the taxon itself, whose records are { country, sources }.
test('C14: a plant\'s invasive words read its own records', () => {
  const leucaena = tropical.taxa.find((t) => t.canonical_name === 'Leucaena leucocephala');
  const n = new Set(leucaena.warnings.invasive_in.map((x) => x.country)).size;
  assert.equal(cardInvasive(enW, { country: null }, leucaena).text, enW.P('invCount', n));
  assert.equal(cardInvasive(enW, { country: 'FR', checked: true }, leucaena), null, 'with a country, only its own flag');
  assert.equal(detailsInvasive(enW, { country: null }, leucaena).list.countries.length, n);
});

// C3, C11, C12: wording.
test('C11, C12: the crop step and main-crop words read as the mockup and each language want', () => {
  const withClimates = (lang) => makeWords({ ...strings[lang], 'climate.temperate': home[lang]['climate.temperate'] }, lang);
  const enC = withClimates('en');
  assert.equal(enC.T('crops.label', { climate: enC.climate('temperate'), list: enC.T('list.temperate') }), 'Search the Temperate food plants');
  const frC = withClimates('fr');
  assert.equal(frC.T('crops.label', { climate: frC.climate('temperate') }), 'Chercher parmi les plantes nourricières (climat\u00a0: Tempéré)');
  for (const lang of locales) {
    assert.ok(strings[lang]['crops.fromGuide'], `${lang}: crops.fromGuide`);
    assert.doesNotMatch(strings[lang]['crops.elsewhere'], /plant search|recherche de plantes/i, `${lang}: names a control the page has`);
    assert.match(strings[lang]['crops.elsewhere'], /\{grow\}/, `${lang}: crops.elsewhere names the "I want to grow…" control`);
  }
  assert.equal(strings.en['crops.fromGuide'], 'from the guide');
  assert.equal(strings.fr.mainCropRemoveNote, 'Si vous la retirez, elle n’est plus une culture principale.');
  assert.equal(strings.fr.redoneCrops, 'Nouvelles plantes suggérées autour des cultures principales. Les plantes gardées restent.');
  assert.equal(strings.de.suggestIt, 'Pflanzen dazu vorschlagen');
  assert.match(strings.es.builtOne, /con ella\.$/, 'es: la planta, as mainCropText');
});
