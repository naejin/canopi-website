---
type: Module
title: src/scripts
description: Vanilla browser modules for the home and bibliography pages (chrome, hero reveal, downloads, featured design canvas and map, contact, donations).
resource: ../../src/scripts
tags: [module, frontend]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T16:45:20Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T18:58:03Z }
sources:
  - id: scripts
    resource: ../../src/scripts
    title: src/scripts/
    digest: sha256:933b489a6458b364
    last_modified: 2026-10-28T18:48:15Z
  - id: scale-js
    resource: ../../src/scripts/consortium/scale.js
    title: src/scripts/consortium/scale.js
    digest: sha256:71f66e5a2c0a787b
    last_modified: 2026-10-28T18:44:21Z
---

# Responsibility

Client-side behaviour, no framework. Scripts hold no user-facing English: every string comes from the page's JSON data block.

# Key files

- [home.js](../../src/scripts/home.js): home entry; wires everything below.
- [chrome.js](../../src/scripts/chrome.js): shared chrome (dialogs, donate, the language menu and the phone Menu, theme toggle); `initChrome({ onThemeChange })`, `isDark()`. Both `<details>` menus close on outside click, Escape (focus back to the summary), focus leaving, and link or button activation.
- [page-data.js](../../src/scripts/page-data.js): reads `#page-data` JSON (written by `PageData.astro`); exports `lang`, `version`, `installers`, `text(key, replacements)`.
- [downloads.js](../../src/scripts/downloads.js): OS-aware primary action and installer dialog; falls back to Canopi Web for unknown devices.
- [hero-reveal.js](../../src/scripts/hero-reveal.js): cursor "ink dot" reveal of the hero painting; touch taps bloom, reduced motion stays still.
- [design-canvas.js](../../src/scripts/design-canvas.js): draws the featured design as the app does, from `/data/featured-designs.json` and `/data/plant-symbols.json`.
- [design-map.js](../../src/scripts/design-map.js): MapLibre design finder with clusters and a nearest-first list.
- [contact.js](../../src/scripts/contact.js): in-place validation, posts with `Accept: application/json`.
- [climate.js](../../src/scripts/climate.js): the reader's climate (`initClimate()`, called by `initChrome`): the picker dialog, `localStorage["canopi-climate"]` and `html[data-climate]`, ordering of `<ForClimate>` runs, the "not covered yet" note, sync across tabs, all blocks open for print. See [Climate UX](/decisions/climate-ux.md).
- [consortium/](../../src/scripts/consortium): the consortium tool (`app.js`, `words.js`, `draw.js`, `data.ts`, the node-tested `logic.js`, `parts.js`, `memory.js`, `crops.js` and `scale.js`, the plant list at scale); it reads its strings from `#ct-data`, not `#page-data`. See [Consortium page](/modules/consortium-page.md).
- [donate.js](../../src/scripts/donate.js), [dialogs.js](../../src/scripts/dialogs.js): HelloAsso donation dialog and native `<dialog>` helpers; `initDialogs` skips a dialog marked `data-own-dialog` (the consortium tool's sheet, which handles its own close, backdrop and scroll lock). Donate opened from the phone Menu returns focus to the Menu summary; from `#donate`, to the first visible Donate button.

# Interfaces

`initChrome`, `initDownloads`, `initHeroReveal`, `createDesignCanvas`, `createDesignFinder`, `initContact`, `initDonate`, `initDialogs`, `openDialog`, `text`.

# Dependencies

- [src/lib](/modules/src-lib.md): `installer.mjs`, `nearest.mjs`.
- MapLibre GL served unbundled from `/vendor/maplibre-gl-<version>/` (copied by `scripts/copy-maplibre.mjs`); OpenFreeMap Liberty tiles; HelloAsso iframe.

# Gotchas

- No third-party request before the visitor asks: MapLibre loads only near the viewport, the HelloAsso iframe only when Donate opens. `/#donate` opens the dialog.
- Geolocation is requested only on button press, kept in memory, never sent. Map pins are rounded (~10 km) and max zoom is 9.
- Theme-dependent canvases redraw via `onThemeChange`.
- `npm run build` wipes `public/vendor`; a running dev server then 404s the map until restarted.
- `homepage.test.mjs` fails if a `text()` key used by a script is not passed to the page.
