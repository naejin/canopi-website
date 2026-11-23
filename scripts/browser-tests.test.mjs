// The layout and invariants of the consortium Field Studio browser tests, checked in `npm test`
// without launching a browser: spec list, shard coverage, no sleeps > 1 s, no direct
// window.__ctTest = true, @real-data suffix coverage, and zero expected-fail markers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./browser/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.browser.test.mjs')).sort();
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
// Top-level test titles and their options text: test('title', { … }, …) or test('title', async …).
const testsOf = (text) => [...text.matchAll(/^(test|failing)\('((?:\\'|[^'])+)',\s*(\{[^}]*\})?/gm)].map(([, kind, title, opts]) => ({ title: title.replace(/\\'/g, "'"), opts: opts ?? '', marked: kind === 'failing' }));

const SPEC_FILES = [
  'consortium-studio-onboarding.browser.test.mjs',
  'consortium-studio-palette.browser.test.mjs',
  'consortium-studio-plan-i18n.browser.test.mjs',
  'consortium-studio-system-climate.browser.test.mjs',
];

test('Field Studio browser test files match SPEC_FILES and package.json scripts stay wired', () => {
  assert.deepEqual(files, SPEC_FILES);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['test:browser'], /node scripts\/browser\/run\.mjs --list local$/);
  assert.match(pkg.scripts['test:browser:shard'], /run\.mjs --list ci --no-scope --shard$/);
  assert.match(pkg.scripts['test:browser:smoke'], /scripts\/browser\/smoke\/consortium\.smoke\.mjs$/);
  assert.doesNotMatch(pkg.scripts.test, /browser/, 'browser tests never run in npm test');
});

test('every Field Studio browser test runs: no todo, no skip, no expected-fail markers (H8)', async () => {
  const { markers } = await import('./expect-fail.mjs');
  assert.deepEqual(markers().filter((m) => m.file.startsWith('browser/')), [], 'zero expected-fail markers in browser specs');
  for (const file of files) {
    const text = read(file);
    assert.ok(testsOf(text).length >= 2, `${file} has at least 2 browser tests`);
    assert.doesNotMatch(text, /\btodo\s*:|\bskip\s*:|\.todo\(|\.skip\(/, file);
  }
});

test('the browser tests build their own hook build; only the browser-test flag turns the hook on (H14, review F6)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['build:browser-test'], /^CANOPI_BROWSER_TEST=1 astro build$/);
  assert.match(pkg.scripts['test:browser'], /^npm run build:browser-test && /);
  assert.doesNotMatch(pkg.scripts.build, /CANOPI_BROWSER_TEST/);
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /__CT_TEST_HOOK__:\s*JSON\.stringify\(process\.env\.CANOPI_BROWSER_TEST === '1'\)/, 'astro.config.mjs defines the switch from the flag');
  const hook = readFileSync(new URL('../src/islands/consortium/test-hook.ts', import.meta.url), 'utf8');
  assert.match(hook, /if \(__CT_TEST_HOOK__\)/);
  for (const f of ['../astro.config.mjs', '../src/islands/consortium/test-hook.ts', '../package.json'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /PUBLIC_CT_TEST_HOOK/, f);
  const checker = readFileSync(new URL('./check-built-site.mjs', import.meta.url), 'utf8');
  for (const word of ['__ctTest', '__ctViews', 'failSheets', '__ctTimeouts']) assert.ok(checker.includes(`'${word}'`), `check-built-site looks for ${word}`);
});

// The sleep rule (E1 design check A12): no sleep over 1 s in a spec or a spec helper.
const SPEC_DIR = new URL('./browser/', import.meta.url);
const PENDING_DIR = new URL('./browser/pending/', import.meta.url);
const specSources = () => [
  ...files,
  ...readdirSync(SPEC_DIR).filter((f) => /helpers\.mjs$/.test(f)),
  ...(existsSync(PENDING_DIR) ? readdirSync(PENDING_DIR).map((f) => `pending/${f}`) : []),
];
const numberOf = (s) => (/^[\d_]+$/.test(s.trim()) ? Number(s.trim().replace(/_/g, '')) : null);
function callArgs(text, open) {
  const args = [];
  let depth = 0, start = open + 1, quote = null, prev = '(';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && text[i + 1] !== '/' && text[i + 1] !== '*' && /[(,=:[!&|?{};]/.test(prev)) { quote = '/'; continue; }
    if (!/\s/.test(c)) prev = c;
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { depth--; if (depth === 0) { args.push(text.slice(start, i)); return args; } }
    else if (c === ',' && depth === 1) { args.push(text.slice(start, i)); start = i + 1; }
  }
  return args;
}
function longWaits(text) {
  const long = [];
  for (const m of text.matchAll(/(?:setTimeout\(\s*\w+\s*,|waitForTimeout\()\s*([\w$]+)\s*\)/g)) {
    const arg = m[1];
    let ms = numberOf(arg);
    if (ms === null) ms = numberOf(text.slice(0, m.index).match(new RegExp(`\\b(?:const|let)\\s+${arg}\\s*=\\s*([\\d_]+)\\s*[;,\\n]`))?.[1] ?? '');
    if (ms === null) {
      const calls = [...text.slice(0, m.index).matchAll(/\.(?:evaluateOnNewDocument|evaluate)\(\s*(?:async\s*)?\(([^)]*)\)\s*=>/g)];
      for (const c of calls.reverse()) {
        const params = c[1].split(',').map((p) => p.split('=')[0].trim());
        const k = params.indexOf(arg);
        if (k < 0) continue;
        const args = callArgs(text, c.index + c[0].indexOf('('));
        ms = numberOf(args[k + 1] ?? '');
        break;
      }
    }
    if (ms !== null && ms > 1000) long.push(m[0]);
  }
  return long;
}
test('the sleep rule reads waits passed by name (A12)', () => {
  assert.deepEqual(longWaits('await new Promise((r) => setTimeout(r, 1500));'), ['setTimeout(r, 1500)']);
  assert.deepEqual(longWaits('const WAIT = 2_000;\nawait new Promise((r) => setTimeout(r, WAIT));'), ['setTimeout(r, WAIT)']);
  assert.deepEqual(longWaits("pg.evaluateOnNewDocument((wait) => { window.fetch = (i) => (/\\/x\\//.test(String(i)) ? new Promise((r) => setTimeout(r, wait)) : f(i)); }, 3000)"), ['setTimeout(r, wait)']);
  assert.deepEqual(longWaits("pg.evaluateOnNewDocument((rec, wait) => { setTimeout(go, wait); }, '[a]', 1000)"), [], '1 s is allowed');
  assert.deepEqual(longWaits('setTimeout(r, Math.min(250, at - Date.now()))'), [], 'an expression is not read');
});
test('no browser spec sleeps longer than 1 s (setTimeout(r, N) with N > 1000, by value or by name)', () => {
  const long = specSources().flatMap((f) => longWaits(readFileSync(new URL(f, SPEC_DIR), 'utf8')).map((w) => `${f}: ${w}`));
  assert.deepEqual(long, []);
});

test('only the harness sets window.__ctTest = true (hook: true, A3)', () => {
  const own = specSources().filter((f) => /window\.__ctTest\s*=\s*true/.test(readFileSync(new URL(f, SPEC_DIR), 'utf8').replace(/^\s*\/\/.*$/gm, '')));
  assert.deepEqual(own, []);
});

test('serve() skips a taken port pair: a listener on the base moves it to base + 2 (F1)', async () => {
  const { createServer } = await import('node:net');
  const { freePortPair, portFree } = await import('./browser/serve.mjs');
  let base = 4480;
  while (!((await portFree(base)) && (await portFree(base + 1)) && (await portFree(base + 2)) && (await portFree(base + 3)))) base += 4;
  const busy = createServer();
  await new Promise((r) => busy.listen({ port: base + 1, host: '127.0.0.1' }, r));
  try {
    assert.equal(await freePortPair(base), base + 2, 'the inspector port taken: the pair moves');
    assert.equal(await freePortPair(base + 1), base + 2, 'an odd base rounds up to even');
  } finally { await new Promise((r) => busy.close(r)); }
  assert.equal(await freePortPair(base), base);
});

test('shards.json: every spec file is in each list exactly once; 3 local shards, 4 CI (F13)', async () => {
  const { readShards, specFiles } = await import('./browser/run.mjs');
  const shards = readShards();
  assert.equal(shards.local.length, 3);
  assert.equal(shards.ci.length, 4);
  for (const list of ['local', 'ci']) assert.deepEqual(shards[list].flat().sort(), specFiles(), `${list}: each file once`);
});

test('the runner fits its slots to the memory available, at least 1, saying why (F15)', async () => {
  const { memAvailable, slotsFor } = await import('./browser/run.mjs');
  const GB = 1024 ** 3;
  assert.equal(memAvailable('MemTotal:       32000000 kB\nMemAvailable:   12582912 kB\n'), 12 * GB);
  assert.deepEqual(slotsFor(12 * GB, 3).slots, 3);
  assert.deepEqual(slotsFor(8 * GB, 3).slots, 2);
  assert.match(slotsFor(8 * GB, 3).why, /^2 slots, not 3: 8\.0 GB available/);
  assert.equal(slotsFor(2 * GB, 3).slots, 1, 'never fewer than 1');
  assert.equal(slotsFor(30 * GB, 3).slots, 3, 'never more than asked');
});

test('the runner names the build command when dist-test/ is missing (F16)', async () => {
  const { builtProblem } = await import('./browser/run.mjs');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const empty = mkdtempSync(join(tmpdir(), 'canopi-run-'));
  try { assert.match(builtProblem(empty), /run `npm run build:browser-test` first/); } finally { rmSync(empty, { recursive: true, force: true }); }
});

test('a spec file whose process keeps a handle open still exits under --test-force-exit (F10)', async () => {
  const { spawnSync } = await import('node:child_process');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--test', '--experimental-test-isolation=none', '--test-force-exit', new URL('./browser/fixtures/linger.spec.mjs', import.meta.url).pathname], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(Date.now() - t0 < 15_000);
});

// A9: tests whose assertions name real plants or counts carry the title suffix " @real-data".
test('@real-data is a title suffix only, and the real-data tests carry it (A9)', () => {
  const titles = files.flatMap((f) => testsOf(read(f)).map((t) => t.title));
  for (const t of titles.filter((x) => x.includes('@real-data'))) assert.match(t, / @real-data$/, t);
  assert.ok(titles.filter((x) => x.endsWith(' @real-data')).length >= 10);
  assert.ok(titles.some((x) => x.startsWith('P1: SQLite-WASM') && x.endsWith('@real-data')));
});
