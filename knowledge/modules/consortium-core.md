---
type: Module
title: Consortium core
description: Consortium v2 core seams (types, PlantSource, load failures, the P5 range rule and nearest-list placements, the future check, the verdict engine and its words; native and soil moved to P5.2), the rules S1 ported, and the format 4 installer for schema 4.7 (no older schema or minor) that writes the gzipped SQLite export, its photos and src/data/consortium-index.json.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-19T18:52:52Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T12:21:11Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:260e0d612a9f4809
    last_modified: 2026-11-19T04:40:24Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:766ed7fdb9ff7efa
    last_modified: 2026-11-17T10:52:11Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:e393580af2534bc5
    last_modified: 2026-11-18T17:13:28Z
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
    digest: sha256:fdcadd208508d5e3
    last_modified: 2026-11-18T06:34:33Z
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:121d87b32b4dfb4d
    last_modified: 2026-11-18T06:34:33Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:0c684e2ed3d541ad
    last_modified: 2026-11-18T06:34:33Z
  - id: readme-md
    resource: ../../scripts/fixtures/consortium-v2/README.md
    title: scripts/fixtures/consortium-v2/README.md
    digest: sha256:7fc94a49c94578c1
    last_modified: 2026-11-18T06:34:33Z
  - id: consortium-index-json
    resource: ../../src/data/consortium-index.json
    title: src/data/consortium-index.json
    digest: sha256:b4b79e7df59ce9a2
    last_modified: 2026-11-18T06:34:33Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:d17e7425d6f4e31b
    last_modified: 2026-11-18T17:13:28Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:aceaab4e54f45431
    last_modified: 2026-11-18T04:37:58Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:97b5290a800f6a3f
    last_modified: 2026-11-14T12:46:39Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:15f1a3ec8774ad24
    last_modified: 2026-11-18T17:13:28Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:023783ecbccd0096
    last_modified: 2026-11-19T12:21:26Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:8165db4fcb8d590c
    last_modified: 2026-11-13T07:53:00Z
  - id: range-ts
    resource: ../../src/lib/consortium/range.ts
    title: src/lib/consortium/range.ts
    digest: sha256:563dd255757eddd8
    last_modified: 2026-11-19T05:03:52Z
  - id: placement-ts
    resource: ../../src/lib/consortium/placement.ts
    title: src/lib/consortium/placement.ts
    digest: sha256:8f7a898e3dc4d6ad
    last_modified: 2026-11-13T14:45:08Z
  - id: future-ts
    resource: ../../src/lib/consortium/future.ts
    title: src/lib/consortium/future.ts
    digest: sha256:788e3562bea607f1
    last_modified: 2026-11-18T04:32:21Z
  - id: consortium-p5-seams-test-mjs
    resource: ../../scripts/consortium-p5-seams.test.mjs
    title: scripts/consortium-p5-seams.test.mjs
    digest: sha256:853938d7571921fa
    last_modified: 2026-11-18T04:32:21Z
  - id: consortium-p5-seams-s5b-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5b.test.mjs
    title: scripts/consortium-p5-seams-s5b.test.mjs
    digest: sha256:ed97d885681f97b4
    last_modified: 2026-11-18T18:38:12Z
  - id: consortium-p5-seams-s5c-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5c.test.mjs
    title: scripts/consortium-p5-seams-s5c.test.mjs
    digest: sha256:cf24cf35d4d113b5
    last_modified: 2026-11-19T01:30:29Z
  - id: consortium-p5-seams-s5d-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5d.test.mjs
    title: scripts/consortium-p5-seams-s5d.test.mjs
    digest: sha256:4f2f51953a49a06c
    last_modified: 2026-11-18T00:51:57Z
  - id: consortium-p5-seams-s5e-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5e.test.mjs
    title: scripts/consortium-p5-seams-s5e.test.mjs
    digest: sha256:fd634252aa808345
    last_modified: 2026-11-19T04:40:24Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:46f57cbfd5234252
    last_modified: 2026-11-18T02:34:14Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:eb4395e60994e93b
    last_modified: 2026-11-12T07:59:10Z
  - id: readme-md-2
    resource: ../../scripts/fixtures/consortium-future/README.md
    title: scripts/fixtures/consortium-future/README.md
    digest: sha256:16982db16208c8af
    last_modified: 2026-11-11T17:32:49Z
  - id: consortium-p5-ranges-test-mjs
    resource: ../../scripts/consortium-p5-ranges.test.mjs
    title: scripts/consortium-p5-ranges.test.mjs
    digest: sha256:ada2fb6322d9da54
    last_modified: 2026-11-18T04:32:21Z
  - id: fold-ts
    resource: ../../src/lib/consortium/fold.ts
    title: src/lib/consortium/fold.ts
    digest: sha256:dae939a445a54069
    last_modified: 2026-11-17T11:57:14Z
  - id: zones-ts
    resource: ../../src/lib/consortium/zones.ts
    title: src/lib/consortium/zones.ts
    digest: sha256:33f34d5c6cad519a
    last_modified: 2026-11-13T07:25:07Z
  - id: nearest-ts
    resource: ../../src/lib/consortium/nearest.ts
    title: src/lib/consortium/nearest.ts
    digest: sha256:b8ccc5ba13429537
    last_modified: 2026-11-17T01:10:16Z
  - id: consortium-zones-test-mjs
    resource: ../../scripts/consortium-zones.test.mjs
    title: scripts/consortium-zones.test.mjs
    digest: sha256:48946426a4efb83a
    last_modified: 2026-11-13T03:45:07Z
  - id: lookup-json
    resource: ../../scripts/fixtures/climate/lookup.json
    title: scripts/fixtures/climate/lookup.json
    digest: sha256:9e6d24960bcd5ebd
    last_modified: 2026-11-13T03:09:50Z
  - id: sqlite-source-ts
    resource: ../../src/islands/consortium/data/sqlite-source.ts
    title: src/islands/consortium/data/sqlite-source.ts
    digest: sha256:c97ea2817fd76eb5
    last_modified: 2026-11-18T18:43:00Z
  - id: placed-ts
    resource: ../../src/lib/consortium/placed.ts
    title: src/lib/consortium/placed.ts
    digest: sha256:faefdfc3640d75cc
    last_modified: 2026-11-13T12:43:29Z
  - id: place-ts
    resource: ../../src/lib/consortium/place.ts
    title: src/lib/consortium/place.ts
    digest: sha256:e3764f30b6573f2d
    last_modified: 2026-11-18T04:51:36Z
  - id: link-v5-json
    resource: ../../scripts/vectors/link-v5.json
    title: scripts/vectors/link-v5.json
    digest: sha256:db579831b2a93c65
    last_modified: 2026-11-19T12:21:26Z
  - id: consortium-link-v5-test-mjs
    resource: ../../scripts/consortium-link-v5.test.mjs
    title: scripts/consortium-link-v5.test.mjs
    digest: sha256:a77ed58ac9d2af62
    last_modified: 2026-11-19T12:21:26Z
  - id: range-verdicts-json
    resource: ../../scripts/vectors/range-verdicts.json
    title: scripts/vectors/range-verdicts.json
    digest: sha256:9866dcaff6cd42e7
    last_modified: 2026-11-18T06:34:33Z
  - id: country-zones-ts
    resource: ../../src/lib/consortium/country-zones.ts
    title: src/lib/consortium/country-zones.ts
    digest: sha256:b37c5aef9f6ad3df
    last_modified: 2026-11-14T21:05:18Z
  - id: retry-import-ts
    resource: ../../src/lib/consortium/retry-import.ts
    title: src/lib/consortium/retry-import.ts
    digest: sha256:ae0ed9a2fe3bc1c3
    last_modified: 2026-11-17T18:58:13Z
  - id: verdict-ts
    resource: ../../src/lib/consortium/verdict.ts
    title: src/lib/consortium/verdict.ts
    digest: sha256:659d609a57947882
    last_modified: 2026-11-19T04:59:08Z
  - id: verdict-line-ts
    resource: ../../src/lib/consortium/verdict-line.ts
    title: src/lib/consortium/verdict-line.ts
    digest: sha256:a169b614d21093dd
    last_modified: 2026-11-19T05:25:31Z
  - id: verdict-load-ts
    resource: ../../src/lib/consortium/verdict-load.ts
    title: src/lib/consortium/verdict-load.ts
    digest: sha256:ff57adaa6726ccbb
    last_modified: 2026-11-19T04:59:08Z
  - id: site-change-ts
    resource: ../../src/lib/consortium/site-change.ts
    title: src/lib/consortium/site-change.ts
    digest: sha256:77188e48536af621
    last_modified: 2026-11-19T04:40:24Z
  - id: site-change-line-ts
    resource: ../../src/lib/consortium/site-change-line.ts
    title: src/lib/consortium/site-change-line.ts
    digest: sha256:af099a0b86672327
    last_modified: 2026-11-19T04:40:24Z
  - id: consortium-said-mjs
    resource: ../../scripts/consortium-said.mjs
    title: scripts/consortium-said.mjs
    digest: sha256:43893d3f05cd8270
    last_modified: 2026-11-19T05:25:31Z
  - id: format-ts
    resource: ../../src/islands/consortium/format.ts
    title: src/islands/consortium/format.ts
    digest: sha256:8f5252bea4821008
    last_modified: 2026-11-19T04:59:08Z
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

Since E6 Q3 the same test keeps `src/lib/climate` and `src/lib/location` imports inside their own folder (packages allowed) and checks their key files exist; the no-preact/islands/components rule for all three folders is dependency-cruiser L1 alone, at `error` ([island layers](/decisions/consortium-island-layers.md)).

# Key files

| File | Holds |
|---|---|
| [types.ts](../../src/lib/consortium/types.ts) | `SCHEMA_VERSIONS` [4] (schema 4.7 or later since PP-C 0c; `Taxon.light` the 4.5 light span, `TaxonFunction.kind` and `Details.nameKinds` the 4.6/4.7 AI-estimate kinds, see [schema 4 reader](/modules/consortium-schema-4-reader.md)), `APPLICATION_ID` 0x43434F4E. Value lists: `climateZones` (capitalised as exported; declared in zones.ts since E6 R2 and re-exported here), `regions`, `locales`, `phases`, `strata`, `roles`, `functionIds`, `interactionTypes`, `severities`, `toxicityLevels`, `layerFields`, `layerKinds`, `months`. Site answers `lights`/`soils`/`waters`/`rooms`, each with `unsure` (A7). Records: `PlantId` (the plants.id UUID, never the integer `plant`), `Placement`, `Taxon` (one plant in one climate; `origin?: PlacementOrigin` marks a guest, A9, or a borrowed placement, S5c, since E6 R4), `Traits`, `Warnings`, `Interaction`, `Reason`, `LayerValue`, `Details`, `Labels`, `SourceInfo`, `Matrix`/`MatrixCell` (empty: `gap` or `misfit`), `Flag`. View shapes for S2–S4 (review C5): `Verdict`, `FitReason` (room: kind `wild_height` is advisory, verdict 'fit' (owner request 2026-11-12), "height not recorded"), `Fit`, `JobId`/`jobIds`, `CellRef`, `Alternative` (`alsoFills`, `leavesEmpty`), `JobGap` (missing phases), `ShareState`, `LinkNotice` (`unknownCount`, `cut` (since v14 0W-2 R4 only the reason beside `unreadable`), `long`), `DecodedLink`; `Matrix.unplaced` ("No layer yet"). Schema 2 (P5 commit 0): `Taxon.climate: TaxonClimate | null` (`tminCold`, `tmaxWarm`, `aridity` as `ClimateRange {low, median, high, count, basis}`, `cells`, `nativeShare`; null = "range not recorded"), `Taxon.areasKnown` (WCVP matched; false = native "unknown"), (S5c's `Taxon.placedFrom?`/`estimate?` and the guest's `from?` were replaced by `Taxon.origin` in E6 R4), `Details.koppen: KoppenShare[]` (largest first), `SourceInfo.schemaVersion` 2 with `climateGrid` and `rangesReview`. P5 seams: `SiteLookup`/`SitePeriod` (a structural mirror of the climate reader's lookup; store.ts checks the reader's type stays assignable, since the core may not import `src/lib/climate`), `SiteLocation {lat, lon, source: 'geo'|'search'|'map'|'link', label?, lookup}`, `scenarios`/`Scenario`/`DEFAULT_SCENARIO` ('ssp245'), `markKinds`/`Mark {kind, key, vars?, severity: 'note'|'warning'}` E6 commit 0 adds the ADR-6 types ([placement origin and factAt](/decisions/consortium-placement-origin-and-facts.md)), implemented in E6 R4: `PlacementKind` (`own` \| `guest` \| `borrowed`; `Taxon.origin` is never stamped `own`), `PlacementOrigin {list, kind, guest?}`, `SiteFitMessage` (read since E6 R2: `{id, about, severity, misfit, key, vars?, state?}`; a misfit warns in words, a note carries `state` and becomes a site mark, an unknown neither), `FactKey` (`life_cycle`, `cold_limit`, `heat_limit`, `water_need`), `FactValues` (`water_need: {drought: string \| null, moisture: string \| null}`, null only when both are unknown), `FactAt`. |
| [fold.ts](../../src/lib/consortium/fold.ts) | `fold(text)`: the one name fold for search (lowercase, ß→ss, œ→oe, æ→ae, combining marks dropped after Latin, Greek and Cyrillic letters only, so kana voicing and Hangul stay); a leaf re-exported by `index.ts`; moved here unchanged from the island's `data/search.ts` in E6 commit 0 so Start's crop search can share it (E6 K1). |
| [source.ts](../../src/lib/consortium/source.ts) | `PlantSource`, as in design check §4: `info`, `countries`, `pool`, `interactions`, `placements`, `names`, `details`, `labels` (`cellCounts`, the test oracle, went with the matrix in PP-B commit 0a'). (`nativeIn(l3)`, the plant_areas reader for native here, was removed before the P5 push with the other S5e stubs; P5.2 restores it from `0801024`.) `loadFailures`: `too-old`, `wasm-blocked`, `wasm-fetch` (sqlite3.wasm did not arrive; review L1), `fetch`, `stale`, `damaged`, `schema`, one per §5 screen. `factAt(key, taxon, site, period)` (E6 R4, ADR-6) with `TODAY_PERIOD` `'1991-2020'`: today the stored value whatever the site and period (`life_cycle` from `is_annual`/`grown_as_annual`/`is_perennial`, `cold_limit` from `climate.tminCold.low` and `weak`, `heat_limit` from `climate.tmaxWarm.high`, `water_need` from `drought_tolerance` and `moisture_use`), null when not recorded; F2 and E7 fill the signature. Only Details reads it so far (water need) |
| [zones.ts](../../src/lib/consortium/zones.ts) (E6 R1) | The one place the climate-zone list is declared (`climateZones` and `ClimateZone`, canopi-data climates.ord; since E6 R2, types.ts re-exports them) with the site-id mapping: `siteIdOf(zone)` ('Temperate' → 'temperate'), `siteIds` (zone order, exact tuple type), `zoneOfSiteId(id)` (any case, trimmed; null when not a zone), type `SiteId`. `src/lib/correction.mjs` derives `CLIMATES` from it and maps posted ids with `zoneOfSiteId`; `src/data/climates.ts` type-checks its ids against `SiteId` but keeps the site's display order (Mediterranean before Arid, pinned by `homepage.test.mjs`); the installer keeps a plain-node copy (`CLIMATE_ZONES`). `scripts/consortium-zones.test.mjs` checks all four agree. state.ts reads it since E6 R2 (`zoneOf` = `zoneOfSiteId`, the link's `c` = `siteIdOf`); `index.ts` exports `siteIdOf` (E6 S3), which the island's `state/draft.ts` uses in place of persist.ts's removed hand-written `siteId` |
| [nearest.ts](../../src/lib/consortium/nearest.ts) (E6 R1) | `NEAREST_LISTS`, the nearest-list table: a leaf (imports only types) read by placed.ts and placement.ts, so placed.ts no longer imports placement.ts (cycle C1); placement.ts re-exports it |
| [index.ts](../../src/lib/consortium/index.ts) | Re-exports types, source and canopi-file (S4's, exported now so S4 never edits index.ts). Stream S1 adds the rule exports here. |
| [canopi-file.ts](../../src/lib/consortium/canopi-file.ts) | S4's `.canopi` writer for the app (format v9, canopi `0c425fb07`): `canopiFile(members, { name, description, at })` returns the JSON text of an empty design whose `consortiums` hold one entry per member (`target {kind: 'species', canonical_name}`, its `stratum` or `unassigned`, `start_phase`/`end_phase` 0–6; app default `unassigned` 0–2), deduplicated by canonical name, with `plants: []` (checked at P2 hand-offs: `PlacedPlant` requires a map `position` the tool does not have, and the app's consortium sync (`app/consortium/workflow.ts` at `0c425fb07`) only adds entries for placed plants and never removes these, so the entries survive until the reader places the plants); `canopiFileName(name)` makes a safe `<name>.canopi`. Pure. Checked in `scripts/consortium-canopi-file.test.mjs` and BT-9 against the app's vendored format, [scripts/vendor/canopi-design-format/](../../scripts/vendor/canopi-design-format) (canopi `0c425fb07`, AGPL header, test-only), with its `validate.mjs` |
| [site-climate.ts](../../src/lib/consortium/site-climate.ts) (P5 S5b) | `siteClimate(lookup)` → `{state: sea \| polar \| borderline \| coast \| ready, today, zone, near, suggested}`, `koppenZone`, `BORDERLINE_C` 0.5; exported through index.ts. state.ts holds the link's `o=` (`encodeLink(…, { origin })`, `linkOrigin`, `cellCentre`); see [Consortium location step](/modules/consortium-location.md) |
| [country-zones.ts](../../src/lib/consortium/country-zones.ts) (simplify pass 2026-11-14) | `countryZones(code)`: a country's time zones from the runtime's CLDR data, `[]` where there is none (Firefox); one owner for the page's build-time `countries.zones` table (`ConsortiumPage.astro`) and the island's fallback in `guessCountry`; exported through index.ts |
| [retry-import.ts](../../src/lib/consortium/retry-import.ts) (simplify pass 2026-11-14) | `retryableImport(load, pick)`: a chunk import a failed fetch does not poison (after a failure, the same hashed `/_astro/` file under `?retry=n`, read from the error), one attempt shared by every caller, the picked value kept; the one owner for the views' parts (`lazyPart`, `later`, `later-chunk.ts`, the location step) and the core loaders (`loadVerdictRule`, `loadSuggest`; PP-C c2 deleted `loadRangeRule` and `loadMarkProviders`); `failedChunk(err)` (the plain `/_astro/` URL a failed import names) is exported too: store.ts HEADs it after a failed verdict retry and offers Reload only when the file answers (c2 merge, A8/A14); exported through index.ts |
| [site.ts](../../src/lib/consortium/site.ts), [conflicts.ts](../../src/lib/consortium/conflicts.ts), [jobs.ts](../../src/lib/consortium/jobs.ts), [suggest.ts](../../src/lib/consortium/suggest.ts), [state.ts](../../src/lib/consortium/state.ts) | Stream S1's rules, exported from `index.ts` (all but `suggest.ts` since E6 R4: the barrel no longer re-exports it, and `loadSuggest()` in `index.ts` is the page's only way in, its own chunk, role `suggest`, cached, a failed load cleared so the next call tries again, returning `SuggestRule {suggest, alternatives}` destructured so Rollup keeps only those; node tests import suggest.ts directly): three-valued site fit (the room answer is advisory, owner request 2026-11-12: the matrix layers are relative sun exposure, not heights, so a plant taller than a small (6 m) or large (12 m) garden fits with reason kind `wild_height` and never blocks a cell, flags or hides in Add; only the suggestion leaves it out, `tallerThanRoom`, while light, soil and water still misfit); conflicts and invasive records, and the member flags (`FlagContext`, `flagsFor`, `flagsOf`, `warns` (a site misfit or a serious conflict: the plant comes last in Add, Swap and the alternatives, and Paste's toast says "added with a warning"; never a confirm step, owner 2026-11-14); in conflicts.ts since E6 R1, so the store's flags reach no suggestion code; they call `fits()` directly); the six jobs and their gaps per phase; `matrix.ts` is gone (`buildMatrix` and the Matrix types in PP-B commit 0a', `cellsOf`/`cellKey` in PP-C c2: Swap's "Also fills" / "Leaves empty" come from suggest.ts `swapChange` on the holes); the greedy suggestion and Swap list; the `#v=4` share link (`encodeLink`, `decodeLink`, `isLongLink` over 2,000 characters, `readPreset` for guide links); `zoneOf(code)` in `state.ts` (an alias of zones.ts `zoneOfSiteId`) is the one climate-code lookup (the island's state/ modules and main.ts import it) |
| [range.ts](../../src/lib/consortium/range.ts), [placement.ts](../../src/lib/consortium/placement.ts), [future.ts](../../src/lib/consortium/future.ts) | P5 seams, each filled by one stream (`.local/consortium/v2/archive/p5-owners.md`). S5c (built): `siteToday(site)` (the lookup's historical 1991–2020 period, null without a site climate; its own module `site-today.ts`, re-exported by range.ts); firstPlaced and placeFor live in `placed.ts` (re-exported by placement.ts) so the first run carries only `NEAREST_LISTS` (in the leaf `nearest.ts`, E6 R1) and `hasPlants`; `rangeCheck(taxon, site)` → `{verdict, sides, beyond, aridity, coolSeason}` or null, `rangeFit` → 'inside' \| 'edge' \| 'outside' \| 'unknown' (owner answer 2, schema 3 ranges: coldest-month minimum against the plant's tmin_cold low (cold limit) and high, the year's warmth `yearMeanC` = (tmean_cold + tmean_warm)/2 against tmean_year low (side 'cool', perennials only: Nairobi 19.35 °C is too cool for cacao, low 21.4), a heat-demanding annual's summer, the site's warmest-month mean against tmean_warm low (side 'summer', `applies: needsSummerHeat`: an annual whose tmean_warm low is at or above `HEAT_DEMAND_C`, 18 °C, as the chill rule, coordinator decision 2026-11-12, since one warmest-month value says nothing about the season length in equatorial highlands; taro, ginger, turmeric and sweet potato are "summer too cool" at Rovaniemi, while lettuce, maize, onion, carrot, cabbage, garlic, leek and beet, below 18, never get the side at Quito or Bogotá; perennials ignore the row), warmest-month maximum against tmax_warm high (a heat limit, Q99); a weak row (`ClimateRange.weak`, a disputed limit: TreeGOER stricter by more than 4 °C, the looser bound kept) is compared as any row and never softens a verdict (coordinator decision 2026-11-12: the doubt is only that the bound is too lenient); the bounds are one table, `RANGE_BOUNDS` (side, plant range field, end, site value function, `applies(taxon)`; `slotCheck(taxon, slot)` runs them on one slot; `HOT_BOUND` is its hot row, a plain constant so future.ts reaches it without a module-level call, which would pull the rule into the island's main chunk), and the export variables they read are one list, types.ts `RANGE_VARIABLES` (tmin_cold, tmax_warm, tmean_year, tmean_warm, aridity; sqlite-source.ts builds its query from it); `boundPassed(taxon, bound, slot)` is one bound against one slot; the mild side applies only when `canNeedChill(taxon)`, tmin_cold high below `CHILL_CEILING_C` 18 °C, the export's own rule (canopi-data docs/plant-climate-ranges.md; the Köppen A/C bound), so cacao 24.1 and cassava 24.2 are never "edge" at Manaus or Singapore (decision row "Climate ranges fixed before the P5 push"); passed by up to `RANGE_MARGIN_C` 2 °C 'edge', by more 'outside'; one comparison owns the rule, `passes(value, bound, 'below' | 'above')` → 'inside' \| 'edge' \| 'beyond', in hundredths of a degree, since site values carry one decimal and ranges two, so 9.8 − 7.8 is exactly the margin (future.ts takes the same one for too hot); no range 'unknown', never filtered; aridity 'drier' \| 'wetter' \| 'inside' \| 'not-checked' (site null, ice) \| 'unknown', a mark only); `withinRange(pool, site, keep = [])`: the pool without the outside plants except `keep`, the same array without a site climate. `placeFor(placements, zone, nearestOrder)` → `{zone, placement}`: own placement, else the first of `NEAREST_LISTS` (Subtropical/Arid → Mediterranean, Tropical, Temperate; Continental/Boreal → Temperate, Mediterranean), else null; a returned zone other than the site's is a borrowed placement, which the caller stamps as `Taxon.origin { kind: 'borrowed' }`, the one estimate mark (the derived `estimate` flag of `placeFor` and `firstPlaced` was removed in E6 chunk 5); `firstPlaced` is the shared rule (placeFor and `PlantSource.borrowed` both call it); `hasPlants(zone, curated)`: curated or a nearest list is. `placementZone(t, climate)`: the list a plant's placement, reasons and climate months come from (`Taxon.origin.list`, a borrowed placement's curated list or a guest's list, else the climate). Since E6 R4 placement.ts is the one reader and writer of `Taxon.origin`: `asGuest(t, list)` (a copy stamped `{list, kind: 'guest'}`; a borrowed origin wins and, since the E6 hand-off D, gets `guest: list`), `guestOf(t)` (the guest's list, or a borrowed plant's `origin.guest`, else null), `borrowedFrom(t)` (the borrowed list, else null); Details queries `details()` with it, since only curated lists have `placement_reasons` and climate-scoped `layer_values` (pre-push review 1: on a borrowed climate Details had queried the visitor's climate and always showed no reasons, live since P2; unit test in `consortium-p5-seams-s5c.test.mjs`, browser spec P5-17b). An annual (`isAnnual`: `traits.is_annual`, or `traits.grown_as_annual`, schema 3's flag for crops grown as annuals that is_annual misses, onion, garlic, carrot, cabbage, beet, leek, potato; decision row "Growing months"; the fixture's onion carries it) is never checked against its coldest-month minimum, on either side, nor the year's warmth (the one switch is `checksWinter(taxon)`, which every winter-side bound reads; cool-season annuals skip too until the owner answers whether their coldest month should be checked) (owner, decision row "Annuals skip the winter-cold check"; future.ts checks only heat, so it needs nothing), and its marks off chips (kind 'unknown', state `annual`) claim no season (owner, decision row "Growing months" 2026-11-12: the USDA growth period classes 18 of 77 annuals and calls turnip and rye warm-season; reviewed crop growing bands come in a later release): `range.annualShort` "annual" on rows and in Add (a short tag: the sentence overflowed phone rows, walk-through F1), `range.annual` "An annual, re-sown each year: its winter cold is not checked." in Details. An annual beyond its heat range (past Q95 by more than the margin; `coolSeasonOf`) is not outside: `coolSeason` true, no hot side, and its marks are kind 'season' (state `cool`) `range.coolSeason` in Details ("Too hot in summer here: grow it in the cool season.") and `range.coolSeasonShort` on rows and in Add, instead of the annual note; within the margin it is 'edge' as any plant (decision row "Climate ranges fixed before the P5 push"). Real export `r-b958a4239cc68f73` (the same rows on `r-60ea417b5a15c3aa`) at the design check's 14 sites (withinRange counts, pinned in `consortium-p5-seams-s5c.test.mjs`, the site means passed for the warmth bounds): Lyon 360, Dakar 274, Lima 282, Hanoi 293, Montreal 182, Nairobi 164, Perth 176, Seville 198, Oslo 236, Manaus 199, Phoenix 150, Brisbane 336, Yakutsk 72 (annuals only), Chicago 255 (on `r-01102782139409b5`: 349, 263, 273, 286, 177, 163, 176, 198, 236, 199, 134, 333, 59, 255); 56 weak rows (43 tmin_cold, 13 tmean_year), all compared as firm bounds; the owner's diagnosis expectations (Nairobi cacao and coconut outside with a cool year, Manaus cacao and cassava within, Seville olive, rosemary, almond, fig, pomegranate within and olive not too hot by 2071–2099, Riyadh fig within and jujube, pomegranate, moringa edge, Minneapolis apple within and mango outside, Rovaniemi fig outside and taro and ginger summer too cool, Singapore lowland tropicals never mild, potato and carrot not outside there, onion not outside at Harbin) are the acceptance test in `consortium-p5-ranges.test.mjs`, on sites from `scripts/fixtures/consortium-ranges/sites.json`; the same file holds stream E2's scenario tests, written expectations first and recorded as todo tests naming their known limit, with no rule change (a weak row never softens a verdict; a margin wide enough would gut the cold check): Scots pine at Yakutsk (site pinned in sites.json from the canopi-climate v0.2.1 vectors `scripts/fixtures/climate/lookup.json`, checked against them) is outside today (cold and cool; tmin −39.8 °C against a weak Q05 of −31), and fig, jujube and pomegranate at Riyadh are too hot by 2041–2070 SSP2-4.5 (tmax 44.7 °C against heat bounds 42.6, 41.5, 41.3); a todo that starts passing shows as a passed todo and is removed then; every real site now keeps some plant, so the browser specs show "nothing fits" at a synthetic 46 °C summer. `futureCheck(taxon, site, scenario)` (S5d, filled: see [future.ts](../../src/lib/consortium/future.ts) below); S5e (native here, soil likely) is not in P5: its stubs `native.ts` `nativeHere`, `soil-likely.ts` `likelyFor` and `native-marks.ts` `nativeMarks`, with `MarkContext.source`, were removed at the pre-push review (3); P5.2 restores them from `0801024` (list in `scripts/consortium-p5-seams-s5e.test.mjs`). Marks (PP-C c2): the marks pipeline is deleted (`marks.ts`, `mark-providers.ts`, `range-marks.ts`, `future-marks.ts`, `site-marks.ts`, with `loadRangeRule`, `loadMarkProviders`, `needsMarkProviders` and the chunk roles `range` and `markProviders`); one verdict per plant (`verdict.ts`, role `verdict`, loaded by `verdict-load.ts` `loadVerdictRule`, the range checks inside its chunk) gives the fit, range, future and site lines, and `verdict-line.ts` owns their words (the site answers' words moved there from site.ts `siteFitMessages`, fix round 1 B2; `periodName` is its first-run period name). The rule texts above (range bounds, annuals, cool season, borrowed estimate, TreeGOER and disputed limits) now surface as verdict factors and lines, not marks. `PlantSource.borrowed(zone, order)` ([source.ts](../../src/lib/consortium/source.ts)): an uncurated climate's plants from its nearest lists, marked estimate; `pool(c)` of a climate not in `info().climates` returns `borrowed(c, NEAREST_LISTS[c])`; `sqlite-source.ts` reads each curated list of the order once, keeps every plant once, placed as in the first list of the order that has it (`{...taxon, origin: {list, kind: 'borrowed'}}`), sorted by name, cached per climate; an order with no curated list gives `[]` ("Not covered yet"). Each stream's seam tests are its own file, `scripts/consortium-p5-seams-s5b/c/d/e.test.mjs` (shared inputs in `consortium-p5-fixtures.mjs`); `consortium-p5-seams.test.mjs` pins the shared marks pipeline and where the host views mount each slot |
| [future.ts](../../src/lib/consortium/future.ts) | S5d, the future climate check (decision row "P5 engineering choices"; projections: constrained CMIP6 ensemble changes, Beck et al. 2023, on the CHELSA v2.1 1981–2010 climate): `futurePeriod(taxon)` is the latest period the phases reach (phase_end ≥ 3 → '2041-2070', climax → '2071-2099', earlier or unplaced → null, "today's climate only"); `futureCheck(taxon, site, scenario)` → `{period, verdict 'inside'\|'edge'\|'outside'\|'already', why, already, agree, of, coolSeason, warmEnough, drier}` or null (no lookup, no slot for the chosen scenario, no range, or no heat bound: aridity alone never makes a loss, so "not checked"). One reason makes a loss: too hot = slot warmest-month maximum > `tmaxWarm.high` + range.ts `RANGE_MARGIN_C` (2 °C), through range.ts `HOT_BOUND` and `boundPassed`; an annual too hot is never a reason (`coolSeason` true, the add/details mark kind 'season' `future.coolSeason`, nothing on chips or rows); aridity is a note, never a reason, as today (walk-through 2 N3: at Seville 29 of 39 "outside by 2041–2070" were so on dryness alone): `drier` when range.ts `aridityFit` (the one owner of the aridity rule, today's `rangeCheck` reads it too) gives 'drier' in the chosen slot and not today, with any verdict; an annual already too hot today gets no `coolSeason` from the future check (today's mark says it once); `warmEnough`: today beyond the year's warmth low (an annual: its summer-warmth low) and the chosen slot beyond no bound (`slotCheck`), said positively, `future.warmEnough` (add/details) and `future.warmEnoughShort` (chip/row), kind 'future', state `warm`; edge = above Q95 within the margin; warm winters never checked. A reason counts only as a change from today (the 'historical' slot): `already` lists the bounds already crossed today, `why` only new ones; no new reason and no new heat edge but some already → verdict 'already' (with heat the only reason, 'already' and a new reason cannot both hold). Agreement: for outside, scenarios outside for at least one of `why`; otherwise scenarios not outside. `futureSummary(taxa, site, scenario)` puts each member in one place: `periods[{period, checked, outside, heat, drier}]` (n of m; `drier` lists the period's plants with the note, any verdict, outside the counts, and the panel skips an n of m with no m), `already{heat}` (verdict 'already'), `todayOnly`, `notChecked`, plus `checks` (each checked plant's FutureCheck, which the panel lines read); `available` false when the site has no future slot. (`futureMarks`, the lazy provider, went with the marks in PP-C c2: the verdict's later-period line says it.) Real-export counts (`r-01102782139409b5` and, unchanged, `r-b958a4239cc68f73`, heat limit at Q99), whole lists of 200, SSP2-4.5 ([consortium-p5-seams-s5d.test.mjs](../../scripts/consortium-p5-seams-s5d.test.mjs), sites from `canopi-climate lookup` in `scripts/fixtures/consortium-future/sites.json`): Lyon (Temperate) 0/101 by 2041–2070 (1 drier) and 0/33 by 2071–2099, already 1 hot, 65 short-lived; Manaus (Tropical) 0/110 and 0/31; Seville (Mediterranean) 14/102 and 6/25, all too hot, already 2 hot, with the watering note on 30 and 7 (39/102 and 11/25 while dryness counted, before walk-through 2 N3); Oslo 0/102 and 0/33. No range pre-filter yet: once S5c's range.ts lands the members come from the filtered pool (merge follow-up). |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | The installer, described below |
| [consortium-schema.mjs](../../scripts/consortium-schema.mjs) | `DDL_4`, `DDL_BY_SCHEMA` (schema 4 only), `DDL_READ` and the required 4.2 to 4.7 additions since PP-C 0c ([schema 4 reader](/modules/consortium-schema-4-reader.md)); the private `DDL_3` they derive from is schema 3, the export's 37 statements as stored in export `r-b958a4239cc68f73` (plants ends with `grown_as_annual` NOT NULL; plant_climate's variable list holds `tmean_warm`; `consortium-p5-ranges.test.mjs` compares every statement with the installed export) (schema 1's from canopi-data `ab6bfad`, plus `plant_climate_status` with `documented_cells`, `plant_climate` with `tmean_year`, basis `thinned_cells`, `blocks`, `low_source`, `high_source`, `weak`, and `plant_koppen`). `DATA_TABLES`: the 28 counted tables |
| [make-fixture.mjs](../../scripts/fixtures/consortium-v2/make-fixture.mjs) | The invented fixture, built with `node:sqlite` at schema 4.7; ranges by rule (tmean_year and tmean_warm included, no weak row; the onion is `grown_as_annual`) from each plant's first placement (`FIXTURE_GRID_SHA256` is the real v0.2.0 grid digest), Phacelia without a range. `buildFixtureDb` and `writeFixtureExport(dir, { edit, userVersion, applicationId, manifest, after })` build the broken variants for tests. The committed `export/` passes canopi-data's `check_export`; coverage is in its README |

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
  - at most `MAX_FILE_BYTES` (25 MiB, Cloudflare's per-file limit) raw, which refuses; over `MAX_GZIP_BYTES` (1,000,000, the page's budget) gzipped prints a warning ("reported, not a failure", owner rule "no hard limits", 2026-11-16) and installs; raw sha256 and bytes match.
- **The database read with `node:sqlite`** (`readDatabase`; dynamic import, unflagged from Node 22.13, the engines floor):
  - `application_id`, `user_version`, `integrity_check` and `foreign_key_check`;
  - every table and column of `consortium-schema.mjs`, and no table outside it;
  - meta (schema, format, release, `built_at` = `generated_at`, climates), and each table's count against meta and the manifest;
  - every plant placed, and every placement with a reason;
  - schemas 2 and 3: `meta.ranges_review` is `estimate_not_reviewed`; `meta.climate_grid_manifest_sha256` is a sha256 (an empty value counts as missing) equal to the manifest's `climate_ranges`; every plant has a `plant_climate_status` row; range or Köppen rows only beside a `range_source`;
  - plant ids are UUIDs, and source and photo-page URLs are http(s);
  - invasive rows only in checked countries (`invasive_checked` 1; since schema 4.3 it means a source in the release assessed invasiveness there, GRIIS or ES's `es_catalogo` and `atlas_aloctonas_es`).
- **TRY list and credits:** parsed as the site's build parses them.
- **Release verify:** a real install then runs `uv run canopi release verify <dir>` from canopi-data before any photo. The location is `CANOPI_DATA_DIR`, else `../canopi-data`; a git worktree needs the variable. `CANOPI_DATA_DB` (optional) passes `--db-path` to verify, for a canopi-data worktree whose database lives in the main checkout.

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
  - `countries{ISO code: invasive_checked}` (the database's `countries` table, sorted; `indexProblem` requires it): the page's `#ct-data.countries`, so the guessed country and its "not checked" note are final before the database opens (consortium-page, N2 layout shift);
  - `names{climate: sorted canonical names}`;
  - `images{uuid: /data/consortium/images/…}`;
  - `try_references{sha256, rows, dataset_ids}` and `source_credits{sha256, rows}`;
  - `climate_grid_manifest_sha256` and `ranges_review` (schemas 2 and 3). `install-climate.mjs` refuses tiles of another grid, and `check-built-site.mjs` (through `scripts/consortium-grid-check.mjs`) requires the climate index's grid to equal it with `consortium_grid_check.status` `matched`.
  - With `--out` or `--fixture`, the index goes inside the output instead.
- On a real install, `src/data/`:
  - `try_references.tsv` with its meta;
  - `source_credits.tsv`, byte for byte.
- Photos use v1's code unchanged:
  - Commons and iNaturalist 500 px copies, a 500 ms pause, rate limiting waited out, a 3 MB cap, redirects only to the photo hosts;
  - a failed photo is left out of the index; more than 10% failing stops the install.
- Staging is in `.cache/consortium-install/`, then a rename, with the `src/data/` files put back on failure.
- `verifyInstall(dir, index, { log })` re-checks a served folder against the index: the mark, each database by sha256 and gzip magic (over `MAX_GZIP_BYTES` only logged), photos under 25 MiB, every indexed photo present, and nothing else. `check-built-site.mjs` runs it on `dist/client/data/consortium/`.

Installed now: release `r-255553893fa4f4b4` (canopi-data, schema 4.7: 4.6 `functions.kind` and 4.7 `plant_names.kind`), PP-C 0c, `consortium-v4.r-255553893fa4f4b4.92cc136bb67b.sqlite.gz`, 775,767 B gzipped, names file `names.r-255553893fa4f4b4.8dea68ff9c3a.tsv.gz` 216,695 B gzipped (26,517 names; budget 300,000, reported only), 681 plants, 835 placements, 241 photos (none new), names per climate Tropical 200, Arid 235, Mediterranean 200, Temperate 200. `source_credits.tsv` gains the nine book credit rows of the LLM route (Crawford ×4, Toensmeier, Eierman, Lofthouse, Gehring, Gliessman); `try_references.tsv` 767 rows.
- What moved against `r-bcc417fd89a3147c`: 13 placements one light level (Coffea canephora, Curcuma longa and Xanthosoma sagittifolium Shade → Part shade in Tropical; 10 Part shade → Mostly sun: Anagyris foetida, Bituminaria bituminosa, Ornithopus compressus in Mediterranean, Crotalaria incana in Tropical, Calligonum comosum, Capparis decidua, Piliostigma reticulatum, Salvadora persica, Vachellia caven, Ziziphus nummularia in Arid); 45 new light spans, all AI estimates (`llm-knowledge`), so 670 of 681 plants carry a span; 19 new job entries, all `llm` (4 cited extractions, 15 `llm-knowledge`); 474 primary names replaced in `plant_names` (zh 127, es 87, pt 61, en 51, …; canopi-data's count is 475), 1,804 primaries marked `llm`; corrections c477–c482 (tropical kudzu en/ja/zh, es heather "Brezo común", es tamarisk "Taray", pt "Macaúba"; c483–c514 are uk names, names file only).
- Expectations moved: the scenario golden file re-recorded (10 cases pick other members because Xanthosoma, Ziziphus and Capparis changed light level; the Seville cases and the 200-plant cases move by the new jobs, which also clear 4 "unchecked" plants in the 200-plant Seville lanes, and by the Mediterranean moves to Mostly sun); Kiambu stays 305 of 515 (196 fit, 109 look). Vectors: canopi-data `tests/vectors/range_verdicts.json` at `89a99e9` (sha256 `9866dcaf…`, 169 vectors, release `r-255553893fa4f4b4`; its `export_raw_sha256` names `d18543cb…`, an earlier build of the same release, not the installed `92cc136b…`).
- How it was installed: `CANOPI_DATA_DIR` = the main canopi-data checkout, then `node scripts/install-consortium.mjs <canopi-data>/data/exports/consortium-schema4-staging/r-255553893fa4f4b4`; `canopi release verify` printed OK (681 of 681 plants compared, 241 photos credited).

Previous install: release `r-bcc417fd89a3147c` (canopi-data, schema 4.5 light span after the Q5.4 spot-check, base `r-83a5f9821051c5c3`), the first schema-4 install, `consortium-v4.r-bcc417fd89a3147c.98e1bf66d711.sqlite.gz`, 769,594 B gzipped (3,096,576 raw), names file `names.r-bcc417fd89a3147c.0bfdc009cfe2.tsv.gz` 218,879 B gzipped (26,693 names; budget 300,000, reported only), 681 plants, 241 photos (4 new), names per climate Tropical 200, Arid 235, Mediterranean 200, Temperate 200; 835 placements. `source_credits.tsv` 54 rows, `try_references.tsv` 767 rows (591 DatasetIDs).
- What moved against `r-4db8a127ab860011`: schema 3 → 4.5 (the tables of 4.1 to 4.5, the names file); 8 new Arid shade plants (Adiantum capillus-veneris, Anthriscus cerefolium, Apocynum cannabinum, Berberis aquifolium, Bowlesia incana, Claytonia perfoliata, Galium aparine, Symphoricarpos occidentalis) and Hedera helix placed on the Arid list too; 223 placements moved one light level (151 sun-only placements to Mostly sun, decision 19 in `r-310cd5697c31666b`, and 72 by Q5.4: 62 within their span and 10 Arid full-sun plants out of Shade), 103 of them out of Shade; corrections c453–c476 (light tolerance flags); a light span on 625 plants and a preferred level on 310. GBIF's fetch window is 2026-11-11 03:18 – 2026-11-17 23:57 UTC (`consortium-credits.ts`).
- Expectations moved: kept pools Dakar 87 → 92, Lima 116 → 121, Phoenix 130 → 135 (the 9 new Arid placements); Kiambu stays 305 of 515 (196 fit, 109 look); P1 counts 681 plants; the scenario golden file re-recorded (its palette picker now sorts by id, as its comment said; the Lyon cases also hold Alnus cordata so "2 °C colder" still changes a verdict). Vectors: canopi-data `tests/vectors/range_verdicts.json` at `c25a27f` (sha256 `f38e05bb…`, 169 vectors, regenerated from this export; the copy inside the export folder is an older stamp naming `r-83a5f9821051c5c3`).
- How it was installed: `CANOPI_DATA_DIR` = the main canopi-data checkout (master `c25a27f`, its own `data/`), then `node scripts/install-consortium.mjs <canopi-data>/data/exports/consortium-schema4-staging/r-bcc417fd89a3147c`; the installer's `canopi release verify` printed OK (681 of 681 plants compared, 241 photos credited).

Previous install: release `r-4db8a127ab860011` (canopi-data, sand cherry pH restored, on base `r-c15a216b9663d2fa`), schema 3, `consortium-v3.r-4db8a127ab860011.b4633efa6272.sqlite.gz`, 757,949 B gzipped (2,813,952 raw, unchanged), 673 plants, the same 237 photos, the same names per climate (Tropical 200, Arid 226, Mediterranean 200, Temperate 200).
- What moved in the export: only `plants` (1 row) and `meta` (`built_at`, `release_id`). Prunus pumila var. besseyi (sand cherry) pH 6.6–7.3 → 5.1–8.5, back to its value before `r-c15a216b9663d2fa`; its height max stays 2.0 m. Every other table, every other plant value, `source_credits.tsv` (49 rows) and `try_references.tsv` are identical; `canopi_db_sha256` is unchanged (`387fdcb4…`).
- Expectations moved: none by the data. Only the release pins: the vectors' sha in `install-consortium.test.mjs`, Kiambu's release id in `consortium-pp-b2.test.mjs` (still 305 of 515: 196 fit, 109 look), the P1 message in `consortium-commit0.browser.test.mjs`. Vectors copied unedited from `r-4db8a127ab860011.range_verdicts.json` beside the export (sha256 `b9e39c07…`, 169 vectors); against the previous copy only `source` (release, export file, raw sha) differs. The `range_verdicts.json` inside the export folder is still an older stamped copy (it names `r-c3b3da5b6f36eed3`, as in `r-c15a216b9663d2fa`'s folder), so the copy beside the folder is the one to take.
- How it was installed: as for `r-c15a216b9663d2fa`: `canopi release verify --db-path` by hand from `canopi-data-wt/schema3-last` (`c019546`) against the main checkout's `data/canopi.db`, then `npm run install:consortium -- <export-dir>` with `CANOPI_DATA_DIR` = that worktree and `CANOPI_DATA_DB` = that database; both printed OK (673 of 673 plants compared, 237 photos credited).

Earlier install: release `r-c15a216b9663d2fa` (canopi-data S4, PFAF page values, on base `r-415fcc60773473a4`), schema 3, `consortium-v3.r-c15a216b9663d2fa.9aa73bdaa65e.sqlite.gz`, 757,953 B gzipped (2,813,952 raw, unchanged), 673 plants, the same 237 photos, the same names per climate (Tropical 200, Arid 226, Mediterranean 200, Temperate 200).
- What moved in the export: only `plants` (10 rows) and `meta`. Canna indica (width 1.0 → 0.6 m, edibility 3 → 4), Chenopodium quinoa (edibility 2 → 5), Ericameria nauseosa (pH max 8.5 → 9.0), Opuntia ficus-indica (zone max 10 → 11), Populus tremula (zone min 4 → 2), Prunus pumila var. besseyi (height max 1.2 → 2.0 m, pH 5.1–8.5 → 6.6–7.3), Quercus robur (width 13 → 30 m, zones 6–9 → 4–8, edibility 3 → 4), Solanum lycopersicum (zones 8–11 → 10–12, edibility 4 → 5), Tamarix gallica (zones 6–9 → 4–8, pollinators Insects → Bees), Vigna unguiculata subsp. unguiculata (edibility 2 → 4). canopi-data S4 gave 75 plants their own PFAF page values and added hazard warnings, but schema 3 has no hazards or uses column and most of the 75 are off the four lists or kept the same values, so nothing else in the export changed; `functions` is byte-identical despite the rebuilt `functions.tsv`. `source_credits.tsv` still 49 rows: the `agroforestree` row now carries its rights line ("© World Agroforestry Centre, all rights reserved; one fact cited, no text or data copied") and status `confirmed`; `check-built-site` still counts 41 credited sources.
- Expectations moved: none by the data. Only the release pins: the vectors' sha in `install-consortium.test.mjs`, Kiambu's release id in `consortium-pp-b2.test.mjs` (still 305 of 515: 196 fit, 109 look), the P1 message in `consortium-commit0.browser.test.mjs`. Every kept pool (Lyon 359 …), flags, suggest and browser expectation unchanged. Vectors copied unedited from `r-c15a216b9663d2fa.range_verdicts.json` (sha256 `cede64e8…`, 169 vectors); against the previous copy only `source` (release, export file, raw sha) differs, every verdict is the same.
- How it was installed: as for `r-415fcc60773473a4`: `canopi release verify --db-path` by hand from `canopi-data-wt/schema3-last` (`c019546`) against the main checkout's `data/canopi.db`, then `npm run install:consortium -- <export-dir>` with `CANOPI_DATA_DIR` = that worktree and `CANOPI_DATA_DB` = that database; both printed OK (673 of 673 plants compared, 237 photos credited).

Earlier install: release `r-415fcc60773473a4` (canopi-data Q1, data fixes on base `r-b7fb536f9cfd0700`), schema 3, `consortium-v3.r-415fcc60773473a4.9bb07657bfd9.sqlite.gz`, 757,952 B gzipped (2,813,952 raw), 673 plants, the same 237 photos, the same names per climate (Tropical 200, Arid 226, Mediterranean 200, Temperate 200).
- What moved (canopi-data Q1): toxicity for 88 plants, about 59 "sources disagree" flags, 7 livestock/pet audience rows; `self_fertile` no longer true from PFAF's "not self-fertile"; salt tolerance no longer from PFAF's wind template; frost-tender tropicals and annuals lose PlantAtlas hardiness zones; pH windows widened; full shade removed from open-ground crops (maize, wheat, clover); mycorrhizal type, leaf habit and habit fixed; 122 curator corrections. `source_credits.tsv` 47 → 49 rows (`canopi-knowledge`, internal; `agroforestree`, used), so `check-built-site` counts 41 credited sources. GBIF's fetch window is unchanged.
- Expectations moved: Lyon's kept pool 360 → 359 (Tithonia diversifolia is perennial now, curator correction c377, so the annuals' winter-cold exemption no longer keeps it); every other site's pool, Kiambu's 305 of 515 (196 fit, 109 look) and every flags, suggest and browser expectation unchanged. Vectors 170 → 169: the Nairobi Ballota pseudodictamnus case (`annual.is_annual_null`) is gone because its life cycle is now recorded; every branch is still covered.
- How it was installed: verify ran directly, with no scratch tree: `CANOPI_DATA_DIR` = the canopi-data worktree `canopi-data-wt/schema3-last` (branch `schema3-last`, `c019546`), `CANOPI_DATA_DB` = the main checkout's `data/canopi.db`, then `npm run install:consortium -- <export-dir>`; the installer's own `canopi release verify --db-path …` printed OK (673 of 673 plants compared, 237 photos credited). The same command run by hand beforehand gave the same OK.

Older install: release `r-b7fb536f9cfd0700` (canopi-data D9a, the Arid list), schema 3, `consortium-v3.r-b7fb536f9cfd0700.5e36d6f89487.sqlite.gz`, 757,513 B gzipped (2,809,856 raw), 673 plants, 237 photos (48 new, 1 dropped).
- Four curated climates: Tropical 200, Arid 226, Mediterranean 200, Temperate 200. The 158 new plants are on the Arid list only, so Subtropical, Continental and Boreal borrow the same lists as before (Kiambu stays 305 of 515: 196 fit, 109 look).
- Arid sites read their own list now instead of borrowing 515: kept pools Dakar 270 → 87, Lima 278 → 116, Phoenix 147 → 130; every other site unchanged. Tests that used Arid as the borrowed climate (P5-26e, P5-27b, the s4 BT-1 start case, the s5c zones case and its conflicts() check) use Subtropical; the home note names four climates in all 11 locales; GBIF's fetch window is 2026-11-11 03:18 – 2026-11-15 12:30 UTC.
- Also in it (D9a review): corrections c161–c175 (toxicity raised for ten plants, `nitrogen_fixer` and `height_max_m` fixes), three interactions.
- Over the 1,000,000 B budget is a warning only since that install (owner rule "no hard limits", 2026-11-16); 757,513 B is under it.
- How it was installed: canopi-data's `data/canopi.db` and `data/curated/` had moved on since the release, so `canopi release verify` ran from a scratch tree: `git archive 4e33cb1` (the release commit's `data/curated/`) with the untracked `data/` entries linked in, `CANOPI_DATA_DB` = that tree's link to `data/canopi.db.pre-pfaf-negation` (sha256 `2b4f2a1f…`, the release's database; verify reads `curated/` beside the database path), and `CANOPI_DATA_DIR` = `git archive` of tag `schema3-last` (`e359e7c`; master's checker knows schema 4 only).

Older install: release `r-fcf4307ffd1549b3` (canopi-data D3 core, its rows equal to D8a's `r-ad27260496be31eb`), schema 3, `consortium-v3.r-fcf4307ffd1549b3.e80bc9aa6589.sqlite.gz`, 621,337 B gzipped, 515 plants, the same 190 photos (10df7bf). Installed with `CANOPI_DATA_DIR` the schema3-last worktree, `CANOPI_DATA_DB` the main checkout's `data/canopi.db`. `canopi release verify` accepts only an export of canopi-data's current release, so an older export cannot be installed once a newer release is built; a release that moves only the id gets no new pin, and the website re-pins at the next release whose values or credits move (decision row "Data pins after D8a and D3", 2026-11-15).
- Against `r-f3c6dd8b3c4391be` (D2d): only the `layer_values` month rows changed (D8a): each now carries `scope_hemisphere` and `scope_latitude` (the band it was observed in) beside its country; Details (`views/layers.ts` `scopeText`) names the band. The PFAF month-row test checks the UK country and the band, not an exact scope.
- Kiambu's `countFits` on it: 305 of 515 with Subtropical chosen (196 fit, 109 look; the chosen list only, guests left out since b1b).

Earlier install: release `r-f3c6dd8b3c4391be` (D2d), `consortium-v3.r-f3c6dd8b3c4391be.7be9df0e298f.sqlite.gz`, 620,573 B gzipped, 515 plants (25 `grown_as_annual`).
- Against `r-60ea417b5a15c3aa`, plant fields moved: hardiness_zone_min 131, frost_tender 79, toxicity 74 (Slight 20→57, Moderate 14→39, Severe 2→8), nitrogen_fixer 22, deciduous_evergreen 14, is_annual 5 (Good-King-Henry is perennial now).
- Figures re-pinned on it: seven sites' kept pools (1–4 fewer), the cool-season annual case (Siberian purslane), Kiambu countFits 305 (marker), PP-B39 waited on b3's Slight flag (it passes since b3, 2026-11-15, marker removed).

Before that: release `r-60ea417b5a15c3aa`, schema 3, `consortium-v3.r-60ea417b5a15c3aa.977fc4ceccc7.sqlite.gz`, rebuilt from canopi-data master `94a67a5` for the GBIF credit (`2e195da`).
- Against `r-b958a4239cc68f73` (the ranges rebuild's final rows) only `meta.built_at`, `meta.release_id` and the `gbif_occurrences` row of `sources` (the DOI follow-up sentence removed) differ; DDL and every other table are equal (audited table by table), so every count pinned on `r-b958a4239cc68f73` holds.
- 578,005 B gzipped (`r-b958a4239cc68f73` 578,040 B; `r-01102782139409b5` 568,732 B; schema 2's `r-e0b162087a79eecf` 556,862 B).
- 515 plants (24 `grown_as_annual`), 200 placements per climate (Tropical, Mediterranean, Temperate); 3,605 range rows (7 variables, 56 weak), 8,549 Köppen rows, 34,176 area rows.
- How it was built, in canopi-data with a clean working tree, each command capped: `canopi release build --accept "check:region_two_areas=…"` (the standing accept; 0 fields moved, plants +0 −0; it moves `current` and keeps only current and previous releases), `canopi curate export-sqlite` (default out-dir `data/exports/consortium-v2/`), `canopi release verify <dir>`, then `npm run install:consortium -- <dir>` with `CANOPI_DATA_DIR` set (the worktree), which removed the old database file. Earlier installs, while canopi-data had uncommitted range inputs, ran verify from a clean `git archive` with the untracked `data/` entries linked in, since verify refuses "tracked input changed since the release"; an export built from an older release than canopi-data's `current` is refused too.
- Ranges sampled from canopi-climate grid `04ec85f4…` (v0.2.0), `ranges_review` `estimate_not_reviewed`; WCVP did not match Prunus dulcis (native "unknown").
- The same 190 photos (179 Commons, 11 iNaturalist).

# Gotchas

- Climate names are capitalised in the export and the index ("Tropical") and lowercase on the site ("tropical"). Map them with `zones.ts` (`siteIdOf`, `zoneOfSiteId`), at the edge only: the page's `#ct-data`, guide presets and the correction endpoint. The site's display order (`src/data/climates.ts`) is not the data order: Mediterranean comes before Arid on screen.
- The fixture's `edit` hook runs after meta is filled, and the counts are recomputed after it.
- `scripts/install-consortium.test.mjs` uses the fixture and a stub fetch; it needs no network, `uv` or canopi-data. It also checks that the committed install matches the committed index.

## F1a commit 0 seams

- `types.ts`: `roomValues`/`Room` with `pots` ("Balcony or pots", A8). `Site.room` is a `Room`, but `rooms` (the answers Start offers and the answers a link's `m=` accepts) leaves `pots` out until stream 1 offers it. `ROOM_LIMIT_M` and `suggest.ts` `SIZE_LIMIT` give `pots` the small garden's values until then. Also `views`/`View` (`start | palette | structure`, A6), `confidenceTerms`/`ConfidenceTerm`/`Confidence` (A15), `CellSpan {stratum, from, to}` (moved from `store.ts`, which re-exports it), `AddPreset {job?, cell?, filters?, hint?}` (cell: the span Add opens on; hint: a key with vars, A22), `balanceCheckIds`, `balanceStates`, `BalanceDetail {plants?, families?, months?, vars?}` (what a check's line names) and `BalanceCheck {id, state, n, m, detail, preset, confidence?}` (A3).
- `balance.ts` (exported by `index.ts`): `BalanceContext {climate, location, period, factAt}`, `BalanceRule`, the `balanceRules` registry and `balanceChecks(members, ctx)`. Every check returns `not-checked` until stream 4 fills its rule. Tests: `scripts/consortium-balance.test.mjs`.

## PP-B commit 0a (2026-11-14): what changed

This section supersedes the statements above where they disagree.

- **Link v5** in `state.ts`: `encodeLink` writes `#v=5`. The place keys `k o l w q r h s` are written only with `place: true`, and an `origin` implies the place tick. `linkVersionStatus(v)` returns `current`, `newer`, `unreadable` (versions below 5 included since the owner's 2026-11-17 "No backward compatibility work": there is no `older`) or `absent`. Unknown keys are ignored, and a key with an unreadable value falls back on its own. The decoder reads `m=` through `roomValues`, so `pots` is accepted. `kept`, `crops` and `stage` are not written (PP-B commit 0a' removed them from `ShareState`; Suggest's `seed` option, the current members, replaced `kept` and `crops`). Contract: `scripts/vectors/link-v5.json` (schema `canopi-palette-link/5`) and `scripts/consortium-link-v5.test.mjs`.
- **types.ts**: `rooms` still leaves `pots` out because Start's form is unchanged until b1a. `roomValues` (with `pots`) is the `Room` type and what the codec reads.
- **New modules:**
  - `place.ts` has real bodies: `emptyPlace`, `siteFor` (today's light, soil and water answers passed to `fits()`), a minimal `resolveSoil` and `climateFor`. (Replaced 2026-11-18 by the [site-inputs layer](/modules/consortium-site-inputs.md): `siteOf(inputs)`, `climateFor({ inputs, scenario })`; `resolveSoil` and `siteFor` deleted.)
  - `verdict.ts`, `verdict-line.ts`, `verdict-load.ts`, `years.ts`, `holes.ts` and `weigh.ts` are seams tagged `@public`. b2 writes their bodies.
  - `weigh.ts` (PP-B b3, 2026-11-15, fix rounds 1 and 2): `weighLines(members, ctx, { pending, unchecked })` with `ctx` the `lookup` and `period` of `climateFor`'s context (ignored inside today); family lines at 3 plants and 25 % of m (owner keeps both), m counting the `unchecked` members; the water line from `factAt('water_need', t, ctx.lookup, ctx.period)` grouped by `waterNeed` (exported; drought tolerance High/Medium/Low-None → dry/medium/regular, else moisture use Low/Medium/High; any other value counts as not recorded), only `waterMix` (members: the `vars.regular` plants needing regular water, then the dry) or `waterFew` (under half recorded), else `missing` when any plant has no water need recorded, no all-clear; `'checking'` while a list is pending; `term: 'estimate'` on a borrowed list. `yourPlants` (warned, then the members not shown, then the rest; rows typed `PlantRow`); `sizeLine` was deleted in chunk 3 (h3 G4). Constants stay module-private. `site.ts`'s water check reads drought tolerance and moisture use through `factAt('water_need', t, null, TODAY_PERIOD)` (`well_drained` stays a direct read), with its own dry/wet-site mapping (a different question from Things to weigh's grouping), and like `waterNeed` reads a drought value outside High, Medium, Low, None as not recorded; every site-fit verdict of the 515 real plants over every site was byte-identical before and after (b3 fix round 2). `TODAY_PERIOD` is `periodIds[0]`.
  - `conflicts.ts` flags every recorded toxicity level but None, Slight too (owner: mild is a warning, Moderate and above danger); toxicity never makes `warns()` true, so nothing asks. Since v14 0W-2 R1 the flag carries its `level`, and a Slight flag alone is no second look (`secondLook`).
  - `PlantSource.layerValues` is stubbed in `sqlite-source.ts`.
- **Balance deleted**: `balance.ts`, its types, `BalanceSlot`, `balance.css` and `scripts/consortium-balance.test.mjs` are gone, so the "F1a commit 0 seams" bullet on `balance.ts` above no longer holds.
- **Range verdict vectors**: `scripts/vectors/range-verdicts.json` is a verbatim copy of canopi-data's range verdicts for the installed release (for `r-255553893fa4f4b4`: canopi-data `tests/vectors/range_verdicts.json`, sha256 `9866dcaf…`, 169 vectors; it names the installed release). Its sha, schema and release id are checked against `src/data/consortium-index.json` in `install-consortium.test.mjs`.

### Link v5 contract additions (coordinator review of 0a, 2026-11-14)

- **`o` is always a cell centre.** `snapOrigin` in `state.ts` mirrors the climate grid's cell rule: 0.1° cells, rows counted from the north, columns from 180° W. A point on an edge belongs to the cell south or east of it, and longitudes wrap. `encodeLink` snaps the origin it is given, and `linkOrigin` snaps the `o` it reads, so re-encoding a link never carries a precise point. `consortium-link-v5.test.mjs` checks the snap against `src/lib/climate/grid.ts`.
- **`k` is exactly two upper-case letters.** Anything else (`fr`, `ZZZ`, empty) reads as no country.
- **Duplicate keys: the first is read.** `g` is the exception: it is read once per list, and a list given twice marks the link cut, and since v14 0W-2 R4 a cut link (no `e=1`, a malformed token list, an unknown or repeated `g`) is unreadable: nothing restored, `notice.unreadable` with `cut` as its reason. The old spot and soil keys `l w q r h s` are no keys of v5 (ignored).
- **Height metres are dropped.** `h=higher.650` reads as `higher` and is re-encoded as `h=higher` until CLIM-4.
- **Limits are tests, not vectors.** `MAX_LINK_IDS` and `LONG_LINK` are tested in the test file, because a vector at the token cap would be 12,000 characters.

## PP-B b1a: the invasive tie in suggest.ts (2026-11-14)

Of two candidates that bring the same gain, the suggestion picks the one that is not invasive: with a chosen country checked (`countryStatus` 'checked'; since 4.3, a source assessed invasiveness there), "invasive" means invasive there (`invasiveIn(t, country, true)`); with no country (or one not checked), invasive in any checked country. Unit tests F1a-P12 and F1a-P13 in `scripts/consortium-pp-b1.test.mjs`.

## PP-B b1b: the suggestion's gain on open holes (2026-11-15)

- `suggest.ts` scores **3 per open hole filled** in place of the old cell terms: the open holes of the plants chosen so far (`holes.ts` `holes()` with `pending: false`, kept on the coverage and worked out again after each add), each tested with `fills()`, the one predicate the palette's fillers share. The other terms are unchanged (10 per new job, 6 per new stratum, 4 per phase with nothing to eat yet, 4 per needed second doer of feeds-soil, ground or mulch, 1 per edibility point, −3 for weed potential, −0.5 per unknown site answer; counted in tenths).
- `SuggestOptions.verdicts` and `AlternativeOptions.verdicts` (`HoleContext['verdicts']`, the store's `poolVerdicts` for the page period) feed the holes: a member outside its range for the period fills nothing, so the holes it leaves stay open, and a **candidate outside its range in the page period scores no hole gain** (holes() would not count it once added). `Gain.cells` became `Gain.holes`. Without verdicts nobody is outside.
- `store.suggestMembers` passes the verdicts and, with a site climate and range checks on, waits for them; Swap passes the same verdicts to both `alternatives()` calls, so both rank on the same open holes.
- `holes.ts` is now reached by `suggest.ts` (the `suggest` role) as well as by the palette and verdict code through `index.ts`, so it builds as a chunk they share (commit 1 probed it against check-built-site).
- `matrix.ts` is deleted (PP-C c2): Swap's "Also fills" and "Leaves empty" come from suggest.ts `swapChange`.
- Tests: the `suggest:` and `alternatives:` cases of `scripts/consortium-core.test.mjs`.

## PP-B exit: seeds the suggestion cannot read stay (2026-11-16)

`suggest()` returns every seeded plant: the seeds the pool or the guests hold in tie order, then any seed neither holds (a guest whose list failed, PP-B21, or a plant on no list at hand), in seed order, so a press of Suggest never removes a grower's plant. Before, only the seeds it found came back, and a member of a failed guest list vanished silently (found by the P5-27n rewrite). Unit test "PP-B exit: a seeded plant the suggestion cannot read stays in the palette" in `scripts/consortium-pp-b1.test.mjs`.

## Site-inputs layer and palette goals (PP-C chunk-2 hand-off, 2026-11-18)

- Every rule (range, future, verdict, site fit through `siteOf`, weigh, holes) reads `SiteInputs` from [site-inputs.ts](/modules/consortium-site-inputs.md), never the climate lookup or a stored answer; `VerdictContext` is `{ inputs, period, scenario, canopy }`, `FactAt`'s site is `SiteInputs | null`, and `rangeCheck`, `rangeFit`, `withinRange`, `futureCheck`, `futureSummary` and `siteToday` take inputs.
- Hand-off items: `Taxon.light` (4.5 `sunniest`, `shadiest`, `preferred`, read by `sqlite-source.ts` `lightOf`); `Hole.unchecked` with the "nobody known" titles and `uncheckedLine` (unknown is never a hole); `sourceLine` estimate labels (`derived` "estimate, from", `llm` "AI reading of" / "AI estimate, no source").
- `holes.ts` `laneCounts(ctx, goals)`: each job and light level's plant count per time step, and each job's thin year spans below the palette goal `plantsPerJob` (default 2, `DEFAULT_GOALS` beside the site inputs); a lane is never capped at a count.
- The golden scenario file `scripts/fixtures/consortium-scenarios.json` (32 cases, run by `scripts/consortium-scenarios.test.mjs`, recorded by `scripts/consortium-scenarios.mjs --record`).

## v14 pf commit 0W (2026-11-18)

0W-1 (behaviour-preserving seams for the pf streams; spec `.local/consortium/v2/ppc/pf/v14-spec-update.md` section 4): `holes.ts` thin-spot and next-target helpers, `verdict-line.ts` lines for them and for site edits, `site-inputs.ts` `siteEditsOf`/`sameEdits`/`plantsPerJobOf` and the pots input, link v5 keys `f b p i d j` and the requires key `u=`, the store's `plantsPerJob`, `suggestedIds`, `removeMembers`, `setSiteEdits`, `openFigure`, and the one list fold `views/kit/more.tsx` (`fold.ts`). Then the four rule commits of 0W-2, each with a unit test in `scripts/consortium-pf-0w.test.mjs` and a re-recorded scenario golden:

| Rule | What changed |
|---|---|
| R1 | `conflicts.ts`: the toxicity flag carries `level`; Slight alone is no second look. |
| R2 | `verdict.ts`/`future.ts`: the grower's watering answer sets the dryness note: rain or no answer "drier", first-years the same note in "water it the first years" words (`*DryFirst`, `pastDrierFirst`), all-year none (`pastDrierWatered`); the fit never moves. The old `dry_months` site path is deleted. |
| R3 | soil pH and drainage are hints, never a level (`setsLevel` false for `soil-ph`, `drainage` and water/spot); `site-inputs.ts` `soilPhOf` (null in pots) feeds the check from the map or a soil test (basis `soil-map`/`soil-test`); `conflicts.ts` `HINT_KEYS` keep hints out of the misfit flag. |
| R4 | link v5 drops `l w q r h s` (k and o stay); spot and soil are deleted everywhere; a cut link is unreadable and restores nothing (`cut` only the reason). |

## Chunks 3 and 4 (PP-C pf-d, pf-e, pf-f and h3, 2026-11-18 to 2026-11-19)

- **Figures** (see [figures panel](/modules/consortium-figures.md)): `site-change.ts` `limitStatus` (one status per `LIMIT_IDS` line, `LimitState` limits / free / unchecked, `LimitStatus { line, state, n, period, today }`), `limitsOf` (the limiting lines, most first), `warmthView` (warmth over the year as every row says it), `drierFrom` (each plant's first drier period), `rangeMoves`, `windRecorded`; `site-change-line.ts` `nightsSidesLine` (M3: each side only above zero, keys `nightsWarmer` / `nightsColder` / `nightsSidesBoth`), `warmthLine`, `holdsWater`, `textureLine`, `named` (the size rule over `types.ts` `NAMED_PALETTE` 40 / `NAMED_GROUP` 12), `LIMIT_LINES`.
- **Hold predicates in `verdict.ts`** (M29, M30): `laterLossOf(now, laters)` (the first later period in which a climate factor is worse than today, factor by factor), `holdStatesOf(rule, taxa, ctx, period)` and `holdCounts(states, ids)`. The views reach them through the loaded rule (`verdict-load.ts` `VerdictRule` gained `holdStates`, `laterLoss`, `holdCounts`, beside `verdicts` and `holdsBy`), so `verdict.ts` stays in its own chunk; `index.ts` does not export `verdict.ts`.
- **Words in `verdict-line.ts`** (pf-f, h3 G4): `keepLine(now, lost, year)` (counts a later second look as well as outside); `shortWhy` / `shortLine` (`consortium.line.short.*`, Many's rows); `nearness` and `ranged` exported; `drainageLine`; `swapYearsLine` (Swap's years against the member's); `candoLine` (Details' "What you can do" rows); `gapLines` with the `gapLeaves<Form>` spans (Always, First, AfterMonth, After, FromMonth unboarded, Between on the boards: spec A29); `rainFromLine` ("recorded from N mm", one neutral form per language: A30) and `rowRainLine(t, aridityIndex)` (a Find row's rain words, dryland only; `views/rows.tsx` `rowRain`); `holeChangeLines` says a new thin spot (`consortium.line.thinNew`, M44), so a bulk remove names new thin spots only; a serious conflict carries the danger level on its flag line (M31, `views/kit/flags.ts`).
- **Formats** (`src/islands/consortium/format.ts`): `formatKm` (unit-formatted kilometres, Details' neighbour soil fill).
- **Tests**: `scripts/consortium-said.mjs` is the shared `said()` helper for the words tests.
