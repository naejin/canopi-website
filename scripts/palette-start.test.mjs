// E6 S3 (entry lifecycle): importing the island's state starts nothing. store.ts and state/* register
// no effect and touch no localStorage when imported; main.ts calls store.start(), which
// registers store.ts's effects, in the order they ran when they were module-level (the verdict
// rule's load, the Undo offer's end).
// The effects are counted by redirecting the island's `@preact/signals` import to a wrapper that
// records each effect() call (a module resolve hook; @preact/signals' own internal effect is not
// counted). Node runs each test file in its own process, so the hook reaches this file only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';

const island = new URL('../src/islands/palette/', import.meta.url);
const real = import.meta.resolve('@preact/signals');
const wrapper = `data:text/javascript,${encodeURIComponent(`export * from ${JSON.stringify(real)};
import { effect as real } from ${JSON.stringify(real)};
export function effect(...args) { (globalThis.__ctEffects ??= []).push(new Error().stack); return real(...args); }`)}`;
const hooks = `export async function resolve(spec, ctx, next) {
  if (spec === '@preact/signals' && ctx.parentURL?.startsWith(${JSON.stringify(new URL('../src/', import.meta.url).href)})) return { url: ${JSON.stringify(wrapper)}, shortCircuit: true };
  return next(spec, ctx);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);

// Every touch of localStorage (a read of the global itself) is recorded.
const touches = [];
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { touches.push(new Error().stack); return undefined; } });

const effects = () => (globalThis.__ctEffects ??= []);
const state = readdirSync(new URL('state/', island)).filter((f) => f.endsWith('.ts')).sort();

test('importing store.ts and every state/* module registers no effect and touches no localStorage', async () => {
  assert.ok(state.length >= 8, `the state modules are found (${state.join(', ')})`);
  const store = await import(new URL('store.ts', island).href);
  for (const f of state) await import(new URL(`state/${f}`, island).href);
  assert.deepEqual(effects(), [], 'no effect runs because a module was imported');
  assert.deepEqual(touches, [], 'no localStorage read at import');
  assert.equal(typeof store.start, 'function', 'store.ts exports start (main.ts calls it before the first render)');
});

test('store.start registers store.ts\'s Undo offer effect once', async () => {
  const store = await import(new URL('store.ts', island).href);
  const before = effects().length;
  store.start();
  const made = effects().slice(before);
  assert.equal(made.length, 1, 'the Undo offer effect');
  const lines = made.map((s) => Number(/store\.ts:(\d+)/.exec(s)?.[1]));
  const src = readFileSync(new URL('store.ts', island), 'utf8').split('\n');
  const at = (re) => src.findIndex((l) => re.test(l)) + 1;
  const bodies = [at(/const now = state\.track\(SNAP_KEYS\);/)];
  assert.ok(bodies.every((n) => n > 0), 'the Undo effect body is found');
  assert.deepEqual(lines, bodies.map((n) => n - 1), 'registered at the Undo effect line');
  assert.deepEqual(touches, [], 'starting the effects reads no localStorage');
});

test('a second store.start registers no effect again (each would run its load and the Undo end twice)', async () => {
  const store = await import(new URL('store.ts', island).href);
  store.start(); // a no-op or the first start, whichever test ran first
  const before = effects().length;
  store.start();
  assert.equal(effects().length, before, 'start() is guarded: called once');
});
