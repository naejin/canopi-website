---
type: Architecture Decision
title: Plant palette chunk-2 hand-off rulings (D1-D10)
description: The agent rulings of 2026-11-18 on the PP-C chunk-2 hand-offs, as auto-approved under the owner's autonomy rule, and where each lives in the code.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T18:15:38Z }
sources:
  - id: jobspicture-tsx
    resource: ../../src/islands/consortium/views/palette/JobsPicture.tsx
    title: src/islands/consortium/views/palette/JobsPicture.tsx
    digest: sha256:2589072742e68720
    last_modified: 2026-11-18T17:52:14Z
  - id: find-tsx
    resource: ../../src/islands/consortium/views/find/Find.tsx
    title: src/islands/consortium/views/find/Find.tsx
    digest: sha256:62c4618243e88681
    last_modified: 2026-11-18T17:23:10Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:163f7a3eecb8a67d
    last_modified: 2026-11-18T17:29:04Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:8e36232a62615b80
    last_modified: 2026-11-18T17:37:33Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:8ca1dfbc9aa3a25a
    last_modified: 2026-11-18T17:23:44Z
  - id: holes-ts
    resource: ../../src/lib/consortium/holes.ts
    title: src/lib/consortium/holes.ts
    digest: sha256:5da2a7bd168c0ee5
    last_modified: 2026-11-18T17:33:57Z
---

# Plant palette chunk-2 hand-off rulings

Recorded by the coordinator in the main checkout's local plan notes (`pf-decisions.md`, not in git),
all as the chunk-2 triage recommended; auto-approved under the owner's autonomy rule (2026-11-18).

| Ruling | What | Where |
|---|---|---|
| D1 | "Plants per job" is the intro's link under 960 px (opens the 1/2/3/5 control in place) and the control itself at 960 px and wider | `views/palette/JobsPicture.tsx` `Goal`, `palette-page.css` `.ct-goal-link` |
| D2 | Folded forms past 12 names stay; they are size-rule forms of the word map | kit MoreList |
| D3 | The "Keep it as mine" toast reuses "Your palette: N plants." (a known board difference) | state/restore.ts |
| D4 | The no-fit Next step keeps its second-look rows (inform, don't block; a known board difference) | `views/palette/NextStep.tsx` |
| D5 | Find keeps the board subtitle; "Fits your place" adds "· N already in your palette" | `views/find/Find.tsx`, `find.fitsInPalette` |
| D6 | The sender's place name travels in the link (`n`, beside `o`) with "Include my place"; no reverse lookup on open | `lib/consortium/state.ts` `encodePlace`, `linkPlaceName` |
| D7 | Search answers show a place-type word for 8 kinds (city, town, village, suburb, county, state, region, country), none for the rest | `lib/location/place-search.ts` `PLACE_TYPES` |
| D8 | The long beta note and `consortium.betaNote` go; the board's "beta" words stay | `ConsortiumPage.astro` |
| D9 | A keep-as-mine store action | chunk 4 (open) |
| D10 | No shared multi-answer Nominatim fixture | dropped |

Also ruled the same day: a warned plant with no recorded range is a second look everywhere (Next step,
Find, Weigh) through `holes.ts` `fillerGroup`; "Fits your place" still lists judged fits only.

## Known board differences kept

- Find's hole list shows every hole up to 40 plants (the size rule), where board Find folds 4 of 7
  (M33; to be listed in the board-check spec's known differences, which lives outside git).
