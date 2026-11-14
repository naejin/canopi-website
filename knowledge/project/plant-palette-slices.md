---
type: Project
title: Plant palette slices
description: "Pushes PP-B to PP-G of the Plant palette redesign: common rules, the 39 F1a markers re-owned and the parking rule, the tests each push breaks, and per push the outcome, boards, commit 0, streams with owned files and tests first, probes, budgets, risks and deletions."
tags: [consortium]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T09:21:21Z }
sources:
  - id: pp-b-owners-json
    resource: ../../scripts/plan/pp-b-owners.json
    title: scripts/plan/pp-b-owners.json
    digest: sha256:3763952a06825d5b
    last_modified: 2026-11-14T09:14:39Z
  - id: f1a-owners-json
    resource: ../../scripts/plan/f1a-owners.json
    title: scripts/plan/f1a-owners.json
    digest: sha256:8e8bba65961d8c87
    last_modified: 2026-11-14T09:14:39Z
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
    digest: sha256:f1cf582755f15220
    last_modified: 2026-11-13T13:00:56Z
  - id: zero-markers
    resource: ../../.githooks/zero-markers
    title: .githooks/zero-markers
    digest: sha256:887667b4d3bb33f9
    last_modified: 2026-11-13T13:02:56Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:05165e3bc439b2c2
    last_modified: 2026-11-13T20:57:13Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:cd62373a66839519
    last_modified: 2026-11-13T06:49:01Z
  - id: browser-tests-test-mjs
    resource: ../../scripts/browser-tests.test.mjs
    title: scripts/browser-tests.test.mjs
    digest: sha256:095e1044d4711e92
    last_modified: 2026-11-13T19:32:13Z
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
    digest: sha256:4c2cbb619c1a5e54
    last_modified: 2026-11-13T19:32:13Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:521388d051be908d
    last_modified: 2026-11-13T19:32:13Z
  - id: built-modules-test-mjs
    resource: ../../scripts/built-modules.test.mjs
    title: scripts/built-modules.test.mjs
    digest: sha256:b2cddacc3db3d444
    last_modified: 2026-11-13T19:32:13Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:9b609001749f13dc
    last_modified: 2026-11-13T20:25:47Z
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
    digest: sha256:6b88a9789527076a
    last_modified: 2026-11-13T15:21:17Z
  - id: consortium-palette-test-mjs
    resource: ../../scripts/consortium-palette.test.mjs
    title: scripts/consortium-palette.test.mjs
    digest: sha256:e794c81a66f37dc9
    last_modified: 2026-11-13T19:32:13Z
  - id: plan-owners-test-mjs
    resource: ../../scripts/plan-owners.test.mjs
    title: scripts/plan-owners.test.mjs
    digest: sha256:3a2aa9c577639d50
    last_modified: 2026-11-14T09:14:50Z
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
    digest: sha256:9a6e855001d6f465
    last_modified: 2026-11-13T13:00:56Z
  - id: axe-json
    resource: ../../scripts/quality/baselines/axe.json
    title: scripts/quality/baselines/axe.json
    digest: sha256:d9eebfa72531c53b
    last_modified: 2026-11-13T03:26:34Z
  - id: datasourcespage-astro
    resource: ../../src/components/DataSourcesPage.astro
    title: src/components/DataSourcesPage.astro
    digest: sha256:0b8af77a37550326
    last_modified: 2026-11-11T19:53:07Z
  - id: privacypage-astro
    resource: ../../src/components/PrivacyPage.astro
    title: src/components/PrivacyPage.astro
    digest: sha256:21d3855ef5060909
    last_modified: 2026-11-13T14:25:59Z
  - id: climate-release-json
    resource: ../../src/data/climate-release.json
    title: src/data/climate-release.json
    digest: sha256:f17c3cc7b270a864
    last_modified: 2026-11-11T09:33:29Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:14fb4e9bf04c09d0
    last_modified: 2026-11-13T08:14:37Z
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
    digest: sha256:fb9a67dce315c4f6
    last_modified: 2026-11-13T10:58:21Z
  - id: focus-ts
    resource: ../../src/islands/consortium/focus.ts
    title: src/islands/consortium/focus.ts
    digest: sha256:dc512a822aa08263
    last_modified: 2026-11-13T20:25:47Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:ab45b5e62406d5b7
    last_modified: 2026-11-13T14:46:32Z
  - id: list-query-ts
    resource: ../../src/islands/consortium/rules/list-query.ts
    title: src/islands/consortium/rules/list-query.ts
    digest: sha256:0bbcc4c3700be1ab
    last_modified: 2026-11-13T07:27:10Z
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
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:bdf71e540c290ea1
    last_modified: 2026-11-13T12:40:55Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:6864030b5d82d224
    last_modified: 2026-11-13T20:25:47Z
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
  - id: sheets-tsx
    resource: ../../src/islands/consortium/views/Sheets.tsx
    title: src/islands/consortium/views/Sheets.tsx
    digest: sha256:eac7a62f73ab6cc3
    last_modified: 2026-11-13T09:54:42Z
  - id: flags-ts
    resource: ../../src/islands/consortium/views/kit/flags.ts
    title: src/islands/consortium/views/kit/flags.ts
    digest: sha256:3e8f63daa96fdca4
    last_modified: 2026-11-13T07:02:37Z
  - id: sheet-tsx
    resource: ../../src/islands/consortium/views/kit/sheet.tsx
    title: src/islands/consortium/views/kit/sheet.tsx
    digest: sha256:fbdf09611bf250a1
    last_modified: 2026-11-13T09:54:42Z
  - id: later-ts
    resource: ../../src/islands/consortium/views/later.ts
    title: src/islands/consortium/views/later.ts
    digest: sha256:3e823c31afb6e73f
    last_modified: 2026-11-13T13:02:30Z
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
  - id: tracks-ts
    resource: ../../src/islands/consortium/views/tracks.ts
    title: src/islands/consortium/views/tracks.ts
    digest: sha256:6d1748c57b67ff96
    last_modified: 2026-11-13T07:27:10Z
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
    digest: sha256:74e257618f1b4271
    last_modified: 2026-11-13T03:45:07Z
  - id: future-marks-ts
    resource: ../../src/lib/consortium/future-marks.ts
    title: src/lib/consortium/future-marks.ts
    digest: sha256:dc7162e2c1e66dbb
    last_modified: 2026-11-12T11:43:06Z
  - id: index-ts-2
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:c2375e19583bd550
    last_modified: 2026-11-13T19:32:13Z
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
    digest: sha256:baa54a05e2f52746
    last_modified: 2026-11-13T10:58:21Z
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
    digest: sha256:19a8b751b1c19196
    last_modified: 2026-11-13T10:58:21Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:b230ad6ff500d7d6
    last_modified: 2026-11-13T19:32:13Z
---

Pushes of the [Plant palette redesign](/project/consortium-v2-plan.md), in order: **PP-B, PP-C, PP-D, PP-E, PP-F, PP-G** (owner answers of 2026-11-14: no separate push A; later climates, then soil and your spot, then through the year). Module names, shapes and link keys: [Plant palette architecture](/architecture/plant-palette-architecture.md); use them exactly. Boards are named by file in `.local/consortium/v2/f1a/mockups-v3/project/<Name>.dc.html` (main checkout, gitignored); inventory rows are those of `mockups-v3/ux-inventory.md`. Citations are at `f1a/int` 648baf2.

## 0. Rules common to every push

- **Branch.** Integration branch `pp/<letter>`; streams `pp/<letter>-<stream>`. `pp/b` is cut from `f1a/int` (this plan's commit), which holds the seams worth keeping: `Room` with `pots` (`types.ts:71-73`), `ROOM_LIMIT_M` (`site.ts:37`), `SIZE_LIMIT` (`suggest.ts:30`), `Confidence` (`types.ts:471-479`), the no-op `focusAfterToast` (`focus.ts:42`), `scripts/expect-fail.mjs`, `scripts/plan/owners.mjs`. Each later branch is cut from `master` once the previous push is live.
- **Owners file per push:** `scripts/plan/pp-<letter>-owners.json` (shape of `scripts/plan/e6-owners.json`; `node scripts/plan/owners.mjs validate`; a stream checks its diff with `owners.mjs check <chunk> <stream> <base> --file …`). PP-B's is committed with this plan; each later one is written by that push's commit 0. `scripts/plan/f1a-owners.json` carries `superseded_by` (pinned by `scripts/plan-owners.test.mjs`).
- **Commit 0** (main agent) holds only shared seams: types, the link codec, state fields, budget roles and caps, the owners file, the CSS imports of every new stylesheet in `ConsortiumPage.astro`, the marker moves. No screen, no rule body. `npm run check`, `npm test`, `check:arch` and `check:dead` pass after it.
- **Streams:** at most three per push, each a feature (not a layer) that writes its own tests first; at most two building agents at once, so a third starts when one hands off. One scenario spec per stream (`scripts/browser/consortium-pp-<stream>.browser.test.mjs`) and one unit file per stream (`scripts/consortium-pp-<stream>.test.mjs`), registered once in every list of `scripts/browser/shards.json` by commit 0 (`scripts/browser-tests.test.mjs` checks it). A shared file has one owner per chunk; a stream needing another's file asks the coordinator.
- **Tests first.** A stream's first commit adds its tests as expected-fail markers, `failing(title, { owner, reason }, fn)` with the stream id in the title (`scripts/expect-fail.mjs:22-38`); each marker goes in the commit that makes it pass.
- **Zero markers before each push (gate rule, made workable):** the master gate stays as it is (`.githooks/zero-markers` = `fail`; `node scripts/expect-fail.mjs --zero` in pre-push and CI job 1, `.github/workflows/ci.yml:133`). Mechanism: **park by splitting out.** A push's commit 0 removes from the tree every marker a later push owns; it is parked at its source commit (648baf2 for the 39 F1a markers) and listed in the table below with its file and line; the owning stream restores it with `git show 648baf2:<path>` in its first commit, retitled with its owner. Markers of the push itself are removed by their streams before the push. No skip list, no second marker kind, no gate change.
- **Lasting-layer tests** are unit tests of the core and of `rules/**` and JSON vectors under `scripts/vectors/` (`link-v5.json`, `verdicts.json`, `holes.json`, `weigh.json`, `plan.json`, `season.json`) so the app's Rust code can run the same cases when a feature moves there. **Scenario tests** are browser tests of a grower's journey asserting text and state the grower relies on, never markup or class names.
- **Scenario places:** Lyon, Seville, Kiambu, Recife, Oulu, Mendoza, Kumasi, Manaus, a balcony in pots (Osaka). Expected figures come from the boards and `mockups-v3/growers.md`, never from a grower's feedback (owner rule: grower feedback never blocks).
- **Gates** before the main agent pushes: `npm run check`, `npm test`, `npm run check:arch`, `npm run check:dup`, `npm run check:dead`, `npm run test:browser` (it builds, `package.json:17`), `npm run test:browser:smoke`, `npm run test:vectors`, `node --test scripts/built-modules.test.mjs`, `npm run build` then `node scripts/check-built-site.mjs`, `npm run test:axe` (as CI job 4); `python3 .okf/okf.pyz impact` and `check`. Every command capped with `systemd-run` (agent rules). Streams never push.
- **Budgets every push:** every role under its cap and the first run under its cap (`scripts/check-built-site.mjs:498-519`). **The owner allows raising any cap (2026-11-14: "Raise all limits if needed… Optimize size after").** A raise is made by the coordinator at a merge, never silently by a stream: one row in the budget log of the plan and one coordinator row in the decision log, each naming the cap, old and new value, the measured size and the reason. The optimisation step after PP-G (roadmap) brings caps back down.
- **Text:** every new key in all 11 locale files, `pt` in Brazilian Portuguese, under the stream's prefix (ending in `.`) with an `edits` list of the existing keys it changes or deletes (owners file `shared`). Colour never carries meaning alone; breakpoints 639 and 960 only.
- **Exit criteria every push:** gates green; zero markers; each board listed for the push compared with the built page at 390 px and 1280 px, light and dark, differences listed for the coordinator; every inventory row listed done or named as moved; keep rows N1 and N3 re-checked; concepts updated (`okf impact`).

## 1. The 39 expected-fail markers on `f1a/int`

PP-B commit 0 moves the 20 PP-B markers into their stream's files (retitled `F1a-<id> → PP-B (<stream> …)`, owner the new stream), parks the 11 PP-C markers (removed; restored by their owner in PP-C), and deletes 8. 31 are kept or rewritten, 8 deleted.

| Marker (file under `scripts/`, line at 648baf2) | Was | Disposition | New owner |
|---|---|---|---|
| F1a-A1 toast focus (`browser/consortium-f1a-a11y.browser.test.mjs:31`) | a11y1 | keep | PP-B b2 |
| F1a-A2 status regions (`…a11y…:49`) | a11y1 | keep (toast and sheets' regions) | PP-B b2 |
| F1a-S1 wasm preload (`browser/consortium-f1a-perf.browser.test.mjs:22`) | perf1 | keep | PP-B b2 |
| F1a-S2 `ct:start`, `ct:first-view` (`…perf…:35`) | perf1 | keep; first view = the palette page | PP-B b2 |
| F1a-P10 cards by role (`consortium-palette.test.mjs:32`) | pal1 | rewrite: "Your plants" lists each plant once, warnings first, no Main crop group | PP-B b3 |
| F1a-P11 guest list loading (`…palette.test.mjs:52`) | pal2 | rewrite on `holes()`: `pending` while a guest list loads | PP-B b2 |
| F1a-P12, P13 invasive tie (`…palette.test.mjs:71,78`) | pal1 | keep (`gain`, `suggest.ts:93`) | PP-B b1 |
| F1a-P1 Lyon first visit (`browser/consortium-f1a-palette.browser.test.mjs:43`) | pal2 | rewrite: after "Start from a small suggested palette", Next step names one hole and opens Add preset to it | PP-B b2 |
| F1a-P2 return visit (`…:55`) | pal1 | keep: the palette page's placeholder, never the Place form | PP-B b2 |
| F1a-P3 Structure link (`…:72`) | pal1 | **delete** (no Structure view; `VIEW_KEY`, `:37`, goes with it) | — |
| F1a-P4 Seville pots (`…:96`) | pal1 | keep | PP-B b1 |
| F1a-P5 200-plant palette (`…:117`) | pal1 | rewrite: "Your plants" folds to "+ N more", Remove takes a plant out, pictures stay readable | PP-B b3 |
| F1a-P6 Structure chunk fails (`…:137`) | pal1 | rewrite: the `palette` chunk refused → Place stays usable, "could not load" with Reload, next press fetches `?retry=n` | PP-B b2 |
| F1a-P7 Suggest waits for the future chunk (`…:151`) | pal1 | keep, on the `verdict` chunk | PP-B b1 |
| F1a-P8 keyboard journey (`…:164`) | pal2 | rewrite: header steps → Next step → Add → focus back on Next step | PP-B b2 |
| F1a-P9 status regions on Start and the views (`…:184`) | pal1 | keep, on Place (the palette page's regions are in A2) | PP-B b1 |
| F1a-P10 Balance chunk fails (`…:197`) | pal2 | **delete** (covered by rewritten P6) | — |
| F1a-C1, C2, C3 (`consortium-confidence.test.mjs:32,45,57`) | conf1 | parked; C1 rewrite: surfaces = fit line, Details, Find, print (methods anchor waits for F1b-2; `types.ts:413`); C2 maps verdict factors to terms | PP-C c2 |
| F1a-C4, C5, C6 (`browser/consortium-f1a-confidence.browser.test.mjs:26,40,48`) | conf2 | parked; C6 refuses the `verdict` chunk | PP-C c2 |
| F1a-F1 … F5 (`browser/consortium-f1a-filters.browser.test.mjs:32,37,43,53,60`) | add3 | parked; F1 opens Find from a hole with "Fits your place" on; F2 uses `holdsBy` (live from PP-B); F5 "range and holds filters" (native is P5.2) | PP-C c1 |
| F1a-B1 family spread (`consortium-balance.test.mjs:60`) | bal2 | rewrite on `weigh.ts`: six of eight in one family is a line to weigh with its hint | PP-B b3 |
| F1a-B2 water mix (`…:70`) | bal2 | rewrite on `weigh.ts`: 2 of 10 recorded is "not enough to judge" | PP-B b3 |
| F1a-B3 waiting checks (`…:79`) | bal2 | **delete** (roots, insects, active season, evergreen are not on the approved page) | — |
| F1a-B4 borrowed climate (`…:87`) | bal2 | rewrite: every weigh line on a borrowed list carries the estimate term | PP-B b3 |
| F1a-B6 legume-heavy palette (`browser/consortium-f1a-balance.browser.test.mjs:40`) | bal2 | rewrite as the one scenario of "things to weigh" | PP-B b3 |
| F1a-B5, B7, B8, B9, B10 (`…balance…:30,55,62,70,100`) | bal2 | **delete** (no Balance panel; the unit tests keep the rules) | — |

### 1b. Existing tests each push breaks (owner in the push's owners file)

| Push | Tests | Owner |
|---|---|---|
| PP-B commit 0 | the f1a spec files and `consortium-balance`, `consortium-palette`, `consortium-confidence` unit files (deleted after the marker moves); `browser-tests.test.mjs` (`SPEC_FILES` `:26-36`, the minimum-2 regex `:45`, the F1a owner block `:284-298` → PP-B block); `built-modules.test.mjs` (`:16`, `:58-60`); `plan-owners.test.mjs`; `guides-consortium`, `built-links`; the specs and helpers that open `/consortium/` | main |
| PP-B b1 | `consortium-memory`, `-keys`, `-start`, `-p5-seams-s5b/-s5c/-s5e/-s5f` (unit); `consortium-s4`, `-p5-s5b/-s5c/-s5f` (browser) | b1 |
| PP-B b2 | `consortium-core` (chunk 1), `-css`, `-p5-seams`, `-p5-seams-s5d` (unit); `consortium-s1`, `-p5-s5d`, `-seams-p2/-p5/-layout`, `-e6`, `-e6-r4`, `-commit0` (browser); `helpers.mjs`, `p5-helpers.mjs`, `seams-helpers.mjs` | b2 |
| PP-B b3 | `consortium-core` (chunk 2, matrix cases), `-tracks`, `-source` (`cellCounts`), `-p5-ranges` (matrix cases only); `consortium-s2`, `-s3` | b3 |
| PP-B exit | `smoke/axe.smoke.mjs:33`, `scripts/quality/baselines/axe.json` (merge agent) | main |
| PP-C | `consortium-list-query`, `-p5-ranges`, the mark tests, `consortium-paste` | c1, c2 |
| PP-D | later and print tests, `consortium-canopi-file` | d2 |
| PP-E | future panel tests | e2 |

Deleted specs leave `shards.json` in the same commit.

## 2. PP-B: one palette page, `/palette/` and the honest states

**Outcome for the grower.** The tool is "Plant palette" at `/palette/`; old addresses redirect. A grower names a place first, starts from their own plants (a small suggested palette is one link away) and sees one page: the next hole to fill with plants that fill it, the palette through the years by light level, the jobs covered, and their plants with full-grown size and warnings first. The page says what is happening: still loading, offline, a link it cannot read or from another version, an Undo after Start over, toasts that wait while read, "Open my saved palette instead". The matrix, the four tabs, Kept and Main crops are gone. Links are v5; v4 links and saves get the "older version" line (owner, 2026-11-14).

**Boards:** `Place`, `PlaceDesk`, `LocSearch`, `LocMap`, `LocStates`, `Country`, `ChangePlace` (room and location parts), `LocDesk`, `SiteKiambu` (without soil and later periods), `Empty`, `Arrivals`, `Main`, `MainMore` (without Through the year), `Palette`, `PaletteMore`, `HoleOpen`, `FillHole` (rows as today's Add rows), `Loading`, `Toasts`, `Focus`, `DeskStates`, `Share` (the "Include my place" wording), `DarkMain`, `DarkPalette`, `DarkMap`, `Balcony`, `German`, `ClimateHand`; `Recife` compared for the page shape.
**Inventory rows:** A1, A2, A4, A5, A6, B1–B9, C4, C5, C6 (drop), C7, D1–D13, E1–E14, E17, E18, E20, F5 (toxicity colours), H1 (hole instead of cell), J1, J2, K3 (share wording), K4, K7, L1, L2, L4, L5, N2, N4, P1, P2, P3, P6, P12, P17, P37, P39 (family, water), P42, P43.

**Commit 0 (main agent; owners file `scripts/plan/pp-b-owners.json` chunk 0, which lists every file):**
- **0a seams:** types of architecture 3.1–3.3 with empty-bodied `place.ts`, `verdict.ts`, `verdict-line.ts`, `years.ts` (with `phaseOrd` and `spanOf` moved in), `holes.ts`, `weigh.ts`; `PlantSource.layerValues` with a stub; `SitePeriod` gains `precipMm`, `dryMonths`; `pots` in `rooms`; the whole link v5 codec, `encodePlace` and `linkVersionStatus` with `scripts/vectors/link-v5.json` (reviewed by the coordinator before any stream starts) and its consumers in `persist.ts` (`:99-118`) and `restore.ts` (`:131-143`); state fields and the place rule; `site` derived; `kept`, `crops`, `stage` deprecated; `canopi-place` and `history.state.pl`; `applyPreset` adds the guide plant; store seams (`verdictContext`, `verdictRule`, `memberVerdicts`, `poolVerdicts`, `countFits`, an empty `offline`), `withRule` waits on `verdict`; `views/place/Place.tsx` re-exporting Start; the matrix behind `lazyPart` (role `structure` renamed `matrix`, 12 KB); `views/tracks.ts` helpers to `views/kit/phase.ts` and `names.ts`; the Balance seams deleted; roles `palette`, `verdict`; L10 as `warn`; `range_verdicts.json` read from the installed release (stamped copy with a release-id test until the installer change lands); empty page-level stylesheets; the marker moves and parking of section 1.
- **0b the move:** architecture 8.4, including the wrangler-dev probe and its stub-page fallback, the 22 redirect lines, the page-head link check (`ConsortiumPage.astro:117`), the rename words in 11 locales, and the harness, helpers, specs and checks that name the old path.
- Commit-0 unit tests (in `scripts/consortium-link-v5.test.mjs`): `linkVersionStatus` table; `arrival()` with a v4 record gives the older line once and removes the save, with a v6 record keeps it; `readRecord` and `oldRecord` with v4, v5, v6 fragments; unreadable vectors (not a whole `v`; `e=1` with a malformed non-empty `a`; not for an empty `a`, unknown tokens or a cut); `k` gating (chosen + unticked → none; location + ticked → `k`; guess + ticked → none); spot grammar (`h=higher.650`, `w=irrigated`); a link whose answers are all `unsure` brings no place.

| Stream | Owns (summary; exact rows in the owners file) | Tests first |
|---|---|---|
| **b1 Your place, arriving and sharing** (chunk 1) | `views/place/**` (Start moved in and deleted there), `views/location/**`, `LocationSlot`, `views/pool/**`, `PoolSlot`, `Share.tsx`, `state/{draft,arrival,restore,persist,location,lookups,suggest-wait}.ts`, `rules/suggest-block.ts`, core `place.ts`, `suggest.ts`, `site-today.ts`, `place.css`; prefix `consortium.place.`, edits `consortium.start.*`, `.share.*`, `.location.*`, `.country.*`, `.site.*`, `.room.*`, `.crops.*`, `.block.*`, `.region.*`, `privacy.location.link` | Unit: `siteFor`, `emptyPlace`; P12, P13; `arrival()` with the v5 record, `pl` and `canopi-place`; `startOver` then one Undo restores members, removed, guests; a preset gives `members == [id]` and no save; link-place notice (a) a palette edit keeps `l=sun`, (b) "Use it" gives `l=shade` and the link's cell after reload, (c) "Use my own place" restores the reader's. Browser: P4, P7, P9; PP-B1 Kiambu: search, confirm the climate, the line "{n} of the {m} plants on the nearest lists fit your place today" through `countFits` (the figures are b2's vector); PP-B2 no location: climate cards, then own plants; PP-B3 "Start from a small suggested palette" and one Undo removes them all; PP-B4 a v4 save → the older line once, the tool empty; PP-B5 three reloads (before any plant, after Start over, with plants) keep room and spot answers while the address holds none of `k o l w q r h s`; PP-B10 share with "Include my place" off: the link holds none of `k o l w q r h s`; on: it holds them and the sheet says so in words; PP-B11 Start over → toast with Undo → palette back; PP-B12 guide preset with a saved palette → "Open my saved palette instead" restores it; PP-B13 `v=6` and unreadable links each show their line and an empty tool, save untouched; PP-B14 a guide link `?plant=…&climate=…` opens on `/palette/` with the plant as a member |
| **b2 The palette page and its shell** (chunk 1) | `store.ts`, `App.tsx`, `main.ts`, `focus.ts`, `data/load.ts`, `Toast.tsx`, `Actions.tsx`, `FutureSlot.tsx` (hosted until PP-E), `views/palette/{Palette,NextStep,Years,JobsPicture,Placeholder}.tsx`, `views/kit/{chart,fit}.tsx`, `rules/picture-{years,jobs}.ts`, core `verdict.ts`, `verdict-line.ts`, `years.ts`, `holes.ts`, `jobs.ts`, `marks.ts` (`loadVerdictRule`), `palette-page.css`, `shell.css`, `scripts/vectors/{verdicts,holes}.json`; prefix `consortium.palette.`, edits `consortium.job.*`, `.load.*`, `.loadingTool`, `.undo`, `.dismiss`, `.jobsHeading` | Unit: `verdicts.json` holds the 169 canopi-data vectors and agrees, plus Kiambu's count; `judgedPeriod`; `holdsBy` (inside in 2041–2070; loses heat; no location → false; short-lived plant on today); `holes.json`: a job missing in years 3–15 is one hole, a 0–1 and a 0.25–1 gap are `not-judged`, nothing after 60, each neighbouring rank pair, P11 `pending`; `fillers` groups (in-range invasive → look, mild toxic → look, invasive outside → outside) and ranking (holes filled, `holdsBy`, name); picture models: rows per light level, bands in year fractions, the table form has the same cells (P17). Browser: A1, A2, S1, S2, P1, P2, P6, P8; PP-B6 Lyon, own plants: three plants pasted, Next step names the first hole in words and years, filling it changes the next hole; PP-B7 phone 390 px: Through the years one time step at a time; PP-B8 "Show as a table" gives each picture's content to a screen reader; PP-B15 slow database → "Still loading", then the tool (15 s without a byte: the failure screen, as today); PP-B16 offline → the line shows, added plants stay; PP-B17 a toast stays while focused, then focus returns to the control that raised it |
| **b3 Your plants** (chunk 2, after b2 merges) | `views/palette/{YourPlants,Weigh}.tsx`, core `weigh.ts`, `suggest.ts` (gain on `fills`), `matrix.ts`, `conflicts.ts`, `source.ts`, `index.ts`, `holes.ts` (export `fills` use), `store.ts`, `data/sqlite-source.ts`, `state/{schema,restore,persist}.ts` (deprecated fields out), the matrix views and CSS, `tracks.ts`, `Jobs`, `PlantList`, `StageBar`, `StageStepper`, `SideView`, `side.ts`, `draw.ts`, `PrintSheet.tsx`, `details/Details.tsx`, `kit/flags.ts`, `rules/heights.ts`, `lazy.tsx`, `plants.css`, `print.css`, `ConsortiumPage.astro`, `built-modules.mjs`, `check-built-site.mjs` (matrix role out), `scripts/vectors/weigh.json`; prefix `consortium.plants.`, edits `consortium.matrix.*`, `.list.*`, `.side.*`, `.keptTag`, `.mainCrop`, `.tox.*`, `.withWarning`, `.print.*`, `.misfit.*` | Unit: P10 (rewritten), B1, B2, B4; size line (width and height, "No size recorded" when NULL); toxicity mapping (Slight → warning token, "Mildly toxic" and icon; Moderate, Severe → danger token); `suggest` gain counts open holes filled. Browser: P5, B6; PP-B9 a Slight-toxic, a Moderate-toxic and an invasive plant are listed first, each with words and icon, removed only by the grower; PP-B18 print draws the side view at the year step chosen in Through the years |

**Probes (first commit of each):** commit 0 measures the first run with the matrix behind `lazyPart` and reports it (a raise follows the budget rule); 0b the redirect probe on wrangler dev. b2: with the empty palette page behind `lazyPart`, the time from "database open" to "first hole shown" for a 200-plant palette on the CI runner, target under 150 ms for `verdicts` + `holes` (unverified). b1: `countFits` returns the same count as the pool panel for Kiambu before the panel goes.
**Budgets:** `palette` ≤ 12 KB, `verdict` about 4.5 KB (range + markProviders), `matrix` 12 KB until b3 deletes it; first run measured at commit 0, raised by a recorded row if the shell states do not fit 38 KB; at the exit every cap is set to measured + 0.5 KB.
**Risks:** `store.ts` is touched by every feature: b2 owns it in chunk 1 (b1 asks through the coordinator), b3 in chunk 2. The v5 vectors are public contract: coordinator review before streams start. Three streams on one page: page CSS is b2's, each part's CSS is its stream's. A tab still on old code reads a v5 link as "older version" (accepted; "tool updated, Reload" exists, `App.tsx:28-36`). Search engines see a moved page: canonical, hreflang and sitemap move with `consortiumPath`. Removing a v4 save is data loss the owner accepted (answers of 2026-11-14).
**Deletes:** the F1a Balance and Structure seams; `/consortium/` pages; the matrix views and CSS; `matrix.ts` (or a private suggest helper with a named removal push); Kept and Main crops (state, UI, link keys `p`, `n`, `t`, the `*` mark); the `matrix` and `pool` roles; `jobGapsByPhase`; `store.ts` `View`, `matrix`, `fitPool`, `toggleKeep`.

## 3. PP-C: find a plant, know a plant

**Outcome.** One search finds plants by name in any of the 11 languages, by scientific name or by a job word, grouped by how they fit the place; filters each say the decision they serve; Details opens on "Against your place"; Swap says what is gained and lost.
**Boards:** `Find`, `FindResults`, `FindType`, `FindJob`, `FindNone`, `FindFilters`, `Paste`, `FindMulti`, `FindDesk`, `FillHole`, `AddAnyway`, `Details`, `DetailsMore`, `DetailsDesk`, `Swap`, `Correction`, `DarkFind`, `DarkDetails`.
**Inventory rows:** C8, E5, E15, E16, E19, F1–F18, F20, F21, G1, G2, H1–H7, I1, L3, P14 (today's period), P16, P33, P34 (with "Holds by" from PP-B), P38, P40.
**Commit 0:** `AddPreset` without `cell` (`types.ts:490-495`); `SheetKind` (`store.ts:26`) renamed for Find; role `find` replaces `sheets`; `src/lib/consortium/confidence.ts` key table (empty map); the 11 parked markers stay parked until each stream's first commit; the store's mark lines handed to c2.

| Stream | Owns | Tests first |
|---|---|---|
| **c1 Find** | `views/find/Find*.tsx`, `views/find/Filters*.tsx`, `views/find/paste.ts` (from `views/Add.tsx`, `views/paste.ts`, `views/Paste.tsx`), `rules/find-query.ts` (replaces `rules/list-query.ts`), `data/search.ts`, `views/Sheets.tsx`, `views/kit/sheet.tsx`, `StageBar`'s Add helpers; prefix `consortium.find.` | Unit: `find-query` groups fits / needs a second look (level `look` or a toxic or invasive warning) / outside its range / not checked; a job word in each of 11 locales finds its job; every filter returns the count it could not judge; search over every locale's names through `searchIndex`, plus canopi-data D2a's vernacular synonyms when installed. Browser: F1–F5 (restored); PP-C1 a French name on the English page finds the plant; PP-C2 no result → close spellings, the other lists, "Ask us to add it"; PP-C3 "Select several" adds three plants with one toast and one Undo; PP-C4 an invasive plant is added with one tap and its warning, a plant outside its range asks "Add it anyway?" (DEC:58, DEC:89) |
| **c2 One plant** | `views/details/**`, `views/find/Swap.tsx`, `views/Correction.tsx`, `views/PlantMarks.tsx`, `views/kit/flags.ts`, core `confidence.ts`, `conflicts.ts` (misfit into the verdict), `store.ts` (mark lines, `FlagScene`), `types.ts` (`SiteFitMessage`), `scripts/consortium-p5-seams.test.mjs:69-70`, `.dependency-cruiser.cjs`, `scripts/quality/arch-rules.test.mjs`; deletes `marks.ts`, `mark-providers.ts`, `range-marks.ts`, `future-marks.ts`, then `site-marks.ts` and `rules/site-fit.ts` last; `index.ts` stops exporting `range`; L10 → `error`; prefix `consortium.details.` (the confidence terms under it) | Unit: C1, C2, C3 (restored, rewritten); `fitLine` for each factor and level; flag lines in Find, Swap, Paste, Details and print match `fitLine`. Browser: C4, C5, C6 (restored); PP-C5 Mendoza: a plant at the dry edge shows its band, the place's value and the limiting measure first; PP-C6 Swap lists what each candidate also fills and what it leaves empty, with its fit line |

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
| **d2 Take it with you** | `views/take/**` (from `views/later.ts`, `later-chunk.ts`, `Share.tsx`, `PrintSheet.tsx`), `canopi-file.ts`, `print.css`, `scripts/consortium-canopi-file.test.mjs`; prefix `consortium.take.` | Unit: `canopiFile` writes a root `palette: { plotM2, period, spacing }` object and still opens without it; a schema test against the vendored app schema; "Copy the list of plants" text. Browser: PP-D3 "Send the link to my computer" holds the place; PP-D4 print of 12 plants shows the planting order and heights to scale, 25 plants the table only (DEC:68, BT-8 kept); PP-D5 the Take sheet says the plan values are "kept in the file for later" |

**Budgets:** `plan` ≤ 10 KB, `take` ≤ 8 KB. **Probe (d1):** share of plants with `width_max_m` per list on the pinned export; under half in any list → the plan leads with "No size recorded for n of m" and the coordinator is told before the screen is built.
**Risks:** counts read as advice: every count line carries "equal shares, adjust in Canopi". **Deletes:** the `later` name and role.

## 5. PP-E: later climates

**Outcome.** A switch (Today / 2041–2070 / 2071–2099) redraws the page for a period: which plants leave their range, which holes open, a picture of all plants against the limiting measure, and replacements that hold, including plants from the hotter climate the place moves toward, marked "estimate".
**Boards:** `Future`, `RangeDesk`, `RangePhone`, `SiteMendoza`, `SiteKiambu` and `PlaceDesk` (place in figures), `Swap` ("Only plants that hold"), `Toasts` (emissions picker). **Inventory rows:** M1–M4, F11, F12, D13, P13, P15, P35, P41.
**Commit 0:** role `climate`; `hotterZone(lookup, period, scenario): ClimateZone | null` in `site-climate.ts` (Köppen zone of the later slot, `koppenZone` `:56-63`).

| Stream | Owns | Tests first |
|---|---|---|
| **e1 The period switch** | core `verdict.ts` (later periods), `holes.ts` (members `outside` stop filling), `site-climate.ts` (`hotterZone`), `views/palette/PeriodSwitch.tsx`, `views/find/Swap.tsx` (filter), `store.ts`; prefix `consortium.period.` | Unit (`verdicts.json`, `holes.json`): a climax tree judged for 2071–2099, a 3-year plant for today whatever the switch says (`ownYears`); a member outside by 2041–2070 opens its job hole from that period; 3 of 4 scenarios → `agree: 3, of: 4`; `hotterZone` for Lyon, Seville, Kiambu; canopi-data D2b's Yakutsk and Riyadh rows make the two todo tests pass (owner of making them pass: e1). Browser: PP-E1 Seville: 2041–2070, two plants marked as leaving, a hole appears, Swap offers "Only plants that hold by 2041–2070"; PP-E2 the period is in the link (`y`), the scenario is not; PP-E3 no location: the switch says it needs your place |
| **e2 The climate picture** | `rules/picture-climate.ts`, `views/climate/**`; deletes `views/future/**`, `views/FutureSlot.tsx`, `StageBar`'s last helpers; `index.ts` stops exporting `future` in the same commit; prefix `consortium.climate.` | Unit: one row per plant, band low–high, three place markers, sorted by margin; place in figures per period with plant counts. Browser: PP-E4 Mendoza: the picture and its table agree; PP-E5 the `climate` chunk refused: page and switch still work |

**Budgets:** `climate` ≤ 8 KB; `future` role deleted; `verdict` rechecked. **Probe (e1):** `hotterZone` on the pinned tiles for the nine places and the number of range-complete plants each hotter list offers (canopi-data ask DATA-10); a place whose hotter zone has no list uses `NEAREST_LISTS`.
**Risks:** four scenarios recomputed on every switch: the shown scenario first, the spread after. Every later-period line names the scenario count, so the switch never reads as a forecast.

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
| **g1 The year at your place** | core `season.ts`, `holes.ts` (kinds `cool`, and `flowering` from same-hemisphere records only), `rules/picture-year.ts`, `rules/months.ts` (moved from `views/layers.ts` with Details' import), `views/year/**`, `scripts/vectors/season.json`; prefix `consortium.year.` | Unit (`season.json`): average night low of the coldest month ≥ 15 °C → no cool season, the dry months are the picture; < 0 °C → winter rest; between → cool growing season (owner, revision 2); months recorded in the other hemisphere are labelled "recorded elsewhere", never shifted (permanent); flowering states recorded / not recorded / recorded elsewhere, "n of m recorded", never a pass; cooler-months candidates ordered `active_growth_period` → `sowing_months` (Temperate, Sep–Nov, "in Britain") → the rest "no season on record", judged on `tmin_cold` only. Browser: PP-G1 Recife: no winter, a dry-season bar; PP-G2 Oulu: winter rest; PP-G3 a Mediterranean place: "Cooler months" lists candidates in that order; PP-G4 `layerValues` fails: the picture says so with Reload |
| **g2 Month masks** (only once canopi-climate ships CLIM-2) | `src/lib/climate/model.js`, `lookup.ts`, `src/data/climate-release.json`, core `types.ts` `SitePeriod` | `npm run test:vectors` on the new release; `dryMask` bit count equals `dryMonths` for the nine places; `cool_mask` never decides whether a place has a cool season |

**Budgets:** `year` ≤ 10 KB. **Probe (g1):** bloom-month coverage per list on the pinned export and how many records carry a scope other than the list's region; under a third recorded → the picture leads with the season bar and folds flowering.
**Risks:** without CLIM-2 the dry season has a length and no months ("Which months: not yet"). Tropical places never get a temperate year: tested at Recife, Kumasi and Manaus first.

## 8. Not in these pushes (stay "later", each with its inventory row)

Q1 watering and ±3 °C adjustments (F4, link v6), Q2 replacements with the crossing decade (F2), Q3 plan as CSV and the methods page (F1b), Q4 suggestion by goal (F3, needs D8), Q5 fire risk (F6), Q7 "native here" and "likely" soil fit (P5.2).

## 9. Stream brief (the coordinator fills one per stream)

The implementing agent (Opus 5.5 medium; Fable 5.2 only advises) gets, and needs nothing else: (1) the outcome in one sentence, its boards (reference for content and wording, not markup) and inventory rows; (2) read first: `CLAUDE.md`, this concept's push section, the architecture sections named, `okf context --path` for each owned folder, ADR-1, the owner answers file; (3) worktree `canopi-website-wt/<stream>`, branch `pp/<letter>-<stream>` cut from commit 0, owned paths from the owners file, locale prefix and edits, the seams it must not change (stop and report if one is wrong); (4) tests first as markers with the stream id, inherited markers restored from 648baf2; (5) the first-commit probe and its threshold (stop and report on failure); (6) rules: layers, one owner per concept, pictures as pure models plus a table, every state (loading, empty, failed with a way out, unknown never shown as a fit), warnings in words with an icon never hiding a plant, never temperate by default, tokens from the existing styles, no Worker, server call or storage key beyond the plan's, its chunk's cap; (7) gates, each capped, one at a time; browser and build runs only in the coordinator's slot; `okf impact` and `check`; (8) stop and report when a seam does not fit, a board and the plan disagree, a probe fails, a budget cannot be met, or a test passes only by weakening it; (9) a final report: outcome, probe figure, commits, tests and markers, gates with sizes, boards, locale key counts, concepts, open points.
