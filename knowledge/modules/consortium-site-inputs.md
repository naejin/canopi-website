---
type: Module
title: Consortium site inputs
description: The core module that owns every site input the Plant palette engine reads, merged from the climate grid and soil map with the grower's edits as shifts, plus the palette goals read beside them.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T02:04:10Z }
sources:
  - id: site-inputs-ts
    resource: ../../src/lib/consortium/site-inputs.ts
    title: src/lib/consortium/site-inputs.ts
    digest: sha256:55765af03043370d
    last_modified: 2026-11-18T00:51:57Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:2b3666675741b3cf
    last_modified: 2026-11-18T01:44:32Z
  - id: place-ts
    resource: ../../src/lib/consortium/place.ts
    title: src/lib/consortium/place.ts
    digest: sha256:de3d31fb8eed5d71
    last_modified: 2026-11-18T00:51:57Z
  - id: holes-ts
    resource: ../../src/lib/consortium/holes.ts
    title: src/lib/consortium/holes.ts
    digest: sha256:d155fea328696f39
    last_modified: 2026-11-18T00:51:57Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:6b68b3a0f3306bd6
    last_modified: 2026-11-18T00:51:57Z
  - id: consortium-scenarios-mjs
    resource: ../../scripts/consortium-scenarios.mjs
    title: scripts/consortium-scenarios.mjs
    digest: sha256:428b9a9e2a1faddd
    last_modified: 2026-11-18T01:59:36Z
  - id: consortium-scenarios-json
    resource: ../../scripts/fixtures/consortium-scenarios.json
    title: scripts/fixtures/consortium-scenarios.json
    digest: sha256:de42c3140b77273d
    last_modified: 2026-11-18T01:59:36Z
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
- `NO_EDITS`, `NO_INPUTS`, `hasClimate`, `testedPh`; `todayOf` lives in `site-today.ts` (types only), so `siteToday` rides the first run and the range checks' chunk is no longer imported by the pool panel (with the verdict chunk offline, a curated list's count line says "Could not check" with Retry) (only a grower soil test gives a soil word; the map's pH checks nothing until PP-F).

## Readers
- The rules read inputs only: `VerdictContext { inputs, period, scenario, canopy }`; `place.ts` `siteOf(inputs)` and `climateFor`; range, future, weigh, factAt.
- The store: `store.siteEdits` (signal, `NO_EDITS` on load, unsaved; the figures panel will write it) and `store.siteInputs` (lookup + room + edits). Spot and soil answers are dormant until PP-F.
- Not routed (UI and location step, not the engine): `site-climate.ts` climate card, `views/location/**`, `state/location.ts`, Share's cell centre.
- Watering is held but read by no rule until F4.

## Palette goals
- `DEFAULT_GOALS { plantsPerJob: 2 }` (a plant and its backup) and `paletteGoalsOf` (whole number at least 1, no upper bound) sit beside the inputs: a palette goal, never a site fact.
- `holes.ts` `laneCounts(ctx, goals)`: per job and light level, the plant count per time step; jobs below the goal (but above 0) are "thin" year spans; nothing caps a lane.

## Scenario file
- `scripts/fixtures/consortium-scenarios.json` (32 cases on 8 real places, incl. a 200-plant Seville palette), recorded by `node scripts/consortium-scenarios.mjs --record`, run by `scripts/consortium-scenarios.test.mjs` (skipped when the installed release differs). Members per case: `palette()` round-robin over light level in id order (a string sort since PP-C 0b; before, `a.id - b.id` on UUIDs was NaN and kept the pool's order), so a release that moves placements changes the picks; a case's `also` names plants added after the palette, so it keeps the plant that shows its rule (the Lyon cases hold Alnus cordata, near its cold limit there, so "2 °C colder" changes a verdict). Recorded for `r-bcc417fd89a3147c`.
