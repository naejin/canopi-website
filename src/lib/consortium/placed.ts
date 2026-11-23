// Stream S5c: the nearest-list placement rule (placement.ts re-exports it): a curated climate uses its
// own placement; an uncovered one the first curated placement in its NEAREST_LISTS order (a zone other
// than the site's: the caller stamps Taxon.origin { kind: 'borrowed' }, the one estimate mark).
// W2 fix: plant-level Q10 defaults apply ONLY in step 3 (after own curated climate and nearest-list
// borrowed lookup both find nothing), never overriding a curated or borrowed placement.
import type { ClimateZone, Placement, Taxon } from './types.ts';
import { NEAREST_LISTS } from './nearest.ts';

// The first of `order` that has a value: the rule placeFor and PlantSource.borrowed share, over
// placements or over whole records of each curated climate.
export function firstPlaced<T>(byZone: Partial<Record<ClimateZone, T>>, zone: ClimateZone, order: readonly ClimateZone[] = NEAREST_LISTS[zone]): { zone: ClimateZone; value: T } | null {
  const own = byZone[zone];
  if (own !== undefined) return { zone, value: own };
  for (const z of order) {
    const v = byZone[z];
    if (v !== undefined) return { zone: z, value: v };
  }
  return null;
}

export interface Placed { zone: ClimateZone; placement: Placement; fromDefault?: true }

/**
 * W2 Q10 plant-level default placement derived from plant-level light & lifecycle traits when no
 * climate-specific or nearest-list curated placement exists.
 */
export function defaultPlacementOf(t: Pick<Taxon, 'role' | 'light' | 'traits'>): Placement | null {
  const stratum = t.light?.preferred ?? t.light?.sunniest ?? null;
  if (!stratum) return null;
  const annual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
  return {
    role: t.role,
    stratum,
    start: annual ? 'placenta_i' : 'secondary_i',
    end: annual ? 'placenta_ii' : 'secondary_iii',
    source: 'q10_default',
  };
}

// placements: the plant in every curated climate (PlantSource.placements); zone: the site's climate;
// nearestOrder: NEAREST_LISTS[zone] (passed in, so the rule stays pure and testable);
// fallback: optional W2 Q10 plant-level default used only after own + nearest-list return null.
export function placeFor(
  placements: Partial<Record<ClimateZone, Placement>>,
  zone: ClimateZone,
  nearestOrder: readonly ClimateZone[] = NEAREST_LISTS[zone],
  fallback: Placement | null = null,
): Placed | null {
  const hit = firstPlaced(placements, zone, nearestOrder);
  if (hit) return { zone: hit.zone, placement: hit.value };
  if (fallback) return { zone, placement: fallback, fromDefault: true };
  return null;
}
