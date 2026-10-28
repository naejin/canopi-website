---
type: Convention
title: Field Guide writing
description: The writing, safety, attribution and language rules every Field Guide follows, and how they are checked.
tags: [convention, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T09:31:36Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T09:55:56Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:d5090f13b3d64365
    last_modified: 2026-10-28T09:53:43Z
  - id: guides-test-mjs
    resource: ../../scripts/guides.test.mjs
    title: scripts/guides.test.mjs
    digest: sha256:2817fe32215561cf
    last_modified: 2026-10-28T09:32:12Z
  - id: decisions-field-guides-user-decisions
    resource: /decisions/field-guides-user-decisions.md
  - id: hero-row-ts
    resource: ../../src/components/guides/diagrams/hero-row.ts
    title: src/components/guides/diagrams/hero-row.ts
    digest: sha256:59f40512e8a1e750
    last_modified: 2026-10-26T21:16:11Z
  - id: guides-ts
    resource: ../../src/i18n/guides.ts
    title: src/i18n/guides.ts
    digest: sha256:3fe9afdb113d9c1a
    last_modified: 2026-10-26T21:16:11Z
  - id: guides-consortium-test-mjs
    resource: ../../scripts/guides-consortium.test.mjs
    title: scripts/guides-consortium.test.mjs
    digest: sha256:3d2ca952f3a55d21
    last_modified: 2026-10-27T21:22:08Z
  - id: en-mdx
    resource: ../../src/content/guides/homes-for-pollinators/en.mdx
    title: src/content/guides/homes-for-pollinators/en.mdx
    digest: sha256:3e5ad1d83a776cac
    last_modified: 2026-10-28T09:32:12Z
  - id: en-mdx-2
    resource: ../../src/content/guides/mulch/en.mdx
    title: src/content/guides/mulch/en.mdx
    digest: sha256:0b7f54d6d655a004
    last_modified: 2026-10-26T22:09:45Z
enforced_by: [scripts/guides.test.mjs, scripts/guides-consortium.test.mjs]
---

# Rule

Every Field Guide (`src/content/guides/<slug>/{en,fr}.mdx`) follows these rules, set by the owner ([user decisions](/decisions/field-guides-user-decisions.md)); the full component contract is [Field Guide components](/references/field-guide-components.md).

- **Our own words.** No quotes from the book, no close paraphrase (no sentence following its wording or order), none of its images. Each guide lists its sources as bibliography book ids with chapter titles.
- **No structural paraphrase.** Never follow the book's sentences, lists or anecdotes in its order with the words swapped. Build each section from the reader's question, keep an anecdote to one sentence, and pick two or three examples from a list in your own order.
- **No chapter substitute.** A guide, or two guides together, must not keep most of one chapter's points even when each section is reordered: keep what the reader needs to act, and leave the author's incidental specifics (his containers, his recipes, his rankings, his lists of crops) in the book. Check coverage per chapter, not only per sentence.
- **Warn, don't remove** (owner, 2026-10-26). Useful information stays even when it is dangerous: the guide keeps it and puts a clear warning beside it, so the site carries no liability. Food risks appear as `<FoodCaution risk>`, whose fixed text names the danger plainly and sends readers to their food-safety authority; a kitchen guide may also say in prose what a practice is, why it is done and what makes it dangerous, attributing the source's practice to its author. Never any figures for anything eaten, toxic or caustic: no ratios, doses, times or temperatures. Specs written before 2026-10-26 tag some items [OMIT]; those not yet re-audited stay out until the owner reviews them. Nothing goes between a plant list and its `<FoodCaution>` or `<Safety>` box: a `<TryConsortium>` link comes after the caution, as the last thing in its climate block (`scripts/guides-consortium.test.mjs`).
- **Nothing in the mouth, as a step.** No test, check or selection the reader is told to do puts anything in the mouth. When the book's author does (raw tasting, "nibble and spit", seeds in the mouth), the guide reports it as his practice inside a `<Safety>` box that names the danger, next to `<FoodCaution risk="raw-tasting" />` (owner, 2026-10-26); `npm test` fails a mouth word outside a `<Safety>` box.
- **House tasting rule.** Choosing by flavour happens at the table, never in the garden: only fruit of a crop the reader already eats, prepared the way they always prepare it, with the matching `<FoodCaution>` beside it. Nothing raw that is normally cooked, no unripe fruit, no leaves from plants going to seed, no seeds; a bitter fruit is not eaten and its seed is thrown out. The full wording is in Choosing seed parents ("Judge what you harvest"); other guides link to it rather than restate it.
- **Attribute.** [ATTRIBUTE] and [HIS GARDEN] items are the author's view or his garden ("in Lofthouse's experience", `<HisGarden>`), never rules; his estimates (shares, lists of crops) name him. No outside figures: a general tip that is not from the book gives no counts, times or rates and is tagged `{/* general tip, not from the book */}`.
- **Select on growth.** Readers select on growth, shape, colour and storage; flavour only under the house tasting rule. Nothing suggests cooking makes a crop safe, and checklist items never suggest tasting.
- **Portable.** Seasons, not months (both hemispheres); metric first, imperial in parentheses.
- **Worldwide, by climate** (owner, 2026-10-27). Canopi serves every climate, not only temperate gardens. Principles that hold everywhere stay in the main text; species, spacings, timings and quantities that hold only in some climates go inside `<ForClimate zones source>`, from a book written for those climates, and the frontmatter `climates` lists exactly those zones. Never present one climate's advice as universal; say which climate a source wrote for. See [Climate UX](/decisions/climate-ux.md).
- **Flag invasive species** (owner, 2026-10-27). Every species the source or its chapter flags as invasive, weedy, aggressive, suckering, spreading or naturalising carries `<Invasive />` right after its name, and a species any cited book flags carries it in every guide that names it as one to plant (moringa, flagged by *The Carbon Farming Solution*, also in the leaf-tree guide); no note from outside sources (black locust and chinaberry carry none, sisal none: the book calls it a sterile hybrid), inline in prose or in a list item (`Mesquite <Invasive />`), never at the start of a line and never in a heading; the fixed text says it is invasive in places and to check the local list. Same notes in the same order in en and fr.
- **Reader first.** Short sentences, second person, concrete actions, one idea per section; the first screen tells readers whether the guide answers their question.
- **English and French alike.** Same components, terms, checklist and item ids, crop lists and cautions in both files. French is written for French gardeners, with the glossary's French terms, « » quotes with a no-break space inside, a no-break space before `:` and a narrow no-break space before `;` `?` `!` and `%`.
- **Design.** Only tokens for colour (plant tokens for plant content only; soil tokens for soil drawings only, never chrome), no outside fonts, images or `url()`; `guides.css` classes start with `guide-`.
- **A new section needs a hero motif** (owner, 2026-10-26). Adding a section to `guideDomains` (`src/i18n/guides.ts`) means adding its hero row motif to `domainMotifs` in `src/components/guides/diagrams/hero-row.ts`, drawn in `GuideHeroRow.astro`; a new crops guide adds its own seed to `cropSeeds`. Only seeds guides (and the beans crop) show the bean row.

# Enforcement

`npm run check` fails a section missing from `domainMotifs` (typed `Record<GuideDomain, …>`). `scripts/guides.test.mjs` (`npm test`): frontmatter and en/fr parity, known components only, Term/crop/FoodCaution/NextGuides ids resolve, same component sequence (opening and closing tags) and ids in both languages, no amount of time (digits or words, e.g. "ten minutes"), temperature or method word (overnight, boil, soak and French forms) in cautions and safety text, no prose pairing boil/soak/ferment/cook with an amount of time (a heuristic with its own self-test; reviewers still read cautions), no glossary or crop alias maps, no tasting, flavour or cooking words in checklist items (French goût and cuit bounded at a word start, so goutte-à-goutte and circuit pass), no double-encoded characters (mojibake) in guide text or guide strings, mouth words only inside a `<Safety>` box (en: teeth, tooth, bite, chew a seed, spit, suck or nibble a seed, pod or leaf; fr: dent, mordre, croquer, mâcher, recracher, sucer or grignoter une graine, cosse ou feuille; pest prose such as "slugs nibble seedlings" and the dye noun "mordant" after un, le, du, de or comme stay allowed), one food-safety authority pointer per FoodCaution box, no two `<FoodCaution>` boxes in a row, no links in food texts, glossary and crop table completeness, `<ForClimate>` zones and source books valid and `climates` frontmatter equal to the blocks' zones, no `<Term>` first used in a later block of a `<ForClimate>` run, `<Invasive />` self-closing and inline (not at a line start, not in a heading) and present in any body naming one of the book's flagged species (a per-language name list, a heuristic with its own self-test), `<HisGarden book>` a cited book with its "where" string, no colour literals or outside assets, plant and soil tokens in all three theme blocks, `guide-` class prefix, a hero motif for every section and a seed kind for every crops guide. `scripts/check-built-site.mjs` checks the built pages. Own words, omissions and attribution are checked by review against the spec.

# Examples

- Allowed: `<FoodCaution risk="bitter-cucurbits" />` in a section on unwanted crosses.
- Not allowed: telling readers to taste raw fruit to check for bitterness (the hub's spec marks it [OMIT]).
- Allowed: "Most new varieties he brings in set no seed in their first year" inside `<HisGarden>`; not allowed: the same as a rule for every garden.

# When two cited books disagree: habitat versus soil cover

A coordinator choice (2026-10-28), applied in [homes-for-pollinators](/modules/field-guides.md); the owner has not reviewed it, so it is not yet a project rule.

- **The tension.** The Soil guides (`mulch`, `living-soil`, `soil-care-year`; Lowenfels and Lewis) cover bare soil with mulch and run a mower over fallen leaves so they feed soil life faster. Eierman keeps a sunny patch bare, undug and unmulched for ground-nesting bees, and warns that raking, chopping or mowing all the leaves kills the insects wintering in them.
- **The middle way.** The later guide states each view with its author and leaves the earlier guides' text unchanged: mulch the beds you grow in and keep one sunny patch, away from them, bare; leave whole leaves under shrubs, along a hedge and in one quiet corner, and chop or gather the rest for the beds.
- **Not done without the owner's go.** One-line hints in `mulch` and `soil-care-year` pointing to the pollinator guide.
