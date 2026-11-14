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
// since PP-B commit 0. `rooms` is what today's Start offers, without 'pots' so the live form is
// unchanged (Start.tsx reads it); b1a offers 'pots' on Place and sets rooms = roomValues.
export const roomValues = ['pots', 'small', 'large', 'field', 'unsure'] as const;
export type Room = (typeof roomValues)[number];
export const rooms = ['small', 'large', 'field', 'unsure'] as const satisfies readonly Room[];
// The derived input of site.ts fits() (no longer stored since PP-B commit 0: place.ts siteFor builds it
// from the palette's Place; plant-palette-architecture 3.1), removed in PP-C with its last readers.
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

// Share state (link v5, state.ts; plant-palette-architecture 8.1): what a link or the save restores,
// and what the page must say about it. room (`m`) and plot (`z`) are always public; period (`y`) is
// public; country (`k`), spot (`l w q r h s`) and soil (`s`) travel only with "Include my place".
// spot and soil are null when the link brings none of their answers (every answer 'unsure' and the
// soil map count as none: plant-palette-architecture 8.3 "A link without a place").
export interface ShareState {
  climate: ClimateZone | null;
  country: string | null;
  room: Room;
  plot: number | null; // whole m², 1 to MAX_PLOT_M2 (state.ts)
  period: PeriodId;
  spot: Spot | null;
  soil: SoilAnswer | null;
  members: PlantId[];
  removed: PlantId[];
  guests: { id: PlantId; from: ClimateZone }[];
}
// unknownCount: plants of the link no longer in the list ("2 plants from this link…"); cut: the link
// lost its end marker ("This link looks cut off"). "Some apps cut long links…" is not a notice of a
// link being read: it is checked on the URL at share time (state.ts isLongLink).
// outdated: a link of an older version (v1–v4, the v1 query form; owner 2026-11-14), nothing restored;
// newer: from a newer version (v > 5, nothing restored), or a v5 link whose `u=` lists a key this
// decoder does not know (plants restored); unreadable: `v` not a whole number, or `e=1` with a
// non-empty `a` holding no readable token (nothing restored); period: `y` names no period this page
// knows (today shown instead). plant-palette-architecture 8.2.
export interface LinkNotice { unknownCount: number; cut: boolean; outdated: boolean; newer: boolean; unreadable: boolean; period: boolean }
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

// ---- E6 seams (commit 0; ADR-6, decisions/consortium-placement-origin-and-facts.md; R4 implements them) ----

// Where a plant's placement comes from (Taxon.origin, which replaced from / placedFrom / estimate in
// E6 R4): a guest added from another list ("Add anyway"), or a list a site of an uncovered climate
// borrowed (an estimate). 'own' names the climate's own list where a caller needs a kind for every
// plant; Taxon.origin itself is never stamped 'own' (absent instead). guest: the list a guest was
// picked in when its placement is borrowed (kind 'borrowed', list the curated list it came from), so
// it keeps its "From the {climate} list" label (placement.ts asGuest, guestOf; E6 hand-off D).
export type PlacementKind = 'own' | 'guest' | 'borrowed';
export interface PlacementOrigin { list: ClimateZone; kind: PlacementKind; guest?: ClimateZone }

// One site-fit message (stream R2): the one vocabulary of what the site answers say about a plant, which
// Flags (Add, Swap, Paste, Details: kit/flags.ts) and site Marks (chips, rows, Details: site-marks.ts)
// both derive from. Built by site-marks.ts siteFitMessages; rules/site-fit.ts keeps the misfits that hold
// beside the other members. Three kinds: a misfit (asks: Add and Swap ask before adding), a note
// (state set: a fit that still asks something of the reader, shown as a site mark), and what the check
// could not decide (neither). about: the site answer or the climate check it concerns; key: a
// consortium.* string key without its prefix, read with T(key, vars) (a mark on a short surface
// appends "Short").
export interface SiteFitMessage {
  id: PlantId;
  about: SiteKey | 'climate';
  severity: MarkSeverity;
  asks: boolean;
  key: string;
  vars?: Record<string, string | number>;
  state?: string;
}

// The plant facts that depend on the site and the climate period (ADR-6; owner row "Site- and
// time-dependent plant facts"): only these go through factAt; other traits stay plain reads.
export type FactKey = 'life_cycle' | 'cold_limit' | 'heat_limit' | 'water_need';
export interface FactValues {
  life_cycle: 'annual' | 'perennial' | 'grown_as_annual';
  cold_limit: { tminColdC: number; weak: boolean }; // coldest-month minimum the plant is recorded at
  heat_limit: { tmaxWarmC: number }; // warmest-month maximum
  water_need: { drought: string | null; moisture: string | null }; // null only when both are unknown
}
// A fact as a period sees it (SitePeriod.period: '1991-2020', '2041-2070', '2071-2099'), null when not
// recorded. source.ts factAt returns the stored value (E6 R4); F2 computes per site and period behind
// the same signature; E7 reads scoped stored facts (most specific wins).
export type FactAt = <K extends FactKey>(key: K, taxon: Taxon, site: SiteLookup | null, period: string) => FactValues[K] | null;

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

// A cell or a run of cells: one layer (stratum null: any layer, as a job's stage gap) over the stages
// from..to. What a sheet is opened for (store.ts SheetFor.cell: "+ Add" in a free cell, "Show them
// anyway" on a blocked run, a job's stage gap) and what Add opens preset to.
export interface CellSpan { stratum: Stratum | null; from: PhaseOrd; to: PhaseOrd }

// What Add opens preset to (A22; store.ts openAdd, stream 1): a job, a cell span (the sheet's target
// today, store.ts SheetFor.cell), the filters stream 2 defines, and a hint: the line of the hole or
// the thing to weigh that opened it, a consortium.* key without its prefix with its variables (core holds no
// strings), shown under Add's filters (add1).
export interface AddPreset {
  job?: JobId;
  cell?: CellSpan;
  // The hole (holes.ts Hole.id) a "Fill this hole" opened Add for (PP-B; replaces `cell` in PP-C).
  hole?: string;
  filters?: Readonly<Record<string, string | boolean>>;
  hint?: { key: string; vars?: Record<string, string | number> };
}

// ---- Plant palette seams (PP-B commit 0; plant-palette-architecture 3.1–3.3) ----

// The periods a page can be shown for: the span strings of the climate slots, today first (source.ts
// TODAY_PERIOD, future.ts futurePeriods repeat them; a period id is never renamed or reused, 8.1).
export const periodIds = ['1991-2020', '2041-2070', '2071-2099'] as const;
export type PeriodId = (typeof periodIds)[number];

// The place answers (3.1). Every answer starts 'unsure' (DEC:89); PP-B asks light and water as today.
export const spotLights = ['sun', 'part', 'shade', 'varies', 'unsure'] as const;
export const spotWaters = ['dry', 'average', 'wet', 'unsure'] as const;
export const spotWinds = ['sheltered', 'windy', 'sea', 'unsure'] as const;
export const spotGrounds = ['drains', 'wet', 'unsure'] as const; // after heavy rain
export const spotHeights = ['town', 'higher', 'lower', 'hollow', 'unsure'] as const;
export interface Spot {
  light: (typeof spotLights)[number];
  water: (typeof spotWaters)[number];
  wind: (typeof spotWinds)[number];
  ground: (typeof spotGrounds)[number];
  height: (typeof spotHeights)[number];
}
export type SpotKey = keyof Spot;
// The 12 USDA classes of the climate reader (src/lib/climate/soil.ts TextureId; equality checked at
// compile time beside readerFitsCore in src/islands/consortium/store.ts).
export const textureIds = ['sand', 'loamy_sand', 'sandy_loam', 'loam', 'silt_loam', 'silt', 'sandy_clay_loam', 'clay_loam', 'silty_clay_loam', 'sandy_clay', 'silty_clay', 'clay'] as const;
export type TextureId = (typeof textureIds)[number];
export const soilWords = ['acid', 'neutral', 'chalky'] as const;
export type SoilWord = (typeof soilWords)[number];
export type SoilAnswer =
  | { from: 'map' } // the soil map's estimate, the default
  | { from: 'own'; ph: number | null; word: SoilWord | null; texture: TextureId | null }
  | { from: 'pots' };
export interface Place { room: Room; plotM2: number | null; spot: Spot; soil: SoilAnswer }
export interface ResolvedSoil {
  ph: number | null;
  word: SoilWord | null;
  texture: TextureId | null;
  basis: 'map' | 'test' | 'pots' | 'none';
  depth: string | null;
  filled: boolean;
  fillKm: number | null;
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
  confidence?: Confidence;
}
export type VerdictNote = 'room-tall' | 'annual' | 'cool-season' | 'drier' | 'warm-enough-later' | 'cold-air';
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
}
export interface VerdictContext {
  place: Place;
  lookup: SiteLookup | null;
  period: PeriodId;
  scenario: string;
  soil?: ResolvedSoil;
  canopy?: readonly number[]; // site.ts Canopy, from canopyOf(members) (the store builds it)
}
// One line of words: an i18n key, its variables and the count P() reads (verdict-line.ts, b2).
export interface Line { key: string; vars: Record<string, string | number>; count?: number }

// Holes (3.3; bodies in holes.ts, b2).
export type HoleKind = 'job' | 'light' | 'flowering' | 'cool' | 'soil';
export type HoleRank = 1 | 2 | 3 | 4 | 5 | 6;
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
  preset: AddPreset;
}
export interface Fillers { fits: Taxon[]; look: Taxon[]; outside: Taxon[]; unknown: Taxon[] }
// A line of "Things to weigh" (weigh.ts, b3) and of the planting plan (plan.ts, PP-D).
export interface WeighLine { kind: 'family' | 'water' | 'soil'; line: Line; members: PlantId[] }
export interface PlanLine { id: PlantId; line: Line }
