// The location step's chunk (P5 S5b; views/location/location.tsx, a P5 feature chunk ≤ 20 KB): loaded
// only when the reader asks for a location (a button or Enter in the search, views/LocationSlot.tsx)
// or a link or the save brings one (memory.ts), never on a plain visit (decision row "Island
// JavaScript budget for P5"). Once loaded, the shell renders its result line from `locationStep`.
import { signal } from '@preact/signals';

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
export const lookups = signal(0);
export async function looking<T>(step: () => Promise<T>): Promise<T> {
  lookups.value++;
  try { return await step(); } finally { lookups.value--; }
}
