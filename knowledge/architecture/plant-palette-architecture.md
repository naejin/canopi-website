---
type: Architecture
title: Plant palette architecture
description: "Target architecture of the Plant palette redesign: layers and modules, one owner per concept (place, verdict, holes, pictures, colour tokens), data flow, what is computed where, reuse and deletions, link v5 and storage, failure states, and the formats that outlive the code."
tags: [consortium, architecture]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T12:10:48Z }
sources:
  - id: decisions-consortium-v2-architecture
    resource: /decisions/consortium-v2-architecture.md
  - id: decisions-consortium-island-layers
    resource: /decisions/consortium-island-layers.md
  - id: decisions-consortium-chunk-budgets
    resource: /decisions/consortium-chunk-budgets.md
  - id: dependency-cruiser-cjs
    resource: ../../.dependency-cruiser.cjs
    title: .dependency-cruiser.cjs
    digest: sha256:29cbaf3dbda18ec2
    last_modified: 2026-11-14T10:56:09Z
  - id: redirects
    resource: ../../public/_redirects
    title: public/_redirects
    digest: sha256:1989f035d8389357
    last_modified: 2026-10-29T05:02:41Z
  - id: consortium-f1a-palette-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-palette.browser.test.mjs
    title: scripts/browser/consortium-f1a-palette.browser.test.mjs
    digest: sha256:66dd80fab9571457
    last_modified: 2026-11-13T20:25:47Z
  - id: harness-mjs
    resource: ../../scripts/browser/harness.mjs
    title: scripts/browser/harness.mjs
    digest: sha256:e4291993bd99bb01
    last_modified: 2026-11-14T10:56:09Z
  - id: serve-mjs
    resource: ../../scripts/browser/serve.mjs
    title: scripts/browser/serve.mjs
    digest: sha256:2fbd78dfb558f1ec
    last_modified: 2026-11-12T22:04:52Z
  - id: built-links-test-mjs
    resource: ../../scripts/built-links.test.mjs
    title: scripts/built-links.test.mjs
    digest: sha256:88cbfde377899ff2
    last_modified: 2026-10-29T05:02:41Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:e6e2dd373870d866
    last_modified: 2026-11-14T11:45:53Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:0f3014353a94fa8d
    last_modified: 2026-11-14T11:45:53Z
  - id: consortium-balance-test-mjs
    resource: ../../scripts/consortium-balance.test.mjs
    title: scripts/consortium-balance.test.mjs
    digest: sha256:1f0c3404a3d86aea
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:8165db4fcb8d590c
    last_modified: 2026-11-13T07:53:00Z
  - id: guides-consortium-test-mjs
    resource: ../../scripts/guides-consortium.test.mjs
    title: scripts/guides-consortium.test.mjs
    digest: sha256:54b8fd886c66eeb7
    last_modified: 2026-11-11T03:33:26Z
  - id: arch-rules-test-mjs
    resource: ../../scripts/quality/arch-rules.test.mjs
    title: scripts/quality/arch-rules.test.mjs
    digest: sha256:174d28aca3493758
    last_modified: 2026-11-14T10:56:09Z
  - id: arch-json
    resource: ../../scripts/quality/baselines/arch.json
    title: scripts/quality/baselines/arch.json
    digest: sha256:d909d5cc883162f8
    last_modified: 2026-11-14T10:56:09Z
  - id: tryconsortium-astro
    resource: ../../src/components/guides/TryConsortium.astro
    title: src/components/guides/TryConsortium.astro
    digest: sha256:7ebcb06064fed9aa
    last_modified: 2026-11-11T02:58:29Z
  - id: consortium-path-js
    resource: ../../src/i18n/consortium-path.js
    title: src/i18n/consortium-path.js
    digest: sha256:00ce49df9e856b0e
    last_modified: 2026-10-29T05:02:41Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:5bf1dfad1494463b
    last_modified: 2026-11-14T12:02:08Z
  - id: load-ts
    resource: ../../src/islands/consortium/data/load.ts
    title: src/islands/consortium/data/load.ts
    digest: sha256:7a882f57f3bb9d6b
    last_modified: 2026-11-13T13:02:30Z
  - id: search-ts
    resource: ../../src/islands/consortium/data/search.ts
    title: src/islands/consortium/data/search.ts
    digest: sha256:9c922c58f2aad746
    last_modified: 2026-11-13T13:02:30Z
  - id: sqlite-source-ts
    resource: ../../src/islands/consortium/data/sqlite-source.ts
    title: src/islands/consortium/data/sqlite-source.ts
    digest: sha256:476f116c5e449766
    last_modified: 2026-11-14T11:38:37Z
  - id: focus-ts
    resource: ../../src/islands/consortium/focus.ts
    title: src/islands/consortium/focus.ts
    digest: sha256:dc512a822aa08263
    last_modified: 2026-11-13T20:25:47Z
  - id: format-ts
    resource: ../../src/islands/consortium/format.ts
    title: src/islands/consortium/format.ts
    digest: sha256:06b8eec382eb0f9a
    last_modified: 2026-11-14T10:56:09Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:ab45b5e62406d5b7
    last_modified: 2026-11-13T14:46:32Z
  - id: list-query-ts
    resource: ../../src/islands/consortium/rules/list-query.ts
    title: src/islands/consortium/rules/list-query.ts
    digest: sha256:be4bbd1d3c23e9c1
    last_modified: 2026-11-14T12:03:22Z
  - id: site-fit-ts
    resource: ../../src/islands/consortium/rules/site-fit.ts
    title: src/islands/consortium/rules/site-fit.ts
    digest: sha256:4fa31efc0327a38b
    last_modified: 2026-11-13T07:02:37Z
  - id: suggest-block-ts
    resource: ../../src/islands/consortium/rules/suggest-block.ts
    title: src/islands/consortium/rules/suggest-block.ts
    digest: sha256:bc785e5e9d676b40
    last_modified: 2026-11-13T07:27:10Z
  - id: arrival-ts
    resource: ../../src/islands/consortium/state/arrival.ts
    title: src/islands/consortium/state/arrival.ts
    digest: sha256:cd2bd5da5bcdbfd5
    last_modified: 2026-11-14T10:56:09Z
  - id: draft-ts
    resource: ../../src/islands/consortium/state/draft.ts
    title: src/islands/consortium/state/draft.ts
    digest: sha256:31a413ffec3ce0e4
    last_modified: 2026-11-14T11:40:20Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:bdf71e540c290ea1
    last_modified: 2026-11-13T12:40:55Z
  - id: persist-ts
    resource: ../../src/islands/consortium/state/persist.ts
    title: src/islands/consortium/state/persist.ts
    digest: sha256:5cc847af70dbb553
    last_modified: 2026-11-14T11:40:16Z
  - id: restore-ts
    resource: ../../src/islands/consortium/state/restore.ts
    title: src/islands/consortium/state/restore.ts
    digest: sha256:4b57cc74b77d753f
    last_modified: 2026-11-14T11:40:16Z
  - id: schema-ts
    resource: ../../src/islands/consortium/state/schema.ts
    title: src/islands/consortium/state/schema.ts
    digest: sha256:b6b3c4a07c8b9b9d
    last_modified: 2026-11-14T11:39:20Z
  - id: suggest-wait-ts
    resource: ../../src/islands/consortium/state/suggest-wait.ts
    title: src/islands/consortium/state/suggest-wait.ts
    digest: sha256:f83b76f23d227291
    last_modified: 2026-11-13T14:56:35Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:d11d0a245a854604
    last_modified: 2026-11-14T11:39:47Z
  - id: strings-ts
    resource: ../../src/islands/consortium/strings.ts
    title: src/islands/consortium/strings.ts
    digest: sha256:988e109b9dc5773d
    last_modified: 2026-11-13T13:04:08Z
  - id: actions-tsx
    resource: ../../src/islands/consortium/views/Actions.tsx
    title: src/islands/consortium/views/Actions.tsx
    digest: sha256:b28baf4eed1d35b0
    last_modified: 2026-11-14T11:42:40Z
  - id: add-tsx
    resource: ../../src/islands/consortium/views/Add.tsx
    title: src/islands/consortium/views/Add.tsx
    digest: sha256:f703c2bee528a850
    last_modified: 2026-11-13T14:46:32Z
  - id: correction-tsx
    resource: ../../src/islands/consortium/views/Correction.tsx
    title: src/islands/consortium/views/Correction.tsx
    digest: sha256:d8b5e48bb82a9da3
    last_modified: 2026-11-13T13:15:04Z
  - id: futureslot-tsx
    resource: ../../src/islands/consortium/views/FutureSlot.tsx
    title: src/islands/consortium/views/FutureSlot.tsx
    digest: sha256:1b16c071bd91fd73
    last_modified: 2026-11-13T14:56:35Z
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:349ff16b9b85cbc7
    last_modified: 2026-11-13T16:13:32Z
  - id: paste-tsx
    resource: ../../src/islands/consortium/views/Paste.tsx
    title: src/islands/consortium/views/Paste.tsx
    digest: sha256:9d57f6a7d24cde3c
    last_modified: 2026-11-13T14:46:32Z
  - id: plantmarks-tsx
    resource: ../../src/islands/consortium/views/PlantMarks.tsx
    title: src/islands/consortium/views/PlantMarks.tsx
    digest: sha256:19b90a13185c65b7
    last_modified: 2026-11-12T10:10:38Z
  - id: poolslot-tsx
    resource: ../../src/islands/consortium/views/PoolSlot.tsx
    title: src/islands/consortium/views/PoolSlot.tsx
    digest: sha256:09389a4dd2aadea2
    last_modified: 2026-11-14T11:42:25Z
  - id: sideview-tsx
    resource: ../../src/islands/consortium/views/SideView.tsx
    title: src/islands/consortium/views/SideView.tsx
    digest: sha256:7eda8141dbfbca81
    last_modified: 2026-11-14T11:41:37Z
  - id: stagebar-tsx
    resource: ../../src/islands/consortium/views/StageBar.tsx
    title: src/islands/consortium/views/StageBar.tsx
    digest: sha256:c6b0c27307229a27
    last_modified: 2026-11-14T11:56:25Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/Start.tsx
    title: src/islands/consortium/views/Start.tsx
    digest: sha256:45e569e00714492c
    last_modified: 2026-11-14T11:40:42Z
  - id: toast-tsx
    resource: ../../src/islands/consortium/views/Toast.tsx
    title: src/islands/consortium/views/Toast.tsx
    digest: sha256:e52168f47bb5dce0
    last_modified: 2026-11-13T10:30:35Z
  - id: flags-ts
    resource: ../../src/islands/consortium/views/kit/flags.ts
    title: src/islands/consortium/views/kit/flags.ts
    digest: sha256:3e8f63daa96fdca4
    last_modified: 2026-11-13T07:02:37Z
  - id: names-ts
    resource: ../../src/islands/consortium/views/kit/names.ts
    title: src/islands/consortium/views/kit/names.ts
    digest: sha256:b859102f4e89f2f4
    last_modified: 2026-11-14T10:56:09Z
  - id: span-ts
    resource: ../../src/islands/consortium/views/kit/span.ts
    title: src/islands/consortium/views/kit/span.ts
    digest: sha256:f681abdf55562572
    last_modified: 2026-11-13T03:45:14Z
  - id: later-ts
    resource: ../../src/islands/consortium/views/later.ts
    title: src/islands/consortium/views/later.ts
    digest: sha256:14a41ad260f237ba
    last_modified: 2026-11-14T11:42:40Z
  - id: layers-ts
    resource: ../../src/islands/consortium/views/layers.ts
    title: src/islands/consortium/views/layers.ts
    digest: sha256:7252e2bc066e5305
    last_modified: 2026-11-11T09:49:44Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:3b70a449e0863414
    last_modified: 2026-11-14T11:42:46Z
  - id: pool-tsx
    resource: ../../src/islands/consortium/views/pool/pool.tsx
    title: src/islands/consortium/views/pool/pool.tsx
    digest: sha256:cd48284ff20e9d2d
    last_modified: 2026-11-13T14:46:32Z
  - id: side-ts
    resource: ../../src/islands/consortium/views/side.ts
    title: src/islands/consortium/views/side.ts
    digest: sha256:5ba2eb0af05f06bd
    last_modified: 2026-11-14T12:03:22Z
  - id: lookup-ts
    resource: ../../src/lib/climate/lookup.ts
    title: src/lib/climate/lookup.ts
    digest: sha256:b79f4f243bdefcb1
    last_modified: 2026-11-12T20:26:30Z
  - id: soil-ts
    resource: ../../src/lib/climate/soil.ts
    title: src/lib/climate/soil.ts
    digest: sha256:412c74305668a696
    last_modified: 2026-11-12T20:26:30Z
  - id: balance-ts
    resource: ../../src/lib/consortium/balance.ts
    title: src/lib/consortium/balance.ts
    digest: sha256:8fdecbce896d793e
    last_modified: 2026-11-13T20:25:47Z
  - id: canopi-file-ts
    resource: ../../src/lib/consortium/canopi-file.ts
    title: src/lib/consortium/canopi-file.ts
    digest: sha256:a162262df831f7bf
    last_modified: 2026-11-11T05:47:54Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:74e257618f1b4271
    last_modified: 2026-11-13T03:45:07Z
  - id: fold-ts
    resource: ../../src/lib/consortium/fold.ts
    title: src/lib/consortium/fold.ts
    digest: sha256:bfbb7316b150433b
    last_modified: 2026-11-13T03:03:27Z
  - id: future-marks-ts
    resource: ../../src/lib/consortium/future-marks.ts
    title: src/lib/consortium/future-marks.ts
    digest: sha256:dc7162e2c1e66dbb
    last_modified: 2026-11-12T11:43:06Z
  - id: future-ts
    resource: ../../src/lib/consortium/future.ts
    title: src/lib/consortium/future.ts
    digest: sha256:7052481477ebbf44
    last_modified: 2026-11-12T11:43:06Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:2f08c35425c5c8bd
    last_modified: 2026-11-14T10:56:09Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:ea2a468fa5385fb2
    last_modified: 2026-11-11T04:31:48Z
  - id: mark-providers-ts
    resource: ../../src/lib/consortium/mark-providers.ts
    title: src/lib/consortium/mark-providers.ts
    digest: sha256:a4f658dd31fb03d3
    last_modified: 2026-11-12T12:34:53Z
  - id: marks-ts
    resource: ../../src/lib/consortium/marks.ts
    title: src/lib/consortium/marks.ts
    digest: sha256:216177344e1b7811
    last_modified: 2026-11-13T13:02:30Z
  - id: matrix-ts
    resource: ../../src/lib/consortium/matrix.ts
    title: src/lib/consortium/matrix.ts
    digest: sha256:c948918a08ee50b3
    last_modified: 2026-11-14T11:38:37Z
  - id: nearest-ts
    resource: ../../src/lib/consortium/nearest.ts
    title: src/lib/consortium/nearest.ts
    digest: sha256:051bd530078fc159
    last_modified: 2026-11-13T03:45:07Z
  - id: placed-ts
    resource: ../../src/lib/consortium/placed.ts
    title: src/lib/consortium/placed.ts
    digest: sha256:faefdfc3640d75cc
    last_modified: 2026-11-13T12:43:29Z
  - id: placement-ts
    resource: ../../src/lib/consortium/placement.ts
    title: src/lib/consortium/placement.ts
    digest: sha256:8f7a898e3dc4d6ad
    last_modified: 2026-11-13T14:45:08Z
  - id: range-marks-ts
    resource: ../../src/lib/consortium/range-marks.ts
    title: src/lib/consortium/range-marks.ts
    digest: sha256:f95b4517b5a1d797
    last_modified: 2026-11-13T10:58:21Z
  - id: range-ts
    resource: ../../src/lib/consortium/range.ts
    title: src/lib/consortium/range.ts
    digest: sha256:1d72d2f856fe0d3b
    last_modified: 2026-11-13T06:56:43Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:eb4395e60994e93b
    last_modified: 2026-11-12T07:59:10Z
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:794b69777641c2ce
    last_modified: 2026-11-13T07:02:37Z
  - id: site-today-ts
    resource: ../../src/lib/consortium/site-today.ts
    title: src/lib/consortium/site-today.ts
    digest: sha256:e74cb144936b5335
    last_modified: 2026-11-11T19:27:07Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:7c81165a13deeae4
    last_modified: 2026-11-13T19:32:13Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:feb8e2ad064adef0
    last_modified: 2026-11-14T11:38:45Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:9a4b50c369042a6a
    last_modified: 2026-11-14T11:39:20Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:c9c8db612ed9a0f6
    last_modified: 2026-11-14T11:40:02Z
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:7601664a85fd6d88
    last_modified: 2026-11-14T11:39:20Z
  - id: zones-ts
    resource: ../../src/lib/consortium/zones.ts
    title: src/lib/consortium/zones.ts
    digest: sha256:33f34d5c6cad519a
    last_modified: 2026-11-13T07:25:07Z
  - id: consortium-astro
    resource: ../../src/pages/[lang]/consortium.astro
    title: src/pages/[lang]/consortium.astro
    digest: sha256:7019cdb7e871bfbf
    last_modified: 2026-10-29T05:02:41Z
  - id: place-ts
    resource: ../../src/lib/consortium/place.ts
    title: src/lib/consortium/place.ts
    digest: sha256:b664e3442aa10d97
    last_modified: 2026-11-14T10:56:09Z
  - id: tokens-css
    resource: ../../src/styles/tokens.css
    title: src/styles/tokens.css
    digest: sha256:76772cb8c5c7cfaa
    last_modified: 2026-11-14T10:56:09Z
---

Target architecture of the [Plant palette redesign](/project/consortium-v2-plan.md) (grower-first design approved by the owner on 2026-11-14). Pushes and streams: [Plant palette slices](/project/plant-palette-slices.md). Layer rules: [ADR-1](/decisions/consortium-island-layers.md); caps: [ADR-2](/decisions/consortium-chunk-budgets.md); owner answers: [user decisions](/decisions/consortium-user-decisions.md), rows of 2026-11-14.

Inputs (gitignored, main checkout): the approved boards and answers in `.local/consortium/v2/f1a/mockups-v3/` (`concept.md`, `ux-inventory.md`, `owner-answers-2026-11-14.md`, boards `project/<Name>.dc.html`, canvas https://claude.ai/artifact/PLcvFGg2KQHFkEgct9yfbc version 12); the design advisor's draft (Fable 5.2) and the independent check of 61 amendments (Opus 5.5), applied here except where an owner answer of 2026-11-14 supersedes one (listed in the plan). Amended the same day by the plan recheck (26 amendments: buildability, contracts, conformance) and the look-ahead check (26 amendments: formats, roadmap seams, data contracts, states) and by the owner's plan check answers (row "Plant palette plan check answers"). `path:line` citations are at `f1a/int` 648baf2; `DEC:n` means line n of `knowledge/decisions/consortium-user-decisions.md` at 648baf2 (rows are cited by date and bold title from this amendment on). "Unverified" marks what needs a build or a browser to know.

## 1. What stays

The ADR-1 stack and layers stay: a storage-independent TypeScript core (`src/lib/consortium/`) behind `PlantSource` (`source.ts:7-26`), the L2 SQLite adapter (`src/islands/consortium/data/`), L3 state and rules (`store.ts`, `state/**`, `rules/**`), L4 Preact views loaded lazily through `views/lazy.tsx` (`lazyPart`). The redesign changes what the core answers (a verdict per plant and a list of holes per palette, for one place and one period) and replaces the matrix screens with one palette page drawn from pure picture models. Code names stay "consortium"; readers see "Plant palette" at `/palette/` (owner row "Plant palette name").

## 2. Layers and modules

| Layer | New or changed module | Holds | Imports |
|---|---|---|---|
| L0 seams | core `types.ts` | `Spot`, `SoilAnswer`, `Place`, `ResolvedSoil`, `PeriodId`, `Level`, `Factor`, `FactorVerdict`, `PlantVerdict`, `Line`, `Hole`, `HoleKind`, `PlanLine`, `WeighLine`; `ShareState` v5; `LinkNotice` gains `newer`, `unreadable`, `period`. Removed in stages: `BalanceCheck*` (`types.ts:502-520`, PP-B commit 0), `CellSpan` and `AddPreset.cell` (PP-C commit 0), `views` with `'structure'` (`types.ts:467`, PP-B) | nothing |
| L1 core | `place.ts` (new) | place answers and their projections: `emptyPlace`, `resolveSoil`, `siteFor`, `climateFor` (the only reader of `lookup.periods`); 0a writes real bodies for `emptyPlace`, `siteFor` and a minimal `resolveSoil` (basis `'none'` for the map, `'pots'` for pots) with their unit tests, f1 completes `resolveSoil` | `types.ts`, `site.ts` |
| L1 core | `verdict.ts` (new), `verdict-line.ts` (leaf: `fitLine`, `holeLine`, `yearsLine`, the only places that put verdicts, holes and year spans into words), `verdict-soil.ts` and `verdict-spot.ts` (PP-F) | the one verdict engine | `range.ts`, `future.ts`, `site.ts`, `place.ts` |
| L1 core | `verdict-load.ts` (new; 0a stub exported from `index.ts`, body b2) | `loadVerdictRule()`: reaches `verdict.ts` only through `import()`, never caches a failed load (today's pattern, `marks.ts:43-52`) | `types.ts` |
| L1 core | `years.ts` (new) | `PHASE_YEARS`, `yearsOf(taxon)` (from the first to the last stage the plant is present in), `phaseOrd` (moved from `matrix.ts`), `spanOf`/`spans` (moved from `views/tracks.ts` and `views/kit/span.ts`; `views/kit/sheet.tsx:14` repointed in 0a) | `types.ts` |
| L1 core | `holes.ts` (new) | holes and fillers; absorbs `jobGapsByPhase` (`jobs.ts:43-54`); imports verdict types only; `fillers` takes a precomputed `holds` map and a `warned` set; `HOLE_ORDER` | `years.ts`, `jobs.ts`, `types.ts` |
| L1 core | `weigh.ts` (new) | "Things to weigh" (inventory P39): one family, water needs, soil hints from PP-F | `types.ts` |
| L1 core | `plan.ts` (PP-D), `season.ts` (PP-G) | planting order, spacing, counts; the year picture and the cool season | `years.ts`, `types.ts` |
| L1 core | `state.ts` (changed) | link v5 codec, `encodePlace`, one `linkVersionStatus` helper (section 8.2); no migration code | as today |
| L1 climate | `src/lib/climate/**` | unchanged until a new grid release (canopi-climate asks in the plan) | none of the core |
| L2 data | `data/sqlite-source.ts` | `PlantSource.layerValues(ids, climate)` (interface in PP-B commit 0, body in PP-G); `cellCounts` (`source.ts:25`, `sqlite-source.ts:346`) deleted with the matrix in PP-B commit 0a' | core types |
| L3 rules | `rules/picture.ts` and `rules/change-summary.ts` (b2) | the one picture model, `tableOf`, the fold rule, `changeSummary` (section 3.4) | core entry only |
| L3 rules | `rules/picture-years.ts`, `picture-jobs.ts` (PP-B), `picture-climate.ts` (PP-E), `picture-soil.ts` (PP-F), `picture-plan.ts` (PP-D), `picture-year.ts` and `months.ts` (PP-G) | picture view models built on `rules/picture.ts`: pure functions from core results to rows, bands and fractions (numbers and keys, no markup) | core entry only |
| L3 rules | `rules/find-query.ts` (PP-C, replaces `rules/list-query.ts`) | the one filter and grouping rule of Find, Swap and "plants that fill this hole" | core entry |
| L3 state | `state/schema.ts`, `persist.ts`, `restore.ts`, `arrival.ts`, `draft.ts`, `location.ts`, `suggest-wait.ts` | fields, save record, the `canopi-place` key, arrival | as today |
| L4 views | `views/place/**`, `views/palette/**`, `views/find/**` (PP-C), `views/plan/**` and `views/take/**` (PP-D), `views/climate/**` (PP-E), `views/soil/**` (PP-F), `views/year/**` (PP-G), `views/details/**` | one folder per chunk | core through `index.ts` only (L4) |
| L4 kit | `views/kit/chart.tsx` (band chart with its "Show as a table" form, P17), `views/kit/fit.tsx` (fit line, P16), `views/kit/phase.ts` (from `views/tracks.ts`; only `warningCounts` after commit 0a') | leaf parts (L5) | kit leaf |

The core stays flat (no subfolder of `src/lib/consortium/`): whether the boundary test globs it flat is unverified (`scripts/consortium-boundary.test.mjs`).

### ADR changes (rows in [Consortium v2 architecture](/decisions/consortium-v2-architecture.md); written into ADR-1 and ADR-2 by each push's commit 0)

- **ADR-1 rule L10 one-verdict** (lands `warn` in PP-B commit 0, which writes its keys with `node scripts/quality/ratchet.mjs arch --write` (a new key fails CI, `ratchet.mjs:11,16`); the merge agent rewrites the baseline at each chunk merge; `error` at the end of PP-C, when c2 owns `.dependency-cruiser.cjs`, adds a breach fixture and an allowed neighbour to `scripts/quality/arch-rules.test.mjs` and empties the baseline). Inside `src/lib/consortium/`, only these import `range.ts`, `future.ts` or `site.ts`: the rule files themselves (`future.ts` → `range.ts` included), `verdict*.ts`, `place.ts`, `suggest.ts`, `site-climate.ts`, `matrix.ts` until it is deleted, and `index.ts` for re-exports only (named `site.ts` exports, never `fits`, and `future.ts` until e2): dependency-cruiser counts `export * from` as an edge (`index.ts:9,15,17`), so `index` is in the rule's `pathNot` with an arch-rules fixture, and the rule still turns `error` in c2 (index.ts keeps importing `site.ts` after that). A second line, `warn` beside L10: only `place.ts` reads `lookup.periods` (`climateFor`, section 3.1), a grep in the arch-rules test. `conflicts.ts`: its misfit flag moves into the verdict, so `FlagContext` drops `site` and `conflicts.ts` stops importing `site.ts` (option (a) of amendment 14; c2). `index.ts` replaces `export * from './site.ts'` with named exports (`canopyOf`, `misfitsBeside`, `ROOM_LIMIT_M`, `Canopy`; never `fits`); it stops re-exporting `range` in c2 (PP-C) and `future` in e2 (PP-E, the commit that deletes `views/future/**`). Callers moved in PP-B/PP-C: `rules/list-query.ts:7`, `views/tracks.ts:13`, `store.ts`, `rules/suggest-block.ts`, `views/Start.tsx`, `views/PoolSlot.tsx`, `views/Paste.tsx`, `views/kit/flags.ts`.
- **ADR-1 statement:** L3 holds `rules/picture-*.ts`; a view draws, it never computes a position from plant data. No first-run module statically imports `verdict.ts`; verdicts, `holdsBy` and `asksBefore` are reached through `loadVerdictRule()` in the core module `verdict-load.ts` (as `marks.ts:47-51` does for the range rule today), which outlives `marks.ts` (deleted in c2).
- **ADR-2 roles:** delete `balance` (PP-B commit 0); rename `structure` to `matrix` (entry `views/Matrix.tsx` with `Actions`, cap 12 KB) in PP-B commit 0a so the matrix leaves the first run, and delete it with the matrix in commit 0a' (owner, 2026-11-14, "Delete first"; `Actions` returns to the first run until b2 hosts it); add `palette` and `verdict` (PP-B; `verdict` capped at 12 KB, then measured + 0.5 KB at the exit), `find` replacing `sheets` (PP-C), `plan` and `take` renamed from `later` (PP-D), `climate` replacing `future` (PP-E), `soil` (PP-F), `year` (PP-G); `range` and `markProviders` fold into `verdict` (PP-C); `pool` deleted once Place shows its count (PP-B, coordinator choice of 2026-11-14). Every role keeps a cap and every cap a role (`check-built-site.mjs:527`). **No `charts` role:** a statically shared module never gets a role (`built-modules.mjs:142-144`), so `views/kit/chart.tsx` is a kit module counted in full in each importing role's cost, and Details reaches it only through `lazyPart` (K3, `check-built-site.mjs:590-601`, fails a sheet chunk that statically imports a non-first-run chunk). Each commit 0 rewrites the one-chunk list (`check-built-site.mjs:528`), the sheet count (`:529`) and `sheetLike` (`:594`, Details + Find).

## 3. One owner per concept

| Concept | Owner (after) | Today | Change |
|---|---|---|---|
| Place answers (room, plot size, spot, soil) | state fields in `state/schema.ts`, saved with the palette (the record's `place`, room and plot as the fragment's `m`, `z`); shapes and projections in core `place.ts`; `canopi-place` only seeds a new palette (section 8.3; owner wording of `privacy.tool.device`, 2026-11-14) | `Site {light, soil, water, room}`, all `unsure` (`types.ts:64-79`, `state/schema.ts:100`) | 3.1 |
| Location (point, cell, proposed climate) | `state/location.ts`, key `canopi-location` (`state/persist.ts:38-41`), per device | same | keep; "Use it" on a link that brings a place now writes the link's cell into `canopi-location` (coordinator row 2026-11-14, reversing the "never saved over the reader's `canopi-location`" rule of the [location module](/modules/consortium-location.md)) |
| Climate slots | `src/lib/climate/lookup.ts` (`PeriodClimate`, `precipMm` `:43`, `dryMonths` `:46`), seen by the core as `SitePeriod` (`types.ts:368-378`), read by rules only through `climateFor` (`place.ts`) | core drops `precipMm`, `dryMonths` | add both to `SitePeriod` (PP-B commit 0); `store.ts:55` `readerFitsCore` keeps the compile-time check |
| Proposed climate zone | `site-climate.ts` `siteClimate` (`:100-119`); `hotterZone` added in PP-E | same | keep |
| Period shown and scenario | state field `period` (saved, in the link); `scenario` signal (`store.ts:53`, session only) | each plant on its own period (`future.ts:49-52`) | add `period` |
| Plant facts | `PlantSource`; `factAt` (`source.ts:42-60`) | bloom months only per plant through `details()` (`data/sqlite-source.ts:290-336`) | add `layerValues` |
| Verdict of a plant at a place | `verdict.ts` | spread over `range.ts` `rangeCheck`/`rangeFit`/`withinRange`, `future.ts` `futureCheck`/`futureSummary`, `site.ts` `fits` (`:93`) and `misfitsBeside`, `site-marks.ts`, `range-marks.ts`, `future-marks.ts`, `rules/site-fit.ts`, `conflicts.ts` `asks` (`:178`), the pool panel's own list (`views/pool/pool.tsx:40`) | 3.2 |
| Holes | `holes.ts` | `jobGapsByPhase` (`jobs.ts:43-54`), matrix empty cells (`views/matrix-parts.tsx:70-72`), the commit-0 Balance registry (`balance.ts:27-37`), Suggest's cell terms (`suggest.ts:21,59`) | 3.3 |
| Years of a phase | `years.ts` | words in locale files only (`en.json:231-237`) | new table |
| Words for verdicts, holes and year spans | `verdict-line.ts` (`fitLine`, `holeLine`, `yearsLine`, returning `Line`), keys under `consortium.line.` (b2) | each surface writes its own (`views/kit/flags.ts`, `rules/site-fit.ts`, Matrix) | 3.2; Find, Swap, Details, print and the period switch never write their own keys for these |
| Colour meaning | the token block in `src/styles/tokens.css` (section 3.5), mapped from level, severity and job only in `views/kit/flags.ts` | role and layer colours in stream CSS | PP-B commit 0 |
| Warnings (toxic, invasive, conflicts) | `conflicts.ts` `flagsFor` (`:149`); the level → token mapping in `views/kit/flags.ts` | Slight toxicity raises no flag (`conflicts.ts:124`) | raise it for Slight with its level (owner: mild = warning amber, moderate and above = danger red, words and icon always); a warning is never a verdict level and never asks (DEC:58, DEC:89) |
| Suggested palette | `suggest.ts` through `loadSuggest()` (`index.ts:38-42`) | sizes at `suggest.ts:30`; gain scored on matrix cells | drop crops, and kept becomes the members `seed` (PP-B commit 0a', with Kept and Main crops); gain on "open holes filled" through a predicate `holes.ts` exports and `fillers` shares (b1b, chunk 2); invasive tie (markers P12, P13, b1a) |
| Palette state | `state/schema.ts` `defineState` (`:45-95`) | fields `:106-158` | 3.6 |
| Link and save | `state.ts` (codec, `linkVersionStatus`), `state/persist.ts` (record, address, `canopi-place`) | v4 (`state.ts:32`) | section 8 |
| Filter and grouping of offered plants | `rules/find-query.ts` (PP-C) | `rules/list-query.ts:14-51` | rewrite on verdict levels and warnings |
| Picture geometry | `rules/picture-*.ts`; `rules/months.ts` (`monthRuns`, `monthsText`, `scopeText` from `views/layers.ts:44,61`, moved by g1); `heightFrac`, `usualHeight` from `views/side.ts` to `rules/heights.ts` (b2, for print) | `views/tracks.ts`, `views/side.ts`, `views/layers.ts` | rules may not import views (L2) |
| Names and numbers | `views/kit/names.ts` (gains `collatorFor`, `nameOrder` from `views/tracks.ts:18-30`), `format.ts:13` | `formatNumber` only; 14 `en.json` keys write a unit after a placeholder (`consortium.room.tall`, `side.metres`, `range.side.*`, `location.meansNear`, …) | PP-B commit 0 adds `formatLength`, `formatDepthCm`, `formatTemp`, `formatTempDiff` (a difference converts without +32) with Intl `style:'unit'`, `formatArea` (`formatNumber` + " m²"; Intl has no square-metre unit) and `parsePlotSize`; new keys take a preformatted `{len}`, `{area}`, `{depth}`, `{temp}` or `{tempDiff}`, and a policy check in `consortium-keys.test.mjs` bans a unit after a placeholder in new consortium keys; existing keys move when their stream rewrites them. Behaviour stays metric; imperial is not planned and the formatters are its single switch point |
| Lazy loading and its failure line | `views/lazy.tsx` (`LoadFailed` `:62`, `retryable` `:148`) | same | keep; `balancePanel` (`:161`) deleted |
| Search | `data/search.ts` `searchIndex` (`:27`) over `pool()` and `borrowed()` taxa; `readPool` (`sqlite-source.ts:152`) already loads names in every locale | same | Find reuses it (no `PlantSource` or SQL change) |

### 3.1 Place

```ts
export const periodIds = [TODAY_PERIOD, ...futurePeriods] as const;  // source.ts:39, future.ts:27
export type PeriodId = typeof periodIds[number];                     // the span string ('1991-2020', '2041-2070', '2071-2099'); the link's y holds it (section 8.1)
export interface Spot {                                              // every answer starts 'unsure' (DEC:89)
  light: 'sun' | 'part' | 'shade' | 'varies' | 'unsure';
  water: 'dry' | 'average' | 'wet' | 'unsure';                       // unchanged until F4
  wind: 'sheltered' | 'windy' | 'sea' | 'unsure';
  ground: 'drains' | 'wet' | 'unsure';                               // after heavy rain
  height: 'town' | 'higher' | 'lower' | 'hollow' | 'unsure';
}
export type SoilAnswer =
  | { from: 'map' }                                                  // the soil map's estimate, the default
  | { from: 'own'; ph: number | null; word: 'acid' | 'neutral' | 'chalky' | null; texture: TextureId | null }
  | { from: 'pots' };
export interface Place { room: Room; plotM2: number | null; spot: Spot; soil: SoilAnswer }
export interface ResolvedSoil { ph: number | null; word: 'acid' | 'neutral' | 'chalky' | null; texture: TextureId | null;
  basis: 'map' | 'test' | 'pots' | 'none'; depth: string | null; filled: boolean; fillKm: number | null }   // lookup.ts:71-74
export const emptyPlace: Place;
export function resolveSoil(answer: SoilAnswer, lookup: SiteLookup | null): ResolvedSoil;   // ACID_BELOW / CHALKY_ABOVE, site.ts:38-39
export function siteFor(place: Place, lookup: SiteLookup | null): Site;                      // the shape site.ts fits() reads
export function climateFor(ctx: VerdictContext, period: PeriodId): SitePeriod | null;        // the one climate reader for rules
```

- **`climateFor`** (0a): in PP-B it passes the slot for the period (and the context's scenario) through unchanged. It is the hook where F4's adjusted site, F2's cautious switch and CLIM-4's height correction land, so every rule reads the same climate: `verdict.ts`, `hotterZone(climate)` (PP-E), `season.ts`, `weigh.ts` (water) and the `factAt` site input take its result and never read `lookup.periods` themselves (arch-rules grep line, `warn`, section 2). `scenario: string` and any `adjusted` marker are left for later.
- **PP-B keeps today's three questions** (owner, 2026-11-14, keep rows C1–C3): until f2 and f1 replace them in PP-F, Place asks light, soil and water as today (`Start.tsx:31`, `:189-212`): light goes to `spot.light`, water to `spot.water`, a soil word to `{from:'own', ph: null, word, texture: null}`, "not sure" to `{from:'map'}`; 0a's `siteFor` passes them to `fits()`.

- `Room` already has `pots` (`types.ts:71-73`); PP-B commit 0 adds it to `rooms` (what a link's `m=` accepts). Limits are the live ones: `ROOM_LIMIT_M` (`site.ts:37`), `SIZE_LIMIT` (`suggest.ts:30`). Room is a height word only; area is `plotM2` (owner, revision 4).
- `TextureId` repeats the reader's 12 USDA classes (`src/lib/climate/soil.ts:21-23`) with a compile-time equality check beside `readerFitsCore`.
- `Site` (`types.ts:74-79`) stays as the derived input of `fits()`, no longer stored: PP-B commit 0 keeps `site` as a derived, unsaved computed signal in the old shape for its readers (`views/Add.tsx:42,76,89,107`, `rules/site-fit.ts`), removed in PP-C when they go. `varies` maps to `unsure` for the fit.

### 3.2 Verdict engine

```ts
export type Level = 'fits' | 'look' | 'outside' | 'unknown';          // fits / needs a second look / outside its range / not checked
export type Factor = 'cold' | 'mild' | 'cool' | 'summer' | 'hot'      // RangeSide, range.ts:49
  | 'dry' | 'soil-ph' | 'drainage' | 'light' | 'water' | 'wind';
export interface FactorVerdict { factor: Factor; level: Level; basis: 'range' | 'soil-map' | 'soil-test' | 'spot';
  place: number | null; low: number | null; high: number | null; confidence?: Confidence }   // types.ts:479
export interface PlantVerdict {
  id: PlantId; judged: PeriodId; ownYears: boolean;   // judged = min(page period, the plant's own years)
  level: Level;                                       // worst factor; soil and spot never beyond 'look' (owner: hints)
  limiting: FactorVerdict | null; factors: FactorVerdict[];
  notes: ('room-tall' | 'annual' | 'cool-season' | 'drier' | 'warm-enough-later' | 'cold-air')[];
  agree?: number; of?: number;                        // scenarios, future.ts:31-41
}
export interface VerdictContext { place: Place; lookup: SiteLookup | null; period: PeriodId; scenario: string; soil?: ResolvedSoil;
  canopy?: Canopy }                                   // built by the store from canopyOf(members) (site.ts:141-145)
export function judgedPeriod(taxon: Taxon, page: PeriodId): PeriodId;          // futurePeriod, future.ts:49-52
export function verdict(taxon: Taxon, ctx: VerdictContext): PlantVerdict;
export function verdicts(taxa: readonly Taxon[], ctx: VerdictContext): Map<PlantId, PlantVerdict>;
export function holdsBy(taxon: Taxon, ctx: VerdictContext, period: PeriodId): boolean;   // P34, P35; built in b2 on futureCheck
export function asksBefore(v: PlantVerdict, conflicts: readonly Conflict[]): boolean;   // replaces conflicts.ts asks, :178
// verdict-line.ts (leaf, first-run safe; signatures in commit 0, bodies b2, keys under consortium.line.):
export type Line = { key: string; vars: Record<string, string | number>; count?: number };   // count feeds P() (strings.ts:51-56)
export function fitLine(v: PlantVerdict): Line;
export function holeLine(h: Hole): Line;
export function yearsLine(from: number, to: number | null): Line;
// verdict-load.ts (core, first-run safe):
export function loadVerdictRule(): Promise<VerdictRule>;   // import('./verdict.ts'); a failed load is never cached
```

Rules, each already decided:
- Mapping from `SlotCheck` (`slotCheck`, `range.ts:134`; `RANGE_MARGIN_C = 2`, `CHILL_CEILING_C = 18`, `HEAT_DEMAND_C = 18`, `range.ts:57-61`): beyond → `outside`, a side within the margin → `look`, else `fits`, no slot → `unknown`. `verdict.ts` picks the slot for the judged period and scenario.
- Later periods: `futureCheck` (`future.ts:74-98`); the only loss is heat; aridity is a note (`drier`).
- A plant is judged for the years it stands in (owner, revision 4): `judgedPeriod` never goes later than `futurePeriod(taxon)`.
- No location: every range factor is `unknown`, never `fits`.
- **Shade relief** (today `conflicts.ts:141,152,166` with `site.ts:141-145`): `verdict.ts` drops the light factor when `ctx.canopy` says a taller member shades the plant; the store recomputes member and pool verdicts when members change. Vectors (b2, `verdicts.json`): a sun spot with a taller member gives no light factor; with no taller member, `look`; a `'part'` spot keeps the light factor.
- **`countFits`** (b2 body, b1b reads it): the number of pool plants, guests included, whose level is `fits` or `look` for the page period (levels kept, so the line can split them later); a borrowed list keeps every plant whose climate range includes the site (owner, 2026-11-14). Vector: Kiambu 324 of 515 (a real-data unit test in b2, not a `verdicts.json` case).
- Soil and spot factors are hints (at most `look`); room is a note (`room-tall`), never a level (DEC:97).
- "Higher than the town" and "hollow": note `cold-air` on plants within `RANGE_MARGIN_C` of their cold limit; no figure moves until canopi-climate ships a height correction (owner, revision 4).
- The card marks (`marks.ts:25-27`, `mark-providers.ts:8`) become projections of `PlantVerdict`; `range-marks.ts`, `future-marks.ts`, `site-marks.ts`, `rules/site-fit.ts` are deleted in c2 (`site-fit.ts` and `site-marks.ts` last), `views/kit/flags.ts` and `PlantMarks.tsx` read `fitLine`.
- `holdsBy` vectors (b2): inside in 2041–2070; loses heat; no location → false; a short-lived plant judged on today.

### 3.3 Holes

```ts
export const PHASE_YEARS = [[0, 0.25], [0.25, 1], [1, 3], [3, 15], [15, 25], [25, 60], [60, null]] as const;  // PhaseOrd 0..6
export const JUDGED_FROM_YEAR = 1, JUDGED_TO_YEAR = 60;    // owner: gaps under one year and after 60 are not raised
export type HoleKind = 'job' | 'light' | 'flowering' | 'cool' | 'soil';
export interface Hole {
  id: string;                     // `${kind}:${job ?? stratum ?? ''}:${fromYear}-${toYear}` + `:m${mask}` when months are set (12-bit month mask, hex)
  kind: HoleKind; rank: 1 | 2 | 3 | 4 | 5 | 6;   // read from HOLE_ORDER, never a literal
  job?: JobId; stratum?: Stratum; months?: readonly Month[];
  fromYear: number; toYear: number;
  state: 'open' | 'pending' | 'not-judged' | 'to-check';   // pending: a guest list loads; to-check: a soil hole on a filled map value
  preset: AddPreset;              // { job?, hole: Hole['id'], filters?, hint? }
}
export function holes(ctx: HoleContext): Hole[];          // sorted by rank, then fromYear, then id
export function nextStep(list: readonly Hole[]): Hole | null;
export function fills(hole: Hole, taxon: Taxon): boolean; // the one predicate fillers() and suggest.ts share
export interface Fillers { fits: Taxon[]; look: Taxon[]; outside: Taxon[]; unknown: Taxon[] }
export function fillers(hole: Hole, pool: readonly Taxon[], verdicts: ReadonlyMap<PlantId, PlantVerdict>,
  holds: ReadonlyMap<PlantId, boolean>, warned: ReadonlySet<PlantId>, members: readonly Taxon[]): Fillers;
```

- **Rank** (concept.md "Rules"): 1 a whole job nobody does, 2 a whole light level nobody fills, 3 flowering (two months or more), 4 a job or light level empty for part of the years, 5 cool season, 6 soil. Expressed as one ordered `HOLE_ORDER` table; vectors assert relative order for each pair of neighbouring entries, so a kind added by F3 or F5 inserts a row without rewriting the vectors. The month-mask suffix keeps two flowering or cool holes over the same years apart (the preset's `hole` id, keyed rendering); hole ids stay internal.
- **Not judged** = a gap shorter than one year inside the 0–60 window, drawn as a thin line, never a hole (concept.md:110-111); vectors for a 0–1 and a 0.25–1 gap. Nothing after year 60.
- A member `outside` for the page period stops filling its job or light level from that period on (inventory M2).
- `guestsPending` (`store.ts:164`) gives `pending` holes, never a false hole (marker P11).
- **Latitude bands for month records** (replaces "same hemisphere"): three bands N, T (the site is in T when |lat| < 23.44) and S. A row's band comes from a signed inclusive `scope_latitude` `lo..hi` (a range crossing a tropic line matches both bands it touches), else from `scope_hemisphere` (its non-tropical part), else from a country table covering only countries that lie in one band (GB, CH, CZ, DE → N); a row with every scope NULL applies everywhere; a row with no band for the site shows "recorded elsewhere" and never opens or fills a hole. `flowering` holes only from records of the site's band (months are never shifted, row "Fable advice string and data choices" (e)); none until canopi-data's coverage (DATA-4) lands. `cool` from PP-G. `soil` from PP-F and only under the owner's rule: a typed soil test, or a map value that is unfilled (`filled = false`), and every palette plant for that job outside its soil range; a filled map value gives `to-check`, drawn weaker.
- **Fillers groups:** "needs a second look" = level `look` OR a toxic or invasive warning; `outside` and `unknown` keep their own groups. Ranked by holes filled, then `holdsBy` the latest period, then name. Never drops an invasive or toxic plant (warn, never hide). Vectors: an in-range invasive → look; mild toxic → look; an invasive outside its range → outside.
- Holes stay off the first run: no `holeList`/`next` in `store.ts`; the palette chunk computes them from `memberVerdicts`, `poolVerdicts` and `verdictContext`.
- `nextStep` never returns a hole a suggestion already filled (check amendment 7, asserted in the rewritten P1).

### 3.4 Picture model (`rules/picture.ts`, b2)

One shape for every picture (Through the years, jobs, plan, climate, soil, year) and for print's tables, so the accessible form is decided once:
- `Picture = { title: string /* key */; summary: Line[]; columns: Column[]; rows: { head: Line; cells: Cell[]; state: 'data' | 'not-recorded' | 'not-judged'; more?: { count: number; ids: PlantId[] } }[] }`. Rows with no data are counted, never dropped. Models carry full plant names; views never ellipsize a plant name.
- `tableOf(picture)` gives the "Show as a table" form; `views/kit/chart.tsx` and d2's print tables use it (section 6).
- The SVG is `role="img"` named by the summary, with no focusable control inside; every hole and every "opens Details" target is an HTML button, and marker P8 runs over those buttons.
- **Fold rule:** at most `PICTURE_LANE_MAX` marks per lane (a constant in `rules/`, about 12), with `more` holding the count and the hidden ids; order: hole fillers, then main job, then name; the climate picture keeps the plants nearest their limit. "+ k more" takes the ux-inventory E6 wording (`consortium.matrix.more`, "+ {n} more", deleted with the matrix keys in PP-B commit 0a'; b2 writes it as a new `consortium.line.*` key, copying the wording and its 11 translations from git) and opens the lane in the table; the table always lists every plant. b2 owns "pictures stay readable" with a 200-plant vector each later picture inherits.
- `changeSummary(before, after): Line[]` (`rules/change-summary.ts`, with vectors): the stepper and the period switch announce it through the polite status region (F1a-A2); P8 covers both.
- `scripts/picture-table.mjs` (b2): a test helper checking that the table form holds the same cells as the picture, called from each picture's unit test (b2, d1, e2, f1, g1).

### 3.5 Colour tokens (PP-B commit 0, `src/styles/tokens.css`)

Owner, 2026-11-14 (row "Plant palette plan check answers" (4)): start from the app's tokens where they exist, Fable's for the rest; the coordinator may choose Fable's where the design is better, one row per token below; the app adopts the website's palette later (the app is untouched now). App values from `canopi/desktop/web/src/styles/global.css:87-92,231-235,264-269` and `canvas/runtime/plant-display.ts:62-67` (app commit 76522e7c1); Fable's from `.local/consortium/v2/f1a/mockups-v2/design-notes.md` (main checkout).

| Token | Light | Dark | From | Why |
|---|---|---|---|---|
| `--role-food` | `#5A7D3A` | `#8BAA5E` | app `--color-edible` | app token exists |
| `--role-soil` | `#3A7D7D` | `#6BA3A3` | app `--color-nitrogen` | app token exists |
| `--role-helpers` | `#7B5090` | `#B88BC4` | app `--color-medicinal` | app token exists (Fable's is the same) |
| `--role-mulch` | `#6B4F3A` | `#B79E84` | Fable | no app role token (app `--color-family` shares the light value) |
| `--role-ground` | `#6E6A1A` | `#B8B060` | Fable | no app token |
| `--role-shelter` | `#4E6272` | `#98ACBC` | Fable | no app token |
| `--light-emergent`, `--light-high`, `--light-medium`, `--light-low`, `--light-none` | `#E69F00`, `#009E73`, `#0072B2`, `#CC79A7`, `#5E5A52` | same (plant data colours, not themed) | app `STRATUM_DISPLAY_COLORS`, `NO_STRATUM_DISPLAY_COLOR` | owner: the app's stratum colours for light levels; graphics only, never text; each band carries its light word |
| `--level-look`, `--level-outside` | app `--color-warning` `#7A5A00`, `--color-danger` `#A8332A` | `#E8C766`, `#F08A7C` | app | warning = needs a second look, danger = outside its range |
| `--level-fits`, `--level-unknown` | existing `--text`, `--text-secondary` | same tokens | site | fits and not checked are told by icon and words, no colour of their own |
| `--focus` | `#1F5F8B` | `#7FB8E0` | Fable | no app token |

Commit 0 checks contrast in both themes (text 4.5:1, graphics 3:1 against `--bg` and `--surface`); a token that fails gets an ink outline in the picture or, by a coordinator row, Fable's value (Fable's `--layer-light` `#A8651C`/`#D4A060` for light graphics, Fable's food `#4F7132`). Later pushes add their meaning tokens to this block, never to stream CSS. `views/kit/flags.ts` holds the one map from level, severity and job to a token. `scripts/consortium-css.test.mjs` allows `--role-*` and `[data-job]`, forbids raw hex in consortium CSS and TSX (`print.css` excepted) and drops the comment citing the replaced "no green" rule (`consortium-css.test.mjs:5-8`). Amber sharing is settled by rule: kind is told by icon and words (row "Fable advice answers" (7)).

### 3.6 Palette state (`state/schema.ts`)

| Field | In | Change |
|---|---|---|
| `climate`, `country`, `members`, `removed`, `guests` | as today (`state/schema.ts:106-138`) | keep; `country` (`k`) written to a link only with "Include my place" and only from a chosen, location or link source, never a guess (`schema.ts:114` gates only the location country today) |
| `site` | — | replaced by `room`, `spot`, `soil`; a derived unsaved computed signal until PP-C |
| `room` | snapshot, saved, share | from `site.room` |
| `plot` (m², or null) | snapshot, saved, share | new |
| `spot`, `soil` | snapshot, saved; share only with "Include my place" | `link.put` returns null unless `o.place`, as `country` does today (`share` is a function, `schema.ts:52-59,83-84`) |
| `period` | saved, share; not in undo | new |
| `kept`, `crops`, `stage` | not written to v5 | marked deprecated in PP-B commit 0a; `kept` and `crops` removed in commit 0a' with their readers (Suggest's `kept` input becomes `seed`, fed from `members`) (`StageBar.tsx:14`, `PrintSheet.tsx:12`, `Details.tsx:149-150`, `Start.tsx:143-153`, `ShareInput` at `schema.ts:142`, `restore.ts:216-217`, `persist.ts`, `store.ts:391-534`); `stage` stays an unsaved signal read by print until b2 draws print at the year step chosen in Through the years (PP-B18), then goes |
| `view` | reader | commit 0a' narrows it to `'start' | 'matrix'`, where `'matrix'` names the empty palette slot (its writers in `suggest-wait.ts`, `draft.ts`, `restore.ts` and `store.ts` unchanged), and drops the core `views` list (`types.ts:467`); b2 makes it `'place' | 'palette' | 'plan'` (header steps, P1), replacing `store.ts:24` `View` |
| `setAside` | as today (`:146-158`) | keep |

## 4. Data flow

```
export r-…sqlite.gz ─► data/load.ts ─► data/sqlite-source.ts ─► PlantSource (pool, borrowed, interactions, names, details, layerValues)
climate + soil tiles ─► src/lib/climate lookupSite (index.ts:152) ─► state/location.ts ─► store.location (SiteLookup)
state (members, room, plot, spot, soil, period) ─┬─► place.ts siteFor / resolveSoil / climateFor (every rule's climate)
                                                 ├─► verdict-load.ts loadVerdictRule → verdicts(pool ∪ members, ctx incl. canopy)   [store: memberVerdicts, poolVerdicts, countFits]
                                                 ├─► palette chunk: holes(ctx) ─► nextStep, fillers
                                                 ├─► weigh.ts, plan.ts, season.ts                       [inside their lazy chunk]
                                                 └─► rules/picture-*.ts ─► views (SVG + table)
state ─► state.ts encodeLink (public | with place) ─► address bar (public form only), share sheet, save record { fragment, place }; canopi-place (seed of the next palette)
```

Store after the change (`store.ts`): `verdictContext`, `verdictRule` (the lazy `verdict` chunk, as `rangeRule` at `:100`), `memberVerdicts`, `poolVerdicts`, `offline`; `withRule` (`:131`) waits on the `verdict` chunk from PP-B commit 0; `loadRangeRule` and `loadMarkProviders` (`marks.ts`, imported at `store.ts:9`, `:476`) go when their readers move (c2). Removed in PP-B commit 0a': `matrix` (`:286`), `toggleKeep` (`:507`), `kept`, `crops`, `marksFailed` (`:309`, its line returns in c2) and the tab values of `View` (`:25`; `'matrix'` stays as the palette slot, the rest of `View` in b2); `suggestMembers` seeds Suggest from `members`. **`fitPool` (`:179`) stays**: the range-filtered pool Add (`Add.tsx:54`) and Swap (`Swap.tsx:37`) read, removed in PP-C when they are rebuilt on verdicts; in PP-C `rangeRule`, `loadRangeRule`, `rangeFailed`, `markProviders`, `markContext`, `FlagScene` rebuilt on verdicts (`:11`, `:216-241`). Grep gate before c2 closes: `grep -rn "rangeFit\|withinRange\|futureSummary" src/islands/consortium` finds only `views/future`.

## 5. What is computed where and when

| What | Where | When | Role | Cap (proposal; sizes unverified until built) |
|---|---|---|---|---|
| Shell, state, arrival, Place form (without the location step), toasts, notices, offline and still-loading lines | L3, `views/place/Place.tsx` | first run | first run | 38 KB today (`check-built-site.mjs:498`); raised as needed (owner, 2026-11-14), each raise a row in the plan's budget log; measured at PP-B commit 0 |
| Location step | `views/location/**` | first use, prefetched on Place | `location` | 11.8 KB (A14 max 20); `LOCATION_BUDGET` 20 KB, `MAPLIBRE_BUDGET` 330 KB |
| Verdicts | core `verdict.ts` | after the pool and the lookup; recomputed on place, period, scenario or member change | `verdict` | 12 KB in PP-B, then measured + 0.5 KB at the exit; `range` and `markProviders` fold in only in PP-C; `future` keeps its cap until PP-E |
| Palette page: Next step, Through the years, Jobs, Your plants, things to weigh | `views/palette/**`, `rules/picture-years.ts`, `picture-jobs.ts`, `holes.ts`, `weigh.ts` | prefetched when `arrival()` (`state/arrival.ts:44`) returns `saved`, `link` or `preset`, else when the Place form is first touched | `palette` | 12 KB (feature max) |
| Matrix (0a only; deleted in PP-B commit 0a') | `views/Matrix.tsx`, `Actions` | through `lazyPart` | `matrix` | 12 KB at 0a, role deleted in 0a' (`Actions` back in the first run until b2) |
| Find, Swap, Paste, fill a hole | `views/find/**`, `rules/find-query.ts` | on opening; prefetched when the page is idle (with `details` and `take`; each prefetched chunk's cost is a line in the budget log) | `find` | 8 KB |
| Details, Correction | `views/details/**` | on opening | `details` | 8 KB (6.7 today) |
| Suggested palette | `suggest.ts` | "Start from a small suggested palette" | `suggest` | 8 KB |
| Planting plan | `plan.ts`, `rules/picture-plan.ts`, `views/plan/**` | step 3 | `plan` | 10 KB |
| Share, Take, print, `.canopi` | `views/take/**`, `canopi-file.ts` | on opening | `take` | 8 KB (7,831 B as `later` today) |
| Climate picture, place in figures, hotter list | `rules/picture-climate.ts`, `views/climate/**` | on opening the period switch's picture | `climate` | 8 KB |
| Soil and spot | `views/soil/**`, `verdict-soil.ts`, `verdict-spot.ts` | on opening "Your spot" or "Soil" | `soil` | 10 KB |
| Through the year | `season.ts`, `rules/picture-year.ts`, `views/year/**` | when the picture scrolls near, or its tab on the phone | `year` | 10 KB |
| Bloom and ripening months | `PlantSource.layerValues` | with the `year` chunk only | — | one SQL query, target under 30 ms for 200 members (unverified) |

A module exported from `index.ts` but used by one lazy chunk only lives in that chunk (`balance.ts:24-26`, `views/later.ts:10`): `holes.ts`, `plan.ts`, `season.ts`, `weigh.ts` and `verdict.ts` are imported by no first-run module. Each commit 0 exports only the seams its push uses, or tags a forward seam `@public` with the stream that drops the tag (else `check:dead` reports it).

## 6. Reuse: keep, refactor, move, delete

| Code | Verdict | Push and owner |
|---|---|---|
| `data/**` (but `search.ts`), `source.ts`, `fold.ts`, `zones.ts`, `nearest.ts`, `placement.ts`, `placed.ts`, `site-climate.ts`, `canopi-file.ts` | keep | `canopiFile` gains a namespaced root object `projectcanopi_palette` in d2 (section 10; the app keeps unknown root fields, canopi-types `design.rs:345-349` `#[serde(flatten)]`; a schema test against the vendored schema, with and without the object) |
| `data/search.ts` | keep, reused by Find | c1 |
| `range.ts`, `future.ts`, `site.ts` | keep as the rules behind `verdict.ts` | not exported from `index.ts` after c2 (`range`) and e2 (`future`) |
| `jobs.ts` | keep `jobOfFunction`, `jobsOf`, `phaseSpan` (`:8-37`); `jobGapsByPhase` moves into `holes.ts` | b2 |
| `matrix.ts` (`:18-44`) | `phaseOrd` moves to `years.ts` (re-exported; `Details.tsx:18,287`, `list-query.ts:7`) in commit 0a; `buildMatrix`, `plantsIn`, `startCell`, the Matrix types and `cellCounts` deleted with their test cases (core, source, tracks, p5-ranges) in commit 0a' (owner "Delete first"); `cellsOf` and `cellKey` stay for Suggest's gain (until b1b moves it onto `fills`) and Swap's "Also fills" (until c2), then the file goes | commit 0a', b1b, c2 |
| `conflicts.ts` | refactor: Slight toxicity flag (b3); misfit flag into the verdict (c2) | b3, c2 |
| `suggest.ts` | refactor: `crops` dropped and `kept` becomes `seed`, the current members (commit 0a'; Suggest builds around every plant already there, inventory C6); invasive tie (b1a); gain on open holes via `fills` from the seed's coverage (b1b) | commit 0a', b1a, b1b |
| `marks.ts`, `mark-providers.ts`, `range-marks.ts`, `future-marks.ts`, `site-marks.ts`, `rules/site-fit.ts` | delete; `loadRangeRule` and `loadMarkProviders` go when their readers move | c2 |
| `verdict-load.ts` (new) | keep: `loadVerdictRule()` outlives `marks.ts` | b2 |
| `views/PlantMarks.tsx` | keep; reads verdict projections in the commit that deletes `marks.ts` | c2 |
| `views/kit/flags.ts` | refactor: Slight → warning token, Moderate/Severe → danger token (b3); lines from `fitLine` (c2) | b3, c2 |
| `balance.ts`, `views/balance/**`, `balance.css`, `scripts/consortium-balance.test.mjs` | delete | PP-B commit 0 |
| `state/schema.ts`, `persist.ts`, `arrival.ts`, `restore.ts`, `draft.ts`, `location.ts` | refactor (fields, record with `place`, `canopi-place` as seed, notices) | commit 0 seams, then b1a |
| `state/suggest-wait.ts` | keep | b1a |
| `views/Start.tsx` | moved into `views/place/` (commit 0 creates `Place.tsx` re-exporting Start and points `App.tsx:16` at it), then rewritten and deleted there; country line (`:60-70`), climate cards and today's light, soil and water questions (until PP-F) kept as parts; the `markStart()` call moves with it | b1a |
| `views/pool/pool.tsx`, `PoolSlot.tsx`, `rules/suggest-block.ts` | port to `poolVerdicts`; the count folds into Place, then the pool role and panel go | b1b (chunk 2, after b2's verdict engine) |
| `views/LocationSlot.tsx`, `views/location/**` | keep, inside Place | b1a |
| `views/Matrix.tsx`, `PhoneMatrix.tsx`, `matrix-parts.tsx`, `Jobs.tsx`, `PlantList.tsx`, `StageStepper.tsx`, `matrix.css` (the shared rules kept views use to `shell.css`, the side drawing's rules to `print.css`, slices section 2), `palette.css` (F1a era, empty) | delete first (owner, 2026-11-14): commit 0a' deletes them with their tests and owns their importers (the matrix `lazyPart` in `App.tsx`, the `SideView`, Jobs and PlantList re-exports in `views/later.ts`, `ConsortiumPage.astro`'s two imports); b3 later mounts YourPlants and Weigh in `views/palette/Palette.tsx` | commit 0a' |
| `views/tracks.ts` | helpers moved in commit 0a: `PHASE_ORDS` (`:40`), `Order`, `collatorFor`, `nameOrder` (`:18-30`), `warningCounts` (`:139`), `stepStage` (`:153`) to `views/kit/phase.ts` and `names.ts`; `spanOf` to `years.ts` (`views/kit/span.ts` deleted; `side.ts`, `SideView`, `StageBar`, `StageStepper` and `views/kit/sheet.tsx` (`:14`) repointed to `years.ts` `spanOf`); deleted in 0a' with `scripts/consortium-tracks.test.mjs` (its print cases move to `scripts/consortium-print.test.mjs`); `stepStage` and `PHASE_ORDS` deleted in 0a'; `warningCounts` stays in `kit/phase.ts` (StageBar's `warnings` and `Marks`, drawn in print) | commit 0a, 0a' |
| `views/StageBar.tsx` | commit 0a' deletes `StageStrip`, `cellName`, `plantLabel`, `openSwap` (no reader after PlantList) and the kept and main-crop marks, and (built) `StageBar`, `Explain` and `openAdd`, which had no reader left; `Marks`, `warnings` (module-private), `openDetails`, `jobFind`, `byName` stay until their last readers go (`future.tsx:17` in PP-E, `Add.tsx:24` in PP-C, print); `App.tsx` imports it and `PlantMarks.tsx` to keep them in the first run (the future part's cap, one build) | commit 0a', c1, e2 |
| `views/SideView.tsx`, `side.ts`, `draw.ts`, `PrintSheet.tsx` | print only: commit 0a' deletes the on-screen side view (its stage chips) and "At a glance" (`PrintSheet.tsx:34` reads `matrix`), keeping `SideDrawing` and the plant table; the side drawing shows the year step chosen in Through the years (coordinator choice, 2026-11-14; inventory E9 keeps it), the jobs and years tables follow in d2 | commit 0a', b2 (off `stage`, PP-B18), d2 (print) |
| `views/Actions.tsx`, `views/FutureSlot.tsx` | hosted by the palette page | b2 until PP-E; `FutureSlot` deleted by e2 |
| `views/later.ts`, `later-chunk.ts`, `Share.tsx` | `Share.tsx` wording and the "Include my place" tick in b1a; commit 0a' drops the SideView, Jobs and PlantList re-exports; files renamed into `views/take/**` | b1a, commit 0a', d2 |
| `views/Add.tsx`, `Paste.tsx`, `paste.ts`, `Swap.tsx`, `Sheets.tsx` (`:69-72`), `kit/sheet.tsx`, `rules/list-query.ts` | rewritten as `views/find/**` and `rules/find-query.ts`; in PP-B b2 adds only the live regions to `Sheets.tsx` (`:58-63` renders the status text up front) and `kit/sheet.tsx` (marker A2) | c1 (Swap: c2); b2 in PP-B |
| `views/Correction.tsx`, `views/details/**` | kept (the new page opens Details); the Keep button goes in commit 0a'; Details' toxicity sentence (`:156`) removed in b3; "Against your place" first in c2 | commit 0a', b3, c2 |
| `views/future/**`, `views/FutureSlot.tsx` | replaced by `views/climate/**` | e2 |
| `site-today.ts` | keep until the pool panel goes; then `check:dead` decides | b1b |
| `views/kit/**`, `views/lazy.tsx`, `focus.ts`, `strings.ts`, `views/Toast.tsx` | keep; `focusAfterToast` (`focus.ts:42`) gets its body; `views/kit/start-mark.ts` gets the `markStart` body (marker S2); `LoadFailed` (`lazy.tsx:62-63`, today `location.reload()`) reads `offline`: "Needs a connection", retries on `online`, never reloads | b2 |
| `format.ts` | keep; gains the unit formatters and `parsePlotSize` (section 3, "Names and numbers") | PP-B commit 0 |
| `astro.config.mjs` | the sqlite wasm preload (marker S1; only `modulepreload` at `:78` today) with a build check of `href`, `crossorigin` and a single wasm | b2 |

Each commit 0 and each stream hand-off runs `npm run check:dead` and a grep for the deleted names.

## 7. Cycles and duplicates today, and their fix

1. **Two `View` lists**: `store.ts:24` and core `views` (`types.ts:467`) → one list in `state/schema.ts`.
2. **Verdict producers**: `rangeCheck`, `rangeFit`, `withinRange`, `futureCheck`, `futureSummary`, `site.ts fits` and `misfitsBeside`, `conflicts.ts asks`, the pool panel's list → `verdict.ts` and rule L10.
3. **Gap engines**: `jobGapsByPhase`, the commit-0 Balance registry, the matrix's empty cells, Suggest's cell terms → `holes.ts` and `fills`.
4. **Two soil vocabularies**: the reader's texture and pH (`src/lib/climate/soil.ts:19-48`) and the core's three words (`types.ts:65`, `site.ts:38-39`) → `resolveSoil` is the only translation.
5. **Phase length in words only** (`en.json:231-237`) → `years.ts`; the words stay for Details.
6. **Climate values decoded and dropped** (`lookup.ts:43-46,141-143` vs `types.ts:368-378`) → `SitePeriod` gains them.
7. **Role without a module**: `ROLE_ENTRIES.structure` names `views/Structure.tsx` (`scripts/built-modules.mjs:165`) → renamed `matrix` in PP-B commit 0.
8. **Stale test constant** `VIEW_KEY = 'y'` (`scripts/browser/consortium-f1a-palette.browser.test.mjs:37`) → goes with marker P3; v5 gives `y` to the period.
9. **Version gates outside the decoder**: `persist.ts` `readRecord` (`:105`) and `oldRecord` (`:111-118`), `restore.ts:133-143` and `ConsortiumPage.astro:117` (`hp.get('v') === '4'`) each test the version → one `linkVersionStatus`; the page-head check treats any fragment with `v` or `a` as a link (`isLinkFragment` rule).
10. No import cycle exists today (L7 `error`). New risk `holes.ts` ⇄ `verdict.ts` ⇄ `suggest.ts`: `holes.ts` imports verdict types only, `suggest.ts` may import both, neither imports `suggest.ts`.

## 8. URL and storage contract

### 8.1 Link v5 (`state.ts`)

One version for the whole redesign, written from PP-B on; the decoder accepts every key of the table from PP-B, so a tab on PP-B code reads a link written by PP-G. F4's watering and ±3 °C answers come with **link v6** (coordinator row 2026-11-14: an older tab must say "newer version" rather than judge a watered site without its answer); F4's design check may use the requires key `u=` instead (extension rule 3 below).

**Extension rule** (coordinator row "Plant palette plan amendments", 2026-11-14; settled before 0a freezes `link-v5.json`, since the PP-B decoder is the first whose links users keep):
1. A key the decoder does not know is ignored, wherever it appears (after `e` too): it changes neither the version status, nor the cut status, nor `unknownCount`, nor any other key. Vector: `…&e=1&zz=3` decodes the same as the link without `zz`. Today's `decodeLink` (`state.ts:148-204`) already does this, by accident; 0a makes it a tested rule.
2. A value the decoder cannot read falls back for that key alone: `m` unknown → `unsure`; unknown climates in `c` are dropped; in `s`, segments after the third are ignored and an unknown texture or pH word reads as `-`. Vectors: `m=huge` → `unsure`; `s=own.65.loam.ec2` → own, 6.5, loam.
3. **Bump rule.** A key whose absence cannot change a verdict is added under the same version. A key whose absence would change a verdict (watering, the ±3 °C adjustments, CLIM-4's height figure) needs a bump, or is listed in the requires key `u=<comma list of keys>`, reserved now: a decoder that does not know a key listed in `u` shows the "newer" line with the plants restored.
4. The owner's rule "older version, nothing restored, save removed" covers v1–v4 only (owner-answers-2026-11-14.md:40). From v5 on, a later decoder reads v5 links and saves by default; `linkVersionStatus` marks only v < 5 as `older`; removing a v5 save would need a recorded owner answer.
5. **Letters the next features expect** (reserved; none written in PP-B): goals, palette name, cautious switch, a Details deep link, watering. Watering gets its own key (for example `i`), never `w`: natural moisture and irrigation are separate facts, so `w=irrigated → unsure` stays only as an unknown-value case. CLIM-4's `h=higher.650` carries a figure in metres above sea level that must be understood (rule 3); the v5 vector `higher.650 → higher` stays. `n`, `p` and `t` (v4's Kept and Main crops) must not take a new meaning by accident; `u` is the requires key.
6. **Plant tokens are ids, never names:** plant links, and any future deep link or plant page, use the UUID token; once canopi-data ships `plant_aliases` (DATA-12) `decodeLink` resolves an unknown token through it before counting it unknown. No PP-B code.

```
#v=5&c=temperate&m=small&a=…&x=…&g=tr…&z=120&y=2041-2070[&k=FR&o=45.75,4.85&l=sun&w=average&q=sheltered&r=drains&h=town&s=own.65.loam]&e=1
```

| Key | Meaning | Written |
|---|---|---|
| `v` | 5 | always |
| `c` | climate list, lowercase | always |
| `k` | country, ISO alpha-2 | only with "Include my place", from a chosen, location or link source, never a guess |
| `m` | room: `pots`, `small`, `large`, `field`, `unsure` | always |
| `a` | members, 6-character tokens (or `.` + 22) | always |
| `x` | removed plants | as v4 |
| `g` | plants from another list, one per list (`GUEST_CODES`, `state.ts:38`) | as v4 |
| `z` | plot size, whole m², 1 to 1,000,000 | when set |
| `y` | period shown: absent = today, else the `PeriodId` span string (`2041-2070`), never an index or a centre year (2071–2099 and a CMIP7 2071–2100 have different centres); an unknown, malformed or legacy value reads as today with `LinkNotice.period` ("The period in this link is not available here; showing today."); a period id is never renamed or reused (a new climate generation adds ids, optionally with an alias map to the nearest id plus the notice) | when not today |
| `o` | climate cell centre `lat,lon` (`cellCentre`, `state.ts:95`) | only with "Include my place" |
| `l`, `w` | light, water | only with "Include my place", only when answered |
| `q`, `r`, `h` | wind, ground after rain, height | same |
| `s` | soil: `pots`, or `own.<pH × 10 or acid|neutral|chalky or ->.<texture id or ->`; absent = the soil map | same |
| `e` | `1`, always last (`END_KEY`, `state.ts:37`) | always |

Spot key grammar: read the word before the first `.`; an unknown word decodes to `unsure` (vectors `h=higher.650` → `higher`, `w=irrigated` → `unsure`). Period vectors: `y=2041-2070` and `y=2071-2099` round-trip; `y=2011-2040`, `y=2055`, `y=1` and `y=` read as today with the period notice; absent reads as today with no notice. Not in the link: the scenario, the view, the precise position. Limits kept: `MAX_LINK_IDS = 2000`, `LONG_LINK = 2000` (`state.ts:34-36`). Decoding never throws (`state.ts:186-187`). Vectors: `scripts/vectors/link-v5.json` in the shared envelope ([palette vectors](/conventions/palette-vectors.md); contract, reviewed by the coordinator before any stream starts).

```ts
export const LINK_VERSION = 5;
export type LinkVersion = 'current' | 'older' | 'newer' | 'unreadable' | 'absent';
export function linkVersionStatus(v: string | null): LinkVersion;   // classifies v only (null → 'absent'); used by decodeLink, persist.ts readRecord/oldRecord, restore.ts
export function encodeLink(state: ShareState, known: KnownIds, opts?: { origin?: LinkOrigin | null; place?: boolean }): string;
export function encodePlace(state: ShareState): string;             // "k=…&o=…&l=…&w=…&q=…&r=…&h=…&s=…", the private part alone; k from store.country, o from store.location
export function decodeLink(link: string, known: KnownIds, place?: string | null): DecodedLink;
export interface LinkNotice { unknownCount: number; cut: boolean; outdated: boolean; newer: boolean; unreadable: boolean; period: boolean }   // NO_NOTICES in step, restore.ts:20-21
```

### 8.2 Versions (owner, 2026-11-14: v4 links and saves are not restored; no migration code; the rule covers v1–v4 only, section 8.1 rule 4)

| Fragment or save | Status | Result | Message |
|---|---|---|---|
| `v=5` | current | read | — |
| `v` = 1 to 4, and the v1 query form | older | nothing restored; an older save is said once, then removed, as for v1–3 today (`state/arrival.ts:121-124`) | the live "older version" line (DEC:84) |
| `v` > 5 | newer | nothing restored; a newer save is kept untouched | new: "from a newer version of the tool. Reload the page." |
| `v` = 5 with a key listed in `u=` that this decoder does not know | current, `newer` notice | read, plants restored | the "newer" line |
| `v` not a whole number | unreadable | nothing restored, save untouched | new: "could not be read" |
| no `v` (`linkVersionStatus(null)` = `absent`) | absent | a fragment with `a` reads as unreadable ("could not be read"); without `a` it is not a palette link and nothing happens; a save with no `v` is not a record (`readRecord` null) and is left untouched | as said |
| `e=1` and `a` non-empty and no readable token (malformed) | current | `decodeLink` sets the `unreadable` notice (a token matter, not a version status); nothing restored, save untouched | "could not be read" |
| `e` missing | current | read up to the cut | the live "cut" line |

Not unreadable: an empty `a` (a valid empty palette); tokens that parse but are unknown (`unknownCount`); good tokens followed by garbage (`cut`); an unknown key (ignored, rule 1). Vectors for each, plus a fragment with no `v` and a save with no `v` (`persist.ts:105` tests more than `v` today). A v4 link keeps reaching `/palette/` through the redirect and gets the older-version line; the board rows K4 and B8 already say so.

### 8.3 Storage (localStorage)

| Key | Value after | Change |
|---|---|---|
| `canopi-consortium` | `{ fragment, place, at, src, country? }`: `fragment` the public v5 form (room `m` and plot `z` live there, always public); `place` the palette's private place answers `l w q r h s` (no `k`, no `o`); `country` the location country kept beside the fragment when `src` is `'location'`, never in it (as today, `persist.ts:86-90`) | v4 records read as older; records without `place` read with every answer `unsure` |
| `canopi-place` (new, PP-B) | the reader's last place answers `m z l w q r h s` | **only seeds a new palette** (owner wording of `privacy.tool.device`, 2026-11-14: "Your last spot answers are also kept to start your next palette"): written on every place change; read only when a palette starts with no place of its own (no save, or an arrival that brings no place and no open palette); cleared by "Forget this location"; named on the privacy page |
| `canopi-location` | as today, per device | the one location store; "Use it" writes a link's cell into it (below) |
| `canopi-country`, `canopi-climate` | as today | none |

The privacy text this storage must match is `privacy.tool.device`, owner-approved 2026-11-14 (plan, "Privacy text shipped in PP-B"): the palette (height limit, plot size, spot answers), country, location and site climate on this device; the last spot answers kept to start the next palette; "Forget this location" clears the location and the spot answers.

- The address bar holds the public form only (inventory K7). `history.state` becomes `{ ct, src, pl }` (`state/arrival.ts:31-37` reads `{ct, src}`); `pl` keeps a link's place for this tab (tab isolation: `writeSave` is shared across tabs).
- The save rule stays: a remove or put-back happens only while the save is what this page last wrote or read (`state/persist.ts:219-235`). Arriving by a link or a guide preset writes nothing until the reader acts; "Open my saved palette instead" calls `restore(saved.fragment, { from: 'saved' })` (`state/restore.ts:125`).
- **A link without a place** is judged against the open palette's `place`, else `canopi-place`, plus the device location: the location half works today (`restore.ts:52-58`). The link "brings a place" when it has `o` or at least one spot or soil answer that is not `unsure` (decided on the decoded state, not on keys present). `m` and `z` never count as bringing a place: they belong to the palette, are always in the link and the save, and a link's or save's `m` and `z` win. A `k` with no `o` and no answer other than `unsure` does not bring a place, and the reader's country is kept. Vectors: every answer `unsure`; only `m` and `z`; `k` alone; `k` with `l=sun`.
- **Forget this location** runs today's `forget()` (`state/location.ts`) and also clears `canopi-place` and the open palette's `place`. **Start over** keeps the palette's `place`.
- **A link that brings a place** (Arrivals board): it applies to that page only (`history.state.pl`, `location.source = 'link'`), with the notice "Use it" / "Use my own place"; `writeSave` keeps the save's own `place` until the reader chooses; "Use it" writes the link's spot and soil answers into the palette's `place`, its `o` into `canopi-location` through `state/location.ts` and its `k` through `state/draft.ts`, so they hold across reloads (coordinator row 2026-11-14: this reverses the [location module](/modules/consortium-location.md) rule that a link's `o=` is never saved over the reader's `canopi-location`). "Send the link to my computer" (P11) is `encodeLink(…, { origin, place: true })`, the grower's own link, and takes the same path. Unit tests: a palette edit keeps `l=sun`; "Use it" gives `l=shade` and the link's cell after reload; "Use my own place" restores the reader's own.
- **Sheets and browser history** (inventory K7): b2 decides in its first commit, and records as a coordinator row, whether a full-screen sheet pushes `history.state.sheet` so the phone's Back closes it, or never does; changing it later reshapes `history.state` and the K7 tests. The deep-link letter is reserved (section 8.1 rule 5).
- **Guide presets** (`?plant=&climate=`, `readPreset` `state.ts:279`, `applyPreset` `restore.ts:189-204`): the plant joins `members` inside the existing `quietly(batch())`; `guideKept` becomes `guidePlant`, and b1a replaces `consortium.start.guideKept` with a `consortium.place.` key that does not say "Kept". A preset gives `members == [id]` and no save until the reader acts.

### 8.4 The move to `/palette/` (PP-B commit 0)

- `src/i18n/consortium-path.js:6` returns `/palette/` and `/${lang}/palette/`; pages move from `src/pages/consortium.astro` and `src/pages/[lang]/consortium.astro` to `palette.astro`; the three literals in `ConsortiumPage.astro:81,95,100` use `consortiumPath`. Data path `/data/consortium/*.sqlite.gz`, storage keys and key prefixes keep their names. Links found by `grep -rn '/consortium' src`: the four guide MDX files (garden-helpers, flowers-for-pollinators, en and fr) and `src/components/guides/TryConsortium.astro`.
- `public/_redirects` gains 22 lines, with and without the trailing slash, written out per locale (`/consortium /palette/ 301`, `/consortium/ /palette/ 301`, `/fr/consortium /fr/palette/ 301`, …); no splat (`/:lang/consortium/*` would catch `/data/consortium/*`), no `Language=` condition; `/app/:route /app/ 200` stays first-match-correct.
- **Probe:** there is no Cloudflare preview (previews off, runbook "CI and deploy gate"), so the probe runs on wrangler dev (`scripts/browser/serve.mjs`): query and fragment survive for `/consortium/?plant=…`, `/fr/consortium/?v=3…` and `#v=4…`; after PP-B is live, `curl` production expects `Location: /fr/palette/?plant=…`. If production answers the redirect without the query or fragment, the 22 lines may ship as 302 until the production `curl` check passes. **Fallback:** drop the 22 lines (never a stub page and a redirect on one path) and add one stub page per locale at the old address, `/consortium/` and `/<lang>/consortium/`, each pointing to `consortiumPath(lang)` and running `location.replace('/palette/' + location.search + location.hash)`, with canonical, noindex and noscript, left out of the sitemap; `check-built-site` then expects the stubs.
- Harness and checks the move edits: `scripts/browser/harness.mjs:354` (fixture match), `scripts/browser/{seams,p5,f1a}-helpers.mjs`, `scripts/browser/smoke/*.mjs`, `consortium-timing.mjs`, the specs that open the old path (`consortium-s4`, `-commit0`, `-e6` (fetch at `:277`), `-f1a-palette:57`, `-p5-s5f:38`), `scripts/guides-consortium.test.mjs:102-121`, `scripts/built-links.test.mjs:41-42`, `check-built-site.mjs` x-default (`:418`), `checkHeader(…,'/consortium/',…)` (`:421`) and `checkLinks`. The "no `/consortium/` left" test names the files it scans (`src/**/*.{astro,ts,tsx,js,mdx,md,json}` and `public/_redirects`, the stubs excepted) and checks URL strings only (href values, string literals starting `/consortium/` or `/<lang>/consortium/`, markdown link targets); import paths, `src/*/consortium/` and `/data/consortium/` are exempt. Specs that open `/consortium/` follow the 0b 301 in wrangler dev, so the fixture match on `/palette/` still applies; only the stub fallback's `location.replace` race needs a wait in the harness.

## 9. Failure and loading states per path

| Path | Loading | Failure | Owner |
|---|---|---|---|
| Tool and database | "Loading the tool"; "Still loading" after 5 s (inventory A6) from a `slow` callback of `data/load.ts` read in `main.ts:29-56`; the stall stays 15 s (`data/load.ts:21`); tested with the harness's new `database: 'hold'` (commit 0; `harness.mjs:312-315` answers at once or, for `stall`, never), released by `page.releaseHeld()`, and a `timeouts.slow` hook if the threshold needs one | the live screens (`App.tsx:28-36`) | b2 |
| Offline | page-level line "You are offline. What is loaded still works." from `navigator.onLine` and its events | — | b2 (`store.ts` `offline`, shown by `App.tsx`) |
| Return visit | the palette page's placeholder, never the Place form (marker P2, inventory P42) | "could not be restored" lines (`state/restore.ts:20-22`) | b2 |
| Any lazy chunk | one loading line in place | `LoadFailed` with Reload; next use fetches `?retry=n` (`views/lazy.tsx:62-148`); the rest stays usable; offline: "Needs a connection", a retry on `online`, never a reload | `views/lazy.tsx` (b2 in PP-B) |
| `verdict` chunk fails | — | every fit line says "not checked", never "fits" (marker C6); holes computed without verdicts say so; Reload works (PP-B20, `block: { verdict: 404 }`) | b2, c2 |
| Guest lists | holes `pending`, "Loading the other lists" (inventory L2) | the list is named as missing; its plants "not checked" (PP-B21) | b2 |
| Location lookup | asking, refused, timed out, unavailable, sea, coast, polar, between two climates (D2, D9) | search offline or failed, map could not load (D4, D6) | b1a |
| No location | Place shows the climate cards; range factors `unknown`; the period switch and the climate picture say "needs your place" (today `views/FutureSlot.tsx:13` renders nothing) | — | b1a, e1 |
| Soil tile | "Reading the soil map" | "The soil map has no value here" (sea, coast, ice: `types.ts:382-384`); answer stays `map`, `basis: 'none'`, soil factors `unknown` | f1 |
| `layerValues` | grey year picture | "Months could not be read" with Reload; flowering "n of m recorded", never a pass | g1 |
| Suggest | the live wait and its 10 s stop (`state/suggest-wait.ts`) | "Suggest stopped" (inventory J2) | b1a |
| Link | — | section 8.2; a period not available here: today with the period notice | b1a (`state/restore.ts` notices) |
| Toast | 12 s (`store.ts:353`), paused while pointer or focus is on it; on leaving, focus returns to the control that raised it, else the page title (never `body`) | — | b2 (`store.ts:348-364`, `focus.ts:42`) |
| Start over | toast with Undo; one Undo restores members, removed, guests; the palette's `place` is kept | — | b1a (`state/draft.ts` `startOver`, `:53`) |

## 10. Formats that outlive the code

Files and messages that sit on growers' disks, in other repositories or in the app port; each settled now because changing it later costs a migration.

| Format | Shape | Version rule | Owner |
|---|---|---|---|
| Link v5 | section 8.1, with its extension rule | section 8.1 rules 1–4 | 0a, then b1a |
| Vector files `scripts/vectors/<kind>.json` | the shared envelope `{ schema: 'canopi-palette-<kind>/<n>', source?, thresholds?, plants, places, cases }` ([palette vectors](/conventions/palette-vectors.md)) | adding cases or optional fields keeps `/n`; a change of meaning or a removed field is `/n+1`; a loader refuses an unknown schema id | each file's stream |
| `.canopi` hand-off | a root key `projectcanopi_palette` = `{ schema: 1, plot_m2: number \| null, period: PeriodId, spacing: { <canonical_name>: { full_m, close_m, basis: 'rule' \| 'source' } } }`; a plant with no width is left out of `spacing`; today written as `'1991-2020'`; no `link` field (it would leak the place outside the tick) | readers ignore unknown fields; a new optional field keeps `schema`; a rename or change of meaning bumps it; the app keeps unknown root fields (canopi-types `design.rs:345-349`, snake_case registry `desktop/web/src/app/design-edit/extra-keys.ts:13-16`, at the pinned app commit 0c425fb07) and a hand-off note naming the key goes to the app | d2 |
| Save record `period` | the same `PeriodId` string as the link's `y` and the `.canopi` `period`, today `'1991-2020'` | as the link | 0a; d2's unit test checks the two agree |
| Correction report `/2` | `/1` plus `kind` (required: `correction` \| `feedback`; a `feedback` report needs a `note`, and its plant fields are null together), `site_climate`, `placement_estimate` and an optional `context` object with the exact keys sent to canopi-data on 2026-11-14 (D5, before its merge): `period` (a `PeriodId`), `scenario`, `verdict_level`, `limiting_factor`, `limiting_basis`, `winter_night_adjust_c` and `summer_day_adjust_c` (integers −3..3), `dry_season_watered`, `soil_basis` (`map` \| `test` \| `pots` \| `none`), `origin_kind` (`own` \| `guest` \| `borrowed`); no coordinates, place name, pH or spot answers; a null climate is sent as null, never as `"unknown"` (`src/lib/correction.mjs:75-76` changes in F1b) | the top level stays exact; inside `context` a known key with a wrong value refuses the report; unknown keys are kept when at most 8, named `^[a-z][a-z0-9_]{0,31}$`, scalar, a string at most 64 characters, the whole `context` at most 1024 bytes, and a key whose value matches the personal-data check is dropped, so later keys need no `/3`; one shared fixture in both repos; a unit test checks the form's keys against canopi-data's importer set (`src/canopi/curated/correction_reports.py:43-52` `BLOCK_KEYS`); the F1b "Sent with" line lists every value sent | F1b with canopi-data D5 (DATA-16) |
| CSV of the palette (F1b-1) | stable English column ids including the plant UUID and scientific name, units in the header, the period as a `PeriodId`, columns only ever appended, recorded in a vectors file | appending only | F1b-1's design check |

## As built in PP-B commit 0a (2026-11-14)

- **Link v5 (sections 8.1–8.3):** the codec is in `state.ts`, with `scripts/vectors/link-v5.json` as its contract. An `origin` implies the place tick.
- **Rooms:** `pots` is a `Room` value read by the codec, and Start offers it from b1a on.
- **Colour tokens (section 3.5):** written in `tokens.css`, with contrast figures in the decision row "Plant palette colour tokens". Food and soil take Fable's values because the app's fail 4.5:1 on `--bg`. The light levels are fills with an ink outline and a label.
- **lookup.periods:** `climateFor` is the intended only reader. For now `future.ts`, `site-climate.ts` and `site-today.ts` also read it; `arch-rules.test.mjs` reports them as a diagnostic, not a failure.

- **Delete first (owner, 2026-11-14; amendment after 0a):** the temporary `matrix` role and `lazyPart` of 0a are undone by commit 0a', which deletes the old screens (section 6 rows marked "commit 0a'"); the new page is built into the empty space. Between 0a' and b2's merge the branch has no palette view; per-commit gates are the lasting-layer tests, the type check and the ratchets ([slices](/project/plant-palette-slices.md) section 0).

Section 8.1 as built (coordinator review of 0a): any `o` is snapped to its 0.1° cell centre on both encode and decode. `k` must be exactly two upper-case letters. When a key appears twice, the first one is read. Contract: `scripts/vectors/link-v5.json`.
