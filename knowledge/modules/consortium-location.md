---
type: Module
title: Consortium location step
description: The consortium's optional site location (geolocation, Nominatim search, MapLibre map) that suggests a climate card and a country from the climate tiles, kept on the device and put in a link only on request.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T06:38:38Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T22:27:39Z }
sources:
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:c50e95d99fd9f486
    last_modified: 2026-11-11T20:31:16Z
  - id: location-tsx
    resource: ../../src/islands/consortium/views/location/location.tsx
    title: src/islands/consortium/views/location/location.tsx
    digest: sha256:985b3bee0188709e
    last_modified: 2026-11-12T06:33:24Z
  - id: load-ts
    resource: ../../src/islands/consortium/views/location/load.ts
    title: src/islands/consortium/views/location/load.ts
    digest: sha256:37542b4de615647d
    last_modified: 2026-11-11T20:54:26Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:cc2231455c1573d7
    last_modified: 2026-11-11T20:31:16Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:872f411989736b65
    last_modified: 2026-11-11T19:27:15Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:34e4bd53240bcc82
    last_modified: 2026-11-12T06:33:24Z
  - id: registry-ts
    resource: ../../src/lib/location/registry.ts
    title: src/lib/location/registry.ts
    digest: sha256:233e0d11b5b119e1
    last_modified: 2026-11-11T18:00:01Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:1af32835941b016e
    last_modified: 2026-11-11T18:00:01Z
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
    digest: sha256:554be9242220c0f7
    last_modified: 2026-11-11T18:00:01Z
  - id: keep-ts
    resource: ../../src/islands/consortium/views/location/keep.ts
    title: src/islands/consortium/views/location/keep.ts
    digest: sha256:58b039a5ba7c3123
    last_modified: 2026-11-11T20:03:06Z
  - id: s5b-css
    resource: ../../src/styles/consortium/p5/s5b.css
    title: src/styles/consortium/p5/s5b.css
    digest: sha256:19308b24807af818
    last_modified: 2026-11-11T19:25:16Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/Start.tsx
    title: src/islands/consortium/views/Start.tsx
    digest: sha256:b416ca11130b3eb3
    last_modified: 2026-11-12T06:25:28Z
  - id: transport-ts
    resource: ../../src/lib/location/transport.ts
    title: src/lib/location/transport.ts
    digest: sha256:8a1b289257cc7217
    last_modified: 2026-11-11T20:03:06Z
enforced_by:
  - scripts/consortium-p5-seams-s5b.test.mjs
  - scripts/browser/consortium-p5.browser.test.mjs
---

# Consortium location step ("Where is your site?")

P5 stream S5b. Above the climate cards on Start, the reader may give a site location; it **suggests**
a climate card and a country, and the reader confirms (owner answers 1, 4, 5). Part of the
[Consortium page](/modules/consortium-page.md); the pure rules live in the [Consortium core](/modules/consortium-core.md).

## Files

| File | Role |
|---|---|
| `src/islands/consortium/views/LocationSlot.tsx` | Thin shell in the island (first run): the three controls, each with a `[data-location-privacy]` line naming the service, the privacy link (`/privacy/`, S5f), a loading line while a link's or saved location is looked up. "Use my location" shows only with the Geolocation API (an inline `isSecureContext && navigator.geolocation` check: importing lib/location/geolocation.ts would put that module in the first run); the map button only with WebGL, probed once (a `webgl` context, released with `WEBGL_lose_context`), never in `compact`. Enter while an input method composes (`isComposing`, keyCode 229) is not a search. `compact` (result head): the result line only |
| `src/islands/consortium/views/location/keep.ts` | Loaded with the chunk, not on the first run: `readLocation`, `locationRecord`, `keepLocation`, `locationCountry` (uses memory.ts's exported `memory` and `quietly`), `siteFound(write, code?)` (a lookup's writes in one batch, then the country quietly, outside it) |
| `src/islands/consortium/views/location/load.ts` | `loadLocationStep()` (cached `import('./location.tsx')`), the `locationStep` signal, and `lookups`/`looking(step)`: location steps in flight (a click, a search, a map centre, a link's or the saved location), counted until they settle or fail; `lookingThrough(load, run)` holds one count from the chunk load through its settle (the shell's `run` uses it too); `unread` (Suggest ran without the site's climate); the result `line`; `nextLookup`/`liveLookup` (one lookup at a time owns Start's location state: an older or dropped one writes nothing); `unlessReplaced(wait)` (a prompt, position, tile read or search ends with `undefined` the moment its lookup is replaced or dropped, so its hold on Suggest goes at once; review round 4, 1, P5-1g); `letGo(drop)` (clears `unread`; with drop also bumps the lookup number, releases every hold and clears the line); plain `.ts` so memory.ts imports it under node --test |
| `src/islands/consortium/views/location/location.tsx` | The lazy chunk (≤ 20 KB): `useMyLocation`, `searchPlace`, `openMap`, `settle(how, saved)`, `forget`, `LocationResult` (`[data-location-state]`, `[data-location-confirm]`), the map dialog (`[data-location-map]`, crosshair, `[data-location-use-centre]`; test hook `mapCentre`) |
| `src/lib/consortium/site-climate.ts` | `siteClimate(lookup)`: state `sea` / `polar` / `borderline` / `coast` / `ready`, `zone`, `near`, `suggested`; `koppenZone(k)` |
| `src/lib/consortium/state.ts` | `o=` in links: `encodeLink(…, { origin })`, `linkOrigin(link)`, `cellCentre(lookup)` |
| `src/lib/location/*` | Copied from canopi (see below): registry, place search, transport, geolocation, MapLibre loader; `maplibre-entry.ts`, `maplibre-worker.ts` |

## Rules

- **Nothing third-party before a click.** Geolocation on the button only (low accuracy, 10 min cache, 15 s timeout); Nominatim on Enter only (limit 5, `accept-language` = page language, no email, 1.1 s pacing, an in-memory cache per query, attribution shown); MapLibre and OpenFreeMap (positron or dark by theme) when the map opens. Climate tiles are the site's own (`#ct-climate` names them).
- **Suggest, never set.** A `ready`, `coast` or `borderline` site writes `store.proposedClimate`; Start shows that card as proposed (`.is-proposed`, `[data-proposed]`, "Suggested for your site"), never as a checked radio. It is set by `[data-location-confirm]` or by a click on the proposed card. Polar suggests nothing. Borderline proposes the class's own climate and the line says "Between {a} and {b}; we picked {a}. Check it." (`location.between`; with no zone across, `location.picked`) only while {a} is the proposed card Start shows (no climate chosen or shown from a link); otherwise "Between {a} and {b}: check that your climate is right." (`location.betweenCheck`; review round 4, 2), the Köppen code kept (UX audit fix 2, decision row "P5 fixes from the UX audit"; P5-10).
- **Borderline** (`BORDERLINE_C` 0.5 °C): the class disagrees with its means (`koppenTemperatureMarginC` > 0), or a monthly mean lies within 0.5 °C of a bound that changes the zone: coldest month 18 °C (A/C) or 0 °C (C/D), warmest 22 °C only where it changes the zone (Cfa Subtropical / Cfb Temperate; Da/Db), warmest 10 °C (tundra). `near` names the zone across; from an A class it is the C class it would be (Aw → Cw, As → Cs, Af/Am → Cf, summer letter a if the warmest month ≥ 22 °C, else b: a highland Af is Cfb, Temperate). B classes are rainfall-set: never borderline on temperature. Lyon (Cfa, warmest 22.4 °C) is borderline with Temperate.
- **Sea** (no climate cell): "pick a point on land"; the store is left alone, and with a site already read the line names it: "… Still using {place}." (`location.state.seaKept`). **Coast** (a climate but no country): the nearest cell's climate, no country or soil. **Tiles failed**: a site already read stays in use everywhere (store, `canopi-location`, its location country) and the line says so (`location.state.failedKept`, "… Still using {place}."), so a reload agrees with the page; with none, or a link's location not read yet, location and proposal cleared, manual cards with a note (`location.state.failed`). Invariant (seam review 2, 3): whenever a site drives the pool, marks and future, the panel names it; `stateText` in location.tsx writes these lines, in the result line and the map dialog.
- **Country from the location**: `locationCountry` (keep.ts) sets `{code, source: 'location'}` over a guess, none or an earlier location country, never over `chosen` or `link`. A lookup's writes are quiet (the click was the reader's action), so a link pasted while tiles load still restores; only Forget is a reader write. The country goes through `siteFound`, after the batch: `quietly()` is synchronous and a batch flushes after it resets, so a write inside a batch is counted as the reader acting (review round 2, 1).
- **Device only**: `localStorage['canopi-location']` `{lat, lon, source, label?}`; looked up again after the plant list opens (`ownLocation` in memory.ts) unless the link opened carries `o=`. One rule for a fresh open and a link pasted into the open tab (seam review 5; coordinator decision row to record): a link without `o=` leaves the reader's own saved site in place (their checks are about their site; the link's plants are unchanged); only a link's `o=` stands in for it, for that page. `ownLocation` runs one lookup at a time (a fresh link without `o=` asks at startup and again when it opens: seam review round 2, 3; P5-27j). A saved site read while a share link's climate is still opening proposes no card (`pendingLinkClimate`); under a saved consortium opening it still does, so a save that fails to open leaves the card proposed (round 2, 2; P5-27i).
- **Links**: `o=<lat>,<lon>` (the climate cell centre, ≤ 3 decimals, literal comma, just before `e=1`) and the location country only when the reader ticks Share's `input[data-share-location]`. A link with `o=` sets `store.location` (source `link`, labelled "from the shared link, approximate") in the restore batch; the link's climate, answers and country win. It lives for that page only (coordinator decision, review round 1): never saved over the reader's `canopi-location`, never a country, and Forget leaves the reader's own saved location. A link without `o=` (hashchange) clears a link-sourced location and its line and looks the reader's own saved site up again (`ownLocation`), and so do Change site, Start over and Start empty (`dropLinkLocation` → `letGo(true)`: the link's lookup is dropped too, so no loading line stays, no later "failed" is written and Suggest is not held; review rounds 2, 4 and 3, 2; P5-13c, 13d). Those three, Forget and a failed read also clear the "not read" note; a later plain visit restores the reader's own saved site.
- **Suggest waits for a lookup**: `memory.requestSuggest` with `lookups` > 0 sets `pendingSuggest` and runs once they settle, so the suggestion's range filter (S5c) sees the site; the result line meanwhile reads "Reading the climate of your site…" (review round 1 addendum, spec P5-1d). A saved or link location holds one lookup from the chunk load through its settle (`lookingThrough`, no gap). The wait is capped at 10 s per press (`waited`, its timer cleared by the next press or when Suggest runs; review round 3, 1): Suggest then runs without the site and `[data-location-unread]` says the climate was not read (P5-1f).
- **Timeouts** (review round 2, 3): a tile read unanswered in 15 s (`READ_TIMEOUT_MS`, a race in location.tsx's `read`; the climate reader takes no signal) fails like a failed read; a geocoder request is aborted after 15 s (`GEOCODER_TIMEOUT_MS`, transport.ts) and thrown as an error, not an AbortError, so the search shows "offline"; `currentPosition(options, permission)`: the browser's own timeout does not run while its permission prompt waits, so a permission granted before the press gets the browser's 15 s plus a 5 s backstop, and anything else one 45 s cap (`PROMPT_CAP_MS`) over prompt and fix, since a one-time Allow fires no `change` event in some browsers (review round 4, 3).
- **Keyboard on the cards** (Start.tsx, review round 2, 5): with a card proposed and none checked, only the proposed radio is in the tab order; arrows move the focus without checking; Space, Enter or a click confirms (P5-10b).
- **Map dialog**: Close, "Use the map centre" and Escape all close the native dialog, so focus returns to the map button; the centre pin (ink cross, ochre point) and the dialog's styles are in `src/styles/consortium/p5/s5b.css`.

## Budgets (production build, 2026-11-11)

Location chunk 11.0 KB gzip; MapLibre 298.8 KB with worker and CSS; first run 40.2 KB of 42 (after moving keep.ts out of memory.ts and keeping geolocation.ts out of the shell). The CSS is imported `?inline` and injected on load: a plain CSS import was hoisted by Astro into a page `<link>`. The worker is `maplibre-worker.ts`, a chunk sharing `maplibre-gl-shared` (a `?worker&url` bundle duplicated it, 420 KB total).

## Copied from canopi

At canopi `b039f14ee612c6090c91d44b9968357cbdd1d33e` (AGPL header and a "copied from canopi" line in each): `desktop/web/src/` `…/registry.ts` (GeoLibre MIT header kept, `email` dropped, `language` added), `place-search.ts` (cache added), `transport.browser.ts`, `my-location/geolocation.ts` (two functions, plus `currentPosition`), `maplibre/loader.ts`.

## Tests

`scripts/consortium-p5-seams-s5b.test.mjs` (node); browser specs P5-0d, P5-1 … P5-13 (round 2: P5-1e, 1f, 10b, 13c; round 3: P5-13d, P5-10 strengthened; round 4: P5-1g; seam review: P5-27c sea keeps and names the site, P5-27d failed read keeps it in page and storage over a reload, P5-27e a link without `o=` keeps the saved site fresh, pasted and reloaded, P5-13b updated) in `scripts/browser/consortium-p5.browser.test.mjs`.
