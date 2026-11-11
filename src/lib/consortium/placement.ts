// Stream S5c: where a plant goes for a site's climate. A curated climate uses its own placement; an
// uncovered one borrows the first curated placement in its nearest-list order, marked "estimate"
// (owner answer 1, 2026-11-11: one fixed table in the core). This works by climate alone: a link or
// a card naming Subtropical opens with borrowed plants, no location needed.
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

// Whether a climate has plants to suggest from: curated, or one of its nearest lists is.
export const hasPlants = (zone: ClimateZone, curated: readonly ClimateZone[]): boolean =>
  curated.includes(zone) || NEAREST_LISTS[zone].some((z) => curated.includes(z));
