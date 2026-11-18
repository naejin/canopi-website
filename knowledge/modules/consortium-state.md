---
type: Module
title: Consortium state (schema and state/ modules)
description: "The consortium island's state layer under src/islands/consortium/state/: the schema that declares each field once (Undo, save, #v=4 link, watchers), and the modules E6 S2 split out of the old memory.ts (deleted in E6 chunk 5) for storage, restore, arrival, Start's draft, the waiting Suggest, the location lookups and the location step."
tags: [consortium, state]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T18:53:18Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-17T07:28:39Z }
sources:
  - id: schema-ts
    resource: ../../src/islands/consortium/state/schema.ts
    title: src/islands/consortium/state/schema.ts
    digest: sha256:055b522d8f0d238e
    last_modified: 2026-11-18T04:51:36Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:2d6f468d17a922a7
    last_modified: 2026-11-18T18:42:15Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:c9ccd5eed4274d87
    last_modified: 2026-11-18T17:05:25Z
  - id: persist-ts
    resource: ../../src/islands/consortium/state/persist.ts
    title: src/islands/consortium/state/persist.ts
    digest: sha256:07f9775e9c850dec
    last_modified: 2026-11-18T18:38:12Z
  - id: restore-ts
    resource: ../../src/islands/consortium/state/restore.ts
    title: src/islands/consortium/state/restore.ts
    digest: sha256:65c143542f9f4e35
    last_modified: 2026-11-18T18:38:12Z
  - id: arrival-ts
    resource: ../../src/islands/consortium/state/arrival.ts
    title: src/islands/consortium/state/arrival.ts
    digest: sha256:ba01c67cc05e48f2
    last_modified: 2026-11-18T04:51:36Z
  - id: draft-ts
    resource: ../../src/islands/consortium/state/draft.ts
    title: src/islands/consortium/state/draft.ts
    digest: sha256:5e4f54887014f1e1
    last_modified: 2026-11-18T18:41:19Z
  - id: suggest-wait-ts
    resource: ../../src/islands/consortium/state/suggest-wait.ts
    title: src/islands/consortium/state/suggest-wait.ts
    digest: sha256:ad330f5c00ac2504
    last_modified: 2026-11-18T18:38:12Z
  - id: lookups-ts
    resource: ../../src/islands/consortium/state/lookups.ts
    title: src/islands/consortium/state/lookups.ts
    digest: sha256:9b4b17c87a85f603
    last_modified: 2026-11-13T07:21:50Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:6b59d99cb0816bb6
    last_modified: 2026-11-18T18:38:12Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:04d212e17c481deb
    last_modified: 2026-11-18T17:40:12Z
  - id: consortium-start-test-mjs
    resource: ../../scripts/consortium-start.test.mjs
    title: scripts/consortium-start.test.mjs
    digest: sha256:2c0701cc1348ad7c
    last_modified: 2026-11-17T13:47:38Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:e393580af2534bc5
    last_modified: 2026-11-18T17:13:28Z
  - id: save-ts
    resource: ../../src/islands/consortium/state/save.ts
    title: src/islands/consortium/state/save.ts
    digest: sha256:7a5518810d5d8e3a
    last_modified: 2026-11-18T17:07:24Z
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
| [state/persist.ts](../../src/islands/consortium/state/persist.ts) | Storage keys (`canopi-consortium`, `canopi-country`, `canopi-climate`, `canopi-location`), guarded storage (`memory`, `attempt`, re-exported from `save.ts`; `storageWorks`), the saved record (`saveRecord`, `readRecord`), `CountryFrom` (derived from the store's `CountrySource` without `'guess'`; `fromOf`), `shareState` (`schema.share`), `shareUrl`, the restore in flight (`inFlight`, `restoring`, `pendingClimate`, `pendingLinkClimate`), `climateChosen` (the reader's climate, else a link's still opening; null otherwise, never a proposal) and `climateShown` (the card Start shows, chosen or proposed, built on `climateChosen`), `palette()` (the page's palette, a guest the chosen climate's read list holds left out), `shows()` (whether the address keeps a palette: a climate, and the save owned, the palette page or any plant on Place), `currentFragment`, `holdSave`, `writeSave` (internal: the palette written while not held), `writeAddress`, `shownFragment`, `watchStore` and the reader's action count (`actionCount`, `quietly`), and the arrival answers' signals: `linkPlace`, `savedInstead` (computed: `held` and the readable save in storage, read again on each write of this page and on the `storage` event, unless the page shows that palette; owner 2026-11-15, decision 3; fix round 4, s-5) and `placeSaid` (Place's status line after a notice's answer, cleared by the reader's next action and by the next `restore`). Below restore.ts and the location step so neither imports the other |
| [state/restore.ts](../../src/islands/consortium/state/restore.ts) | `notices`, `restore(fragment, {from, src, keep})` (reads everything first, applies in one batch only if still the newest restore and the reader has not acted), `applyPreset` (guide `?plant=&climate=`), `ownLocation` (the saved site looked up again), `waitForSource`, and `provideLocationStep(load)`: main.ts hands it `views/location/load.ts`'s loader before the first render (E6 S3), so state never imports a view (ADR-1 L2); a missing step logs an error |
| [state/arrival.ts](../../src/islands/consortium/state/arrival.ts) | How the page opens: pure `arrival()`, `hashAction()`, `countryAtStart()`, `guessCountry()` and `arrivalPlan(how, { saved, pref, guess, seed, cell })` (`guess` and `cell` are functions: `countryAtStart` calls the browser's guess, which reads each country's time zones from the page (`countries.zones`, built at build time by `ConsortiumPage.astro` through the core's `countryZones`; asking the browser for all of them took about 0.4 s, 1.6 s on a slow phone, and Firefox has none), only when no link, choice or save names a country, at most once per arrival; b2 review perf-1) (the arrival's decisions: the country shown, the reader's own country worked out without a link's, the link's cell, and the ask of a reload while a link's place waits; Node-tested in `scripts/consortium-pp-b1.test.mjs`, b1a review round 2), `openWith({ how, plan, saved, seed, keptLocation })`, the wiring itself (the country, `locationAtStart`, the saved location's lookup unless a link's cell stands for it, the place seed, the restore or preset or shared climate; Node-tested through a spy location step, b1a review round 3, 3), and `startMemory()`, which reads the page once (`canopi-location` once: the ask's own cell and the lookup), calls `openWith`, then registers the address and save watchers |
| [state/save.ts](../../src/islands/consortium/state/save.ts) | The save model's leaf (fix round 3, 2026-11-15), imported by store.ts and persist.ts so neither imports the other for it: `STORE`, `memory`, `attempt`, `guarded`; `held` (this page's palette is not the save: true on every page, false after a restore of the save or an undoable plant change, true again after Start over), `lastSave` (the save as this page last wrote or read it), `markSave` (an Undo snapshot's `{ text, held }`), `putSave` (the save put back or removed, only while the storage holds what this page last wrote: multi-tab), `undoSave` (flag and state back in one batch, then the save if held again) |
| [state/draft.ts](../../src/islands/consortium/state/draft.ts) | Start's draft: `chooseClimate`, `chooseCountry`, `pickingCountry`, `backToPlace` (the palette's step 1 and Back to Place), `startOver`, `startEmpty` (the pool panel's "Search all plants": opens the search sheet and never removes a plant, fix round 4, s-4; each drops a link's location through `dropLinkLocation` → `letGo`), `openSavedInstead` (adopts what storage holds when pressed: `lastSave` set to it, so another tab's save is opened, never written over; fix round 4, s-5), `cardsLatched` (the climate cards opened by the page, latched until Start over), `cropExamples`. `chooseClimate` keeps every plant (b1a conformance-4: no climate change empties the palette) and makes a member the new climate's list lacks a guest of the climate it was in, so it is still drawn, checked and saved (b1a2-1); `canGoBack`/`backToConsortium` and the `start.back` key went with the "Your place" sheet |
| [state/suggest-wait.ts](../../src/islands/consortium/state/suggest-wait.ts) | The waiting Suggest, one owner: `pendingSuggest`, `waited`, `requestSuggest` (the one press, Place's and the Next step's; it keeps no Undo of its own: the suggestion placed offers it, `store.suggestMembers`, fix round 4, s-1, s-2; asks the store for the suggestion's chunk, `store.wantSuggest()`, then waits for the plant lists, the location lookups and that chunk, capped at 10 s, `suggestWaitMs()` (exported since the E6 hand-off: Swap's own wait for the chunk lasts as long), shortened in the test build by `window.__ctTimeouts.suggest`), `dropSuggest` (exported since the E6 hand-off: the one way a wait ends; `views/PoolSlot.tsx` calls it, untracked, when Start can no longer suggest for the chosen climate or another is chosen; no other island module writes `pendingSuggest`, checked by `scripts/consortium-memory.test.mjs`), `watchSuggest` (reruns a waiting Suggest when `store.suggestRule` arrives; since E6 R4 ends every waiting Suggest with the `details.loadFailed` toast and Reload when `store.suggestFailed`, L8; since PP-B b1b also reruns it when `store.verdictRule` arrives and ends it with `place.count.suggestStopped` and Try again when the verdict chunk is refused while `store.waitsForVerdicts()`). See the wait cap rule below |
| [state/lookups.ts](../../src/islands/consortium/state/lookups.ts) | The location lookups in flight, in the first run (the location module is lazy): `lookups`, `looking`, `lookingThrough`, `unread`, the result `line`, `nextLookup`/`liveLookup`, `unlessReplaced`, `letGo(drop)`. Moved out of `views/location/load.ts` (its re-exports for the seam tests removed in chunk 5) |
| [state/location.ts](../../src/islands/consortium/state/location.ts) | The location step's state, in the lazy location chunk (only `views/location/location.tsx` imports it): `readLocation`, `locationRecord`, `siteFound`, `locationCountry`, the tile `read` (15 s cap, no soil until P5.2), `locate`, `settle`, `useMyLocation`, `searchPlace`, `placeName`, `confirmProposed`, `forget`. See [Consortium location step](/modules/consortium-location.md) |

# Nothing runs at import (E6 S3)

No module of `store.ts` or `state/*` registers an effect or touches `localStorage` when imported. The rule covers those modules only: a few views register effects at import (`views/lazy.tsx`'s prefetch once the data is ready, `views/Sheets.tsx`'s focus-back, `views/PoolSlot.tsx`'s two pending-Suggest effects), harmless since they touch no storage and only react to state. [main.ts](../../src/islands/consortium/main.ts) starts the store and state, in this order: `store.start()` (store.ts's three effects, in their old module order: the range rule's load, the mark providers' load, the end of the Undo offer), `provideLocationStep(loadLocationStep)` (`views/location/load.ts` no longer calls it at import), `setStrings`, `setPageCountries`, `setPageClimates`, `watchPools`, `watchSteps`, `open(data)` (its loader chunk's import starts before its first await), `startMemory()` (state/arrival.ts), then the first render, so the country guess and a stored or linked climate are in its first frame (Place's own layout-effect call went in b1a-2: a no-op). A node test that imports the store therefore starts its effects itself (`store.start?.()` in `consortium-memory.test.mjs` and `consortium-p5-seams.test.mjs`). `scripts/consortium-start.test.mjs` enforces the rule: it counts `effect()` calls through a resolve hook on `@preact/signals` and every read of the `localStorage` global, asserts none on importing store.ts and every state/ module, and that `store.start()` makes exactly the three effects in that order.

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
- **the verdict wait (PP-B b1b, F1a-P7):** with a site climate (`store.waitsForVerdicts()` = `siteClimate`; the `!rangeFailed` term went when PP-C c2 folded the range checks into the verdict chunk), `store.suggestMembers` returns false until `poolVerdicts` exist, so the Suggest waits for the verdict chunk too (the gain counts the open holes a plant fills, and a member outside its range fills none). A **refused** verdict chunk ends the wait at once (an effect on `store.verdictFailed`) with the `place.count.suggestStopped` toast and Try again (`load.retry`; Reload when `store.verdictNeedsReload`, set when a failed retry's verdict file answers a HEAD), which calls `requestSuggest()` again; `requestSuggest` asks for the chunk again in place (`store.retryVerdict()`) when it had failed. A **stalled** verdict chunk at the cap (the list and the suggestion's chunk read, the verdicts still missing) ends the wait with the `details.loadFailed` toast and Reload, since the import is still pending and Try again could not ask again; its id is kept (`lateVerdictToast`) and the toast goes if the chunk then comes, only while it is still the toast shown. Without a site climate the suggestion never waits for verdicts.

If the chunk then arrives, an effect in `watchSuggest` takes down only that Reload toast, and only while it is still the toast shown (a newer toast stays); the wait stays ended, so no suggestion runs. Browser tests E6-16, E6-16b and E6-18 (`consortium-e6-r4.browser.test.mjs`) cover the three cases.

All L7 cycles are gone after chunk 2 (coordinator row "E6 chunk-2 merge choices" in [the decisions](/decisions/consortium-user-decisions.md)).

# Field options

`defineState(fields)` takes a record of `Field<T>`; each has an `initial()` value (its signal is made here) and any of:

| Option | Meaning |
|---|---|
| `undo` | Undo puts it back (in the snapshot); a function computes what Undo writes from the value before and now (`view`: only to or from Start) |
| `endsUndo` | a change to it ends the Undo offer (`climate`) |
| `saved` | part of the `Consortium` the save keeps (the save model, fix round 3, 2026-11-15: while the page owns the save, `state/save.ts` `held` false, every change is written, Place's answers and plants included, owner decision 1; held, a link's or a guide's page or a page after Start over, nothing is written until a plant change, owner decision 2; see [plant-palette-architecture](/architecture/plant-palette-architecture.md) 8.3); the save is the link's fragment, so a saved field is in the `#v=5` link under its own name in the core `ShareState`, and watched as `reader` |
| `link` | `put(v, o)` (into the link; default as it is) and `take(s, now, o)` (back from a decoded link or save; default the link's value, else the current one). `o` = `{ location, countryFrom }` |
| `watched` | for an unsaved field: `reader` (a write is the reader acting: save, address and Share's link follow); the `save` option went with `setAside` (fix round 3) |
| `plants` | one of the plant lists: saved, in Undo, ends Undo; Start over empties it, a change ends a waiting Suggest |

The derived lists: `snapshot`, `endsUndo`, `saved`, `plants`, `reader`, `save`. Operations: `signals`, `peek(list)`, `track(list)` (read in an effect or computed), `valuesOf(list)`, `write(values)`, `snapshot()`/`restore(s)` (Undo, one batch), `share(values, o)` (the link's state), `apply(s, o)` (a decoded link or save into the saved fields).

# The fields

- `CONSORTIUM_FIELDS`: `climate` (saved, endsUndo), `country` (saved; `put` never writes a guessed country and a location country only with the "include my location" tick, owner row 2026-10-28 and P5 owner answer 5; `take` labels a link's country by where it came from), `site` (saved, `DEFAULT_SITE` all `unsure`), the plant lists `members`, `kept`, `removed`, `guests` (link form `[{id, from}]`), `retired` (since PP-C commit 0, review c0-2: saved entries the release retired, `plant_aliases` with `new_id` NULL; kept, saved and written back into the link's `a`, never dropped; `persist.shows()` counts it; Start over offers Undo when it alone holds entries; `restore` says `notices.retired` only for `from: 'link'`, not on each reload of the save), `crops` (link keeps `MAX_CROPS`, three), and `stage` (saved).
- `STATE_FIELDS` adds `view` (watched `reader`, undo only to or from Start) and `stage`; `setAside` went in fix round 3 (Place and the palette page show one palette).
- Types: `Consortium` (the consortium fields with a non-null climate), `ShareInput` (stage may be null).
- `state = defineState(STATE_FIELDS)`; [store.ts](../../src/islands/consortium/store.ts) re-exports each signal by name, and `SNAP_KEYS` is `state.lists.endsUndo`; in [state/persist.ts](../../src/islands/consortium/state/persist.ts) `shareState` is `schema.share`, `palette()` peeks `lists.saved`, and `shownFragment` and `watchStore` `track` the `reader` list (one watcher effect: the action count, then `persist`); [state/restore.ts](../../src/islands/consortium/state/restore.ts) applies a decoded link or save with `schema.apply`; [state/draft.ts](../../src/islands/consortium/state/draft.ts) `chooseClimate`/`startOver` write `valuesOf(lists.plants, …)`; [state/suggest-wait.ts](../../src/islands/consortium/state/suggest-wait.ts) tracks `plants` to drop a waiting Suggest.

# Adding a field

Declare it in `CONSORTIUM_FIELDS` or `STATE_FIELDS` with its options; Undo, the save, the watchers and the share state follow with no other change. A new saved field also needs the core link codec (`src/lib/consortium/state.ts` `encodeLink`/`decodeLink`) to carry a new `#v=4` parameter (coordinator row "E6 chunk-1 merge choices", P-E6c fallback). `shareState`/`apply` pass site and plant arrays by reference; nothing mutates them in place.

# Tests

`scripts/consortium-memory.test.mjs`: each field declares its part once; the saved fields are exactly the core `ShareState`; store.ts and the state/ modules list no state field by hand; a test-only extra field round-trips through Undo, watchers, save and share state; per saved field save → restore and link → restore; Undo per snapshot field; any `endsUndo` change hides the Undo toast; saves and `#v=4` links written before the schema open as they did (superseded: since 2026-11-17 they read as unreadable).

## PP-B commit 0a (2026-11-14)

- Links and the save record use `#v=5`; the `#v=4` lines above describe the old format. `persist.ts` `readRecord` and `restore.ts` follow `linkVersionStatus`:
  - v1–v4 (the old beta tool) are unreadable since the owner's 2026-11-17 rule "No backward compatibility work": nothing restored, no older-version line (`outdated`) or older-save line (`oldSave`, `oldRecord`, both deleted), the save left untouched until the next change overwrites it; the beta's query links (`?v=3&c=…`) are not read at all.
  - newer and unreadable versions leave the save untouched.
- No alias handling (owner 2026-11-17): there is no `ShareState.retired`, no merge resolution and no retired/moved notice; an id the release does not list is counted in `unknownCount`.
- The save record is `{ fragment, place, at, src, country? }`. `place` holds the grower's own values `f b p i d` (since v14 0W-2 R4; the old spot and soil keys `l w q r h s` are gone). Room and plot travel as the fragment's `m` and `z`. The country is kept for both the `link` and `location` sources.
- `schema.ts` adds the fields `room`, `plot`, `spot`, `soil` and `period`, and marked `kept`, `crops` and `stage` deprecated (not written to v5); PP-B commit 0a' removed `kept` and `crops`, and `stage` is now an unsaved signal for print.
- `site` stays a derived signal that is not saved.
- `canopi-place` only seeds a new palette.
- `history.state.pl` is carried by `persist.ts` and `arrival.ts`.
- Until b1a and b2 rewrite them, 31 tests in `consortium-core`, `consortium-memory` and `consortium-p5-seams-s5b` still assert v4 literals. The plan assigns them to b1a and b2.

## PP-B b1a (2026-11-14)

- **A link that brings a place** (`bringsPlace`) and differs from the reader's own (`samePlace`): `restore.ts` applies it to the page, sets `linkPlace` (persist.ts, `{ own }`: the reader's spot, soil and country just before) and `holdSave(true)`; persist() keeps writing the address but the save keeps the reader's own place until "Use it" (`draft.ts useLinkPlace`: the link's country becomes chosen, its cell the device location, `canopi-place` reseeded) or "Use my own place" (`useOwnPlace`); neither touches the hold (owner 2026-11-15, decision 2). A reader edit of spot or soil ends the notice too.
- **Reload while it waits**: `writeAddress` puts `ask: 1` in `history.state` and a link's country as `k` in `pl`; `arrival()` returns `ask: true` and `startMemory()` restores with `ask` set to the reader's own place (the held save's `place`, else the seed, and the country chosen at start), so the notice comes back. `ask` holds nothing: `hold: 1` is written from `held` alone and read only as itself, so a page that owned its save (a plant added while the question was open) reloads owned (fix round 4, s-3). A reload or Back/Forward never overwrites a save that differs from the page: `arrival()` opens held unless storage still holds this palette (`stillSaved`: the same fragment, and the same answers unless `ask` is set, `k` and `o` stripped), and the hash listener holds when storage moved since `lastSave`, so "Open my saved palette instead" offers the other tab's save (pre-push fix 5). With storage unavailable (`memory.works()` false) a reload opens owned: no other tab's save exists to protect (second-round review 3).
- **Back or another link while it waits**: the reader's own spot, soil and country are put back before the next palette applies.
- **One Undo for Place's moves**: through store.ts `offerUndo`, the same offer as Remove, Swap and Add (Start over: "Your palette was cleared; your place stays."; every suggestion placed, waited or not, from `store.suggestMembers` itself, so no caller can skip it (fix round 4, s-1, s-2); "Show my palette" offers none since fix round 3). Each snapshot is `store.snapshot()`, the schema's plus the save mark, and the Undo goes through `save.ts` `undoSave`. Since the chunk-1 merge draft.ts keeps no Undo of its own; the end of the offer is store.ts's effect, registered by `start()`.
- **Guide preset over a save**: the preset holds the save (`applyPreset` `holdSave(true)`), so `savedInstead` keeps it one press away ("Open my saved palette instead", `draft.ts openSavedInstead`); `notices.guidePlant` replaces `guideKept`.
- **Forget** (`state/location.ts forget`) clears `canopi-location`, `canopi-place` and the palette's own values (`store.siteEdits` to `NO_EDITS`); on a held page `persist.ts` `forgetSavedPlace` scrubs the stored record's place and a location-derived country too (pre-push fix 3), and adopts the scrubbed record as `lastSave` only when the stored one was this page's, so another tab's save stays protected (second-round review 1). The tab counts its Forgets (`save.ts` `forgets`/`noteForget`, sessionStorage `canopi-forget`); `writeAddress` stamps each entry `fg`, and `arrival.ts` `ownOf` keeps only a link's `k` and `o` of an older entry's `pl`, so Back or a reload brings no forgotten answer back (second-round review 2).

## Store seams added by PP-B b2 (chunk 1)

`store.ts` gains, additively: `step` (place or palette), `yearStep`, `notNow`, `slow`, `opening`, `offline`, `failedPools` and `failedMembers` (a guest list that failed), `verdictFailed`, `wantVerdict()` (the palette page asks for the verdict chunk on mount; `store.start()` keeps its three effects; since b1b a new load clears `verdictFailed` as it starts, so `verdictFailed` means the current load failed, and `retryVerdict()` only calls it when no load is pending and no rule is in; back online, `start()`'s `online` listener retries a refused verdict chunk in place, so no view needs a listener of its own), `waitsForVerdicts()` (b1b), `holdToast` and the exported `offerUndo` (Place's moves in `state/draft.ts` and `state/suggest-wait.ts` use it since the chunk-1 merge). The toast timer reads `__ctTimeouts.toast` in the test build.

## Spot and soil answers removed (v14 pf 0W-2 R4, 2026-11-18)

The spot and soil schema fields, `emptyPlace` and the spot and soil link keys are deleted. `persist.ts` `palette()` is the saved fields as they are; the save's `place` and the address's `pl` carry the grower's own values (`store.siteEdits`, saved since 0W-1); the `canopi-place` seed (`placeSeed()`) is room and plot only. While a link's place waits, the save keeps the reader's own country and own values (`linkPlace.own`), never the link's. A link brings a place with its cell (`o`) or the grower's values (`f b p i d`); `k` alone does not. A cut link (no `e=1`) is refused as unreadable and restores nothing (restore.ts; the "cut" notice and its strings are gone).

## Main h2 hand-off (2026-11-18)

- A Suggest that ran before the climate was read says so in the suggestion's own toast (`store.ts` `suggestMembers(note)`: its words, then `location.unread`, with "Read it again" (`location.ts` `tryAgain`) beside Undo); `suggest-wait.ts` never shows a second toast over that Undo.
- Start over (`draft.ts` `startOver`) offers "Palette cleared: N plants." with Undo only when the palette had plants; with none left it shows no toast.
