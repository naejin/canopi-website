---
type: Architecture Decision
title: Plant palette chunk-2 hand-off rulings (D1-D10)
description: The agent rulings of 2026-11-18 on the PP-C chunk-2 hand-offs, as auto-approved under the owner's autonomy rule, and where each lives in the code.
generated: { by: antigravity/gemini-4-neon, at: 2026-11-25T11:39:50Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T13:01:16Z }
  - { by: antigravity/gemini, at: 2026-11-23T18:52:39Z }
sources:
  - id: jobspicture-tsx
    resource: ../../src/islands/palette/views/palette/JobsPicture.tsx
    title: src/islands/palette/views/palette/JobsPicture.tsx
    digest: sha256:069a3088a44e86e7
    last_modified: 2026-11-23T20:58:01Z
  - id: find-tsx
    resource: ../../src/islands/palette/views/find/Find.tsx
    title: src/islands/palette/views/find/Find.tsx
    digest: sha256:320123ca652ab060
    last_modified: 2026-11-23T21:07:43Z
  - id: state-ts
    resource: ../../src/lib/palette/state.ts
    title: src/lib/palette/state.ts
    digest: sha256:2e0eca30c5b18733
    last_modified: 2026-11-25T11:39:24Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:8e36232a62615b80
    last_modified: 2026-11-18T17:37:33Z
  - id: consortiumpage-astro
    resource: ../../src/components/palette/PalettePage.astro
    title: src/components/palette/PalettePage.astro
    digest: sha256:8d5b992f4939045d
    last_modified: 2026-11-25T11:27:38Z
  - id: holes-ts
    resource: ../../src/lib/palette/holes.ts
    title: src/lib/palette/holes.ts
    digest: sha256:5da2a7bd168c0ee5
    last_modified: 2026-11-23T21:07:43Z
  - id: place-tsx
    resource: ../../src/islands/palette/views/place/Place.tsx
    title: src/islands/palette/views/place/Place.tsx
    digest: sha256:70d05d76fdfcd22c
    last_modified: 2026-11-25T00:34:20Z
  - id: persist-ts
    resource: ../../src/islands/palette/state/persist.ts
    title: src/islands/palette/state/persist.ts
    digest: sha256:abaa195b434f5099
    last_modified: 2026-11-23T21:07:43Z
  - id: location-ts
    resource: ../../src/islands/palette/state/location.ts
    title: src/islands/palette/state/location.ts
    digest: sha256:86dd45160353ac46
    last_modified: 2026-11-25T11:27:38Z
  - id: suggest-wait-ts
    resource: ../../src/islands/palette/state/suggest-wait.ts
    title: src/islands/palette/state/suggest-wait.ts
    digest: sha256:ad330f5c00ac2504
    last_modified: 2026-11-23T21:07:43Z
  - id: draft-ts
    resource: ../../src/islands/palette/state/draft.ts
    title: src/islands/palette/state/draft.ts
    digest: sha256:ea0e524d1cd90f7b
    last_modified: 2026-11-23T21:07:43Z
---

# Plant palette chunk-2 hand-off rulings

Recorded by the coordinator in the main checkout's local plan notes (`pf-decisions.md`, not in git),
all as the chunk-2 triage recommended; auto-approved under the owner's autonomy rule (2026-11-18).

| Ruling | What | Where |
|---|---|---|
| D1 | "Plants per job" is the intro's link under 960 px (opens the 1/2/3/5 control in place) and the control itself at 960 px and wider | `views/palette/JobsPicture.tsx` `Goal`, `palette-page.css` `.ct-goal-link` |
| D2 | Folded forms past 12 names stay; they are size-rule forms of the word map | kit MoreList |
| D3 | The "Keep it as mine" toast reuses "Your palette: N plants." (a known board difference) | `state/draft.ts` `keepShownAsMine` (`offerUndo(P('palette.place.keptMine', …))`), called by `views/place/Place.tsx` |
| D4 | The no-fit Next step keeps its second-look rows (inform, don't block; a known board difference) | `views/palette/NextStep.tsx` |
| D5 | Find keeps the board subtitle; "Fits your place" adds "· N already in your palette" | `views/find/Find.tsx`, `find.fitsInPalette` |
| D6 | The sender's place name travels in the link (`n`, beside `o`) with "Include my place"; no reverse lookup on open. Only a town-level name travels (h2 R4): `SiteLocation.placeLevel` is set for a search answer or reverse lookup of a D7 kind and for a link's own `n`, kept in the saved location record; a road, building or farm label stays on the page | `lib/palette/state.ts` `encodePlace`; `state/persist.ts` `linkName`; `state/location.ts` `take`, `lookUpName` |
| D7 | Search answers show a place-type word for 8 kinds (city, town, village, suburb, county, state, region, country), none for the rest | `lib/location/place-search.ts` `PLACE_TYPES` |
| D8 | The long beta note and `consortium.betaNote` go; the board's "beta" words stay | `PalettePage.astro` |
| D9 | A keep-as-mine store action | done in chunk 4 (T18): `state/draft.ts` `keepShownAsMine` |
| D10 | No shared multi-answer Nominatim fixture | dropped |

Also ruled the same day: a warned plant with no recorded range is a second look everywhere (Next step,
Find, Weigh) through `holes.ts` `fillerGroup`; "Fits your place" still lists judged fits only.

## Known board differences kept

- The place search's privacy line (`consortium.location.searchPrivacy`) no longer says coordinates
  are "sent nowhere": it names "Look up its name", which sends the centre of the typed point's 0.1°
  climate-grid square (`state/location.ts` `lookUpName`, `snapOrigin`) to Nominatim on the press only
  (h2 R3). The privacy page (`privacy.location.search`, `privacy.location.link`) and the Share note say
  the same, in 11 locales; `palette-p5-seams-s5f.test.mjs` pins the town word and the button name.
- Board Loading's "Suggested before the climate was read" (with "Read it again") is said inside the
  suggestion's own toast, after its words and beside its Undo (`store.ts` `suggestMembers(note)`,
  `state/suggest-wait.ts`), never as a second toast that would replace the Undo (h2 R1).

- Find's hole list shows every hole up to 40 plants (the size rule), where board Find folds 4 of 7
  (M33; to be listed in the board-check spec's known differences, which lives outside git).
