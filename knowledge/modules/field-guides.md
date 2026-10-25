---
type: Module
title: Field Guides
description: "The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data."
resource: ../../src/components/guides
tags: [module, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T09:48:34Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:9e3605116c04937a
    last_modified: 2026-10-25T09:39:48Z
  - id: guides-2
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:55b802bc46987c5d
    last_modified: 2026-10-25T09:30:45Z
  - id: guides-css
    resource: ../../src/styles/guides.css
    title: src/styles/guides.css
    digest: sha256:d32e06e5982d6f01
    last_modified: 2026-10-25T09:43:47Z
  - id: guides-ts
    resource: ../../src/lib/guides.ts
    title: src/lib/guides.ts
    digest: sha256:dd313052906cb87b
    last_modified: 2026-10-25T09:36:38Z
  - id: content-config-ts
    resource: ../../src/content.config.ts
    title: src/content.config.ts
    digest: sha256:aed0018b452adfde
    last_modified: 2026-10-25T09:36:38Z
  - id: guides-ts-2
    resource: ../../src/i18n/guides.ts
    title: src/i18n/guides.ts
    digest: sha256:9efdab5f460dc77c
    last_modified: 2026-10-25T09:36:38Z
  - id: glossary-ts
    resource: ../../src/data/glossary.ts
    title: src/data/glossary.ts
    digest: sha256:b4878d6f86589fc8
    last_modified: 2026-10-25T09:22:23Z
  - id: crops-ts
    resource: ../../src/data/crops.ts
    title: src/data/crops.ts
    digest: sha256:3fc74d2beb1cf31d
    last_modified: 2026-10-25T09:24:06Z
---

# Responsibility

The Field Guides section: practical guides drawn from the bibliography, in English (`/guides/`) and French (`/fr/guides/`) only. Each guide is one MDX folder; the layout, components and diagrams are shared. Design and scope: [architecture](/decisions/field-guides-architecture.md), [user decisions](/decisions/field-guides-user-decisions.md), [plan](/project/field-guides-plan.md).

# Key files

- `src/content/guides/<slug>/{en,fr}.mdx`: the guides. A guide is published when both files exist. Schema in [content.config.ts](../../src/content.config.ts).
- [src/components/guides/](../../src/components/guides/index.ts): `index.ts` is the map of components every guide can use without imports; `GuideLayout.astro` (one guide page), `GuidesIndex.astro` (the index), `BookCite.astro`.
- `src/components/guides/diagrams/`: build-time SVG diagrams (`BeanRow`, `YearsTimeline`, `PlotDiagram`, `FlowerDiagram`, `SeasonTimeline`); `diagrams/<slug>/<Name>.astro` are one guide's own diagrams, registered automatically under their file name.
- [guides.css](../../src/styles/guides.css): every class starts with `guide-`; imported only by the two layouts.
- [glossary.ts](../../src/data/glossary.ts), [crops.ts](../../src/data/crops.ts), [i18n/guides.ts](../../src/i18n/guides.ts) with `guides/{en,fr}.json`, [lib/guides.ts](../../src/lib/guides.ts), [svg.ts](../../src/lib/svg.ts), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs).

# Interfaces

- Frontmatter: `title`, one-sentence `description`, `domain` (seeds, crops, seasons, pests), `order`, `glance` (3 to 6 label/value pairs), `quick`, `sources` (`{ book: <bibliography id>, chapters: [titles] }`), `related`, `updated`.
- Components (contract: `.local/field-guides/component-api.md`): QuickAnswer, Term, Note, Safety, FoodCaution, HisGarden, Steps/Step, CropCards, CropCard, CropTable, CropExplorer, PollinationBadge, SeasonTimeline, YearsTimeline, PlotDiagram, FlowerDiagram, PlantingMixBar, Checklist/Item, Figure, Columns, Card, Points, NextGuides.
- `<Term id>`: the first use per guide gets a margin note (placed by the rehype plugin before the containing block). `NextGuides` lists only published guides, so a section may name one not yet written.
- Checklist ticks: `localStorage["canopi-guide:<slug>:checks"]` = `{ <checklist id>: [item ids] }`. Interactive components mark themselves `data-guide-interactive`.
- The bibliography page shows "Field guide" backlinks under each book a guide cites (`guidesCiting`), anchored by the book's `- id:`.

# Dependencies

- [src/data](/modules/src-data.md) (bibliography ids, glossary, crops), [src/i18n](/modules/src-i18n.md), `Base.astro` (`alternates`, `ogType`, `structuredData` props), `Header.astro` (`alternates`, `current`), `@astrojs/mdx` 5.
- Checked by [scripts](/modules/scripts.md): `guides.test.mjs` and the Field Guides part of `check-built-site.mjs`. Writing rules: [Field Guide writing](/conventions/field-guide-writing.md).

# Gotchas

- Do not import `src/content.config.ts` from runtime code (it drags `node:fs` into the Cloudflare prerender worker); shared constants live in `src/i18n/guides.ts`.
- Plant colours (`--leaf`, `--petal`, `--anther`, `--seed-1..6`) are defined in three blocks of `tokens.css` (light, dark, system dark) and colour plant content only; no colour literals in guide files.
- The header's Field Guides link is hidden at 639px and below (long French and Russian labels); the footer link stays.
- Diagrams are drawn at build time with a seeded random, so builds are identical; a guide's hero bean row is seeded by its slug.
