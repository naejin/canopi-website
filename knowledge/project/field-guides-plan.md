---
type: Project
title: Field Guides plan
description: Build plan for the 17 Field Guides drawn from Landrace Gardening — steps, streams, file ownership and exit criteria.
status: stable
tags: [field-guides, plan]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T23:00:54Z }
---

# Field Guides plan

Rules: [user decisions](/decisions/field-guides-user-decisions.md), [architecture](/decisions/field-guides-architecture.md), process: [agentic delivery](/runbooks/agentic-delivery.md).
Per-guide specs (book-derived, gitignored): `.local/field-guides/specs/NN-slug.md`; map, glossary, crop table, component list: `00-map.md`.

## Guides (29)
Seeds & landraces: 01 landrace-gardening (hub), 02 hybrids-heirlooms-landraces, 03 will-they-cross, 04 hand-crosses, 05 choosing-seed-parents, 06 keeping-a-landrace, 07 saving-seed, 08 storing-seed.
Crops: 09 squash-melons-cucumbers, 10 corn, 11 beans-and-legumes, 12 tomatoes, 13 small-grains, 14 true-seed-potato-garlic-sunroot.
Seasons: 15 season-shifting, 16 food-all-year. Pests & resilience: 17 pests-without-sprays.
Trees & perennials: 18 trees-with-edible-leaves (source: *Trees with Edible Leaves*, Toensmeier with Klopf, 2022).
Harvest to kitchen: 19 nixtamalization, 20 cooking-dry-beans (reopened 2026-10-26 under the warn-don't-remove rule; no figures).
Soil (source: *Teaming with Microbes*, Lowenfels & Lewis, revised edition 2010): 21 living-soil (hub), 22 reading-your-soil, 23 fungal-or-bacterial, 24 compost-for-soil-life, 25 mulch, 26 compost-tea, 27 mycorrhizal-fungi, 28 no-dig-beds; Seasons: 29 soil-care-year.

## Step 1 — Foundation + hub (one stream, `foundation`)
Owns: `package.json`, `package-lock.json`, `astro.config.mjs`, `src/content.config.ts`, `src/layouts|components/Base.astro`, `Header.astro`, `Footer.astro`, `src/components/guides/**`, `src/lib/svg.ts`, `src/data/crops.ts`, `src/data/glossary.ts`, `src/data/bibliography.md|.ts`, `src/components/Bibliography.astro`, `src/i18n/guides/*`, `src/i18n/translations/*.json` (nav + backlink keys only), `src/pages/guides/**`, `src/pages/[lang]/guides/**`, `src/styles/guides.css`, `src/styles/tokens.css`, `scripts/guides.test.mjs`, `scripts/homepage.test.mjs`, `scripts/check-built-site.mjs`, `src/content/guides/landrace-gardening/**`.
Exit: every shared component in `00-map.md` exists with a demo use; hub guide en+fr published; index page lists guides by domain; gates green; screenshots at 390/1280, light/dark, reviewed.

## Step 2 — Guide streams (parallel, max 4 at once)
Each stream owns only `src/content/guides/<slug>/**` and `src/components/guides/diagrams/<slug>/**` for its guides. Needs in shared files (a component variant, a crop row, a glossary term) go in the stream's report and land in a shared-files hand-off branch, never in the stream.
- S1 07 saving-seed + 08 storing-seed
- S2 02 hybrids + 03 will-they-cross
- S3 09 squash + 10 corn
- S4 11 beans + 12 tomatoes
- S5 05 choosing-seed-parents + 06 keeping-a-landrace + 04 hand-crosses
- S6 13 small-grains + 14 true-seed
- S7 15 season-shifting + 16 food-all-year + 17 pests
Exit per stream: en+fr guides render; review (bugs, reader usefulness, safety rule, no close paraphrase of the book, French quality) with each finding verified; gates green.

## Step 3 — Integrate
Hand-off branch for shared-file requests; cross-guide link pass (related/next), glossary completeness; real-browser check of every guide at 390/1280 light/dark; pre-push review of the whole diff; push to `master` (deploys).

## Step 4 — Trees and kitchen (done 2026-10-26, pushed bf9f27c)
Added 18 trees-with-edible-leaves (Trees & perennials), 19 nixtamalization and 20 cooking-dry-beans (Harvest to kitchen), and reopened every earlier [OMIT] item in guides 01-17 under the warn-don't-remove rule. Specs 18-20 are in `.local/field-guides/specs/`; the re-audit brief is `.local/field-guides/reaudit-brief.md`.

## Step 5 — Soil (done 2026-10-26, pushed 1f543f2)
Guide map and owner decisions: `.local/field-guides/teaming-with-microbes/00-map.md` and the 2026-10-26 rows of the [user decisions](/decisions/field-guides-user-decisions.md); hub mockup approved (`teaming-with-microbes/field-guide-living-soil.html`). Specs 21-29 in `.local/field-guides/specs/`; stream addendum `.local/field-guides/stream-brief-soil.md`.
- Shared files first on `guides/integration`: the `soil` domain and its hero motif with `--soil-*` tokens, 33 glossary terms, the `teaming-with-microbes` bibliography id, the `compost-tea` food caution.
- Streams: soil-hub (21, 23), soil-compost (24, 25), soil-tea (26, 27), soil-read (22, 28, 29); at most three building at once.
- Then as step 3: hand-offs, browser check at 390/1280 light/dark, pre-push review, push on the owner's go.

## Tracker
bd epic "Field Guides", one item per step and per stream, labels `guides-step-<n>`.
