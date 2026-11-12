---
type: Project
title: Consortium v2 plan
description: Phases, the final remaining order after the 2026-11-12 plan review, exits, coordinator choices and owner actions for consortium v2 across canopi-website, canopi-data and opencanopi/canopi-climate.
tags: [consortium]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T19:54:55Z }
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
- **State (2026-11-12):** P1–P4 done (canopi-data master ab6bfad, 154f3f6; canopi-climate v0.1.0, v0.2.0); P2 live (b75656c); **P5 live at d67492d** (origin/master); plan review done and this plan rewritten to its final order ("Remaining plan" below); next: E1 browser test speed, with E2 and C1 in parallel; canopi-data starts with its data-only release D2a. Plan-review inputs (gitignored): `.local/consortium/v2/plan-review/` in the main checkout.
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
- **Done 2026-11-11 (deviations, see canopi-data `docs/plant-climate-ranges.md`):** all 515 from GBIF (≥ 56 cells; TreeGOER/EcoCrop fallbacks unused); zoom-0 then zoom-2 map tiles; no cultivation or year filter (decision row "Observed ranges include cultivation"); EcoCrop a drought cross-check only; indicators kept in canopi-data, not exported; `plant_koppen.share` added; regions read by a Python reader duplicating `canopi-climate lookup` (follow-up: regions in `sample` output, slot next canopi-climate minor); 23 annuals with zone ≤ 4 flagged as suspected data errors (slot: next canopi-data release); GBIF derived-dataset DOI pending (slot: before P5 ships credits). Website side: installer and schema check learn schema 2 in P5.

### P5 (W) — location and future climate, live
- **Live at d67492d** (origin/master, Workers Builds), with P5.2's soil offer and native line moved to the UX step (decision row "P5 ships without S5e"). Below-bar items filed at the push are placed in the steps below.

## Remaining plan (final, 2026-11-12, after the plan review)

Comes from the plan review (draft, three architecture reviews and an unanchored challenge of 36 findings, gitignored in the main checkout under `.local/consortium/v2/plan-review/`) and the owner's answers in the decision row "Plan review answers" (2026-11-12). The challenge's findings were applied except where one contradicts a recorded owner decision; those places say so. canopi-data's side is planned in canopi-data `docs/consortium-data-plan.md` (steps D0–D10 with D2a/D2b, D8a, D9a/D9b) and done by its own agent; the website reads it only through the export contract. The Canopi app is never touched.

Step ids: **E** enabling (website), **F** feature (website), **C** canopi-climate, **D** canopi-data (its plan). Sizes are rough file and concept counts; nothing is sized in time.

### Order at a glance

```
E0 plan adoption (this rewrite) ─┬─► E1 browser test speed ──► E6 island refactor ──► F1a Palette, filters, confidence, Balance ──┬─► F4 site adjustments
                                 │                     └─► E3 CI + deploy gate ┐  (gate live before the F1a push)          ├─► F2 replacements (+ cautious switch)
                                 │                     └─► E4 architecture checks ┘                                         └─► F1b Plan view, CSV, methods, trust
                                 ├─► E2 small correctness fixes (parallel with E1)
                                 └─► C1 canopi-climate foundation (v0.2.1) ──► E5a tile vectors in website CI
F3 Suggestion v2: after F1a + F2, when its data lands (D2a, D8)
F6 fire risk: after F1a, when flammability data lands (D8); annual dry months, no monthly layer
F5 dry season + growing months + water: design check (P7b QA evidence) ──► C2 crate refactor ──► C3 v0.3 monthly layer ──► F5 build (also needs D8 bands, F4)
Ride-alongs (no step of their own): D2a reinstall (before the F1a Add-filters stream builds); D9a Arid, then D9b Boreal reinstall (before the split, cost measured);
  E5b-range when D6 lands; correction /2 in F1b when D5 lands; E7 format-5 reader when D4 lands; D9 Continental and Subtropical reinstall after E7.
```

Only one serial chain blocks the first user value: **E1 → E6 → F1a**. E3 and E4 run beside E6 and must be live before the first feature push (owner "quality foundation before feature work", met at deploy). Waiting on canopi-data never blocks a website build that today's export can serve, with one exception kept from an owner row (F1a's Add-filters stream waits for D2a, see F1a).

### Steps

| # | Step | Goal | Depends on | Size |
|---|---|---|---|---|
| 1 | E0 | this plan, hand-off to canopi-data | plan review | docs only (done with this rewrite) |
| 2 | E1 | browser suite ≤ 15 min in CI, ≤ 12 min locally; hangs named | E0 | ~12 files (2 spec files split into 7) |
| 2 | E2 | installer band check; range-rule scenario tests | — | ~6 files |
| 2 | C1 | canopi-climate tooling, `docs/format.md`, vectors; v0.2.1 | E0; owner: Renovate app | ~14 crate files |
| 3 | E6 | island ready for Palette, P7a, facts and the split; first run ≤ 40 KB | E1 | ~35 files |
| 3 | E3 | master deploys only when green; tiered hooks | E1; owner: Cloudflare production branch | ~6 files |
| 3 | E4 | layering, dead-code, duplicate, a11y checks | E1 | ~10 files |
| 3 | E5a | website reads the crate's tile vectors | C1 | ~4 files |
| 4 | F1a | Palette and Structure, Add filters (P5.1, P5.2), confidence vocabulary, Balance panel | E6; E3+E4 live before push; D2a for the Add-filters stream | large, ~45 files |
| 5 | F4 | P7a site adjustments | E6, F1a | ~10 files |
| 5 | F2 | climate replacements with a crossing decade, cautious switch | E6, F1a | ~12 files |
| 6 | F1b | Plan view, CSV, methods page, trust and feedback | F1a, F2 (methods page) | ~25 files |
| 7 | F3 | Suggestion v2 | F1a, F2; D2a, D8 (ShadeTreeAdvice pairs) | ~8 files |
| 7 | F6 | fire risk warning | F1a; D8 (flammability) | ~6 files |
| 8 | C2 | crate refactor so a monthly layer fits | C1; F5 design check confirms v0.3 | ~10 crate files |
| 8 | C3 | canopi-climate v0.3, monthly layer | C2 | 1 stage, 1 release |
| 9 | F5 | P7b dry season, growing months, water across the year | C3, F4; D3 (P7b dry-months QA), D8 (EcoCrop bands) | ~14 files |
| — | E7 | export format 5 reader | D4, E6 | ~10 files |

Loop per step: steps with more than one stream (E6, F1a, F1b, F2, F4, F5, F3) run the full loop (design check with an unanchored challenge pass, one owner batch only for a true owner question, commit 0, streams, a bug and a conformance review per stream, seam reviews, real-browser walk-through, pre-push review). One-stream steps (E2, E5a, E7, F6, ride-along reinstalls) run a lighter loop: design check with a challenge pass, build, one review, walk-through. Every filter or data field names the design decision it serves and is tested on the persona sites (decision row "Filters in Add (P5.1)"): Lyon backyard, Nairobi smallholding (two rainy seasons), Seville 2 ha, plus Riyadh (hot desert, irrigated), Oulu (boreal) and Mendoza (southern hemisphere).

#### E0 — plan adoption (done with this rewrite)
- **Goal:** later sessions plan against this order, not the draft.
- **Scope:** this concept rewritten; the canopi-data plan updated by the coordinator with the website's needs (canopi-data master, see "Website needs from canopi-data"); decision rows the coordinator records for the choices below.
- **Exit:** `okf check` 0 errors; canopi-data plan committed with the asks.

#### E1 — browser test speed and isolation (first engineering step)
- **Goal (enabling):** the browser suite stops slowing every step (owner "Test and CI time", 2026-11-12, below).
- **Scope:** one timed full run printed per file; port and storage per worker (`4420 + 2 × shard`), each shard in its own capped scope ≤ 2 GB; `consortium-p5.browser.test.mjs` split into `p5-s5b/-s5c/-s5d/-s5f` and `consortium-seams` into `seams-p2/-layout/-p5` (one file per owner still holds); a **static list of 4 shards** balanced by hand from that run; behaviour checks at one variant, layout checks keep width × theme × language; faults set before navigation by chunk role from `dist/consortium-chunks.json`; injectable timeouts through the test hook (replaces the 16 s sleep and the 15–20 s waits); a per-test timeout with a trace dump (console, network, screenshot); `@real-data` tag run in the data-update tier; a smoke tier against `dist/` with no test hook. A lint rule forbids sleeps over 1 s in specs.
- **Filed items folded in:** P5-27b fails alone; BT-7 stuck "loading" 20 s; a full run stalled after the s1 file.
- **Exit:** full suite ≤ 12 min locally on 3 shards and ≤ 15 min in CI on 4; P5-27b passes alone 10 times; a forced hang yields a trace and a named failure; the sleep rule is green. A width × theme × language coverage list is kept only if the variant cut removes a layout assertion.
- **Touches:** `scripts/browser/{serve,harness}.mjs`, `package.json`, the browser spec files, `src/islands/consortium/test-hook.ts`, `astro.config.mjs`. Concepts "Checks", "Browser harness" updated.

#### E2 — small correctness fixes (parallel with E1)
- **Goal:** wrong values and verdicts that need no refactor are caught now.
- **Scope:** (1) installer layer-band check: `manifestProblem` compares `{id, unit, scale, offset}` for the soil and regions bands; `model.js` gains their scales; `lookup.ts` reads the scale instead of `/10`. (2) Range-rule scenario tests written expectations-first, as plain website tests: Scots pine at Yakutsk; Riyadh fig, jujube, pomegranate "too hot by 2041–2070". A failing one is fixed in the website rule, never in data (canopi-data D2b only confirms the rows). (3) Suggest never picks a plant already "too dry today" without watering (gate only; scoring waits for F3).
- **Exit:** a manifest with sand stored as % is refused and today's install passes; the scenario tests pass or each miss is a recorded known limit; the persona suggestions hold no "too dry today" plant without watering.
- **Touches:** `scripts/install-climate.mjs`, `src/lib/climate/{model.js,lookup.ts}`, `src/lib/consortium/{range,suggest}.ts` (only if a test fails), tests. Concepts "climate-reader", "range rule" updated.

#### C1 — canopi-climate quality foundation and format contract
- **Goal (enabling):** the crate matches the app's Rust tooling and owns the tile-format contract as a normative document plus machine-readable vectors.
- **Scope:** `deny.toml`, an OSV advisories workflow, `renovate.json`, `.githooks` (pre-commit fmt; pre-push clippy and tests), CI timeouts and concurrency; `docs/format.md` (container, georef, grid edges, bands per layer with units and scales, encodings, lookup semantics, Köppen legend, mask bits reserved for v0.3, error kinds, compatibility rule) which stands as the crate's ADR, with a pointer concept on the website; vectors (`vectors/lookup.json` release asset; `tests/fixtures/synthetic-expected.json` checked for staleness); `decode_raster` enforces the TS reader's header rules; `Variable::index` a const match, unknown Köppen codes counted; `--sources` required; a manual release-tier job; `sample` outputs WGSRPD region codes behind an opt-in flag (additive, so a patch under Cargo's 0.x rule; unblocks canopi-data D3).
- **Release:** **v0.2.1**, same grid sha; the website reinstalls no tiles. The monthly layer keeps the name v0.3 used by the decision row "Growing months".
- **Exit:** CI runs fmt, clippy, tests, wasm smoke with the vectors through `pkg-node`, deny; OSV green; the release job ran once; vectors published.
- **Owner action:** install the Renovate GitHub app on `opencanopi/canopi-climate` (Renovate config lands either way).

#### E6 — UX step 0: island refactor (behaviour-preserving)
- **Goal (enabling):** Palette, P7a, site- and time-dependent facts and the export split each touch one place, not 6–8; Details and Suggest leave the first run.
- **Scope:** one consortium state schema (Snapshot, save, link, share, watchers); `views/kit/*` (sheet frame, flag lines, names, zone labels, icons, number formatter, `countryName`); rules out of views (`listQuery`, `suggestBlock` and pool counts, site-fit words and flags, `rangeRule` behind a core loader); `memory.ts` split, location orchestration into island state, explicit `start()`; one placement origin `{list, kind: own | guest | borrowed}`; one accessor `factAt(taxon, site, period)` returning the stored value today; one site-fit message type; one leaf `fold` for Start and Add; lazy chunks (Details idle-prefetched, `suggest()`/`alternatives()` on first press, Köppen table loaded with Details, no preloading of sheet code before the first view); small duplicates removed. One-owner fixes moved here from E4 so no two steps edit the same core files: one climate-zone list exported from core (`correction.mjs` and `climates.ts` import it; checked against the export's zone ids at install), `NEAREST_LISTS` in a leaf `nearest.ts`, the test hook out of the production graph.
- **Budget (ADR-2, written here):** per-chunk caps set where the chunks are made: first run ≤ 40 KB (from 43), sheet ≤ 8 KB, feature ≤ 12 KB, location ≤ 20 KB, MapLibre ≤ 330 KB, no total island cap; `ct:matrix` renamed `ct:first-view`; time to first view measured in `consortium-timing.mjs` (desktop and slow phone), nightly, warn above its ratchet, fail only above 1.5×.
- **Architecture (ADR-1 and ADR-6, written here):** layers L4 views → L3 island state and rules → L2 data adapter → L1 core, climate reader, location service → L0 seams; imports go down or sideways through a layer's entry; island state never imports views; `src/lib/{consortium,climate,location}` import no UI framework. At E6's exit dependency-cruiser gets a **no-cycles rule** with an allow-list naming the type-only marks component (no ratchet file).
- **Exit:** browser suite green with no spec edits beyond chunk-role names; 0 runtime cycles among state and views; first run ≤ 40 KB; slow-phone and desktop time to first view no worse; Start and Add return the same hits for a fixed folding vector list (Start finds "Weißkohl", "cœur").
- **Touches:** `src/islands/consortium/**`, `src/lib/consortium/{types,placement,placed,suggest,conflicts,state,nearest}.ts`, `src/lib/correction.mjs`, `src/data/climates.ts`, `scripts/check-built-site.mjs`, `scripts/consortium-timing.mjs`. Concepts "consortium-page", "consortium-core", "consortium-state" (new), "island-kit" (new).

#### E3 — CI, hooks and the deploy gate (beside E6; live before the F1a push)
- **Goal (enabling):** master deploys only when green; agents get a fast pre-push tier.
- **Scope:** `ci.yml` on GitHub Actions: (1) type check, unit and policy tests; (2) one `build:browser-test` kept as an artifact; (3) a matrix of the 4 static shards; (4) `npm run build`, `check-built-site`, per-chunk budgets and the tile vectors (E5a). Caches: npm, the climate archive keyed by its pinned sha256. Chrome from the runner image. Deploy gate: Workers Builds' production branch becomes `deploy`, and CI fast-forwards `deploy` to the green master commit with the workflow token (no Cloudflare token in GitHub; only Actions push `deploy`). Rollback: verify once that a Cloudflare Workers version rollback (dashboard or `wrangler rollback`) restores the static assets with the code, then a three-line runbook; no rollback workflow. Hooks: pre-commit (format and lint on staged files, the ast-grep rule), pre-push (incremental `astro check`, full unit and policy tests, dependency-cruiser); browser specs run only in CI. A path → spec map is added only if pre-push exceeds 3 min. Duplicate checks between tiers removed. ADR-3 written here.
- **Exit:** a red commit does not move `deploy`, a green one does; the rollback check is recorded; every tier prints its time (warn above its ratchet, fail only above 1.5×); the first CI run passes from a clean clone.
- **Owner action:** in the Cloudflare dashboard, set the production branch to `deploy` (and choose whether non-production branch builds stay on).

#### E4 — architecture checks (beside E6)
- **Goal (enabling):** layering, dead code, duplicates and accessibility are checked by scripts; the new tools never slow features.
- **Scope:** dependency-cruiser layer rules (the no-cycles rule joins at E6's exit); boundary tests for `src/lib/climate` and `src/lib/location` (`place-search.ts` stops importing `@preact/signals`); knip and jscpd report-only with counts that may only fall; one ast-grep rule (no `new Intl.NumberFormat` outside the formatter module; other patterns only if they come back); axe baseline on the built pages (no new violations). Each rule's OKF concept lists its enforcer (`--enforced-by`).
- **Exit:** every rule green; the new tools add ≤ 20 s to pre-push combined, measured at the exit (a tool over it moves to CI or nightly).

#### E5a — tile vectors in the website (after C1)
- **Scope:** `climate-reader.test.mjs` reads `synthetic-expected.json` (drops `synthValue`); a post-build test runs `vectors/lookup.json` against the installed tiles; `make-goldens.mjs` paths from environment variables; the installer fetches the vectors asset by pinned sha.
- **Exit:** CI runs the vectors on every push; changing one expected value fails the website test.

#### F1a — UX step: Palette, Add filters, confidence, Balance
- **Decision it changes:** what the grower looks at first, and whether the plant set works for the site before layout (decision rows "UX step direction", "UX and UI redesign delegated", "Filters in Add (P5.1)", "P5 ships without S5e").
- **First:** mock-ups of every changed screen (phone and desktop, light and dark, en and fr, the state grid) critiqued by a separate reviewer; a space budget per width; an a11y plan; bloom-month coverage measured per climate and hemisphere (canopi-data's D2a report) before the Balance design is fixed.
- **Streams:**
  1. **Palette and Structure:** two views plus sheets replace four tabs; Palette cards by role, health strip, gap list with "Find…"; Structure is the layer × stage matrix one tap away; plain words first; "cells filled" never reads as done; invasive tie-break; "Balcony or pots"; Start no longer moves on a return visit; chip names not cut at 960 px, fr "estimation" not clipped. Start and the climate questions show before the database finishes loading.
  2. **Add filters and site offers (P5.1, P5.2):** one filter rule (`listQuery`); range filter within / near the edge / all; "Fits your site"; Life cycle, Nitrogen fixer, Has edible parts; Within range and Holds up in the future climate; Native here, optional, off by default; context openings preset the filters; unknowns shown as counts; Evergreen is not a filter (shown in Details); soil "Likely … · Use it" offer; "Native here" line in Details; crop search through the D2a vernacular synonyms. **This stream builds after the D2a reinstall** (owner row "Filters in Add (P5.1)": canopi-data's release lands "before P5.1 builds"; the challenge's "build on today's export" is not taken here).
  3. **One confidence model (ADR-7, written here):** one vocabulary for edge, estimate, disputed (today's `weak` rows; the D7 marker read later), not checked, scenario spread, borrowed list; applied to marks, rows and Details.
  4. **Balance panel:** separate checks, no score, each for the site and its period: family spread; climate-margin spread; flowering calendar with gaps (months shown only when recorded in the site's hemisphere, "recorded in {region}" otherwise, never shifted; when few plants have months the check says "not enough data: n of m plants recorded" instead of drawing a calendar); mycorrhizal mix; ground covered and evergreen/deciduous mix; soil builders; water-needs mix; food across the year where ripening months are recorded. Checks waiting for data (roots, insect-habitat months, active season) show what is missing, never a pass. Each check says what to add, and "Find…" opens Add with presets.
- **Accessibility:** audited in this step (screen readers, matrix as a table, contrast in both themes, reduced motion, keyboard paths); axe at zero new violations.
- **Exit:** persona walk-throughs pass with expectations written first; slow-phone first view **≤ 6 s** (8.6 s at P5; an improving target, measured by `consortium-timing.mjs`); per-chunk caps hold; no open serious a11y finding; each filter changes a decision in at least one persona scenario or is cut; strings in all 11 locales with French warning texts in the owner's review queue (ships marked for review meanwhile).
- **Depends on:** E6; E3 and E4 live before its push; D2a for stream 2. Builds on today's export otherwise (not on D4 or D7).

#### F4 — P7a site adjustments (right after F1a, beside F2)
- **Decision it changes:** an honest verdict for a frost pocket, a hot paved yard or a watered garden (decision row "Site adjustments and dry season").
- **Scope:** winter nights −3…+3 °C, summer days −3…+3 °C, and the watering answer linked to the Water question, with two values on the same control: "in the dry season" (owner row) and "all year (irrigated)" for desert sites like Riyadh, where dryness then becomes a note; applied once in the adjusted-site function that `factAt`, the range check and the future check read (also on projected climates); saved through the state schema; carried in link v5, whose decoder still opens v4 links; named in Details and marks; plant thresholds stay uneditable. The winter-nights help names snow cover as a reason low plants survive colder nights (Oulu).
- **Exit:** each adjustment changes a verdict in a persona scenario; links round-trip; v4 links open; months (F5) will read the same adjusted site.

#### F2 — climate replacements with a crossing decade (beside F4)
- **Decision it changes:** which plant to plant next, and when, for a plant that will fall outside its range in its phase's future period (decision row "Climate replacements and timeline granularity").
- **Scope:** enabling commit: the computed site- and time-dependent rule behind `factAt`, starting with "annual vs perennial here, per period", validated on scenario and held-out sites with expectations written first; it replaces `grown_as_annual` once it agrees. Replacements: triggered by the one range rule ("outside past the margin" for the phase's period, with the scenario agreement count); candidates share jobs, layer and stages, fit the site and pass today's climate; ranked like Suggest, never automatic, honest when none exists; shown in Swap, the future panel and a mark. Crossing decade interpolated between slot centres (2005.5, 2055.5, 2085) as a range across the 4 scenarios, tied to the plant's growth timeline; no 2011–2040 slot. **Cautious switch:** "judge on the worst of the 4 scenarios", read by verdicts, the future filter and the replacement trigger through the same period path; SSP2-4.5 stays the default (decision row "v2 specification additions"); growing months stay SSP2-4.5 as stated on screen.
- **E5b-range rides along** when canopi-data D6 lands (installer copies `range_verdicts.json`; `range.ts` and its thresholds asserted against it; tie cases, every annual/perennial branch, weak rows, cool-season mapped 1:1). It is not a prerequisite.
- **Exit:** scenario and held-out results match expectations written first; no replacement fails today's climate; walk-through covers a site in each of the seven climates. Sending the new per-period annual branch to D6's file is a hand-off note to the canopi-data agent, not part of the exit.

#### F1b — Plan view, CSV, methods page, trust and feedback (after F2)
- **Scope:** minimal Plan view (counts for the room, spacing, planting order by stage, one care line per role, months where recorded, estimates marked), printable and saved as PDF with no network after load; CSV export of the palette; "Download for Canopi" stays the `.canopi` v9 file with what carries over stated; methods page in all 11 locales (how verdicts are made, scenarios, the cautious switch, estimate, sources disagree, replacements, limits including snow cover and day length north of 60°), linked from every confidence word; one curated example consortium per curated climate as a share link on the methods page, for teaching (not a benchmark, no score target), extended as borrowed lists land; correction form `/2` with `site_climate` and `placement_estimate` once canopi-data D5 lands (else `/1`); abuse protection by a Workers rate-limit binding, a honeypot field and the existing 16 KB cap; a "Was this useful? / Something wrong?" link into the correction email (a `feedback` kind, rate-capped); privacy page updated.
- **Exit:** walk-throughs pass; a `/2` report from the built site imports in canopi-data's fixture test (when D5 has landed); the Plan view prints offline; a11y audit clean.

#### F3 — Suggestion v2 (when its data lands)
- **Decision it changes:** what the starting palette contains (decision rows "Add to a filled cell; suggestion v2 planned", "Feature pipeline").
- **Scope:** jobs counted per stage; roles balanced per stage; positive pairings; future fit by phase through F2's rule (and the cautious switch); a "Picked to…" reason; Balance gaps filled; risk spread (genus, shared diseases, share at risk by 2050); negative interactions (allelopathy, alternate hosts); growing-month notes only; native never a score term; measured on fixed scenario sites.
- **Depends on:** F1a, F2; D2a (nitrogen table), D8 (ShadeTreeAdvice pairs). Starts when they land; nothing else waits for it.

#### F6 — fire risk (lighter loop)
- **Decision it changes:** what a grower in a fire-prone climate places near buildings. Warn, never remove.
- **Scope:** plant flammability is a core fact from canopi-data D8 (licence settled; coverage checked there); a site is fire-prone from its Köppen class and the **annual dry months already in the v0.2 tiles** (no monthly layer); a warning mark and a Balance check; refined with monthly data after F5 if useful.
- **Depends on:** F1a; D8 flammability. **Exit:** fire-prone scenario sites warn on the expected plants; no plant hidden.

#### C2 — crate refactor so v0.3 fits (after F5's design check confirms v0.3)
- **Scope:** one `Raster { grid: GridSpec, bands, data }` with thin `Tile`/`LayerTile` wrappers; one generic `nearest`; one `write_raster_checked`; a per-layer schema (`bands`, `slots`) in code and manifest; `layers[].version` and an optional Köppen `legend`; the f32 margin computed in f64; pipeline tests on a cropped grid. The wasm lookup surface is unchanged (no cross-tile export until the app's team asks).
- **Exit:** vectors unchanged byte for byte or each change explained; manifest compatibility test covers the website reader's needs.

#### C3 — canopi-climate v0.3, the monthly layer
- **Scope:** a `monthly` stage re-reads the pinned Beck monthly NetCDFs: monthly mean temperature at 0.5 °C plus the Gaussen dry-month mask (bits 0–11, 12–14 reserved, never bit 15); `popcount(mask) == dry_months` on every land cell for the 3 slots; water across the year limited to what F5's design check decides; measured sizes (estimate ≈ 17 MB total) against Cloudflare's per-file, file-count and per-deploy limits; vectors extended. Validation cities include a bimodal-rain site (Nairobi) and a hot desert (Riyadh).
- **Exit:** release published; vectors regenerated; validation cities within stated tolerances or each miss explained.

#### F5 — P7b dry season, growing months, water across the year (+ C3)
- **Decision it changes:** when an annual crop grows at this site, today and later; whether a long dry season is checked like winter cold (decision rows "Growing months", "Site adjustments and dry season", "Rainfall and dry months stay in the export").
- **First (design check):** canopi-data's P7b dry-months QA (D3) is read; "water across the year" is decided there with that evidence (dry-month mask only unless the QA shows it fails); then C2 and C3 start.
- **Scope:** website reader for the monthly layer (fetched after the first view; location chunk ≤ 20 KB); growing months for the ~106 annual and grown-as-annual crops from D8's EcoCrop bands, shown as estimates, never filtering; **several growing windows** where the climate has them ("about Mar–Jun and Oct–Jan" at Nairobi); where all 12 months are dry, months are worded relative ("driest Jun–Sep") and the "all year (irrigated)" answer from F4 applies; dry-season row in the one range rule, first as a mark, a filter only after the QA passes; salinity: a Balance or warn line from D8's `salt_tolerance` where sourced, never a filter; on-screen note that months use SSP2-4.5 only; the Balance active-season part enabled.
- **Exit:** dry months separate Mediterranean from monsoon sites at equal aridity; persona scenarios pass (Nairobi two windows, Riyadh relative months); vectors cover the monthly layer; months read P7a's adjusted site.

#### E7 — export format 5 reader (ride-along when canopi-data D4 lands)
- **Scope:** `PlantSource` as a facade over several databases; `load.ts` takes a list of files; preload, page data, restore and pool read per part; the installer accepts format 5 and checks Cloudflare's 25 MiB per file and the file count; the timing script measures the second fetch after the location; `factAt` reads scoped stored facts (most specific wins).
- **Exit:** a real format-5 install verifies and builds; slow-phone first view no worse than format 4 on the same release (and back under the ≤ 6 s target if the Arid and Boreal lists pushed it over).

#### Borrowed-climate lists (ride-alongs)
- **D9a Arid, then D9b Boreal, before the export split** (decision row "Plan review answers" 2: "whatever the cost"). Each is a reinstall with scenario coverage checks and the borrowed labels moved to "curated" for that climate. The slow-phone first-visit cost is measured on each reinstall and reported to the owner; it does not block the reinstall.
- **Continental and Subtropical** after E7.

### Website needs from canopi-data (mirrored in canopi-data's "Website needs, by when")

| Website step | Needs | canopi-data step |
|---|---|---|
| F1a stream 2 (before it builds) | data-only release: reviewed safety corrections, nitrogen-fixer genus table with the trait and "Feeds the soil" in agreement, die-back herbaceous perennials counted deciduous, vernacular crop synonyms (also languages outside the 11 locales, from a sourced table, searchable only), WCVP distribution refill | D2a |
| F1a design check | bloom-month coverage report per climate and hemisphere, tropics apart | D2a (report) |
| E2 | Yakutsk and Riyadh plant rows confirmed (not "fixed" in data) | D2b |
| F1a (optional), Details | placement-audit flag in the export | D2b |
| F1b | correction report `/2` | D5 |
| F2 (ride-along) | shared range-verdict vectors | D6, right after D1 |
| credits | GBIF `datasetKey` list for the derived-dataset DOI | D3 |
| F5 design check | P7b dry-months QA against EcoCrop, Niinemets & Valladares, EIVE and the validation cities | D3 (report) |
| Balance flowering check | flowering coverage extended (PhenoVision beyond the pilot, southern hemisphere and tropics) | D8a, ahead of D7 |
| borrowed lists | Arid, then Boreal, before the split | D9a, D9b |
| E7 | format 5 split and scoped facts | D4 |
| F3 | ShadeTreeAdvice pairs | D8 |
| F5 | EcoCrop growing bands; `salt_tolerance` where sourced | D8 |
| F6 | flammability per plant | D8 |
| Balance roots, insect months | root depth and form; insect-habitat months if sourced | D8 |

Not waited on: D7's disputes marker (F1a uses today's `weak` rows), D4 for F1a and F2. From canopi-climate to canopi-data: `sample` region codes in C1 (v0.2.1) unblock D3's removal of the Python regions reader.

### Placement rules (pending from the canopi-data agent)

The owner approves or edits a concrete table drafted by the canopi-data agent from the curated books (decision row "Plan review answers"; open question "Placement rules"). Until then each climate keeps its own placement. Table to come, with this shape:

| Rule | Proposed value | Source | Placement differences it settles |
|---|---|---|---|
| life span → phase | (from canopi-data) | | |
| annual end phase | (from canopi-data) | | |
| light thresholds between strata | (from canopi-data) | | |

### Coordinator choices (revertible; rows for the decision log)

Within the owner's rows; each with its reason. The challenge's former owner questions are here per the decision row "Plan review answers".

1. **JavaScript budget (W1):** per-chunk caps and first run ≤ 40 KB, set in E6, no total island cap. A total cap cannot fall with lazy loading; the owner named time to the first view as the deciding check (row "Island JavaScript budget for P5").
2. **Deploy gate (W2):** a `deploy` branch fast-forwarded by CI. No Cloudflare secret in GitHub; Workers Builds unchanged.
3. **Links (W3):** link v5 decoder still opens v4. Most cautious choice: links public since P2 keep working.
4. **Water across the year (W4):** decided in F5's design check with the P7b QA evidence; mask bits 12–14 reserved now. The answer depends on QA results that do not exist yet.
5. **Correction abuse (W8):** Workers rate-limit binding, honeypot, 16 KB cap. No third-party script, nothing stored.
6. **Usefulness signal (W9):** a link into the correction email, rate-capped. The only option that stores nothing ("No database, Worker or backend" row) and still gives a signal.
7. **Hemisphere of months (W10):** shown only when recorded in the site's hemisphere, never shifted. canopi-data never flips months; a shift is wrong in the tropics.
8. **Methods page languages (W11):** all 11. It explains the tool's own words, and `/privacy` and `/data-sources/` set the precedent.
9. **Open in Canopi (W12):** the `.canopi` v9 download, carry-over stated. Settled by the 2026-10-28 row; the app is read-only.
10. **Refresh cadence (W13):** on events (canopi-data release, canopi-climate minor, GBIF yearly, CMIP7 when Beck or CHELSA publish). No rebuild without a source change.
11. **Time checks warn, not fail:** every tier prints its time; above its ratchet it warns; it fails only above 1.5×; time to first view runs nightly in `consortium-timing.mjs`. Wall times on shared runners vary beyond 10 %; a failing time ratchet is a flaky test.
12. **No rollback workflow:** verify Cloudflare's version rollback restores assets, then a short runbook. Workers keeps versions; tiles are pinned by sha.
13. **Static 4-shard list:** no shard assigner reading `timings.json`. About 12 files; balanced by hand from one run.
14. **Pre-push without a path → spec map:** browser specs only in CI. A map drifts silently; added only if pre-push passes 3 min.
15. **No temporary cycle ratchet:** dependency-cruiser no-cycles rule at E6's exit with the type-only allow-list; one ast-grep rule. E6 removes the cycles a step later.
16. **No dummy-field test; sleep lint rule instead of a sleep ratchet file.** Review of the schema module proves the same.
17. **No cross-tile wasm export (X3 dropped):** the website keeps its TS reader and the app is read-only. C2 runs only once F5's design check confirms v0.3.
18. **Lighter loop for one-stream steps.** The full loop stays for multi-stream steps (owner asked it for P7).
19. **C1 release v0.2.1:** `sample` region codes behind an opt-in flag (additive, a patch under Cargo's 0.x rule); the monthly layer keeps the v0.3 name the owner row uses.
20. **One-owner fixes in E6, not E4:** the zone list, `nearest.ts` and the test-hook move edit core files E6 refactors; one step avoids two agents on the same files.
21. **ADRs in the step that decides them:** ADR-1, ADR-2, ADR-6 in E6; ADR-3 in E3; ADR-7 in F1a; the vectors table folded into a vectors concept; `docs/format.md` stands as the tile ADR with a pointer concept.
22. **New-tool ceiling:** ≤ 20 s added to pre-push, measured at E4's exit. Owner: test time must not slow features.
23. **Persona set extended:** Riyadh, Oulu, Mendoza beside Lyon, Nairobi, Seville. Four of seven climates had no persona; the owner row names a minimum, not a limit.
24. **Slow-phone target ≤ 6 s by F1a's exit:** an improving target where earlier gates said only "no worse"; levers that move megabytes (Start before the database, Köppen table lazy, no sheet preload).
25. **Cautious-scenario switch in F2.** Someone planting a climax tree may want the worst case; the default stays SSP2-4.5.
26. **"All year (irrigated)" as a value of the one watering control;** relative dry-month wording where all months are dry. Keeps the owner's single control while serving desert sites.
27. **Example consortium per curated climate on the methods page.** For teachers; not the dropped benchmark (no score target).
28. **Flowering check honest state:** "not enough data: n of m" when coverage is low; coverage measured before F1a's design. A sparse calendar would look authoritative.
29. **Owner queues have a default:** unreviewed safety candidates ship as "Sources disagree" with the more cautious value beside; French texts ship marked for review (owner answer 4: queues never block).
30. **Yakutsk and Riyadh as website scenario tests in E2;** F2 exits on its own tests, the per-period branch goes to D6 as a follow-up note. A website step never waits for another agent's ship.
31. **E5b split:** range vectors ride with F2 when D6 lands; correction `/2` lives in F1b. Unrelated canopi-data steps no longer hold replacements.
32. **F1 split into F1a and F1b; methods page after F2** so it describes replacements once. The Balance panel no longer waits for Plan view, CSV and feedback.
33. **F4 right after F1a, beside F2; F6 off the monthly layer.** Their real dependencies are E6 and data, not F3 or F5.
34. **Salinity:** a data ask; information and a warn line, never a filter until sourced. Salt tolerance decides many arid sites; no source is chosen yet.
35. **Snow cover and day length:** named limits on the methods page and in F4's help; no new data now.
36. **Offline:** the Plan view prints and saves as PDF with no network after load.
37. **Per-language export part raised with D4:** measure the share of names and reason texts in the export; a per-language part may be a cheaper split than per climate.
38. **Earlier engineering rows kept:** X1 range vectors cover ties, every annual/perennial branch, weak rows, cool-season; X2 crossing decade computed in website core; X4 Köppen margin in f64; X5 an optional `check-2011-2040` crate stage as a check only; X6 the view (Palette or Structure) stays in the share link; X8 growing-months UI ships in F5, F1a keeps space for it. X7 restated: F1a and F2 wait for neither D4 nor D7.

### Owner actions (not decisions)
- **Cloudflare:** set the Workers Builds production branch to `deploy` (E3); choose whether non-production builds stay on.
- **Renovate:** install the Renovate GitHub app on `opencanopi/canopi-climate` (C1).
- **GBIF:** a GBIF.org account to register the derived dataset once canopi-data D3 writes the `datasetKey` list; the credit then gains its DOI (row "GBIF credit for the observed ranges").
- **Review queues (never blocking):** one queue file per release, by severity, about 25 rows per sitting (owner answer 4): safety candidates, French warning texts, disputed rows; and the placement-rules table when it arrives.

### Owner rulings this order applies
- Recorded rows (link, not copied): "Plan review answers", "Feature pipeline", "Growing months (seasons review)", "Site- and time-dependent plant facts", "LLM data improvement authorised", "Climate replacements and timeline granularity", "Range rule refinements after the rebuild", "Rainfall and dry months stay in the export; slow-phone first visit", "Room size guides the suggestion, not the matrix", "First-run budget at the P5 push" in [user decisions](/decisions/consortium-user-decisions.md).
- **Kept against the challenge:** F1a's Add-filters stream waits for D2a (row "Filters in Add (P5.1)", "before P5.1 builds"). The earlier coordinator text "Curated lists for the borrowed climates" (2026-11-12) ("split the export before adding plants") is replaced by owner answer 2 (Arid then Boreal before the split).

### Agreements recorded only in this plan (2026-11-12)
These owner agreements have no row of their own in the decision log; they stay here until the coordinator records them.
- **Quality foundation (owner):** improve canopi-data, the website's consortium tool and canopi-climate; never touch the Canopi app. Website: dependency-cruiser layers and cycles, knip, jscpd, ast-grep, axe, counts that only fall, pre-commit and pre-push hooks, a CI gate so master deploys only when green. canopi-data: real ruff rules, a type checker, import-linter, dead-code and duplicate checks, hooks, CI. canopi-climate: cargo-deny, osv-scanner, Renovate, hooks, clippy aligned with the app's. Shared test vectors run in each CI. Each rule lists what enforces it; the owner decides rule changes; no rule is switched off without a dated decision.
- **Test and CI time (owner: CI and tests slowed feature work in the Canopi app):** a time budget per tier, measured and printed; pre-commit seconds; pre-push affected checks; CI sharded in parallel over isolated ports and storage with one shared build and caches; nightly for every width × locale, mutation, link and slow data checks; duplicate checks removed; flaky tests fixed at the cause or owned with an expiry, never retried silently.
- **Pipeline boundary (owner agreed):** canopi-data merges all sources into one shared core; one pipeline per product reads the release. Plant facts (root depth and form, flowering months, life cycle, cold/heat/chill limits, propagation, enrichment and the conflict rule) live in the core; the consortium pipeline is free in what it computes and ships (placements, jobs, balance checks, site- and time-dependent rules, verdicts, Suggest data, the export split and format).
- **Who does what (owner):** canopi-data's part is planned in canopi-data (`docs/consortium-data-plan.md` and its session prompt) and done by its own agent; this effort covers canopi-climate and the website.
- **Conflict rule (owner agreed):** one base source per value, never averaged; a second source corrects within a normal spread measured per field; beyond it the value ships with "Sources disagree" and enters a review queue; a third independent source settles it (2 of 3, a cited, revertible correction), else the owner; a dispute never improves a verdict; safety fields (toxicity, invasiveness, hardiness of long-lived plants) show the more cautious value beside the other (hardiness without owner review, owner answer 3); owner corrections win; LLM values fill only empty values; every conflict stays in the data.
- **Source order (coordinator):** sources already read, more fully; then datasets that pass a licence and coverage check; LLM extraction from published pages last; each calibrated on known values before it fills.
- **Balance checks (owner agreed):** separate checks, no single score, each generic and site- and time-dependent (list in F1a). Grower feedback is never a blocker; grower checks are published-source scenarios written before each run.
- **Also agreed for the plan review (owner):** methods page, usefulness signal, data freshness, Cloudflare limits in the split design, native-speaker checks of warning texts (French by the owner), a full a11y audit, correction-form abuse protection, an "open in Canopi" path, sized owner queues. Each is placed in a step above.
- **Filed at the P5 push** (owner bar: only data loss, wrong verdicts, privacy/security/licence, crashes or blank screens block a push): each item is placed above (E1, E2, E6, F1a, F1b, D2b, D5).

### Later (each with its slot)
- Goals and a harvest calendar: after F5.
- How to start each plant (seed, cutting, grafted; ease only where a source states it): a Details line once D8 exports propagation.
- Crop-pollination overlap check: after D8.
- Growers' reports feeding canopi-data: needs a collection path the static site lacks.
- One writer for the `canopi-climate` localStorage key.
- Upstream whitebox fixes; an extreme-minimum model (site USDA zone).

### P6 — close
- Usefulness pass, receipts, retrospective; measurements note for the app's ADR 0006; follow-ups filed with slots.

## Order (history)
P1 and P3 started in parallel; P2 after P1; P4 after P3; P5 after P2, P3 and P4. The remaining order is "Order at a glance" above.

## Risks to watch
- Arid and Boreal before the split raise the slow-phone first visit; measured on each reinstall, reported, recovered in E7.
- Bloom-month coverage may stay thin outside Europe; the Balance check says so rather than drawing a sparse calendar.
- Precipitation disagrees between products by up to 36 % at a point: aridity and dry months shown with their uncertainty.
- GBIF credit without a DOI until the owner registers the derived dataset.
