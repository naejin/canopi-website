// Field Guides: the content in src/content/guides/<slug>/<lang>.mdx, the shared crop table and
// glossary it cites, and the guide components and styles (knowledge/decisions/field-guides-architecture.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const src = new URL('../src/', import.meta.url).pathname;
const read = (path) => readFileSync(join(src, path), 'utf8');
const guideRoot = join(src, 'content/guides');
const guideLangs = ['en', 'fr'];
const domains = ['seeds', 'crops', 'soil', 'perennials', 'seasons', 'pests', 'kitchen'];
// The guides of the plan (knowledge/project/field-guides-plan.md). An in-text "next guides" link
// may name one before it is written; the page shows it once it exists.
const planned = [
  'landrace-gardening', 'hybrids-heirlooms-landraces', 'will-they-cross', 'hand-crosses', 'choosing-seed-parents',
  'keeping-a-landrace', 'saving-seed', 'storing-seed', 'squash-melons-cucumbers', 'corn', 'beans-and-legumes',
  'tomatoes', 'small-grains', 'true-seed-potato-garlic-sunroot', 'season-shifting', 'food-all-year', 'pests-without-sprays',
  'trees-with-edible-leaves', 'nixtamalization', 'cooking-dry-beans',
  'living-soil', 'reading-your-soil', 'fungal-or-bacterial', 'compost-for-soil-life', 'mulch', 'compost-tea',
  'mycorrhizal-fungi', 'no-dig-beds', 'soil-care-year',
  'carbon-farming', 'perennial-staples', 'nut-staples', 'perennial-beans-and-pods', 'starch-from-trees', 'food-forest',
  'trees-in-the-field', 'windbreaks-and-living-fences', 'trees-for-livestock', 'water-and-slopes', 'coppice-and-bamboo',
  'fibre-dye-and-soap',
];
// Safety rule: no caution or safety box gives a time, a temperature or a method word, and no prose
// pairs boiling, soaking, fermenting or cooking with an amount of time. This is a heuristic: it catches
// the usual ways of writing these in English and French, not every one, so reviewers still read them.
const amount = String.raw`(?:\d+(?:[.,]\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-eight|sixty|half(?:\s+an?)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|soixante|demi(?:e)?)`;
const timeUnit = String.raw`(?:seconds?|secondes?|secs?|minutes?|mins?|hours?|heures?|hrs?|h|days?|jours?|j|nights?|nuits?|weeks?|semaines?|months?|mois)`;
const timeAmount = new RegExp(String.raw`\b${amount}[\s  -]*${timeUnit}\b`, 'i');
const temperature = /\d\s*[°º]|\bdegrees?\b|\bdegr[ée]s?\b|\b\d+\s*(?:K|C|F)\b/i;
// (?<!\p{L}) is a word start that counts accented letters as letters (\b would match inside "détrempé").
const methodWord = /\bovernight\b|\b(?:toute la|pendant la|une) nuit\b|\bboil\w*|\bbouill\w*|\bsoak\w*|(?<!\p{L})tremp\p{L}*/iu;
const cautionBreach = (text) => timeAmount.test(text) || temperature.test(text) || methodWord.test(text);
const proseBreach = new RegExp(String.raw`\b(?:boil|soak|ferment|cook|bouill|tremp|ferment|cuis|cuit|cuire)\w*\b[^.]{0,80}?\b${amount}[\s  -]*${timeUnit}\b`, 'i');

const slugs = existsSync(guideRoot) ? readdirSync(guideRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];

function parse(slug, lang) {
  const text = readFileSync(join(guideRoot, slug, `${lang}.mdx`), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(match, `${slug}/${lang}.mdx: frontmatter between --- lines`);
  return { data: yaml.load(match[1], { schema: yaml.JSON_SCHEMA }), body: match[2], file: `${slug}/${lang}.mdx` };
}
const guides = slugs.flatMap((slug) => guideLangs.filter((lang) => existsSync(join(guideRoot, slug, `${lang}.mdx`))).map((lang) => ({ slug, lang, ...parse(slug, lang) })));
// Attribute values of a component in a guide body: <Term id="landrace"> → ['landrace'].
const attrs = (body, name, attr) => [...body.matchAll(new RegExp(`<${name}\\b[^>]*?\\b${attr}=(?:"([^"]*)"|\\{([^}]*)\\})`, 'g'))].map((m) => m[1] ?? m[2]);
const listAttr = (body, name, attr) => attrs(body, name, attr).flatMap((value) => [...value.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]).concat(/^[\w-]+$/.test(value) ? [value] : []));
const bookIds = [...read('data/bibliography.md').matchAll(/^- id:\s*(\S+)\s*$/gm)].map((m) => m[1]);
const climateZones = [...read('data/climates.ts').match(/export const climates = \[(.*)\] as const;/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

test('there is at least one guide, and every guide has an English and a French file and nothing else', () => {
  assert.ok(slugs.includes('landrace-gardening'), 'the hub guide exists');
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${slug}: kebab-case folder`);
    const files = readdirSync(join(guideRoot, slug)).sort();
    assert.deepEqual(files, ['en.mdx', 'fr.mdx'], `${slug}: en.mdx and fr.mdx only`);
  }
});

test('every guide has a complete frontmatter, matched between English and French', () => {
  for (const { data, file, slug, lang } of guides) {
    for (const key of ['title', 'description', 'domain', 'order', 'glance', 'sources', 'related', 'updated']) assert.ok(key in data, `${file}: ${key}`);
    assert.ok(typeof data.title === 'string' && data.title.trim(), `${file}: title`);
    assert.ok(typeof data.description === 'string' && data.description.length <= 200, `${file}: description of at most 200 characters`);
    assert.equal(data.description.split(/(?<=[.!?])\s+(?=\p{Lu})/u).length, 1, `${file}: description is one sentence`);
    assert.ok(domains.includes(data.domain), `${file}: domain is one of ${domains.join(', ')}`);
    assert.ok(Number.isInteger(data.order), `${file}: order is an integer`);
    assert.ok(Array.isArray(data.glance) && data.glance.length >= 3 && data.glance.length <= 6, `${file}: 3 to 6 glance pairs`);
    for (const pair of data.glance) assert.ok(pair.label && pair.value, `${file}: glance pairs have a label and a value`);
    assert.ok(Array.isArray(data.sources) && data.sources.length, `${file}: at least one source`);
    for (const source of data.sources) {
      assert.ok(bookIds.includes(source.book), `${file}: "${source.book}" is a book id in src/data/bibliography.md`);
      assert.ok(Array.isArray(source.chapters) && source.chapters.every((c) => typeof c === 'string' && c.trim() && !/part\d/.test(c)), `${file}: chapters are titles`);
    }
    assert.ok(Array.isArray(data.related), `${file}: related is a list`);
    for (const related of data.related) {
      assert.ok(slugs.includes(related), `${file}: related guide "${related}" exists`);
      assert.notEqual(related, slug, `${file}: a guide is not related to itself`);
    }
    assert.match(String(data.updated), /^\d{4}-\d{2}-\d{2}$/, `${file}: updated is a date`);
    if ('quick' in data) assert.equal(typeof data.quick, 'boolean', `${file}: quick is true or false`);
    if ('climates' in data) assert.ok(Array.isArray(data.climates) && data.climates.length && data.climates.every((zone) => climateZones.includes(zone)), `${file}: climates lists zones from ${climateZones.join(', ')}`);
    assert.ok(lang === 'en' || lang === 'fr');
  }
  for (const slug of slugs) {
    const [en, fr] = guideLangs.map((lang) => guides.find((g) => g.slug === slug && g.lang === lang).data);
    for (const key of ['domain', 'order', 'related', 'quick', 'climates']) assert.deepEqual(fr[key], en[key], `${slug}: ${key} matches between en and fr`);
    assert.equal(fr.glance.length, en.glance.length, `${slug}: as many glance pairs in en and fr`);
    assert.deepEqual(fr.sources.map((s) => [s.book, s.chapters.length]), en.sources.map((s) => [s.book, s.chapters.length]), `${slug}: same books and chapter counts`);
    assert.equal(fr.updated, en.updated, `${slug}: updated together`);
  }
});

test('guides use only known components, and their ids resolve to the glossary, the crop table and the plan', async () => {
  const { glossary } = await import('../src/data/glossary.ts');
  const { crops } = await import('../src/data/crops.ts');
  const { foodRisks } = await import('../src/data/food-risks.ts');
  const known = [...read('components/guides/index.ts').matchAll(/^\s{2}([A-Z]\w+),?$/gm)].map((m) => m[1]);
  const diagrams = existsSync(join(src, 'components/guides/diagrams'))
    ? readdirSync(join(src, 'components/guides/diagrams'), { recursive: true }).filter((f) => /\/[A-Z]\w+\.astro$/.test(f)).map((f) => f.match(/([A-Z]\w+)\.astro$/)[1])
    : [];
  assert.ok(known.includes('Term') && known.includes('FoodCaution'), 'components/guides/index.ts lists the guide components');
  // One id per concept: a guide uses the glossary key or the crop id itself, never a variant.
  const glossaryIds = Object.keys(glossary);
  const cropIds = crops.map((c) => c.id);
  for (const { body, file, data } of guides) {
    const used = new Set([...body.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]));
    for (const name of used) assert.ok(known.includes(name) || diagrams.includes(name), `${file}: <${name}> is not a guide component`);
    assert.ok(!/^import\s/m.test(body), `${file}: no imports (components are provided by the layout)`);
    for (const id of attrs(body, 'Term', 'id')) assert.ok(glossaryIds.includes(id), `${file}: term "${id}" is in src/data/glossary.ts`);
    for (const id of attrs(body, 'CropCard', 'crop')) assert.ok(cropIds.includes(id), `${file}: crop "${id}" is in src/data/crops.ts`);
    for (const name of ['CropCards', 'CropTable']) for (const id of listAttr(body, name, 'crops')) assert.ok(cropIds.includes(id), `${file}: crop "${id}" is in src/data/crops.ts`);
    for (const risk of listAttr(body, 'FoodCaution', 'risk')) assert.ok(foodRisks.includes(risk), `${file}: FoodCaution risk "${risk}"`);
    for (const slug of listAttr(body, 'NextGuides', 'slugs')) assert.ok(planned.includes(slug), `${file}: next guide "${slug}" is in the plan`);
    // Ticks are stored per list ({ <checklist id>: [item ids] }), so list ids are unique in a guide
    // and item ids unique in their list; every Item sits in a Checklist.
    const lists = [...body.matchAll(/<Checklist\b[^>]*?\bid="([^"]+)"[^>]*>([\s\S]*?)<\/Checklist>/g)];
    const listIds = lists.map((m) => m[1]);
    assert.equal(new Set(listIds).size, listIds.length, `${file}: checklist ids are unique in the guide`);
    assert.equal(lists.reduce((n, m) => n + attrs(m[2], 'Item', 'id').length, 0), attrs(body, 'Item', 'id').length, `${file}: every <Item> is inside a <Checklist>`);
    for (const [, list, inner] of lists) {
      const items = attrs(inner, 'Item', 'id');
      assert.equal(new Set(items).size, items.length, `${file}: item ids are unique in checklist "${list}"`);
    }
    if (data.quick) assert.ok(used.has('QuickAnswer'), `${file}: quick: true needs a <QuickAnswer>`);
    // Climate blocks: known zones, a cited book, and a frontmatter that lists exactly the zones they cover.
    const blockZones = listAttr(body, 'ForClimate', 'zones');
    for (const zone of blockZones) assert.ok(climateZones.includes(zone), `${file}: <ForClimate zones> "${zone}" is a climate`);
    const blockSources = attrs(body, 'ForClimate', 'source');
    assert.equal(blockSources.length, (body.match(/<ForClimate\b/g) ?? []).length, `${file}: every <ForClimate> names its source book`);
    for (const book of blockSources) {
      assert.ok(bookIds.includes(book), `${file}: <ForClimate source> "${book}" is a book id in src/data/bibliography.md`);
      assert.ok(data.sources.some((s) => s.book === book), `${file}: <ForClimate source> "${book}" is among the guide's sources`);
    }
    assert.deepEqual([...new Set(blockZones)].sort(), [...(data.climates ?? [])].sort(), `${file}: frontmatter climates lists exactly the zones of its <ForClimate> blocks`);
  }
  for (const slug of slugs) {
    const [en, fr] = guideLangs.map((lang) => guides.find((g) => g.slug === slug && g.lang === lang).body);
    for (const [name, attr] of [['Term', 'id'], ['Checklist', 'id'], ['Item', 'id'], ['FoodCaution', 'risk'], ['CropCards', 'crops'], ['CropTable', 'crops'], ['ForClimate', 'zones'], ['ForClimate', 'source']]) {
      assert.deepEqual(new Set(listAttr(fr, name, attr)), new Set(listAttr(en, name, attr)), `${slug}: <${name} ${attr}> the same in en and fr`);
    }
    // Opening and closing tags both count, so a French page that drops a </Safety> or </Points> fails.
    const components = (body) => [...body.matchAll(/<(\/?)([A-Z]\w*)/g)].filter((m) => m[2] !== 'Term').map((m) => m[1] + m[2]).join(' ');
    assert.equal(components(fr), components(en), `${slug}: the same components, opened and closed in the same order, in en and fr`);
  }
});

test('the safety heuristic catches times, temperatures and method words written out', () => {
  for (const text of ['ten minutes', 'for 12 hours', 'overnight', 'deux heures', 'toute la nuit', 'at 100 °C', 'boil them', 'soak the beans', 'faites tremper', 'a day', 'trois jours', 'twenty-minute']) {
    assert.ok(cautionBreach(text), `caution heuristic misses "${text}"`);
  }
  assert.ok(!cautionBreach('un sol détrempé'), 'caution heuristic flags "détrempé"');
  for (const text of ['Ferment them for three days.', 'Soak the seed for twelve hours before sowing.', 'Faites cuire vingt minutes.', 'boil for 10 min']) {
    assert.ok(proseBreach.test(text), `prose heuristic misses "${text}"`);
  }
  for (const text of ['Ferment in a jar with a little water for a few days, until the gel breaks down.', 'Sow them in one bed. A label with the crop and the year is enough.', 'Cook what you grow.']) {
    assert.ok(!proseBreach.test(text), `prose heuristic flags "${text}"`);
  }
});

test('no caution or safety text gives a time, a temperature or a method, and no prose times a cooking step', async () => {
  const { foodRisks: risks } = await import('../src/data/food-risks.ts');
  for (const risk of ['needs-processing', 'akee', 'cashew']) assert.ok(risks.includes(risk), `food-risks.ts lists "${risk}" (carbon farming guides)`);
  for (const lang of guideLangs) {
    const strings = JSON.parse(read(`i18n/guides/${lang}.json`));
    for (const risk of risks) {
      const text = strings[`food.${risk}`];
      assert.ok(text?.trim(), `${lang}: food.${risk}`);
      assert.ok(!cautionBreach(text), `${lang}: food.${risk} gives a time, temperature or method`);
      assert.ok(!/https?:|<a\b/.test(text), `${lang}: food.${risk} carries no link`);
      // The pointer to the food-safety authority is said once per box, by food.authority, not per risk.
      assert.ok(!/authorit|autorit/i.test(text), `${lang}: food.${risk} names the authority; leave that to food.authority`);
    }
    const authority = strings['food.authority'];
    assert.ok(authority?.trim() && /authorit|autorit/i.test(authority), `${lang}: food.authority points to the food-safety authority`);
    assert.ok(!cautionBreach(authority) && !/https?:|<a\b/.test(authority), `${lang}: food.authority gives no method and no link`);
  }
  for (const { body, file } of guides) {
    for (const [, , inner] of body.matchAll(/<(Safety|FoodCaution)\b[^>]*(?<!\/)>([\s\S]*?)<\/\1>/g)) {
      assert.ok(!cautionBreach(inner), `${file}: a Safety box gives a time, temperature or method: ${inner.trim().slice(0, 80)}`);
    }
    for (const title of attrs(body, 'Safety', 'title')) assert.ok(!cautionBreach(title), `${file}: Safety title`);
    const prose = body.match(proseBreach);
    assert.ok(!prose, `${file}: prose gives a time for boiling, soaking, fermenting or cooking: "${prose?.[0]}"`);
  }
  // FoodCaution takes its risk list from the same module as this test.
  const caution = read('components/guides/FoodCaution.astro');
  assert.match(caution, /import \{ foodRisks[^}]*\} from '\.\.\/\.\.\/data\/food-risks'/, 'FoodCaution imports src/data/food-risks.ts');
  assert.ok(!caution.includes("'bitter-cucurbits'"), 'FoodCaution keeps no copy of the risk list');
  // Every box ends with the authority pointer, once, after the risk texts (not inside their loop).
  assert.equal(caution.match(/gt\('food\.authority'/g)?.length ?? 0, 1, 'FoodCaution renders food.authority once');
  assert.ok(caution.indexOf("gt('food.authority'") > caution.indexOf('risks.map('), 'FoodCaution renders food.authority after the risk texts');
  assert.ok(!/risks\.map\([^\n]*food\.authority/.test(caution), 'FoodCaution renders food.authority outside the risk loop');
});

test('the guide chrome strings exist in English and French alike', () => {
  const en = JSON.parse(read('i18n/guides/en.json'));
  const fr = JSON.parse(read('i18n/guides/fr.json'));
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();
  for (const key of Object.keys(en)) {
    assert.ok(en[key].trim() && fr[key].trim(), key);
    assert.deepEqual(placeholders(fr[key]), placeholders(en[key]), `fr: ${key}`);
  }
});

test('the glossary defines every term in English and French', async () => {
  const glossaryModule = await import('../src/data/glossary.ts');
  const { glossary } = glossaryModule;
  const ids = Object.keys(glossary);
  assert.ok(ids.length >= 57, `${ids.length} terms`);
  for (const id of ids) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, id);
    for (const lang of guideLangs) {
      const entry = glossary[id][lang];
      assert.ok(entry?.term?.trim() && entry?.definition?.trim(), `${id}: ${lang}`);
      assert.match(entry.definition.trim(), /[.!?]$/, `${id}: ${lang} definition is a sentence`);
    }
  }
  // One id per concept: variants such as "cms" or "vernalization" are not accepted ids.
  assert.ok(!('glossaryAliases' in glossaryModule), 'the glossary has no alias ids');
  assert.throws(() => glossaryModule.glossaryEntry('no-such-term', 'en'), /no such term/);
});

test('the crop table has the 40 crops of the guide map plus mustard and flax, each named in English and French', async () => {
  const cropModule = await import('../src/data/crops.ts');
  const { crops, easeTiers } = cropModule;
  assert.equal(crops.length, 42);
  const ids = crops.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  for (const crop of crops) {
    assert.match(crop.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, crop.id);
    for (const lang of guideLangs) assert.ok(crop.name[lang]?.trim(), `${crop.id}: name.${lang}`);
    assert.ok(crop.ease === null || easeTiers.includes(crop.ease), `${crop.id}: ease`);
    assert.ok(crop.seed === null || ['dry', 'wet-rinse', 'wet-ferment'].includes(crop.seed), `${crop.id}: seed`);
    assert.ok(crop.cms === null || ['low', 'flagged', 'high'].includes(crop.cms), `${crop.id}: cms`);
    for (const field of ['tip', 'note']) if (crop[field]) for (const lang of guideLangs) assert.ok(crop[field][lang]?.trim(), `${crop.id}: ${field}.${lang}`);
  }
  assert.ok(!('cropAliases' in cropModule), 'the crop table has no alias ids');
  assert.throws(() => cropModule.crop('zucchini'), /not in src\/data\/crops\.ts/, 'a variant name is not a crop id');
});

test('FlowerDiagram draws every variant the guides need, each with alt text in English and French', () => {
  const code = read('components/guides/diagrams/FlowerDiagram.astro');
  const variants = JSON.parse(code.match(/const variants = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  for (const needed of ['tomato-closed', 'tomato-open', 'squash-male', 'squash-female', 'corn', 'carrot-fertile', 'carrot-sterile', 'spinach-male', 'spinach-female']) {
    assert.ok(variants.includes(needed), `FlowerDiagram variant "${needed}"`);
  }
  for (const lang of guideLangs) {
    const strings = JSON.parse(read(`i18n/guides/${lang}.json`));
    for (const v of variants) assert.ok(strings[`flower.alt.${v}`]?.trim(), `${lang}: flower.alt.${v}`);
    for (const [, key] of code.matchAll(/label\('([\w.]+)'\)/g)) assert.ok(strings[`flower.${key}`]?.trim(), `${lang}: flower.${key}`);
  }
});

test('the planting mix bar rejects parts that would draw nothing or NaN', async () => {
  const { mixShares } = await import('../src/components/guides/planting-mix.ts');
  assert.deepEqual(mixShares([{ label: 'own', value: 70, tone: 'own' }, { label: 'old', value: 25, tone: 'old' }, { label: 'new', value: 5, tone: 'new' }]), [70, 25, 5]);
  assert.deepEqual(mixShares([{ label: 'a', value: 1, tone: 'own' }, { label: 'b', value: 2, tone: 'old' }]), [33, 67]);
  for (const parts of [[], [{ label: 'a', value: 0, tone: 'own' }], [{ label: 'a', value: Number.NaN, tone: 'own' }], [{ label: 'a', value: -5, tone: 'own' }, { label: 'b', value: 10, tone: 'old' }], [{ label: 'a', value: 5, tone: 'mine' }]]) {
    assert.throws(() => mixShares(parts), /PlantingMixBar/, JSON.stringify(parts));
  }
});

test('the checklist plugin tells each item its list, so two lists can reuse an item id', async () => {
  const { rehypeGuideChecklists } = await import('../src/lib/rehype-guide-checklists.mjs');
  const el = (name, attributes, children = []) => ({ type: 'mdxJsxFlowElement', name, attributes: Object.entries(attributes).map(([k, v]) => ({ type: 'mdxJsxAttribute', name: k, value: v })), children });
  const list = (id, ...items) => el('Checklist', { id }, items.map((item) => el('Item', { id: item })));
  const file = { path: '/x/src/content/guides/demo/en.mdx' };
  const tree = { type: 'root', children: [list('spring', 'save', 'sow'), list('autumn', 'save')] };
  rehypeGuideChecklists()(tree, file);
  const listOf = (item) => item.attributes.find((a) => a.name === 'list')?.value;
  assert.deepEqual(tree.children.map((c) => c.children.map(listOf)), [['spring', 'spring'], ['autumn']]);
  assert.throws(() => rehypeGuideChecklists()({ type: 'root', children: [list('a', 'x'), list('a', 'y')] }, file), /checklist id "a" is used twice/);
  assert.throws(() => rehypeGuideChecklists()({ type: 'root', children: [list('a', 'x', 'x')] }, file), /item id "x" is used twice/);
  assert.throws(() => rehypeGuideChecklists()({ type: 'root', children: [el('Item', { id: 'x' })] }, file), /outside a <Checklist>/);
});

test('the glossary plugin gives each term id one note, beside the block of its first use', async () => {
  const { rehypeGuideTerms } = await import('../src/lib/rehype-guide-terms.mjs');
  const term = (id) => ({ type: 'mdxJsxTextElement', name: 'Term', attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }], children: [{ type: 'text', value: id }] });
  const para = (...ids) => ({ type: 'element', tagName: 'p', children: ids.map(term) });
  const tree = { type: 'root', children: [para('landrace', 'heirloom'), para('landrace'), para('heirloom', 'grex')] };
  rehypeGuideTerms()(tree, { path: '/x/src/content/guides/demo/en.mdx' });
  const notes = tree.children.filter((n) => n.name === 'TermNote').map((n) => n.attributes[0].value);
  assert.deepEqual(notes, ['landrace', 'heirloom', 'grex'], 'one note per id, in order of first use');
  assert.deepEqual(tree.children.map((n) => n.name ?? n.tagName), ['TermNote', 'TermNote', 'p', 'p', 'TermNote', 'p']);
  const firsts = tree.children.filter((n) => n.tagName === 'p').flatMap((p) => p.children.map((t) => t.attributes.some((a) => a.name === 'first')));
  assert.deepEqual(firsts, [true, true, false, false, true]);
});

test('the bibliography gives each book an optional, unique id', () => {
  assert.ok(bookIds.includes('landrace-gardening'));
  assert.ok(bookIds.includes('carbon-farming-solution'), 'The Carbon Farming Solution has an id for the carbon farming guides');
  assert.equal(new Set(bookIds).size, bookIds.length, 'book ids are unique');
  for (const id of bookIds) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, id);
});

test('guide files load no outside images or fonts, and colour only through the tokens', () => {
  const files = [
    ...guides.map(({ slug, lang }) => `content/guides/${slug}/${lang}.mdx`),
    'styles/guides.css',
    ...readdirSync(join(src, 'components/guides'), { recursive: true }).filter((f) => /\.(astro|ts|js|css)$/.test(f)).map((f) => `components/guides/${f}`),
  ];
  for (const file of files) {
    const text = read(file);
    assert.ok(!/fonts\.(googleapis|gstatic)\.com|use\.typekit|fonts\.bunny/.test(text), `${file}: outside font`);
    assert.ok(!/(?:src|href)=["']https?:\/\/[^"']+\.(?:png|jpe?g|gif|webp|avif|svg)/i.test(text), `${file}: outside image`);
    assert.ok(!/url\(\s*["']?https?:/.test(text), `${file}: outside url()`);
    assert.ok(!/@import\s+["']?https?:/.test(text), `${file}: outside @import`);
    // Colours are tokens (var(--…)): no hex, rgb(), hsl(), or named colours outside tokens.css.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!/#[0-9a-f]{3,8}\b(?![-\w])(?=[;\s,)"'])/i.test(code.replace(/href="#[^"]*"|url\(#[^)]*\)|href=\{`#[^`]*`\}/g, '')), `${file}: hex colour`);
    assert.ok(!/\b(?:rgba?|hsla?|oklch|lab|lch)\(/i.test(code), `${file}: colour function`);
    assert.ok(!/(?:color|fill|stroke|background(?:-color)?|border(?:-color)?)\s*[:=]\s*["']?(?:red|green|blue|black|white|gr[ae]y|orange|yellow|purple|brown)\b/i.test(code), `${file}: named colour`);
  }
  // Plant and soil colours exist in every theme block of tokens.css.
  const tokens = read('styles/tokens.css');
  for (const token of ['--leaf', '--leaf-young', '--leaf-deep', '--leaf-gold', '--leaf-ochre', '--leaf-brown', '--petal', '--anther', '--seed-1', '--seed-6', '--soil-1', '--soil-2', '--soil-3', '--soil-grain', '--soil-hypha', '--soil-worm', '--soil-worm-band']) {
    assert.equal(tokens.split(`${token}:`).length - 1, 3, `${token} in the light, dark and system-dark blocks`);
  }
});

test('table-like diagrams never hide a cell with display: none, so screen readers count the same cells per row', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/guide-timeline-(?:label|season|cell)/.test(selector)) assert.ok(!/display\s*:\s*none/.test(body), `guides.css: ${selector.trim()} hides a table cell`);
  }
});

test('guide styles use the site breakpoints only: 639px for phones, 960px for desktop', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const allowed = ['(max-width: 639px)', '(min-width: 960px)', '(width < 960px)'];
  for (const [, query] of css.matchAll(/@media\s+([^{]*?)\s*\{/g)) {
    for (const width of query.match(/\((?:(?:min|max)-width\s*:\s*\d+px|width\s*[<>]=?\s*\d+px)\)/g) ?? []) {
      assert.ok(allowed.includes(width), `guides.css: @media ${query} (use ${allowed.join(' or ')})`);
    }
  }
});

test('guide styles are scoped: guides.css classes start with guide-, and only the guide layouts import it', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, cls] of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) assert.ok(cls.startsWith('guide-') || cls === 'is-done', `guides.css: .${cls}`);
  const importers = [];
  for (const file of readdirSync(src, { recursive: true }).filter((f) => /\.(astro|ts|css)$/.test(f))) {
    if (read(file).includes('guides.css')) importers.push(file);
  }
  assert.deepEqual(importers.sort(), ['components/guides/GuideLayout.astro', 'components/guides/GuidesIndex.astro']);
});

test('glossary terms do not rely on Chromium-only CSS, and their notes print in the flow', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\binteractivity\s*:/.test(css), 'guides.css: interactivity is Chromium-only; hide the term button with display: none instead');
  const desktop = css.slice(css.indexOf('@media (min-width: 960px)'));
  assert.match(desktop, /\.guide-term-control\s*\{[^}]*display\s*:\s*none/, 'the term button is display: none at >=960px');
  assert.match(css, /@media print[\s\S]*?\.guide-note-term\[popover\]:not\(:popover-open\)\s*\{[^}]*display\s*:\s*block/, 'glossary notes show when printed');
  // An open note left open across a rotation to >=960px stays a card, not a misplaced margin note.
  assert.match(css, /\.guide-note\.guide-note-term:popover-open\s*\{[^}]*position\s*:\s*fixed/, 'an open glossary note is a fixed card at any width');
});

test('checklist items never suggest tasting a crop', () => {
  // French "goût" and "cuit" are bounded at a word start, and "goût" is not "goutte", so a drip line
  // (goutte-à-goutte) or a circuit stays allowed.
  const tasting = /\b(?:tast|flavou?r|cook)|(?<!\p{L})go[uû]t(?!t)|(?<!\p{L})cuit/iu;
  for (const text of ['Taste the fruit', 'Note the flavour', 'Goûtez les fruits', 'Le goût des fruits', 'Gardez les plus cuites', 'bien cuit']) assert.ok(tasting.test(text), `checklist check misses "${text}"`);
  for (const text of ['Posez un goutte-à-goutte', 'Un circuit d’eau', 'Gouttière nettoyée', 'Un biscuit']) assert.ok(!tasting.test(text), `checklist check flags "${text}"`);
  for (const { slug, lang } of guides) {
    for (const [item] of read(`content/guides/${slug}/${lang}.mdx`).matchAll(/<Item\b[\s\S]*?<\/Item>/g)) {
      assert.ok(!tasting.test(item), `${slug}/${lang}: ${item}`);
    }
  }
});

// ---------- Hand-off checks (cross-links, safety wording, shared components) ----------

test('every guide lists two to four related guides, and every related guide is published', () => {
  for (const { data, file } of guides) {
    assert.ok(data.related.length >= 2 && data.related.length <= 4, `${file}: ${data.related.length} related guides (2 to 4)`);
    assert.equal(new Set(data.related).size, data.related.length, `${file}: related guides are listed once`);
    for (const slug of data.related) assert.ok(existsSync(join(guideRoot, slug, 'en.mdx')) && existsSync(join(guideRoot, slug, 'fr.mdx')), `${file}: related guide "${slug}" is published`);
  }
});

// The hero row above every guide shows its section: seeds guides keep the beans, each crops guide
// its own seed, and a new section fails here until it has a motif (src/components/guides/diagrams/hero-row.ts).
const guideDomainsInSource = () => [...read('i18n/guides.ts').match(/guideDomains = \[([^\]]*)\]/)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);

test('every guide section has a hero motif', async () => {
  const { domainMotifs, heroMotifs } = await import('../src/components/guides/diagrams/hero-row.ts');
  const sections = guideDomainsInSource();
  assert.deepEqual(sections, domains, 'the test knows every section in src/i18n/guides.ts');
  assert.deepEqual(Object.keys(domainMotifs).sort(), [...sections].sort(), 'one motif per section, no more');
  for (const [domain, motif] of Object.entries(domainMotifs)) assert.ok(motif === 'crop-seed' || heroMotifs.includes(motif), `${domain}: known motif "${motif}"`);
});

test('every crops guide has its own seed kind for the hero row', async () => {
  const { cropSeeds, heroMotif } = await import('../src/components/guides/diagrams/hero-row.ts');
  const crops = [...new Set(guides.filter((g) => g.data.domain === 'crops').map((g) => g.slug))].sort();
  assert.ok(crops.length, 'there are crops guides');
  assert.deepEqual(Object.keys(cropSeeds).sort(), crops, 'a seed kind for each crops guide, and none for a guide that is not one');
  for (const slug of crops) assert.equal(heroMotif('crops', slug), cropSeeds[slug], `${slug}: its own seed`);
  assert.throws(() => heroMotif('crops', 'a-new-crop'), /a-new-crop/, 'a new crops guide without a seed kind fails the build');
});

test('no guide falls back to the bean row unless its section is seeds or its crop is beans', async () => {
  const { heroMotif, cropSeeds } = await import('../src/components/guides/diagrams/hero-row.ts');
  const expected = { seeds: 'beans', soil: 'soil-crumbs', perennials: 'leaves', seasons: 'autumn-leaves', pests: 'insects', kitchen: 'kernels-and-beans' };
  for (const { slug, data, file } of guides) {
    const motif = heroMotif(data.domain, slug);
    assert.equal(motif, data.domain === 'crops' ? cropSeeds[slug] : expected[data.domain], `${file}: ${data.domain} motif`);
    if (motif === 'beans') assert.ok(data.domain === 'seeds' || (data.domain === 'crops' && cropSeeds[slug] === 'beans'), `${file}: beans in a ${data.domain} guide`);
  }
});

test('the guide hero draws its row through GuideHeroRow, decorative and 640 by 64', () => {
  const layout = read('components/guides/GuideLayout.astro');
  assert.match(layout, /<GuideHeroRow domain=\{domain\} slug=\{slug\} \/>/);
  assert.ok(!existsSync(join(src, 'components/guides/diagrams/BeanRow.astro')), 'BeanRow.astro is replaced, not kept beside');
  const row = read('components/guides/diagrams/GuideHeroRow.astro');
  assert.match(row, /<svg class="guide-specimens" viewBox="0 0 640 64" aria-hidden="true" focusable="false">/);
});

test('the index orders guides within each domain by a unique order number', () => {
  for (const domain of domains) {
    const orders = guides.filter((g) => g.lang === 'en' && g.data.domain === domain).map((g) => g.data.order).sort((a, b) => a - b);
    assert.deepEqual(orders, orders.map((_, i) => i + 1), `${domain}: orders run 1 to ${orders.length} without gaps or ties`);
  }
});

test('a mouth test appears only inside a <Safety> warning, as the author\'s practice', () => {
  // Owner, 2026-10-26: the book's mouth tests are reported with a warning, never as a step. Outside
  // a <Safety> box no prose may read as one. "Dent" is also an English corn type, so the French word
  // is checked in French files only.
  const en = /\b(?:teeth|tooth|bites?|biting|bitten|chew(?:s|ing)? (?:a|the|one) seeds?|spits?|spat|spitting|suck(?:s|ed|ing)? (?:on )?(?:(?:a|the|each) )?(?:seeds?|pods?|beans?)|nibbl\w* (?:on )?(?:(?:a|the|each) )?(?:leaf|leaves|seeds?|pods?|fruit|beans?|pieces?))\b/i;
  // "Mordant" is also the dye word (a fixative): it passes after un, le, du, de or comme, or before
  // "naturel"; "en mordant", "un froid mordant" and the like still fail, so write the dye noun that way.
  const fr = /(?<!\p{L})(?:dents?|mordre|mordez|(?<!(?<!\p{L})(?:un|le|du|de|comme)\s)mordant(?!\s+naturels?(?!\p{L}))|croqu\p{L}*|mâch\p{L}*|recrach\p{L}*|(?:suç\p{L}*|suc(?:e|er|ez|ent|é)) (?:la|les|une|des|chaque) (?:graines?|cosses?|feuilles?)|grignot\p{L}* (?:la|les|une|des|chaque) (?:graines?|cosses?|feuilles?))(?!\p{L})/iu;
  // A self-closing <Safety … /> has no body, so the box pattern must not run from it to the next </Safety>.
  const mouthHit = (body, lang) => body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<Safety\b[^>]*(?<!\/)>[\s\S]*?<\/Safety>/g, '')
    .match(lang === 'fr' ? fr : en)?.[0];
  const box = (text) => `<Safety title="x">${text}</Safety>`;
  const samples = {
    en: ['He spits it out.', 'He spat it out.', 'He will nibble a leaf.', 'He nibbles each pod.', 'He likes to suck on the seed.', 'He sucks each seed.', 'He bites a pod.'],
    // Pest prose stays allowed (asserted below).
    fr: ['Il le recrache.', 'Il faut recracher.', 'Il aime sucer la graine.', 'Il suce chaque graine.', 'Il suçait les graines.', 'Il va grignoter une feuille.', 'Il grignote une cosse.', 'Il croque une cosse.'],
  };
  for (const [lang, texts] of Object.entries(samples)) {
    for (const text of texts) {
      assert.ok(mouthHit(text, lang), `${lang}: mouth-test check misses "${text}" outside a box`);
      assert.ok(!mouthHit(box(text), lang), `${lang}: mouth-test check flags "${text}" inside a box`);
      assert.ok(mouthHit(`<Safety title="x" />\n${text}\n${box('ok')}`, lang), `${lang}: a self-closing <Safety /> hides "${text}"`);
    }
  }
  for (const text of ['Slugs nibble seedlings.', 'Sap-sucking insects.']) assert.ok(!mouthHit(text, 'en'), `en: pest prose "${text}" is not a mouth test`);
  for (const text of ['Les limaces grignotent les semis.', 'Des insectes suceurs.', 'Le suçoir du puceron.']) assert.ok(!mouthHit(text, 'fr'), `fr: pest prose "${text}" is not a mouth test`);
  for (const text of ['L’alun sert de mordant.', 'Un mordant fixe la couleur.', 'Le mordant se prépare à part.', 'Comme mordant, l’alun.', 'Un tanin sert d’appui au mordant naturel.', 'Les mordants fixent la teinture.']) assert.ok(!mouthHit(text, 'fr'), `fr: dye prose "${text}" is not a mouth test`);
  for (const text of ['Il teste la graine en mordant dedans.', 'En mordant une cosse, il juge.', 'Mordant la graine, il la juge.']) assert.ok(mouthHit(text, 'fr'), `fr: mouth-test check misses "${text}"`);
  for (const { body, file, lang } of guides) {
    const hit = mouthHit(body, lang);
    assert.ok(!hit, `${file}: "${hit}" reads as a mouth test; report it only inside a <Safety> warning`);
  }
});

test('two food cautions in a row are one box: <FoodCaution risk={[…]}> lists them under one title', () => {
  for (const { body, file } of guides) {
    assert.ok(!/<FoodCaution\b[^>]*\/>\s*<FoodCaution\b/.test(body), `${file}: combine adjacent FoodCautions into one risk={[…]} list`);
  }
  const caution = read('components/guides/FoodCaution.astro');
  assert.match(caution, /risk: FoodRisk \| FoodRisk\[\]/, 'FoodCaution takes one risk or a list');
});

test('diagrams share one wrap() helper from src/lib/svg.ts', async () => {
  const diagrams = join(src, 'components/guides/diagrams');
  for (const file of readdirSync(diagrams, { recursive: true }).filter((f) => /\.(astro|ts)$/.test(f))) {
    const text = readFileSync(join(diagrams, file), 'utf8');
    assert.ok(!/(?:function\s+wrap\s*\(|const\s+wrap\s*=)/.test(text), `diagrams/${file}: use wrap() from src/lib/svg.ts`);
    assert.ok(!/from '\.\.?\/(?:[\w-]+\/)?wrap'/.test(text), `diagrams/${file}: imports a local wrap copy`);
    assert.ok(!/(?:^|\/)wrap\.ts$/.test(file), `diagrams/${file}: a wrap() copy`);
  }
  const { wrap } = await import('../src/lib/svg.ts');
  assert.deepEqual(wrap('one two three four', 9), ['one two', 'three', 'four']);
  assert.deepEqual(wrap('Graines : sèches', 8), ['Graines :', 'sèches'], 'a no-break space is not a break point');
  assert.deepEqual(wrap('', 5), []);
});

test('the glossary plugin keeps a term and the punctuation around it on one line', async () => {
  const { rehypeGuideTerms } = await import('../src/lib/rehype-guide-terms.mjs');
  const term = (id) => ({ type: 'mdxJsxTextElement', name: 'Term', attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }], children: [{ type: 'text', value: id }] });
  const text = (value) => ({ type: 'text', value });
  const tree = { type: 'root', children: [
    { type: 'element', tagName: 'p', children: [text('Save '), term('landrace'), text(', then sow.')] },
    { type: 'element', tagName: 'p', children: [text('l’hybride '), term('f1-hybrid'), text(' ; à la suivante')] },
    { type: 'element', tagName: 'p', children: [text('dit « '), term('grex'), text(' » ici')] },
    { type: 'element', tagName: 'p', children: [term('heirloom'), text(' and more')] },
  ] };
  rehypeGuideTerms()(tree, { path: '/x/src/content/guides/demo/en.mdx' });
  const paras = tree.children.filter((n) => n.tagName === 'p');
  const keep = (p) => p.children.find((c) => c.tagName === 'span' && c.properties?.className?.includes('guide-term-keep'));
  const flat = (n) => (n.type === 'text' ? n.value : n.name === 'Term' ? `[${n.attributes[0].value}]` : (n.children ?? []).map(flat).join(''));
  assert.equal(flat(keep(paras[0])), '[landrace],');
  assert.equal(flat(paras[0]), 'Save [landrace], then sow.');
  assert.equal(flat(keep(paras[1])), '[f1-hybrid] ;');
  assert.equal(flat(keep(paras[2])), '« [grex] »');
  assert.equal(flat(paras[2]), 'dit « [grex] » ici');
  assert.equal(keep(paras[3]), undefined, 'no wrapper when no punctuation touches the term');
  const css = read('styles/guides.css');
  assert.match(css, /\.guide-term-keep\s*\{[^}]*white-space\s*:\s*nowrap/, 'guides.css keeps the wrapper on one line');
});

test('crop tables stack into label and value rows on phones, so they never scroll sideways at 390px', () => {
  const table = read('components/guides/CropTable.astro');
  assert.match(table, /class="guide-table guide-crop-table"/, 'CropTable marks its table');
  assert.match(table, /<td data-label=\{heads\[c\]\}/, 'every CropTable cell carries its column name');
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const phone = [...css.matchAll(/@media \(max-width: 639px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  assert.match(phone, /\.guide-crop-table thead\s*\{[^}]*(?:position\s*:\s*absolute|clip-path)/, 'the header row is visually hidden on phones (cells name themselves)');
  assert.match(phone, /\.guide-crop-table (?:tr|tbody tr)\s*\{[^}]*display\s*:\s*block/, 'each crop is a block on phones');
  assert.match(phone, /\.guide-crop-table td::before\s*\{[^}]*content\s*:\s*attr\(data-label\)/, 'each value shows its column name on phones');
  assert.ok(!/\.guide-crop-table[^{]*\{[^}]*white-space\s*:\s*nowrap/.test(phone), 'no nowrap cell on phones');
});

test('guide steps keep the body spacing from the block above, and plain markdown tables are styled', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.trim() === '.guide-steps') assert.ok(!/(?:^|;)\s*margin(?:-top|-block)?\s*:/.test(body), '.guide-steps sets no top margin (it would beat .guide-body > * + *)');
  }
  assert.match(css, /\.guide-body > table\s*\{/, 'plain markdown tables in a guide body get a style');
});

test('French guide chrome puts a no-break space before : ; ? and !', () => {
  const fr = JSON.parse(read('i18n/guides/fr.json'));
  for (const [key, value] of Object.entries(fr)) {
    const text = value.replace(/\{\w+\}/g, 'x');
    assert.ok(!/(?:^|[^\s  ])[:;?!](?=\s|$)/.test(text) && !/ [:;?!]/.test(text), `fr.json ${key}: ${JSON.stringify(value)}`);
  }
  for (const file of ['CropCard.astro', 'Safety.astro', 'PlantingMixBar.astro']) {
    assert.ok(!/\}: \{|\}: \$\{/.test(read(`components/guides/${file}`)), `${file}: a hard-coded colon after a translated string (use a string with its own punctuation)`);
  }
});

test('guide text and guide strings carry no double-encoded characters', () => {
  const files = [
    ...readdirSync(guideRoot).flatMap((slug) => guideLangs.map((lang) => `content/guides/${slug}/${lang}.mdx`)),
    ...guideLangs.map((lang) => `i18n/guides/${lang}.json`),
    'data/glossary.ts',
    'data/crops.ts',
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /[\u0080-\u009f]|â€|Ã[ -¿]/, `${file} has mojibake`);
  }
});

test('an empty checklist shows 0 of 0, not a NaN% progress bar', async () => {
  const { stripTypeScriptTypes } = await import('node:module');
  const source = read('components/guides/Checklist.astro').match(/<script>([\s\S]*?)<\/script>/)[1];
  const el = () => ({ textContent: '', hidden: true, style: { width: '' } });
  const parts = { '[data-checklist-progress]': el(), '[data-checklist-fill]': el(), '[data-checklist-status]': el(), '[data-checklist-saved]': el() };
  const list = {
    dataset: { guideChecklist: 'empty', slug: 'test', progress: '{done} of {total}', allDone: 'All done' },
    querySelectorAll: () => [],
    querySelector: (selector) => parts[selector],
    addEventListener: () => {},
  };
  const document = { querySelectorAll: () => [list] };
  const localStorage = { getItem: () => null, setItem: () => {} };
  new Function('document', 'localStorage', stripTypeScriptTypes(source))(document, localStorage);
  assert.equal(parts['[data-checklist-fill]'].style.width, '0%');
  assert.equal(parts['[data-checklist-progress]'].textContent, '0 of 0');
});

test('the crossing meter fills with a non-green token: green is for plants, not for chrome', () => {
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]*\.guide-meter[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length, 'guides.css styles .guide-meter');
  for (const [, selector, body] of rules) assert.doesNotMatch(body, /--leaf/, `guides.css: ${selector.trim()} uses --leaf`);
});

// Invasive species (owner, 2026-10-27): <Invasive /> is a fixed inline note placed right after the name
// of a species the book flags as invasive or spreading. The name lists are a heuristic, not the whole
// rule: a guide naming one of the book's flagged species must carry the note at least once; reviewers
// still check each name and its placement.
const invasiveNames = {
  en: /\b(?:prosopis|mesquites?|leucaenas?|kudzu|castor|osage oranges?|air potato(?:es)?|chinese tallow|miscanthus|pongam(?:ia)?s?|leafy spurge|cardoons?)\b/i,
  fr: /(?<!\p{L})(?:prosopis|mesquites?|leucaenas?|kudzu|ricins?|orangers? des osages|ignames? bulbifères?|arbres? à suif|miscanthus|pongamias?|euphorbes? ésules?|cardons?)(?!\p{L})/iu,
};
const invasiveProblem = (body, lang) => {
  const text = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  if (/<Invasive(?!\s*\/>)/.test(text)) return 'write <Invasive /> self-closing, with no attributes';
  if (/^[ \t]*(?:(?:[-*+]|\d+\.)[ \t]+)?<Invasive/m.test(text)) return '<Invasive /> follows the species name, never starts a line or a list item';
  if (/^#{1,6}[ \t].*<Invasive/m.test(text)) return 'no <Invasive /> in a heading';
  const named = text.match(invasiveNames[lang])?.[0];
  if (named && !text.includes('<Invasive />')) return `names "${named}", a species the book flags as invasive, with no <Invasive />`;
};

test('the invasive note is inline and self-closing, and a guide naming a flagged species carries it', () => {
  const samples = [
    ['Mesquite <Invasive /> feeds livestock.', 'en', false],
    ['- Kudzu <Invasive />, a fodder vine.', 'en', false],
    ['Le ricin <Invasive /> donne une huile.', 'fr', false],
    ['Sow beans and squash.', 'en', false],
    ['Mesquite feeds livestock.', 'en', true],
    ['L’oranger des Osages fait des haies.', 'fr', true],
    ['Mesquite <Invasive></Invasive> feeds livestock.', 'en', true],
    ['Mesquite <Invasive lang="en" /> feeds livestock.', 'en', true],
    ['Mesquite\n<Invasive />', 'en', true],
    ['- <Invasive /> Mesquite', 'en', true],
    ['## Mesquite <Invasive />', 'en', true],
    ['{/* mesquite, later */}Sow beans.', 'en', false],
  ];
  for (const [text, lang, bad] of samples) assert.equal(Boolean(invasiveProblem(text, lang)), bad, `${lang}: ${JSON.stringify(text)}`);
  const component = read('components/guides/Invasive.astro');
  assert.ok(!/interface Props\s*\{[^}]*\w/.test(component) && !/<slot/.test(component), 'Invasive takes no props and no slot');
  assert.match(component, /<span class="guide-invasive"/, 'Invasive renders phrasing content (a span)');
  assert.ok(!/<(?:div|p|aside|section)\b/.test(component), 'Invasive renders no block element (it sits inside a paragraph)');
  for (const lang of guideLangs) assert.ok(JSON.parse(read(`i18n/guides/${lang}.json`))['invasive.text']?.trim(), `${lang}: invasive.text`);
  const css = read('styles/guides.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.guide-invasive\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /border\s*:\s*1px solid var\(--border-strong\)/, '.guide-invasive has a solid hairline (dashed is the "not covered yet" note)');
  assert.match(rule, /display\s*:\s*inline-block/, '.guide-invasive moves to a new line whole on a phone (an inline pill left a stub after the name)');
  assert.ok(!/nowrap|--leaf|--danger/.test(rule), '.guide-invasive wraps, and is neither green nor red');
  for (const { body, file, lang } of guides) {
    const problem = invasiveProblem(body, lang);
    assert.ok(!problem, `${file}: ${problem}`);
  }
});

test('every <HisGarden book> names a cited book whose garden is described in English and French', () => {
  const component = read('components/guides/HisGarden.astro');
  assert.match(component, /book = 'landrace-gardening'/, 'HisGarden defaults to Lofthouse\'s garden');
  const strings = Object.fromEntries(guideLangs.map((lang) => [lang, JSON.parse(read(`i18n/guides/${lang}.json`))]));
  for (const book of ['landrace-gardening', 'carbon-farming-solution']) {
    for (const lang of guideLangs) assert.ok(strings[lang][`hisGarden.where.${book}`]?.trim(), `${lang}: hisGarden.where.${book}`);
  }
  for (const { body, file, data, lang } of guides) {
    for (const book of attrs(body, 'HisGarden', 'book')) {
      assert.ok(bookIds.includes(book), `${file}: <HisGarden book> "${book}" is a book id`);
      assert.ok(data.sources.some((s) => s.book === book), `${file}: <HisGarden book> "${book}" is among the guide's sources`);
      assert.ok(strings[lang][`hisGarden.where.${book}`]?.trim(), `${file}: hisGarden.where.${book} in ${lang}.json`);
    }
  }
});

test('the climate block names its book in the book\'s language, in a phrase that suits any author', () => {
  const fr = JSON.parse(read('i18n/guides/fr.json'))['climate.from'];
  // "de Eric" is wrong French: a name starting with a vowel needs "d’". No article before {by}.
  assert.ok(!/(?<!\p{L})(?:de|le|la|que) \{by\}/u.test(fr), `fr climate.from: ${fr}`);
  const component = read('components/guides/ForClimate.astro');
  assert.match(component, /<cite lang=\{edition\.lang\}>\{title\}<\/cite>/, 'ForClimate marks the title with its language');
  assert.match(read('styles/guides.css'), /\.guide-climate-source cite\s*\{[^}]*font-style\s*:\s*normal/);
});

// A <Term>'s note is placed before the top-level block of its first use, so a first use inside the
// second or later block of a run of <ForClimate> blocks puts a note between them and splits the run.
const termSplittingRun = (body) => {
  const text = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => ' '.repeat(m.length));
  const later = [...text.matchAll(/<ForClimate\b[\s\S]*?<\/ForClimate>/g)].filter((b) => /<\/ForClimate>\s*$/.test(text.slice(0, b.index)));
  const seen = new Set();
  for (const m of text.matchAll(/<Term\b[^>]*?\bid="([^"]+)"/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    if (later.some((b) => m.index > b.index && m.index < b.index + b[0].length)) return m[1];
  }
};

test('no term is first used in the second or later block of a climate run', () => {
  const block = (inner) => `<ForClimate zones="tropical" source="x">\n${inner}\n</ForClimate>`;
  const term = '<Term id="coppice">coppice</Term>';
  assert.equal(termSplittingRun(`${block('a')}\n\n${block(term)}`), 'coppice');
  assert.equal(termSplittingRun(`Cut a ${term}.\n\n${block('a')}\n\n${block(term)}`), undefined, 'first use before the run');
  assert.equal(termSplittingRun(`${block(term)}\n\n${block(term)}`), undefined, 'first use in the run\'s first block');
  assert.equal(termSplittingRun(`${block('a')}\n\nBetween.\n\n${block(term)}`), undefined, 'a block after prose starts a new run');
  for (const { body, file } of guides) {
    const id = termSplittingRun(body);
    assert.ok(!id, `${file}: <Term id="${id}"> is first used inside a later block of a <ForClimate> run; use it first in prose before the run`);
  }
});
