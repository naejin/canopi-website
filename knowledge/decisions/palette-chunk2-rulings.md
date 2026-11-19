---
type: Architecture Decision
title: Plant palette chunk-2 hand-off rulings (D1-D10)
description: The agent rulings of 2026-11-18 on the PP-C chunk-2 hand-offs, as auto-approved under the owner's autonomy rule, and where each lives in the code.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-19T11:31:04Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T10:38:16Z }
sources:
  - id: jobspicture-tsx
    resource: ../../src/islands/consortium/views/palette/JobsPicture.tsx
    title: src/islands/consortium/views/palette/JobsPicture.tsx
    digest: sha256:23ad0e26719a7027
    last_modified: 2026-11-19T09:07:50Z
  - id: find-tsx
    resource: ../../src/islands/consortium/views/find/Find.tsx
    title: src/islands/consortium/views/find/Find.tsx
    digest: sha256:668fb618a9d170ed
    last_modified: 2026-11-19T07:06:28Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:e80bca603fcf2579
    last_modified: 2026-11-19T08:16:50Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:8e36232a62615b80
    last_modified: 2026-11-18T17:37:33Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:0b89a2579cb86fe6
    last_modified: 2026-11-19T11:30:44Z
  - id: holes-ts
    resource: ../../src/lib/consortium/holes.ts
    title: src/lib/consortium/holes.ts
    digest: sha256:5da2a7bd168c0ee5
    last_modified: 2026-11-18T17:33:57Z
  - id: place-tsx
    resource: ../../src/islands/consortium/views/place/Place.tsx
    title: src/islands/consortium/views/place/Place.tsx
    digest: sha256:1bc0c7720b8a2a60
    last_modified: 2026-11-19T08:22:07Z
  - id: persist-ts
    resource: ../../src/islands/consortium/state/persist.ts
    title: src/islands/consortium/state/persist.ts
    digest: sha256:07f9775e9c850dec
    last_modified: 2026-11-18T18:38:12Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:88dcd1f9fa48e570
    last_modified: 2026-11-19T08:22:07Z
  - id: suggest-wait-ts
    resource: ../../src/islands/consortium/state/suggest-wait.ts
    title: src/islands/consortium/state/suggest-wait.ts
    digest: sha256:ad330f5c00ac2504
    last_modified: 2026-11-18T18:38:12Z
  - id: draft-ts
    resource: ../../src/islands/consortium/state/draft.ts
    title: src/islands/consortium/state/draft.ts
    digest: sha256:7a085fede4454133
    last_modified: 2026-11-19T08:22:07Z
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
| D6 | The sender's place name travels in the link (`n`, beside `o`) with "Include my place"; no reverse lookup on open. Only a town-level name travels (h2 R4): `SiteLocation.placeLevel` is set for a search answer or reverse lookup of a D7 kind and for a link's own `n`, kept in the saved location record; a road, building or farm label stays on the page | `lib/consortium/state.ts` `encodePlace`; `state/persist.ts` `linkName`; `state/location.ts` `take`, `lookUpName` |
| D7 | Search answers show a place-type word for 8 kinds (city, town, village, suburb, county, state, region, country), none for the rest | `lib/location/place-search.ts` `PLACE_TYPES` |
| D8 | The long beta note and `consortium.betaNote` go; the board's "beta" words stay | `ConsortiumPage.astro` |
| D9 | A keep-as-mine store action | done in chunk 4 (T18): `state/draft.ts` `keepShownAsMine` |
| D10 | No shared multi-answer Nominatim fixture | dropped |

Also ruled the same day: a warned plant with no recorded range is a second look everywhere (Next step,
Find, Weigh) through `holes.ts` `fillerGroup`; "Fits your place" still lists judged fits only.

## Known board differences kept

- The place search's privacy line (`consortium.location.searchPrivacy`) no longer says coordinates
  are "sent nowhere": it names "Look up its name", which sends the centre of the typed point's 0.1°
  climate-grid square (`state/location.ts` `lookUpName`, `snapOrigin`) to Nominatim on the press only
  (h2 R3). The privacy page (`privacy.location.search`, `privacy.location.link`) and the Share note say
  the same, in 11 locales; `consortium-p5-seams-s5f.test.mjs` pins the town word and the button name.
- Board Loading's "Suggested before the climate was read" (with "Read it again") is said inside the
  suggestion's own toast, after its words and beside its Undo (`store.ts` `suggestMembers(note)`,
  `state/suggest-wait.ts`), never as a second toast that would replace the Undo (h2 R1).

- Find's hole list shows every hole up to 40 plants (the size rule), where board Find folds 4 of 7
  (M33; to be listed in the board-check spec's known differences, which lives outside git).
