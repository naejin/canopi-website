// The consortium export's schemas (format 4; schemas 3 and 4) as the website expects them: the
// installer (scripts/install-consortium.mjs) compares every table's columns and statements with them,
// and the fixture (scripts/fixtures/consortium-v2/make-fixture.mjs) is built from them. A new schema
// version in canopi-data means a new copy here, and a reader change in src/lib/consortium/.
// Schema 2 (P5 commit 0) adds the climate range tables plant_climate_status, plant_climate and
// plant_koppen, as SQLite stores them: copied from the sqlite_master of export r-e0b162087a79eecf;
// schema 3 (the ranges rebuild, owner "Climate ranges fixed before the P5 push") changes
// plant_climate_status (documented_cells) and plant_climate (tmean_year, basis thinned_cells, blocks,
// low_source, high_source, weak), copied from the sqlite_master of export r-01102782139409b5,
// statement by statement (the schema 1 statements are unchanged from canopi-data
// consortium_sqlite.ddl() at consortium-v2-export ab6bfad). plants.grown_as_annual (last, NOT NULL) is
// from canopi-data consortium_sqlite.py on ranges-rebuild 4733178 (decision row "Growing months"), and
// plant_climate's variable tmean_warm (annuals' summer warmth) from export r-b958a4239cc68f73.
// Schema 4 (PP-C commit 0; canopi-data docs/website-handoff/2026-11-14-schema4-format.md) changes one
// statement, layer_values (its field CHECK list leaves the DDL: an open vocabulary), and appends five
// tables (plant_disputes, plant_aliases, trait_sources, plant_frost, plant_toxicity_audience) and two
// indexes, copied from the sqlite_master of the staging export r-c15a216b9663d2fa. Later additive
// changes (schema_minor, schema_additions) are judged by the installer's tier rules, never copied as
// base statements; the ones the reader knows, schema 4.2's plant_toxicity_parts and 4.3's
// plant_invasive_areas, are kept below with their declarations (the fixture builds them, the reader
// treats them as optional).
// scripts/consortium-p5-ranges.test.mjs compares the installed export's schema with DDL_BY_SCHEMA.
export const DDL_3 = String.raw`
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;
CREATE TABLE climates (
  id TEXT PRIMARY KEY CHECK (id IN ('Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal')),
  ord INTEGER NOT NULL UNIQUE
) WITHOUT ROWID;
CREATE TABLE climate_regions (
  climate_zone TEXT NOT NULL REFERENCES climates (id),
  region TEXT NOT NULL CHECK (region IN ('europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america')),
  PRIMARY KEY (climate_zone, region)
) WITHOUT ROWID;
CREATE TABLE strata (
  id TEXT PRIMARY KEY,
  ord INTEGER NOT NULL UNIQUE
) WITHOUT ROWID;
CREATE TABLE phases (
  ord INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE
);
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT,
  licence TEXT,
  attribution TEXT
) WITHOUT ROWID;
CREATE TABLE countries (
  code TEXT PRIMARY KEY CHECK (length(code) = 2),
  invasive_checked INTEGER NOT NULL CHECK (invasive_checked IN (0, 1))
) WITHOUT ROWID;
CREATE TABLE areas (
  code TEXT PRIMARY KEY,
  region TEXT NOT NULL CHECK (region IN ('europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america'))
) WITHOUT ROWID;
CREATE TABLE labels (
  field TEXT NOT NULL,
  value_en TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')),
  label TEXT NOT NULL,
  PRIMARY KEY (field, value_en, locale)
) WITHOUT ROWID;
CREATE TABLE plants (
  plant INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL UNIQUE,
  genus TEXT NOT NULL,
  family TEXT,
  height_min_m REAL,
  height_max_m REAL,
  width_max_m REAL,
  tolerates_full_sun INTEGER CHECK (tolerates_full_sun IN (0, 1)),
  tolerates_semi_shade INTEGER CHECK (tolerates_semi_shade IN (0, 1)),
  tolerates_full_shade INTEGER CHECK (tolerates_full_shade IN (0, 1)),
  hardiness_zone_min INTEGER,
  hardiness_zone_max INTEGER,
  frost_tender INTEGER CHECK (frost_tender IN (0, 1)),
  soil_ph_min REAL,
  soil_ph_max REAL,
  well_drained INTEGER CHECK (well_drained IN (0, 1)),
  moisture_use TEXT,
  drought_tolerance TEXT,
  fertility_requirement TEXT,
  deciduous_evergreen TEXT,
  active_growth_period TEXT,
  bloom_period TEXT,
  harvest_period TEXT,
  lifespan TEXT,
  growth_rate TEXT,
  age_of_maturity_years REAL,
  root_depth_min_cm REAL,
  taproot_persistent INTEGER CHECK (taproot_persistent IN (0, 1)),
  root_system_type TEXT,
  mycorrhizal_type TEXT,
  nitrogen_fixer INTEGER CHECK (nitrogen_fixer IN (0, 1)),
  edibility_rating INTEGER,
  self_fertile INTEGER CHECK (self_fertile IN (0, 1)),
  sexual_system TEXT,
  pollinators TEXT,
  vegetative_spread_rate TEXT,
  clonal_growth_form TEXT,
  is_annual INTEGER CHECK (is_annual IN (0, 1)),
  is_perennial INTEGER CHECK (is_perennial IN (0, 1)),
  habit TEXT,
  toxicity TEXT,
  allelopathic INTEGER CHECK (allelopathic IN (0, 1)),
  weed_potential INTEGER CHECK (weed_potential IN (0, 1)),
  wcvp_match TEXT CHECK (wcvp_match IN ('accepted', 'synonym', 'hybrid')),
  grown_as_annual INTEGER NOT NULL CHECK (grown_as_annual IN (0, 1))
);
CREATE TABLE plant_names (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')),
  name TEXT NOT NULL CHECK (name <> ''),
  PRIMARY KEY (plant, locale)
) WITHOUT ROWID;
CREATE TABLE plant_images (
  plant INTEGER PRIMARY KEY REFERENCES plants (plant),
  url TEXT NOT NULL,
  credit TEXT,
  licence TEXT,
  source_page_url TEXT
);
CREATE TABLE toxicity_sources (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  ord INTEGER NOT NULL,
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (plant, ord)
) WITHOUT ROWID;
CREATE TABLE plant_invasive (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  country TEXT NOT NULL REFERENCES countries (code),
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (plant, country)
) WITHOUT ROWID;
CREATE TABLE plant_areas (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  area TEXT NOT NULL REFERENCES areas (code),
  introduced INTEGER NOT NULL CHECK (introduced IN (0, 1)),
  PRIMARY KEY (plant, area, introduced)
) WITHOUT ROWID;
CREATE TABLE placements (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  climate_zone TEXT NOT NULL REFERENCES climates (id),
  role TEXT NOT NULL CHECK (role IN ('crop', 'support')),
  stratum TEXT REFERENCES strata (id),
  phase_start INTEGER REFERENCES phases (ord),
  phase_end INTEGER REFERENCES phases (ord),
  source TEXT REFERENCES sources (id),
  PRIMARY KEY (plant, climate_zone),
  CHECK ((stratum IS NULL) = (phase_start IS NULL) AND (stratum IS NULL) = (phase_end IS NULL)
         AND (stratum IS NULL) = (source IS NULL)),
  CHECK (phase_start <= phase_end)
) WITHOUT ROWID;
CREATE TABLE placement_reasons (
  reason INTEGER PRIMARY KEY,
  plant INTEGER NOT NULL,
  climate_zone TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america')),
  source TEXT NOT NULL REFERENCES sources (id),
  UNIQUE (plant, climate_zone, region),
  FOREIGN KEY (plant, climate_zone) REFERENCES placements (plant, climate_zone)
);
CREATE TABLE reason_texts (
  reason INTEGER NOT NULL REFERENCES placement_reasons (reason),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')),
  text TEXT NOT NULL CHECK (text <> ''),
  PRIMARY KEY (reason, locale)
) WITHOUT ROWID;
CREATE TABLE functions (
  function_id INTEGER PRIMARY KEY,
  plant INTEGER NOT NULL REFERENCES plants (plant),
  function TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('import', 'rule', 'extraction', 'curated')),
  UNIQUE (plant, function, method)
);
CREATE TABLE function_sources (
  function_id INTEGER NOT NULL REFERENCES functions (function_id),
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (function_id, source)
) WITHOUT ROWID;
CREATE TABLE interactions (
  interaction INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,
  subject_rank TEXT NOT NULL CHECK (subject_rank IN ('species', 'genus', 'family')),
  object TEXT NOT NULL,
  object_rank TEXT NOT NULL CHECK (object_rank IN ('species', 'genus', 'family')),
  type TEXT NOT NULL CHECK (type IN ('allelopathic_harm', 'allelopathy_tolerant', 'alternate_host', 'shared_pest', 'intercropped_yield_gain')),
  climate_zone TEXT REFERENCES climates (id),
  agent TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  CHECK ((type = 'intercropped_yield_gain') = (climate_zone IS NOT NULL))
);
CREATE TABLE interaction_notes (
  interaction INTEGER NOT NULL REFERENCES interactions (interaction),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')),
  text TEXT NOT NULL CHECK (text <> ''),
  PRIMARY KEY (interaction, locale)
) WITHOUT ROWID;
CREATE TABLE interaction_sources (
  interaction INTEGER NOT NULL REFERENCES interactions (interaction),
  ord INTEGER NOT NULL,
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (interaction, ord)
) WITHOUT ROWID;
CREATE TABLE agent_names (
  agent TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')),
  name TEXT NOT NULL CHECK (name <> ''),
  PRIMARY KEY (agent, locale)
) WITHOUT ROWID;
CREATE TABLE agent_name_sources (
  agent TEXT NOT NULL,
  ord INTEGER NOT NULL,
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (agent, ord)
) WITHOUT ROWID;
CREATE TABLE layer_values (
  layer_value INTEGER PRIMARY KEY,
  plant INTEGER NOT NULL REFERENCES plants (plant),
  climate_zone TEXT REFERENCES climates (id),
  field TEXT NOT NULL CHECK (field IN ('bloom_months', 'ripening_or_fruit_seen_months', 'sowing_months', 'tolerates_wind')),
  months INTEGER CHECK (months BETWEEN 1 AND 4095),
  months_from INTEGER CHECK (months_from BETWEEN 0 AND 11 AND (months >> months_from) & 1 = 1),
  flag INTEGER CHECK (flag IN (0, 1)),
  scope_climate TEXT,
  scope_country TEXT,
  scope_hemisphere TEXT CHECK (scope_hemisphere IN ('N', 'S')),
  scope_latitude TEXT,
  scope_region TEXT,
  source TEXT NOT NULL REFERENCES sources (id),
  kind TEXT NOT NULL CHECK (kind IN ('recorded', 'extracted', 'derived', 'llm')),
  CHECK ((field = 'tolerates_wind') = (flag IS NOT NULL) AND (months IS NULL) = (flag IS NOT NULL)
         AND (months IS NULL) = (months_from IS NULL))
);
CREATE TABLE plant_climate_status (
  plant INTEGER PRIMARY KEY REFERENCES plants (plant),
  range_source TEXT REFERENCES sources (id) CHECK (range_source IN ('gbif_occurrences', 'treegoer_ranges', 'ecocrop')),
  gbif_taxon_key INTEGER,
  gbif_cells INTEGER CHECK (gbif_cells >= 0),
  gbif_records INTEGER CHECK (gbif_records >= 0),
  cells_without_climate INTEGER CHECK (cells_without_climate >= 0),
  native_share REAL CHECK (native_share BETWEEN 0 AND 1),
  documented_cells INTEGER CHECK (documented_cells >= 0),
  reason TEXT CHECK (reason <> ''),
  review TEXT NOT NULL CHECK (review = 'estimate_not_reviewed'),
  CHECK (range_source IS NOT NULL OR reason IS NOT NULL)
);
CREATE TABLE plant_climate (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  variable TEXT NOT NULL CHECK (variable IN ('tmin_cold', 'tmax_warm', 'tmean_year', 'tmean_warm', 'precip', 'aridity', 'dry_months', 'growth_temperature')),
  source TEXT NOT NULL REFERENCES sources (id),
  basis TEXT NOT NULL CHECK (basis IN ('thinned_cells', 'treegoer_quantiles', 'ecocrop_limits')),
  count INTEGER CHECK (count > 0),
  blocks INTEGER CHECK (blocks > 0),
  missing INTEGER CHECK (missing >= 0),
  low REAL,
  median REAL,
  high REAL,
  low_source TEXT REFERENCES sources (id),
  high_source TEXT REFERENCES sources (id),
  weak INTEGER NOT NULL CHECK (weak IN (0, 1)),
  review TEXT NOT NULL CHECK (review = 'estimate_not_reviewed'),
  PRIMARY KEY (plant, variable),
  CHECK (low IS NULL OR high IS NULL OR low <= high)
) WITHOUT ROWID;
CREATE TABLE plant_koppen (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  koppen TEXT NOT NULL CHECK (length(koppen) BETWEEN 2 AND 3),
  cells INTEGER NOT NULL CHECK (cells > 0),
  share REAL NOT NULL CHECK (share BETWEEN 0 AND 1),
  PRIMARY KEY (plant, koppen)
) WITHOUT ROWID;
CREATE INDEX placements_matrix ON placements (climate_zone, stratum, phase_start, phase_end);
CREATE INDEX placement_reasons_placement ON placement_reasons (plant, climate_zone);
CREATE INDEX plants_genus ON plants (genus);
CREATE INDEX plants_family ON plants (family);
CREATE INDEX functions_function ON functions (function);
CREATE INDEX interactions_subject ON interactions (subject);
CREATE INDEX interactions_object ON interactions (object);
CREATE INDEX layer_values_plant ON layer_values (plant);
`;
// Schema 4's statements: layer_values without its field CHECK list, then the five tables (after every
// schema-3 table) and their two indexes (after every schema-3 index).
const LAYER_VALUES_4 = String.raw`CREATE TABLE layer_values (
  layer_value INTEGER PRIMARY KEY,
  plant INTEGER NOT NULL REFERENCES plants (plant),
  climate_zone TEXT REFERENCES climates (id),
  field TEXT NOT NULL CHECK (field <> ''),
  months INTEGER CHECK (months BETWEEN 1 AND 4095),
  months_from INTEGER CHECK (months_from BETWEEN 0 AND 11 AND (months >> months_from) & 1 = 1),
  flag INTEGER CHECK (flag IN (0, 1)),
  scope_climate TEXT,
  scope_country TEXT,
  scope_hemisphere TEXT CHECK (scope_hemisphere IN ('N', 'S')),
  scope_latitude TEXT,
  scope_region TEXT,
  source TEXT NOT NULL REFERENCES sources (id),
  kind TEXT NOT NULL CHECK (kind IN ('recorded', 'extracted', 'derived', 'llm')),
  CHECK ((months IS NULL) = (flag IS NOT NULL) AND (months IS NULL) = (months_from IS NULL))
);
`;
const TABLES_4 = String.raw`CREATE TABLE plant_disputes (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  field TEXT NOT NULL CHECK (field <> ''),
  kind TEXT NOT NULL CHECK (kind <> ''),
  other_value TEXT CHECK (other_value <> ''),
  unit TEXT CHECK (unit <> ''),
  derived INTEGER NOT NULL DEFAULT 0 CHECK (derived IN (0, 1)),
  scope TEXT REFERENCES countries (code),
  source TEXT NOT NULL REFERENCES sources (id),
  CHECK (kind <> 'range' OR (other_value IS NOT NULL AND unit IS NOT NULL)),
  CHECK (kind <> 'queue' OR (unit IS NULL AND derived = 0)),
  CHECK (field <> 'plant_invasive' OR scope IS NOT NULL)
);
CREATE TABLE plant_aliases (
  old_id TEXT PRIMARY KEY CHECK (length(old_id) = 36),
  new_id TEXT CHECK (length(new_id) = 36 AND new_id <> old_id),
  old_canonical_name TEXT NOT NULL CHECK (old_canonical_name <> '')
) WITHOUT ROWID;
CREATE TABLE trait_sources (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  field TEXT NOT NULL CHECK (field <> ''),
  source TEXT NOT NULL REFERENCES sources (id),
  scope_country TEXT REFERENCES countries (code),
  kind TEXT NOT NULL CHECK (kind IN ('recorded', 'extracted', 'derived', 'llm')),
  PRIMARY KEY (plant, field)
) WITHOUT ROWID;
CREATE TABLE plant_frost (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  kind TEXT NOT NULL CHECK (kind <> ''),
  value_c REAL,
  class TEXT CHECK (class <> ''),
  variety TEXT CHECK (variety <> ''),
  coarse INTEGER NOT NULL DEFAULT 0 CHECK (coarse IN (0, 1)),
  source TEXT NOT NULL REFERENCES sources (id),
  scope_country TEXT REFERENCES countries (code),
  CHECK (kind NOT IN ('ktmp', 'ktmpr') OR (value_c IS NOT NULL AND class IS NULL)),
  CHECK (kind <> 'class' OR (class IS NOT NULL AND value_c IS NULL)),
  CHECK (coarse = (kind = 'ktmp' AND value_c = 0))
);
CREATE TABLE plant_toxicity_audience (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  who TEXT NOT NULL CHECK (who <> ''),
  level TEXT CHECK (level <> ''),
  source TEXT NOT NULL REFERENCES sources (id),
  PRIMARY KEY (plant, who, source)
) WITHOUT ROWID;
`;
const INDEXES_4 = String.raw`CREATE UNIQUE INDEX plant_disputes_key ON plant_disputes (plant, field, ifnull(scope, ''), source);
CREATE UNIQUE INDEX plant_frost_key ON plant_frost (plant, kind, ifnull(variety, ''), source);
`;
const LAYER_VALUES_3 = /CREATE TABLE layer_values \([\s\S]*?\n\);\n/.exec(DDL_3)[0];
const FIRST_INDEX = 'CREATE INDEX placements_matrix';
export const DDL_4 = DDL_3.replace(LAYER_VALUES_3, LAYER_VALUES_4).replace(FIRST_INDEX, `${TABLES_4}${FIRST_INDEX}`) + INDEXES_4;


// The tables counted in meta and the manifest, in DDL order (canopi-data DATA_TABLES).
export const DATA_TABLES_3 = ['climates', 'climate_regions', 'strata', 'phases', 'sources', 'countries', 'areas', 'labels', 'plants',
  'plant_names', 'plant_images', 'toxicity_sources', 'plant_invasive', 'plant_areas', 'placements',
  'placement_reasons', 'reason_texts', 'functions', 'function_sources', 'interactions', 'interaction_notes',
  'interaction_sources', 'agent_names', 'agent_name_sources', 'layer_values', 'plant_climate_status', 'plant_climate', 'plant_koppen'];
// Schema 4 appends its five tables (format note "General rules": in DATA_TABLES in that order).
export const DATA_TABLES_4 = [...DATA_TABLES_3, 'plant_disputes', 'plant_aliases', 'trait_sources', 'plant_frost', 'plant_toxicity_audience'];

// The schemas the website reads (the reader accepts 3 and 4 until the schema-4 export is installed, PP-C
// 0b; slices 3.2), each with its base DDL and counted tables.
export const SCHEMAS = [3, 4];
export const DDL_BY_SCHEMA = { 3: DDL_3, 4: DDL_4 };
export const DATA_TABLES_BY_SCHEMA = { 3: DATA_TABLES_3, 4: DATA_TABLES_4 };
// The newest schema: what the fixture is built at unless a test asks for schema 3.
export const LATEST_SCHEMA = 4;

// Schema 4's open vocabularies (format note: not in the DDL, held by canopi release verify; a later
// value is declared in manifest schema_additions). The installer refuses a stored value outside these
// lists plus the declared ones (additive tier); the reader skips a row whose value it does not know.
export const VOCABULARIES_4 = {
  'layer_values.field': ['bloom_months', 'ripening_or_fruit_seen_months', 'sowing_months', 'tolerates_wind'],
  'plant_disputes.field': ['tmin_cold.low', 'tmean_year.low', 'toxicity', 'plant_invasive', 'weed_potential', 'allelopathic'],
  'plant_disputes.kind': ['range', 'queue'],
  'plant_disputes.unit': ['C'],
  'trait_sources.field': ['frost_tender'],
  'plant_frost.kind': ['ktmp', 'ktmpr', 'class'],
  'plant_frost.class': ['tender', 'light', 'hard'],
  'plant_toxicity_audience.who': ['livestock', 'pets'],
};

// Schema 4.2 (canopi-data docs/website-handoff/2026-11-17-toxicity-parts.md): plant_toxicity_parts and
// its key, a declared addition (schema_minor 2), never a base table: an export without it is a 4.1
// export, and the reader then shows no parts. Its count is the declared meta key
// count.plant_toxicity_parts (not in DATA_TABLES_4).
export const TOXICITY_PARTS_DDL = String.raw`CREATE TABLE plant_toxicity_parts (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  who TEXT CHECK (who <> ''),
  part TEXT NOT NULL CHECK (part <> ''),
  condition TEXT CHECK (condition <> ''),
  genus_wide INTEGER NOT NULL CHECK (genus_wide IN (0, 1)),
  source TEXT NOT NULL REFERENCES sources (id)
);
CREATE UNIQUE INDEX plant_toxicity_parts_key ON plant_toxicity_parts (plant, ifnull(who, ''), part, ifnull(condition, ''), source);
`;
// The declarations a 4.2 manifest carries for it (since 2).
export const TOXICITY_PARTS_ADDITIONS = [
  { table: 'meta', column: 'key', value: 'count.plant_toxicity_parts', since: 2 },
  { table: 'plant_toxicity_parts', since: 2 },
  { table: 'plant_toxicity_parts', index: 'plant_toxicity_parts_key', since: 2 },
];
// Its open vocabularies (same rule as VOCABULARIES_4), held only when the table is present.
export const VOCABULARIES_42 = {
  'plant_toxicity_parts.part': ['whole_plant', 'leaves', 'stems', 'shoots', 'bark', 'sap', 'flowers', 'fruits', 'berries', 'seeds', 'pods', 'nuts', 'roots', 'bulbs', 'tubers', 'essential_oil'],
  'plant_toxicity_parts.condition': ['raw', 'unripe', 'immature', 'wilted', 'sprouted', 'large_amounts', 'prolonged_use', 'skin_contact', 'pregnancy'],
  'plant_toxicity_parts.who': ['livestock', 'pets'],
};

// Schema 4.3 (canopi-data docs/website-handoff/2026-11-17-invasive-scope.md, staging r-0dfc15e7cfe22e19):
// plant_invasive_areas, a declared addition (schema_minor 3) created last: a source naming a plant
// invasive in part of a country (WCVP level-3 areas). An export without it is a 4.2 export.
export const INVASIVE_AREAS_DDL = String.raw`CREATE TABLE plant_invasive_areas (
  plant INTEGER NOT NULL REFERENCES plants (plant),
  country TEXT NOT NULL,
  source TEXT NOT NULL REFERENCES sources (id),
  area TEXT NOT NULL REFERENCES areas (code),
  PRIMARY KEY (plant, country, source, area),
  FOREIGN KEY (plant, country) REFERENCES plant_invasive (plant, country)
) WITHOUT ROWID;`;
// The declarations a 4.3 manifest carries for it (since 3).
export const INVASIVE_AREAS_ADDITIONS = [
  { table: 'meta', column: 'key', value: 'count.plant_invasive_areas', since: 3 },
  { table: 'plant_invasive_areas', since: 3 },
];
