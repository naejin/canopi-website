---
type: Architecture Decision
title: Consortium placement origin and factAt (ADR-6)
description: One placement origin on guest and borrowed plants replaces three fields, and views read four site- and period-dependent facts through factAt in the core's source.ts instead of raw traits.
tags: [consortium, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T15:45:17Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T16:08:55Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:948b3150c06fa08d
    last_modified: 2026-11-13T14:45:08Z
  - id: site-marks-ts
    resource: ../../src/lib/consortium/site-marks.ts
    title: src/lib/consortium/site-marks.ts
    digest: sha256:794b69777641c2ce
    last_modified: 2026-11-13T07:02:37Z
  - id: placement-ts
    resource: ../../src/lib/consortium/placement.ts
    title: src/lib/consortium/placement.ts
    digest: sha256:8f7a898e3dc4d6ad
    last_modified: 2026-11-13T14:45:08Z
  - id: source-ts
    resource: ../../src/lib/consortium/source.ts
    title: src/lib/consortium/source.ts
    digest: sha256:19a8b751b1c19196
    last_modified: 2026-11-13T10:58:21Z
  - id: details-tsx
    resource: ../../src/islands/consortium/views/details/Details.tsx
    title: src/islands/consortium/views/details/Details.tsx
    digest: sha256:f75cba06496a7a41
    last_modified: 2026-11-13T10:58:21Z
  - id: decisions-consortium-user-decisions
    resource: /decisions/consortium-user-decisions.md
  - id: placed-ts
    resource: ../../src/lib/consortium/placed.ts
    title: src/lib/consortium/placed.ts
    digest: sha256:faefdfc3640d75cc
    last_modified: 2026-11-13T12:43:29Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:c639f9179f641ff0
    last_modified: 2026-11-13T16:08:25Z
  - id: taxon-of-test
    resource: ../../scripts/consortium-taxon-of.test.mjs
    title: scripts/consortium-taxon-of.test.mjs
    digest: sha256:54ebe58c62317d47
    last_modified: 2026-11-13T15:32:49Z
---

ADR-6 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, written in commit 0, 2026-11-13). Commit 0 added the types only (`src/lib/consortium/types.ts`); stream R4 implemented and wired them, merged in chunk 4 (coordinator row "E6 R4 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)). Core: [Consortium core](/modules/consortium-core.md).

## Context

- Where a plant's placement came from is spread over three fields (`from`, `placedFrom`, `estimate`), and non-guests get stamped too.
- Views read facts straight from `t.traits.*`, though some facts depend on the site and the climate period (owner rule: compute per site and period, or scope with a source). F2, F4 and E7 need one seam to change that without touching every view.

## Decision

- **Placement origin.** One `Taxon.origin?: PlacementOrigin { list: ClimateZone; kind: PlacementKind; guest?: ClimateZone }`, replacing `from`/`placedFrom`/`estimate`. Only a guest (`kind: 'guest'`, added from another climate's list, "Add anyway") or a borrowed placement (`kind: 'borrowed'`, a site of an uncovered climate placed from a nearest curated list, the "estimate" mark) carries it; the climate's own plants are never stamped (`'own'` exists for callers that need a kind for every plant).
- **One reader and writer**, core `placement.ts`: `asGuest(t, list)` (a copy, so the list's record stays unstamped; on a plant already borrowed it keeps the borrowed origin and adds `guest: list`), `guestOf(t)` (`origin.list` for a `guest` kind, else `origin.guest`, else null), `borrowedFrom(t)`, `placementZone(t, climate)` (`origin.list`, else the climate). The PlantSource's `borrowed()` writes the borrowed origin.
- **Borrowed wins over guest, the guest label stays.** A plant that is both (reachable only through a member found in an earlier borrowed pool) keeps its borrowed origin, since its placement, reasons and estimate mark come from that list; since the E6 hand-off (D) the list it was picked in is noted as `origin.guest`, so every view still labels it a guest ("From the X list"). Nothing persisted changed: saves hold only the guests map.
- **Which record a view gets** (`store.ts` `taxonOf`, E6 hand-off re-review 1 and review 4): the member, else the guest's record from the list it was added from (`guestTaxa`, from the consortium's guests map once that list is read), else the chosen climate's own list as read in `pools` (never a guest, even while `store.pool` waits for the range rule), else another climate's list already read, through `asGuest`. A guest is therefore never resolved from the first other list that happens to hold it. Tested by `scripts/consortium-taxon-of.test.mjs`.
- **`factAt`.** `FactAt = (key, taxon, site, period) => FactValues[key] | null`, implemented in core `source.ts` (beside the `PlantSource` that stores the facts) with `TODAY_PERIOD` `'1991-2020'`. In E6 it returns the stored value whatever the site and period; views read these facts through it instead of `t.traits.*`. Only Details reads it so far (water need); F2 routes site fit and range through it and computes per site and period behind the same signature, and E7 reads scoped stored facts (most specific wins).
- **Its fact list, and only it** (`FactKey`): `life_cycle` (`annual`, `grown_as_annual` or `perennial` from the traits), `cold_limit` (`tminColdC`, `weak`), `heat_limit` (`tmaxWarmC`), `water_need` (`drought` and `moisture`, each `string | null`; widened from `drought: string` in R4 so a plant with only a moisture value still answers, and null only when both are unknown). Other traits stay direct reads; a fact joins the list only when a step needs it site- or period-dependent.
- **`SiteFitMessage`** `{ id, about, severity, asks, key, vars?, state? }`: one shape for site-fit lines (light, room, climate) so the views stop composing them. In use since E6 R2: core `site-marks.ts` `siteFitMessages` builds them, `rules/site-fit.ts` and `views/kit/flags.ts` word the flags from them, and `siteMarks` turns the notes (`state` set) into marks.

## Consequences

- No on-screen change in E6; each type is the named seam for F2/F4/E7, which is why they pass the usefulness test.
- `placed.ts` `placeFor` and `firstPlaced` return `{zone, placement}` / `{zone, value}` with no `estimate` flag since E6 chunk 5: the origin is the one place the estimate lives.
- Views test the origin through the helpers (`guestOf` for the guest tag and `is-guest` class, `borrowedFrom` for the estimate mark and the Why line), and the correction's `placement_estimate` is `origin.kind === 'borrowed'`.
- `factAt` returning `null` means unknown, never a misfit.
