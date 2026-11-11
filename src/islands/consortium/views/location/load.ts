// The location step's chunk (P5 S5b; views/location/location.tsx, a P5 feature chunk ≤ 20 KB): loaded
// only when the reader asks for a location (a button or Enter in the search, views/LocationSlot.tsx)
// or a link or the save brings one (memory.ts), never on a plain visit (decision row "Island
// JavaScript budget for P5"). Once loaded, the shell renders its result line from `locationStep`.
import { signal } from '@preact/signals';
import type { SiteState } from '../../../../lib/consortium/index.ts';
import type { PlaceSearchResult } from '../../../../lib/location/place-search.ts';

export type LocationStep = typeof import('./location.tsx');
export const locationStep = signal<LocationStep | null>(null);
let pending: Promise<LocationStep> | null = null;
export function loadLocationStep(): Promise<LocationStep> {
  // A failed load is logged here once for every caller (the shell's controls, memory.ts).
  pending ??= import('./location.tsx').then((m) => (locationStep.value = m), (err: unknown) => {
    pending = null;
    console.error(`Consortium: the location step did not load: ${(err as Error).message}`);
    throw err;
  });
  return pending;
}

// Location steps in flight (a click, a search, a link's or the saved location looked up), from the
// request until it settles or fails: "Suggest plants" waits for them (memory.requestSuggest), so the
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
// Suggest ran without the site's climate: its lookup outlasted the wait's cap (memory.requestSuggest).
export const unread = signal(false);

// The location's result line on Start (rendered by location.tsx's LocationResult). Kept here so a
// drop can clear it without the chunk.
export type LineState = 'loading' | 'denied' | 'timeout' | 'unavailable' | 'no-result' | 'offline' | 'failed' | SiteState;
export interface Line { state: LineState; query?: string; others?: readonly PlaceSearchResult[]; attribution?: string | null }
export const line = signal<Line | null>(null);
// One lookup at a time owns Start's location state: the newest (nextLookup); an older one that ends
// later, or one dropped, writes no line, site or notice (liveLookup false).
let seq = 0;
export const nextLookup = (): number => ++seq;
export const liveLookup = (id: number): boolean => id === seq;
// Start's location state let go (review round 3, 2 and 3): the "not read" note goes; drop (a link's
// location going with its consortium): its lookup too: no hold on Suggest, no line, no later write.
export function letGo(drop: boolean): void {
  unread.value = false;
  if (!drop) return;
  seq++;
  epoch++;
  lookups.value = 0;
  line.value = null;
}
