// The links of a <TryConsortium>: which beta climates a guide's plant opens, and the preset address of
// each (base?plant=<canonical_name>&climate=<id>; src/lib/consortium/state.ts reads it). Throws, and so
// fails the build, on a climate that is not a site climate and on a plant outside the climate file it
// links to. No climate means every climate whose file has the plant, in the site's climate order: none
// is assumed.
import { climates, isClimate } from '../../data/climates.ts';

export interface PresetClimate { climate: string; names: ReadonlySet<string>; }
export interface PresetLink { climate: string; href: string; }
interface Manifest { climates: { climate_zone: string; file: string }[]; }
interface ClimateFile { taxa: { canonical_name: string }[]; }

// The manifest's climate files with their canonical names; file(name) returns a file of the same folder.
export function presetClimates(manifest: Manifest, file: (name: string) => ClimateFile | undefined): PresetClimate[] {
  return manifest.climates.map((entry) => {
    const data = file(entry.file);
    if (!data) throw new Error(`<TryConsortium>: public/data/consortium/${entry.file} is missing`);
    return { climate: entry.climate_zone.toLowerCase(), names: new Set(data.taxa.map((taxon) => taxon.canonical_name)) };
  });
}

export function presetLinks(base: string, plant: string, climate: string | undefined, files: readonly PresetClimate[]): PresetLink[] {
  if (climate !== undefined && !isClimate(climate)) throw new Error(`<TryConsortium climate>: "${climate}" is not a climate; use ${climates.join(', ')}`);
  const holding = files.filter((f) => f.names.has(plant));
  if (!holding.length) throw new Error(`<TryConsortium plant>: "${plant}" is in no consortium climate (public/data/consortium/)`);
  const zones = climate ? [climate] : climates.filter((zone) => holding.some((f) => f.climate === zone));
  return zones.map((zone) => {
    if (!holding.some((f) => f.climate === zone)) throw new Error(`<TryConsortium>: "${plant}" is not in the ${zone} list (public/data/consortium/)`);
    return { climate: zone, href: `${base}?${new URLSearchParams({ plant, climate: zone })}` };
  });
}
