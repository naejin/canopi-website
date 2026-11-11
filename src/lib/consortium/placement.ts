// Stream S5c: where a plant goes for a site's climate. A curated climate uses its own placement; an
// uncovered one borrows the first curated placement in its nearest-list order, marked "estimate"
// (owner answer 1, 2026-11-11: one fixed table in the core). This works by climate alone: a link or
// a card naming Subtropical opens with borrowed plants, no location needed.
import type { ClimateZone } from './types.ts';

// The placement rule itself (firstPlaced, placeFor) is in placed.ts, used by the PlantSource's chunk
// and the tests, so it stays out of the first run; re-exported here for index.ts.
export * from './placed.ts';

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

// Whether a climate has plants to suggest from: curated, or one of its nearest lists is.
export const hasPlants = (zone: ClimateZone, curated: readonly ClimateZone[]): boolean =>
  curated.includes(zone) || NEAREST_LISTS[zone].some((z) => curated.includes(z));
