// The links of a <TryConsortium>: which beta climates a guide's plant opens, and the preset address of
// each (base?plant=<canonical_name>&climate=<id>; the consortium page reads it, design check A5).
// Throws, and so fails the build, on a climate that is not a site climate and on a plant outside the
// list of the climate it links to. No climate means every climate whose list has the plant, in the
// site's climate order: none is assumed. The lists are src/data/consortium-index.json's `names` (the
// canonical names placed in each climate, written by scripts/install-consortium.mjs; design check A4).
import { climates, isClimate } from '../../data/climates.ts';

export interface PresetClimate { climate: string; names: ReadonlySet<string>; }
export interface PresetLink { climate: string; href: string; }
interface ConsortiumIndex { climates: string[]; names: Record<string, string[]>; }

// The index's climates with their canonical names, the site's lowercase climate ids.
export function presetClimates(index: ConsortiumIndex): PresetClimate[] {
  return index.climates.map((zone) => {
    const names = index.names[zone];
    if (!names?.length) throw new Error(`<TryConsortium>: src/data/consortium-index.json has no names for ${zone}`);
    return { climate: zone.toLowerCase(), names: new Set(names) };
  });
}

export function presetLinks(base: string, plant: string, climate: string | undefined, files: readonly PresetClimate[]): PresetLink[] {
  if (climate !== undefined && !isClimate(climate)) throw new Error(`<TryConsortium climate>: "${climate}" is not a climate; use ${climates.join(', ')}`);
  const holding = files.filter((f) => f.names.has(plant));
  if (!holding.length) throw new Error(`<TryConsortium plant>: "${plant}" is in no consortium climate (src/data/consortium-index.json)`);
  const zones = climate ? [climate] : climates.filter((zone) => holding.some((f) => f.climate === zone));
  return zones.map((zone) => {
    if (!holding.some((f) => f.climate === zone)) throw new Error(`<TryConsortium>: "${plant}" is not in the ${zone} list (src/data/consortium-index.json)`);
    return { climate: zone, href: `${base}?${new URLSearchParams({ plant, climate: zone })}` };
  });
}
