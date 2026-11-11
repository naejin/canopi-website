// The consortium export's schema (format 4, schema 1) as the website expects it: the installer
// (scripts/install-consortium.mjs) compares every table's columns with it, and the fixture
// (scripts/fixtures/consortium-v2/make-fixture.mjs) is built from it. A new schema version in
// canopi-data means a new copy here, and a reader change in src/lib/consortium/.
// canopi-data consortium_sqlite.ddl() at consortium-v2-export ab6bfad (unchanged since 8a74efd), as
// SQLite stores it: copied from the sqlite_master of export r-2c6bdf65c35caca3, statement by statement.
export const DDL = String.raw`
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
  wcvp_match TEXT CHECK (wcvp_match IN ('accepted', 'synonym', 'hybrid'))
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
CREATE INDEX placements_matrix ON placements (climate_zone, stratum, phase_start, phase_end);
CREATE INDEX placement_reasons_placement ON placement_reasons (plant, climate_zone);
CREATE INDEX plants_genus ON plants (genus);
CREATE INDEX plants_family ON plants (family);
CREATE INDEX functions_function ON functions (function);
CREATE INDEX interactions_subject ON interactions (subject);
CREATE INDEX interactions_object ON interactions (object);
CREATE INDEX layer_values_plant ON layer_values (plant);
`;

// The tables counted in meta and the manifest, in DDL order (canopi-data DATA_TABLES).
export const DATA_TABLES = ['climates', 'climate_regions', 'strata', 'phases', 'sources', 'countries', 'areas', 'labels', 'plants',
  'plant_names', 'plant_images', 'toxicity_sources', 'plant_invasive', 'plant_areas', 'placements',
  'placement_reasons', 'reason_texts', 'functions', 'function_sources', 'interactions', 'interaction_notes',
  'interaction_sources', 'agent_names', 'agent_name_sources', 'layer_values'];

