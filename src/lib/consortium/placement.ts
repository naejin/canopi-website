// P5 seam (commit 0), filled by stream S5c: where a plant goes for a site's climate. A curated climate
// uses its own placement; an uncovered one borrows the first curated placement in its nearest-list
// order, marked "estimate" (owner answer 1, 2026-11-11: one fixed table in the core).
// Stub: today's own-list placement only; nothing is borrowed.
import type { ClimateZone, Placement } from './types.ts';

// P5 engineering choices row (2026-11-11): Subtropical and Arid → Mediterranean, Tropical,
// Temperate; Continental and Boreal → Temperate, then Mediterranean; a curated climate is its own.
export const NEAREST_LISTS: Readonly<Record<ClimateZone, readonly ClimateZone[]>> = {
  Tropical: ['Tropical'],
  Subtropical: ['Mediterranean', 'Tropical', 'Temperate'],
  Arid: ['Mediterranean', 'Tropical', 'Temperate'],
  Mediterranean: ['Mediterranean'],
  Temperate: ['Temperate'],
  Continental: ['Temperate', 'Mediterranean'],
  Boreal: ['Temperate', 'Mediterranean'],
};

export interface Placed { zone: ClimateZone; placement: Placement; estimate: boolean }

// placements: the plant in every curated climate (PlantSource.placements); zone: the site's climate;
// nearestOrder: NEAREST_LISTS[zone] (passed in, so the rule stays pure and testable).
export function placeFor(placements: Partial<Record<ClimateZone, Placement>>, zone: ClimateZone, _nearestOrder: readonly ClimateZone[] = NEAREST_LISTS[zone]): Placed | null {
  const own = placements[zone];
  return own ? { zone, placement: own, estimate: false } : null;
}
