---
type: Module
title: Consortium page
description: "The consortium v2 page in 11 locales: the static Astro shell, the Preact island's store, strings, load screens and view slots, the build setup for JSX and sqlite-wasm, and its built-site and browser checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T22:55:19Z }
verified:
  - { by: okf-cli/0.1.0, at: 2026-11-10T18:09:34Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T21:36:02Z }
sources:
  - id: pool-tsx
    resource: ../../src/islands/consortium/views/pool/pool.tsx
    title: src/islands/consortium/views/pool/pool.tsx
    digest: sha256:d832df1245320b48
    last_modified: 2026-11-11T19:27:07Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:fddd3972e167b271
    last_modified: 2026-11-11T17:58:51Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:c55575d9ed99c030
    last_modified: 2026-11-11T13:27:12Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:bfb0cd7693107b90
    last_modified: 2026-11-11T22:53:26Z
  - id: strings-ts
    resource: ../../src/islands/consortium/strings.ts
    title: src/islands/consortium/strings.ts
    digest: sha256:bb9a405826fbf28e
    last_modified: 2026-11-11T08:04:12Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:c517d106bebb2571
    last_modified: 2026-11-11T10:40:37Z
  - id: load-ts
    resource: ../../src/islands/consortium/data/load.ts
    title: src/islands/consortium/data/load.ts
    digest: sha256:57ff548e060566f7
    last_modified: 2026-11-11T12:33:37Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:012f0de3b8923d21
    last_modified: 2026-11-11T08:35:39Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:ad2fea270b47646a
    last_modified: 2026-11-11T17:14:18Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:0401c704326e00fb
    last_modified: 2026-11-11T09:09:11Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:02ddfcb7eee72f4b
    last_modified: 2026-11-11T15:36:29Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:3491730a2a5922b5
    last_modified: 2026-11-11T13:27:12Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:a669fbcd724205ad
    last_modified: 2026-11-11T19:48:35Z
  - id: serve-mjs
    resource: ../../scripts/browser/serve.mjs
    title: scripts/browser/serve.mjs
    digest: sha256:44ef2da8460c2f4c
    last_modified: 2026-11-11T13:27:12Z
  - id: harness-mjs
    resource: ../../scripts/browser/harness.mjs
    title: scripts/browser/harness.mjs
    digest: sha256:e911f860aa4f620d
    last_modified: 2026-11-11T15:36:29Z
  - id: consortium-commit0-browser-test-mjs
    resource: ../../scripts/browser/consortium-commit0.browser.test.mjs
    title: scripts/browser/consortium-commit0.browser.test.mjs
    digest: sha256:2082c2b16997dada
    last_modified: 2026-11-11T15:36:29Z
  - id: browser-tests-test-mjs
    resource: ../../scripts/browser-tests.test.mjs
    title: scripts/browser-tests.test.mjs
    digest: sha256:eb9b58335e2704ac
    last_modified: 2026-11-11T16:35:59Z
  - id: bytes-ts
    resource: ../../src/islands/consortium/data/bytes.ts
    title: src/islands/consortium/data/bytes.ts
    digest: sha256:dfcf383316c99483
    last_modified: 2026-11-11T03:28:04Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:04ad31086bbf4313
    last_modified: 2026-11-11T17:58:51Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/Start.tsx
    title: src/islands/consortium/views/Start.tsx
    digest: sha256:8772e41a6c36ed43
    last_modified: 2026-11-11T22:16:31Z
  - id: actions-tsx
    resource: ../../src/islands/consortium/views/Actions.tsx
    title: src/islands/consortium/views/Actions.tsx
    digest: sha256:18d07163b1f53cb5
    last_modified: 2026-11-11T22:16:31Z
  - id: share-tsx
    resource: ../../src/islands/consortium/views/Share.tsx
    title: src/islands/consortium/views/Share.tsx
    digest: sha256:554be9242220c0f7
    last_modified: 2026-11-11T18:00:01Z
  - id: printsheet-tsx
    resource: ../../src/islands/consortium/views/PrintSheet.tsx
    title: src/islands/consortium/views/PrintSheet.tsx
    digest: sha256:9afd67e97cc092d3
    last_modified: 2026-11-11T13:27:12Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:fbb8476ab6bd5e58
    last_modified: 2026-11-11T20:31:16Z
  - id: shell-css
    resource: ../../src/styles/consortium/shell.css
    title: src/styles/consortium/shell.css
    digest: sha256:2ee752e9af259a2d
    last_modified: 2026-11-11T08:35:39Z
  - id: print-css
    resource: ../../src/styles/consortium/print.css
    title: src/styles/consortium/print.css
    digest: sha256:d4ddc4c8abcf8d7f
    last_modified: 2026-11-11T09:49:18Z
  - id: consortium-s4-browser-test-mjs
    resource: ../../scripts/browser/consortium-s4.browser.test.mjs
    title: scripts/browser/consortium-s4.browser.test.mjs
    digest: sha256:9607e61aa96023b0
    last_modified: 2026-11-11T21:01:51Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:2e7462745407e0de
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:60fe9fe96655c531
    last_modified: 2026-11-11T16:35:59Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:56d4dcff4372f3fa
    last_modified: 2026-11-11T16:35:59Z
  - id: later-ts
    resource: ../../src/islands/consortium/views/later.ts
    title: src/islands/consortium/views/later.ts
    digest: sha256:2113606673d5d4e1
    last_modified: 2026-11-11T16:35:59Z
  - id: focus-ts
    resource: ../../src/islands/consortium/focus.ts
    title: src/islands/consortium/focus.ts
    digest: sha256:0ddb9de6d3315fba
    last_modified: 2026-11-11T09:49:18Z
  - id: test-hook-ts
    resource: ../../src/islands/consortium/test-hook.ts
    title: src/islands/consortium/test-hook.ts
    digest: sha256:2298fcc2277d5db1
    last_modified: 2026-11-11T09:55:29Z
  - id: consortium-seams-browser-test-mjs
    resource: ../../scripts/browser/consortium-seams.browser.test.mjs
    title: scripts/browser/consortium-seams.browser.test.mjs
    digest: sha256:dc962791e23e0d14
    last_modified: 2026-11-11T22:51:09Z
  - id: consortium-keys-test-mjs
    resource: ../../scripts/consortium-keys.test.mjs
    title: scripts/consortium-keys.test.mjs
    digest: sha256:2fbc36045c70e657
    last_modified: 2026-11-11T18:21:14Z
  - id: search-ts
    resource: ../../src/islands/consortium/data/search.ts
    title: src/islands/consortium/data/search.ts
    digest: sha256:822b76bbdc63b378
    last_modified: 2026-11-11T09:55:29Z
  - id: poolslot-tsx
    resource: ../../src/islands/consortium/views/PoolSlot.tsx
    title: src/islands/consortium/views/PoolSlot.tsx
    digest: sha256:d7b06c2dc28061a8
    last_modified: 2026-11-11T21:24:26Z
  - id: futureslot-tsx
    resource: ../../src/islands/consortium/views/FutureSlot.tsx
    title: src/islands/consortium/views/FutureSlot.tsx
    digest: sha256:eb63a2c123342afa
    last_modified: 2026-11-11T22:16:31Z
  - id: nativeslot-tsx
    resource: ../../src/islands/consortium/views/NativeSlot.tsx
    title: src/islands/consortium/views/NativeSlot.tsx
    digest: sha256:7da85f3a2931c192
    last_modified: 2026-11-11T16:35:59Z
  - id: climate-page-data-ts
    resource: ../../src/data/climate-page-data.ts
    title: src/data/climate-page-data.ts
    digest: sha256:57c0f94de8b34b02
    last_modified: 2026-11-11T16:35:59Z
  - id: future-panel-tsx
    resource: ../../src/islands/consortium/views/future/future.tsx
    title: src/islands/consortium/views/future/future.tsx
    digest: sha256:0cae0bf63297175f
    last_modified: 2026-11-11T18:21:29Z
  - id: plantmarks-tsx
    resource: ../../src/islands/consortium/views/PlantMarks.tsx
    title: src/islands/consortium/views/PlantMarks.tsx
    digest: sha256:9ab8870160c45b8c
    last_modified: 2026-11-11T19:27:07Z
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:c50e95d99fd9f486
    last_modified: 2026-11-11T20:31:16Z
  - id: likelyslot-tsx
    resource: ../../src/islands/consortium/views/LikelySlot.tsx
    title: src/islands/consortium/views/LikelySlot.tsx
    digest: sha256:49cd3c08386096fe
    last_modified: 2026-11-11T15:36:29Z
  - id: consortium-p5-browser-test-mjs
    resource: ../../scripts/browser/consortium-p5.browser.test.mjs
    title: scripts/browser/consortium-p5.browser.test.mjs
    digest: sha256:1da555e2f8faec1c
    last_modified: 2026-11-11T22:16:31Z
  - id: location-fixtures-mjs
    resource: ../../scripts/browser/location-fixtures.mjs
    title: scripts/browser/location-fixtures.mjs
    digest: sha256:9c78519e67188b29
    last_modified: 2026-11-11T15:36:29Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:d00a6bc0eac9d46b
    last_modified: 2026-11-11T15:36:29Z
  - id: location-tsx
    resource: ../../src/islands/consortium/views/location/location.tsx
    title: src/islands/consortium/views/location/location.tsx
    digest: sha256:e96070f03d36f054
    last_modified: 2026-11-11T20:54:26Z
enforced_by:
  - scripts/check-built-site.mjs
  - scripts/browser/consortium-commit0.browser.test.mjs
  - scripts/browser-tests.test.mjs
  - scripts/browser/consortium-s4.browser.test.mjs
  - scripts/consortium-memory.test.mjs
  - scripts/consortium-grid-check.test.mjs
  - scripts/built-modules.test.mjs
---

# Responsibility

The consortium tool's page, `/consortium/` and `/{lang}/consortium/` in 11 locales (French included; `/fr/guilde/` was never published). Since P2 commit 0 (branch `consortium/integration`) it is the v2 shell:
- Astro renders a static page;
- a Preact 11 island, mounted from the page script, renders the tool ([architecture](/decisions/consortium-v2-architecture.md), design check A1);
- all plant logic comes from the [Consortium core](/modules/consortium-core.md).

The v1 tool (app.js and its tests) was deleted in commit 0. Its full description is this concept at commit `f8e59ba`.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | The static shell (S4 owns it after commit 0). It renders: title and Beta; the lede (`home.consortium.lede`); `betaNote` counting the index's climates; the feedback and data-sources links; the `noscript` callout with the food-forest guide link; an inline head script setting `#ct-head[data-opens]` (`link` for `#v=4`, `preset` for `?plant=&climate=`, else `start`); `#ct-root` with the loading line (`consortium.loadingTool`, `aria-busy`), which the page script replaces with `load.toolFailed` and a Reload button when the island's entry chunk fails to import; and the release line. A `<link rel="preload" as="fetch" crossorigin>` for the database goes into Base's `head` slot (A2). `#ct-data` carries `{ lang, strings (every consortium.* key without prefix, the `consortium.block.*` markers left out, plus `correction.*` and the `climate.<zone>` names under their own keys), guideTitles (title by slug, in the guide's language, for the guides `consortium-guides.ts` links), releaseId, db { url, sha256, bytes, rawSha256, rawBytes }, climates (lowercase), images, guide, start }`, all from `src/data/consortium-index.json` except `start` (S4): `{ zones: [{ id, label, places }] for all 7 climates of src/data/climates, contact, site (the absolute tool URL for the print footer) }`. It imports `src/styles/consortium/print.css`. The page script runs `initChrome()` first, then `import()`s main.ts; if that chunk fails to load (offline, a deploy replaced it), the loading line gives way to a `role=alert` box (`data-load-error="island"`) with `load.toolFailed` and Reload, built from `#ct-data` strings |
| [main.ts](../../src/islands/consortium/main.ts) | Reads `#ct-data`, sets the strings, renders App into `#ct-root` and opens the database at once. `data/load.ts` is a dynamic import (its own chunk with the sqlite-wasm glue, outside the §8 60 KB budget), retried after a failed import. It maps the index's climates through the core's `zoneOf`. S1 owns it from the follow-up. A loader chunk that fails to import is `stale` (Reload) while `navigator.onLine`, else `fetch` (review B2) |
| [store.ts](../../src/islands/consortium/store.ts) | The frozen signals of §6. State: `climate`, `country{code,source}`, `site` (`DEFAULT_SITE`: all four `unsure`), `crops`, `members`, `kept`, `removed`, `guests`, `view`, `stage`, `sheet{kind,id,n}` (`n` counts openings: the Details Router keys each sheet `${kind}:${n}`, so every opening mounts a fresh dialog, and SheetFrame's `close` listener closes only the sheet it mounted for, since Escape closes the `<dialog>` at once and fires `close` a task later, after a sheet opened in between; hand-off item 8, seams spec "Item 8"), `load{status,error}`. Data: `source`, `pools`. Computed: `pool`, `matrix`, `flags`, `memberTaxa`. `rangeRule` (P5 S5c): the range rule (`withinRange`, `rangeFit`, `none`, `local` number formatting), exported by `views/pool/pool.tsx` and imported by an effect once `siteClimate` (the location gave a climate), so it stays off the first run; until it arrives, `pool` is null with a site climate (a pending Suggest waits as for the pool); if its chunk fails (offline after a first visit), it is never imported again on that page (a browser remembers a failed module URL, so Reload is the only retry and there is one toast per failure), and `rangeFailed` (computed: the failure while a location with a climate is set, so a cleared location is plain P2 with no notice) gives the unfiltered pool as in P2 and a Start notice `[data-range-unavailable]` with Reload. `suggestMembers` refuses when nothing fits, and for a borrowed pool (its plants marked `estimate`) without a site climate (UX audit fix 1), and PoolSlot clears a pending Suggest then, so a Suggest pressed while the rule loads stays on Start with the nothing-fits state. `fitPool`: the pool through `rangeRule.withinRange` at the location (members kept), the pool itself without one; it feeds `suggestMembers`, Swap's alternatives, Add's list before a query (a typed plant outside its range shows, with the outside mark, and asks first; when no plant fits the site, the list before a query is every plant, each marked) and `matrix`, so a cell's "N fit" leaves those plants out only with a location. The one opener: every sheet opens through `openSheet(kind, id, {cell, job, anyway})`, which also sets `sheetCell` (Add filters by the cell's span, the job, or shows the cell anyway); `closeSheet`. The edits `removeMember`, `toggleKeep`, `swapMember`, `addMembers` (which leaves Start for the matrix) show the toast (`showToast`, with Undo); the undo snapshot holds the view, so Undo of a list pasted on Start goes back to Start (F2). `FOR_NOTHING` is the empty `sheetCell`. P5 commit 0 seams: `location: Signal<SiteLocation | null>` (S5b writes it; S5c–S5e read it), `scenario` ('ssp245'; S5d may expose a control), `markContext` (computed `{climate, location, scenario, source}` for the core's `plantMarks`), `proposedClimate` (S5b: the climate a location suggests; its card shows as proposed, not checked, and `climate` stays unset until the reader confirms by the "Use" button or a click on the card, owner answer 1), `markProviders` (empty until `wantsMarkProviders`, i.e. core `needsMarkProviders`: a location, or a climate the export does not curate; then an effect loads the lazy providers chunk once), `CountrySource` gains 'location'; a type-only line checks that the climate reader's `SiteLookup` stays assignable to the core's |
| [strings.ts](../../src/islands/consortium/strings.ts) | `setStrings`, `T(key, vars)`, `P(key, n, vars)` with v1's plural form `one: # x \| other: # xs`; the page uses `P` at build time for the beta note |
| [App.tsx](../../src/islands/consortium/App.tsx) | Frozen. The §5 screens from `load` (`data-load-error`, `role=alert`). Retry: `fetch`, `damaged`. Reload: `stale`, `schema`, `wasm-fetch` (sqlite3.wasm did not arrive: a 403, offline or a 15 s stall; shown as `load.toolFailed`, review L1, R4-4). Guide link only: `too-old`, `wasm-blocked`. Slots in page order: `Start` (S4), `Matrix` (S2; routes the side view, Jobs and plant list from `store.view`), `Actions` (S4; Share, Download, Print, link notices; after the matrix once ready), `Details` (S3; routes `store.sheet`). Each is a module exporting null until its stream fills it, so streams never edit App.tsx |
| [data/load.ts](../../src/islands/consortium/data/load.ts), [data/bytes.ts](../../src/islands/consortium/data/bytes.ts) | Minimum loader, owned by S1. Steps: `tooOld()` (no DecompressionStream) and `wasmMissing()` (P5); fetch through `download()` (a 15 s stall timer reset on every chunk, no overall cap, so 10 KB/s loads; a stall → `fetch`; 404 → `stale`); the body read whole (`bytes.ts` `decodeDatabase`: empty → `damaged`; gzip magic from the buffer; sha256 and size of the gzipped file, or of the raw database when the server already decoded it (P3), checked with SubtleCrypto where present → `damaged`; inflate with DecompressionStream); the wasm downloaded with the same `download()` from the URL main.ts passes (did not arrive or a stall → `wasm-fetch`; a refused compile or instantiate → `wasm-blocked`), then sqlite-wasm init with it through `instantiateWasm` (without a URL, as in Node's unit tests, Emscripten fetches the file itself); `sqlite3_deserialize` FREEONCLOSE\|READONLY; then `application_id`, `user_version`, `meta.release_id` and the climates checked against the page (`schema`). `scripts/consortium-load.test.mjs` tests `bytes.ts` in Node |
| [views/Start.tsx](../../src/islands/consortium/views/Start.tsx) | S4's Start slot (it calls `startMemory()` once). Before a consortium: the country line (`data-ct="country"`, above the cards: guessed/linked/chosen, Use/Change/No country, the "not checked" note), the 7 climate cards as a radio group (none chosen on a fresh visit; the stored site climate pre-selects), "Ask for this climate" for uncovered ones, Main crops (4 real examples by the v1 rule, a local search, max 3), Your site (4 radio rows), then Suggest plants / Start empty and search / Paste a list (sheets `search` and `paste` are S3's). Once a consortium is shown: the result head (count, climate, site basis, Change site, Start over, the country line). P5 commit 0 mounts empty slots, each its stream's file: `<LocationSlot />` ([views/LocationSlot.tsx](../../src/islands/consortium/views/LocationSlot.tsx), S5b, which loads its UI as the lazy chunk `views/location/location.tsx`) between the notices and the climate cards; `<LikelySlot question={k} />` ([views/LikelySlot.tsx](../../src/islands/consortium/views/LikelySlot.tsx), S5e) at the end of each site question; `<PoolSlot zone={z} />` and `hasList(z)` ([views/PoolSlot.tsx](../../src/islands/consortium/views/PoolSlot.tsx), S5c, a thin shell) below the cards: `hasList` (core `hasPlants`: curated, or a nearest list is, and for a borrowed climate only once the location gave a site climate: decision row "P5 fixes from the UX audit" (1)) decides the card's pill and whether crops, site questions and Suggest / Start empty / Paste follow; `needsSite(z)`, a borrowed climate without one: the shell shows `[data-needs-site]` ("{climate} … needs your site's location to pick plants", a button that focuses the location step's first control, P2's "Ask for this climate" link, and "Back to your consortium" when one is set aside), no palette; a borrowed climate with a location whose range chunk failed is treated alike (`needsRule`: the notice says the climate needs range checks, Reload; `suggestMembers` refuses an unfiltered borrowed pool); a pending Suggest is cleared when the shown climate changes, needs the location or the rule, or nothing fits, so it never runs unasked later; the "Give your location" button focuses the location step's first enabled control, else `#ct-loc-h` made focusable; `NeedsSite` is exported for the empty matrix's Suggest (hand-off H-S5c-6, Matrix.tsx EmptyNotice, P5-26f todo); `cardPill(z)` gives the card's pill words (Ready / Needs your location / Not covered yet; Start.tsx reads `hasList` until hand-off H-S5c-5, so the borrowed card says "Not covered yet" without a location, P5-26c is todo); a link or saved consortium on a borrowed climate without a location still opens with all its plants, each marked estimate plus `estimate.noSite` ("Give your site's location to check it") off chips; `nothingFits()` (`rangeRule.none`: the chosen climate's list has plants and none holds the site) hides Start's "Suggest plants", so the panel's "Search all plants" is the step and no empty matrix is made, so every climate is Ready with the real export; `PoolSlot` loads the panel, which shows "Not covered yet" only when no list exists,, and otherwise, for a climate with no list, or once the location has a site climate (core `siteToday`; using it in the shell keeps `range.ts` in the main chunk, where a chunk shared only by the lazy parts was modulepreloaded and cost about 0.1 s at `ct:matrix`), the lazy panel `views/pool/pool.tsx` (feature chunk `pool`): `[data-pool-borrowed]` ("no list of its own yet", the nearest lists named, each plant marked estimate, and P2's "Ask for this climate" link), with a site climate `[data-pool-fit]` (n of N plants recorded in climates like the site's, with coldest and warmest month, how many near the edge, the others left out but addable with a warning) and the caveat (observed ranges include cultivation, estimates not reviewed), aridity "not checked" on ice, and the nothing-fits state `[data-pool-empty]` (the site's temperatures, check the location, "Search all plants" calling `startEmpty`). A curated climate without a location shows nothing (P2 unchanged). The cards show `climate ?? pendingClimate ?? proposedClimate` checked. The country line labels a location country "from your location" (`consortium.country.fromLocation`) |
| [strings.ts](../../src/islands/consortium/strings.ts) | `setStrings`, `T(key, vars)`, `P(key, n, vars)` with v1's plural form `one: # x \| other: # xs`; the page uses `P` at build time for the beta note |
| [App.tsx](../../src/islands/consortium/App.tsx) | Frozen. The §5 screens from `load` (`data-load-error`, `role=alert`). Retry: `fetch`, `damaged`. Reload: `stale`, `schema`, `wasm-fetch` (sqlite3.wasm did not arrive: a 403, offline or a 15 s stall; shown as `load.toolFailed`, review L1, R4-4). Guide link only: `too-old`, `wasm-blocked`. Slots in page order: `Start` (S4), `Matrix` (S2; routes the side view, Jobs and plant list from `store.view`), `Actions` (S4; Share, Download, Print, link notices; after the matrix once ready), `Details` (S3; routes `store.sheet`). Each is a module exporting null until its stream fills it, so streams never edit App.tsx |
| [data/load.ts](../../src/islands/consortium/data/load.ts), [data/bytes.ts](../../src/islands/consortium/data/bytes.ts) | Minimum loader, owned by S1. Steps: `tooOld()` (no DecompressionStream) and `wasmMissing()` (P5); fetch through `download()` (a 15 s stall timer reset on every chunk, no overall cap, so 10 KB/s loads; a stall → `fetch`; 404 → `stale`); the body read whole (`bytes.ts` `decodeDatabase`: empty → `damaged`; gzip magic from the buffer; sha256 and size of the gzipped file, or of the raw database when the server already decoded it (P3), checked with SubtleCrypto where present → `damaged`; inflate with DecompressionStream); the wasm downloaded with the same `download()` from the URL main.ts passes (did not arrive or a stall → `wasm-fetch`; a refused compile or instantiate → `wasm-blocked`), then sqlite-wasm init with it through `instantiateWasm` (without a URL, as in Node's unit tests, Emscripten fetches the file itself); `sqlite3_deserialize` FREEONCLOSE\|READONLY; then `application_id`, `user_version`, `meta.release_id` and the climates checked against the page (`schema`). `scripts/consortium-load.test.mjs` tests `bytes.ts` in Node |
| [views/Start.tsx](../../src/islands/consortium/views/Start.tsx) | S4's Start slot (it calls `startMemory()` once). Before a consortium: the country line (`data-ct="country"`, above the cards: guessed/linked/chosen, Use/Change/No country, the "not checked" note), the 7 climate cards as a radio group (none chosen on a fresh visit; the stored site climate pre-selects), "Ask for this climate" for uncovered ones, Main crops (4 real examples by the v1 rule, a local search, max 3), Your site (4 radio rows), then Suggest plants / Start empty and search / Paste a list (sheets `search` and `paste` are S3's). Once a consortium is shown: the result head (count, climate, site basis, Change site, Start over, the country line). P5 commit 0 mounts empty slots, each its stream's file: `<LocationSlot />` ([views/LocationSlot.tsx](../../src/islands/consortium/views/LocationSlot.tsx), S5b, which loads its UI as the lazy chunk `views/location/location.tsx`; see [Consortium location step](/modules/consortium-location.md)) between the notices and the climate cards, and `<LocationSlot compact />` (the result line) in the result head; `<LikelySlot question={k} />` ([views/LikelySlot.tsx](../../src/islands/consortium/views/LikelySlot.tsx), S5e) at the end of each site question; `<PoolSlot zone={z} />` and `hasList(z)` ([views/PoolSlot.tsx](../../src/islands/consortium/views/PoolSlot.tsx), S5c) below the cards: `hasList` decides the card's Ready pill and whether crops and site questions follow (today: the export curates the climate), `PoolSlot` shows "Not covered yet" when there is no list. The cards show `climate ?? pendingClimate` checked; a location's `proposedClimate` shows as proposed (`[data-proposed]`, not checked) and a click on it confirms it (S5b review round 1). The country line labels a location country "from your location" (`consortium.country.fromLocation`) |
| [src/styles/consortium/p5/](../../src/styles/consortium/p5) | P5 commit 0: one stylesheet per stream, `s5b.css`, `s5c.css`, `s5d.css`, `s5e.css`, each owned by its stream alone and imported once by ConsortiumPage.astro, so no stream edits the shared consortium CSS (base, matrix, details, shell, print) |
| [views/PlantMarks.tsx](../../src/islands/consortium/views/PlantMarks.tsx) | P5 commit 0: `PlantMarks({taxon, surface})`, the core's `plantMarks(taxon, markContext, surface, markProviders)`, one span each with `data-mark={kind}`, `data-mark-state={state}` and `data-mark-surface` (`.ct-flag` for a warning, `.ct-tag` for a note), nothing before the providers load or when empty; numbers in a mark's vars are written for the page language by `rangeRule.local` (`Intl.NumberFormat`, up to two decimals, the precision the range rule compares: fr "5,8"). Surfaces: StageBar's `Marks` gives 'chip' (desktop matrix, `tight`) or 'row' (phone rows, side and list views), the Details head 'details', both Add lists 'add', so a stream adds a mark, or keeps one to some surfaces, without touching a view. Other P5 slots: [views/FutureSlot.tsx](../../src/islands/consortium/views/FutureSlot.tsx) (S5d), a thin shell that loads its content, [views/future/future.tsx](../../src/islands/consortium/views/future/future.tsx) (`FuturePanel`, a P5 feature chunk), only once `store.location` is set; the panel (S5d) shows nothing while `lookup.climate` is null, says `future.notChecked` in `[data-future="not-checked"]` when the site has no projection, else the lede (constrained CMIP6 changes, Beck et al. 2023, on CHELSA v2.1 1981–2010; ranges with cultivation included; not reviewed), a radio of four `input[name="ct-scenario"]` writing `store.scenario` (not saved or shared; its margin in `src/styles/consortium/p5/s5d.css`), the summary `[data-future-summary]` ("n of m outside their range by 2041–2070" per period, `future.group` lines per reason, `[data-future-already]` lines for plants already outside today, and `[data-future-uncounted]` counting short-lived and unchecked members so the numbers add up) and one `[data-future-plant][data-future-verdict]` line per member read from the summary's `checks`; exported from `later.ts` and mounted `idle` (`later(…, { idle: true })`, defined in Actions.tsx: it never asks for the chunk itself and shows once `prefetchLater()` has loaded it, so nothing downloads before `ct:matrix`) after the Share/Print/Download section while the matrix tab is shown (hand-off branch: above the actions it landed ~150 ms after Suggest and pushed them about 600 px down; `P5-19b` measures the tabs and actions before and after it lands); [views/NativeSlot.tsx](../../src/islands/consortium/views/NativeSlot.tsx) (S5e) under the plant's name in Details |
| [memory.ts](../../src/islands/consortium/memory.ts) | S4. Pure: guarded storage, the saved record `{fragment, at, src, country?}` under `canopi-consortium` (`src` 'link' \| 'chosen' \| 'location' \| null: where its country came from; a country from the site location (P5 owner answer 5) is kept as `country` beside the fragment, never in it, and restored labelled "from your location"), `oldRecord` (v1's `{q, at, src}` or another link version), `arrival()` (the page's own address after a reload, i.e. `history.state.ct` equal to the fragment, opens as the save; then link > guide preset > v1 query link (outdated notice) > saved > start), `countryAtStart`, `shareState(s, { location })` (a guessed country is never written; a location country only with `{ location: true }`, S5b's "include my location" tick), `shareUrl` (drops the query), `guessCountry`, `cropExamples`. Wiring: restores a `#v=4` link or the last consortium (calm notices for unknown plants, cut links, a link with no climate (cut, Start stays), outdated links, an old save shown once and then removed), opens a link pasted into the open tab (`hashchange`; `hashAction`: Back/Forward to the page's own address reopens it as the save with its country label; with a consortium shown, an older, cut or unloadable pasted link changes nothing, shows `share.pasted.*` in the action area and puts the address back), changes the store only after every list the link needs is read, reading those lists itself rather than through `store.loadPool` (whose failure is app-wide), so a failed read shows `share.failed` or `share.pasted.failed` and keeps the consortium; a restore touches no store signal until it applies in one batch, and applies only if it is still the newest restore and the reader has not acted since it began (an action counter bumped by the watcher on every write to the consortium that is not a restore applying or a guessed country); outdated and cut refusals take no number but cancel the restore in flight (the latest link wins, its notice kept); a reader action during a first-visit restore makes the link's shown climate the chosen one; saving has no restore gate: `watchStore` saves every change and writes the address; Start shows the link's climate at once (`pendingClimate`, derived from the restore in flight), writes `history.state {ct, src}` with each address so a reload keeps the country's label, applies guide presets `?plant=&climate=` (the plant kept, as crop when it is one), writes the site climate (`canopi-climate`) and country (`canopi-country`), then keeps the address and the saved record in step with the store. The save model (review rounds 3 and 4): two states, the consortium and Start's draft. Change site (`changeSite`) sets the consortium aside in `store.setAside`, with its site answers, country and stage, and opens a draft seeded from it; the draft (the picked card, its crops and site answers and, on the consortium's own card, its plants) never changes the consortium or the save. Another card starts the draft empty; the consortium's card seeds its plants and crops again (`chooseClimate`). Only Suggest, Start empty, a paste on Start (each adopts the draft's answers) and Back to your consortium (which restores the consortium's answers) end it. The save and the address always encode the consortium (`own()`: the store when a view other than Start shows, else the one set aside). Undo restores the snapshot with the view and `setAside`, so it rewrites the save. Every write of the save goes through `writeSave(next)`: the page's own consortium is written when it changes; a removal (Start over, an older save) or a put-back happens only while storage still holds what the page last wrote or read (`lastSave`). The first write over a save the page did not write remembers it (`beneath`, or the newer save another tab wrote there since), and an Undo back to a Start with no consortium of the page's own puts it back or removes the save (F2, R2-2, R2-3, R4-1, R4-2). Back shows only with a consortium set aside (`canGoBack`). Suggest moves focus to the shown view (`focus.ts`). Unit tests: `scripts/consortium-memory.test.mjs` |
| [views/Actions.tsx](../../src/islands/consortium/views/Actions.tsx), [Share.tsx](../../src/islands/consortium/views/Share.tsx), [PrintSheet.tsx](../../src/islands/consortium/views/PrintSheet.tsx) | S4, after the matrix (nothing while Start shows): the link notices, then Share (the `#v=4` link in a field, copied by the Copy button only; notes for a link over 2,000 characters and for blocked storage; S5b's "include my location" tick `input[data-share-location]`, shown once the site has a climate cell, adds `o=` and the location country), Print (`window.print()`, after the sheet has loaded) and Download for Canopi (`canopiFile` of the members, a `.canopi` v9 file with `plants: []`, see [Consortium core](/modules/consortium-core.md)). The print sheet is hidden on screen: head (climate, count, site, country, hypothesis), at ≤ 20 plants the side view drawing (`SideDrawing` at the chosen stage) and above 20 the "At a glance" table, then the plant table and the footer |
| [views/lazy.tsx](../../src/islands/consortium/views/lazy.tsx), [views/later.ts](../../src/islands/consortium/views/later.ts) | What shows after the matrix, in one chunk (`later.ts`: SideView, Jobs, PlantList, PrintSheet, Share, S5d's FutureSlot and the `.canopi` writer). `later(importer)` gives a view that renders nothing until loaded and a Reload notice (`details.loadFailed`) if it fails; a view still loading shows the `load.plants` line, the print sheet (`quiet`) shows nothing; `laterModule` for the writer; Print and Download catch a failed chunk and show the Reload notice in the action area, and print.css hides the page for print only once `.ct-print` exists (a Ctrl+P before it prints the tool); `prefetchLater()` loads them all in idle time once `ct:matrix` is marked (Matrix.tsx). One chunk, not six: the 60 KB budget counts lazy chunks, and six cost 1.5 KB more |
| [focus.ts](../../src/islands/consortium/focus.ts) | `focusView()` (the shown view's caption, table or heading, after Suggest) and `focusPlant(id)` (after Undo, falling back to the heading), two frames later, so focus never drops to `<body>`; while a sheet is open the focus stays in it (its `[data-autofocus]` heading when the target is behind it), and with nothing found the tool's first heading (Start's, after an Undo back to Start) |
| [test-hook.ts](../../src/islands/consortium/test-hook.ts) | The one browser-test hook, `window.__ctTest = { store, openSheet, failSheets, failLater, holdLater, releaseLater }` (the last three make `views/later.ts` fail or wait), behind the compile-time constant `__CT_TEST_HOOK__`, which `astro.config.mjs` defines from `CANOPI_BROWSER_TEST === '1'` alone (`npm run build:browser-test`): not a PUBLIC_ variable, which Vite would also take from a `.env` file (review F6). `check-built-site.mjs` fails if `__ctTest`, `__ctViews` or `failSheets` is in a built chunk |
| [data/sqlite-source.ts](../../src/islands/consortium/data/sqlite-source.ts), [data/search.ts](../../src/islands/consortium/data/search.ts) | S1's PlantSource over the database, in the loader's chunk beside the glue (outside the 60 KB budget); schema 2: `Taxon.climate` from one `selectArrays` join of `plant_climate_status` and `plant_climate` per pool, `areasKnown` from `wcvp_match`, `details().koppen`, and `nativeIn(l3)` cached per area (the `Db` it takes needs `selectObjects` and `selectArrays`); `interactions(c)` reads the general rows (`climate_zone IS NULL`) and those of the climate's own list, or for a borrowed climate those of `NEAREST_LISTS[c]` ∩ curated, one row per (subject, object, type, agent): the highest severity first, so a conflict warning never gets milder, then the general row, then the first list in that order (P5 S5c); the folded-name search (`fold`, `searchIndex`) is its own module because Add and Paste import it, and importing anything from `sqlite-source.ts` in a sheet splits the PlantSource into a counted chunk (3.7 KB; `check-built-site` fails on its SQL in a counted chunk) |
| [base.css](../../src/styles/consortium/base.css) | Under `.ct`: strata colours and inks (the mockups' Okabe-Ito), `--hatch`/`--hatch-fill`, `--bar`, `--cell-*` (desktop 96×56, phone 41×40, head 140 px, 196 px from 960 px; no other tier), dark values, and the shell styles. Breakpoints 639/960 are written out per file; the phone matrix (StageStepper.tsx `phone`, `(max-width: 959px)`; UX audit fix 3) shows below 960 px, so its rules hang on `.ct-phone` rather than the 639 px query, the overview capped at 540 px. `matrix.css` (S2), `details.css` (S3); [shell.css](../../src/styles/consortium/shell.css) (S4: country line, cards, chips, site rows, notices, actions, share; chosen states in ink, never green) and [print.css](../../src/styles/consortium/print.css) (S4: in print only the print sheet shows, light palette on white, no control) |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides per plant, per job and for the explanations (unchanged from v1; S4's) |

The v1 modules under `src/scripts/consortium/` and their `tsconfig.json` exclude were deleted at the P2 hand-offs.

# Build setup

- **JSX:** `astro.config.mjs` scopes JSX to `src/islands/consortium/**/*.tsx` with its own pre-plugin (`canopi:consortium-jsx`) and excludes those files from `vite:esbuild`, whose `include` would otherwise decide which .ts files compile at all. Each .tsx file starts with `/** @jsxImportSource preact */` for `astro check`. This deviates from A1's literal `esbuild.include` snippet, which would break every other .ts file.
- **One wasm:** `canopi:sqlite-main-thread-only` splits two string literals in sqlite-wasm's browser build so Vite cannot see them: the Worker #1 promiser's `new Worker(new URL('sqlite3-worker1.mjs'))` and the OPFS proxy's URL. Otherwise Vite bundles a worker with a second glue and a second 879 KB wasm. The build ships one `sqlite3.<hash>.wasm`, named both by the package's own `new URL('sqlite3.wasm', import.meta.url)` and by main.ts's `import wasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url'` (Vite emits the one file, same hash; `check-built-site` checks there is exactly one), with no `locateFile`. main.ts passes that URL to `openDatabase`, so `load.ts` downloads the wasm itself and hands the compiled module to sqlite-wasm's `instantiateWasm` option, with no source patch (review R4-4, round 5). The plugin throws if a sqlite-wasm upgrade changes those literals.
- **Pins:** `optimizeDeps.exclude` holds `@sqlite.org/sqlite-wasm`. Exact pins: preact 11.0.1, @preact/signals 2.11.3, @sqlite.org/sqlite-wasm 3.54.1-build1, puppeteer-core 25.16.0 (dev).
- **Caching:** `public/_headers` makes `/_astro/*`, `/data/consortium/*` and `/data/climate/*` `public, max-age=31536000, immutable`; the DB and photos carry digests in their names, the climate tiles sit under a directory named by the grid manifest's digest ([Climate reader](/modules/climate-reader.md)). Other paths keep the default `max-age=0, must-revalidate`.
- **Climate tiles:** the first integration in `astro.config.mjs`, `climateTiles` (`canopi:climate-tiles`), installs the pinned canopi-climate grid for the location lookup before every build, and fails the build without it ([Climate reader](/modules/climate-reader.md)).
- **Preloads (A2):** the `canopi:consortium-modulepreload` integration in `astro.config.mjs` runs after the build: on each page holding `#ct-root` it adds a `<link rel="modulepreload">` for every chunk of the page's import graph not already a `<script src>` (chrome, main, the loader with the glue), found by [built-modules.mjs](../../scripts/built-modules.mjs). Other pages are untouched (P7: identical modulo asset hashes). `src/layouts/Base.astro` has a `head` slot for the page's DB preload.

# Checks

- [check-built-site.mjs](../../scripts/check-built-site.mjs), on every locale page:
  - the title, `#ct-root`, `#ct-data` with the index's release, db and climates;
  - the release line;
  - noscript with a guide link, the lede and the loading line;
  - hreflang, header and links;
  - then `verifyInstall` on the served data, a real `canopi_db_sha256`, and no v1 file or index served.
  - exactly one `sqlite3.<hash>.wasm` and no `sqlite3-worker1`/`opfs-async-proxy` file anywhere (review B4);
  - §8: the island's JavaScript through the built import graph, without the chunk holding the sqlite glue, under 60 KB gzip -9, lazy chunks included, and its first run (the entry and what it imports statically) under 40 KB (56.9 and 37.6 KB at `83555c4`). The 60 KB counts lazy chunks, so moving code behind `import()` does not lower it, and it has about 3 KB of headroom; P5 is to change the metric: only the island's own chunks, from its entry chunk (main.ts) without the page-wide chunks (site chrome, page script) or the glue (9.1 KB, the main chunk alone); a serve.mjs marker file left in `dist/client` fails the check, and on every locale page the DB preload and a modulepreload for each chunk.
  - P5 (commit 0; decision row "Island JavaScript budget for P5", amended; first run raised to 42 KB by the owner): first run ≤ 42 KB; the P2 island with the P5 slot shells ≤ 60 KB (slots stay thin shells); the P5 feature chunks ≤ 30 KB together, the location chunk alone ≤ 20 KB; MapLibre with worker and CSS ≤ 330 KB. Feature chunks are found by entry module through one list, `P5_FEATURE_ENTRIES` in [built-modules.mjs](../../scripts/built-modules.mjs): `location` (`views/location/location.tsx`, S5b), `markProviders` (`src/lib/consortium/mark-providers.ts`), `future` (`views/future/future.tsx`, S5d), and, if a stream's content is not tiny, `pool` (`views/pool/pool.tsx`, S5c), `likely` and `native` (`views/likely/likely.tsx`, `views/native/native.tsx`, S5e). `markProviders` and `future` must exist; no feature chunk is in the first run or modulepreloaded. Chunk roles, never file names. The Vite plugin `canopi:consortium-chunk-roles` (astro.config.mjs, client environment) writes `chunkRoles(bundle)` to `dist/consortium-chunks.json`, beside the served `client/` and never served: `features` (per `P5_FEATURE_ENTRIES` key), `maplibre` (chunks holding `node_modules/maplibre-gl` modules, plus the `.js` worker assets a location or MapLibre chunk names), `maplibreCss` (the CSS the location and MapLibre chunks import). Chunk edges are static and dynamic imports only: `importsOf` drops Vite's `__vite__mapDeps` preload lists, so a chunk only a feature chunk needs bills to the features, not the island. `onDemandChunks(graph, entries, roles)` gives `features` (feature chunks and what only they reach), `location` (what only the location chunk reaches) and `maplibre`; the modulepreload writer skips features and MapLibre. Vacuous-safe: without `src/islands/consortium/views/location/` no location, MapLibre or MapLibre CSS role may exist and no `.js` holds `maplibregl`; with it, one location chunk and MapLibre > 0 bytes. Preloading the mark providers alone cost about 0.15 s cold. At this commit: island 58.2 KB, first run 38.7 KB, feature chunks 0.2 KB (future, mark-providers). With S5d merged on 98a3ec0: island 58.3 KB, first run 38.7 KB, feature chunks 2.6 KB (the future panel, the shared core `future.ts` chunk and mark-providers). With S5c (round 1b, on a5234ea): island 58.7 KB, first run 39.0 KB (38.96; a5234ea 38.74), feature chunks 4.7 KB; the range rule, its number formatting and the "Not covered yet" notice load with the `pool` chunk; ct:matrix at load about 4–5: cold 2,380 vs 2,418 ms, warm 1,280 vs 1,244 ms (a5234ea), no new modulepreload. Hand-off branch `consortium/p5-ho-ui` (after S5b, S5f, S5c merged): island 61.1 KB (60.8 at the merge 7a83167; +0.3 KB from the Jobs gap buttons, the filled-cell "+" and the moved future slot), first run 41.2 KB, features 15.8 KB; over the 60 KB limit, which stays for the coordinator to decide. The P5 code left in the island is the slot shells (LocationSlot controls, PoolSlot's pill/needs-location logic, store's range and mark loaders, memory's location restore), each needed before a location exists or when its chunk failed; moving Share's location tick into the location chunk saved 0.02 KB (`cellCentre` stays with state.ts) and was reverted.
  - `#ct-climate` (ConsortiumPage.astro, [climate-page-data.ts](../../src/data/climate-page-data.ts)): the climate index's `base` and each layer's sorted tile names, the shape `lib/climate` `siteIndex()` reads, read at build through `import.meta.glob` (the index is git-ignored; `node:fs` is not available in the Cloudflare prerender), `null` without an index; the check compares it with the installed index on every locale page, no hashes, ≤ 2 KB gzip (1,288 B on climate 0.2.0).
  - One grid: [consortium-grid-check.mjs](../../scripts/consortium-grid-check.mjs) fails the build unless the consortium index's `climate_grid_manifest_sha256` (missing or empty fails) equals the climate index's grid and its `consortium_grid_check.status` is `matched`.
- Browser tests, via `npm run test:browser` (capped; never in `npm test`; it runs `npm run build:browser-test` first, so rebuild with `npm run build` before `check-built-site` or a deploy), one file per owner (review C1), enforced by [browser-tests.test.mjs](../../scripts/browser-tests.test.mjs) in `npm test`:
  - [consortium-commit0.browser.test.mjs](../../scripts/browser/consortium-commit0.browser.test.mjs), no todo: P1 (515 plants counted in the page from the one hashed wasm), P2 (`application/wasm`, immutable headers), P3 (gzip magic, no content-encoding), P6/BT-9 JS-off shell, a mount with no head shift, and the BT-9 load screens with their buttons (DB 404, corrupt, wrong digest, empty body, `user_version` 2, WebAssembly off, loader chunk 404 online and offline) at all four variants;
  - `consortium-s1…s4.browser.test.mjs`: each stream's §7 tests in full (BT-1 data and start halves, BT-2…BT-8, BT-9 `.canopi` against the vendored app schema, BT-5 offline correction, the exit walk-through); `browser-tests.test.mjs` fails on any todo or skip, and the tests drive real controls wherever one exists: S2 and S3 also use the hook to read the store and to set up a consortium no control makes in one step (a member taken out mid-sheet, deep shade), and the seam tests use it only for the chunk faults;
  - [consortium-seams.browser.test.mjs](../../scripts/browser/consortium-seams.browser.test.mjs): the P2 hand-off fixes (the one opener and Add's filters, checked against a small garden, Show them anyway on a run with its stage bars, Paste leaving Start, a climate card after Change site not saved (F1), Undo back to Start (F2), focus in an open sheet (F3), the later chunk failing or loading (F4, F5), tap targets at every phone stage, the toast never covering a control, font weights, CJK headings, focus after Suggest, Suggest a start, Back to your consortium, Remove and Undo; P5 hand-off branch: UX3 the phone grid below 960 px and the table from 960 px, no sideways scroll or cut name at 700/959/960/1000 px; UX4 the Jobs headline counts jobs covering every stage and each run of missing stages has "Find a … for {stages}" opening Add for the job and those stages in any layer (`SheetFor.cell.stratum` null); Item 7 a filled cell's own "+" (`[data-add-filled]`, "Add a plant: {cell}", last in the cell, 24 px at least, no name cut at 960/1280 px; phone: "+ Add" ending each filled layer of the stage view) whose plant lands in that cell);
  - [consortium-s4.browser.test.mjs](../../scripts/browser/consortium-s4.browser.test.mjs) runs: BT-1 start half (real data, the exact four crop examples), BT-7 (a link reopened, an unknown token, an outdated link, a reload restore, a stage 3 link round trip, the country label kept over reloads and saves, a pasted link, a link with no climate, a v1 query link, a v1 save shown once, Copy on click only; compared through the share link), BT-8 (> 20 plants from an encoded link of the fixture's 21 Temperate plants: "At a glance" + table; ≤ 20: the table; no control printed), BT-9 `.canopi`. The exit walk-through runs at all four variants, keyboard only: Remove and Undo (focus on the restored plant), Keep, Share with the copied link reopened in a new page (same members, the pin), Print and a validated Download;
  - [consortium-timing.mjs](../../scripts/browser/consortium-timing.mjs), on demand only: §8 cold/warm timing of a `#v=4` link of 9 real Temperate plants (built with `encodeLink`; 4× CPU, 9 Mbps, 60 ms RTT, median of 5) to `ct:matrix`. Reading of 2026-11-11 at `83555c4`: cold 2,301 ms, warm 1,096 ms (2,390 and 1,081 before the views were lazy). P5 commit 0 (schema 2, 556,862 B database, load average about 2.5–3): cold 2,277 and 2,290 ms, warm 1,206 and 1,167 ms; reading the ranges as objects cost about 0.1 s cold, so `sqlite-source.ts` reads them in one `selectArrays` query (without any range read: cold 2,227, warm 1,171, so the warm remainder is the larger database). Island 57.5 KB, first run 38.2 KB. After the commit 0 review (seams per stream, lazy providers, `#ct-climate`), same load and machine: cold 2,365 and 2,298 ms against 2,267 and 2,272 at `afcb9a3`, warm 1,295 and 1,219 against 1,240 and 1,228;
  - [consortium-p5.browser.test.mjs](../../scripts/browser/consortium-p5.browser.test.mjs) (P5 commit 0): the P5 streams' specs for design check §B/§C, each `P5-n (S5x …)`, todo for its stream until built; `browser-tests.test.mjs` requires the title and allows a todo only if it names that stream, so a stream removing its own todos passes; `tool()` stubs map tiles for every spec (`mapTiles: 'stub'`; any other third-party request is aborted and listed): S5b location granted/denied/timeout/unavailable, search hit (one request on Enter, page language, no email), no result and offline, map pick and ocean click, no WebGL, coast, polar, borderline (Lyon), tiles failing, share with and without "include my location"; S5b specs also pin owner answers 1 and 5: a Seville location pre-checks the Mediterranean card with `store.climate` null until `[data-location-confirm]`, a borderline site (Lyon) pre-checks the nearest climate and names both, denied and failed lookups pre-check nothing, polar keeps the climate null, offshore gives no location country, the privacy line sits in its button's parent, and no `k=` reaches a link or the address without the tick (`k=` and `o=` with it); S5c nothing fits (Yakutsk; strengthened: it names the site's coldest month and its button opens the plant search), P5-14b (a Seville suggestion holds no plant outside its range, Add lists none until typed, and a typed one asks first), P5-14c (with a location the matrix "N fit" counts leave out plants outside their range; P2 counts without one), near-edge mark (P5-15b: Details lines in French write "5,8"), the outside-range plant typed in Add, shown "outside", added and a member (P5-16), estimate label (Lyon as Subtropical), and P5-26 a `#v=4&c=subtropical` link without `o=` opening with borrowed plants marked estimate; S5d future summary (P5-18: SSP2-4.5 radio checked, the lede wording, one line per member, the uncounted line adding up, an ink future mark on a chip, after the SSP5-8.5 radio every checked line names SSP5-8.5 and never fewer outside, nothing without a location) and "not checked" (P5-19: no summary, no future mark); S5e native here in three states, soil likely (Manaus) and none when borderline (Lyon); S5f /fr/ and /ja/privacy/ (naming Nominatim and OpenFreeMap and linking their privacy policies), the footer link, the /data-sources/ credits (S5f's three specs run: no todo left, see [Privacy page and tool credits](/modules/privacy-and-credits.md)). The page contract they read (`data-location-*`, `data-mark`, `data-future*`, `data-native`, `data-likely`, `data-share-location`, `data-credit`, the hook's `mapCentre`) is in the file's header. `P5-0a…d (commit 0 …)` run: the sites' reader answers on the built tiles ([location-fixtures.mjs](../../scripts/browser/location-fixtures.mjs) `SITES`, `EXPECTED`, `lookupAt`), the geolocation, Nominatim, OpenFreeMap, WebGL and tile stubs, and the commit 0 promise (P5-0d: on a covered climate without a location, members in the matrix, no `outside`, `edge`, `future` or `native` mark and the providers not loaded; with a location they load and every mark carries a PlantMarks surface; no third-party call), which stays true once the streams add marks; S5e's specs (P5-20 to P5-22) are todo "moved to P5.2" (decision row "P5 ships without S5e"); they are not P5 push blockers.
  - harness: [serve.mjs](../../scripts/browser/serve.mjs) runs wrangler dev on 4420–4498 with the inspector on the next port, in its own process group, stopped by pid; it counts the server up only when it serves a random marker file written into the build for this run (review B5), and kills its group if the process ends early. [harness.mjs](../../scripts/browser/harness.mjs) drives the system Chrome through puppeteer-core at 390/1280 px, light/dark (stored theme and emulated `prefers-color-scheme`), 4 s waits. Options: `data: 'fixture'`, `database` variants, `photos`, `wasm: false`, `loader: 404 | 'offline'`, `wasmFile: 403 | 'offline' | 'stall'` (sqlite3.wasm refused, unreachable or never answered, review L1, R4-4), `database: 'stall'`, `storage: false`, `correction` stub (`page.correctionPosts`), `page.capturedDownloads()`, `pdf(page)`. P5: `geolocation: {lat, lon, accuracy?} | 'denied' | 'unavailable' | 'timeout'` (CDP permission and position; timeout patches getCurrentPosition to fail after the call's own timeout), `nominatim: 'fixture' | 'offline'` (`page.nominatim` lists requests), `mapTiles: 'stub' | 'offline'` (a one-layer style, 204 tiles), `webgl: false`, `climateTiles: 404 | 'offline'`; with any of them every other off-site request is aborted and listed in `page.thirdParty`. The `user-version` database variant writes 1 (the page reads schema 2). Only the last 4 browser contexts stay open (`KEEP_CONTEXTS`; older ones close as new pages open): with every page kept until `close()`, the s2 file peaked at 3.0 GB under the 3 GB cap and one full run was OOM-killed at P5 commit 0; it now peaks under 1 GB. [helpers.mjs](../../scripts/browser/helpers.mjs): variants, accessibility-tree readers, node:sqlite reads of the real and fixture databases.

# Gotchas

- P7: the JSX scope alone leaves every other page byte-identical (checked after the pins commit). Deleting app.js drops one export from the shared `chrome` chunk, so that chunk's hash, and the `<script src>` of every page, change. The page contents are otherwise identical.
- `#ct-data` carries every `consortium.*` string (522 keys per locale: the P2 hand-offs and their review pruned 422 unused ones, P5 commit 0 added `country.fromLocation`, S5b 60 `location.*` and `share.location*` keys; `scripts/consortium-keys.test.mjs` keeps it so, counting a key used only when it is in a T( or P( call, a template, ConsortiumPage.astro or its INDIRECT list). Block keys close each locale file in order: `consortium.block.s1`…`s4`, then (P5 commit 0) `s5b`…`s5f` and last `consortium.block.end`, each stream appending after its own block key and before the next, so no stream edits another's last line; S5f's block may also hold `privacy.*` and new `dataSources.*` keys (`homepage.test.mjs`). S4's keys sit after `consortium.block.s4` with names that differ from the v1 keys (`share.done`, `crops.question`, `print.button`…): a duplicate JSON key would keep the v1 position and break the block-order test in `homepage.test.mjs`.
- With storage blocked (reading `localStorage` throws), the sqlite-wasm bootstrap's kvvfs setup threw `SecurityError`; `data/load.ts` switches kvvfs and OPFS off through `sqlite3ApiConfig` before init (H1).
- Each browser-test page is a context with its own copy of the database: the s4 file closes each page's context once used (`done()`); without it, BT-7's many pages were OOM-killed at 3 GB.
- `helpers.mjs` `axNodes` reads the full accessibility tree (`interestingOnly: false`, skipping none, unnamed generic, InlineTextBox and LineBreak; Chrome's `image` becomes `img`), so tables and cells are visible; BT-8 still reads the shown tables' captions from the DOM.
- The site scrolls smoothly: a test that measures positions sets `scrollBehavior = 'auto'` on the root first.
