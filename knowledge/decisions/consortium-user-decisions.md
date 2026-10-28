---
type: Architecture Decision
title: Consortium tool — user decisions
description: Dated decisions the project owner made about the consortium design tool; they change only when the owner changes them.
tags: [consortium, decisions]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T10:01:24Z }
---

# Consortium tool — user decisions

Each row is a decision by the project owner. Agents do not narrow, swap or drop
any of them; a change is a question to the owner. Plan: [Consortium tool plan](/project/consortium-tool-plan.md).
Data side (sibling repository `canopi-data`, read 2026-10-27): `docs/adr/0007-curated-consortium-layer.md`,
`docs/consortium-curation-plan.md`, `docs/consortium-export-format.md`, `docs/consortium-export.schema.json`.

| Date | Decision |
|---|---|
| 2026-10-27 | Another agent curates the data in `canopi-data`; this repository builds the tool. The contract is canopi-data's `docs/consortium-export-format.md` and `consortium-export.schema.json` (format 1; format 2 since 2026-10-27, one file per cell). The website builds against it and never changes it alone. |
| 2026-10-27 | The tool is judged first on how clear and pleasant it is to use, then on its data. |
| 2026-10-27 | Term: **"Consortium" in every language except French, "Guilde"**. |
| 2026-10-27 | No database, Worker or backend: the export is copied into the repository, checked against its manifest and `SHA256SUMS`, and served as static JSON; suggestions are scored in the browser. |
| 2026-10-27 | The scoring module is dependency-free TypeScript so the app can reuse it after its 2.1 refactor. |
| 2026-10-27 | Interactive mockups (artifacts) come before any build, critiqued first by a separate reviewer; the owner approves them. |
| 2026-10-27 | **Place:** its own page at `/consortium/`, `/fr/guilde/` in French, a slug per language; title "Design a consortium" / « Composer une guilde ». |
| 2026-10-27 | **Entry points:** a short header item (in the phone Menu below 640px), measured at 640px in all 11 locales; a footer link; its own home-page section after Start here. |
| 2026-10-27 | **Guides link both ways, all four:** guides open the tool with their plant and climate preset; the tool explains strata and phases on the spot with links to guides; a plant's details link to guides that cover it (hand-made guide → species list); the tool appears in the Learn section (guides index, bibliography). |
| 2026-10-27 | **Languages:** the tool's interface in **all 11 locales**. |
| 2026-10-27 | **Phases:** plain time words first ("Years 1–3"), the app's term beside them ("· Placenta 3"). |
| 2026-10-27 | ~~**Launch:** public only once **all 7 climates** are accepted in canopi-data.~~ Replaced the same day by the launch-set row below (samples became cells). |
| 2026-10-27 | **Photos:** none in the suggestion list; a plant's details show one lazy-loaded photo with credit and licence, copied into the site at build time. |
| 2026-10-27 | ~~**Country for invasive warnings:** guessed from the browser language's region, shown and editable; without a country each plant says in how many countries it is recorded invasive, with the list on demand. Nothing leaves the browser.~~ Replaced the same day by the region row below. |
| 2026-10-27 | **Open in Canopi:** out of v1; a hand-off to the app is follow-up work after the app's 2.1 refactor. |
| 2026-10-27 | **Fixture:** about 35 plausible, invented plants, marked illustrative, never shipped; tropical leads the mockups. (Regenerated 2026-10-27 in format 2: cells Tropical × southern_america, Mediterranean × europe, Temperate × europe, with the real `country_regions` table; valid against schema 2.) |
| 2026-10-27 | **Layout:** a normal site page (header, footer) with a tool body. |
| 2026-10-27 | **Memory:** the shared site climate plus the last consortium on this device; sharing is a link that restores the exact state. No list of saved designs. |
| 2026-10-27 | **Testing is agent-only:** real-browser checks, accessibility tree, automated audits, keyboard and an agent usability walkthrough; no human pass before launch. |
| 2026-10-27 | **Mockups:** one artifact with switches (phone/desktop, light/dark, en/fr, a state picker). |
| 2026-10-27 | Canopi is worldwide: never default to temperate. Risky facts are shown with a warning, never hidden. |
| 2026-10-27 | **Samples are cells** (data side, ADR 0007 decision 1 amended): a cell is a climate zone within a WGSRPD level-1 region, built on demand, Temperate × Europe first. |
| 2026-10-27 | **Launch set:** the tool goes public once a set of cells **the owner names** is accepted; the set must include cells outside Europe and outside temperate. After launch, cells go live one by one and the others show a clear "not covered yet" state. The set itself is still to be named. |
| 2026-10-27 | ~~**Launch set named: all cells.** The tool goes public once every cell with land in its climate is accepted: 53 of the 7 × 8 = 56 cells (Tropical × europe, Continental × pacific and Boreal × pacific have none, per the WGSRPD × Köppen lookup in canopi-data). Many cells are slivers (for example Mediterranean × pacific, Arid × pacific); whether those reach about 200 taxa is for the owner to judge per cell. The "not covered yet" state stays for a country whose region has no cell for the chosen climate.~~ Launch condition replaced the same day by the beta row below. |
| 2026-10-27 | **Beta launch with 3 cells** (replaces "all cells" as the launch condition; all cells stay the goal): Temperate × europe, Mediterranean × europe, Tropical × southern_america ship as a beta tool, and users' feedback decides what comes next. Other cells show "not covered yet". |
| 2026-10-27 | **Reviews are delegated to agents:** agents review the data rows (a row is accepted after an independent agent review, recorded in its note) and the mockups (a separate reviewer agent critiques, the building agent iterates). The owner reviews the final result locally before anything is pushed. |
| 2026-10-27 | **Strata are about light first:** the more light a plant needs, the higher its stratum (maize can be high). Strata and phase ranges come from a rule over Silver traits plus agent botanical judgment (owner-authorised); a book that states a taxon's stratum or phase overrides both. |
| 2026-10-27 | **No `canopi.db` writes in this push:** the export uses today's catalog values; plan step 3 (imports into existing fields) is deferred. Unknown traits show as unknown. |
| 2026-10-27 | **Region from an optional country:** step 1 asks the climate (the shared site choice) and "Where do you garden?": a country search, with the browser's hint offered as a one-tap suggestion and never applied silently. A country gives the region and turns on the invasive filter: plants recorded invasive there are never suggested automatically, and still appear with a warning in Swap and Add. "Rather not say" picks one of the 8 regions instead. The region stays shown and editable. Nothing leaves the browser. |
| 2026-10-27 | **No accepted cell for (climate, region):** explain that it is not covered yet and list what is, with an explicit opt-in ("See the same climate in Europe instead"). A result from another region carries a permanent label naming the cell it came from and that it was not checked for the user's region; the invasive check still uses the user's country. |
| 2026-10-28 | **Light-based layer names in ja and ko, app included:** the site's 突出層 / 上層 / 中層 / 下層 and 돌출층 / 상층 / 중층 / 하층 stay; the Canopi app switches to the same names (it still uses tree-based 高木層 / 교목층). |
| 2026-10-28 | **zh "climax" is 顶极群落**, on the site and in the app (the app's 顶级群落 is changed). |
| 2026-10-28 | **Allelopathy "not checked yet" is shown in a plant's details only**, not on every card; unknown is still never shown as "none". |
| 2026-10-28 | **One warning heading everywhere: "With a warning"** (and its translations), never "Cautions". |
| 2026-10-28 | **The helpers job gets real Field Guides:** written from *The Pollinator Victory Garden* (Kim Eierman, 2020, now in the owner's library), which also joins the bibliography. |
| 2026-10-28 | **"Consortium" means each language's own form of the word** (Konsortium, Consorcio, コンソーシアム, 植物联合体…), « Guilde » in French. |
| 2026-10-28 | **Helpers data is fixed in canopi-data, reproducibly:** the cells' `pollinator_forage` rows are reviewed against *The Pollinator Victory Garden* (wind-pollinated and sterile plants out, where "sterile" means without nectar or pollen for pollinators, not without seed: owner, 2026-10-28, so seedless Tahiti lime and saffron stay; invasives kept and flagged per country) and sourced `insectary` rows are added from the book. Every step is a committed script or data file in canopi-data, so a re-run gives the same rows; then re-export and install. |

## Open questions for the owner (not decisions)

None open (all answered 2026-10-28, see the rows above).
