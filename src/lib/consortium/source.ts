// PlantSource: the one way the core reads plants (frozen seam, design check §4). The website
// implements it with SQL over the gzipped SQLite export (src/islands/consortium/data/sqlite-source.ts,
// stream S1); the app can implement it over its own catalogue later. Plain records only: the core
// computes the matrix, site fit and reason counts from pool(), so every source gets them free.
import type { ClimateZone, Details, Interaction, Labels, Locale, Placement, PlantId, SourceInfo, Stratum, Taxon } from './types.ts';

export interface PlantSource {
  info(): SourceInfo;
  countries(): ReadonlyMap<string, { invasiveChecked: boolean }>;
  // The plants placed in climate c, each with c's placement.
  pool(c: ClimateZone): Promise<Taxon[]>;
  // Interactions that apply in c: every one with no climate, plus c's intercropped yield gains.
  // Ranks (genus, family) are matched in the core.
  interactions(c: ClimateZone): Promise<Interaction[]>;
  placements(ids: PlantId[]): Promise<Map<PlantId, Partial<Record<ClimateZone, Placement>>>>;
  // Every plant's names in en and l, for search in JavaScript over folded names (never LIKE, A6).
  names(l: Locale): Promise<{ id: PlantId; canonical: string; names: Partial<Record<Locale, string>> }[]>;
  details(id: PlantId, c: ClimateZone, l: Locale): Promise<Details>;
  labels(l: Locale): Promise<Labels>;
  // Plants per stratum and phase in c, straight from SQL: a test oracle for the core's matrix.
  cellCounts(c: ClimateZone): Promise<{ stratum: Stratum; phase: number; n: number }[]>;
  // Schema 2 (P5 commit 0): the plants WCVP records as native (never introduced) in a WGSRPD level-3
  // area, e.g. 'FRA'; read once per area and kept. A plant with Taxon.areasKnown false is never in it
  // ("unknown", not "not native"). Synchronous so the marks providers can read it in a computed.
  nativeIn(l3: string): ReadonlySet<PlantId>;
}

// Why the data could not be opened, one per screen of design check §5.
// too-old: no DecompressionStream; wasm-blocked: WebAssembly missing, refused or timed out (P5);
// fetch: the file did not arrive (offline); stale: 404 after a deploy (a stale tab: Reload);
// damaged: decompress or open failed; schema: application_id, user_version, release id or climates
// differ from the index (the Reload screen, never a partial render).
export const loadFailures = ['too-old', 'wasm-blocked', 'wasm-fetch', 'fetch', 'stale', 'damaged', 'schema'] as const;
export type LoadFailure = (typeof loadFailures)[number];
