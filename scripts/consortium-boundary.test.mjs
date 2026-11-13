// The consortium core's boundary (design check §6, commit 0 of P2): src/lib/consortium/ is pure and
// framework-free, so node --test runs it and it can move into a package unchanged. Every import of a
// core file stays inside the folder (no package, no node: module, no ../), and no core file touches a
// DOM or browser global. The island (src/islands/consortium/) may import the core, never the reverse.
// Design check E6 A27, one owner per rule: src/lib/climate/ and src/lib/location/ keep their relative
// imports inside their own folder (packages allowed). "No preact, @preact/signals, src/islands or
// src/components in src/lib" is dependency-cruiser's L1 (.dependency-cruiser.cjs, npm run check:arch),
// as are layer direction and cycles; this file keeps the folder and browser-global rules it cannot see.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Folder paths built with join, not new URL('../src/…/', import.meta.url): knip reads that form as an
// import of the folder's index.ts and would count every export of the core and the climate reader as used.
const SRC = join(fileURLToPath(import.meta.url), '..', '..', 'src');
const core = join(SRC, 'lib', 'consortium');
const islands = join(SRC, 'islands', 'consortium');
const climate = join(SRC, 'lib', 'climate');
const place = join(SRC, 'lib', 'location');
const files = (dir) => readdirSync(dir, { recursive: true }).filter((f) => /\.(ts|tsx|js|mjs)$/.test(f)).map((f) => ({ name: f, text: readFileSync(join(dir, f), 'utf8') }));

// Comments and string contents removed, so a word in prose or a message is not a use.
const code = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");

export function importsOf(text) {
  const specs = [];
  for (const m of text.matchAll(/(?:^|[\s;])(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of text.matchAll(/(?:^|[\s;])import\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of text.matchAll(/\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) specs.push(m[1]);
  for (const m of text.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

const BROWSER = ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'history', 'fetch', 'XMLHttpRequest', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'requestAnimationFrame', 'matchMedia', 'getComputedStyle', 'indexedDB', 'Worker', 'WebAssembly', 'DecompressionStream', 'globalThis', 'self', 'alert', 'confirm'];
export function globalsOf(text) {
  const body = code(text);
  return BROWSER.filter((name) => new RegExp(`(?<![.\\w$])${name}(?![\\w$])(?!\\s*:)`).test(body));
}

test('every core import stays inside src/lib/consortium/', () => {
  const list = files(core);
  assert.ok(list.some((f) => f.name === 'types.ts') && list.some((f) => f.name === 'source.ts') && list.some((f) => f.name === 'index.ts'), 'the frozen seams exist');
  for (const { name, text } of list) {
    for (const spec of importsOf(text)) {
      assert.ok(spec.startsWith('./') && !spec.includes('..'), `${name} imports ${spec}: the core imports only its own files (./x.ts)`);
    }
  }
});

test('no core file uses a DOM or browser global', () => {
  for (const { name, text } of files(core)) assert.deepEqual(globalsOf(text), [], `${name} uses browser globals`);
});

test('the core never imports the island; the island reaches the core through its public files', () => {
  for (const { name, text } of files(core)) assert.ok(!importsOf(text).some((s) => s.includes('islands')), `${name} imports the island`);
  for (const { name, text } of files(islands)) {
    for (const spec of importsOf(text).filter((s) => s.includes('lib/consortium/'))) {
      assert.match(spec, /lib\/consortium\/(index|types|source)\.ts$/, `${name} imports ${spec}: the island imports the core through index.ts, types.ts or source.ts`);
    }
  }
});

// A relative import that leaves the folder (../). A package or a ./ file stays in.
export const outsideImportsOf = (text) => importsOf(text).filter((spec) => spec.startsWith('.') && !spec.startsWith('./') || spec.includes('..'));

test('src/lib/climate and src/lib/location import only their own files and packages', () => {
  for (const [dir, seams] of [[climate, ['index.ts', 'lookup.ts']], [place, ['place-search.ts', 'geolocation.ts', 'maplibre.ts']]]) {
    const list = files(dir);
    for (const seam of seams) assert.ok(list.some((f) => f.name === seam), `${dir}/${seam} exists`);
    for (const { name, text } of list) assert.deepEqual(outsideImportsOf(text), [], `${name}: imports leave ${dir}`);
  }
});

test('the boundary readers catch what they guard against', () => {
  assert.deepEqual(outsideImportsOf("import { x } from '../../islands/consortium/store.ts';\nimport { k } from './koppen.ts';\nimport c from 'maplibre-gl/dist/maplibre-gl.css?inline';\nimport { z } from './a/../../b.ts';\nconst m = await import('../climate/index.ts');"), ['../../islands/consortium/store.ts', './a/../../b.ts', '../climate/index.ts']);
  assert.deepEqual(importsOf("import { a } from '../x.ts';\nexport * from './y.ts';\nimport 'z';\nconst m = await import('preact');"), ['../x.ts', './y.ts', 'z', 'preact']);
  assert.deepEqual(globalsOf("const w = window.innerWidth; // document in a comment\nconst s = 'location';\nfoo.document = 1;"), ['window']);
  assert.deepEqual(globalsOf('interface X { location: string }'), []);
  assert.deepEqual(globalsOf('localStorage.getItem(k)'), ['localStorage']);
});
