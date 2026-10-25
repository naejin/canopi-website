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
const domains = ['seeds', 'crops', 'seasons', 'pests'];
// The 17 guides of the plan (knowledge/project/field-guides-plan.md). An in-text "next guides" link
// may name one before it is written; the page shows it once it exists.
const planned = [
  'landrace-gardening', 'hybrids-heirlooms-landraces', 'will-they-cross', 'hand-crosses', 'choosing-seed-parents',
  'keeping-a-landrace', 'saving-seed', 'storing-seed', 'squash-melons-cucumbers', 'corn', 'beans-and-legumes',
  'tomatoes', 'small-grains', 'true-seed-potato-garlic-sunroot', 'season-shifting', 'food-all-year', 'pests-without-sprays',
];
// Safety rule: no caution or safety box gives a time, a temperature or a method word, and no prose
// pairs boiling, soaking, fermenting or cooking with an amount of time. This is a heuristic: it catches
// the usual ways of writing these in English and French, not every one, so reviewers still read them.
const amount = String.raw`(?:\d+(?:[.,]\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-eight|sixty|half(?:\s+an?)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|soixante|demi(?:e)?)`;
const timeUnit = String.raw`(?:seconds?|secondes?|secs?|minutes?|mins?|hours?|heures?|hrs?|h|days?|jours?|j|nights?|nuits?|weeks?|semaines?|months?|mois)`;
const timeAmount = new RegExp(String.raw`\b${amount}[\s  -]*${timeUnit}\b`, 'i');
const temperature = /\d\s*[°º]|\bdegrees?\b|\bdegr[ée]s?\b|\b\d+\s*(?:K|C|F)\b/i;
const methodWord = /\bovernight\b|\b(?:toute la|pendant la|une) nuit\b|\bboil\w*|\bbouill\w*|\bsoak\w*|\btremp\w*/i;
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
    assert.ok(lang === 'en' || lang === 'fr');
  }
  for (const slug of slugs) {
    const [en, fr] = guideLangs.map((lang) => guides.find((g) => g.slug === slug && g.lang === lang).data);
    for (const key of ['domain', 'order', 'related', 'quick']) assert.deepEqual(fr[key], en[key], `${slug}: ${key} matches between en and fr`);
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
    for (const risk of attrs(body, 'FoodCaution', 'risk')) assert.ok(foodRisks.includes(risk), `${file}: FoodCaution risk "${risk}"`);
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
  }
  for (const slug of slugs) {
    const [en, fr] = guideLangs.map((lang) => guides.find((g) => g.slug === slug && g.lang === lang).body);
    for (const [name, attr] of [['Term', 'id'], ['Checklist', 'id'], ['Item', 'id'], ['FoodCaution', 'risk'], ['CropCards', 'crops'], ['CropTable', 'crops']]) {
      assert.deepEqual(new Set(listAttr(fr, name, attr)), new Set(listAttr(en, name, attr)), `${slug}: <${name} ${attr}> the same in en and fr`);
    }
    const components = (body) => [...body.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]).filter((n) => n !== 'Term').join(' ');
    assert.equal(components(fr), components(en), `${slug}: the same components in the same order in en and fr`);
  }
});

test('the safety heuristic catches times, temperatures and method words written out', () => {
  for (const text of ['ten minutes', 'for 12 hours', 'overnight', 'deux heures', 'toute la nuit', 'at 100 °C', 'boil them', 'soak the beans', 'faites tremper', 'a day', 'trois jours', 'twenty-minute']) {
    assert.ok(cautionBreach(text), `caution heuristic misses "${text}"`);
  }
  for (const text of ['Ferment them for three days.', 'Soak the seed for twelve hours before sowing.', 'Faites cuire vingt minutes.', 'boil for 10 min']) {
    assert.ok(proseBreach.test(text), `prose heuristic misses "${text}"`);
  }
  for (const text of ['Ferment in a jar with a little water for a few days, until the gel breaks down.', 'Sow them in one bed. A label with the crop and the year is enough.', 'Cook what you grow.']) {
    assert.ok(!proseBreach.test(text), `prose heuristic flags "${text}"`);
  }
});

test('no caution or safety text gives a time, a temperature or a method, and no prose times a cooking step', async () => {
  const { foodRisks: risks } = await import('../src/data/food-risks.ts');
  for (const lang of guideLangs) {
    const strings = JSON.parse(read(`i18n/guides/${lang}.json`));
    for (const risk of risks) {
      const text = strings[`food.${risk}`];
      assert.ok(text?.trim(), `${lang}: food.${risk}`);
      assert.ok(!cautionBreach(text), `${lang}: food.${risk} gives a time, temperature or method`);
      assert.ok(!/https?:|<a\b/.test(text), `${lang}: food.${risk} carries no link`);
    }
  }
  for (const { body, file } of guides) {
    for (const [, inner] of body.matchAll(/<(?:Safety|FoodCaution)\b[^>]*>([\s\S]*?)<\/(?:Safety|FoodCaution)>/g)) {
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

test('the crop table has the 40 crops of the guide map, each named in English and French', async () => {
  const cropModule = await import('../src/data/crops.ts');
  const { crops, easeTiers } = cropModule;
  assert.equal(crops.length, 40);
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
  // Plant colours exist in every theme block of tokens.css.
  const tokens = read('styles/tokens.css');
  for (const token of ['--leaf', '--petal', '--anther', '--seed-1', '--seed-6']) {
    assert.equal(tokens.split(`${token}:`).length - 1, 3, `${token} in the light, dark and system-dark blocks`);
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
