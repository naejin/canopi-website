// pf-c (Your place, v14 board LocStates "Coordinates typed", owner Q6): the place field reads
// coordinates on this device (src/islands/consortium/views/location/coords.ts readCoords); words go
// to the place search, coordinates are never sent; what looks like coordinates but cannot be read says
// so, and a second Search looks it up as a name (views/location/location.tsx).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readCoords } from '../src/islands/consortium/views/location/coords.ts';

const near = (got, lat, lon) => {
  assert.ok(got && typeof got === 'object', `coordinates read (${JSON.stringify(got)})`);
  assert.ok(Math.abs(got.lat - lat) < 0.005 && Math.abs(got.lon - lon) < 0.005, `${JSON.stringify(got)} ≈ ${lat}, ${lon}`);
};

test('pf-c readCoords: the board\'s three ways of typing Kiambu read alike', () => {
  near(readCoords('-1.17, 36.83'), -1.17, 36.83);
  near(readCoords('−1.17, 36.83'), -1.17, 36.83);
  near(readCoords('1°10′S 36°50′E'), -1.1667, 36.8333);
  near(readCoords('https://www.openstreetmap.org/#map=12/-1.17/36.83'), -1.17, 36.83);
});

test('pf-c readCoords: hemisphere letters, seconds, semicolons and decimal commas, map links', () => {
  near(readCoords('1.17° S, 36.83° E'), -1.17, 36.83);
  near(readCoords('S 1.17 E 36.83'), -1.17, 36.83);
  near(readCoords('36.83 E, 1.17 S'), -1.17, 36.83);
  near(readCoords('1°10\'12"S, 36°49\'48"E'), -1.17, 36.83);
  near(readCoords('-1,17; 36,83'), -1.17, 36.83);
  near(readCoords('45.76;4.84'), 45.76, 4.84);
  near(readCoords('https://www.google.com/maps/place/Kiambu/@-1.17,36.83,13z'), -1.17, 36.83);
  near(readCoords('https://maps.google.com/?q=-1.17,36.83'), -1.17, 36.83);
  near(readCoords('https://www.openstreetmap.org/?mlat=-1.17&mlon=36.83#map=12/-1.2/36.8'), -1.17, 36.83);
  near(readCoords('geo:-1.17,36.83'), -1.17, 36.83);
});

test('pf-c readCoords: what looks like coordinates but cannot be read is "bad", never a guess', () => {
  assert.equal(readCoords('1.17 36'), 'bad');
  assert.equal(readCoords('-1.17 36.83'), 'bad');
  assert.equal(readCoords('95, 10'), 'bad');
  assert.equal(readCoords('10, 200'), 'bad');
  assert.equal(readCoords('1°70′S 36°50′E'), 'bad');
  assert.equal(readCoords('1.17 N 36.83 N'), 'bad');
  assert.equal(readCoords('https://example.org/somewhere'), 'bad');
});

test('pf-c readCoords: words are names to look up', () => {
  for (const name of ['Kiambu', 'Sevilla', 'Lyon 69000', 'Saint-Étienne', 'East London', 'N', 'São Paulo', '名古屋', '']) assert.equal(readCoords(name), null, name);
});

// ---- fix round 1 ----
import { readFileSync } from 'node:fs';
import { meansKoppen } from '../src/lib/consortium/site-climate.ts';
import { koppenWordsKey } from '../src/islands/consortium/views/location/koppen-words.ts';

const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const words = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'))]));

test('pf-c readCoords (R12): a single number, a postcode or an outward code is a name, never "could not read as coordinates"', () => {
  for (const name of ['69001', 'W1', '75', 'SW1A 1AA', '1010', 'N1']) assert.equal(readCoords(name), null, name);
  assert.equal(readCoords('1.17 36'), 'bad', 'two bare numbers still say so');
});

test('pf-c "We read" (R11): every class the site climate can give has its words in every locale', () => {
  const stored = ['Af', 'Am', 'Aw', 'As', 'BWh', 'BWk', 'BSh', 'BSk', 'Csa', 'Csb', 'Csc', 'Cwa', 'Cwb', 'Cwc', 'Cfa', 'Cfb', 'Cfc', 'Dsa', 'Dsb', 'Dsc', 'Dsd', 'Dwa', 'Dwb', 'Dwc', 'Dwd', 'Dfa', 'Dfb', 'Dfc', 'Dfd', 'ET', 'EF'];
  const classes = new Set();
  for (const koppen of stored) for (const tmeanColdC of [-20, -1, 1, 10, 17, 19, 25]) for (const tmeanWarmC of [12, 20, 23, 30]) classes.add(meansKoppen({ koppen, tmeanColdC, tmeanWarmC }));
  for (const k of classes) for (const l of LOCALES) assert.ok(words[l][`consortium.location.k.${koppenWordsKey(k)}`], `${l}: consortium.location.k.${koppenWordsKey(k)} (class ${k})`);
});

// ---- fix round 2 ----
test('pf-c readCoords (R2): a whole-degree pair with a comma ("1,36", "-1,37", "52,4") is read on this device, never sent as a name', () => {
  near(readCoords('1,36'), 1, 36);
  near(readCoords('-1,37'), -1, 37);
  near(readCoords('52,4'), 52, 4);
  near(readCoords('-1, 37'), -1, 37);
  for (const name of ['69001', 'W1', '75']) assert.equal(readCoords(name), null, `${name} stays a name`);
});

// ---- final1 ----
test('pf-c final1 N4 (board Loading, Old browser): the button names the guides with the word of the sentence above it', () => {
  const guideWord = { fr: 'guides', de: 'Ratgeber' };
  for (const [l, w] of Object.entries(guideWord)) {
    assert.ok(words[l]['consortium.load.tooOld'].includes(w), `${l}: the sentence says "${w}"`);
    assert.ok(words[l]['consortium.palette.place.readGuides'].includes(w), `${l}: the button says "${w}" too (${words[l]['consortium.palette.place.readGuides']})`);
  }
});

test('pf-c final1 N5 (the head painted before the island): the inline script takes the link\'s end key and the save\'s store name from the code that writes them, keeping no copy', () => {
  const page = readFileSync(new URL('../src/components/consortium/ConsortiumPage.astro', import.meta.url), 'utf8');
  const script = page.slice(page.indexOf('<script is:inline define:vars'), page.indexOf('</script>', page.indexOf('<script is:inline define:vars')));
  assert.match(script, /define:vars=\{\{[^}]*\bendKey: END_KEY\b/, 'END_KEY (lib/consortium/state.ts) passed in');
  assert.match(script, /define:vars=\{\{[^}]*\bsaveStore: STORE\b/, 'the save\'s store name (state/save.ts STORE) passed in');
  assert.doesNotMatch(script, /'canopi-consortium'|p\.get\('e'\)/, 'no copy of the store name or the end key');
});

// ---- step back: the country field (board Country "Your country") ----
import { enterCountry, findCountries, foldName } from '../src/islands/consortium/views/place/country-search.ts';

const CODES = ['KE', 'TZ', 'RE', 'FR', 'DE', 'GH', 'CV', 'GY', 'KZ', 'QA', 'CA', 'PK', 'BH', 'HT', 'PE', 'MR', 'AF'];
const namesIn = (lang) => { const d = new Intl.DisplayNames([lang], { type: 'region' }); return (c) => d.of(c); };
const english = namesIn('en');
const codesOf = (r) => r.list.map(([c]) => c);

test('pf-c country field: Latin accents and case aside ("reunion" finds Réunion), the English name and the ISO code in every locale', () => {
  assert.deepEqual(codesOf(findCountries('reunion', CODES, namesIn('fr'), english, 'fr')), ['RE']);
  assert.deepEqual(codesOf(findCountries('Kenya', CODES, namesIn('ja'), english, 'ja')), ['KE'], 'a Latin spelling in ja');
  assert.deepEqual(codesOf(findCountries('kenya', CODES, namesIn('ru'), english, 'ru')), ['KE'], 'a Latin spelling in ru');
  assert.deepEqual(codesOf(findCountries('tz', CODES, namesIn('en'), english, 'en')), ['TZ'], 'the ISO code');
  assert.deepEqual(codesOf(findCountries('Kenia', CODES, namesIn('es'), english, 'es')), ['KE'], 'the page-language name');
  assert.deepEqual(findCountries('  ', CODES, namesIn('en'), english, 'en'), { count: 0, list: [] });
});

test('pf-c country field: kana voicing is kept (ガ never finds カ), only U+0300–U+036F folded', () => {
  assert.equal(foldName('ガ', 'ja'), 'ガ'.normalize('NFD'));
  const ja = namesIn('ja');
  const ga = findCountries('ガ', CODES, ja, english, 'ja');
  assert.ok(ga.list.every(([, n]) => n.normalize('NFD').includes('ガ'.normalize('NFD'))), `ガ finds only names with ガ (${ga.list.map(([, n]) => n).join(', ')})`);
  assert.ok(codesOf(ga).includes('GH'), 'ガーナ is found');
  assert.ok(!codesOf(ga).includes('CA'), 'カナダ is not');
});

test('pf-c country field: names that start with the words first, a short list with the full count', () => {
  const r = findCountries('a', CODES, english, english, 'en', 3);
  assert.equal(r.list.length, 3, 'a short list');
  assert.ok(r.count > 3, `the count is every match (${r.count})`);
  const tan = findCountries('tan', CODES, english, english, 'en');
  assert.equal(codesOf(tan)[0], 'TZ', `Tanzania first (${codesOf(tan).join(', ')})`);
  assert.ok(codesOf(tan).includes('PK') && codesOf(tan).includes('AF'), 'names holding it follow');
});

// Review S2 (2026-11-18): Enter in the field takes the one match or an exact full name, never a two-letter
// ISO code that is also the start of other names ("ch" is Switzerland's code, Chad, Chile and China start with it).
test('pf-c country field: Enter takes the one match or an exact name (page language or English), never an ISO code ahead of the list', () => {
  const codes = ['CH', 'CL', 'CN', 'TD', 'DE', 'DK', 'MA', 'MG', 'ML', 'NE', 'NG', 'NI', 'PE', 'IR', 'IQ', 'IE', 'IN', 'ID', 'TZ', 'KE'];
  const at = (q, lang = 'en') => enterCountry(q, codes, namesIn(lang), english, lang);
  for (const q of ['ch', 'de', 'ma', 'ne', 'Ir', 'Ni', 'In', 'CH']) assert.equal(at(q), null, `"${q}" goes to the list`);
  assert.equal(at('ch', 'fr'), null, 'fr "ch" goes to the list (never Suisse)');
  assert.equal(at('Ma', 'fr'), null, 'fr "Ma" goes to the list (never Maroc)');
  assert.equal(at('Niger'), 'NE', 'an exact name, though Nigeria also matches');
  assert.equal(at('niger'), 'NE', 'case aside');
  assert.equal(at('Tanz'), 'TZ', 'the one match');
  assert.equal(at('germany', 'fr'), 'DE', 'the exact English name in fr');
  assert.equal(at('Kenia', 'es'), 'KE', 'the exact page-language name');
  assert.equal(at('zqx'), null, 'no match');
});

// ---- chunk 4 (C2): the guide's missing plant named (T17, chunk-2 M29) and "Keep it as mine" as one
// store-side action (T18, chunk-2 D9). The state modules in Node with a source double. ----
const store = await import('../src/islands/consortium/store.ts');
const restoreM = await import('../src/islands/consortium/state/restore.ts');
const draftM = await import('../src/islands/consortium/state/draft.ts');
const saveM = await import('../src/islands/consortium/state/save.ts');

// A release of three plants, none on the Temperate list: an apple with an English name, a plant with
// a French name only, one with no common name.
const releaseNames = [
  { plant: 1, id: 'p-apple', canonical: 'Malus sieversii', names: { en: 'Wild apple', fr: 'Pommier sauvage' }, lists: ['Arid'] },
  { plant: 2, id: 'p-fr', canonical: 'Plantus gallicus', names: { fr: 'Plante gauloise' }, lists: ['Tropical'] },
  { plant: 3, id: 'p-none', canonical: 'Plantus nudus', names: {}, lists: ['Tropical'] },
];
const sourceDouble = () => ({
  info: () => ({ releaseId: 'r-test', climates: ['Temperate', 'Arid', 'Tropical'] }),
  pool: async () => [],
  interactions: async () => [],
  names: async () => releaseNames,
});
const missingFor = async (plant) => {
  store.source.value = sourceDouble();
  restoreM.notices.value = restoreM.NO_NOTICES;
  await restoreM.applyPreset('Temperate', plant);
  return restoreM.notices.peek().guideMissing;
};

test('chunk 4 T17: a guide\'s plant missing from the chosen list is named by its common name in the page language, else English, else its scientific name; one the release lacks keeps the guide\'s words', async () => {
  assert.equal(await missingFor('Malus sieversii'), 'Wild apple', 'the common name (English page)');
  assert.equal(await missingFor('Plantus gallicus'), 'Plantus gallicus', 'no name in the page language or English: the scientific name');
  assert.equal(await missingFor('Plantus nudus'), 'Plantus nudus', 'no common name: the scientific name');
  assert.equal(await missingFor('Nothingus fakeus'), 'Nothingus fakeus', 'not in the release: the guide\'s own words');
});

test('chunk 4 T18: keepShownAsMine() makes the palette on screen the save (no longer held) and offers one Undo that holds it again', () => {
  saveM.held.value = true;
  store.members.value = ['p-apple', 'p-fr'];
  draftM.keepShownAsMine();
  assert.equal(saveM.held.peek(), false, 'the palette on screen is the save now');
  const line = store.toast.peek();
  assert.ok(line && typeof line.undo === 'function', 'one toast with its Undo');
  line.undo();
  assert.equal(saveM.held.peek(), true, 'Undo holds the save again');
  assert.deepEqual(store.members.peek(), ['p-apple', 'p-fr'], 'the plants on screen stay');
});
