/** @jsxImportSource preact */
// What the page shows after the matrix (§8: the first run carries the matrix only). It is one chunk,
// views/later.ts; prefetchLater() loads it once the matrix is drawn (ct:matrix), so a tab, Share or
// Print is at hand by the time the reader gets to it, and the matrix never waits for it. A view still
// loading shows the loading line (F5); one that fails to load says so with Reload, as a sheet does
// (views/Details.tsx). A quiet part (the print sheet, hidden on screen) shows neither: Print says it.
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { T } from '../strings.ts';
import { hookOn, testFault } from '../test-hook.ts';

// Browser-test builds only: the chunk fails, or waits until the test releases it (test-hook.ts).
async function gate(): Promise<void> {
  if (!hookOn) return;
  if (testFault.later === 'fail') throw new Error('test fault: the chunk did not load');
  if (testFault.later === 'hold') await testFault.release;
}

type Any = ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export interface LazyPart<C extends Any> { View: C; load: () => Promise<C>; ready: () => C | null }

export function lazyPart<C extends Any>(importer: () => Promise<C>, { quiet = false } = {}): LazyPart<C> {
  const done = signal<C | null>(null);
  let pending: Promise<C> | null = null;
  const load = (): Promise<C> => {
    pending ??= gate().then(importer).then((c) => { done.value = c; return c; }, (err: unknown) => { pending = null; throw err; });
    return pending;
  };
  function LazyView(props: Record<string, unknown>) {
    const [failed, setFailed] = useState(false);
    const C = done.value as ComponentType<Record<string, unknown>> | null;
    useEffect(() => { if (!C) load().catch((err: unknown) => { console.error(`Consortium: a view did not load: ${(err as Error).message}`); setFailed(true); }); }, [C]);
    if (C) return <C {...props} />;
    if (quiet) return null;
    return failed
      ? <p class="ct-notice" role="alert">{T('details.loadFailed')} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('details.reload')}</button></p>
      : <p class="status-line" role="status">{T('load.plants')}</p>;
  }
  return { View: LazyView as unknown as C, load, ready: () => done.peek() };
}

const loaders: (() => Promise<unknown>)[] = [];
export function later<C extends Any>(importer: () => Promise<C>, opts: { quiet?: boolean } = {}): LazyPart<C> {
  const part = lazyPart(importer, opts);
  loaders.push(part.load);
  return part;
}
// A module that is not a view (the .canopi writer): loaded once, prefetched with the views.
export function laterModule<M>(importer: () => Promise<M>): () => Promise<M> {
  let pending: Promise<M> | null = null;
  const load = (): Promise<M> => (pending ??= gate().then(importer).catch((err: unknown) => { pending = null; throw err; }));
  loaders.push(load);
  return load;
}

// Once, after the matrix is drawn: every later part, in the browser's idle time.
let started = false;
export function prefetchLater(): void {
  if (started) return;
  started = true;
  const run = () => { for (const load of loaders) load().catch(() => {}); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 0);
}
