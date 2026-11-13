// scripts/quality/ratchet.mjs: rows R1-R6 of design check E6 §4.3 on hand-made reports, then each
// real tool once against its committed baseline (the tools are pinned; a drift is a regenerated baseline).
// Run capped: timeout 120 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 node --test 'scripts/quality/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { archKeys, assertScanned, compare, compareCounts, cycleKey, deadKeys, dupKeys, modulePart, verdict } from './ratchet.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const run = { tool: 'dup', errors: [], seconds: 1, budget: 4 };

test('R1: a new key warns locally and fails in CI, naming the key', () => {
  const { added, removed } = compare(['a', 'b'], ['a', 'b', 'c']);
  assert.deepEqual({ added, removed }, { added: ['c'], removed: [] });
  const local = verdict({ ...run, added, removed, ci: false });
  assert.equal(local.fail, false);
  assert.ok(local.lines.some((l) => l.startsWith('WARN') && l.includes('fails in CI')));
  assert.ok(local.lines.includes('  + c'));
  const ci = verdict({ ...run, added, removed, ci: true });
  assert.equal(ci.fail, true);
  assert.ok(ci.lines.includes('  + c'));
});

test('R2: a key gone warns "baseline stale" and never fails, in CI too', () => {
  const { added, removed } = compare(['a', 'b'], ['a']);
  const v = verdict({ ...run, added, removed, ci: true });
  assert.equal(v.fail, false);
  assert.ok(v.lines.some((l) => l.includes('baseline stale')));
  assert.ok(v.lines.includes('  - b'));
});

test('arch: an error-rule violation fails everywhere; warn rules are keys', () => {
  const report = {
    summary: {
      totalCruised: 3,
      violations: [
        { rule: { name: 'L3-data-down', severity: 'error' }, from: 'x', to: 'y' },
        { rule: { name: 'L8-test-hook-entry-only', severity: 'warn' }, from: 'a', to: 'h' },
        { rule: { name: 'L7-no-circular', severity: 'warn' }, from: 'b', to: 'c', cycle: [{ name: 'c' }, { name: 'a' }, { name: 'b' }] },
        { rule: { name: 'L7-no-circular', severity: 'warn' }, from: 'a', to: 'b', cycle: [{ name: 'b' }, { name: 'c' }, { name: 'a' }] },
      ],
    },
  };
  const found = archKeys(report);
  assert.deepEqual(found.errors, ['L3-data-down|x|y']);
  assert.deepEqual(found.keys, ['L7-no-circular|a > b > c > a', 'L8-test-hook-entry-only|a|h'], 'one cycle reported from two members is one key');
  const v = verdict({ ...run, tool: 'arch', added: [], removed: [], errors: found.errors, ci: false });
  assert.equal(v.fail, true);
});

test('arch keys name a package, not its resolved path: a symlinked node_modules keeps the known key', () => {
  const l1 = (to) => archKeys({ summary: { totalCruised: 1, violations: [{ rule: { name: 'L1-lib-no-ui', severity: 'warn' }, from: 'src/lib/location/place-search.ts', to }] } }).keys;
  const known = l1('node_modules/@preact/signals/dist/signals.d.ts');
  assert.deepEqual(known, ['L1-lib-no-ui|src/lib/location/place-search.ts|@preact/signals']);
  assert.deepEqual(l1('../../../../home/u/checkout/node_modules/@preact/signals/dist/signals.d.ts'), known);
  assert.deepEqual(compare(known, l1('../../wt/node_modules/.pnpm/x/node_modules/@preact/signals/src/index.ts')).added, []);
  assert.equal(modulePart('node_modules/preact/hooks/src/index.d.ts'), 'preact');
  assert.equal(modulePart('src/islands/consortium/store.ts'), 'src/islands/consortium/store.ts');
});

test('cycle keys rotate to the smallest module and keep direction', () => {
  assert.equal(cycleKey(['m', 'z', 'b', 'm']), 'b > m > z > b');
  assert.equal(cycleKey(['m', 'b', 'z']), 'b > z > m > b');
});

test('dup keys: a line shift or an edit inside a known clone keeps the key; a new clone of the pair adds one', () => {
  const clone = (a, b, s1, s2, lines = 6) => ({ firstFile: { name: `${ROOT}${a}`, start: s1, end: s1 + lines }, secondFile: { name: `${ROOT}${b}`, start: s2, end: s2 + lines }, lines });
  const before = dupKeys({ statistics: { total: { sources: 2 } }, duplicates: [clone('src/b.ts', 'src/a.ts', 10, 40)] });
  assert.deepEqual(before.keys, ['src/a.ts <> src/b.ts (1)']);
  assert.deepEqual(before.detail['src/a.ts <> src/b.ts'], ['src/a.ts:40-46 = src/b.ts:10-16 (6 lines)']);
  const shifted = dupKeys({ statistics: { total: { sources: 2 } }, duplicates: [clone('src/a.ts', 'src/b.ts', 52, 10, 8)] });
  assert.deepEqual(shifted.keys, before.keys);
  const more = dupKeys({ statistics: { total: { sources: 2 } }, duplicates: [clone('src/a.ts', 'src/b.ts', 52, 10), clone('src/a.ts', 'src/b.ts', 90, 70)] });
  assert.deepEqual(compare(before.keys, more.keys).added, ['src/a.ts <> src/b.ts (2)']);
});

test('dead keys: type, file and symbol, members under their parent', () => {
  const found = deadKeys({ processed: 9, issues: [
    { type: 'exports', file: 'src/x.ts', symbol: 'unused', parent: null },
    { type: 'enumMembers', file: 'src/x.ts', symbol: 'B', parent: 'E' },
    { type: 'devDependencies', file: 'package.json', symbol: 'parse5', parent: null },
  ] });
  assert.equal(found.scanned, 9);
  assert.deepEqual(found.keys, ['devDependencies|package.json|parse5', 'enumMembers|src/x.ts|E.B', 'exports|src/x.ts|unused']);
});

test('R4: an empty scan or a missing count fails, never a silent pass', () => {
  assert.throws(() => assertScanned({ scanned: 0, keys: [] }, 'jscpd'), /scanned no files/);
  assert.throws(() => assertScanned(undefined, 'knip'), /scanned no files/);
  assert.throws(() => assertScanned(dupKeys({ duplicates: [] }), 'jscpd'), /scanned no files/);
  assert.throws(() => assertScanned(archKeys({}), 'dependency-cruiser'), /scanned no files/);
  assert.equal(assertScanned({ scanned: 1, keys: [] }, 'knip').scanned, 1);
});

test('R8: axe counts by page and rule: a new rule id or a higher count rises; lower or gone is stale', () => {
  const base = { 'home|color-contrast': 3, 'guide|region': 1 };
  assert.deepEqual(compareCounts(base, { 'home|color-contrast': 3, 'guide|region': 1 }), { rises: [], stale: [] });
  assert.deepEqual(compareCounts(base, { 'home|color-contrast': 4, 'guide|region': 1, 'home|label': 1 }), { rises: ['home|color-contrast: 3 → 4', 'home|label: 0 → 1'], stale: [] });
  assert.deepEqual(compareCounts(base, { 'home|color-contrast': 2 }), { rises: [], stale: ['guide|region: 1 → 0', 'home|color-contrast: 3 → 2'] });
});

test('R6/R10: over the time budget warns, never fails', () => {
  const v = verdict({ ...run, added: [], removed: [], seconds: 9, budget: 4, ci: true });
  assert.equal(v.fail, false);
  assert.ok(v.lines.some((l) => l.startsWith('WARN') && l.includes('over budget')));
});

test('R5 and the real tools: each baseline names its pinned version and the tree matches its baseline', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  for (const [name, dep] of [['arch', 'dependency-cruiser'], ['dup', 'jscpd'], ['dead', 'knip']]) {
    const baseline = JSON.parse(readFileSync(new URL(`./baselines/${name}.json`, import.meta.url), 'utf8'));
    assert.equal(baseline.tool, dep);
    assert.equal(baseline.version, pkg.devDependencies[dep], `${name}: baseline version is the exact pin`);
    assert.deepEqual(baseline.keys, [...baseline.keys].sort(), `${name}: keys sorted`);
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./ratchet.mjs', import.meta.url)), name], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '' } });
    assert.equal(r.status, 0, `${name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, new RegExp(`^${name}: ok, ${dep} `, 'm'));
  }
});
