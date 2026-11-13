// PlantSource: the one way the core reads plants (frozen seam, design check §4). The website
// implements it with SQL over the gzipped SQLite export (src/islands/consortium/data/sqlite-source.ts,
// stream S1); the app can implement it over its own catalogue later. Plain records only: the core
// computes the matrix, site fit and reason counts from pool(), so every source gets them free.
import type { ClimateZone, Details, FactAt, FactKey, FactValues, Interaction, Labels, Locale, Placement, PlantId, SourceInfo, Stratum, Taxon } from './types.ts';

export interface PlantSource {
  info(): SourceInfo;
  countries(): ReadonlyMap<string, { invasiveChecked: boolean }>;
  // The plants placed in climate c, each with c's placement; for a climate the export does not curate
  // (not in info().climates), borrowed(c, NEAREST_LISTS[c]).
  pool(c: ClimateZone): Promise<Taxon[]>;
  // P5 seam (commit 0, S5c owns the sqlite-source body): an uncurated climate's plants placed from the
  // nearest curated lists in `order` (placement.ts), each with origin { list, kind: 'borrowed' }.
  borrowed(zone: ClimateZone, order: readonly ClimateZone[]): Promise<Taxon[]>;
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
}

// Why the data could not be opened, one per screen of design check §5.
// too-old: no DecompressionStream; wasm-blocked: WebAssembly missing, refused or timed out (P5);
// fetch: the file did not arrive (offline); stale: 404 after a deploy (a stale tab: Reload);
// damaged: decompress or open failed; schema: application_id, user_version, release id or climates
// differ from the index (the Reload screen, never a partial render).
export const loadFailures = ['too-old', 'wasm-blocked', 'wasm-fetch', 'fetch', 'stale', 'damaged', 'schema'] as const;
export type LoadFailure = (typeof loadFailures)[number];

// ---- factAt (ADR-6, E6 R4): the plant facts that depend on the site and the climate period ----

// The period a view reads today's facts for (SitePeriod.period of the historical scenario).
export const TODAY_PERIOD = '1991-2020';
// Each fact as the PlantSource stored it (null: not recorded, never a misfit). Read through factAt only,
// so F2 (per site and period) and E7 (scoped stored facts) change one place, not the views.
const STORED: { [K in FactKey]: (t: Taxon) => FactValues[K] | null } = {
  life_cycle: ({ traits: tr }) =>
    tr.is_annual === true ? 'annual' : tr.grown_as_annual === true ? 'grown_as_annual' : tr.is_perennial === true ? 'perennial' : null,
  cold_limit: ({ climate }) => {
    const r = climate?.tminCold;
    return r && r.low !== null ? { tminColdC: r.low, weak: r.weak === true } : null;
  },
  heat_limit: ({ climate }) => {
    const high = climate?.tmaxWarm?.high ?? null;
    return high === null ? null : { tmaxWarmC: high };
  },
  water_need: ({ traits: tr }) => {
    const drought = tr.drought_tolerance ?? null, moisture = tr.moisture_use ?? null;
    return drought === null && moisture === null ? null : { drought, moisture };
  },
};
// A fact of a plant at a site in a period: today the stored value whatever the site and period (the
// signature is the seam F2 and E7 fill).
export const factAt: FactAt = (key, taxon) => STORED[key](taxon);
