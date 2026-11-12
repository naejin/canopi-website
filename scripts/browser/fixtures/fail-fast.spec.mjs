// The harness fails fast once wrangler or Chrome is gone (E1 design check A10, failure rows F4,
// F5), run by the self-check in consortium-commit0. Each test prints what it saw; the self-check
// reads the output. Outside the browser test glob.
import test from 'node:test';
import assert from 'node:assert/strict';
import { h, useHarness } from '../helpers.mjs';

useHarness();

const timed = async (fn) => { const t0 = Date.now(); try { await fn(); return { error: null, ms: Date.now() - t0 }; } catch (err) { return { error: err.message, ms: Date.now() - t0 }; } };

test('wrangler dev killed: the next page fails at once, naming it', async () => {
  await h.open('/consortium/', { data: 'fixture' });
  process.kill(-h.site.pid, 'SIGKILL');
  for (let i = 0; i < 50 && !h.site.exited(); i++) await new Promise((r) => setTimeout(r, 100));
  const { error, ms } = await timed(() => h.open('/consortium/'));
  console.log(`fail-fast wrangler: ${error} in ${ms} ms`);
  assert.match(error ?? '', /^wrangler dev exited/);
  assert.ok(ms < 1000);
});

test('Chrome killed: the next page fails at once, naming it', async () => {
  h.browser.process().kill('SIGKILL');
  for (let i = 0; i < 50 && h.browser.connected; i++) await new Promise((r) => setTimeout(r, 100));
  const { error, ms } = await timed(() => h.open('/consortium/'));
  console.log(`fail-fast chrome: ${error} in ${ms} ms`);
  assert.match(error ?? '', /Chrome exited/);
  assert.ok(ms < 1000);
});
