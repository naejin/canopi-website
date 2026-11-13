// Stream S5c: the nearest-list placement rule (placement.ts re-exports it): a curated climate uses its
// own placement; an uncovered one the first curated placement in its NEAREST_LISTS order, marked estimate.
import type { ClimateZone, Placement } from './types.ts';
import { NEAREST_LISTS } from './nearest.ts';

// The first of `order` that has a value: the rule placeFor and PlantSource.borrowed share, over
// placements or over whole records of each curated climate.
export function firstPlaced<T>(byZone: Partial<Record<ClimateZone, T>>, zone: ClimateZone, order: readonly ClimateZone[] = NEAREST_LISTS[zone]): { zone: ClimateZone; value: T; estimate: boolean } | null {
  const own = byZone[zone];
  if (own !== undefined) return { zone, value: own, estimate: false };
  for (const z of order) {
    const v = byZone[z];
    if (v !== undefined) return { zone: z, value: v, estimate: true };
  }
  return null;
}

export interface Placed { zone: ClimateZone; placement: Placement; estimate: boolean }

// placements: the plant in every curated climate (PlantSource.placements); zone: the site's climate;
// nearestOrder: NEAREST_LISTS[zone] (passed in, so the rule stays pure and testable). null: no list
// of the order places it.
export function placeFor(placements: Partial<Record<ClimateZone, Placement>>, zone: ClimateZone, nearestOrder: readonly ClimateZone[] = NEAREST_LISTS[zone]): Placed | null {
  const hit = firstPlaced(placements, zone, nearestOrder);
  return hit && { zone: hit.zone, placement: hit.value, estimate: hit.estimate };
}
