---
type: Module
title: Consortium page
description: "The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T02:08:47Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T02:08:47Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:7ac89d9388d9639a
    last_modified: 2026-10-28T01:05:25Z
  - id: app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:93c6f0dacb32c7b9
    last_modified: 2026-10-28T01:55:42Z
  - id: words-js
    resource: ../../src/scripts/consortium/words.js
    title: src/scripts/consortium/words.js
    digest: sha256:5747a4463f119327
    last_modified: 2026-10-28T01:05:25Z
  - id: draw-js
    resource: ../../src/scripts/consortium/draw.js
    title: src/scripts/consortium/draw.js
    digest: sha256:c446a372513ce7a1
    last_modified: 2026-10-28T01:05:25Z
  - id: data-ts
    resource: ../../src/scripts/consortium/data.ts
    title: src/scripts/consortium/data.ts
    digest: sha256:dc1401f3b9a2e493
    last_modified: 2026-10-27T20:39:29Z
  - id: consortium-css
    resource: ../../src/styles/consortium.css
    title: src/styles/consortium.css
    digest: sha256:c0ed03ee6432badf
    last_modified: 2026-10-28T01:56:09Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:60ff818034cee424
    last_modified: 2026-10-27T23:26:45Z
  - id: consortium-page-test-mjs
    resource: ../../scripts/consortium-page.test.mjs
    title: scripts/consortium-page.test.mjs
    digest: sha256:bc04446aa39233b6
    last_modified: 2026-10-28T01:56:08Z
  - id: logic-js
    resource: ../../src/scripts/consortium/logic.js
    title: src/scripts/consortium/logic.js
    digest: sha256:028a4fea08bf539c
    last_modified: 2026-10-28T01:53:33Z
  - id: manifest-json
    resource: ../../public/data/consortium/manifest.json
    title: public/data/consortium/manifest.json
    digest: sha256:e38c7f91916d5e39
    last_modified: 2026-10-27T20:27:11Z
  - id: dialogs-js
    resource: ../../src/scripts/dialogs.js
    title: src/scripts/dialogs.js
    digest: sha256:3388adb6fe4750c9
    last_modified: 2026-10-27T23:26:45Z
  - id: crops-ts
    resource: ../../src/data/crops.ts
    title: src/data/crops.ts
    digest: sha256:5bf94c6ec492fe6b
    last_modified: 2026-10-25T12:57:25Z
enforced_by: [scripts/consortium-page.test.mjs]
---

# Responsibility

The consortium tool's page: the visitor picks a climate and a place, and gets 6 to 12 plants that work together, shown as layers, over time and by job, with Swap, Add, details, share and print. All logic comes from the [Consortium core](/modules/consortium-core.md); the page never copies its rules.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | Its script runs `initChrome()` first, then `import()`s app.js, so a tool failure never breaks the header. Server-rendered tool head (title, Beta with the number of places from `public/data/consortium/manifest.json`, lede `home.consortium.lede` shared with the home section, outline, feedback link), `noscript`, the `#ct-app` mount, one `<dialog id="ct-dialog" data-own-dialog>` (the site's `initDialogs` in `src/scripts/dialogs.js` skips it; the app handles Escape, backdrop and scroll lock itself), toast, `#ct-say` live region, print sheet; writes `#ct-data` (the `consortium.*` strings without prefix, climate names, guide titles and URLs) |
| [app.js](../../src/scripts/consortium/app.js) | The whole tool: state `S`, `render()`, sheets (`O`, one dialog with `data-kind`), actions table, share-link and `localStorage["canopi-consortium"]` |
| [words.js](../../src/scripts/consortium/words.js) | `makeWords(strings, lang)` → `T`, `P` (plural forms `one: … \| other: …` with `#`), lists, phase time words; `needsLook`, `searchText`, `fold`, `plantName` |
| [draw.js](../../src/scripts/consortium/draw.js) | `profileSVG`: the side-view drawing of the layers, with a third of a column of margin each side so no crown is cut; returns `colPct` for the HTML labels |
| [logic.js](../../src/scripts/consortium/logic.js) | Pure page rules tested in node: `withQuery` (the language links' query), `presetPlace` (a guide preset borrows the saved place), `coverageHint` (why a Northern American country is not covered), `droppedPlants` (old-link count), `trimGaps`, `mayPersist`, `photoSource`, `shown` (with `next`, what one "Show more" reveals), `linkMembers` (the link's `a`), `afterMove` (notices dropped on a place change), `repeatClick` (double-click guard) |
| [data.ts](../../src/scripts/consortium/data.ts) | `loadManifest`, `loadLabels`, `loadCell` from `/data/consortium/` |
| [consortium.css](../../src/styles/consortium.css) | Everything under `.ct`; strata colours only in the drawing and legend; in print, the light palette on white whatever the theme |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides linked per plant, per job (`null` when no guide covers the job: helpers), and for the explanations; a plant links only guides that grow or use it, never one passing sentence |

Routes: `/consortium/`, `/fr/guilde/` (the French tool is a "guilde"), `/{lang}/consortium/` for the other 9.

# Behaviour worth knowing

- After a country is chosen, focus moves to `#ct-result-title` and `#ct-say` announces the summary; on phone the heading is scrolled to the top so the drawing and its numbered key show on the first screen.
- "N plants need a look" counts moderate and severe toxicity plus whatever the core flags (`needsLook`); slight toxicity stays on the card.
- Swap and Add list flagged plants last, under "With a warning"; choosing one asks one confirmation that names the warnings.
- A fresh result never says "no better plant"; with free places and nothing to fill it uses `freeNone`.
- Phone: the drawing shows numbers only, with a two-column key; Keep and Remove are icon buttons with labels; the "I want to grow…" search sits under the views when no place is free.
- A link or saved state opens on the result: an inline script sets the compact head before paint, and `#ct-app` keeps `min-height: 100vh` while loading, so nothing shifts.
- A confirmation for a flagged plant replaces that plant's Add or Use button, inside its own list row (never two Add buttons, and a list holds only items); Cancel gives the focus back to the button.
- A double click on Remove removes one plant (`repeatClick`: the second click of a double click, or a pointer click within 500 ms, is ignored; keyboard presses always count).
- Closing a sheet from an action (Swap, Remove in details, Add, a new climate) closes the dialog at once and moves focus to the plant, Undo, or the result title.
- Each place load has a number; a cell that arrives after a later choice is dropped. The address bar and saved state are left alone while loading or on error; a shared link still waiting for its cell is written back with its own prefixes. Picking another climate or place leaves the link behind (only a guide's plant carries over, while the link still waits for its cell) and drops its notices (guide plant, old link, restored). The loading screen always takes the focus on its status line. A no-match writes no `a=`, so a reload works it out again; an emptied consortium writes `a=` and stays empty.
- An Undo toast goes once the consortium is remade, refilled or moved; Start over's Undo restores the whole earlier state, cell included.
- No action rebuilds the plants that are not kept without an Undo: a site answer or a place change (climate, country, region, opt-in) holds the ready result before it (`holdForRedo`), and once the new result, not-covered or error screen shows, a toast offers Undo (`redoneSite`, or `redonePlace` naming the old place). Arrow keys through a radio group keep the result before the first change.
- Unknown allelopathy and spread show as "not checked yet" on cards and in details, never as none.
- The borrowed-list label ("Plants from the X list…") shows on result, no-match and print, and says whether invasiveness was checked for the user's country; place names follow a colon, so no language needs an article before them.
- Strata labels and phase terms are the Canopi app's own (`canopi/desktop/web/src/i18n/`), except where the owner decision "strata are about light first" outranks them: ja 突出層 / 上層 / 中層 / 下層 and ko 돌출층 / 상층 / 중층 / 하층 name light positions (the app's 高木層, 低木層, 교목층 name tree and shrub layers), and zh writes 顶极群落 (the app has 顶级群落). The test pins them and forbids tree or shrub words in strata labels.
- No requests outside the site; the tool JS is about 27 KB gzipped (minified bundle), each cell about 60 to 66 KB gzipped.

- Language switch (seam M1): the header's language links (inline and phone Menu) carry `location.search`, kept current after every `replaceState` (`syncLangLinks`); other pages' links are unchanged. Typed guesses `/fr/consortium/` and `/guilde/` redirect to `/fr/guilde/` (`public/_redirects`).
- A guide preset (`?plant=&climate=`) with no place uses the place of the consortium saved on this device (`S.placeFrom = 'device'`), and is never silent: the guide note shows on the result and on "Not covered yet" (there `fromGuideWait`: the plant is kept once a place with a list is chosen), with one line (`placeFrom`, `.place-from`) naming the place from this device and a Change button; choosing a place drops the line; before a place is chosen the tool loads the cell of that climate to name the plant as it will ("Pear (*Pyrus communis*)"). A guide's climate applies to this consortium only: the shared site climate (`canopi-climate`) changes only when the reader picks a climate in the tool (decision taken in the fixes round; the note says "This consortium uses the … climate").
- The "need a look" banner is a list (`ul.att-list`), one plant per line with its actions inside its own item. A plant that misfits the site (often the guide's) states what it needs (its size against the room, its light…) and offers Swap and Remove (`removeShort`). The site answers are facts about the reader's garden: the tool never offers changing one to fit a plant (`nm.try` belongs to the no-match state only).
- Each view has a written-out "?" explanation button; each plant row has a "?" beside its phase words that opens the phase explanation in the row (`S.explain = 'phase-<id>'`).
- While a header menu is open, a result arriving takes the focus without scrolling (Safari leaves a tapped summary unfocused). On this page `.site-header` has `z-index: 45`, above the toast (40).
- Desktop side panel: always sticky (`top: 16px`), at most `100dvh - 32px` tall, and scrolls inside itself; its order is Your place, I want to grow… with Fill, then Your site, so the main actions show at the top at every page scroll position and it never changes layout mid-scroll. `render()` keeps its scroll position.
- "Not covered yet" for a country of Northern America in a climate whose only list is Central and South America and the Caribbean (Tropical × Mexico) adds one sentence (`nc.why`, `.nc-why`): the beta covers that region, and the data counts the country as Northern America.
- The not-covered title names the user's place (country), never a region name that contradicts the climate. Print: no ASCII punctuation glued to translated text (warnings one per line, jobs with `Intl.ListFormat`).
- Climates are listed in `src/data/climates.ts` order, as in the site picker.
- Words: the action is "Keep" (keys `keep`, `unkeep`, `keptTag`, `keptNow`, `unkeptNow`); French site field « Surface »; `southern_america` is named for what WGSRPD puts in it (Central and South America and the Caribbean, Mexico in Northern America), the same in the home note and the guide links.
# Tests

- [consortium-page.test.mjs](../../scripts/consortium-page.test.mjs): strings in 11 locales (every key used, dynamic prefixes checked against core ids), app strata and phase terms, plural place counts, borrowed sentences with no article before a place, guides exist and cover their plants (crop list, heading, table, list item, bold or `<Term>`, or twice in prose; frontmatter, alt text and safety boxes ignored; a human check beyond that), `initDialogs` skipping `data-own-dialog`, `words.js`, `logic.js`.
- [check-built-site.mjs](../../scripts/check-built-site.mjs): the 11 built pages, their hreflang and the installed data.
