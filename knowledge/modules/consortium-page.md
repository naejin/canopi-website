---
type: Module
title: Consortium page
description: "The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T14:56:16Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T13:31:51Z }
sources:
  - id: crops-js
    resource: ../../src/scripts/consortium/crops.js
    title: src/scripts/consortium/crops.js
    digest: sha256:22076cb239b7662b
    last_modified: 2026-10-28T14:37:25Z
  - id: consortium-scale-test
    resource: ../../scripts/consortium-scale.test.mjs
    title: scripts/consortium-scale.test.mjs
    digest: sha256:d2aefa6a95cfc240
    last_modified: 2026-10-28T14:41:51Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:ca7b150f5bc0dc4f
    last_modified: 2026-10-28T14:42:54Z
  - id: app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:29afb35a702b6bf5
    last_modified: 2026-10-28T14:48:39Z
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
    digest: sha256:5e07025352dce24f
    last_modified: 2026-10-28T14:45:18Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:f7e2fc8ce6d55b8c
    last_modified: 2026-10-28T09:57:25Z
  - id: consortium-page-test-mjs
    resource: ../../scripts/consortium-page.test.mjs
    title: scripts/consortium-page.test.mjs
    digest: sha256:921579b17f5e31db
    last_modified: 2026-10-28T14:47:26Z
  - id: logic-js
    resource: ../../src/scripts/consortium/logic.js
    title: src/scripts/consortium/logic.js
    digest: sha256:741668a9fd71fbbf
    last_modified: 2026-10-28T14:37:58Z
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
    digest: sha256:38a75ea50ff9e81e
    last_modified: 2026-10-28T14:47:16Z
  - id: consortium-country-test-mjs
    resource: ../../scripts/consortium-country.test.mjs
    title: scripts/consortium-country.test.mjs
    digest: sha256:12cd65c1a08ef9ea
    last_modified: 2026-10-28T14:42:24Z
  - id: memory-js
    resource: ../../src/scripts/consortium/memory.js
    title: src/scripts/consortium/memory.js
    digest: sha256:0723ac2be2fd9bae
    last_modified: 2026-10-28T14:40:13Z
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
| [memory.js](../../src/scripts/consortium/memory.js) | What the tool keeps apart from the address bar, every call caught when storage throws: `memoryOf({ storage, history, location })` with `saved`/`save` (`localStorage["canopi-consortium"]`, `{ q, at, src }`), `pref` (the reader's own country: this tab's `history.state.canopiCountry`, else `localStorage["canopi-country"]`; only `choose` writes either), `choose` (writes both), `arrive` (called in app.js before the manifest's `await`, through logic.js `arrivalParams`: reads the tool's state from the fragment, else from an older link's query, which `replaceState` moves into the fragment; drops an old link's `mine` from either and returns the state without it; `mine` is never read; sets `fromFragment`), `own`/`addOwn` (the main crops and "Add anyway" guests the reader chose on this device: `localStorage["canopi-own"]` and `history.state.canopiOwn`; only these read "your main crop", "you chose it", "you added it", a shared link's are described neutrally with the `…Link` strings), `startOver` (removes the save and the own picks); `startState` (the link or the save, and `pickCountry` with `pref` and the save's `src`). `consortium-country.test.mjs` runs it with a stubbed storage and history |
| [words.js](../../src/scripts/consortium/words.js) | `makeWords(strings, lang)` → `T`, `P` (plural forms `one: … \| other: …` with `#`), lists, phase time words; `needsLook`, `searchText`, `fold`, `plantName` |
| [draw.js](../../src/scripts/consortium/draw.js) | `profileSVG`: the side-view drawing of the layers, with a third of a column of margin each side so no crown is cut; returns `colPct` for the HTML labels |
| [logic.js](../../src/scripts/consortium/logic.js) | Pure page rules tested in node: `withHash` (a language link with the tool's fragment), `arrivalParams` and `isToolState` (where the state is read on arrival: the fragment, else an older link's query, moved to the fragment; a page anchor such as `#main` is not a state), `linkDamaged` (a link cut or unreadable: a plant list that does not parse, an unknown `v`, or a fragment v3 link without the `e=1` end marker), `keepCountry` (Back to your consortium and Undo restore the plants, never an older country), `redoToastKey`, `siteChangeRebuilds` (a room change on a result only flags misfits), `afterSwap` (a main crop swapped stops being one), `climateSourceAt` (guide, site, link, saved; `user` is set by a pick in the tool), `droppedPlants` (old-link count), `trimGaps`, `mayPersist`, `photoSource`, `shown` (with `next`, what one "Show more" reveals), `linkMembers` (the link's `a`), `afterMove` (notices dropped on a climate change, the link's unknown country code with them), `noLinkCode` (what Dismiss clears), `keptCountry` (the country after Start over or a climate change: the reader's own `user` country, else `pref`, else the guess; never someone else's link's country or `linkCode`), `repeatClick` (double-click guard), `safeHref` (only http(s) URLs become links), `licenceOf` (licence name and Creative Commons deed link, public domain flagged), `swapTarget` (the plant a details sheet opened from Swap would replace), `relaxTo` (the looser site answer, null when it is the current one), `pickCountry` (the country at start, with where it came from), `guessCountry` (the browser's country from its time zone, else its languages), `linkCountry` (the country part of the address bar and the save), `langHash` (the language links' fragment: the address bar's tool state, an old `mine` dropped, never the reader's country, never a page anchor), `chosenHere` (the guess card is marked chosen only for a `user` source), `printNoneKey` (`printNoneYet` while allelopathy or the country's invasive status is unchecked, and always for a plant from another list), `invasiveSourceIds` (a plant's invasive sources; GRIIS for an empty `invasive_in`), `asksCrops` (a link opens on the crop step), `opensOnResult` (the first-paint rule), `shareUrl` (Copy link's address: the path and `#` + the tool's state only, an old `mine` dropped) |
| [crops.js](../../src/scripts/consortium/crops.js) | Pure rules of the main-crops step and "Add anyway": `foodPlants`/`isFood` (the `crop` role), `cropHits`/`cropMatches` (shown name in the reader's language and scientific name; starts, then a word, then inside; then the English name when the page hides it, ranked after every shown-name hit and shown in brackets: « Cerisier acide (Sour cherry) »), `cropLabel` (the one string an option shows, is named by and matched), `cropExamples(cell, n, chosen)` (never a chosen crop: the examples and the placeholder), `elsewhereHit` (the first other list, in climates' order, with a matching plant, for the no-match message), `otherListMatches` (the Add search's "In another climate's list"), `inClimateOrder` and `loadLists` (the other lists in `src/data/climates.ts` order, with the ones that failed), `addFilterMatch` (the Add sheet's job, layer and stage filters, for its own list and the other lists alike), and the Kept filter seam for chunk B (`KEPT_FILTERS`, `keptFilter`, `keptCounts`) |
| [parts.js](../../src/scripts/consortium/parts.js) | Pure words about reasons and the reader's country, rendered with the page's `makeWords`: `cardReasonHTML` (a card's reason, always with its region, "also chosen for # other regions"), `reasonsHTML` (details), `countryWhy` and `countryLineParts` (the country line), `warnWhere` (result sub-line), `printWhere` (print head), `countryAnnouncement` (the live announcement after a country choice), `invasiveCardNote` (the no-country count chip on cards and print rows), `invasiveDetails` (details' invasive items), `cardInvasive`/`detailsInvasive` (the same, handed the taxon), `roomHint` (the room's height and width limit from `ROOM_LIMIT_M` and its suggestion size from `SIZE_LIMIT`), `builtKey`/`mainCropKey`/`fromListKey` (own or neutral wording) |
| [data.ts](../../src/scripts/consortium/data.ts) | `loadManifest`, `loadLabels`, `loadClimate` from `/data/consortium/` |
| [consortium.css](../../src/styles/consortium.css) | Everything under `.ct`; strata colours only in the drawing (`.profile`, its numbered labels and key) and the strata legend (`.strata-mini`); number rings elsewhere and timeline bars in neutral ink; in print, the light palette on white whatever the theme |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides linked per plant, per job (one guide for each of the six jobs, never `null`; helpers is `garden-helpers`, the pollinator hub, whose quick answer the test ties to the job's line), and for the explanations; a plant links only guides that grow or use it, never one passing sentence (the pollinator guides add borage, lavender, phacelia, dog rose, purple willow, elder and white clover; goldenrod, tomato and mango were dropped on 2026-10-28 as single mentions). A guide that opens the tool with a plant (`<TryConsortium>`) is linked back from that plant when it really discusses it (runner bean, pigeon pea, walnut, chestnut and carob added 2026-10-28); the presets of olive in `coppice-and-bamboo` and breadfruit in `food-forest` stay one-way under the three-guide cap, and garden-helpers' tomato and mango presets stay one-way as single mentions. `consortium-page.test.mjs` knows lavender, elder and runner bean by their kind word |

Routes: `/consortium/`, `/fr/guilde/` (the French tool is a "guilde"), `/{lang}/consortium/` for the other 9.

# Behaviour worth knowing

- After a climate is chosen, focus moves to `#ct-result-title` and `#ct-say` announces the summary; on phone the heading is scrolled to the top so the drawing and its numbered key show on the first screen.
- The warnings summary, headed "With a warning", lists moderate and severe toxicity plus whatever the core flags (`needsLook`); slight toxicity stays on the card.
- One warning heading everywhere (owner, 2026-10-28): `consortium.withWarning` ("With a warning" and its translations) heads the flagged plants in Swap and Add (with `flaggedNote` under it), the warnings summary, the print table's warnings column and the hidden label of the warning mark on the drawing, its key and the Over time rows. No "Cautions" label: the merged soft chip shows its list alone, first letter capitalised (`capFirst`).
- Swap and Add list flagged plants last, under "With a warning" (`withWarning`); choosing one asks one confirmation that names the warnings.
- No count of free places anywhere (decision "Scale mockup approved"): the summary reads "{n} plants · {room} · {n} kept"; the room hints name the height and width the room check allows and the suggestion size, from the core ("Plants up to 6 m tall and across · suggestions of 6", "… 12 m … · suggestions of 9", "Plants of any size · suggestions of 12"); the room never limits how many plants a consortium has: on a result a room change only flags the plants that no longer fit (no re-suggestion), and Fill fills up to the room's suggestion size; the "Fill the gaps" row shows only when `fillable()` finds a plant to add, else the "I want to grow…" search sits there. The ledes say a consortium starts at 6 to 12 plants and can grow to hundreds.
- Main crops (scale chunk A, 2026-10-28): after a climate is picked (cards, or a link with only `c`), the status `crops` asks "What do you mainly want to grow?" (optional): a search over the climate's food plants (`crops.js`), up to three chips with 44 px remove buttons, a `role=status` line (`#crop-st`) for matches, the limit and no-match (naming another climate's list when one has the plant, with no switch offered), one-tap examples, and one Suggest button ("Suggest plants around it/them", hint "To get a suggestion without it/them, remove…"), no Skip. The crops become kept members; the result shows "Built around your main crop(s), …" with Change crops (back to the step with "Back to your consortium"; suggesting again keeps the other kept plants, with Undo). A main crop is tagged "Main crop" on cards, rows, details and print; its details have a Main crop section and "What it does", and its foot offers Keep, "Not a main crop" and Remove (no Swap). The crop step is never saved; a reload returns to the result or the climate.
- Add anyway: the Add search lists plants only other climates have under "In another climate's list" (their files loaded on demand, `loadOthers`) with "Add anyway"; such a plant is kept, labelled "from the {Climate} list" (`list.<climate>` strings) on rows, cards, details (a section explaining where its data comes from) and print, and travels in the link's `g`.
- Phone: the drawing shows numbers only, with a two-column key; Keep and Remove are icon buttons with labels; the "I want to grow…" search sits under the views when no place is free.
- A known climate opens on the result unless the crop step comes first (`opensOnResult`: a save, or a link with `a`, a non-empty `p`, `x`, `n` or `g`, or a guide plant the list has): the inline first-paint script in ConsortiumPage.astro follows the app's start rules (the link's `c`, else its `climate`, when the link has `c`, `climate` or `plant`; else the saved consortium's `c`; else `html[data-climate]`, checked against `data-climates` on `#ct-head`) and sets `data-step="1"` and the compact head before paint; the country never holds the setup. `#ct-app` keeps `min-height: 100vh` while loading, so nothing shifts.
- A confirmation for a flagged plant replaces that plant's Add or Use button, inside its own list row (never two Add buttons, and a list holds only items); Cancel gives the focus back to the button.
- A double click on Remove removes one plant (`repeatClick`: the second click of a double click, or a pointer click within 500 ms, is ignored; keyboard presses always count).
- Closing a sheet from an action (Swap, Remove in details, Add, a new climate) closes the dialog at once and moves focus to the plant, Undo, or the result title.
- Each climate load has a number; a file that arrives after a later choice is dropped. The address bar and saved state are left alone while loading or on error; a shared link still waiting for its file is written back with its own prefixes. Picking another climate leaves the link behind (only a guide's plant carries over, while the link still waits for its file) and drops its notices (guide plant, old link, restored). The loading screen always takes the focus on its status line. A no-match writes no `a=`, so a reload works it out again; an emptied consortium writes `a=` and stays empty.
- An Undo toast goes once the consortium is remade, refilled or moved; Start over's Undo restores the whole earlier state, climate file included. Start over keeps the reader's own country (`user`) and goes back to the site climate; Start over and a climate change drop a country that came from someone else's link (`link`, or `saved` from a save of one) for the reader's own choice, else "No country" if they chose it, else the guess, never in a link (`keptCountry`, core-fix review 4, m-1).
- No action rebuilds the plants that are not kept without an Undo: a site answer or a climate change holds the ready result before it (`holdForRedo`), and once the new result, not-covered or error screen shows, a toast offers Undo (`redoneSite`, or `redoneClimate` naming the old climate). A country change rebuilds nothing: it only re-renders the warnings and announces `countryAnnouncement`: `warningsNow` for a country GRIIS has a list for, "Invasive status not checked in {country}." for one it has none for, `warningsNone` for no country. Arrow keys through a radio group keep the result before the first change.
- Every plant list (rows, Swap, Add, Over time, Jobs, the drawing's numbered key, print) shows the scientific name beside the name (`sciHTML`, nothing when they are the same); the desktop drawing labels and sentences show the name only.
- Source and photo links: only http(s) URLs are links (`safeHref`), anything else is plain text; licences link their Creative Commons deed with `rel="license noopener"` (`licenceHTML`), public domain is translated (`publicDomain`).
- A details sheet opened from Swap offers "Use this instead" (`useInstead`) for the plant being swapped, never Add.
- "Show more plants if I loosen…" lists only answers that can be loosened (`relaxTo`).
- Unknown toxicity, invasive status, spread and jobs show as "not checked yet" on cards, rows, Swap, Add and print (`uncheckedOnCard` in `logic.js`). Unknown allelopathy shows in a plant's details only (owner, 2026-10-28). Neither is ever shown as none; a known allelopathic plant keeps its soft warning everywhere.
- Country (owner, 2026-10-28; design `.local/consortium/climate-first/design-ui.md`; review fixes 2026-10-28): `countryLineHTML` (from `countryLineParts`) shows "Invasive warnings for [France ▾]" above the climate cards and in the side panel, always with where the country came from: guessed from your browser (`countryGuessed`, dashed chip, `data-src="guess"`), from the shared link (`countryLinked`), from your last consortium (`countrySaved`, a restored save) or chosen by you (`countryChosen`, only the reader's own pick in this tab or on this device); for a country GRIIS has no list for, `countryNoList` ("not checked: there is no invasive list for this country") sits beside that label, never instead. With no country, the line holds the view's only "Add your country" (or the "No country ▾" chip the reader chose) and its only worldwide-counts line (`noCountryNote`); the result has no second one. `guessCountry` (logic.js) takes the one manifest country whose CLDR time zones include the browser's, else the region of `navigator.languages`. A guess is never written to a link or to the save (`stateNow` drops a `countrySource === 'guess'`); a chosen country goes in `k`; "No country" (`countryNone`) is `k=-` in the local save only.
- Where the country comes from at start (`startState` → `pickCountry`): a link's own `k`, labelled "chosen by you" when it equals the reader's own choice (so their reload or language switch keeps that label, except a language switch with storage blocked: see below) and "from the shared link" otherwise; else the reader's choice (`pref`: this tab's `history.state`, which survives a reload when storage is blocked, else `canopi-country` on the device, written by every country choice in any status and left alone by Start over); else the saved consortium's country with the source saved beside it (`src`; under a link with no `k`, such as a guide preset, it reads `saved`, shown "from your last consortium", never "chosen by you"); else the guess. A link's `k=-` (links never carry it) is read as no `k`. An unknown link `k` shows `countryUnknown` ("not a country code we know") and the reader's own choice (or "No country"), never the guess; while no country is in use the code stays in the address bar (`linkCode`), so a reload shows the same; it goes with its notice (choosing, Dismiss, a climate change, Start over), so the reader's next share link never carries it. A stale stored code is quiet. No address, language link or copied URL carries a marker of the reader's choice, only the `k` of a country they chose, as any share link does: the language links carry only the address bar's fragment (`langHash`), and an old link's `mine` is dropped on arrival and never read, so someone else's link is never taken as the reader's choice (core-fix review 3, M-1). With storage blocked, a language switch reads the reader's `k` as the link's ("from the shared link"), never the reverse.
- Invasive warnings: with a country GRIIS checked, a plant invasive there shows `invHere` on its card, in the "With a warning" box (`needsLook` tests `flags.invasive === true` on its own), in details (`d.invHere` with the liability line) and in print (`printWarnings`); Add and Swap never ask a confirmation for it. A country GRIIS did not check says "not checked" everywhere it is named or implied, never "warnings for" it or "all checked": once per view (the country line's `countryNoList`, the result sub-line `warnWhere`: `invStatusNotChecked`, the print head `printWhere`), the live announcement (`countryAnnouncement`) and details (`invNotChecked`/`d.invNotChecked`). It is not a chip on every card, row or print row (coordinator choice, 2026-10-28, core-fix review 2 m-2: a status the same for every plant must not come ahead of a plant's own warnings; it follows the owner's allelopathy row); a print row with nothing else to say reads `printNoneYet`, never `printNone` (`printNoneKey`). With a checked country a card shows only that country's warning; the count of countries is in details (`d.invList`, distinct countries). With no country, the card has the soft count chip (distinct countries). An empty `invasive_in` reads `d.invNone` "Not recorded invasive in any country checked by the global register of invasive species (GRIIS)", with no "(checked)" mark, and the plant's Sources list GRIIS (`invasiveSourceIds`). Country names follow a colon in fr, pt and it, so no article is needed.
- Reasons are regional: a card shows the first with its region (`reasonCard` "Chosen for {region}: {reason}", the region in semibold) and `moreRegions` when other regions chose the plant too; details list every reason (`reasonsHTML`: text, then `reasonFrom` "Chosen for {region} · from {sources}", worded so it fits any number of sources); `region.<id>` names stay only for these labels. Each interaction in details names all its sources (`d.conflictFrom`). The 2026-10-28 export has no plant with two reasons; the fixture has one interaction with two sources.
- Phones hide the climate cards' descriptions (`.climate-choice .about`) and offer them in one `<details class="climate-abouts">` ("What the climates mean", `climatesAbout`).
- Strata labels and phase terms are the Canopi app's own (`canopi/desktop/web/src/i18n/`), except where the owner decision "strata are about light first" outranks them: ja 突出層 / 上層 / 中層 / 下層 and ko 돌출층 / 상층 / 중층 / 하층 name light positions (the app's 高木層, 低木層, 교목층 name tree and shrub layers), and zh writes 顶极群落 (the app has 顶级群落). The test pins them and forbids tree or shrub words in strata labels.
- No requests outside the site; the tool JS is about 27 KB gzipped (minified bundle), each climate file about 60 to 66 KB gzipped (not re-measured for format 3).

- Links (scale chunk A review, 2026-10-28, design-scale §2.7): the tool's state lives in the address bar's fragment (`#v=3&…&e=1`), which no request carries, so a shared state never reaches a server or CDN log; Copy link and print give `path#state`. Older links in the query (v2, the first v3 links, a guide's `?plant=&climate=`) still open and move into the fragment with `replaceState` (memory.js `arrive`); the first-paint script in `ConsortiumPage.astro` reads the fragment first too. A tool state typed or pasted into the address bar (or Back to an earlier one) reloads the page to read it; a page anchor (`#main`, `#donate`) is not a state, and the consortium's fragment is written back after the other listeners. A fragment v3 link with no `e=1`, a plant list that does not parse, or an unknown `v` is a damaged link: the page says plants may be missing (`cutLink.*`), never opening it silently empty or partial (a damaged link whose members read empty gets a suggestion).
- Other lists (B2, B9): the other climates' files load at once and are read in the climates' order (`inClimateOrder`), so a plant in two other lists is labelled the same on every visit. A file that fails is a retryable error: the crop step's no-match and the Add sheet say "The other climates' lists could not be loaded" with Retry (no automatic retry loop); a link whose guest's list fails to load shows the error state with Retry and keeps the link as it came (`S.pending`), never calling the guest "no longer listed".
- "Add anyway" asks first, like Add, when the plant would be flagged beside the members (B3); the guest joins only on Yes. A main crop swapped is no longer a main crop: the Swap sheet says so before, and the toast after (`swapCropNote`, `swappedCrop`). The climate's source reads "from the shared link" for a link's, "from your last consortium" for a save's, "Chosen earlier on this site" for this site's, "Set by the guide", and "chosen by you" (`climateChosen`, ru «выбран вами») only after a pick in the tool; the result's climate chip says only the guide's or this site's.
- Language switch (seam M1): the header's language links (inline and phone Menu) carry the tool's fragment (`langHash` of `location.hash`), kept current after every `replaceState` (`syncLangLinks`); other pages' links are unchanged. Typed guesses `/fr/consortium/` and `/guilde/` redirect to `/fr/guilde/` (`public/_redirects`).
- A guide preset (`?plant=&climate=`) is never silent: a food plant of that climate opens the crop step with it chosen (chip "From the guide"); any other plant opens straight on the result with the guide note, also on "Not covered yet" (there `fromGuideClimate`: the plant is kept once a climate with a list is chosen); the tool loads that climate's file to name the plant as it will ("Pear (*Pyrus communis*)"). Guide links read "{plant} · {climate}". A guide's climate applies to this consortium only: the shared site climate (`canopi-climate`) changes only when the reader picks a climate in the tool (decision taken in the fixes round; the note says "This consortium uses the … climate").
- The "With a warning" banner is a list (`ul.att-list`), one plant per line with its actions inside its own item. A plant that misfits the site (often the guide's) states what it needs (its size against the room, its light…) and offers Swap and Remove (`removeShort`). The site answers are facts about the reader's garden: the tool never offers changing one to fit a plant (`nm.try` belongs to the no-match state only).
- Each view has a written-out "?" explanation button; each plant row has a "?" beside its phase words that opens the phase explanation in the row (`S.explain = 'phase-<id>'`).
- While a header menu is open, a result arriving takes the focus without scrolling (Safari leaves a tapped summary unfocused). On this page `.site-header` has `z-index: 45`, above the toast (40).
- Desktop side panel: always sticky (`top: 16px`), at most `100dvh - 32px` tall, and scrolls inside itself; its order is Your climate (with the country line), I want to grow… with Fill, then Your site, so the main actions show at the top at every page scroll position and it never changes layout mid-scroll. `render()` keeps its scroll position.
- "Not covered yet: {climate}" lists the covered climates (`nc.text`, a plural of `covered.length`), offers "Choose another climate" (`nc.other`) and "Ask for this climate" (`nc.ask`); the country plays no part. Every climate card stays a button, covered or not. Print: no ASCII punctuation glued to translated text (warnings one per line, jobs with `Intl.ListFormat`).
- Climates are listed in `src/data/climates.ts` order, as in the site picker.
- Words: the action is "Keep" (keys `keep`, `unkeep`, `keptTag`, `keptNow`, `unkeptNow`); French site field « Surface »; `southern_america` is named for what WGSRPD puts in it (Central and South America and the Caribbean), as a reason label.
# Tests

- [consortium-page.test.mjs](../../scripts/consortium-page.test.mjs): strings in 11 locales (every key used, `list.<climate>` for every site climate, dynamic prefixes checked against core ids), app strata and phase terms, plural climate counts, country sentences with no article before a country, the first-paint script against the app's start rules, a guess never in a link, `k=-` in the save only, invasive-here warnings without confirmation, the region-era guide keys gone, guides exist and cover their plants (crop list, heading, table, list item, bold or `<Term>`, or twice in prose; frontmatter, alt text and safety boxes ignored; a human check beyond that), `initDialogs` skipping `data-own-dialog`, `words.js`, `logic.js`.
- [consortium-scale.test.mjs](../../scripts/consortium-scale.test.mjs): the crop search (English fallback in brackets on the real French Temperate list), examples and limit, Add anyway matches, the Kept filter, the start rules (`asksCrops`, `opensOnResult`), `shareUrl`, old-link counts, the new words (room hints from the core, ledes, French non-breaking spaces), and the scale chunk A review fixes: fragment arrival and language links, cut-link detection, other lists in order with failures, print for a guest, Back keeping the country, the redo toast, Swap of a main crop, the Add filters on other lists, own versus neutral crop words, the climate's source, and the invasive words handed the taxon.
- [consortium-country.test.mjs](../../scripts/consortium-country.test.mjs): behaviour of the country and reason words with the real locale files: `pickCountry` (chosen survives reload and language switch, someone else's link, Start over, "No country", old saves, an unknown or `-` link code, a guide preset over a save), the memory.js wiring run with stubbed storage and history (a choice written to `canopi-country`, kept by Start over, kept in the tab across a reload when storage throws, and read as the link's after a language switch with storage blocked), `keptCountry` (someone else's link's country dropped on Start over and a climate change, the reader's own kept), `countryAnnouncement`, `chosenHere`, `printNoneKey`, `invasiveSourceIds`, `guessCountry`, card and details reasons, the country line, the unchecked-country surfaces, `d.invNone`, `countryUnknown`, the core's required checked flag, and the review's wording fixes (m10, m11).
- [check-built-site.mjs](../../scripts/check-built-site.mjs): the 11 built pages, their hreflang, header (current link through `consortiumPath`, from `src/i18n/consortium-path.js`), links and assets, and the installed data through `verifyInstall`.
