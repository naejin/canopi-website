# Invented consortium fixture (format 4, schema 4.5)

Plausible but **invented** plant values for testing consortium v2 without the real export. Never shipped:
`canopi_db_sha256` is all zeros, which a real install refuses, and the directory sits outside `public/`.

- **Built by** `node scripts/fixtures/consortium-v2/make-fixture.mjs` (Node's `node:sqlite`, no Python on the
  website: coordinator row "v2 build setup", 2026-11-11). The output in `export/` is committed.
- **Base statements:** schema 3's (the ranges rebuild; the base `DDL_4` derives from them, no schema-3 export is
  written or read since PP-C 0b), the stored `CREATE` statements of export `r-01102782139409b5`:
  schema 1's (canopi-data `consortium_sqlite.ddl()` at `consortium-v2-export` ab6bfad) plus `plant_climate_status`
  (with `documented_cells`), `plant_climate` (variables with `tmean_year`, basis `thinned_cells`, `blocks`,
  `low_source`, `high_source`, `weak`) and `plant_koppen`. canopi-data's `check_export` passed on the schema 1
  `export/`; it was not re-run on the schema 2 or 3 ones.
- **Schema 4 (PP-C commit 0, 0b):** the build is schema 4 (`scripts/consortium-schema.mjs` `DDL_4`, copied from
  the staging export `r-c15a216b9663d2fa`) plus 4.2's declared `plant_toxicity_parts` (`TOXICITY_PARTS_DDL`,
  canopi-data `docs/website-handoff/2026-11-17-toxicity-parts.md`) and 4.3's declared `plant_invasive_areas`
  (`INVASIVE_AREAS_DDL`, `docs/website-handoff/2026-11-17-invasive-scope.md`), 4.5's declared light span
  columns `plants.sun_exposure_sunniest`, `sun_exposure_shadiest`, `sun_exposure_preferred` with their
  `trait_sources` fields (`LIGHT_SPAN_DDL`, since 5: Malus domestica emergent to high, found mostly in high, PFAF
  and Ellenberg derived; Sambucus nigra found mostly in medium only, an `llm-knowledge` AI estimate),
  `schema_minor` 5 (the fixture writes no 4.4 addition), with the names file
  `names.<release>.<12 hex>.tsv.gz`. The 4.2 to 4.5 additions are the installer's `REQUIRED_ADDITIONS` (PP-C 0b, no
  backward compatibility); the light span statements are canopi-data's, CHECKs included.
- **Contract:** canopi-data `docs/consortium-export-v2.md`, `docs/website-handoff/2026-11-14-schema4-format.md`.
- **Variants:** tests call `writeFixtureExport(dir, { edit, userVersion, applicationId, names, manifest, after })`
  for a broken copy rather than keep broken files here; `UNDECLARED_EXTRA` (an edit) and `DECLARED_COLUMN`
  (an edit and a manifest edit) are the tier rule's two extras.

## What it covers (design check §5 and §7)

| Case | Where |
|---|---|
| Three curated climates; Arid and the rest uncovered ("Ask for this climate") | `climates` |
| Data-gap cells as in the real export: Temperate low × placenta I, Tropical emergent × placenta I–II | placements |
| Room Small empties the Temperate emergent row (every emergent plant is over 6 m) | Castanea, Juglans, Quercus robur, Robinia |
| Height not recorded (never a silent fit); "can grow over N m in the wild" | Phacelia (no height); every other plant |
| A placement with no layer yet (all four columns NULL) | Zingiber officinale in Mediterranean |
| One plant, different placements per climate ("From the {climate} list") | Castanea (T, M), Malus (high in T, medium in M), Tropaeolum (T, R), Zingiber (M, R) |
| A plant only in Tropical, for Paste → "Add anyway" from Temperate | Inga edulis, Musa acuminata, … |
| Two reasons for one placement (europe, asia_temperate) | Malus domestica in Temperate |
| High conflicts at species, genus and family rank | Juglans → genus Malus (allelopathic harm); Juniperus → family Rosaceae (alternate host) |
| Medium and low conflicts, agents with and without names | Corylus × Castanea; Ribes × Rubus; Psidium × Mangifera (agent names en, pt; two sources) |
| Positive pairs | `allelopathy_tolerant` (Juglans, Sambucus); `intercropped_yield_gain` in Temperate and Tropical |
| Invasive warnings in checked countries; unchecked countries (TW, PR, AQ) | Robinia, Elaeagnus, Psidium |
| 4.3 invasive scope in ES (`es_catalogo`, `atlas_aloctonas_es`; areas BAL, CNY, SPA): two sources on different areas; one source over every area beside another; one area only; an unknown area (MOR) read at country level | Tropaeolum (the note's Arundo donax pattern), Robinia (Ricinus), Psidium (as staged), Elaeagnus |
| Every toxicity level and unknown (NULL) | None, Slight, Moderate, Severe; most plants NULL |
| Functions: curated and imported; no rows (not curated, never "none") | Rubus, Zingiber, Olea, … have no rows |
| Layer values: recorded, extracted, derived, llm; country, climate, latitude/hemisphere and region scopes; a run over the new year (Dec–Mar); wind flag | Fragaria, Malus, Corylus, Allium (sowing), Quercus robur, Olea |
| Photos: Commons with credit, CC0 with no credit, an iNaturalist PNG original | Castanea, Quercus robur, Inga, … (6 plants) |
| Names: missing locales, accents for folded search (Châtaignier, Trèfle, Phacélie), CJK and Cyrillic | `plant_names` |
| WCVP: accepted, synonym, not found (`wcvp_match` NULL) | Elaeagnus (synonym), Phacelia (not found) |
| Schema 2 climate ranges, by rule from each plant's home climate (first placement): tmin_cold, tmax_warm, aridity, precip, dry_months, Q05/median/Q95, tmin and tmax shifted by ((i % 5) − 2) / 2 °C; count 200 + 37 i cells | every plant but Phacelia (Castanea: tmin −15/−4/2.5, tmax 18/24/30, 200 cells) |
| No range recorded (`range_source` NULL with a reason; no range or Köppen rows): "range not recorded" | Phacelia |
| Köppen shares per home climate, each with a class under 1 % (hidden in Details) | `plant_koppen` (Castanea: Cfb 0.5 … ET 0.005) |
| Grid digest of the ranges: the real canopi-climate v0.2.0 manifest (`FIXTURE_GRID_SHA256`) | meta, manifest `climate_ranges` |
| Schema 4: plants appended at the end (earlier ids and integers unchanged) | okra (Tropical), tomato, *Hedera helix*, parsley (Mediterranean) |
| Names file only: "Gombo" (fr) for okra; *Lycopersicon esculentum* (synonym) for the tomato; "Oak" on two plants; fi and sw names | `FIXTURE_NAMES` |
| Disputes: range with its stricter value and a `derived` one; *Hedera* shipped Slight, NC State Moderate; flag-only beside NULL (Pyrus) and beside `None` (Corylus); one invasive (Olea, AU); a weed (Rubus) and an allelopathy case (Sambucus) | `FIXTURE_DISPUTES` |
| Animal audiences: pets ASPCA with no level (Malus), livestock Severe (Taxus) | `FIXTURE_AUDIENCE` |
| Trait sources: PFAF (GB) for every `frost_tender`, curator knowledge (Zingiber), a correction (Mangifera), the declared extra field value `toxicity` (*Hedera*) | `trait_sources`, `FIXTURE_ADDITIONS` |
| One frost fact, so a plant without one reads "frost tolerance not recorded" | Mangifera (`FIXTURE_FROST`) |
| Aliases: one retired id, one merged into Malus domestica (every fixture id shares its 36-bit prefix); accepted, never read by the website (owner 2026-11-17, no backward compatibility work) | `FIXTURE_ALIASES` |
| 4.2 toxic parts: parsley's four rows, a bare part beside its conditioned form (Manihot roots, two sources), a genus-wide row (Allium), an audience row (Taxus, livestock) | `FIXTURE_TOXICITY_PARTS` |
