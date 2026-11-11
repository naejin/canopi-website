---
type: Module
title: Consortium page
description: "The consortium v2 page in 11 locales: the static Astro shell, the Preact island's store, strings, load screens and view slots, the build setup for JSX and sqlite-wasm, and its built-site and browser checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T13:27:54Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:31:32Z }
  - { by: okf-cli/0.1.0, at: 2026-11-10T18:09:34Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:513aaac1e06dd3ea
    last_modified: 2026-11-11T13:27:12Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:c55575d9ed99c030
    last_modified: 2026-11-11T13:27:12Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:cbf173bdd2a0397e
    last_modified: 2026-11-11T11:36:48Z
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
    digest: sha256:215758429bb194e8
    last_modified: 2026-11-11T13:27:12Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:19316294c48f0254
    last_modified: 2026-11-11T02:40:28Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:3d3787bf300478a1
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:3491730a2a5922b5
    last_modified: 2026-11-11T13:27:12Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:51e9b8f2a8ff1ca3
    last_modified: 2026-11-11T13:27:12Z
  - id: serve-mjs
    resource: ../../scripts/browser/serve.mjs
    title: scripts/browser/serve.mjs
    digest: sha256:44ef2da8460c2f4c
    last_modified: 2026-11-11T13:27:12Z
  - id: harness-mjs
    resource: ../../scripts/browser/harness.mjs
    title: scripts/browser/harness.mjs
    digest: sha256:7b90c0d1818cadb8
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-commit0-browser-test-mjs
    resource: ../../scripts/browser/consortium-commit0.browser.test.mjs
    title: scripts/browser/consortium-commit0.browser.test.mjs
    digest: sha256:3c2e5d125a605f2b
    last_modified: 2026-11-11T13:27:12Z
  - id: browser-tests-test-mjs
    resource: ../../scripts/browser-tests.test.mjs
    title: scripts/browser-tests.test.mjs
    digest: sha256:c55705264c905a76
    last_modified: 2026-11-11T09:38:46Z
  - id: bytes-ts
    resource: ../../src/islands/consortium/data/bytes.ts
    title: src/islands/consortium/data/bytes.ts
    digest: sha256:dfcf383316c99483
    last_modified: 2026-11-11T03:28:04Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:da81b23856bfd584
    last_modified: 2026-11-11T09:17:26Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/Start.tsx
    title: src/islands/consortium/views/Start.tsx
    digest: sha256:2e9dbc97ae8a28ec
    last_modified: 2026-11-11T11:16:54Z
  - id: actions-tsx
    resource: ../../src/islands/consortium/views/Actions.tsx
    title: src/islands/consortium/views/Actions.tsx
    digest: sha256:bb87eecf8603e787
    last_modified: 2026-11-11T09:49:18Z
  - id: share-tsx
    resource: ../../src/islands/consortium/views/Share.tsx
    title: src/islands/consortium/views/Share.tsx
    digest: sha256:d07b936125a26d11
    last_modified: 2026-11-11T06:10:08Z
  - id: printsheet-tsx
    resource: ../../src/islands/consortium/views/PrintSheet.tsx
    title: src/islands/consortium/views/PrintSheet.tsx
    digest: sha256:9afd67e97cc092d3
    last_modified: 2026-11-11T13:27:12Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:03dba7323bf7fdda
    last_modified: 2026-11-11T13:27:12Z
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
    digest: sha256:fe81c5794934b9c0
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-timing-mjs
    resource: ../../scripts/browser/consortium-timing.mjs
    title: scripts/browser/consortium-timing.mjs
    digest: sha256:2e7462745407e0de
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:34ff00e03ea59028
    last_modified: 2026-11-11T13:27:12Z
  - id: lazy-tsx
    resource: ../../src/islands/consortium/views/lazy.tsx
    title: src/islands/consortium/views/lazy.tsx
    digest: sha256:4a73c6fadb436bef
    last_modified: 2026-11-11T09:55:29Z
  - id: later-ts
    resource: ../../src/islands/consortium/views/later.ts
    title: src/islands/consortium/views/later.ts
    digest: sha256:f3d205cc17fb9458
    last_modified: 2026-11-11T09:17:26Z
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
    digest: sha256:d6d3a3e996ef0109
    last_modified: 2026-11-11T13:27:12Z
  - id: consortium-keys-test-mjs
    resource: ../../scripts/consortium-keys.test.mjs
    title: scripts/consortium-keys.test.mjs
    digest: sha256:ef7043e85ce5f2f8
    last_modified: 2026-11-11T10:40:37Z
  - id: search-ts
    resource: ../../src/islands/consortium/data/search.ts
    title: src/islands/consortium/data/search.ts
    digest: sha256:822b76bbdc63b378
    last_modified: 2026-11-11T09:55:29Z
enforced_by:
  - scripts/check-built-site.mjs
  - scripts/browser/consortium-commit0.browser.test.mjs
  - scripts/browser-tests.test.mjs
  - scripts/browser/consortium-s4.browser.test.mjs
  - scripts/consortium-memory.test.mjs
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
| [store.ts](../../src/islands/consortium/store.ts) | The frozen signals of §6. State: `climate`, `country{code,source}`, `site` (`DEFAULT_SITE`: all four `unsure`), `crops`, `members`, `kept`, `removed`, `guests`, `view`, `stage`, `sheet{kind,id}`, `load{status,error}`. Data: `source`, `pools`. Computed: `pool`, `matrix`, `flags`, `memberTaxa`. The one opener: every sheet opens through `openSheet(kind, id, {cell, job, anyway})`, which also sets `sheetCell` (Add filters by the cell's span, the job, or shows the cell anyway); `closeSheet`. The edits `removeMember`, `toggleKeep`, `swapMember`, `addMembers` (which leaves Start for the matrix) show the toast (`showToast`, with Undo); the undo snapshot holds the view, so Undo of a list pasted on Start goes back to Start (F2). `FOR_NOTHING` is the empty `sheetCell` |
| [strings.ts](../../src/islands/consortium/strings.ts) | `setStrings`, `T(key, vars)`, `P(key, n, vars)` with v1's plural form `one: # x \| other: # xs`; the page uses `P` at build time for the beta note |
| [App.tsx](../../src/islands/consortium/App.tsx) | Frozen. The §5 screens from `load` (`data-load-error`, `role=alert`). Retry: `fetch`, `damaged`. Reload: `stale`, `schema`, `wasm-fetch` (sqlite3.wasm did not arrive: a 403, offline or a 15 s stall; shown as `load.toolFailed`, review L1, R4-4). Guide link only: `too-old`, `wasm-blocked`. Slots in page order: `Start` (S4), `Matrix` (S2; routes the side view, Jobs and plant list from `store.view`), `Actions` (S4; Share, Download, Print, link notices; after the matrix once ready), `Details` (S3; routes `store.sheet`). Each is a module exporting null until its stream fills it, so streams never edit App.tsx |
| [data/load.ts](../../src/islands/consortium/data/load.ts), [data/bytes.ts](../../src/islands/consortium/data/bytes.ts) | Minimum loader, owned by S1. Steps: `tooOld()` (no DecompressionStream) and `wasmMissing()` (P5); fetch through `download()` (a 15 s stall timer reset on every chunk, no overall cap, so 10 KB/s loads; a stall → `fetch`; 404 → `stale`); the body read whole (`bytes.ts` `decodeDatabase`: empty → `damaged`; gzip magic from the buffer; sha256 and size of the gzipped file, or of the raw database when the server already decoded it (P3), checked with SubtleCrypto where present → `damaged`; inflate with DecompressionStream); the wasm downloaded with the same `download()` from the URL main.ts passes (did not arrive or a stall → `wasm-fetch`; a refused compile or instantiate → `wasm-blocked`), then sqlite-wasm init with it through `instantiateWasm` (without a URL, as in Node's unit tests, Emscripten fetches the file itself); `sqlite3_deserialize` FREEONCLOSE\|READONLY; then `application_id`, `user_version`, `meta.release_id` and the climates checked against the page (`schema`). `scripts/consortium-load.test.mjs` tests `bytes.ts` in Node |
| [views/Start.tsx](../../src/islands/consortium/views/Start.tsx) | S4's Start slot (it calls `startMemory()` once). Before a consortium: the country line (`data-ct="country"`, above the cards: guessed/linked/chosen, Use/Change/No country, the "not checked" note), the 7 climate cards as a radio group (none chosen on a fresh visit; the stored site climate pre-selects), "Ask for this climate" for uncovered ones, Main crops (4 real examples by the v1 rule, a local search, max 3), Your site (4 radio rows), then Suggest plants / Start empty and search / Paste a list (sheets `search` and `paste` are S3's). Once a consortium is shown: the result head (count, climate, site basis, Change site, Start over, the country line) |
| [memory.ts](../../src/islands/consortium/memory.ts) | S4. Pure: guarded storage, the saved record `{fragment, at, src}` under `canopi-consortium` (`src`: whether its country came from a shared link), `oldRecord` (v1's `{q, at, src}` or another link version), `arrival()` (the page's own address after a reload, i.e. `history.state.ct` equal to the fragment, opens as the save; then link > guide preset > v1 query link (outdated notice) > saved > start), `countryAtStart`, `shareState` (a guessed country is never written), `shareUrl` (drops the query), `guessCountry`, `cropExamples`. Wiring: restores a `#v=4` link or the last consortium (calm notices for unknown plants, cut links, a link with no climate (cut, Start stays), outdated links, an old save shown once and then removed), opens a link pasted into the open tab (`hashchange`; `hashAction`: Back/Forward to the page's own address reopens it as the save with its country label; with a consortium shown, an older, cut or unloadable pasted link changes nothing, shows `share.pasted.*` in the action area and puts the address back), changes the store only after every list the link needs is read, reading those lists itself rather than through `store.loadPool` (whose failure is app-wide), so a failed read shows `share.failed` or `share.pasted.failed` and keeps the consortium; a restore touches no store signal until it applies in one batch, and applies only if it is still the newest restore and the reader has not acted since it began (an action counter bumped by the watcher on every write to the consortium that is not a restore applying or a guessed country); outdated and cut refusals take no number but cancel the restore in flight (the latest link wins, its notice kept); a reader action during a first-visit restore makes the link's shown climate the chosen one; saving has no restore gate: `watchStore` saves every change and writes the address; Start shows the link's climate at once (`pendingClimate`, derived from the restore in flight), writes `history.state {ct, src}` with each address so a reload keeps the country's label, applies guide presets `?plant=&climate=` (the plant kept, as crop when it is one), writes the site climate (`canopi-climate`) and country (`canopi-country`), then keeps the address and the saved record in step with the store. The save model (review rounds 3 and 4): two states, the consortium and Start's draft. Change site (`changeSite`) sets the consortium aside in `store.setAside`, with its site answers, country and stage, and opens a draft seeded from it; the draft (the picked card, its crops and site answers and, on the consortium's own card, its plants) never changes the consortium or the save. Another card starts the draft empty; the consortium's card seeds its plants and crops again (`chooseClimate`). Only Suggest, Start empty, a paste on Start (each adopts the draft's answers) and Back to your consortium (which restores the consortium's answers) end it. The save and the address always encode the consortium (`own()`: the store when a view other than Start shows, else the one set aside). Undo restores the snapshot with the view and `setAside`, so it rewrites the save. Every write of the save goes through `writeSave(next)`: the page's own consortium is written when it changes; a removal (Start over, an older save) or a put-back happens only while storage still holds what the page last wrote or read (`lastSave`). The first write over a save the page did not write remembers it (`beneath`, or the newer save another tab wrote there since), and an Undo back to a Start with no consortium of the page's own puts it back or removes the save (F2, R2-2, R2-3, R4-1, R4-2). Back shows only with a consortium set aside (`canGoBack`). Suggest moves focus to the shown view (`focus.ts`). Unit tests: `scripts/consortium-memory.test.mjs` |
| [views/Actions.tsx](../../src/islands/consortium/views/Actions.tsx), [Share.tsx](../../src/islands/consortium/views/Share.tsx), [PrintSheet.tsx](../../src/islands/consortium/views/PrintSheet.tsx) | S4, after the matrix (nothing while Start shows): the link notices, then Share (the `#v=4` link in a field, copied by the Copy button only; notes for a link over 2,000 characters and for blocked storage), Print (`window.print()`, after the sheet has loaded) and Download for Canopi (`canopiFile` of the members, a `.canopi` v9 file with `plants: []`, see [Consortium core](/modules/consortium-core.md)). The print sheet is hidden on screen: head (climate, count, site, country, hypothesis), at ≤ 20 plants the side view drawing (`SideDrawing` at the chosen stage) and above 20 the "At a glance" table, then the plant table and the footer |
| [views/lazy.tsx](../../src/islands/consortium/views/lazy.tsx), [views/later.ts](../../src/islands/consortium/views/later.ts) | What shows after the matrix, in one chunk (`later.ts`: SideView, Jobs, PlantList, PrintSheet, Share and the `.canopi` writer). `later(importer)` gives a view that renders nothing until loaded and a Reload notice (`details.loadFailed`) if it fails; a view still loading shows the `load.plants` line, the print sheet (`quiet`) shows nothing; `laterModule` for the writer; Print and Download catch a failed chunk and show the Reload notice in the action area, and print.css hides the page for print only once `.ct-print` exists (a Ctrl+P before it prints the tool); `prefetchLater()` loads them all in idle time once `ct:matrix` is marked (Matrix.tsx). One chunk, not six: the 60 KB budget counts lazy chunks, and six cost 1.5 KB more |
| [focus.ts](../../src/islands/consortium/focus.ts) | `focusView()` (the shown view's caption, table or heading, after Suggest) and `focusPlant(id)` (after Undo, falling back to the heading), two frames later, so focus never drops to `<body>`; while a sheet is open the focus stays in it (its `[data-autofocus]` heading when the target is behind it), and with nothing found the tool's first heading (Start's, after an Undo back to Start) |
| [test-hook.ts](../../src/islands/consortium/test-hook.ts) | The one browser-test hook, `window.__ctTest = { store, openSheet, failSheets, failLater, holdLater, releaseLater }` (the last three make `views/later.ts` fail or wait), behind the compile-time constant `__CT_TEST_HOOK__`, which `astro.config.mjs` defines from `CANOPI_BROWSER_TEST === '1'` alone (`npm run build:browser-test`): not a PUBLIC_ variable, which Vite would also take from a `.env` file (review F6). `check-built-site.mjs` fails if `__ctTest`, `__ctViews` or `failSheets` is in a built chunk |
| [data/sqlite-source.ts](../../src/islands/consortium/data/sqlite-source.ts), [data/search.ts](../../src/islands/consortium/data/search.ts) | S1's PlantSource over the database, in the loader's chunk beside the glue (outside the 60 KB budget); the folded-name search (`fold`, `searchIndex`) is its own module because Add and Paste import it, and importing anything from `sqlite-source.ts` in a sheet splits the PlantSource into a counted chunk (3.7 KB; `check-built-site` fails on its SQL in a counted chunk) |
| [base.css](../../src/styles/consortium/base.css) | Under `.ct`: strata colours and inks (the mockups' Okabe-Ito), `--hatch`/`--hatch-fill`, `--bar`, `--cell-*` (desktop 96×56, phone 41×40, head 140 px, 196 px from 960 px; no other tier), dark values, and the shell styles. Breakpoints 639/960 are written out per file. `matrix.css` (S2), `details.css` (S3); [shell.css](../../src/styles/consortium/shell.css) (S4: country line, cards, chips, site rows, notices, actions, share; chosen states in ink, never green) and [print.css](../../src/styles/consortium/print.css) (S4: in print only the print sheet shows, light palette on white, no control) |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides per plant, per job and for the explanations (unchanged from v1; S4's) |

The v1 modules under `src/scripts/consortium/` and their `tsconfig.json` exclude were deleted at the P2 hand-offs.

# Build setup

- **JSX:** `astro.config.mjs` scopes JSX to `src/islands/consortium/**/*.tsx` with its own pre-plugin (`canopi:consortium-jsx`) and excludes those files from `vite:esbuild`, whose `include` would otherwise decide which .ts files compile at all. Each .tsx file starts with `/** @jsxImportSource preact */` for `astro check`. This deviates from A1's literal `esbuild.include` snippet, which would break every other .ts file.
- **One wasm:** `canopi:sqlite-main-thread-only` splits two string literals in sqlite-wasm's browser build so Vite cannot see them: the Worker #1 promiser's `new Worker(new URL('sqlite3-worker1.mjs'))` and the OPFS proxy's URL. Otherwise Vite bundles a worker with a second glue and a second 879 KB wasm. The build ships one `sqlite3.<hash>.wasm`, named both by the package's own `new URL('sqlite3.wasm', import.meta.url)` and by main.ts's `import wasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url'` (Vite emits the one file, same hash; `check-built-site` checks there is exactly one), with no `locateFile`. main.ts passes that URL to `openDatabase`, so `load.ts` downloads the wasm itself and hands the compiled module to sqlite-wasm's `instantiateWasm` option, with no source patch (review R4-4, round 5). The plugin throws if a sqlite-wasm upgrade changes those literals.
- **Pins:** `optimizeDeps.exclude` holds `@sqlite.org/sqlite-wasm`. Exact pins: preact 11.0.1, @preact/signals 2.11.3, @sqlite.org/sqlite-wasm 3.54.1-build1, puppeteer-core 25.16.0 (dev).
- **Caching:** `public/_headers` makes `/_astro/*` and `/data/consortium/*` `public, max-age=31536000, immutable`; the DB and photos carry digests in their names. Other paths keep the default `max-age=0, must-revalidate`.
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
- Browser tests, via `npm run test:browser` (capped; never in `npm test`; it runs `npm run build:browser-test` first, so rebuild with `npm run build` before `check-built-site` or a deploy), one file per owner (review C1), enforced by [browser-tests.test.mjs](../../scripts/browser-tests.test.mjs) in `npm test`:
  - [consortium-commit0.browser.test.mjs](../../scripts/browser/consortium-commit0.browser.test.mjs), no todo: P1 (515 plants counted in the page from the one hashed wasm), P2 (`application/wasm`, immutable headers), P3 (gzip magic, no content-encoding), P6/BT-9 JS-off shell, a mount with no head shift, and the BT-9 load screens with their buttons (DB 404, corrupt, wrong digest, empty body, `user_version` 2, WebAssembly off, loader chunk 404 online and offline) at all four variants;
  - `consortium-s1…s4.browser.test.mjs`: each stream's §7 tests in full (BT-1 data and start halves, BT-2…BT-8, BT-9 `.canopi` against the vendored app schema, BT-5 offline correction, the exit walk-through); `browser-tests.test.mjs` fails on any todo or skip, and the tests drive real controls wherever one exists: S2 and S3 also use the hook to read the store and to set up a consortium no control makes in one step (a member taken out mid-sheet, deep shade), and the seam tests use it only for the chunk faults;
  - [consortium-seams.browser.test.mjs](../../scripts/browser/consortium-seams.browser.test.mjs): the P2 hand-off fixes (the one opener and Add's filters, checked against a small garden, Show them anyway on a run with its stage bars, Paste leaving Start, a climate card after Change site not saved (F1), Undo back to Start (F2), focus in an open sheet (F3), the later chunk failing or loading (F4, F5), tap targets at every phone stage, the toast never covering a control, font weights, CJK headings, focus after Suggest, Suggest a start, Back to your consortium, Remove and Undo);
  - [consortium-s4.browser.test.mjs](../../scripts/browser/consortium-s4.browser.test.mjs) runs: BT-1 start half (real data, the exact four crop examples), BT-7 (a link reopened, an unknown token, an outdated link, a reload restore, a stage 3 link round trip, the country label kept over reloads and saves, a pasted link, a link with no climate, a v1 query link, a v1 save shown once, Copy on click only; compared through the share link), BT-8 (> 20 plants from an encoded link of the fixture's 21 Temperate plants: "At a glance" + table; ≤ 20: the table; no control printed), BT-9 `.canopi`. The exit walk-through runs at all four variants, keyboard only: Remove and Undo (focus on the restored plant), Keep, Share with the copied link reopened in a new page (same members, the pin), Print and a validated Download;
  - [consortium-timing.mjs](../../scripts/browser/consortium-timing.mjs), on demand only: §8 cold/warm timing of a `#v=4` link of 9 real Temperate plants (built with `encodeLink`; 4× CPU, 9 Mbps, 60 ms RTT, median of 5) to `ct:matrix`. Reading of 2026-11-11 at `83555c4`: cold 2,301 ms, warm 1,096 ms (2,390 and 1,081 before the views were lazy);
  - harness: [serve.mjs](../../scripts/browser/serve.mjs) runs wrangler dev on 4420–4498 with the inspector on the next port, in its own process group, stopped by pid; it counts the server up only when it serves a random marker file written into the build for this run (review B5), and kills its group if the process ends early. [harness.mjs](../../scripts/browser/harness.mjs) drives the system Chrome through puppeteer-core at 390/1280 px, light/dark (stored theme and emulated `prefers-color-scheme`), 4 s waits. Options: `data: 'fixture'`, `database` variants, `photos`, `wasm: false`, `loader: 404 | 'offline'`, `wasmFile: 403 | 'offline' | 'stall'` (sqlite3.wasm refused, unreachable or never answered, review L1, R4-4), `database: 'stall'`, `storage: false`, `correction` stub (`page.correctionPosts`), `page.capturedDownloads()`, `pdf(page)`. [helpers.mjs](../../scripts/browser/helpers.mjs): variants, accessibility-tree readers, node:sqlite reads of the real and fixture databases.

# Gotchas

- P7: the JSX scope alone leaves every other page byte-identical (checked after the pins commit). Deleting app.js drops one export from the shared `chrome` chunk, so that chunk's hash, and the `<script src>` of every page, change. The page contents are otherwise identical.
- `#ct-data` carries every `consortium.*` string (461 keys per locale after the P2 hand-offs and their review pruned 422 unused ones; `scripts/consortium-keys.test.mjs` keeps it so, counting a key used only when it is in a T( or P( call, a template, ConsortiumPage.astro or its INDIRECT list). S4's keys sit after `consortium.block.s4` with names that differ from the v1 keys (`share.done`, `crops.question`, `print.button`…): a duplicate JSON key would keep the v1 position and break the block-order test in `homepage.test.mjs`.
- With storage blocked (reading `localStorage` throws), the sqlite-wasm bootstrap's kvvfs setup threw `SecurityError`; `data/load.ts` switches kvvfs and OPFS off through `sqlite3ApiConfig` before init (H1).
- Each browser-test page is a context with its own copy of the database: the s4 file closes each page's context once used (`done()`); without it, BT-7's many pages were OOM-killed at 3 GB.
- `helpers.mjs` `axNodes` reads the full accessibility tree (`interestingOnly: false`, skipping none, unnamed generic, InlineTextBox and LineBreak; Chrome's `image` becomes `img`), so tables and cells are visible; BT-8 still reads the shown tables' captions from the DOM.
- The site scrolls smoothly: a test that measures positions sets `scrollBehavior = 'auto'` on the root first.
