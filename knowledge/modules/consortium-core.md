---
type: Module
title: Consortium core
description: Consortium v2 core seams (types, PlantSource, load failures), the v1 rule modules kept for S1 to port, and the format 4 installer that writes the gzipped SQLite export, its photos and src/data/consortium-index.json.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T03:14:58Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:31:32Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:4a89c38d0ebcab40
    last_modified: 2026-11-11T03:07:08Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:f394eeac07ff7979
    last_modified: 2026-11-11T03:13:35Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:ae50a64b96a9953a
    last_modified: 2026-11-11T03:07:08Z
  - id: matrix-ts
    resource: ../../src/lib/consortium/matrix.ts
    title: src/lib/consortium/matrix.ts
    digest: sha256:d568f59992f286c4
    last_modified: 2026-11-11T03:07:08Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:fff368c4f1dbad5a
    last_modified: 2026-11-11T02:58:29Z
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:67ac3c2c8af76873
    last_modified: 2026-11-11T02:58:29Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:8d4ded230e94a7b1
    last_modified: 2026-11-11T02:58:29Z
  - id: readme-md
    resource: ../../scripts/fixtures/consortium-v2/README.md
    title: scripts/fixtures/consortium-v2/README.md
    digest: sha256:33e5d4a5dbccc049
    last_modified: 2026-11-11T02:58:29Z
  - id: consortium-index-json
    resource: ../../src/data/consortium-index.json
    title: src/data/consortium-index.json
    digest: sha256:067b733f9fc92fd8
    last_modified: 2026-11-11T02:58:29Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:4f10399cd9863a0a
    last_modified: 2026-10-27T20:00:11Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:935fffbd0c6781ea
    last_modified: 2026-11-10T06:50:47Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:ae4b3b9032f4aa31
    last_modified: 2026-10-27T19:14:44Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:6efa0ebd6e232793
    last_modified: 2026-10-28T19:00:25Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:608ccc8a28fc24c7
    last_modified: 2026-10-28T14:56:59Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:2204b1125f7911bc
    last_modified: 2026-11-11T03:07:08Z
enforced_by:
  - scripts/consortium-boundary.test.mjs
  - scripts/install-consortium.test.mjs
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
| [types.ts](../../src/lib/consortium/types.ts) | `SCHEMA_VERSION` 1, `APPLICATION_ID` 0x43434F4E. Value lists: `climateZones` (capitalised as exported), `regions`, `locales`, `phases`, `strata`, `roles`, `functionIds`, `interactionTypes`, `severities`, `toxicityLevels`, `layerFields`, `layerKinds`, `months`. Site answers `lights`/`soils`/`waters`/`rooms`, each with `unsure` (A7). Records: `PlantId` (the plants.id UUID, never the integer `plant`), `Placement`, `Taxon` (one plant in one climate; `from?` marks a guest, A9), `Traits`, `Warnings`, `Interaction`, `Reason`, `LayerValue`, `Details`, `Labels`, `SourceInfo`, `Matrix`/`MatrixCell` (empty: `gap` or `misfit`), `Flag` |
| [source.ts](../../src/lib/consortium/source.ts) | `PlantSource`, as in design check §4: `info`, `countries`, `pool`, `interactions`, `placements`, `names`, `details`, `labels`, and `cellCounts` (a test oracle). `loadFailures`: `too-old`, `wasm-blocked`, `fetch`, `stale`, `damaged`, `schema`, one per §5 screen |
| [index.ts](../../src/lib/consortium/index.ts) | Re-exports types and source. Stream S1 adds the rules here. |
| [matrix.ts](../../src/lib/consortium/matrix.ts) | Empty stub for S1 |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | The installer, described below |
| [consortium-schema.mjs](../../scripts/consortium-schema.mjs) | `DDL`: the export's 34 statements, from canopi-data at `ab6bfad` (unchanged since `8a74efd`). `DATA_TABLES`: the 25 counted tables |
| [make-fixture.mjs](../../scripts/fixtures/consortium-v2/make-fixture.mjs) | The invented fixture, 38 plants, built with `node:sqlite`. `buildFixtureDb` and `writeFixtureExport(dir, { edit, userVersion, applicationId, manifest, after })` build the broken variants for tests. The committed `export/` passes canopi-data's `check_export`; coverage is in its README |

**Kept unimported for S1 to port in place (design check §2):** `site.ts`, `conflicts.ts`, `jobs.ts`, `suggest.ts` and `state.ts`, the v1 modules.
- `tsconfig.json` excludes them, and nothing imports them. `state.ts` still imports the deleted `climates.ts`.
- Their v1 rules are documented in this concept at commit `f8e59ba`.

# Installer (format 4)

Usage: `node scripts/install-consortium.mjs <export-dir> [--fixture [--no-images]] [--out <dir>]`.

It refuses on the first failure, with nothing written:
- **Sums:** every `SHA256SUMS` entry exists and matches, and every other file of the directory is listed.
- **Manifest:**
  - `format_version` 4 and `schema_version` 1, refused by name otherwise; format 3 was v1's;
  - `release_id` matching `^r-[0-9a-f]{16}$`;
  - `canopi_db_sha256` all zeros only with `--fixture`;
  - `split` agrees with the number of files, climates are in climate order, and the files' climates equal the manifest's;
  - the `try_references` and `source_credits` entries.
- **Each database file:**
  - its name is `databaseName(release, raw_sha256, climate?)`, i.e. `consortium-v1.<release>.<12 hex of the raw db>.sqlite.gz`;
  - sha256 and bytes match the manifest, and the gzip magic is present;
  - at most `MAX_GZIP_BYTES` (1,000,000) gzipped and at most `MAX_FILE_BYTES` (25 MiB) raw; raw sha256 and bytes match.
- **The database read with `node:sqlite`** (`readDatabase`; dynamic import, since Node 22.12 needs a flag):
  - `application_id`, `user_version`, `integrity_check` and `foreign_key_check`;
  - every table and column of `consortium-schema.mjs`, and no table outside it;
  - meta (schema, format, release, `built_at` = `generated_at`, climates), and each table's count against meta and the manifest;
  - every plant placed, and every placement with a reason;
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
  - `try_references{sha256, rows, dataset_ids}` and `source_credits{sha256, rows}`.
  - With `--out` or `--fixture`, the index goes inside the output instead.
- On a real install, `src/data/`:
  - `try_references.tsv` with its meta;
  - `source_credits.tsv`, byte for byte.
- Photos use v1's code unchanged:
  - Commons and iNaturalist 500 px copies, a 500 ms pause, rate limiting waited out, a 3 MB cap, redirects only to the photo hosts;
  - a failed photo is left out of the index; more than 10% failing stops the install.
- Staging is in `.cache/consortium-install/`, then a rename, with the `src/data/` files put back on failure.
- `verifyInstall(dir, index)` re-checks a served folder against the index: the mark, each database by sha256, gzip and limits, every indexed photo present, and nothing else. `check-built-site.mjs` runs it on `dist/client/data/consortium/`.

Installed now: release `r-2c6bdf65c35caca3`, `consortium-v1.r-2c6bdf65c35caca3.d1047f1b78b9.sqlite.gz`.
- 429,481 B gzipped, about 1.66 MB raw.
- 515 plants, 200 placements per climate (Tropical, Mediterranean, Temperate).
- 190 photos (179 Commons, 11 iNaturalist).

The export was rebuilt on 2026-11-11 at 03:39, so the digest is not the `6d303e00b6ac` the design check names.

# Gotchas

- Climate names are capitalised in the export and the index ("Tropical") and lowercase on the site ("tropical"). Map them at the edge only: the page's `#ct-data` and guide presets.
- The fixture's `edit` hook runs after meta is filled, and the counts are recomputed after it.
- `scripts/install-consortium.test.mjs` uses the fixture and a stub fetch; it needs no network, `uv` or canopi-data. It also checks that the committed install matches the committed index.
