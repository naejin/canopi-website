---
type: Module
title: Consortium schema 4 reader and installer
description: "How the installer and the island read canopi-data schema 3 and schema 4 (4.1 and 4.2) exports: additive-tier checks, optional schema-4 tables (plant_aliases accepted, never read) and the search names file."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-17T18:43:26Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-17T10:22:49Z }
sources:
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:dbcbf264981a7904
    last_modified: 2026-11-17T10:34:49Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:fb28ce7a28c85458
    last_modified: 2026-11-17T10:34:49Z
  - id: sqlite-source-ts
    resource: ../../src/islands/consortium/data/sqlite-source.ts
    title: src/islands/consortium/data/sqlite-source.ts
    digest: sha256:5a68cb4f4f79a63e
    last_modified: 2026-11-17T10:34:49Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:766ed7fdb9ff7efa
    last_modified: 2026-11-17T10:52:11Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:76adc2791c1ed27f
    last_modified: 2026-11-17T17:54:47Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:a9e179d333edafd9
    last_modified: 2026-11-17T10:34:49Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:7b32c28f32a0530d
    last_modified: 2026-11-17T13:23:27Z
  - id: consortium-source-test-mjs
    resource: ../../scripts/consortium-source.test.mjs
    title: scripts/consortium-source.test.mjs
    digest: sha256:8c293450f3b6a119
    last_modified: 2026-11-17T13:25:33Z
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

# Consortium schema 4 reader and installer (PP-C commit 0a, 1b7ec49)

## What is accepted
- `SCHEMA_VERSIONS` is `[3, 4]` in core `types.ts`; `scripts/consortium-schema.mjs` holds `DDL_3`, `DDL_4` (`DDL_BY_SCHEMA`), the data tables per schema (`DATA_TABLES_4` adds `plant_disputes`, `plant_aliases`, `trait_sources`, `plant_frost`, `plant_toxicity_audience`), `LATEST_SCHEMA` 4, the open vocabularies (`VOCABULARIES_4`, `VOCABULARIES_42`) 4.2's `plant_toxicity_parts` (`TOXICITY_PARTS_DDL`, `TOXICITY_PARTS_ADDITIONS`) and 4.3's `plant_invasive_areas` (`INVASIVE_AREAS_DDL`, `INVASIVE_AREAS_ADDITIONS`, since 3; canopi-data `docs/website-handoff/2026-11-17-invasive-scope.md`). The installer accepts `schema_minor` up to 3 with the generic tier rules; the staging export `r-0dfc15e7cfe22e19` installs.

## Installer tier rules (`scripts/install-consortium.mjs`)
- Base tables, columns and indexes are required; additions declared in the manifest (`schema_minor`, `schema_additions`) are accepted; undeclared extras and declared additions that are missing are refused.
- Statement text is compared for base statements only.
- Open vocabularies take base or declared values; any other stored value is refused.
- The search names file (`names.<release>.<hash>.tsv.gz`) is checked and installed; `src/data/consortium-index.json` names it (`search_names`).
- The island reads it since PP-C c1: `#ct-data` `names` (a `DbRef`, none before schema 4); `data/names-file.ts` fetches and checks it (digests, the header matched to the page's database, a stalled download aborted), and `views/find/names.ts` loads it once per page for Find and Paste on top of the core's names (`PlantSource.names`), searching while it loads; a digest mismatch or a file bound to another database is dropped until reload, a failed load tried again on the next focus.

## Reader (`data/sqlite-source.ts`)
- Each schema-4 table is optional: read only when the database has it (a schema-3 export, a 4.1 export without `plant_toxicity_parts`, a 4.2 one without `plant_invasive_areas`); absent means the Details field is null and the feature is off.
- Unknown vocabulary values are skipped, never shown raw.
- `plant_aliases` is a declared schema-4 table: the installer accepts it and the reader never reads it; the source has no aliases reader (owner, 2026-11-17, "No backward compatibility work": old links and saves need not survive data or format changes). A token the release does not list is counted by the existing unknown notice (`LinkNotice.unknownCount`). `consortium-source.test.mjs` opens a schema-4 export holding alias rows and asserts the source offers no `aliases`.
- `trait_sources` rows are kept when `field` is one of core `traitFields`, the `plants` columns the reader reads, by export name (the staging export ships 21 such fields); any other field is skipped (open vocabulary; review c0-4 and round 2).
- `plant_frost` `'ktmpr'` is the killing temperature at rest (dormant), outside the precedence; variety values are `ktmp` rows with `variety` set (`FrostFact` comment in core `types.ts`).
- 4.3 `plant_invasive_areas(plant, country, source, area)` becomes `Details.invasiveAreas` (`InvasiveScope[]`: per country and source, its areas in code order; null when the table is absent). The closed lists are core `invasiveAreaCodes` (`BAL` Baleares, `CNY` Canarias, `SPA` mainland Spain) and `invasiveSources` (`griis`, `es_catalogo`, `atlas_aloctonas_es`). A country whose rows hold any area or source outside them is left out whole, so it reads at country level from `plant_invasive` (less precise, never wrong). The area sources are cited in `Details.sources`. `plant_invasive.source` is the widest scope (ties: griis, es_catalogo, atlas order).
- `countries.invasive_checked` means, since 4.3, "a source in the release assessed invasiveness there" (0 reads "not checked"); before, it meant "GRIIS has a checklist". 14 countries went from 1 to 0 (AD AF BE GD HN IS KN KW MN PS SM ST SV TD), and ES is checked by three sources, so words naming GRIIS as the only check are c2's to reword (PP-C-u21). Display: one line per source; a source over every area reads as the whole country; an atlas row is never a legal listing; absence proves nothing.
- Disputes, audiences, trait sources, frost, toxic parts and invasive areas reach Details only, never the pool's `Taxon`.
- Ranges: the website reads them only from the export's tables (`plant_climate_status`, `plant_climate`, `plant_koppen`; `CLIMATE_ROWS` in `sqlite-source.ts`) in schema 3 and 4 alike, never from canopi-data's range TSVs; `consortium-source.test.mjs` reads them from the schema-4 fixture. So the slices duty "ranges read from the export when it is schema 4" needs no website change: canopi-data may drop its range TSVs once its own schema-3 reinstall path no longer needs them (review c0 1.4).

## Fixture
- `make-fixture.mjs` builds schema 4.3 by default (the schema-3 variant is kept), with disputes, audiences, trait sources, frost, toxicity parts, the 4.3 ES invasive areas (the note's cases on Tropaeolum, Robinia, Psidium and Elaeagnus), alias rows (kept to show a filled `plant_aliases` is accepted) and a names file.

Related: [consortium core](/modules/consortium-core.md), [slices](/project/plant-palette-slices.md).
