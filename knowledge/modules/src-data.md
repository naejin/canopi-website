---
type: Module
title: src/data
description: Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
resource: ../../src/data
tags: [module, data]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T23:04:45Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T09:55:54Z }
sources:
  - id: data
    resource: ../../src/data
    title: src/data/
    digest: sha256:59266fcd3598fd39
    last_modified: 2026-11-05T22:54:26Z
---

# Responsibility

Static data read at build time. No runtime fetching; the featured designs JSON lives in `public/data/` instead (see [scripts](/modules/scripts.md)).

# Key files

- [release.ts](../../src/data/release.ts): `CANOPI_VERSION`, `CANOPI_RELEASE_DATE`, `CANOPI_DOWNLOADS`, `CANOPI_CHECKSUMS_URL`; the single authority for download links.
- [site.ts](../../src/data/site.ts): `WEB_URL` (https://web.projectcanopi.com/), `SOURCE_URL`, `DOCS_URL` (null hides the Docs link), HelloAsso URLs, `DONATION_AMOUNTS`, `discordUrl(lang)`.
- [network.ts](../../src/data/network.ts): `countries`, the agroecology network organisations grouped by region with i18n label keys.
- [bibliography.md](../../src/data/bibliography.md): the hand-edited bibliography (format documented in its header comment).
- [climates.ts](../../src/data/climates.ts): `climates`, `Climate`, `isClimate`: the one list of the seven climate zones, shared with the Canopi app and used by the bibliography, guides, picker and head script.
- [bibliography.ts](../../src/data/bibliography.ts): parses the markdown (`?raw` import) into `themes`; book climates are validated against `climates.ts`.
- [try_references.tsv](../../src/data/try_references.tsv), [try_references.meta.json](../../src/data/try_references.meta.json), [try-references.ts](../../src/data/try-references.ts): the TRY dataset list, copied from canopi-data `data/curated/try_references.tsv`, with that source's row count, DatasetID count and sha256; `tryReferences` is parsed when the site builds, by [src/lib](/modules/src-lib.md). To refresh it, copy both values from canopi-data together (`try_references_inputs.json` gives the counts and hash).
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
