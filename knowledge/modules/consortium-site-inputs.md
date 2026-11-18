---
type: Module
title: Consortium site inputs
description: The core module that owns every site input the Plant palette engine reads, merged from the climate grid and soil map with the grower's edits as shifts, plus the palette goals read beside them.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T18:15:05Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-18T18:53:34Z }
sources:
  - id: site-inputs-ts
    resource: ../../src/lib/consortium/site-inputs.ts
    title: src/lib/consortium/site-inputs.ts
    digest: sha256:733dc391a4b4eaab
    last_modified: 2026-11-18T04:51:36Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:91d21007fa090bfc
    last_modified: 2026-11-18T18:43:00Z
  - id: place-ts
    resource: ../../src/lib/consortium/place.ts
    title: src/lib/consortium/place.ts
    digest: sha256:e3764f30b6573f2d
    last_modified: 2026-11-18T04:51:36Z
  - id: holes-ts
    resource: ../../src/lib/consortium/holes.ts
    title: src/lib/consortium/holes.ts
    digest: sha256:5da2a7bd168c0ee5
    last_modified: 2026-11-18T17:33:57Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:2d6f468d17a922a7
    last_modified: 2026-11-18T18:42:15Z
  - id: consortium-scenarios-mjs
    resource: ../../scripts/consortium-scenarios.mjs
    title: scripts/consortium-scenarios.mjs
    digest: sha256:3a30908019e55de3
    last_modified: 2026-11-18T04:37:58Z
  - id: consortium-scenarios-json
    resource: ../../scripts/fixtures/consortium-scenarios.json
    title: scripts/fixtures/consortium-scenarios.json
    digest: sha256:175ef17cc7bcf3b4
    last_modified: 2026-11-18T06:34:33Z
enforced_by:
  - scripts/consortium-site-inputs.test.mjs
  - scripts/consortium-scenarios.test.mjs
---

# Consortium site inputs

Owner decision 2026-11-18: one module owns every engine site input; the scenario JSON is the contract for a later Rust port.

## Shape
- `siteInputsOf({ lookup, room, edits })` in `src/lib/consortium/site-inputs.ts` returns `SiteInputs`: each input is `{ value, source: 'map' | 'grower' | 'none' }` ('none' is unknown, never a "no").
- Climate figures (`nights`, `days`, `rain`, `dryMonths`) also keep `map` and `shift`; `soilPh` keeps the soil map's `map`; `drainage`, `watering`, `light`, `wind`, `coldAir`, `room` are answers.
- `periods`: every climate slot with the grower's shifts applied (`SiteEdits.nightsShiftC`, `daysShiftC`, `rainShiftMm`, `dryMonthsShift`), so an edit holds in every period and scenario. Köppen stays the map's.
- `NO_EDITS`, `NO_INPUTS`, `hasClimate`, `testedPh`; `todayOf` lives in `site-today.ts` (types only), so `siteToday` rides the first run and the range checks' chunk is no longer imported by the pool panel (with the verdict chunk offline, a curated list's count line says "Could not check" with Retry) (since v14 0W-2 R3, `soilPhOf(inputs)` gives the pH the check reads: the soil test, else the map's pH, null in pots; a soil-pH or drainage misfit is a hint, never a level, and `nearKm` (`SOIL_CELL_KM`) says when the map value comes from a neighbouring cell).

## Readers
- The rules read inputs only: `VerdictContext { inputs, period, scenario, canopy }`; `place.ts` `siteOf(inputs)` and `climateFor`; range, future, weigh, factAt.
- The store: `store.siteEdits` (signal, saved and in a link with "Include my place" since v14 0W-1; the figures panel writes it through `store.setSiteEdits`) and `store.siteInputs` (lookup + room + edits). The spot and soil answers are deleted (v14 0W-2 R4).
- Not routed (UI and location step, not the engine): `site-climate.ts` climate card, `views/location/**`, `state/location.ts`, Share's cell centre.
- Watering (v14 0W-2 R2) sets the dryness note: rain or no answer "drier", first-years the same note in first-years words, all-year none; it never moves the fit.

## Palette goals
- `DEFAULT_GOALS { plantsPerJob: 2 }` (a plant and its backup) and `paletteGoalsOf` (whole number at least 1, no upper bound) sit beside the inputs: a palette goal, never a site fact.
- `holes.ts` `laneCounts(ctx, goals)`: per job and light level, the plant count per time step; jobs below the goal (but above 0) are "thin" year spans; nothing caps a lane.

## Scenario file
- `scripts/fixtures/consortium-scenarios.json` (32 cases on 8 real places, incl. a 200-plant Seville palette), recorded by `node scripts/consortium-scenarios.mjs --record`, run by `scripts/consortium-scenarios.test.mjs` (skipped when the installed release differs). Members per case: `palette()` round-robin over light level in id order (a string sort since PP-C 0b; before, `a.id - b.id` on UUIDs was NaN and kept the pool's order), so a release that moves placements changes the picks; a case's `also` names plants added after the palette, so it keeps the plant that shows its rule (the Lyon cases hold Alnus cordata, near its cold limit there, so "2 °C colder" changes a verdict). Recorded for `r-255553893fa4f4b4` (0c: the 13 moved placements changed the picks of 10 cases).
