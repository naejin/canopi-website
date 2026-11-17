// scripts/expect-fail.mjs: a marked test passes only while it fails for its stated reason, turns red
// when it passes or fails for another reason, and the marker list finds every marker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markers } from './expect-fail.mjs';

const helper = new URL('./expect-fail.mjs', import.meta.url).href;
// A one-test file using the marker (written with FAILING so this file's own marker scan skips it).
function runMarked(t, body, reason = '/module missing/', extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'expect-fail-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'sample.test.mjs');
  writeFileSync(file, `import { failing } from ${JSON.stringify(helper)};\nFAILING('X-1 (K9 sample)', { owner: 'K9', reason: ${reason} }, async () => { ${body} });\n`.replace('FAILING', 'failing'));
  // Run as a plain script, outside this runner's context (a nested --test run is skipped).
  const env = { ...process.env, ...extraEnv };
  delete env.NODE_TEST_CONTEXT;
  if (!('CANOPI_ZERO_MARKERS' in extraEnv)) delete env.CANOPI_ZERO_MARKERS;
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 30_000, env });
  return { status: r.status, out: r.stdout + r.stderr };
}

test('a marked test passes while it fails for its stated reason', (t) => {
  const r = runMarked(t, "throw new Error('module missing: rules/list-query.ts');");
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /expected failure \(owner K9\)/);
});

// PP-C commit 0 (design check c2 5.3): with CANOPI_ZERO_MARKERS=1 (a master push, CI on master) a
// marker fails its file whatever its quotes, even one failing for its stated reason.
test('with CANOPI_ZERO_MARKERS=1 a marker fails its file, even while it fails for its stated reason', (t) => {
  const r = runMarked(t, "throw new Error('module missing: rules/list-query.ts');", '/module missing/', { CANOPI_ZERO_MARKERS: '1' });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /an expected-fail marker is left \(owner K9\), and CANOPI_ZERO_MARKERS=1 takes none/);
});

test('a marked test that passes fails, asking its owner to remove the marker', (t) => {
  const r = runMarked(t, '/* passes now */');
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /now passes: remove the marker \(owner K9\)/);
});

test('a marked test failing for another reason (a harness error) fails, naming both', (t) => {
  const r = runMarked(t, "throw new Error('wrangler dev exited (1)');");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /fails for another reason than the marker's \/module missing\/ \(owner K9\): wrangler dev exited/);
});

test('the marker needs an owner named in the title and a RegExp reason', async () => {
  const { failing } = await import('./expect-fail.mjs');
  assert.throws(() => failing('X-2 (K9 sample)', { reason: /x/ }, () => {}), /name the owner stream/);
  assert.throws(() => failing('X-2 (K9 sample)', { owner: 'K9', reason: 'x' }, () => {}), /reason must be a RegExp/);
  assert.throws(() => failing('X-2 sample', { owner: 'K9', reason: /x/ }, () => {}), /the title names its owner K9/);
});

test('review c0-1: the argument checks run before the zero-markers throw, so this file passes on a master push', async () => {
  const { failing } = await import('./expect-fail.mjs');
  const before = process.env.CANOPI_ZERO_MARKERS;
  process.env.CANOPI_ZERO_MARKERS = '1';
  try {
    assert.throws(() => failing('X-2 (K9 sample)', { reason: /x/ }, () => {}), /name the owner stream/);
    assert.throws(() => failing('X-2 (K9 sample)', { owner: 'K9', reason: 'x' }, () => {}), /reason must be a RegExp/);
    assert.throws(() => failing('X-2 (K9 sample)', { owner: 'K9', reason: /x/ }, () => {}), /CANOPI_ZERO_MARKERS=1 takes none/);
  } finally {
    if (before === undefined) delete process.env.CANOPI_ZERO_MARKERS; else process.env.CANOPI_ZERO_MARKERS = before;
  }
});

test('the marker list finds each marker with its file and owner', () => {
  const list = markers();
  for (const m of list) {
    assert.ok(m.title.includes(m.owner), `${m.file}: "${m.title}" names ${m.owner}`);
    assert.ok(/\.test\.mjs$/.test(m.file), m.file);
  }
  assert.ok(!list.some((m) => m.file === 'expect-fail.test.mjs'), 'samples written here are not markers');
});
