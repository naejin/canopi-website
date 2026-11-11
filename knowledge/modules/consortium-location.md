---
type: Module
title: Consortium location step
description: The consortium's optional site location (geolocation, Nominatim search, MapLibre map) that suggests a climate card and a country from the climate tiles, kept on the device and put in a link only on request.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T17:46:13Z }
sources:
  - id: locationslot-tsx
    resource: ../../src/islands/consortium/views/LocationSlot.tsx
    title: src/islands/consortium/views/LocationSlot.tsx
    digest: sha256:dd6ab91dcd436bd7
    last_modified: 2026-11-11T17:27:08Z
  - id: location-tsx
    resource: ../../src/islands/consortium/views/location/location.tsx
    title: src/islands/consortium/views/location/location.tsx
    digest: sha256:a4a157bef527b50d
    last_modified: 2026-11-11T17:36:49Z
  - id: load-ts
    resource: ../../src/islands/consortium/views/location/load.ts
    title: src/islands/consortium/views/location/load.ts
    digest: sha256:e8d381c77ecd6cfa
    last_modified: 2026-11-11T17:26:05Z
  - id: site-climate-ts
    resource: ../../src/lib/consortium/site-climate.ts
    title: src/lib/consortium/site-climate.ts
    digest: sha256:387c6dcfc37532b7
    last_modified: 2026-11-11T17:41:16Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:1945a23122835683
    last_modified: 2026-11-11T17:41:16Z
  - id: memory-ts
    resource: ../../src/islands/consortium/memory.ts
    title: src/islands/consortium/memory.ts
    digest: sha256:a26c85d6c4f5358f
    last_modified: 2026-11-11T17:26:05Z
  - id: registry-ts
    resource: ../../src/lib/location/registry.ts
    title: src/lib/location/registry.ts
    digest: sha256:233e0d11b5b119e1
    last_modified: 2026-11-11T17:22:14Z
  - id: place-search-ts
    resource: ../../src/lib/location/place-search.ts
    title: src/lib/location/place-search.ts
    digest: sha256:1af32835941b016e
    last_modified: 2026-11-11T17:22:43Z
  - id: geolocation-ts
    resource: ../../src/lib/location/geolocation.ts
    title: src/lib/location/geolocation.ts
    digest: sha256:0b4a1d19fafdefee
    last_modified: 2026-11-11T17:22:51Z
  - id: maplibre-ts
    resource: ../../src/lib/location/maplibre.ts
    title: src/lib/location/maplibre.ts
    digest: sha256:5d74cb8f32ef1e1a
    last_modified: 2026-11-11T17:32:51Z
  - id: maplibre-entry-ts
    resource: ../../src/lib/location/maplibre-entry.ts
    title: src/lib/location/maplibre-entry.ts
    digest: sha256:0e48cd8485c3eea1
    last_modified: 2026-11-11T17:44:13Z
  - id: maplibre-worker-ts
    resource: ../../src/lib/location/maplibre-worker.ts
    title: src/lib/location/maplibre-worker.ts
    digest: sha256:0ea12cf3eed423f3
    last_modified: 2026-11-11T17:33:47Z
  - id: share-tsx
    resource: ../../src/islands/consortium/views/Share.tsx
    title: src/islands/consortium/views/Share.tsx
    digest: sha256:554be9242220c0f7
    last_modified: 2026-11-11T17:36:49Z
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
| `src/islands/consortium/views/LocationSlot.tsx` | Thin shell in the island (first run): the three controls, each with a `[data-location-privacy]` line naming the service, the privacy link (`/privacy/`, S5f), a loading line while a link's or saved location is looked up. The map button shows only when a canvas gives WebGL. `compact` (result head): the result line only |
| `src/islands/consortium/views/location/load.ts` | `loadLocationStep()` (cached `import('./location.tsx')`) and the `locationStep` signal; plain `.ts` so memory.ts imports it under node --test |
| `src/islands/consortium/views/location/location.tsx` | The lazy chunk (≤ 20 KB): `useMyLocation`, `searchPlace`, `openMap`, `settle(how, saved)`, `forget`, `LocationResult` (`[data-location-state]`, `[data-location-confirm]`), the map dialog (`[data-location-map]`, crosshair, `[data-location-use-centre]`; test hook `mapCentre`) |
| `src/lib/consortium/site-climate.ts` | `siteClimate(lookup)`: state `sea` / `polar` / `borderline` / `coast` / `ready`, `zone`, `near`, `suggested`; `koppenZone(k)` |
| `src/lib/consortium/state.ts` | `o=` in links: `encodeLink(…, { origin })`, `linkOrigin(link)`, `cellCentre(lookup)`; re-exports site-climate.ts so the island reaches it through index.ts |
| `src/lib/location/*` | Copied from canopi (see below): registry, place search, transport, geolocation, MapLibre loader; `maplibre-entry.ts`, `maplibre-worker.ts` |

## Rules

- **Nothing third-party before a click.** Geolocation on the button only (low accuracy, 10 min cache, 15 s timeout); Nominatim on Enter only (limit 5, `accept-language` = page language, no email, 1.1 s pacing, an in-memory cache per query, attribution shown); MapLibre and OpenFreeMap (positron or dark by theme) when the map opens. Climate tiles are the site's own (`#ct-climate` names them).
- **Suggest, never set.** A `ready` or `coast` site writes `store.proposedClimate`; the card is set only by `[data-location-confirm]`. Borderline and polar suggest nothing.
- **Borderline** (`BORDERLINE_C` 0.5 °C): the class disagrees with its means (`koppenTemperatureMarginC` > 0), or a monthly mean lies within 0.5 °C of a bound that changes the zone: coldest month 18 °C (A/C) or 0 °C (C/D), warmest 22 °C only where it changes the zone (Cfa Subtropical / Cfb Temperate; Da/Db), warmest 10 °C (tundra). `near` names the zone across. B classes are rainfall-set: never borderline on temperature. Lyon (Cfa, warmest 22.4 °C) is borderline with Temperate.
- **Sea** (no climate cell): "pick a point on land"; the store is left alone. **Coast** (a climate but no country): the nearest cell's climate, no country or soil. **Tiles failed**: location and proposal cleared, manual cards with a note.
- **Country from the location**: `memory.locationCountry` sets `{code, source: 'location'}` over a guess, none or an earlier location country, never over `chosen` or `link`; quiet (no action counted) when the saved location is looked up again.
- **Device only**: `localStorage['canopi-location']` `{lat, lon, source, label?}`; looked up again after the plant list opens, unless a link opened.
- **Links**: `o=<lat>,<lon>` (the climate cell centre, ≤ 3 decimals, literal comma, just before `e=1`) and the location country only when the reader ticks Share's `input[data-share-location]`. A link with `o=` sets `store.location` (source `link`, labelled "from the shared link, approximate") in the restore batch; the link's climate, answers and country win.

## Budgets (production build, 2026-11-11)

Location chunk 10.4 KB gzip; MapLibre 298.8 KB with worker and CSS. The CSS is imported `?inline` and injected on load: a plain CSS import was hoisted by Astro into a page `<link>`. The worker is `maplibre-worker.ts`, a chunk sharing `maplibre-gl-shared` (a `?worker&url` bundle duplicated it, 420 KB total).

## Copied from canopi

At canopi `b039f14ee612c6090c91d44b9968357cbdd1d33e` (AGPL header and a "copied from canopi" line in each): `desktop/web/src/` `…/registry.ts` (GeoLibre MIT header kept, `email` dropped, `language` added), `place-search.ts` (cache added), `transport.browser.ts`, `my-location/geolocation.ts` (two functions, plus `currentPosition`), `maplibre/loader.ts`.

## Tests

`scripts/consortium-p5-seams-s5b.test.mjs` (node); browser specs P5-0d, P5-1 … P5-13 in `scripts/browser/consortium-p5.browser.test.mjs`.
