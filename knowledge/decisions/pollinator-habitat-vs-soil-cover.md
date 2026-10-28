---
type: Architecture Decision
title: Pollinator habitat and the Soil guides' cover rules
description: Where the pollinator guides and the Soil guides disagree on bare soil and fallen leaves, the guides give both views with attribution and one middle way.
tags: [guides, pollinators]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T08:48:05Z }
sources:
  - id: en-mdx
    resource: ../../src/content/guides/homes-for-pollinators/en.mdx
    title: src/content/guides/homes-for-pollinators/en.mdx
    digest: sha256:bbc3cb81cbca35c7
    last_modified: 2026-10-28T08:35:42Z
  - id: en-mdx-2
    resource: ../../src/content/guides/mulch/en.mdx
    title: src/content/guides/mulch/en.mdx
    digest: sha256:0b7f54d6d655a004
    last_modified: 2026-10-26T22:09:45Z
  - id: en-mdx-3
    resource: ../../src/content/guides/living-soil/en.mdx
    title: src/content/guides/living-soil/en.mdx
    digest: sha256:8e753b0278596764
    last_modified: 2026-10-26T22:03:03Z
  - id: en-mdx-4
    resource: ../../src/content/guides/soil-care-year/en.mdx
    title: src/content/guides/soil-care-year/en.mdx
    digest: sha256:1d0774f41d66f531
    last_modified: 2026-10-26T22:38:12Z
---

# Context

*The Pollinator Victory Garden* (Eierman) and *Teaming with Microbes* (Lowenfels and Lewis, the Soil guides) give opposite advice on two points:

| Point | Soil guides (Mulch, Living soil, A year of soil care) | Pollinator guide 44 `homes-for-pollinators` |
|---|---|---|
| Bare soil | A loss for soil life: mulch every bed | Ground-nesting bees need a sunny patch kept bare, undug and unmulched |
| Fallen leaves | Mow or chop them in place; broken leaves feed soil life faster | Leave them whole: chopping, raking and mowing kill the insects wintering inside |

# Decision

Neither guide is wrong; each serves different animals. Guide 44 states both views, each attributed to its authors, and gives one middle way, without changing the Soil guides' text:

- **Bare soil**: mulch the beds you grow in; keep one sunny patch, away from them, bare for the bees (section "Bees that nest in the ground", fr "Abeilles terricoles").
- **Leaves**: leave whole leaves under shrubs, along a hedge and in one quiet corner; chop or gather the rest for the beds (section "Winter homes", fr "Quartiers d'hiver").

# Consequences

- Guide 44 links `mulch`, `living-soil` and `soil-care-year` at both points.
- Pending, on the owner's go (other guides' files): a one-line hint in `mulch` (leaf section) and `soil-care-year` (leaf-fall) pointing to `/guides/homes-for-pollinators/#winter-homes` (fr `#quartiers-dhiver`).
- Any later guide that covers leaves or bare soil follows the same rule: both views, attributed, one middle way.
