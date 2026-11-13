---
type: Module
title: Consortium state schema
description: "The consortium island's state schema: each field declared once with its initial value and whether Undo, the save, the #v=4 link and the watchers hold it, from which store.ts and memory.ts derive every field list."
tags: [consortium, state]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:39:12Z }
sources:
  - id: schema-ts
    resource: ../../src/islands/consortium/state/schema.ts
    title: src/islands/consortium/state/schema.ts
    digest: sha256:7dcc125460b48c23
    last_modified: 2026-11-13T04:26:28Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:5377832f342adfbb
    last_modified: 2026-11-13T04:26:28Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:b4754548a4d65e22
    last_modified: 2026-11-13T04:07:29Z
  - id: consortium-memory-test-mjs
    resource: ../../scripts/consortium-memory.test.mjs
    title: scripts/consortium-memory.test.mjs
    digest: sha256:3333bfba6ba3d50a
    last_modified: 2026-11-13T04:26:28Z
enforced_by: [scripts/consortium-memory.test.mjs]
---

# Responsibility

The consortium island's state, declared once in [state/schema.ts](../../src/islands/consortium/state/schema.ts) (E6 stream S1; design check §7.1 "Consortium state"). Each field says what it holds and where it goes; everything that used to list the fields by hand (store.ts's signals and Undo snapshot, memory.ts's share state, link apply, set-aside, Start over and watchers) derives from it. Part of the [Consortium page](/modules/consortium-page.md).

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
- `state = defineState(STATE_FIELDS)`; [store.ts](../../src/islands/consortium/store.ts) re-exports each signal by name, and `SNAP_KEYS` is `state.lists.endsUndo`; [memory.ts](../../src/islands/consortium/memory.ts) `shareState` is `schema.share`, `applyDecoded` calls `schema.apply`, `own()` peeks `lists.saved`, `chooseClimate`/`startOver` write `valuesOf(lists.plants, …)`, and `shownFragment`, `watchStore` and the Suggest-drop effect `track` the `reader`, `save` and `plants` lists.

# Adding a field

Declare it in `CONSORTIUM_FIELDS` or `STATE_FIELDS` with its options; Undo, the save, the watchers and the share state follow with no other change. A new saved field also needs the core link codec (`src/lib/consortium/state.ts` `encodeLink`/`decodeLink`) to carry a new `#v=4` parameter (coordinator row "E6 chunk-1 merge choices", P-E6c fallback). `shareState`/`apply` pass site and plant arrays by reference; nothing mutates them in place.

# Tests

`scripts/consortium-memory.test.mjs`: each field declares its part once; the saved fields are exactly the core `ShareState`; store.ts and memory.ts list no state field by hand; a test-only extra field round-trips through Undo, watchers, save and share state; per saved field save → restore and link → restore; Undo per snapshot field; any `endsUndo` change hides the Undo toast; saves and `#v=4` links written before the schema open as they did.
