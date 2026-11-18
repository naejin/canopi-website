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
