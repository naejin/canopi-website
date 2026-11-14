---
type: Architecture Decision
title: Consortium island layers (ADR-1)
description: The consortium island's layers L0-L4, the import rules dependency-cruiser enforces (L1-L9, and L10 as warn since PP-B commit 0a) and their severities by stage, so state never imports views and the core imports no UI framework.
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T22:04:59Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-14T22:04:30Z }
sources:
  - id: consortium
    resource: ../../src/islands/consortium
    title: src/islands/consortium/
    digest: sha256:fbe7e6bc276b4b1c
    last_modified: 2026-11-14T21:48:58Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:877b71a79e071642
    last_modified: 2026-11-14T21:28:50Z
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:8165db4fcb8d590c
    last_modified: 2026-11-13T07:53:00Z
  - id: test-seam-d-ts
    resource: ../../src/islands/consortium/test-seam.d.ts
    title: src/islands/consortium/test-seam.d.ts
    digest: sha256:6927df0858d92504
    last_modified: 2026-11-13T10:30:35Z
  - id: site-fit-ts
    resource: ../../src/islands/consortium/rules/site-fit.ts
    title: src/islands/consortium/rules/site-fit.ts
    digest: sha256:0fada07f7575e635
    last_modified: 2026-11-14T21:48:58Z
  - id: suggest-block-ts
    resource: ../../src/islands/consortium/rules/suggest-block.ts
    title: src/islands/consortium/rules/suggest-block.ts
    digest: sha256:bc785e5e9d676b40
    last_modified: 2026-11-13T07:27:10Z
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:d89b0b8086198a1e
    last_modified: 2026-11-14T21:48:21Z
  - id: sgconfig-yml
    resource: ../../sgconfig.yml
    title: sgconfig.yml
    digest: sha256:2c703f0a6786cc90
    last_modified: 2026-11-13T06:47:29Z
  - id: dependency-cruiser-cjs
    resource: ../../.dependency-cruiser.cjs
    title: .dependency-cruiser.cjs
    digest: sha256:29cbaf3dbda18ec2
    last_modified: 2026-11-14T10:56:09Z
  - id: sheets-tsx
    resource: ../../src/islands/consortium/views/Sheets.tsx
    title: src/islands/consortium/views/Sheets.tsx
    digest: sha256:3677ffab554a9095
    last_modified: 2026-11-14T21:28:50Z
  - id: sheet-tsx
    resource: ../../src/islands/consortium/views/kit/sheet.tsx
    title: src/islands/consortium/views/kit/sheet.tsx
    digest: sha256:1bbd681174e63de4
    last_modified: 2026-11-14T21:47:12Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:1049f9dc00bc792a
    last_modified: 2026-11-14T21:28:50Z
  - id: arch-json
    resource: ../../scripts/quality/baselines/arch.json
    title: scripts/quality/baselines/arch.json
    digest: sha256:d909d5cc883162f8
    last_modified: 2026-11-14T10:56:09Z
  - id: test-hook-ts
    resource: ../../src/islands/consortium/test-hook.ts
    title: src/islands/consortium/test-hook.ts
    digest: sha256:55ac26204d4ae1dd
    last_modified: 2026-11-13T13:02:30Z
  - id: arch-rules-test-mjs
    resource: ../../scripts/quality/arch-rules.test.mjs
    title: scripts/quality/arch-rules.test.mjs
    digest: sha256:174d28aca3493758
    last_modified: 2026-11-14T10:56:09Z
enforced_by:
  - scripts/consortium-boundary.test.mjs
  - sgconfig.yml
  - scripts/quality/arch-rules.test.mjs
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
| L2 state-no-views | L3 imports nothing under `views/**`, static or dynamic | error since E6 chunk 5 |
| L3 data-down | `data/**` imports no `views/**`, `state/**`, `store.ts` | error |
| L4 views-core-entry | views import the core only through `src/lib/consortium/index.ts` (and `types.ts`) | error |
| L5 kit-leaf | `views/kit/**` imports no other view, no `store.ts`/`state/**` | error since E6 chunk 5 |
| L6 sheets-not-details | only `views/Sheets.tsx` imports `views/details/**` (dynamically) | error since E6 chunk 5 |
| L7 no-circular | no cycle on the runtime graph (dynamic edges kept, type-only edges dropped), over the island and `src/lib/**`; no allow-list | error since E6 chunk 5 |
| L8 test-hook-entry-only | only `main.ts` imports `test-hook.ts` (guarded by `__CT_TEST_HOOK__`) | error since E6 chunk 5 |
| L9 no-build-scripts-in-src | `src/**` imports nothing from `scripts/**` | error |

dependency-cruiser owns layer direction and cycles; the boundary test owns "core imports stay in the folder" and "no browser globals in core". Neither checks the other's rule.

## Consequences

- One owner per concept (design check §7.1): the zone list (core `zones.ts`, which declares `climateZones`; `types.ts` re-exports it), the search fold (`fold.ts`), the state schema (`state/schema.ts`), the filter rule of Add and the plant list (`rules/list-query.ts`), the Suggest block (`rules/suggest-block.ts`: `needsSite`, `needsRule`, `nothingFits`, read by the store's `suggestMembers` and by PoolSlot), the site-fit vocabulary (core `site-marks.ts` `siteFitMessages`, since the core cannot import the island; `rules/site-fit.ts` keeps the misfits that hold beside the members' canopy), the lazy loader (`views/lazy.tsx`), the number formatter (`src/islands/consortium/format.ts`, enforced by the ast-grep rule `number-format-only-in-format`, `sgconfig.yml`) and names (`views/kit/names.ts`).
- `rules/**` (E6 R2) are pure functions over core types: they import only the core entry, never the store or a view; the store and views pass signals in as arguments (`FlagScene`, `SuggestScene`). `views/kit/flags.ts` renders only: `flagsOfPlant` and `flagScene` live in `store.ts`.
- Feature code is loaded through core loaders (`loadMarkProviders`, `loadRangeRule` (chunk 2: the one import of `range.ts` outside the feature chunks that use it statically), `loadSuggest`), never by state importing a view; where a view owns a chunk, it hands its loader to state (`provideLocationStep` in `state/restore.ts`, given `views/location/load.ts`'s `loadLocationStep` by main.ts before the first render; since E6 S3 no module hands anything over at import).
- After chunk 2: the cycles C1-C5 are gone (L7 still `warn` until chunk 5), `store.ts` no longer imports `views/pool/pool.tsx`, and `src/lib/location/place-search.ts` imports no `@preact/signals` (plain read-only boxes), so L1 holds although its severity in `.dependency-cruiser.cjs` is still `warn`.
- After chunk 3 (K3): L5, L6 and L8 have no findings (severities unchanged until chunk 5). The kit is a leaf: `views/kit/sheet.tsx` takes what closes a sheet and its toast region as props (`onClose`, `toast`) from `views/Sheets.tsx`, the only caller of `SheetDialog`/`SheetFrame`, and imports neither `store.ts` nor `Toast.tsx`; its `shared` object reaches `rules/list-query.ts` (L3, allowed). Only `views/Sheets.tsx` reaches `views/details/**`, through `import()`. Only `main.ts` imports `test-hook.ts`. `scripts/quality/baselines/arch.json` still lists the four keys K3 removed (L5 `kit/sheet.tsx` → `store.ts` and → `Toast.tsx`, L8 `views/Details.tsx` and `views/lazy.tsx` → `test-hook.ts`); the ratchet reports them "baseline stale" (never a failure) until the merge agent rewrites the baseline.
- Since E6 chunk 5 every rule L1–L9 is `error` and `scripts/quality/baselines/arch.json` has no keys; `scripts/quality/arch-rules.test.mjs` asserts each rule's breach is an error and that no `warn` rule is left. A new rule may still land as `warn` with its keys while code catches up (A25). The cycle C5 (`memory.ts` → `views/location/load.ts`) is history: `memory.ts` is deleted.
- Test faults are globals read under `__CT_TEST_HOOK__` (`globalThis.__ctFaults`, read inline by `views/lazy.tsx` each time a part is used); no production module imports the hook, and `test-hook.ts` no longer exports `testFault`.

## L10 (PP-B commit 0a, 2026-11-14)

- `L10-one-verdict` is a warn rule in `.dependency-cruiser.cjs`. It flags a `src/lib/consortium/` module that imports `range.ts`, `future.ts` or `site.ts`.
- These modules are exempt: `range`, `future`, `site`, `verdict*`, `place`, `suggest`, `site-climate`, `matrix`, and `index` (named re-exports).
- `scripts/quality/arch-rules.test.mjs` tests the rule on a fixture. It also prints the modules that read `lookup.periods`; today that is `future.ts`, `site-climate.ts` and `site-today.ts`.
- The five current findings are written to `scripts/quality/baselines/arch.json`: conflicts→site, future-marks→future, marks→range, range-marks→range, site-marks→site. The merge agent rewrites the baseline at each chunk merge.
