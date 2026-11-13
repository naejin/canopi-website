// The climate zones, one list and one order (E6 R1; design check §7.1 "Climate-zone list and
// order"): the export's ids in canopi-data order (climates.ord), and the site's lowercase ids
// ('tropical', src/data/climates.ts) mapped from them here only. The correction endpoint
// (src/lib/correction.mjs CLIMATES) and the site list (src/data/climates.ts) read this file; the
// installer (scripts/install-consortium.mjs, plain node) keeps a copy that
// scripts/consortium-zones.test.mjs checks equal.
import { climateZones, type ClimateZone } from './types.ts';

// The list itself is declared in types.ts (a frozen seam other streams own); this file is where the
// order and the site-id mapping are read from.
export { climateZones };
export type { ClimateZone };

// A zone's site id: the export id in lowercase ('Temperate' → 'temperate').
export type SiteId = Lowercase<ClimateZone>;
type SiteIds<T extends readonly string[]> = { readonly [K in keyof T]: T[K] extends string ? Lowercase<T[K]> : never };

export const siteIdOf = (zone: ClimateZone): SiteId => zone.toLowerCase() as SiteId;

// The site ids in zone order, typed as the exact tuple (Zod's z.enum and `as const` readers need it).
export const siteIds = /* @__PURE__ */ climateZones.map(siteIdOf) as unknown as SiteIds<typeof climateZones>;

const bySiteId = /* @__PURE__ */ new Map<string, ClimateZone>(climateZones.map((z) => [siteIdOf(z), z]));

// A climate id as the site, links and forms write it (any case, spaces around) → its zone, or null.
export const zoneOfSiteId = (id: string | null | undefined): ClimateZone | null =>
  (typeof id === 'string' ? bySiteId.get(id.trim().toLowerCase()) : undefined) ?? null;
