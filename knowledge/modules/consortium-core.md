---
type: Module
title: Consortium core
description: Consortium v2 core seams (types, PlantSource, load failures, the P5 range rule and nearest-list placements, the future and lazy marks seams; native and soil moved to P5.2), the rules S1 ported, and the format 4 schema 3 installer that writes the gzipped SQLite export, its photos and src/data/consortium-index.json.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:40:01Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-12T22:03:48Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:1dc4e5d47b9db095
    last_modified: 2026-11-13T03:03:27Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:ece36f858fa9cd4d
    last_modified: 2026-11-12T12:34:53Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:7e07bcd15fe69b79
    last_modified: 2026-11-13T04:15:18Z
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
    digest: sha256:9de8b0593be83710
    last_modified: 2026-11-12T18:47:57Z
  - id: consortium-schema-mjs
    resource: ../../scripts/consortium-schema.mjs
    title: scripts/consortium-schema.mjs
    digest: sha256:709da70d228db8ee
    last_modified: 2026-11-12T10:10:38Z
  - id: make-fixture-mjs
    resource: ../../scripts/fixtures/consortium-v2/make-fixture.mjs
    title: scripts/fixtures/consortium-v2/make-fixture.mjs
    digest: sha256:5b18845ec1cf0fe5
    last_modified: 2026-11-12T10:10:38Z
  - id: readme-md
    resource: ../../scripts/fixtures/consortium-v2/README.md
    title: scripts/fixtures/consortium-v2/README.md
    digest: sha256:0efdd486d709e5d0
    last_modified: 2026-11-12T09:10:58Z
  - id: consortium-index-json
    resource: ../../src/data/consortium-index.json
    title: src/data/consortium-index.json
    digest: sha256:77531bebff7b561b
    last_modified: 2026-11-12T18:47:57Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:4d0d993f22f613c1
    last_modified: 2026-11-12T09:10:58Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:74e257618f1b4271
    last_modified: 2026-11-13T03:45:07Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:ea2a468fa5385fb2
    last_modified: 2026-11-11T04:31:48Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:761369e169c313b5
    last_modified: 2026-11-13T03:45:07Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:872f411989736b65
    last_modified: 2026-11-11T19:27:15Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:e9e13f5e075ab535
    last_modified: 2026-11-13T03:30:17Z
  - id: range-ts
    resource: ../../src/lib/consortium/range.ts
    title: src/lib/consortium/range.ts
    digest: sha256:f54049bef226d615
    last_modified: 2026-11-12T11:43:06Z
  - id: placement-ts
    resource: ../../src/lib/consortium/placement.ts
    title: src/lib/consortium/placement.ts
    digest: sha256:8ca130589550dad0
    last_modified: 2026-11-13T04:15:18Z
  - id: future-ts
    resource: ../../src/lib/consortium/future.ts
    title: src/lib/consortium/future.ts
    digest: sha256:7052481477ebbf44
    last_modified: 2026-11-12T11:43:06Z
  - id: marks-ts
    resource: ../../src/lib/consortium/marks.ts
    title: src/lib/consortium/marks.ts
    digest: sha256:5e2b3d9eec5925f6
    last_modified: 2026-11-12T12:34:53Z
  - id: consortium-p5-seams-test-mjs
    resource: ../../scripts/consortium-p5-seams.test.mjs
    title: scripts/consortium-p5-seams.test.mjs
    digest: sha256:8df19ba0a8094188
    last_modified: 2026-11-12T12:34:53Z
  - id: mark-providers-ts
    resource: ../../src/lib/consortium/mark-providers.ts
    title: src/lib/consortium/mark-providers.ts
    digest: sha256:a4f658dd31fb03d3
    last_modified: 2026-11-12T12:34:53Z
  - id: range-marks-ts
    resource: ../../src/lib/consortium/range-marks.ts
    title: src/lib/consortium/range-marks.ts
    digest: sha256:363e8ac83e5adc7c
    last_modified: 2026-11-12T10:39:15Z
  - id: future-marks-ts
    resource: ../../src/lib/consortium/future-marks.ts
    title: src/lib/consortium/future-marks.ts
    digest: sha256:dc7162e2c1e66dbb
    last_modified: 2026-11-12T11:43:06Z
  - id: consortium-p5-seams-s5b-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5b.test.mjs
    title: scripts/consortium-p5-seams-s5b.test.mjs
    digest: sha256:adcfcb04178ce0cd
    last_modified: 2026-11-12T22:04:52Z
  - id: consortium-p5-seams-s5c-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5c.test.mjs
    title: scripts/consortium-p5-seams-s5c.test.mjs
    digest: sha256:04d3b01941ef038b
    last_modified: 2026-11-12T14:10:09Z
  - id: consortium-p5-seams-s5d-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5d.test.mjs
    title: scripts/consortium-p5-seams-s5d.test.mjs
    digest: sha256:1cca1bb0a2547f15
    last_modified: 2026-11-12T11:43:06Z
  - id: consortium-p5-seams-s5e-test-mjs
    resource: ../../scripts/consortium-p5-seams-s5e.test.mjs
    title: scripts/consortium-p5-seams-s5e.test.mjs
    digest: sha256:ad3e2e1099d1ee6c
    last_modified: 2026-11-12T12:34:53Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:e4f1d144fc4ece03
    last_modified: 2026-11-12T09:10:58Z
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
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:f179c97c17793cef
    last_modified: 2026-11-12T10:39:15Z
  - id: consortium-p5-ranges-test-mjs
    resource: ../../scripts/consortium-p5-ranges.test.mjs
    title: scripts/consortium-p5-ranges.test.mjs
    digest: sha256:97936e9cc8c33da5
    last_modified: 2026-11-13T03:45:14Z
  - id: fold-ts
    resource: ../../src/lib/consortium/fold.ts
    title: src/lib/consortium/fold.ts
    digest: sha256:bfbb7316b150433b
    last_modified: 2026-11-13T03:03:27Z
  - id: zones-ts
    resource: ../../src/lib/consortium/zones.ts
    title: src/lib/consortium/zones.ts
    digest: sha256:422e877a817622b9
    last_modified: 2026-11-13T03:45:07Z
  - id: nearest-ts
    resource: ../../src/lib/consortium/nearest.ts
    title: src/lib/consortium/nearest.ts
    digest: sha256:051bd530078fc159
    last_modified: 2026-11-13T03:45:07Z
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
| [types.ts](../../src/lib/consortium/types.ts) | `SCHEMA_VERSION` 3, `APPLICATION_ID` 0x43434F4E. Value lists: `climateZones` (capitalised as exported), `regions`, `locales`, `phases`, `strata`, `roles`, `functionIds`, `interactionTypes`, `severities`, `toxicityLevels`, `layerFields`, `layerKinds`, `months`. Site answers `lights`/`soils`/`waters`/`rooms`, each with `unsure` (A7). Records: `PlantId` (the plants.id UUID, never the integer `plant`), `Placement`, `Taxon` (one plant in one climate; `from?` marks a guest, A9), `Traits`, `Warnings`, `Interaction`, `Reason`, `LayerValue`, `Details`, `Labels`, `SourceInfo`, `Matrix`/`MatrixCell` (empty: `gap` or `misfit`), `Flag`. View shapes for S2–S4 (review C5): `Verdict`, `FitReason` (room: kind `wild_height` is advisory, verdict 'fit' (owner request 2026-11-12), "height not recorded"), `Fit`, `JobId`/`jobIds`, `CellRef`, `Alternative` (`alsoFills`, `leavesEmpty`), `JobGap` (missing phases), `ShareState`, `LinkNotice` (`unknownCount`, `cut`, `long`), `DecodedLink`; `Matrix.unplaced` ("No layer yet"). Schema 2 (P5 commit 0): `Taxon.climate: TaxonClimate | null` (`tminCold`, `tmaxWarm`, `aridity` as `ClimateRange {low, median, high, count, basis}`, `cells`, `nativeShare`; null = "range not recorded"), `Taxon.areasKnown` (WCVP matched; false = native "unknown"), `Taxon.placedFrom?`/`estimate?` (S5c), `Details.koppen: KoppenShare[]` (largest first), `SourceInfo.schemaVersion` 2 with `climateGrid` and `rangesReview`. P5 seams: `SiteLookup`/`SitePeriod` (a structural mirror of the climate reader's lookup; store.ts checks the reader's type stays assignable, since the core may not import `src/lib/climate`), `SiteLocation {lat, lon, source: 'geo'|'search'|'map'|'link', label?, lookup}`, `scenarios`/`Scenario`/`DEFAULT_SCENARIO` ('ssp245'), `markKinds`/`Mark {kind, key, vars?, severity: 'note'|'warning'}` E6 commit 0 adds types with no reader yet (ADR-6, [placement origin and factAt](/decisions/consortium-placement-origin-and-facts.md)): `PlacementKind`, `PlacementOrigin`, `SiteFitMessage`, `FactKey` (`life_cycle`, `cold_limit`, `heat_limit`, `water_need`), `FactValues`, `FactAt`. |
| [fold.ts](../../src/lib/consortium/fold.ts) | `fold(text)`: the one name fold for search (lowercase, ß→ss, œ→oe, æ→ae, combining marks dropped after Latin, Greek and Cyrillic letters only, so kana voicing and Hangul stay); a leaf re-exported by `index.ts`; moved here unchanged from the island's `data/search.ts` in E6 commit 0 so Start's crop search can share it (E6 K1). |
| [source.ts](../../src/lib/consortium/source.ts) | `PlantSource`, as in design check §4: `info`, `countries`, `pool`, `interactions`, `placements`, `names`, `details`, `labels`, `cellCounts` (a test oracle). (`nativeIn(l3)`, the plant_areas reader for native here, was removed before the P5 push with the other S5e stubs; P5.2 restores it from `0801024`.) `loadFailures`: `too-old`, `wasm-blocked`, `wasm-fetch` (sqlite3.wasm did not arrive; review L1), `fetch`, `stale`, `damaged`, `schema`, one per §5 screen |
| [zones.ts](../../src/lib/consortium/zones.ts) (E6 R1) | The one place the climate-zone order (`climateZones`, declared in types.ts, canopi-data climates.ord) and the site-id mapping are read from: `siteIdOf(zone)` ('Temperate' → 'temperate'), `siteIds` (zone order, exact tuple type), `zoneOfSiteId(id)` (any case, trimmed; null when not a zone), type `SiteId`. `src/lib/correction.mjs` derives `CLIMATES` from it and maps posted ids with `zoneOfSiteId`; `src/data/climates.ts` type-checks its ids against `SiteId` but keeps the site's display order (Mediterranean before Arid, pinned by `homepage.test.mjs`); the installer keeps a plain-node copy (`CLIMATE_ZONES`). `scripts/consortium-zones.test.mjs` checks all four agree. Core callers still mapping with `.toLowerCase()` (state.ts `zoneOf` and the link's `c`, range-marks.ts) move to it in later chunks |
| [nearest.ts](../../src/lib/consortium/nearest.ts) (E6 R1) | `NEAREST_LISTS`, the nearest-list table: a leaf (imports only types) read by placed.ts and placement.ts, so placed.ts no longer imports placement.ts (cycle C1); placement.ts re-exports it |
| [index.ts](../../src/lib/consortium/index.ts) | Re-exports types, source and canopi-file (S4's, exported now so S4 never edits index.ts). Stream S1 adds the rule exports here. |
| [canopi-file.ts](../../src/lib/consortium/canopi-file.ts) | S4's `.canopi` writer for the app (format v9, canopi `0c425fb07`): `canopiFile(members, { name, description, at })` returns the JSON text of an empty design whose `consortiums` hold one entry per member (`target {kind: 'species', canonical_name}`, its `stratum` or `unassigned`, `start_phase`/`end_phase` 0–6; app default `unassigned` 0–2), deduplicated by canonical name, with `plants: []` (checked at P2 hand-offs: `PlacedPlant` requires a map `position` the tool does not have, and the app's consortium sync (`app/consortium/workflow.ts` at `0c425fb07`) only adds entries for placed plants and never removes these, so the entries survive until the reader places the plants); `canopiFileName(name)` makes a safe `<name>.canopi`. Pure. Checked in `scripts/consortium-canopi-file.test.mjs` and BT-9 against the app's vendored format, [scripts/vendor/canopi-design-format/](../../scripts/vendor/canopi-design-format) (canopi `0c425fb07`, AGPL header, test-only), with its `validate.mjs` |
| [site-climate.ts](../../src/lib/consortium/site-climate.ts) (P5 S5b) | `siteClimate(lookup)` → `{state: sea \| polar \| borderline \| coast \| ready, today, zone, near, suggested}`, `koppenZone`, `BORDERLINE_C` 0.5; exported through index.ts. state.ts holds the link's `o=` (`encodeLink(…, { origin })`, `linkOrigin`, `cellCentre`); see [Consortium location step](/modules/consortium-location.md) |
| [site.ts](../../src/lib/consortium/site.ts), [conflicts.ts](../../src/lib/consortium/conflicts.ts), [jobs.ts](../../src/lib/consortium/jobs.ts), [matrix.ts](../../src/lib/consortium/matrix.ts), [suggest.ts](../../src/lib/consortium/suggest.ts), [state.ts](../../src/lib/consortium/state.ts) | Stream S1's rules, exported from `index.ts`: three-valued site fit (the room answer is advisory, owner request 2026-11-12: the matrix layers are relative sun exposure, not heights, so a plant taller than a small (6 m) or large (12 m) garden fits with reason kind `wild_height` and never blocks a cell, flags, asks or hides in Add; only the suggestion leaves it out, `tallerThanRoom`, while light, soil and water still misfit); conflicts and invasive records, and the member flags (`FlagContext`, `flagsFor`, `flagsOf`, `asks`; in conflicts.ts since E6 R1, so the store's flags reach no suggestion code; they call `fits()` directly); the six jobs and their gaps per phase; `buildMatrix` (4 strata × 7 phases); the greedy suggestion and Swap list; the `#v=4` share link (`encodeLink`, `decodeLink`, `isLongLink` over 2,000 characters, `readPreset` for guide links); `zoneOf(code)` in `state.ts` is the one climate-code lookup (the island's memory.ts and main.ts import it) |
| [range.ts](../../src/lib/consortium/range.ts), [placement.ts](../../src/lib/consortium/placement.ts), [future.ts](../../src/lib/consortium/future.ts), [marks.ts](../../src/lib/consortium/marks.ts), [mark-providers.ts](../../src/lib/consortium/mark-providers.ts) | P5 seams, each filled by one stream (`.local/consortium/v2/p5-owners.md`). S5c (built): `siteToday(site)` (the lookup's historical 1991–2020 period, null without a site climate; its own module `site-today.ts`, re-exported by range.ts); firstPlaced and placeFor live in `placed.ts` (re-exported by placement.ts) so the first run carries only `NEAREST_LISTS` (in the leaf `nearest.ts`, E6 R1) and `hasPlants`; `rangeCheck(taxon, site)` → `{verdict, sides, beyond, aridity, coolSeason}` or null, `rangeFit` → 'inside' \| 'edge' \| 'outside' \| 'unknown' (owner answer 2, schema 3 ranges: coldest-month minimum against the plant's tmin_cold low (cold limit) and high, the year's warmth `yearMeanC` = (tmean_cold + tmean_warm)/2 against tmean_year low (side 'cool', perennials only: Nairobi 19.35 °C is too cool for cacao, low 21.4), a heat-demanding annual's summer, the site's warmest-month mean against tmean_warm low (side 'summer', `applies: needsSummerHeat`: an annual whose tmean_warm low is at or above `HEAT_DEMAND_C`, 18 °C, as the chill rule, coordinator decision 2026-11-12, since one warmest-month value says nothing about the season length in equatorial highlands; taro, ginger, turmeric and sweet potato are "summer too cool" at Rovaniemi, while lettuce, maize, onion, carrot, cabbage, garlic, leek and beet, below 18, never get the side at Quito or Bogotá; perennials ignore the row), warmest-month maximum against tmax_warm high (a heat limit, Q99); a weak row (`ClimateRange.weak`, a disputed limit: TreeGOER stricter by more than 4 °C, the looser bound kept) is compared as any row and never softens a verdict (coordinator decision 2026-11-12: the doubt is only that the bound is too lenient); the bounds are one table, `RANGE_BOUNDS` (side, plant range field, end, site value function, `applies(taxon)`; `slotCheck(taxon, slot)` runs them on one slot; `HOT_BOUND` is its hot row, a plain constant so future.ts reaches it without a module-level call, which would pull the rule into the island's main chunk), and the export variables they read are one list, types.ts `RANGE_VARIABLES` (tmin_cold, tmax_warm, tmean_year, tmean_warm, aridity; sqlite-source.ts builds its query from it); `boundPassed(taxon, bound, slot)` is one bound against one slot; the mild side applies only when `canNeedChill(taxon)`, tmin_cold high below `CHILL_CEILING_C` 18 °C, the export's own rule (canopi-data docs/plant-climate-ranges.md; the Köppen A/C bound), so cacao 24.1 and cassava 24.2 are never "edge" at Manaus or Singapore (decision row "Climate ranges fixed before the P5 push"); passed by up to `RANGE_MARGIN_C` 2 °C 'edge', by more 'outside'; one comparison owns the rule, `passes(value, bound, 'below' | 'above')` → 'inside' \| 'edge' \| 'beyond', in hundredths of a degree, since site values carry one decimal and ranges two, so 9.8 − 7.8 is exactly the margin (future.ts takes the same one for too hot); no range 'unknown', never filtered; aridity 'drier' \| 'wetter' \| 'inside' \| 'not-checked' (site null, ice) \| 'unknown', a mark only); `withinRange(pool, site, keep = [])`: the pool without the outside plants except `keep`, the same array without a site climate. `placeFor(placements, zone, nearestOrder)` → `{zone, placement, estimate}`: own placement, else the first of `NEAREST_LISTS` (Subtropical/Arid → Mediterranean, Tropical, Temperate; Continental/Boreal → Temperate, Mediterranean) marked estimate, else null; `firstPlaced` is the shared rule (placeFor and `PlantSource.borrowed` both call it); `hasPlants(zone, curated)`: curated or a nearest list is. `placementZone(t, climate)`: the list a plant's placement, reasons and climate months come from (`placedFrom`, else a guest's `from`, else the climate); Details queries `details()` with it, since only curated lists have `placement_reasons` and climate-scoped `layer_values` (pre-push review 1: on a borrowed climate Details had queried the visitor's climate and always showed no reasons, live since P2; unit test in `consortium-p5-seams-s5c.test.mjs`, browser spec P5-17b). An annual (`isAnnual`: `traits.is_annual`, or `traits.grown_as_annual`, schema 3's flag for crops grown as annuals that is_annual misses, onion, garlic, carrot, cabbage, beet, leek, potato; decision row "Growing months"; the fixture's onion carries it) is never checked against its coldest-month minimum, on either side, nor the year's warmth (the one switch is `checksWinter(taxon)`, which every winter-side bound reads; cool-season annuals skip too until the owner answers whether their coldest month should be checked) (owner, decision row "Annuals skip the winter-cold check"; future.ts checks only heat, so it needs nothing), and its marks off chips (kind 'unknown', state `annual`) claim no season (owner, decision row "Growing months" 2026-11-12: the USDA growth period classes 18 of 77 annuals and calls turnip and rye warm-season; reviewed crop growing bands come in a later release): `range.annualShort` "annual" on rows and in Add (a short tag: the sentence overflowed phone rows, walk-through F1), `range.annual` "An annual, re-sown each year: its winter cold is not checked." in Details. An annual beyond its heat range (past Q95 by more than the margin; `coolSeasonOf`) is not outside: `coolSeason` true, no hot side, and its marks are kind 'season' (state `cool`) `range.coolSeason` in Details ("Too hot in summer here: grow it in the cool season.") and `range.coolSeasonShort` on rows and in Add, instead of the annual note; within the margin it is 'edge' as any plant (decision row "Climate ranges fixed before the P5 push"). Real export `r-b958a4239cc68f73` (the same rows on `r-60ea417b5a15c3aa`) at the design check's 14 sites (withinRange counts, pinned in `consortium-p5-seams-s5c.test.mjs`, the site means passed for the warmth bounds): Lyon 360, Dakar 274, Lima 282, Hanoi 293, Montreal 182, Nairobi 164, Perth 176, Seville 198, Oslo 236, Manaus 199, Phoenix 150, Brisbane 336, Yakutsk 72 (annuals only), Chicago 255 (on `r-01102782139409b5`: 349, 263, 273, 286, 177, 163, 176, 198, 236, 199, 134, 333, 59, 255); 56 weak rows (43 tmin_cold, 13 tmean_year), all compared as firm bounds; the owner's diagnosis expectations (Nairobi cacao and coconut outside with a cool year, Manaus cacao and cassava within, Seville olive, rosemary, almond, fig, pomegranate within and olive not too hot by 2071–2099, Riyadh fig within and jujube, pomegranate, moringa edge, Minneapolis apple within and mango outside, Rovaniemi fig outside and taro and ginger summer too cool, Singapore lowland tropicals never mild, potato and carrot not outside there, onion not outside at Harbin) are the acceptance test in `consortium-p5-ranges.test.mjs`, on sites from `scripts/fixtures/consortium-ranges/sites.json`; the same file holds stream E2's scenario tests, written expectations first and recorded as todo tests naming their known limit, with no rule change (a weak row never softens a verdict; a margin wide enough would gut the cold check): Scots pine at Yakutsk (site pinned in sites.json from the canopi-climate v0.2.1 vectors `scripts/fixtures/climate/lookup.json`, checked against them) is outside today (cold and cool; tmin −39.8 °C against a weak Q05 of −31), and fig, jujube and pomegranate at Riyadh are too hot by 2041–2070 SSP2-4.5 (tmax 44.7 °C against heat bounds 42.6, 41.5, 41.3); a todo that starts passing shows as a passed todo and is removed then; every real site now keeps some plant, so the browser specs show "nothing fits" at a synthetic 46 °C summer. `futureCheck(taxon, site, scenario)` (S5d, filled: see [future.ts](../../src/lib/consortium/future.ts) below); S5e (native here, soil likely) is not in P5: its stubs `native.ts` `nativeHere`, `soil-likely.ts` `likelyFor` and `native-marks.ts` `nativeMarks`, with `MarkContext.source`, were removed at the pre-push review (3); P5.2 restores them from `0801024` (list in `scripts/consortium-p5-seams-s5e.test.mjs`). Marks: `Mark {kind, key, vars, severity, state?}` (`state` is rendered as `data-mark-state`), `markSurfaces` 'chip' \| 'row' \| 'add' \| 'details', `MarkProvider = (taxon, ctx, surface) => Mark[]`, `plantMarks(taxon, ctx, surface, providers = [])` concatenates the loaded providers. The providers live in their own files, [range-marks.ts](../../src/lib/consortium/range-marks.ts) (S5c), [future-marks.ts](../../src/lib/consortium/future-marks.ts) (S5d) and [site-marks.ts](../../src/lib/consortium/site-marks.ts) (site answers: on a dry site, drought tolerance Medium, site.ts reason note `dry_months`, kind 'water', `water.dryMonthsShort` on rows and Add, `water.dryMonths` "Needs watering in the dry months." in Details; None and Low stay misfits; in a small or large garden a plant taller than the room, reason kind `wild_height` (`tallerThanRoom`), kind 'room', `room.tallShort` "grows to {m} m: prune" on rows and Add, `room.tall` "Grows to {m} m: keep it pruned, or pick a smaller plant." in Details; the height to a tenth, as catalog heights are converted feet such as 13.716; on the island path, imported by `marks.ts`), the first three imported only by `mark-providers.ts`, the lazy chunk `loadMarkProviders()` imports (once); none is exported from `index.ts`, so the first run never holds them (Rollup puts a module in the main chunk if the main entry reaches it statically, even unused). `needsMarkProviders(ctx, curated)`: true with a site location or a climate the export does not curate; the site answers' marks (`site-marks.ts`, reading `MarkContext.site`) are on the island path instead, appended by `plantMarks` with or without the providers, so a dry site or a sized room alone loads no P5 chunk (coordinator review of the ranges stream, item 7; about 0.2 KB on the first run, 41.8 of 42 KB). `PlantSource.borrowed(zone, order)` ([source.ts](../../src/lib/consortium/source.ts)): an uncurated climate's plants from its nearest lists, marked estimate; `pool(c)` of a climate not in `info().climates` returns `borrowed(c, NEAREST_LISTS[c])`. S5c's body of `borrowed` in `sqlite-source.ts` reads each curated list of the order once (the same cached pools), keeps every plant once, placed as in the first list of the order that has it (`{...taxon, placedFrom, estimate: true}`), sorted by name, cached per climate; an order with no curated list gives `[]` ("Not covered yet"). `store.loadPool` is unchanged. [range-marks.ts](../../src/lib/consortium/range-marks.ts) (S5c, keys written out as literals): with a site climate 'outside' (warning) and 'edge' (note) with short words on chips (`range.outsideShort`, `range.edgeShort`) and, in Details, the cultivation-included / not-reviewed wording plus one `range.side.cold|mild|cool|summer|hot` line per bound passed (after a bound on a weak row, a `range.disputed` line, state `disputed`, "Sources disagree on this limit; TreeGOER puts it stricter.", no number since no TreeGOER value is exported; after a bound whose `lowSource`/`highSource` is `treegoer_ranges`, stricter than the thinned GBIF cells, a `range.source.treegoer` line, state `source`, crediting TreeGOER) with the site and recorded values to the hundredth the verdict compared ("mostly recorded down to / up to", Q05/Q95); 'unknown' (`range.unknown`); 'unknown' on chips `range.unknownShort`; aridity `range.drier`/`range.wetter` as kind 'aridity' (not on chips, never counted as edge) and `range.aridityNotChecked` in Details; 'estimate' on a borrowed plant with or without a location (`estimate.short` on chips, `estimate.fromMediterranean|Tropical|Temperate` elsewhere), and without a site climate a second 'estimate' mark `estimate.noSite` (state `no-site`, not on chips). Each stream's seam tests are its own file, `scripts/consortium-p5-seams-s5b/c/d/e.test.mjs` (shared inputs in `consortium-p5-fixtures.mjs`); `consortium-p5-seams.test.mjs` pins the shared marks pipeline and where the host views mount each slot |
| [future.ts](../../src/lib/consortium/future.ts), [future-marks.ts](../../src/lib/consortium/future-marks.ts) | S5d, the future climate check (decision row "P5 engineering choices"; projections: constrained CMIP6 ensemble changes, Beck et al. 2023, on the CHELSA v2.1 1981–2010 climate): `futurePeriod(taxon)` is the latest period the phases reach (phase_end ≥ 3 → '2041-2070', climax → '2071-2099', earlier or unplaced → null, "today's climate only"); `futureCheck(taxon, site, scenario)` → `{period, verdict 'inside'\|'edge'\|'outside'\|'already', why, already, agree, of, coolSeason, warmEnough, drier}` or null (no lookup, no slot for the chosen scenario, no range, or no heat bound: aridity alone never makes a loss, so "not checked"). One reason makes a loss: too hot = slot warmest-month maximum > `tmaxWarm.high` + range.ts `RANGE_MARGIN_C` (2 °C), through range.ts `HOT_BOUND` and `boundPassed`; an annual too hot is never a reason (`coolSeason` true, the add/details mark kind 'season' `future.coolSeason`, nothing on chips or rows); aridity is a note, never a reason, as today (walk-through 2 N3: at Seville 29 of 39 "outside by 2041–2070" were so on dryness alone): `drier` when range.ts `aridityFit` (the one owner of the aridity rule, today's `rangeCheck` reads it too) gives 'drier' in the chosen slot and not today, with any verdict; an annual already too hot today gets no `coolSeason` from the future check (today's mark says it once); `warmEnough`: today beyond the year's warmth low (an annual: its summer-warmth low) and the chosen slot beyond no bound (`slotCheck`), said positively, `future.warmEnough` (add/details) and `future.warmEnoughShort` (chip/row), kind 'future', state `warm`; edge = above Q95 within the margin; warm winters never checked. A reason counts only as a change from today (the 'historical' slot): `already` lists the bounds already crossed today, `why` only new ones; no new reason and no new heat edge but some already → verdict 'already' (with heat the only reason, 'already' and a new reason cannot both hold). Agreement: for outside, scenarios outside for at least one of `why`; otherwise scenarios not outside. `futureSummary(taxa, site, scenario)` puts each member in one place: `periods[{period, checked, outside, heat, drier}]` (n of m; `drier` lists the period's plants with the note, any verdict, outside the counts, and the panel skips an n of m with no m), `already{heat}` (verdict 'already'), `todayOnly`, `notChecked`, plus `checks` (each checked plant's FutureCheck, which the panel lines read); `available` false when the site has no future slot. `futureMarks` (lazy provider): with a location and verdict outside a note (ink) `future.mark.heat` on chip/row, `future.long.heat` with scenario and agreement on add/details; edge only on add/details; 'already' gets no outside mark (today's range mark covers it); `drier` adds, with any verdict, `future.drierShort` ("drier by …: may need watering", rows) or `future.drier` (with the scenario, add/details), state `drier`, never on chips (today's aridity mark is not on chips either). Real-export counts (`r-01102782139409b5` and, unchanged, `r-b958a4239cc68f73`, heat limit at Q99), whole lists of 200, SSP2-4.5 ([consortium-p5-seams-s5d.test.mjs](../../scripts/consortium-p5-seams-s5d.test.mjs), sites from `canopi-climate lookup` in `scripts/fixtures/consortium-future/sites.json`): Lyon (Temperate) 0/101 by 2041–2070 (1 drier) and 0/33 by 2071–2099, already 1 hot, 65 short-lived; Manaus (Tropical) 0/110 and 0/31; Seville (Mediterranean) 14/102 and 6/25, all too hot, already 2 hot, with the watering note on 30 and 7 (39/102 and 11/25 while dryness counted, before walk-through 2 N3); Oslo 0/102 and 0/33. No range pre-filter yet: once S5c's range.ts lands the members come from the filtered pool (merge follow-up). |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | The installer, described below |
| [consortium-schema.mjs](../../scripts/consortium-schema.mjs) | `DDL`: schema 3, the export's 37 statements as stored in export `r-b958a4239cc68f73` (plants ends with `grown_as_annual` NOT NULL; plant_climate's variable list holds `tmean_warm`; `consortium-p5-ranges.test.mjs` compares every statement with the installed export) (schema 1's from canopi-data `ab6bfad`, plus `plant_climate_status` with `documented_cells`, `plant_climate` with `tmean_year`, basis `thinned_cells`, `blocks`, `low_source`, `high_source`, `weak`, and `plant_koppen`). `DATA_TABLES`: the 28 counted tables |
| [make-fixture.mjs](../../scripts/fixtures/consortium-v2/make-fixture.mjs) | The invented fixture, 38 plants, built with `node:sqlite`; schema 3 ranges by rule (tmean_year and tmean_warm included, no weak row; the onion is `grown_as_annual`) from each plant's first placement (`FIXTURE_GRID_SHA256` is the real v0.2.0 grid digest), Phacelia without a range. `buildFixtureDb` and `writeFixtureExport(dir, { edit, userVersion, applicationId, manifest, after })` build the broken variants for tests. The committed `export/` passes canopi-data's `check_export`; coverage is in its README |

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
  - schemas 2 and 3: `meta.ranges_review` is `estimate_not_reviewed`; `meta.climate_grid_manifest_sha256` is a sha256 (an empty value counts as missing) equal to the manifest's `climate_ranges`; every plant has a `plant_climate_status` row; range or Köppen rows only beside a `range_source`;
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
- `verifyInstall(dir, index)` re-checks a served folder against the index: the mark, each database by sha256, gzip and limits, every indexed photo present, and nothing else. `check-built-site.mjs` runs it on `dist/client/data/consortium/`.

Installed now: release `r-60ea417b5a15c3aa`, schema 3, `consortium-v3.r-60ea417b5a15c3aa.977fc4ceccc7.sqlite.gz`, rebuilt from canopi-data master `94a67a5` for the GBIF credit (`2e195da`).
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
