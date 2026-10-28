---
type: Module
title: Consortium page
description: "The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T13:31:40Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T13:31:51Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:c33aec46a30e345c
    last_modified: 2026-10-28T12:22:08Z
  - id: app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:98c3cc2386f3ee9b
    last_modified: 2026-10-28T13:24:43Z
  - id: words-js
    resource: ../../src/scripts/consortium/words.js
    title: src/scripts/consortium/words.js
    digest: sha256:25d33c97bd2b957e
    last_modified: 2026-10-28T13:09:26Z
  - id: draw-js
    resource: ../../src/scripts/consortium/draw.js
    title: src/scripts/consortium/draw.js
    digest: sha256:c446a372513ce7a1
    last_modified: 2026-10-28T01:05:25Z
  - id: data-ts
    resource: ../../src/scripts/consortium/data.ts
    title: src/scripts/consortium/data.ts
    digest: sha256:847721bc3f77d014
    last_modified: 2026-10-28T12:22:08Z
  - id: consortium-css
    resource: ../../src/styles/consortium.css
    title: src/styles/consortium.css
    digest: sha256:8786f8fa6b1dcabf
    last_modified: 2026-10-28T13:09:26Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:f7e2fc8ce6d55b8c
    last_modified: 2026-10-28T09:57:25Z
  - id: consortium-page-test-mjs
    resource: ../../scripts/consortium-page.test.mjs
    title: scripts/consortium-page.test.mjs
    digest: sha256:2a62b08bafae0201
    last_modified: 2026-10-28T13:25:40Z
  - id: logic-js
    resource: ../../src/scripts/consortium/logic.js
    title: src/scripts/consortium/logic.js
    digest: sha256:5c8526d54d4abb6b
    last_modified: 2026-10-28T13:24:02Z
  - id: manifest-json
    resource: ../../public/data/consortium/manifest.json
    title: public/data/consortium/manifest.json
    digest: sha256:329133fbeb4fc404
    last_modified: 2026-10-28T12:08:03Z
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
  - id: parts-js
    resource: ../../src/scripts/consortium/parts.js
    title: src/scripts/consortium/parts.js
    digest: sha256:ed6b3d3eaba097fb
    last_modified: 2026-10-28T13:24:16Z
  - id: consortium-country-test-mjs
    resource: ../../scripts/consortium-country.test.mjs
    title: scripts/consortium-country.test.mjs
    digest: sha256:509c8a10e8863f2e
    last_modified: 2026-10-28T13:25:40Z
  - id: memory-js
    resource: ../../src/scripts/consortium/memory.js
    title: src/scripts/consortium/memory.js
    digest: sha256:33a718cece79b3d0
    last_modified: 2026-10-28T13:23:49Z
enforced_by:
  - scripts/consortium-page.test.mjs
  - scripts/consortium-country.test.mjs
---

# Responsibility

The consortium tool's page: the visitor picks a climate and gets 6 to 12 plants at once (one plant list per climate, format 3); the country is optional and only sets the invasive warnings. The plants that work together, shown as layers, over time and by job, with Swap, Add, details, share and print. All logic comes from the [Consortium core](/modules/consortium-core.md); the page never copies its rules.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | Its script runs `initChrome()` first, then `import()`s app.js, so a tool failure never breaks the header. Server-rendered tool head (title, Beta, lede `home.consortium.lede` shared with the home section, `betaNote` counting `manifest.climates.length`, feedback link), `noscript`, the `#ct-app` mount, one `<dialog id="ct-dialog" data-own-dialog>` (the site's `initDialogs` in `src/scripts/dialogs.js` skips it; the app handles Escape, backdrop and scroll lock itself), toast, `#ct-say` live region, print sheet; writes `#ct-data` (the `consortium.*` strings without prefix, climate names, guide titles and URLs) |
| [app.js](../../src/scripts/consortium/app.js) | The whole tool: state `S`, `render()`, sheets (`O`, one dialog with `data-kind`), actions table, share link; what it keeps for the reader goes through memory.js |
| [memory.js](../../src/scripts/consortium/memory.js) | What the tool keeps apart from the address bar, every call caught when storage throws: `memoryOf({ storage, history, location })` with `saved`/`save` (`localStorage["canopi-consortium"]`, `{ q, at, src }`), `pref` (the reader's own country: this tab's `history.state.canopiCountry`, else `localStorage["canopi-country"]`, else a language link's `mine`), `choose` (writes both), `settle` (on a page a language link opened: `mine` moves into `history.state` and leaves the address bar), `startOver` (removes the save only); `startState` (the link or the save, and `pickCountry` with `pref` and the save's `src`). `consortium-country.test.mjs` runs it with a stubbed storage and history |
| [words.js](../../src/scripts/consortium/words.js) | `makeWords(strings, lang)` → `T`, `P` (plural forms `one: … \| other: …` with `#`), lists, phase time words; `needsLook`, `searchText`, `fold`, `plantName` |
| [draw.js](../../src/scripts/consortium/draw.js) | `profileSVG`: the side-view drawing of the layers, with a third of a column of margin each side so no crown is cut; returns `colPct` for the HTML labels |
| [logic.js](../../src/scripts/consortium/logic.js) | Pure page rules tested in node: `withQuery` (the language links' query), `droppedPlants` (old-link count), `trimGaps`, `mayPersist`, `photoSource`, `shown` (with `next`, what one "Show more" reveals), `linkMembers` (the link's `a`), `afterMove` (notices dropped on a climate change), `repeatClick` (double-click guard), `safeHref` (only http(s) URLs become links), `licenceOf` (licence name and Creative Commons deed link, public domain flagged), `swapTarget` (the plant a details sheet opened from Swap would replace), `relaxTo` (the looser site answer, null when it is the current one), `pickCountry` (the country at start, with where it came from), `guessCountry` (the browser's country from its time zone, else its languages), `linkCountry` (the country part of the address bar and the save), `langSearch` (the language links' query with the reader's `mine`), `chosenHere` (the guess card is marked chosen only for a `user`/`saved` source), `printNoneKey` (`printNoneYet` while allelopathy or the country's invasive status is unchecked), `invasiveSourceIds` (a plant's invasive sources; GRIIS for an empty `invasive_in`) |
| [parts.js](../../src/scripts/consortium/parts.js) | Pure words about reasons and the reader's country, rendered with the page's `makeWords`: `cardReasonHTML` (a card's reason, always with its region, "also chosen for # other regions"), `reasonsHTML` (details), `countryWhy` and `countryLineParts` (the country line), `warnWhere` (result sub-line), `printWhere` (print head), `countryAnnouncement` (the live announcement after a country choice), `invasiveCardNote` (the no-country count chip on cards and print rows), `invasiveDetails` (details' invasive items) |
| [data.ts](../../src/scripts/consortium/data.ts) | `loadManifest`, `loadLabels`, `loadClimate` from `/data/consortium/` |
| [consortium.css](../../src/styles/consortium.css) | Everything under `.ct`; strata colours only in the drawing (`.profile`, its numbered labels and key) and the strata legend (`.strata-mini`); number rings elsewhere and timeline bars in neutral ink; in print, the light palette on white whatever the theme |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides linked per plant, per job (one guide for each of the six jobs, never `null`; helpers is `garden-helpers`, the pollinator hub, whose quick answer the test ties to the job's line), and for the explanations; a plant links only guides that grow or use it, never one passing sentence (the pollinator guides add borage, lavender, phacelia, dog rose, purple willow, elder and white clover; goldenrod, tomato and mango were dropped on 2026-10-28 as single mentions). A guide that opens the tool with a plant (`<TryConsortium>`) is linked back from that plant when it really discusses it (runner bean, pigeon pea, walnut, chestnut and carob added 2026-10-28); the presets of olive in `coppice-and-bamboo` and breadfruit in `food-forest` stay one-way under the three-guide cap, and garden-helpers' tomato and mango presets stay one-way as single mentions. `consortium-page.test.mjs` knows lavender, elder and runner bean by their kind word |

Routes: `/consortium/`, `/fr/guilde/` (the French tool is a "guilde"), `/{lang}/consortium/` for the other 9.

# Behaviour worth knowing

- After a climate is chosen, focus moves to `#ct-result-title` and `#ct-say` announces the summary; on phone the heading is scrolled to the top so the drawing and its numbered key show on the first screen.
- The warnings summary, headed "With a warning", lists moderate and severe toxicity plus whatever the core flags (`needsLook`); slight toxicity stays on the card.
- One warning heading everywhere (owner, 2026-10-28): `consortium.withWarning` ("With a warning" and its translations) heads the flagged plants in Swap and Add (with `flaggedNote` under it), the warnings summary, the print table's warnings column and the hidden label of the warning mark on the drawing, its key and the Over time rows. No "Cautions" label: the merged soft chip shows its list alone, first letter capitalised (`capFirst`).
- Swap and Add list flagged plants last, under "With a warning" (`withWarning`); choosing one asks one confirmation that names the warnings.
- A fresh result never says "no better plant"; with free places and nothing to fill it uses `freeNone`.
- Phone: the drawing shows numbers only, with a two-column key; Keep and Remove are icon buttons with labels; the "I want to grow…" search sits under the views when no place is free.
- Any known climate opens on the result: the inline first-paint script in ConsortiumPage.astro follows the app's start rules (the link's `c`, else its `climate`, when the link has `c`, `climate` or `plant`; else the saved consortium's `c`; else `html[data-climate]`, checked against `data-climates` on `#ct-head`) and sets `data-step="1"` and the compact head before paint; the country never holds the setup. `#ct-app` keeps `min-height: 100vh` while loading, so nothing shifts.
- A confirmation for a flagged plant replaces that plant's Add or Use button, inside its own list row (never two Add buttons, and a list holds only items); Cancel gives the focus back to the button.
- A double click on Remove removes one plant (`repeatClick`: the second click of a double click, or a pointer click within 500 ms, is ignored; keyboard presses always count).
- Closing a sheet from an action (Swap, Remove in details, Add, a new climate) closes the dialog at once and moves focus to the plant, Undo, or the result title.
- Each climate load has a number; a file that arrives after a later choice is dropped. The address bar and saved state are left alone while loading or on error; a shared link still waiting for its file is written back with its own prefixes. Picking another climate leaves the link behind (only a guide's plant carries over, while the link still waits for its file) and drops its notices (guide plant, old link, restored). The loading screen always takes the focus on its status line. A no-match writes no `a=`, so a reload works it out again; an emptied consortium writes `a=` and stays empty.
- An Undo toast goes once the consortium is remade, refilled or moved; Start over's Undo restores the whole earlier state, climate file included. Start over keeps the country and goes back to the site climate.
- No action rebuilds the plants that are not kept without an Undo: a site answer or a climate change holds the ready result before it (`holdForRedo`), and once the new result, not-covered or error screen shows, a toast offers Undo (`redoneSite`, or `redoneClimate` naming the old climate). A country change rebuilds nothing: it only re-renders the warnings and announces `countryAnnouncement`: `warningsNow` for a country GRIIS has a list for, "Invasive status not checked in {country}." for one it has none for, `warningsNone` for no country. Arrow keys through a radio group keep the result before the first change.
- Every plant list (rows, Swap, Add, Over time, Jobs, the drawing's numbered key, print) shows the scientific name beside the name (`sciHTML`, nothing when they are the same); the desktop drawing labels and sentences show the name only.
- Source and photo links: only http(s) URLs are links (`safeHref`), anything else is plain text; licences link their Creative Commons deed with `rel="license noopener"` (`licenceHTML`), public domain is translated (`publicDomain`).
- A details sheet opened from Swap offers "Use this instead" (`useInstead`) for the plant being swapped, never Add.
- "Show more plants if I loosen…" lists only answers that can be loosened (`relaxTo`).
- Unknown toxicity, invasive status, spread and jobs show as "not checked yet" on cards, rows, Swap, Add and print (`uncheckedOnCard` in `logic.js`). Unknown allelopathy shows in a plant's details only (owner, 2026-10-28). Neither is ever shown as none; a known allelopathic plant keeps its soft warning everywhere.
- Country (owner, 2026-10-28; design `.local/consortium/climate-first/design-ui.md`; review fixes 2026-10-28): `countryLineHTML` (from `countryLineParts`) shows "Invasive warnings for [France ▾]" above the climate cards and in the side panel, always with where the country came from: guessed from your browser (`countryGuessed`, dashed chip, `data-src="guess"`), from the shared link (`countryLinked`) or chosen by you (`countryChosen`); for a country GRIIS has no list for, `countryNoList` ("not checked: there is no invasive list for this country") sits beside that label, never instead. With no country, the line holds the view's only "Add your country" (or the "No country ▾" chip the reader chose) and its only worldwide-counts line (`noCountryNote`); the result has no second one. `guessCountry` (logic.js) takes the one manifest country whose CLDR time zones include the browser's, else the region of `navigator.languages`. A guess is never written to a link or to the save (`stateNow` drops a `countrySource === 'guess'`); a chosen country goes in `k`; "No country" (`countryNone`) is `k=-` in the local save only.
- Where the country comes from at start (`startState` → `pickCountry`): a link's own `k`, labelled "chosen by you" when it equals the reader's own choice (so their reload or language switch never reads "from the shared link") and "from the shared link" otherwise; else the reader's choice (`pref`: this tab's `history.state`, which survives a reload when storage is blocked, else `canopi-country` on the device, written by every country choice in any status and left alone by Start over, else the `mine` a language link carries); else the saved consortium's country with the source saved beside it (`src`; under a link with no `k`, such as a guide preset, it reads "saved"); else the guess. A link's `k=-` (links never carry it) is read as no `k`. An unknown link `k` shows `countryUnknown` ("not a country code we know") and the reader's own choice (or "No country"), never the guess; while no country is in use the code stays in the address bar (`linkCode`, until the reader chooses), so a reload shows the same. A stale stored code is quiet. The language links carry the reader's own choice as `mine` (`langSearch`); on arrival it moves into the tab and leaves the address bar, so a copied address never carries it.
- Invasive warnings: with a country GRIIS checked, a plant invasive there shows `invHere` on its card, in the "With a warning" box (`needsLook` tests `flags.invasive === true` on its own), in details (`d.invHere` with the liability line) and in print (`printWarnings`); Add and Swap never ask a confirmation for it. A country GRIIS did not check says "not checked" everywhere it is named or implied, never "warnings for" it or "all checked": once per view (the country line's `countryNoList`, the result sub-line `warnWhere`: `invStatusNotChecked`, the print head `printWhere`), the live announcement (`countryAnnouncement`) and details (`invNotChecked`/`d.invNotChecked`). It is not a chip on every card, row or print row (coordinator choice, 2026-10-28, core-fix review 2 m-2: a status the same for every plant must not come ahead of a plant's own warnings; it follows the owner's allelopathy row); a print row with nothing else to say reads `printNoneYet`, never `printNone` (`printNoneKey`). With a checked country a card shows only that country's warning; the count of countries is in details (`d.invList`, distinct countries). With no country, the card has the soft count chip (distinct countries). An empty `invasive_in` reads `d.invNone` "Not recorded invasive in any country checked by the global register of invasive species (GRIIS)", with no "(checked)" mark, and the plant's Sources list GRIIS (`invasiveSourceIds`). Country names follow a colon in fr, pt and it, so no article is needed.
- Reasons are regional: a card shows the first with its region (`reasonCard` "Chosen for {region}: {reason}", the region in semibold) and `moreRegions` when other regions chose the plant too; details list every reason (`reasonsHTML`: text, then `reasonFrom` "Chosen for {region} · from {sources}", worded so it fits any number of sources); `region.<id>` names stay only for these labels. Each interaction in details names all its sources (`d.conflictFrom`). The 2026-10-28 export has no plant with two reasons; the fixture has one interaction with two sources.
- Phones hide the climate cards' descriptions (`.climate-choice .about`) and offer them in one `<details class="climate-abouts">` ("What the climates mean", `climatesAbout`).
- Strata labels and phase terms are the Canopi app's own (`canopi/desktop/web/src/i18n/`), except where the owner decision "strata are about light first" outranks them: ja 突出層 / 上層 / 中層 / 下層 and ko 돌출층 / 상층 / 중층 / 하층 name light positions (the app's 高木層, 低木層, 교목층 name tree and shrub layers), and zh writes 顶极群落 (the app has 顶级群落). The test pins them and forbids tree or shrub words in strata labels.
- No requests outside the site; the tool JS is about 27 KB gzipped (minified bundle), each climate file about 60 to 66 KB gzipped (not re-measured for format 3).

- Language switch (seam M1): the header's language links (inline and phone Menu) carry `location.search`, kept current after every `replaceState` (`syncLangLinks`); other pages' links are unchanged. Typed guesses `/fr/consortium/` and `/guilde/` redirect to `/fr/guilde/` (`public/_redirects`).
- A guide preset (`?plant=&climate=`) opens straight on the result and is never silent: the guide note shows on the result and on "Not covered yet" (there `fromGuideClimate`: the plant is kept once a climate with a list is chosen); the tool loads that climate's file to name the plant as it will ("Pear (*Pyrus communis*)"). Guide links read "{plant} · {climate}". A guide's climate applies to this consortium only: the shared site climate (`canopi-climate`) changes only when the reader picks a climate in the tool (decision taken in the fixes round; the note says "This consortium uses the … climate").
- The "With a warning" banner is a list (`ul.att-list`), one plant per line with its actions inside its own item. A plant that misfits the site (often the guide's) states what it needs (its size against the room, its light…) and offers Swap and Remove (`removeShort`). The site answers are facts about the reader's garden: the tool never offers changing one to fit a plant (`nm.try` belongs to the no-match state only).
- Each view has a written-out "?" explanation button; each plant row has a "?" beside its phase words that opens the phase explanation in the row (`S.explain = 'phase-<id>'`).
- While a header menu is open, a result arriving takes the focus without scrolling (Safari leaves a tapped summary unfocused). On this page `.site-header` has `z-index: 45`, above the toast (40).
- Desktop side panel: always sticky (`top: 16px`), at most `100dvh - 32px` tall, and scrolls inside itself; its order is Your climate (with the country line), I want to grow… with Fill, then Your site, so the main actions show at the top at every page scroll position and it never changes layout mid-scroll. `render()` keeps its scroll position.
- "Not covered yet: {climate}" lists the covered climates (`nc.text`, a plural of `covered.length`), offers "Choose another climate" (`nc.other`) and "Ask for this climate" (`nc.ask`); the country plays no part. Every climate card stays a button, covered or not. Print: no ASCII punctuation glued to translated text (warnings one per line, jobs with `Intl.ListFormat`).
- Climates are listed in `src/data/climates.ts` order, as in the site picker.
- Words: the action is "Keep" (keys `keep`, `unkeep`, `keptTag`, `keptNow`, `unkeptNow`); French site field « Surface »; `southern_america` is named for what WGSRPD puts in it (Central and South America and the Caribbean), as a reason label.
# Tests

- [consortium-page.test.mjs](../../scripts/consortium-page.test.mjs): strings in 11 locales (every key used, dynamic prefixes checked against core ids), app strata and phase terms, plural climate counts, country sentences with no article before a country, the first-paint script against the app's start rules, a guess never in a link, `k=-` in the save only, invasive-here warnings without confirmation, the region-era guide keys gone, guides exist and cover their plants (crop list, heading, table, list item, bold or `<Term>`, or twice in prose; frontmatter, alt text and safety boxes ignored; a human check beyond that), `initDialogs` skipping `data-own-dialog`, `words.js`, `logic.js`.
- [consortium-country.test.mjs](../../scripts/consortium-country.test.mjs): behaviour of the country and reason words with the real locale files: `pickCountry` (chosen survives reload and language switch, someone else's link, Start over, "No country", old saves, an unknown or `-` link code, a guide preset over a save), the memory.js wiring run with stubbed storage and history (a choice written to `canopi-country`, kept by Start over, and kept in the tab and through a language switch when storage throws), `countryAnnouncement`, `chosenHere`, `printNoneKey`, `invasiveSourceIds`, `guessCountry`, card and details reasons, the country line, the unchecked-country surfaces, `d.invNone`, `countryUnknown`, the core's required checked flag, and the review's wording fixes (m10, m11).
- [check-built-site.mjs](../../scripts/check-built-site.mjs): the 11 built pages, their hreflang, header (current link through `consortiumPath`, from `src/i18n/consortium-path.js`), links and assets, and the installed data through `verifyInstall`.
