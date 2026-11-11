// The consortium core's boundary (design check §6, commit 0 of P2): src/lib/consortium/ is pure and
// framework-free, so node --test runs it and it can move into a package unchanged. Every import of a
// core file stays inside the folder (no package, no node: module, no ../), and no core file touches a
// DOM or browser global. The island (src/islands/consortium/) may import the core, never the reverse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const core = fileURLToPath(new URL('../src/lib/consortium/', import.meta.url));
const islands = fileURLToPath(new URL('../src/islands/consortium/', import.meta.url));
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

test('the boundary readers catch what they guard against', () => {
  assert.deepEqual(importsOf("import { a } from '../x.ts';\nexport * from './y.ts';\nimport 'z';\nconst m = await import('preact');"), ['../x.ts', './y.ts', 'z', 'preact']);
  assert.deepEqual(globalsOf("const w = window.innerWidth; // document in a comment\nconst s = 'location';\nfoo.document = 1;"), ['window']);
  assert.deepEqual(globalsOf('interface X { location: string }'), []);
  assert.deepEqual(globalsOf('localStorage.getItem(k)'), ['localStorage']);
});
