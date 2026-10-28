// Which climate file serves a climate, and which countries the invasive warnings know. The site names
// climates in lowercase ('tropical', the shared site choice of src/data/climates.ts); the export
// names them capitalised ('Tropical'). The mapping happens here, at the module edge, and nowhere else.
import type { ClimateZone, Manifest, ManifestClimate } from './types.ts';
import { climateZones } from './types.ts';

export const siteClimates = climateZones.map((z) => z.toLowerCase() as Lowercase<ClimateZone>);
export type SiteClimate = Lowercase<ClimateZone>;

export const isSiteClimate = (value: string): value is SiteClimate => (siteClimates as string[]).includes(value);

// The export's climate zone for a site climate id, or null for an id the export does not know.
export function climateZoneOf(climate: string): ClimateZone | null {
  const zone = climateZones.find((z) => z.toLowerCase() === climate.toLowerCase());
  return zone ?? null;
}

// The manifest entry (its `file`, regions, counts and checksum) of a climate, or null when that
// climate is not covered yet.
export function fileFor(manifest: Manifest, climate: string): ManifestClimate | null {
  const zone = climateZoneOf(climate);
  if (!zone) return null;
  return manifest.climates.find((c) => c.climate_zone === zone) ?? null;
}

// A country code the manifest lists (every ISO 3166-1 alpha-2 code, and XK).
export const isCountry = (manifest: Manifest, code: string | null | undefined): boolean =>
  !!code && Object.hasOwn(manifest.countries, code.toUpperCase());

// Whether GRIIS checked the country: only then is a taxon with no record there "not recorded
// invasive"; elsewhere it is "not checked", never "none".
export const invasiveChecked = (manifest: Manifest, code: string | null | undefined): boolean =>
  !!code && manifest.countries[code.toUpperCase()]?.invasive_checked === true;
