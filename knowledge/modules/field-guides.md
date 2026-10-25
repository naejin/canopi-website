---
type: Module
title: Field Guides
description: "The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data."
resource: ../../src/components/guides
tags: [module, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T10:26:51Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:8437f85bbed00820
    last_modified: 2026-10-25T10:25:08Z
  - id: guides-2
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:9ebfaeffd2d61856
    last_modified: 2026-10-25T10:21:42Z
  - id: guides-css
    resource: ../../src/styles/guides.css
    title: src/styles/guides.css
    digest: sha256:c0fb571c2e01e31b
    last_modified: 2026-10-25T10:21:42Z
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
    digest: sha256:fa7f28713945c93c
    last_modified: 2026-10-25T10:25:08Z
---

# Responsibility

The Field Guides section: practical guides drawn from the bibliography, in English (`/guides/`) and French (`/fr/guides/`) only. Each guide is one MDX folder; the layout, components and diagrams are shared. Design and scope: [architecture](/decisions/field-guides-architecture.md), [user decisions](/decisions/field-guides-user-decisions.md), [plan](/project/field-guides-plan.md).

# Key files

- `src/content/guides/<slug>/{en,fr}.mdx`: the guides. A guide is published when both files exist. Schema in [content.config.ts](../../src/content.config.ts).
- [src/components/guides/](../../src/components/guides/index.ts): `index.ts` is the map of components every guide can use without imports; `GuideLayout.astro` (one guide page), `GuidesIndex.astro` (the index), `BookCite.astro`.
- `src/components/guides/diagrams/`: build-time SVG diagrams (`BeanRow`, `YearsTimeline`, `PlotDiagram`, `FlowerDiagram`, `SeasonTimeline`); `diagrams/<slug>/<Name>.astro` are one guide's own diagrams, registered automatically under their file name.
- [guides.css](../../src/styles/guides.css): every class starts with `guide-`; imported only by the two layouts.
- [glossary.ts](../../src/data/glossary.ts), [crops.ts](../../src/data/crops.ts), [i18n/guides.ts](../../src/i18n/guides.ts) with `guides/{en,fr}.json`, [lib/guides.ts](../../src/lib/guides.ts), [svg.ts](../../src/lib/svg.ts), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs), [rehype-guide-checklists.mjs](../../src/lib/rehype-guide-checklists.mjs), [food-risks.ts](../../src/data/food-risks.ts) (the one FoodCaution risk list), `planting-mix.ts` (PlantingMixBar shares and validation).

# Interfaces

- Frontmatter: `title`, one-sentence `description`, `domain` (seeds, crops, seasons, pests), `order`, `glance` (3 to 6 label/value pairs), `quick`, `sources` (`{ book: <bibliography id>, chapters: [titles] }`), `related`, `updated`.
- Components (contract: `.local/field-guides/component-api.md`, which lists every prop and limit): QuickAnswer, Term, TermNote (placed by the plugin), Note, Safety, FoodCaution, HisGarden, Steps/Step, CropCards, CropCard, CropTable, CropExplorer, PollinationBadge, SeasonTimeline, YearsTimeline, PlotDiagram, FlowerDiagram, PlantingMixBar, Checklist/Item, Figure, Columns, Card, Points, NextGuides.
- Ids are one per concept: `<Term id>` takes a glossary key, crop components a crop id; there are no alias maps.
- `<Term id>`: the first use per guide gets a `<TermNote>` (placed by the rehype plugin before the containing block). At >= 960px it is a margin note and the term is plain text; below, the term is a button opening the note as a `popover="auto"` card (Escape, outside tap or Close); without popover support the note stays inline. `NextGuides` lists only published guides, so a section may name one not yet written.
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
