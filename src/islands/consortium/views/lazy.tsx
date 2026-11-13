/** @jsxImportSource preact */
// The island's one lazy loader (E6 design check A6, §7.1): every part outside the first run is a
// lazyPart: the views after the matrix (one chunk, views/later.ts), the sheets (views/Sheets.tsx: the
// plant dialog, Swap, Add, Paste; the dialog's correction form) and the slots' feature chunks.
// prefetchLater() loads every part registered with later() once, in the browser's idle time, on the
// first of: the consortium first on screen (Matrix, ct:matrix) or the data ready (store.load =
// ready), so a reader who stays on Start has Search and Paste at hand too, and nothing lazy competes
// with the database download. A part used before its prefetch finished loads on demand through the
// same promise (one request per chunk); a failed load clears it, so the next use asks again (L4).
//
// While loading, a part shows its loading line (F5; a sheet its frame, views/Sheets.tsx); one that
// fails says so with Reload, in place (a view), or, onFail 'closeSheet' (a sheet part), by closing
// the sheet with the toast and Reload (L1, L7). A part no longer on screen when its chunk fails writes
// nothing (L6); its chunk, once here, is kept for the next use. A quiet part (the print sheet, hidden
// on screen) shows neither: Print says it. An idle part never asks for its chunk itself and shows
// nothing until the prefetch has loaded it (a slot beside the matrix must not start a download).
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { effect, signal } from '@preact/signals';
import { closeSheet, load as dataLoad, showToast } from '../store.ts';
import { T } from '../strings.ts';
// Installs the browser-test hook until main.ts imports it (stream S3, A13: `if (__CT_TEST_HOOK__)
// await import('./test-hook.ts')`); the chunk-3 merge drops this line. Nothing here reads it.
import '../test-hook.ts';

type Kind = 'sheets' | 'later';
// Browser-test builds only (A13): a part's chunk fails, or waits until the test releases it
// (globalThis.__ctFaults, written by test-hook.ts; `sheets` for sheet parts, `later` for the others).
// Read when a part is used, not when it is fetched, so a part the prefetch already loaded still fails
// or waits as if its chunk had not come.
function faultOf(kind: Kind): 'fail' | 'hold' | null {
  if (!__CT_TEST_HOOK__) return null;
  const f = globalThis.__ctFaults;
  return kind === 'sheets' ? (f?.sheets ? 'fail' : null) : (f?.later ?? null);
}
async function gate(kind: Kind): Promise<void> {
  if (!__CT_TEST_HOOK__) return;
  const f = faultOf(kind);
  if (f === 'fail') throw new Error('test fault: the chunk did not load');
  if (f === 'hold') await globalThis.__ctFaults?.release;
}

type Any = ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type PropsOf<C> = C extends ComponentType<infer P> ? P : never;
// View: the part on screen; load: the part's chunk, for a use outside a view (Print); ready: the
// part if it is here; prefetch: its chunk, with no test fault (prefetchLater).
export interface LazyPart<C extends Any> { View: C; load: () => Promise<C>; ready: () => C | null; prefetch: () => Promise<C> }
export interface PartOptions<C extends Any> {
  quiet?: boolean;
  idle?: boolean;
  // notice: the part says it could not load, in place, with Reload; closeSheet: a sheet part.
  onFail?: 'notice' | 'closeSheet';
  // What shows while the chunk loads (default: the loading line); it gets the part's props.
  loading?: ComponentType<PropsOf<C>>;
}

export function lazyPart<C extends Any>(importer: () => Promise<C>, { quiet = false, idle = false, onFail = 'notice', loading }: PartOptions<C> = {}): LazyPart<C> {
  const kind: Kind = onFail === 'closeSheet' ? 'sheets' : 'later';
  const done = signal<C | null>(null);
  let pending: Promise<C> | null = null;
  const prefetch = (): Promise<C> => {
    pending ??= importer().then((c) => { done.value = c; return c; }, (err: unknown) => { pending = null; throw err; });
    return pending;
  };
  const load = (): Promise<C> => gate(kind).then(prefetch);
  function LazyView(props: Record<string, unknown>) {
    const [failed, setFailed] = useState(false);
    const [, wake] = useState(0);
    const fault = faultOf(kind);
    const C = (fault ? null : done.value) as ComponentType<Record<string, unknown>> | null;
    useEffect(() => {
      if (C) return;
      let live = true;
      if (idle) {
        // An idle part waits for the prefetch (done), or, held by a test, for the release.
        if (fault === 'hold') gate(kind).then(() => { if (live) wake((n) => n + 1); }, () => {});
        return () => { live = false; };
      }
      load().then(() => { if (live) wake((n) => n + 1); }, (err: unknown) => {
        console.error(`Consortium: a part did not load: ${(err as Error).message}`);
        if (!live) return;
        if (onFail === 'closeSheet') {
          closeSheet();
          showToast(T('details.loadFailed'), null, { label: T('details.reload'), run: () => location.reload() });
        } else setFailed(true);
      });
      return () => { live = false; };
    }, [C]);
    if (C) return <C {...props} />;
    if (quiet || idle) return null;
    if (failed) return <p class="ct-notice" role="alert">{T('details.loadFailed')} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('details.reload')}</button></p>;
    if (loading) { const Loading = loading as ComponentType<Record<string, unknown>>; return <Loading {...props} />; }
    return <p class="status-line" role="status">{T(onFail === 'closeSheet' ? 'details.loading' : 'load.plants')}</p>;
  }
  return { View: LazyView as unknown as C, load, ready: () => (faultOf(kind) ? null : done.peek()), prefetch };
}

// What prefetchLater() loads: each registered part's chunk.
const loaders: (() => Promise<unknown>)[] = [];
const whenIdle = (run: () => void) => { if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 0); };
let started = false;
function register(fetch: () => Promise<unknown>): void {
  loaders.push(fetch);
  // A part registered once the prefetch ran (the correction form, in the dialog's chunk) follows it.
  if (started) whenIdle(() => { fetch().catch(() => {}); });
}
export function later<C extends Any>(importer: () => Promise<C>, opts: PartOptions<C> = {}): LazyPart<C> {
  const part = lazyPart(importer, opts);
  register(part.prefetch);
  return part;
}
// A module that is not a view (the .canopi writer): loaded once, prefetched with the views.
export function laterModule<M>(importer: () => Promise<M>): () => Promise<M> {
  let pending: Promise<M> | null = null;
  const fetch = (): Promise<M> => (pending ??= importer().catch((err: unknown) => { pending = null; throw err; }));
  register(fetch);
  return () => gate('later').then(fetch);
}

// Once, on the first of the consortium on screen (Matrix calls it at ct:matrix) or the data ready
// (below): every later part, in the browser's idle time.
export function prefetchLater(): void {
  if (started) return;
  started = true;
  whenIdle(() => { for (const fetch of loaders) fetch().catch(() => {}); });
}
if (typeof document !== 'undefined') effect(() => { if (dataLoad.value.status === 'ready') prefetchLater(); });
