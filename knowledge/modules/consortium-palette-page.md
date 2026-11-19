---
type: Module
title: Consortium palette page
description: "The Plant palette page after the Place step: header steps, the Next step, Through the years and the jobs pictures with their table form, and the shell's honest states."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-19T10:56:14Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-18T12:46:09Z }
sources:
  - id: palette-tsx
    resource: ../../src/islands/consortium/views/palette/Palette.tsx
    title: src/islands/consortium/views/palette/Palette.tsx
    digest: sha256:49df728398240c7b
    last_modified: 2026-11-19T08:17:40Z
  - id: nextstep-tsx
    resource: ../../src/islands/consortium/views/palette/NextStep.tsx
    title: src/islands/consortium/views/palette/NextStep.tsx
    digest: sha256:f1a44de7554e891c
    last_modified: 2026-11-19T08:17:40Z
  - id: years-tsx
    resource: ../../src/islands/consortium/views/palette/Years.tsx
    title: src/islands/consortium/views/palette/Years.tsx
    digest: sha256:2f1f47359616befc
    last_modified: 2026-11-19T09:07:50Z
  - id: chart-tsx
    resource: ../../src/islands/consortium/views/kit/chart.tsx
    title: src/islands/consortium/views/kit/chart.tsx
    digest: sha256:8f0324bd61988d5f
    last_modified: 2026-11-19T09:07:50Z
  - id: fit-tsx
    resource: ../../src/islands/consortium/views/kit/fit.tsx
    title: src/islands/consortium/views/kit/fit.tsx
    digest: sha256:14964280ae358d64
    last_modified: 2026-11-19T06:44:45Z
  - id: picture-ts
    resource: ../../src/islands/consortium/rules/picture.ts
    title: src/islands/consortium/rules/picture.ts
    digest: sha256:c3dc68f2bd469897
    last_modified: 2026-11-18T17:07:24Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:9b5471db4254810e
    last_modified: 2026-11-19T05:13:33Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:cbfcbb83cffaa528
    last_modified: 2026-11-17T13:23:27Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:c4e8c2410220e903
    last_modified: 2026-11-19T09:07:50Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:6346b81af8801e47
    last_modified: 2026-11-18T15:30:23Z
  - id: weigh-ts
    resource: ../../src/lib/consortium/weigh.ts
    title: src/lib/consortium/weigh.ts
    digest: sha256:6942a56137019e61
    last_modified: 2026-11-19T05:25:31Z
  - id: weigh-view-tsx
    resource: ../../src/islands/consortium/views/palette/Weigh.tsx
    title: src/islands/consortium/views/palette/Weigh.tsx
    digest: sha256:bdc17dc0f3947bcf
    last_modified: 2026-11-19T09:07:50Z
  - id: jobs-picture-tsx
    resource: ../../src/islands/consortium/views/palette/JobsPicture.tsx
    title: src/islands/consortium/views/palette/JobsPicture.tsx
    digest: sha256:23ad0e26719a7027
    last_modified: 2026-11-19T09:07:50Z
  - id: actions-tsx
    resource: ../../src/islands/consortium/views/Actions.tsx
    title: src/islands/consortium/views/Actions.tsx
    digest: sha256:554bc62276690579
    last_modified: 2026-11-19T06:34:34Z
  - id: palette-page-css
    resource: ../../src/styles/consortium/palette-page.css
    title: src/styles/consortium/palette-page.css
    digest: sha256:7b3b161a4bbec2cf
    last_modified: 2026-11-19T06:07:14Z
  - id: pf-b-test
    resource: ../../scripts/consortium-pf-b.test.mjs
    title: scripts/consortium-pf-b.test.mjs
    digest: sha256:a4849dd51b47e1a0
    last_modified: 2026-11-18T17:33:57Z
  - id: find-tsx
    resource: ../../src/islands/consortium/views/find/Find.tsx
    title: src/islands/consortium/views/find/Find.tsx
    digest: sha256:668fb618a9d170ed
    last_modified: 2026-11-19T07:06:28Z
  - id: figures-tsx
    resource: ../../src/islands/consortium/views/figures/Figures.tsx
    title: src/islands/consortium/views/figures/Figures.tsx
    digest: sha256:b9b2e4521253a7ee
    last_modified: 2026-11-19T10:39:31Z
  - id: slots-tsx
    resource: ../../src/islands/consortium/views/figures/slots.tsx
    title: src/islands/consortium/views/figures/slots.tsx
    digest: sha256:79f15300e5705e7d
    last_modified: 2026-11-19T10:23:52Z
  - id: figures-css
    resource: ../../src/styles/consortium/figures.css
    title: src/styles/consortium/figures.css
    digest: sha256:91a8e9ccd407316c
    last_modified: 2026-11-19T10:23:52Z
enforced_by:
  - scripts/browser/consortium-pp-b2.browser.test.mjs
  - scripts/consortium-pf-b.test.mjs
  - scripts/consortium-pp-b2.test.mjs
---

## What it is

The page the grower sees after the Place step (PP-B stream b2): one column, in its own chunk (role
`palette`, `App.tsx` `lazyPart(retryableImport(...))`, cap 12 KB, built 5.2 KB).

| Part | File | What it shows |
|---|---|---|
| Header steps | `views/palette/Palette.tsx` | Your place (a button back to Place), Your palette (current), Planting plan (later) |
| Next step | `views/palette/NextStep.tsx` | the first open hole in words and years (`holeWords` = lane name + `holeLine`), its best three fillers with fit line and one-tap Add; fillers grouped by fit (fits, "Needs a second look (n)", "Not checked (n)"); the no-fit sentence only when core `noneFits` (no plant fits and none unchecked; pf-a R3); See all whenever there are plants to see, Not now (`store.notNow`, never saved), the other holes with Find; outside-range fillers behind "Show N outside their climate range"; a dry place adds `dryIntroLine` to the why sentence; the room note ("Balcony or pots.") sits above the card, not in it (BC32); the empty palette is a card of three bordered ways with a note under it counting the plants that fit near the place (BC33) |
| Through the years | `views/palette/Years.tsx`, `rules/picture-years.ts` | one lane per light level (and "not recorded"); phone (max-width 639px): one time step with Earlier / Later writing `store.yearStep` and announcing `changeSummary` |
| Jobs | `views/palette/JobsPicture.tsx` (reads `store.lanes`: holes.ts laneCounts' `counted` and `outside` per lane) | one lane per job (and "no job recorded") |
| Your plants | `views/palette/YourPlants.tsx`, core `weigh.ts` `yourPlants`, `sizeLine` | each plant once, warned plants first (owner "warn, never hide"), each warning in words with the warning icon (toxicity by level: Slight the `--warning` token with "Mildly toxic", Moderate and Severe the `--danger` token), its marks, its size ("in the wild": `height_m` is the wild maximum), and Remove (toast with Undo; focus to the next row's Remove, else the heading); then a plain row for each member the page cannot show (its guest list unread: `store.failedMembers`; on none of this climate's lists: `missingMembers.unlisted`; a member the shown plants already hold gets no such row) with why and Remove; `Palette.tsx` builds the rows once and passes them in; above 12 rows the rest fold behind "+ N more", opening it focuses the first row it shows (a plain focus, the toast keeps its opener); nothing at 0 plants |
| Things to weigh | `views/palette/Weigh.tsx`, core `weigh.ts` `weighLines(members, {lookup, period}, {pending, unchecked})` | one family holding at least 3 plants and a quarter of the palette (neutral hint), and the water line only when needs are mixed ("Needs regular water" beside dry-loving) or under half are recorded ("not enough to judge"); no all-clear line (owner 2026-11-15); with no water line, the plants with no water need recorded still get a line of their own ("Water need not recorded for N plants"); water need read through `factAt('water_need', …)` (ADR-6) and grouped by core `weigh.ts` `waterNeed`; the plants not checked (the rows Your plants shows for them, counted by `Palette.tsx` from the same rows) count in m and are said ("N plants not checked"), never a judgement of part of the palette as the whole; "Checking" while a list loads, never for a list that failed; each line says "estimate" on a borrowed list; nothing at 0 plants |
| Placeholder | `views/palette/Placeholder.tsx` | a return visit restoring, and the palette page until the plants are read (P2) |

## Rules

- Verdicts come from the core verdict engine (`store.memberVerdicts`, `poolVerdicts`); holes are computed in
  `Palette.tsx` through core `holes.ts`, never in the store.
- Every picture uses one model (`rules/picture.ts`); plants and holes are HTML buttons; the table form
  (`views/kit/chart.tsx` `SrTable`, visually hidden, Q8) renders `tableOf` with the same cells (checked by
  `scripts/picture-table.mjs`); no "Show as a table" button.
- Verdict, hole and year words only through core `verdict-line.ts` (`consortium.line.*`), drawn by
  `views/kit/fit.tsx` `say`. Picture keys are one segment after `consortium.palette.` because the
  unused-key check matches a template literal only against single-segment keys.
- `kit/fit.tsx` reaches the first run through `views/kit/sheet.tsx` `shared` (Add reads `FitLine`; a
  sheet chunk may import first-run modules only, check-built-site K3).
- The rows the Next step and Find share (`Marks`, `rowRoles`/`rowSize`/`rowSpan`, `holeFillers`,
  `HoleRow`, `addedWords`, `PLUS`) live in `views/rows.tsx` (not `views/kit/`: they read the store, and
  the kit is a leaf, L5). `App.tsx` imports it and `views/kit/more.tsx` (MoreList) for their place in the
  first run, and `astro.config.mjs` `FIRST_RUN_KIT` builds both untreeshaken: a module with no side
  effect of its own would otherwise be dropped from that import and land in a third, shared lazy chunk
  that the Find chunk imports statically (K3 red).
- Your plants and Things to weigh derive in the views (`useMemo`), never in the store (first run). Vectors:
  `scripts/vectors/weigh.json`; unit tests `scripts/consortium-pp-b3.test.mjs`; browser: the pf
  board specs `scripts/browser/consortium-pf-b.browser.test.mjs` (pf commit 0 swept
  `consortium-pp-b3.browser.test.mjs` into them; the board specs of the palette page, Place and the
  location are `consortium-pf-a/-pf-b/-pf-c.browser.test.mjs`, each head listing the old tests it carries).
- The toxicity level shows in words and colour in Your plants, Details, and (v14 pf-b) on every bar and
  chip of Through the years (`kit/chart.tsx` `ToxMark`: a triangle `role=img` labelled "Toxic", "Mildly
  toxic" or "Very toxic", the level word also in the button's name) and on the Warnings chips; never
  colour alone. The print sheet prints the level in words (`PrintSheet.tsx` reuses `flagLines`).
- `factAt` is in the first run by real use: core `site.ts`'s water check reads `water_need` through it
  (no site, `TODAY_PERIOD`), so the palette chunk (`weigh.ts`) and Details import it from the core
  without a shared lazy chunk a sheet may not import (check-built-site K3). First run 39.7 KB of 40
  (40,661 bytes gzip -9 at b3 fix round 3).
- The print sheet lists the members the page cannot show after the plants, each with why (the words of
  Your plants), and counts the whole palette. It writes that filter out instead of importing core
  `yourPlants`: shared by the palette and later chunks, `weigh.ts` would split into a chunk of its own.
- Inform, don't block (owner 2026-11-14): one tap adds any plant; a member outside its range or needing
  a second look carries its fit line on its chip in the pictures.

## The pictures, Warnings and Balance (v14 pf-b, fix round 1, 2026-11-18)

- **One names list** (size rule A14): every list of member names in Years, Jobs, Warnings and Balance goes
  through `kit/chart.tsx` `Names`: inline (a conjunction list in the page language) while the palette has
  40 plants or fewer and the group 12 or fewer, else the count cell (`kit/more.tsx` MoreList), its names
  sorted by display name. `scripts/consortium-pf-b.test.mjs` fails a view that joins names itself.
- **Row and strip figures from the model**: `PictureRow.count` (plants standing that count toward the holes)
  and `outside`; `stripStates(lane, holes, thins, pending)`: a span is a hole only inside an open job hole,
  thin only inside an open thin spot, filled otherwise when held, neutral while a list loads.
- **Thin lines** show only when no list is pending and the palette is not an untouched suggestion (A19).
- **Second look reasons**: core `weigh.ts` `LOOK_REASON` maps every `Factor` (climate factors to the edge of
  the range, soil-ph to the soil pH, water and drainage to the water, light and wind to the room or plot);
  `leaveGroups` computes the small card's leave-their-range line; `outsideToxic` names toxic plants on the
  outside line.
- **Water line**: "Water use" (`palette.balance.waterUseTitle`) where the summer is not dry; elsewhere
  "Water needs" in four forms (too few, the board's mix "one thirsty plant among N recorded", all take a
  dry summer, only the plants not recorded); every form names the plants not recorded.
- **Copy link** is a disclosure opening Share's panel under it (link from the palette shown, Copy, Include
  my place); closing it returns the focus to Copy link.
- "How to read this" sits under both picture titles with five paragraphs; a small panel at 960 px and wider.

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
- Two list facts, never folded into one (PP-C c4 R1): `store.listsState` ('failed' first, then 'loading',
  else 'ready') words the holes answer (the Next step, the Jobs intro); `store.listsLoading` makes every count
  wait (the Jobs rows, Through the years' cells and note, Things to weigh say "Loading…" or "checking")
  while any list is read, whatever has failed, so no partial count shows (F26; browser PP-B29b).
- A warned add's toast Show (`store.addMembers`): for the plant whose Details is on top, that sheet stays
  and its first warning chip takes the focus (`focus.ts` `focusWarning`); else the plant's Details opens,
  from Find when Find is on top, so it keeps "‹ Back to results" (c4 R2, C2; unit B4.1, browser PFF36d).
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

## Chunk-2 main fixes (PP-C h2, 2026-11-18)

- **Next step.** The second-look chip says why (core `lookChipLine`: "Near the edge of its range"…);
  the add note explains the figure it aims for (core `addGoal`: Plants per job less what the job
  has). A row's change lines come from core `holeChangeLines`, `target: 'none'` when no target is
  left. The empty small-palette sub-line counts `store.suggestionSize` (`SIZE_LIMIT`, now declared in
  `lib/consortium/site.ts`).
- **One count source for holes.** `views/rows.tsx` `holeFillers` gives a hole's "N plants" for the
  Next step, its other holes, Find's hole rows and (M25) the jobs picture's hole lines past 40 plants:
  "…; no plant on your lists fits here and does this then; N do it but are outside their climate
  range." (`palette.jobHoleNoFit`, `palette.jobHoleOutside`). A warned plant with no recorded range
  is a second look everywhere (holes.ts `fillerGroup`; weigh.ts `fitGroups` reads it too, E7).
- **Jobs.** No own copy of the lane rule: `rules/picture-jobs.ts` went (M25); each row reads its lane's
  `counted` (its figure, names and strip) and `outside` (named apart). D1: below 960 px the intro's
  "Plants per job: 2" is a link button (`palette.goalLink`, `.ct-goal-link`, 40 px tall) that opens the
  1/2/3/5 control in place (`#ct-goal[data-folded]`); at 960 px and wider the control always shows and
  the words are plain (`.ct-goal-say`).
- **Lists as MoreLists.** Find's groups and every names list use the kit MoreList (40 plants / 12 items
  size rule); its opener names its group after the count ("+ 71 more: Fits your place", prop `group`).
  Names lists use `rules/picture.ts` `plainList` (the locale's own separator, no conjunction:
  "橄榄、杏仁、无花果").
- **How to read this.** A closed disclosure under each picture's title; at 960 px and wider a
  `popover="auto"` panel over the page (kit/chart.tsx).
- **Balance.** The family line ends with "Find a soil feeder of another family"
  (`palette.balance.familyFind.<Family>`): Find opened on `feeds_soil` with `fits` (not that family) and
  `title` (SheetFor `title`, null for the plain sheet), no hole.
- **Find.** The fit box's "Fits your place" adds "· N already in your palette" (D5,
  `find.fitsInPalette`), so with no filter it adds up to the board subtitle. A row's Undo after an add
  is `store.takeBackAdd(id)` ("<name> taken back out.", never a `removed` entry). With the desk panel
  open the side column sits under the Next step (find.css, E2). A list that failed is offered again
  with "Try again" (`store.retryFailedLists`; a list that loads leaves `failedPools`).
- **Shell.** The slow loading line adds the bytes ("0.8 of 1.4 MB.", `store.loadProgress` from
  data/load.ts `download`'s reader, total from the index's size; `load.progress`, format.ts
  `formatMegabytes`). The offline line is pinned by PFC52.

## Main h2 hand-off (2026-11-18)

- The missing guest list's notice: "Try again" re-reads the list from the opened database (`store.ts` `retryFailedLists`, `listRetry` busy while it reads); a retry that fails again gives way to Reload, which fetches the database again (the read is local, so no "needs a connection").
- Past 40 plants a job's hole line uses the Next step's clause order: "no plant on your lists fits here…" only when none is still to be checked (`noneFits`), then the second-look and unchecked counts (`rows.tsx` `holeFillerParts`), then the outside ones.
- Find's "· N already in your palette" counts the palette's plants that pass the sheet's predicate and filters; a predicate sheet without a hole (Balance's "Find a soil feeder of another family") counts its own listed plants in the subtitle (`find.lede`).

## "What limits plants here" on the palette (follow-up F1, 2026-11-19)

- Drawn first, before the Next step (board SiteMendoza), only where a line limits (an outside count, or a member drier here); `views/figures/Figures.tsx` `PaletteLimits`, mounted through the lazy shell `views/figures/slots.tsx`.
- Shown state: the current answer once the checks are ready, the last ready answer for this place and list while they count, the counting or failed state before any. Once it has shown a limiting line on this visit (same place key and the same loaded list, `store.pools[climate]`) it stays for the visit with every row it showed, so an edit made in it never removes the card or the focused row; the change is said in words ("No climate line limits plants here.", the row's "Not a limit for this list"). Unmounting the palette ends the visit.
- Phone (max-width 639px, RULED (a)): closed to its head, the main limit in one line (`figures.limitsSummary`, or `figures.limitsSummaryWater`) and a button with `aria-expanded` ("Show the N limits", `figures.limitsShow`); the Water card is hidden with the body. From 640 px the body is `display: contents` and the button is not drawn (`styles/consortium/figures.css`).
- The figures parts are not quiet lazy parts: while their chunk loads they render nothing (the slot reserve in `base.css` holds the room); a failed chunk shows the in-place "could not open" notice with Reload, which retries in place, so the reserve ends.
