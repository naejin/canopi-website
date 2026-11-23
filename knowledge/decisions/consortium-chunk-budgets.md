---
type: Architecture Decision
title: Consortium per-chunk caps and first-view ratchet (ADR-2)
description: The consortium page caps each built chunk by role and the first run, keeps no total cap, and ratchets time to first view from nightly runner medians.
tags: [consortium, performance]
generated: { by: antigravity/gemini-3-pro, at: 2026-11-23T21:06:25Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-18T04:53:14Z }
  - { by: antigravity/gemini, at: 2026-11-23T12:36:25Z }
sources:
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:eeaab36bba2abe93
    last_modified: 2026-11-23T21:01:37Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:7eb74c8505c7b909
    last_modified: 2026-11-23T20:58:01Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:3a8eff8f51600f86
    last_modified: 2026-11-23T20:58:01Z
  - id: sheet-tsx
    resource: ../../src/islands/palette/views/kit/sheet.tsx
    title: src/islands/palette/views/kit/sheet.tsx
    digest: sha256:79cc5bbaf0b55518
    last_modified: 2026-11-23T20:58:01Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:df1d6414f82153a6
    last_modified: 2026-11-23T21:04:15Z
  - id: timing-json
    resource: ../../scripts/browser/timing.json
    title: scripts/browser/timing.json
    digest: sha256:eac4e0b9cfa86a83
    last_modified: 2026-11-13T11:02:09Z
  - id: nightly-yml
    resource: ../../.github/workflows/nightly.yml
    title: .github/workflows/nightly.yml
    digest: sha256:f461e1c971e04d97
    last_modified: 2026-11-13T03:21:28Z
  - id: app-tsx
    resource: ../../src/islands/palette/App.tsx
    title: src/islands/palette/App.tsx
    digest: sha256:685ec7e12121c7e4
    last_modified: 2026-11-23T20:58:01Z
enforced_by: [scripts/check-built-site.mjs, scripts/built-modules.test.mjs]
---

ADR-2 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, design check A14, A7, A8; written in commit 0, 2026-11-13). Applied by stream B4 at the chunk-4 merge (coordinator row "E6 B4 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)); chunk 5 lowers the first-run cap to the measured value plus slack. Enforced by `scripts/check-built-site.mjs` on every locale's consortium page; the time-to-first-view ratchet by `scripts/browser/consortium-timing.mjs --ratchet` in the nightly workflow.

## Context

Before B4 the consortium page had a first-run cap (43 KB gzip, 40 KB from the chunk-3 merge), an island sum (`ISLAND_BUDGET`: 62 KB, raised to 63 and then 65 KB at the chunk-2 and chunk-3 merges as K3's split added per-chunk overhead) and a features sum (`FEATURES_BUDGET`, 30 KB together). The sums grew with every lazy chunk the reader may never load, and hid one chunk swelling behind another shrinking.

## Decision

- **Per-chunk caps, no total cap.** `ISLAND_BUDGET` and `FEATURES_BUDGET` are gone. Each on-demand part has a role in `ROLE_ENTRIES` (`scripts/built-modules.mjs`, the one list: the P5 features `location`, `future`, `pool` (PP-C c2 removed `markProviders` and `range` with the mark providers: the range checks ride in `verdict`), the E6 lazy parts `details`, `sheets`, `later`, `suggest`, PP-B's `palette` and `verdict`, and PP-C's `find`; each entry is `{ entry, chunks }`, the module regex and the chunk count the build must have; PP-C commit 0 dropped the empty `likely` and `native` roles). Its cost is what a first use fetches: the role chunk and its static imports that the page has not already loaded (`onDemandChunks(...).costs`; another role chunk it imports statically is costed on its own).
- **Caps** (`ROLE_CAPS` in `check-built-site.mjs`): each role's measured cost plus 0.5 KB, rounded up to 0.1 KB, never above the A14 maximum; an empty role gets its maximum. Set at the E6 B4 build (2026-11-13) and again at the PP-B exit (2026-11-16, slices "Budgets": every cap measured + 0.5 KB), the table's figures. Until the size-optimisation stage a budget is a tripwire (row "Size budgets are a tripwire", 2026-11-16, in [user decisions](/decisions/consortium-user-decisions.md)): a part over its cap is first checked for a structural mistake, else raised by the measured amount in a dated line.

| Role | Cap (gzip) | Measured at the PP-B exit (2026-11-16) | A14 maximum |
|---|---|---|---|
| first run (the island entry and its static imports), `FIRST_RUN_BUDGET` | 40 KB since the owner's call of 2026-11-14 (PP-B; 38 KB from the E6 chunk-5 exit; 40 KB from the chunk-3 merge to the chunk-5 exit) | 40,953 B, 7 B under the cap (38,836 B at the E6 hand-off build) | measured rounded up to the next 0.5 KB |
| `location` | 11.9 KB | 11,603 B | 20 KB (also: the location part with what only it reaches ≤ 20 KB) |
| `future` | 2.8 KB | 2,282 B | 12 KB |
| `pool` | 1.6 KB | 1,115 B (Place's count line since b1b) | 12 KB |
| `details` | 6.6 KB | 6,220 B | 8 KB |
| `sheets` (each: Swap, Correction since PP-C commit 0) | 6.3 KB | largest 5,881 B | 8 KB |
| `find` (each: `views/find/**`, Find and Paste since PP-C c1) | 8 KB | 5.7 KB (Paste alone, 2026-11-17) | 8 KB |
| `later` | 6.1 KB | 5,667 B | 8 KB |
| `suggest` | 3.8 KB | 3,280 B | 8 KB |
| `palette` | 10.6 KB | 10,263 B (the palette page with Your plants) | 12 KB |
| `verdict` | 2.9 KB | 2,367 B | 12 KB |
| MapLibre with its worker and CSS | 330 KB | 298.8 KB | 330 KB |

- A part above its cap is a coordinator row, never a silent raise.
- **Measured at the PP-C c1+c2 merge** (gzip, 2026-11-17, reported, never a failure: owner row "No hard limits", 2026-11-16): first run 47.0 KB (reference 40); find 17.3 KB (8.0); details 10.7 KB (6.6); verdict 3.4 KB with the future and range chunks it shares (2.9); future 2.8 (2.8); pool 1.8 (1.6). The caps above are now references for the size-optimisation stage.
- Every role has a cap and every cap a role; the chunk count each role must have comes from its `ROLE_ENTRIES` row (`check-built-site.mjs` loops over it since PP-C commit 0): one each for `location` (when its source exists), `future`, `pool`, `details`, `later`, `suggest`, `palette` and `verdict`, two for `sheets` (Swap and Correction), at least one for `find`; `built-modules.test.mjs` checks that each role's regex names a file under `src/`. The sheet-like set the K3 import rule covers is `details`, `sheets` and `find`.
- **An island chunk with no role fails the build**: every island chunk is first run, the sqlite glue's (and its static imports), a part's cost or MapLibre's.
- No role chunk is in the first run.
- **Sheet and Details imports**: a `details`, `sheets` or `find` chunk statically imports only first-run chunks (and the page-wide chunks the first run imports), never another sheet's or the Details chunk (tightened at the E6 hand-off, A): core `retry-import.ts` `retryableImport` mends the part's own chunk only, and Chromium never refetches a failed module, so a failed shared chunk would break every sheet until Reload; `kit/sheet.tsx` `shared` keeps `flags` in the first run, and the correction drafts live in `views/kit/correction.ts` but ship in the Details chunk, their only importer (the correction form gets them as a prop).
- **Finding the island entry**: `islandChunks` takes the one chunk holding the bare `"ct-root"` literal (main.ts's own `getElementById`; an entry module's code is always in its entry chunk). It no longer also requires `"ct-data"`, whose reader (`views/kit/page.ts`) sits in the entry only while Rollup inlines it there (E6 hand-off H).
- **No late stylesheet**: no island chunk's `__vite__mapDeps` preload list names a CSS file (MapLibre's CSS aside), read from the built output.
- **Modulepreload (A5, L5)**: consortium pages preload only what the first view awaits (`modulepreloadChunks`: the page script's static imports, the island entry and its static imports, the data loader with the sqlite glue); no part, feature or MapLibre chunk. The check asserts the first run and glue are preloaded and no lazy chunk is (from the graph and roles; the exact list comparison was dropped as circular).
- **Test hook**: the `testHook` role (`test-hook.ts`) exists only in the browser-test build; a production build with it fails. Since E6 chunk 5 no build preloads it (`astro.config.mjs` passes no extra chunk to `modulepreloadChunks`): main.ts awaits it with `#ct-root` `aria-busy`, and the browser tests that read Start wait for the render (coordinator row "E6 chunk-5 merge choices"). E6-2 leaves the role out of the lazy parts it checks.
- **First-view ratchet.** The mark `ct:matrix` becomes `ct:first-view`, emitted where the consortium is first on screen (the matrix today, Palette in F1a); R4 renamed it in Matrix.tsx, and the timing script and browser tests read only `ct:first-view` (the `ct:matrix` fallbacks dropped at the R4 merge). `consortium-timing.mjs --ratchet scripts/browser/timing.json` compares cold and warm medians per profile (desktop, phone): above a value a warning, above 1.5× exit 1. The file ships with null values (not compared; a `::warning::` annotation when all are null) until the coordinator copies the first nightly runner's `timing-json:` line after push B. Values come from CI runner runs only, never local ones.

## Consequences

- Adding a lazy chunk costs nothing in the first run beyond its hashed name; moving code into a lazy part lowers what the first view waits for.
- A new lazy entry must be named in `ROLE_ENTRIES` (and capped in `ROLE_CAPS`), or the build fails.
- The roles file keeps its `features` key because the browser harness reads it.

## F1a amendments (planned, design check 2026-11-13)

Coordinator row "F1a design-check choices" in [the decisions](/decisions/consortium-user-decisions.md); applied by F1a stream 5 and the budget owner at its merges ([plan](/project/consortium-v2-plan.md) F1a).

- **New lazy role `structure` (A1):** Matrix, PhoneMatrix, matrix-parts, tracks and the matrix-only StageBar parts leave the first run so Palette can be the first view; `ct:first-view` and `prefetchLater` move to a kit `first-view` module both views call. Commit 0 adds the role (cap at its maximum until measured).
- **New lazy role `balance` (A2):** 8 KB as a lazy part or 12 KB as a feature, the coordinator picks; `later` takes nothing new, and its cap falls to measured + 0.5 KB once Side and Jobs leave.
- **First run:** the cap is 38 KB (the plan's "≤ 40 KB" corrected); after stream 1 it becomes measured + 0.5 KB; above 38 KB needs a coordinator row, above 40 KB an ADR-2 change.
- **One budget owner** (the coordinator) for `scripts/built-modules.mjs`, `scripts/check-built-site.mjs`, `astro.config.mjs` and the timing files.
- **Timing (A24):** a new `ct:start` mark (first-visit Start, ≤ 6 s target, warns) beside `ct:first-view`; the sqlite wasm preload is injected after the build and the build asserts its `href` is the fetched URL, with matching `crossorigin` and one wasm.

**Commit 0 (applied 2026-11-13):** `ROLE_ENTRIES` has `structure` (`views/Structure.tsx`) and `balance` (`views/balance/BalanceSlot.tsx`). Both roles are empty and capped at 12 KB, the larger A14 maximum, until the merge that gives each one a chunk sets measured + 0.5 KB. `FIRST_RUN_BUDGET` stays at 38 KB.

## PP-B commit 0a roles and figures (2026-11-14)

- **Roles.** `structure` and `balance` are removed. Three roles are added, each capped at 12 KB:
  - `matrix` (`views/Matrix.tsx` and `Actions.tsx`, which must be 2 chunks)
  - `palette` (`views/palette/Palette.tsx`)
  - `verdict` (`src/lib/palette/verdict.ts`, one chunk)
- **Measured after 0a** (gzip -9, matrix behind `lazyPart`):
  - first run 35.5 KB (36,396 B) of 38 KB, down from 38.0 KB at f1a/int
  - matrix 5.5 KB, verdict 0.2 KB, details 6.4 of 6.7 KB
- **Over its cap:** the later part is 8.7 KB against 8.0 KB. The cause is `views/tracks.ts`, now a chunk shared by the matrix and the later views (about 0.8 KB).
  - The cap was not raised. It needs a coordinator row, or tracks' list helpers moved out of the later views (PlantList and Jobs, which chunk 0 does not own).
  - Commit 0a' deletes `tracks.ts` with the matrix and the `matrix` role (owner, 2026-11-14, "Delete first"; [user decisions](/decisions/consortium-user-decisions.md)), so the cap stays 8 KB and the first run and every role are re-measured after 0a'; `Actions` returns to the first run until b2 hosts it.
- **Measured after 0a'** (gzip -9, 2026-11-14): first run 33.2 KB of 38 KB, with `Actions` back in it; later 5.3 of 8.0 KB (back under its cap with `tracks.ts` gone); details 6.3 of 6.7; sheets 5.7 of 6.3; location 11.2 of 11.8; markProviders 2.3 of 2.9; future 2.2 of 2.8; pool 0.8 of 1.4; range 1.1 of 1.6; suggest 1.8 of 8.0; verdict 0.2 of 12; palette none. The `matrix` role is deleted. No cap was raised.

- **Measured after PP-B b2 chunk 1** (gzip -9, 2026-11-14): first run 35.0 KB of 38 KB (kit/fit.tsx held there through kit/sheet.tsx `shared`, which Add reads); palette 5.2 of 12.0 KB; verdict 2.3 of 12.0 KB; later 5.3 of 8.0; sheets 5.7 of 6.3; details 6.3 of 6.7. The palette page is a retryable part (`lazyPart(..., { retry: true, page: true })`); `page` keeps the later test faults off it.
- **Owner call 2026-11-14 (PP-B, revertible):** `FIRST_RUN_BUDGET` 38 → 40 KB, the ADR-2 ceiling. Measured 38.9 KB (gzip -9) after the simplify pass (39.5 KB at the b2 merge: Place's location step +2.8 KB from b1a, the palette shell +3.5 KB from b2, over 33.2 KB at 0a′). Above 40 KB needs an ADR-2 change.

## PP-C chunks 3 and 4 (2026-11-18 to 2026-11-19)

- **Role `figures`** (v14 pf commit 0W, chk #39): `ROLE_ENTRIES` has `figures` (`views/figures/Figures.tsx`, one chunk), behind the shells in `views/figures/slots.tsx`; `ROLE_CAPS` keeps it at 1 KB, the stub's reference from 0W. The panel's real size is reported, never a failure (owner row "No hard limits", 2026-11-16); its stylesheet `figures.css` is page-level (no late stylesheet).
- **First-run kit**: `views/kit/sheet.tsx` `shared` is `{ flagLines, unknownWords, FitLine, fold }`; core `fold.ts` rides the first run because Find and Your plants' search (the palette chunk) both fold names (h3 R12, about 0.4 KB gzip). `astro.config.mjs` `FIRST_RUN_KIT` builds `views/rows.tsx` and `views/kit/more.tsx` untreeshaken in the first run (K3).
- Sizes stay reported only until the speed step after PP-G (owner rows "No hard limits" and "Optimise speed last"); the M14 head-link chain and the site-change barrel re-export are its first candidates.

