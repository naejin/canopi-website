---
type: Architecture Decision
title: Consortium per-chunk caps and first-view ratchet (ADR-2)
description: The consortium page caps each built chunk by role and the first run, keeps no total cap, and ratchets time to first view from nightly runner medians.
tags: [consortium, performance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:40:09Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:40:03Z }
sources:
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:a186dcf980c5f47e
    last_modified: 2026-11-13T03:03:27Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:35715731544c0e23
    last_modified: 2026-11-13T03:40:44Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:1dd6abb876c88df0
    last_modified: 2026-11-11T22:31:55Z
---

ADR-2 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, design check A14, A7, A8; written in commit 0, 2026-11-13). Applied by stream B4 in chunk 4 and the exit in chunk 5; until then `scripts/check-built-site.mjs` keeps today's sums.

## Context

The consortium page had a first-run cap (43 KB gzip), an island sum (`ISLAND_BUDGET`, 62 KB) and a features sum (`FEATURES_BUDGET`, 30 KB together). The sums grow with every lazy chunk the reader may never load, and hide one chunk swelling behind another shrinking. Chunk roles come from `chunkRoles()` in `scripts/built-modules.mjs` (features, plus the lazy roles `details`, `sheets`, `later`, `suggest`, `range` added in commit 0).

## Decision

- **Per-chunk caps, no total cap.** `ISLAND_BUDGET` and `FEATURES_BUDGET` go.

| Role | Cap (gzip) |
|---|---|
| first run (modulepreloaded set) | 43 KB through chunk 4; lowered in chunk 5 to the measured value plus 0.3 KB slack per lazy chunk (≤ 40 KB) |
| each of `sheets`, `details`, `later`, `suggest` | 8 KB |
| each feature except `location` | 12 KB |
| `location` | 20 KB |
| MapLibre | 330 KB |

- A chunk above its cap is a coordinator row, never a silent raise.
- No CSS asset attached to a lazy consortium chunk (a late stylesheet flashes).
- **First-view ratchet.** The performance mark `ct:matrix` becomes `ct:first-view`, emitted where the consortium is first on screen (the matrix today, Palette in F1a). `scripts/browser/consortium-timing.mjs --ratchet scripts/browser/timing.json` holds cold and warm medians per profile: warn above, exit 1 only above 1.5x. Ratchet values come from CI runner runs (nightly), never local ones.

## Consequences

- Adding a lazy chunk costs nothing in the first run beyond its hashed name.
- Each role must exist in the build for its cap to apply: an empty role is reported by the browser specs that need it (E6-3…7).
