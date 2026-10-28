---
type: Project
title: Field Guides plan
description: Build plan for the 17 Field Guides drawn from Landrace Gardening — steps, streams, file ownership and exit criteria.
tags: [field-guides, plan]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T23:06:35Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T22:39:59Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:0678e2b538c9f0f3
    last_modified: 2026-10-28T23:06:23Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:f7e2fc8ce6d55b8c
    last_modified: 2026-10-28T09:57:25Z
---

# Field Guides plan

Rules: [user decisions](/decisions/field-guides-user-decisions.md), [architecture](/decisions/field-guides-architecture.md), process: [agentic delivery](/runbooks/agentic-delivery.md).
Per-guide specs (book-derived, gitignored): `.local/field-guides/specs/NN-slug.md`; map, glossary, crop table, component list: `00-map.md`.

## Guides (45)
Seeds & landraces: 01 landrace-gardening (hub), 02 hybrids-heirlooms-landraces, 03 will-they-cross, 04 hand-crosses, 05 choosing-seed-parents, 06 keeping-a-landrace, 07 saving-seed, 08 storing-seed.
Crops: 09 squash-melons-cucumbers, 10 corn, 11 beans-and-legumes, 12 tomatoes, 13 small-grains, 14 true-seed-potato-garlic-sunroot.
Seasons: 15 season-shifting, 16 food-all-year. Helpers & pests (domain `pests`, labelled "Pests & resilience" until 2026-10-28): 17 pests-without-sprays (section order 5 since step 7).
Trees & perennials: 18 trees-with-edible-leaves (source: *Trees with Edible Leaves*, Toensmeier with Klopf, 2022).
Harvest to kitchen: 19 nixtamalization, 20 cooking-dry-beans (reopened 2026-10-26 under the warn-don't-remove rule; no figures).
Soil (source: *Teaming with Microbes*, Lowenfels & Lewis, revised edition 2010): 21 living-soil (hub), 22 reading-your-soil, 23 fungal-or-bacterial, 24 compost-for-soil-life, 25 mulch, 26 compost-tea, 27 mycorrhizal-fungi, 28 no-dig-beds; Seasons: 29 soil-care-year.
Trees & perennials, carbon farming (source: *The Carbon Farming Solution*, Toensmeier 2016; step 6): 30 carbon-farming (hub), 31 perennial-staples, 32 nut-staples, 33 perennial-beans-and-pods, 34 starch-from-trees, 35 food-forest, 36 trees-in-the-field, 37 windbreaks-and-living-fences, 38 trees-for-livestock, 39 water-and-slopes, 40 coppice-and-bamboo, 41 fibre-dye-and-soap.
Helpers & pests (source: *The Pollinator Victory Garden*, Eierman 2020; step 7): 42 garden-helpers (hub), 43 flowers-for-pollinators, 44 homes-for-pollinators, 45 lawn-to-flowers.

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

## Step 6 — Carbon farming (done, 2026-10-27)
Guide map and owner decisions: `.local/field-guides/carbon-farming/00-map.md` and the 2026-10-27 rows of the [user decisions](/decisions/field-guides-user-decisions.md); chapter notes in `carbon-farming/notes/`. First real use of `<ForClimate>`.
- Done on `guides/integration`: shared files (bibliography id, 41 glossary terms, the `needs-processing`, `akee` and `cashew` cautions, `<Invasive />`, `HisGarden book`), the twelve guides 30–41 from four reviewed streams, guide 18 moved to order 6, the seam fixes (« prosopis » in French, one owner per warning, anchored links, inline invasive note).
- Checked in the browser at 390/1280, light and dark, with a climate chosen and with none; pre-push review of the whole diff; pushed on the owner's go.

## Step 7 — Pollinators (written and merged 2026-10-28, not pushed)
Guide map: `.local/field-guides/pollinators/00-map.md` (source: *The Pollinator Victory Garden*, Eierman 2020; Q3–Q7 settled by the coordinator from existing owner rules, Q8 deferred).
- Shared files on `guides/pollinators-shared`: the section label `domain.pests` renamed ("Helpers & pests", « Auxiliaires et ravageurs »), 31 glossary terms, the book's invasive names in `invasiveNames`.
- The four guides 42 garden-helpers (hub), 43 flowers-for-pollinators, 44 homes-for-pollinators and 45 lawn-to-flowers, written in three streams and merged on `consortium/integration`; `jobGuides.helpers` is `garden-helpers`.
- Hand-offs (`guides/pollinators-handoffs`): section orders 42→1 … 45→4, `pests-without-sprays`→5; `related` lists from the specs; cross-guide anchors fixed to real heading ids, French link texts set to the target's French title; the hub's "Where to start" and the end of 43–45 use `<NextGuides>`; `consortiumGuides` rows only where the final text discusses the plant (see [consortium page](/modules/consortium-page.md)); the habitat-vs-soil-cover compromise recorded in [Field Guide writing](/conventions/field-guide-writing.md).
- Guide 43's counterpoint to "natives first" (`consortium/guide43`, from the owner's "Climate first" row in [consortium user decisions](/decisions/consortium-user-decisions.md)): one paragraph, tagged as a general tip, ends the "Natives first" section in en and fr: natives are a sound default; plants and soil life from a matching climate elsewhere are a legitimate design choice; check the country's invasive list (GRIIS) first and never plant a species recorded invasive there; the consortium tool shows per-country invasive records. No person is named: no Hervé Coves source is in the bibliography.
- Not pushed. Still open: browser check at 390/1280 light/dark with a climate chosen and none, pre-push review, push on the owner's go; `related` entries in 12, 17, 25 and 29 pointing to the new guides on the owner's go.

## Tracker
bd epic "Field Guides", one item per step and per stream, labels `guides-step-<n>`.
