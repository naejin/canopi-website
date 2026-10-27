---
type: Module
title: Consortium page
description: "The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T22:27:55Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:0976874731e93d98
    last_modified: 2026-10-27T22:26:44Z
  - id: app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:7d9be9ba2c57683a
    last_modified: 2026-10-27T22:26:44Z
  - id: words-js
    resource: ../../src/scripts/consortium/words.js
    title: src/scripts/consortium/words.js
    digest: sha256:bfb52f86762a3d15
    last_modified: 2026-10-27T22:26:44Z
  - id: draw-js
    resource: ../../src/scripts/consortium/draw.js
    title: src/scripts/consortium/draw.js
    digest: sha256:88d0c17075e400d6
    last_modified: 2026-10-27T22:26:44Z
  - id: data-ts
    resource: ../../src/scripts/consortium/data.ts
    title: src/scripts/consortium/data.ts
    digest: sha256:dc1401f3b9a2e493
    last_modified: 2026-10-27T20:39:29Z
  - id: consortium-css
    resource: ../../src/styles/consortium.css
    title: src/styles/consortium.css
    digest: sha256:a253aafcbe300891
    last_modified: 2026-10-27T22:26:44Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:fa730b72acfb0203
    last_modified: 2026-10-27T22:26:44Z
  - id: consortium-page-test-mjs
    resource: ../../scripts/consortium-page.test.mjs
    title: scripts/consortium-page.test.mjs
    digest: sha256:abe06b53554da8cb
    last_modified: 2026-10-27T22:26:44Z
  - id: logic-js
    resource: ../../src/scripts/consortium/logic.js
    title: src/scripts/consortium/logic.js
    digest: sha256:be6522a3576d6671
    last_modified: 2026-10-27T22:22:08Z
  - id: manifest-json
    resource: ../../public/data/consortium/manifest.json
    title: public/data/consortium/manifest.json
    digest: sha256:e38c7f91916d5e39
    last_modified: 2026-10-27T20:27:11Z
enforced_by: [scripts/consortium-page.test.mjs]
---

# Responsibility

The consortium tool's page: the visitor picks a climate and a place, and gets 6 to 12 plants that work together, shown as layers, over time and by job, with Swap, Add, details, share and print. All logic comes from the [Consortium core](/modules/consortium-core.md); the page never copies its rules.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | Server-rendered tool head (title, Beta with the number of places from `public/data/consortium/manifest.json`, lede, outline, feedback link), `noscript`, the `#ct-app` mount, one `<dialog id="ct-dialog">`, toast, `#ct-say` live region, print sheet; writes `#ct-data` (the `consortium.*` strings without prefix, climate names, guide titles and URLs) |
| [app.js](../../src/scripts/consortium/app.js) | The whole tool: state `S`, `render()`, sheets (`O`, one dialog with `data-kind`), actions table, share-link and `localStorage["canopi-consortium"]` |
| [words.js](../../src/scripts/consortium/words.js) | `makeWords(strings, lang)` → `T`, `P` (plural forms `one: … \| other: …` with `#`), lists, phase time words; `needsLook`, `searchText`, `fold`, `plantName` |
| [draw.js](../../src/scripts/consortium/draw.js) | `profileSVG`: the side-view drawing of the layers |
| [logic.js](../../src/scripts/consortium/logic.js) | Pure page rules tested in node: `droppedPlants` (old-link count), `trimGaps`, `mayPersist`, `photoSource`, `shown` |
| [data.ts](../../src/scripts/consortium/data.ts) | `loadManifest`, `loadLabels`, `loadCell` from `/data/consortium/` |
| [consortium.css](../../src/styles/consortium.css) | Everything under `.ct`; strata colours only in the drawing and legend |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides linked per plant, per job (`null` when no guide covers the job: helpers), and for the explanations; a plant links only guides whose English text names it |

Routes: `/consortium/`, `/fr/guilde/` (the French tool is a "guilde"), `/{lang}/consortium/` for the other 9.

# Behaviour worth knowing

- After a country is chosen, focus moves to `#ct-result-title` and `#ct-say` announces the summary; on phone the heading is scrolled to the top so the drawing and its numbered key show on the first screen.
- "N plants need a look" counts moderate and severe toxicity plus whatever the core flags (`needsLook`); slight toxicity stays on the card.
- Swap and Add list flagged plants last, under "With a warning"; choosing one asks one confirmation that names the warnings.
- A fresh result never says "no better plant"; with free places and nothing to fill it uses `freeNone`.
- Phone: the drawing shows numbers only, with a two-column key; Pin and Remove are icon buttons with labels; the "I want to grow…" search sits under the views when no place is free.
- A link or saved state opens on the result: an inline script sets the compact head before paint, and `#ct-app` keeps `min-height: 100vh` while loading, so nothing shifts.
- Closing a sheet from an action (Swap, Remove in details, Add, a new climate) closes the dialog at once and moves focus to the plant, Undo, or the result title.
- Each place load has a number; a cell that arrives after a later choice is dropped. The address bar and saved state are left alone while loading or on error; a shared link still waiting for its cell is written back with its own prefixes. Picking another climate or place leaves the link behind (only a guide's plant carries over).
- An Undo toast goes once the consortium is remade, refilled or moved; Start over's Undo restores the whole earlier state, cell included.
- Unknown allelopathy and spread show as "not checked yet" on cards and in details, never as none.
- The borrowed-list label ("Plants from the X list…") shows on result, no-match and print, and says whether invasiveness was checked for the user's country.
- Strata labels and phase terms are the Canopi app's own (`canopi/desktop/web/src/i18n/`); the test pins them.
- No requests outside the site; the tool JS is about 27 KB gzipped (minified bundle), each cell about 60 to 66 KB gzipped.

# Tests

- [consortium-page.test.mjs](../../scripts/consortium-page.test.mjs): strings in 11 locales (every key used, dynamic prefixes checked against core ids), app strata and phase terms, plural place counts, guides exist and name their plants, `words.js`, `logic.js`.
- [check-built-site.mjs](../../scripts/check-built-site.mjs): the 11 built pages, their hreflang and the installed data.
