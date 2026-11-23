---
type: Module
title: Consortium location step
description: The consortium's optional site location (geolocation, Nominatim search, MapLibre map) that suggests a climate card and a country from the climate tiles, kept on the device and put in a link only on request.
generated: { by: antigravity/gemini, at: 2026-11-23T14:42:34Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T13:01:18Z }
  - { by: antigravity/gemini, at: 2026-11-23T14:42:28Z }
sources:
  - id: location-privacy-tsx
    resource: ../../src/islands/consortium/views/location/privacy.tsx
    title: src/islands/consortium/views/location/privacy.tsx
    digest: sha256:cd3c9e941a9646eb
    last_modified: 2026-11-19T12:55:44Z
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:1240a627ed5f4e7e
    last_modified: 2026-11-23T11:50:28Z
  - id: location-tsx
    resource: ../../src/islands/consortium/views/location/location.tsx
    title: src/islands/consortium/views/location/location.tsx
    digest: sha256:342093afa0ffb607
    last_modified: 2026-11-19T12:55:44Z
  - id: load-ts
    resource: ../../src/islands/consortium/views/location/load.ts
    title: src/islands/consortium/views/location/load.ts
    digest: sha256:35349134ff46ab9c
    last_modified: 2026-11-14T21:28:50Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:eb4395e60994e93b
    last_modified: 2026-11-12T07:59:10Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:023783ecbccd0096
    last_modified: 2026-11-19T12:21:26Z
  - id: registry-ts
    resource: ../../src/lib/location/registry.ts
    title: src/lib/location/registry.ts
    digest: sha256:74e29a7ac1a27d34
    last_modified: 2026-11-18T17:37:33Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:8e36232a62615b80
    last_modified: 2026-11-18T17:37:33Z
  - id: geolocation-ts
    resource: ../../src/lib/location/geolocation.ts
    title: src/lib/location/geolocation.ts
    digest: sha256:052230d0cde4bb32
    last_modified: 2026-11-11T20:54:26Z
  - id: maplibre-ts
    resource: ../../src/lib/location/maplibre.ts
    title: src/lib/location/maplibre.ts
    digest: sha256:5d74cb8f32ef1e1a
    last_modified: 2026-11-11T18:00:01Z
  - id: maplibre-entry-ts
    resource: ../../src/lib/location/maplibre-entry.ts
    title: src/lib/location/maplibre-entry.ts
    digest: sha256:da3a0c205f99a418
    last_modified: 2026-11-11T19:25:16Z
  - id: maplibre-worker-ts
    resource: ../../src/lib/location/maplibre-worker.ts
    title: src/lib/location/maplibre-worker.ts
    digest: sha256:0ea12cf3eed423f3
    last_modified: 2026-11-11T18:00:01Z
  - id: share-tsx
    resource: ../../src/islands/consortium/views/Share.tsx
    title: src/islands/consortium/views/Share.tsx
    digest: sha256:64add8412f5965b6
    last_modified: 2026-11-19T06:07:14Z
  - id: s5b-css
    resource: ../../src/styles/consortium/p5/s5b.css
    title: src/styles/consortium/p5/s5b.css
    digest: sha256:ed9da057326d8304
    last_modified: 2026-11-18T17:05:25Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/place/Place.tsx
    title: src/islands/consortium/views/place/Place.tsx
    digest: sha256:14a42c84ad90d387
    last_modified: 2026-11-23T14:32:46Z
  - id: transport-ts
    resource: ../../src/lib/location/transport.ts
    title: src/lib/location/transport.ts
    digest: sha256:8a1b289257cc7217
    last_modified: 2026-11-11T20:03:06Z
  - id: location-ts
    resource: ../../src/islands/consortium/state/location.ts
    title: src/islands/consortium/state/location.ts
    digest: sha256:5cfe9d29fed62a99
    last_modified: 2026-11-19T13:11:53Z
  - id: lookups-ts
    resource: ../../src/islands/consortium/state/lookups.ts
    title: src/islands/consortium/state/lookups.ts
    digest: sha256:9b4b17c87a85f603
    last_modified: 2026-11-13T07:21:50Z
  - id: restore-ts
    resource: ../../src/islands/consortium/state/restore.ts
    title: src/islands/consortium/state/restore.ts
    digest: sha256:20cb5074cb42d667
    last_modified: 2026-11-19T09:14:39Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:59ecfbc3a59f1adf
    last_modified: 2026-11-19T11:59:54Z
  - id: index-ts
    resource: ../../src/lib/climate/index.ts
    title: src/lib/climate/index.ts
    digest: sha256:0c6931a4a66f6ca4
    last_modified: 2026-11-23T11:35:01Z
enforced_by:
  - scripts/consortium-p5-seams-s5b.test.mjs
  - scripts/browser/consortium-studio-onboarding.browser.test.mjs
---

# Consortium location step ("Where is your site?")

P5 stream S5b. Above the climate cards on Start, the reader may give a site location; it **suggests**
a climate card and a country, and the reader confirms (owner answers 1, 4, 5). Part of the
[Consortium page](/modules/consortium-page.md); the pure rules live in the [Consortium core](/modules/consortium-core.md).

## Files

| File | Role |
|---|---|
| `src/islands/consortium/views/LocationSlot.tsx` | Thin shell in the island (first run): the three controls (the search input `.ct-location-search` is `11.2em` wide in `base.css`, so a late web font cannot resize it; [fallback fonts](/decisions/metric-matched-fallback-fonts.md)), each with a `[data-location-privacy]` line naming the service, the privacy link (`/privacy/`, S5f), a loading line while a link's or saved location is looked up. "Use my location" shows only with the Geolocation API (an inline `isSecureContext && navigator.geolocation` check: importing lib/location/geolocation.ts would put that module in the first run); the map button only with WebGL, probed once (a `webgl` context, released with `WEBGL_lose_context`), never in `compact`. Enter while an input method composes (`isComposing`, keyCode 229) is not a search. `compact` (result head): the result line only |
| `src/islands/consortium/state/location.ts` | Since E6 S2 the location step's state, in the lazy location chunk (only location.tsx imports it): `readLocation`, `locationRecord`, `keepLocation`, `locationCountry` (uses persist.ts's `memory` and `quietly`), `siteFound(write, code?)` (a lookup's writes in one batch, then the country quietly, outside it), the tile `read` (15 s `READ_TIMEOUT_MS`, `{ soil: false }`), `soilLater` (the soil map's reading after the place, best effort), `lookUpName` (the reverse lookup's name for a typed point, `nameAsk`), `locate`, `settle(how, saved)`, `useMyLocation`, `searchPlace`, `placeName`, `confirmProposed`, `forget`. The seam tests import it directly (`views/location/keep.ts` deleted in E6 chunk 5) |
| `src/islands/consortium/state/lookups.ts` | In the first run: `lookups`/`looking(step)`: location steps in flight (a click, a search, a map centre, a link's or the saved location), counted until they settle or fail; `lookingThrough(load, run)` holds one count from the chunk load through its settle; `unread` (Suggest ran without the site's climate); the result `line`; `nextLookup`/`liveLookup` (one lookup at a time owns Start's location state: an older or dropped one writes nothing); `unlessReplaced(wait)` (a prompt, position, tile read or search ends with `undefined` the moment its lookup is replaced or dropped; review round 4, 1, P5-1g); `letGo(drop)` |
| `src/islands/consortium/views/location/load.ts` | `loadLocationStep()` (cached `import('./location.tsx')` through core `retry-import.ts` `retryableImport` since the E6 hand-off, so after a failure the next ask fetches the chunk again as `?retry=n`, even in Chromium; a failure logged once and not cached), the `locationStep` signal, and `loadLocationStep`, which main.ts hands to `state/restore.ts` with `provideLocationStep` before the first render (state imports no view, ADR-1 L2; since E6 S3 this module registers nothing at import, and the loader is in place before `startMemory`). Its re-exports of the `state/lookups.ts` names were removed in E6 chunk 5 (the seam tests import `state/lookups.ts`) |
| `src/islands/consortium/views/location/location.tsx` | The lazy chunk's entry (≤ 20 KB); renders only since E6 S2, re-exporting `settle`, `useMyLocation`, `searchPlace` from `state/location.ts`: the shell (LocationSlot) and `state/restore.ts` (settle) call them through these three, the lazy chunk's interface (a direct import of `state/location.ts` would split it into a second, role-less lazy chunk; kept at the E6 chunk-5 merge, coordinator row "E6 chunk-5 merge choices"): `openMap`, `stateText`, `LocationResult` (`[data-location-state]`, `[data-location-confirm]`), the map dialog (`[data-location-map]`, crosshair, `[data-location-use-centre]`; test hook `mapCentre`) |
| `src/lib/consortium/site-climate.ts` | `siteClimate(lookup)`: state `sea` / `polar` / `borderline` / `coast` / `ready`, `zone`, `near`, `suggested`; `koppenZone(k)` |
| `src/lib/consortium/state.ts` | `o=` in links: `encodeLink(…, { origin })`, `linkOrigin(link)`, `cellCentre(lookup)` |
| `src/lib/location/*` | Copied from canopi (see below): registry, place search, transport, geolocation, MapLibre loader; `maplibre-entry.ts`, `maplibre-worker.ts` |

## Rules

- **Nothing third-party before a click.** Geolocation on the button only (low accuracy, 10 min cache, 15 s timeout); Nominatim on Enter only (limit 5, `accept-language` = page language, no email, 1.1 s pacing, an in-memory cache per query, attribution shown); MapLibre and OpenFreeMap (positron or dark by theme) when the map opens. Climate tiles are the site's own (`#ct-climate` names them).
- **Privacy line and place-name credit (PP-C pre-push privacy-1, privacy-2; master's behaviour kept).** `views/location/privacy.tsx` (first run) draws the place search's privacy line (`[data-location-privacy]`: lock, `consortium.location.searchPrivacy`, the `/privacy/` link). `LocationSlot` shows it under the field from the first render, before any search and beside "Look up its name" before its press; while the answers to choose from are shown (`choices`), their own line (`Answers`) replaces it, so it is said once per screen. A place row whose name came from Nominatim (any `label`: one search answer, a reverse lookup, a link's `n`) ends with `[data-location-credit]`, `consortium.location.placeCredit` ("Place names © OpenStreetMap contributors.", linked to openstreetmap.org/copyright), plus the search's own attribution when it names someone else. Pinned by `consortium-pf-c.browser.test.mjs` PFC58, PFC59.
- **Used at once (v13/v14 boards; the v12 proposal and its `[data-location-confirm]` are gone).** A `ready`, `coast` or `borderline` site's climate is chosen at once (`locate` → `chooseClimate`); borderline takes the class's own climate, the other one tap away; polar chooses none. Never over a climate kept for the same cell, never by a link's location, and never over a climate chosen while the read ran: `useMyLocation` and the place search note the climate when the reader's ask began (with its lookup id), and a climate chosen since, by hand or by a link's palette pasted meanwhile, stands (P5-1c). `store.proposedClimate`, `proposedFromSave` and `persist.ts climateShown` are dead (triage M9).
- **Borderline** (`BORDERLINE_C` 0.5 °C): the class disagrees with its means (`koppenTemperatureMarginC` > 0), or a monthly mean lies within 0.5 °C of a bound that changes the zone: coldest month 18 °C (A/C) or 0 °C (C/D), warmest 22 °C only where it changes the zone (Cfa Subtropical / Cfb Temperate; Da/Db), warmest 10 °C (tundra). `near` names the zone across; from an A class it is the C class it would be (Aw → Cw, As → Cs, Af/Am → Cf, summer letter a if the warmest month ≥ 22 °C, else b: a highland Af is Cfb, Temperate). B classes are rainfall-set: never borderline on temperature. Lyon (Cfa, warmest 22.4 °C) is borderline with Temperate. **Class from the means** (decision row "Climate ranges fixed before the P5 push"): when `koppenTemperatureMarginC` > 0 and `meansKoppen(today)` (main group A/C/D from the coldest-month mean, 18 °C and > 0 °C; C/D summer letter from the warmest, 22 °C; dry letter kept; B and E unchanged) gives another zone, `siteClimate` proposes that zone (`koppen` = the means class, `mapKoppen` = the stored one); within `MEANS_MARGIN_C` 2 °C (the margin itself) it is borderline with the stored class's zone, further out a plain suggestion. The line names the means class in `location.why`, adds `location.means` ("The climate map gives {map} here, but this area’s own average temperatures give {koppen}.") and, borderline, `location.meansNear` ({margin}) instead of `location.state.borderline`. Nairobi's cell (stored Aw, margin 0.4, coldest-month mean 17.6 °C) proposes Subtropical (Cwb), between Subtropical and Tropical. A disagreement that changes no zone keeps the old rule (borderline, nothing across).
- **Sea** (no climate cell): "pick a point on land"; the store is left alone, and with a site already read the line names it: "… Still using {place}." (`location.state.seaKept`). **Coast** (a climate but no country): the nearest cell's climate, no country or soil. **Tiles failed**: a site already read stays in use everywhere (store, `canopi-location`, its location country) and the line says so (`location.state.failedKept`, "… Still using {place}."), so a reload agrees with the page; with none, or a link's location not read yet, location and proposal cleared, manual cards with a note (`location.state.failed`). Invariant (seam review 2, 3): whenever a site drives the pool, marks and future, the panel names it; `stateText` in views/location/location.tsx writes these lines, in the result line and the map dialog.
- **Country from the location**: `locationCountry` (state/location.ts) sets `{code, source: 'location'}` over a guess, none or an earlier location country, never over `chosen` or `link`. A lookup's writes are quiet (the click was the reader's action), so a link pasted while tiles load still restores; only Forget is a reader write. The country goes through `siteFound`, after the batch: `quietly()` is synchronous and a batch flushes after it resets, so a write inside a batch is counted as the reader acting (review round 2, 1).
- **Device only**: `localStorage['canopi-location']` `{lat, lon, source, label?}`; looked up again after the plant list opens (`ownLocation` in state/restore.ts) unless the link opened carries `o=`. One rule for a fresh open and a link pasted into the open tab (seam review 5; coordinator decision row to record): a link without `o=` leaves the reader's own saved site in place (their checks are about their site; the link's plants are unchanged); only a link's `o=` stands in for it, for that page. `ownLocation` runs one lookup at a time (a fresh link without `o=` asks at startup and again when it opens: seam review round 2, 3; P5-27j). A saved site read while a share link's climate is still opening proposes no card (`pendingLinkClimate`); under a saved consortium opening it still does, and the restore's batch clears it when the save opens (only a proposal from that lookup, `store.proposedFromSave`; one the reader's own locating made stays: round 4, 2, P5-27p), so only a save that fails to open leaves the card proposed (round 2, 2; round 3, 1; P5-27i, P5-27k). The line's "Use …" never shows over a climate still opening (`pendingClimate`).
- **Links**: `o=<lat>,<lon>` (the climate cell centre, ≤ 3 decimals, literal comma, just before `e=1`) and the location country only when the reader ticks Share's `input[data-share-location]`. A link with `o=` sets `store.location` (source `link`, labelled "from the shared link, approximate") in the restore batch; the link's climate, answers and country win. It lives for that page only (coordinator decision, review round 1): never saved over the reader's `canopi-location`, never a country, and Forget leaves the reader's own saved location. A link without `o=` (hashchange) clears a link-sourced location and its line and looks the reader's own saved site up again (`ownLocation`), and so do Change site (the palette's step 1 back to Place), Start over and Start empty (`dropLinkLocation` → `letGo(true)`: the link's lookup is dropped too, so no loading line stays, no later "failed" is written and Suggest is not held; review rounds 2, 4 and 3, 2; P5-13c, 13d). Those three, Forget and a failed read also clear the "not read" note; a later plain visit restores the reader's own saved site.
- **Suggest waits for a lookup**: `requestSuggest` (state/suggest-wait.ts) with `lookups` > 0 sets `pendingSuggest` and runs once they settle, so the suggestion's range filter (S5c) sees the site; the result line meanwhile reads "Reading the climate of your site…" (review round 1 addendum, spec P5-1d). A saved or link location holds one lookup from the chunk load through its settle (`lookingThrough`, no gap). The wait is capped at 10 s per press (`waited`, its timer cleared by the next press or when Suggest runs; review round 3, 1): Suggest then runs without the site: the palette page shows board Loading's message "Plants were suggested without your place’s climate…" (a toast, `location.unread`), and Place keeps `[data-location-unread]` until the read fails or is let go (P5-1f).
- **Soil read after the place** (h3 G1 R1): state/location.ts's `read` calls `lookupSite(…, DEFAULT_RADIUS, { soil: false })`, so the place (climate and regions) never waits on the optional soil layer. Once the site is in use (`locate`, `settle`), `soilLater` asks `lookupSite(…, { soil: true })` again (the climate and regions tiles come from the tile source's cache) and patches `store.location.lookup.soil` quietly, only onto the same lookup; a failed or slow soil tile only leaves the [figures panel](/modules/consortium-figures.md)'s soil pH and drainage map reading "not known". One soil tile is about 147 KB (Kiambu, release 0.2.0).
- **Naming a typed point** (h3 G1 round 2, B1.1; PFD51): `lookUpName` checks that the place is still the same typed, unnamed point (lat, lon, source), not the same object, and names the current object, so a soil reading patched on meanwhile neither drops the name nor is dropped by it. Each ask is numbered (`nameAsk`): only the latest ask writes `naming`, so an earlier ask answered or cut short after the grower moved on never clears a newer ask's busy state (h3 G1#1).
- **Timeouts** (review round 2, 3): a tile read unanswered in 15 s (`READ_TIMEOUT_MS`, a race in state/location.ts's `read`; the climate reader takes no signal) fails like a failed read; a geocoder request is aborted after 15 s (`GEOCODER_TIMEOUT_MS`, transport.ts) and thrown as an error, not an AbortError, so the search shows "offline"; `currentPosition(options, permission)`: the browser's own timeout does not run while its permission prompt waits, so a permission granted before the press gets the browser's 15 s plus a 5 s backstop, and anything else one 45 s cap (`PROMPT_CAP_MS`) over prompt and fix, since a one-time Allow fires no `change` event in some browsers (review round 4, 3).
- **Keyboard on the cards** (views/place/Place.tsx, formerly Start.tsx; review round 2, 5): with a card proposed and none checked, only the proposed radio is in the tab order; arrows move the focus without checking; Space, Enter or a click confirms (P5-10b).
- **Map dialog**: Close, "Use the map centre" and Escape all close the native dialog, so focus returns to the map button; the centre pin (ink cross, ochre point) and the dialog's styles are in `src/styles/consortium/p5/s5b.css`.

## Budgets (production build, 2026-11-11)

At S5b: location chunk 11.0 KB gzip, MapLibre 298.8 KB with worker and CSS (geolocation.ts kept out of the shell). Today's caps and measures are in `scripts/check-built-site.mjs` (location role cap 11.8 KB, measured 11,493 B; first run under 38 KB since the E6 chunk-5 exit; [chunk budgets](/decisions/consortium-chunk-budgets.md)). The CSS is imported `?inline` and injected on load: a plain CSS import was hoisted by Astro into a page `<link>`. The worker is `maplibre-worker.ts`, a chunk sharing `maplibre-gl-shared` (a `?worker&url` bundle duplicated it, 420 KB total).

## Copied from canopi

At canopi `b039f14ee612c6090c91d44b9968357cbdd1d33e` (AGPL header and a "copied from canopi" line in each): `desktop/web/src/` `…/registry.ts` (GeoLibre MIT header kept, `email` dropped, `language` added, the never-selected Pelias provider and its `api.geocode.earth` endpoint removed at the pre-push review (4), so Nominatim is the only geocoder), `place-search.ts` (cache added; since E6 S2 the controller's `results`, `status` and `attribution` are plain read-only boxes `{value, peek()}` instead of signals, so the location service imports no UI framework, ADR-1 L1), `transport.browser.ts`, `my-location/geolocation.ts` (two functions, plus `currentPosition`), `maplibre/loader.ts`.

## Tests

`scripts/consortium-p5-seams-s5b.test.mjs` (node); browser specs P5-0d, P5-1 … P5-13 (round 2: P5-1e, 1f, 10b, 13c; round 3: P5-13d, P5-10 strengthened; round 4: P5-1g; seam review: P5-27c sea keeps and names the site, P5-27d failed read keeps it in page and storage over a reload, P5-27e a link without `o=` keeps the saved site fresh, pasted and reloaded, P5-13b updated) in `scripts/browser/consortium-p5-s5b.browser.test.mjs` (P5-0d in `consortium-commit0`; shared code in `p5-helpers.mjs`).

## PP-B b1a (2026-11-14)

- **"Use it" for a link's place** reverses the old rule that a link's `o=` is never saved over the reader's `canopi-location` (coordinator row 2026-11-14): `state/location.ts` `adoptLinkLocation()` turns a `link` location into the reader's own (`source: 'map'`, kept with `keepLocation`); `views/location/location.tsx` re-exports it as `adopt`, reached through restore.ts's `LocationSettle.adopt`.
- **Forget this location** also clears the palette's place (the grower's own values to `NO_EDITS`; the spot and soil answers are deleted since v14 0W-2 R4) and `canopi-place`, besides `canopi-location`; forgetting the reader's own kept location also clears `restore.ts` `locationAtStart`, so Place's climate cards open when a climate is chosen (b1a review round 3, 1). On a held page (a link's place shown, or another tab owns the save) it also scrubs the stored record (`persist.ts` `forgetSavedPlace`): its place goes, and its country too when it came from the reader's own location; a link's country, the plants, room and plot stay (pre-push fix 3).
- Share's tick is "Include my place" (place, not only location): ticked, the link carries `k o` and the grower's own values `f b p i d` (since v14 0W-2 R4; `l w q r h s` are no keys); unticked none of them.

## pf-c, v14 Place (fix round 2, 2026-11-18)

- **A hand-chosen climate belongs to its cell** (R5, R3, C7): `locateNow` keeps a climate the grower chose ("Use <other>", "Not this climate? Choose another") only while the new point is in the same climate cell (`cellOf`: the lookup's `cellLat,cellLon`, the rule `store.placeAt` uses for the grower's values) as the grower's own place before it; any other cell, even one that reads the same climate, takes its own read. A link's location (`source: 'link'`) is never the "before" (Place drops it anyway: `draft.ts` `backToPlace`).
- **One device read, one wait** (R10; R7, C6): `devicePosition()` queries the permission, then reads once; it returns `{ at, seconds }`, the seconds being the wait that read ran (granted: the browser's 15 s; else `PROMPT_CAP_MS` 45 s). "Use my location" (`useMyLocation`, which also sets `waited` for the step's timeout line) and the map's "Centre on my location" (`MapDialog` `near()`) both go through it.
- **Typed coordinates, pair forms first** (R2, R12): `views/location/coords.ts` `readCoords` tries the decimal pair (comma, or semicolon with decimal commas) before the "one number is a name" rule, so "1,36" and "-1,37" are whole degrees read on the device, while "69001" or "W1" go to the place search.
- **The field mirrors the place in use** (R4, C10): `LocationSlot` sets the field to the place's label; a place with no label (map point, device, link) or none (Forget) empties it; typed coordinates keep the typed text (`typed`, re-exported by location.tsx).
- **Status words** (C11): `said()` joins the place and its note through `consortium.palette.place.said` ("{place}. {note}", "{place}。{note}" in ja and zh).

## Chunk-2 main fixes (PP-C h2, 2026-11-18)

- **Search as a name (M26).** `createPlaceSearchController().search(q, { asName: true })` skips
  `parseCoordinates`; the Place field's name path always uses it, so "1.17 36" refused as coordinates
  and searched again goes to Nominatim as a name.
- **Look up its name (M26).** Typed coordinates show "Adjust on the map · Look up its name". The press
  sends one Nominatim `/reverse` request (registry `geocodeReverse`, controller `nameOf`, paced as the
  search); the answer names the place (kept on this device as the location was), else
  `location.noName` or `location.nameFailed` beside the row (`state/location.ts` `naming`, cleared with
  the step).
- **Place type words (D7).** An answer row says its kind for eight kinds ("City · Andalusia, Spain"):
  Nominatim `addresstype` mapped to `PlaceSearchResult.placeType` (`PLACE_TYPES`: city, town, village,
  suburb, county, state, region, country) and `consortium.location.type.*`; any other kind gets no word.
- **Arrivals.** The arrival notices are said once, through Place's `Announcer` (one polite status
  sentence, never a heading or a button in the live region).
- **Country line.** One country line at a time; its choices open from the line's own trigger
  (aria-expanded), board Country's radio rows, closed by Escape or the trigger.
- The browser harness answers `/reverse` from the Nominatim fixtures (a place within 0.25°).

## Main h2 hand-off (2026-11-18)

- The climate when an ask began travels with its own `locate` call (`useMyLocation`, the search's single answer: `asked`), never in module state, so an ask that ends without a place (refused, timed out, no answer, offline, several answers) leaves nothing that could make a later locate refuse its read.
- `lookUpName` asks `/reverse` at the cell centre (`snapOrigin`), ignores a second press while asking (`aria-disabled`), and treats an AbortError (a search or new place replaced it) as no failure.
- `SiteLocation.placeLevel` marks a town-level label (D7 kinds, a reverse lookup of one, a link's `n`); the saved record (`locationRecord`, `readLocation`) keeps it.
