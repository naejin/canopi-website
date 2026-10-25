---
type: Module
title: src/i18n
description: The 11-locale translation tables and the t() lookup used by every component at build time.
resource: ../../src/i18n
tags: [module, i18n]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:07Z }
sources:
  - id: i18n
    resource: ../../src/i18n
    title: src/i18n/
    digest: sha256:875b84184f4619ac
    last_modified: 2026-10-24T09:30:47Z
  - id: homepage-test
    resource: ../../scripts/homepage.test.mjs
    title: scripts/homepage.test.mjs
    digest: sha256:ba0d03892287251b
    last_modified: 2026-10-23T07:33:13Z
---

# Responsibility

Build-time translation for the 11 locales (en default at `/`; fr, es, pt, it, zh, de, ja, ko, nl, ru at `/{lang}/`). It does not detect the visitor's language (that is a client-side script in `src/layouts/Base.astro`).

# Key files

- [utils.ts](../../src/i18n/utils.ts)
- `translations/{locale}.json`: flat key-value files, one per locale.

# Interfaces

- `locales`, `type Locale`, `defaultLocale = 'en'`, `languageNames`.
- `t(key, lang, replacements?)`: falls back to English, then to the key itself; replaces `{name}` placeholders.
- `isLocale(value)`, `localizedUrl(path, lang)` (no prefix for `en`).

# Dependencies

- Used by components and [src/pages](/modules/src-pages.md); strings reach [src/scripts](/modules/src-scripts.md) via the page-data JSON block.
- [src/data](/modules/src-data.md) `site.ts` imports the `Locale` type.

# Gotchas

- Add every new key to all 11 files: `npm test` (`homepage.test.mjs`) fails if locales differ in keys or placeholders, if an English key is unused, or if a script string is missing from the page.
- Bibliography theme and climate labels (`bibliography.theme.<slug>`, climate keys) must exist for every theme/climate in `src/data/bibliography.md`.
- `t()` replaces only the first occurrence of each placeholder.
