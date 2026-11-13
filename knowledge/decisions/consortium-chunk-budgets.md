---
type: Architecture Decision
title: Consortium per-chunk caps and first-view ratchet (ADR-2)
description: The consortium page caps each built chunk by role and the first run, keeps no total cap, and ratchets time to first view from nightly runner medians.
tags: [consortium, performance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T15:45:00Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:47Z }
sources:
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:53c295f09b3c0bc7
    last_modified: 2026-11-13T14:45:18Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:0ae4f685772e08b7
    last_modified: 2026-11-13T14:45:18Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:c6e5a6214d2abebc
    last_modified: 2026-11-13T12:33:29Z
  - id: sheet-tsx
    resource: ../../src/islands/consortium/views/kit/sheet.tsx
    title: src/islands/consortium/views/kit/sheet.tsx
    digest: sha256:fbdf09611bf250a1
    last_modified: 2026-11-13T09:54:42Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:4cb69b1de23bccb2
    last_modified: 2026-11-13T14:25:59Z
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
enforced_by: [scripts/check-built-site.mjs, scripts/built-modules.test.mjs]
---

ADR-2 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, design check A14, A7, A8; written in commit 0, 2026-11-13). Applied by stream B4 at the chunk-4 merge (coordinator row "E6 B4 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)); chunk 5 lowers the first-run cap to the measured value plus slack. Enforced by `scripts/check-built-site.mjs` on every locale's consortium page; the time-to-first-view ratchet by `scripts/browser/consortium-timing.mjs --ratchet` in the nightly workflow.

## Context

Before B4 the consortium page had a first-run cap (43 KB gzip, 40 KB from the chunk-3 merge), an island sum (`ISLAND_BUDGET`: 62 KB, raised to 63 and then 65 KB at the chunk-2 and chunk-3 merges as K3's split added per-chunk overhead) and a features sum (`FEATURES_BUDGET`, 30 KB together). The sums grew with every lazy chunk the reader may never load, and hid one chunk swelling behind another shrinking.

## Decision

- **Per-chunk caps, no total cap.** `ISLAND_BUDGET` and `FEATURES_BUDGET` are gone. Each on-demand part has a role in `ROLE_ENTRIES` (`scripts/built-modules.mjs`, the one list: the P5 features `location`, `markProviders`, `future`, `pool`, `likely`, `native`, `range`, and the E6 lazy parts `details`, `sheets`, `later`, `suggest`). Its cost is what a first use fetches: the role chunk and its static imports that the page has not already loaded (`onDemandChunks(...).costs`; another role chunk it imports statically is costed on its own).
- **Caps** (`ROLE_CAPS` in `check-built-site.mjs`): each role's measured cost at the B4 build (gzip -9) plus 0.5 KB, rounded up to 0.1 KB, never above the A14 maximum; an empty role gets its maximum.

| Role | Cap (gzip) | Measured at B4 | A14 maximum |
|---|---|---|---|
| first run (the island entry and its static imports), `FIRST_RUN_BUDGET` | 38 KB (40 KB from the chunk-3 merge to the chunk-5 exit) | 38,538 B (37.6 KB) at the E6 chunk-5 exit; 38,836 B (~37.9 KB) at the E6 hand-off build, 76 B under the cap: the next feature that adds to the first run needs a coordinator row to raise it | measured rounded up to the next 0.5 KB |
| `location` | 11.8 KB | 11,493 B | 20 KB (also: the location part with what only it reaches ≤ 20 KB) |
| `markProviders` | 2.9 KB | 2,375 B (with the chunk it shares with `future`) | 12 KB |
| `future` | 2.8 KB | 2,275 B | 12 KB |
| `pool` | 1.4 KB | 891 B | 12 KB |
| `range` | 1.6 KB | 1,100 B | 12 KB |
| `likely`, `native` | 12 KB | no chunk (S5e) | 12 KB |
| `details` | 6.7 KB | 6,296 B | 8 KB |
| `sheets` (each) | 6.3 KB | largest Paste 5,933 B (Add 2,414, Correction 2,380, Swap 1,190) | 8 KB |
| `later` | 8 KB | 7,831 B (0.35 KB headroom: F1a adds lazy parts rather than growing it) | 8 KB |
| `suggest` | 8 KB | own chunk since R4's `loadSuggest` (core `index.ts`; off the first run, loaded once a database is open); 1.8 KB at the E6 hand-off build (the cap was set before it had a chunk) | 8 KB |
| MapLibre with its worker and CSS | 330 KB | — | 330 KB |

- A part above its cap is a coordinator row, never a silent raise.
- Every role has a cap and every cap a role; `markProviders`, `future`, `details`, `later`, `range`, `suggest` and `pool` must have exactly one chunk each (suggest and pool since the E6 hand-off), `sheets` four.
- **An island chunk with no role fails the build**: every island chunk is first run, the sqlite glue's (and its static imports), a part's cost or MapLibre's.
- No role chunk is in the first run.
- **Sheet and Details imports**: a `details` or `sheets` chunk statically imports only first-run chunks (and the page-wide chunks the first run imports), never another sheet's or the Details chunk (tightened at the E6 hand-off, A): `views/lazy.tsx` `retryable` mends the part's own chunk only, and Chromium never refetches a failed module, so a failed shared chunk would break every sheet until Reload; `kit/sheet.tsx` `shared` keeps `flags` and `list-query` in the first run, and the correction drafts live in the first run (`views/kit/correction.ts`).
- **Finding the island entry**: `islandChunks` takes the one chunk holding the bare `"ct-root"` literal (main.ts's own `getElementById`; an entry module's code is always in its entry chunk). It no longer also requires `"ct-data"`, whose reader (`views/kit/page.ts`) sits in the entry only while Rollup inlines it there (E6 hand-off H).
- **No late stylesheet**: no island chunk's `__vite__mapDeps` preload list names a CSS file (MapLibre's CSS aside), read from the built output.
- **Modulepreload (A5, L5)**: consortium pages preload only what the first view awaits (`modulepreloadChunks`: the page script's static imports, the island entry and its static imports, the data loader with the sqlite glue); no part, feature or MapLibre chunk. The check asserts the first run and glue are preloaded and no lazy chunk is (from the graph and roles; the exact list comparison was dropped as circular).
- **Test hook**: the `testHook` role (`test-hook.ts`) exists only in the browser-test build; a production build with it fails. Since E6 chunk 5 no build preloads it (`astro.config.mjs` passes no extra chunk to `modulepreloadChunks`): main.ts awaits it with `#ct-root` `aria-busy`, and the browser tests that read Start wait for the render (coordinator row "E6 chunk-5 merge choices"). E6-2 leaves the role out of the lazy parts it checks.
- **First-view ratchet.** The mark `ct:matrix` becomes `ct:first-view`, emitted where the consortium is first on screen (the matrix today, Palette in F1a); R4 renamed it in Matrix.tsx, and the timing script and browser tests read only `ct:first-view` (the `ct:matrix` fallbacks dropped at the R4 merge). `consortium-timing.mjs --ratchet scripts/browser/timing.json` compares cold and warm medians per profile (desktop, phone): above a value a warning, above 1.5× exit 1. The file ships with null values (not compared; a `::warning::` annotation when all are null) until the coordinator copies the first nightly runner's `timing-json:` line after push B. Values come from CI runner runs only, never local ones.

## Consequences

- Adding a lazy chunk costs nothing in the first run beyond its hashed name; moving code into a lazy part lowers what the first view waits for.
- A new lazy entry must be named in `ROLE_ENTRIES` (and capped in `ROLE_CAPS`), or the build fails.
- The roles file keeps its `features` key because the browser harness reads it.
