// The layout of the consortium browser tests (review C1), checked in `npm test` without a browser:
// one file per owner so no two streams edit the same file. consortium-commit0 holds what commit 0
// built and has no todo; consortium-s1…s4 hold their stream's §7 tests, each named for its stream
// ("BT-n (Sx …)") and todo until the stream builds it; every BT-1…BT-9 of design check §7 is there.
// P5: consortium-p5-s5b/-s5c/-s5d/-s5f hold one P5 stream's specs each (design check §B/§C user
// paths and failure states), each "P5-n (S5x …)" for that file's stream; the harness self-checks
// "P5-0… (commit 0 …)" are in consortium-commit0. S5e's specs (P5.2) wait, todo, outside the glob in
// pending/. The seams are split by owner too: consortium-seams-p2/-layout/-p5 (E1 design check A6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./browser/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.browser.test.mjs')).sort();
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
// Top-level test titles and their options text: test('title', { … }, …) or test('title', async …).
const testsOf = (text) => [...text.matchAll(/^test\('((?:\\'|[^'])+)',\s*(\{[^}]*\})?/gm)].map(([, title, opts]) => ({ title: title.replace(/\\'/g, "'"), opts: opts ?? '' }));

const SPEC_FILES = [
  'consortium-commit0.browser.test.mjs',
  'consortium-p5-s5b.browser.test.mjs', 'consortium-p5-s5c.browser.test.mjs', 'consortium-p5-s5d.browser.test.mjs', 'consortium-p5-s5f.browser.test.mjs',
  'consortium-s1.browser.test.mjs', 'consortium-s2.browser.test.mjs', 'consortium-s3.browser.test.mjs', 'consortium-s4.browser.test.mjs',
  'consortium-seams-layout.browser.test.mjs', 'consortium-seams-p2.browser.test.mjs', 'consortium-seams-p5.browser.test.mjs',
];
test('one browser test file for commit 0, one per P2 stream, one per P5 stream and one per seams owner, nothing else', () => {
  assert.deepEqual(files, SPEC_FILES);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['test:browser'], /scripts\/browser\/\*\.browser\.test\.mjs/);
  assert.doesNotMatch(pkg.scripts.test, /browser/, 'browser tests never run in npm test');
});

test('every browser test runs: no todo, no skip, in any file but a P5 stream\'s (H8)', () => {
  for (const file of files.filter((f) => !f.startsWith('consortium-p5-'))) {
    const text = read(file);
    assert.ok(testsOf(text).length >= (/-(s1|seams-p5)\./.test(file) ? 2 : 5), file);
    assert.doesNotMatch(text, /\btodo\s*:|\bskip\s*:|\.todo\(|\.skip\(/, file);
  }
});

test('the browser tests build their own hook build; only the browser-test flag turns the hook on (H14, review F6)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['build:browser-test'], /^CANOPI_BROWSER_TEST=1 astro build$/);
  assert.match(pkg.scripts['test:browser'], /^npm run build:browser-test && /);
  assert.doesNotMatch(pkg.scripts.build, /CANOPI_BROWSER_TEST/);
  // No PUBLIC_/VITE_ variable: Vite fills those from .env files too, so a stray .env could turn the
  // hook on in a deploy. The hook's switch is a compile-time constant set from the shell flag only.
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /__CT_TEST_HOOK__:\s*JSON\.stringify\(process\.env\.CANOPI_BROWSER_TEST === '1'\)/, 'astro.config.mjs defines the switch from the flag');
  const hook = readFileSync(new URL('../src/islands/consortium/test-hook.ts', import.meta.url), 'utf8');
  assert.match(hook, /if \(__CT_TEST_HOOK__\)/);
  for (const f of ['../astro.config.mjs', '../src/islands/consortium/test-hook.ts', '../package.json'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /PUBLIC_CT_TEST_HOOK/, f);
  const checker = readFileSync(new URL('./check-built-site.mjs', import.meta.url), 'utf8');
  for (const word of ['__ctTest', '__ctViews', 'failSheets']) assert.ok(checker.includes(`'${word}'`), `check-built-site looks for ${word}`);
});

test('each stream file names its stream in every test', () => {
  for (const n of [1, 2, 3, 4]) {
    const tests = testsOf(read(`consortium-s${n}.browser.test.mjs`));
    assert.ok(tests.length, `S${n} has tests`);
    for (const { title, opts } of tests) {
      assert.match(title, new RegExp(`^(BT-\\d|Exit walk-through) \\(S${n}\\b`), `S${n}: "${title}" names its stream`);
    }
  }
});

test('every BT-1…BT-9 of design check §7 has a test', () => {
  const titles = files.flatMap((f) => testsOf(read(f)).map((t) => t.title));
  for (let i = 1; i <= 9; i++) assert.ok(titles.some((t) => t.startsWith(`BT-${i} `) || t.includes(`BT-${i} load`) || t.includes(`/ BT-${i} `)), `BT-${i}`);
});

// P5: every P5 spec names its owner stream, the one its file is for; a todo may only name that
// stream, so a stream removing its own todos passes and no stream marks another's spec; the commit-0
// harness checks run; no skip.
const P5_STREAMS = ['S5b', 'S5c', 'S5d', 'S5f'];
test('P5 specs: each "P5-n (S5x …)" is in its stream\'s file, and a todo names only that stream; "P5-0 (commit 0 …)" checks run in commit0', () => {
  for (const stream of P5_STREAMS) {
    const file = `consortium-p5-${stream.toLowerCase()}.browser.test.mjs`;
    const text = read(file);
    assert.doesNotMatch(text, /\bskip\s*:|\.skip\(|\.todo\(/, file);
    const tests = testsOf(text);
    assert.ok(tests.length, `${file} has tests`);
    for (const { title, opts } of tests) {
      const todo = opts.match(/\btodo:\s*'([^']*)'/)?.[1] ?? null;
      assert.match(title, new RegExp(`^P5-\\d+[a-z]? \\(${stream}\\b`), `${file}: "${title}" names ${stream}: P5-n (${stream} …)`);
      if (todo !== null) assert.ok(todo.startsWith(`${stream}: `), `"${title}": its todo names ${stream}, not another stream ("${todo}")`);
    }
  }
  const commit0 = testsOf(read('consortium-commit0.browser.test.mjs'));
  assert.ok(commit0.filter((t) => /^P5-0[a-z]? \(commit 0\b/.test(t.title)).length >= 4, 'the P5 commit-0 harness self-checks are in commit0');
});

test('S5e\'s specs wait outside the glob, every one todo for S5e (A6; F1a re-enables them)', () => {
  const pending = new URL('./browser/pending/consortium-p5-s5e.spec.mjs', import.meta.url);
  assert.ok(existsSync(pending));
  const tests = testsOf(readFileSync(pending, 'utf8'));
  assert.equal(tests.length, 3);
  for (const { title, opts } of tests) {
    assert.match(title, /^P5-\d+[a-z]? \(S5e\b/);
    assert.match(opts, /\btodo:\s*'S5e: /, title);
  }
  assert.ok(!files.some((f) => f.includes('s5e')), 'no S5e file in the run');
});

test('each seams file holds its owner\'s seams (A6)', () => {
  const owner = (title) => (/^(W6|W7|W8|UX3|UX5|Item 7|Walk-through 2|Layout stability)\b/.test(title) ? 'layout' : /^(UX4|Item 8)\b/.test(title) ? 'p5' : 'p2');
  for (const part of ['p2', 'layout', 'p5']) {
    for (const { title } of testsOf(read(`consortium-seams-${part}.browser.test.mjs`))) assert.equal(owner(title), part, `"${title}" belongs in seams-${owner(title)}`);
  }
});
