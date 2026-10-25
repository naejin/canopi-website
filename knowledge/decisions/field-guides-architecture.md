---
type: Architecture Decision
title: Field Guides architecture
description: How Field Guides are stored, routed, rendered and checked — MDX content collection, build-time SVG diagrams, en+fr only, one shared crop table and glossary.
status: stable
tags: [field-guides, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:59:33Z }
---

# Field Guides architecture

Context: [user decisions](/decisions/field-guides-user-decisions.md). Design check of 2026-10-25 against HEAD `cf4f03b`.

## Decision

### Content
- One Astro content collection `guides`, defined in `src/content.config.ts`, glob limited to `src/content/guides/**` (so `src/data/bibliography.md`, imported `?raw`, is untouched).
- One folder per guide: `src/content/guides/<slug>/<lang>.mdx` with `lang` ∈ {`en`, `fr`}. A guide is published only when both files exist (a test enforces it).
- MDX via **`@astrojs/mdx@^5.0.6`** — the last line compatible with the installed Astro 6.1.x (`astro add mdx` would pull 8.x, which needs Astro 7). The pin moves with any Astro upgrade.
- Frontmatter (schema in `content.config.ts`): `title`, `description` (one sentence, also meta description), `domain`, `order`, `glance` (list of label/value pairs), `sources` (book ids from the bibliography), `related` (guide slugs), `updated` (date).

### One owner per shared concept
- **Crop facts** (pollination, crossing level, life cycle, wet/dry seed, ease to landrace, male-sterile hybrid risk): `src/data/crops.ts`, one row per crop, labels en+fr. Every guide, table and widget reads from it; no guide restates a crop figure by hand.
- **Glossary**: `src/data/glossary.ts`, term id → en/fr term and one-sentence definition. Margin notes (`<Term id>`) read it.
- **Guide chrome strings** (labels like "At a glance", "On this page", "Checklist"): `src/i18n/guides/{en,fr}.json`, so the 11-locale parity rule is not forced on guide-only text. Only strings shown outside guides (nav label, bibliography backlink) go into the 11 site translation files.
- **Book ids**: optional `id` field per book in `src/data/bibliography.md`, parsed in `bibliography.ts` (unique). A guide cites by id (`<Cite book="landrace-gardening" ch="…">`); the bibliography links back to every guide that cites a book, computed from the collection.

### Rendering
- Routes: `src/pages/guides/index.astro`, `src/pages/guides/[slug].astro`, `src/pages/[lang]/guides/index.astro`, `src/pages/[lang]/guides/[slug].astro` (`getStaticPaths` returns `fr` only).
- `Base.astro` and `Header.astro` take an `alternates` list so guide pages emit hreflang only for en, fr and x-default, and the language menu sends other locales to the English guide.
- Components in `src/components/guides/` (layout, sidenote/term, cite, callout, glance, steps, figure, checklist) and diagrams in `src/components/guides/diagrams/`. Diagram geometry is computed **at build time** in component frontmatter (shared helpers in `src/lib/svg.ts`, seeded random so output is deterministic); labels arrive as props from the MDX. Pure diagrams ship no JavaScript.
- Interactive widgets are server-rendered markup plus a small component `<script>` (progressive enhancement: the content is readable without JS). Checklist state: `localStorage` key `canopi-guide:<slug>:checks`, keyed by item id.
- CSS: `src/styles/guides.css`, imported by the guide layout only, classes prefixed `guide-`. Plant colours (`--leaf`, `--petal`, seed tones) are added to `tokens.css` in all three theme blocks and used only for plant content (no green in chrome).
- Self-hosted fonts only (no Google Fonts). No italic Literata (not shipped).
- Header gets a "Field Guides" link (key in all 11 locales), hidden on the narrowest phones like the Discord link; the footer always carries it.

### Checks
- `scripts/guides.test.mjs`: en/fr parity per guide, frontmatter + cited book ids + term ids + related slugs resolve, no external image/font URLs, colours only via tokens.
- `scripts/homepage.test.mjs` directory scan made recursive (a subdirectory under `src/components` currently throws EISDIR).
- `scripts/check-built-site.mjs`: guide hreflang exactly en/fr/x-default, no `/<other>/guides/`, every internal href resolves to a built file, diagram-only guides ship no extra script, bibliography links back to guides.

## Content safety rule
See the 2026-10-25 row of the user decisions: no outside safety research; risky practices are left out, food-safety topics get a short caution without doses/times/methods and point to the local authority; uncertain claims are attributed to the author.

## Consequences
- Prose lives in MDX per language, so a third language is a new file per guide plus one entry in the guide chrome dictionary — no change to the 11 site files.
- Pinning MDX 5 ties the next Astro major upgrade to an MDX upgrade.
- Crop figures change in one place; a guide cannot disagree with the crop table.
