---
type: Module
title: Consortium state (schema and state/ modules)
description: "The consortium island's state layer under src/islands/consortium/state/: the schema that declares each field once (Undo, save, #v=4 link, watchers), and the modules E6 S2 split out of memory.ts for storage, restore, arrival, Start's draft, the waiting Suggest, the location lookups and the location step."
tags: [consortium, state]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T08:28:41Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:45Z }
sources:
  - id: schema-ts
    resource: ../../src/islands/consortium/state/schema.ts
    title: src/islands/consortium/state/schema.ts
    digest: sha256:41febe1d6c1f775e
    last_modified: 2026-11-13T07:21:50Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:dfaabafd37b37f55
    last_modified: 2026-11-13T08:16:52Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:86f1a81beb63e1a1
    last_modified: 2026-11-13T07:21:50Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:29c0fba5d33f99b7
    last_modified: 2026-11-13T11:02:09Z
  - id: persist-ts
    resource: ../../src/islands/consortium/state/persist.ts
    title: src/islands/consortium/state/persist.ts
    digest: sha256:f2a94e32eb979a92
    last_modified: 2026-11-13T08:21:53Z
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
    digest: sha256:700d6e15c6af6d35
    last_modified: 2026-11-13T08:21:53Z
  - id: suggest-wait-ts
    resource: ../../src/islands/consortium/state/suggest-wait.ts
    title: src/islands/consortium/state/suggest-wait.ts
    digest: sha256:c9f254a067a76df9
    last_modified: 2026-11-13T07:21:50Z
  - id: lookups-ts
    resource: ../../src/islands/consortium/state/lookups.ts
    title: src/islands/consortium/state/lookups.ts
    digest: sha256:9b4b17c87a85f603
    last_modified: 2026-11-13T07:21:50Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:ca30b03006dfdeeb
    last_modified: 2026-11-13T07:21:50Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:b90e383c5ca5f3b6
    last_modified: 2026-11-13T08:21:53Z
  - id: consortium-start-test-mjs
    resource: ../../scripts/consortium-start.test.mjs
    title: scripts/consortium-start.test.mjs
    digest: sha256:6cf0b5a45c6c62bd
    last_modified: 2026-11-13T08:21:53Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:816f7842acc7c951
    last_modified: 2026-11-13T08:21:53Z
enforced_by:
  - scripts/consortium-memory.test.mjs
  - scripts/consortium-start.test.mjs
---

# Responsibility

The consortium island's state, declared once in [state/schema.ts](../../src/islands/consortium/state/schema.ts) (E6 stream S1; design check §7.1 "Consortium state"). Each field says what it holds and where it goes; everything that used to list the fields by hand (store.ts's signals and Undo snapshot, the share state, link apply, set-aside, Start over and watchers) derives from it. Part of the [Consortium page](/modules/consortium-page.md); layer L3 of [ADR-1](/decisions/consortium-island-layers.md) (no module here imports a view).

# The state/ modules (E6 S2)

E6 stream S2 split `memory.ts` (about 780 lines) into the modules below; `memory.ts` is now a re-export barrel of the names the views and `scripts/consortium-p5-seams-s5b.test.mjs` import, until chunk 5 points them at `state/` and deletes it.

| Module | Holds |
|---|---|
| [state/persist.ts](../../src/islands/consortium/state/persist.ts) | Storage keys (`canopi-consortium`, `canopi-country`, `canopi-climate`, `canopi-location`), guarded storage (`memory`, `attempt`, `storageWorks`), the saved record (`saveRecord`, `readRecord`, `oldRecord`), `CountryFrom` (derived from the store's `CountrySource` without `'guess'`; `fromOf`), `shareState` (`schema.share`), `shareUrl`, the restore in flight (`inFlight`, `restoring`, `pendingClimate`, `pendingLinkClimate`), `climateShown` (the card Start shows, chosen or proposed), `own()`, `currentFragment`, `writeSave`, `writeAddress`, `shownFragment`, `watchStore` and the reader's action count (`actionCount`, `quietly`). Below restore.ts and the location step so neither imports the other |
| [state/restore.ts](../../src/islands/consortium/state/restore.ts) | `notices`, `restore(fragment, {from, src, keep})` (reads everything first, applies in one batch only if still the newest restore and the reader has not acted), `applyPreset` (guide `?plant=&climate=`), `ownLocation` (the saved site looked up again), `waitForSource`, and `provideLocationStep(load)`: main.ts hands it `views/location/load.ts`'s loader before the first render (E6 S3), so state never imports a view (ADR-1 L2); a missing step logs an error |
| [state/arrival.ts](../../src/islands/consortium/state/arrival.ts) | How the page opens: pure `arrival()`, `hashAction()`, `countryAtStart()`, `guessCountry()` (Node-tested), and `startMemory()`, which wires them once |
| [state/draft.ts](../../src/islands/consortium/state/draft.ts) | Start's draft: `chooseClimate`, `chooseCountry`, `pickingCountry`, `changeSite`, `startOver`, `canGoBack`, `backToConsortium`, `startEmpty` (each drops a link's location through `dropLinkLocation` → `letGo`), `cropExamples`, `plantName` |
| [state/suggest-wait.ts](../../src/islands/consortium/state/suggest-wait.ts) | The waiting Suggest, one owner: `pendingSuggest`, `waited`, `requestSuggest` (waits for the plant lists and the location lookups, capped at 10 s), `watchSuggest` |
| [state/lookups.ts](../../src/islands/consortium/state/lookups.ts) | The location lookups in flight, in the first run (the location module is lazy): `lookups`, `looking`, `lookingThrough`, `unread`, the result `line`, `nextLookup`/`liveLookup`, `unlessReplaced`, `letGo(drop)`. Moved out of `views/location/load.ts`, which re-exports them for the seam tests |
| [state/location.ts](../../src/islands/consortium/state/location.ts) | The location step's state, in the lazy location chunk (only `views/location/location.tsx` imports it): `readLocation`, `locationRecord`, `siteFound`, `locationCountry`, the tile `read` (15 s cap, no soil until P5.2), `locate`, `settle`, `useMyLocation`, `searchPlace`, `placeName`, `confirmProposed`, `forget`. See [Consortium location step](/modules/consortium-location.md) |

# Nothing runs at import (E6 S3)

No module of `store.ts` or `state/*` registers an effect or touches `localStorage` when imported. [main.ts](../../src/islands/consortium/main.ts) starts everything, in this order: `store.start()` (store.ts's three effects, in their old module order: the range rule's load, the mark providers' load, the end of the Undo offer), `provideLocationStep(loadLocationStep)` (`views/location/load.ts` no longer calls it at import), `setStrings`, `watchPools`, `open(data)`, the render; Start then calls `startMemory()` (state/arrival.ts) in a layout effect. A node test that imports the store therefore starts its effects itself (`store.start?.()` in `consortium-memory.test.mjs` and `consortium-p5-seams.test.mjs`). `scripts/consortium-start.test.mjs` enforces the rule: it counts `effect()` calls through a resolve hook on `@preact/signals` and every read of the `localStorage` global, asserts none on importing store.ts and every state/ module, and that `store.start()` makes exactly the three effects in that order.

The site's lowercase climate id comes from the core's `siteIdOf` (exported from `src/lib/consortium/index.ts`, used by `state/draft.ts` `chooseClimate`); persist.ts's hand-written `siteId` was removed in S3.

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
