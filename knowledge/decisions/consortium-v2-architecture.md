---
type: Architecture Decision
title: Consortium v2 architecture
description: "How consortium v2 is built: a storage-independent TypeScript core, Preact islands, a gzipped SQLite export read with SQLite-WASM, per-climate placements, and climate matching on one shared grid from canopi-climate."
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-17T10:22:53Z }
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
  - id: architecture-plant-palette-architecture
    resource: /architecture/plant-palette-architecture.md
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

## Changes (2026-11-14, Plant palette redesign)
Each row is revertible on its own (coordinator rows under the owner's approval of the grower-first design, decision rows of 2026-11-14 in [user decisions](/decisions/consortium-user-decisions.md)); detail in [Plant palette architecture](/architecture/plant-palette-architecture.md) section 2, pushes in [Plant palette slices](/project/plant-palette-slices.md). Decisions 2, 4, 5, 6 and 7 are unchanged.

| # | Change | Lands | Reverted by |
|---|---|---|---|
| 1 | Decision 1, core: "matrix fill" gives way to place, verdict, years, holes and weigh modules (`place.ts`, `verdict.ts`, `verdict-line.ts`, `years.ts`, `holes.ts`, `weigh.ts`; later `plan.ts`, `season.ts`); `matrix.ts` and `PlantSource.cellCounts` deleted | PP-B (b3 deletes) | restoring `matrix.ts` from 648baf2 |
| 2 | Decision 3, UI: one palette page with pictures, each with a "Show as a table" form, replaces the matrix view and the tabs; the tool is "Plant palette" at `/palette/` (22 redirect lines in `public/_redirects`; internal names stay "consortium") | PP-B | owner row |
| 3 | ADR-1 gains rule **L10 one-verdict**: inside the core only the rule files, `verdict*.ts`, `place.ts`, `suggest.ts`, `site-climate.ts` (and `matrix.ts` until deleted) import `range.ts`, `future.ts` or `site.ts`; `index.ts` may import them for named re-exports only (`index` in the rule's `pathNot`, with an arch-rules fixture; amended 2026-11-14); `warn` in PP-B commit 0, keys written then by `ratchet.mjs arch --write`, `error` at the end of PP-C | PP-B, PP-C | dropping the rule from `.dependency-cruiser.cjs` |
| 4 | ADR-1 statement: L3 holds the picture models `rules/picture-*.ts` (pure, numbers and keys); a view draws and never computes a position from plant data; no first-run module statically imports `verdict.ts` (reached through `loadVerdictRule()` in core `verdict-load.ts`, which reaches it only through `import()`, never caches a failed load and is exported from `index.ts`; amended 2026-11-14); only `place.ts` reads `lookup.periods` (through `climateFor`, an arch-rules grep line at `warn`) | PP-B | row removed |
| 5 | ADR-2 roles: `balance` deleted; `structure` renamed `matrix` (temporary, then deleted); `palette` (12 KB) and `verdict` (12 KB, then measured + 0.5 KB at the PP-B exit) added (PP-B); `find` replaces `sheets` (PP-C); `plan` and `take` from `later` (PP-D); `climate` replaces `future` (PP-E); `soil` (PP-F); `year` (PP-G); `range` and `markProviders` fold into `verdict`; `pool` deleted; no `charts` role (a shared kit module is counted in each importing role) | each push's commit 0 | restoring the role list in `scripts/built-modules.mjs` |
| 6 | ADR-2 caps: any cap may be raised during the redesign, each raise a row in the plan's budget log and a coordinator row; a size optimisation step follows PP-G (owner, 2026-11-14) | PP-B to PP-G | the optimisation step |
| 7 | Share links: v5 (place withheld unless "Include my place"; one `linkVersionStatus` helper classifying `v` only; v1–v4 "older", nothing restored); extension rule (2026-11-14): unknown keys ignored, per-key fallback, a requires key `u=` reserved, a bump only for a key whose absence changes a verdict, from v5 on a later decoder reads older links by default; `y` is the `PeriodId` span string; F2/F4 take v6 or `u=`. Superseded in part (owner 2026-11-17, "No backward compatibility work"): there is no "older" status; v1–v4 read as unreadable and old links need not survive later changes | PP-B, F4 | owner row (the v1–v4 rule); coordinator row (the extension rule) |
| 8 | Storage (amended 2026-11-14 by the owner's `privacy.tool.device` wording): the save record `{ fragment, place, at, src, country? }` holds the palette's spot and soil answers (room and plot stay in the fragment); a `canopi-place` key only seeds a new palette; the location stays per device in `canopi-location`, which "Use it" on a link's place now writes; "Forget this location" clears the location, `canopi-place` and the record's `place`; `history.state.pl` keeps a tab's place | PP-B | removing the key and its privacy line |
| 9 | Formats that outlive the code: a shared vector envelope for `scripts/vectors/*.json` ([palette vectors](/conventions/palette-vectors.md)); the `.canopi` root key `projectcanopi_palette` (schema 1, no link field); the period as one `PeriodId` string in link, save and `.canopi`; correction `/2` with a `context` object; a CSV column contract (architecture section 10) | PP-B (vectors), PP-D, F1b | coordinator row |
| 10 | One climate reader for rules: `climateFor(ctx, period)` in `place.ts`; verdicts, `hotterZone`, `season.ts`, `weigh.ts` and `factAt` take its result, so F4's adjustments and CLIM-4's height correction land in one place | PP-B commit 0 | coordinator row |

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
