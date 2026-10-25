---
type: Convention
title: Field Guide writing
description: The writing, safety, attribution and language rules every Field Guide follows, and how they are checked.
tags: [convention, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T14:56:16Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-25T14:11:43Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:3e2624235874581e
    last_modified: 2026-10-25T14:08:27Z
  - id: guides-test-mjs
    resource: ../../scripts/guides.test.mjs
    title: scripts/guides.test.mjs
    digest: sha256:005aacd42f9794a1
    last_modified: 2026-10-25T13:36:03Z
  - id: decisions-field-guides-user-decisions
    resource: /decisions/field-guides-user-decisions.md
enforced_by: [scripts/guides.test.mjs]
---

# Rule

Every Field Guide (`src/content/guides/<slug>/{en,fr}.mdx`) follows these rules, set by the owner ([user decisions](/decisions/field-guides-user-decisions.md)); the full component contract is [Field Guide components](/references/field-guide-components.md).

- **Our own words.** No quotes from the book, no close paraphrase (no sentence following its wording or order), none of its images. Each guide lists its sources as bibliography book ids with chapter titles.
- **No structural paraphrase.** Never follow the book's sentences, lists or anecdotes in its order with the words swapped. Build each section from the reader's question, keep an anecdote to one sentence, and pick two or three examples from a list in your own order.
- **No chapter substitute.** A guide, or two guides together, must not keep most of one chapter's points even when each section is reordered: keep what the reader needs to act, and leave the author's incidental specifics (his containers, his recipes, his rankings, his lists of crops) in the book. Check coverage per chapter, not only per sentence.
- **Do no harm.** Practices a spec tags [OMIT] are left out entirely. Food risks ([CAUTION]) appear only as `<FoodCaution risk>`, whose fixed text names the risk and sends readers to their food-safety authority; a guide never writes its own food warning. No doses, times, temperatures or methods for anything eaten, toxic or caustic.
- **Nothing in the mouth.** No test, check or selection puts anything in the mouth: no seeds, no raw plant parts, no berries, no unknown crosses, no teeth or bite tests (dryness is checked another way, such as the sun-jar check).
- **House tasting rule.** Choosing by flavour happens at the table, never in the garden: only fruit of a crop the reader already eats, prepared the way they always prepare it, with the matching `<FoodCaution>` beside it. Nothing raw that is normally cooked, no unripe fruit, no leaves from plants going to seed, no seeds; a bitter fruit is not eaten and its seed is thrown out. The full wording is in Choosing seed parents ("Judge what you harvest"); other guides link to it rather than restate it.
- **Attribute.** [ATTRIBUTE] and [HIS GARDEN] items are the author's view or his garden ("in Lofthouse's experience", `<HisGarden>`), never rules; his estimates (shares, lists of crops) name him. No outside figures: a general tip that is not from the book gives no counts, times or rates and is tagged `{/* general tip, not from the book */}`.
- **Select on growth.** Readers select on growth, shape, colour and storage; flavour only under the house tasting rule. Nothing suggests cooking makes a crop safe, and checklist items never suggest tasting.
- **Portable.** Seasons, not months (both hemispheres); metric first, imperial in parentheses.
- **Reader first.** Short sentences, second person, concrete actions, one idea per section; the first screen tells readers whether the guide answers their question.
- **English and French alike.** Same components, terms, checklist and item ids, crop lists and cautions in both files. French is written for French gardeners, with the glossary's French terms, « » quotes with a no-break space inside, a no-break space before `:` and a narrow no-break space before `;` `?` `!` and `%`.
- **Design.** Only tokens for colour (plant tokens for plant content only), no outside fonts, images or `url()`; `guides.css` classes start with `guide-`.

# Enforcement

`scripts/guides.test.mjs` (`npm test`): frontmatter and en/fr parity, known components only, Term/crop/FoodCaution/NextGuides ids resolve, same component sequence and ids in both languages, no amount of time (digits or words, e.g. "ten minutes"), temperature or method word (overnight, boil, soak and French forms) in cautions and safety text, no prose pairing boil/soak/ferment/cook with an amount of time (a heuristic with its own self-test; reviewers still read cautions), no glossary or crop alias maps, no tasting, flavour or cooking words in checklist items, no double-encoded characters (mojibake) in guide text or guide strings, no teeth or bite words in guide text (en: teeth, tooth, bite; fr: dent, mordre, croquer, mâcher), no two `<FoodCaution>` boxes in a row, no links in food texts, glossary and crop table completeness, no colour literals or outside assets, `guide-` class prefix. `scripts/check-built-site.mjs` checks the built pages. Own words, omissions and attribution are checked by review against the spec.

# Examples

- Allowed: `<FoodCaution risk="bitter-cucurbits" />` in a section on unwanted crosses.
- Not allowed: telling readers to taste raw fruit to check for bitterness (the hub's spec marks it [OMIT]).
- Allowed: "Most new varieties he brings in set no seed in their first year" inside `<HisGarden>`; not allowed: the same as a rule for every garden.
