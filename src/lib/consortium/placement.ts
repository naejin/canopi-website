// Stream S5c: where a plant goes for a site's climate. A curated climate uses its own placement; an
// uncovered one borrows the first curated placement in its nearest-list order, marked "estimate"
// (owner answer 1, 2026-11-11: one fixed table in the core). This works by climate alone: a link or
// a card naming Subtropical opens with borrowed plants, no location needed.
import type { ClimateZone, PlacementOrigin } from './types.ts';
import { NEAREST_LISTS } from './nearest.ts';

// The placement rule itself (firstPlaced, placeFor) is in placed.ts, used by the PlantSource's chunk
// and the tests, so it stays out of the first run; re-exported here for index.ts. The table is in
// the leaf nearest.ts, which both read and index.ts exports.
export * from './placed.ts';

// The placement origin (Taxon.origin, ADR-6): its one reader and writer. Absent: the climate's own plant.
type HasOrigin = { origin?: PlacementOrigin };
// A plant as a guest of the consortium, added from `list` ("Add anyway", A9): a copy, so the list's own
// record stays unstamped. A plant whose placement was borrowed keeps that origin (where its placement,
// reasons and estimate mark come from wins over the list it was picked in) and notes that list as
// `guest`, so it is labelled as a guest in every view (E6 hand-off D).
export const asGuest = <T extends HasOrigin>(t: T, list: ClimateZone): T => ({ ...t, origin: t.origin ? { ...t.origin, guest: list } : { list, kind: 'guest' } });
// The list a guest was added from ("From the {climate} list"), else null.
export const guestOf = (t: HasOrigin): ClimateZone | null => (t.origin?.kind === 'guest' ? t.origin.list : t.origin?.guest ?? null);
// The curated list a borrowed placement was taken from (the "estimate" mark and note), else null.
export const borrowedFrom = (t: HasOrigin): ClimateZone | null => (t.origin?.kind === 'borrowed' ? t.origin.list : null);

// The list a plant's placement, reasons and climate months come from: its origin's list (the curated
// list a borrowed placement was taken from, or a guest's list), else the shown climate. Details queries
// with it, as only curated lists have reasons; the sheet says when it differs from the reader's climate.
export const placementZone = (t: HasOrigin, climate: ClimateZone | null): ClimateZone | null => t.origin?.list ?? climate;

// Whether a climate has plants to suggest from: curated, or one of its nearest lists is.
export const hasPlants = (zone: ClimateZone, curated: readonly ClimateZone[]): boolean =>
  curated.includes(zone) || NEAREST_LISTS[zone].some((z) => curated.includes(z));
