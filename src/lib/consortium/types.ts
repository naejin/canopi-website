// Types of the consortium export, format 2: the contract is canopi-data's
// docs/consortium-export-format.md and docs/consortium-export.schema.json, which this file mirrors
// and never extends. null means unknown or not checked; [] means checked, nothing found. Fields the
// schema allows as extras are ignored, so the export may add fields without a version bump.

export const FORMAT_VERSION = 2;

export const climateZones = ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal'] as const;
export type ClimateZone = (typeof climateZones)[number];

// WGSRPD level-1 continents (Antarctica excluded).
export const regions = ['europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america'] as const;
export type Region = (typeof regions)[number];

export const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'] as const;
export type Locale = (typeof locales)[number];

// Successional phases in order, from the first pioneers to the climax.
export const phases = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'] as const;
export type Phase = (typeof phases)[number];

// canopi-data's stratum values ("medium", not the app's "Mid"); the page maps the labels.
export const strata = ['emergent', 'high', 'medium', 'low'] as const;
export type Stratum = (typeof strata)[number];

export const functionIds = ['nitrogen_fixer', 'dynamic_accumulator', 'mulch', 'ground_cover', 'insectary', 'pest_repellent', 'trap_crop', 'pollinator_forage', 'windbreak', 'wildlife_habitat'] as const;
export type FunctionId = (typeof functionIds)[number];

export const interactionTypes = ['allelopathic_harm', 'allelopathy_tolerant', 'alternate_host', 'shared_pest'] as const;
export type InteractionType = (typeof interactionTypes)[number];

export type Severity = 'low' | 'medium' | 'high';
export type Rank = 'species' | 'genus' | 'family';

// Short text: en always, fr when the curator wrote it; other locales fall back to en.
export type Text = { en: string } & Partial<Record<Locale, string>>;
export interface Range { min: number | null; max: number | null }

export interface Source { label: string; url: string | null; licence: string | null; attribution: string | null }

export interface Image { url: string; credit: string | null; licence: string | null; source_page_url: string | null }

export interface TaxonFunction { function: FunctionId; method: 'import' | 'rule' | 'extraction' | 'curated'; sources: string[] }

// Catalog values as exported: English categorical strings (labels.json translates them), null = unknown.
export interface Traits {
  height_m: Range | null;
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
  is_perennial: boolean | null;
  habit: string | null;
}

export interface Toxicity { level: 'None' | 'Slight' | 'Moderate' | 'Severe'; note?: Text | null; sources: string[] }
export interface InvasiveRecord { country: string; sources: string[] }

export interface Warnings {
  toxicity: Toxicity | null;
  // ISO 3166-1 alpha-2 countries from GRIIS. [] = checked, none; null = not checked.
  invasive_in: InvasiveRecord[] | null;
  allelopathic: boolean | null;
  weed_potential: boolean | null;
}

export interface Taxon {
  id: string; // catalog UUID with dashes, the same in every cell
  canonical_name: string;
  genus: string;
  family: string;
  names: Partial<Record<Locale, string>>;
  image: Image | null;
  role: 'crop' | 'support';
  reason?: Text | null;
  stratum: { value: Stratum; sources: string[] } | null;
  phases: { start: Phase; end: Phase; sources: string[] } | null;
  functions: TaxonFunction[] | null; // null = none accepted yet (not curated)
  traits: Traits;
  warnings: Warnings;
}

export interface TaxonRef { name: string; rank: Rank }

export interface Interaction {
  subject: TaxonRef;
  object: TaxonRef;
  type: InteractionType;
  agent: string | null;
  severity: Severity | null;
  note?: Text | null;
  sources: string[];
}

// One cell file: a climate zone within a region.
export interface Cell {
  format_version: 2;
  climate_zone: ClimateZone;
  region: Region;
  generated_at: string;
  sources: Record<string, Source>;
  taxa: Taxon[]; // sorted by canonical_name
  interactions: Interaction[]; // [] = checked, none found
}

export interface ManifestCell { climate_zone: ClimateZone; region: Region; file: string; taxa: number; interactions: number; sha256: string }

export interface Manifest {
  format_version: 2;
  generated_at: string;
  canopi_db_sha256: string;
  cells: ManifestCell[];
  locales: Locale[];
  // Every ISO 3166-1 alpha-2 code to its regions, the default first; Antarctic codes are absent.
  country_regions: Record<string, Region[]>;
}

// labels.json: trait name → English value → locale → translation (missing = fall back to English).
export type Labels = Record<string, Record<string, Partial<Record<Locale, string>>>>;
