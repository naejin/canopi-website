// Guides → consortium tool: <TryConsortium plant climate name> opens the tool with the guide's plant
// kept and its climate set (?plant=<canonical_name>&climate=<id>). The plant must be in the beta list of
// that climate (public/data/consortium/), the climate the guide's own (<ForClimate> block), never a default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repo = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(repo, path), 'utf8');
const guideRoot = join(repo, 'src/content/guides');
const dataDir = 'public/data/consortium';
const siteClimates = [...read('src/data/climates.ts').match(/export const climates = \[(.*)\] as const;/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

// Site climate id → the canonical names of its beta climate file.
const manifest = JSON.parse(read(`${dataDir}/manifest.json`));
const cells = new Map(manifest.climates.map((entry) => [
  entry.climate_zone.toLowerCase(),
  new Set(JSON.parse(read(`${dataDir}/${entry.file}`)).taxa.map((taxon) => taxon.canonical_name)),
]));

// Every <TryConsortium> of a guide body, with the zones of the <ForClimate> block around it (null outside).
function presets(body) {
  const blocks = [...body.matchAll(/<ForClimate\b[^>]*?\bzones=(?:"([^"]*)"|\{([^}]*)\})[^>]*>([\s\S]*?)<\/ForClimate>/g)].map((m) => ({
    from: m.index, to: m.index + m[0].length,
    zones: m[1] ? [m[1]] : [...m[2].matchAll(/["']([^"']+)["']/g)].map((z) => z[1]),
  }));
  return [...body.matchAll(/<TryConsortium\b([^>]*?)\/>/g)].map((m) => {
    const attr = (name) => m[1].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    const block = blocks.find((b) => b.from < m.index && m.index < b.to);
    return { plant: attr('plant'), climate: attr('climate'), name: attr('name'), zones: block?.zones ?? null, raw: m[0] };
  });
}

const guides = existsSync(guideRoot) ? readdirSync(guideRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
const bodies = guides.flatMap((slug) => ['en', 'fr'].map((lang) => ({ slug, lang, file: `${slug}/${lang}.mdx`, body: read(`src/content/guides/${slug}/${lang}.mdx`) })));

test('the consortium climate files name site climates, and their canonical names are what the guides link', () => {
  assert.ok(cells.size >= 1, 'public/data/consortium/manifest.json lists climates');
  for (const [climate, names] of cells) {
    assert.ok(siteClimates.includes(climate), `cell climate "${climate}" is a site climate`);
    assert.ok(names.size > 0, `the ${climate} cell has plants`);
  }
});

test('the preset reader sees the attributes and the climate block around a <TryConsortium>', () => {
  const body = [
    '<TryConsortium plant="Zea mays" name="Corn" />',
    '<ForClimate zones="tropical" source="x">\n- **Breadfruit**\n\n<TryConsortium plant="Artocarpus altilis" climate="tropical" name="Breadfruit" />\n</ForClimate>',
    '<ForClimate zones={["tropical", "arid"]} source="x">\n<TryConsortium plant="Cajanus cajan" climate="arid" name="Pigeon pea" />\n</ForClimate>',
  ].join('\n\n');
  assert.deepEqual(presets(body).map(({ plant, climate, zones }) => [plant, climate, zones]), [
    ['Zea mays', undefined, null],
    ['Artocarpus altilis', 'tropical', ['tropical']],
    ['Cajanus cajan', 'arid', ['tropical', 'arid']],
  ]);
});

test('every guide preset names a plant of the beta list of its climate, and takes the climate from its block', () => {
  let count = 0;
  for (const { file, body } of bodies) {
    for (const p of presets(body)) {
      count++;
      assert.ok(p.plant && p.name?.trim(), `${file}: ${p.raw} has a plant and the guide's name for it`);
      if (p.climate !== undefined) {
        assert.ok(siteClimates.includes(p.climate), `${file}: ${p.raw}: "${p.climate}" is a site climate`);
        assert.ok(p.zones, `${file}: ${p.raw}: a preset with a climate sits in the <ForClimate> block of that climate`);
        assert.ok(p.zones.includes(p.climate), `${file}: ${p.raw}: its block is for ${p.zones.join(', ')}, not ${p.climate}`);
        assert.ok(cells.get(p.climate)?.has(p.plant), `${file}: ${p.raw}: "${p.plant}" is in the ${p.climate} cell`);
      } else {
        // Outside a block the guide states no climate: the component links every cell that has the plant.
        assert.equal(p.zones, null, `${file}: ${p.raw}: inside a <ForClimate> block, pass the block's climate`);
        assert.ok([...cells.values()].some((names) => names.has(p.plant)), `${file}: ${p.raw}: "${p.plant}" is in a consortium cell`);
      }
    }
  }
  assert.ok(count > 0, 'some guides open the tool');
});

test('English and French guides open the tool with the same presets, once each', () => {
  for (const slug of guides) {
    const [en, fr] = ['en', 'fr'].map((lang) => presets(bodies.find((b) => b.slug === slug && b.lang === lang).body).map((p) => `${p.plant}|${p.climate ?? ''}`));
    assert.deepEqual(fr, en, `${slug}: the same <TryConsortium plant climate> in en and fr`);
    assert.equal(new Set(en).size, en.length, `${slug}: each plant and climate once (the link's description id is unique)`);
  }
});

test('a preset in a climate block is the last thing in it, after the list and any caution', () => {
  // A call to action between a plant list and its <FoodCaution> or <Safety> box would pull the warning
  // away from what it warns about, and one between a list and the sentence that follows it breaks the prose.
  for (const { file, body } of bodies) {
    for (const m of body.matchAll(/<TryConsortium\b[^>]*?\/>/g)) {
      const close = body.indexOf('</ForClimate>', m.index);
      const open = body.indexOf('<ForClimate', m.index);
      if (close === -1 || (open !== -1 && open < close)) continue; // outside a block
      assert.equal(body.slice(m.index + m[0].length, close).trim(), '', `${file}: ${m[0]} ends its <ForClimate> block`);
    }
  }
});

const { presetClimates, presetLinks } = await import('../src/components/guides/try-consortium.ts');
const liveClimates = presetClimates(manifest, (name) => JSON.parse(read(`${dataDir}/${name}`)));
const holders = (plant) => liveClimates.filter((f) => f.names.has(plant));

test('a preset without a climate links every beta climate that has the plant, once each, in the site climate order', () => {
  const links = presetLinks('/consortium/', 'Zea mays', undefined, liveClimates);
  const expected = siteClimates.filter((zone) => holders('Zea mays').some((f) => f.climate === zone));
  assert.ok(expected.length > 1, 'corn is in more than one climate');
  assert.deepEqual(links.map((link) => link.climate), expected);
  assert.deepEqual(links.map((link) => link.href), expected.map((zone) => `/consortium/?plant=Zea+mays&climate=${zone}`));
});

test('a preset with a climate links that climate only, in the French slug too', () => {
  const plant = [...liveClimates.find((f) => f.climate === 'tropical').names][0];
  assert.deepEqual(presetLinks('/fr/guilde/', plant, 'tropical', liveClimates), [
    { climate: 'tropical', href: `/fr/guilde/?${new URLSearchParams({ plant, climate: 'tropical' })}` },
  ]);
});

test('a preset fails the build on an unknown climate, a plant outside that climate\'s list, or a plant in no list', () => {
  const inTemperateOnly = [...liveClimates.find((f) => f.climate === 'temperate').names].find((name) => holders(name).every((f) => f.climate === 'temperate'));
  assert.ok(inTemperateOnly, 'some plant is only in the temperate list');
  assert.throws(() => presetLinks('/consortium/', 'Zea mays', 'polar', liveClimates), /not a climate/);
  assert.throws(() => presetLinks('/consortium/', inTemperateOnly, 'tropical', liveClimates), /not in the tropical list/);
  assert.throws(() => presetLinks('/consortium/', 'Plantus inventus', undefined, liveClimates), /in no consortium climate/);
});

test('the link text names the plant and the climate it opens ("Corn · Temperate"), with no region', () => {
  for (const lang of ['en', 'fr']) {
    const strings = JSON.parse(read(`src/i18n/guides/${lang}.json`));
    assert.ok(strings['consortium.label']?.trim(), `guides/${lang}.json: consortium.label`);
    assert.equal(strings['consortium.link'], '{plant} · {climate}', `guides/${lang}.json: consortium.link`);
    assert.ok(!Object.keys(strings).some((k) => k.startsWith('consortium.cell.')), `guides/${lang}.json: no cell names left`);
    const site = JSON.parse(read(`src/i18n/translations/${lang}.json`));
    for (const f of liveClimates) assert.ok(site[`climate.${f.climate}`]?.trim(), `${lang}: climate.${f.climate}`);
  }
  assert.match(read('src/components/guides/TryConsortium.astro'), /gt\('consortium\.link', lang, \{ plant: name, climate: t\(`climate\.\$\{link\.climate\}`, lang\) \}\)/);
  assert.match(JSON.parse(read('src/i18n/guides/fr.json'))['consortium.label'], /guilde/i, 'French says « guilde »');
});
