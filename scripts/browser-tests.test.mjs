// The layout of the consortium browser tests (review C1), checked in `npm test` without a browser:
// one file per owner so no two streams edit the same file. consortium-commit0 holds what commit 0
// built and has no todo; consortium-s1…s4 hold their stream's §7 tests, each named for its stream
// ("BT-n (Sx …)") and todo until the stream builds it; every BT-1…BT-9 of design check §7 is there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./browser/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.browser.test.mjs')).sort();
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
// Top-level test titles and their options text: test('title', { … }, …) or test('title', async …).
const testsOf = (text) => [...text.matchAll(/^test\('((?:\\'|[^'])+)',\s*(\{[^}]*\})?/gm)].map(([, title, opts]) => ({ title: title.replace(/\\'/g, "'"), opts: opts ?? '' }));

test('one browser test file for commit 0 and one per stream, nothing else', () => {
  assert.deepEqual(files, ['consortium-commit0.browser.test.mjs', 'consortium-s1.browser.test.mjs', 'consortium-s2.browser.test.mjs', 'consortium-s3.browser.test.mjs', 'consortium-s4.browser.test.mjs']);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['test:browser'], /scripts\/browser\/\*\.browser\.test\.mjs/);
  assert.doesNotMatch(pkg.scripts.test, /browser/, 'browser tests never run in npm test');
});

test('commit 0 tests all run: no todo, no skip', () => {
  const text = read('consortium-commit0.browser.test.mjs');
  assert.ok(testsOf(text).length >= 6);
  assert.doesNotMatch(text, /\btodo\s*:|\bskip\s*:|\.todo\(|\.skip\(/);
});

test('each stream file names its stream in every test, todo only for that stream', () => {
  for (const n of [1, 2, 3, 4]) {
    const tests = testsOf(read(`consortium-s${n}.browser.test.mjs`));
    assert.ok(tests.length, `S${n} has tests`);
    for (const { title, opts } of tests) {
      assert.match(title, new RegExp(`^(BT-\\d|Exit walk-through) \\(S${n}\\b`), `S${n}: "${title}" names its stream`);
      const todo = opts.match(/todo:\s*'([^']*)'/)?.[1];
      if (todo !== undefined) assert.match(todo, new RegExp(`^S${n}\\b`), `S${n}: "${title}" is todo for S${n}`);
    }
  }
});

test('every BT-1…BT-9 of design check §7 has a test', () => {
  const titles = files.flatMap((f) => testsOf(read(f)).map((t) => t.title));
  for (let i = 1; i <= 9; i++) assert.ok(titles.some((t) => t.startsWith(`BT-${i} `) || t.includes(`BT-${i} load`) || t.includes(`/ BT-${i} `)), `BT-${i}`);
});
