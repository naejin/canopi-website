// PlantSource: the one way the core reads plants (frozen seam, design check §4). The website
// implements it with SQL over the gzipped SQLite export (src/islands/consortium/data/sqlite-source.ts,
// stream S1); the app can implement it over its own catalogue later. Plain records only: the core
// computes site fit, verdicts and reason counts from pool(), so every source gets them free.
import type { ClimateZone, Details, FactAt, FactKey, FactValues, Interaction, Labels, LayerValue, Locale, PeriodId, Placement, PlantId, PlantNames, SourceInfo, Taxon } from './types.ts';
import { periodIds } from './types.ts';

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
  // Every plant of the release (all lists, PP-C commit 0) with its names in en and l and the lists that
  // place it, for search in JavaScript over folded names (never LIKE, A6); `plant` maps the names file's
  // integers onto ids (only for the release the file is bound to: c1 drops a file bound to another).
  names(l: Locale): Promise<PlantNames[]>;
  details(id: PlantId, c: ClimateZone, l: Locale): Promise<Details>;
  labels(l: Locale): Promise<Labels>;
  // Plant palette seam (PP-B commit 0; body in PP-G with the `year` chunk): the month layer values
  // (bloom and ripening months) of the plants `ids` that apply in c, one query for a whole palette.
  layerValues(ids: readonly PlantId[], c: ClimateZone): Promise<Map<PlantId, LayerValue[]>>;
}

// Why the data could not be opened, one per screen of design check §5.
// too-old: no DecompressionStream; wasm-blocked: WebAssembly missing, refused or timed out (P5);
// fetch: the file did not arrive (offline); stale: 404 after a deploy (a stale tab: Reload);
// damaged: decompress or open failed; schema: application_id, user_version, release id or climates
// differ from the index (the Reload screen, never a partial render).
export const loadFailures = ['too-old', 'wasm-blocked', 'wasm-fetch', 'fetch', 'stale', 'damaged', 'schema'] as const;
export type LoadFailure = (typeof loadFailures)[number];

// ---- factAt (ADR-6, E6 R4): the plant facts that depend on the site and the climate period ----

// The period a view reads today's facts for (SitePeriod.period of the historical scenario): the one
// "today", periodIds[0].
export const TODAY_PERIOD: PeriodId = periodIds[0];
// Each fact as the PlantSource stored it (null: not recorded, never a misfit). Read through factAt only,
// so F2 (per site and period) and E7 (scoped stored facts) change one place, not the views.
const STORED: { [K in FactKey]: (t: Taxon) => FactValues[K] | null } = {
  water_need: ({ traits: tr }) => {
    const drought = tr.drought_tolerance ?? null, moisture = tr.moisture_use ?? null;
    return drought === null && moisture === null ? null : { drought, moisture };
  },
};
// A fact of a plant at a site in a period: today the stored value whatever the site and period (the
// signature is the seam F2 and E7 fill).
export const factAt: FactAt = (key, taxon) => STORED[key](taxon);
