---
type: Architecture Decision
title: Site navigation
description: The header carries Guides, Books, Donate, language and theme, a phone Menu below 640px holds every link, the guides and bibliography form one Learn section, and the home page has a Start here row.
tags: [decision, navigation]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T23:33:49Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-26T23:33:52Z }
sources:
  - id: header-astro
    resource: ../../src/components/Header.astro
    title: src/components/Header.astro
    digest: sha256:741c13b998c033fe
    last_modified: 2026-10-25T16:51:12Z
  - id: chrome-js
    resource: ../../src/scripts/chrome.js
    title: src/scripts/chrome.js
    digest: sha256:34b05ddd61557259
    last_modified: 2026-10-26T23:28:40Z
  - id: starthere-astro
    resource: ../../src/components/StartHere.astro
    title: src/components/StartHere.astro
    digest: sha256:71ddb89d7ff75714
    last_modified: 2026-10-25T16:51:12Z
  - id: global-css
    resource: ../../src/styles/global.css
    title: src/styles/global.css
    digest: sha256:47c585d78f6c50ca
    last_modified: 2026-10-26T23:28:54Z
  - id: next-session-navigation-md
    resource: ../../.local/next-session-navigation.md
    title: .local/next-session-navigation.md
    digest: sha256:7284a6783ffdd56b
    last_modified: 2026-10-25T16:42:41Z
enforced_by: [scripts/homepage.test.mjs, scripts/check-built-site.mjs]
---

# Decisions

| Date | Who | Decision |
|---|---|---|
| 2026-10-25 | owner (Jean-Pierre Yin) | approved all four: header Guides+Books (Discord, Docs to footer); phone Menu disclosure below 640px with every link; guides↔bibliography as one Learn section; home Start here row (landrace-gardening, will-they-cross, saving-seed) |

# What was built

- **Header** (`src/components/Header.astro`): Canopi · Guides · Books · Donate · language · theme. Discord and Docs live in the footer. `current: 'guides' | 'books'` sets `aria-current="page"`.
- **No climate in the header**: the reader's climate is set from a chip on the pages it changes, not from the header (see [Climate UX](/decisions/climate-ux.md)).
- **Phone Menu**: below 640px only the logo, a `<details data-nav-menu>` Menu and the theme toggle show. The panel holds Guides, Books, Donate, Discord, Docs (if set), Contact and the 11 languages. It opens without script; `src/scripts/chrome.js` closes it on outside click, Escape, link activation and focus leaving. `donate.js` returns focus to the Menu summary.
- **Learn section**: the guides index links to the bibliography; the bibliography page links to the guides.
- **Start here** (`src/components/StartHere.astro`): three entry guides from frontmatter, en or fr by locale, English with an "in English" note elsewhere, plus "All field guides".

# Settled choices

- Docs stays hidden while `DOCS_URL` is `null` (`src/data/site.ts`).
- Donate sits inside the phone Menu, not inline beside it.
- The `max-width: 1200px` query in `home.css` is kept: it picks the hero image file, not a layout.

# Consequences and rules

- No nav item is hidden by width except the one inline/Menu swap (`.nav-inline` hidden, `.nav-menu` shown below 640px, in `src/styles/global.css`). The old `.nav-guides` and `.nav-discord` (479px) hiding is gone.
- Width queries use 639/640/959/960 only, plus the 1200px hero-image query.
- The inline header must fit at 640px in all 11 locales, measured in a real browser, not assumed. New header labels must stay short.
- Enforced by `scripts/homepage.test.mjs` (breakpoint allowlist, no width-hidden header items, header keys in every locale, chrome.js handles both menus) and `scripts/check-built-site.mjs` (header and Menu links per locale, `aria-current`, Start here, guides↔bibliography links).

# Related

- [Field Guides](/modules/field-guides.md), [src/scripts](/modules/src-scripts.md), [src/i18n](/modules/src-i18n.md), [scripts](/modules/scripts.md), [Field Guides user decisions](/decisions/field-guides-user-decisions.md).
