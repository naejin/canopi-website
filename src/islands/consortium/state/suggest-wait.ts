// "Suggest plants" pressed while something it needs is still being read (stream S4, P5 S5b; E6 S2
// split it out of memory.ts): the plant lists, and the location lookups in flight (lookups.ts).
import { effect, signal, untracked } from '@preact/signals';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { T } from '../strings.ts';
import { state as schema } from './schema.ts';
import { adoptPending } from './persist.ts';
import { lookups, unread } from './lookups.ts';

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
// up with a kept guest's list still unread (a toast says so), or when the suggestion's chunk fails or
// has not come once its 10 s are up with the list read (a toast with Reload). Each wait therefore
// ends, with a suggestion or one toast.
const SUGGEST_WAIT_MS = 10_000;
// A browser test may shorten the wait in the test build (window.__ctTimeouts.suggest; A4, as in
// data/load.ts); production folds it to SUGGEST_WAIT_MS.
const waitMs = (): number => (typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { suggest?: number } }).__ctTimeouts?.suggest) || SUGGEST_WAIT_MS : SUGGEST_WAIT_MS);
const reloadToast = (): void => store.showToast(T('details.loadFailed'), null, { label: T('details.reload'), run: () => globalThis.location.reload() });
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
  if (store.pool.peek() && store.guestsPending.peek().length) { dropSuggest(); store.showToast(T('start.suggestStopped')); return; }
  // The suggestion's chunk requested and never answered (a stalled request): with the list read,
  // the wait ends with Reload (R4 re-review); with the list still being read, it is checked again
  // after another wait (the load screen ends a failed list's wait).
  if (!store.suggestRule.peek()) {
    if (store.pool.peek()) { dropSuggest(); reloadToast(); } else cap = setTimeout(capped, waitMs());
  }
}
// "Suggest plants": now when the plants are read, else once they are (§5 Loading).
export function requestSuggest(): void {
  adoptPending();
  // A location being read: Suggest waits for it (the effect below runs it once lookups settle), 10 s
  // at most; then it runs without it, and the location line says the climate was not read (review
  // round 2, 3).
  // Each press has its own 10 s: an earlier press's timer is cleared (review round 3, 1).
  if (!pendingSuggest.peek()) { clearTimeout(cap); waited.value = false; }
  // The suggestion's chunk still missing (or failed before: tried again, L8): this press waits for it.
  store.wantSuggest();
  const busy = lookups.peek() && !waited.peek();
  if (!busy && store.suggestMembers()) { clearTimeout(cap); unread.value = !!lookups.peek(); waited.value = false; store.view.value = 'matrix'; pendingSuggest.value = false; focusView(); return; }
  if (!pendingSuggest.peek()) cap = setTimeout(capped, waitMs());
  pendingSuggest.value = true;
}

// The wait's effects, set up once by startMemory (arrival.ts).
export function watchSuggest(): void {
  // "Suggest plants" pressed early runs when the climate's plants (and every guest list) are read.
  effect(() => {
    void store.suggestRule.value; // the suggestion's chunk arriving after a restore's list (store.ts suggestRule)
    if (!pendingSuggest.value || !store.pool.value || store.guestsPending.value.length || (lookups.value && !waited.value)) return;
    queueMicrotask(() => { if (pendingSuggest.peek()) requestSuggest(); });
  });
  // ... or ends, with a toast and Reload, when the suggestion's chunk fails (L8): a press whose chunk
  // failed always says so, whatever else it waited for.
  effect(() => {
    if (!store.suggestFailed.value || !untracked(() => pendingSuggest.value)) return;
    untracked(() => { dropSuggest(); reloadToast(); });
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
