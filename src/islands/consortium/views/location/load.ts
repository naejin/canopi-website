// The location step's chunk (P5 S5b; views/location/location.tsx, a P5 feature chunk ≤ 20 KB): loaded
// only when the reader asks for a location (a button or Enter in the search, views/LocationSlot.tsx)
// or a link or the save brings one (memory.ts), never on a plain visit (decision row "Island
// JavaScript budget for P5"). Once loaded, the shell renders its result line from `locationStep`.
import { signal } from '@preact/signals';

export type LocationStep = typeof import('./location.tsx');
export const locationStep = signal<LocationStep | null>(null);
let pending: Promise<LocationStep> | null = null;
export function loadLocationStep(): Promise<LocationStep> {
  pending ??= import('./location.tsx').then((m) => (locationStep.value = m), (err: unknown) => { pending = null; throw err; });
  return pending;
}
