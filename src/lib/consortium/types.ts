// Consortium v2 core types (frozen seam, commit 0 of P2; design check §4). The core
// (src/lib/consortium/) reads plants only through PlantSource (./source.ts) as these plain records,
// imports nothing outside this folder and touches no DOM (scripts/consortium-boundary.test.mjs).
// The data contract is canopi-data docs/consortium-export-v2.md (format 4, schema 4.7 or later:
// docs/website-handoff/2026-11-14-schema4-format.md, 4.2 2026-11-17-toxicity-parts.md, 4.5
// 2026-11-17-light-span.md, 4.6 2026-11-18-llm-estimates.md, 4.7 2026-11-18-name-kind.md); the adapter
// (src/islands/consortium/data/sqlite-source.ts, stream S1) fills these records from SQL.
// Streams may add fields; renaming or removing one is a seam change for the coordinator.
//
// null means unknown or not recorded. The schema's "no rows" for functions means not curated, never
// "none": Taxon.functions is null then.

// The schema the reader opens (PRAGMA user_version): 4, at minor 4.7 or later (the installer refuses an
// older minor: scripts/consortium-schema.mjs MIN_SCHEMA_MINOR). No older schema or minor is read (PP-C
// 0b and 0c, owner 2026-11-17 "no backward compatibility").
export const SCHEMA_VERSIONS = [4] as const;
export type SchemaVersion = (typeof SCHEMA_VERSIONS)[number];
// PRAGMA application_id of the export ("CCON"), checked when the database opens.
export const APPLICATION_ID = 0x43434f4e;

// The export's climate zones: declared once in zones.ts (E6 R2), with their order and the site-id
// mapping; re-exported here for the readers of this file.
import type { ClimateZone } from './zones.ts';
export { climateZones, type ClimateZone } from './zones.ts';

// WGSRPD level-1 continents (Antarctica excluded), in the export's region order. A region labels the
// reasons a plant was placed (one per accepted cell of its climate); it never filters plants.
export const regions = ['europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america'] as const;
export type Region = (typeof regions)[number];

export const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'] as const;
export type Locale = (typeof locales)[number];

// Successional phases in order (phases.ord 0–6, the app's .canopi phase numbers).
export const phases = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'] as const;
export type Phase = (typeof phases)[number];
export type PhaseOrd = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// canopi-data's stratum values, top to bottom (strata.ord 0–3); the page maps the labels.
export const strata = ['emergent', 'high', 'medium', 'low'] as const;
export type Stratum = (typeof strata)[number];

export const roles = ['crop', 'support'] as const;
export type Role = (typeof roles)[number];

export const functionIds = ['nitrogen_fixer', 'dynamic_accumulator', 'mulch', 'ground_cover', 'insectary', 'pest_repellent', 'trap_crop', 'pollinator_forage', 'windbreak', 'wildlife_habitat'] as const;
export type FunctionId = (typeof functionIds)[number];
export type FunctionMethod = 'import' | 'rule' | 'extraction' | 'curated';

// intercropped_yield_gain and allelopathy_tolerant are good news, never a conflict.
export const interactionTypes = ['allelopathic_harm', 'allelopathy_tolerant', 'alternate_host', 'shared_pest', 'intercropped_yield_gain'] as const;
export type InteractionType = (typeof interactionTypes)[number];
export const severities = ['low', 'medium', 'high'] as const;
export type Severity = (typeof severities)[number];
export type Rank = 'species' | 'genus' | 'family';

export const toxicityLevels = ['None', 'Slight', 'Moderate', 'Severe'] as const;
export type ToxicityLevel = (typeof toxicityLevels)[number];

export const layerFields = ['bloom_months', 'ripening_or_fruit_seen_months', 'sowing_months', 'tolerates_wind'] as const;
export type LayerField = (typeof layerFields)[number];
// recorded: a dataset gives it; every other kind is an estimate and the page marks it.
export const layerKinds = ['recorded', 'extracted', 'derived', 'llm'] as const;
export type LayerKind = (typeof layerKinds)[number];
// Schemas 4.6 (functions.kind) and 4.7 (plant_names.kind): 'llm', the one kind those columns hold
// (the same word as layer_values and trait_sources), or null.
export type EstimateKind = Extract<LayerKind, 'llm'>;
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export type Month = (typeof months)[number];

// The four site questions. Every one has "unsure" and starts at it (design check A7, owner-facing
// row "v2 mockup choices" 2026-11-11): "unsure" filters nothing, and Room "unsure" shows heights.
export const lights = ['sun', 'part', 'shade', 'unsure'] as const;
export const soils = ['acid', 'neutral', 'chalky', 'unsure'] as const;
export const waters = ['dry', 'average', 'wet', 'unsure'] as const;
// Every room value (F1a commit 0, A8; a height word only, owner revision 4: area is Place.plotM2).
// `roomValues` is every room a palette holds and a link's `m=` carries: 'pots' ("Balcony or pots";
// site.ts ROOM_LIMIT_M and suggest.ts SIZE_LIMIT give it the small garden's limits) is read and kept
// since PP-B commit 0; Place offers every value (b1a).
export const roomValues = ['pots', 'small', 'large', 'field', 'unsure'] as const;
export type Room = (typeof roomValues)[number];
// The derived input of site.ts fits(): place.ts siteOf builds it from the merged site inputs
// (site-inputs.ts, owner 2026-11-18), never from a stored answer.
export interface Site {
  light: (typeof lights)[number];
  soil: (typeof soils)[number];
  water: (typeof waters)[number];
  room: Room;
}
export type SiteKey = keyof Site;
export const siteKeys: readonly SiteKey[] = ['light', 'soil', 'water', 'room'];

export type PlantId = string; // plants.id UUID; never the integer `plant`, which is local to a file

// Short text: en always, fr when the curator wrote it; other locales fall back to en.
export type Text = { en: string } & Partial<Record<Locale, string>>;
export interface Range { min: number | null; max: number | null }

export interface Source { label: string; url: string | null; licence: string | null; attribution: string | null }

// url is the self-hosted path from src/data/consortium-index.json (design check A4), never the
// export's remote url. credit is null only for CC0 or public domain.
export interface Image { url: string; credit: string | null; licence: string | null; source_page_url: string | null }

// kind (schema 4.6 functions.kind): 'llm' when every row behind the entry is an AI estimate: with method
// 'extraction', a model's reading of the cited work in `sources` (pfaf or a book's credit id); with method
// 'curated', an estimate from the model's own knowledge (sources ['llm-knowledge']). null: as before 4.6.
export interface TaxonFunction { function: FunctionId; method: FunctionMethod; sources: string[]; kind: EstimateKind | null }

// A plant's placement in one curated climate (design check §4). All of stratum, start, end and source
// are null together: no accepted roles row yet ("no layer yet").
export interface Placement { role: Role; stratum: Stratum | null; start: Phase | null; end: Phase | null; source: string | null }

// Catalog values as exported: English categorical strings (labels translate them), null = unknown.
export interface Traits {
  height_m: Range | null; // wild maximums: "can grow over N m in the wild", never a silent fit when null
  width_max_m: number | null;
  sun: boolean | null;
  semi_shade: boolean | null;
  full_shade: boolean | null;
  hardiness_zone: Range | null;
  frost_tender: boolean | null;
  soil_ph: Range | null;
  well_drained: boolean | null;
  moisture_use: string | null;
  drought_tolerance: string | null;
  fertility_requirement: string | null;
  deciduous_evergreen: string | null;
  active_growth_period: string | null;
  bloom_period: string | null;
  harvest_period: string | null;
  lifespan: string | null;
  growth_rate: string | null;
  age_of_maturity_years: number | null;
  root_depth_min_cm: number | null;
  taproot_persistent: boolean | null;
  root_system_type: string | null;
  mycorrhizal_type: string | null;
  nitrogen_fixer: boolean | null;
  edibility_rating: number | null;
  self_fertile: boolean | null;
  sexual_system: string | null;
  pollinators: string[] | null;
  vegetative_spread_rate: string | null;
  clonal_growth_form: string | null;
  is_annual: boolean | null;
  // A crop grown as an annual that is_annual misses (onion, carrot, potato; canopi-data, schema 3).
  grown_as_annual: boolean | null;
  is_perennial: boolean | null;
  habit: string | null;
}

export interface Toxicity { level: ToxicityLevel; sources: string[] }
// ISO 3166-1 alpha-2 countries (GRIIS, and since schema 4.3 ES's es_catalogo and atlas_aloctonas_es; one
// plant_invasive row per country, its source the widest scope); read with countries().invasiveChecked,
// which since 4.3 means "a source in the release assessed invasiveness there" (0: "not checked").
export interface InvasiveRecord { country: string; sources: string[] }
// Schema 4.3 plant_invasive_areas (canopi-data docs/website-handoff/2026-11-17-invasive-scope.md): the
// closed lists the reader has words for. Area: a WCVP level-3 code (BAL Baleares, CNY Canarias, SPA
// mainland Spain); source: the sources whose wording differs (an atlas row is never a legal listing).
export const invasiveAreaCodes = ['BAL', 'CNY', 'SPA'] as const;
export type InvasiveAreaCode = (typeof invasiveAreaCodes)[number];
export const invasiveSources = ['griis', 'es_catalogo', 'atlas_aloctonas_es'] as const;
export type InvasiveSource = (typeof invasiveSources)[number];
// One source naming the plant invasive in part of a country: its areas, in code order. A (plant,
// country) with no scope rows is the whole country (InvasiveRecord alone).
export interface InvasiveScope { country: string; source: InvasiveSource; areas: InvasiveAreaCode[] }

// ---- schemas 2 and 3: observed climate ranges (P5 commit 0; the ranges rebuild) ----

// How a range was measured: GBIF occurrence cells thinned to one per climate cell and weighed by
// one-degree block (every plant today; schema 3, canopi-data docs/plant-climate-ranges.md), TreeGOER
// quantiles or EcoCrop limits (plant_climate.basis).
export type RangeBasis = 'thinned_cells' | 'treegoer_quantiles' | 'ecocrop_limits';
// One variable's range across a plant's recorded cells, cultivation included (coordinator row
// "Observed ranges include cultivation"): low and high are its limits (Q05 and Q95 of the thinned
// cells; the warmest-month maximum's high is the heat limit, Q99), median their median; null where
// not computed. blocks: the one-degree blocks the cells fall in; lowSource/highSource: the source of
// each end (null: the row's own); weak (schema 3): a disputed limit (TreeGOER stricter by more than 4 °C,
// the looser bound kept); range.ts compares it as any row, the verdict marks it disputed (verdict-line.ts confDisputedLimit).
export interface ClimateRange {
  low: number | null; median: number | null; high: number | null; count: number | null; basis: RangeBasis;
  blocks: number | null; lowSource: string | null; highSource: string | null; weak: boolean;
}
// A plant's observed climate (plant_climate + plant_climate_status), what range, future and native
// share checks read: coldest-month minimum, warmest-month maximum and the year's mean temperature
// (the mean of the coldest and warmest months' means) and the warmest month's mean (annuals' summer) in °C, the aridity index (P/PET).
// cells: GBIF cells with records; nativeShare: the share of them inside WCVP native areas.
// The export's plant_climate variables the source reads (sqlite-source.ts), each with the TaxonClimate
// field it fills: the one list of range variables (range.ts RANGE_BOUNDS says how each is checked).
export const RANGE_VARIABLES = { tmin_cold: 'tminCold', tmax_warm: 'tmaxWarm', tmean_year: 'tmeanYear', tmean_warm: 'tmeanWarm', aridity: 'aridity' } as const;
export type RangeVariable = keyof typeof RANGE_VARIABLES;
// Read beside the range variables and never checked (M23): the annual rain of the plant's observed
// cells in mm (plant_climate 'precip'), for the words "recorded from 25 mm" (verdict-line, Find's row).
// Not in RANGE_VARIABLES, so no verdict changes with it.
export const READ_ONLY_VARIABLES = { precip: 'precip' } as const;
export interface TaxonClimate {
  source: string;
  /** Annual rain of the observed cells, mm; never part of a verdict (READ_ONLY_VARIABLES). */
  precip: ClimateRange | null;
  tminCold: ClimateRange | null;
  tmaxWarm: ClimateRange | null;
  tmeanYear: ClimateRange | null;
  tmeanWarm: ClimateRange | null;
  aridity: ClimateRange | null;
  cells: number | null;
  nativeShare: number | null;
}
// One Köppen class of a plant's observed cells (plant_koppen; Details only, hidden under 1 %).
export interface KoppenShare { code: string; share: number; cells: number }

export interface Warnings {
  toxicity: Toxicity | null;
  // [] = no record (in a checked country: "not recorded invasive"); null = GRIIS was not read.
  invasive_in: InvasiveRecord[] | null;
  allelopathic: boolean | null;
  weed_potential: boolean | null;
}

// One plant as the core sees it in one climate: the per-climate shape of v1, filled by the adapter
// from that climate's placement, so conflicts, site fit and the side view read one record.
export interface Taxon {
  id: PlantId;
  canonical_name: string;
  genus: string;
  family: string | null;
  names: Partial<Record<Locale, string>>;
  image: Image | null;
  role: Role;
  stratum: { value: Stratum; sources: string[] } | null;
  phases: { start: Phase; end: Phase; sources: string[] } | null;
  functions: TaxonFunction[] | null; // null = not curated (no rows)
  traits: Traits;
  warnings: Warnings;
  // Schema 2: the observed climate range; null when none is recorded (plant_climate_status.range_source
  // NULL): "range not recorded", never filtered (owner answer 2, 2026-11-11).
  climate: TaxonClimate | null;
  // WCVP matched the plant, so its native areas are known (plants.wcvp_match not NULL); false: "native
  // here" is unknown, never "not native".
  areasKnown: boolean;
  // Where its placement comes from when it is not the climate's own (ADR-6, E6 R4; placement.ts reads
  // it): a guest added from another climate's list ("Add anyway", design check A9: placed as there and
  // labelled "From the {climate} list"), or, P5 S5c, the curated list a site of an uncovered climate
  // borrowed it from (placement.ts placeFor, the nearest-list table; the "estimate" label). Absent for
  // the climate's own plants: they are never stamped.
  origin?: PlacementOrigin;
  // Schema 4.5 (canopi-data light span; v13 hand-off item 1): the light levels the plant grows in
  // (sunniest to shadiest end, both or neither) and the level it is found mostly in (preferred). Each
  // null: unknown, never "no light needs" (the plant shows its single level).
  light: LightNiche;
}
export interface LightNiche { sunniest: Stratum | null; shadiest: Stratum | null; preferred: Stratum | null }

export interface TaxonRef { name: string; rank: Rank }
export interface AgentNames { names: Partial<Record<Locale, string>>; sources: string[] }

export interface Interaction {
  subject: TaxonRef;
  object: TaxonRef;
  type: InteractionType;
  climate_zone: ClimateZone | null; // set only on intercropped_yield_gain
  agent: string | null;
  agent_names: AgentNames | null;
  severity: Severity | null;
  note: Text | null;
  sources: string[];
}

// Why a plant was placed in a climate, for one region whose accepted cell chose it.
export interface Reason { region: Region; text: Text; source: string }

// Where a layer value holds; null: everywhere. latitude is a band such as "35..50" or "-50..-35".
export interface LayerScope { climate?: ClimateZone; country?: string; hemisphere?: 'N' | 'S'; latitude?: string; region?: Region }
export interface LayerValue {
  field: LayerField;
  months: Month[] | null; // in order from months_from (a run over the new year keeps its order); null for wind
  flag: boolean | null; // tolerates_wind only
  climate: ClimateZone | null; // null: ships in every climate the plant has
  scope: LayerScope | null;
  source: string;
  kind: LayerKind;
}

// What the details sheet shows for one plant in one climate and locale (PlantSource.details).
export interface Details {
  id: PlantId;
  climate: ClimateZone;
  reasons: Reason[];
  layerValues: LayerValue[];
  image: Image | null;
  invasiveIn: InvasiveRecord[] | null;
  toxicitySources: string[];
  sources: Record<string, Source>; // every source id the sheet cites
  placements: Partial<Record<ClimateZone, Placement>>; // this plant in every curated climate
  koppen: KoppenShare[]; // schema 2: the Köppen classes of its observed cells, largest share first; [] with no range
  // Schema 4 (PP-C commit 0; c2 draws them; [] for a plant without rows). None of them changes a
  // verdict, a filter or a ranking (format note, decision 17: inform, don't block).
  disputes: Dispute[]; // plant_disputes: other sources that disagree with a shipped value
  audiences: ToxicityAudience[]; // plant_toxicity_audience: one row per animal audience and source
  traitSources: TraitSource[]; // trait_sources: where a shipped trait value comes from and holds
  // plant_frost: this plant's frost facts. null: the release has no row at all (no frost line); [] with
  // frostRecorded: the release has rows, none for this plant ("not recorded").
  frost: FrostFact[] | null;
  toxicityParts: ToxicityPart[]; // 4.2 plant_toxicity_parts: the parts a source names as toxic
  // 4.3 plant_invasive_areas: per (country, source), the areas it names; a pair holding an area or a
  // source outside the closed lists is left out whole, so it reads at country level (never wrong).
  invasiveAreas: InvasiveScope[];
  gbifRecords: number | null; // plant_climate_status.gbif_records: the occurrence records the range rests on
  // Schema 4.7 plant_names.kind: the locales whose primary name rests only on an AI suggestion ('llm');
  // a locale absent here has a sourced or corrected primary, or none.
  nameKinds: Partial<Record<Locale, EstimateKind>>;
}

// ---- Schema 4 records (format note tables; open vocabularies as strings: a value the reader does not
// know skips its row, never the plant) ----

// A source that disagrees with the shipped value. field: 'tmin_cold.low' | 'tmean_year.low' (range,
// with unit 'C') | 'toxicity' | 'plant_invasive' | 'weed_potential' | 'allelopathic' (queue). value: the
// source's stricter value, null for a flag-only row ("names a hazard, no level given"). derived: the
// value is computed from the source's data, not stated by it. scope: a country (ISO alpha-2) or null.
export type DisputeField = 'tmin_cold.low' | 'tmean_year.low' | 'toxicity' | 'plant_invasive' | 'weed_potential' | 'allelopathic';
export interface Dispute { field: DisputeField; kind: 'range' | 'queue'; value: string | null; unit: 'C' | null; derived: boolean; scope: string | null; source: string }
// An animal audience's toxicity (never merged into one pick). level null: the source states none.
export interface ToxicityAudience { who: 'livestock' | 'pets'; level: ToxicityLevel | null; source: string }
// Where a shipped trait value comes from (field: 'frost_tender' and the declared values) and where it
// holds (scope: a country, null for everywhere); kind as layer_values.kind.
// traitFields: the plants columns this reader reads (sqlite-source.ts traitsOf and the warnings), by
// their export names (a view maps tolerates_full_sun to Traits.sun); frost_tender is the format note's
// base value, the others declared additions (the staging export ships 21; c2's sourceLine labels a
// corrected value). A field naming no column read here is skipped (review c0-4, round 2 4a).
export const traitFields = [
  'height_min_m', 'height_max_m', 'width_max_m', 'tolerates_full_sun', 'tolerates_semi_shade', 'tolerates_full_shade',
  'hardiness_zone_min', 'hardiness_zone_max', 'frost_tender', 'soil_ph_min', 'soil_ph_max', 'well_drained', 'moisture_use',
  'drought_tolerance', 'fertility_requirement', 'deciduous_evergreen', 'active_growth_period', 'bloom_period', 'harvest_period',
  'lifespan', 'growth_rate', 'age_of_maturity_years', 'root_depth_min_cm', 'taproot_persistent', 'root_system_type',
  'mycorrhizal_type', 'nitrogen_fixer', 'edibility_rating', 'self_fertile', 'sexual_system', 'pollinators',
  'vegetative_spread_rate', 'clonal_growth_form', 'is_annual', 'grown_as_annual', 'is_perennial', 'habit',
  'toxicity', 'allelopathic', 'weed_potential',
  // Schema 4.5: each end of the light span and the preferred level (their trait_sources rows).
  'sun_exposure_sunniest', 'sun_exposure_shadiest', 'sun_exposure_preferred',
] as const;
export type TraitField = (typeof traitFields)[number];
export interface TraitSource { field: TraitField; source: string; scope: string | null; kind: LayerKind }
// A frost fact (plant_frost, empty until canopi-data D8; schema-4 format note, plant_frost). kind 'ktmp':
// EcoCrop's killing temperature while growing (°C); 'ktmpr': EcoCrop's killing temperature at rest
// (dormant, °C), shown apart with its own label and never merged with KTMP or part of the precedence;
// 'class': 'tender' | 'light' | 'hard' from the pinned vegetable table. variety null: the species; a
// variety row is a ktmp (or ktmpr) row with `variety` set. coarse: a ktmp of exactly 0 °C (a rough
// value). Precedence (format note Q7): the species KTMP when not coarse, else the range of the variety
// KTMPs that are not coarse (with their names), else the class, else a coarse 0 worded as an estimate.
export interface FrostFact { kind: 'ktmp' | 'ktmpr' | 'class'; valueC: number | null; frostClass: 'tender' | 'light' | 'hard' | null; variety: string | null; coarse: boolean; source: string; scopeCountry: string | null }
// A toxic part as a source names it (4.2). who null: the plant's own warning (beside plants.toxicity);
// else that animal's audience row. condition null: none stated. Carries no level, never narrows the
// whole plant, never says "only" (toxicity-parts note, Display).
export type ToxicPart = 'whole_plant' | 'leaves' | 'stems' | 'shoots' | 'bark' | 'sap' | 'flowers' | 'fruits' | 'berries' | 'seeds' | 'pods' | 'nuts' | 'roots' | 'bulbs' | 'tubers' | 'essential_oil';
export type ToxicCondition = 'raw' | 'unripe' | 'immature' | 'wilted' | 'sprouted' | 'large_amounts' | 'prolonged_use' | 'skin_contact' | 'pregnancy';
export interface ToxicityPart { who: 'livestock' | 'pets' | null; part: ToxicPart; condition: ToxicCondition | null; genusWide: boolean; source: string }
// One plant of the release for search (PlantSource.names): the core's integer (plants.plant, which the
// names file's rows name; renumbered by a release, never stored), its id, its canonical name, its
// plant_names in en and the page language, and the curated lists that place it.
export interface PlantNames { plant: number; id: PlantId; canonical: string; names: Partial<Record<Locale, string>>; lists: ClimateZone[] }

// labels: trait field → English value → locale → label (a missing label shows the English value).
export type Labels = Record<string, Record<string, Partial<Record<Locale, string>>>>;

// climateGrid: the canopi-climate grid manifest sha256 the ranges were sampled from (meta), for
// information: the page does not compare it; the build fails unless the consortium index names the same
// grid as the installed climate tiles (scripts/consortium-grid-check.mjs). rangesReview:
// 'estimate_not_reviewed' today. schemaVersion: the user_version load.ts accepted (SCHEMA_VERSIONS).
// frostRecorded: the release has any plant_frost row (then a plant without one reads "frost tolerance
// not recorded"; without, no frost line at all).
export interface SourceInfo { releaseId: string; schemaVersion: SchemaVersion; builtAt: string; climates: ClimateZone[]; griisAvailable: boolean; climateGrid: string | null; rangesReview: string | null; frostRecorded: boolean }

// A warning on a member (store.ts `flags`): a conflict between two members, a site misfit, an
// invasive or toxicity warning. Add and Swap ask only about 'misfit' and a high 'conflict'.
// A conflict flag is one per other member, for its worst row, and carries that row's type, agent
// and note. Low conflicts are flags too: the views decide what to show (they filter low out of chips).
export type FlagKind = 'conflict' | 'misfit' | 'invasive' | 'toxicity';
export interface Flag {
  id: PlantId;
  kind: FlagKind;
  other?: PlantId;
  severity?: Severity;
  type?: Exclude<InteractionType, 'allelopathy_tolerant' | 'intercropped_yield_gain'>;
  agent?: string | null;
  note?: Text | null;
  level?: string; // a toxicity flag's recorded level (Slight, Moderate, Severe): Slight is no second look
}
// The reader's country for the invasive check (conflicts.ts countryStatus): none given, given and
// checked against GRIIS ("not recorded" is then a real answer), or given but not checked.
export type CountryStatus = 'none' | 'checked' | 'unchecked';

// ---- Shapes the views need from the rules (review C5; S1 fills them, S2–S4 render them) ----

// The six jobs a consortium does (v1 jobs.ts, ported by S1), in display order.
export const jobIds = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'] as const;
export type JobId = (typeof jobIds)[number];

// Site fit, three-valued (A7): 'fit', 'misfit' or 'unknown' per site answer, with the reason a view
// shows. An unknown is never a silent fit: "height not recorded" (no height or width for Room) and
// "can grow over N m in the wild" (the wild maximum above the room's limit, the plant kept small by
// pruning) are said aloud. An 'unsure' answer checks nothing.
export type Verdict = 'fit' | 'misfit' | 'unknown';
export type FitReason =
  | { key: 'light' | 'soil' | 'water'; verdict: Verdict; trait: keyof Traits | null }
  // Room checks the height only. meters: the plant's wild maximum height; limit: the room's.
  | { key: 'room'; verdict: Verdict; kind: 'fits' | 'wild_height'; meters: number; limit: number }
  // A climber's recorded size can be a runner length, so its room is unknown, said as such.
  | { key: 'room'; verdict: 'unknown'; kind: 'height_not_recorded' | 'climber' };
export interface Fit { verdict: Verdict; misfits: SiteKey[]; unknowns: SiteKey[]; reasons: FitReason[] }

// Swap: a plant that could take a member's place, with what it changes in the matrix ("Also fills…",
// "Leaves empty…") and its warnings. Cells are [stratum, phase].
// fills / leaves: the holes swapping it in fills and leaves open (core suggest.ts swapChange).
export interface Alternative { id: PlantId; fills: Hole[]; leaves: Hole[]; strataGain: boolean; sharedJobs: JobId[]; flags: Flag[] }

// Jobs table: for each job, the phases where no member does it ("gaps name their stages", BT-4).
export interface JobGap { job: JobId; members: PlantId[]; missing: PhaseOrd[] }

// Share state (link v5, state.ts; plant-palette-architecture 8.1): what a link or the save restores,
// and what the page must say about it. room (`m`) and plot (`z`) are always public; period (`y`) is
// public; country (`k`), the cell (`o`) and the grower's own values travel only with "Include my
// place". The old spot and soil answers are gone (v14 0W-2 R4).
export interface ShareState {
  climate: ClimateZone | null;
  country: string | null;
  room: Room;
  plot: number | null; // whole m², 1 to MAX_PLOT_M2 (state.ts)
  period: PeriodId;
  members: PlantId[];
  removed: PlantId[];
  guests: { id: PlantId; from: ClimateZone }[];
  // The grower's own values (v14 0W-1 item 5): in a link only with "Include my place" (keys f b p i d,
  // each listed in `u=`), in the save's private place; null or absent: none. Decoded links always set it.
  siteEdits?: SiteEdits | null;
  // Plants per job (`j`, outside "Include my place": the palette's, A10); absent or 2: the default.
  plantsPerJob?: number;
}
// unknownCount: plants of the link no longer in the list ("2 plants from this link…"); cut: why a link
// is unreadable when it was cut short (no e=1, a token list stopping mid-token, a guest list twice;
// v14 0W-2 R4): a reason for tests, never a notice of its own. "Some apps cut long links…" is not a
// notice of a link being read: it is checked on the URL at share time (state.ts isLongLink).
// newer: from a newer version (v > 5, nothing restored), or a v5 link whose `u=` lists a key this
// decoder does not know (plants restored); unreadable: `v` not a whole number or below 5 (the old beta
// tool's links: no backward compatibility work, owner 2026-11-17), or a cut link (nothing restored); period: `y` names no period this page
// knows (today shown instead). plant-palette-architecture 8.2.
export interface LinkNotice { unknownCount: number; cut: boolean; newer: boolean; unreadable: boolean; period: boolean }
export interface DecodedLink { state: ShareState; notice: LinkNotice }

// ---- P5 seams (commit 0; .local/consortium/v2/p5-owners.md): the reader's site location ----

// The core's view of a climate reader lookup (src/lib/climate/index.ts SiteLookup, which must stay
// assignable to it: checked at compile time in src/islands/consortium/store.ts). The core never imports
// the reader (scripts/consortium-boundary.test.mjs), so it names only the fields its rules read.
export interface SitePeriod {
  period: string; // '1991-2020', '2041-2070', '2071-2099'
  scenario: string; // 'historical', 'ssp126', 'ssp245', 'ssp370', 'ssp585'
  koppen: string; // '' where unclassified
  koppenTemperatureMarginC: number; // °C the monthly means lie outside the class's bounds (0: consistent)
  tminColdC: number; // coldest-month mean daily minimum
  tmaxWarmC: number; // warmest-month mean daily maximum
  tmeanColdC: number; // coldest- and warmest-month means: how near a Köppen bound (0, 18, 22, 10 °C)
  tmeanWarmC: number; //   the site is, so "borderline" (design check §C, S5b site-climate.ts)
  aridityIndex: number | null; // null on ice: "not checked"
  precipMm: number; // annual precipitation (src/lib/climate/lookup.ts PeriodClimate.precipMm)
  dryMonths: number; // months drier than twice their mean temperature, 0–12 (lookup.ts dryMonths)
}
export interface SiteLookup {
  lat: number;
  lon: number;
  // null: no complete cell within 2 cells (open sea): "pick a point on land".
  climate: { cellLat: number; cellLon: number; distanceCells: number; periods: SitePeriod[] } | null;
  // null: no soil within 2 layer cells (sea, ice, a coast), or not read (the location step until P5.2).
  soil: { phH2o: number; texture: string | null; filled: boolean; fillDistanceCells: number; distanceCells: number } | null;
  // codes null offshore (a coast: climate from the nearest cell, no country).
  regions: { wgsrpdL3: string | null; isoA2: string | null };
}
// Where the reader says the site is (store.location; S5b writes it, S5c, S5d and S5e read it): from the
// device's location, a place search, a map pick, or a shared link's `o=` cell centre (approximate).
// lookup: the climate reader's answer, null while it loads or when it failed (manual climate stays).
export type LocationSource = 'geo' | 'search' | 'map' | 'link';
// placeLevel: the label names a town or a wider area (a place search answer or a reverse lookup of a
// town-level kind, pf-decisions D7, or a link's own `n`), so it may travel in a share link beside the
// cell centre (h2 R4); a road, a building or a farm's name never does.
export interface SiteLocation { lat: number; lon: number; source: LocationSource; label?: string; placeLevel?: true; lookup: SiteLookup | null }

// Climate scenarios of the future check (canopi-climate slots 1–8), SSP2-4.5 by default (owner row).
export const scenarios = ['ssp126', 'ssp245', 'ssp370', 'ssp585'] as const;
export type Scenario = (typeof scenarios)[number];
export const DEFAULT_SCENARIO: Scenario = 'ssp245';

// ---- E6 seams (commit 0; ADR-6, decisions/consortium-placement-origin-and-facts.md; R4 implements them) ----

// Where a plant's placement comes from (Taxon.origin, which replaced from / placedFrom / estimate in
// E6 R4): a guest added from another list ("Add anyway"), or a list a site of an uncovered climate
// borrowed (an estimate). 'own' names the climate's own list where a caller needs a kind for every
// plant; Taxon.origin itself is never stamped 'own' (absent instead). guest: the list a guest was
// picked in when its placement is borrowed (kind 'borrowed', list the curated list it came from), so
// it keeps its "From the {climate} list" label (placement.ts asGuest, guestOf; E6 hand-off D).
export type PlacementKind = 'own' | 'guest' | 'borrowed';
export interface PlacementOrigin { list: ClimateZone; kind: PlacementKind; guest?: ClimateZone }

// The plant facts that depend on the site and the climate period (ADR-6; owner row "Site- and
// time-dependent plant facts"): only these go through factAt; other traits stay plain reads. A fact
// joins the list with its first reader (PP-C commit 0, b3g-5: life_cycle, cold_limit and heat_limit
// had none and went; F2 and E7 add the facts they compute or scope).
export type FactKey = 'water_need';
export interface FactValues {
  water_need: { drought: string | null; moisture: string | null }; // null only when both are unknown
}
// A fact as a period sees it (SitePeriod.period: '1991-2020', '2041-2070', '2071-2099'), null when not
// recorded. source.ts factAt returns the stored value (E6 R4); F2 computes per site and period behind
// the same signature; E7 reads scoped stored facts (most specific wins).
export type FactAt = <K extends FactKey>(key: K, taxon: Taxon, site: SiteInputs | null, period: string) => FactValues[K] | null;

// ---- F1a seams (commit 0; plan F1a, design check .local/consortium/v2/f1a/design-check.md A3, A6, A15, A22) ----

// One confidence vocabulary (A15, ADR-7, stream 3): every hedge a surface shows is one of these terms.
// edge "near the edge" (of the observed range), disputed "sources disagree", estimate "placed by
// estimate" (a borrowed list), worked-out (replaces est.word), not-reviewed (driven by
// SourceInfo.rangesReview, never a literal), not-recorded (no data) vs not-checked (the check did not
// run: a chunk or rule that failed, no location), spread "{agree} of {of} scenarios". No strings here:
// confidence.ts (conf1) maps each term to its key per surface and its methods-page anchor.
export const confidenceTerms = ['edge', 'disputed', 'estimate', 'worked-out', 'not-reviewed', 'not-recorded', 'not-checked', 'spread'] as const;
export type ConfidenceTerm = (typeof confidenceTerms)[number];
// A term, with the scenario counts the spread reads (agree of `of`).
export interface Confidence { term: ConfidenceTerm; agree?: number; of?: number }

// ---- Plant palette seams (PP-B commit 0; plant-palette-architecture 3.1–3.3) ----

// The periods a page can be shown for: the span strings of the climate slots, today first (source.ts
// TODAY_PERIOD, future.ts futurePeriods repeat them; a period id is never renamed or reused, 8.1).
export const periodIds = ['1991-2020', '2041-2070', '2071-2099'] as const;
export type PeriodId = (typeof periodIds)[number];

// The 12 USDA classes of the climate reader (src/lib/climate/soil.ts TextureId; equality checked at
// compile time beside readerFitsCore in src/islands/consortium/store.ts).
export const textureIds = ['sand', 'loamy_sand', 'sandy_loam', 'loam', 'silt_loam', 'silt', 'sandy_clay_loam', 'clay_loam', 'silty_clay_loam', 'sandy_clay', 'silty_clay', 'clay'] as const;
export type TextureId = (typeof textureIds)[number];
export const soilWords = ['acid', 'neutral', 'chalky'] as const;
export type SoilWord = (typeof soilWords)[number];

// ---- Site inputs (owner decision 2026-11-18; bodies in site-inputs.ts) ----
// Every site input the engine reads, each with where its value comes from: 'map' (the climate grid,
// the soil map), 'grower' (an edit), 'none' (not known or not asked: never a "no").
// 'room': the palette's room answer stands in for a line not answered (the Pots line on the room
// "Pots or a balcony", v14 A3: "From your room", no Reset).
export const inputSources = ['map', 'grower', 'room', 'none'] as const;
export type InputSource = (typeof inputSources)[number];
export interface SiteInput<T> { value: T | null; source: InputSource }
// A climate figure: today's merged value, the map's, and the grower's shift (0: none), applied to
// every period (site-inputs.ts header).
export interface ClimateInput extends SiteInput<number> { map: number | null; shift: number }
// nearKm: the map's value is a neighbour's (a built-up, water or ice cell took the nearest measured one,
// or the point fell between cells), about this far away (R3; the place line says it).
export interface SoilPhInput extends SiteInput<number> { map: number | null; nearKm?: number }
// Watering (the Spot board's three answers; read by no rule until F4): rain only, the first years, all year.
export const waterings = ['rain', 'first-years', 'all-year'] as const;
export type Watering = (typeof waterings)[number];
export const drainages = ['drains', 'wet'] as const; // the ground after heavy rain
export type Drainage = (typeof drainages)[number];
export const inputLights = ['sun', 'part', 'shade'] as const; // light on the spot today
export type InputLight = (typeof inputLights)[number];
export const inputWinds = ['sheltered', 'windy', 'sea'] as const;
export type InputWind = (typeof inputWinds)[number];
export const coldAirs = ['town', 'higher', 'lower', 'hollow'] as const; // height and cold air
export type ColdAir = (typeof coldAirs)[number];
// The grower's edits: climate figures as shifts from the map, the rest as values. Plain JSON (the
// scenario file holds them). Units and ranges (v14 spec 3.1, 7; site-inputs.ts siteEditsOf makes any
// source safe): temperature shifts in °C, one decimal, -15..+15; rain in whole mm a year; dry months in
// whole months; pH 3.0..10.0, one decimal; pots: pots, raised beds or brought-in soil (soil not
// checked). The figures panel (pf-d) writes them through store.setSiteEdits; light, wind and coldAir
// stay in the type for PP-F (siteEditsOf drops them from saves and links until then).
export interface SiteEdits {
  nightsShiftC?: number;
  daysShiftC?: number;
  rainShiftMm?: number;
  dryMonthsShift?: number;
  soilPh?: number;
  drainage?: Drainage;
  watering?: Watering;
  light?: InputLight;
  wind?: InputWind;
  coldAir?: ColdAir;
  pots?: boolean;
}
export interface SiteInputs {
  nights: ClimateInput; // °C, coldest-month mean daily minimum, today
  days: ClimateInput; // °C, warmest-month mean daily maximum, today
  rain: ClimateInput; // mm a year, today
  dryMonths: ClimateInput; // 0..12, today
  soilPh: SoilPhInput;
  drainage: SiteInput<Drainage>;
  watering: SiteInput<Watering>;
  light: SiteInput<InputLight>;
  wind: SiteInput<InputWind>;
  coldAir: SiteInput<ColdAir>;
  // Pots, raised beds or brought-in soil: the grower's answer, else 'room' (true) on the room "Pots or a
  // balcony", else none (taken as in the ground).
  pots: SiteInput<boolean>;
  room: SiteInput<Room>;
  // Every climate slot (today, then each later period × scenario) with the shifts applied: the one
  // climate the rules read (place.ts climateFor, range.ts, future.ts).
  periods: readonly SitePeriod[];
}

// The verdict engine's shapes (3.2; bodies in verdict.ts, b2).
export type Level = 'fits' | 'look' | 'outside' | 'unknown'; // fits / needs a second look / outside its range / not checked
export type Factor = 'cold' | 'mild' | 'cool' | 'summer' | 'hot' | 'dry' | 'soil-ph' | 'drainage' | 'light' | 'water' | 'wind';
export interface FactorVerdict {
  factor: Factor;
  level: Level;
  basis: 'range' | 'soil-map' | 'soil-test' | 'spot';
  place: number | null;
  low: number | null;
  high: number | null;
  confidence?: Confidence; // the factor's hedge: 'edge' on a range side passed within the margin
  source?: string; // a range bound taken from another source than the row's own (ClimateRange low/highSource, e.g. 'treegoer_ranges')
  disputed?: boolean; // a low bound whose sources disagree (ClimateRange weak, schema 3): said, never softening the level
}
// Whether a factor's level is the level it gives the verdict (verdict.ts worst; Details' bands read it
// so a band never asks more than the headline): every factor but aridity, which sets the level only past
// its wet end (owner row "Wetter than recorded is a second look"; its dry side is a note at 'fits',
// PP-C5), and the soil hints, which never set it (v14 0W-2 R3): the pH ('soil-ph') and the ground
// staying wet ('drainage', and the wet check's 'water' factor, the drainage answer's).
export const setsLevel = (f: FactorVerdict): boolean =>
  f.factor === 'dry' ? f.place !== null && f.high !== null && f.place > f.high
  : f.factor !== 'soil-ph' && f.factor !== 'drainage' && !(f.factor === 'water' && f.basis === 'spot');
// Notes beside the level, never a level themselves (3.2): the room ('room-tall', with the plant's height),
// an annual ('annual': its winter cold is not checked), the cool-season advice, the place drier or wetter
// than where it is recorded at the period judged (the grower's watering decides whether drier is said:
// verdict.ts, v14 0W-2 R2), cold air on a hill top or in a hollow, and, on today's verdict of a
// plant judged later in its own years, what the later period changes: 'warm-enough-later' (too cool
// today, within its range then) and 'drier-later' (drier then, not today); 'few-records': the ranges
// rest on few recorded places (PlantVerdict.records), so their limits are not firm.
export type VerdictNote = 'room-tall' | 'annual' | 'cool-season' | 'drier' | 'wetter' | 'warm-enough-later' | 'drier-later' | 'cold-air' | 'few-records';
// Why the climate factors are what they are: compared ('judged'), a place climate with no range recorded
// for the plant ('not-recorded'), or no climate for the period (no location, no projection: 'no-climate',
// "not checked"). Kept apart so "not recorded" never reads as "not checked" (A15).
export type RangeBasisState = 'judged' | 'not-recorded' | 'no-climate';
export interface PlantVerdict {
  id: PlantId;
  judged: PeriodId; // min(page period, the plant's own years)
  ownYears: boolean;
  level: Level; // worst factor; soil and spot never beyond 'look' (owner: hints)
  limiting: FactorVerdict | null;
  factors: FactorVerdict[];
  notes: VerdictNote[];
  agree?: number; // scenarios (future.ts FutureCheck)
  of?: number;
  range: RangeBasisState;
  borrowed?: ClimateZone; // placed from a nearest list (Taxon.origin borrowed): its lines carry "estimate"
  records?: number; // with 'few-records': the recorded places (TaxonClimate.cells) its ranges rest on
  // The grower's watering when it changes the dryness words (SiteInputs.watering; v14 0W-2 R2): first
  // years, "water it the first years" instead of "may need watering"; all year, no watering advice.
  watered?: 'first-years' | 'all-year';
}
// What every verdict reads (site-inputs layer, owner 2026-11-18): the merged site inputs (never the
// lookup or a stored answer), the period shown, the scenario, and the members' canopy.
export interface VerdictContext {
  inputs: SiteInputs;
  period: PeriodId;
  scenario: string;
  canopy?: readonly number[] | null; // site.ts Canopy, from canopyOf(members) (the store builds it)
}
// One line of words: an i18n key, its variables and the count P() reads (verdict-line.ts, b2); `also`:
// sentences said after it (a reason's confidence, its bound's source), each a Line of its own. A
// variable named temp… is a temperature in °C, len… a length in metres: the view formats it with its
// unit (format.ts), …Mm rain in millimetres; every other number is a plain number.
// `parts`: variables that are words themselves, a Line or a list of Lines said as a list ("the Balearic
// Islands and mainland Spain"), filled into the key's {name} like a variable.
export interface Line { key: string; vars: Record<string, string | number>; count?: number; also?: Line[]; parts?: Record<string, Line | Line[]> }

// Holes (3.3; bodies in holes.ts, b2).
export type HoleKind = 'job' | 'light' | 'flowering' | 'cool' | 'soil';
// 7: a thin spot (holes.ts thinTargets), ranked after every hole.
export type HoleRank = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// A palette goal (owner 2026-11-18; not a site fact, read beside the site inputs): the redundancy
// target, "backups per job": how many plants each job wants in each judged year (default 2, a plant
// and its backup; S1). A job done by fewer, but not by nobody, is thin (holes.ts laneCounts); nobody is
// a hole. No upper bound: growers add as many plants as they want, nothing caps a lane at a count.
export interface PaletteGoals { plantsPerJob: number }
// Plant counts of one lane (a job or a light level) per time step (years.ts PHASE_YEARS, the climax
// step last); thin: the judged year spans a job is done by at least one plant and fewer than the
// target (light levels: never thin), with have (the fewest plants over the stretch) and want (the
// goal); unchecked: members standing in the lane's years whose jobs or
// light level are not recorded (unknown is never a hole, nor a thin lane's "no").
export interface LaneCount {
  kind: 'job' | 'light';
  job?: JobId;
  stratum?: Stratum;
  counts: number[];
  thin: { fromYear: number; toYear: number; have: number; want: number }[];
  unchecked?: PlantId[];
  /** The members doing this job or at this light level that count (not outside their range), palette order (M25). */
  counted: PlantId[];
  /** Those doing it outside their climate range: named apart, counted nowhere. */
  outside: PlantId[];
}
export interface Hole {
  id: string; // `${kind}:${job ?? stratum ?? ''}:${fromYear}-${toYear}` + `:m${mask}` when months are set
  kind: HoleKind;
  rank: HoleRank; // read from holes.ts HOLE_ORDER, never a literal
  job?: JobId;
  stratum?: Stratum;
  months?: readonly Month[];
  fromYear: number;
  toYear: number;
  state: 'open' | 'pending' | 'not-judged' | 'to-check';
  // Unknown is never a hole (v13 hand-off item 3): the members standing in its years whose jobs (a job
  // hole) or light level (a light hole) are not recorded; absent when none. Its title then says "nobody
  // known" and its count line "N plants not checked" (verdict-line.ts holeLine, uncheckedLine).
  unchecked?: PlantId[];
  // A thin spot (holes.ts thinTargets: id `thin:<job>:<from>-<to>`, kind 'job', rank 7): the fewest
  // plants doing the job over the stretch and the goal. Absent on a hole.
  thin?: { have: number; want: number };
}
// Where a target stands (holes.ts targetPosition): a hole among the open holes ("hole 1 of 7 · then 5
// thin spots"), or a thin spot among the thin spots ("thin spot 1 of 5"); index 1-based.
export interface TargetPosition { kind: 'hole' | 'thin'; index: number; of: number; thinCount: number }
// What a change did to the open holes (holes.ts holeChange) and to the thin spots (thinChange).
export interface HoleChange { added: Hole[]; closed: Hole[]; narrowed: { before: Hole; after: Hole }[]; open: Hole[] }
export interface ThinStill { job: JobId; have: number; want: number; fromYear: number; toYear: number }
export interface ThinChange { ended: Hole[]; still: ThinStill[]; added: Hole[] }
// What Find opens for a hole is store.ts SheetFor (job, hole, fits), built by NextStep (PP-C commit 0
// deleted AddPreset and Hole.preset with the Add sheet).
export interface Fillers { fits: Taxon[]; look: Taxon[]; outside: Taxon[]; unknown: Taxon[] }
// A line of "Things to weigh" (weigh.ts, b3) and of the planting plan (plan.ts, PP-D).
export interface WeighLine { kind: 'family' | 'water' | 'soil'; line: Line; members: PlantId[] }
export interface PlanLine { id: PlantId; line: Line }
