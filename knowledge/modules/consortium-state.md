---
type: Module
title: Consortium state (schema and state/ modules)
description: "The consortium island's state layer under src/islands/consortium/state/: the schema that declares each field once (Undo, save, #v=4 link, watchers), and the modules E6 S2 split out of the old memory.ts (deleted in E6 chunk 5) for storage, restore, arrival, Start's draft, the waiting Suggest, the location lookups and the location step."
tags: [consortium, state]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T15:45:05Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T16:08:56Z }
sources:
  - id: schema-ts
    resource: ../../src/islands/consortium/state/schema.ts
    title: src/islands/consortium/state/schema.ts
    digest: sha256:1e1c7db0e6fbafe3
    last_modified: 2026-11-13T12:38:43Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:c639f9179f641ff0
    last_modified: 2026-11-13T16:08:25Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:3eec46d170600c05
    last_modified: 2026-11-13T14:47:21Z
  - id: persist-ts
    resource: ../../src/islands/consortium/state/persist.ts
    title: src/islands/consortium/state/persist.ts
    digest: sha256:47db2d603b231370
    last_modified: 2026-11-13T14:01:32Z
  - id: restore-ts
    resource: ../../src/islands/consortium/state/restore.ts
    title: src/islands/consortium/state/restore.ts
    digest: sha256:a619541fb59bd906
    last_modified: 2026-11-13T07:21:50Z
  - id: arrival-ts
    resource: ../../src/islands/consortium/state/arrival.ts
    title: src/islands/consortium/state/arrival.ts
    digest: sha256:01b03b1fde6c2a62
    last_modified: 2026-11-13T07:21:50Z
  - id: draft-ts
    resource: ../../src/islands/consortium/state/draft.ts
    title: src/islands/consortium/state/draft.ts
    digest: sha256:71240eecc1058a74
    last_modified: 2026-11-13T12:46:47Z
  - id: suggest-wait-ts
    resource: ../../src/islands/consortium/state/suggest-wait.ts
    title: src/islands/consortium/state/suggest-wait.ts
    digest: sha256:f83b76f23d227291
    last_modified: 2026-11-13T14:56:35Z
  - id: lookups-ts
    resource: ../../src/islands/consortium/state/lookups.ts
    title: src/islands/consortium/state/lookups.ts
    digest: sha256:9b4b17c87a85f603
    last_modified: 2026-11-13T07:21:50Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:bdf71e540c290ea1
    last_modified: 2026-11-13T12:40:55Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:ab45b5e62406d5b7
    last_modified: 2026-11-13T14:46:32Z
  - id: consortium-start-test-mjs
    resource: ../../scripts/consortium-start.test.mjs
    title: scripts/consortium-start.test.mjs
    digest: sha256:ee273c9b34a6b291
    last_modified: 2026-11-13T12:48:34Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:6d1cd5e2554c64ad
    last_modified: 2026-11-13T13:02:30Z
enforced_by:
  - scripts/consortium-memory.test.mjs
  - scripts/consortium-start.test.mjs
---

# Responsibility

The consortium island's state, declared once in [state/schema.ts](../../src/islands/consortium/state/schema.ts) (E6 stream S1; design check §7.1 "Consortium state"). Each field says what it holds and where it goes; everything that used to list the fields by hand (store.ts's signals and Undo snapshot, the share state, link apply, set-aside, Start over and watchers) derives from it. Part of the [Consortium page](/modules/consortium-page.md); layer L3 of [ADR-1](/decisions/consortium-island-layers.md) (no module here imports a view).

# The state/ modules (E6 S2)

E6 stream S2 split `memory.ts` (about 780 lines) into the modules below. E6 chunk 5 deleted the re-export barrel `memory.ts` was left as: the views, main.ts and the seam tests import the `state/*` module that owns each name, and the core's `zoneOf` from `src/lib/consortium/index.ts` (`scripts/consortium-memory.test.mjs` asserts the file is gone and that no island file defines, re-exports or imports `zoneOf` from anywhere but the core barrel). `store.ts` no longer re-exports `DEFAULT_SITE` or the `Consortium` type; both come from `state/schema.ts`.

| Module | Holds |
|---|---|
| [state/persist.ts](../../src/islands/consortium/state/persist.ts) | Storage keys (`canopi-consortium`, `canopi-country`, `canopi-climate`, `canopi-location`), guarded storage (`memory`, `attempt`, `storageWorks`), the saved record (`saveRecord`, `readRecord`, `oldRecord`), `CountryFrom` (derived from the store's `CountrySource` without `'guess'`; `fromOf`), `shareState` (`schema.share`), `shareUrl`, the restore in flight (`inFlight`, `restoring`, `pendingClimate`, `pendingLinkClimate`), `climateChosen` (the reader's climate, else a link's still opening; null otherwise, never a proposal) and `climateShown` (the card Start shows, chosen or proposed, built on `climateChosen`), `own()`, `currentFragment`, `writeSave`, `writeAddress`, `shownFragment`, `watchStore` and the reader's action count (`actionCount`, `quietly`). Below restore.ts and the location step so neither imports the other |
| [state/restore.ts](../../src/islands/consortium/state/restore.ts) | `notices`, `restore(fragment, {from, src, keep})` (reads everything first, applies in one batch only if still the newest restore and the reader has not acted), `applyPreset` (guide `?plant=&climate=`), `ownLocation` (the saved site looked up again), `waitForSource`, and `provideLocationStep(load)`: main.ts hands it `views/location/load.ts`'s loader before the first render (E6 S3), so state never imports a view (ADR-1 L2); a missing step logs an error |
| [state/arrival.ts](../../src/islands/consortium/state/arrival.ts) | How the page opens: pure `arrival()`, `hashAction()`, `countryAtStart()`, `guessCountry()` (Node-tested), and `startMemory()`, which wires them once |
| [state/draft.ts](../../src/islands/consortium/state/draft.ts) | Start's draft: `chooseClimate`, `chooseCountry`, `pickingCountry`, `changeSite`, `startOver`, `canGoBack`, `backToConsortium`, `startEmpty` (each drops a link's location through `dropLinkLocation` → `letGo`), `cropExamples` (`plantName` removed in chunk 5: unused) |
| [state/suggest-wait.ts](../../src/islands/consortium/state/suggest-wait.ts) | The waiting Suggest, one owner: `pendingSuggest`, `waited`, `requestSuggest` (asks the store for the suggestion's chunk, `store.wantSuggest()`, then waits for the plant lists, the location lookups and that chunk, capped at 10 s, `suggestWaitMs()` (exported since the E6 hand-off: Swap's own wait for the chunk lasts as long), shortened in the test build by `window.__ctTimeouts.suggest`), `dropSuggest` (exported since the E6 hand-off: the one way a wait ends; `views/PoolSlot.tsx` calls it, untracked, when Start can no longer suggest for the chosen climate or another is chosen; no other island module writes `pendingSuggest`, checked by `scripts/consortium-memory.test.mjs`), `watchSuggest` (reruns a waiting Suggest when `store.suggestRule` arrives; since E6 R4 ends every waiting Suggest with the `details.loadFailed` toast and Reload when `store.suggestFailed`, L8). See the wait cap rule below |
| [state/lookups.ts](../../src/islands/consortium/state/lookups.ts) | The location lookups in flight, in the first run (the location module is lazy): `lookups`, `looking`, `lookingThrough`, `unread`, the result `line`, `nextLookup`/`liveLookup`, `unlessReplaced`, `letGo(drop)`. Moved out of `views/location/load.ts` (its re-exports for the seam tests removed in chunk 5) |
| [state/location.ts](../../src/islands/consortium/state/location.ts) | The location step's state, in the lazy location chunk (only `views/location/location.tsx` imports it): `readLocation`, `locationRecord`, `siteFound`, `locationCountry`, the tile `read` (15 s cap, no soil until P5.2), `locate`, `settle`, `useMyLocation`, `searchPlace`, `placeName`, `confirmProposed`, `forget`. See [Consortium location step](/modules/consortium-location.md) |

# Nothing runs at import (E6 S3)

No module of `store.ts` or `state/*` registers an effect or touches `localStorage` when imported. The rule covers those modules only: a few views register effects at import (`views/lazy.tsx`'s prefetch once the data is ready, `views/Sheets.tsx`'s focus-back, `views/PoolSlot.tsx`'s two pending-Suggest effects), harmless since they touch no storage and only react to state. [main.ts](../../src/islands/consortium/main.ts) starts the store and state, in this order: `store.start()` (store.ts's three effects, in their old module order: the range rule's load, the mark providers' load, the end of the Undo offer), `provideLocationStep(loadLocationStep)` (`views/location/load.ts` no longer calls it at import), `setStrings`, `setPageCountries`, `setPageClimates`, `watchPools`, `open(data)`, the render; Start then calls `startMemory()` (state/arrival.ts) in a layout effect. A node test that imports the store therefore starts its effects itself (`store.start?.()` in `consortium-memory.test.mjs` and `consortium-p5-seams.test.mjs`). `scripts/consortium-start.test.mjs` enforces the rule: it counts `effect()` calls through a resolve hook on `@preact/signals` and every read of the `localStorage` global, asserts none on importing store.ts and every state/ module, and that `store.start()` makes exactly the three effects in that order.

The site's lowercase climate id comes from the core's `siteIdOf` (exported from `src/lib/consortium/index.ts`, used by `state/draft.ts` `chooseClimate`); persist.ts's hand-written `siteId` was removed in S3.

`store.start()` is guarded since chunk 5: a second call does nothing (each effect would otherwise run twice); `consortium-start.test.mjs` asserts a second call registers no effect.

# Who reads the shown climate (E6 chunk 5)

- Start's climate cards read `climateShown` (the proposed card) and `climateChosen` (the checked one); `StartView` and PoolSlot's two pending-Suggest effects read `climateChosen` (PoolSlot's own `shownZone` is gone). `consortium-memory.test.mjs` checks both computeds against the old inline `climate ?? pendingClimate` formula over every combination.
- Start's `Head` and the guide notice read `store.climate`: they show only under a chosen climate, where the two agree.
- The location result line's "Use {climate}" button is deliberately not a `climateShown` read: it offers the location's proposal even under a chosen climate (Temperate chosen, located in Seville: "Use Mediterranean"). A source test in `consortium-memory.test.mjs` evaluates the button's condition from `location.tsx` and pins this (coordinator row "E6 chunk-5 merge choices").

# The Suggest wait cap (state/suggest-wait.ts)

Every waiting Suggest ends, with a suggestion or one toast, always through `dropSuggest`: when the reader changes the plants or opens a sheet, when the plant list fails, when PoolSlot finds Start can no longer suggest for the chosen climate (nothing fits, or `suggestBlock`) or another climate is chosen (no toast), or at the 10 s cap (`capped()`):

- a kept guest's list still unread: the wait ends with the `start.suggestStopped` toast;
- the suggestion's chunk (`store.suggestRule`) not come and the plant list read (a stalled request): the wait ends with one `details.loadFailed` toast with Reload, and its id is kept (`lateToast`);
- the chunk not come and the list still being read: checked again after another cap, no toast (the load screen ends a failed list's wait);
- in every case `waited` is set first: a location lookup no longer holds the wait (Suggest runs without the site; the line says so).

If the chunk then arrives, an effect in `watchSuggest` takes down only that Reload toast, and only while it is still the toast shown (a newer toast stays); the wait stays ended, so no suggestion runs. Browser tests E6-16, E6-16b and E6-18 (`consortium-e6-r4.browser.test.mjs`) cover the three cases.

All L7 cycles are gone after chunk 2 (coordinator row "E6 chunk-2 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)).

# Field options

`defineState(fields)` takes a record of `Field<T>`; each has an `initial()` value (its signal is made here) and any of:

| Option | Meaning |
|---|---|
| `undo` | Undo puts it back (in the snapshot); a function computes what Undo writes from the value before and now (`view`: only to or from Start) |
| `endsUndo` | a change to it ends the Undo offer (`climate`) |
| `saved` | part of the `Consortium` the save keeps and Change site sets aside; the save is the link's fragment, so a saved field is in the `#v=4` link under its own name in the core `ShareState`, and watched as `reader` |
| `link` | `put(v, o)` (into the link; default as it is) and `take(s, now, o)` (back from a decoded link or save; default the link's value, else the current one). `o` = `{ location, countryFrom }` |
| `watched` | for an unsaved field: `reader` (a write is the reader acting: save, address and Share's link follow) or `save` (save and address follow) |
| `plants` | one of the plant lists: saved, in Undo, ends Undo; Change site's draft seeds it, Start over empties it, a change ends a waiting Suggest |

The derived lists: `snapshot`, `endsUndo`, `saved`, `plants`, `reader`, `save`. Operations: `signals`, `peek(list)`, `track(list)` (read in an effect or computed), `valuesOf(list, from?)`, `write(values)`, `snapshot()`/`restore(s)` (Undo, one batch), `share(values, o)` (the link's state), `apply(s, o)` (a decoded link or save into the saved fields).

# The fields

- `CONSORTIUM_FIELDS`: `climate` (saved, endsUndo), `country` (saved; `put` never writes a guessed country and a location country only with the "include my location" tick, owner row 2026-10-28 and P5 owner answer 5; `take` labels a link's country by where it came from), `site` (saved, `DEFAULT_SITE` all `unsure`), the plant lists `members`, `kept`, `removed`, `guests` (link form `[{id, from}]`), `crops` (link keeps `MAX_CROPS`, three), and `stage` (saved).
- `STATE_FIELDS` adds `view` (watched `reader`, undo only to or from Start) and `setAside` (undo, watched `save`).
- Types: `Consortium` (the consortium fields with a non-null climate), `ShareInput` (stage may be null).
- `state = defineState(STATE_FIELDS)`; [store.ts](../../src/islands/consortium/store.ts) re-exports each signal by name, and `SNAP_KEYS` is `state.lists.endsUndo`; in [state/persist.ts](../../src/islands/consortium/state/persist.ts) `shareState` is `schema.share`, `own()` peeks `lists.saved`, and `shownFragment` and `watchStore` `track` the `reader` and `save` lists; [state/restore.ts](../../src/islands/consortium/state/restore.ts) applies a decoded link or save with `schema.apply`; [state/draft.ts](../../src/islands/consortium/state/draft.ts) `chooseClimate`/`startOver` write `valuesOf(lists.plants, …)`; [state/suggest-wait.ts](../../src/islands/consortium/state/suggest-wait.ts) tracks `plants` to drop a waiting Suggest.

# Adding a field

Declare it in `CONSORTIUM_FIELDS` or `STATE_FIELDS` with its options; Undo, the save, the watchers and the share state follow with no other change. A new saved field also needs the core link codec (`src/lib/consortium/state.ts` `encodeLink`/`decodeLink`) to carry a new `#v=4` parameter (coordinator row "E6 chunk-1 merge choices", P-E6c fallback). `shareState`/`apply` pass site and plant arrays by reference; nothing mutates them in place.

# Tests

`scripts/consortium-memory.test.mjs`: each field declares its part once; the saved fields are exactly the core `ShareState`; store.ts and the state/ modules list no state field by hand; a test-only extra field round-trips through Undo, watchers, save and share state; per saved field save → restore and link → restore; Undo per snapshot field; any `endsUndo` change hides the Undo toast; saves and `#v=4` links written before the schema open as they did.
