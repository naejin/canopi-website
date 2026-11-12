// Consortium v2 core types (frozen seam, commit 0 of P2; design check §4). The core
// (src/lib/consortium/) reads plants only through PlantSource (./source.ts) as these plain records,
// imports nothing outside this folder and touches no DOM (scripts/consortium-boundary.test.mjs).
// The data contract is canopi-data docs/consortium-export-v2.md (format 4, schema 3); the adapter
// (src/islands/consortium/data/sqlite-source.ts, stream S1) fills these records from SQL.
// Streams may add fields; renaming or removing one is a seam change for the coordinator.
//
// null means unknown or not recorded. The schema's "no rows" for functions means not curated, never
// "none": Taxon.functions is null then.

export const SCHEMA_VERSION = 3;
// PRAGMA application_id of the export ("CCON"), checked when the database opens.
export const APPLICATION_ID = 0x43434f4e;

// The export's climate zones in canopi-data order (climates.ord). The site names them in lowercase
// ('tropical', src/data/climates.ts); the mapping happens at the island edge, never in the core.
export const climateZones = ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal'] as const;
export type ClimateZone = (typeof climateZones)[number];

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
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export type Month = (typeof months)[number];

// The four site questions. Every one has "unsure" and starts at it (design check A7, owner-facing
// row "v2 mockup choices" 2026-11-11): "unsure" filters nothing, and Room "unsure" shows heights.
export const lights = ['sun', 'part', 'shade', 'unsure'] as const;
export const soils = ['acid', 'neutral', 'chalky', 'unsure'] as const;
export const waters = ['dry', 'average', 'wet', 'unsure'] as const;
export const rooms = ['small', 'large', 'field', 'unsure'] as const;
export interface Site {
  light: (typeof lights)[number];
  soil: (typeof soils)[number];
  water: (typeof waters)[number];
  room: (typeof rooms)[number];
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

export interface TaxonFunction { function: FunctionId; method: FunctionMethod; sources: string[] }

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
// ISO 3166-1 alpha-2 countries from GRIIS; read with countries().invasiveChecked.
export interface InvasiveRecord { country: string; sources: string[] }

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
// the looser bound kept); range.ts compares it as any row, Details notes it ('range.disputed').
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
export interface TaxonClimate {
  source: string;
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
  // A guest: a plant added from another climate's list ("Add anyway"), placed as in that climate and
  // labelled "From the {climate} list" (design check A9). Absent for the climate's own plants.
  from?: ClimateZone;
  // Schema 2: the observed climate range; null when none is recorded (plant_climate_status.range_source
  // NULL): "range not recorded", never filtered (owner answer 2, 2026-11-11).
  climate: TaxonClimate | null;
  // WCVP matched the plant, so its native areas are known (plants.wcvp_match not NULL); false: "native
  // here" is unknown, never "not native".
  areasKnown: boolean;
  // P5 S5c: the curated climate whose placement a site of an uncovered climate borrowed (placement.ts
  // placeFor, the nearest-list table), with estimate true ("estimate" label). Absent: its own placement.
  placedFrom?: ClimateZone;
  estimate?: true;
}

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
}

// labels: trait field → English value → locale → label (a missing label shows the English value).
export type Labels = Record<string, Record<string, Partial<Record<Locale, string>>>>;

// climateGrid: the canopi-climate grid manifest sha256 the ranges were sampled from (meta), for
// information: the page does not compare it; the build fails unless the consortium index names the same
// grid as the installed climate tiles (scripts/consortium-grid-check.mjs). rangesReview:
// 'estimate_not_reviewed' today. schemaVersion: the user_version load.ts accepted (SCHEMA_VERSION).
export interface SourceInfo { releaseId: string; schemaVersion: typeof SCHEMA_VERSION; builtAt: string; climates: ClimateZone[]; griisAvailable: boolean; climateGrid: string | null; rangesReview: string | null }

// The strata × phases matrix the store computes (store.ts `matrix`): one row per stratum, top to
// bottom, seven cells each. An empty cell says why: 'gap' (no plant in the list for this cell yet)
// or 'misfit' (plants exist, none fits the site: "Show them anyway"). One plant fills a cell.
// inList: the climate's plants that grow in the cell; fitting: those that do not misfit the site (an
// unknown fits: "Free: N plants fit"); reasons: for a 'misfit' cell, the plants per site answer they
// misfit; bothReasons: the counts add up to more than inList ("some for both reasons").
export interface MatrixCell {
  stratum: Stratum;
  phase: PhaseOrd;
  members: PlantId[];
  empty: 'gap' | 'misfit' | null;
  inList: number;
  fitting: number;
  // Counted per site key only: the views word each from the site answer (light: "too sunny" on a sun
  // site, "too shady" on part shade or shade; water: "too dry" on dry, "too wet" on wet).
  reasons: Partial<Record<SiteKey, number>>;
  bothReasons: boolean;
}
// unplaced: the climate's plants with no stratum yet (`stratum IS NULL`, 0 today), listed under
// "No layer yet" rather than dropped (design check §4).
// The fill meter: filled of total cells that can be filled; free = total − filled; cannot = the empty
// cells nothing can fill here (gap or misfit), which never count against the reader (28 = total + cannot).
export interface Matrix { climate: ClimateZone; rows: { stratum: Stratum; cells: MatrixCell[] }[]; filled: number; total: number; free: number; cannot: number; unplaced: PlantId[] }

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
  | { key: 'light' | 'soil' | 'water'; verdict: Verdict; trait: keyof Traits | null; note?: FitNote }
  // Room checks the height only. meters: the plant's wild maximum height; limit: the room's.
  | { key: 'room'; verdict: Verdict; kind: 'fits' | 'wild_height'; meters: number; limit: number }
  // A climber's recorded size can be a runner length, so its room is unknown, said as such.
  | { key: 'room'; verdict: 'unknown'; kind: 'height_not_recorded' | 'climber' };
// A fit that still asks something of the reader: 'dry_months', drought tolerance Medium on a dry site
// ("needs watering in the dry months", owner, decision row "Climate ranges fixed before the P5 push").
export type FitNote = 'dry_months';
export interface Fit { verdict: Verdict; misfits: SiteKey[]; unknowns: SiteKey[]; reasons: FitReason[] }

// Swap: a plant that could take a member's place, with what it changes in the matrix ("Also fills…",
// "Leaves empty…") and its warnings. Cells are [stratum, phase].
export type CellRef = readonly [Stratum, PhaseOrd];
export interface Alternative { id: PlantId; sameStratum: boolean; alsoFills: CellRef[]; leavesEmpty: CellRef[]; sharedJobs: JobId[]; flags: Flag[] }

// Jobs table: for each job, the phases where no member does it ("gaps name their stages", BT-4).
export interface JobGap { job: JobId; members: PlantId[]; missing: PhaseOrd[] }

// Share state (#v=4, state.ts): what a link restores, and what the page must say about it (§5).
// unknownCount: plants of the link no longer in the list ("2 plants from this link…");
// cut: the link lost its end marker ("This link looks cut off"). "Some apps cut long links…" is not
// a notice of a link being read: it is checked on the URL at share time (state.ts isLongLink).
export interface ShareState {
  climate: ClimateZone | null;
  country: string | null;
  site: Site;
  members: PlantId[];
  kept: PlantId[];
  removed: PlantId[];
  guests: { id: PlantId; from: ClimateZone }[];
  crops: PlantId[]; // Main crops (at most 3), each also kept
  stage: PhaseOrd | null;
}
// outdated: a link of another version (v1 share links are not read: owner row 2026-11-11); its plants
// are not restored.
export interface LinkNotice { unknownCount: number; cut: boolean; outdated: boolean }
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
export interface SiteLocation { lat: number; lon: number; source: LocationSource; label?: string; lookup: SiteLookup | null }

// Climate scenarios of the future check (canopi-climate slots 1–8), SSP2-4.5 by default (owner row).
export const scenarios = ['ssp126', 'ssp245', 'ssp370', 'ssp585'] as const;
export type Scenario = (typeof scenarios)[number];
export const DEFAULT_SCENARIO: Scenario = 'ssp245';

// A plant's marks beside its name (matrix chips, phone rows, Details, Add), from marks.ts providers:
// edge "near the edge of its observed range", outside (Add's warning), unknown "range not recorded",
// estimate (a borrowed placement), future (drawn in ink, apart from the ochre warnings), native,
// season (an annual too hot in summer: "grow it in the cool season"), water (drought tolerance Medium
// on a dry site: "needs watering in the dry months").
// key: a consortium.* string key without its prefix, read with T(key, vars).
export const markKinds = ['edge', 'outside', 'unknown', 'estimate', 'future', 'native', 'aridity', 'season', 'water', 'room'] as const;
export type MarkKind = (typeof markKinds)[number];
export type MarkSeverity = 'note' | 'warning';
// state: a finer state the views write as data-mark-state (e.g. native: 'native' | 'not_recorded' | 'unknown').
export interface Mark { kind: MarkKind; key: string; vars?: Record<string, string | number>; severity: MarkSeverity; state?: string }
// Where a mark is drawn, so a provider can keep a mark to some places: matrix chips and phone rows are
// tight; Add and Details have room for words.
export const markSurfaces = ['chip', 'row', 'add', 'details'] as const;
export type MarkSurface = (typeof markSurfaces)[number];
