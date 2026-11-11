// The layout of the consortium browser tests (review C1), checked in `npm test` without a browser:
// one file per owner so no two streams edit the same file. consortium-commit0 holds what commit 0
// built and has no todo; consortium-s1…s4 hold their stream's §7 tests, each named for its stream
// ("BT-n (Sx …)") and todo until the stream builds it; every BT-1…BT-9 of design check §7 is there.
// P5 (commit 0): consortium-p5 holds the five P5 streams' specs (design check §B/§C user paths and
// failure states), each "P5-n (S5x …)" and todo for its stream until it builds it, beside the
// harness self-checks "P5-0… (commit 0 …)", which run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./browser/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.browser.test.mjs')).sort();
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
// Top-level test titles and their options text: test('title', { … }, …) or test('title', async …).
const testsOf = (text) => [...text.matchAll(/^test\('((?:\\'|[^'])+)',\s*(\{[^}]*\})?/gm)].map(([, title, opts]) => ({ title: title.replace(/\\'/g, "'"), opts: opts ?? '' }));

test('one browser test file for commit 0, one per stream, one for the seams between them and one for P5, nothing else', () => {
  assert.deepEqual(files, ['consortium-commit0.browser.test.mjs', 'consortium-p5.browser.test.mjs', 'consortium-s1.browser.test.mjs', 'consortium-s2.browser.test.mjs', 'consortium-s3.browser.test.mjs', 'consortium-s4.browser.test.mjs', 'consortium-seams.browser.test.mjs']);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['test:browser'], /scripts\/browser\/\*\.browser\.test\.mjs/);
  assert.doesNotMatch(pkg.scripts.test, /browser/, 'browser tests never run in npm test');
});

test('every browser test runs: no todo, no skip, in any file but P5\'s (H8)', () => {
  for (const file of files.filter((f) => f !== 'consortium-p5.browser.test.mjs')) {
    const text = read(file);
    assert.ok(testsOf(text).length >= (file.includes('-s1.') ? 2 : 5), file);
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

// P5 (commit 0): every P5 spec names its owner stream and is todo for that stream, with the reason
// starting with the stream; the commit-0 harness self-checks run; no skip. A stream removes the todo
// of its own specs when it builds them (they must then pass).
const P5_STREAMS = ['S5b', 'S5c', 'S5d', 'S5e', 'S5f'];
test('P5 specs: each "P5-n (S5x …)" is todo for its own stream; "P5-0 (commit 0 …)" checks run', () => {
  const text = read('consortium-p5.browser.test.mjs');
  assert.doesNotMatch(text, /\bskip\s*:|\.skip\(|\.todo\(/);
  const tests = testsOf(text);
  const seen = new Set();
  for (const { title, opts } of tests) {
    if (/^P5-0[a-z]? \(commit 0\b/.test(title)) { assert.doesNotMatch(opts, /\btodo\s*:/, `"${title}" runs`); continue; }
    const m = title.match(/^P5-\d+[a-z]? \((S5[b-f])\b/);
    assert.ok(m, `"${title}" names its stream: P5-n (S5x …)`);
    assert.match(opts, new RegExp(`\\btodo:\\s*'${m[1]}: `), `"${title}" is todo for ${m[1]}`);
    seen.add(m[1]);
  }
  assert.deepEqual([...seen].sort(), P5_STREAMS, 'every P5 stream has specs');
  assert.ok(tests.some((t) => t.title.startsWith('P5-0')), 'the commit-0 harness self-checks are there');
});
