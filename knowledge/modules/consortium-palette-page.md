---
type: Module
title: Consortium palette page
description: "The Plant palette page after the Place step: header steps, the Next step, Through the years and the jobs pictures with their table form, and the shell's honest states."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T21:29:23Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-14T21:05:29Z }
sources:
  - id: palette-tsx
    resource: ../../src/islands/consortium/views/palette/Palette.tsx
    title: src/islands/consortium/views/palette/Palette.tsx
    digest: sha256:412fef8a80770ac5
    last_modified: 2026-11-14T18:01:21Z
  - id: nextstep-tsx
    resource: ../../src/islands/consortium/views/palette/NextStep.tsx
    title: src/islands/consortium/views/palette/NextStep.tsx
    digest: sha256:6d1269112848c942
    last_modified: 2026-11-14T18:01:21Z
  - id: years-tsx
    resource: ../../src/islands/consortium/views/palette/Years.tsx
    title: src/islands/consortium/views/palette/Years.tsx
    digest: sha256:931b5dc8429fbd9d
    last_modified: 2026-11-14T16:49:53Z
  - id: chart-tsx
    resource: ../../src/islands/consortium/views/kit/chart.tsx
    title: src/islands/consortium/views/kit/chart.tsx
    digest: sha256:f2cb4885d4d162f0
    last_modified: 2026-11-14T16:49:53Z
  - id: fit-tsx
    resource: ../../src/islands/consortium/views/kit/fit.tsx
    title: src/islands/consortium/views/kit/fit.tsx
    digest: sha256:66bce56fe9cce736
    last_modified: 2026-11-14T16:49:53Z
  - id: picture-ts
    resource: ../../src/islands/consortium/rules/picture.ts
    title: src/islands/consortium/rules/picture.ts
    digest: sha256:239424e30f36130f
    last_modified: 2026-11-14T18:01:21Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:56d00d4048591c6f
    last_modified: 2026-11-14T21:28:50Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:1049f9dc00bc792a
    last_modified: 2026-11-14T21:28:50Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:1afe77755f5cad27
    last_modified: 2026-11-14T21:05:18Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:ef7536bd28f46910
    last_modified: 2026-11-14T14:41:58Z
enforced_by:
  - scripts/browser/consortium-pp-b2.browser.test.mjs
  - scripts/consortium-pp-b2.test.mjs
---

## What it is

The page the grower sees after the Place step (PP-B stream b2): one column, in its own chunk (role
`palette`, `App.tsx` `lazyPart(retryableImport(...))`, cap 12 KB, built 5.2 KB).

| Part | File | What it shows |
|---|---|---|
| Header steps | `views/palette/Palette.tsx` | Your place (a button back to Place), Your palette (current), Planting plan (later) |
| Next step | `views/palette/NextStep.tsx` | the first open hole in words and years (`holeWords` = lane name + `holeLine`), its best three fillers with fit line and one-tap Add, See all (Add preset to the hole), Not now (`store.notNow`, never saved), the other holes with Find; outside-range fillers behind "Show N outside their climate range" |
| Through the years | `views/palette/Years.tsx`, `rules/picture-years.ts` | one lane per light level (and "not recorded"); phone (max-width 639px): one time step with Earlier / Later writing `store.yearStep` and announcing `changeSummary` |
| Jobs | `views/palette/JobsPicture.tsx`, `rules/picture-jobs.ts` | one lane per job (and "no job recorded") |
| Placeholder | `views/palette/Placeholder.tsx` | a return visit restoring, and the palette page until the plants are read (P2) |

## Rules

- Verdicts come from the core verdict engine (`store.memberVerdicts`, `poolVerdicts`); holes are computed in
  `Palette.tsx` through core `holes.ts`, never in the store.
- Every picture uses one model (`rules/picture.ts`): the SVG is `role=img` named by the summary with
  nothing focusable inside; plants and holes are HTML buttons; "Show as a table" (`views/kit/chart.tsx`)
  renders `tableOf` with the same cells (checked by `scripts/picture-table.mjs`).
- Verdict, hole and year words only through core `verdict-line.ts` (`consortium.line.*`), drawn by
  `views/kit/fit.tsx` `say`. Picture keys are one segment after `consortium.palette.` because the
  unused-key check matches a template literal only against single-segment keys.
- `kit/fit.tsx` reaches the first run through `views/kit/sheet.tsx` `shared` (Add reads `FitLine`; a
  sheet chunk may import first-run modules only, check-built-site K3).
- Inform, don't block (owner 2026-11-14): one tap adds any plant; a member outside its range or needing
  a second look carries its fit line on its chip in the pictures.

## Honest states (shell)

- Still loading: `data/load.ts` calls `slow` after 5 s (`__ctTimeouts.slow` in the test build); `main.ts`
  sets `store.slow`.
- Offline: `store.offline` from `navigator.onLine` and its events (wired in `store.start()`); a persistent
  `.ct-offline` status line in `App.tsx`; `views/lazy.tsx` `LoadFailed` says "Needs a connection" and
  retries on `online`; online, Reload retries a retryable part in place (`?retry=n`).
- A guest list that fails (`store.failedPools`, `failedMembers`) is named on the page with its plants not
  checked; only the chosen climate's list failing is the tool's failure screen.
- The verdict chunk refused: `store.verdictFailed`, one alert with Reload; every fit line says "Not checked".
- Toasts wait under pointer or focus (`store.holdToast`) and return focus to the control that raised them
  (`focus.ts` `noteToastOpener`, `focusAfterToast`).
- The sqlite wasm is preloaded with `crossorigin` by `astro.config.mjs` (one wasm, checked at build).

## Tests

`scripts/consortium-pp-b2.test.mjs` (vectors, pictures, probe) and
`scripts/browser/consortium-pp-b2.browser.test.mjs` (A1, A2, S1, S2, P1, P2, P8, PP-B6-8, 15-18, 20-22, 24, 25).
