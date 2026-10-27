// The consortium page (src/components/consortium/, src/scripts/consortium/): its strings in all 11
// locales, the Field Guides it links, and the pure helpers of words.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pluralForms, makeWords, needsLook, searchText, fold, plantName } from '../src/scripts/consortium/words.js';
import { consortiumGuides, jobGuides, explainGuide } from '../src/data/consortium-guides.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const strings = Object.fromEntries(locales.map((lang) => {
  const all = JSON.parse(read(`src/i18n/translations/${lang}.json`));
  return [lang, Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice('consortium.'.length), v]))];
}));
const app = read('src/scripts/consortium/app.js') + read('src/scripts/consortium/words.js');
const page = read('src/components/consortium/ConsortiumPage.astro');
const placeholders = (s) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
const isPlural = (s) => /^(zero|one|two|few|many|other)\s*:/.test(s);

test('the tool names itself as the other streams do, in every locale', () => {
  const titles = { en: 'Design a consortium', fr: 'Composer une guilde', de: 'Ein Konsortium planen', es: 'Diseñar un consorcio', pt: 'Criar um consórcio', it: 'Progetta un consorzio', zh: '设计植物联合体', ja: 'コンソーシアムを設計する', ko: '컨소시엄 설계하기', nl: 'Ontwerp een consortium', ru: 'Составить консорциум' };
  for (const lang of locales) assert.equal(strings[lang].title, titles[lang], lang);
});

test('every locale has the same consortium keys and placeholders as English', () => {
  const en = strings.en;
  for (const lang of locales) {
    assert.deepEqual(Object.keys(strings[lang]).sort(), Object.keys(en).sort(), `${lang}: keys`);
    for (const [key, value] of Object.entries(en)) {
      assert.deepEqual(placeholders(strings[lang][key]), placeholders(value), `${lang}: placeholders of ${key}`);
      assert.equal(isPlural(strings[lang][key]), isPlural(value), `${lang}: ${key} plural or not`);
    }
  }
});

test('plural strings have a form with the number for every count, in every locale', () => {
  for (const lang of locales) {
    const rules = new Intl.PluralRules(lang);
    for (const [key, value] of Object.entries(strings[lang])) {
      if (!isPlural(value)) continue;
      const forms = pluralForms(value);
      assert.ok(forms.other, `${lang}: ${key} has no other form`);
      for (const category of rules.resolvedOptions().pluralCategories) {
        if (category === 'zero' || category === 'two') continue;
        if (lang === 'fr' && category === 'many') continue; // millions: falls back to other
        assert.ok(forms[category] ?? (category === 'other' ? null : forms.other), `${lang}: ${key} lacks ${category}`);
      }
      for (let n = 1; n <= 25; n++) assert.ok((forms[rules.select(n)] ?? forms.other).includes('#'), `${lang}: ${key} for ${n}`);
    }
  }
});

test('every key the tool asks for exists, and every key exists for a reason', () => {
  const en = strings.en;
  const asked = new Set([...app.matchAll(/\b[TP]\(\s*'([^']+)'/g), ...page.matchAll(/tr\('([^']+)'\)/g)].map((m) => m[1]));
  for (const key of asked) if (!key.endsWith('.')) assert.ok(key in en, `missing string: ${key}`);
  // Keys built at run time: a prefix plus an id from the data core.
  const dynamic = /^(region|part|site|basis|stratum|band|phase|job|fn|tox|c|u|misfit|ctype|t|tab|sizeLine|nm|nc|oldLink|d|p|ex)\./;
  for (const key of Object.keys(en)) assert.ok(dynamic.test(key) || app.includes(`'${key}'`) || page.includes(`'${key}'`), `unused string: ${key}`);
});

test('no builder notes reach the page (N3)', () => {
  for (const lang of locales) for (const [key, value] of Object.entries(strings[lang])) {
    assert.doesNotMatch(value, /mock-?up|prototype|virtual|illustrative|placeholder data/i, `${lang}: ${key}`);
    assert.doesNotMatch(value, /TODO|FIXME/, `${lang}: ${key}`);
  }
  assert.doesNotMatch(app, /virtualNote|illustrative|noBetter/);
});

test('every Field Guide the tool links exists in English and French', () => {
  const slugs = new Set([...Object.values(consortiumGuides).flat(), ...Object.values(jobGuides), explainGuide]);
  for (const slug of slugs) {
    for (const lang of ['en', 'fr']) assert.ok(existsSync(new URL(`../src/content/guides/${slug}/${lang}.mdx`, import.meta.url)), `${slug}/${lang}.mdx`);
  }
  assert.deepEqual(Object.keys(jobGuides).sort(), ['feeds_soil', 'feeds_you', 'ground', 'helpers', 'mulch', 'shelter']);
  for (const list of Object.values(consortiumGuides)) assert.ok(list.length >= 1 && list.length <= 3);
});

test('words: plural forms, time words, lists', () => {
  assert.deepEqual(pluralForms('one: # plant | other: # plants'), { one: '# plant', other: '# plants' });
  const en = makeWords({ ...strings.en, 'climate.tropical': 'Tropical' }, 'en');
  assert.equal(en.P('count', 1), '1 plant');
  assert.equal(en.P('count', 7), '7 plants');
  assert.equal(en.T('removed', { name: 'Oak' }), 'Oak removed. Its place stays free.');
  assert.equal(en.T('nope'), 'nope');
  const ru = makeWords(strings.ru, 'ru');
  assert.equal(ru.P('count', 1), '1 растение');
  assert.equal(ru.P('count', 3), '3 растения');
  assert.equal(ru.P('count', 5), '5 растений');
  const taxon = (start, end) => ({ phases: { start, end } });
  assert.deepEqual(en.timeWords(taxon('placenta_iii', 'secondary_ii')), { plain: 'Leads from year 1 to year 25', term: 'Placenta 3 – Secondary 2' });
  assert.equal(en.timeWords(taxon('secondary_i', 'climax')).plain, 'Leads from year 3 on');
  assert.equal(en.timeWords(taxon('placenta_i', 'placenta_i')).plain, 'First 90 days');
  assert.equal(en.timeWords({ phases: null }).plain, 'Timing not checked yet');
  const fr = makeWords(strings.fr, 'fr');
  assert.equal(fr.timeWords(taxon('placenta_iii', 'secondary_ii')).plain, 'Mène de la 1re année à la 25e année');
  assert.equal(en.cell('tropical', 'southern_america'), 'Tropical · Southern America');
});

test('words: what counts as "needs a look" (N4) and what the Add search reads (M11)', () => {
  const plant = (level) => ({ warnings: { toxicity: level ? { level } : null } });
  const clean = { flagged: false };
  assert.equal(needsLook(plant(null), clean), false);
  assert.equal(needsLook(plant('Slight'), clean), false);
  assert.equal(needsLook(plant('Moderate'), clean), true);
  assert.equal(needsLook(plant('Severe'), clean), true);
  assert.equal(needsLook(plant(null), { flagged: true }), true);
  const t = { canonical_name: 'Inga edulis', names: { en: 'Ice-cream bean', fr: 'Pois sucré', ja: 'インガ' } };
  assert.ok(searchText(t).includes(fold('pois sucre')));
  assert.ok(searchText(t).includes('inga edulis'));
  assert.ok(searchText(t).includes('インガ'));
  assert.deepEqual(plantName(t, 'de'), { text: 'Ice-cream bean', lang: 'en' });
  assert.deepEqual(plantName(t, 'fr'), { text: 'Pois sucré', lang: null });
});
