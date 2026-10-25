---
type: Module
title: src/data
description: Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
resource: ../../src/data
tags: [module, data]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:07Z }
sources:
  - id: data
    resource: ../../src/data
    title: src/data/
    digest: sha256:70ee420a621d1fdb
    last_modified: 2026-10-24T09:30:47Z
---

# Responsibility

Static data read at build time. No runtime fetching; the featured designs JSON lives in `public/data/` instead (see [scripts](/modules/scripts.md)).

# Key files

- [release.ts](../../src/data/release.ts): `CANOPI_VERSION`, `CANOPI_RELEASE_DATE`, `CANOPI_DOWNLOADS`, `CANOPI_CHECKSUMS_URL`; the single authority for download links.
- [site.ts](../../src/data/site.ts): `WEB_URL` (https://web.projectcanopi.com/), `SOURCE_URL`, `DOCS_URL` (null hides the Docs link), HelloAsso URLs, `DONATION_AMOUNTS`, `discordUrl(lang)`.
- [network.ts](../../src/data/network.ts): `countries`, the agroecology network organisations grouped by region with i18n label keys.
- [bibliography.md](../../src/data/bibliography.md): the hand-edited bibliography (format documented in its header comment).
- [bibliography.ts](../../src/data/bibliography.ts): parses the markdown (`?raw` import) into `themes` and exports `climates`.

# Interfaces

- `themes: Theme[]` of `{ key, label, books: Book[] }`; `Book = { by, year, climates, featured, editions }`; `Edition = { lang, title, url, by?, year? }`.
- `climates`: tropical, subtropical, mediterranean, arid, temperate, continental, boreal (the app's zones).

# Dependencies

- [src/i18n](/modules/src-i18n.md) (`Locale` type).
- Consumed by components (`Home.astro`, `Bibliography*.astro`, `Network.astro`, `DownloadDialog.astro`).

# Gotchas

- Desktop downloads use `releases/latest/download/...` aliases; only version and date change per release. `check-built-site.mjs` asserts these URLs and rejects stale versioned ones.
- The bibliography parser throws with `file:line` on malformed fields, unknown climates, empty themes, books missing by/year/edition, or fewer than 3 / more than 6 `featured: yes` books, so a bad edit fails the build.
- A new bibliography theme needs `bibliography.theme.<slug>` in all 11 translation files.
- "Agroecology network" never implies partnership (see CONTEXT.md).
