/** @jsxImportSource preact */
// The island's one lazy loader (E6 design check A6, §7.1): every part outside the first run is a
// lazyPart: the views after the matrix (one chunk, views/later.ts), the sheets (views/Sheets.tsx: the
// plant dialog, Swap, Add, Paste; the dialog's correction form) and the slots' feature chunks.
// prefetchLater() loads every part registered with later() once, in the browser's idle time, on the
// first of: the consortium first on screen (Matrix, ct:first-view) or the data ready (store.load =
// ready), so a reader who stays on Start has Search and Paste at hand too, and nothing lazy competes
// with the database download. A part used before its prefetch finished loads on demand through the
// same promise (one request per chunk); a failed load clears it, so the next use asks again (L4), and,
// for a part whose import() is wrapped in retryable() (below: every lazyPart and later() in views/, the
// later chunk's parts through its one loader, views/later-chunk.ts, and the location step's loader),
// fetches again even in Chromium. The core's own loaders (marks.ts: the
// mark providers and the range rule; lib/consortium/index.ts loadSuggest) stay plain, since lib may
// not import views: in Chromium a failed one needs Reload (Swap and Suggest offer it; the range rule
// says so in PoolSlot).
//
// While loading, a part shows its loading line (F5; a sheet its frame, views/Sheets.tsx); one that
// fails says so with Reload, in place (a view), or, onFail 'closeSheet' (a sheet part), by closing
// the sheet with the toast and Reload (L1, L7). A part no longer on screen when its chunk fails writes
// nothing (L6); its chunk, once here, is kept for the next use. A quiet part (the print sheet, hidden
// on screen) shows neither: Print says it. An idle part never asks for its chunk itself and shows
// nothing until the prefetch has loaded it (a slot beside the matrix must not start a download).
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { effect, signal } from '@preact/signals';
import { closeSheet, load as dataLoad, showToast } from '../store.ts';
import { T } from '../strings.ts';

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

// The line a part that could not load shows in place, with Reload (L1, L7); Swap shows it too when
// the suggestion's chunk does not come (views/Swap.tsx).
export function LoadFailed() {
  return <p class="ct-notice" role="alert">{T('details.loadFailed')} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('details.reload')}</button></p>;
}

// Counts the parts (and modules) loaded: an idle part whose own prefetch failed asks again when it has
// moved since that failure (below), so it gets another chance without being mounted again, and never
// loops on its own failure.
const loadedTick = signal(0);

export function lazyPart<C extends Any>(importer: () => Promise<C>, { quiet = false, idle = false, onFail = 'notice', loading }: PartOptions<C> = {}): LazyPart<C> {
  const kind: Kind = onFail === 'closeSheet' ? 'sheets' : 'later';
  const done = signal<C | null>(null);
  let pending: Promise<C> | null = null;
  // lastFailed: the last load failed, when loadedTick read failedAt.
  let lastFailed = false, failedAt = 0;
  const prefetch = (): Promise<C> => {
    // A module without the part (a retry that fetched another file than the part's chunk: retryable
    // reads the URL from the error) is a failure, with its failed line, never a blank part.
    pending ??= (lastFailed = false, importer()
      .then((c) => { if (c == null) throw new Error('the part is not in the module that loaded'); return c; })
      .then((c) => { done.value = c; loadedTick.value++; return c; }, (err: unknown) => { pending = null; lastFailed = true; failedAt = loadedTick.peek(); throw err; }));
    return pending;
  };
  const load = (): Promise<C> => gate(kind).then(prefetch);
  function LazyView(props: Record<string, unknown>) {
    const [failed, setFailed] = useState(false);
    const [, wake] = useState(0);
    const fault = faultOf(kind);
    const C = (fault ? null : done.value) as ComponentType<Record<string, unknown>> | null;
    const tick = idle && !C ? loadedTick.value : 0;
    const askedHere = useRef(false); // this mount re-asked after a failure
    useEffect(() => {
      if (C) return;
      let live = true;
      if (idle) {
        // An idle part waits for the prefetch (done), in idle time, or, held by a test, for the
        // release. Only once its own prefetch failed does it ask again itself: when another part (or
        // module) has loaded since that failure (loadedTick moved past failedAt: the connection is
        // back), and once per mount (everything may have failed offline, and nothing would move the
        // tick). A failed retry records the tick again and waits for it to move, so it never loops
        // (E6 hand-off review 2).
        if (fault === 'hold') gate(kind).then(() => { if (live) wake((n) => n + 1); }, () => {});
        else if (lastFailed && (tick !== failedAt || !askedHere.current)) {
          askedHere.current = true;
          prefetch().then(() => { if (live) wake((n) => n + 1); }, () => {});
        }
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
    }, [C, tick]);
    if (C) return <C {...props} />;
    if (quiet || idle) return null;
    if (failed) return <LoadFailed />;
    if (loading) { const Loading = loading as ComponentType<Record<string, unknown>>; return <Loading {...props} />; }
    return <p class="status-line" role="status">{T(onFail === 'closeSheet' ? 'details.loading' : 'load.plants')}</p>;
  }
  return { View: LazyView as unknown as C, load, ready: () => (faultOf(kind) ? null : done.peek()), prefetch };
}

// A chunk's import() that a failed fetch does not poison (L4, review): Chromium keeps a failed import()
// or modulepreload of a URL failed for the page's life (its module map), so importing it again never
// fetches, and one dropped request on a flaky connection would keep the part closed until Reload.
// After a failure, the next call imports the same hashed file under a fresh URL (?retry=n), read from
// the failed import's error (Chromium and Firefox name the URL; where the error names none, or names
// a file outside this site's /_astro/, the next call fails again: the toast and Reload). This mends
// the chunk itself only: its static imports keep their plain URLs, so a sheet chunk imports nothing
// but first-run modules, already loaded (kit/sheet.tsx shared; E6-5d checks it), nor does the later
// chunk (E6 hand-off C, measured). The future and pool parts statically import the range rule's chunk
// (and future the chunk it shares with the mark providers): were one of those to fail, every retry
// fails, Reload the fix; were an error to name such a dependency, the retry would import that file,
// which lacks the part: lazyPart counts the missing part as a failure (its failed line with Reload),
// and Download says it (Actions.tsx). pick: the part in the module.
const failedUrl = (err: unknown): string | null => {
  const url = /https?:\/\/[^\s'"]+?\.js\b/.exec(String((err as Error)?.message ?? err))?.[0] ?? null;
  return url?.startsWith(`${location.origin}/_astro/`) ? url : null;
};
// One attempt at a time, shared by every caller (several parts may share one loader: views/later-chunk.ts),
// and the module kept once it came, so no later call imports a second copy under ?retry=n+1.
export function retryable<M, C>(load: () => Promise<M>, pick: (m: M) => C): () => Promise<C> {
  let url: string | null = null, n = 0, attempt: Promise<M> | null = null;
  return () => (attempt ??= (url === null ? load() : (import(/* @vite-ignore */ `${url}?retry=${++n}`) as Promise<M>))
    .catch((err: unknown) => { attempt = null; url ??= failedUrl(err); throw err; }))
    .then(pick);
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
  const fetch = (): Promise<M> => (pending ??= importer().then((m) => { loadedTick.value++; return m; }, (err: unknown) => { pending = null; throw err; }));
  register(fetch);
  return () => gate('later').then(fetch);
}

// Once, on the first of the consortium on screen (Matrix calls it at ct:first-view) or the data ready
// (below): every later part, in the browser's idle time.
export function prefetchLater(): void {
  if (started) return;
  started = true;
  whenIdle(() => { for (const fetch of loaders) fetch().catch(() => {}); });
}
if (typeof document !== 'undefined') effect(() => { if (dataLoad.value.status === 'ready') prefetchLater(); });
