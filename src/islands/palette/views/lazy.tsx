/** @jsxImportSource preact */
// The island's one lazy loader (E6 design check A6, §7.1): every part outside the first run is a
// lazyPart: the views after the matrix (one chunk, views/later.ts), the sheets (views/Sheets.tsx: the
// plant dialog, Swap, Add, Paste; the dialog's correction form) and the slots' feature chunks.
// prefetchLater() loads every part registered with later() once, in the browser's idle time, on the
// first of: the consortium first on screen (the palette page's Next step, views/palette/Palette.tsx at ct:first-view) or the data ready (store.load =
// ready), so a reader who stays on Start has Search and Paste at hand too, and nothing lazy competes
// with the database download. A part used before its prefetch finished loads on demand through the
// same promise (one request per chunk); a failed load clears it, so the next use asks again (L4), and,
// for a part whose import() is wrapped in retryableImport() (core retry-import.ts: every lazyPart and later() in views/, the
// later chunk's parts through its one loader, views/later-chunk.ts, and the location step's loader),
// fetches again even in Chromium. The core's own loaders (verdict-load.ts loadVerdictRule;
// lib/palette/index.ts loadSuggest) stay plain, since lib may not import views: in Chromium a
// failed one may need Reload (Swap and Suggest offer it; the verdict rule's failure is said in
// PoolSlot and Against).
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
import { closeSheet, load as dataLoad, offline, showToast } from '../store.ts';
import { T } from '../strings.ts';

type Kind = 'sheets' | 'find' | 'later' | 'page';
// Browser-test builds only (A13): a part's chunk fails, or waits until the test releases it
// (globalThis.__ctFaults, written by test-hook.ts; `sheets` for sheet parts, `later` for the others).
// Read when a part is used, not when it is fetched, so a part the prefetch already loaded still fails
// or waits as if its chunk had not come. The palette page itself (`page`) and Find's parts (`find`)
// take none: the later faults stand for the chunks after the first view, and a spec fails Find's
// chunk by blocking its request (the harness's block: { find }; review c0 4.1).
function faultOf(kind: Kind): 'fail' | 'hold' | null {
  if (!__CT_TEST_HOOK__ || kind === 'page' || kind === 'find') return null;
  const f = globalThis.__ctFaults;
  if (kind === 'sheets') return f?.sheets ? 'fail' : null;
  return f?.later ?? null;
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
  retry?: boolean; // the importer is retryableImport(): a failed part is tried again in place
  page?: boolean; // the palette page (App.tsx): no later test fault holds or fails it
  find?: boolean; // a sheet part of the find role (views/Sheets.tsx): the `find` test fault fails it
}

// The line a part that could not load shows in place, with Reload (L1, L7); Swap shows it too when
// the suggestion's chunk does not come (views/Swap.tsx).
// A part that did not load. Offline, it says it needs a connection and tries again by itself once the
// browser is back online, never reloading the page (architecture 9; PP-B16). Online, Reload tries the
// part again in place when the part can (`inPlace`: a retryable importer fetches `?retry=n`, PP-B24),
// else reloads the page.
export function LoadFailed({ retry, inPlace = false }: { retry?: () => void; inPlace?: boolean }) {
  const off = offline.value;
  // Back online (store.ts sets `offline` from the browser's events), a part that failed offline is
  // asked again. Read from the signal's change, not from a listener of its own: one added in an effect
  // missed a connection back before the effect ran, with the line already shown (PP-B exit, PP-B16b).
  const wasOff = useRef(off);
  useEffect(() => {
    if (off) { wasOff.current = true; return; }
    if (wasOff.current && retry) { wasOff.current = false; retry(); }
  }, [off, retry]);
  if (off) return <p class="ct-notice" role="alert">{T('load.needsConnection')}</p>;
  return <p class="ct-notice" role="alert">{T('details.loadFailed')} <button type="button" class="button button-secondary" onClick={() => (retry && inPlace ? retry() : location.reload())}>{T('details.reload')}</button></p>;
}

// Counts the parts (and modules) loaded: an idle part whose own prefetch failed asks again when it has
// moved since that failure (below), so it gets another chance without being mounted again, and never
// loops on its own failure.
const loadedTick = signal(0);

export function lazyPart<C extends Any>(importer: () => Promise<C>, { quiet = false, idle = false, onFail = 'notice', loading, retry = false, page = false, find = false }: PartOptions<C> = {}): LazyPart<C> {
  const kind: Kind = onFail === 'closeSheet' ? (find ? 'find' : 'sheets') : page ? 'page' : 'later';
  const done = signal<C | null>(null);
  let pending: Promise<C> | null = null;
  // lastFailed: the last load failed, when loadedTick read failedAt.
  let lastFailed = false, failedAt = 0;
  const prefetch = (): Promise<C> => {
    // A module without the part (a retry that fetched another file than the part's chunk: retryableImport
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
    const [attempt, setAttempt] = useState(0);
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
          // Offline, a Reload would lose the page (architecture 9): it says it needs a connection; the
          // sheet's next opening asks for its chunk again (retryableImport).
          if (offline.peek()) showToast(T('load.needsConnection'), null);
          else showToast(T('details.loadFailed'), null, { label: T('details.reload'), run: () => location.reload() });
        } else setFailed(true);
      });
      return () => { live = false; };
    }, [C, tick, attempt]);
    if (C) return <C {...props} />;
    if (quiet || idle) return null;
    if (failed) return <LoadFailed inPlace={retry} retry={() => { setFailed(false); setAttempt((n) => n + 1); }} />;
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
  const fetch = (): Promise<M> => (pending ??= importer().then((m) => { loadedTick.value++; return m; }, (err: unknown) => { pending = null; throw err; }));
  register(fetch);
  return () => gate('later').then(fetch);
}

// Once, on the first of the consortium on screen (views/palette/Palette.tsx calls it at ct:first-view) or the data ready
// (below): every later part, in the browser's idle time.
export function prefetchLater(): void {
  if (started) return;
  started = true;
  whenIdle(() => { for (const fetch of loaders) fetch().catch(() => {}); });
}
if (typeof document !== 'undefined') effect(() => { if (dataLoad.value.status === 'ready') prefetchLater(); });
