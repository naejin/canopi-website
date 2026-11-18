---
type: Module
title: Plant palette figures panel
description: The PP-C pf-d panel that shows every site input the Plant palette checks read, what limits plants at a place, and the summary of what an edit changed.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T21:45:49Z }
sources:
  - id: figures-tsx
    resource: ../../src/islands/consortium/views/figures/Figures.tsx
    title: src/islands/consortium/views/figures/Figures.tsx
    digest: sha256:7aee578637b43a51
    last_modified: 2026-11-18T21:42:51Z
  - id: site-change-ts
    resource: ../../src/lib/consortium/site-change.ts
    title: src/lib/consortium/site-change.ts
    digest: sha256:1e3fdb3bee8925a7
    last_modified: 2026-11-18T21:17:10Z
  - id: site-change-line-ts
    resource: ../../src/lib/consortium/site-change-line.ts
    title: src/lib/consortium/site-change-line.ts
    digest: sha256:650c4194627849de
    last_modified: 2026-11-18T21:17:10Z
  - id: figures-css
    resource: ../../src/styles/consortium/figures.css
    title: src/styles/consortium/figures.css
    digest: sha256:2a68307d6c08144b
    last_modified: 2026-11-18T21:42:51Z
  - id: consortium-pf-d-browser-test-mjs
    resource: ../../scripts/browser/consortium-pf-d.browser.test.mjs
    title: scripts/browser/consortium-pf-d.browser.test.mjs
    digest: sha256:3829feae1d395219
    last_modified: 2026-11-18T21:27:33Z
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
- Temperatures in the panel use one decimal ("12.0 °C"), shifts do not ("2 °C colder").
- From 960 px every line is open, the periods stand on the head row, the main limit comes first, and "What it means for your choice" comes before the folds; on the phone it comes after them.

## Decisions (pf-d, 2026-11-18)
- The drainage line has no soil-map source in the engine, so its Reset goes back to "not answered" (the board says "to the soil map"); the board's "Likely holds water: clay" reading is not shown.
- Counts name the nearest lists by name ("the nearest lists (…)") instead of the board's "three".
- "What limits plants here" shows the main limit only; the other climate lines are said in the "Not a limit here" sentence (board SiteMendoza).
- The room's Pots value has no Reset; "See these plants" is not built.
