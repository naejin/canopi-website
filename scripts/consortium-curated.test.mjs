// E6 hand-off E: one owner for "the climates with plants" (the export's curated climates). Start's
// pill and Suggest (views/PoolSlot.tsx through rules/suggest-block.ts), the pool panel, Add, Paste and
// store.suggestMembers all read store.curatedClimates: the open database's list, else, before it opens,
// the one the page names (main.ts setPageClimates; the loader refuses a database whose list differs).
// Start can then never offer a Suggest that suggestMembers refuses for a list the two read apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const island = new URL('../src/islands/consortium/', import.meta.url);
const store = await import(new URL('store.ts', island).href);

test('store.curatedClimates: the page\'s list before the database opens, the database\'s once it is open', () => {
  store.setPageClimates(['temperate', 'tropical', 'nowhere']);
  assert.deepEqual(store.curatedClimates.value, ['Temperate', 'Tropical'], 'the page\'s site ids as zones (an unknown id dropped)');
  store.setSource({ info: () => ({ climates: ['Temperate'] }) });
  assert.deepEqual(store.curatedClimates.value, ['Temperate'], 'the open database\'s list wins');
  store.setSource(null);
  assert.deepEqual(store.curatedClimates.value, ['Temperate', 'Tropical'], 'closed: the page\'s again');
});

// No second reader: the island reads neither the database's info().climates nor the page's climates
// anywhere but in store.ts (and main.ts, which hands the page's list over and checks the database).
test('no island module but store.ts and main.ts reads info().climates or page().climates', () => {
  const root = fileURLToPath(island);
  const files = [];
  const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
  walk(root);
  const readers = files.filter((p) => /info\(\)\.climates|page\(\)\.climates/.test(readFileSync(p, 'utf8'))).map((p) => p.slice(root.length)).sort();
  assert.deepEqual(readers, ['store.ts'], 'read store.curatedClimates instead');
});
