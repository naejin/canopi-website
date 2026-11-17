// The nearest-list table (stream S5c; E6 R1 made it a leaf, so placed.ts and placement.ts both read
// it and neither imports the other). A curated climate uses its own placement; an uncovered one
// borrows the first curated placement in its list's order, marked "estimate" (owner answer 1,
// 2026-11-11: one fixed table in the core).
import type { ClimateZone } from './types.ts';

// P5 engineering choices row (2026-11-11): Subtropical and Arid → Mediterranean, Tropical,
// Temperate; Continental and Boreal → Temperate, then Mediterranean; a curated climate is its own.
// A climate the export curates reads its own list first (the index's curated climates win): Arid is
// curated since r-b7fb536f9cfd0700, so its row here serves only an export without the Arid list.
export const NEAREST_LISTS: Readonly<Record<ClimateZone, readonly ClimateZone[]>> = {
  Tropical: ['Tropical'],
  Subtropical: ['Mediterranean', 'Tropical', 'Temperate'],
  Arid: ['Mediterranean', 'Tropical', 'Temperate'],
  Mediterranean: ['Mediterranean'],
  Temperate: ['Temperate'],
  Continental: ['Temperate', 'Mediterranean'],
  Boreal: ['Temperate', 'Mediterranean'],
};
