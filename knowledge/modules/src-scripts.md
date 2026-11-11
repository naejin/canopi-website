---
type: Module
title: src/scripts
description: Vanilla browser modules for the site's pages (chrome, climate, hero reveal, downloads, featured design canvas and list, contact, donations).
resource: ../../src/scripts
tags: [module, frontend]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T10:05:34Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T10:05:33Z }
sources:
  - id: scripts
    resource: ../../src/scripts
    title: src/scripts/
    digest: sha256:35549cdec25c922e
    last_modified: 2026-11-11T09:00:47Z
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
- [design-list.js](../../src/scripts/design-list.js): the list of featured designs under the canvas, a page at a time.
- [contact.js](../../src/scripts/contact.js): in-place validation, posts with `Accept: application/json`.
- [climate.js](../../src/scripts/climate.js): the reader's climate (`initClimate()`, called by `initChrome`): the picker dialog, `localStorage["canopi-climate"]` and `html[data-climate]`, ordering of `<ForClimate>` runs, the "not covered yet" note, sync across tabs, all blocks open for print. See [Climate UX](/decisions/climate-ux.md).
- The v1 consortium modules (`src/scripts/consortium/`) were deleted at the P2 hand-offs once the v2 island in `src/islands/consortium/` had ported them; see [Consortium page](/modules/consortium-page.md).
- [donate.js](../../src/scripts/donate.js), [dialogs.js](../../src/scripts/dialogs.js): HelloAsso donation dialog and native `<dialog>` helpers; `initDialogs` skips a dialog marked `data-own-dialog` (the consortium tool's sheet, which handles its own close, backdrop and scroll lock). Donate opened from the phone Menu returns focus to the Menu summary; from `#donate`, to the first visible Donate button.

# Interfaces

`initChrome`, `initDownloads`, `initHeroReveal`, `createDesignCanvas`, `createDesignList`, `initContact`, `initDonate`, `initDialogs`, `openDialog`, `text`.

# Dependencies

- [src/lib](/modules/src-lib.md): `installer.mjs`.
- HelloAsso iframe.

# Gotchas

- No third-party request before the visitor asks: the HelloAsso iframe only when Donate opens. `/#donate` opens the dialog.
- Theme-dependent canvases redraw via `onThemeChange`.
- `homepage.test.mjs` fails if a `text()` key used by a script is not passed to the page.
