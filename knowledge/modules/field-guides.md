---
type: Module
title: Field Guides
description: "The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data."
resource: ../../src/components/guides
tags: [module, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T12:21:35Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:acf92ce1ff87ab2d
    last_modified: 2026-10-25T10:58:49Z
  - id: guides-2
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:8ffb4b7af234779e
    last_modified: 2026-10-25T10:58:42Z
  - id: guides-css
    resource: ../../src/styles/guides.css
    title: src/styles/guides.css
    digest: sha256:ac7d9ef021ef991c
    last_modified: 2026-10-25T10:40:17Z
  - id: guides-ts
    resource: ../../src/lib/guides.ts
    title: src/lib/guides.ts
    digest: sha256:dd313052906cb87b
    last_modified: 2026-10-25T09:49:07Z
  - id: content-config-ts
    resource: ../../src/content.config.ts
    title: src/content.config.ts
    digest: sha256:aed0018b452adfde
    last_modified: 2026-10-25T09:49:07Z
  - id: guides-ts-2
    resource: ../../src/i18n/guides.ts
    title: src/i18n/guides.ts
    digest: sha256:9efdab5f460dc77c
    last_modified: 2026-10-25T09:49:07Z
  - id: glossary-ts
    resource: ../../src/data/glossary.ts
    title: src/data/glossary.ts
    digest: sha256:94bafc5956d0a5f9
    last_modified: 2026-10-25T10:25:08Z
  - id: crops-ts
    resource: ../../src/data/crops.ts
    title: src/data/crops.ts
    digest: sha256:9693c3a6ce74e302
    last_modified: 2026-10-25T10:40:17Z
---

# Responsibility

The Field Guides section: practical guides drawn from the bibliography, in English (`/guides/`) and French (`/fr/guides/`) only. Each guide is one MDX folder; the layout, components and diagrams are shared. Design and scope: [architecture](/decisions/field-guides-architecture.md), [user decisions](/decisions/field-guides-user-decisions.md), [plan](/project/field-guides-plan.md).

# Key files

- `src/content/guides/<slug>/{en,fr}.mdx`: the guides. A guide is published when both files exist. Schema in [content.config.ts](../../src/content.config.ts).
- [src/components/guides/](../../src/components/guides/index.ts): `index.ts` is the map of components every guide can use without imports; `GuideLayout.astro` (one guide page), `GuidesIndex.astro` (the index), `BookCite.astro`.
- `src/components/guides/diagrams/`: build-time SVG diagrams (`BeanRow`, `YearsTimeline`, `PlotDiagram`, `FlowerDiagram`, `SeasonTimeline`); `diagrams/<slug>/<Name>.astro` are one guide's own diagrams, registered automatically under their file name. Current ones: `landrace-gardening/SeedKinds`; `squash-melons-cucumbers/SquashSpecies` (species chart, an HTML table with a drawn fruit per column) and `SquashCrossFlow` (Tetsukabuto breeding flow), sharing `fruit-shapes.ts`; `corn/CornSweetTypes` (sweet corn kinds table), `CornSelection` (mass vs sibling-group selection) and `CornSweetKernels` (2 × 2 square and a second-generation cob). A guide diagram may carry its own scoped `<style>` (tokens only); its words always come from the MDX as props.
- [guides.css](../../src/styles/guides.css): every class starts with `guide-`; imported only by the two layouts.
- [glossary.ts](../../src/data/glossary.ts), [crops.ts](../../src/data/crops.ts), [i18n/guides.ts](../../src/i18n/guides.ts) with `guides/{en,fr}.json`, [lib/guides.ts](../../src/lib/guides.ts), [svg.ts](../../src/lib/svg.ts), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs), [rehype-guide-checklists.mjs](../../src/lib/rehype-guide-checklists.mjs), [food-risks.ts](../../src/data/food-risks.ts) (the one FoodCaution risk list), `planting-mix.ts` (PlantingMixBar shares and validation).

# Interfaces

- Frontmatter: `title`, one-sentence `description`, `domain` (seeds, crops, seasons, pests), `order`, `glance` (3 to 6 label/value pairs), `quick`, `sources` (`{ book: <bibliography id>, chapters: [titles] }`), `related`, `updated`.
- Components (contract: `.local/field-guides/component-api.md`, which lists every prop and limit): QuickAnswer, Term, TermNote (placed by the plugin), Note, Safety, FoodCaution, HisGarden, Steps/Step, CropCards, CropCard, CropTable, CropExplorer, PollinationBadge, SeasonTimeline, YearsTimeline, PlotDiagram, FlowerDiagram, PlantingMixBar, Checklist/Item, Figure, Columns, Card, Points, NextGuides.
- Ids are one per concept: `<Term id>` takes a glossary key, crop components a crop id; there are no alias maps.
- `<Term id>`: the first use per guide gets a `<TermNote>` (placed by the rehype plugin before the containing block). The term renders as a button plus a `hidden` plain-word twin. At >= 960px the note is a margin note, the button is `display: none` (no tab stop or popover in any engine) and the twin shows; below, the button opens the note as a `popover="auto"` card (Escape, outside tap or Close), described by the definition text alone. A note left open across a rotation to >= 960px stays a card until closed. Printed, notes show in the flow. Without popover support the note stays inline. `NextGuides` lists only published guides, so a section may name one not yet written. An in-text markdown link to a guide that is not built fails `check-built-site.mjs`, so guides point to unwritten guides only through `NextGuides`.
- Checklists: the checklist plugin gives each `<Item>` its `list`, so checkbox ids are `guide-check-<slug>-<list>-<item>` (unique on the page) and the build fails on a duplicate checklist id, a duplicate item in one list, or an Item outside a Checklist. Ticks: `localStorage["canopi-guide:<slug>:checks"]` = `{ <checklist id>: [item ids] }`. Interactive components mark themselves `data-guide-interactive`.
- The bibliography page shows "Field guide" backlinks under each book a guide cites (`guidesCiting`), anchored by the book's `- id:`.

# Dependencies

- [src/data](/modules/src-data.md) (bibliography ids, glossary, crops), [src/i18n](/modules/src-i18n.md), `Base.astro` (`alternates`, `ogType`, `structuredData` props), `Header.astro` (`alternates`, `current`), `@astrojs/mdx` 5.
- Checked by [scripts](/modules/scripts.md): `guides.test.mjs` and the Field Guides part of `check-built-site.mjs`. Writing rules: [Field Guide writing](/conventions/field-guide-writing.md).

# Gotchas

- Do not import `src/content.config.ts` from runtime code (it drags `node:fs` into the Cloudflare prerender worker); shared constants live in `src/i18n/guides.ts`.
- Plant colours (`--leaf`, `--petal`, `--anther`, `--seed-1..6`) are defined in three blocks of `tokens.css` (light, dark, system dark) and colour plant content only; no colour literals in guide files.
- The header's Field Guides link is hidden at 639px and below (long French and Russian labels); the footer link stays.
- Guide styles use the site breakpoints only (639px, 960px); a test fails on any other.
- `FlowerDiagram` variants: tomato-closed/open, squash-male/female, corn, carrot-fertile/sterile, spinach-male/female.
- Diagrams are drawn at build time with a seeded random, so builds are identical; a guide's hero bean row is seeded by its slug.
