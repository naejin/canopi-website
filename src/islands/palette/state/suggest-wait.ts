// "Suggest plants" pressed while something it needs is still being read (stream S4, P5 S5b; E6 S2
// split it out of memory.ts): the plant lists, and the location lookups in flight (lookups.ts).
import { effect, signal, untracked } from '@preact/signals';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { T } from '../strings.ts';
import { state as schema } from './schema.ts';
import { adoptPending } from './persist.ts';
import { lookups, unread } from './lookups.ts';
import { tryAgain } from './location.ts';

// ---- the waiting Suggest ----

// "Suggest plants" pressed while the plant list loads: the suggestion runs once it is ready (§5).
export const pendingSuggest = signal(false);
// Suggest has waited its 10 s for a location lookup (requestSuggest).
export const waited = signal(false);
let cap: ReturnType<typeof setTimeout> | undefined;
let lateToast: number | null = null;
const SUGGEST_WAIT_MS = 10_000;
export const suggestWaitMs = (): number => (typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { suggest?: number } }).__ctTimeouts?.suggest) || SUGGEST_WAIT_MS : SUGGEST_WAIT_MS);
const reloadToast = (): void => store.showToast(T('details.loadFailed'), null, { label: T('details.reload'), run: () => globalThis.location.reload() });
export function dropSuggest(): void {
  if (!pendingSuggest.peek()) return;
  clearTimeout(cap);
  waited.value = false;
  pendingSuggest.value = false;
}
const listRead = (): boolean => { const c = store.climate.peek(); return !!c && !!store.pools.peek()[c]; };
function capped(): void {
  if (!pendingSuggest.peek()) return;
  waited.value = true;
  if (listRead() && store.guestsPending.peek().length) { dropSuggest(); store.showToast(T('start.suggestStopped')); return; }
  if (!store.suggestRule.peek()) {
    if (store.pool.peek()) { dropSuggest(); reloadToast(); lateToast = store.toast.peek()?.id ?? null; } else cap = setTimeout(capped, suggestWaitMs());
  }
}
export function requestSuggest(): void {
  adoptPending();
  if (!pendingSuggest.peek()) { clearTimeout(cap); waited.value = false; }
  store.wantSuggest();
  const busy = lookups.peek() && !waited.peek();
  const late = !!lookups.peek();
  if (!busy && store.suggestMembers(late ? { text: T('location.unread'), action: { label: T('location.readAgain'), run: () => void tryAgain() } } : null)) {
    clearTimeout(cap); unread.value = late; waited.value = false; store.view.value = 'matrix'; pendingSuggest.value = false; focusView();
    return;
  }
  if (!pendingSuggest.peek()) cap = setTimeout(capped, suggestWaitMs());
  pendingSuggest.value = true;
}

export function watchSuggest(): void {
  effect(() => {
    void store.suggestRule.value;
    if (!pendingSuggest.value || !store.pool.value || store.guestsPending.value.length || (lookups.value && !waited.value)) return;
    queueMicrotask(() => { if (pendingSuggest.peek()) requestSuggest(); });
  });
  effect(() => {
    if (!store.suggestFailed.value || !untracked(() => pendingSuggest.value)) return;
    untracked(() => { dropSuggest(); reloadToast(); });
  });
  effect(() => {
    if (!store.suggestRule.value || lateToast === null) return;
    const id = lateToast;
    lateToast = null;
    if (untracked(() => store.toast.value?.id) === id) untracked(store.hideToast);
  });
  let primed = false;
  effect(() => {
    void schema.track(schema.lists.plants);
    if (primed) untracked(dropSuggest);
    primed = true;
  });
  effect(() => { if (store.load.value.status === 'failed') untracked(dropSuggest); });
}
