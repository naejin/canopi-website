---
type: Module
title: Plant palette figures panel
description: The PP-C pf-d panel that shows every site input the Plant palette checks read, what limits plants at a place, and the summary of what an edit changed.
tags: [consortium, module]
generated: { by: antigravity/gemini, at: 2026-11-23T12:36:47Z }
verified:
  - { by: antigravity/gemini, at: 2026-11-23T12:36:32Z }
sources:
  - id: figures-tsx
    resource: ../../src/islands/consortium/views/figures/Figures.tsx
    title: src/islands/consortium/views/figures/Figures.tsx
    digest: sha256:73df3b0ef8b5c317
    last_modified: 2026-11-19T11:24:03Z
  - id: slots-tsx
    resource: ../../src/islands/consortium/views/figures/slots.tsx
    title: src/islands/consortium/views/figures/slots.tsx
    digest: sha256:7c68ea9bff16f064
    last_modified: 2026-11-19T11:24:03Z
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
  - id: site-inputs-ts
    resource: ../../src/lib/consortium/site-inputs.ts
    title: src/lib/consortium/site-inputs.ts
    digest: sha256:579c7c0952cb3f5c
    last_modified: 2026-11-19T04:40:24Z
  - id: figures-css
    resource: ../../src/styles/consortium/figures.css
    title: src/styles/consortium/figures.css
    digest: sha256:91a8e9ccd407316c
    last_modified: 2026-11-19T10:56:24Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:59ecfbc3a59f1adf
    last_modified: 2026-11-19T11:59:54Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:db0dc259328e7353
    last_modified: 2026-11-23T11:50:28Z
  - id: consortium-pf-d-test-mjs
    resource: ../../scripts/consortium-pf-d.test.mjs
    title: scripts/consortium-pf-d.test.mjs
    digest: sha256:702b167f4f6a844c
    last_modified: 2026-11-19T09:14:39Z
  - id: consortium-pf-d-browser-test-mjs
    resource: ../../scripts/browser/consortium-pf-d.browser.test.mjs
    title: scripts/browser/consortium-pf-d.browser.test.mjs
    digest: sha256:88adafe0ef4833ca
    last_modified: 2026-11-19T11:24:03Z
---

# Plant palette figures panel (PP-C pf-d)

Boards SiteKiambu, PlaceDesk, SiteMendoza and Toasts (mockups v14). Written in chunk 3 (pf-d), merged with
the h3 fix rounds and chunk 4 (C2). Related: [Site inputs](/modules/consortium-site-inputs.md),
[Core](/modules/consortium-core.md), [Location](/modules/consortium-location.md),
[Palette page](/modules/consortium-palette-page.md).

## Parts
| Part | File | Role |
|---|---|---|
| `PlaceFigures`, `PaletteLimits` (shells) | `src/islands/consortium/views/figures/slots.tsx` | the two places the panel stands; each a `lazyPart` over `Figures.tsx` (role `figures`, its own lazy chunk). Keep this file a shell |
| `PlaceFigures` | `src/islands/consortium/views/figures/Figures.tsx` | "Your place in figures" on the Place step: every input the checks read, one line each, in the Climate, Water and Soil groups; Change and (on the grower's own value only) Reset write `store.setSiteEdits` |
| `PaletteLimits` | same | "What limits plants here" on the palette: every line that limits (`limitsOf`, most first; rain comes with the dry months; warmth over the year is said in the Hottest days row, `LIMIT_LINES`), "Not a limit here: …" for the night and heat lines that limit nothing, the Watering line, the link to the panel, then the Water card |
| `siteSnapshot`, `siteChange`, `lineCounts`, `limitStatus`, `limitsOf`, `warmthView`, `drierFrom`, `rangeMoves`, `windRecorded` | `src/lib/consortium/site-change.ts` | per-period counts of the list (fit, second look, outside each side, drier, carrying the dryness note), one status per limit line (`LIMIT_IDS`, `LimitState` limits / free / unchecked, `LimitStatus`), warmth over the year as every row says it, each member's first drier period, how the list moves as the climate warms, the before/after change of an edit, and the listed plants with a recorded wind tolerance |
| `siteChangeLines`, `changeDetailLines`, `nightsSidesLine`, `warmthLine`, `holdsWater`, `textureLine`, `PH_BANDS`, `LIMIT_LINES` | `src/lib/consortium/site-change-line.ts` | the change summary's words and the rows' sentences (keys `consortium.figures.*`), the pH word bands (middles 5.0, 6.0, 6.9, 7.6, 8.5) |
| `soilTextureOf`, `isDryland`, `tempsTogether` | `src/lib/consortium/site-inputs.ts` | the soil map's texture as a reading (never a hint, A8); a dryland (aridity index under 0.65, UNCCD); the two temperature shifts set as one |
| styles | `src/styles/consortium/figures.css` | imported page-level by `ConsortiumPage.astro` (no stylesheet loads with a lazy chunk, check-built-site A14; chunk-3 M12) |

## When the panels stand
- **Your place in figures** (`slots.tsx` `PlaceFigures`, R16): only once there is a place to say figures for, a location or a chosen climate (spec F5: with a climate and no location its soil and water lines can still be set). On Start before either, nothing is drawn, so the panel never lands after the first paint and pushes the page down.
- **The slot reserve** (PFD49; chunk 4 C2 R5): the slot (`.fg-slot`, `display: contents`) stands as soon as the panel is due (a place, a climate, or a kept location still being looked up, `locationAtStart`) and stays empty while the data, the place and the chunk come. `base.css` keeps `#ct-root` a small-viewport screen tall (`100svh`) while `.fg-slot` is empty, and before the island renders when the head carries `data-kept` (set by the inline head script in `ConsortiumPage.astro` when `persist.ts` `LOCATION_STORE` or `SITE_CLIMATE` is in localStorage, or the page opens as a palette), so the release line and the footer never move when the panel lands. A fresh Start or a short state keeps no screen-tall gap. If the `figures` chunk does not load, each part says so in place with Reload (`retryableImport`, `lazyPart` `retry`), which asks again in place (and by itself once back online), so a slot is never left empty for good and its reserve ends (PFD61).
- **What limits plants here** (chunk 4 T15, ruling GR-B7 vs T15; follow-up F1): `slots.tsx` asks for its part only at a located place with climate figures (`location.lookup` and a nights value), so a failed chunk is said where the card would stand. Its memory is the card's own **visit** (`PaletteLimits`, a `useRef` `Visit` `{ key, pool, answered, limited, rows }`), begun again for each place (`placeKey`, climate and location) and loaded list, and ended when the palette leaves the screen (the component unmounts). Before a ready count it shows its counting or failed line (never left out: unknown is never a hole); a ready count with no limiting line (`limitsOf` empty, no member drier here, `drierFrom`) leaves it out (boards Palette and Main draw no card). Once a count found a limiting line the card stays for the visit with every row it showed: a row that no longer limits says "Not a limit for this list." (`notLimitNights` / `notLimitDays` / `notLimitHead`), and with none left the card says "No climate line limits plants here." (`limitsNone`), so an edit made in the card never takes it, or the focused row, from under the reader.
- **The phone's closed card** (RULED (a), pf-decisions 2026-11-19, Palette vs SiteMendoza 390): below 640 px the card stands closed to its head and one line (`.fg-limits-short`): the main limit (`limitSummary`, `figures.limitsSummary`; warmth over the year by the year's mean, today → 2071–2099, `limitsWarmth`), else "No climate line limits plants here." with the members drier here (`limitsDry`); the disclosure says "Show the N limits" (`limitsShow`, N = `limitsOf` plus one for the drier members), "Show more" (`limitsShowAll`) with none now, "Hide the limits" open; the Water card closes with it (`figures.css`). Open for this visit only; from 640 px the card is open and the disclosure is not drawn.

## Rules
- Every count comes from the verdict engine on the store's inputs, never a board number (browser helpers `scripts/browser/pf-d-helpers.mjs` `engineCounts`).
- A commit judges both sides (before and after the edit) for each period and returns the summary text; `'pending'` while the verdict chunk is not ready ("Counting…", or "Checks could not run." with Retry). Both sides are measured on the place as it is now, so a reading that lands meanwhile (the soil map, `soilLater`) is never counted as the grower's change nor left out of Undo. The same value used again writes nothing and raises no toast.
- The change summary under the head and the opened row's detail live as long as the edit's own toast (`lastChange` holds the toast id; `liveChange` matches it against `store.toast`): Undo, a new place (placeAt clears the edits), another toast or the toast running out end them.
- Number formats (BC12): coldest nights with one decimal ("12.0 °C"), hottest days in whole degrees ("26 °C"), shifts whole ("2 °C colder"); a range writes the unit once ("26 → 28 °C", "986 → 1,080 mm"); "map 26" has no unit; a normal no-break space before the unit.
- Numbers typed in an editor are read with the page language's separators (a group mark only where it groups; a comma is a decimal mark in every language); a value is prefilled with no group mark.
- The editor's preview and the cells' "map …" values come from `siteInputsOf` (its clamps: dry months 0..12, rain never below 0), never from value minus shift.
- **The own figure** ("I know my plot’s figure", chunk 4 T19 and C2 fix round 2): the label and help say what the checks read, the average night low of the plot's coolest month (not its coldest night of the year) and the average afternoon high of its hottest month (not its hottest day); the figure is measured from the map's figure as the field shows it (its 0.1 step), so typing the map value back is no change; the tick's "colder/warmer" follows the sign of the shift. The year's extremes wait for canopi-climate's extremes layer after release.
- The nights' sides are said only above zero (`nightsSidesLine`, keys `nightsWarmer` / `nightsColder` / `nightsSidesBoth`, joined with the board's comma, not a list join); "(lowland tropical plants)" only beside the warmer side where the nights never freeze (chunk-3 M3).
- Warmth over the year counts the cool side only (`warmthOf`, BC1) and is said through one `warmthView` (limits, free with edge counts only, or unchecked); near the edge only: "# is near the edge of its range for warmth over the year" (M5).
- "What it means" (BC13, `rangeMoves`): who drops out by the commonest side, plus up to two plants (crops first) outside today on the cold or cool side that fit by 2041–2070; the heat form links to the palette in 2041–2070. It says the real state otherwise: no location, no climate data here, checks could not run, or counting.
- The Water card's lead: "your one plant" for a one-plant palette (`waterLeadOne*`, M4); later members are counted per period they are first drier in (`waterByPeriod`). "Your place is dry" only in a dryland (`isDryland`).
- Every map source carries a pin (kept with the source's first word; the rest wraps).
- `store.openFigure('panel')` (the palette's "Your place in figures" link) scrolls to and focuses the panel's heading; a line name opens that line (Details' "Set my own soil pH" opens `soilPh`).
- From 960 px (`location/shared.ts` `desk`) every line is open, the main limit comes first in Climate, and "What it means for your choice" comes before the folds; on the phone one line is open at a time (the main limit first) and it comes after them, with the foot.

## Decisions (pf-d, 2026-11-18; h3, 2026-11-19)
- The drainage line reads the soil map's texture (`lookup.soil.texture`) only where it holds water (`holdsWater`: the clay textures of hydrologic soil groups C and D): "Likely holds water: clay · soil map"; any other texture gives no reading and the line stays "Not answered" (no "likely drains" claim, review C5). Answered, it says "in place of the soil map's …", and its Reset says "to the soil map" (BC4).
- Counts name the nearest lists by name ("the nearest lists (…)") instead of the board's "three".
- "What limits plants here" shows every line that limits (A5); board SiteMendoza had the rain alone, while Mendoza on the real tiles has the nights limiting too, so both show (word-map known difference).
- Rain limits only while a listed plant carries the dryness note (`PeriodCounts.noted`): watered all year, no plant does, so rain is no limit; `drier` stays the panel's figure (C8).
- The room's Pots value has no Reset and shows its two options in place on every width (A3, F9; C10); "See these plants" is not built (A6).
- The wind paragraph counts the listed plants with a recorded wind tolerance once the source reads layer values (`windRecorded`); with the PP-G stub source it keeps the sentence without a number (C9).
- The soil pH and texture come from the soil tile read after the place (`state/location.ts` `soilLater`, h3 G1); a failed or slow soil tile leaves them "not known".

## Tests
`scripts/consortium-pf-d.test.mjs` (core counts and words), `scripts/browser/consortium-pf-d.browser.test.mjs` (boards SiteKiambu, PlaceDesk, SiteMendoza; PFD49 the slot reserve; PFD53, PFD55, PFD59 the limits card's visit; PFD60, PFD62, PFD63 the phone's closed card; PFD61 a failed chunk).
