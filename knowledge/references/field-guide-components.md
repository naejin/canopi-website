---
type: Reference
title: Field Guide components
description: Every component, prop, allowed value and limit a Field Guide's MDX can use, and what fails the build or the tests.
tags: [guides, reference]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T08:48:05Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T08:47:57Z }
sources:
  - id: index-ts
    resource: ../../src/components/guides/index.ts
    title: src/components/guides/index.ts
    digest: sha256:f699c81f1739bbc6
    last_modified: 2026-10-27T20:56:00Z
  - id: guides
    resource: ../../src/components/guides
    title: src/components/guides/
    digest: sha256:b9e96f9f085c394d
    last_modified: 2026-10-28T08:45:46Z
  - id: content-config-ts
    resource: ../../src/content.config.ts
    title: src/content.config.ts
    digest: sha256:d504f4ebf9ee9035
    last_modified: 2026-10-26T23:34:11Z
  - id: food-risks-ts
    resource: ../../src/data/food-risks.ts
    title: src/data/food-risks.ts
    digest: sha256:8e638ee001e92a1b
    last_modified: 2026-10-27T07:21:18Z
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
    digest: sha256:7ee2f4fb8c1fce43
    last_modified: 2026-10-28T08:24:37Z
  - id: hero-row-ts
    resource: ../../src/components/guides/diagrams/hero-row.ts
    title: src/components/guides/diagrams/hero-row.ts
    digest: sha256:59f40512e8a1e750
    last_modified: 2026-10-26T21:16:11Z
  - id: guideherorow-astro
    resource: ../../src/components/guides/diagrams/GuideHeroRow.astro
    title: src/components/guides/diagrams/GuideHeroRow.astro
    digest: sha256:e8d7dbe75932d9a6
    last_modified: 2026-10-26T22:42:16Z
  - id: svg-ts
    resource: ../../src/lib/svg.ts
    title: src/lib/svg.ts
    digest: sha256:9633fcd98755c6ac
    last_modified: 2026-10-26T22:42:16Z
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
  - id: en-json
    resource: ../../src/i18n/guides/en.json
    title: src/i18n/guides/en.json
    digest: sha256:2b48e0d09edf9266
    last_modified: 2026-10-28T08:24:37Z
enforced_by:
  - scripts/guides.test.mjs
  - scripts/check-built-site.mjs
  - scripts/guides-consortium.test.mjs
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
domain: seeds        # seeds | crops | soil | perennials | seasons | pests | kitchen
order: 7             # integer, sort within domain
glance:              # 3 to 6 { label, value } pairs, shown in the hero strip
  - { label: "Skill", value: "Beginner" }
quick: true          # optional boolean
climates: [tropical, temperate]   # optional; exactly the zones of the guide's <ForClimate> blocks (test), same in en and fr
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
- `<Safety title="…">` a danger and its rule, or the author's dangerous practice reported with the danger named (owner, 2026-10-26) `</Safety>` — `title` required; the only place a mouth word may appear.
- `<FoodCaution risk="…" />` or `<FoodCaution risk={["ergot", "treated-seed"]} />` — `risk` required: one
  risk or a list, from `src/data/food-risks.ts`: bitter-cucurbits, dry-beans, nightshades,
  potato-berries, corn-processing, treated-seed, fava, ergot, sprouted-or-surplus-seed, toxic-leaves,
  home-canning, raw-tasting, wild-foods, home-fermentation, compost-tea, needs-processing (perennial
  staples poisonous raw or unripe, eaten only after traditional processing), akee, cashew. Fixed wording
  per language (`food.<risk>` in `src/i18n/guides/{en,fr}.json`); an unknown or repeated risk fails the
  build. A list is one box with one title and one paragraph per risk, and every box ends with one
  `food.authority` paragraph (the national food-safety authority pointer; risk texts never repeat
  it, and `npm test` and the built-site check enforce once per box); two FoodCautions in a row fail
  `npm test` (combine them).
- `<HisGarden his="…" you="…" book="…" />` — `his` and `you` required: the author's practice or
  result in his garden, and what changes where the reader lives (qualitative only). `book` optional,
  default `landrace-gardening` (Lofthouse, northern Utah): the cited book whose author's garden it is,
  which picks the "where" line `hisGarden.where.<book>` (now also `carbon-farming-solution`,
  Toensmeier, Massachusetts). The book must be among the guide's `sources` and have that string in
  en and fr (test); a book without one fails the build.
- `Mesquite <Invasive />` — no props, no slot, always self-closing. A fixed inline note ("invasive in
  places: check your local list"; fr "espèce envahissante par endroits : vérifiez la liste locale")
  placed right after the name of a species the source flags as invasive or spreading, in prose or a
  list item. It renders a `<span class="guide-invasive">` (phrasing content, so it stays inside the
  paragraph) that flows inline like text, each wrapped piece keeping its border; the icon and the
  first word sit in a `nowrap` `.guide-invasive-lead`, so a break never leaves an empty piece after
  the name, and the icon rule is `.guide-invasive .guide-invasive-icon` so `.guide-page svg
  { display: block }` cannot put it on a line of its own (tests). Never at the start of a line or list item, never in a heading; it counts in the en/fr
  component sequence, so both files carry the same notes in the same order (tests).
- `<ForClimate zones="tropical" source="<book id>">` advice for those climates `</ForClimate>` —
  `zones` required: one zone or a list (`zones={["temperate", "continental"]}`) from
  `src/data/climates.ts`; `source` required: a bibliography book id that is also in the guide's
  `sources` (test). An unknown zone or book fails the build. Species, spacings, timings and
  quantities that hold only in some climates go inside one; principles stay outside. Adjacent blocks
  form a run: the reader's zone comes first and opens, the others close but stay; when no block in a
  run is for the reader's zone, a "not covered yet" note appears above it. Without JavaScript or a
  chosen zone every block is open; printing opens all. Head: zone badges and "From <book>, by
  <author>" (fr "D'après <book> (<author>)"), the title in a `<cite lang>` of its edition's language.
  Rules for writers:
  - **One or two runs per guide**, with the same zone set in each run where possible: every run
    without the reader's zone shows its own "not covered yet" note.
  - **Nothing between blocks of a run**: a paragraph, a `<Note>`, a `<FoodCaution>` or an
    auto-placed term note splits it in two.
  - **A `<Term>`'s first use comes before the run** (in prose, or in the run's first block): its note
    is placed before the top-level block of the first use, so a first use in a later block would
    split the run (`npm test` fails it).
  - **No headings inside a block** (they would enter the page TOC and point into a closed
    `<details>`), **no nested `<ForClimate>`**, and **no `<Note>` inside** (it renders in the box, not
    in the margin). Lists, `<FoodCaution>`, `<Safety>`, `<Points>`, `<Columns>`, `<Invasive />` and
    `<Term>` are fine inside.
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
- `<TryConsortium plant="Artocarpus altilis" climate="tropical" name="Breadfruit" />` — opens the
  consortium tool (beta) with the guide's plant kept and its climate set:
  `consortiumPath(lang)?plant=<canonical_name>&climate=<id>` (`/consortium/`, fr `/fr/guilde/`).
  `plant` required: a `canonical_name` in a beta cell (`public/data/consortium/*.json`); `name`
  required: the guide's own name for the plant in that file's language (en and fr differ); `climate`
  optional: the zone of the `<ForClimate>` block it sits in, and the plant must be in that cell. Left
  out (only outside climate blocks, in a guide for every climate), each beta cell that has the plant
  gets a link, so no climate is assumed (never default to temperate). Renders a `.guide-next-inline`
  line: the label "Design a consortium (beta)" (fr « Composer une guilde (bêta) »,
  `consortium.label`) and one link per climate, "<name> · <cell>" (`consortium.link`), where the
  cell is named with its region ("Corn · Temperate Europe", « Maïs · Europe tempérée »;
  `consortium.cell.<climate>.<region>` in `guides/{en,fr}.json`, one per manifest cell), so a reader
  outside the region is not promised their own; each link is described by the label. The links come
  from `src/components/guides/try-consortium.ts` (`presetCells`, `presetLinks`): an unknown climate, a
  plant outside its climate's cell or in no cell fails the build. `scripts/guides-consortium.test.mjs`
  checks those links on the real cells, every preset against the cells, its block and the en/fr
  pairing (same plant and climate, once each per guide), a name for every cell, and that a preset in a
  climate block is the last thing in it. Used in guides whose subject is a plant or a planting system
  of a beta cell: as the last thing in a climate block, after its list, its closing sentence and any
  `<FoodCaution>` or `<Safety>` box (the warning stays beside what it warns about), or after a plant
  guide's season checklist. Not for a plant the guide says needs a large or special planting the tool
  does not build (Nuts as a staple links the cashew, not the Brazil nut).

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
- Hero row (not used in MDX): `GuideLayout` renders `<GuideHeroRow domain slug />`, a decorative
  640 × 64 SVG (`aria-hidden`) seeded by the slug. Motif by section (`diagrams/hero-row.ts`): seeds
  beans · crops the guide's own seed (`cropSeeds`: kernels, squash-seeds, beans, grains, tomato-seeds,
  cloves) · soil ochre and brown crumbs threaded with cream fungal threads and one earthworm · perennials green leaves · seasons autumn leaves · pests ladybird, hoverfly, ground beetle ·
  kitchen corn kernels and beans. A new section needs an entry in `domainMotifs` and a new crops guide
  one in `cropSeeds`, or `npm test` fails; `npm run check` also fails a missing section, and the build a crops guide with no seed kind. Shapes (`KERNEL_PATH`,
  `SQUASH_SEED_PATH`, `GRAIN_PATH`, `TOMATO_SEED_PATH`, `CLOVE_PATH`, `leafPath`, `lobedLeafPath`,
  and the seeded soil `crumbPath(rand, cx, cy, rad)` and `threadPath(rand, ax, ay, bx, by)`) are in
  `src/lib/svg.ts` beside `BEAN_PATH`, for any diagram to reuse.
- Diagram colour: tokens only. Plant tokens for plant parts only; soil tokens (`--soil-1`..`-3`,
  `--soil-grain`, `--soil-hypha`, `--soil-worm`, `--soil-worm-band`) for soil drawings only, never
  chrome. Each is defined in the light, dark and system-dark blocks of `tokens.css` (test).

# Safety heuristic (`scripts/guides.test.mjs`)
- No `<Safety>` box and no `food.<risk>` text gives an amount of time (digits or words: "ten
  minutes", "a day", "deux heures"…), a temperature (°, degrees/degrés, 100 C) or a method word
  (overnight, toute la nuit, boil/bouill-, soak/tremp-).
- No prose pairs boil, soak, ferment or cook (and French forms) with an amount of time in the same
  sentence. It is a heuristic for English and French; reviewers still read every caution.
- Checklist items: no tasting, flavour or cooking word (en tast-, flavour, cook; fr goût, cuit, at a
  word start, so "goutte-à-goutte" and "circuit" pass).
- Mouth words only inside `<Safety>`. French "mordant" as the dye fixative passes after un, le, du, de
  or comme, or before "naturel" ("sert de mordant", "un mordant"); "en mordant" still fails.
- Invasive names (a heuristic): a body naming one of the carbon farming book's flagged species (en
  mesquite, prosopis, leucaena, kudzu, castor, Osage orange, air potato, Chinese tallow, miscanthus,
  pongam/pongamia, leafy spurge, cardoon, honey locust, moringa, petroleum plant; fr the French names:
  mesquite, prosopis, leucaena, kudzu, ricin, oranger des Osages, igname bulbifère, arbre à suif,
  miscanthus, pongamia, euphorbe ésule, cardon, févier, moringa) or of *The Pollinator Victory
  Garden*'s (en butterfly bush, buddleja/buddleia, Japanese barberry, oriental bittersweet, Norway
  maple, Japanese honeysuckle, black acacia, giant reed, Mexican feathergrass, tree of heaven; fr
  buddleia/buddleja, arbre aux papillons, épine-vinette du Japon, bourreau des arbres, érable plane,
  chèvrefeuille du Japon, acacia à bois noir, canne de Provence, Stipa tenuissima, ailante, faux
  vernis du Japon) must contain `<Invasive />` at least once. Reviewers still check each name.
