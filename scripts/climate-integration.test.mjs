// The Astro integration that installs the climate tiles (scripts/climate-integration.mjs): a build
// waits for the install and fails with it; dev installs and only warns; other commands do nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { climateTiles } from './climate-integration.mjs';

function run(command, ensure) {
  const logs = { info: [], warn: [] };
  const logger = { info: (m) => logs.info.push(m), warn: (m) => logs.warn.push(m) };
  const hook = climateTiles({ ensure }).hooks['astro:config:setup'];
  return { logs, done: hook({ command, logger }) };
}

test('astro build installs the tiles first and fails when the install fails', async () => {
  let calls = 0;
  const ok = run('build', async ({ log, allowDownload }) => { calls++; assert.notEqual(allowDownload, false); log('Installed'); log('warning: unchecked'); return { action: 'installed' }; });
  await ok.done;
  assert.equal(calls, 1);
  assert.deepEqual(ok.logs, { info: ['Installed'], warn: ['unchecked'] });
  const bad = run('build', async () => { throw new Error('Climate grid refused: the download failed.'); });
  await assert.rejects(bad.done, /download failed/);
});

test('astro dev installs once and only warns on failure; sync and preview do nothing', async () => {
  const bad = run('dev', async () => { throw new Error('Climate grid refused: offline.'); });
  await bad.done;
  assert.match(bad.logs.warn[0], /offline\. The dev server runs without climate tiles: set CANOPI_CLIMATE_ARCHIVE/);
  const seen = [];
  await run('dev', async (opts) => { seen.push(opts.allowDownload); }).done;
  assert.deepEqual(seen, [false], 'dev never downloads');
  for (const command of ['sync', 'preview']) await run(command, async () => { throw new Error(`called for ${command}`); }).done;
});

test('astro.config.mjs uses the integration, and the build script is plain astro build', () => {
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /import \{ climateTiles \} from '\.\/scripts\/climate-integration\.mjs';/);
  assert.match(config, /integrations: \[climateTiles\(\), /);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.build, 'astro build');
  assert.match(pkg.scripts['install:climate'], /scripts\/install-climate\.mjs$/);
});
