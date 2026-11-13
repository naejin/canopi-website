// ast-grep rules (sgconfig.yml): the snippets in rule-tests/ prove each rule's pattern (`ast-grep test`);
// this file proves the file scopes and the owner exemption, which snippet tests cannot see. It plants a
// small tree in a temporary directory with a copy of the rules, scans it, and scans the real tree.
// Run: node --test scripts/quality/ast-grep/rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const bin = join(root, 'node_modules/.bin/ast-grep');

function scan(cwd) {
  const r = spawnSync(bin, ['scan', '--json=compact'], { cwd, encoding: 'utf8' });
  assert.equal(r.error, undefined, `ast-grep did not run: ${r.error}`);
  const hits = JSON.parse(r.stdout || '[]');
  return { status: r.status, files: [...new Set(hits.map((h) => h.file))].sort(), rules: [...new Set(hits.map((h) => h.ruleId))].sort() };
}

function planted(files) {
  const dir = mkdtempSync(join(tmpdir(), 'canopi-sg-'));
  cpSync(join(root, 'sgconfig.yml'), join(dir, 'sgconfig.yml'));
  cpSync(join(root, 'scripts/quality/ast-grep'), join(dir, 'scripts/quality/ast-grep'), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const formatter = "export const f = new Intl.NumberFormat('fr');\n";

test('the real tree passes every ast-grep rule', () => {
  const r = scan(root);
  assert.deepEqual(r.files, [], `findings: ${r.files.join(', ')}`);
  assert.equal(r.status, 0);
});

test('every rule snippet test passes (ast-grep test)', () => {
  const r = spawnSync(bin, ['test', '--skip-snapshot-tests'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('number-format-only-in-format: a second formatter in the consortium or src/lib fails, the owner and the rest of the site pass', () => {
  const dir = planted({
    'src/islands/consortium/views/Planted.tsx': `export const P = (n: number) => <b>{new Intl.NumberFormat('fr').format(n)}</b>;\n`,
    'src/islands/consortium/state/planted.ts': "export const make = (l: string) => Intl.NumberFormat(l);\n",
    'src/lib/consortium/planted.ts': formatter,
    'src/lib/planted.mjs': formatter,
    'src/islands/consortium/format.ts': formatter,
    'src/scripts/home.js': formatter,
    'src/components/planted.ts': formatter,
  });
  try {
    const r = scan(dir);
    assert.notEqual(r.status, 0, 'a planted violation must fail the scan');
    assert.deepEqual(r.files, [
      'src/islands/consortium/state/planted.ts',
      'src/islands/consortium/views/Planted.tsx',
      'src/lib/consortium/planted.ts',
      'src/lib/planted.mjs',
    ]);
    assert.deepEqual(r.rules, [
      'number-format-only-in-format.javascript',
      'number-format-only-in-format.tsx',
      'number-format-only-in-format.typescript',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
