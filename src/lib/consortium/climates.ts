// Which cell file serves a place. The site names climates in lowercase ('tropical', the shared
// site choice of src/data/climates.ts); the export names them capitalised ('Tropical'). The mapping
// happens here, at the module edge, and nowhere else.
import type { ClimateZone, Manifest, ManifestCell, Region } from './types.ts';
import { climateZones, regions } from './types.ts';

export const siteClimates = climateZones.map((z) => z.toLowerCase() as Lowercase<ClimateZone>);
export type SiteClimate = Lowercase<ClimateZone>;

export const isSiteClimate = (value: string): value is SiteClimate => (siteClimates as string[]).includes(value);
export const isRegion = (value: string): value is Region => (regions as readonly string[]).includes(value);

// The export's climate zone for a site climate id, or null for an id the export does not know.
export function climateZoneOf(climate: string): ClimateZone | null {
  const zone = climateZones.find((z) => z.toLowerCase() === climate.toLowerCase());
  return zone ?? null;
}

// The manifest entry (its `file`, counts and checksum) of the accepted cell for a place, or null when
// that cell is not covered yet.
export function cellFor(manifest: Manifest, climate: string, region: string): ManifestCell | null {
  const zone = climateZoneOf(climate);
  if (!zone) return null;
  return manifest.cells.find((c) => c.climate_zone === zone && c.region === region) ?? null;
}

// A country's regions, the default (where most of its people live) first. [] for a code the table
// lacks, such as the Antarctic and subantarctic codes (AQ, BV, FK, GS, HM, TF): the page then asks for
// the region.
export function regionsOf(manifest: Manifest, country: string): Region[] {
  const list = manifest.country_regions[country.toUpperCase()];
  return Array.isArray(list) ? list.filter(isRegion) : [];
}
