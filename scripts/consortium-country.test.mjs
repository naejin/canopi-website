// The consortium tool's country and reason words, tested by what they say (review of the climate-first
// core, 2026-10-28: M1, M2, m1 to m12). The pure parts live in src/scripts/consortium/logic.js (no
// strings) and src/scripts/consortium/parts.js (words, rendered with the real locale files).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWords } from '../src/scripts/consortium/words.js';
import { pickCountry, guessCountry, linkCountry, langSearch, chosenHere, printNoneKey, invasiveSourceIds } from '../src/scripts/consortium/logic.js';
import { cardReasonHTML, reasonsHTML, countryWhy, countryLineParts, warnWhere, printWhere, invasiveCardNote, invasiveDetails, countryAnnouncement } from '../src/scripts/consortium/parts.js';
import { memoryOf, startState, STORE, COUNTRY_STORE, MINE } from '../src/scripts/consortium/memory.js';
import * as core from '../src/lib/consortium/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const strings = Object.fromEntries(locales.map((lang) => {
  const all = JSON.parse(read(`src/i18n/translations/${lang}.json`));
  return [lang, Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice('consortium.'.length), v]))];
}));
const words = Object.fromEntries(locales.map((l) => [l, makeWords(strings[l], l)]));
const en = words.en, fr = words.fr;
const known = (c) => ['FR', 'TW', 'DE', 'RE'].includes(c);

// ---------- M1, m12: where the country comes from at start ----------
test('M1: a country the reader chose keeps "chosen by you" after their own reload or language switch', () => {
  // persist() wrote k=FR into the address bar; the reader's own choice is FR.
  assert.deepEqual(pickCountry({ link: { country: 'FR', noCountry: false }, pref: 'FR', saved: null, guess: 'DE', known }),
    { country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: null });
});

test('M1: only a link with someone else\'s country reads "from the shared link"', () => {
  assert.equal(pickCountry({ link: { country: 'DE', noCountry: false }, pref: 'FR', saved: null, guess: null, known }).countrySource, 'link');
  assert.equal(pickCountry({ link: { country: 'DE', noCountry: false }, pref: null, saved: null, guess: 'DE', known }).countrySource, 'link');
});

test('m12: a chosen country or "No country" survives a reload in every status; Start over keeps it', () => {
  // Start over cleared the saved consortium and the address bar; the choice stays on the device.
  assert.deepEqual(pickCountry({ link: null, pref: 'TW', saved: null, guess: 'FR', known }),
    { country: 'TW', countrySource: 'user', noCountry: false, unknownCountry: null });
  assert.deepEqual(pickCountry({ link: null, pref: '-', saved: null, guess: 'FR', known }),
    { country: null, countrySource: 'user', noCountry: true, unknownCountry: null });
  // A link with no k (a guide preset, or a reader with no country) keeps the reader's choice.
  assert.equal(pickCountry({ link: { country: null, noCountry: false }, pref: '-', saved: null, guess: 'FR', known }).noCountry, true);
  // The reader's choice beats a saved consortium's country that came from someone's link.
  assert.equal(pickCountry({ link: null, pref: 'FR', saved: { country: 'DE', noCountry: false, source: 'link' }, guess: null, known }).country, 'FR');
});

test('m12: a save from before the device choice still restores, with where it came from', () => {
  assert.equal(pickCountry({ link: null, pref: null, saved: { country: 'DE', noCountry: false, source: 'link' }, guess: 'FR', known }).countrySource, 'link');
  assert.equal(pickCountry({ link: null, pref: null, saved: { country: 'DE', noCountry: false }, guess: 'FR', known }).countrySource, 'saved');
  assert.equal(pickCountry({ link: null, pref: null, saved: { country: null, noCountry: true }, guess: 'FR', known }).noCountry, true);
  // A stale or unknown code on the device is quiet, and the guess comes back.
  assert.deepEqual(pickCountry({ link: null, pref: 'ZZ', saved: null, guess: 'FR', known }),
    { country: 'FR', countrySource: 'guess', noCountry: false, unknownCountry: null });
  assert.deepEqual(pickCountry({ link: null, pref: null, saved: null, guess: null, known }),
    { country: null, countrySource: null, noCountry: false, unknownCountry: null });
});

// ---------- guessCountry ----------
test('guessCountry: the one country whose zones hold the time zone, else the region of the languages', () => {
  const zones = { FR: ['Europe/Paris'], TW: ['Asia/Taipei'], UA: ['Europe/Kiev'], RU: ['Europe/Kiev', 'Europe/Moscow'], DE: ['Europe/Berlin'] };
  const zonesOf = (c) => zones[c] ?? [];
  const codes = Object.keys(zones);
  assert.equal(guessCountry(codes, { zone: 'Asia/Taipei', languages: ['en-US'], zonesOf }), 'TW');
  assert.equal(guessCountry(codes, { zone: 'Europe/Kiev', languages: ['de-DE'], zonesOf }), 'DE', 'an ambiguous zone falls through to the language');
  assert.equal(guessCountry(codes, { zone: 'Europe/Kiev', languages: ['en-US'], zonesOf }), null, 'US is not a known code here');
  assert.equal(guessCountry(codes, { zone: 'Pacific/Nowhere', languages: ['fr'], zonesOf }), 'FR', 'fr maximizes to fr-Latn-FR');
  assert.equal(guessCountry(codes, { zone: undefined, languages: ['xx-??', 'de'], zonesOf: () => { throw new Error('no zones'); } }), 'DE', 'bad input is skipped');
  // With the runtime's own CLDR data (Firefox has no getTimeZones: the zone step finds nothing).
  const all = Object.keys(JSON.parse(read('public/data/consortium/manifest.json')).countries);
  assert.ok([null, 'TW'].includes(guessCountry(all, { zone: 'Asia/Taipei', languages: [] })));
  assert.equal(guessCountry(all, { zone: 'Etc/Unknown', languages: ['fr-CA'] }), 'CA');
});

// ---------- M2, m5: reasons and their regions ----------
const sources = { s1: { label: 'Crawford (2010)' }, s2: { label: 'Toensmeier (2016)' } };
const angico = { reasons: [{ region: 'southern_america', text: { en: 'Angico; nitrogen-fixing native pioneer hardwood.' }, sources: ['s1'] }] };
const twoRegions = { reasons: [
  { region: 'europe', text: { en: 'A staple fruit tree.', fr: 'Un arbre fruitier de base.' }, sources: ['s1', 's2'] },
  { region: 'southern_america', text: { en: 'Grown in the highlands.' }, sources: ['s2'] },
] };

test('M2: a card never shows a regional reason without its region, and says when other regions apply', () => {
  const one = cardReasonHTML(angico, en, 'en');
  assert.match(one, /Central and South America and the Caribbean/);
  assert.match(one, /native pioneer/);
  assert.doesNotMatch(one, /other region/);
  const two = cardReasonHTML(twoRegions, en, 'en');
  assert.match(two, /Europe/);
  assert.match(two, /1 other region/);
  const twoFr = cardReasonHTML(twoRegions, fr, 'fr');
  assert.match(twoFr, /Europe/);
  assert.match(twoFr, /Un arbre fruitier de base/);
  assert.match(twoFr, /1 autre région/);
  assert.equal(cardReasonHTML({ reasons: [] }, en, 'en'), '');
  for (const lang of locales) {
    const html = cardReasonHTML(twoRegions, words[lang], lang);
    assert.ok(html.includes(words[lang].region('europe')), `${lang}: region on the card`);
    assert.doesNotMatch(html, /\{\w+\}/, `${lang}: no placeholder left`);
  }
});

test('m5: details label each reason "chosen for" its region, with every source, in a form that fits any count', () => {
  const html = reasonsHTML(twoRegions, en, 'en', sources);
  assert.match(html, /Chosen for Europe/);
  assert.match(html, /Crawford \(2010\) and Toensmeier \(2016\)/);
  assert.match(html, /Chosen for Central and South America and the Caribbean/);
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
  // fr, de, es, pt, it, nl and ru: no singular "source" noun before a list of sources.
  for (const lang of ['fr', 'de', 'es', 'pt', 'it', 'nl', 'ru']) {
    assert.doesNotMatch(strings[lang].reasonFrom, /(source|Quelle|fuente|fonte|bron|источник)\s*:/iu, `${lang}: ${strings[lang].reasonFrom}`);
  }
});

// ---------- m1, m2, m3: the country line and the surfaces that name the country ----------
test('m1: a guessed country always says "guessed from your browser", with the no-list reason beside it', () => {
  assert.deepEqual(countryWhy(en, { country: 'TW', source: 'guess', checked: false }), [en.T('countryGuessed'), en.T('countryNoList')]);
  assert.deepEqual(countryWhy(en, { country: 'FR', source: 'guess', checked: true }), [en.T('countryGuessed')]);
  assert.deepEqual(countryWhy(en, { country: 'TW', source: 'user', checked: false }), [en.T('countryChosen'), en.T('countryNoList')]);
  assert.deepEqual(countryWhy(en, { country: 'FR', source: 'link', checked: true }), [en.T('countryLinked')]);
  assert.deepEqual(countryWhy(en, { country: 'FR', source: 'saved', checked: true }), [en.T('countryChosen')]);
  assert.deepEqual(countryWhy(en, { country: null, source: null, checked: false }), []);
  for (const lang of locales) assert.match(strings[lang].countryNoList, /./, lang);
  assert.match(en.T('countryNoList'), /not checked/);
});

test('m2: an unchecked country reads "not checked in {country}" on the sub-line, the print head, cards and print rows', () => {
  const tw = { country: 'TW', checked: false }, fr0 = { country: 'FR', checked: true }, none = { country: null, checked: false };
  assert.equal(warnWhere(en, tw), 'invasive status not checked in Taiwan');
  assert.equal(warnWhere(en, fr0), 'warnings for France');
  assert.equal(warnWhere(en, none), '');
  assert.equal(printWhere(en, tw), 'Invasive status not checked in Taiwan');
  assert.equal(printWhere(en, fr0), 'Invasive warnings for France');
  assert.equal(printWhere(en, none), en.T('printCounts'));
  assert.match(warnWhere(fr, { country: 'RE', checked: false }), /non vérifié.*Réunion/);
  // Cards and rows (m-2): a status the same for every plant is said once per view (the country line, the
  // sub-line, the print head) and in details, never as a chip on every card ahead of its own warnings.
  for (const inv of [[], [{ country: 'BR', sources: ['g'] }], null]) assert.equal(invasiveCardNote(en, { ...tw, inv }), null);
  // A print row with nothing else to say never reads "None found (all checked)" for an unchecked country.
  assert.equal(printNoneKey({ warnings: { allelopathic: false } }, tw), 'printNoneYet');
  assert.equal(printNoneKey({ warnings: { allelopathic: false } }, fr0), 'printNone');
  assert.equal(printNoneKey({ warnings: { allelopathic: null } }, fr0), 'printNoneYet');
  assert.equal(printNoneKey({ warnings: { allelopathic: false } }, none), 'printNone');
  // A checked country: its own flag tells (invHere); no count on the card (owner 2026-10-28).
  assert.equal(invasiveCardNote(en, { ...fr0, inv: [{ country: 'BR', sources: ['g'] }] }), null);
  // No country: the soft count of countries.
  assert.deepEqual(invasiveCardNote(en, { ...none, inv: [{ country: 'BR', sources: ['g'] }, { country: 'US', sources: ['g'] }] }), { cls: 'soft', text: 'invasive in 2 countries' });
  for (const lang of locales) {
    assert.doesNotMatch(warnWhere(words[lang], tw), /\{\w+\}/, lang);
    assert.ok(warnWhere(words[lang], tw) !== words[lang].T('warningsFor', { country: words[lang].country('TW') }), `${lang}: not "warnings for"`);
  }
});

test('m3: with no country, one "counts are worldwide" line and one "Add your country"', () => {
  const p = countryLineParts(en, { country: null, source: null, checked: false, noCountry: false });
  assert.equal(p.add, true);
  assert.equal(p.chip, null);
  assert.deepEqual(p.notes, [en.T('noCountryNote')]);
  const chosenNone = countryLineParts(en, { country: null, source: 'user', checked: false, noCountry: true });
  assert.equal(chosenNone.add, false, '"No country ▾" is the control');
  assert.equal(chosenNone.chip, en.T('countryNone'));
  assert.deepEqual(chosenNone.notes, [en.T('noCountryNote')]);
  const tw = countryLineParts(en, { country: 'TW', source: 'guess', checked: false, noCountry: false });
  assert.equal(tw.add, false);
  assert.equal(tw.chip, 'Taiwan');
  assert.deepEqual(tw.notes, []);
  assert.deepEqual(tw.why, [en.T('countryGuessed'), en.T('countryNoList')]);
  // The result has no second line or button of its own (worldHTML is gone), and the unknown-link
  // notice offers none either.
  const app = read('src/scripts/consortium/app.js');
  assert.doesNotMatch(app, /worldHTML|worldCounts/);
  assert.equal((app.match(/T\('addCountry'\)/g) ?? []).length, 1, 'one "Add your country" in the code: the country line\'s');
});

// ---------- m4 ----------
test('m4: an empty invasive_in reads "not recorded invasive in any country GRIIS checked", beside "Not checked in {country}"', () => {
  const d = invasiveDetails(en, { country: 'TW', checked: false, inv: [] });
  assert.equal(d.notChecked.title, 'Not checked in Taiwan');
  assert.equal(d.none.title, 'Not recorded invasive in any country checked by the global register of invasive species (GRIIS)');
  assert.equal(d.none.checkedMark, false, 'never "(checked)"');
  assert.equal(d.list, null);
  assert.equal(d.unknown, null);
  const fr0 = invasiveDetails(en, { country: 'FR', checked: true, inv: [{ country: 'BR', sources: [] }] });
  assert.equal(fr0.notChecked, null);
  assert.equal(fr0.none, null);
  assert.equal(fr0.list.title, 'Recorded invasive in 1 country');
  assert.deepEqual(fr0.list.countries, ['Brazil']);
  assert.equal(invasiveDetails(en, { country: null, checked: false, inv: null }).unknown.title, en.T('unkInv'));
  assert.equal(invasiveDetails(en, { country: 'TW', checked: false, inv: null }).notChecked, null, 'not checked anywhere: one item says it');
  for (const lang of locales) {
    assert.doesNotMatch(strings[lang]['d.invNone'], /anywhere|nulle part|ningún lugar|lado nenhum|nessuna parte|Nirgends|Nergens|Нигде|任何地方|どこでも|어디서도/iu, lang);
    assert.match(strings[lang]['d.invNone'], /GRIIS/, lang);
  }
});

// ---------- core-fix review 2 (2026-10-28): m-1 to m-7, n1 to n3 ----------
test('m-1: choosing a country GRIIS has no list for never announces "warnings for" it', () => {
  assert.equal(countryAnnouncement(en, { country: 'FR', checked: true }), 'Warnings now for France.');
  assert.equal(countryAnnouncement(en, { country: null, checked: false }), en.T('warningsNone'));
  const re = countryAnnouncement(en, { country: 'RE', checked: false });
  assert.match(re, /not checked/);
  assert.match(re, /Réunion/);
  assert.doesNotMatch(re, /Warnings now/);
  for (const lang of locales) {
    const w = words[lang], said = countryAnnouncement(w, { country: 'RE', checked: false });
    assert.notEqual(said, w.T('warningsNow', { country: w.country('RE') }), lang);
    assert.ok(said.includes(w.country('RE')), lang);
    assert.doesNotMatch(said, /\{\w+\}/, lang);
  }
  const app = read('src/scripts/consortium/app.js');
  assert.match(app.match(/function chooseCountry[\s\S]*?\n\}/)[0], /say\(countryAnnouncement\(W, place\(\)\)\)/);
});

test('m-3: a country chosen on this page reads "chosen by you" after a reload or a language switch, even with storage blocked', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const tab = fakeHistory('/consortium/');
  memoryOf({ storage: blocked, history: tab, location: tab.location }).choose('FR');
  // The reload: persist() wrote k=FR into the address bar; the same tab keeps its history.state.
  tab.location.search = '?c=temperate&k=FR';
  const reload = startState({ params: new URLSearchParams(tab.location.search), memory: memoryOf({ storage: blocked, history: tab, location: tab.location }), guess: 'DE', known });
  assert.deepEqual(reload.country, { country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: null });
  // The language switch: a new page, no history.state; the language link carries the reader's own choice.
  const switched = langSearch(tab.location.search, reload.pref);
  assert.match(switched, new RegExp(`${MINE}=FR`));
  const other = fakeHistory('/fr/consortium/', switched);
  const mem = memoryOf({ storage: blocked, history: other, location: other.location });
  const there = startState({ params: new URLSearchParams(switched), memory: mem, guess: 'DE', known });
  assert.equal(there.country.countrySource, 'user');
  // Arrived, the marker leaves the address bar (a copied address never carries it) and stays in the tab.
  mem.settle(there.pref);
  assert.doesNotMatch(other.location.search, new RegExp(MINE));
  assert.equal(memoryOf({ storage: blocked, history: other, location: other.location }).pref(new URLSearchParams(other.location.search)), 'FR');
  // "No country" crosses a language switch too.
  assert.match(langSearch('', '-'), new RegExp(`${MINE}=-`));
  // Someone else's link opened in a fresh tab reads "from the shared link".
  const theirs = fakeHistory('/consortium/', '?c=temperate&k=FR');
  assert.equal(startState({ params: new URLSearchParams(theirs.location.search), memory: memoryOf({ storage: blocked, history: theirs, location: theirs.location }), guess: null, known }).country.countrySource, 'link');
  // No marker: the language links carry nothing of their own.
  assert.equal(langSearch('?c=temperate&k=FR', null), '?c=temperate&k=FR');
  assert.equal(langSearch(`?c=temperate&${MINE}=DE`, 'FR'), `?c=temperate&${MINE}=FR`);
});

test('m-4: the browser\'s guess is never marked as chosen until the reader picks it', () => {
  assert.equal(chosenHere({ guess: 'FR', country: 'FR', source: 'guess' }), false);
  assert.equal(chosenHere({ guess: 'FR', country: 'FR', source: 'link' }), false, 'someone else chose it');
  assert.equal(chosenHere({ guess: 'FR', country: 'FR', source: 'user' }), true);
  assert.equal(chosenHere({ guess: 'FR', country: 'FR', source: 'saved' }), true);
  assert.equal(chosenHere({ guess: 'FR', country: 'DE', source: 'user' }), false);
  assert.equal(chosenHere({ guess: null, country: null, source: null }), false);
  assert.match(read('src/scripts/consortium/app.js'), /inUse = chosenHere\(\{ guess: g, country: S\.country, source: S\.countrySource \}\)/);
});

test('m-5: a link\'s unknown code shows the reader\'s own choice, never the guess, and a reload shows the same', () => {
  assert.deepEqual(pickCountry({ link: { country: 'ZZ', noCountry: false }, pref: 'FR', saved: null, guess: 'DE', known }),
    { country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: 'ZZ' });
  assert.deepEqual(pickCountry({ link: { country: 'ZZ', noCountry: false }, pref: '-', saved: null, guess: 'DE', known }),
    { country: null, countrySource: 'user', noCountry: true, unknownCountry: 'ZZ' });
  const none = pickCountry({ link: { country: 'ZZ', noCountry: false }, pref: null, saved: { country: 'TW', noCountry: false, source: 'user' }, guess: 'DE', known });
  assert.deepEqual(none, { country: null, countrySource: null, noCountry: false, unknownCountry: 'ZZ' });
  // The address bar after the first view keeps the same outcome on reload.
  for (const [pref, first] of [['FR', { country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: 'ZZ' }], [null, none]]) {
    const S = { ...first, linkCode: first.unknownCountry };
    const k = linkCountry(S, false);
    const again = pickCountry({ link: { country: k.country, noCountry: false }, pref, saved: null, guess: 'DE', known });
    assert.equal(again.country, first.country, `pref ${pref}`);
    assert.equal(again.noCountry, first.noCountry, `pref ${pref}`);
  }
  // A guess never enters a link; "No country" only enters the save; the unknown code never enters the save.
  assert.deepEqual(linkCountry({ country: 'FR', countrySource: 'guess', noCountry: false, linkCode: null }, false), { country: null, noCountry: false });
  assert.deepEqual(linkCountry({ country: null, countrySource: 'user', noCountry: true, linkCode: null }, false), { country: null, noCountry: false });
  assert.deepEqual(linkCountry({ country: null, countrySource: 'user', noCountry: true, linkCode: null }, true), { country: null, noCountry: true });
  assert.deepEqual(linkCountry({ country: null, countrySource: null, noCountry: false, linkCode: 'ZZ' }, true), { country: null, noCountry: false });
});

test('m-6: the invasive status names GRIIS in plain words, and GRIIS is in the plant\'s sources wherever the status shows', () => {
  const register = { en: /register/, fr: /registre/, es: /registro/, pt: /regist/, it: /registro/, zh: /名录|登记/, de: /Register/, ja: /登録|リスト/, ko: /목록|등록/, nl: /register/, ru: /реестр/ };
  for (const lang of locales) assert.match(strings[lang]['d.invNone'], register[lang], lang);
  const cellSources = { griis: { label: 'Global Register of Introduced and Invasive Species (GRIIS)' }, x: { label: 'X' } };
  assert.deepEqual(invasiveSourceIds([], cellSources), ['griis'], '"none recorded" still rests on GRIIS');
  assert.deepEqual(invasiveSourceIds([{ country: 'BR', sources: ['griis'] }, { country: 'US', sources: ['griis', 'x'] }], cellSources), ['griis', 'x']);
  assert.deepEqual(invasiveSourceIds(null, cellSources), [], 'not checked anywhere: no source');
  assert.deepEqual(invasiveSourceIds([], {}), [], 'a cell without the GRIIS source lists none');
  // The data: every climate file has the source.
  for (const c of ['temperate', 'mediterranean', 'tropical']) assert.ok(JSON.parse(read(`public/data/consortium/${c}.json`)).sources.griis, c);
});

test('m-7: the start, choose and Start over wiring, run against a stubbed localStorage and history', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const tab = fakeHistory('/consortium/');
  const mem = () => memoryOf({ storage, history: tab, location: tab.location });
  mem().choose('TW');
  assert.equal(store.get(COUNTRY_STORE), 'TW', 'a chosen country is written to canopi-country');
  mem().save('v=2&c=tropical&k=TW&l=sun&s=unsure&w=unsure&m=large', 'user');
  assert.equal(JSON.parse(store.get(STORE)).src, 'user');
  // Start over: the consortium goes, the country stays.
  mem().startOver('/consortium/');
  assert.equal(store.has(STORE), false);
  assert.equal(store.get(COUNTRY_STORE), 'TW');
  assert.equal(tab.location.search, '');
  const fresh = fakeHistory('/consortium/');
  const after = startState({ params: new URLSearchParams(''), memory: memoryOf({ storage, history: fresh, location: fresh.location }), guess: 'FR', known });
  assert.deepEqual(after.country, { country: 'TW', countrySource: 'user', noCountry: false, unknownCountry: null });
  assert.equal(after.pref, 'TW');
  // The save's src reaches pickCountry: someone's link saved, no choice on the device.
  store.clear();
  mem().save('v=2&c=temperate&k=DE&l=sun&s=unsure&w=unsure&m=large', 'link');
  const restored = startState({ params: new URLSearchParams(''), memory: memoryOf({ storage, history: fresh, location: fresh.location }), guess: 'FR', known });
  assert.equal(restored.country.country, 'DE');
  assert.equal(restored.country.countrySource, 'link');
  assert.equal(restored.decoded.state.climate, 'temperate');
  assert.equal(restored.fromLink, false);
  // A guide preset under the same save reads "saved" (n2), and a link wins over the save.
  const guide = startState({ params: new URLSearchParams('plant=Malus%20domestica&climate=temperate'), memory: memoryOf({ storage, history: fresh, location: fresh.location }), guess: 'FR', known });
  assert.equal(guide.country.countrySource, 'saved');
  assert.equal(guide.fromLink, true);
  // Storage that throws everywhere: start still works, with the guess.
  const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const b = fakeHistory('/consortium/');
  assert.equal(startState({ params: new URLSearchParams(''), memory: memoryOf({ storage: blocked, history: b, location: b.location }), guess: 'FR', known }).country.countrySource, 'guess');
  // app.js uses this wiring, not its own.
  const app = read('src/scripts/consortium/app.js');
  assert.doesNotMatch(app, /localStorage\.(getItem|setItem|removeItem)\((STORE|COUNTRY_STORE)/);
  assert.match(app, /startState\(\{/);
});

test('n1: a hand-made k=- in a link does not override the reader\'s own country', () => {
  assert.deepEqual(pickCountry({ link: { country: null, noCountry: true }, pref: 'FR', saved: null, guess: 'DE', known }),
    { country: 'FR', countrySource: 'user', noCountry: false, unknownCountry: null });
  assert.equal(pickCountry({ link: { country: null, noCountry: true }, pref: null, saved: null, guess: 'DE', known }).countrySource, 'guess');
});

test('n2: under a link with no country (a guide preset), a saved country reads "saved", not "from the shared link"', () => {
  assert.equal(pickCountry({ link: { country: null, noCountry: false }, pref: null, saved: { country: 'DE', noCountry: false, source: 'link' }, guess: 'FR', known }).countrySource, 'saved');
  assert.equal(pickCountry({ link: null, pref: null, saved: { country: 'DE', noCountry: false, source: 'link' }, guess: 'FR', known }).countrySource, 'link');
});

test('n3: a country listed twice is counted once', () => {
  const inv = [{ country: 'BR', sources: ['g'] }, { country: 'BR', sources: ['h'] }];
  assert.equal(invasiveDetails(en, { country: 'FR', checked: true, inv }).list.title, 'Recorded invasive in 1 country');
  assert.deepEqual(invasiveCardNote(en, { country: null, checked: false, inv }), { cls: 'soft', text: 'invasive in 1 country' });
});

// A history and location for one tab: replaceState changes the state and the address.
function fakeHistory(pathname, search = '') {
  const location = { pathname, search };
  const h = { state: null, location, replaceState(state, _title, url) {
    h.state = state;
    if (url != null) { const u = new URL(url, 'https://x.test'); location.pathname = u.pathname; location.search = u.search; }
  } };
  return h;
}

// ---------- m6 ----------
test('m6: an unknown country code in a link is called a code we do not know, not a country with no list', () => {
  for (const lang of locales) assert.notEqual(strings[lang].countryUnknown, strings[lang].countryNoList, lang);
  assert.match(strings.en.countryUnknown, /country code \(\{code\}\) is not one we know/);
  assert.doesNotMatch(strings.en.countryUnknown, /invasive list/);
  assert.doesNotMatch(strings.fr.countryUnknown, /liste/);
});

// ---------- m7 ----------
test('m7: the core never reads a missing "checked" flag as checked', () => {
  const leucaena = { warnings: { invasive_in: [{ country: 'BR', sources: ['g'] }] } };
  const clean = { warnings: { invasive_in: [] } };
  assert.equal(core.invasiveIn(leucaena, 'BR'), null, 'no flag: not checked');
  assert.equal(core.invasiveIn(clean, 'BR'), null, 'no flag: not checked, never "none"');
  assert.equal(core.invasiveIn(leucaena, 'BR', true), true);
  assert.equal(core.invasiveIn(clean, 'BR', true), false);
  const suggest = read('src/lib/consortium/suggest.ts');
  assert.doesNotMatch(suggest, /countryChecked \?\? true/);
});

// ---------- m8 ----------
test('m8: the region flow\'s leftovers are gone', () => {
  assert.ok(!('isRegion' in core));
  assert.doesNotMatch(read('src/styles/consortium.css'), /\.field-label/);
  assert.doesNotMatch(read('src/scripts/consortium/app.js'), /else focusNext = 'pc-country'/);
});

// ---------- m10, m11 ----------
test('m10: no climate name in mid-sentence capitals after "climat", "clima" or "klimaat"', () => {
  for (const lang of ['fr', 'es', 'pt', 'it', 'nl']) for (const [key, value] of Object.entries(strings[lang])) {
    assert.doesNotMatch(value, /(climat|clima|klimaat) \{climate\}/iu, `${lang}: ${key}`);
  }
});

test('m11: the phrasings the review named read naturally', () => {
  assert.equal(strings.fr.countryLine, 'Alertes plantes envahissantes :');
  assert.doesNotMatch(Object.values(strings.fr).join('\n'), /comptes d’envahissantes|Comptes d’envahissantes/);
  assert.equal(strings.fr.inUse, 'Choisi');
  for (const key of ['fromBrowser', 'countryGuessed']) assert.doesNotMatch(strings.de[key], /erraten/, key);
  assert.equal(strings.ja.addCountry, '国を指定');
  assert.doesNotMatch(Object.values(strings.ru).join('\n'), /Числа инвазивности/);
  // The same faults elsewhere: "add" for a single setting in zh and ko; "in use" for a choice.
  assert.doesNotMatch(strings.zh.addCountry, /添加/);
  assert.doesNotMatch(strings.ko.addCountry, /추가/);
  for (const lang of ['de', 'es', 'pt', 'it', 'nl']) assert.doesNotMatch(strings[lang].inUse, /^(In Gebrauch|En uso|Em uso|In uso|In gebruik)$/, lang);
});
