---
type: Project
title: Plant palette slices
description: "Pushes PP-B to PP-G of the Plant palette redesign: common rules, the 39 F1a markers re-owned and the parking rule, the tests each push breaks, and per push the outcome, boards, commit 0, streams with owned files and tests first, probes, budgets, risks and deletions."
tags: [consortium]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-15T08:13:38Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-15T08:46:42Z }
sources:
  - id: pp-b-owners-json
    resource: ../../scripts/plan/pp-b-owners.json
    title: scripts/plan/pp-b-owners.json
    digest: sha256:687ecb9e74c58484
    last_modified: 2026-11-14T22:20:01Z
  - id: f1a-owners-json
    resource: ../../scripts/plan/f1a-owners.json
    title: scripts/plan/f1a-owners.json
    digest: sha256:8e8bba65961d8c87
    last_modified: 2026-11-14T09:22:27Z
  - id: expect-fail-mjs
    resource: ../../scripts/expect-fail.mjs
    title: scripts/expect-fail.mjs
    digest: sha256:94544e6efe25bcaa
    last_modified: 2026-11-13T03:03:27Z
  - id: lib-sh
    resource: ../../.githooks/lib.sh
    title: .githooks/lib.sh
    digest: sha256:cee592be6d4538a1
    last_modified: 2026-11-13T03:34:49Z
  - id: ci-yml
    resource: ../../.github/workflows/ci.yml
    title: .github/workflows/ci.yml
    digest: sha256:f54c110957ab8614
    last_modified: 2026-11-13T12:11:05Z
  - id: dependency-cruiser-cjs
    resource: ../../.dependency-cruiser.cjs
    title: .dependency-cruiser.cjs
    digest: sha256:29cbaf3dbda18ec2
    last_modified: 2026-11-14T10:56:09Z
  - id: zero-markers
    resource: ../../.githooks/zero-markers
    title: .githooks/zero-markers
    digest: sha256:887667b4d3bb33f9
    last_modified: 2026-11-13T13:02:56Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:a090fc09acf02ec7
    last_modified: 2026-11-14T12:25:38Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:a54f837af2a33c43
    last_modified: 2026-11-14T11:12:40Z
  - id: browser-tests-test-mjs
    resource: ../../scripts/browser-tests.test.mjs
    title: scripts/browser-tests.test.mjs
    digest: sha256:2c99fd3247301a97
    last_modified: 2026-11-14T20:07:28Z
  - id: consortium-f1a-a11y-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-a11y.browser.test.mjs
    title: scripts/browser/consortium-f1a-a11y.browser.test.mjs
    digest: sha256:3c4351711e4409d5
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-f1a-balance-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-balance.browser.test.mjs
    title: scripts/browser/consortium-f1a-balance.browser.test.mjs
    digest: sha256:c6b5a8a51d9cc960
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-f1a-confidence-browser-test-m
    resource: ../../scripts/browser/consortium-f1a-confidence.browser.test.mjs
    title: scripts/browser/consortium-f1a-confidence.browser.test.mjs
    digest: sha256:ba2a3009fd2751c4
    last_modified: 2026-11-13T19:32:13Z
  - id: consortium-f1a-filters-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-filters.browser.test.mjs
    title: scripts/browser/consortium-f1a-filters.browser.test.mjs
    digest: sha256:7dbe78bf45462094
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-f1a-palette-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-palette.browser.test.mjs
    title: scripts/browser/consortium-f1a-palette.browser.test.mjs
    digest: sha256:66dd80fab9571457
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-f1a-perf-browser-test-mjs
    resource: ../../scripts/browser/consortium-f1a-perf.browser.test.mjs
    title: scripts/browser/consortium-f1a-perf.browser.test.mjs
    digest: sha256:055884901d9f38d1
    last_modified: 2026-11-13T19:32:13Z
  - id: shards-json
    resource: ../../scripts/browser/shards.json
    title: scripts/browser/shards.json
    digest: sha256:278d03d94f6bfc36
    last_modified: 2026-11-14T12:12:11Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:e6e2dd373870d866
    last_modified: 2026-11-14T12:12:11Z
  - id: built-modules-test-mjs
    resource: ../../scripts/built-modules.test.mjs
    title: scripts/built-modules.test.mjs
    digest: sha256:a51ff392be603f0e
    last_modified: 2026-11-14T12:12:11Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:73d0a99d6422b186
    last_modified: 2026-11-14T21:33:54Z
  - id: consortium-balance-test-mjs
    resource: ../../scripts/consortium-balance.test.mjs
    title: scripts/consortium-balance.test.mjs
    digest: sha256:1f0c3404a3d86aea
    last_modified: 2026-11-13T20:25:47Z
  - id: consortium-canopi-file-test-mjs
    resource: ../../scripts/consortium-canopi-file.test.mjs
    title: scripts/consortium-canopi-file.test.mjs
    digest: sha256:213bc47007f2b373
    last_modified: 2026-11-11T04:54:12Z
  - id: consortium-confidence-test-mjs
    resource: ../../scripts/consortium-confidence.test.mjs
    title: scripts/consortium-confidence.test.mjs
    digest: sha256:807eeb2fe9a1172e
    last_modified: 2026-11-13T19:32:13Z
  - id: consortium-p5-seams-test-mjs
    resource: ../../scripts/consortium-p5-seams.test.mjs
    title: scripts/consortium-p5-seams.test.mjs
    digest: sha256:7a9a00b639b18f76
    last_modified: 2026-11-14T22:07:45Z
  - id: consortium-palette-test-mjs
    resource: ../../scripts/consortium-palette.test.mjs
    title: scripts/consortium-palette.test.mjs
    digest: sha256:e794c81a66f37dc9
    last_modified: 2026-11-13T19:32:13Z
  - id: plan-owners-test-mjs
    resource: ../../scripts/plan-owners.test.mjs
    title: scripts/plan-owners.test.mjs
    digest: sha256:02ac6064d280aba6
    last_modified: 2026-11-14T21:28:50Z
  - id: e6-owners-json
    resource: ../../scripts/plan/e6-owners.json
    title: scripts/plan/e6-owners.json
    digest: sha256:8ab5105bee363134
    last_modified: 2026-11-13T12:34:11Z
  - id: owners-mjs
    resource: ../../scripts/plan/owners.mjs
    title: scripts/plan/owners.mjs
    digest: sha256:e2b863bbcff15874
    last_modified: 2026-11-13T18:11:16Z
  - id: arch-rules-test-mjs
    resource: ../../scripts/quality/arch-rules.test.mjs
    title: scripts/quality/arch-rules.test.mjs
    digest: sha256:174d28aca3493758
    last_modified: 2026-11-14T10:56:09Z
  - id: axe-json
    resource: ../../scripts/quality/baselines/axe.json
    title: scripts/quality/baselines/axe.json
    digest: sha256:d9eebfa72531c53b
    last_modified: 2026-11-13T03:26:34Z
  - id: datasourcespage-astro
    resource: ../../src/components/DataSourcesPage.astro
    title: src/components/DataSourcesPage.astro
    digest: sha256:60c7d25fd06f12e0
    last_modified: 2026-11-14T12:22:11Z
  - id: privacypage-astro
    resource: ../../src/components/PrivacyPage.astro
    title: src/components/PrivacyPage.astro
    digest: sha256:e7e62bb8151b31fd
    last_modified: 2026-11-14T12:22:11Z
  - id: climate-release-json
    resource: ../../src/data/climate-release.json
    title: src/data/climate-release.json
    digest: sha256:f17c3cc7b270a864
    last_modified: 2026-11-11T09:33:29Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:56d00d4048591c6f
    last_modified: 2026-11-14T21:28:50Z
  - id: load-ts
    resource: ../../src/islands/consortium/data/load.ts
    title: src/islands/consortium/data/load.ts
    digest: sha256:885e0b933a3243fd
    last_modified: 2026-11-14T14:41:58Z
  - id: search-ts
    resource: ../../src/islands/consortium/data/search.ts
    title: src/islands/consortium/data/search.ts
    digest: sha256:9c922c58f2aad746
    last_modified: 2026-11-13T13:02:30Z
  - id: sqlite-source-ts
    resource: ../../src/islands/consortium/data/sqlite-source.ts
    title: src/islands/consortium/data/sqlite-source.ts
    digest: sha256:476f116c5e449766
    last_modified: 2026-11-14T12:12:11Z
  - id: focus-ts
    resource: ../../src/islands/consortium/focus.ts
    title: src/islands/consortium/focus.ts
    digest: sha256:caffd30f4ecda69b
    last_modified: 2026-11-15T06:28:16Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:0c07788ec3b722bc
    last_modified: 2026-11-15T07:15:54Z
  - id: list-query-ts
    resource: ../../src/islands/consortium/rules/list-query.ts
    title: src/islands/consortium/rules/list-query.ts
    digest: sha256:bb3e2ea41339b8f7
    last_modified: 2026-11-14T22:07:45Z
  - id: site-fit-ts
    resource: ../../src/islands/consortium/rules/site-fit.ts
    title: src/islands/consortium/rules/site-fit.ts
    digest: sha256:0fada07f7575e635
    last_modified: 2026-11-14T22:07:45Z
  - id: suggest-block-ts
    resource: ../../src/islands/consortium/rules/suggest-block.ts
    title: src/islands/consortium/rules/suggest-block.ts
    digest: sha256:bc785e5e9d676b40
    last_modified: 2026-11-13T07:27:10Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:c0c5086cbc6f4b8d
    last_modified: 2026-11-15T08:15:08Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:5b1cc5e5b7385399
    last_modified: 2026-11-15T08:35:06Z
  - id: add-tsx
    resource: ../../src/islands/consortium/views/Add.tsx
    title: src/islands/consortium/views/Add.tsx
    digest: sha256:8c8c38cfe432a5b7
    last_modified: 2026-11-14T22:07:45Z
  - id: correction-tsx
    resource: ../../src/islands/consortium/views/Correction.tsx
    title: src/islands/consortium/views/Correction.tsx
    digest: sha256:d8b5e48bb82a9da3
    last_modified: 2026-11-13T13:15:04Z
  - id: futureslot-tsx
    resource: ../../src/islands/consortium/views/FutureSlot.tsx
    title: src/islands/consortium/views/FutureSlot.tsx
    digest: sha256:0ae13573d9f7e790
    last_modified: 2026-11-14T21:28:50Z
  - id: paste-tsx
    resource: ../../src/islands/consortium/views/Paste.tsx
    title: src/islands/consortium/views/Paste.tsx
    digest: sha256:904e8e3e5a71ad0b
    last_modified: 2026-11-14T22:51:25Z
  - id: plantmarks-tsx
    resource: ../../src/islands/consortium/views/PlantMarks.tsx
    title: src/islands/consortium/views/PlantMarks.tsx
    digest: sha256:19b90a13185c65b7
    last_modified: 2026-11-12T10:10:38Z
  - id: sheets-tsx
    resource: ../../src/islands/consortium/views/Sheets.tsx
    title: src/islands/consortium/views/Sheets.tsx
    digest: sha256:569aa46cc7bcee28
    last_modified: 2026-11-15T06:28:16Z
  - id: flags-ts
    resource: ../../src/islands/consortium/views/kit/flags.ts
    title: src/islands/consortium/views/kit/flags.ts
    digest: sha256:4793b06fedb7fa35
    last_modified: 2026-11-14T22:07:45Z
  - id: sheet-tsx
    resource: ../../src/islands/consortium/views/kit/sheet.tsx
    title: src/islands/consortium/views/kit/sheet.tsx
    digest: sha256:1bbd681174e63de4
    last_modified: 2026-11-14T22:07:45Z
  - id: later-ts
    resource: ../../src/islands/consortium/views/later.ts
    title: src/islands/consortium/views/later.ts
    digest: sha256:14a41ad260f237ba
    last_modified: 2026-11-14T12:12:11Z
  - id: layers-ts
    resource: ../../src/islands/consortium/views/layers.ts
    title: src/islands/consortium/views/layers.ts
    digest: sha256:7252e2bc066e5305
    last_modified: 2026-11-11T09:49:44Z
  - id: paste-ts
    resource: ../../src/islands/consortium/views/paste.ts
    title: src/islands/consortium/views/paste.ts
    digest: sha256:e5ac19644e8ab579
    last_modified: 2026-11-11T09:55:29Z
  - id: index-ts
    resource: ../../src/lib/climate/index.ts
    title: src/lib/climate/index.ts
    digest: sha256:9fffb42bb87f69b5
    last_modified: 2026-11-12T12:34:53Z
  - id: model-js
    resource: ../../src/lib/climate/model.js
    title: src/lib/climate/model.js
    digest: sha256:23fa6d9b282cd681
    last_modified: 2026-11-12T20:26:30Z
  - id: soil-ts
    resource: ../../src/lib/climate/soil.ts
    title: src/lib/climate/soil.ts
    digest: sha256:412c74305668a696
    last_modified: 2026-11-12T20:26:30Z
  - id: canopi-file-ts
    resource: ../../src/lib/consortium/canopi-file.ts
    title: src/lib/consortium/canopi-file.ts
    digest: sha256:a162262df831f7bf
    last_modified: 2026-11-11T05:47:54Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:a635a47f805ea6e7
    last_modified: 2026-11-14T22:07:45Z
  - id: future-marks-ts
    resource: ../../src/lib/consortium/future-marks.ts
    title: src/lib/consortium/future-marks.ts
    digest: sha256:dc7162e2c1e66dbb
    last_modified: 2026-11-12T11:43:06Z
  - id: index-ts-2
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:877b71a79e071642
    last_modified: 2026-11-14T21:28:50Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:97b5290a800f6a3f
    last_modified: 2026-11-14T12:46:39Z
  - id: mark-providers-ts
    resource: ../../src/lib/consortium/mark-providers.ts
    title: src/lib/consortium/mark-providers.ts
    digest: sha256:a4f658dd31fb03d3
    last_modified: 2026-11-12T12:34:53Z
  - id: marks-ts
    resource: ../../src/lib/consortium/marks.ts
    title: src/lib/consortium/marks.ts
    digest: sha256:8a43c201f0c9b5c2
    last_modified: 2026-11-14T21:28:50Z
  - id: matrix-ts
    resource: ../../src/lib/consortium/matrix.ts
    title: src/lib/consortium/matrix.ts
    digest: sha256:c948918a08ee50b3
    last_modified: 2026-11-14T12:12:11Z
  - id: range-marks-ts
    resource: ../../src/lib/consortium/range-marks.ts
    title: src/lib/consortium/range-marks.ts
    digest: sha256:f95b4517b5a1d797
    last_modified: 2026-11-13T10:58:21Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:eb4395e60994e93b
    last_modified: 2026-11-12T07:59:10Z
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:d89b0b8086198a1e
    last_modified: 2026-11-14T22:07:45Z
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
    last_modified: 2026-11-14T12:12:11Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:537d25093ae022cf
    last_modified: 2026-11-14T22:07:45Z
  - id: parked-markers-json
    resource: ../../scripts/plan/parked-markers.json
    title: scripts/plan/parked-markers.json
    digest: sha256:343ead63d250aab9
    last_modified: 2026-11-14T11:21:32Z
---

Pushes of the [Plant palette redesign](/project/consortium-v2-plan.md), in order: **PP-B, PP-C, PP-D, PP-E, PP-F, PP-G** (owner answers of 2026-11-14: no separate push A; later climates, then soil and your spot, then through the year). Module names, shapes and link keys: [Plant palette architecture](/architecture/plant-palette-architecture.md); use them exactly. Boards are named by file in `.local/consortium/v2/f1a/mockups-v3/project/<Name>.dc.html` (main checkout, gitignored); inventory rows are those of `mockups-v3/ux-inventory.md`. Citations are at `f1a/int` 648baf2. Amended 2026-11-14 by the plan recheck and the look-ahead check and by the owner's plan check answers (decision rows "Plant palette plan check answers" and "Plant palette plan amendments"), then by the owner's "Delete first" answer (rows "Delete first" and "Plant palette delete-first amendments": PP-B's commit 0 deletes the old screens before the new page is built).

## 0. Rules common to every push

- **Branch.** Integration branch `pp/<letter>`; streams `pp/<letter>-<stream>`. `pp/b` is cut from the tip of `f1a/int` that holds this plan and its amendment (the plan commit 0e89790 and the amendment commit on top of it); citations stay at 648baf2. That tip holds the seams worth keeping: `Room` with `pots` (`types.ts:71-73`), `ROOM_LIMIT_M` (`site.ts:37`), `SIZE_LIMIT` (`suggest.ts:30`), `Confidence` (`types.ts:471-479`), the no-op `focusAfterToast` (`focus.ts:42`), `scripts/expect-fail.mjs`, `scripts/plan/owners.mjs`. Each later branch is cut from `master` once the previous push is live.
- **Owners file per push:** `scripts/plan/pp-<letter>-owners.json` (shape of `scripts/plan/e6-owners.json`; `node scripts/plan/owners.mjs validate`; a stream checks its diff with `owners.mjs check <chunk> <stream> <base> --file …`). PP-B's is committed with this plan; each later one is written by that push's commit 0. `scripts/plan/f1a-owners.json` carries `superseded_by` (pinned by `scripts/plan-owners.test.mjs`).
- **Commit 0** (main agent) holds only shared seams: types, the link codec, state fields, budget roles and caps, the owners file, the CSS imports of every new stylesheet in `ConsortiumPage.astro`, the colour token block, the unit formatters, the marker moves and parking. No screen, no rule body (the exceptions are the place projections two streams read at once: `emptyPlace`, `siteFor`, a minimal `resolveSoil`, `climateFor`). **PP-B's commit 0 also deletes the old screens first** (owner, 2026-11-14, row "Delete first"; section 2, 0a'): the new page is built into the empty space.
- **Per-commit gates (owner, 2026-11-14, "Delete first"; supersedes "every commit a usable tool" for PP-B):** an intermediate commit on `pp/b` or a stream branch need not be a usable tool. After every commit: `npm run check`, `npm test` (the lasting-layer unit tests: core, `rules/**`, state, link, storage, climate, soil, location, i18n keys, the harness and plan tests, the vectors), `check:arch`, `check:dead` and `check:dup` (the ratchets never get worse). Browser specs run per commit only for the paths that exist at that commit (Place, the location step, the sheets, Details, Share, print); a spec reaching a deleted screen is retargeted by the stream that builds its new route and is not run until then. **Nothing ships until the whole push passes** the push gates below.
- **Streams:** at most three per push, each a feature (not a layer) that writes its own tests first; at most two building agents at once, so a third starts when one hands off. One scenario spec per stream (`scripts/browser/consortium-pp-<stream>.browser.test.mjs`) and one unit file per stream (`scripts/consortium-pp-<stream>.test.mjs`), registered once in every list of `scripts/browser/shards.json` by commit 0 (`scripts/browser-tests.test.mjs` checks it). A shared file has one owner per chunk; a stream needing another's file asks the coordinator.
- **Tests first.** A stream's first commit adds its tests as expected-fail markers, `failing(title, { owner, reason }, fn)` with the stream id in the title (`scripts/expect-fail.mjs:22-38`); each marker goes in the commit that makes it pass.
- **Zero markers before each push (gate rule, made workable):** the master gate stays as it is (`.githooks/zero-markers` = `fail`; `node scripts/expect-fail.mjs --zero` in pre-push and CI job 1, `.github/workflows/ci.yml:133`). Mechanism: **park by splitting out.** A push's commit 0 removes from the tree every marker a later push owns; it is parked at its source commit (648baf2 for the 39 F1a markers), listed in the table below with its file and line and in `scripts/plan/parked-markers.json` (written by commit 0; the next push's commit 0 asserts each listed marker is restored or deleted); the owning stream restores it with `git show 648baf2:<path>` in its first commit, retitled with its owner and with its reason rewritten against the new seam's empty state. A marker of the push itself is moved unchanged only if one capped run after 0a and after 0b shows it still fails for its stated reason (`expect-fail.mjs:30-34` turns a reason mismatch into a failure); every other one is parked the same way. **A marker whose subject is a screen the push deletes is deleted, never parked** (owner, 2026-11-14, "Delete first"); where the new page keeps the behaviour in another form, the owning stream writes a new test for it under its own id (section 1 names it). A marker about behaviour the new page keeps (a rule, a state, a journey) keeps its owner and is parked or moved as above. `scripts/browser/f1a-helpers.mjs` stays until PP-C. Markers of the push itself are removed by their streams before the push. No skip list, no second marker kind, no gate change.
- **Lasting-layer tests** are unit tests of the core and of `rules/**` and JSON vectors under `scripts/vectors/` (`link-v5.json`, `verdicts.json`, `holes.json`, `weigh.json`, `plan.json`, `season.json`) so the app's Rust code can run the same cases when a feature moves there. Every vector file uses the shared envelope of [palette vectors](/conventions/palette-vectors.md) (`schema: 'canopi-palette-<kind>/<n>'`, plain JSON, export and manifest snake_case names, place answers as link v5 words, rule outputs only, never TS property names or i18n keys; the adapter from TS types lives in the test); a shape check in `test:vectors` confirms a known schema id and that every plant and place a case names exists in the file; DATA-1's `range_verdicts.json` is run from the release, never copied. **Scenario tests** are browser tests of a grower's journey asserting text and state the grower relies on, never markup or class names.
- **Scenario places:** Lyon, Seville, Kiambu, Recife, Oulu, Mendoza, Kumasi, Manaus, a balcony in pots (Osaka). Expected figures come from the boards and `mockups-v3/growers.md`, never from a grower's feedback (owner rule: grower feedback never blocks).
- **Gates** before the main agent pushes: `npm run check`, `npm test`, `npm run check:arch`, `npm run check:dup`, `npm run check:dead`, `npm run test:browser` (it builds, `package.json:17`), `npm run test:browser:smoke`, `npm run test:vectors`, `node --test scripts/built-modules.test.mjs`, `npm run build` then `node scripts/check-built-site.mjs`, `npm run test:axe` (as CI job 4); `python3 .okf/okf.pyz impact` and `check`. Every command capped with `systemd-run` (agent rules). Streams never push.
- **Budgets every push:** every role under its cap and the first run under its cap (`scripts/check-built-site.mjs:498-519`). **The owner allows raising any cap (2026-11-14: "Raise all limits if needed… Optimize size after").** A raise is made by the coordinator at a merge, never silently by a stream: one row in the budget log of the plan and one coordinator row in the decision log, each naming the cap, old and new value, the measured size and the reason. The optimisation step after PP-G (roadmap) brings caps back down.
- **Text:** every new key in all 11 locale files, `pt` in Brazilian Portuguese, under the stream's prefix (ending in `.`) with an `edits` list of the existing keys it changes or deletes (owners file `shared`). New keys take preformatted measures (`{len}`, `{area}`, `{depth}`, `{temp}`, `{tempDiff}` from `format.ts`), never a unit after a placeholder (policy check in `consortium-keys.test.mjs`). Verdict, hole and year-span words come only from `verdict-line.ts` under `consortium.line.` (b2). Colour comes only from the token block of `src/styles/tokens.css` (architecture section 3.5) and never carries meaning alone; breakpoints 639 and 960 only; nothing scrolls sideways at 320 px and no control or plant name passes the right edge (WCAG 1.4.10).
- **Exit criteria every push:** gates green; zero markers; each board listed for the push compared with the built page at 320 px, 390 px and 1280 px, light and dark, differences listed for the coordinator; every inventory row listed done or named as moved; keep rows N1 and N3 re-checked; concepts updated (`okf impact`).

## 1. The 39 expected-fail markers on `f1a/int`

PP-B commit 0 moves 7 PP-B markers unchanged into their stream's files (A1, A2, S1, P2, P4, P12, P13; retitled `F1a-<id> → PP-B (<stream> …)`, owner the new stream), each only if a capped run after 0a and after 0b shows it still fails for its stated reason, else it is parked too; parks 10 PP-B markers about behaviour the new page keeps (P1, P7, P8, P9, P11, B1, B2, B4, B6, S2: their reasons name seams 0a deletes or renames, `balanceChecks`, the Balance panel), restored by their PP-B stream from 648baf2 with a rewritten reason; parks the 11 PP-C markers (restored by their owner in PP-C); and deletes 11. **Delete first (owner, 2026-11-14):** the 3 PP-B markers whose subject is a deleted screen (P5 the "By role" groups and palette search, P6 the Structure chunk, P10 unit the cards by role with Main crops) are deleted instead of parked; their new form is a new test of the owning stream (PP-B23, PP-B24, the "Your plants" unit case, named in section 2). Totals: 28 kept or rewritten (7 moved, 21 parked), 11 deleted; the 21 parked, 7 moved and 11 deleted markers are listed in `scripts/plan/parked-markers.json` (plan recheck 3, 20).

| Marker (file under `scripts/`, line at 648baf2) | Was | Disposition | New owner |
|---|---|---|---|
| F1a-A1 toast focus (`browser/consortium-f1a-a11y.browser.test.mjs:31`) | a11y1 | keep | PP-B b2 |
| F1a-A2 status regions (`…a11y…:49`) | a11y1 | keep (toast and sheets' regions) | PP-B b2 |
| F1a-S1 wasm preload (`browser/consortium-f1a-perf.browser.test.mjs:22`) | perf1 | keep | PP-B b2 |
| F1a-S2 `ct:start`, `ct:first-view` (`…perf…:35`) | perf1 | parked, restored: first view = the palette page | PP-B b2 |
| F1a-P10 cards by role (`consortium-palette.test.mjs:32`) | pal1 | **delete** (subject is the deleted "By role" view and Main crops; owner "Delete first"); new form: b3's unit case "Your plants lists each plant once, warnings first" | — |
| F1a-P11 guest list loading (`…palette.test.mjs:52`) | pal2 | parked, rewritten on `holes()`: `pending` while a guest list loads | PP-B b2 |
| F1a-P12, P13 invasive tie (`…palette.test.mjs:71,78`) | pal1 | keep (`gain`, `suggest.ts:93`) | PP-B b1a |
| F1a-P1 Lyon first visit (`browser/consortium-f1a-palette.browser.test.mjs:43`) | pal2 | parked, rewritten: after "Start from a small suggested palette", Next step names one hole and opens Add preset to it through `store.openSheet('add', null, {job, cell})` (`Add.tsx` needs no owner); no hole a suggestion filled is the Next step (check amendment 7) | PP-B b2 |
| F1a-P2 return visit (`…:55`) | pal1 | keep: the palette page's placeholder, never the Place form | PP-B b2 |
| F1a-P3 Structure link (`…:72`) | pal1 | **delete** (no Structure view; `VIEW_KEY`, `:37`, goes with it) | — |
| F1a-P4 Seville pots (`…:96`) | pal1 | split: b1a keeps the pots answer and the Suggest height limit; the card height note (`[data-plant-id] [data-mark="room"]`, `:114`) moves to b3, rewritten on Your plants | PP-B b1a, b3 |
| F1a-P5 200-plant palette (`…:117`) | pal1 | **delete** (subject is the deleted "By role" groups and their palette search, a dropped filter); new form: b3's PP-B23 ("Your plants" folds to "+ N more", Remove takes a plant out); "pictures stay readable" is b2's 200-plant fold vector | — |
| F1a-P6 Structure chunk fails (`…:137`) | pal1 | **delete** (subject is the deleted Structure view and its chunk); new form: b2's PP-B24 (the `palette` chunk refused → Place stays usable, "could not load" with Reload, the next press fetches `?retry=n`) | — |
| F1a-P7 Suggest waits for the future chunk (`…:151`) | pal1 | parked, restored on the `verdict` chunk | PP-B b1b |
| F1a-P8 keyboard journey (`…:164`) | pal2 | parked, rewritten: header steps → Next step → Add → focus back on Next step; covers hole buttons and the `changeSummary` announcements | PP-B b2 |
| F1a-P9 status regions on Start and the views (`…:184`) | pal1 | parked, restored on Place (the palette page's regions are in A2) | PP-B b1a |
| F1a-P10 Balance chunk fails (`…:197`) | pal2 | **delete** (covered by rewritten P6) | — |
| F1a-C1, C2, C3 (`consortium-confidence.test.mjs:32,45,57`) | conf1 | parked; C1 rewrite: surfaces = fit line, Details, Find, print (methods anchor waits for F1b-2; `types.ts:413`); C2 maps verdict factors to terms | PP-C c2 |
| F1a-C4, C5, C6 (`browser/consortium-f1a-confidence.browser.test.mjs:26,40,48`) | conf2 | parked; C6 refuses the `verdict` chunk | PP-C c2 |
| F1a-F1 … F5 (`browser/consortium-f1a-filters.browser.test.mjs:32,37,43,53,60`) | add3 | parked; F1 opens Find from a hole with "Fits your place" on; F2 uses `holdsBy` (live from PP-B); F5 "range and holds filters" (native is P5.2) | PP-C c1 |
| F1a-B1 family spread (`consortium-balance.test.mjs:60`) | bal2 | parked, rewritten on `weigh.ts`: six of eight in one family is a line to weigh with its hint | PP-B b3 |
| F1a-B2 water mix (`…:70`) | bal2 | parked, rewritten on `weigh.ts`: 2 of 10 recorded is "not enough to judge" | PP-B b3 |
| F1a-B3 waiting checks (`…:79`) | bal2 | **delete** (roots, insects, active season, evergreen are not on the approved page) | — |
| F1a-B4 borrowed climate (`…:87`) | bal2 | parked, rewritten: every weigh line on a borrowed list carries the estimate term | PP-B b3 |
| F1a-B6 legume-heavy palette (`browser/consortium-f1a-balance.browser.test.mjs:40`) | bal2 | parked (its subject is the family-spread rule, which "things to weigh" keeps), rewritten as the one scenario of "things to weigh" | PP-B b3 |
| F1a-B5, B7, B8, B9, B10 (`…balance…:30,55,62,70,100`) | bal2 | **delete** (no Balance panel; the unit tests keep the rules) | — |

### 1b. Existing tests each push breaks (owner in the push's owners file)

| Push | Tests | Owner |
|---|---|---|
| PP-B commit 0a | the f1a spec files and `consortium-balance`, `consortium-palette`, `consortium-confidence` unit files (deleted after the marker moves, done); the 31 v4-literal cases of `consortium-core`, `consortium-memory`, `consortium-p5-seams-s5b` rewritten to link v5 (done, 362fe3f); `browser-tests.test.mjs` (`SPEC_FILES` `:26-36`, the minimum-2 regex `:45` gains `s2` and `s3`, the BT-coverage check `:75-78` and the s1…s4 naming check `:65-73` loosened, the F1a owner block `:284-298` → PP-B block); `consortium-css` (token rule), `consortium-keys` (unit policy); `built-modules.test.mjs` (`:16`, `:58-60`); `plan-owners.test.mjs` | main |
| PP-B commit 0a' (delete first) | **deleted** with the screens they test (owner, 2026-11-14): unit `consortium-core` matrix cases (`matrix:` ×5), the Main-crops ordering and the crops list of three in the `suggest:` cases, the matrix part of `recompute:` (the seeded-plant cases are **rewritten on `seed`, not deleted** (check coverage-2): shading under a seeded plant (`:148-151`), the seeded oak first despite removed, removed hazel never picked, the small room picks no misfit, a high conflict with a seeded walnut keeps Malus out (`:312-323`), a seeded guest counts and comes first (`:326-331`), and `consortium-p5-ranges` `:382` a seeded tall fig stays); `consortium-source` `cellCounts is the SQL oracle…` and the real-install cell counts; `consortium-tracks.test.mjs` **deleted with `tracks.ts`** (`tracksOf`, `rowPieces`, `cellOrder`, `runReasons`, `listGroups`, `stepStage` go), its side scale, `sidePlants`, `reachOf`, draw and `warningCounts` cases moved into a new `scripts/consortium-print.test.mjs` importing `side.ts`, `draw.ts` and `kit/phase.ts` (b2's in chunk 1, check coverage-5 and deletion-5); `consortium-list-query` the plant list's queries and filters (Add's stay until PP-C); `consortium-memory` the crops-to-three and `cropExamples` cases deleted, and two lasting cases **trimmed, not deleted** (check coverage-7): `:139` the share state (its kept, crops and stage fields out; the no-place privacy and guests assertions stay) and `:580` Undo of each snapshot field (kept, crops, stage out; 'only to or from Start' on the views that remain); `consortium-p5-seams` the host-views slot case (rewritten for the slots that remain); `consortium-p5-ranges` the matrix and "rows" parts of the two `room:` cases (the room rule stays); the kept, crops and view assertions left in item 1's v5 rewrites. Browser: `consortium-s2` whole (BT-2 matrix, BT-3 on-screen side view, BT-4 Jobs and list; main deletes the file with `browser-tests.test.mjs` and `shards.json`); in `consortium-s4` "matrix half", "share, views" (the kept pin), "print" ("At a glance") and the exit walk-through's keep step; in `consortium-seams-p2` X1/X2/X7 (cell Add, "Show them anyway"), X2 a job's "Find a …" (`:74`, opened from the Jobs tab; its "only the plants that do that job" assertion goes into b2's rewritten P1), H16 (Remove in All plants), R2-4 and T1 (crops under another card), W4 ×3 (matrix focus) and F4/F5 (after-the-matrix chunk, view loading); in `consortium-seams-layout` UX3, UX5, Item 7; in `consortium-seams-p5` UX4 (Jobs; `browser-tests.test.mjs` lowers the file's minimum to 1); in `consortium-e6` E6-1 (Start's crop search), E6-24 and E6-25 (views after the matrix); in `consortium-s3` the "Keep pins" step of BT-6 (`:141`) and the Keep press in BT-6 review (`:270`; built: a member removed through the test hook's store ends Undo instead, since a Remove press shows its own Undo). In `consortium-s4` the "BT-8 drawing" case moves (retitled PP-B18, its climate and Suggest presses inlined) into `consortium-pp-b2.browser.test.mjs` (b2's; b2 rewrites its "printed above the drawing" assertion for the year step in PP-B18, so b1a never edits a print case). Other specs still name removed things and are **their streams' to retarget, not 0a''s** (owners in this table): `consortium-s1` `cellCounts` in BT-1 and the matrix table (b2), `consortium-e6-r4` `store.crops` (b2), `consortium-p5-s5c` `store.matrix` rows and `view 'matrix'` (b1a; its `fitPool` cases stay valid), `consortium-p5-s5b` view checks (b1a), `p5-helpers.mjs` and `seams-helpers.mjs` matrix waits (b2). Kept: every lasting-layer unit test (link, storage, state, seams, place, climate, soil, location, keys, harness, vectors), and the browser cases of Place, the location step, sheets, Details, Share and print, which are retargeted when a stream rebuilds their entry point. `consortium-css` and `built-modules.test.mjs` lose the matrix stylesheet and role | main |
| PP-B commit 0b | `guides-consortium`, `built-links`; the specs and helpers that open `/consortium/` | main |
| PP-B b1a | `consortium-memory`, `-keys`, `-start`, `-p5-seams-s5b/-s5c/-s5e/-s5f` (unit); `consortium-s4`, `-p5-s5b/-s5c/-s5f` (browser); P5-27g and P5-27q (`consortium-p5-s5c.browser.test.mjs:502-525`, 320 px reflow and long words) replaced by PP-B19 for Place; P5-26f, P5-27a, P5-27b and P5-27l (the empty matrix's Suggest: the needs-location line, why nothing can be suggested, busy while a guest list is read) **retargeted** onto Place's "Start from a small suggested palette", not deleted; P5-14 and P5-14c (`fitPool`, matrix counts) left for b1b, which moves them to `countFits`; the `view 'matrix'` writes in `p5-s5b`/`p5-s5c` follow b2's `View` | b1a |
| PP-B b1b | owns in chunk 2 (check coverage-4) `scripts/browser/consortium-p5-s5c.browser.test.mjs` (the pool panel's cases, P5-14, P5-14c), `scripts/consortium-p5-seams-s5c.test.mjs` (the `suggest-block` case and the S5c strings case), `scripts/consortium-p5-seams.test.mjs` (the `PoolSlot` and `cardPill` assertions, `:54-55`) and `scripts/consortium-p5-ranges.test.mjs` (the `pool.count` and `empty.body` `{mean}` checks and the `pool.tsx` read, `:515-518`; the matrix parts of that file went in 0a'), each case deleted or rewritten against the Place count line; `consortium-core` `suggest:` and `alternatives:` cases when the gain moves onto `fills`; `store.ts`'s import of `suggest-block` (`:10`) goes through the coordinator (b3 owns `store.ts` in chunk 2) in the merge that deletes `suggest-block.ts` | b1b |
| PP-B b2 | `consortium-core` (chunk 1), `-css`, `-p5-seams`, `-p5-seams-s5d`, `consortium-print` (unit; `heightFrac` and `usualHeight` move to `rules/heights.ts` with its imports); `consortium-s1`, `-p5-s5d`, `-seams-p2/-p5/-layout`, `-e6`, `-e6-r4`, `-commit0`, `-s3`, BT-8 drawing in `consortium-pp-b2` (browser: kept cases retargeted onto the palette page's entry points); `helpers.mjs`, `p5-helpers.mjs`, `seams-helpers.mjs`; P5-27g and P5-27q replaced by PP-B22 for the palette page | b2 |
| PP-B b3 | none beyond its own `pp-b3` files (the matrix, tracks, source and p5-ranges cases went in 0a'); b3 creates `consortium-pp-b3.browser.test.mjs` (B6 restored) and registers it in `browser-tests.test.mjs` `SPEC_FILES` and every `shards.json` list, both its in chunk 2 (check coverage-6) | b3 |
| PP-B exit | `smoke/axe.smoke.mjs:33`, `scripts/quality/baselines/axe.json` (merge agent); emptied spec files deleted with `browser-tests.test.mjs` and `shards.json` | main |
| PP-C | `consortium-list-query`, `-p5-ranges`, the mark tests, `consortium-paste` | c1, c2 |
| PP-D | later and print tests, `consortium-canopi-file` | d2 |
| PP-E | future panel tests | e2 |

A stream never deletes a whole spec file: it empties it of its cases; main deletes emptied spec files at the chunk-3 exit, with `browser-tests.test.mjs` and `shards.json` in the same commit. The one exception is commit 0a', where main deletes `consortium-s2` (every case is about a deleted screen) with those two files.

## 2. PP-B: one palette page, `/palette/` and the honest states

**Outcome for the grower.** The tool is "Plant palette" at `/palette/`; old addresses redirect. A grower names a place first, starts from their own plants (a small suggested palette is one link away) and sees one page: the next hole to fill with plants that fill it, the palette through the years by light level, the jobs covered, and their plants with full-grown size and warnings first. The page says what is happening: still loading, offline, a link it cannot read or from another version, an Undo after Start over, toasts that wait while read, "Open my saved palette instead". The matrix, the four tabs, Kept and Main crops are gone. Links are v5; v4 links and saves get the "older version" line (owner, 2026-11-14).

**Boards:** `Place`, `PlaceDesk`, `LocSearch`, `LocMap`, `LocStates`, `Country`, `ChangePlace` (room and location parts), `LocDesk`, `SiteKiambu` (without soil and later periods), `Empty`, `Arrivals`, `Main`, `MainMore` (without Through the year), `Palette`, `PaletteMore`, `HoleOpen`, `FillHole` (rows as today's Add rows), `Loading`, `Toasts`, `Focus`, `DeskStates`, `Share` (the "Include my place" wording), `DarkMain`, `DarkPalette`, `DarkMap`, `Balcony`, `German`, `ClimateHand`; `Recife` compared for the page shape.
**Inventory rows:** A1, A2, A4, A5, A6, B1–B9, C1–C3 (kept as today's questions until PP-F, owner 2026-11-14), C4, C5, C6 (drop), C7, D1–D13, E1–E14, E17, E18, E20, F5 (toxicity colours), H1 (hole instead of cell), J1, J2, K3 (share wording), K4, K7, L1, L2, L4, L5, N2, N4, P1, P2, P3, P6, P12, P17, P37, P39 (family, water), P42, P43 (without "Select several" / "One by one", PP-C c1).

**Commit 0 (main agent; owners file `scripts/plan/pp-b-owners.json` chunk 0, which lists every file): 0a seams (built), 0a' the deletion, 0b the move, in that order.**
- **0a seams (built 2026-11-14, 50be21a to 362fe3f; the temporary matrix `lazyPart` and role it added are undone by 0a'):** types of architecture 3.1–3.3 (with `Line`, `VerdictContext.canopy`, `LinkNotice.period`); `place.ts` with real bodies for `emptyPlace`, `siteFor` (today's light, soil and water answers passed to `fits()`) and a minimal `resolveSoil` (basis `'none'` for the map, `'pots'` for pots), and `climateFor` passing the slot through (the arch-rules grep line that only `place.ts` reads `lookup.periods`, `warn`); empty-bodied `verdict.ts`, `verdict-load.ts` (exported from `index.ts`; b2 writes the body), `verdict-line.ts` with the `fitLine`, `holeLine`, `yearsLine` signatures, `years.ts` (with `phaseOrd` and `spanOf` moved in, `views/kit/span.ts` deleted and `views/kit/sheet.tsx` repointed, `yearsOf` = first to last stage present), `holes.ts` (with `HOLE_ORDER`), `weigh.ts`; `PlantSource.layerValues` with a stub; `SitePeriod` gains `precipMm`, `dryMonths`; `pots` in `rooms`; the whole link v5 codec under the extension rule (architecture 8.1: unknown keys ignored, per-key fallback, `u=` reserved, reserved letters, `y` = `PeriodId` span string), `encodePlace` (`k` from `store.country`, `o` from `store.location`) and `linkVersionStatus` (classifies `v` only, `null` = `absent`, older = v1–v4) with `scripts/vectors/link-v5.json` in the shared envelope (reviewed by the coordinator before any stream starts) and its consumers in `persist.ts` (`:99-118`) and `restore.ts` (`:131-143`); state fields and the place rule; `site` derived; `kept`, `crops`, `stage` deprecated; the save record `{ fragment, place, at, src, country? }`, `canopi-place` as the seed of a new palette, `history.state.pl`; `applyPreset` adds the guide plant; store seams (`verdictContext` with `canopy`, `verdictRule`, `memberVerdicts`, `poolVerdicts`, `countFits`, an empty `offline`), `withRule` waits on `verdict`; `views/place/Place.tsx` re-exporting Start; the matrix behind `lazyPart` (role `structure` renamed `matrix`, 12 KB); `views/tracks.ts` helpers to `views/kit/phase.ts` and `names.ts`; the Balance seams deleted; roles `palette`, `verdict` (12 KB); L10 as `warn` with `index.ts` allowed for named re-exports (`index` in `pathNot`, an arch-rules fixture), keys written by `ratchet.mjs arch --write`; the colour token block in `src/styles/tokens.css` (architecture 3.5) with `consortium-css.test.mjs`'s new rule; `format.ts` unit formatters and `parsePlotSize` with the unit-after-placeholder policy in `consortium-keys.test.mjs`; the harness's `database: 'hold'` with `page.releaseHeld()` (and `timeouts.slow` if needed); `range_verdicts.json` read from the installed release (stamped copy with a release-id test until the installer change lands); empty page-level stylesheets; the marker moves and parking of section 1 with `scripts/plan/parked-markers.json`.
- **0a' delete first (owner, 2026-11-14, row "Delete first"; one commit, or a few if review needs it, before 0b):** the old screens go with their tests (section 1b) and their keys; the shell, the place step, the sheets, Details, Share, print and the lasting layer stay with their tests. Exports left without a reader are deleted in the same commit so `check:dead` holds; a later stream re-adds what it needs.
  - **Files deleted (11):** `views/Matrix.tsx`, `PhoneMatrix.tsx`, `matrix-parts.tsx`, `tracks.ts`, `Jobs.tsx`, `PlantList.tsx`, `StageStepper.tsx` (its readers are Matrix, PhoneMatrix and the on-screen side view only); `src/styles/consortium/matrix.css` and the empty F1a `palette.css`; `scripts/consortium-tracks.test.mjs` (its kept cases move to `scripts/consortium-print.test.mjs`, section 1b); `scripts/browser/consortium-s2.browser.test.mjs`.
  - **CSS moved before matrix.css goes (check deletion-4, measured on the classes kept code uses):** to `shell.css`: `.ct-dim`, `.ct-icon` (every glyph of `kit/icons.tsx`), `.ct-link-button` (with its phone 40 px rule), `.ct-sc`, the unscoped `.ct-flag` and `.ct-tag` (as `:where(.ct) .ct-flag` and `:where(.ct) .ct-tag`: `details.css` loads before `shell.css`, so a moved rule of equal weight would override the sheets' own) and the mark-surface rules (the `:where(.ct-views)` ones match nothing once the tabs go); built: `.ct-key svg`, `.ct-stagebar`, `.ct-explain*` and `.ct-pop*` were dropped, not moved, since no kept code writes them; to `print.css`, outside `@media print`: the side drawing `SideDrawing` draws, `.ct-sv-figure`, `.ct-sv-plot` (`is-marks`), `.ct-sv-scale`, `.ct-sv-svg`, `.ct-sv-line`, `.ct-sv-mark` (`is-dashed`), `.ct-sv-nums`, `.ct-sv-note`, `.ct-sv-key`, `.ct-sv-n`, `.ct-sv-sw`, every `[data-stratum]` fill, stroke and swatch rule and the phone plot rules. Deleted with the screens: `.ct-sv`, `.ct-sv-term`, `.ct-sv-layer`, `.ct-sv-phases`, `.ct-sv-stepper`, `.ct-stchip`, `.ct-chip-term`, `.ct-tag-crop`, `.ct-stagestrip` and every matrix, phone grid, stepper, Jobs and list rule (`.ct-nw`, `.ct-row`, `.ct-quiet`, `.ct-btn-sm` have no reader left). A new case in `consortium-css.test.mjs` collects every `ct-*` class literal in `src/islands/consortium/**` and asserts each is defined in a sheet under `src/styles/`, except a listed set of hook-only names (ids, JS hooks, prefixes built at run time).
  - **Trimmed:** `App.tsx` (the matrix `lazyPart` and the keep-alive imports the build no longer needs out; `Actions` mounted statically again, so it rejoins the first run until b2 hosts it under the palette page; the keep-alive imports that check-built-site's K3 rule still needs stay, decided by one build); `views/later.ts` (the `SideView`, `Jobs` and `PlantList` re-exports out); `views/Actions.tsx` (the view-tab reads out; it takes `FirstPaint`, the `ct:first-view` mark and `prefetchLater()` the timing script and the later prefetch wait for, from Matrix.tsx, until b2 marks the palette page); `views/SideView.tsx` keeps only `SideDrawing` (print), the on-screen side view and its stage chips go (inventory drop "on-screen side view (print only)"); `views/StageBar.tsx` loses `StageStrip`, `cellName`, `plantLabel`, `openSwap` (its only reader was PlantList; Details opens Swap through `openSheet`) and the kept and main-crop marks (`Marks`, `warnings`, `openDetails`, `jobFind`, `byName` stay for Add, Details, the future panel and print until PP-C and PP-E; built: `StageBar`, `Explain` and `openAdd` had no reader left and went too, and `warnings` is module-private); `views/kit/phase.ts` loses `stepStage` and whatever else check:dead flags; **`warningCounts` stays** (StageBar's `warnings` and `Marks` read it, and `SideDrawing` draws `Marks` for print; check deletion-5); `views/kit/icons.tsx` loses `ChevronIcon`, `PinIcon`, `SproutIcon` and `PIN` once nothing reads them, and `views/PoolSlot.tsx` loses `WhyNoSuggest` (its only reader was matrix-parts; b1b re-adds from git what Place needs), both files main's in chunk 0 (check deletion-6); `views/PrintSheet.tsx` loses "At a glance" (it read `matrix`) and the kept and main-crop labels, keeps the plant table and the side drawing for ≤ 20 plants, drawn at the store's `stage` until b2 points it at the year step chosen in Through the years (PP-B18); `views/details/Details.tsx` loses the Keep button and the crop branch (`details.cropNoSwap`); `views/Start.tsx` loses the Main crops picker (the `.crops.*` keys go); core `matrix.ts` keeps only `cellsOf` and `cellKey` (Suggest's gain until b1b and Swap's "Also fills" until c2; `buildMatrix`, `plantsIn`, `startCell`, the Matrix types go), `source.ts` and `data/sqlite-source.ts` lose `cellCounts`, **`suggest.ts` turns `kept` and `crops` into one `seed` option** (the current members: always members, flagged or not, the seed wins over `removed`; guests are members only when seeded; seeded plants first in tie order, then seeded guests; only the Main-crops-first loop goes), so Suggest builds around every plant already there (inventory C6, drop 5; check coverage-2), `types.ts` loses the Matrix types and the core `views` list, `state.ts` loses the deprecated `kept`, `crops` and `stage` share fields (the codec already writes none and ignores `p`, `n`, `t`); `store.ts` narrows `View` to `'start' | 'matrix'` (**`'matrix'` now names the empty palette slot**: `suggest-wait.ts:68`, `draft.ts`, `restore.ts` and `store.ts:540` keep writing it, so 0a' edits no b1a file (check deletion-2, option (a)); b2 replaces the type with `'place' | 'palette' | 'plan'` in chunk 1 and the b1a-owned writers switch in the same chunk through the coordinator), loses `matrix`, `toggleKeep`, `kept`, `crops`, their keep logic and `marksFailed` (its only reader was Matrix.tsx's notices); **`fitPool` stays** (the range-filtered pool Add and Swap read until PP-C rebuilds them on verdicts; check deletion-1); `suggestMembers` seeds from `members`; `missingMembers` stays (b2 shows its L2 lines on the palette page, PP-B21); `stage` stays an unsaved signal for print until PP-B18; `state/schema.ts`, `restore.ts` (a guide's crop role adds a member), `persist.ts`, `draft.ts` follow; `rules/list-query.ts` loses the plant list's query; `ConsortiumPage.astro` drops the two stylesheets; `scripts/built-modules.mjs`, `check-built-site.mjs` and `built-modules.test.mjs` drop the `matrix` role; the 11 locale files drop the keys only deleted code read, found by `consortium-keys.test.mjs` "no consortium key is left unused (H9)" run on the trimmed tree: the 62 `consortium.matrix.*` (the view tabs included; a key a kept view or print still reads stays), 16 `.list.*` (the 7 climate names `list.*` stay), `.side.layer` (the other `.side.*` keys `SideDrawing` reads stay), the 5 `.job.title`, `.job.covered`, `.job.missing`, `.job.every`, `.job.never` (built: Jobs' own, missed by H9 behind a template), 8 `.crops.*`, `.keptTag`, `.mainCrop`, and (check deletion-3) `consortium.job.*.about`, `.job.*.gap`, `.job.col.*`, `.phase.group.*`, `.phase.earlier`, `.phase.later`, `.phase.stepOf`, `.phase.stage`, `.print.glance`, `.print.kept`, `.print.mainCrop`, `.details.keep`, `.details.cropNoSwap`: 121 keys in each of the 11 files (built). `consortium.marks.unavailable` **stays**: `store.ts`'s chunk toast still says it (listed in INDIRECT in `consortium-keys.test.mjs`); the persistent line with Reload (inventory L3) goes with Matrix.tsx and PP-C c2 restores it from git with `marksFailed` (check deletion-7). The E6 and E4 wordings b2 reuses go with the matrix keys; b2 writes new `consortium.line.*` keys and copies the wording and 11 translations from git (EN at 1311317: `matrix.more` "+ {n} more", `matrix.gap` "A data gap, not your site", `matrix.misfit` "No plant fits your site here", `matrix.gapBody` as in `en.json`; check deletion-9).
  - **Not deleted, though old:** `views/Add.tsx`, `Paste.tsx`, `paste.ts`, `Swap.tsx`, `Sheets.tsx`, `kit/sheet.tsx` (rewritten in PP-C), `views/future/**` and `FutureSlot.tsx` (PP-E), `PoolSlot.tsx`, `views/pool/**` and `rules/suggest-block.ts` (b1b folds the count into Place), `views/details/**` (the new page opens Details), `Share.tsx`, `PrintSheet.tsx`, `side.ts`, `draw.ts` (print is kept: board `Print`, BT-8, d2 in PP-D), `PlantMarks.tsx`, `layers.ts`, `Correction.tsx`.
  - **Probe:** one `npm run build` and `node scripts/check-built-site.mjs` after 0a' measure the first run and every role; the `later` part is expected back under its 8 KB cap with `tracks.ts` gone, so no raise is recorded unless the measure says otherwise (budget rule).
  - **Built (0a', measured 2026-11-14):** first run 33.2 KB of 38 KB (`Actions` back in it); later 5.3/8.0 KB, details 6.3/6.7, sheets 5.7/6.3, location 11.2/11.8, future 2.2/2.8, suggest 1.8/8.0, verdict 0.2/12, palette none; no cap raised. `App.tsx` keeps the two keep-alive imports (`PlantMarks.tsx`, `StageBar.tsx`): without them the future part costs 3.1 KB of its 2.8 KB cap (one build). `kit/sheet.tsx` `shared` (now `Object.freeze`d) also holds `data/search.ts` (`searchIndex`, `fold`), which Start's crop search had kept in the first run: without it Add's chunk imports a `fold` chunk off the first run (K3). Browser after 0a': `consortium-pp-b2` (the four markers, PP-B18) and `-pp-b1` pass; `consortium-s3` (every case waits for the "Layers × stages" tab) and the `consortium-s4` exit walk-through wait for b2's palette page (risk accepted below); `consortium-s4` BT-7 and `consortium-p5-s5b` P5-1c still expect `#v=4` links (b1a's).
  - **Chunk-1 merge (b1a then b2, measured 2026-11-14):** the island's first run is 39.5 KB of the 38 KB budget (`check-built-site.mjs` fails). Each stream alone stayed under it (b1a merged 36.0 KB, b2 alone 36.7 KB, from 33.2 KB after 0a'): b1a's Place (`views/place/Place.tsx` and the `state/` modules it imports statically) and b2's shell (`store.ts`, `main.ts`, `App.tsx`, `views/lazy.tsx`, `focus.ts`) add up; no lazy chunk shrank, so nothing moved into the first run by mistake. Whether to raise the budget or move part of Place off the first run is a coordinator row.
  - **Gates after 0a':** `npm run check`, `npm test` (with the `ct-*` class coverage case), `check:arch`, `check:dead`, `check:dup`; a `grep -rn` for each deleted name (`buildMatrix`, `plantsIn`, `startCell`, `cellCounts`, `toggleKeep`, `PhoneMatrix`, `StageStepper`, `PlantList`, `tracks.ts`, `keptTag`, `mainCrop`) finds none in `src/` and in main's chunk-0 files; the stream-owned specs that still name them (section 1b: `consortium-s1`, `-e6-r4`, `-p5-s5b`, `-p5-s5c`, the helpers) are exempt, each named in its stream's row (check deletion-8); `plan-owners.test.mjs` asserts no `src/` file reads a removed store export (`matrix`, `toggleKeep`, `kept`, `crops`, `marksFailed`).
- **0b the move (built 2026-11-14, 6ff4f19 and 34e0d6e; 301 redirects kept the query and the fragment on wrangler dev, so no stub pages; the probe and the production `curl` check are in the runbook [CI and deploy gate](/runbooks/ci-and-deploy-gate.md); names: en Plant palette, fr Palette végétale, es Paleta vegetal, pt Paleta de plantas, it Palette vegetale, de Pflanzenpalette, nl Plantenpalet, ru Палитра растений, zh 植物搭配, ja 植栽パレット, ko 식물 팔레트, header word Palette/Paleta/Palet/Палитра/팔레트 or the whole name):** architecture 8.4, including the wrangler-dev probe and its stub-page fallback (stubs at `/consortium/` and `/<lang>/consortium/`, each pointing to `consortiumPath(lang)`; 302 considered until the production `curl` check passes), the 22 redirect lines, the page-head link check (`ConsortiumPage.astro:117`), the rename words in 11 locales, `privacy.tool.device` as owner-approved (below), and the harness, helpers, specs and checks that name the old path.
- Commit-0 unit tests (in `scripts/consortium-link-v5.test.mjs`, plus `place.ts`'s `emptyPlace` and `siteFor` cases): `linkVersionStatus` table (incl. `null` → `absent`); `arrival()` with a v4 record gives the older line once and removes the save, with a v6 record keeps it; `readRecord` and `oldRecord` with v4, v5, v6 fragments, a fragment with no `v` and a save with no `v`; unreadable vectors (not a whole `v`; `e=1` with a malformed non-empty `a`; not for an empty `a`, unknown tokens or a cut); unknown key ignored (`…&e=1&zz=3`); per-key fallback (`m=huge` → `unsure`, `s=own.65.loam.ec2` → own, 6.5, loam); period vectors (`y=2041-2070`, `y=2071-2099` round-trip; `y=2011-2040`, `y=2055`, `y=1`, `y=` → today with the period notice; absent → today, no notice); `u=` with an unknown key → the newer line with plants restored; `k` gating (chosen + unticked → none; location + ticked → `k`; guess + ticked → none); spot grammar (`h=higher.650`, `w=irrigated`); a link whose answers are all `unsure` brings no place; `m` and `z` alone bring no place; `k` alone brings no place and keeps the reader's country.

| Stream | Owns (summary; exact rows in the owners file) | Tests first |
|---|---|---|
| **b1a Your place, arriving and sharing** (chunk 1) | `views/place/**` (Start moved in and deleted there), `views/location/**`, `LocationSlot`, `Share.tsx`, `state/{draft,arrival,restore,persist,location,lookups,suggest-wait}.ts`, core `place.ts`, `suggest.ts` (its `seed` option from 0a'), `place.css`; prefix `consortium.place.`, edits `consortium.start.*`, `.share.*`, `.location.*`, `.country.*`, `.site.*`, `.room.*`, `.block.*`, `.region.*`, `privacy.location.link` (the Main crops picker and its `.crops.*` keys went in 0a') | Unit: `siteFor`, `emptyPlace` (0a's bodies, extended); P12, P13; `arrival()` with the v5 record `{ fragment, place, at, src, country? }`, `pl` and `canopi-place` as seed only; `startOver` then one Undo restores members, removed, guests and keeps `place`; a preset gives `members == [id]` and no save; link-place notice (a) a palette edit keeps `l=sun`, (b) "Use it" gives `l=shade` in the palette's `place` and the link's cell in `canopi-location` after reload, (c) "Use my own place" restores the reader's; Forget clears `canopi-location`, `canopi-place` and `place`. Browser: P4 (pots answer, Suggest height limit), P9 (restored); PP-B2 no location: climate cards, then own plants; PP-B3 "Start from a small suggested palette" and one Undo removes them all; PP-B4 a v4 save → the older line once, the tool empty; PP-B5 three reloads (before any plant, after Start over, with plants) keep room and spot answers while the address holds none of `k o l w q r h s`, and a "shade" answer moves a sun-only plant to "needs a second look" and stays after reload; PP-B10 share with "Include my place" off: the link holds none of `k o l w q r h s`; on: it holds them and the sheet says so in words; PP-B11 Start over → toast with Undo → palette back; PP-B12 guide preset with a saved palette → "Open my saved palette instead" restores it; PP-B13 `v=6` and unreadable links each show their line and an empty tool, save untouched; PP-B14 a guide link `?plant=…&climate=…` opens on `/palette/` with the plant as a member; PP-B19 Place at 320 px in en, de, ru and ja: nothing scrolls sideways, no control or plant name passes the right edge |
| **b2 The palette page and its shell** (chunk 1) | `store.ts`, `App.tsx`, `main.ts`, `focus.ts`, `data/load.ts`, `astro.config.mjs` (wasm preload), `Toast.tsx`, `Actions.tsx`, `FutureSlot.tsx` (hosted until PP-E), `views/Sheets.tsx` and `views/kit/sheet.tsx` (live regions only), `views/kit/start-mark.ts`, `views/lazy.tsx` (offline `LoadFailed`), `views/palette/{Palette,NextStep,Years,JobsPicture,Placeholder}.tsx`, `views/kit/{chart,fit}.tsx`, `rules/picture.ts`, `rules/change-summary.ts`, `rules/picture-{years,jobs}.ts`, core `verdict.ts`, `verdict-load.ts`, `verdict-line.ts`, `years.ts`, `holes.ts`, `jobs.ts`, `palette-page.css`, `shell.css`, `scripts/vectors/{verdicts,holes}.json`, `scripts/picture-table.mjs`; print's side drawing at the chosen year step (`PrintSheet.tsx`, `SideView.tsx`, `side.ts`, `draw.ts`, `print.css`, `rules/heights.ts` with `heightFrac` and `usualHeight` from `side.ts`; moved here from b3, which now builds only Your plants); prefix `consortium.palette.`, edits `consortium.job.*`, `.load.*`, `.loadingTool`, `.undo`, `.dismiss`, `.jobsHeading`, `.side.*`, `.print.*`, and the shared `consortium.line.*` | Unit: DATA-1's `range_verdicts.json` run from the installed release (or the stamped copy with its release-id test), never copied; `verdicts.json` (website cases only): shade relief (a sun spot with a taller member → no light factor; no taller member → `look`; a `'part'` spot keeps the factor); Kiambu 324 of 515 through `countFits` as a real-data test; `judgedPeriod`; `holdsBy` (inside in 2041–2070; loses heat; no location → false; short-lived plant on today); `holes.json`: a job missing in years 3–15 is one hole, a 0–1 and a 0.25–1 gap are `not-judged`, nothing after 60, each neighbouring `HOLE_ORDER` pair, ids with a month suffix kept apart, P11 `pending` (restored); `fillers` groups (in-range invasive → look, mild toxic → look, invasive outside → outside) and ranking (holes filled, `holdsBy`, name); `fitLine`, `holeLine`, `yearsLine` with counts; picture models: rows per light level, bands in year fractions, the table form has the same cells (P17, through `scripts/picture-table.mjs`), the 200-plant fold vector; `changeSummary` vectors. Browser: A1, A2, S1, P2 (moved); S2, P1, P8 (restored, rewritten); PP-B6 Lyon, own plants: three plants pasted, Next step names the first hole in words and years, filling it changes the next hole; PP-B7 phone 390 px: Through the years one time step at a time; PP-B8 "Show as a table" gives each picture's content to a screen reader; PP-B15 slow database (`database: 'hold'`) → "Still loading", then the tool (15 s without a byte: the failure screen, as today); PP-B16 offline → the line shows, added plants stay, a lazy chunk says "Needs a connection" and retries when back online; PP-B17 a toast stays while focused, then focus returns to the control that raised it; PP-B20 the `verdict` chunk refused: fit lines "not checked", never "fits", holes say they were computed without verdicts, Reload works; PP-B21 a guest list fails: the list is named as missing, its plants "not checked"; PP-B22 the palette page, header steps, pictures, tables and sheets at 320 px in en, de, ru and ja; PP-B24 the `palette` chunk refused: Place stays usable, "could not load" with Reload, the next press fetches `?retry=n` (new form of the deleted P6); PP-B18 print draws the side view at the year step chosen in Through the years (from b3); the kept cases of `consortium-s3` and the seams specs retargeted onto the palette page's entry points |
| **b1b The pool count into Place, and the suggestion on holes** (chunk 2, after b2 merges) | `views/place/**`, `views/pool/**`, `PoolSlot`, `rules/suggest-block.ts`, core `site-today.ts`, core `suggest.ts` (gain on open holes filled through `holes.ts` `fills`, moved here from b3), the `pp-b1` test files; not `store.ts`; prefix `consortium.place.`, edits `consortium.start.*`, `.range.pool.*`, `.range.empty.*`, `.range.needsSite*`, `.range.unavailable*`, `.block.*` | Probe first: `countFits` equals the pool panel's count for Kiambu before the panel goes. Unit: `suggest` gain counts open holes filled (replaces the cell terms; `matrix.ts`'s `cellKey` stays for Swap until c2). Browser: PP-B1 Kiambu: search, confirm the climate, the line "{n} of the {m} plants on the nearest lists fit your place today" through `countFits` (figures from b2's real-data test); P7 (restored, on the `verdict` chunk) |
| **b3 Your plants** (chunk 2, after b2 merges; only "Your plants" and "Things to weigh": the deletions it held went to 0a', print to b2, the suggestion's gain to b1b) | `views/palette/{YourPlants,Weigh}.tsx`, `views/palette/Palette.tsx` (mounts them), core `weigh.ts`, `conflicts.ts` (Slight toxicity raised with its level), `views/kit/flags.ts` (level → token), `details/Details.tsx` (the `:156` toxicity sentence out), `store.ts` (chunk 2, the signals Your plants reads), `plants.css`, `scripts/vectors/weigh.json`, its `pp-b3` test files; prefix `consortium.plants.`, edits `consortium.tox.*`, `.withWarning`, `.misfit.*` | Unit: B1, B2, B4 (restored, rewritten on `weigh.ts`); "Your plants lists each plant once, warnings first" (new form of the deleted P10); size line (width and height through `formatLength`, "No size recorded" when NULL); toxicity mapping (Slight → warning token, "Mildly toxic" and icon; Moderate, Severe → danger token). Browser: B6 (restored), P4's card height note on Your plants; PP-B9 a Slight-toxic, a Moderate-toxic and an invasive plant are listed first, each with words and icon, removed only by the grower; PP-B23 "Your plants" folds to "+ N more" at 200 plants and Remove takes a plant out (new form of the deleted P5) |

**Probes (first commit of each):** commit 0 measures the first run after 0a (done: 35.5 KB of 38 KB with the matrix behind `lazyPart`) and again after 0a' with the old screens gone and `Actions` back in the first run, and reports it (a raise follows the budget rule), and runs each of the 7 moved markers once after 0a and after 0b; 0b the redirect probe on wrangler dev. b2: with the empty palette page behind `lazyPart`, the time from "database open" to "first hole shown" for a 200-plant palette on the CI runner, target under 150 ms for `verdicts` + `holes` (unverified); and, before building sheets, the `history.state.sheet` choice recorded (architecture 8.3). b1b: `countFits` returns the same count as the pool panel for Kiambu before the panel goes.
**Budgets:** `palette` ≤ 12 KB, `verdict` ≤ 12 KB (then measured + 0.5 KB at the exit; `range` and `markProviders` fold in only in PP-C); the temporary `matrix` role of 0a is deleted in 0a' (no role holds old screens); first run re-measured after 0a', raised by a recorded row if the shell states do not fit 38 KB; `later` stays at 8 KB (the 0.7 KB over after 0a came from the shared `tracks.ts` chunk, which 0a' deletes; a raise only if the 0a' measure still exceeds it); the chunks prefetched at idle (`find`, `details`, `take`) each a line with its cost in the budget log; at the exit every cap is set to measured + 0.5 KB.
**Risks:** between 0a' and the merge of b2 the branch has no palette view: a grower path past Place cannot be walked, so browser specs of those paths wait (accepted by the owner: nothing ships until the whole push passes); the lasting-layer tests, the type check and the ratchets are what keep each commit honest. `store.ts` is touched by every feature: b2 owns it in chunk 1 (b1a asks through the coordinator), b3 in chunk 2 (b1b asks through the coordinator). The v5 vectors are public contract: coordinator review before streams start. Three streams on one page: page CSS is b2's, each part's CSS is its stream's, colours only from the token block. A tab still on old code reads a v5 link as "older version" (accepted; "tool updated, Reload" exists, `App.tsx:28-36`). Search engines see a moved page: canonical, hreflang and sitemap move with `consortiumPath`. Removing a v4 save is data loss the owner accepted (answers of 2026-11-14); a v5 save is never removed by a later version without a new owner answer. A moved marker that fails for another reason after 0a or 0b is parked, never weakened.
**Deletes:** in commit 0: the F1a Balance and Structure seams (0a); the old screens (0a': matrix views and CSS, view tabs, Jobs, PlantList, the stepper, the on-screen side view, "At a glance"; `matrix.ts` down to `cellsOf` and `cellKey`, which c2 deletes with Swap's cell words; `cellCounts`; Kept and Main crops: state, UI, keys, link keys `p`, `n`, `t`, the `*` mark (Suggest's `kept` becomes the members `seed`); the `matrix` role; `store.ts` `matrix`, `toggleKeep`, `marksFailed` and the view tabs' values of `View` (`fitPool` stays for Add and Swap until PP-C)); `/consortium/` pages (0b). In the streams: `jobGapsByPhase` moved into `holes.ts` (b2); the store's `stage` once print reads the year step (b2); the `pool` role (b1b, at the merge).

**Privacy text shipped in PP-B** (owner-approved 2026-11-14, row "Plant palette plan check answers"; EN and FR exact, the 9 other locales translated in the build):
- `privacy.tool.device` (commit 0b, main's `privacy.tool.*` edits) EN: "The tool runs in your browser. It downloads the plant list, the climate files and the soil files from projectcanopi.com, and keeps your palette (with your height limit, plot size and spot answers), your country, your location and your site's climate on this device, in the browser's local storage. Your last spot answers are also kept to start your next palette. None of it is sent to Canopi. 'Forget this location' clears your location and your spot answers."
- `privacy.tool.device` FR: "L'outil tourne dans votre navigateur. Il télécharge la liste des plantes, les fichiers de climat et de sol depuis projectcanopi.com, et garde sur cet appareil, dans le stockage local du navigateur, votre palette (avec la hauteur disponible, la surface plantée et vos réponses sur votre coin), votre pays, votre lieu et le climat de votre terrain. Vos dernières réponses sur votre coin sont aussi gardées pour commencer votre prochaine palette. Rien de tout cela n'est envoyé à Canopi. « Oublier ce lieu » efface votre lieu et vos réponses sur votre coin."
- `privacy.location.link` (b1a, replaced; corrects the text approved earlier the same day) EN: "A share link includes your place only if you tick 'Include my place', and then only as the centre of its climate-grid square (about 11 km north to south, narrower toward the poles), its country, your spot answers and your soil test."
- `privacy.location.link` FR: "Un lien de partage ne contient votre lieu que si vous cochez « Inclure mon lieu », et seulement sous la forme du centre de sa maille de climat (environ 11 km du nord au sud, plus étroite vers les pôles), de son pays, de vos réponses sur votre coin et de votre analyse de sol."

## 3. PP-C: find a plant, know a plant

**Outcome.** One search finds plants by name in any of the 11 languages, by scientific name or by a job word, grouped by how they fit the place; filters each say the decision they serve; Details opens on "Against your place"; Swap says what is gained and lost.
**Boards:** `Find`, `FindResults`, `FindType`, `FindJob`, `FindNone`, `FindFilters`, `Paste`, `FindMulti`, `FindDesk`, `FillHole`, `AddAnyway`, `Details`, `DetailsMore`, `DetailsDesk`, `Swap`, `Correction`, `DarkFind`, `DarkDetails`.
**Inventory rows:** C8, E5, E15, E16, E19, F1–F18, F20, F21, G1, G2, H1–H7, I1, L3, P14 (today's period), P16, P33, P34 (with "Holds by" from PP-B), P38, P40.
**Commit 0:** `AddPreset` without `cell` (`types.ts:490-495`); `SheetKind` (`store.ts:26`) renamed for Find; role `find` replaces `sheets`; `src/lib/consortium/confidence.ts` key table (empty map); the 11 parked markers stay parked until each stream's first commit (and `scripts/plan/parked-markers.json` is checked); the store's mark lines handed to c2; **the schema-4 reader** (`scripts/install-consortium.mjs:89,:236`, `types.ts:11,:269`, `data/load.ts:158`) when canopi-data's single schema-4 bump (DATA-14) has landed, else a small step before PP-C (owner named now: PP-C commit 0). Schema 4 as canopi-data narrowed it (2026-11-14): the vernacular synonyms, DATA-11's second value, `plant_aliases` (DATA-12) and the `schema_additions` manifest list (DATA-13), plus a "Sources disagree" safety display column (the more cautious of the queued values); the placement-audit flag comes later as an additive column under DATA-13, so the reader accepts it when declared.

| Stream | Owns | Tests first |
|---|---|---|
| **c1 Find** | `views/find/Find*.tsx`, `views/find/Filters*.tsx`, `views/find/paste.ts` (from `views/Add.tsx`, `views/paste.ts`, `views/Paste.tsx`), `rules/find-query.ts` (replaces `rules/list-query.ts`), `data/search.ts`, `views/Sheets.tsx`, `views/kit/sheet.tsx`, `StageBar`'s Add helpers; prefix `consortium.find.` | Unit: `find-query` groups fits / needs a second look (level `look` or a toxic or invasive warning) / outside its range / not checked; a job word in each of 11 locales finds its job; every filter returns the count it could not judge; search over every locale's names through `searchIndex`, plus the vernacular synonyms of canopi-data D2b's schema-4 table once installed (DATA-2); until then c1 searches primary names only. Browser: F1–F5 (restored); PP-C1 a French name on the English page finds the plant; PP-C2 no result → close spellings, the other lists, "Ask us to add it"; PP-C3 "Select several" adds three plants with one toast and one Undo; PP-C4 an invasive plant is added with one tap and its warning, a plant outside its range asks "Add it anyway?" (DEC:58, DEC:89) |
| **c2 One plant** | `views/details/**`, `views/find/Swap.tsx`, `views/Correction.tsx`, `views/PlantMarks.tsx`, `views/kit/flags.ts`, core `confidence.ts`, `conflicts.ts` (misfit into the verdict), `store.ts` (mark lines, `FlagScene`), `types.ts` (`SiteFitMessage`), `scripts/consortium-p5-seams.test.mjs:69-70`, `.dependency-cruiser.cjs`, `scripts/quality/arch-rules.test.mjs`; deletes `marks.ts`, `mark-providers.ts`, `range-marks.ts`, `future-marks.ts`, then `site-marks.ts` and `rules/site-fit.ts` last, and what PP-B left of `matrix.ts` (`cellsOf`, `cellKey`) once Swap says what a candidate also fills and leaves empty in holes; `index.ts` stops exporting `range`; L10 → `error`; prefix `consortium.details.` (the confidence terms under it) | Unit: C1, C2, C3 (restored, rewritten); `fitLine` for each factor and level; every flag, hole and year line in Find, Swap, Paste, Details, print and the period switch comes from `verdict-line.ts` (`consortium.line.`); "Sources disagree" shows without the second value until DATA-11 lands (its test a `todo`); once schema 4 is installed, the safety line reads canopi-data's "Sources disagree" safety display column (the more cautious queued value), never a value the website picks itself; `loadRangeRule` and `loadMarkProviders` go when their readers move (`verdict-load.ts` stays). Browser: C4, C5, C6 (restored); PP-C5 Mendoza: a plant at the dry edge shows its band, the place's value and the limiting measure first; PP-C6 Swap lists what each candidate also fills and what it leaves empty, with its fit line |

**Budgets:** `find` ≤ 8 KB, `details` ≤ 8 KB; `range` and `markProviders` roles fold into `verdict`. **Probe (c1):** `searchIndex` build time and memory over pool and borrowed taxa and a 3-letter query at phone CPU throttle, target under 100 ms; if over, the page's locale and scientific names first, other locales after a 300 ms pause, said on the sheet.
**Risks:** canopi-data D2a not installed: "Has edible parts" (mapped to `edibility_rating > 0`) may be absent; F3 then asserts the life-cycle filter only and names the missing field. The grep gate of architecture section 4 before c2 closes.
**Deletes:** mark providers and their roles, `views/Add.tsx`, `rules/list-query.ts`, the derived `site` signal.

## 4. PP-D: planting plan

**Outcome.** Step 3 gives the order to plant in, the room each plant takes at full size and a closer distance, an optional plot size with plant counts, the facts for planting day, and three ways to take it away: the app, a link to your computer, print.
**Boards:** `PlanDesk`, `PlanRoom`, `Plan`, `Share`, `Take`, `Print`. **Inventory rows:** K1, K2, K4–K6, P8, P9, P10, P11, P36, A3, F17, N6, N7.
**Commit 0:** `PlanLine` type; roles `plan` and `take` (renamed from `later`, `scripts/built-modules.mjs:148-166`).

| Stream | Owns | Tests first |
|---|---|---|
| **d1 The plan** | core `plan.ts`, `rules/picture-plan.ts`, `views/plan/**`, `scripts/vectors/plan.json`; prefix `consortium.plan.` | Unit (`plan.json`): order by first year (`years.ts`), then tallest first; `fullM = width_max_m`; `closeM = width / 2` with `basis: 'rule'` and the words "Canopi's rule of thumb, not a recorded spacing", or the sourced value with `basis: 'source'`; between two kinds, half of each width; no width → no spacing and no count; **counts per layer group** (trees; shrubs): floor((plot ÷ kinds in the group) ÷ fullM²), herbs, sown plants and climbers "by area"; `closeM` only in "up to four times as many"; a 0 shows "less than one at full size" (no "at least 1"); the Seville board case (8, 6, 11, 11, 6 and 55, 222, 55, 40); the stays/leaves line. Browser: PP-D1 Seville, 120 m², eight plants: counts shown with "equal shares, adjust in Canopi", `z=120` in the link survives a reload; PP-D2 balcony in pots: no plot size asked, heights and the prune note stay |
| **d2 Take it with you** | `views/take/**` (from `views/later.ts`, `later-chunk.ts`, `Share.tsx`, `PrintSheet.tsx`), `canopi-file.ts`, `print.css`, `scripts/consortium-canopi-file.test.mjs`; prefix `consortium.take.` | Unit: `canopiFile` writes the root key `projectcanopi_palette` = `{ schema: 1, plot_m2, period, spacing: { <canonical_name>: { full_m, close_m, basis } } }` (architecture section 10; `period` the same `PeriodId` as the link's `y` and the save record, no `link` field) and still opens without it; a schema test against the vendored app schema; a hand-off note naming the key goes to the app; "Copy the list of plants" text. Browser: PP-D3 "Send the link to my computer" holds the place; PP-D4 print of 12 plants shows the planting order and heights to scale, 25 plants the table only (DEC:68, BT-8 kept); PP-D5 the Take sheet says the plan values are "kept in the file for later" |

**Budgets:** `plan` ≤ 10 KB, `take` ≤ 8 KB. **Probe (d1):** share of plants with `width_max_m` per list on the pinned export; under half in any list → the plan leads with "No size recorded for n of m" and the coordinator is told before the screen is built.
**Risks:** counts read as advice: every count line carries "equal shares, adjust in Canopi". **Deletes:** the `later` name and role.

## 5. PP-E: later climates

**Outcome.** A switch (Today / 2041–2070 / 2071–2099) redraws the page for a period: which plants leave their range, which holes open, a picture of all plants against the limiting measure, and replacements that hold, including plants from the hotter climate the place moves toward, marked "estimate".
**Boards:** `Future`, `RangeDesk`, `RangePhone`, `SiteMendoza`, `SiteKiambu` and `PlaceDesk` (place in figures), `Swap` ("Only plants that hold"), `Toasts` (emissions picker). **Inventory rows:** M1–M4, F11, F12, D13, P13, P15, P35, P41.
**Commit 0:** role `climate`; `hotterZone(climate: SitePeriod): ClimateZone | null` in `site-climate.ts` (Köppen zone of the slot `climateFor(ctx, period)` returns, `koppenZone` `:56-63`); verdicts, holes and the picture read climate only through `climateFor`.

| Stream | Owns | Tests first |
|---|---|---|
| **e1 The period switch** | core `verdict.ts` (later periods), `holes.ts` (members `outside` stop filling), `site-climate.ts` (`hotterZone`), `views/palette/PeriodSwitch.tsx`, `views/find/Swap.tsx` (filter), `store.ts`; prefix `consortium.period.` | Unit (`verdicts.json`, `holes.json`): a climax tree judged for 2071–2099, a 3-year plant for today whatever the switch says (`ownYears`); a member outside by 2041–2070 opens its job hole from that period; 3 of 4 scenarios → `agree: 3, of: 4`; `hotterZone` for Lyon, Seville, Kiambu; canopi-data D2b's Yakutsk and Riyadh rows make the two todo tests pass (owner of making them pass: e1). Browser: PP-E1 Seville: 2041–2070, two plants marked as leaving, a hole appears, Swap offers "Only plants that hold by 2041–2070"; PP-E2 the period is in the link (`y`), the scenario is not; PP-E3 no location: the switch says it needs your place |
| **e2 The climate picture** | `rules/picture-climate.ts`, `views/climate/**`; deletes `views/future/**`, `views/FutureSlot.tsx`, `StageBar`'s last helpers; `index.ts` stops exporting `future` in the same commit; prefix `consortium.climate.` | Unit: one row per plant, band low–high, three place markers, sorted by margin; place in figures per period with plant counts. Browser: PP-E4 Mendoza: the picture and its table agree; PP-E5 the `climate` chunk refused: page and switch still work |

**Budgets:** `climate` ≤ 8 KB; `future` role deleted; `verdict` rechecked. **Probe (e1):** `hotterZone` on the pinned tiles for the nine places and the number of range-complete plants each hotter list offers (canopi-data ask DATA-10); a place whose hotter zone has no list uses `NEAREST_LISTS`.
**Risks:** four scenarios recomputed on every switch: the shown scenario first, the spread after. Every later-period line names the scenario count, so the switch never reads as a forecast.
**Open climate questions for the owner (held 2026-11-14 for the PP-E/PP-G batch; none blocks PP-B):** (1) monthly rain at 0.25° in its own layer; (2) rain shipped with the monthly layer in one release; (3) 3 slots (today and SSP2-4.5) or all 9; (4) monthly `tmin` from CHELSA `tasmin` plus Beck deltas; (5) relief from ETOPO 2022 at 30″ with a lapse rate of 0.65 °C per 100 m. The canopi-climate plan's figures are in [the plan](/project/consortium-v2-plan.md) "Website needs from canopi-climate".

## 6. PP-F: soil and your spot

**Outcome.** The place shows the soil map's estimate, which a grower replaces with a test or "pots"; five short questions about the spot adjust the hints; plants carry soil and spot lines, never hidden by them.
**Boards:** `Soil`, `SoilDesk`, `Spot`, `SpotDesk`, `ChangePlace`, `SiteKiambu` (soil part), `Share` (place wording). **Inventory rows:** C1, C2, C3, F10, K3, N5, P18–P25, P26, P27 (placeholder marked "later"), P28–P32, P39 (soil hints).
**Commit 0:** role `soil`; `VerdictContext.soil` passed.

| Stream | Owns | Tests first |
|---|---|---|
| **f1 Soil** | core `place.ts` (`resolveSoil` with `filled`, `fillKm`), `verdict-soil.ts`, `holes.ts` (kind `soil`), `weigh.ts` (soil hints), `rules/picture-soil.ts`, `views/soil/Soil*.tsx`, `state/location.ts` (`lookupSite(…, { soil })`, `src/lib/climate/index.ts:152`); prefix `consortium.soil.` | Unit: `resolveSoil` for map, test, pots, sea, filled; a soil factor is at most `look`; a soil hole only with a typed test or an unfilled map value and every palette plant for that job outside its soil range; a filled value gives `to-check`; texture class from the reader (`src/lib/climate/soil.ts:32-48`). Browser: PP-F1 Kiambu: the map's pH and texture as an estimate with depth "0–30 cm"; a typed test replaces it and two plants change their line; PP-F2 "pots": soil lines disappear, nothing else changes; PP-F3 a point off the coast: "The soil map has no value here" |
| **f2 Your spot** | `verdict-spot.ts`, `views/soil/Spot*.tsx`, `views/place/**` (entry points), `src/components/PrivacyPage.astro`, `src/components/DataSourcesPage.astro`; prefix `consortium.spot.`, edits `privacy.spot`, `dataSources.*` soil line | Unit: each answer's effect is a hint; `cold-air` only on plants within 2 °C of the cold limit when height is `higher` or `hollow`; every answer starts `unsure`. Browser: PP-F4 Oulu, "a hollow": cold-limit plants carry the caution, figures do not move; PP-F5 spot answers survive a reload and are absent from the address; PP-F6 a skipped question is asked on the plant; "Not asked, and why" |

**Privacy text shipped by f2** (owner-approved 2026-11-14; EN and FR as below, the 9 other locales translated in the build; key `privacy.spot` is new):
- `privacy.spot` EN: "Your answers about your spot (light, water, wind, ground, height) and any soil test you enter are saved only on this device, with your palette. The likely soil is read from files your browser downloads from projectcanopi.com, built from the SoilGrids soil map; nothing about your place is sent to SoilGrids. 'Forget this location' clears them."
- `privacy.spot` FR: "Vos réponses sur votre coin (lumière, eau, vent, sol après la pluie, altitude) et l'analyse de sol que vous saisissez ne sont enregistrées que sur cet appareil, avec votre palette. Le sol probable est lu dans des fichiers que votre navigateur télécharge depuis projectcanopi.com, construits à partir de la carte des sols SoilGrids : rien sur votre lieu n'est envoyé à SoilGrids. « Oublier ce lieu » les efface."

**Budgets:** `soil` ≤ 10 KB; location step stays ≤ 20 KB. **Probe (f1):** bytes and time of the soil tile at the location step for the nine places; over 150 KB → fetched when the soil part is first shown.
**Risks:** map soil read as fact: every line names "soil map estimate" and the depth; no height correction yet (caution only). **Deletes:** `Site.soil` words as a question (`types.ts:65`).

## 7. PP-G: through the year

**Outcome.** The page shows the year at the place: flowering and fruit-seen months as recorded, the dry season or the winter rest, and what can grow in the cooler months, with candidates.
**Boards:** `MainMore` (Through the year), `Cool`, `Recife`, `Oulu`, `Kumasi`, `Mendoza`. **Inventory rows:** P4, P5, E16, F20; Q6 and Q8 stay "later" where data is missing.
**Commit 0:** role `year`; `PlantSource.layerValues` implemented (one query on `layer_values`, read per plant at `sqlite-source.ts:300` today).

| Stream | Owns | Tests first |
|---|---|---|
| **g1 The year at your place** | core `season.ts`, `holes.ts` (kinds `cool`, and `flowering` from same-band records only, architecture 3.3 latitude bands), `rules/picture-year.ts`, `rules/months.ts` (moved from `views/layers.ts` with Details' import), `views/year/**`, `scripts/vectors/season.json`; prefix `consortium.year.` | Unit (`season.json`): average night low of the coldest month ≥ 15 °C → no cool season, the dry months are the picture; < 0 °C → winter rest; between → cool growing season (owner, revision 2); months recorded in another latitude band (N, T when |lat| < 23.44, S) are labelled "recorded elsewhere", never shifted (permanent); band rows: Kumasi vs GB, Recife vs AU+S, Manaus vs −23..0, Lyon vs GB, a 20..30 band, a country straddling two bands; a row with no band never opens or fills a hole; flowering states recorded / not recorded / recorded elsewhere, "n of m recorded", never a pass; cooler-months candidates ordered `active_growth_period` → `sowing_months` (Temperate, Sep–Nov, "in Britain") → the rest "no season on record", judged on `tmin_cold` only. Browser: PP-G1 Recife: no winter, a dry-season bar; PP-G2 Oulu: winter rest; PP-G3 a Mediterranean place: "Cooler months" lists candidates in that order; PP-G4 `layerValues` fails: the picture says so with Reload |
| **g2 Month layer** (only once canopi-climate ships CLIM-2 in the `monthly` layer) | `src/lib/climate/model.js`, `lookup.ts`, `src/data/climate-release.json`, core `types.ts` `SitePeriod` | `npm run test:vectors` on the new release; reads `LAYERS.monthly` (monthly `tmean`, monthly `tmin`, the int16 dry mask) with grid and band order from the manifest's per-layer schema; fetched only by the `year` and `climate` chunks; the dry-mask bit count equals `dryMonths` for the nine places; the cool season comes from monthly `tmin` against season.json's thresholds (owner, 2026-11-14; thresholds unchanged), there is no `cool_mask` |

**Budgets:** `year` ≤ 10 KB. **Probe (g1):** bloom-month coverage per list on the pinned export and how many records carry a scope other than the list's region; under a third recorded → the picture leads with the season bar and folds flowering.
**Risks:** without CLIM-2 the dry season has a length and no months ("Which months: not yet"). Tropical places never get a temperate year: tested at Recife, Kumasi and Manaus first. g2 waits on the owner's climate answers (PP-E open questions above) and on the installer change that accepts the new layer's folder before the v0.3.0 pin.

## 8. Not in these pushes (stay "later", each with its inventory row)

Q1 watering and ±3 °C adjustments (F4, link v6 or the requires key `u=`), Q2 replacements with the crossing decade (F2), Q3 plan as CSV and the methods page (F1b, CSV column contract of architecture section 10), Q4 suggestion by goal (F3, needs D8) with inventory P7, Q5 fire risk (F6), Q7 "native here" and "likely" soil fit (P5.2) with inventory F19. b1a does not build the goal question. Imperial units are not planned (formatters keep metric; a units setting would be a later owner decision).

## 9. Stream brief (the coordinator fills one per stream)

The implementing agent (Opus 5.5 medium; Fable 5.2 only advises) gets, and needs nothing else: (1) the outcome in one sentence, its boards (reference for content and wording, not markup) and inventory rows; (2) read first: `CLAUDE.md`, this concept's push section, the architecture sections named, `okf context --path` for each owned folder, ADR-1, the owner answers file; (3) worktree `canopi-website-wt/<stream>`, branch `pp/<letter>-<stream>` cut from commit 0, owned paths from the owners file, locale prefix and edits, the seams it must not change (stop and report if one is wrong); (4) tests first as markers with the stream id, inherited markers restored from 648baf2; (5) the first-commit probe and its threshold (stop and report on failure); (6) rules: layers, one owner per concept, pictures as pure models plus a table, every state (loading, empty, failed with a way out, unknown never shown as a fit), warnings in words with an icon never hiding a plant, never temperate by default, colours only from the token block (architecture 3.5), measures only through `format.ts`, verdict, hole and year words only through `verdict-line.ts`, pictures as models in `rules/` with `scripts/picture-table.mjs`, nothing scrolling sideways at 320 px, no Worker, server call or storage key beyond the plan's, its chunk's cap; (7) gates, each capped, one at a time; browser and build runs only in the coordinator's slot; `okf impact` and `check`; (8) stop and report when a seam does not fit, a board and the plan disagree, a probe fails, a budget cannot be met, or a test passes only by weakening it; (9) a final report: outcome, probe figure, commits, tests and markers, gates with sizes, boards, locale key counts, concepts, open points.

## Commit 0a as built (2026-11-14)

- **Markers.** 7 PP-B markers were moved; each still fails for its stated reason in one capped run after 0a. There were 24 parked and 8 deleted at 0a; the owner's "Delete first" moved P5, P6 and P10 (unit) from parked to deleted, so `scripts/plan/parked-markers.json` holds 21 parked, 7 moved and 11 deleted.
- **Spec gaps resolved:**
  - `pots` is in `roomValues` (the `Room` type and the link codec) but not yet in `rooms`, so Start's form stays as today until b1a.
  - An `origin` passed to `encodeLink` implies the place tick.
  - The save keeps the country for the link and location sources.
  - `--light-medium` and `--light-none` keep the app's values.
  - Matrix and Actions are 2 chunks of role `matrix`.
  - `range-verdicts.json` is a stamped copy until the installer carries the file.
- **Left after 0a:**
  - The 31 v4-literal tests in `consortium-core`, `consortium-memory` and `consortium-p5-seams-s5b` were rewritten to v5 in chunk 0 (362fe3f); 0a' removes what is left in them about kept, crops, stage and the views.
  - The later part is 0.7 KB over its 8 KB cap through the shared `tracks.ts` chunk ([chunk budgets](/decisions/consortium-chunk-budgets.md)); not raised, since 0a' deletes `tracks.ts` (owner "Delete first"); re-measured after 0a'.
