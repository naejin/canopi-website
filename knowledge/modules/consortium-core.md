---
type: Module
title: Consortium core
description: Consortium v2 core seams (types, PlantSource, load failures, the P5 range, placement, future, native, soil and lazy marks stubs), the rules S1 ported, and the format 4 schema 2 installer that writes the gzipped SQLite export, its photos and src/data/consortium-index.json.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T20:07:20Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T19:35:12Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:5b0f392e92616ed2
    last_modified: 2026-11-11T16:35:59Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:4c334581305a7864
    last_modified: 2026-11-11T17:14:18Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:5aeff5ec4837ea50
    last_modified: 2026-11-11T19:27:15Z
  - id: matrix-ts
    resource: ../../src/lib/consortium/matrix.ts
    title: src/lib/consortium/matrix.ts
    digest: sha256:67cb9e9025205550
    last_modified: 2026-11-11T04:40:22Z
  - id: canopi-file-ts
    resource: ../../src/lib/consortium/canopi-file.ts
    title: src/lib/consortium/canopi-file.ts
    digest: sha256:a162262df831f7bf
    last_modified: 2026-11-11T05:47:54Z
  - id: consortium-canopi-file-test-mjs
    resource: ../../scripts/consortium-canopi-file.test.mjs
    title: scripts/consortium-canopi-file.test.mjs
    digest: sha256:213bc47007f2b373
    last_modified: 2026-11-11T04:54:12Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:78d0869e4c85b9ae
    last_modified: 2026-11-11T14:39:43Z
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:526af982cb7e40af
    last_modified: 2026-11-11T14:39:43Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:fa3a04d440663ab4
    last_modified: 2026-11-11T14:39:43Z
  - id: readme-md
    resource: ../../scripts/fixtures/consortium-v2/README.md
    title: scripts/fixtures/consortium-v2/README.md
    digest: sha256:12007f0893a7c37e
    last_modified: 2026-11-11T15:36:29Z
  - id: consortium-index-json
    resource: ../../src/data/consortium-index.json
    title: src/data/consortium-index.json
    digest: sha256:b1ea457758728418
    last_modified: 2026-11-11T14:39:43Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:f24a66c298317529
    last_modified: 2026-11-11T04:40:22Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:d8041b22b383ffdb
    last_modified: 2026-11-11T04:40:22Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:ea2a468fa5385fb2
    last_modified: 2026-11-11T04:31:48Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:745d1c577b03ce74
    last_modified: 2026-11-11T04:40:22Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:872f411989736b65
    last_modified: 2026-11-11T19:27:15Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:2204b1125f7911bc
    last_modified: 2026-11-11T03:07:08Z
  - id: range-ts
    resource: ../../src/lib/consortium/range.ts
    title: src/lib/consortium/range.ts
    digest: sha256:b8a5487a2a999d4c
    last_modified: 2026-11-11T16:35:59Z
  - id: placement-ts
    resource: ../../src/lib/consortium/placement.ts
    title: src/lib/consortium/placement.ts
    digest: sha256:bd70a2a8fe488a47
    last_modified: 2026-11-11T14:39:43Z
  - id: future-ts
    resource: ../../src/lib/consortium/future.ts
    title: src/lib/consortium/future.ts
    digest: sha256:3d97f0a6805f884b
    last_modified: 2026-11-11T20:07:03Z
  - id: native-ts
    resource: ../../src/lib/consortium/native.ts
    title: src/lib/consortium/native.ts
    digest: sha256:9c794d4ea11cbefa
    last_modified: 2026-11-11T16:35:59Z
  - id: soil-likely-ts
    resource: ../../src/lib/consortium/soil-likely.ts
    title: src/lib/consortium/soil-likely.ts
    digest: sha256:6db10dbc48f6bf4c
    last_modified: 2026-11-11T14:39:43Z
  - id: marks-ts
    resource: ../../src/lib/consortium/marks.ts
    title: src/lib/consortium/marks.ts
    digest: sha256:b5c08513e69618e4
    last_modified: 2026-11-11T16:35:59Z
  - id: consortium-p5-seams-test-mjs
    resource: ../../scripts/consortium-p5-seams.test.mjs
    title: scripts/consortium-p5-seams.test.mjs
    digest: sha256:cbc00340d84765b4
    last_modified: 2026-11-11T19:27:15Z
  - id: mark-providers-ts
    resource: ../../src/lib/consortium/mark-providers.ts
    title: src/lib/consortium/mark-providers.ts
    digest: sha256:0bd0dee08cfeb4b5
    last_modified: 2026-11-11T16:35:59Z
  - id: range-marks-ts
    resource: ../../src/lib/consortium/range-marks.ts
    title: src/lib/consortium/range-marks.ts
    digest: sha256:33cb477e7920d8fc
    last_modified: 2026-11-11T16:35:59Z
  - id: future-marks-ts
    resource: ../../src/lib/consortium/future-marks.ts
    title: src/lib/consortium/future-marks.ts
    digest: sha256:3415dfcfa8a629ee
    last_modified: 2026-11-11T20:07:03Z
  - id: native-marks-ts
    resource: ../../src/lib/consortium/native-marks.ts
    title: src/lib/consortium/native-marks.ts
    digest: sha256:6ac36826c6aa5c64
    last_modified: 2026-11-11T16:35:59Z
  - id: consortium-p5-seams-s5b-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5b.test.mjs
    title: scripts/consortium-p5-seams-s5b.test.mjs
    digest: sha256:44762c50d5f04d1b
    last_modified: 2026-11-11T20:03:06Z
  - id: consortium-p5-seams-s5c-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5c.test.mjs
    title: scripts/consortium-p5-seams-s5c.test.mjs
    digest: sha256:de42892a04a78103
    last_modified: 2026-11-11T17:14:18Z
  - id: consortium-p5-seams-s5d-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5d.test.mjs
    title: scripts/consortium-p5-seams-s5d.test.mjs
    digest: sha256:109516b6d34ecb0c
    last_modified: 2026-11-11T20:07:03Z
  - id: consortium-p5-seams-s5e-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5e.test.mjs
    title: scripts/consortium-p5-seams-s5e.test.mjs
    digest: sha256:9324086854376997
    last_modified: 2026-11-11T16:35:59Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:d00a6bc0eac9d46b
    last_modified: 2026-11-11T15:36:29Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:79e78a387e75a014
    last_modified: 2026-11-11T19:25:16Z
  - id: readme-md-2
    resource: ../../scripts/fixtures/consortium-future/README.md
    title: scripts/fixtures/consortium-future/README.md
    digest: sha256:16982db16208c8af
    last_modified: 2026-11-11T20:07:03Z
enforced_by:
  - scripts/consortium-boundary.test.mjs
  - scripts/install-consortium.test.mjs
  - scripts/consortium-p5-seams.test.mjs
  - scripts/consortium-p5-seams-s5b.test.mjs
  - scripts/consortium-p5-seams-s5c.test.mjs
  - scripts/consortium-p5-seams-s5d.test.mjs
  - scripts/consortium-p5-seams-s5e.test.mjs
---

# Responsibility

The data side of consortium v2 ([architecture](/decisions/consortium-v2-architecture.md), [plan](/project/consortium-v2-plan.md), [owner decisions](/decisions/consortium-user-decisions.md)). Since P2 commit 0 (branch `consortium/integration`) it holds:
- the frozen seams: `types.ts`, `source.ts` and `index.ts`;
- the installer for canopi-data's format 4 export: one gzipped SQLite database, contract `canopi-data consortium-v2-export:docs/consortium-export-v2.md`.

The core has no DOM, no Astro and no package imports, so `node --test` runs it and it can become a package. `scripts/consortium-boundary.test.mjs` enforces this:
- every import is `./x.ts` inside `src/lib/consortium/`;
- no browser global is used;
- the island imports only `index.ts`, `types.ts` or `source.ts`.

# Key files

| File | Holds |
|---|---|
| [types.ts](../../src/lib/consortium/types.ts) | `SCHEMA_VERSION` 2, `APPLICATION_ID` 0x43434F4E. Value lists: `climateZones` (capitalised as exported), `regions`, `locales`, `phases`, `strata`, `roles`, `functionIds`, `interactionTypes`, `severities`, `toxicityLevels`, `layerFields`, `layerKinds`, `months`. Site answers `lights`/`soils`/`waters`/`rooms`, each with `unsure` (A7). Records: `PlantId` (the plants.id UUID, never the integer `plant`), `Placement`, `Taxon` (one plant in one climate; `from?` marks a guest, A9), `Traits`, `Warnings`, `Interaction`, `Reason`, `LayerValue`, `Details`, `Labels`, `SourceInfo`, `Matrix`/`MatrixCell` (empty: `gap` or `misfit`), `Flag`. View shapes for S2–S4 (review C5): `Verdict`, `FitReason` (wild height "can grow over N m", "height not recorded"), `Fit`, `JobId`/`jobIds`, `CellRef`, `Alternative` (`alsoFills`, `leavesEmpty`), `JobGap` (missing phases), `ShareState`, `LinkNotice` (`unknownCount`, `cut`, `long`), `DecodedLink`; `Matrix.unplaced` ("No layer yet"). Schema 2 (P5 commit 0): `Taxon.climate: TaxonClimate | null` (`tminCold`, `tmaxWarm`, `aridity` as `ClimateRange {low, median, high, count, basis}`, `cells`, `nativeShare`; null = "range not recorded"), `Taxon.areasKnown` (WCVP matched; false = native "unknown"), `Taxon.placedFrom?`/`estimate?` (S5c), `Details.koppen: KoppenShare[]` (largest first), `SourceInfo.schemaVersion` 2 with `climateGrid` and `rangesReview`. P5 seams: `SiteLookup`/`SitePeriod` (a structural mirror of the climate reader's lookup; store.ts checks the reader's type stays assignable, since the core may not import `src/lib/climate`), `SiteLocation {lat, lon, source: 'geo'|'search'|'map'|'link', label?, lookup}`, `scenarios`/`Scenario`/`DEFAULT_SCENARIO` ('ssp245'), `markKinds`/`Mark {kind, key, vars?, severity: 'note'|'warning'}` |
| [source.ts](../../src/lib/consortium/source.ts) | `PlantSource`, as in design check §4: `info`, `countries`, `pool`, `interactions`, `placements`, `names`, `details`, `labels`, `cellCounts` (a test oracle), and (schema 2) `nativeIn(l3): ReadonlySet<PlantId>`, synchronous and cached per area (plant_areas, introduced = 0). `loadFailures`: `too-old`, `wasm-blocked`, `wasm-fetch` (sqlite3.wasm did not arrive; review L1), `fetch`, `stale`, `damaged`, `schema`, one per §5 screen |
| [index.ts](../../src/lib/consortium/index.ts) | Re-exports types, source and canopi-file (S4's, exported now so S4 never edits index.ts). Stream S1 adds the rule exports here. |
| [canopi-file.ts](../../src/lib/consortium/canopi-file.ts) | S4's `.canopi` writer for the app (format v9, canopi `0c425fb07`): `canopiFile(members, { name, description, at })` returns the JSON text of an empty design whose `consortiums` hold one entry per member (`target {kind: 'species', canonical_name}`, its `stratum` or `unassigned`, `start_phase`/`end_phase` 0–6; app default `unassigned` 0–2), deduplicated by canonical name, with `plants: []` (checked at P2 hand-offs: `PlacedPlant` requires a map `position` the tool does not have, and the app's consortium sync (`app/consortium/workflow.ts` at `0c425fb07`) only adds entries for placed plants and never removes these, so the entries survive until the reader places the plants); `canopiFileName(name)` makes a safe `<name>.canopi`. Pure. Checked in `scripts/consortium-canopi-file.test.mjs` and BT-9 against the app's vendored format, [scripts/vendor/canopi-design-format/](../../scripts/vendor/canopi-design-format) (canopi `0c425fb07`, AGPL header, test-only), with its `validate.mjs` |
| [site-climate.ts](../../src/lib/consortium/site-climate.ts) (P5 S5b) | `siteClimate(lookup)` → `{state: sea \| polar \| borderline \| coast \| ready, today, zone, near, suggested}`, `koppenZone`, `BORDERLINE_C` 0.5; exported through index.ts. state.ts holds the link's `o=` (`encodeLink(…, { origin })`, `linkOrigin`, `cellCentre`); see [Consortium location step](/modules/consortium-location.md) |
| [site.ts](../../src/lib/consortium/site.ts), [conflicts.ts](../../src/lib/consortium/conflicts.ts), [jobs.ts](../../src/lib/consortium/jobs.ts), [matrix.ts](../../src/lib/consortium/matrix.ts), [suggest.ts](../../src/lib/consortium/suggest.ts), [state.ts](../../src/lib/consortium/state.ts) | Stream S1's rules, exported from `index.ts`: three-valued site fit; conflicts and invasive records; the six jobs and their gaps per phase; `buildMatrix` (4 strata × 7 phases); the greedy suggestion and Swap list; the `#v=4` share link (`encodeLink`, `decodeLink`, `isLongLink` over 2,000 characters, `readPreset` for guide links); `zoneOf(code)` in `state.ts` is the one climate-code lookup (the island's memory.ts and main.ts import it) |
| [range.ts](../../src/lib/consortium/range.ts), [placement.ts](../../src/lib/consortium/placement.ts), [future.ts](../../src/lib/consortium/future.ts), [native.ts](../../src/lib/consortium/native.ts), [soil-likely.ts](../../src/lib/consortium/soil-likely.ts), [marks.ts](../../src/lib/consortium/marks.ts), [mark-providers.ts](../../src/lib/consortium/mark-providers.ts) | P5 commit 0 seams, each a stub keeping today's behaviour and filled by one stream (`.local/consortium/v2/p5-owners.md`): `rangeFit(taxon, site)` → 'unknown' (S5c); `placeFor(placements, zone, nearestOrder)` → own placement or null, with `NEAREST_LISTS` (Subtropical/Arid → Mediterranean, Tropical, Temperate; Continental/Boreal → Temperate, Mediterranean) (S5c); `futureCheck(taxon, site, scenario)` (S5d, filled: see [future.ts](../../src/lib/consortium/future.ts) below); `nativeHere(taxon, l3, natives)` → null and `likelyFor(question, lookup)` → null (S5e). Marks: `Mark {kind, key, vars, severity, state?}` (`state` is rendered as `data-mark-state`), `markSurfaces` 'chip' \| 'row' \| 'add' \| 'details', `MarkProvider = (taxon, ctx, surface) => Mark[]`, `plantMarks(taxon, ctx, surface, providers = [])` concatenates the loaded providers. The providers live in their own files, [range-marks.ts](../../src/lib/consortium/range-marks.ts) (S5c), [future-marks.ts](../../src/lib/consortium/future-marks.ts) (S5d) and [native-marks.ts](../../src/lib/consortium/native-marks.ts) (S5e), imported only by `mark-providers.ts`, the lazy chunk `loadMarkProviders()` imports (once); none is exported from `index.ts`, so the first run never holds them (Rollup puts a module in the main chunk if the main entry reaches it statically, even unused). `needsMarkProviders(ctx, curated)`: true with a site location or a climate the export does not curate. `PlantSource.borrowed(zone, order)` ([source.ts](../../src/lib/consortium/source.ts)): an uncurated climate's plants from its nearest lists, marked estimate; `pool(c)` of a climate not in `info().climates` returns `borrowed(c, NEAREST_LISTS[c])`. S5c owns placement.ts and the body of `borrowed` in `sqlite-source.ts` (stub: `[]`, today's "Not covered yet"), so `store.loadPool` is unchanged. Each stream's seam tests are its own file, `scripts/consortium-p5-seams-s5b/c/d/e.test.mjs` (shared inputs in `consortium-p5-fixtures.mjs`); `consortium-p5-seams.test.mjs` pins the shared marks pipeline and where the host views mount each slot |
| [future.ts](../../src/lib/consortium/future.ts), [future-marks.ts](../../src/lib/consortium/future-marks.ts) | S5d, the future climate check (decision row "P5 engineering choices"; projections: constrained CMIP6 ensemble changes, Beck et al. 2023, on the CHELSA v2.1 1981–2010 climate): `futurePeriod(taxon)` is the latest period the phases reach (phase_end ≥ 3 → '2041-2070', climax → '2071-2099', earlier or unplaced → null, "today's climate only"); `futureCheck(taxon, site, scenario)` → `{period, verdict 'inside'\|'edge'\|'outside'\|'already', why, already, agree, of}` or null (no lookup, no slot for the chosen scenario, no range, or nothing to compare: "not checked"). Reasons: too hot = slot warmest-month maximum > `tmaxWarm.high` + `FUTURE_HEAT_MARGIN_C` (2 °C); too dry = aridity index < `aridity.low` (no edge band); edge = above Q95 within the margin; warm winters never checked. A reason counts only as a change from today (the 'historical' slot): `already` lists the bounds already crossed today, `why` only new ones; no new reason and no new heat edge but some already → verdict 'already' (a plant already too dry today that is near the heat edge by the period stays 'edge', and the panel adds the "already" suffix to edge and outside lines). Agreement: for outside, scenarios outside for at least one of `why`; otherwise scenarios not outside. `futureSummary(taxa, site, scenario)` puts each member in one place: `periods[{period, checked, outside, heat, arid}]` (n of m), `already{heat, arid}` (verdict 'already'), `todayOnly`, `notChecked`, plus `checks` (each checked plant's FutureCheck, which the panel lines read); `available` false when the site has no future slot. `futureMarks` (lazy provider): with a location and verdict outside a note (ink) `future.mark.{heat,arid,both}` on chip/row, `future.long.*` with scenario and agreement on add/details; edge only on add/details; 'already' gets no future mark (today's range mark covers it). Real-export counts, whole lists of 200, SSP2-4.5 ([consortium-p5-seams-s5d.test.mjs](../../scripts/consortium-p5-seams-s5d.test.mjs), sites from `canopi-climate lookup` in `scripts/fixtures/consortium-future/sites.json`): Lyon (Temperate) 23/93 by 2041–2070 and 17/33 by 2071–2099, already 5 hot and 4 dry, 65 short-lived; Manaus (Tropical) 2/110 and 1/31; Seville (Mediterranean) 49/64 and 14/14, already 51 hot and 49 dry; Oslo 0/102 and 0/33. No range pre-filter yet: once S5c's range.ts lands the members come from the filtered pool (merge follow-up). |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | The installer, described below |
| [consortium-schema.mjs](../../scripts/consortium-schema.mjs) | `DDL`: schema 2, the export's 37 statements as stored in export `r-e0b162087a79eecf` (schema 1's from canopi-data `ab6bfad`, plus `plant_climate_status`, `plant_climate`, `plant_koppen`). `DATA_TABLES`: the 28 counted tables |
| [make-fixture.mjs](../../scripts/fixtures/consortium-v2/make-fixture.mjs) | The invented fixture, 38 plants, built with `node:sqlite`; schema 2 ranges by rule from each plant's first placement (`FIXTURE_GRID_SHA256` is the real v0.2.0 grid digest), Phacelia without a range. `buildFixtureDb` and `writeFixtureExport(dir, { edit, userVersion, applicationId, manifest, after })` build the broken variants for tests. The committed `export/` passes canopi-data's `check_export`; coverage is in its README |

The v1 rules were ported in place by S1 (design check §2); their v1 descriptions are in this concept at commit `f8e59ba`.

# Installer (format 4)

Usage: `node scripts/install-consortium.mjs <export-dir> [--fixture [--no-images]] [--out <dir>]`.

It refuses on the first failure, with nothing written:
- **Sums:** every `SHA256SUMS` entry exists and matches, and every other file of the directory is listed.
- **Manifest:**
  - `format_version` 4 and `schema_version` 2, refused by name otherwise; format 3 was v1's;
  - a `climate_ranges` block naming `climate_grid_manifest_sha256`;
  - `release_id` matching `^r-[0-9a-f]{16}$`;
  - `canopi_db_sha256` all zeros only with `--fixture`;
  - `split` false with one file (the page reads `files[0]` and expects every climate, so a split export is refused until it reads one file per climate), climates are in climate order, and the files' climates equal the manifest's;
  - the `try_references` and `source_credits` entries.
- **Each database file:**
  - its name is `databaseName(release, raw_sha256, climate?)`, i.e. `consortium-v2.<release>.<12 hex of the raw db>.sqlite.gz`;
  - sha256 and bytes match the manifest, and the gzip magic is present;
  - at most `MAX_GZIP_BYTES` (1,000,000) gzipped and at most `MAX_FILE_BYTES` (25 MiB) raw; raw sha256 and bytes match.
- **The database read with `node:sqlite`** (`readDatabase`; dynamic import, unflagged from Node 22.13, the engines floor):
  - `application_id`, `user_version`, `integrity_check` and `foreign_key_check`;
  - every table and column of `consortium-schema.mjs`, and no table outside it;
  - meta (schema, format, release, `built_at` = `generated_at`, climates), and each table's count against meta and the manifest;
  - every plant placed, and every placement with a reason;
  - schema 2: `meta.ranges_review` is `estimate_not_reviewed`; `meta.climate_grid_manifest_sha256` is a sha256 (an empty value counts as missing) equal to the manifest's `climate_ranges`; every plant has a `plant_climate_status` row; range or Köppen rows only beside a `range_source`;
  - plant ids are UUIDs, and source and photo-page URLs are http(s);
  - invasive rows only in countries GRIIS checked.
- **TRY list and credits:** parsed as the site's build parses them.
- **Release verify:** a real install then runs `uv run canopi release verify <dir>` from canopi-data before any photo. The location is `CANOPI_DATA_DIR`, else `../canopi-data`; a git worktree needs the variable.

What it writes:
- `public/data/consortium/`:
  - the database byte for byte under its own name (never rewritten, so name and digest stay true);
  - `images/<uuid>.<sha12>.<ext>`;
  - `INSTALLED_BY`, with the text v1 wrote, so the v1 install is replaced in place.
  - No manifest, no sums.
- `src/data/consortium-index.json` (design check A4, read by everything at build time; nothing at build time reads SQLite):
  - `format_version`, `schema_version`, `release_id`, `generated_at`, `canopi_db_sha256`;
  - `files[{ file, url, climate_zones, sha256, bytes, raw_sha256, raw_bytes }]`;
  - `climates` (capitalised, manifest order), `griis_available`;
  - `names{climate: sorted canonical names}`;
  - `images{uuid: /data/consortium/images/…}`;
  - `try_references{sha256, rows, dataset_ids}` and `source_credits{sha256, rows}`;
  - `climate_grid_manifest_sha256` and `ranges_review` (schema 2). `install-climate.mjs` refuses tiles of another grid, and `check-built-site.mjs` (through `scripts/consortium-grid-check.mjs`) requires the climate index's grid to equal it with `consortium_grid_check.status` `matched`.
  - With `--out` or `--fixture`, the index goes inside the output instead.
- On a real install, `src/data/`:
  - `try_references.tsv` with its meta;
  - `source_credits.tsv`, byte for byte.
- Photos use v1's code unchanged:
  - Commons and iNaturalist 500 px copies, a 500 ms pause, rate limiting waited out, a 3 MB cap, redirects only to the photo hosts;
  - a failed photo is left out of the index; more than 10% failing stops the install.
- Staging is in `.cache/consortium-install/`, then a rename, with the `src/data/` files put back on failure.
- `verifyInstall(dir, index)` re-checks a served folder against the index: the mark, each database by sha256, gzip and limits, every indexed photo present, and nothing else. `check-built-site.mjs` runs it on `dist/client/data/consortium/`.

Installed now (P5 commit 0): release `r-e0b162087a79eecf`, schema 2, `consortium-v2.r-e0b162087a79eecf.7fe89cd1dda2.sqlite.gz`.
- 556,862 B gzipped, 2,138,112 B raw (schema 1's `r-2c6bdf65c35caca3` was 429,481 B gzipped, about 1.66 MB raw).
- 515 plants, 200 placements per climate (Tropical, Mediterranean, Temperate); 515 status rows, 2,575 range rows (5 variables), 8,549 Köppen rows (4,671 under 1 %), 34,176 area rows.
- Ranges sampled from canopi-climate grid `04ec85f4…` (v0.2.0), `ranges_review` `estimate_not_reviewed`; WCVP did not match Prunus dulcis (native "unknown").
- The same 190 photos (179 Commons, 11 iNaturalist).

# Gotchas

- Climate names are capitalised in the export and the index ("Tropical") and lowercase on the site ("tropical"). Map them at the edge only: the page's `#ct-data` and guide presets.
- The fixture's `edit` hook runs after meta is filled, and the counts are recomputed after it.
- `scripts/install-consortium.test.mjs` uses the fixture and a stub fetch; it needs no network, `uv` or canopi-data. It also checks that the committed install matches the committed index.
