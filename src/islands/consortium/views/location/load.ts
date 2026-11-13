// The location step's chunk (P5 S5b; views/location/location.tsx, a P5 feature chunk ≤ 20 KB): loaded
// only when the reader asks for a location (a button or Enter in the search, views/LocationSlot.tsx)
// or a link or the save brings one (state/restore.ts, through the loader handed to it below), never on
// a plain visit (decision row "Island JavaScript budget for P5"). Once loaded, the shell renders its
// result line from `locationStep`.
import { signal } from '@preact/signals';

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
// Island state never imports a view (ADR-1 L2): main.ts hands this loader to restore.ts
// (provideLocationStep) before the first render, so it is in place before startMemory can ask for a
// location (E6 S3: nothing is registered because a module was imported).

