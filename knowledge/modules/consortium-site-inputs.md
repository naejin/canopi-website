---
type: Module
title: Consortium site inputs
description: The core module that owns every site input the Plant palette engine reads, merged from the climate grid and soil map with the grower's edits as shifts, plus the palette goals read beside them.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-19T10:15:03Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T12:21:16Z }
sources:
  - id: site-inputs-ts
    resource: ../../src/lib/consortium/site-inputs.ts
    title: src/lib/consortium/site-inputs.ts
    digest: sha256:579c7c0952cb3f5c
    last_modified: 2026-11-19T04:40:24Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:260e0d612a9f4809
    last_modified: 2026-11-19T04:40:24Z
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
    digest: sha256:c4e8c2410220e903
    last_modified: 2026-11-19T09:07:50Z
  - id: consortium-scenarios-mjs
    resource: ../../scripts/consortium-scenarios.mjs
    title: scripts/consortium-scenarios.mjs
    digest: sha256:302ca86562407789
    last_modified: 2026-11-18T21:45:59Z
  - id: consortium-scenarios-json
    resource: ../../scripts/fixtures/consortium-scenarios.json
    title: scripts/fixtures/consortium-scenarios.json
    digest: sha256:f45b862ed618d1ca
    last_modified: 2026-11-18T21:45:59Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:023783ecbccd0096
    last_modified: 2026-11-19T12:06:03Z
  - id: site-change-line-ts
    resource: ../../src/lib/consortium/site-change-line.ts
    title: src/lib/consortium/site-change-line.ts
    digest: sha256:af099a0b86672327
    last_modified: 2026-11-19T04:40:24Z
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
- `NO_EDITS`, `NO_INPUTS`, `hasClimate`; `todayOf` lives in `site-today.ts` (types only), so `siteToday` rides the first run and the range checks' chunk is no longer imported by the pool panel (with the verdict chunk offline, a curated list's count line says "Could not check" with Retry) (since v14 0W-2 R3, `soilPhOf(inputs)` gives the pH the check reads: the soil test, else the map's pH, null in pots; a soil-pH or drainage misfit is a hint, never a level, and `nearKm` (`SOIL_CELL_KM`) says when the map value comes from a neighbouring cell).

## The grower's edits (v14 spec 3.1, 7; chunk 3 pf-d and h3 M1)
- `EDIT_LIMITS` holds every source (the panel, the save, a link) to one range: temperature shifts -15..+15 °C in 0.1 steps, rain shift in whole mm (rain itself never below 0), dry-months shift -12..+12 (the result clamped to 0..12), pH 3.0..10.0 in 0.1 steps.
- `siteEditsOf(raw)` makes any value safe: a key is kept only in range and of its kind, a zero shift is no edit, light/wind/coldAir are dropped until their questions exist; nothing kept gives `NO_EDITS` itself. `sameEdits(a, b)` compares key by key.
- `SiteEdits.tempsTogether?: true` (`types.ts`; read with `tempsTogether(e)`): the nights editor's "the hottest days too" tick, data in the edits so it travels with Undo, the save and a link. Kept only beside two equal non-zero shifts. In a link it is the 5th segment of `f` (`f=<nights×10>.<days×10>.<rain>.<dry>.1`; core `state.ts` `editPairs` / `readEdits`), so the grower's own link or save with the tick set reads back as their own place (chunk-3 M1; no backward compatibility). The figures panel's Reset on either temperature line clears both when they were set as one.
- `soilTextureOf(lookup)` gives the soil map's USDA texture class (a reading, never a hint or an answer, A8); `isDryland(ai)` is the UNCCD dryland test (`DRYLAND_AI` 0.65). Both are read by the [figures panel](/modules/consortium-figures.md).
- `NAMED_PALETTE` and `NAMED_GROUP` (the size rule's thresholds for naming members) live in `types.ts`; core `site-change-line.ts` `named(group, size)` reads them.

## Readers
- The rules read inputs only: `VerdictContext { inputs, period, scenario, canopy }`; `place.ts` `siteOf(inputs)` and `climateFor`; range, future, weigh, factAt.
- The store: `store.siteEdits` (signal, saved and in a link with "Include my place" since v14 0W-1; the figures panel writes it through `store.setSiteEdits`) and `store.siteInputs` (lookup + room + edits). The spot and soil answers are deleted (v14 0W-2 R4).
- Not routed (UI and location step, not the engine): `site-climate.ts` climate card, `views/location/**`, `state/location.ts`, Share's cell centre.
- Watering (v14 0W-2 R2) sets the dryness note: rain or no answer "drier", first-years the same note in first-years words, all-year none; it never moves the fit.

## Palette goals
- `DEFAULT_GOALS { plantsPerJob: 2 }` (a plant and its backup) and `paletteGoalsOf` (whole number at least 1, no upper bound) sit beside the inputs: a palette goal, never a site fact.
- `PLANTS_PER_JOB` (1, 2, 3, 5) are the choices the Jobs control offers; `plantsPerJobOf(v)` reads a link's or save's `j` and gives the default for any other value (v14 F15).
- `holes.ts` `laneCounts(ctx, goals)`: per job and light level, the plant count per time step; jobs below the goal (but above 0) are "thin" year spans; nothing caps a lane.

## Scenario file
- `scripts/fixtures/consortium-scenarios.json` (44 cases on 13 places, incl. a 200-plant Seville palette and the `seville-board` / `mendoza-board` places carrying the v14 boards' values; each case with edits also records the `change` output of core `site-change.ts` `siteChange`), recorded by `node scripts/consortium-scenarios.mjs --record`, run by `scripts/consortium-scenarios.test.mjs` (skipped when the installed release differs). Members per case: `palette()` round-robin over light level in id order (a string sort since PP-C 0b; before, `a.id - b.id` on UUIDs was NaN and kept the pool's order), so a release that moves placements changes the picks; a case's `also` names plants added after the palette, so it keeps the plant that shows its rule (the Lyon cases hold Alnus cordata, near its cold limit there, so "2 °C colder" changes a verdict). Recorded for `r-255553893fa4f4b4` (0c: the 13 moved placements changed the picks of 10 cases).
