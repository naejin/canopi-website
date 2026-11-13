// "Suggest plants" pressed while something it needs is still being read, and the location lookups it
// waits for (stream S4, P5 S5b; E6 S2 split it out of memory.ts and views/location/load.ts).
//
// The lookups are counted here, in the first run, not in the location step (state/location.ts, a
// lazy chunk), because Suggest reads the count before that chunk exists and Start's Change site,
// Start over and Start empty drop a link's lookup without it (draft.ts dropLinkLocation). Their
// result line and their ownership (the newest lookup owns Start's location state) sit with the count,
// since a drop resets all three at once (letGo).
import { effect, signal, untracked } from '@preact/signals';
import type { SiteState } from '../../../lib/consortium/index.ts';
import type { PlaceSearchResult } from '../../../lib/location/place-search.ts';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { T } from '../strings.ts';
import { state as schema } from './schema.ts';
import { adoptPending } from './persist.ts';

// ---- the location lookups in flight ----

// Location steps in flight (a click, a search, a link's or the saved location looked up), from the
// request until it settles or fails: "Suggest plants" waits for them (requestSuggest), so the
// suggestion's range filter sees the site (review round 1 addendum).
// A hold taken before a drop (letGo) is not released twice: the drop has zeroed the count.
export const lookups = signal(0);
let epoch = 0;
export async function looking<T>(step: () => Promise<T>): Promise<T> {
  const e = epoch;
  lookups.value++;
  try { return await step(); } finally { if (e === epoch) lookups.value--; }
}
// One lookup held from the chunk load through its settle: two looking() calls in a row would drop
// to 0 between them, and a waiting Suggest would run in that gap (review round 2, 2). Dropped while
// the chunk loads, it never runs.
export const lookingThrough = <M>(load: () => Promise<M>, run: (m: M) => Promise<unknown>): Promise<void> =>
  looking(async () => { const e = epoch, m = await load(); if (e === epoch) await run(m); });
// Suggest ran without the site's climate: its lookup outlasted the wait's cap (requestSuggest).
export const unread = signal(false);

// The location's result line on Start (rendered by views/location/location.tsx LocationResult). Kept
// here so a drop can clear it without the chunk.
type LineState = 'loading' | 'denied' | 'timeout' | 'unavailable' | 'no-result' | 'offline' | 'failed' | SiteState;
export interface Line { state: LineState; query?: string; others?: readonly PlaceSearchResult[]; attribution?: string | null }
export const line = signal<Line | null>(null);
// One lookup at a time owns Start's location state: the newest (nextLookup); an older one that ends
// later, or one dropped, writes no line, site or notice (liveLookup false).
let seq = 0;
// Settles when the lookup that owns Start is replaced or dropped (unlessReplaced).
let replaced = () => {};
let gone = new Promise<void>((r) => { replaced = r; });
const replace = (): number => { replaced(); gone = new Promise<void>((r) => { replaced = r; }); return ++seq; };
export const nextLookup = (): number => replace();
export const liveLookup = (id: number): boolean => id === seq;
// A wait (a permission prompt, a position, a tile read, a search) that ends the moment its lookup is
// replaced or dropped, with undefined: the lookup then returns at once, so its hold on Suggest goes
// with it instead of lasting until the wait settles (review round 4, 1). Call it after nextLookup().
export const unlessReplaced = <T>(wait: Promise<T>): Promise<T | undefined> => Promise.race([wait, gone.then(() => undefined)]);
// Start's location state let go (review round 3, 2 and 3): the "not read" note goes; drop (a link's
// location going with its consortium): its lookup too: no hold on Suggest, no line, no later write.
export function letGo(drop: boolean): void {
  unread.value = false;
  if (!drop) return;
  replace();
  epoch++;
  lookups.value = 0;
  line.value = null;
}

// ---- the waiting Suggest ----

// "Suggest plants" pressed while the plant list loads: the suggestion runs once it is ready (§5).
export const pendingSuggest = signal(false);
// Suggest has waited its 10 s for a location lookup (requestSuggest).
export const waited = signal(false);
let cap: ReturnType<typeof setTimeout> | undefined;
// The waiting Suggest has one owner, here (seam review round 4, 1): requestSuggest starts the wait,
// the effect in watchSuggest runs it once its lists are read, and dropSuggest ends it: when the reader
// changes the plants or opens a sheet (another action: Add, search, Details, paste; Start's "Start
// empty and search" too), when the plant list fails (the load screen says so), or once its 10 s are
// up with a kept guest's list still unread (a toast says so). Each wait therefore ends.
const SUGGEST_WAIT_MS = 10_000;
function dropSuggest(): void {
  if (!pendingSuggest.peek()) return;
  clearTimeout(cap);
  waited.value = false;
  pendingSuggest.value = false;
}
function capped(): void {
  if (!pendingSuggest.peek()) return;
  // A location lookup no longer holds it (it runs without the site; the line says so) ...
  waited.value = true;
  // ... but a guest list never read leaves nothing to run: the wait ends, with a word. (The database
  // itself, and the range rule, end their own waits: the load screen, rangeFailed.)
  if (store.pool.peek() && store.guestsPending.peek().length) { dropSuggest(); store.showToast(T('start.suggestStopped')); }
}
// "Suggest plants": now when the plants are read, else once they are (§5 Loading).
export function requestSuggest(): void {
  adoptPending();
  // A location being read: Suggest waits for it (the effect below runs it once lookups settle), 10 s
  // at most; then it runs without it, and the location line says the climate was not read (review
  // round 2, 3).
  // Each press has its own 10 s: an earlier press's timer is cleared (review round 3, 1).
  if (!pendingSuggest.peek()) { clearTimeout(cap); waited.value = false; }
  const busy = lookups.peek() && !waited.peek();
  if (!busy && store.suggestMembers()) { clearTimeout(cap); unread.value = !!lookups.peek(); waited.value = false; store.view.value = 'matrix'; pendingSuggest.value = false; focusView(); return; }
  // A browser test may shorten the wait in the test build (window.__ctTimeouts.suggest; A4, as in
  // data/load.ts); production folds it to SUGGEST_WAIT_MS.
  if (!pendingSuggest.peek()) cap = setTimeout(capped, typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { suggest?: number } }).__ctTimeouts?.suggest) || SUGGEST_WAIT_MS : SUGGEST_WAIT_MS);
  pendingSuggest.value = true;
}

// The wait's effects, set up once by startMemory (arrival.ts).
export function watchSuggest(): void {
  // "Suggest plants" pressed early runs when the climate's plants (and every guest list) are read.
  effect(() => {
    if (!pendingSuggest.value || !store.pool.value || store.guestsPending.value.length || (lookups.value && !waited.value)) return;
    queueMicrotask(() => { if (pendingSuggest.peek()) requestSuggest(); });
  });
  // ... unless the reader changed the plants, opened a sheet, or the plant list failed meanwhile.
  let primed = false;
  effect(() => {
    void schema.track(schema.lists.plants);
    if (primed) untracked(dropSuggest);
    primed = true;
  });
  effect(() => { if (store.sheet.value || store.load.value.status === 'failed') untracked(dropSuggest); });
}
