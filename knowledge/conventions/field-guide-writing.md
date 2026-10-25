---
type: Convention
title: Field Guide writing
description: The writing, safety, attribution and language rules every Field Guide follows, and how they are checked.
tags: [convention, guides]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T09:48:48Z }
sources:
  - id: guides
    resource: ../../src/content/guides
    title: src/content/guides/
    digest: sha256:9e3605116c04937a
    last_modified: 2026-10-25T09:39:48Z
  - id: guides-test-mjs
    resource: ../../scripts/guides.test.mjs
    title: scripts/guides.test.mjs
    digest: sha256:35e661688248d63a
    last_modified: 2026-10-25T09:22:23Z
  - id: decisions-field-guides-user-decisions
    resource: /decisions/field-guides-user-decisions.md
enforced_by: [scripts/guides.test.mjs]
---

# Rule

Every Field Guide (`src/content/guides/<slug>/{en,fr}.mdx`) follows these rules, set by the owner ([user decisions](/decisions/field-guides-user-decisions.md)); the full component contract is `.local/field-guides/component-api.md`.

- **Our own words.** No quotes from the book, no close paraphrase (no sentence following its wording or order), none of its images. Each guide lists its sources as bibliography book ids with chapter titles.
- **Do no harm.** Practices a spec tags [OMIT] are left out entirely. Food risks ([CAUTION]) appear only as `<FoodCaution risk>`, whose fixed text names the risk and sends readers to their food-safety authority. No doses, times, temperatures or methods for anything eaten or toxic.
- **Attribute.** [ATTRIBUTE] and [HIS GARDEN] items are the author's view or his garden ("in Lofthouse's experience", `<HisGarden>`), never rules; no outside figures.
- **Portable.** Seasons, not months (both hemispheres); metric first, imperial in parentheses.
- **Reader first.** Short sentences, second person, concrete actions, one idea per section; the first screen tells readers whether the guide answers their question.
- **English and French alike.** Same components, terms, checklist and item ids, crop lists and cautions in both files. French is written for French gardeners, with the glossary's French terms, « » quotes, a no-break space before `:` and a narrow no-break space before `;` `?` `!` and `%`.
- **Design.** Only tokens for colour (plant tokens for plant content only), no outside fonts, images or `url()`; `guides.css` classes start with `guide-`.

# Enforcement

`scripts/guides.test.mjs` (`npm test`): frontmatter and en/fr parity, known components only, Term/crop/FoodCaution/NextGuides ids resolve, same component sequence and ids in both languages, no digit followed by a time or temperature unit in cautions and safety text, no links in food texts, glossary and crop table completeness, no colour literals or outside assets, `guide-` class prefix. `scripts/check-built-site.mjs` checks the built pages. Own words, omissions and attribution are checked by review against the spec.

# Examples

- Allowed: `<FoodCaution risk="bitter-cucurbits" />` in a section on unwanted crosses.
- Not allowed: telling readers to taste raw fruit to check for bitterness (the hub's spec marks it [OMIT]).
- Allowed: "Most new varieties he brings in set no seed in their first year" inside `<HisGarden>`; not allowed: the same as a rule for every garden.
