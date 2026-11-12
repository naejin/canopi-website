---
type: Module
title: src/data
description: Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
resource: ../../src/data
tags: [module, data]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T08:38:33Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T18:06:14Z }
sources:
  - id: data
    resource: ../../src/data
    title: src/data/
    digest: sha256:b44b7b884c5e0b9d
    last_modified: 2026-11-12T08:08:26Z
  - id: climate-release-json
    resource: ../../src/data/climate-release.json
    title: src/data/climate-release.json
    digest: sha256:f17c3cc7b270a864
    last_modified: 2026-11-11T09:33:29Z
---

# Responsibility

Static data read at build time. No runtime fetching; the featured designs JSON lives in `public/data/` instead (see [scripts](/modules/scripts.md)).

# Key files

- [release.ts](../../src/data/release.ts): `CANOPI_VERSION`, `CANOPI_RELEASE_DATE`, `CANOPI_SPECIES_COUNT` (what Canopi Web's catalog shows, quoted on the home page), `CANOPI_DOWNLOADS`, `CANOPI_CHECKSUMS_URL`; the single authority for download links.
- [site.ts](../../src/data/site.ts): `WEB_URL` (https://web.projectcanopi.com/), `SOURCE_URL`, `DOCS_URL` (null hides the Docs link), HelloAsso URLs, `DONATION_AMOUNTS`, `discordUrl(lang)`.
- [network.ts](../../src/data/network.ts): `countries`, the agroecology network organisations grouped by region with i18n label keys.
- [bibliography.md](../../src/data/bibliography.md): the hand-edited bibliography (format documented in its header comment).
- [climates.ts](../../src/data/climates.ts): `climates`, `Climate`, `isClimate`: the one list of the seven climate zones, shared with the Canopi app and used by the bibliography, guides, picker and head script.
- [bibliography.ts](../../src/data/bibliography.ts): parses the markdown (`?raw` import) into `themes`; book climates are validated against `climates.ts`.
- [source-credits.ts](../../src/data/source-credits.ts): the source credits on /data-sources/, from `source_credits.tsv`, which only a real `npm run install:consortium` writes, when the export's manifest lists `source_credits` (`{ file, sha256, rows }`, kept in `consortium-index.json`). Installed from release r-01102782139409b5 (format 4, schema 3; the ranges rebuild; the same 42 rows as r-e0b162087a79eecf, schema 2, P5 commit 0): 42 rows, six more than r-2c6bdf65c35caca3 (`gbif_occurrences`, `canopi_climate`, `treegoer_ranges`, `ecocrop`, `eive`, `niinemets_valladares`); `check-built-site` counts 35 credited sources shown. Read through `import.meta.glob`, so with no file `sourceCredits` is null and the page lists the TRY datasets alone; no copy is committed by hand.
- [try_references.tsv](../../src/data/try_references.tsv), [try_references.meta.json](../../src/data/try_references.meta.json), [try-references.ts](../../src/data/try-references.ts): the TRY dataset list. canopi-data's consortium export owns it: a real `npm run install:consortium -- <export-dir>` writes the file byte for byte and the meta (the manifest entry's `sha256`, `rows`, `dataset_ids`, also kept in `consortium-index.json`), so neither is edited or copied by hand;
- [climate-page-data.ts](../../src/data/climate-page-data.ts): `climatePageData(index)`, the canopi-climate base and tile names per layer the consortium page writes to `#ct-climate` for the location reader (no sizes or hashes; ≤ 2 KB gzip, `CLIMATE_PAGE_DATA_GZIP_BUDGET`), `null` without an index; tested in `scripts/climate-page-data.test.mjs`.
- [consortium-index.json](../../src/data/consortium-index.json): the installed consortium release as the build sees it (release, database file and digests, climates, canonical names per climate, photo paths, TRY and credits entries, and since schema 2 `climate_grid_manifest_sha256` and `ranges_review`); written only by the installer, read by the page, the guide presets, the home note and the checks, never served; see [Consortium core](/modules/consortium-core.md). `tryReferences` is parsed when the site builds, by [src/lib](/modules/src-lib.md).
- [climate-release.json](../../src/data/climate-release.json): the pinned canopi-climate grid release (tag, GitHub asset URL, size, sha256, manifest sha256) that every `astro build` fetches and verifies. `climate-index.json` (git-ignored, written by each fresh install): the installed grid as the build sees it (URL base `/data/climate/<version>-<12 hex>/`, tile names and sizes per layer, variables, slots, release, credits, the consortium grid check); see [Climate reader](/modules/climate-reader.md).
- [consortium-credits.ts](../../src/data/consortium-credits.ts): the consortium tool's credits on /data-sources/ (P5 S5f): `toolCredits(climateIndex.credits, tag)` (the grid, its five inputs from the climate index, GBIF, OpenFreeMap, Nominatim; a missing known grid source throws), `GBIF` (fetch window and basis of record, checked against the installed export's meta by `scripts/consortium-p5-seams-s5f.test.mjs`); see [Privacy page and tool credits](/modules/privacy-and-credits.md).
- [glossary.ts](../../src/data/glossary.ts): the Field Guides glossary, en and fr (`glossary`, `glossaryEntry(id, lang)`; one id per concept, no aliases).
- [crops.ts](../../src/data/crops.ts): the 42-row crop table (the guide map's 40 crops plus mustard and flax) behind `CropCards`, `CropTable` and `CropExplorer` (ease, crossing, pollination, life, seed; `crop(id)`; no aliases).
- [consortium-guides.ts](../../src/data/consortium-guides.ts): the Field Guides the consortium tool links: `consortiumGuides` (plant canonical name to slugs), `jobGuides` (one guide for each of the six jobs, never `null`) and `explainGuide`; see [Consortium page](/modules/consortium-page.md).
- [food-risks.ts](../../src/data/food-risks.ts): `foodRisks`, the one list of `<FoodCaution risk>` values, used by the component and the tests.

# Interfaces

- `themes: Theme[]` of `{ key, label, books: Book[] }`; `Book = { id?, by, year, climates, featured, editions }` (`- id:` is a kebab-case anchor that guides cite and the bibliography page uses as the book's `id`); `Edition = { lang, title, url, by?, year? }`.
- `editionFor(book, lang)`: the book's edition in a guide language (French edition on French pages when there is one), used by `BookCite` and the guide JSON-LD.
- `climates` (climates.ts): tropical, subtropical, mediterranean, arid, temperate, continental, boreal (the app's zones, from canopi-data's Köppen mapping). See [Climate UX](/decisions/climate-ux.md).

# Dependencies

- [src/i18n](/modules/src-i18n.md) (`Locale` type).
- Consumed by components (`Home.astro`, `Bibliography*.astro`, `Network.astro`, `DownloadDialog.astro`).

# Gotchas

- Desktop downloads use `releases/latest/download/...` aliases; only version and date change per release. `check-built-site.mjs` asserts these URLs and rejects stale versioned ones.
- The bibliography parser throws with `file:line` on malformed fields, unknown climates, empty themes, books missing by/year/edition, or fewer than 3 / more than 6 `featured: yes` books, so a bad edit fails the build.
- The TRY parser throws with `file:line` on a malformed row (not four tab-split fields, an empty field, a DatasetID that is not a number, CR, BOM) and on counts other than the meta file's, which stops the build. The rows are shown as delivered and untranslated; � in them is what the source delivery lost, and is not to be repaired here. Astro escapes the text: never `set:html`.
- A new bibliography theme needs `bibliography.theme.<slug>` in all 11 translation files.
- `- id:` is a book id; the Indonesian edition line is `- ind:`. Ids are unique; a guide citing an unknown id fails the build.
- "Agroecology network" never implies partnership (see CONTEXT.md).
