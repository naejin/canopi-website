---
type: Module
title: Climate reader
description: The canopi-climate v0.2 tile reader in src/lib/climate/ and its installer, which serves the tiles under /data/climate/ for the consortium page's location lookup.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T09:10:09Z }
sources:
  - id: index-ts
    resource: ../../src/lib/climate/index.ts
    title: src/lib/climate/index.ts
    digest: sha256:1178c3eff4498001
    last_modified: 2026-11-11T09:09:11Z
  - id: lookup-ts
    resource: ../../src/lib/climate/lookup.ts
    title: src/lib/climate/lookup.ts
    digest: sha256:e7f8df4c4da06a9a
    last_modified: 2026-11-11T09:09:11Z
  - id: tiff-ts
    resource: ../../src/lib/climate/tiff.ts
    title: src/lib/climate/tiff.ts
    digest: sha256:7f8b8977a51b4e08
    last_modified: 2026-11-11T09:09:11Z
  - id: grid-ts
    resource: ../../src/lib/climate/grid.ts
    title: src/lib/climate/grid.ts
    digest: sha256:4d2ddecb6403c889
    last_modified: 2026-11-11T09:09:11Z
  - id: model-js
    resource: ../../src/lib/climate/model.js
    title: src/lib/climate/model.js
    digest: sha256:e355c4bf7c5962ab
    last_modified: 2026-11-11T09:09:11Z
  - id: install-climate-mjs
    resource: ../../scripts/install-climate.mjs
    title: scripts/install-climate.mjs
    digest: sha256:03e07065585a3473
    last_modified: 2026-11-11T09:09:11Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:9d3fae33c85bb59d
    last_modified: 2026-11-11T09:09:11Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:0401c704326e00fb
    last_modified: 2026-11-11T09:09:11Z
enforced_by:
  - scripts/climate-reader.test.mjs
  - scripts/install-climate.test.mjs
---

# What it is

P5 stream S5b's data half: a TypeScript reader for the canopi-climate v0.2 grid (`src/lib/climate/`) and the installer that serves the grid's tiles as static files (`scripts/install-climate.mjs`). The island's "Where is your site?" view (S5b UI) calls it; nothing in `src/islands` or `src/lib/consortium` imports it yet.

# Reader (`src/lib/climate/`)

| File | Role |
|---|---|
| `model.js` | variables (ids, scales), slots 0–8, layer specs, band ids; plain JavaScript so the installer and the built-site check import it under plain Node |
| `tiff.ts` | `readTileHeader` and `decodeRaster`: little-endian classic TIFF, int16, pixel-interleaved, Deflate through `DecompressionStream('deflate')` with a byte cap, one internal tile (112² climate, 208² site layers), position from ModelPixelScale/ModelTiepoint |
| `grid.ts` | cell rules of `manifest.json grid.cell_edges` (west and north edges inclusive, −90 in the last row, 180 wraps to −180), tile names, the radius window (north to south, then west to east) |
| `lookup.ts` | `climateAt`, `soilAt`, `regionsAt` with the crate's `lookup_across` semantics: own cell if complete (aridity may be missing), else nearest within 2 cells, Euclidean, ties north then west, across tile edges and the antimeridian, never the poles; scale decoding as `src/model.rs` |
| `koppen.ts`, `soil.ts`, `regions.ts` | Köppen symbols and the temperature margin in f32 (`Math.fround`), USDA texture classes, base-26 region codes |
| `index.ts` | `siteIndex(json)`, `createTileSource({ index, fetchBytes?, maxTiles = 4 })`, `lookupSite(lat, lon, source)` |

`lookupSite` fetches the point's tile of each layer in parallel (3 requests), then neighbours only when the own cell does not answer and lies within 2 cells of an edge. A tile absent from the index is never requested (no data; a miss would run the Worker). A listed tile that fails rejects with `ClimateTileError` (layer, tile); an invalid coordinate rejects with `RangeError` before any fetch. Result: `{ lat, lon, tile, climate | null, soil | null, regions, tilesRead, crossTile }`; `climate.periods[slot]` has `koppen`, `koppenCode`, `koppenTemperatureMarginC`, `tminColdC`, `tmaxWarmC`, `tmeanColdC`, `tmeanWarmC`, `precipMm`, `aridityIndex | null`, `dryMonths`; `soil` has `phH2o`, `sandPct`, `clayPct`, `siltPct`, `texture`, `filled`, `fillDistanceCells`; `regions` always exists, codes null offshore.

# Installer and served files

- `npm run install:climate -- <canopi-climate-grid-vX.Y.Z.tar>` checks the `.sha256`, tar entries (regular files, safe paths, no duplicates, ≤ 25 MiB), every `SHA256SUMS` line, the manifest against `model.js`, each tile's size, sha256 and TIFF position, then copies to `public/data/climate/<version>-<12 hex manifest sha>/{tiles,soil,regions}/` and writes `src/data/climate-index.json`.
- Consortium grid check: the consortium index's `climate_grid_manifest_sha256` must equal the grid's manifest sha256 (`04ec85f4…` for v0.2.0); while the export does not carry it (schema 1), the install warns and records `consortium_grid_check.status = "unchecked"`.
- `public/_headers` caches `/data/climate/*` immutably (the directory name changes with the manifest).
- `scripts/check-built-site.mjs` fails above 20,000 files in `dist/client` (Workers Free) and, when the tiles are installed, checks every index tile and its size (`verifyClimateInstall`).
- v0.2.0: 464 climate (77.4 MB), 330 soil (19.6 MB), 463 regions (0.8 MB) tiles; the build had 1,795 files without the Web Edition.

# Open: the tiles are not in git

`public/data/consortium/` (22 MB) is committed and deployed by Cloudflare Workers Builds from git; the climate tiles (98 MB, 1,257 files) are not committed, so a Cloudflare build has the index but no tiles. The coordinator decides how they reach the deploy.

# Tests

- `scripts/climate-reader.test.mjs`: 52 points compared field by field with `canopi-climate lookup` (`scripts/fixtures/climate/goldens.json`, regenerated by `make-goldens.mjs`), plus 2 refused coordinates; these read the extracted grid at `CANOPI_CLIMATE_GRID` and skip without it (their tiles total 14 MB). Always: the crate's synthetic tiles, fetch policy, LRU, TIFF refusals, grid rules, Köppen, texture and codes.
- `scripts/install-climate.test.mjs`: a one-tile archive built in the test; each refusal with nothing written; `verifyClimateInstall`.
