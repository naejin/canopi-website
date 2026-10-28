---
type: Architecture Decision
title: Site navigation
description: The header carries Guides, Books, Consortium, Donate, language and theme, a phone Menu below 640px holds every link, the guides and bibliography form one Learn section with the consortium tool, and the home page has Start here then the consortium section.
tags: [decision, navigation]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T12:32:54Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T14:10:36Z }
sources:
  - id: header-astro
    resource: ../../src/components/Header.astro
    title: src/components/Header.astro
    digest: sha256:8e235bbc6db78a9d
    last_modified: 2026-10-27T21:22:08Z
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
    digest: sha256:7c9623c5c2fa4b32
    last_modified: 2026-10-28T01:05:25Z
  - id: footer-astro
    resource: ../../src/components/Footer.astro
    title: src/components/Footer.astro
    digest: sha256:6f4503755f7c5490
    last_modified: 2026-10-27T21:22:08Z
  - id: bibliography-astro
    resource: ../../src/components/Bibliography.astro
    title: src/components/Bibliography.astro
    digest: sha256:3e620cbabe963e2d
    last_modified: 2026-10-27T20:56:00Z
  - id: guidesindex-astro
    resource: ../../src/components/guides/GuidesIndex.astro
    title: src/components/guides/GuidesIndex.astro
    digest: sha256:409a1f09e0c4196f
    last_modified: 2026-10-27T20:56:00Z
  - id: en-json
    resource: ../../src/i18n/translations/en.json
    title: src/i18n/translations/en.json
    digest: sha256:88e5c11ee1db20e0
    last_modified: 2026-10-28T14:09:49Z
  - id: manifest-json
    resource: ../../public/data/consortium/manifest.json
    title: public/data/consortium/manifest.json
    digest: sha256:329133fbeb4fc404
    last_modified: 2026-10-28T12:08:03Z
enforced_by: [scripts/homepage.test.mjs, scripts/check-built-site.mjs]
---

# Decisions

| Date | Who | Decision |
|---|---|---|
| 2026-10-25 | owner (Jean-Pierre Yin) | approved all four: header Guides+Books (Discord, Docs to footer); phone Menu disclosure below 640px with every link; guides↔bibliography as one Learn section; home Start here row (landrace-gardening, will-they-cross, saving-seed) |
| 2026-10-27 | owner | consortium tool entry points: a short header item (in the phone Menu below 640px), measured at 640px in all 11 locales; a footer link; its own home section after Start here; the tool in the Learn section ([Consortium tool — user decisions](/decisions/consortium-user-decisions.md)) |

# What was built

- **Header** (`src/components/Header.astro`): Canopi · Guides · Books · Consortium · Donate · language · theme. Discord and Docs live in the footer. `current: 'guides' | 'books' | 'consortium'` sets `aria-current="page"` (the tool page passes `'consortium'`). The tool's item is one short word, `nav.consortium` ("Consortium", « Guilde », "Konsortium", "Консорциум", "コンソーシアム"…), linking to `consortiumPath(lang)` (`src/i18n/consortium-path.js`, re-exported by `utils.ts`, so `check-built-site.mjs` uses the same function).
- **640px fit**: between 640 and 959px a global style in `Header.astro` (`is:global`, so the header markup carries no `data-astro-cid` attributes that `check-built-site.mjs` would trip on) tightens the inline row (link padding 6px, gaps 2px, header gap 8px); from 960px `global.css` spacing applies. Measured 2026-10-27 in headless Chrome at 640px (625px client width with a classic scrollbar), light theme, all 11 locales: one row, no overlap, no horizontal scroll, language and theme controls inside the page margins. Russian is the tightest (16px between logo and links), then Japanese (30px). That fit needs Source Sans 3: re-measured the same day with the webfonts blocked (the stack falls back to Noto Sans on Linux), Russian overflowed by 3px at 640px, and with header text at 110% (a minimum font size or text-only zoom) French, Dutch and Russian overflowed too. So from 640px the header row may wrap (global style in `Header.astro`: `flex-wrap` on `.header-inner`, `.header-nav` and `.nav-inline`, links right-aligned): when the row is too long, the links move under the logo, and wrap again if they must, instead of scrolling sideways; no item is hidden. Re-measured at 640, 700, 800, 959 and 960px in all 11 locales with the webfonts, without them, without them at 110%, and in DejaVu Sans at 110%: no horizontal scroll, no overlap, every item visible; with the webfonts at the default size the row stays one line. A new header item needs this measurement again.
- **No climate in the header**: the reader's climate is set from a chip on the pages it changes, not from the header (see [Climate UX](/decisions/climate-ux.md)).
- **Phone Menu**: below 640px only the logo, a `<details data-nav-menu>` Menu and the theme toggle show. The panel holds Guides, Books, the tool's full name (`nav.consortium.full`, "Design a consortium" / « Composer une guilde »), Donate, Discord, Docs (if set), Contact and the 11 languages. It opens without script; `src/scripts/chrome.js` closes it on outside click, Escape, link activation and focus leaving. `donate.js` returns focus to the Menu summary.
- **Learn section**: the guides index links to the bibliography; the bibliography page links to the guides; both link to the consortium tool (`learn.consortium.link`, "Design a consortium (beta): …"). Guides link into the tool with a plant and climate preset (`<TryConsortium>`, see [Field Guide components](/references/field-guide-components.md)).
- **Footer**: "Design a consortium" (`nav.consortium.full`, the same key as the Menu line) after the bibliography link.
- **One name per locale**: `nav.consortium.full` is the tool's name in the Menu, the footer and the home section's title, and `learn.consortium.link` starts with it, so each locale names the tool with one verb in one mood (de "Ein Konsortium planen", ja "コンソーシアムを設計する", ru "Составить консорциум"; it and nl use the imperative throughout). The full name contains the header word.
- **Consortium home section** (`src/components/ConsortiumSection.astro`), right after Start here: title (`nav.consortium.full`) with a Beta mark, a one-paragraph promise, the beta's coverage (`home.consortium.note`: "A beta with three climates so far: tropical, Mediterranean and temperate") and one action to the tool. The note spells the climates out in each locale, with no region; `homepage.test.mjs` fails when `public/data/consortium/manifest.json` lists other climates, so a new climate means rewriting the note in all 11 locales. No photos and no strata colours (the tool's drawing keeps those); styles scoped in the component.
- **Start here** (`src/components/StartHere.astro`): three entry guides from frontmatter, en or fr by locale, English with an "in English" note elsewhere, plus "All field guides".

# Settled choices

- Docs stays hidden while `DOCS_URL` is `null` (`src/data/site.ts`).
- Donate sits inside the phone Menu, not inline beside it.
- The `max-width: 1200px` query in `home.css` is kept: it picks the hero image file, not a layout.

# Consequences and rules

- No nav item is hidden by width except the one inline/Menu swap (`.nav-inline` hidden, `.nav-menu` shown below 640px, in `src/styles/global.css`). The old `.nav-guides` and `.nav-discord` (479px) hiding is gone.
- Width queries use 639/640/959/960 only, plus the 1200px hero-image query.
- The inline header must fit at 640px in all 11 locales, measured in a real browser, not assumed. New header labels must stay short.
- Enforced by `scripts/homepage.test.mjs` (breakpoint allowlist, no width-hidden header items, header keys in every locale, chrome.js handles both menus, the consortium header word and full name per locale, the home note against the manifest's cells, the header's global styles, and the consortium keys' places in the translation files) and `scripts/check-built-site.mjs` (header and Menu links per locale, `aria-current`, Start here, guides↔bibliography links).

# Related

- [Field Guides](/modules/field-guides.md), [src/scripts](/modules/src-scripts.md), [src/i18n](/modules/src-i18n.md), [scripts](/modules/scripts.md), [Field Guides user decisions](/decisions/field-guides-user-decisions.md).
