---
type: Architecture Decision
title: Consortium per-chunk caps and first-view ratchet (ADR-2)
description: The consortium page caps each built chunk by role and the first run, keeps no total cap, and ratchets time to first view from nightly runner medians.
tags: [consortium, performance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T10:18:13Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:40:03Z }
sources:
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:9834cc1ed62755f8
    last_modified: 2026-11-13T07:22:58Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:6c135be340fc4375
    last_modified: 2026-11-13T10:14:16Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:1dd6abb876c88df0
    last_modified: 2026-11-11T22:31:55Z
  - id: sheet-tsx
    resource: ../../src/islands/consortium/views/kit/sheet.tsx
    title: src/islands/consortium/views/kit/sheet.tsx
    digest: sha256:fbdf09611bf250a1
    last_modified: 2026-11-13T09:54:42Z
---

ADR-2 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, design check A14, A7, A8; written in commit 0, 2026-11-13). Applied by stream B4 in chunk 4 and the exit in chunk 5; until then `scripts/check-built-site.mjs` keeps today's sums, temporary and revertible (coordinator rows in [the decisions](/decisions/consortium-user-decisions.md)): the island sum `ISLAND_BUDGET` was raised from 62 to 63 KB at the chunk-2 merge (R2's rule modules sat in the main chunk) and to 65 KB at the chunk-3 merge (64.1 KB measured: K3's split of Details and the sheets into their own chunks adds per-chunk overhead to the sum), while the first-run cap `FIRST_RUN_BUDGET` dropped from 43 to 40 KB at the chunk-3 merge (38.7 KB measured once Details left the first run). B4 also adds a build assertion that a `details` or sheet chunk statically imports only first-run (or sheet/details) chunks (`kit/sheet.tsx` `shared` keeps `flags` and `list-query` in the first run), and its role finder must survive Correction importing `drafts` (until then Correction takes `drafts` as a prop). The first-run assertion's message there still says "the budget is 43 KB" (the island sum's message reads `ISLAND_BUDGET`).

## Context

The consortium page had a first-run cap (43 KB gzip), an island sum (`ISLAND_BUDGET`, 62 KB) and a features sum (`FEATURES_BUDGET`, 30 KB together). The sums grow with every lazy chunk the reader may never load, and hide one chunk swelling behind another shrinking. Chunk roles come from `chunkRoles()` in `scripts/built-modules.mjs` (features, plus the lazy roles `details`, `sheets`, `later`, `suggest` added in commit 0; `range`, added there too, moved into `P5_FEATURE_ENTRIES` at chunk 2 so its chunk, loaded by core `loadRangeRule()`, is never modulepreloaded and counts with the features, design check A10).

## Decision

- **Per-chunk caps, no total cap.** `ISLAND_BUDGET` and `FEATURES_BUDGET` go.

| Role | Cap (gzip) |
|---|---|
| first run (modulepreloaded set) | 40 KB since the chunk-3 merge (43 KB before); lowered in chunk 5 to the measured value plus 0.3 KB slack per lazy chunk (≤ 40 KB) |
| each of `sheets`, `details`, `later`, `suggest` | 8 KB |
| each feature except `location` (`range` included) | 12 KB |
| `location` | 20 KB |
| MapLibre | 330 KB |

- A chunk above its cap is a coordinator row, never a silent raise.
- No CSS asset attached to a lazy consortium chunk (a late stylesheet flashes).
- **First-view ratchet.** The performance mark `ct:matrix` becomes `ct:first-view`, emitted where the consortium is first on screen (the matrix today, Palette in F1a). `scripts/browser/consortium-timing.mjs --ratchet scripts/browser/timing.json` holds cold and warm medians per profile: warn above, exit 1 only above 1.5x. Ratchet values come from CI runner runs (nightly), never local ones.

## Consequences

- Adding a lazy chunk costs nothing in the first run beyond its hashed name.
- Each role must exist in the build for its cap to apply: an empty role is reported by the browser specs that need it (E6-3…7).
