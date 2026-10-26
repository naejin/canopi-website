---
type: Reference
title: Field Guide components
description: Every component, prop, allowed value and limit a Field Guide's MDX can use, and what fails the build or the tests.
tags: [guides, reference]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T14:04:56Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-25T17:09:04Z }
sources:
  - id: index-ts
    resource: ../../src/components/guides/index.ts
    title: src/components/guides/index.ts
    digest: sha256:623104d77897e033
    last_modified: 2026-10-25T13:36:03Z
  - id: guides
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:2d49ed304707d9b1
    last_modified: 2026-10-26T14:03:02Z
  - id: content-config-ts
    resource: ../../src/content.config.ts
    title: src/content.config.ts
    digest: sha256:aed0018b452adfde
    last_modified: 2026-10-25T09:49:07Z
  - id: food-risks-ts
    resource: ../../src/data/food-risks.ts
    title: src/data/food-risks.ts
    digest: sha256:fb238afeb1de9b3d
    last_modified: 2026-10-26T14:04:17Z
  - id: rehype-guide-terms-mjs
    resource: ../../src/lib/rehype-guide-terms.mjs
    title: src/lib/rehype-guide-terms.mjs
    digest: sha256:61c2f1608556b0fb
    last_modified: 2026-10-25T12:57:25Z
  - id: rehype-guide-checklists-mjs
    resource: ../../src/lib/rehype-guide-checklists.mjs
    title: src/lib/rehype-guide-checklists.mjs
    digest: sha256:f51b03f8625ae351
    last_modified: 2026-10-25T10:06:45Z
  - id: guides-test-mjs
    resource: ../../scripts/guides.test.mjs
    title: scripts/guides.test.mjs
    digest: sha256:d5beb7555fec1beb
    last_modified: 2026-10-26T14:04:17Z
enforced_by: [scripts/guides.test.mjs]
---

The contract between the guide components and the people writing guides. Source of truth: `src/components/guides/index.ts`
(the map every guide's MDX gets without imports) and each component's `interface Props`. Anything not
listed here does not exist; an unknown component, prop value or id fails `npm test` or the build.
Module overview: [Field Guides](/modules/field-guides.md). Writing rules: [Field Guide writing](/conventions/field-guide-writing.md).

Guide file: `src/content/guides/<slug>/<lang>.mdx`, lang `en` | `fr`. A guide is published when both
files exist. The slug must be one of the plan's slugs (`scripts/guides.test.mjs`).

# Frontmatter (`src/content.config.ts`, same keys in en and fr)
```yaml
title: "Saving seed: dry and wet"          # required, non-empty
description: "One sentence: what the reader can do after reading."   # 1-200 characters; meta description too
domain: seeds        # seeds | crops | perennials | seasons | pests | kitchen
order: 7             # integer, sort within domain
glance:              # 3 to 6 { label, value } pairs, shown in the hero strip
  - { label: "Skill", value: "Beginner" }
quick: true          # optional boolean
sources:             # at least one; book = an "- id:" in src/data/bibliography.md (build fails otherwise)
  - { book: landrace-gardening, chapters: ["Saving seeds", "Squash"] }   # chapter TITLES, at least one
related: [storing-seed, landrace-gardening]   # 2 to 4 published guide slugs (test), same list in en and fr
updated: 2026-10-25  # date
```
Limits kept on purpose: description at most 200 characters (it is the meta description) and
glance 3 to 6 pairs (the hero strip layout). Body: `##` sections (ids from the text; the page TOC is
built from them), `###` sub-sections. Ids must be unique on the page (check-built-site fails on duplicates).
Links: another guide is `/guides/<slug>/` (fr `/fr/guides/<slug>/`); a section link uses the target
page's heading id in the same language (French ids differ: `#juger-la-récolte`, not `#judge-what-you-harvest`);
check-built-site fails on a missing `#id`. Index order: `order` runs 1..n within each domain (test).

# Ids: one per concept, no aliases
- Glossary ids are the keys of `src/data/glossary.ts` (kebab-case). Crop ids are `id`s in
  `src/data/crops.ts`. There are no alias maps: write the id itself, never a variant spelling or plural.
- The French word shown is whatever you put between the tags; the id stays the English key.

# Text components
- `<QuickAnswer>` 2-4 sentences `</QuickAnswer>` — no props. The short answer after the intro on
  guides over 1,200 words.
- `<Term id="landrace">landraces</Term>` — props `id` (glossary key, required). The build plugin
  (`src/lib/rehype-guide-terms.mjs`) marks the first use of each id on the page and places a
  `<TermNote>` before its block; later uses are plain words. Do not set `first` yourself.
  Behaviour: from 960 px the note is a margin note beside the block (the term is plain text, no tab
  stop). The plugin also wraps a term with the punctuation touching it (`,` `.` `;` `:` `?` `!` `»`, with an
  optional no-break space, or an opening `«`/bracket) in a `white-space: nowrap` span, so the two never
  wrap apart. Below 960 px the first use is a button that opens the definition as a popover card (tap,
  Enter; Escape, outside tap or the Close button close it); without popover support the note stays
  inline in the flow. Readable without JavaScript in every case.
- `<TermNote id="…" />` — placed automatically by the plugin; do not write it by hand.
- `<Note title="…">` text `</Note>` — `title` optional. Free margin note at >= 960 px, inline below.
- `<Safety title="…">` one rule, one-line why `</Safety>` — `title` required.
- `<FoodCaution risk="…" />` or `<FoodCaution risk={["ergot", "treated-seed"]} />` — `risk` required: one
  risk or a list, from `src/data/food-risks.ts`: bitter-cucurbits, dry-beans, nightshades,
  potato-berries, corn-processing, treated-seed, fava, ergot, sprouted-or-surplus-seed, toxic-leaves,
  home-canning, raw-tasting, wild-foods, home-fermentation. Fixed wording
  per language (`food.<risk>` in `src/i18n/guides/{en,fr}.json`); an unknown or repeated risk fails the
  build. A list is one box with one title and one paragraph per risk; two FoodCautions in a row fail
  `npm test` (combine them).
- `<HisGarden his="…" you="…" />` — both required: Lofthouse's practice or result in his garden,
  and what changes where the reader lives (qualitative only).
- `<Steps compact>` `<Step title="Thresh">` text `</Step>` … `</Steps>` — Steps: `compact` optional
  boolean (small numbers and titles, for short steps in a card). Step: `title` required.
- `<Points ruled="accent">` markdown list, each item opening with a **bold** lead `</Points>` —
  `ruled` optional, `top` (default) or `accent`.
- `<Columns min="15rem">` blocks `</Columns>` — `min` optional CSS length (default `15rem`), minimum
  column width; one column on phones.
- `<Card title="…" label="…">` body `</Card>` — both optional; used inside `<Columns>`.
- `<Figure title="…" caption="…">` any diagram `</Figure>` — both optional.
- `<NextGuides slugs={["saving-seed"]} />` — `slugs` required; only published guides are listed,
  so a section may name a guide before it is written; nothing renders if none is published.

# Crop components (data: `src/data/crops.ts`)
- `<CropCard crop="corn" />` — `crop` required (crop id; unknown id fails the build).
- `<CropCards crops={["squash-pepo", "corn"]} />` — `crops` required, crop ids.
- `<CropTable crops={[…]} columns={[…]} caption="…" />` — `crops` required; `columns` optional,
  any of species, pollination, crossing, life, seed, ease, cms (default pollination, crossing, seed,
  ease, cms; unknown column fails the build); `caption` optional. The note "<columns>: in Lofthouse's
  experience, in his garden" names only the crossing/ease/hybrid columns shown (none: no note). Below
  640 px each crop is a block of label/value rows (one-column tables: crop and value on one line), so
  any column count fits 390 px.
- Plain GFM markdown tables in the body are styled like the crop table (`.guide-body > table`).
- `<CropExplorer />` — no props. Every crop with an ease tier, grouped by tier, as chips that open
  the crop's details; without JavaScript the details are listed under each group.
- `<PollinationBadge pollination={…} />` — `pollination` a crop's `Pollination` object (`by`:
  self | insects | wind, optional `bees`, `bumblebees`, `partner`, …) or null (renders nothing).
  Normally used through CropCard.

# Interactive
- `<Checklist id="start-this-season">` `<Item id="pick-crops" when="spring" hint="…">` text `</Item>`
  … `</Checklist>`.
  - Checklist: `id` required, unique on the page (duplicate fails the build).
  - Item: `id` required, unique within its checklist (two checklists may reuse an item id); `when`
    optional, one of late-winter, spring, early-summer, summer, late-summer, autumn, winter,
    before-sowing, sowing, growing, flowering, harvest, after-harvest, any; `hint` optional.
    `list` is added by the build plugin (`src/lib/rehype-guide-checklists.mjs`); do not write it.
    An Item outside a Checklist fails the build.
  - Plain checkboxes without JavaScript; with it, ticks are kept in localStorage
    `canopi-guide:<slug>:checks` as `{ "<checklist id>": ["<item id>", …] }`.
- `<PlantingMixBar parts={[{ label: "Your own", value: 70, tone: "own" }]} title="…" />` — `parts`
  required: `label` string, `value` a finite number >= 0, `tone` own | old | new; `title` optional.
  Shares are rounded percents of the total. The build fails on no parts, a non-number, NaN or
  negative value, a zero total, or an unknown tone (`src/components/guides/planting-mix.ts`).

# Diagrams (pure SVG, no JavaScript)
- `<SeasonTimeline rows={[{ label: "Main crop", marks: [{ at: "spring", kind: "sow" }] }]} />` —
  `rows` required; `at` one of late-winter, spring, early-summer, summer, late-summer, autumn,
  winter; `kind` one of sow, flower, harvest, save, select. Unknown values fail the build.
- `<YearsTimeline labels={[{ when, text, alt }]} note="…" />` — both optional. `labels`: four
  `{ when, text, alt? }` replacing the default captions of the four stages; `note`: a string, or
  `false` for none (default: the built-in key, shown only when `labels` is not given).
- `<PlotDiagram variant="blocks" title="…" caption="…" />` — `variant` required: blocks | mixed |
  row-ends | colour-blocks; `title`, `caption` optional (replace the defaults).
- `<FlowerDiagram variant="corn" />` — `variant` required: tomato-closed, tomato-open, squash-male,
  squash-female, corn, carrot-fertile, carrot-sterile, spinach-male, spinach-female. Each has labels
  and alt text in en and fr; unknown variant fails the build.
- Guide-specific diagrams: `src/components/guides/diagrams/<slug>/<Name>.astro`, file name in
  PascalCase = component name, available in every guide without import; a name that clashes with a
  shared component or another guide's diagram fails the build. Writers mark where one goes with
  `{/* DIAGRAM: what it shows, data, labels */}`. SVG text does not wrap: break labels with `wrap(text,
  max)` from `src/lib/svg.ts` (keeps no-break spaces); never copy a helper into a diagram (test).
  Each guide's diagrams are the files in its folder; their props are in each file's `interface Props`.

# Safety heuristic (`scripts/guides.test.mjs`)
- No `<Safety>` box and no `food.<risk>` text gives an amount of time (digits or words: "ten
  minutes", "a day", "deux heures"…), a temperature (°, degrees/degrés, 100 C) or a method word
  (overnight, toute la nuit, boil/bouill-, soak/tremp-).
- No prose pairs boil, soak, ferment or cook (and French forms) with an amount of time in the same
  sentence. It is a heuristic for English and French; reviewers still read every caution.
