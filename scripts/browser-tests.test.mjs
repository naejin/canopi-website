// The layout of the consortium browser tests (review C1), checked in `npm test` without a browser:
// one file per owner so no two streams edit the same file. consortium-commit0 holds what commit 0
// built and has no todo; consortium-s1…s4 hold their stream's §7 tests, each named for its stream
// ("BT-n (Sx …)") and todo until the stream builds it; every BT-1…BT-9 of design check §7 is there.
// P5: consortium-p5-s5b/-s5c/-s5d/-s5f hold one P5 stream's specs each (design check §B/§C user
// paths and failure states), each "P5-n (S5x …)" for that file's stream; the harness self-checks
// "P5-0… (commit 0 …)" are in consortium-commit0. S5e's specs (P5.2) wait, todo, outside the glob in
// pending/. The seams are split by owner too: consortium-seams-p2/-layout/-p5 (E1 design check A6).
// E6 (commit 0): consortium-e6 (owners K1, K3, B4 by chunk) and consortium-e6-r4 (R4) hold E6's user
// paths, each "E6-n (<owner> …)", written failing with scripts/expect-fail.mjs failing() (the
// expected-fail marker, owner in the title); a marker turns red once its test passes.
// PP-B (commit 0, superseding F1a's six spec files): consortium-pp-b1 (b1a and b1b) and consortium-pp-b2
// (b2) hold the F1a markers moved unchanged, each "F1a-<letter><n> → PP-B (<owner> …)"; b3's file and
// each stream's PP-B-n scenarios come with the streams (a stream empties a spec file of its cases but
// never deletes it; main deletes emptied files at the chunk-3 exit). Parked markers:
// scripts/plan/parked-markers.json.
// pf commit 0 (2026-11-17; owner: the PP-B palette, place and location screens are rebuilt from the
// boards): consortium-pp-b3, -p5-s5d and -pp-pf went, with the screen-level cases of pp-b1, pp-b2 and s4;
// consortium-pf-a, -pf-b and -pf-c hold the boards as tests, one file per pf stream, each case marked
// expected-fail under its stream ("PF<stream letter><n> (pf-x …)", or "<old id> → PP-C (pf-x …)" for a
// moved F1a marker), with the sweep's ledger in each file's head.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./browser/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.browser.test.mjs')).sort();
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
// Top-level test titles and their options text: test('title', { … }, …) or test('title', async …).
const testsOf = (text) => [...text.matchAll(/^(test|failing)\('((?:\\'|[^'])+)',\s*(\{[^}]*\})?/gm)].map(([, kind, title, opts]) => ({ title: title.replace(/\\'/g, "'"), opts: opts ?? '', marked: kind === 'failing' }));

const SPEC_FILES = [
  'consortium-commit0.browser.test.mjs',
  'consortium-e6-r4.browser.test.mjs', 'consortium-e6.browser.test.mjs',
  'consortium-p5-s5b.browser.test.mjs', 'consortium-p5-s5c.browser.test.mjs', 'consortium-p5-s5f.browser.test.mjs',
  'consortium-pf-a.browser.test.mjs', 'consortium-pf-b.browser.test.mjs', 'consortium-pf-c.browser.test.mjs',
  'consortium-pf-d.browser.test.mjs', 'consortium-pf-e.browser.test.mjs', 'consortium-pf-f.browser.test.mjs',
  'consortium-pp-b1.browser.test.mjs', 'consortium-pp-b2.browser.test.mjs',
  'consortium-pp-c1.browser.test.mjs', 'consortium-pp-c2.browser.test.mjs',
  'consortium-s1.browser.test.mjs', 'consortium-s3.browser.test.mjs', 'consortium-s4.browser.test.mjs',
  'consortium-seams-layout.browser.test.mjs', 'consortium-seams-p2.browser.test.mjs', 'consortium-seams-p5.browser.test.mjs',
];
test('one browser test file for commit 0, one per P2 stream, one per P5 stream, one per seams owner, two for E6, one per PP-B stream file, one per PP-C chunk-1 stream and one per pf stream, nothing else', () => {
  assert.deepEqual(files, SPEC_FILES);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['test:browser'], /node scripts\/browser\/run\.mjs --list local$/);
  assert.match(pkg.scripts['test:browser:shard'], /run\.mjs --list ci --no-scope --shard$/);
  assert.match(pkg.scripts['test:browser:smoke'], /scripts\/browser\/smoke\/consortium\.smoke\.mjs$/);
  assert.doesNotMatch(pkg.scripts.test, /browser/, 'browser tests never run in npm test');
});

test('every browser test runs: no todo, no skip, in any file but a P5 stream\'s (H8)', () => {
  for (const file of files.filter((f) => !f.startsWith('consortium-p5-'))) {
    const text = read(file);
    // A stream file under rewrite (s3 loses its matrix cases to b3) needs 2; a PP-B stream file starts
    // with the markers commit 0 moved into it (pp-b1 holds one) and grows with its stream; seams-p5 kept
    // one case when PP-B commit 0a' deleted UX4 with Jobs (consortium-s2 went whole).
    // pf commit 0 (2026-11-17) moved s4's start case (BT-1) to the pf-c spec, so s4 keeps 4.
    // v14 pf commit 0W (2026-11-18) opened pf-d, -e and -f with one board case each; their stream's
    // commit 0 brings them to 5 or more (the pf-specs test below), as pf-a, -b and -c have.
    assert.ok(testsOf(text).length >= (/-(pp-b\d|pp-(c1|c2)|pf-[a-f]|seams-p5)\./.test(file) ? 1 : /-(s1|s3|s4|e6-r4)\./.test(file) ? 2 : 5), file);
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
  for (const word of ['__ctTest', '__ctViews', 'failSheets', '__ctTimeouts']) assert.ok(checker.includes(`'${word}'`), `check-built-site looks for ${word}`);
});

// Loosened by PP-B commit 0: b3 empties s3 of its matrix cases (a stream never deletes a whole spec
// file; main deletes emptied files at the chunk-3 exit), so a stream file may be left with none.
// consortium-s2 went whole in commit 0a' (every case was about a deleted screen).
test('each stream file names its stream in every test', () => {
  for (const n of [1, 3, 4]) {
    const tests = testsOf(read(`consortium-s${n}.browser.test.mjs`));
    if (n === 1 || n === 4) assert.ok(tests.length, `S${n} has tests`);
    for (const { title, opts } of tests) {
      assert.match(title, new RegExp(`^(BT-\\d|Exit walk-through) \\(S${n}\\b`), `S${n}: "${title}" names its stream`);
    }
  }
});

// Loosened by PP-B commit 0: BT-2…BT-6 lived in s2 and s3; commit 0a' deleted s2 (BT-2…BT-4) with the
// matrix, and b3 removes s3's matrix cases (PP-B b3 replaces them with Your plants' scenarios); the
// others stay required (BT-8's drawing moved to consortium-pp-b2 in 0a').
const BT_UNDER_REWRITE = new Set([2, 3, 4, 5, 6]);
test('every BT-1…BT-9 of design check §7 has a test (BT-2…BT-6 may go with the matrix in PP-B b3)', () => {
  const titles = files.flatMap((f) => testsOf(read(f)).map((t) => t.title));
  for (let i = 1; i <= 9; i++) {
    if (BT_UNDER_REWRITE.has(i)) continue;
    assert.ok(titles.some((t) => t.startsWith(`BT-${i} `) || t.includes(`BT-${i} load`) || t.includes(`/ BT-${i} `)), `BT-${i}`);
  }
});

// P5: every P5 spec names its owner stream, the one its file is for; a todo may only name that
// stream, so a stream removing its own todos passes and no stream marks another's spec; the commit-0
// harness checks run; no skip.
// S5d's file went in pf commit 0 (its future panel is replaced by the Warnings card, consortium-pf-b).
const P5_STREAMS = ['S5b', 'S5c', 'S5f'];
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

// The sleep rule (E1 design check A12): no sleep over 1 s in a spec or a spec helper, in the test or
// in the page. A test that must outlast a timeout injects a short one through h.open({ timeouts })
// and waits for a condition (the timer seen firing, a held request released), never for the clock.
// A wait passed by name counts too, where its value is in the file: a `const`/`let` number, or the
// argument a page function (evaluate / evaluateOnNewDocument) receives in that parameter's place.
const SPEC_DIR = new URL('./browser/', import.meta.url);
const specSources = () => [
  ...files,
  ...readdirSync(SPEC_DIR).filter((f) => /helpers\.mjs$/.test(f)),
  ...readdirSync(new URL('./browser/pending/', import.meta.url)).map((f) => `pending/${f}`),
];
const numberOf = (s) => (/^[\d_]+$/.test(s.trim()) ? Number(s.trim().replace(/_/g, '')) : null);
// The top-level arguments of the call whose '(' is at `open` (strings, templates and regex literals
// skipped), as source text.
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
      // The nearest page function before it that takes `arg` as a parameter.
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

// A3: a spec opens a hooked page with h.open({ hook: true }) (or p5-helpers tool()), so the harness
// sets the flag before the first navigation; no spec or helper writes window.__ctTest = true itself.
test('only the harness sets window.__ctTest = true (hook: true, A3)', () => {
  const own = specSources().filter((f) => /window\.__ctTest\s*=\s*true/.test(readFileSync(new URL(f, SPEC_DIR), 'utf8').replace(/^\s*\/\/.*$/gm, '')));
  assert.deepEqual(own, []);
});

// Failure row F1: a taken base port moves the server up to the next free even pair.
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

// The runner (A11) and its failure rows: F13 every spec file in each list once, F15 fewer slots on
// little memory, F16 a missing build named, F10 a lingering handle never stalls a file.
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

// A9: tests whose assertions name real plants or counts carry the title suffix " @real-data" (never a
// prefix: the stream title rules read the start); after a data reinstall the coordinator runs
// node scripts/browser/run.mjs -- --test-name-pattern="@real-data".
test('@real-data is a title suffix only, and the real-data tests carry it (A9)', () => {
  const titles = files.flatMap((f) => testsOf(read(f)).map((t) => t.title));
  for (const t of titles.filter((x) => x.includes('@real-data'))) assert.match(t, / @real-data$/, t);
  assert.ok(titles.filter((x) => x.endsWith(' @real-data')).length >= 10);
  assert.ok(titles.some((x) => x.startsWith('P1: SQLite-WASM') && x.endsWith('@real-data')));
});

// E6 (commit 0, design check §5.6): each E6 spec names its owner, the one its file holds in the owners
// file (consortium-e6: K1, K3, B4; consortium-e6-r4: R4); a marked spec is a failing() call whose
// owner is the one in its title, and the markers are counted (zero before a push to master:
// node scripts/expect-fail.mjs --zero).
const E6_OWNERS = { 'consortium-e6.browser.test.mjs': ['K1', 'K3', 'B4'], 'consortium-e6-r4.browser.test.mjs': ['R4'] };
test('E6 specs: each "E6-n (<owner> …)" names an owner its file holds; each marker names the owner of its title', async () => {
  const { markers } = await import('./expect-fail.mjs');
  const marked = markers().filter((m) => m.file.startsWith('browser/consortium-e6'));
  for (const [file, owners] of Object.entries(E6_OWNERS)) {
    const tests = testsOf(read(file));
    assert.ok(tests.length >= 2, `${file} has tests`);
    for (const { title, marked: isMarked } of tests) {
      const owner = title.match(/^E6-\d+[a-z]? \((\w+)\b/)?.[1];
      assert.ok(owner && owners.includes(owner), `${file}: "${title}" names one of ${owners.join(', ')}: E6-n (<owner> …)`);
      if (isMarked) assert.ok(marked.some((m) => m.title === title && m.owner === owner && m.file === `browser/${file}`), `"${title}": its marker names ${owner}`);
    }
  }
  const { readFileSync: read2 } = await import('node:fs');
  const owners = JSON.parse(read2(new URL('./plan/e6-owners.json', import.meta.url), 'utf8'));
  for (const [file, list] of Object.entries(E6_OWNERS)) {
    for (const owner of list) {
      assert.ok(owners.chunks.some((c) => c.streams[owner]?.files.includes(`scripts/browser/${file}`)), `the owners file gives ${file} to ${owner} in its chunk`);
    }
  }
});

// PP-B (commit 0, plan "Plant palette redesign"; scripts/plan/pp-b-owners.json): each test of a PP-B
// spec names its owner stream, one the owners file gives that file in some chunk ("F1a-Xn → PP-B (<owner>
// …)" for a moved marker, "PP-B<n> (<owner> …)" for a stream's scenario, "PP-B<n><letter>" for its variant); a marked spec's marker names
// the owner of its title. The markers are counted (zero before a push to master). PP-C commit 0: a PP-B
// case a PP-C stream must rewrite (the Add sheet's, gone) is marked under that stream, named in its title
// as "owner <stream> '…'", one pp-c-owners.json gives the file.
const PPB_FILES = files.filter((f) => f.startsWith('consortium-pp-b'));
test('PP-B specs: each names an owner the owners file gives its file; each marker names the owner of its title', async () => {
  const { markers } = await import('./expect-fail.mjs');
  const owners = JSON.parse(readFileSync(new URL('./plan/pp-b-owners.json', import.meta.url), 'utf8'));
  const ppc = JSON.parse(readFileSync(new URL('./plan/pp-c-owners.json', import.meta.url), 'utf8'));
  const { matches } = await import('./plan/owners.mjs');
  assert.ok(PPB_FILES.length >= 2);
  const marked = markers().filter((m) => m.file.startsWith('browser/consortium-pp-b'));
  for (const file of PPB_FILES) {
    const holders = owners.chunks.flatMap((c) => Object.entries(c.streams).filter(([, st]) => st.files.some((p) => matches(p, `scripts/browser/${file}`))).map(([name]) => name)).filter((n) => n !== 'main');
    assert.ok(holders.length, `the owners file gives ${file} to a stream`);
    for (const { title, marked: isMarked } of testsOf(read(file))) {
      const owner = title.match(/^(?:F1a-[A-Z]\d+ → PP-B|PP-B\d+[a-z]?) \((\w+)\b/)?.[1];
      assert.ok(owner && holders.includes(owner), `${file}: "${title}" names one of ${holders.join(', ')}: F1a-Xn → PP-B (<owner> …) or PP-Bn (<owner> …)`);
      const later = title.match(/; owner (\w+) '/)?.[1];
      if (later) assert.ok(ppc.chunks.some((c) => c.streams[later]?.files.some((p) => matches(p, `scripts/browser/${file}`))), `"${title}": pp-c-owners.json gives ${file} to ${later}`);
      if (isMarked) assert.ok(marked.some((m) => m.title === title && m.owner === (later ?? owner)), `"${title}": its marker names ${later ?? owner}`);
    }
  }
});

// PP-C (commit 0, plan "Plant palette" push C; scripts/plan/pp-c-owners.json): consortium-pp-c1 and -pp-c2
// (-pp-pf went in pf commit 0, for consortium-pf-a/b/c below) hold their stream's scenarios, written failing; each test names its owner stream, the one the
// file is named for and the owners file gives it ("F1a-Xn → PP-C (<owner> …)" for a restored F1a marker,
// "PP-C<n> (<owner> …)" or "PF<n> (<owner> …)" for a scenario); a marker names the owner of its title.
const PPC_FILES = files.filter((f) => /^consortium-pp-(c1|c2)\./.test(f));
test('PP-C specs: each test names the stream its file is for, which the owners file gives it; each marker names the owner of its title', async () => {
  const { markers } = await import('./expect-fail.mjs');
  const owners = JSON.parse(readFileSync(new URL('./plan/pp-c-owners.json', import.meta.url), 'utf8'));
  const { matches } = await import('./plan/owners.mjs');
  assert.equal(PPC_FILES.length, 2);
  const marked = markers().filter((m) => /^browser\/consortium-pp-(c1|c2)\./.test(m.file));
  for (const file of PPC_FILES) {
    const stream = file.match(/^consortium-pp-(c1|c2)\./)[1];
    assert.ok(owners.chunks.some((c) => c.streams[stream]?.files.some((p) => matches(p, `scripts/browser/${file}`))), `the owners file gives ${file} to ${stream}`);
    for (const { title, marked: isMarked } of testsOf(read(file))) {
      const owner = title.match(/^(?:F1a-[A-Z]\d+ → PP-C|PP-C\d+[a-z]?|PF\d+[a-z]?) \((\w+)\b/)?.[1];
      assert.equal(owner, stream, `${file}: "${title}" names ${stream}: F1a-Xn → PP-C (${stream} …), PP-Cn (${stream} …) or PFn (${stream} …)`);
      if (isMarked) assert.ok(marked.some((m) => m.title === title && m.owner === owner), `"${title}": its marker names ${owner}`);
    }
  }
});

// v14 pf commit 0W (2026-11-18): consortium-pf-d, -pf-e and -pf-f, the chunk-3 streams ("Your place in
// figures", "Many plants", "One plant"), each open with one board case; a file needs 1 case until its
// stream's commit 0 (CHUNK_3_OPEN lists the streams still before it) and 5 after.
// pf commit 0 (2026-11-17): consortium-pf-a, -pf-b and -pf-c hold the boards of pf stream a ("What's
// missing next"), b ("The pictures and your plants") and c ("Your place") as tests. Each case names
// its file's stream ("PFA3 (pf-a …)", or "F1a-P2 → PP-C (pf-c …)" for a moved F1a marker) and is
// marked expected-fail under it until the stream makes it pass; the file's head comment carries the
// sweep's ledger, one line per old test it carries ("carries <old id>").
const PF_FILES = files.filter((f) => /^consortium-pf-[a-f]\./.test(f));
// The pf streams whose commit 0 has not landed: each removes itself here in its commit 0.
const CHUNK_3_OPEN = new Set(['pf-d', 'pf-e', 'pf-f']);
test('pf specs: each test names the stream its file is for, which the owners file gives it; each marker names it; the head lists the old tests it carries', async () => {
  const { markers } = await import('./expect-fail.mjs');
  const owners = JSON.parse(readFileSync(new URL('./plan/pp-c-owners.json', import.meta.url), 'utf8'));
  const { matches } = await import('./plan/owners.mjs');
  assert.deepEqual(PF_FILES, ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => `consortium-pf-${x}.browser.test.mjs`));
  const marked = markers().filter((m) => /^browser\/consortium-pf-[a-f]\./.test(m.file));
  for (const file of PF_FILES) {
    const stream = `pf-${file.match(/^consortium-pf-([a-f])\./)[1]}`;
    const text = read(file);
    assert.ok(owners.chunks.some((c) => c.streams[stream]?.files.some((p) => matches(p, `scripts/browser/${file}`))), `the owners file gives ${file} to ${stream}`);
    const tests = testsOf(text);
    assert.ok(tests.length >= (CHUNK_3_OPEN.has(stream) ? 1 : 5), `${file} has its board cases`);
    for (const { title, marked: isMarked } of tests) {
      const owner = title.match(/^(?:PF[A-F]\d+[a-z]?|F1a-[A-Z]\d+ → PP-C) \((pf-[a-f])\b/)?.[1];
      assert.equal(owner, stream, `${file}: "${title}" names ${stream}: PF<X><n> (${stream} …)`);
      if (isMarked) assert.ok(marked.some((m) => m.title === title && m.owner === owner), `"${title}": its marker names ${owner}`);
    }
    const head = text.slice(0, text.search(/^import /m));
    assert.match(head, /carries /, `${file}: the ledger of the old tests it carries is in its head`);
  }
});
