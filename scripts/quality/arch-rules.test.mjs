// The layer rules L1-L9 of .dependency-cruiser.cjs, run on a fixture tree with one breach per rule and
// one allowed neighbour per rule, plus the edge shapes probe P-E4a found (design check E6 §7.2, A24, R7):
// `import('./x.ts') as T` must stay an edge, a file holding both `typeof import('x')` and `import('x')`
// must keep the runtime edge, and a type-only back edge must not close a cycle.
// Run capped: timeout 120 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 node --test 'scripts/quality/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archKeys } from './ratchet.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const FILES = {
  'tsconfig.json': JSON.stringify({ compilerOptions: { allowImportingTsExtensions: true, noEmit: true, jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler' } }),
  // P-E4a: static edge, type-only back edge (no cycle)
  'src/lib/consortium/a.ts': "import { b } from './b.ts';\nexport const a = b;\n",
  'src/lib/consortium/b.ts': "import type { a } from './a.ts';\nexport const b = 1;\nexport type A = typeof a;\n",
  // P-E4a: a dynamic import with a cast closes a cycle (C4 shape)
  'src/lib/consortium/c.ts': "const load = () => import('./d.ts') as Promise<unknown>;\nexport const c = load;\n",
  'src/lib/consortium/d.ts': "import { c } from './c.ts';\nexport const d = c;\n",
  // P-E4a: typeof import + import of the same file merge into one edge that must count
  'src/lib/consortium/e.ts': "type F = typeof import('./f.ts');\nexport const e = (): Promise<F> => import('./f.ts');\n",
  'src/lib/consortium/f.ts': "import { e } from './e.ts';\nexport const f = e;\n",
  // L1
  'src/lib/location/p.ts': "import { signal } from '@preact/signals';\nexport const p = signal(0);\n",
  'src/lib/climate/q.ts': "import { b } from '../consortium/b.ts';\nexport const q = b;\n",
  // L2 (dynamic counts), allowed: store → data
  'src/islands/consortium/store.ts': "import { y } from './data/y.ts';\nexport const s = () => import('./views/v.tsx');\nexport const sy = y;\n",
  // L3
  'src/islands/consortium/data/x.ts': "import { s } from '../store.ts';\nexport const x = s;\n",
  'src/islands/consortium/data/y.ts': "import { a } from '../../../lib/consortium/a.ts';\nexport const y = a;\n",
  // L4, allowed: index.ts
  'src/islands/consortium/views/v.tsx': "import { a } from '../../../lib/consortium/a.ts';\nimport { i } from '../../../lib/consortium/index.ts';\nexport const v = [a, i];\n",
  'src/lib/consortium/index.ts': 'export const i = 1;\n',
  // L5, allowed: kit → kit, kit → strings
  'src/islands/consortium/views/kit/k.ts': "import { v } from '../v.tsx';\nimport { k2 } from './k2.ts';\nimport { str } from '../../strings.ts';\nexport const k = [v, k2, str];\n",
  'src/islands/consortium/views/kit/k2.ts': 'export const k2 = 1;\n',
  'src/islands/consortium/strings.ts': 'export const str = 1;\n',
  // L6: Other static (breach), Sheets dynamic (allowed), Sheets2 is not Sheets (breach)
  'src/islands/consortium/views/details/D.tsx': "import { d2 } from './d2.ts';\nexport const D = d2;\n",
  'src/islands/consortium/views/details/d2.ts': 'export const d2 = 1;\n',
  'src/islands/consortium/views/Other.tsx': "import { D } from './details/D.tsx';\nexport const o = D;\n",
  'src/islands/consortium/views/Sheets.tsx': "export const load = () => import('./details/D.tsx');\n",
  // L8, allowed: main.ts
  'src/islands/consortium/test-hook.ts': 'export const hook = 1;\n',
  'src/islands/consortium/views/lazy.tsx': "import { hook } from '../test-hook.ts';\nexport const l = hook;\n",
  'src/islands/consortium/main.ts': "import { hook } from './test-hook.ts';\nexport const m = hook;\n",
  // L9
  'src/pages/z.ts': "import { tool } from '../../scripts/tool.mjs';\nexport const z = tool;\n",
  'scripts/tool.mjs': 'export const tool = 1;\n',
};

test('dependency-cruiser rules L1-L9 catch one breach each, allow their neighbours, and see the P-E4a edge shapes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arch-rules-'));
  try {
    for (const [path, text] of Object.entries(FILES)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
    const out = join(dir, 'out.json');
    const r = spawnSync(join(ROOT, 'node_modules/.bin/depcruise'), ['--config', join(ROOT, '.dependency-cruiser.cjs'), '--output-type', 'json', '--output-to', out, 'src'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.error, undefined);
    const { scanned, errors, keys } = archKeys(JSON.parse(readFileSync(out, 'utf8')));
    assert.ok(scanned >= Object.keys(FILES).length - 2, `scanned ${scanned}`);
    const I = 'src/islands/consortium';
    assert.deepEqual(errors, [
      'L1-lib-no-ui|src/lib/location/p.ts|@preact/signals',
      `L3-data-down|${I}/data/x.ts|${I}/store.ts`,
      `L4-views-core-entry|${I}/views/v.tsx|src/lib/consortium/a.ts`,
      'L9-no-build-scripts-in-src|src/pages/z.ts|scripts/tool.mjs',
    ]);
    assert.ok(scanned < 100, `scanned ${scanned}: the symlinked node_modules is not walked`);
    assert.deepEqual(keys, [
      `L2-state-no-views|${I}/store.ts|${I}/views/v.tsx`,
      `L5-kit-leaf|${I}/views/kit/k.ts|${I}/views/v.tsx`,
      `L6-sheets-not-details|${I}/views/Other.tsx|${I}/views/details/D.tsx`,
      'L7-no-circular|src/lib/consortium/c.ts > src/lib/consortium/d.ts > src/lib/consortium/c.ts',
      'L7-no-circular|src/lib/consortium/e.ts > src/lib/consortium/f.ts > src/lib/consortium/e.ts',
      `L8-test-hook-entry-only|${I}/views/lazy.tsx|${I}/test-hook.ts`,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
