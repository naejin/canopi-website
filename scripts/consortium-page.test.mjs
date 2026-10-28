// The consortium page (src/components/consortium/, src/scripts/consortium/): its strings in all 11
// locales, the Field Guides it links, and the pure helpers of words.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pluralForms, makeWords, needsLook, searchText, fold, plantName, capFirst } from '../src/scripts/consortium/words.js';
import { consortiumGuides, jobGuides, explainGuide } from '../src/data/consortium-guides.ts';
import * as core from '../src/lib/consortium/index.ts';
import { droppedPlants, trimGaps, mayPersist, photoSource, safeHref, shown, linkMembers, afterMove, repeatClick, withQuery, presetPlace, coverageHint, swapTarget, relaxTo, licenceOf, uncheckedOnCard } from '../src/scripts/consortium/logic.js';
import { profileSVG } from '../src/scripts/consortium/draw.js';
import { crops } from '../src/data/crops.ts';

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
  assert.equal(en.cell('tropical', 'southern_america'), 'Tropical · Central and South America and the Caribbean');
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

test('logic: only an http(s) url from the data becomes a link; any other is plain text (prepush m1)', () => {
  const bad = ['javascript:alert(document.domain)', 'javascript://commons.wikimedia.org/%0aalert(document.domain)', 'JaVaScRiPt:x', ' javascript:x', 'data:text/html,x', 'vbscript:x', '//commons.wikimedia.org/x', 'commons.wikimedia.org/x', '', null, undefined, 42];
  for (const url of bad) {
    assert.equal(safeHref(url), null, String(url));
    assert.equal(photoSource(url), null, `photoSource ${String(url)}`);
  }
  assert.equal(safeHref('https://pfaf.org/x?a=1&b=2'), 'https://pfaf.org/x?a=1&b=2');
  assert.equal(safeHref('http://example.org/'), 'http://example.org/');
  // The source is the parsed host: a lookalike host is not Commons.
  assert.equal(photoSource('https://commons.wikimedia.org.evil.example/x'), 'commons.wikimedia.org.evil.example');
  // The page puts a data url in an href only through safeHref; the other hrefs are the site's own.
  const appJs = read('src/scripts/consortium/app.js');
  const hrefs = [...appJs.matchAll(/href="\$\{([^}]+)\}"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 4, 'hrefs found');
  for (const h of hrefs) assert.ok(['g.url', 'data.contact', 'esc(href)', 'esc(pageHref)', 'esc(l.url)'].includes(h), `href from ${h}`);
  assert.match(appJs, /const href = safeHref\(x\.url\)/);
  assert.match(appJs, /pageHref = safeHref\(img\?\.source_page_url\)/);
});

test('logic: a long list shows in steps, and "Show more" counts what one press reveals (copy-m5, min-4)', () => {
  const list = [...'abcdefghijk'];
  assert.deepEqual(shown(list, 8, 8), { items: [...'abcdefgh'], more: 3, next: 3 });
  assert.deepEqual(shown(list, 16, 8), { items: list, more: 0, next: 0 });
  assert.deepEqual(shown([...list, ...list], 8, 8), { items: [...'abcdefgh'], more: 14, next: 8 });
});

test('logic: a no-match result writes no plant list to the link, an emptied one does (min-2)', () => {
  assert.deepEqual(linkMembers('ready', ['a', 'b']), ['a', 'b']);
  assert.deepEqual(linkMembers('ready', []), [], 'an emptied consortium stays empty on reload');
  assert.equal(linkMembers('nomatch', []), null, 'a no-match is worked out again on reload');
  assert.equal(linkMembers('notcovered', []), null);
});

test('logic: a place the user picks drops the notices of the link that opened the page (min-1)', () => {
  const resolved = { pending: null, notice: 'guide', guidePlant: 'Betula pendula', guideId: 'b2d0928d' };
  assert.deepEqual(afterMove(resolved), { notice: null, guidePlant: null, guideId: null });
  for (const notice of ['guideMissing', 'oldlink', 'restored']) assert.equal(afterMove({ ...resolved, notice }).notice, null, notice);
  const waiting = { pending: { state: { plants: ['Betula pendula'] } }, notice: null, guidePlant: 'Betula pendula', guideId: null };
  assert.deepEqual(afterMove(waiting), { notice: null, guidePlant: 'Betula pendula', guideId: null }, 'a link still waiting takes the guide\'s plant to the new place');
  assert.deepEqual(afterMove({ ...waiting, pending: { state: { plants: [] } } }), { notice: null, guidePlant: null, guideId: null });
});

test('logic: the second click of a double click never removes the plant that slid under it (appendix)', () => {
  assert.equal(repeatClick(1, 1000, null), false);
  assert.equal(repeatClick(2, 1000, null), true, 'the second click of a double click');
  assert.equal(repeatClick(1, 1200, 1000), true, 'a click 200 ms after a remove');
  assert.equal(repeatClick(1, 1600, 1000), false);
  assert.equal(repeatClick(0, 1100, 1000), false, 'a keyboard press is never a repeat');
});

// copy-M4, min-5, min-6: a plant's guide is about growing or using that plant. A guide covers a plant
// when its English body (frontmatter, alt text and safety boxes left out) names the plant, as a whole
// word, by its scientific name, its English name in the cell or the common word for its kind below,
// in one of these places: the guide's crop list (crops={[...]}, by crops.ts species), a heading, a
// table row, a list item or a component's plant list, bold text or a <Term>; or twice in prose. One
// passing sentence is not coverage. This is a floor, not the judgement: whether a guide is worth
// reading for a plant stays a human check (see the comment in src/data/consortium-guides.ts).
const kind = {
  Alnus: 'alder', Bambusa: 'bamboo', Dendrocalamus: 'bamboo', Guadua: 'bamboo', Phyllostachys: 'bamboo', Castanea: 'chestnut',
  Corylus: 'hazel', Gleditsia: 'honey locust', Lupinus: ['lupin', 'lupini'], Morus: 'mulberry', Quercus: 'acorn', Salix: 'willow', Tilia: 'linden',
  Triticum: 'wheat', 'Vicia faba': 'fava', 'Phaseolus lunatus': 'lima',
};
// Names that contain a cell plant's name but are another plant, or a product rather than the plant.
// Names that contain a cell plant's word but name another plant.
const falseFriends = {
  peach: ['peach palm'], pear: ['prickly pear', 'asian pear'], apple: ['apple-ring acacia', 'bush apple'], walnut: ['black walnut'], alfalfa: ['alfalfa meal'],
  acorn: ['acorn squash'], potato: ['potato tree', 'air potato'], cacao: ['madre de cacao'], banana: ['banana squash'], chestnut: ['tahitian chestnut'],
  plum: ['black plum (*vitex'], 'black plum': ['black plum (*vitex'],
};
// Words that, in one guide, name a cultivar type or another plant, never the cell plant.
const notAbout = { 'squash-melons-cucumbers': ['acorn', 'banana'], 'hand-crosses': ['acorn', 'banana'] };
const cellTaxa = new Map();
for (const c of ['temperate-europe', 'mediterranean-europe', 'tropical-southern-america']) for (const t of JSON.parse(read(`public/data/consortium/${c}.json`)).taxa) cellTaxa.set(t.canonical_name, t);
const reEsc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(?<![\\p{L}-])${reEsc(w).replace(/y$/, '(?:y|ies)')}(?:s|es)?(?![\\p{L}])`, 'giu');
function covers(plant, slug) {
  const t = cellTaxa.get(plant);
  const body = read(`src/content/guides/${slug}/en.mdx`).replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = plant.split(' '), species = [plant, parts.slice(0, 2).join(' '), `${parts[0]} ${parts.at(-1)}`];
  const ids = [...body.matchAll(/crops=\{\[([^\]]*)\]\}/g)].flatMap((m) => [...m[1].matchAll(/["']([\w-]+)["']/g)].map((x) => x[1]));
  if (ids.some((id) => species.includes(crops.find((c) => c.id === id)?.species))) return 'crop list';
  const text = body.toLowerCase().replace(/<safety[\s\S]*?<\/safety>/g, ' ').replace(/\balt="[^"]*"/g, ' ');
  const words = [plant, t.names.en, kind[plant], kind[t.genus]].flat().filter(Boolean).map((w) => w.toLowerCase()).filter((w) => !(notAbout[slug] ?? []).includes(w));
  const clean = (line, w) => (falseFriends[w] ?? []).reduce((x, f) => x.replaceAll(f, ' '), line);
  let prose = 0;
  for (const line of text.split('\n')) {
    const named = words.filter((w) => wordRe(w).test(clean(line, w)));
    if (!named.length) continue;
    if (/^\s*(#{1,6}|\||[-*]|\d+\.)\s?/.test(line) || /\bcrops: \[/.test(line)) return 'heading, table or list';
    if (named.some((w) => new RegExp(`\\*\\*[^*]*${reEsc(w)}[^*]*\\*\\*|<term[^>]*>[^<]*${reEsc(w)}`).test(line))) return 'bold or term';
    prose += named.reduce((n, w) => n + (clean(line, w).match(wordRe(w))?.length ?? 0), 0);
  }
  return prose >= 2 ? 'prose' : null;
}
test('a lookalike name is not coverage: acorn squash, potato tree, madre de cacao…', () => {
  for (const [plant, slug] of [['Quercus robur', 'squash-melons-cucumbers'], ['Solanum tuberosum', 'trees-with-edible-leaves'],
    ['Theobroma cacao', 'windbreaks-and-living-fences'], ['Musa acuminata', 'hand-crosses'], ['Castanea sativa', 'windbreaks-and-living-fences'],
    ['Malus domestica', 'trees-with-edible-leaves'], ['Syzygium cumini', 'trees-with-edible-leaves']]) {
    if (!cellTaxa.has(plant)) continue;
    assert.equal(covers(plant, slug), null, `${plant} → ${slug}`);
  }
});
test('every guide a plant links covers that plant (copy-M4, M5, m7, min-5, min-6)', () => {
  for (const [plant, list] of Object.entries(consortiumGuides)) {
    assert.ok(cellTaxa.get(plant), `${plant} is a plant of a cell`);
    for (const slug of list) assert.ok(covers(plant, slug), `${plant} → ${slug}: the guide does not cover it`);
  }
  // The test itself: a word inside another word, a lookalike plant and one passing sentence all fail.
  assert.equal(covers('Zea mays', 'nut-staples'), null, 'corn in acorns');
  assert.equal(covers('Pyrus communis', 'water-and-slopes'), null, 'asian pear, prickly pear');
  assert.equal(covers('Pyrus communis', 'no-dig-beds'), null, 'pear in appear');
  assert.equal(covers('Hevea brasiliensis', 'trees-in-the-field'), null, 'one sentence about rubber trees');
  assert.equal(covers('Medicago sativa', 'mulch'), null, 'alfalfa meal is a product');
  assert.equal(covers('Aleurites moluccanus', 'fibre-dye-and-soap'), null, 'a safety line only');
  assert.equal(covers('Juglans regia', 'fibre-dye-and-soap'), null, 'black walnut is another tree');
  assert.equal(covers('Humulus lupulus', 'mulch'), null, 'hop in chopped');
  assert.ok(covers('Allium cepa', 'will-they-cross'), 'a crop list');
  assert.ok(covers('Opuntia ficus-indica', 'water-and-slopes'), 'a false friend of pear is the plant itself here');
  assert.equal(consortiumGuides['Robinia pseudoacacia'], undefined, 'no guide covers black locust, whose seeds and pods are toxic');
  assert.equal(jobGuides.feeds_soil, 'food-forest');
  assert.equal(jobGuides.helpers, 'garden-helpers', 'the pollinator hub covers the Brings helpers job');
  assert.match(read('src/content/guides/garden-helpers/en.mdx'), /<QuickAnswer>[^<]*feeds bees and the hoverflies, wasps and beetles whose young eat aphids/, 'its quick answer answers the job line, "flowers that feed bees and the insects that eat pests"');
  assert.match(read('src/content/guides/food-forest/en.mdx'), /nitrogen.fixer/i);
});

// copy-M1, copy-B2, MAJ-1, min-7: the strata labels and phase terms are the Canopi app's own
// (canopi/desktop/web/src/i18n/<lang>.json: filters.stratum_*, canvas.consortium.phase_* and phaseGroup*),
// except where the owner decision "strata are about light first" outranks them: the app's ja and ko
// labels name tree and shrub layers (高木層, 低木層, 교목층), so the site names light positions there,
// and zh writes climax as the standard 顶极群落 (the app has 顶级群落).
const appWords = {
  en: [['Emergent', 'High', 'Mid', 'Low'], ['Placenta', 'Secondary', 'Climax']],
  fr: [['Émergent', 'Haut', 'Moyen', 'Bas'], ['Placenta', 'Secondaire', 'Climax']],
  es: [['Emergente', 'Alto', 'Medio', 'Bajo'], ['Placenta', 'Secundario', 'Clímax']],
  pt: [['Emergente', 'Alto', 'Médio', 'Baixo'], ['Placenta', 'Secundário', 'Clímax']],
  it: [['Emergente', 'Alto', 'Medio', 'Basso'], ['Placenta', 'Secondario', 'Climax']],
  zh: [['突出层', '高层', '中层', '低层'], ['胎盘期', '次生期', '顶极群落']],
  de: [['Aufragend', 'Hoch', 'Mittel', 'Niedrig'], ['Placenta', 'Sekundär', 'Klimax']],
  ja: [['突出層', '上層', '中層', '下層'], ['プラセンタ', '二次遷移', '極相']],
  ko: [['돌출층', '상층', '중층', '하층'], ['플라센타', '2차 천이', '극상']],
  nl: [['Emergent', 'Hoog', 'Midden', 'Laag'], ['Placenta', 'Secundair', 'Climax']],
  ru: [['Эмергентный', 'Высокий', 'Средний', 'Низкий'], ['Плацента', 'Вторичный', 'Климакс']],
};
test('strata labels and phase terms are the app\'s, light first, in every locale (copy-M1, copy-B2, MAJ-1, min-7)', () => {
  for (const lang of locales) {
    const [layers, [placenta, secondary, climax]] = appWords[lang], s = strings[lang];
    assert.deepEqual(['emergent', 'high', 'medium', 'low'].map((k) => s[`stratum.${k}`]), layers, lang);
    assert.deepEqual(core.phases.map((p) => s[`phase.${p}.term`]), [1, 2, 3].map((n) => `${placenta} ${n}`).concat([1, 2, 3].map((n) => `${secondary} ${n}`), [climax]), lang);
    for (const word of [placenta, secondary, climax]) assert.ok(s['ex.phase'].includes(word), `${lang}: ex.phase names ${word}`);
    // A stratum is a place in the light, never a kind of plant (tree, shrub, herb).
    for (const k of ['emergent', 'high', 'medium', 'low']) assert.doesNotMatch(s[`stratum.${k}`], /木|乔|灌|교목|관목|tree|shrub|arbre|arbust|árbol|árvore|albero|baum|strauch|boom|struik|дерев|кустар/i, `${lang}: stratum.${k}`);
  }
  assert.doesNotMatch(JSON.stringify(strings.zh), /顶级群落/, 'zh: 顶极群落, the standard spelling');
});

// min-3: a country or region name never follows a preposition that needs an article (pour le Chili,
// per il Cile, do Brasil, the United States): the name comes after a colon instead.
test('the borrowed-list sentences need no article before a place name (min-3)', () => {
  for (const lang of locales.filter((l) => !['zh', 'ja', 'ko'].includes(l))) {
    for (const key of ['borrowedText', 'borrowedInv', 'nc.optNote']) assert.match(strings[lang][key], /: \{(where|country)\}/, `${lang}: ${key}`);
    // …and the colon closes a whole phrase, never a bare preposition or verb ("для:", "for:", "учитывают:").
    for (const key of ['borrowedText', 'borrowedInv', 'nc.optNote']) assert.doesNotMatch(strings[lang][key], /(?<!\p{L})(для|for|für|pour|para|per|voor|use|учитывают|usam|usan|utilisent|usano|gebruiken|verwenden):/iu, `${lang}: ${key}`);
  }
});

// min-10: the site's dialog helper leaves alone a dialog that runs its own (data-own-dialog), and keeps
// doing its job for every other dialog.
test('initDialogs skips a dialog marked data-own-dialog, and still runs every other one (min-10)', async () => {
  const fakeDialog = (own) => {
    const on = {};
    return { on, own, open: false, closed: 0, closest: () => null, hasAttribute: (a) => own && a === 'data-own-dialog', addEventListener: (type, fn) => { (on[type] ??= []).push(fn); }, close() { this.closed++; }, getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 }) };
  };
  const site = fakeDialog(false), tool = fakeDialog(true);
  const html = { style: { overflow: 'hidden' } };
  const saved = globalThis.document;
  globalThis.document = { querySelectorAll: (sel) => (sel === 'dialog' ? [site, tool] : []), documentElement: html, activeElement: null };
  try {
    const { initDialogs, openDialog } = await import('../src/scripts/dialogs.js');
    initDialogs();
    assert.deepEqual(Object.keys(tool.on), [], 'the tool dialog gets no listener');
    assert.deepEqual(Object.keys(site.on).sort(), ['click', 'close']);
    let focused = 0;
    site.showModal = () => {}; openDialog(site, { focus: () => focused++ });
    assert.equal(html.style.overflow, 'hidden');
    site.on.close[0]();
    assert.equal(html.style.overflow, '', 'close frees the page scroll');
    assert.equal(focused, 1, 'and gives the focus back to the opener');
    site.on.click[0]({ target: site, clientX: 500, clientY: 500 });
    assert.equal(site.closed, 1, 'a backdrop click closes it');
    site.on.click[0]({ target: { closest: (s) => (s === '[data-close-dialog]' ? {} : null) } });
    assert.equal(site.closed, 2, 'a close button closes it');
  } finally { globalThis.document = saved; }
  assert.match(page, /<dialog id="ct-dialog"[^>]*data-own-dialog/);
});

test('toasts never open on a plant name with a gendered participle after it (copy-M3)', () => {
  for (const lang of ['fr', 'es', 'it', 'pt']) for (const key of ['removed', 'swapped', 'added', 'keptNow', 'unkeptNow', 'fromGuide', 'fromGuidePlant']) {
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

// ---------- consortium/fixes (seam-review.md, live-check.md) ----------
const home = Object.fromEntries(locales.map((lang) => [lang, JSON.parse(read(`src/i18n/translations/${lang}.json`))]));

test('logic: the language links carry the tool\'s query, and only it (seam M1)', () => {
  assert.equal(withQuery('/de/consortium/', '?plant=Cocos+nucifera&climate=tropical'), '/de/consortium/?plant=Cocos+nucifera&climate=tropical');
  assert.equal(withQuery('/de/consortium/?old=1', ''), '/de/consortium/');
  assert.equal(withQuery('/fr/guilde/', '?'), '/fr/guilde/');
  assert.match(app, /syncLangLinks\(\)/);
});

test('logic: a guide preset with no place takes the place saved on this device (seam m4)', () => {
  const preset = { climate: 'temperate', region: null, country: null, plants: ['Pyrus communis'] };
  assert.deepEqual(presetPlace(preset, { climate: 'tropical', region: 'europe', country: 'FR' }), { country: 'FR', region: 'europe' });
  assert.deepEqual(presetPlace(preset, { region: 'africa', country: null }), { country: null, region: 'africa' });
  assert.equal(presetPlace(preset, null), null);
  assert.equal(presetPlace(preset, { region: null, country: null }), null);
  assert.equal(presetPlace({ ...preset, region: 'europe' }, { region: 'africa' }), null, 'a link\'s own place wins');
  assert.equal(presetPlace({ ...preset, plants: [] }, { region: 'africa' }), null, 'only a guide preset');
});

test('one name per locale for southern_america, on the tool, the home note and the guide links (seam m1, live m5)', () => {
  const names = {
    en: 'Central and South America and the Caribbean', fr: 'Amérique centrale, Amérique du Sud et Caraïbes', es: 'Centroamérica, Sudamérica y el Caribe',
    pt: 'América Central, América do Sul e Caribe', it: 'America centrale, America meridionale e Caraibi', de: 'Mittel- und Südamerika, Karibik',
    nl: 'Midden- en Zuid-Amerika, Caraïben', ru: 'Центральная и Южная Америка, Карибы', zh: '中美洲、南美洲和加勒比', ja: '中米・南米・カリブ海', ko: '중앙아메리카·남아메리카·카리브해',
  };
  const mexico = { en: 'Mexico', fr: 'Mexique', es: 'México', pt: 'México', it: 'Messico', de: 'Mexiko', nl: 'Mexico', ru: 'Мексика', zh: '墨西哥', ja: 'メキシコ', ko: '멕시코' };
  for (const lang of locales) {
    const s = strings[lang];
    assert.equal(s['region.southern_america'], names[lang], lang);
    assert.ok(home[lang]['home.consortium.note'].includes(names[lang]), `${lang}: the home note names the region as the tool does`);
    // Mexico is in northern_america (the data's WGSRPD regions): both hints say so.
    assert.ok(s['region.northern_america.hint'].includes(mexico[lang]) && s['region.southern_america.hint'].includes(mexico[lang]), `${lang}: hints place Mexico`);
  }
  for (const lang of ['en', 'fr']) {
    const guides = JSON.parse(read(`src/i18n/guides/${lang}.json`));
    assert.ok(guides['consortium.cell.tropical.southern_america'].includes(names[lang]), `${lang}: guide links name the region as the tool does`);
  }
  assert.equal(manifest.country_regions.MX.join(), 'northern_america');
});

test('the tool lists climates in the site picker\'s order (seam m5)', () => {
  assert.match(app, /import \{ climates \} from '..\/..\/data\/climates.ts'/);
  assert.doesNotMatch(app, /siteClimates\.map\(/);
});

test('the home section and the tool share one intro and one beta word (seam m6)', () => {
  for (const lang of locales) {
    assert.ok(!('consortium.lede' in home[lang]) && !('home.consortium.beta' in home[lang]), lang);
    assert.ok(home[lang]['home.consortium.lede'], lang);
  }
  assert.match(page, /t\('home\.consortium\.lede', lang\)/);
  assert.match(read('src/components/ConsortiumSection.astro'), /t\('consortium\.beta', lang\)/);
});

test('static redirects for guessed French and English paths (seam m11)', () => {
  const rules = read('public/_redirects').split('\n').map((l) => l.trim().split(/\s+/)).filter((r) => r.length === 3);
  const to = (from) => rules.find((r) => r[0] === from);
  assert.deepEqual(to('/fr/consortium/'), ['/fr/consortium/', '/fr/guilde/', '301']);
  assert.deepEqual(to('/guilde/'), ['/guilde/', '/fr/guilde/', '301']);
  assert.doesNotMatch(read('public/_redirects'), /Language=/);
});

test('the header works even if the tool fails to start (seam m10)', () => {
  const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(script.indexOf('initChrome()') >= 0 && script.indexOf('initChrome()') < script.indexOf("import('../../scripts/consortium/app.js')"), 'initChrome, then the tool');
  assert.doesNotMatch(read('src/scripts/consortium/app.js'), /initChrome/);
});

test('the drawing keeps every crown inside its frame (live m1)', () => {
  const taxon = (id, s, habit) => ({ id, stratum: { value: s }, genus: 'X', family: 'Y', traits: { habit }, functions: [{ function: 'ground_cover' }] });
  for (const phone of [false, true]) for (const n of [6, 9, 12]) {
    const placed = Array.from({ length: n }, (_, i) => taxon(`t${i}-${n}`, ['emergent', 'high', 'medium', 'low'][Math.min(3, Math.floor(i / 3))], i < 6 ? 'Tree' : 'Herbaceous'));
    const p = profileSVG(placed, { phone, id: 'x', title: 't', strataLabel: (s) => s });
    const [x0, , w] = p.svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const xs = [...p.svg.matchAll(/d="M([^"]+)"/g)].flatMap((m) => [...m[1].matchAll(/[MCL ]?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((c) => Number(c[1])));
    assert.ok(Math.min(...xs) >= x0 && Math.max(...xs) <= x0 + w, `${phone ? 'phone' : 'desktop'} ${n}: ${Math.min(...xs)}..${Math.max(...xs)} in ${x0}..${x0 + w}`);
    // The HTML labels line up with the drawn columns.
    assert.ok(Math.abs(p.columns[0].center - ((p.pad * p.colW + p.colW / 2 - x0) / w) * 100) < 0.01);
  }
});

test('the action is "Keep", as the plan says, in every locale (usability)', () => {
  const pin = /\bpin|épingl|fijad|fijar|fixad|fixar|fissa|anheft|vastzet|закреп|固定|ピン|고정/i;
  // (Nitrogen fixing is fissa / 固定 / 고정 too: not the action.)
  for (const lang of locales) for (const [key, value] of Object.entries(strings[lang])) if (!/nitrogen_fixer|nfix/.test(key)) assert.doesNotMatch(value, pin, `${lang}: ${key}`);
  assert.equal(strings.en.keep, 'Keep {name}');
});

test('French names the room « Surface », apart from the free « places » (usability)', () => {
  assert.equal(strings.fr['site.room'], 'Surface');
});

test('every animation the tool\'s CSS runs has its keyframes (seam note)', () => {
  const css = read('src/styles/consortium.css');
  const frames = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  for (const m of css.matchAll(/animation(?:-name)?:\s*([^;}]+)/g)) {
    const name = m[1].split(/\s+/).find((w) => /^[a-z][\w-]*$/i.test(w) && !/^(ease|linear|infinite|none|ease-in-out|ease-in|ease-out|alternate|forwards|both)$/.test(w));
    if (name) assert.ok(frames.has(name), `@keyframes ${name}`);
  }
});

test('the guide note says the climate belongs to this consortium, not the site (seam m3)', () => {
  assert.doesNotMatch(strings.en.fromGuide, /set to/);
  assert.match(strings.en.fromGuide, /This consortium/);
});

// ---------- consortium/fixes, second round (fixes-review.md) ----------
const css = read('src/styles/consortium.css');
const appJs = read('src/scripts/consortium/app.js');

test('a guide preset never lands silently: the guide note shows on "Not covered yet", and a place from this device says so (F1)', () => {
  assert.match(appJs, /function notCoveredHTML\(\) \{[\s\S]*?guideNote\(/, 'the not-covered state renders the guide note');
  assert.match(appJs, /T\('placeFrom', \{ where/);
  assert.match(strings.en.placeFrom, /this device/);
  assert.doesNotMatch(strings.en.fromGuideWait, /is kept,/, 'before a covered place the plant is not kept yet');
});

test('a plant that misfits offers Swap and Remove, never a change to the site answers (F2)', () => {
  assert.doesNotMatch(appJs, /fitsWith|data-act="fit"|'fit',|\bfit\(v\)/);
  assert.equal([...appJs.matchAll(/T\('nm\.try'/g)].length, 1, 'nm.try belongs to the no-match state only');
  const att = appJs.match(/function attentionHTML[\s\S]*?\n\}/)[0];
  assert.match(att, /'swap'/); assert.match(att, /'remove'/);
});

test('a site or place change that rebuilds unkept plants offers Undo (F2)', () => {
  assert.match(appJs, /esc\(T\('redoneSite'\)\), 'redo'\)/);
  assert.match(appJs, /holdForRedo\(`site-/, 'site answers');
  assert.match(appJs, /function choosePlace\(country, region\) \{\n  holdForRedo\(/, 'a place');
  assert.match(appJs, /T\('redonePlace', \{ where/);
  assert.match(appJs, /v === 'redo'/);
});

test('each warning item is one list item with its own actions (F3)', () => {
  const att = appJs.match(/function attentionHTML[\s\S]*?\n\}/)[0];
  assert.match(att, /<ul class="att-list"/);
  assert.match(att, /<li class="att-item"/);
  assert.doesNotMatch(att, /join\(' · '\)/);
});

test('the desktop side panel always sticks and scrolls inside itself; the grow search and Fill come before the site questions (F4)', () => {
  assert.doesNotMatch(appJs + css, /aside-sticky|fitAside/);
  assert.match(css, /\.ct \.aside \{[^}]*position: sticky;[^}]*max-height: calc\(100dvh - 32px\);[^}]*overflow-y: auto;/);
  const aside = appJs.match(/function asideHTML[\s\S]*?\n\}/)[0];
  assert.ok(aside.indexOf("'open-add'") < aside.indexOf('ct-site-panel'), 'grow panel first');
});

test('Japanese keep labels read as a state and an action (N1)', () => {
  assert.equal(strings.ja.keptTag, '残しています');
  assert.equal(strings.ja.unkeep, '{name}を残す設定を外す');
});

test('the English and German wording reads naturally (N2)', () => {
  assert.doesNotMatch(strings.en['step1.lede'], /grow with you/);
  assert.doesNotMatch(strings.de.added, /und behalten/);
});

test('logic: Tropical in a Northern American country says why it is not covered (N3)', () => {
  assert.deepEqual(coverageHint(manifest, 'tropical', 'MX'), { region: 'southern_america', north: 'northern_america' });
  assert.deepEqual(coverageHint(manifest, 'tropical', 'US'), { region: 'southern_america', north: 'northern_america' });
  assert.equal(coverageHint(manifest, 'tropical', 'JP'), null);
  assert.equal(coverageHint(manifest, 'tropical', 'BR'), null, 'a covered country needs no hint');
  assert.equal(coverageHint(manifest, 'temperate', 'MX'), null, 'no temperate list in Central and South America');
  assert.equal(coverageHint(manifest, 'tropical', null), null);
  const names = { en: 'Northern America', fr: 'Amérique du Nord', de: 'Nordamerika' };
  for (const lang of locales) {
    assert.deepEqual(placeholders(strings[lang]['nc.why']), ['{country}', '{north}', '{region}'], lang);
    assert.ok(!/\.\s+\S/.test(strings[lang]['nc.why'].trim().replace(/[.。]$/, '')), `${lang}: one sentence`);
  }
  assert.ok(names.en);
  assert.match(appJs, /coverageHint\(manifest, S\.climate, S\.country\)/);
});

test('details opened from the Swap list swap that plant in, never only add it; from Add they add (prepush m4)', () => {
  const swap = { type: 'swap', id: 'member-1' };
  assert.equal(swapTarget(swap), 'member-1');
  assert.equal(swapTarget({ type: 'details', id: 'alt-1', back: swap }), 'member-1', 'details from Swap replace the member');
  assert.equal(swapTarget({ type: 'details', id: 'alt-1', back: { type: 'add', filter: '' } }), null, 'details from Add add');
  assert.equal(swapTarget({ type: 'details', id: 'alt-1' }), null, 'details from a plant row');
  assert.equal(swapTarget(null), null);
  // The footer of such details offers "Use this instead" (with its confirmation for a flagged plant),
  // and use / use-yes replace the member the Swap list was for.
  assert.match(app, /replacing = inMembers \? null : swapTarget\(O\)/);
  assert.match(app, /replacing\s*\?\s*\(O\.confirm === t\.id \? confirmHTML\(t\.id, 'use'\) : btn\('button button-primary button-small', 'use', t\.id, `\$\{I\.swap\}\$\{esc\(T\('useInstead'\)\)\}`/);
  assert.match(app, /use\(v\) \{ const from = swapTarget\(O\)/);
  assert.match(app, /'use-yes'\(v\) \{\s*const old = swapTarget\(O\)/);
  for (const lang of locales) assert.ok(strings[lang].useInstead, `${lang}: useInstead`);
});

// The first-paint script of ConsortiumPage.astro, run as the browser runs it, against what the app
// does on start (app.js start(): decodeState, presetPlace, the site climate): the head is compact
// before the first paint exactly when the app opens past the setup (prepush m5: no layout jump).
test('the head has its final size from the first paint: compact on a result, the step the tool opens on (prepush m5)', () => {
  const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script && /ct-head/.test(script), 'the first-paint script');
  const climates = page.match(/data-climates=\{([^}]+)\}/)?.[1], regionsAttr = page.match(/data-regions=\{([^}]+)\}/)?.[1];
  assert.equal(climates, "siteClimates.join(' ')");
  assert.equal(regionsAttr, "regions.join(' ')");
  const firstPaint = (search, saved, siteClimate) => {
    const classes = new Set();
    const items = [0, 1, 2].map(() => ({ dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }));
    items[0].attrs['aria-current'] = 'step';
    const head = { dataset: { climates: core.siteClimates.join(' '), regions: core.regions.join(' ') }, classList: { add: (c) => classes.add(c) }, querySelectorAll: (sel) => (sel === '.outline li' ? items : []) };
    const document = { getElementById: (id) => (id === 'ct-head' ? head : null), documentElement: { dataset: siteClimate ? { climate: siteClimate } : {} } };
    const localStorage = { getItem: (k) => (k === 'canopi-consortium' && saved ? JSON.stringify({ q: saved, at: '2026-10-28T00:00:00Z' }) : null) };
    new Function('location', 'localStorage', 'document', 'URLSearchParams', script)({ search: search }, localStorage, document, URLSearchParams);
    // The step decides whether the lede and the drawing show (consortium.css), so it is part of the first paint too.
    const step = head.dataset.step ?? '0';
    items.forEach((li, i) => { assert.equal(li.attrs['aria-current'], i === Number(step) ? 'step' : undefined, `outline ${i}, step ${step}`); if (step !== '0') assert.equal(li.dataset.done, String(i < Number(step))); });
    return { compact: classes.has('tool-head-compact'), step };
  };
  const opensOnResult = (search, saved, siteClimate) => {
    const params = new URLSearchParams(search);
    let decoded = null, keep = saved;
    if (params.has('c') || params.has('climate') || params.has('plant')) decoded = core.decodeState(params);
    else if (saved) { decoded = core.decodeState(saved); keep = null; }
    let climate = null, region = null;
    if (decoded) {
      const d = decoded.state;
      const place = keep ? presetPlace(d, core.decodeState(keep).state) : null;
      climate = d.climate; region = place ? place.region : d.region;
    }
    if (!climate && core.siteClimates.includes(siteClimate)) climate = siteClimate;
    // app.js render(): step 0 with no climate, 1 while the place is chosen, 2 past the setup.
    return { compact: !!(climate && region), step: !climate ? '0' : !region ? '1' : '2' };
  };
  const place = 'v=2&c=temperate&r=europe&k=FR&l=sun&s=unsure&w=unsure&m=large';
  const cases = [
    ['?plant=Pyrus+communis&climate=temperate', place, null], // the reviewer's case: a guide preset, a saved place
    ['?plant=Pyrus+communis&climate=temperate', null, null],
    ['?plant=Pyrus+communis', place, 'tropical'],
    ['?plant=Pyrus+communis', place, null],
    ['?plant=Pyrus+communis&climate=temperate&k=FR', place, null],
    ['?plant=Pyrus+communis&climate=temperate&r=africa', place, null],
    ['?plant=Pyrus+communis&climate=TEMPERATE+', place, null],
    ['?plant=Pyrus+communis&climate=nowhere', place, 'arid'],
    ['?plant=%20%20&climate=temperate', place, null],
    ['?plant=' + 'x'.repeat(201) + '&climate=temperate', place, null],
    ['?plant=Pyrus+communis&climate=temperate', 'v=2&c=temperate&k=FR', null],
    ['?' + place, null, null],
    ['?v=2&c=temperate&k=FR', null, null], // a hand-made link with a country and no region stays in setup
    ['?v=2&c=temperate', null, null],
    ['?v=2&r=europe', null, 'temperate'],
    ['?v=2&r=europe', null, null],
    ['?v=2&c=Temperate&r=EUROPE', null, null],
    ['?c=temperate&climate=arid&r=europe', null, null],
    ['', place, null],
    ['', 'v=2&c=temperate', null],
    ['', null, 'temperate'],
    ['?x=1', place, null],
  ];
  for (const [search, saved, siteClimate] of cases) {
    assert.deepEqual(firstPaint(search, saved, siteClimate), opensOnResult(search, saved, siteClimate), `${search} | saved ${saved} | site ${siteClimate}`);
  }
  assert.ok(firstPaint('?plant=Pyrus+communis&climate=temperate', place, null).compact, 'the reviewer\'s case is compact from the first paint');
  assert.equal(firstPaint('?plant=Pyrus+communis&climate=temperate', null, null).step, '1', 'a preset with no place: the climate step is done from the first paint');
});

test('strata colours only in the drawing and its legend; elsewhere the stratum word or the number in neutral ink (prepush L1)', () => {
  const css = read('src/styles/consortium.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const colour = /var\(--s-(emergent|high|medium|low)(-ink)?\)|var\(--(sw|ring|bar|bar-ink)\)/;
  const scoped = /\.profile\b|\.strata-mini\b|\.sline\b/;
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // The strata colours, and the custom properties that carry them, are read only in a scoped rule.
    if (colour.test(body) || /--(sw|ring|bar|bar-ink)\s*:\s*var\(--s-/.test(body)) assert.match(selector, scoped, `strata colour outside the drawing and its legend: ${selector.trim()}`);
  }
  // The page's own markup: no stratum swatch outside the legend, no stratum colour in the head's picture.
  const appJs = read('src/scripts/consortium/app.js');
  const swatches = [...appJs.matchAll(/\$\{sw\(/g)].length;
  assert.equal(swatches, 1, 'one swatch call, in the strata legend');
  assert.match(appJs, /<ul class="strata-mini" role="list">\$\{strata\.map\(\(s\) => `<li>\$\{sw\(s\)\}/);
  const thumb = page.match(/<figure class="thumb">[\s\S]*?<\/figure>/)[0];
  assert.doesNotMatch(thumb, /--s-/, 'the head picture is neutral ink');
  // The drawing keeps them (draw.js fills and strokes each stratum).
  assert.match(read('src/scripts/consortium/draw.js'), /fill="var\(--s-\$\{s\}\)"/);
});

test('logic: a "No match" relax button is offered only when it changes the answer (prepush L2)', () => {
  const site = (over) => ({ ...core.DEFAULT_SITE, ...over });
  for (const light of core.lights) for (const soil of core.soils) for (const water of core.waters) for (const room of core.rooms) {
    const now = { light, soil, water, room };
    for (const key of ['light', 'soil', 'water', 'room']) {
      const to = relaxTo(key, now);
      if (to === null) continue;
      assert.notEqual(to, now[key], `${key}: ${now[key]} offers itself`);
      assert.ok(siteOptions[key].includes(to), `${key}: ${to} is an answer`);
    }
  }
  assert.equal(relaxTo('light', site({ light: 'part' })), null, 'already part shade');
  assert.equal(relaxTo('light', site({ light: 'shade' })), 'part');
  assert.equal(relaxTo('light', site({ light: 'sun' })), 'part');
  assert.equal(relaxTo('soil', site({ soil: 'unsure' })), null);
  assert.equal(relaxTo('soil', site({ soil: 'acid' })), 'unsure');
  assert.equal(relaxTo('water', site({ water: 'unsure' })), null);
  assert.equal(relaxTo('room', site({ room: 'small' })), 'large');
  assert.equal(relaxTo('room', site({ room: 'large' })), 'field');
  assert.equal(relaxTo('room', site({ room: 'field' })), null);
  // The page lists only the answers relaxTo can loosen.
  assert.match(app, /if \(!relaxTo\(key, S\.site\)\) continue;/);
  assert.doesNotMatch(app, /const relaxTo = /);
});

test('logic: licences read as their proper names, with the version the data gives, linked to their deed when known (prepush L3)', () => {
  const cc = 'https://creativecommons.org/licenses/';
  const cases = [
    ['CC BY-SA 4.0', 'CC BY-SA 4.0', `${cc}by-sa/4.0/`],
    ['CC BY 3.0 us', 'CC BY 3.0 US', `${cc}by/3.0/us/`],
    ['CC BY-SA 2.5 ar', 'CC BY-SA 2.5 AR', `${cc}by-sa/2.5/ar/`],
    ['CC BY-SA 3.0 de', 'CC BY-SA 3.0 DE', `${cc}by-sa/3.0/de/`],
    ['CC BY 2.0', 'CC BY 2.0', `${cc}by/2.0/`],
    ['cc-by', 'CC BY', null], // iNaturalist gives no version: none is invented, and no deed is guessed
    ['cc-by-nc-sa', 'CC BY-NC-SA', null],
    ['CC BY', 'CC BY', null],
    ['CC0', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'], // one CC0 exists: its deed is known
    ['cc0', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
    ['CC0 1.0', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
    ['GFDL 1.2', 'GFDL 1.2', null],
    // Spellings that name no real Creative Commons licence get no deed link (I-b).
    ['CC BY SA NC 4.0', 'CC BY SA NC 4.0', null],
    ['CC BY 4.0 us', 'CC BY 4.0 us', null],
    ['CC BY 3.7', 'CC BY 3.7', null],
    ['CC BY-ND-NC 2.0', 'CC BY-ND-NC 2.0', null],
  ];
  for (const [raw, name, url] of cases) assert.deepEqual(licenceOf(raw), { name, url, publicDomain: false }, raw);
  assert.deepEqual(licenceOf('Public domain'), { name: 'Public domain', url: null, publicDomain: true });
  assert.deepEqual(licenceOf('public domain'), { name: 'Public domain', url: null, publicDomain: true });
  assert.equal(licenceOf(null), null);
  assert.equal(licenceOf('  '), null);
  // Every licence in the shipped data gets a name with no version the data did not give.
  const digits = (x) => (x.match(/\d/g) ?? []).join('');
  for (const c of manifest.cells) {
    const cellData = JSON.parse(read(`public/data/consortium/${c.file}`));
    const all = [...cellData.taxa.map((t) => t.image?.licence), ...Object.values(cellData.sources).map((x) => x.licence)].filter(Boolean);
    for (const raw of all) {
      const l = licenceOf(raw);
      assert.ok(l?.name, raw);
      assert.equal(digits(l.name), digits(raw), `${raw}: version kept, never invented`);
      if (l.url) assert.match(l.url, /^https:\/\/creativecommons\.org\//);
    }
  }
  // The page shows photo and source licences through licenceOf.
  assert.match(app, /licenceHTML\(img\.licence\)/);
  assert.match(app, /licenceHTML\(x\.licence\)/);
  for (const lang of locales) assert.ok(strings[lang].publicDomain, `${lang}: publicDomain`);
});

test('every plant list shows the scientific name, smaller and in italics (prepush L4)', () => {
  const appJs = read('src/scripts/consortium/app.js');
  // One helper writes it, only when it differs from the name shown (a plant with no common name is named by it).
  assert.match(appJs, /const sciHTML = \(t, cls = 'sci'\) => \(nameText\(t\) === t\.canonical_name \? '' : `<i class="\$\{cls\}">\$\{esc\(t\.canonical_name\)\}<\/i>`\);/);
  // Over time rows, the Jobs "who" list, the drawing's key (phone and print), the print phase lists.
  assert.match(appJs, /<small>\$\{sciHTML\(t\)\}/, 'Over time');
  assert.match(appJs, /<span>\$\{name\(d\.t\)\} <small>\$\{sciHTML\(d\.t\)\}/, 'Jobs');
  assert.equal([...appJs.matchAll(/<span class="pkey-name"><span class="pkey-n">\$\{name\(t\)\}<\/span>\$\{sciHTML\(t, 'sci pkey-sci'\)\}<\/span>/g)].length, 2, 'drawing key, screen and print');
  assert.match(appJs, /<li>\$\{name\(t\)\}\$\{sciHTML\(t, 'muted'\) && ' ' \+ sciHTML\(t, 'muted'\)\}<\/li>/, 'print phases');
  // Rows, Swap, Add, details and the print table already had it.
  assert.match(appJs, /<span class="pn">\$\{name\(t\)\}<\/span> <span class="sci">\$\{esc\(t\.canonical_name\)\}<\/span>/);
  assert.match(appJs, /<span class="alt-name">[^\n]*<span class="sci">\$\{esc\(t\.canonical_name\)\}<\/span>/);
});

// Owner, 2026-10-28: allelopathy "not checked yet" is told in a plant's details only.
test('logic: cards and rows list the facts not checked yet, never allelopathy (owner 2026-10-28)', () => {
  const t = (w, functions = null) => ({ warnings: { toxicity: null, invasive_in: null, allelopathic: null, weed_potential: null, ...w }, functions });
  assert.deepEqual(uncheckedOnCard(t({}), false), ['tox', 'inv', 'spreads', 'jobs']);
  assert.deepEqual(uncheckedOnCard(t({}), true), ['tox', 'inv', 'spreads', 'jobsOther']);
  assert.deepEqual(uncheckedOnCard(t({ toxicity: { level: 'None' }, invasive_in: [], weed_potential: false }, []), false), []);
  for (const al of [null, undefined, false, true]) assert.ok(!uncheckedOnCard(t({ allelopathic: al }), false).includes('allelo'));
});

test('no card, row, Swap, Add, summary or print template says allelopathy is not checked yet; details still do (owner 2026-10-28)', () => {
  const appJs = read('src/scripts/consortium/app.js');
  for (const lang of locales) assert.ok(!('u.allelo' in strings[lang]), `${lang}: u.allelo is gone`);
  assert.doesNotMatch(appJs, /'u\.allelo'/);
  const uses = [...appJs.matchAll(/'unkAllelo'|'d\.alleloUnk'/g)].map((m) => m.index);
  const details = appJs.match(/function detailsParts[\s\S]*?\n\}/);
  assert.ok(uses.length >= 1, 'details tell an unknown allelopathy');
  for (const i of uses) assert.ok(i > details.index && i < details.index + details[0].length, 'only inside detailsParts');
  assert.match(details[0], /al == null\) items\.push\(item\('unknown'/, 'unknown is never shown as none');
  assert.match(appJs, /allelopathic === true\) soft\.push/, 'a known allelopathic plant keeps its warning on the card');
});

// Owner, 2026-10-28: one warning heading, "With a warning", never "Cautions" or another variant.
test('one warning heading everywhere: consortium.withWarning, in every locale (owner 2026-10-28)', () => {
  const heading = { en: 'With a warning', fr: 'Avec une alerte', es: 'Con aviso', pt: 'Com aviso', it: 'Con un avviso', zh: '有警告', de: 'Mit Warnung', ja: '警告あり', ko: '경고 있음', nl: 'Met een waarschuwing', ru: 'С предупреждением' };
  for (const lang of locales) {
    assert.equal(strings[lang].withWarning, heading[lang], lang);
    for (const gone of ['cautions', 'flaggedGroup', 'attention', 'needsLook', 'p.warn']) assert.ok(!(gone in strings[lang]), `${lang}: ${gone} is gone`);
    for (const [key, value] of Object.entries(strings[lang])) assert.doesNotMatch(value, /^(cautions?|précautions?|vorsicht|precauciones|cuidados|attenzione|let op|осторожно|注意|주의)\s*[:：]/i, `${lang}: ${key}` + ' labels a warning another way');
  }
  const appJs = read('src/scripts/consortium/app.js');
  const labels = [...appJs.matchAll(/<h3 class="list-label">([^<]*?)\$\{esc\(T\('(\w+)'\)\)\}/g)].map((m) => m[2]);
  assert.deepEqual(labels, ['withWarning', 'withWarning'], 'Swap and Add head their flagged plants alike');
  assert.match(appJs.match(/function attentionHTML[\s\S]*?\n\}/)[0], /<strong>\$\{esc\(T\('withWarning'\)\)\}<\/strong>/, 'the warnings summary');
  assert.match(appJs.match(/function printHTML[\s\S]*?\n\}/)[0], /<th>\$\{esc\(T\('withWarning'\)\)\}<\/th>/, 'print');
  assert.equal([...appJs.matchAll(/<span class="vh">\$\{esc\(T\('withWarning'\)\)\}<\/span>/g)].length, 3, 'the marks on the drawing, its key and the Over time rows');
});

test('words: a merged soft chip starts with a capital where the script has one', () => {
  assert.equal(capFirst('can spread · invasive in 2 countries', 'en'), 'Can spread · invasive in 2 countries');
  assert.equal(capFirst('ívó', 'fr'), 'Ívó');
  assert.equal(capFirst('隣の植物', 'ja'), '隣の植物');
  assert.equal(capFirst('', 'en'), '');
});

// Print has no details view, so its warnings cell never claims "all checked" while allelopathy is unknown (tweaks review).
test('print says "none found so far", not "all checked", while allelopathy is unknown', () => {
  const app = read('src/scripts/consortium/app.js');
  assert.match(app, /T\(t\.warnings\.allelopathic == null \? 'printNoneYet' : 'printNone'\)/);
  for (const lang of locales) assert.ok(strings[lang].printNoneYet, `${lang}: printNoneYet`);
});
