---
type: Module
title: Plant palette figures panel
description: The PP-C pf-d panel that shows every site input the Plant palette checks read, what limits plants at a place, and the summary of what an edit changed.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T22:32:10Z }
sources:
  - id: figures-tsx
    resource: ../../src/islands/consortium/views/figures/Figures.tsx
    title: src/islands/consortium/views/figures/Figures.tsx
    digest: sha256:3dc5574c631e32f3
    last_modified: 2026-11-18T22:28:26Z
  - id: site-change-ts
    resource: ../../src/lib/consortium/site-change.ts
    title: src/lib/consortium/site-change.ts
    digest: sha256:8efd6396eed3559e
    last_modified: 2026-11-18T22:28:26Z
  - id: site-change-line-ts
    resource: ../../src/lib/consortium/site-change-line.ts
    title: src/lib/consortium/site-change-line.ts
    digest: sha256:6513bea97cf2fcf6
    last_modified: 2026-11-18T22:28:26Z
  - id: figures-css
    resource: ../../src/styles/consortium/figures.css
    title: src/styles/consortium/figures.css
    digest: sha256:42b07d25929f2aa2
    last_modified: 2026-11-18T22:28:26Z
  - id: consortium-pf-d-browser-test-mjs
    resource: ../../scripts/browser/consortium-pf-d.browser.test.mjs
    title: scripts/browser/consortium-pf-d.browser.test.mjs
    digest: sha256:5512dc18bc4a59f9
    last_modified: 2026-11-18T22:28:26Z
---

# Plant palette figures panel (PP-C pf-d)

Boards SiteKiambu, PlaceDesk and SiteMendoza (mockups v14).

## Parts
| Part | File | Role |
|---|---|---|
| `PlaceFigures` | `src/islands/consortium/views/figures/Figures.tsx` | "Your place in figures" on the Place step: every input the checks read, one line each, in the Climate, Water and Soil groups; Change and Reset write `store.setSiteEdits` |
| `PaletteLimits` | same | "What limits plants here" on the palette: the main limit only (rain comes with the dry months), "Not a limit here: …", the Watering line, then the Water card |
| `siteSnapshot`, `siteChange`, `lineCounts`, `limitsOf` | `src/lib/consortium/site-change.ts` | per-period counts of the list (fit, second look, outside each side, drier) and the before/after change of an edit |
| `siteChangeLines`, `changeDetailLines`, `PH_BANDS` | `src/lib/consortium/site-change-line.ts` | the change summary's words (keys `consortium.figures.*`), the pH word bands (middles 5.0, 6.0, 6.9, 7.6, 8.5) |
| styles | `src/styles/consortium/figures.css` | imported page-level by `ConsortiumPage.astro` (no stylesheet loads with a lazy chunk, check-built-site A14) |

## Rules
- Every count comes from the verdict engine on the store's inputs, never a board number (browser helpers `scripts/browser/pf-d-helpers.mjs` `engineCounts`).
- A commit judges both sides (before and after the edit) for each period and returns the summary text; `'pending'` while the verdict chunk is not ready ("Counting…", or "Checks could not run." with Retry).
- Number formats (BC12): coldest nights with one decimal ("12.0 °C"), hottest days in whole degrees ("26 °C"), shifts whole ("2 °C colder"); a range writes the unit once ("26 → 28 °C", "986 → 1,080 mm"); "map 26" has no unit; a normal no-break space before the unit.
- Warmth over the year counts the cool side only (`warmthOf`, BC1); heat is a limit when a plant is outside on the hot side today or heat is the top limit.
- "What it means" (BC13, `rangeMoves`): who drops out by the commonest side, plus up to two plants (crops first) outside today on the cold or cool side that fit by 2041–2070; the heat form links to the palette in 2041–2070 (sets the period, the matrix view).
- Every map source carries a pin; the change summary under the head is the toast's dark bar with its own Undo.
- From 960 px every line is open, the periods stand on the head row, the main limit comes first, and "What it means for your choice" comes before the folds; on the phone it comes after them.

## Decisions (pf-d, 2026-11-18)
- The drainage line reads the soil map's texture (`lookup.soil.texture`): unanswered it says "Likely holds water: clay · soil map" (clay loam and finer hold water, as hydrologic soil groups C/D; coarser drains), answered it says "in place of the soil map's clay loam", and its Reset says "to the soil map" (round 1, BC4; the board wins over the earlier "not answered" reading).
- Counts name the nearest lists by name ("the nearest lists (…)") instead of the board's "three".
- "What limits plants here" shows the main limit only; the other climate lines are said in the "Not a limit here" sentence (board SiteMendoza).
- The room's Pots value has no Reset; "See these plants" is not built.
