// The location step's chunk (P5 S5b; views/location/location.tsx, a P5 feature chunk ≤ 20 KB): loaded
// only when the reader asks for a location (a button or Enter in the search, views/LocationSlot.tsx)
// or a link or the save brings one (state/restore.ts, through the loader handed to it below), never on
// a plain visit (decision row "Island JavaScript budget for P5"). Once loaded, the shell renders its
// result line from `locationStep`.
import { signal } from '@preact/signals';
import { provideLocationStep } from '../../state/restore.ts';

export type LocationStep = typeof import('./location.tsx');
export const locationStep = signal<LocationStep | null>(null);
let pending: Promise<LocationStep> | null = null;
export function loadLocationStep(): Promise<LocationStep> {
  // A failed load is logged here once for every caller (the shell's controls, state/restore.ts).
  pending ??= import('./location.tsx').then((m) => (locationStep.value = m), (err: unknown) => {
    pending = null;
    console.error(`Consortium: the location step did not load: ${(err as Error).message}`);
    throw err;
  });
  return pending;
}
// Island state never imports a view (ADR-1 L2): restore.ts gets this loader from here, the view that
// owns the chunk. This module is in the first run (LocationSlot imports it), so the loader is in place
// before startMemory can ask for a location.
provideLocationStep(loadLocationStep);

// The lookups in flight, their line and ownership live in island state (state/suggest-wait.ts); they
// are re-exported here for the P5 seam tests until chunk 5 points them there.
export { letGo, line, liveLookup, looking, lookingThrough, lookups, nextLookup, unlessReplaced, unread } from '../../state/suggest-wait.ts';
