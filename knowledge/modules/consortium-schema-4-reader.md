---
type: Module
title: Consortium schema 4 reader and installer
description: "How the installer and the island read canopi-data schema 4.5 exports and nothing older: additive-tier checks, the required 4.2 to 4.5 additions (plant_aliases accepted, never read), the light span columns and the search names file."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T02:04:09Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-18T04:53:13Z }
sources:
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:5976eec0a9471c61
    last_modified: 2026-11-18T02:34:14Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:bac1df5b4ffcd1b5
    last_modified: 2026-11-18T02:34:14Z
  - id: sqlite-source-ts
    resource: ../../src/islands/consortium/data/sqlite-source.ts
    title: src/islands/consortium/data/sqlite-source.ts
    digest: sha256:4fcebb2d2ec2adba
    last_modified: 2026-11-18T02:34:14Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:766ed7fdb9ff7efa
    last_modified: 2026-11-17T10:52:11Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:fd0b37d55fa3180d
    last_modified: 2026-11-18T04:51:36Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:caeec5097cc7810e
    last_modified: 2026-11-18T02:34:14Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:e9aaa0527146c2d9
    last_modified: 2026-11-18T04:51:36Z
  - id: consortium-source-test-mjs
    resource: ../../scripts/consortium-source.test.mjs
    title: scripts/consortium-source.test.mjs
    digest: sha256:b907598a04e8595e
    last_modified: 2026-11-18T02:34:14Z
  - id: names-ts
    resource: ../../src/islands/consortium/views/find/names.ts
    title: src/islands/consortium/views/find/names.ts
    digest: sha256:cf3b844703f6a3e8
    last_modified: 2026-11-17T16:37:51Z
  - id: names-file-ts
    resource: ../../src/islands/consortium/data/names-file.ts
    title: src/islands/consortium/data/names-file.ts
    digest: sha256:a6d9f0e270c94cbf
    last_modified: 2026-11-17T17:52:44Z
enforced_by:
  - scripts/install-consortium.test.mjs
  - scripts/consortium-source.test.mjs
---

# Consortium schema 4 reader and installer (PP-C commit 0a, 1b7ec49; 4.5 only since 0b)

## What is accepted
- Since PP-C 0b (release `r-bcc417fd89a3147c`, owner 2026-11-17 "no backward compatibility"): schema 4 at `schema_minor` 5 or later only. `SCHEMA_VERSIONS` is `[4]` in core `types.ts` and the installer; `MIN_SCHEMA_MINOR` 5 and `REQUIRED_ADDITIONS` (4.2's `plant_toxicity_parts` and its key and count, 4.3's `plant_invasive_areas` and its count, 4.5's three `plants` columns) live in `scripts/consortium-schema.mjs`. A manifest below 4.5 or missing one of those declarations is refused by name; the tier rules then hold the database to them. Open-vocabulary values stay optional (the reader skips what it does not know). The index must say `schema_minor` 5 or more and always names `search_names` (`indexProblem`); `ConsortiumPage.astro` and `check-built-site.mjs` no longer allow a missing names file. No schema-3 export installs or opens; `DDL_3` survives only as the private base `DDL_4` is derived from.
- `DDL_READ` is the full schema the reader reads (base statements plus every required addition, canopi-data's statement text, the light span CHECKs included); `consortium-p5-ranges.test.mjs` compares it with the installed export statement by statement, declared additions included.
- `scripts/consortium-schema.mjs` also holds `DDL_4` (`DDL_BY_SCHEMA`), the data tables per schema (`DATA_TABLES_4` adds `plant_disputes`, `plant_aliases`, `trait_sources`, `plant_frost`, `plant_toxicity_audience`), `LATEST_SCHEMA` 4, the open vocabularies (`VOCABULARIES_4`, `VOCABULARIES_42`) 4.2's `plant_toxicity_parts` (`TOXICITY_PARTS_DDL`, `TOXICITY_PARTS_ADDITIONS`) and 4.3's `plant_invasive_areas` (`INVASIVE_AREAS_DDL`, `INVASIVE_AREAS_ADDITIONS`, since 3; canopi-data `docs/website-handoff/2026-11-17-invasive-scope.md`). 4.5's `LIGHT_SPAN_DDL` and `LIGHT_SPAN_ADDITIONS` (canopi-data `docs/website-handoff/2026-11-17-light-span.md`) sit beside them.

## Installer tier rules (`scripts/install-consortium.mjs`)
- Base tables, columns and indexes are required; additions declared in the manifest (`schema_minor`, `schema_additions`) are accepted; undeclared extras and declared additions that are missing are refused.
- Statement text is compared for base statements only.
- Open vocabularies take base or declared values; any other stored value is refused.
- The search names file (`names.<release>.<hash>.tsv.gz`) is checked and installed; `src/data/consortium-index.json` names it (`search_names`).
- The island reads it since PP-C c1: `#ct-data` `names` (a `DbRef`; the island type still allows none, for browser-test pages); `data/names-file.ts` fetches and checks it (digests, the header matched to the page's database, a stalled download aborted), and `views/find/names.ts` loads it once per page for Find and Paste on top of the core's names (`PlantSource.names`), searching while it loads; a digest mismatch or a file bound to another database is dropped until reload, a failed load tried again on the next focus.

## Reader (`data/sqlite-source.ts`)
- Every schema-4 table and 4.5's light columns are read unconditionally (no table-presence checks since 0b): `Details.disputes`, `audiences`, `traitSources`, `toxicityParts` and `invasiveAreas` are arrays (`[]` for a plant without rows); `frost` stays null when the release has no `plant_frost` row at all (no frost line).
- 4.5 light span: `Taxon.light` (`LightNiche { sunniest, shadiest, preferred }`, each a stratum code or null = unknown, never "no light needs") on every pool plant; a half span (one end set) reads as no span; an unknown code reads as null. Each end's and the preferred level's `trait_sources` row reaches `Details.traitSources` (core `traitFields` lists the three fields). The "Grows in" / "found mostly in" display belongs to the pf streams; `views/kit/fit.tsx` already reads `t.light`. Release `r-bcc417fd89a3147c`: a span on 625 of 681 plants (all `derived`), a preferred level on 310; test `consortium-source.test.mjs` "schema 4.5: the light span …".
- Unknown vocabulary values are skipped, never shown raw.
- `plant_aliases` is a declared schema-4 table: the installer accepts it and the reader never reads it; the source has no aliases reader (owner, 2026-11-17, "No backward compatibility work": old links and saves need not survive data or format changes). A token the release does not list is counted by the existing unknown notice (`LinkNotice.unknownCount`). `consortium-source.test.mjs` opens a schema-4 export holding alias rows and asserts the source offers no `aliases`.
- `trait_sources` rows are kept when `field` is one of core `traitFields`, the `plants` columns the reader reads, by export name (the staging export ships 21 such fields); any other field is skipped (open vocabulary; review c0-4 and round 2).
- `plant_frost` `'ktmpr'` is the killing temperature at rest (dormant), outside the precedence; variety values are `ktmp` rows with `variety` set (`FrostFact` comment in core `types.ts`).
- 4.3 `plant_invasive_areas(plant, country, source, area)` becomes `Details.invasiveAreas` (`InvasiveScope[]`: per country and source, its areas in code order). The closed lists are core `invasiveAreaCodes` (`BAL` Baleares, `CNY` Canarias, `SPA` mainland Spain) and `invasiveSources` (`griis`, `es_catalogo`, `atlas_aloctonas_es`). A country whose rows hold any area or source outside them is left out whole, so it reads at country level from `plant_invasive` (less precise, never wrong). The area sources are cited in `Details.sources`. `plant_invasive.source` is the widest scope (ties: griis, es_catalogo, atlas order).
- `countries.invasive_checked` means, since 4.3, "a source in the release assessed invasiveness there" (0 reads "not checked"); before, it meant "GRIIS has a checklist". 14 countries went from 1 to 0 (AD AF BE GD HN IS KN KW MN PS SM ST SV TD), and ES is checked by three sources, so words naming GRIIS as the only check are c2's to reword (PP-C-u21). Display: one line per source; a source over every area reads as the whole country; an atlas row is never a legal listing; absence proves nothing.
- Disputes, audiences, trait sources, frost, toxic parts and invasive areas reach Details only, never the pool's `Taxon`.
- Ranges: the website reads them only from the export's tables (`plant_climate_status`, `plant_climate`, `plant_koppen`; `CLIMATE_ROWS` in `sqlite-source.ts`) never from canopi-data's range TSVs; `consortium-source.test.mjs` reads them from the schema-4 fixture. So the slices duty "ranges read from the export when it is schema 4" needs no website change: canopi-data may drop its range TSVs once its own schema-3 reinstall path no longer needs them (review c0 1.4).

## Fixture
- `make-fixture.mjs` builds schema 4.5 only (4.5's light span columns `plants.sun_exposure_sunniest`, `sun_exposure_shadiest`, `sun_exposure_preferred` from `LIGHT_SPAN_DDL`, CHECKs included, and their `trait_sources` fields, since 5; `schema_minor` 5; no schema-3 variant since 0b), with disputes, audiences, trait sources, frost, toxicity parts, the 4.3 ES invasive areas (the note's cases on Tropaeolum, Robinia, Psidium and Elaeagnus), alias rows (kept to show a filled `plant_aliases` is accepted) and a names file.

Related: [consortium core](/modules/consortium-core.md), [slices](/project/plant-palette-slices.md).
