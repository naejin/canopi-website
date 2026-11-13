---
type: Architecture Decision
title: Consortium v2 architecture
description: "How consortium v2 is built: a storage-independent TypeScript core, Preact islands, a gzipped SQLite export read with SQLite-WASM, per-climate placements, and climate matching on one shared grid from canopi-climate."
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:40:09Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T03:47:09Z }
sources:
  - id: climates-ts
    resource: ../../src/data/climates.ts
    title: src/data/climates.ts
    digest: sha256:8bf60353ef1bf24f
    last_modified: 2026-11-13T03:45:07Z
  - id: decisions-consortium-user-decisions
    resource: /decisions/consortium-user-decisions.md
  - id: wrangler-jsonc
    resource: ../../wrangler.jsonc
    title: wrangler.jsonc
    digest: sha256:b43a72aa23fee185
    last_modified: 2026-10-14T21:57:40Z
---

Owner decisions behind this: [Consortium tool — user decisions](/decisions/consortium-user-decisions.md), rows of 2026-11-10 and 2026-11-11. Plan: [Consortium v2 plan](/project/consortium-v2-plan.md). Also read (sibling repository canopi at 0c425fb07, 2026-11-11): `docs/adr/0006-species-catalog-storage.md`, `docs/architecture.md`, `docs/guides/editions.md`.

## Context
- The v1 tool (`src/scripts/consortium/`, about 5,250 lines of vanilla JS over per-climate JSON) shows three views and lists per climate; v2 adds a strata × phase matrix, a location, one plant pool and future climate.
- projectcanopi.com is served by Cloudflare Workers static assets, which answer `Range:` with the whole file (200, measured 2026-11-11). Files are fetched whole and must stay under 25 MiB.
- Prototypes (2026-11-11): DuckDB-WASM cost about 7 MB from two third-party hosts and 6–32 s to a first result; a slim pool costs about 240 bytes per plant gzipped; a 0.1° climate grid in 10° tiles costs about 50–80 MB in total, under 350–650 KB per tile.

## Decision
1. **Core.** `src/lib/consortium/` is a self-contained, framework-free TypeScript module: types, site fit, matrix fill, swaps, conflicts, jobs, future-climate checks, share state. It reads plants only through a `PlantSource` interface (plain records) and imports nothing from the site; a test fails any import outside it. It is the unit that later moves to a `canopi-consortium` package.
2. **Storage.** canopi-data builds one gzipped SQLite file from its `release.db`; the installer verifies it and copies it under `public/data/consortium/` with its version in the file name. The browser fetches it whole, decompresses it with `DecompressionStream`, opens it with the official SQLite WASM build (pinned, served from this site) and implements `PlantSource` with SQL. The schema carries a version checked on open; above about 10 MB gzipped the export splits per climate (placements are already per climate).
3. **UI.** Preact islands (Preact 11 and signals at the app's versions, mounted from the page script without `@astrojs/preact`, whose Astro 6 releases accept only Preact 10; coordinator row "v2 build setup", 2026-11-11); the page stays a static Astro page that renders without JavaScript what it can (title, explanation, a no-script note). The matrix is an accessible table.
4. **Placements are per climate.** A plant has one placement (stratum, phase range, role, reasons) per curated climate. The tool uses the placement for the reader's climate; otherwise the nearest curated climate, marked "estimate". Nothing is invented.
5. **Climate on one grid.** `canopi-climate` (Rust, opencanopi, AGPL-3.0-or-later) owns the grid and the derived measures. Plants' observed climate ranges are computed in canopi-data by sampling the same grid at GBIF occurrence cells (`canopi-climate sample`), so a site and a plant are compared on the same variable from the same raster (coldest-month minimum, warmest-month maximum, aridity). TreeGOER and EcoCrop are cross-checks and fallbacks. Wording is "inside / outside the observed range", never "will not grow". There is no site USDA zone (2026-11-11 row); the site shows its coldest-month minimum in °C, and a plant's catalogue zone, if shown, is labelled approximate.
6. **Location.** Geolocation, a lazily loaded MapLibre + OpenFreeMap map, typed coordinates and place search through the geocoding registry the app copied from GeoLibre (copied again with its MIT header; the website never imports app modules). The location sets the climate (Köppen class mapped to the seven zones of `src/data/climates.ts`), the country, "native here" (WGSRPD level 3), and soil defaults; the manual climate choice stays.
7. **Files.** Climate and soil tiles are fetched whole, one tile per lookup; tile and data files carry checksums in a manifest installed like the consortium export.

## Alternatives rejected
- **DuckDB-WASM + Parquet** (the app's Web choice): 7 MB engine from jsDelivr plus an extension host, and its partial reads never apply on this host.
- **Plain JSON + JS**: smallest, but the owner wants a database format that grows; SQLite gives SQL and matches the app's Desktop catalog.
- **A `canopi-consortium` repository now**: two-repo changes during the most volatile design work, with no second consumer yet.
- **USDA zones for matching**: the grid's coldest-month minimum is not the annual extreme minimum (prototype: off by up to two half-zones).
- **TreeGOER values as plant ranges**: computed on another raster than the site's.

## Consequences
- The v1 vanilla app, its JSON files, `data.ts`, `climates.ts` (core) and fixture are deleted when v2 ships; v1 share links stop working (owner: no compatibility).
- CLAUDE.md's "no DuckDB / storage" gotcha is scoped to the Web Edition `/app/` files.
- The site gains a third-party notice for copied MIT files and for SQLite WASM.
- The app is unchanged; the measurements go to its ADR 0006.
