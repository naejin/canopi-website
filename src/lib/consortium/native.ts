// P5 seam (commit 0), filled by stream S5e: "native here" in three states (P5 engineering choices
// row): native here, not recorded native here, unknown (WCVP did not match the plant), at WGSRPD
// level 3, named as coarse. Stub: null (nothing said).
import type { Mark, PlantId, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';

export type NativeState = 'native' | 'not_recorded' | 'unknown';

// area: the site's level-3 code (SiteLookup.regions.wgsrpdL3), null offshore; natives:
// PlantSource.nativeIn(area).
export function nativeHere(_taxon: Taxon, _area: string | null, _natives: ReadonlySet<PlantId> | null): NativeState | null {
  return null;
}

// The native mark (marks.ts provider). Stub: none.
export function nativeMarks(_taxon: Taxon, _ctx: MarkContext): Mark[] {
  return [];
}
