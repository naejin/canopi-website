---
type: Module
title: Consortium page
description: "The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T21:39:25Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:90de9a8379d2ff89
    last_modified: 2026-10-27T21:38:30Z
  - id: app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:1aeeb019b78fbb53
    last_modified: 2026-10-27T21:38:30Z
  - id: words-js
    resource: ../../src/scripts/consortium/words.js
    title: src/scripts/consortium/words.js
    digest: sha256:18e10b91ced4b9a9
    last_modified: 2026-10-27T21:38:30Z
  - id: draw-js
    resource: ../../src/scripts/consortium/draw.js
    title: src/scripts/consortium/draw.js
    digest: sha256:5b9b067a21972224
    last_modified: 2026-10-27T21:38:30Z
  - id: data-ts
    resource: ../../src/scripts/consortium/data.ts
    title: src/scripts/consortium/data.ts
    digest: sha256:dc1401f3b9a2e493
    last_modified: 2026-10-27T20:39:29Z
  - id: consortium-css
    resource: ../../src/styles/consortium.css
    title: src/styles/consortium.css
    digest: sha256:0fc6ac9ec890edd7
    last_modified: 2026-10-27T21:38:30Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:2c6e06fc063f2307
    last_modified: 2026-10-27T21:38:30Z
  - id: consortium-page-test-mjs
    resource: ../../scripts/consortium-page.test.mjs
    title: scripts/consortium-page.test.mjs
    digest: sha256:0dffb50f7829ad6f
    last_modified: 2026-10-27T21:38:30Z
enforced_by: [scripts/consortium-page.test.mjs]
---

# Responsibility

The consortium tool's page: the visitor picks a climate and a place, and gets 6 to 12 plants that work together, shown as layers, over time and by job, with Swap, Add, details, share and print. All logic comes from the [Consortium core](/modules/consortium-core.md); the page never copies its rules.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | Server-rendered tool head (title, Beta, lede, outline, feedback link), `noscript`, the `#ct-app` mount, one `<dialog id="ct-dialog">`, toast, `#ct-say` live region, print sheet; writes `#ct-data` (the `consortium.*` strings without prefix, climate names, guide titles and URLs) |
| [app.js](../../src/scripts/consortium/app.js) | The whole tool: state `S`, `render()`, sheets (`O`, one dialog with `data-kind`), actions table, share-link and `localStorage["canopi-consortium"]` |
| [words.js](../../src/scripts/consortium/words.js) | `makeWords(strings, lang)` → `T`, `P` (plural forms `one: … \| other: …` with `#`), lists, phase time words; `needsLook`, `searchText`, `fold`, `plantName` |
| [draw.js](../../src/scripts/consortium/draw.js) | `profileSVG`: the side-view drawing of the layers |
| [data.ts](../../src/scripts/consortium/data.ts) | `loadManifest`, `loadLabels`, `loadCell` from `/data/consortium/` |
| [consortium.css](../../src/styles/consortium.css) | Everything under `.ct`; strata colours only in the drawing and legend |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides linked per plant, per job, and for the explanations |

Routes: `/consortium/`, `/fr/guilde/` (the French tool is a "guilde"), `/{lang}/consortium/` for the other 9.

# Behaviour worth knowing

- After a country is chosen, focus moves to `#ct-result-title` and `#ct-say` announces the summary; on phone the heading is scrolled to the top so the drawing and its numbered key show on the first screen.
- "N plants need a look" counts moderate and severe toxicity plus whatever the core flags (`needsLook`); slight toxicity stays on the card.
- Swap and Add list flagged plants last, under "With a warning"; choosing one asks one confirmation that names the warnings.
- A fresh result never says "no better plant"; with free places and nothing to fill it uses `freeNone`.
- Phone: the drawing shows numbers only, with a two-column key; Pin and Remove are icon buttons with labels; the "I want to grow…" search sits under the views when no place is free.
- A link or saved state opens on the result: an inline script sets the compact head before paint, and `#ct-app` keeps `min-height: 100vh` while loading, so nothing shifts.
- No requests outside the site; the tool JS is about 25 KB gzipped, each cell about 60 to 66 KB gzipped.

# Tests

- [consortium-page.test.mjs](../../scripts/consortium-page.test.mjs): strings in 11 locales, guides exist, `words.js`.
- [check-built-site.mjs](../../scripts/check-built-site.mjs): the 11 built pages, their hreflang and the installed data.
