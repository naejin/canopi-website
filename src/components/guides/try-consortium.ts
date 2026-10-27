// The links of a <TryConsortium>: which beta cells a guide's plant opens, and the preset address of
// each (base?plant=<canonical_name>&climate=<id>; src/lib/consortium/state.ts reads it). Throws, and so
// fails the build, on a climate that is not a site climate and on a plant outside the cell it links to.
// No climate means every cell that has the plant, in the site's climate order: none is assumed.
import { climates, isClimate } from '../../data/climates.ts';

export interface PresetCell { climate: string; region: string; names: ReadonlySet<string>; }
export interface PresetLink { climate: string; regions: string[]; href: string; }
interface Manifest { cells: { climate_zone: string; region: string; file: string }[]; }
interface CellFile { taxa: { canonical_name: string }[]; }

// The manifest's cells with their canonical names; file(name) returns a cell file of the same folder.
export function presetCells(manifest: Manifest, file: (name: string) => CellFile | undefined): PresetCell[] {
  return manifest.cells.map((cell) => {
    const data = file(cell.file);
    if (!data) throw new Error(`<TryConsortium>: public/data/consortium/${cell.file} is missing`);
    return { climate: cell.climate_zone.toLowerCase(), region: cell.region, names: new Set(data.taxa.map((taxon) => taxon.canonical_name)) };
  });
}

export function presetLinks(base: string, plant: string, climate: string | undefined, cells: readonly PresetCell[]): PresetLink[] {
  if (climate !== undefined && !isClimate(climate)) throw new Error(`<TryConsortium climate>: "${climate}" is not a climate; use ${climates.join(', ')}`);
  const holding = cells.filter((cell) => cell.names.has(plant));
  if (!holding.length) throw new Error(`<TryConsortium plant>: "${plant}" is in no consortium cell (public/data/consortium/)`);
  const zones = climate ? [climate] : climates.filter((zone) => holding.some((cell) => cell.climate === zone));
  return zones.map((zone) => {
    const regions = holding.filter((cell) => cell.climate === zone).map((cell) => cell.region);
    if (!regions.length) throw new Error(`<TryConsortium>: "${plant}" is not in the ${zone} cell (public/data/consortium/)`);
    return { climate: zone, regions, href: `${base}?${new URLSearchParams({ plant, climate: zone })}` };
  });
}
