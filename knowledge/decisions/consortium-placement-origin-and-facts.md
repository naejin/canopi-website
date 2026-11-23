---
type: Architecture Decision
title: Consortium placement origin and factAt (ADR-6)
description: One placement origin on guest and borrowed plants replaces three fields, and views read four site- and period-dependent facts through factAt in the core's source.ts instead of raw traits.
tags: [consortium, architecture]
generated: { by: antigravity/gemini-3-pro, at: 2026-11-23T21:06:26Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T10:15:34Z }
  - { by: antigravity/gemini, at: 2026-11-23T12:36:26Z }
sources:
  - id: types-ts
    resource: ../../src/lib/palette/types.ts
    title: src/lib/palette/types.ts
    digest: sha256:2163e2e956deda1c
    last_modified: 2026-11-23T20:58:01Z
  - id: placement-ts
    resource: ../../src/lib/palette/placement.ts
    title: src/lib/palette/placement.ts
    digest: sha256:8f7a898e3dc4d6ad
    last_modified: 2026-11-23T11:23:11Z
  - id: source-ts
    resource: ../../src/lib/palette/source.ts
    title: src/lib/palette/source.ts
    digest: sha256:9efeeffb336dec8a
    last_modified: 2026-11-23T20:58:01Z
  - id: details-tsx
    resource: ../../src/islands/palette/views/details/Details.tsx
    title: src/islands/palette/views/details/Details.tsx
    digest: sha256:76af5ace5e01491f
    last_modified: 2026-11-23T20:58:01Z
  - id: placed-ts
    resource: ../../src/lib/palette/placed.ts
    title: src/lib/palette/placed.ts
    digest: sha256:4bee0febe945ad89
    last_modified: 2026-11-23T11:29:04Z
  - id: store-ts
    resource: ../../src/islands/palette/store.ts
    title: src/islands/palette/store.ts
    digest: sha256:a2d405853d85b528
    last_modified: 2026-11-23T20:58:01Z
  - id: taxon-of-test
    resource: ../../scripts/consortium-taxon-of.test.mjs
    title: scripts/consortium-taxon-of.test.mjs
    digest: sha256:f0946f5f762740ad
    last_modified: 2026-11-23T20:58:01Z
  - id: verdict-line-ts
    resource: ../../src/lib/palette/verdict-line.ts
    title: src/lib/palette/verdict-line.ts
    digest: sha256:a169b614d21093dd
    last_modified: 2026-11-23T11:23:11Z
---

ADR-6 of the [Consortium v2 plan](/project/consortium-v2-plan.md) (step E6, written in commit 0, 2026-11-13). Commit 0 added the types only (`src/lib/palette/types.ts`); stream R4 implemented and wired them, merged in chunk 4 (coordinator row "E6 R4 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)). Core: [Consortium core](/modules/consortium-core.md).

## Context

- Where a plant's placement came from is spread over three fields (`from`, `placedFrom`, `estimate`), and non-guests get stamped too.
- Views read facts straight from `t.traits.*`, though some facts depend on the site and the climate period (owner rule: compute per site and period, or scope with a source). F2, F4 and E7 need one seam to change that without touching every view.

## Decision

- **Placement origin.** One `Taxon.origin?: PlacementOrigin { list: ClimateZone; kind: PlacementKind; guest?: ClimateZone }`, replacing `from`/`placedFrom`/`estimate`. Only a guest (`kind: 'guest'`, added from another climate's list, "Add anyway") or a borrowed placement (`kind: 'borrowed'`, a site of an uncovered climate placed from a nearest curated list, the "estimate" mark) carries it; the climate's own plants are never stamped (`'own'` exists for callers that need a kind for every plant).
- **One reader and writer**, core `placement.ts`: `asGuest(t, list)` (a copy, so the list's record stays unstamped; on a plant already borrowed it keeps the borrowed origin and adds `guest: list`), `guestOf(t)` (`origin.list` for a `guest` kind, else `origin.guest`, else null), `borrowedFrom(t)`, `placementZone(t, climate)` (`origin.list`, else the climate). The PlantSource's `borrowed()` writes the borrowed origin.
- **Borrowed wins over guest, the guest label stays.** A plant that is both (reachable only through a member found in an earlier borrowed pool) keeps its borrowed origin, since its placement, reasons and estimate mark come from that list; since the E6 hand-off (D) the list it was picked in is noted as `origin.guest`, so every view still labels it a guest ("From the X list"). Nothing persisted changed: saves hold only the guests map.
- **Which record a view gets** (`store.ts` `taxonOf`, E6 hand-off re-review 1 and review 4): the member, else the guest's record from the list it was added from (`guestTaxa`, from the consortium's guests map once that list is read), else the chosen climate's own list as read in `pools` (never a guest, even while `store.pool` waits for the range rule), else another climate's list already read, through `asGuest`. A guest is therefore never resolved from the first other list that happens to hold it. Tested by `scripts/consortium-taxon-of.test.mjs`.
- **`factAt`.** `FactAt = (key, taxon, site, period) => FactValues[key] | null`, implemented in core `source.ts` (beside the `PlantSource` that stores the facts) with `TODAY_PERIOD` `periodIds[0]` (`'1991-2020'`). In E6 it returns the stored value whatever the site and period; views read these facts through it instead of `t.traits.*`. Details (water need), the palette's Things to weigh (water need, grouped by `weigh.ts` `waterNeed`) and `site.ts`'s water check (drought tolerance and moisture use, PP-B b3 fix round 2, verdicts unchanged) read it; F2 routes the rest of site fit and range through it and computes per site and period behind the same signature, and E7 reads scoped stored facts (most specific wins).
- **Its fact list, and only it** (`FactKey`): `water_need` (`drought` and `moisture`, each `string | null`; widened from `drought: string` in R4 so a plant with only a moisture value still answers, and null only when both are unknown). `life_cycle`, `cold_limit` and `heat_limit` were listed until PP-C commit 0 (b3g-5) deleted them: no view read them, and their stored readers cost first-run bytes. Other traits stay direct reads; a fact joins the list with its first reader (F2 for the facts it computes per site and period, E7 for scoped ones).
- **`SiteFitMessage`** `{ id, about, severity, misfit, key, vars?, state? }` (`misfit` was `asks` until the 2026-11-14 "Inform, don't block" row: a misfit warns in words, never asks): one shape for site-fit lines (light, room, climate) so the views stop composing them. In use from E6 R2 to PP-C c2 (core `site-marks.ts` `siteFitMessages`, read by `rules/site-fit.ts`, `views/kit/flags.ts` and `siteMarks`). PP-C c2 (fix round 1 B2) deleted `site-marks.ts` and the marks: the site answers' words are core `verdict-line.ts` `siteLines` (`SiteLine {about, misfit, note?, line}`), read by the verdict lines, the flags and Details.

## Consequences

- No on-screen change in E6; each type is the named seam for F2/F4/E7, which is why they pass the usefulness test.
- `placed.ts` `placeFor` and `firstPlaced` return `{zone, placement}` / `{zone, value}` with no `estimate` flag since E6 chunk 5: the origin is the one place the estimate lives.
- Views test the origin through the helpers (`guestOf` for the guest tag and `is-guest` class, `borrowedFrom` for the estimate mark and the Why line), and the correction's `placement_estimate` is `origin.kind === 'borrowed'`.
- `factAt` returning `null` means unknown, never a misfit.

- **Since 2026-11-18:** `FactAt`'s site argument is `SiteInputs | null` from [the site-inputs layer](/modules/consortium-site-inputs.md), never the climate lookup.

- **Since 2026-11-19 (owner, one pool everywhere):** the guest path (guest pools, "Look in another climate's list", guest labels, the guest share-link segment) is to be deleted in the one-pool stream, and placement becomes one function `placementFor(plant, place, period)` (the grower's list, else the list of the climate the place will have in the period, else the plant's nearest list). Until that stream lands, the placement origin above is what the code does; `factAt` is not affected. See [user decisions](/decisions/consortium-user-decisions.md) "Owner decisions, 2026-11-19".
