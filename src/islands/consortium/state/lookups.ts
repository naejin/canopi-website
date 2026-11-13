// The location lookups in flight, their result line and their ownership (P5 S5b; E6 S2 moved them
// out of views/location/load.ts). In the first run, not in the location step (state/location.ts, a
// lazy chunk): Suggest reads the count before that chunk exists (suggest-wait.ts), and Start's Change
// site, Start over and Start empty drop a link's lookup without it (draft.ts dropLinkLocation). The
// line and the ownership (the newest lookup owns Start's location state) sit with the count, since a
// drop resets all three at once (letGo).
import { signal } from '@preact/signals';
import type { SiteState } from '../../../lib/consortium/index.ts';
import type { PlaceSearchResult } from '../../../lib/location/place-search.ts';

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
