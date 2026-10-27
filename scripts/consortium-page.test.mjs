// The consortium page (src/components/consortium/, src/scripts/consortium/): its strings in all 11
// locales, the Field Guides it links, and the pure helpers of words.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pluralForms, makeWords, needsLook, searchText, fold, plantName } from '../src/scripts/consortium/words.js';
import { consortiumGuides, jobGuides, explainGuide } from '../src/data/consortium-guides.ts';
import * as core from '../src/lib/consortium/index.ts';
import { droppedPlants, trimGaps, mayPersist, photoSource, shown } from '../src/scripts/consortium/logic.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const strings = Object.fromEntries(locales.map((lang) => {
  const all = JSON.parse(read(`src/i18n/translations/${lang}.json`));
  return [lang, Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice('consortium.'.length), v]))];
}));
const app = read('src/scripts/consortium/app.js') + read('src/scripts/consortium/words.js');
const manifest = JSON.parse(read('public/data/consortium/manifest.json'));
const siteOptions = { light: core.lights, soil: core.soils, water: core.waters, room: core.rooms };
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
  // copy-M8: keys built at run time are a prefix plus an id of the data core, and each such key
  // names an id the core has; every other key is asked for literally.
  const ids = {
    region: [...core.regions], stratum: [...core.strata, 'none'], band: [...core.phaseBands], phase: [...core.phases], job: [...core.jobs],
    fn: [...core.functionIds, 'crop'], tox: ['Slight', 'Moderate', 'Severe'], ctype: [...core.interactionTypes], tab: ['layers', 'time', 'jobs'],
    sizeLine: [...core.rooms], site: Object.keys(siteOptions), basis: Object.keys(siteOptions), misfit: Object.keys(siteOptions),
    part: Object.keys(manifest.country_regions),
  };
  const dynamicOk = (key) => {
    const dot = key.indexOf('.');
    const prefix = key.slice(0, dot), tail = key.slice(dot + 1);
    if (dot < 0 || !ids[prefix]) return false;
    const [id, rest = ''] = prefix === 'part' ? [tail.slice(0, 2), tail.slice(3)] : [tail.split('.')[0], tail.split('.').slice(1).join('.')];
    assert.ok(ids[prefix].includes(id), `${key}: ${id} is not a ${prefix} id of the data core`);
    if (prefix === 'part') assert.ok(manifest.country_regions[id].includes(rest), `${key}: ${id} is not in ${rest}`);
    if (['site', 'basis', 'misfit'].includes(prefix) && rest) assert.ok(siteOptions[id].includes(rest.replace(/\.hint$/, '')), `${key}: ${rest}`);
    return true;
  };
  for (const key of Object.keys(en)) assert.ok(dynamicOk(key) || app.includes(`'${key}'`) || page.includes(`'${key}'`), `unused string: ${key}`);
});

test('no builder notes reach the page (N3)', () => {
  for (const lang of locales) for (const [key, value] of Object.entries(strings[lang])) {
    assert.doesNotMatch(value, /mock-?up|prototype|virtual|illustrative|placeholder data/i, `${lang}: ${key}`);
    assert.doesNotMatch(value, /TODO|FIXME/, `${lang}: ${key}`);
  }
  assert.doesNotMatch(app, /virtualNote|illustrative|noBetter/);
});

test('every Field Guide the tool links exists in English and French', () => {
  const slugs = new Set([...Object.values(consortiumGuides).flat(), ...Object.values(jobGuides), explainGuide].filter(Boolean));
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
  assert.equal(fr.timeWords(taxon('placenta_iii', 'secondary_ii')).plain, 'Domine de la 1re année à la 25e année');
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

test('logic: an old link counts each lost plant once, from p and a only (m2)', () => {
  const d = (key, value, reason = 'unknown') => ({ key, value, reason });
  assert.equal(droppedPlants([d('p', 'deadbeef'), d('x', 'cafebabe'), d('a', 'deadbeef')]), 1);
  assert.equal(droppedPlants([d('a', 'aaaaaaaa'), d('a', 'bbbbbbbb', 'ambiguous'), d('p', 'cccccccc', 'duplicate'), d('l', 'moon')]), 2);
  assert.equal(droppedPlants([]), 0);
});

test('logic: gap rows never outnumber the free places, and an added plant takes its own layer\'s row (M4)', () => {
  const gaps = [{ stratum: 'high', id: 'a' }, { stratum: 'low', id: 'b' }, { stratum: 'high', id: 'c' }];
  assert.deepEqual(trimGaps(gaps, ['high'], 2).map((g) => g.id), ['b', 'c']);
  assert.deepEqual(trimGaps(gaps, ['medium'], 2).map((g) => g.id), ['b', 'c'], 'another layer: the oldest row goes');
  assert.deepEqual(trimGaps(gaps, ['low', 'high', 'high'], 0), []);
  assert.deepEqual(trimGaps(gaps, [], 3), gaps);
});

test('logic: the address bar is left alone while a cell loads or fails (M2)', () => {
  assert.equal(mayPersist({ status: 'ready', pending: null }), true);
  assert.equal(mayPersist({ status: 'notcovered', pending: null }), true);
  assert.equal(mayPersist({ status: 'loading', pending: null }), false);
  assert.equal(mayPersist({ status: 'error', pending: null }), false);
  assert.equal(mayPersist({ status: 'notcovered', pending: { state: {} } }), true, 'a waiting link is written from its own plants');
});

test('logic: a photo credits the site it came from (copy-M6)', () => {
  assert.equal(photoSource('https://commons.wikimedia.org/wiki/File:X.jpg'), 'Wikimedia Commons');
  assert.equal(photoSource('https://www.inaturalist.org/photos/123'), 'iNaturalist');
  assert.equal(photoSource('https://example.org/x'), 'example.org');
  assert.equal(photoSource('not a url'), null);
  const cells = ['temperate-europe', 'mediterranean-europe', 'tropical-southern-america'];
  for (const c of cells) {
    for (const t of JSON.parse(read(`public/data/consortium/${c}.json`)).taxa) {
      if (t.image?.source_page_url) assert.ok(['Wikimedia Commons', 'iNaturalist'].includes(photoSource(t.image.source_page_url)), `${t.canonical_name}: ${t.image.source_page_url}`);
    }
  }
  assert.doesNotMatch(read('src/scripts/consortium/app.js'), />Wikimedia Commons</, 'the host is never hard-coded');
});

test('logic: a long list shows in steps (copy-m5)', () => {
  const list = [...'abcdefghijk'];
  assert.deepEqual(shown(list, 8), { items: [...'abcdefgh'], more: 3 });
  assert.deepEqual(shown(list, 16), { items: list, more: 0 });
});

// copy-M4: a plant's guide talks about that plant. The guide's English text names it by its
// scientific name, its English name in the cell, or the common word for its kind below, so a
// keyword slip (peach for peach palm) fails here.
const kind = {
  Alnus: 'alder', Bambusa: 'bamboo', Dendrocalamus: 'bamboo', Guadua: 'bamboo', Phyllostachys: 'bamboo', Castanea: 'chestnut',
  Corylus: 'hazel', Gleditsia: 'honey locust', Lupinus: 'lupin', Morus: 'mulberr', Quercus: 'acorn', Salix: 'willow', Tilia: 'linden',
  Triticum: 'wheat', 'Vicia faba': 'fava',
};
// Names that contain a cell plant's name but are another plant.
const falseFriends = { peach: ['peach palm'], pear: ['prickly pear', 'asian pear'], apple: ['apple-ring acacia'] };
test('every guide a plant links names that plant (copy-M4, M5, m7)', () => {
  const taxa = new Map();
  for (const c of ['temperate-europe', 'mediterranean-europe', 'tropical-southern-america']) for (const t of JSON.parse(read(`public/data/consortium/${c}.json`)).taxa) taxa.set(t.canonical_name, t);
  for (const [plant, list] of Object.entries(consortiumGuides)) {
    const t = taxa.get(plant);
    assert.ok(t, `${plant} is a plant of a cell`);
    const words = [plant, t.names.en, kind[plant], kind[t.genus]].filter(Boolean).map((w) => w.toLowerCase());
    for (const slug of list) {
      const text = read(`src/content/guides/${slug}/en.mdx`).toLowerCase();
      assert.ok(words.some((w) => (falseFriends[w] ?? []).reduce((x, f) => x.replaceAll(f, ''), text).includes(w)), `${plant} → ${slug}: the guide never names it (${words.join(', ')})`);
    }
  }
  assert.equal(consortiumGuides['Robinia pseudoacacia'], undefined, 'no guide covers black locust, whose seeds and pods are toxic');
  assert.equal(jobGuides.feeds_soil, 'food-forest');
  assert.equal(jobGuides.helpers, null, 'no guide covers pollinators and pest-eaters yet');
  assert.match(read('src/content/guides/food-forest/en.mdx'), /nitrogen.fixer/i);
});

// copy-M1, copy-B2: the strata labels and phase terms are the Canopi app's own
// (canopi/desktop/web/src/i18n/<lang>.json: filters.stratum_*, canvas.consortium.phase_* and phaseGroup*).
const appWords = {
  en: [['Emergent', 'High', 'Mid', 'Low'], ['Placenta', 'Secondary', 'Climax']],
  fr: [['Émergent', 'Haut', 'Moyen', 'Bas'], ['Placenta', 'Secondaire', 'Climax']],
  es: [['Emergente', 'Alto', 'Medio', 'Bajo'], ['Placenta', 'Secundario', 'Clímax']],
  pt: [['Emergente', 'Alto', 'Médio', 'Baixo'], ['Placenta', 'Secundário', 'Clímax']],
  it: [['Emergente', 'Alto', 'Medio', 'Basso'], ['Placenta', 'Secondario', 'Climax']],
  zh: [['突出层', '高层', '中层', '低层'], ['胎盘期', '次生期', '顶级群落']],
  de: [['Aufragend', 'Hoch', 'Mittel', 'Niedrig'], ['Placenta', 'Sekundär', 'Klimax']],
  ja: [['突出層', '高木層', '中木層', '低木層'], ['プラセンタ', '二次遷移', '極相']],
  ko: [['돌출층', '교목층', '중간층', '저층'], ['플라센타', '2차 천이', '극상']],
  nl: [['Emergent', 'Hoog', 'Midden', 'Laag'], ['Placenta', 'Secundair', 'Climax']],
  ru: [['Эмергентный', 'Высокий', 'Средний', 'Низкий'], ['Плацента', 'Вторичный', 'Климакс']],
};
test('strata labels and phase terms are the app\'s, in every locale (copy-M1, copy-B2)', () => {
  for (const lang of locales) {
    const [layers, [placenta, secondary, climax]] = appWords[lang], s = strings[lang];
    assert.deepEqual(['emergent', 'high', 'medium', 'low'].map((k) => s[`stratum.${k}`]), layers, lang);
    assert.deepEqual(core.phases.map((p) => s[`phase.${p}.term`]), [1, 2, 3].map((n) => `${placenta} ${n}`).concat([1, 2, 3].map((n) => `${secondary} ${n}`), [climax]), lang);
    for (const word of [placenta, secondary, climax]) assert.ok(s['ex.phase'].includes(word), `${lang}: ex.phase names ${word}`);
  }
});

test('toasts never open on a plant name with a gendered participle after it (copy-M3)', () => {
  for (const lang of ['fr', 'es', 'it', 'pt']) for (const key of ['removed', 'swapped', 'added', 'pinned', 'unpinned', 'fromGuide', 'fromGuidePlant']) {
    assert.doesNotMatch(strings[lang][key], /(^|[.!?:]\s)\{(name|a|b|plant)\}\s+(est |está |è )?\p{L}+(ée|ada|ida|ata|uta|ita)\b/u, `${lang}: ${key}`);
  }
});

test('the number of places comes from the manifest, never from the words (copy-m2)', () => {
  for (const lang of locales) for (const key of ['betaNote', 'nc.text']) {
    assert.ok(isPlural(strings[lang][key]) && strings[lang][key].includes('#'), `${lang}: ${key}`);
    assert.doesNotMatch(strings[lang][key], /three|trois|tres|três|tre |drei|drie|три|三|세 /i, `${lang}: ${key}`);
  }
  assert.match(page, /manifest\.cells\.length/);
  assert.match(app, /P\('nc\.text', manifest\.cells\.length\)/);
});
