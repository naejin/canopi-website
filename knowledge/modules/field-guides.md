---
type: Module
title: Field Guides
description: "The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data."
resource: ../../src/components/guides
tags: [module, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T23:51:00Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T08:24:22Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:18bd49aaa37f7734
    last_modified: 2026-10-27T21:22:08Z
  - id: guides-2
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:992f527de4046685
    last_modified: 2026-10-28T01:05:25Z
  - id: guides-css
    resource: ../../src/styles/guides.css
    title: src/styles/guides.css
    digest: sha256:9eedb10c80527e89
    last_modified: 2026-10-27T09:09:35Z
  - id: guides-ts
    resource: ../../src/lib/guides.ts
    title: src/lib/guides.ts
    digest: sha256:dd313052906cb87b
    last_modified: 2026-10-25T09:49:07Z
  - id: content-config-ts
    resource: ../../src/content.config.ts
    title: src/content.config.ts
    digest: sha256:d504f4ebf9ee9035
    last_modified: 2026-10-26T23:34:11Z
  - id: guides-ts-2
    resource: ../../src/i18n/guides.ts
    title: src/i18n/guides.ts
    digest: sha256:3fe9afdb113d9c1a
    last_modified: 2026-10-26T21:16:11Z
  - id: glossary-ts
    resource: ../../src/data/glossary.ts
    title: src/data/glossary.ts
    digest: sha256:2063a6f64828bf3f
    last_modified: 2026-10-28T08:22:34Z
  - id: crops-ts
    resource: ../../src/data/crops.ts
    title: src/data/crops.ts
    digest: sha256:5bf94c6ec492fe6b
    last_modified: 2026-10-25T12:57:25Z
  - id: hero-row-ts
    resource: ../../src/components/guides/diagrams/hero-row.ts
    title: src/components/guides/diagrams/hero-row.ts
    digest: sha256:59f40512e8a1e750
    last_modified: 2026-10-26T21:16:11Z
  - id: tokens-css
    resource: ../../src/styles/tokens.css
    title: src/styles/tokens.css
    digest: sha256:b82c42d51e230dda
    last_modified: 2026-10-27T19:02:45Z
  - id: tryconsortium-astro
    resource: ../../src/components/guides/TryConsortium.astro
    title: src/components/guides/TryConsortium.astro
    digest: sha256:5a02bf699f26c9a8
    last_modified: 2026-10-27T21:22:08Z
  - id: try-consortium-ts
    resource: ../../src/components/guides/try-consortium.ts
    title: src/components/guides/try-consortium.ts
    digest: sha256:ed71c00bce5e1469
    last_modified: 2026-10-27T21:22:08Z
---

# Responsibility

The Field Guides section: practical guides drawn from the bibliography, in English (`/guides/`) and French (`/fr/guides/`) only. Each guide is one MDX folder; the layout, components and diagrams are shared. Design and scope: [architecture](/decisions/field-guides-architecture.md), [user decisions](/decisions/field-guides-user-decisions.md), [plan](/project/field-guides-plan.md).

# Key files

- `src/content/guides/<slug>/{en,fr}.mdx`: the guides. A guide is published when both files exist. Schema in [content.config.ts](../../src/content.config.ts).
- [src/components/guides/](../../src/components/guides/index.ts): `index.ts` is the map of components every guide can use without imports; `GuideLayout.astro` (one guide page), `GuidesIndex.astro` (the index), `BookCite.astro`.
- `src/components/guides/diagrams/`: build-time SVG diagrams. Files at the top level are shared by every guide; `diagrams/<slug>/<Name>.astro` belong to one guide and are registered automatically under their file name (a name clash fails the build). Every label arrives as a prop from the MDX, so en and fr each get their own; geometry helpers (`rng`, `seedOf`, `grid`, `wrap` for SVG text lines) come from `src/lib/svg.ts`, never a local copy.
- [guides.css](../../src/styles/guides.css): every class starts with `guide-`; imported only by the two layouts.
- [glossary.ts](../../src/data/glossary.ts), [crops.ts](../../src/data/crops.ts), [i18n/guides.ts](../../src/i18n/guides.ts) with `guides/{en,fr}.json`, [lib/guides.ts](../../src/lib/guides.ts), [svg.ts](../../src/lib/svg.ts), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs), [rehype-guide-checklists.mjs](../../src/lib/rehype-guide-checklists.mjs), [food-risks.ts](../../src/data/food-risks.ts) (the one FoodCaution risk list), `planting-mix.ts` (PlantingMixBar shares and validation).

# Interfaces

- Frontmatter: `title`, one-sentence `description`, `domain` (seeds, crops, soil, perennials, seasons, pests, kitchen), `order`, `glance` (3 to 6 label/value pairs; the hero box wraps its cells, and a value over 40 characters gets a wider cell), `quick`, `climates` (optional; the zones of the guide's `<ForClimate>` blocks, which brings the climate picker to the guide and the index), `sources` (`{ book: <bibliography id>, chapters: [titles] }`; chapter titles are the English edition's, so `BookCite` quotes them and, when the card shows another edition, adds a note naming the English edition rather than guessing translated titles), `related`, `updated`.
- Components (contract: [Field Guide components](/references/field-guide-components.md), which lists every prop and limit): QuickAnswer, Term, TermNote (placed by the plugin), Note, Safety, FoodCaution, HisGarden (optional `book`, whose garden), Invasive (inline invasive-species note), ForClimate, Steps/Step, CropCards, CropCard, CropTable, CropExplorer, PollinationBadge, SeasonTimeline, YearsTimeline, PlotDiagram, FlowerDiagram, PlantingMixBar, Checklist/Item, Figure, Columns, Card, Points, NextGuides, TryConsortium (preset link into the consortium tool: `?plant=<canonical_name>&climate=<id>`, the plant checked against the beta cells at build time and by `scripts/guides-consortium.test.mjs`).
- Ids are one per concept: `<Term id>` takes a glossary key, crop components a crop id; there are no alias maps. A crop cell the book does not give stays `null` and shows nothing.
- `related` in frontmatter: two to four published guides (same list in en and fr); `NextGuides` links at section ends; in-text links to another guide's section use that page's heading id in the same language (French ids differ from English ones; `check-built-site.mjs` fails on a missing `#id`).
- `<FoodCaution risk>` takes one risk or a list (`risk={['ergot', 'treated-seed']}`): several risks in one place are one box with one title, never two boxes in a row. Each box ends with the food-safety authority pointer once (`food.authority`).
- `<CropTable>`: below 640px each crop is a block of label/value rows (cells carry `data-label`; a one-column table shows crop and value side by side), so no table scrolls sideways at 390px. Its "in Lofthouse's experience" note names only the crossing, ease or hybrid columns it shows.
- Plain markdown tables in a guide body are styled like the crop table (`.guide-body > table`).
- `<Term id>`: the rehype plugin wraps a term and the punctuation touching it (a following `,` `.` `;` `:` `?` `!` `»` with an optional no-break space, or an opening `«` / bracket) in `.guide-term-keep` (`white-space: nowrap`), so a line never starts with that punctuation. The first use per guide gets a `<TermNote>` (placed by the rehype plugin before the containing block). The term renders as a button plus a `hidden` plain-word twin. At >= 960px the note is a margin note, the button is `display: none` (no tab stop or popover in any engine) and the twin shows; below, the button opens the note as a `popover="auto"` card (Escape, outside tap or Close), described by the definition text alone. A note left open across a rotation to >= 960px stays a card until closed. Printed, notes show in the flow. Without popover support the note stays inline. `NextGuides` lists only published guides, so a section may name one not yet written.
- Checklists: the checklist plugin gives each `<Item>` its `list`, so checkbox ids are `guide-check-<slug>-<list>-<item>` (unique on the page) and the build fails on a duplicate checklist id, a duplicate item in one list, or an Item outside a Checklist. Ticks: `localStorage["canopi-guide:<slug>:checks"]` = `{ <checklist id>: [item ids] }`. Interactive components mark themselves `data-guide-interactive`.
- The bibliography page shows "Field guide" backlinks under each book a guide cites (`guidesCiting`), anchored by the book's `- id:`.

# Dependencies

- [src/data](/modules/src-data.md) (bibliography ids, glossary, crops), [src/i18n](/modules/src-i18n.md), `Base.astro` (`alternates`, `ogType`, `structuredData` props), `Header.astro` (`alternates`, `current: 'guides'`), `@astrojs/mdx` 5.
- Checked by [scripts](/modules/scripts.md): `guides.test.mjs` and the Field Guides part of `check-built-site.mjs`. Writing rules: [Field Guide writing](/conventions/field-guide-writing.md).

# Gotchas

- Do not import `src/content.config.ts` from runtime code (it drags `node:fs` into the Cloudflare prerender worker); shared constants live in `src/i18n/guides.ts`.
- Plant colours (`--leaf`, `--leaf-*`, `--petal`, `--anther`, `--seed-1..6`) are defined in three blocks of `tokens.css` (light, dark, system dark) and colour plant content only. Soil colours (`--soil-1..3`, `--soil-grain`, `--soil-hypha`, `--soil-worm`, `--soil-worm-band`) are in the same three blocks and colour soil drawings only, never chrome; no colour literals in guide files.
- The header's Guides link is never hidden by width: below 640px it sits in the phone Menu (see [Site navigation](/decisions/site-navigation.md)). The guides index links to the bibliography (`section.books`) and the bibliography page links back to the guides.
- Guide styles use the site breakpoints only (639px, 960px); a test fails on any other.
- Guide-only strings live in `src/i18n/guides/{en,fr}.json` (both files, same keys; French with a no-break space before `:` and a narrow one before `;` `?` `!`); punctuation joining two strings is part of a string (`crop.guideLink`, `aria.labelled`), never hard-coded in a component.
- `FlowerDiagram` variants: tomato-closed/open, squash-male/female, corn, carrot-fertile/sterile, spinach-male/female.
- Diagrams are drawn at build time with a seeded random, so builds are identical. Shared drawing helpers live in `src/lib/svg.ts` and `src/lib/tree-shapes.ts` (tree outlines used by the carbon farming guides), never inside one guide's diagram folder. A guide's hero row (`GuideHeroRow.astro`) shows its section's motif, chosen in `diagrams/hero-row.ts` (`domainMotifs`, typed over every section; `cropSeeds`, one seed per crops guide), and is seeded by its slug; a crops guide with no seed kind fails the build. Shared seed and leaf shapes live in `src/lib/svg.ts`; the hero leaves use `--leaf-young`, `--leaf-deep`, `--leaf-gold`, `--leaf-ochre`, `--leaf-brown` (plant tokens); the soil row (crumbs, fungal threads, one worm, no green) uses the `--soil-*` tokens in `tokens.css`.
