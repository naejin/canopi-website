// Field Guides crop indexes: the "Find your crop" A–Z index of CrossLookup (will-they-cross) and
// HybridLookup (hybrids-heirlooms-landraces), built from the real crop rows each guide lists. Every
// link must go to an entry the component renders, and every example name in crops.ts must be listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { crop, crops } = await import('../src/data/crops.ts');
const { cropIndex, entryId, exampleNames, hybridCrops } = await import('../src/components/guides/diagrams/will-they-cross/crop-index.ts');

// The crops each will-they-cross MDX passes to <CrossLookup crops={[...]}>.
const crossIdsOf = (lang) => {
  const mdx = readFileSync(new URL(`../src/content/guides/will-they-cross/${lang}.mdx`, import.meta.url), 'utf8');
  return JSON.parse(mdx.match(/<CrossLookup\s+crops=\{(\[[^\]]*\])\}/)[1]);
};
const lookups = ['en', 'fr'].flatMap((lang) => [
  { name: `cross ${lang}`, lang, prefix: 'cross', rows: crossIdsOf(lang).map((id) => crop(id)) },
  { name: `hybrid ${lang}`, lang, prefix: 'hybrid', rows: hybridCrops(crops) },
]);

for (const { name, lang, prefix, rows } of lookups) {
  const letters = cropIndex(rows, lang, prefix);
  const entries = letters.flatMap((l) => l.entries);
  const ids = new Set(rows.map((c) => `#${entryId(prefix, c.id)}`));

  test(`${name}: every index link goes to an entry, and every entry has a name in the index`, () => {
    assert.ok(entries.length > rows.length);
    for (const e of entries) assert.ok(ids.has(e.href), `${e.name} -> ${e.href}`);
    for (const id of ids) assert.ok(entries.some((e) => e.href === id), `no index name for ${id}`);
  });

  test(`${name}: every crops.ts example is in the index, linked to its crop`, () => {
    for (const c of rows) {
      for (const example of exampleNames(c, lang)) {
        assert.ok(entries.some((e) => e.name === example && e.href === `#${entryId(prefix, c.id)}`), `${c.id}: ${example}`);
      }
    }
  });

  test(`${name}: names are sorted with ${lang} collation, under their initial`, () => {
    const collator = new Intl.Collator(lang, { sensitivity: 'base' });
    for (let i = 1; i < entries.length; i++) assert.ok(collator.compare(entries[i - 1].name, entries[i].name) <= 0, `${entries[i - 1].name} before ${entries[i].name}`);
    for (const { letter, entries: group } of letters) {
      for (const e of group) assert.equal(e.name.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toLocaleUpperCase(), letter);
    }
    assert.equal(new Set(letters.map((l) => l.letter)).size, letters.length, 'each letter once');
  });
}

test('index names: rows naming several crops are listed under each', () => {
  const en = cropIndex([crop('cabbage-kale-broccoli'), crop('beet'), crop('squash-pepo')], 'en', 'x').flatMap((l) => l.entries).map((e) => e.name);
  for (const name of ['Cabbage', 'kale', 'broccoli', 'Beet', 'chard', 'zucchini', 'pumpkin', 'Squash (pepo)']) assert.ok(en.includes(name), name);
  const fr = cropIndex([crop('pepper'), crop('wheat'), crop('squash-maxima')], 'fr', 'x').flatMap((l) => l.entries).map((e) => e.name);
  for (const name of ['Piment', 'poivron', 'Blé', 'potiron']) assert.ok(fr.includes(name), name);
});
