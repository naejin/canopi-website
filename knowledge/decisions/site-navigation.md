---
type: Architecture Decision
title: Site navigation
description: The header carries Guides, Books, Consortium, Donate, language and theme, a phone Menu below 640px holds every link, the guides and bibliography form one Learn section with the consortium tool, and the home page has Start here then the consortium section.
tags: [decision, navigation]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T20:55:18Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-26T23:33:52Z }
sources:
  - id: header-astro
    resource: ../../src/components/Header.astro
    title: src/components/Header.astro
    digest: sha256:9365c54665d36335
    last_modified: 2026-10-27T20:52:59Z
  - id: chrome-js
    resource: ../../src/scripts/chrome.js
    title: src/scripts/chrome.js
    digest: sha256:34b05ddd61557259
    last_modified: 2026-10-26T23:34:11Z
  - id: starthere-astro
    resource: ../../src/components/StartHere.astro
    title: src/components/StartHere.astro
    digest: sha256:71ddb89d7ff75714
    last_modified: 2026-10-25T16:51:12Z
  - id: global-css
    resource: ../../src/styles/global.css
    title: src/styles/global.css
    digest: sha256:47c585d78f6c50ca
    last_modified: 2026-10-26T23:34:11Z
  - id: next-session-navigation-md
    resource: ../../.local/next-session-navigation.md
    title: .local/next-session-navigation.md
    digest: sha256:7284a6783ffdd56b
    last_modified: 2026-10-25T16:42:41Z
  - id: consortiumsection-astro
    resource: ../../src/components/ConsortiumSection.astro
    title: src/components/ConsortiumSection.astro
    digest: sha256:85a46699fbffdf8c
    last_modified: 2026-10-27T20:36:52Z
  - id: footer-astro
    resource: ../../src/components/Footer.astro
    title: src/components/Footer.astro
    digest: sha256:b9f0b14a5788e915
    last_modified: 2026-10-27T20:36:36Z
  - id: bibliography-astro
    resource: ../../src/components/Bibliography.astro
    title: src/components/Bibliography.astro
    digest: sha256:3e620cbabe963e2d
    last_modified: 2026-10-27T20:37:05Z
  - id: guidesindex-astro
    resource: ../../src/components/guides/GuidesIndex.astro
    title: src/components/guides/GuidesIndex.astro
    digest: sha256:409a1f09e0c4196f
    last_modified: 2026-10-27T20:37:05Z
enforced_by: [scripts/homepage.test.mjs, scripts/check-built-site.mjs]
---

# Decisions

| Date | Who | Decision |
|---|---|---|
| 2026-10-25 | owner (Jean-Pierre Yin) | approved all four: header Guides+Books (Discord, Docs to footer); phone Menu disclosure below 640px with every link; guides↔bibliography as one Learn section; home Start here row (landrace-gardening, will-they-cross, saving-seed) |
| 2026-10-27 | owner | consortium tool entry points: a short header item (in the phone Menu below 640px), measured at 640px in all 11 locales; a footer link; its own home section after Start here; the tool in the Learn section ([Consortium tool — user decisions](/decisions/consortium-user-decisions.md)) |

# What was built

- **Header** (`src/components/Header.astro`): Canopi · Guides · Books · Consortium · Donate · language · theme. Discord and Docs live in the footer. `current: 'guides' | 'books' | 'consortium'` sets `aria-current="page"` (the tool page passes `'consortium'`). The tool's item is one short word, `nav.consortium` ("Consortium", « Guilde », "Konsortium", "Консорциум", "コンソーシアム"…), linking to `consortiumPath(lang)`.
- **640px fit**: between 640 and 959px a global style in `Header.astro` (`is:global`, so the header markup carries no `data-astro-cid` attributes that `check-built-site.mjs` would trip on) tightens the inline row (link padding 6px, gaps 2px, header gap 8px); from 960px `global.css` spacing applies. Measured 2026-10-27 in headless Chrome at 640px (625px client width with a classic scrollbar), light theme, all 11 locales: one row, no overlap, no horizontal scroll, language and theme controls inside the page margins. Russian is the tightest (16px between logo and links), then Japanese (30px). A new header item needs this measurement again.
- **No climate in the header**: the reader's climate is set from a chip on the pages it changes, not from the header (see [Climate UX](/decisions/climate-ux.md)).
- **Phone Menu**: below 640px only the logo, a `<details data-nav-menu>` Menu and the theme toggle show. The panel holds Guides, Books, the tool's full name (`nav.consortium.menu`, "Design a consortium" / « Composer une guilde »), Donate, Discord, Docs (if set), Contact and the 11 languages. It opens without script; `src/scripts/chrome.js` closes it on outside click, Escape, link activation and focus leaving. `donate.js` returns focus to the Menu summary.
- **Learn section**: the guides index links to the bibliography; the bibliography page links to the guides; both link to the consortium tool (`learn.consortium.link`, "Design a consortium (beta): …"). Guides link into the tool with a plant and climate preset (`<TryConsortium>`, see [Field Guide components](/references/field-guide-components.md)).
- **Footer**: "Design a consortium" (`footer.consortium`) after the bibliography link.
- **Consortium home section** (`src/components/ConsortiumSection.astro`), right after Start here: title with a Beta mark, a one-paragraph promise, the beta's coverage (temperate and Mediterranean Europe, tropical Central and South America) and one action to the tool. No photos and no strata colours (the tool's drawing keeps those); styles scoped in the component.
- **Start here** (`src/components/StartHere.astro`): three entry guides from frontmatter, en or fr by locale, English with an "in English" note elsewhere, plus "All field guides".

# Settled choices

- Docs stays hidden while `DOCS_URL` is `null` (`src/data/site.ts`).
- Donate sits inside the phone Menu, not inline beside it.
- The `max-width: 1200px` query in `home.css` is kept: it picks the hero image file, not a layout.

# Consequences and rules

- No nav item is hidden by width except the one inline/Menu swap (`.nav-inline` hidden, `.nav-menu` shown below 640px, in `src/styles/global.css`). The old `.nav-guides` and `.nav-discord` (479px) hiding is gone.
- Width queries use 639/640/959/960 only, plus the 1200px hero-image query.
- The inline header must fit at 640px in all 11 locales, measured in a real browser, not assumed. New header labels must stay short.
- Enforced by `scripts/homepage.test.mjs` (breakpoint allowlist, no width-hidden header items, header keys in every locale, chrome.js handles both menus, the consortium entry points and their keys' places in the translation files) and `scripts/check-built-site.mjs` (header and Menu links per locale, `aria-current`, Start here, guides↔bibliography links).

# Related

- [Field Guides](/modules/field-guides.md), [src/scripts](/modules/src-scripts.md), [src/i18n](/modules/src-i18n.md), [scripts](/modules/scripts.md), [Field Guides user decisions](/decisions/field-guides-user-decisions.md).
