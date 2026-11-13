---
type: Architecture Decision
title: Consortium placement origin and factAt (ADR-6)
description: One placement origin on guest plants replaces three fields, and views read four site- and period-dependent facts through factAt instead of raw traits.
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T02:55:03Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:1dc4e5d47b9db095
    last_modified: 2026-11-13T02:48:56Z
---

ADR-6 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, written in commit 0, 2026-11-13). Commit 0 adds the types only (`src/lib/consortium/types.ts`); stream R4 implements and wires them in chunk 4. Core: [Consortium core](/modules/consortium-core.md).

## Context

- Where a plant's placement came from is spread over three fields (`from`, `placedFrom`, `estimate`), and non-guests get stamped too.
- Views read facts straight from `t.traits.*`, though some facts depend on the site and the climate period (owner rule: compute per site and period, or scope with a source). F2, F4 and E7 need one seam to change that without touching every view.

## Decision

- **Placement origin.** One `PlacementOrigin { list: ClimateZone; kind: PlacementKind }` on `Taxon`, replacing `from`/`placedFrom`/`estimate`. Only a plant placed from another climate's list (a guest) carries it; non-guests are not stamped.
- **`factAt`.** `FactAt = (key, taxon, site, period) => FactValues[key] | null`. In E6 it returns the stored value; views read these facts through it instead of `t.traits.*`. Later steps make it site- and period-dependent behind the same signature.
- **Its fact list, and only it** (`FactKey`): `life_cycle`, `cold_limit`, `heat_limit`, `water_need`. Other traits stay direct reads; a fact joins the list only when a step needs it site- or period-dependent.
- **`SiteFitMessage`** `{ id, about, severity, asks, key, vars? }`: one shape for site-fit lines (light, room, climate) so the views stop composing them.

## Consequences

- No on-screen change in E6; each type is the named seam for F2/F4/E7, which is why they pass the usefulness test.
- `factAt` returning `null` means unknown, never a misfit.
