---
type: Module
title: Consortium palette page
description: "The Plant palette page after the Place step: header steps, the Next step, Through the years and the jobs pictures with their table form, and the shell's honest states."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T00:16:10Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-18T00:16:04Z }
sources:
  - id: palette-tsx
    resource: ../../src/islands/consortium/views/palette/Palette.tsx
    title: src/islands/consortium/views/palette/Palette.tsx
    digest: sha256:15b74990f89ca4fb
    last_modified: 2026-11-17T19:12:16Z
  - id: nextstep-tsx
    resource: ../../src/islands/consortium/views/palette/NextStep.tsx
    title: src/islands/consortium/views/palette/NextStep.tsx
    digest: sha256:cb7e165cdbf709c4
    last_modified: 2026-11-17T19:12:16Z
  - id: years-tsx
    resource: ../../src/islands/consortium/views/palette/Years.tsx
    title: src/islands/consortium/views/palette/Years.tsx
    digest: sha256:931b5dc8429fbd9d
    last_modified: 2026-11-14T16:49:53Z
  - id: chart-tsx
    resource: ../../src/islands/consortium/views/kit/chart.tsx
    title: src/islands/consortium/views/kit/chart.tsx
    digest: sha256:d25c6598c940822f
    last_modified: 2026-11-17T19:12:16Z
  - id: fit-tsx
    resource: ../../src/islands/consortium/views/kit/fit.tsx
    title: src/islands/consortium/views/kit/fit.tsx
    digest: sha256:3e63b98aa4fedfe3
    last_modified: 2026-11-17T23:52:29Z
  - id: picture-ts
    resource: ../../src/islands/consortium/rules/picture.ts
    title: src/islands/consortium/rules/picture.ts
    digest: sha256:239424e30f36130f
    last_modified: 2026-11-14T18:01:21Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:ca29813fffe9f702
    last_modified: 2026-11-17T13:23:27Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:cbfcbb83cffaa528
    last_modified: 2026-11-17T13:23:27Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:6b68b3a0f3306bd6
    last_modified: 2026-11-18T00:13:24Z
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
| Your plants | `views/palette/YourPlants.tsx`, core `weigh.ts` `yourPlants`, `sizeLine` | each plant once, warned plants first (owner "warn, never hide"), each warning in words with the warning icon (toxicity by level: Slight the `--warning` token with "Mildly toxic", Moderate and Severe the `--danger` token), its marks, its size ("in the wild": `height_m` is the wild maximum), and Remove (toast with Undo; focus to the next row's Remove, else the heading); then a plain row for each member the page cannot show (its guest list unread: `store.failedMembers`; on none of this climate's lists: `missingMembers.unlisted`; a member the shown plants already hold gets no such row) with why and Remove; `Palette.tsx` builds the rows once and passes them in; above 12 rows the rest fold behind "+ N more", opening it focuses the first row it shows (a plain focus, the toast keeps its opener); nothing at 0 plants |
| Things to weigh | `views/palette/Weigh.tsx`, core `weigh.ts` `weighLines(members, {lookup, period}, {pending, unchecked})` | one family holding at least 3 plants and a quarter of the palette (neutral hint), and the water line only when needs are mixed ("Needs regular water" beside dry-loving) or under half are recorded ("not enough to judge"); no all-clear line (owner 2026-11-15); with no water line, the plants with no water need recorded still get a line of their own ("Water need not recorded for N plants"); water need read through `factAt('water_need', …)` (ADR-6) and grouped by core `weigh.ts` `waterNeed`; the plants not checked (the rows Your plants shows for them, counted by `Palette.tsx` from the same rows) count in m and are said ("N plants not checked"), never a judgement of part of the palette as the whole; "Checking" while a list loads, never for a list that failed; each line says "estimate" on a borrowed list; nothing at 0 plants |
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
- Your plants and Things to weigh derive in the views (`useMemo`), never in the store (first run). Vectors:
  `scripts/vectors/weigh.json`; unit tests `scripts/consortium-pp-b3.test.mjs`; browser: the pf
  board specs `scripts/browser/consortium-pf-b.browser.test.mjs` (pf commit 0 swept
  `consortium-pp-b3.browser.test.mjs` into them; the board specs of the palette page, Place and the
  location are `consortium-pf-a/-pf-b/-pf-c.browser.test.mjs`, each head listing the old tests it carries).
- The toxicity level's colour shows only in Your plants and Details (`kit/flags.ts` `Line.level`,
  `data-level` on the row's flag line and on the Details warning list item; colours in
  `src/styles/consortium/plants.css`); never colour alone. The print sheet prints the level in words
  (`PrintSheet.tsx` reuses `flagLines` for a toxicity note).
- `factAt` is in the first run by real use: core `site.ts`'s water check reads `water_need` through it
  (no site, `TODAY_PERIOD`), so the palette chunk (`weigh.ts`) and Details import it from the core
  without a shared lazy chunk a sheet may not import (check-built-site K3). First run 39.7 KB of 40
  (40,661 bytes gzip -9 at b3 fix round 3).
- The print sheet lists the members the page cannot show after the plants, each with why (the words of
  Your plants), and counts the whole palette. It writes that filter out instead of importing core
  `yourPlants`: shared by the palette and later chunks, `weigh.ts` would split into a chunk of its own.
- Inform, don't block (owner 2026-11-14): one tap adds any plant; a member outside its range or needing
  a second look carries its fit line on its chip in the pictures.

## Honest states (shell)

- Still loading: `data/load.ts` calls `slow` after 5 s (`__ctTimeouts.slow` in the test build); `main.ts`
  sets `store.slow`.
- The loading line (`App.tsx` `LoadingLine`, one `role="status"` from the first render) goes on the page
  empty and takes "Loading the plant list…" after the first paint, so it is announced (PP-B3, A25; PP-B
  exit, 2026-11-16: the first render always comes before the plants are read).
- Offline: `store.offline` from `navigator.onLine` and its events (wired in `store.start()`); a persistent
  `.ct-offline` status line in `App.tsx`; `views/lazy.tsx` `LoadFailed` says "Needs a connection" and
  retries when the store's `offline` signal turns false (not a listener of its own, which an effect
  added after paint and so missed a connection back in that window: PP-B16b, PP-B exit); the verdict chunk's notice says "Needs a connection" and `store.start()` retries
  it on `online`; online, Reload retries a retryable part in place (`?retry=n`). When a failed retry's verdict file itself answers a HEAD (`store.verdictNeedsReload`: the file arrived but its import failed, a static dependency Chromium keeps failed in that document; PP-C c2 merge, A8/A14), no retry is offered or run on `online`: the notice, Details' Against your place, the pool's count line and the Suggest toast show Reload (`load.reload`, a page reload) instead; a refused or dropped file keeps Try again (PP-B20, PP-B49).
- A guest list that fails (`store.failedPools`, `failedMembers`) is named on the page with its plants not
  checked ("The Tropical list could not be read: …": `{lists}` takes the climate names, `zoneName`, since
  every locale's template carries its own "list" word); only the chosen climate's list failing is the
  tool's failure screen. A Suggest pressed or waiting then suggests around the plants at hand and keeps
  the failed list's plants (P5-27n; core `suggest()` keeps unread seeds).
- The verdict chunk refused: `store.verdictFailed`, one alert with Reload; every fit line says "Not checked".
- Toasts wait under pointer or focus (`store.holdToast`) and return focus to the control that raised them
  (`focus.ts` `noteToastOpener`, `focusAfterToast`). Pre-push fix 6: an own plant's × on Place hands the focus to
  the neighbour's ×, else "Add a plant"; Start over to the toast's Undo; Undo lands on the plant in the region it
  was removed from (`ToastLine.from`); "Show N outside" and "Show all" to the first shown plant; and `watchFocus`
  (main.ts) is the safety net: when the focused control leaves the page and focus falls to `<body>`, its
  region's heading takes it.
- Place's head on the palette step is a plain place line (count and climate, `.ct-result-sub`), not a
  heading, so the step has one "Your palette" heading (pre-push fix 7).
- The sqlite wasm is preloaded with `crossorigin` by `astro.config.mjs` (one wasm, checked at build).

## Tests

`scripts/consortium-pp-b2.test.mjs` (vectors, pictures, probe) and
`scripts/browser/consortium-pp-b2.browser.test.mjs` (A1, A2, S1, S2, P1, P2, P8, PP-B6-8, 15-18, 20-22, 24, 25).
