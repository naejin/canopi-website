---
type: Architecture Decision
title: Consortium island layers (ADR-1)
description: The consortium island's layers L0-L4, the nine import rules dependency-cruiser enforces and their severities by stage, so state never imports views and the core imports no UI framework.
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T08:06:14Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T03:47:07Z }
sources:
  - id: consortium
    resource: ../../src/islands/consortium
    title: src/islands/consortium/
    digest: sha256:f2e4dc74d87d13af
    last_modified: 2026-11-13T07:37:15Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:bac4369eb6d04d05
    last_modified: 2026-11-13T07:25:07Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:8165db4fcb8d590c
    last_modified: 2026-11-13T07:53:00Z
  - id: test-seam-d-ts
    resource: ../../src/islands/consortium/test-seam.d.ts
    title: src/islands/consortium/test-seam.d.ts
    digest: sha256:44f2d044599ee37a
    last_modified: 2026-11-13T03:03:27Z
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
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:794b69777641c2ce
    last_modified: 2026-11-13T07:02:37Z
  - id: sgconfig-yml
    resource: ../../sgconfig.yml
    title: sgconfig.yml
    digest: sha256:2c703f0a6786cc90
    last_modified: 2026-11-13T06:47:29Z
  - id: dependency-cruiser-cjs
    resource: ../../.dependency-cruiser.cjs
    title: .dependency-cruiser.cjs
    digest: sha256:a490c80ab1fce8f6
    last_modified: 2026-11-13T08:05:03Z
enforced_by: [scripts/consortium-boundary.test.mjs, sgconfig.yml]
---

ADR-1 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, written in its commit 0, 2026-11-13). Architecture of the whole tool: [Consortium v2 architecture](/decisions/consortium-v2-architecture.md).

## Context

The island (`src/islands/consortium/`) grew views that own rules (Add's filter, Suggest's block), state written in 6–8 places, five import cycles (C1–C5: Matrix ⇄ PhoneMatrix, Start ⇄ PoolSlot, Details ⇄ the sheets, `store.ts` → `views/pool/pool.tsx`, `memory.ts` → `views/location/load.ts`, `placed.ts` ⇄ `placement.ts`) and a test hook imported by production modules. Palette, P7a and the export split would each touch all of them.

## Decision

Layers, imports going down or sideways through a layer's entry:

| Layer | Holds |
|---|---|
| L4 views | `src/islands/consortium/views/**` (with `views/kit/**`, the shared leaf parts) |
| L3 island state and rules | `store.ts`, `state/**`, `rules/**`, `focus.ts`, `strings.ts` |
| L2 data adapter | `src/islands/consortium/data/**` |
| L1 core, climate reader, location service | `src/lib/consortium/**`, `src/lib/climate/**`, `src/lib/location/**` |
| L0 seams | core `types.ts`, the test globals in `src/islands/consortium/test-seam.d.ts` |

Rules (dependency-cruiser, `.dependency-cruiser.cjs`, E4; boundary facts in `scripts/consortium-boundary.test.mjs`):

| Rule | Statement | Severity |
|---|---|---|
| L1 lib-no-ui | `src/lib/{consortium,climate,location}/**` import no `preact`, `@preact/signals`, `src/islands/**`, `src/components/**` | error since Q3 (E6 chunk 3) |
| L2 state-no-views | L3 imports nothing under `views/**`, static or dynamic | warn, error at E6's exit |
| L3 data-down | `data/**` imports no `views/**`, `state/**`, `store.ts` | error |
| L4 views-core-entry | views import the core only through `src/lib/consortium/index.ts` (and `types.ts`) | error |
| L5 kit-leaf | `views/kit/**` imports no other view, no `store.ts`/`state/**` | warn, error at E6's exit |
| L6 sheets-not-details | only `views/Sheets.tsx` imports `views/details/**` (dynamically) | warn, error at E6's exit |
| L7 no-circular | no cycle on the runtime graph (dynamic edges kept, type-only edges dropped), over the island and `src/lib/**`; no allow-list | error at E6's exit |
| L8 test-hook-entry-only | only `main.ts` imports `test-hook.ts` (guarded by `__CT_TEST_HOOK__`) | warn, error at E6's exit |
| L9 no-build-scripts-in-src | `src/**` imports nothing from `scripts/**` | error |

dependency-cruiser owns layer direction and cycles; the boundary test owns "core imports stay in the folder" and "no browser globals in core". Neither checks the other's rule.

## Consequences

- One owner per concept (design check §7.1): the zone list (core `zones.ts`, which declares `climateZones`; `types.ts` re-exports it), the search fold (`fold.ts`), the state schema (`state/schema.ts`), the filter rule of Add and the plant list (`rules/list-query.ts`), the Suggest block (`rules/suggest-block.ts`: `needsSite`, `needsRule`, `nothingFits`, read by the store's `suggestMembers` and by PoolSlot), the site-fit vocabulary (core `site-marks.ts` `siteFitMessages`, since the core cannot import the island; `rules/site-fit.ts` keeps the misfits that hold beside the members' canopy), the lazy loader (`views/lazy.tsx`), the number formatter (`src/islands/consortium/format.ts`, enforced by the ast-grep rule `number-format-only-in-format`, `sgconfig.yml`) and names (`views/kit/names.ts`).
- `rules/**` (E6 R2) are pure functions over core types: they import only the core entry, never the store or a view; the store and views pass signals in as arguments (`FlagScene`, `SuggestScene`). `views/kit/flags.ts` renders only: `flagsOfPlant` and `flagScene` live in `store.ts`.
- Feature code is loaded through core loaders (`loadMarkProviders`, `loadRangeRule` (chunk 2: the one import of `range.ts` outside the feature chunks that use it statically), `loadSuggest`), never by state importing a view; where a view owns a chunk, it hands its loader to state (`provideLocationStep` in `state/restore.ts`, called from `views/location/load.ts`).
- After chunk 2: the cycles C1-C5 are gone (L7 still `warn` until chunk 5), `store.ts` no longer imports `views/pool/pool.tsx`, and `src/lib/location/place-search.ts` imports no `@preact/signals` (plain read-only boxes), so L1 holds although its severity in `.dependency-cruiser.cjs` is still `warn`.
- Test faults are globals read under `__CT_TEST_HOOK__`; no production module imports the hook.
