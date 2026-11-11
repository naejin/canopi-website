// P5 seam (commit 0), filled by stream S5e: "native here" in three states (P5 engineering choices
// row): native here, not recorded native here, unknown (WCVP did not match the plant), at WGSRPD
// level 3, named as coarse. Stub: null (nothing said).
import type { PlantId, Taxon } from './types.ts';

export type NativeState = 'native' | 'not_recorded' | 'unknown';

// area: the site's level-3 code (SiteLookup.regions.wgsrpdL3), null offshore; natives:
// PlantSource.nativeIn(area).
export function nativeHere(_taxon: Taxon, _area: string | null, _natives: ReadonlySet<PlantId> | null): NativeState | null {
  return null;
}
