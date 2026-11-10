---
type: Architecture Decision
title: Home page redesign
description: The home page answers a visitor's questions in order, shows the app with localized captures of a fictional design, and has no map of designs.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T14:32:00Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:32:13Z }
sources:
  - id: home-astro
    resource: ../../src/components/Home.astro
    title: src/components/Home.astro
    digest: sha256:b5208cacbccdbf2e
    last_modified: 2026-11-06T14:34:09Z
  - id: whatyoucando-astro
    resource: ../../src/components/WhatYouCanDo.astro
    title: src/components/WhatYouCanDo.astro
    digest: sha256:88b6ac00d5c9f228
    last_modified: 2026-11-06T14:34:09Z
  - id: learnandtry-astro
    resource: ../../src/components/LearnAndTry.astro
    title: src/components/LearnAndTry.astro
    digest: sha256:1db4d9cd5f5ae2fc
    last_modified: 2026-11-06T14:34:09Z
  - id: aboutcanopi-astro
    resource: ../../src/components/AboutCanopi.astro
    title: src/components/AboutCanopi.astro
    digest: sha256:9b00aca8802a234b
    last_modified: 2026-11-06T14:34:09Z
  - id: network-astro
    resource: ../../src/components/Network.astro
    title: src/components/Network.astro
    digest: sha256:adaa78990628770e
    last_modified: 2026-11-06T14:34:09Z
  - id: design-list-js
    resource: ../../src/scripts/design-list.js
    title: src/scripts/design-list.js
    digest: sha256:09af431115979444
    last_modified: 2026-11-06T14:34:09Z
  - id: capture-cjs
    resource: ../../scripts/home-captures/capture.cjs
    title: scripts/home-captures/capture.cjs
    digest: sha256:80d646ef1cba1164
    last_modified: 2026-11-06T14:34:09Z
  - id: context-md
    resource: ../../CONTEXT.md
    title: CONTEXT.md
    digest: sha256:0a5a8181d949ff64
    last_modified: 2026-11-10T15:30:09Z
---

# Decision

Owner, 2026-11-06. The hero painting and layout stay. Below it the page follows what a first-time visitor asks:

| Order | Section | Question it answers |
|---|---|---|
| 1 | Hero, with a proof line and a note on the two editions | What is this, what does it cost? |
| 2 | What you can do (`WhatYouCanDo.astro`) | What does it actually do? |
| 3 | A featured design and the list of the others (`FeaturedDesign.astro`) | What does a real result look like? |
| 4 | Ways in with no install (`LearnAndTry.astro`): consortium tool, field guides | Can I start now? |
| 5 | About (`AboutCanopi.astro`) | Who makes it, can I trust it? |
| 6 | Bibliography, the agroecology network folded in a `details`, contact | Going further |

# Choices and reasons

- **No map of designs.** The owner approved removing it. The map, its geolocation, the clusters, MapLibre and the OpenFreeMap tiles are gone; a plain list selects a design. The page makes no third-party request until the visitor opens Donate.
- **Captures, not a video.** Real captures of Canopi Web in the page's language and theme, 88 webp files under `public/home/`. Each theme's image is hidden by CSS when not in use and is lazy, so a visitor downloads one set.
- **A fictional design in the captures.** No real site and no personal data. It stands on the Great Lawn of Central Park and the page labels it fictional (`what.map.note`). The species are real catalog entries, chosen as non-invasive.
- **The tool tip is hidden in the captures only**: the phone crop would cut it in half. Nothing else in the app's interface is altered.
- **Entry guides** are now food-forest, living-soil and landrace-gardening, replacing the row chosen on 2026-10-25, since a newcomer to the app starts from a design rather than from saving seed.

# Canopi Web's catalog

The old wording, "a smaller plant catalog", was wrong for 2.0.3: Canopi Web's catalog lists the species count in `CANOPI_SPECIES_COUNT`, while its plant detail is shorter (`excluded_detail_fields` in the app's `common-types/web-species-catalog-artifact.json`). The site now says shorter plant details, in `download.webText` and `hero.editions`. Reword it when the full catalog reaches the Web edition (the app's ADR 0006, ledger 2.1-Q113).

# Regenerating the captures

From a working directory: `make-example.py designs/<lang>.canopi <lang>` for each language, `capture.cjs` for each language and theme (needs the app repo's Playwright), then `crop.py <workdir> public/home`. The clicks in `capture.cjs` use coordinates of the 2.0.3 interface. Redo them when the app's look changes noticeably.
