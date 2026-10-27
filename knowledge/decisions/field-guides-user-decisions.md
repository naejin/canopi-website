---
type: Architecture Decision
title: Field Guides — user decisions
description: Dated decisions the project owner made about the Field Guides section; they change only when the owner changes them.
status: stable
tags: [field-guides, decisions]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T06:56:31Z }
---

# Field Guides — user decisions

Each row is a decision by the project owner. Agents do not narrow, swap or drop
any of them; a change is a question to the owner.

| Date | Decision |
|---|---|
| 2026-10-24 | The section is called **Field Guides** and lives at `/guides/` (French at `/fr/guides/`). |
| 2026-10-24 | Guides start in **English and French** only. More languages are added later, per guide, depending on the guide and its popularity. |
| 2026-10-24 | Guides are written **in our own words** and cite the source book. No quotes from the book, no images from it. |
| 2026-10-24 | A visual mockup comes before the build. |
| 2026-10-24 | The first guide comes from *Landrace Gardening* (Joseph Lofthouse, 2021); more domains and sections are added over time. |
| 2026-10-25 | Use **all the information in the book** that is relevant to field guides, not only the overview. |
| 2026-10-25 | Build **all the guides** in the guide map; judge every guide from the reader's side. |
| 2026-10-25 | Organize docs and code with **OKF** (`knowledge/`, tool `python3 .okf/okf.pyz`). |
| 2026-10-25 | **No safety or accuracy research.** Guides never write anything that could harm the reader, and phrase risky topics so the site carries no liability: leave out a practice rather than correct it with outside sources; where a topic touches food safety or toxicity, give no doses, times or methods, and point the reader to their local food-safety authority. The book's Utah-specific practices are framed as the author's garden, not universal rules. (Replaces the earlier plan to correct claims with mainstream sources.) |
| 2026-10-26 | **Never remove useful information.** When something is dangerous (toxic species, risky practices), keep it and put a clear warning beside it so the site carries no liability. This replaces "leave out a practice" in the 2026-10-25 safety row; the rest of that row (no safety or accuracy research, the author's Utah practices framed as his garden) still holds. First use: toxic species in the *Trees with Edible Leaves* guide stay in, with a clear warning. |
| 2026-10-26 | *Trees with Edible Leaves* (Toensmeier with Klopf, Perennial Agriculture Institute, 2022, CC BY-NC-ND) joins the bibliography (en, fr, es, de editions) and gets a Field Guide; it partly backs the excluded trees topic. The Land Institute joins the agroecology network (United States). |
| 2026-10-26 | **Reopened under the warn-don't-remove rule:** the "Harvest to kitchen" domain returns with a Nixtamalization guide and a Cooking dry beans guide, and the squash guide covers the book's canning of squash purée. **Warnings and kitchen texts give no figures**: they say what is done and why, name the danger plainly (caustic lime, toxins in undercooked beans or leaves, botulism), attribute the book's practice to its author, give no ratios, doses, times or temperatures, and point to the national food-safety authority. The caution tests stay as they are. |
| 2026-10-26 | *Trees with Edible Leaves* sits in a new index domain **Trees & perennials** (fr « Arbres et vivaces »), which later perennial sources (Crawford) can join. |
| 2026-10-26 | **Reopen every earlier [OMIT] item "for coherence".** Each comes back under the warn-don't-remove rule: dangerous practices (the book's raw-tasting and "nibble and spit" tests, seeds in the mouth, sharing soil, wild greens and mushrooms, lupini, grasspea, eating surplus seed) are reported as the author's practice with a clear warning, never as a step the reader is told to do; doubtful claims are attributed to him as his view; still no figures for anything eaten, toxic or caustic, and nothing the book does not say (e.g. no seed-law statements). |
| 2026-10-25 | Excluded until other sources back them: the book's last chapter on chickens, bees, mushrooms and trees. Canning mashed squash is never reproduced. |
| 2026-10-26 | **The hero row under a guide's title shows its section**, replacing the same bean row on every guide: seeds, beans as before; crops, that crop's own seed (corn kernels for corn, squash seeds for squash, melons and cucumbers, beans for beans and legumes, grains for small grains, tomato seeds for tomatoes, garlic cloves for true-seed potato, garlic and sunroot); perennials, green leaves in mixed shapes (simple, lobed, compound); seasons, leaves turning from fresh green through yellow and ochre to brown, left to right; pests, beneficial insects (ladybird, hoverfly, ground beetle); kitchen, a mixed handful of dry corn kernels and beans. Every future section gets its own motif. |
| 2026-10-26 | *Teaming with Microbes* (Lowenfels & Lewis, revised edition, Timber Press 2010) gets Field Guides: eight in a new index domain **Soil** (fr « Sol », matching the bibliography's theme) and one soil-care calendar in Seasons. The hub is titled "Living soil" (fr « Un sol vivant : la vie du sol au jardin »). Guides use the revised edition's chapters. |
| 2026-10-26 | **No lawn guide** for now: the book's lawn chapter is US-turf heavy; its useful points (leave clippings and leaves, no clippings from treated or dog-used lawns, lawn weeds as soil signals) go into the mulch, compost and soil-reading guides. Revisit if readers ask. |
| 2026-10-26 | **Compost tea gets a full guide**, warn-don't-remove: it explains aerated tea versus soaked extracts and manure tea, with the E. coli / food-crop warning first; no sugar amounts, rates or brewing times, never "spray before harvest", no fish-hydrolysate or "protozoa soup" recipes; the authors' disease claims are attributed. |
| 2026-10-26 | **Compost temperatures are published** as the authors' figures for managing a hot pile and killing weed seeds, beside a warning that a home pile heats unevenly so compost is never treated as germ-free (why pet and human faeces stay out and the authors avoid manure), and that a hot pile's centre can scald. Compost is not eaten, so the no-figures rule does not apply. |
| 2026-10-26 | **Soil hero motif:** rounded soil crumbs in ochre and brown, threaded with fine cream fungal threads, with one small earthworm. No green. |
| 2026-10-26 | The soil motif's fungal threads are **tan in light mode** (cream is lost on the parchment background) and pale cream in dark mode. |
| 2026-10-27 | *The Carbon Farming Solution* (Toensmeier, Chelsea Green 2016) gets **twelve Field Guides, 30–41**, all in **Trees & perennials** (no new section or motif); the carbon-farming hub is that section's hub. Guide map: `.local/field-guides/carbon-farming/00-map.md`. |
| 2026-10-27 | **Book climates to site zones** for this book: tropical → tropical; highland tropical → subtropical (the block says "for the tropical highlands"); subtropical → subtropical; warm temperate → temperate only; mediterranean → mediterranean; cold temperate → continental; boreal → boreal; arid → arid; semi-arid → the temperature category decides, with `arid` added only where the book calls the crop a dryland or drought crop. |
| 2026-10-27 | **New food cautions:** one generic `needs-processing` (staples poisonous raw or unripe) plus `akee` and `cashew`; existing risk ids reused where they fit. |
| 2026-10-27 | **Invasive species get a fixed-text `<Invasive>` note** (one wording per language) beside every species the source flags as invasive or spreading; guides never echo an author's case for planting invasives outside their range. |
| 2026-10-27 | **Carbon rates and yields:** the book's ratings in words plus at most a few figures per guide, each attributed to the author and never a promise; no tables, and no figure the book contradicts itself on. |

## Where the source notes live

The book extraction notes (about 19,000 words, close to the book's text) are
kept **out of git** because the repository is public. They live in the
gitignored folder `.local/field-guides/landrace-gardening/` on the owner's
machine (`notes/`, chapter text in `txt/`, the HTML mockup).
