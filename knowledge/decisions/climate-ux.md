---
type: Architecture Decision
title: Climate UX
description: Every page that changes with the climate uses the app's seven zones, one stored choice set from an on-page chip, and one badge, and it reorders and marks content but never hides it.
tags: [decision, climate, i18n]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T14:12:32Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T15:50:29Z }
sources:
  - id: climates-ts
    resource: ../../src/data/climates.ts
    title: src/data/climates.ts
    digest: sha256:42b3b2e5b9af2739
    last_modified: 2026-10-26T23:34:11Z
  - id: climate-js
    resource: ../../src/scripts/climate.js
    title: src/scripts/climate.js
    digest: sha256:6fa135827fa5adf8
    last_modified: 2026-10-26T23:34:11Z
  - id: climatepicker-astro
    resource: ../../src/components/ClimatePicker.astro
    title: src/components/ClimatePicker.astro
    digest: sha256:34db62854d83adfc
    last_modified: 2026-10-26T23:34:11Z
  - id: climatebadge-astro
    resource: ../../src/components/ClimateBadge.astro
    title: src/components/ClimateBadge.astro
    digest: sha256:3a302bfb200a1460
    last_modified: 2026-10-26T23:34:11Z
  - id: forclimate-astro
    resource: ../../src/components/guides/ForClimate.astro
    title: src/components/guides/ForClimate.astro
    digest: sha256:56993118a08f9ccb
    last_modified: 2026-10-27T07:21:18Z
  - id: base-astro
    resource: ../../src/layouts/Base.astro
    title: src/layouts/Base.astro
    digest: sha256:e063655df7532635
    last_modified: 2026-10-27T19:02:45Z
  - id: global-css
    resource: ../../src/styles/global.css
    title: src/styles/global.css
    digest: sha256:47c585d78f6c50ca
    last_modified: 2026-10-26T23:34:11Z
  - id: homepage-test-mjs
    resource: ../../scripts/homepage.test.mjs
    title: scripts/homepage.test.mjs
    digest: sha256:ece980522aef8b88
    last_modified: 2026-10-28T12:22:08Z
  - id: guides-test-mjs
    resource: ../../scripts/guides.test.mjs
    title: scripts/guides.test.mjs
    digest: sha256:2817fe32215561cf
    last_modified: 2026-10-28T09:32:12Z
  - id: consortium-app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:23f34ddc12a2c22f
    last_modified: 2026-10-28T15:44:49Z
enforced_by: [scripts/homepage.test.mjs, scripts/guides.test.mjs]
---

# Context

Canopi is a worldwide tool (owner, 2026-10-27): readers garden from the tropics to the boreal
north, and the books behind the site each write for one climate (Gietzen's *Abundance Agroforestry*
for tropical Haiti, Théry's *Bienvenue en syntropie !* for temperate France). The site needed one
coherent way to say which climate a piece of advice is for, everywhere it matters.

# Decision

- **One vocabulary.** The Canopi app's seven zones, in `src/data/climates.ts`: tropical (Köppen A),
  subtropical (Cw, Cfa), mediterranean (Cs), arid (B), temperate (Cfb, Cfc), continental (Da, Db),
  boreal (Dc, Dd); the mapping is canopi-data's `enrichment/climate_zones.py`. Labels are site-wide
  `climate.*` keys in all 11 locales.
- **One choice, one place to set it.** `localStorage["canopi-climate"]`, mirrored on
  `html[data-climate]` by an inline head script before the first paint. It is set from a chip
  ("Your climate: …") that appears only on pages the climate changes (the bibliography, the guides
  index and guides with climate blocks), never in the header, and by the consortium tool when the
  reader picks a climate there (`setClimate` in `src/scripts/consortium/app.js`; the owner decision
  "Memory: the shared site climate"). The tool also starts from it when nothing else names a
  climate. A guide's preset climate (`?climate=`) applies to that consortium only and never writes it. The chip opens a dialog with each zone's
  one-line description and three local example cities (Köppen-checked, chosen per locale), plus
  "I'd rather not say". Hidden without JavaScript, where nothing could be kept.
- **Reorder and mark, never hide.** Badges of the reader's zone are filled (`.climate-badge`); in a
  guide, each run of adjacent `<ForClimate>` blocks puts the reader's block first and open and closes
  the others, which stay on the page. Bibliography order is unchanged (a climate filter waits for
  stage 4 of its growth plan).
- **Honest gaps.** When a run has no block for the reader's zone, a "not covered yet" note says so
  and every block stays open. Content with no climate tag shows no badge; there is no "all climates"
  badge, which would be a claim nobody checked.
- **The consortium tool is climate-first** (owner, 2026-10-28, in [the decision log](/decisions/consortium-user-decisions.md)).
  The climate alone picks the plant list; there is no region or place step. The tool lists all seven
  zones in `src/data/climates.ts` order with their descriptions and example cities (on phones, the
  descriptions sit in one "What the climates mean" disclosure); a zone with no list yet stays
  choosable and says "Not covered yet", naming the covered ones. The country is a separate, optional
  setting for invasive warnings only (see [Consortium page](/modules/consortium-page.md)). The home
  section's note names the covered climates in every locale (`homepage.test.mjs` ties it to
  `manifest.climates`).
- **Hemisphere is separate.** Guides say seasons, not months; the climate choice does not imply a hemisphere.
- **Later:** the app could share the same preference; not done yet.

# Consequences

- Guides cite a book written for each climate block (`source`), so adding a climate means adding a
  book to the bibliography first.
- Tests: `homepage.test.mjs` checks the seven zones, their keys in every locale, the CSS selector for
  every zone and the head script; `guides.test.mjs` checks `<ForClimate>` zones, sources, en/fr parity
  that frontmatter `climates` equals the blocks' zones, and that no `<Term>` is first used in a later
  block of a run (its note would split the run). The block head names the book in a `<cite lang>` of
  its edition's language.
