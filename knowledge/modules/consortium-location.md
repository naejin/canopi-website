---
type: Module
title: Consortium location step
description: The consortium's optional site location (geolocation, Nominatim search, MapLibre map) that suggests a climate card and a country from the climate tiles, kept on the device and put in a link only on request.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T19:27:10Z }
sources:
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:2dcff7afe57b5877
    last_modified: 2026-11-11T19:25:16Z
  - id: location-tsx
    resource: ../../src/islands/consortium/views/location/location.tsx
    title: src/islands/consortium/views/location/location.tsx
    digest: sha256:bbfc5c04b8239be1
    last_modified: 2026-11-11T19:25:16Z
  - id: load-ts
    resource: ../../src/islands/consortium/views/location/load.ts
    title: src/islands/consortium/views/location/load.ts
    digest: sha256:6658f7fd428942d0
    last_modified: 2026-11-11T19:25:16Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:79e78a387e75a014
    last_modified: 2026-11-11T19:25:16Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:872f411989736b65
    last_modified: 2026-11-11T19:25:51Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:d8455a5b419af6f4
    last_modified: 2026-11-11T19:25:16Z
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
    digest: sha256:9198637d2982820e
    last_modified: 2026-11-11T19:25:16Z
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
    digest: sha256:d1071d7fbe9e67d6
    last_modified: 2026-11-11T19:25:16Z
  - id: s5b-css
    resource: ../../src/styles/consortium/p5/s5b.css
    title: src/styles/consortium/p5/s5b.css
    digest: sha256:19308b24807af818
    last_modified: 2026-11-11T19:25:16Z
  - id: start-tsx
    resource: ../../src/islands/consortium/views/Start.tsx
    title: src/islands/consortium/views/Start.tsx
    digest: sha256:7188c34814f956af
    last_modified: 2026-11-11T19:25:16Z
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
| `src/islands/consortium/views/location/keep.ts` | Loaded with the chunk, not on the first run: `readLocation`, `locationRecord`, `keepLocation`, `locationCountry` (uses memory.ts's exported `memory` and `quietly`) |
| `src/islands/consortium/views/location/load.ts` | `loadLocationStep()` (cached `import('./location.tsx')`), the `locationStep` signal, and `lookups`/`looking(step)`: location steps in flight (a click, a search, a map centre, a link's or the saved location), counted until they settle or fail; plain `.ts` so memory.ts imports it under node --test |
| `src/islands/consortium/views/location/location.tsx` | The lazy chunk (≤ 20 KB): `useMyLocation`, `searchPlace`, `openMap`, `settle(how, saved)`, `forget`, `LocationResult` (`[data-location-state]`, `[data-location-confirm]`), the map dialog (`[data-location-map]`, crosshair, `[data-location-use-centre]`; test hook `mapCentre`) |
| `src/lib/consortium/site-climate.ts` | `siteClimate(lookup)`: state `sea` / `polar` / `borderline` / `coast` / `ready`, `zone`, `near`, `suggested`; `koppenZone(k)` |
| `src/lib/consortium/state.ts` | `o=` in links: `encodeLink(…, { origin })`, `linkOrigin(link)`, `cellCentre(lookup)` |
| `src/lib/location/*` | Copied from canopi (see below): registry, place search, transport, geolocation, MapLibre loader; `maplibre-entry.ts`, `maplibre-worker.ts` |

## Rules

- **Nothing third-party before a click.** Geolocation on the button only (low accuracy, 10 min cache, 15 s timeout); Nominatim on Enter only (limit 5, `accept-language` = page language, no email, 1.1 s pacing, an in-memory cache per query, attribution shown); MapLibre and OpenFreeMap (positron or dark by theme) when the map opens. Climate tiles are the site's own (`#ct-climate` names them).
- **Suggest, never set.** A `ready` or `coast` site writes `store.proposedClimate`; Start shows that card as proposed (`.is-proposed`, `[data-proposed]`, "Suggested for your site"), never as a checked radio. It is set by `[data-location-confirm]` or by a click on the proposed card. Borderline and polar suggest nothing.
- **Borderline** (`BORDERLINE_C` 0.5 °C): the class disagrees with its means (`koppenTemperatureMarginC` > 0), or a monthly mean lies within 0.5 °C of a bound that changes the zone: coldest month 18 °C (A/C) or 0 °C (C/D), warmest 22 °C only where it changes the zone (Cfa Subtropical / Cfb Temperate; Da/Db), warmest 10 °C (tundra). `near` names the zone across; from an A class it is the C class it would be (Aw → Cw, As → Cs, Af/Am → Cf, summer letter a if the warmest month ≥ 22 °C, else b: a highland Af is Cfb, Temperate). B classes are rainfall-set: never borderline on temperature. Lyon (Cfa, warmest 22.4 °C) is borderline with Temperate.
- **Sea** (no climate cell): "pick a point on land"; the store is left alone. **Coast** (a climate but no country): the nearest cell's climate, no country or soil. **Tiles failed**: location and proposal cleared, manual cards with a note.
- **Country from the location**: `locationCountry` (keep.ts) sets `{code, source: 'location'}` over a guess, none or an earlier location country, never over `chosen` or `link`. A lookup's writes are quiet (the click was the reader's action), so a link pasted while tiles load still restores; only Forget is a reader write.
- **Device only**: `localStorage['canopi-location']` `{lat, lon, source, label?}`; looked up again after the plant list opens, unless a link opened.
- **Links**: `o=<lat>,<lon>` (the climate cell centre, ≤ 3 decimals, literal comma, just before `e=1`) and the location country only when the reader ticks Share's `input[data-share-location]`. A link with `o=` sets `store.location` (source `link`, labelled "from the shared link, approximate") in the restore batch; the link's climate, answers and country win. It lives for that page only (coordinator decision, review round 1): never saved over the reader's `canopi-location`, never a country, and Forget leaves the reader's own saved location. A link without `o=` (hashchange) clears a link-sourced location and its line; a later plain visit restores the reader's own saved site.
- **Suggest waits for a lookup**: `memory.requestSuggest` with `lookups` > 0 sets `pendingSuggest` and runs once they settle, so the suggestion's range filter (S5c) sees the site; the result line meanwhile reads "Reading the climate of your site…" (review round 1 addendum, spec P5-1d).
- **Map dialog**: Close, "Use the map centre" and Escape all close the native dialog, so focus returns to the map button; the centre pin (ink cross, ochre point) and the dialog's styles are in `src/styles/consortium/p5/s5b.css`.

## Budgets (production build, 2026-11-11)

Location chunk 10.7 KB gzip; MapLibre 298.8 KB with worker and CSS; first run 39.8 KB of 40 (after moving keep.ts out of memory.ts and keeping geolocation.ts out of the shell). The CSS is imported `?inline` and injected on load: a plain CSS import was hoisted by Astro into a page `<link>`. The worker is `maplibre-worker.ts`, a chunk sharing `maplibre-gl-shared` (a `?worker&url` bundle duplicated it, 420 KB total).

## Copied from canopi

At canopi `b039f14ee612c6090c91d44b9968357cbdd1d33e` (AGPL header and a "copied from canopi" line in each): `desktop/web/src/` `…/registry.ts` (GeoLibre MIT header kept, `email` dropped, `language` added), `place-search.ts` (cache added), `transport.browser.ts`, `my-location/geolocation.ts` (two functions, plus `currentPosition`), `maplibre/loader.ts`.

## Tests

`scripts/consortium-p5-seams-s5b.test.mjs` (node); browser specs P5-0d, P5-1 … P5-13 in `scripts/browser/consortium-p5.browser.test.mjs`.
