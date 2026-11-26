---
type: Module
title: Privacy page and tool credits
description: The /privacy/ page in 11 locales, its footer link, and the consortium tool's climate, occurrence, map and search credits on /data-sources/.
generated: { by: antigravity/gemini, at: 2026-11-26T07:09:54Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-19T13:01:18Z }
  - { by: antigravity/gemini, at: 2026-11-23T12:36:40Z }
sources:
  - id: privacypage-astro
    resource: ../../src/components/PrivacyPage.astro
    title: src/components/PrivacyPage.astro
    digest: sha256:9332b762997ea24c
    last_modified: 2026-11-26T07:01:35Z
  - id: consortium-credits-ts
    resource: ../../src/data/palette-credits.ts
    title: src/data/palette-credits.ts
    digest: sha256:74b464a6188aea53
    last_modified: 2026-11-25T18:47:20Z
  - id: datasourcespage-astro
    resource: ../../src/components/DataSourcesPage.astro
    title: src/components/DataSourcesPage.astro
    digest: sha256:b66c56571c531244
    last_modified: 2026-11-25T18:47:20Z
  - id: footer-astro
    resource: ../../src/components/Footer.astro
    title: src/components/Footer.astro
    digest: sha256:0376f9cc58f7d532
    last_modified: 2026-11-11T17:57:36Z
  - id: third-party-notices-md
    resource: ../../THIRD_PARTY_NOTICES.md
    title: THIRD_PARTY_NOTICES.md
    digest: sha256:40e3be67f9c7c6bf
    last_modified: 2026-11-24T18:04:54Z
  - id: wrangler-jsonc
    resource: ../../wrangler.jsonc
    title: wrangler.jsonc
    digest: sha256:b43a72aa23fee185
    last_modified: 2026-10-14T21:57:40Z
  - id: contact-mjs
    resource: ../../src/lib/contact.mjs
    title: src/lib/contact.mjs
    digest: sha256:bc8c6c22d43aba04
    last_modified: 2026-11-09T23:41:46Z
  - id: correction-mjs
    resource: ../../src/lib/correction.mjs
    title: src/lib/correction.mjs
    digest: sha256:16cff4bec2a99cbf
    last_modified: 2026-11-23T21:07:43Z
  - id: maplibre-notices-mjs
    resource: ../../scripts/maplibre-notices.mjs
    title: scripts/maplibre-notices.mjs
    digest: sha256:20c9ddc2bdcc83bb
    last_modified: 2026-11-11T18:10:52Z
  - id: climate-index-ts
    resource: ../../src/lib/climate/index.ts
    title: src/lib/climate/index.ts
    digest: sha256:1647d4003262d734
    last_modified: 2026-11-24T18:04:54Z
  - id: consortium-state-ts
    resource: ../../src/lib/palette/state.ts
    title: src/lib/palette/state.ts
    digest: sha256:2e0eca30c5b18733
    last_modified: 2026-11-25T11:43:47Z
  - id: location-tsx
    resource: ../../src/islands/palette/views/location/location.tsx
    title: src/islands/palette/views/location/location.tsx
    digest: sha256:4a3aaec54728bcfd
    last_modified: 2026-11-23T21:07:43Z
  - id: developers-cloudflare-com-workers-observ
    resource: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
  - id: persist-ts
    resource: ../../src/islands/palette/state/persist.ts
    title: src/islands/palette/state/persist.ts
    digest: sha256:2a890a1f06c18c50
    last_modified: 2026-11-26T07:01:15Z
  - id: location-ts
    resource: ../../src/islands/palette/state/location.ts
    title: src/islands/palette/state/location.ts
    digest: sha256:b83aef806bdf626b
    last_modified: 2026-11-26T07:04:30Z
enforced_by:
  - scripts/palette-p5-seams-s5f.test.mjs
  - scripts/check-built-site.mjs
---

# Responsibility
The `/privacy/` page in 11 locales (owner answer 4, decision "P5 owner answers", 2026-11-11), its footer link on every page, and the consortium tool's credits on `/data-sources/` (P5 stream S5f).

# Key files
| File | Role |
|---|---|
| [PrivacyPage.astro](../../src/components/PrivacyPage.astro) | The page: sections site, tool, location, contact, correction, donate, questions; each service's own privacy policy linked (Cloudflare, OSMF for Nominatim, OpenFreeMap, Google for Gmail); "Questions" links the home contact form. The header comment lists the code each claim rests on |
| `src/pages/privacy.astro`, `src/pages/[lang]/privacy.astro` | Thin locale wrappers, the data-sources pattern |
| [Footer.astro](../../src/components/Footer.astro) | The Privacy link (label `privacy.title`) after Contact |
| [palette-credits.ts](../../src/data/palette-credits.ts) | `toolCredits()`: canopi-climate grid (tag from `climate-release.json`), CHELSA, Beck Köppen-Geiger, SoilGrids, WGSRPD, Natural Earth (from `climate-index.json` `credits`, as the crate publishes them), GBIF, OpenFreeMap, Nominatim |
| [DataSourcesPage.astro](../../src/components/DataSourcesPage.astro) | Renders the rows as `li.tool-credit[data-credit=<id>]`; names, citations and licences in English (`lang="en"`), the use lines translated; SoilGrids and WGSRPD say "served with the grid; the tool does not use it yet" (`dataSources.tool.servedUse`): the lookup fetches those tiles but the soil offer and the native line moved to P5.2 (owner, 2026-11-11), so the page names only climate and country as read for the site |
| [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) | maplibre-gl 6.10.0 and its 24 bundled dependencies with their licence texts, generated by [maplibre-notices.mjs](../../scripts/maplibre-notices.mjs) from `package-lock.json` and `node_modules` (regenerate after an update); "Code copied from canopi" (S5b's five files in `src/lib/location/`, from canopi `b039f14ee`) |

# What the page claims, and why it is true
- Hosting: Cloudflare Workers with observability on (`wrangler.jsonc`): Workers Logs hold request details (address, time, browser, approximate location such as city, country and network) for up to 7 days, Cloudflare's documented maximum (linked on the page); the contact and correction handlers log codes only (`src/lib/contact.mjs`, `src/lib/correction.mjs`). No analytics script; the site's code sets no cookies.
- Device storage: theme, climate, the language offer (sessionStorage) in `Base.astro`; guide checklists; the tool's country, site climate (`state/persist.ts`) and site location (`state/location.ts`) in `localStorage`; share links live in the fragment. Since Wave 7.1 (Operator decision `#4325`), palettes are never auto-saved in browser `localStorage` (`canopi-consortium`, `canopi-place`, `canopi-ns-existing`, and `canopi-ns-checked` are removed once on load and never written); only a palette linked to a user-saved `.canopi` file auto-saves, while per-tab `sessionStorage` (`canopi-ns-session`, `canopi-lang-switch`, `canopi-forget`) keeps the active tab's state across language switches. `privacy.tool.device` was updated across all 11 locales to reflect this.
- Location (S5b, per the P5 design check §B): asked only on click, used on the device to read the climate and the country (`state/location.ts` `locateNow`: `lookup.regions.isoA2`) and saved only on the device; tiles are static files from this site, whole tiles of 100 × 0.1° (climate) and 200 × 0.05° (soil, regions), about 1,000 km. The page says a download does not reveal the *precise* point, not the point: where the point's own cell has no value (sea, ice, a built-up soil gap) within 2 cells of a tile edge, `lookupSite` (`src/lib/climate/index.ts`) also loads the neighbouring tile, which narrows the place to a strip some 10–20 km wide. With the tick a link holds the 0.1° cell centre (`o=`; about 11 km north to south, the page and `consortium.share.locationNote` say "about 11 km") and the country the location gave (`state/persist.ts` `shareState` writes a location's country only with the tick; `state.ts` `encodeLink` `k=`). Nominatim on Enter; OpenFreeMap only once the map opens.
- `palette-p5-seams-s5f.test.mjs` checks these claims in all 11 locales (the cell size against `CLIMATE_GRID`, the country in the link and device lines, "precise point" in the tiles line); ho-misc's seam check (2026-11-11) fixed "about 10 km", the missing country and the stronger "do not reveal the point".
- Contact and corrections go by Cloudflare Email Routing to the association's Gmail mailbox; the address is never written in a page.
- `privacy.correction.body` lists what the correction form sends, including the climate the reader chose when the plant is placed from another climate's list (`site_climate`, P5 pre-push item B).

# Gotchas
- A scoped `<style>` in DataSourcesPage would add `data-astro-cid-*` to every element and break the built-site check's exact TRY citation markup: the tool-credit styles are `is:global` under `.tool-credits`.
- Tool credit rows must not use `class="credit-row"`: the built-site check counts those against `source_credits.tsv`.
- A new canopi-data export with new GBIF fetch dates fails `palette-p5-seams-s5f.test.mjs` until `GBIF` in `palette-credits.ts` is updated. P5 ships the GBIF credit without a derived-dataset DOI (coordinator, decision "GBIF credit for the observed ranges"); the public `gbif_occurrences` credit in `source_credits.tsv` carries no note about it (pre-push review 5; `source-credits.test.mjs` refuses follow-up or plan notes in a shown credit).
- HelloAsso's privacy page could not be linked: every helloasso.com URL answered 403 to scripted fetches (2026-11-11); the page names HelloAsso and its own policy without a link.
- If S5b's location UI changes what is sent (for example the Nominatim parameters), update the `privacy.location.*` strings in all 11 locales.

## PP-B b1a (2026-11-14)

`privacy.location.link` now reads, in English: "A share link includes your place only if you tick 'Include my place', and then only as the centre of its climate-grid square (about 11 km north to south, narrower toward the poles), its country, your spot answers and your soil test." (owner-approved EN and FR; the other nine translated). `scripts/palette-p5-seams-s5f.test.mjs` checks the 11 km figure and the country word in every locale.

## Main h2 hand-off (2026-11-18): the link's name and "Look up its name"

- With the tick a link also carries the place's name (`n=`, D6), but only a town-level one: `state/persist.ts` `linkName` reads `SiteLocation.placeLevel`, set for a search answer or reverse lookup of a D7 kind (city to country) and for a link's own `n`; a road, building or farm label stays on the page.
- "Look up its name" (M26) sends the centre of the typed point's 0.1° climate-grid square (`snapOrigin`) to Nominatim `/reverse` (zoom 10), on that press only (`state/location.ts` `lookUpName`).
- `privacy.location.link`, `privacy.location.search`, `consortium.share.locationNote` and `consortium.location.searchPrivacy` say both in 11 locales; `palette-p5-seams-s5f.test.mjs` ("h2 R1, R3") pins the town word and the localized button name in each.
