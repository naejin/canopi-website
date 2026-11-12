---
type: Module
title: Climate reader
description: The canopi-climate v0.2 tile reader in src/lib/climate/ and its installer, which serves the tiles under /data/climate/ for the consortium page's location lookup.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T21:25:34Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-12T21:25:09Z }
sources:
  - id: index-ts
    resource: ../../src/lib/climate/index.ts
    title: src/lib/climate/index.ts
    digest: sha256:9fffb42bb87f69b5
    last_modified: 2026-11-12T12:34:53Z
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
    digest: sha256:8670ed7d1bcd8d91
    last_modified: 2026-11-11T14:35:47Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:2cee9ad74ec9ad84
    last_modified: 2026-11-12T20:56:48Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:0401c704326e00fb
    last_modified: 2026-11-11T09:09:11Z
  - id: climate-release-json
    resource: ../../src/data/climate-release.json
    title: src/data/climate-release.json
    digest: sha256:f17c3cc7b270a864
    last_modified: 2026-11-11T09:33:29Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:2bf51292628a2fea
    last_modified: 2026-11-12T20:56:48Z
  - id: climate-integration-mjs
    resource: ../../scripts/climate-integration.mjs
    title: scripts/climate-integration.mjs
    digest: sha256:4dc9481c2233fe60
    last_modified: 2026-11-11T14:35:47Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:ad2fea270b47646a
    last_modified: 2026-11-11T17:14:18Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:e4f1d144fc4ece03
    last_modified: 2026-11-12T09:10:58Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:ee3774ca000cf5bc
    last_modified: 2026-11-12T18:47:57Z
enforced_by:
  - scripts/climate-reader.test.mjs
  - scripts/install-climate.test.mjs
---

# What it is

P5 stream S5b's data half: a TypeScript reader for the canopi-climate v0.2 grid (`src/lib/climate/`) and the installer that serves the grid's tiles as static files (`scripts/install-climate.mjs`). The island's "Where is your site?" view (S5b UI) calls it. Since P5 commit 0 the island's `store.ts` imports its `SiteLookup` type only, to check at compile time that it stays assignable to the core's structural `SiteLookup` (`src/lib/consortium/types.ts`: lat, lon, climate periods with Köppen, margin, tmin/tmax and tmean of the coldest/warmest months, aridity; soil pH, texture and fill; region codes); the core never imports the reader. `scripts/browser/location-fixtures.mjs` `lookupAt` runs it in Node over a build's tiles for the P5 browser specs.

# Reader (`src/lib/climate/`)

| File | Role |
|---|---|
| `model.js` | variables (ids, scales), slots 0–8, layer specs, band ids; plain JavaScript so the installer and the built-site check import it under plain Node |
| `tiff.ts` | `readTileHeader` and `decodeRaster`: little-endian classic TIFF, int16, pixel-interleaved, Deflate through `DecompressionStream('deflate')` with a byte cap, one internal tile (112² climate, 208² site layers), position from ModelPixelScale/ModelTiepoint |
| `grid.ts` | cell rules of `manifest.json grid.cell_edges` (west and north edges inclusive, −90 in the last row, 180 wraps to −180), tile names, the radius window (north to south, then west to east) |
| `lookup.ts` | `climateAt`, `soilAt`, `regionsAt` with the crate's `lookup_across` semantics: own cell if complete (aridity may be missing), else nearest within 2 cells, Euclidean, ties north then west, across tile edges and the antimeridian, never the poles; scale decoding as `src/model.rs` |
| `koppen.ts`, `soil.ts`, `regions.ts` | Köppen symbols and the temperature margin in f32 (`Math.fround`), USDA texture classes, base-26 region codes |
| `index.ts` | `siteIndex(json)`, `createTileSource({ index, fetchBytes?, maxTiles = 4 })`, `lookupSite(lat, lon, source)` |

`lookupSite` fetches the point's tile of each layer in parallel (3 requests), then neighbours only when the own cell does not answer and lies within 2 cells of an edge. A tile absent from the index is never requested (no data; a miss would run the Worker). A listed tile that fails rejects with `ClimateTileError` (layer, tile); an invalid coordinate rejects with `RangeError` before any fetch. `lookupSite(lat, lon, source, radius, { soil: false })` reads no soil tile and answers `soil: null`; the consortium location step passes it until P5.2 (soil likely) reads soil (pre-push review 3: each lookup had downloaded about 37 KB of soil nothing used); the installer, `#ct-climate` and `check-built-site` still carry the soil layer. Result: `{ lat, lon, tile, climate | null, soil | null, regions, tilesRead, crossTile }`; `climate.periods[slot]` has `koppen`, `koppenCode`, `koppenTemperatureMarginC`, `tminColdC`, `tmaxWarmC`, `tmeanColdC`, `tmeanWarmC`, `precipMm`, `aridityIndex | null`, `dryMonths`; `soil` has `phH2o`, `sandPct`, `clayPct`, `siltPct`, `texture`, `filled`, `fillDistanceCells`; `regions` always exists, codes null offshore.

# Installer and served files

- The tiles are fetched at build and verified, never committed (owner decision 2026-11-11). [climate-release.json](../../src/data/climate-release.json) pins the release: tag `v0.2.0`, the GitHub asset URL under `github.com/opencanopi/canopi-climate/releases/download/`, 99,194,880 bytes, the tar's sha256 `56f717f1…` and the manifest's sha256 `04ec85f4…`.
- Every `astro build` runs `ensureClimate` first, from the `climateTiles` integration ([climate-integration.mjs](../../scripts/climate-integration.mjs), in `astro.config.mjs`, on `astro:config:setup`), so the install does not depend on the build command Cloudflare Workers Builds runs (which could not be confirmed); `npm run build` is plain `astro build`. A failure throws from the hook and fails the build. `astro dev` runs the same install (nothing when installed) from `CANOPI_CLIMATE_ARCHIVE` or the cache only, never downloading (`allowDownload: false`), and only warns on failure, the dev server then serving no tiles; sync, preview and `astro check` do nothing. Astro loads `astro.config.mjs` with plain Node, so on Node < 22.18 `loadTiffModule` compiles `tiff.ts` with TypeScript (a dev dependency) instead of importing it. It does nothing when `src/data/climate-index.json` names the pinned manifest and archive and every tile is in `public/data/climate/` with its size (the consortium grid check is re-run and the index follows it). Otherwise it takes, in order: `CANOPI_CLIMATE_ARCHIVE` (a local tar; offline and dev; not cached), the cache (`CANOPI_CLIMATE_CACHE`, default `node_modules/.cache/canopi-climate/`), else one plain `fetch` of the URL (no custom headers), streamed to a part file with a running sha256 and cut at the pinned size. The size and sha256 are checked before the tar is read; a corrupt cached tar is downloaded again; a failed download, a mismatch or any refusal fails the build.
- Downloads: stale `<file>.part-<pid>` files of dead processes are removed from the cache first; a download with no byte for 30 s (`STALL_MS`, waiting for the answer included) or taking over 10 min (`TIMEOUT_MS`) is aborted and fails the build.
- Concurrency: `ensureClimate` holds `<staging>/lock` (`.cache/climate-install/lock`: pid and token; a dead pid's lock is taken over), and each install stages in its own `run-<pid>-*` directory, removing only that one, so dev, build and `build:browser-test` at once never delete each other's files or backups: the first installs, the others find the grid installed.
- Integrity: the index (format 2) stores each tile's sha256 (`layers.<id>.sha256`) beside its size; `verifyClimateInstall`, which `ensureClimate`'s up-to-date test and `check-built-site` both use, hashes every tile, so a same-size edit is caught at build and reinstalled. Hashing the 98 MB took 0.24 s (warm cache), so no marker or mtime shortcut is used.
- No install mark is served: an install is recognised by its shape (`<version>-<12 hex>` directories only); the `INSTALLED_BY` file of earlier installs is accepted once and removed, and `verifyClimateInstall` refuses it in `dist`.
- `npm run install:climate` installs by hand; `npm run install:climate -- <tar>` installs a local archive, verified against the pin as well. `installClimate({ archive })` without `release` (the `.sha256` beside the tar) remains for a hand install of another grid.
- Then the checks: tar entries (regular files, safe paths, no duplicates, ≤ 25 MiB), every `SHA256SUMS` line, the manifest's sha256 against the pin and its content against `model.js`, each tile's size, sha256 and TIFF position. The tiles go to `public/data/climate/<version>-<12 hex manifest sha>/{tiles,soil,regions}/` and the index to `src/data/climate-index.json`; both are git-ignored and regenerated (the index is deterministic for a grid and a consortium export, and no type check imports it).
- Consortium grid check: the consortium index's `climate_grid_manifest_sha256` must equal the grid's manifest sha256 (`04ec85f4…` for v0.2.0); since P5 commit 0 the installed export carries it (now schema 3, `r-01102782139409b5`, `04ec85f4…`) and the build records `consortium_grid_check.status = "matched"`. A schema 1 index without it still installs as `"unchecked"`, but `check-built-site.mjs` then fails ([consortium-grid-check.mjs](../../scripts/consortium-grid-check.mjs): a missing or empty sha, another grid, or a status other than `matched`). An empty string there means the same (unknown grid: unchecked, with its own warning), not a different grid; any other value that is not a sha256 is refused.
- `public/_headers` caches `/data/climate/*` immutably (the directory name changes with the manifest).
- `scripts/check-built-site.mjs` fails above 20,000 files in `dist/client` (Workers Free), and fails when the index is missing, names another grid than the pin, or any tile it lists is missing or of another size (`verifyClimateInstall`).
- v0.2.0: 464 climate (77.4 MB), 330 soil (19.6 MB), 463 regions (0.8 MB) tiles; the build had 1,795 files without the Web Edition.

# A new grid release

Update the pin (tag, file, URL, size, sha256 from the release's `.sha256`, manifest sha256 from `sha256sum manifest.json`); the next build downloads it and replaces the installed version directory. The consortium export must carry the same `climate_grid_manifest_sha256` once it names one.

# Tests

- `scripts/climate-reader.test.mjs`: 52 points compared field by field with `canopi-climate lookup` (`scripts/fixtures/climate/goldens.json`, regenerated by `make-goldens.mjs`), plus 2 refused coordinates; these read the extracted grid at `CANOPI_CLIMATE_GRID` and skip without it (their tiles total 14 MB). Always: the crate's synthetic tiles, fetch policy, LRU, TIFF refusals, grid rules, Köppen, texture and codes.
- `scripts/install-climate.test.mjs`: a one-tile archive built in the test; each refusal with nothing written; `verifyClimateInstall`; the pin; with a fetch double (no network): one download cached then reused, up-to-date skip, wrong size, sha256, HTTP status or network error refused with nothing installed or cached, a corrupt cache replaced, a wrong manifest refused, `CANOPI_CLIMATE_ARCHIVE` offline and verified, `CANOPI_CLIMATE_CACHE`, another grid replaced; the TypeScript fallback for `tiff.ts`; an empty consortium sha; the legacy mark replaced; a same-size edit caught and reinstalled; per-run staging, three concurrent installs and a dead lock; dev never downloading; a stall, an overall timeout and a fetch that never answers; stale partial downloads.
- `scripts/climate-integration.test.mjs`: build waits for the install and fails with it; dev passes `allowDownload: false` and warns only; sync and preview do nothing; the config uses the integration and `build` is plain `astro build`.
