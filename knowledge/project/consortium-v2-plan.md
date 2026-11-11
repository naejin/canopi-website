---
type: Project
title: Consortium v2 plan
description: Phases, order, exits and session brief for consortium v2 across canopi-website, canopi-data and opencanopi/canopi-climate.
tags: [consortium]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T01:59:39Z }
sources:
  - id: decisions-consortium-user-decisions
    resource: /decisions/consortium-user-decisions.md
  - id: decisions-consortium-v2-architecture
    resource: /decisions/consortium-v2-architecture.md
  - id: runbooks-agentic-delivery
    resource: /runbooks/agentic-delivery.md
---

Architecture: [Consortium v2 architecture](/decisions/consortium-v2-architecture.md). Owner decisions (final, dated): [user decisions](/decisions/consortium-user-decisions.md). Adapter: [agentic delivery](/runbooks/agentic-delivery.md) (branch prefix `consortium/` instead of `guides/`). v1 plan for history: [Consortium tool plan](/project/consortium-tool-plan.md).

## Session brief (read first)
- **State (2026-11-11):** P3a released (canopi-climate v0.1.0, grid as release asset); P1 built on canopi-data branch `consortium-v2-export` (export in `/media/daylon/main_hdd/canopi-cache/exports/consortium-v2/r-2c6bdf65c35caca3/`), push after its fix re-review; P3b (soil and border layers) building on canopi-climate branch `p3b-site-layers`; P2 mockups accepted (`.local/consortium/v2/mockups/`) and design check done (`.local/consortium/v2/p2-design-check.md`, gitignored). Prototype reports: `.local/consortium/v2/prototypes.md`.
- **Mode:** the owner delivers unsupervised: no checkpoints; push to master (deploys) only when fully satisfied; an unclear point gets the most cautious choice and a revertible coordinator row in the decision log.
- **Repos:** website (this), `../canopi-data` (Python; free to change and push), `../canopi-climate` (Rust; push freely), `../canopi` (read only; pinned at 0c425fb07; work in progress there).
- **Never reopen:** SQLite-WASM (not DuckDB), matrix replaces Layers + Over time, no v1 link compatibility, no reference-consortia benchmark, observed ranges never phrased as limits, no pairwise companion folklore, warn rather than remove dangerous info, never default to temperate.
- **Machine rules:** every npm/node/cargo/chrome command capped with `systemd-run` (agent definitions); dev server owns port 4321; big data in `/media/daylon/main_hdd/canopi-cache/`.

## Phases

Each phase ships on its own. Repos: W website, D canopi-data, C canopi-climate.

### P1 (D) — v2 export: gzipped SQLite
- **Goal:** the tool's data as one versioned, slim SQLite file built from `release.db`, still for the three curated climates.
- **Contents:** plants (ids, canonical names, family, genus, names in 11 locales, image with credit, warnings, sources, site-fit traits, layer values), one placement row per plant × curated climate (stratum, phase start/end, role, reasons per locale each labelled with its region and sources), functions, every interaction type with severity, sources and pest common names (`agent_names`; conflicts and suggestions read them), the per-country invasive-checked table (GRIIS), trait labels (today's `labels.json`), WCVP native and introduced level-3 areas, a `meta` table (schema version, release id, built at).
- **Beside the SQLite file** (unchanged contracts): `source_credits.tsv` and `try_references.tsv` with their manifest entries, still copied to `src/data/` by the installer for `/data-sources/` and `check-built-site.mjs`; `manifest.json` with checksums and release id.
- **Also:** a placement-difference audit (each plant whose placement differs between climates: explained by its inputs, or a curation inconsistency to fix); the format doc and a schema check replace format 3; `canopi release verify` covers the new file; above 10 MB gzipped the export splits into one file per climate (owner row); the split is written and tested in P1 even though today's file is far below it.
- **Exit:** the file builds from a real release, verifies, is under 1 MB gzipped, and the audit's inconsistencies are fixed or listed with a reason.

### P2 (W) — the rebuilt tool, shipped
- **Goal for users:** a faster, clearer tool whose main view is the strata × succession matrix, filling as many cells as the site allows.
- **First:** interactive mockups of the matrix (phone and desktop, light and dark, empty, partial and full matrix, a cell nothing can fill, details, swap) critiqued by a separate reviewer before any build (2026-10-27 row; owner approval replaced by the 2026-11-10 row).
- **Kept from v1 (adapted, no owner row drops them):** climate-first start and "Ask for this climate" for uncovered climates; the optional country line with the browser guess and per-country invasive warnings ("not checked in {country}"); Main crops ("What do you mainly want to grow?", crop examples by rule); search, paste a list, multi-select and "Add anyway"; a list of all plants grouped by matrix cell for 6–200 plants (replaces Cards/List); phases in plain time words first ("Years 1–3 · Placenta 3") in column headers and details, with the stage bar on phone rows; print rules for the side view; explain popovers linking guides.
- **Built:** Preact + SQLite-WASM setup; the storage-independent core (matrix fill with per-climate placements, site fit, swaps, conflicts, jobs, share state) with its import-boundary test; installer for the SQLite export; views Matrix (with light share per stratum and empty-cell reasons), side view of one phase column, Jobs; plant details (photo, reasons, traits, layer values, pairings, sources, warnings, guides, "Suggest a correction"); Swap, Remove/Undo, Keep, Add; share link (new format) and last consortium restored; print; "Download for Canopi" (`.canopi` version 9 `consortiums`, phases mapped to 0–6); 11 locales; guide presets updated; v1 code, JSON and fixture deleted; shared helpers (`safeHref`) moved first; CLAUDE.md gotcha scoped; third-party notices.
- **Amended by the design check (2026-11-11, `.local/consortium/v2/p2-design-check.md`, coordinator row "v2 build setup"):** no `@astrojs/preact` (Preact 11 mounted from the page script); `public/_headers` immutable caching for hashed files; installer writes `src/data/consortium-index.json` (read with `node:sqlite`) for build-time readers and self-hosted image map; guide presets keep `?plant=&climate=`; search in JS over folded names; core rules: serious conflict = high only, all four site questions gain and start at "Not sure", 9 plants with Room "Not sure", "Months 3–12"; `.canopi` writer is a pure core function checked against the app's format at 0c425fb07; browser tests with pinned `puppeteer-core` (`npm run test:browser`, never in `npm test`); P5-only items (future screen, location, placement shift, native areas) not in P2.
- **Streams (by feature):** S1 core + data adapter; S2 matrix + phone stepper + side view + jobs + all-plants list; S3 details + correction + swap/remove/keep/add + search/paste; S4 page shell + start (climate, country, crops, site) + share/memory + print + download + guides + notices. Commit 0 (main agent): pins and config, `safeHref` moved to `src/lib/safe-href.js`, frozen seams (`types`, `PlantSource`, signals store shape, i18n prefixes, CSS tokens), installer v4 and a real install, v1 UI and tests deleted, browser harness and BT-1…9 marked todo. File owners: design check §6.
- **Evidence:** `node --test` for the core and installer; browser checks BT-1…9 (design check §7; 390 and 1280 px, light and dark, keyboard only, screen-reader names) on built pages; budgets (design check §8): first consortium within about 2 s warm and 4 s cold at 4× CPU / 9 Mbps / 60 ms, island JS under 60 KB gzipped excluding SQLite's glue and WASM, recompute under 50 ms for 200 plants, data file ≤ 1 MB gzipped.
- **Exit:** every v1 path either exists in v2 or was dropped by an owner row; gates green; real-browser walk-through of choose climate → suggest → adjust → share → print → download.

### P3 (C) — canopi-climate 0.1 and grid release
- **Goal:** location → current and future climate, natively and in WASM.
- **Built:** crate (model, grid, tile, lookup, wasm) and a `pipeline` feature with the CLI (`build-grid`, `sample`); grid 0.1° in 10° tiles, COG unless the design check measures a reason not to (reader crate chosen by WASM size: `wbgeotiff` vs the `tiff` crate); variables: Köppen, coldest-month minimum, warmest-month maximum, coldest/warmest monthly means, precipitation, aridity, dry months; periods 1991–2020 and 2041–2070 / 2071–2099 for SSP1-2.6, 2-4.5, 3-7.0, 5-8.5; sources Beck et al. 2023 and CHELSA v2.1 with checksums; workarounds for `wbgeotiff`/`wbhdf` gaps kept in the crate (upstream contributions are a follow-up, not done without the owner); a GitHub release with tiles, manifest, checksums and attribution; CI (fmt, clippy, tests, wasm build).
- **Validation:** about 20 cities across all climates against ERA5 normals and Open-Meteo CMIP6, with stated tolerances; Köppen/temperature consistency check.
- **Site layers built by the same pipeline:** SoilGrids pH and texture at about 5 km (0–30 cm), re-tiled to latitude/longitude in the same 10° tiles with a nearest-valid-cell fill (Homolosine reprojection with `proj4rs`, else pipeline-time WCS output in EPSG:4326); WGSRPD level-3 and Natural Earth 1:50m borders packaged as a point-lookup file per tile or one small file, measured.
- **Not shipped:** a site USDA zone (unreliable without an extreme-minimum model; coordinator choice, revertible).
- **Exit:** release published; city table within tolerance or each miss explained; WASM package used by a Node smoke test.

### P4 (D) — plant climate ranges and indicators
- **Goal:** each plant's observed climate on the same grid, plus drought and heat indicators, all with provenance.
- **Built:** name spine matched with authors plus an override table, non-direct matches logged; GBIF cells per plant through the maps API (≤ 1 request per second, cached with URL and date); `canopi-climate sample` at the cells; quantiles Q05/median/Q95 with cell counts; TreeGOER and EcoCrop as cross-check and fallback; EIVE, Niinemets & Valladares and EcoCrop indicators mapped to documented classes; every value marked "estimate, not reviewed"; export schema version 2 with these columns.
- **Exit:** all 515 plants have ranges or a stated reason; QA report of disagreements with existing hardiness and drought traits.

### P5 (W) — location and future climate, shipped
- **Goal for users:** "Where is your site?" sets the climate, country, native plants and soil defaults; long-lived plants are checked against the projected climate.
- **Built:** location picker (geolocation, coordinates, place search via the copied registry, lazily loaded MapLibre + OpenFreeMap map); climate from the Köppen class; country from Natural Earth 1:50m; "native here" from WGSRPD level 3; soil pH and texture from SoilGrids tiles (built by canopi-climate's pipeline, nearest valid cell) marked "likely"; the location kept out of share links unless the reader ticks a box (rounded to the cell); one pool filtered by observed ranges; future check by column (placenta: today; secondary: 2041–2070; climax: 2071–2099), SSP2-4.5 by default with the range across scenarios; placement shift shown when a plant's curated placement differs in the projected climate; uncovered climates get a partial matrix with nearest placements marked "estimate"; data-sources page and privacy notes updated.
- **Hosting:** an installer verifies the canopi-climate release (manifest, checksums) and copies the tiles and lookup files under `public/data/`; the browser never fetches from GitHub at runtime; every file under 25 MiB and the file count measured against the Workers static-assets limit.
- **Notices and credits:** third-party notices for canopi-climate (AGPL), MapLibre (BSD) and copied files; on-map attribution for OpenStreetMap/OpenFreeMap; credit rows on `/data-sources/` for Beck et al., CHELSA, SoilGrids, WCVP, GBIF, TreeGOER, EIVE, Niinemets & Valladares, EcoCrop and Natural Earth.
- **Exit:** gates green; real-browser walk-throughs for a site in each of the seven climates; budgets met with the map and WASM loaded lazily.

### P6 — close
- Usefulness pass, receipts, retrospective; measurements note for the app's ADR 0006; follow-ups filed with slots (upstream whitebox fixes, GBIF DOI download with an account, extreme-minimum model, wider curation).

## Order
P1 and P3 start in parallel; P2 after P1; P4 after P3 (needs `sample`); P5 after P2, P3 and P4.

## Risks to watch
- SoilGrids is in Homolosine: reprojection in Rust (`proj4rs` support to check) or pipeline-time WCS output in EPSG:4326.
- Beck licence wording (CC BY vs BY-NC) — owner authorization covers it; attribution shown.
- GBIF without a citable DOI until an account exists.
- Precipitation disagrees between products by up to 36% at a point: aridity shown with its uncertainty.
