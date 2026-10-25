// The test tooling itself: every package a test imports is declared in package.json, and the test
// command loads the TypeScript data files on the oldest Node that "engines" allows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const scripts = new URL('.', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);

test('every package a test or check script imports is declared in package.json', () => {
  const files = readdirSync(scripts).filter((f) => f.endsWith('.mjs'));
  for (const file of files) {
    const text = readFileSync(join(scripts, file), 'utf8');
    for (const [, spec] of text.matchAll(/(?:^|\n)\s*import\s[^'"]*?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      if (!spec || spec.startsWith('.') || spec.startsWith('node:') || builtinModules.includes(spec)) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      assert.ok(declared.has(name), `scripts/${file} imports "${name}", which package.json does not declare`);
    }
  }
});

test('the test command can load .ts files on the oldest Node that engines allows', () => {
  const floor = pkg.engines.node.match(/>=\s*(\d+)\.(\d+)/).slice(1).map(Number);
  // Node strips TypeScript types without a flag from 22.18 (and 23.6); before that it needs one.
  const stripsByDefault = floor[0] > 23 || (floor[0] === 23 && floor[1] >= 6) || (floor[0] === 22 && floor[1] >= 18);
  const usesTs = readdirSync(scripts).some((f) => f.endsWith('.test.mjs') && /import\(['"][^'"]+\.ts['"]\)|from ['"][^'"]+\.ts['"]/.test(readFileSync(join(scripts, f), 'utf8')));
  if (usesTs && !stripsByDefault) assert.match(pkg.scripts.test, /--experimental-strip-types/, `engines allows Node ${floor.join('.')}, which needs --experimental-strip-types to import .ts`);
});
