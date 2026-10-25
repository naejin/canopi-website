---
type: Module
title: src/i18n
description: The 11-locale translation tables and the t() lookup used by every component at build time.
resource: ../../src/i18n
tags: [module, i18n]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T12:58:36Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-25T13:46:26Z }
sources:
  - id: i18n
    resource: ../../src/i18n
    title: src/i18n/
    digest: sha256:5fd4aec68e993d1e
    last_modified: 2026-10-25T13:44:29Z
  - id: homepage-test
    resource: ../../scripts/homepage.test.mjs
    title: scripts/homepage.test.mjs
    digest: sha256:aa43adffc3a1f0ad
    last_modified: 2026-10-25T09:49:07Z
---

# Responsibility

Build-time translation for the 11 locales (en default at `/`; fr, es, pt, it, zh, de, ja, ko, nl, ru at `/{lang}/`). It does not detect the visitor's language (that is a client-side script in `src/layouts/Base.astro`).

# Key files

- [utils.ts](../../src/i18n/utils.ts)
- `translations/{locale}.json`: flat key-value files, one per locale.
- [guides.ts](../../src/i18n/guides.ts) and `guides/{en,fr}.json`: the Field Guides' own strings, English and French only (see [Field Guides](/modules/field-guides.md)).

# Interfaces

- `locales`, `type Locale`, `defaultLocale = 'en'`, `languageNames`.
- `t(key, lang, replacements?)`: falls back to English, then to the key itself; replaces `{name}` placeholders.
- `isLocale(value)`, `localizedUrl(path, lang)` (no prefix for `en`).
- Guides: `guideLocales` (en, fr), `guideDomains`, `gt(key, lang, replacements?)` (throws on a missing key, no fallback), `guideLangOf(Astro.currentLocale)`, `guidesPath(lang)` and `guidePath(slug, lang)` (other locales get the English URL), `formatDate`.

# Dependencies

- Used by components and [src/pages](/modules/src-pages.md); strings reach [src/scripts](/modules/src-scripts.md) via the page-data JSON block.
- [src/data](/modules/src-data.md) `site.ts` imports the `Locale` type.

# Gotchas

- Add every new key to all 11 files: `npm test` (`homepage.test.mjs`) fails if locales differ in keys or placeholders, if an English key is unused, or if a script string is missing from the page.
- Bibliography theme and climate labels (`bibliography.theme.<slug>`, climate keys) must exist for every theme/climate in `src/data/bibliography.md`.
- `t()` replaces only the first occurrence of each placeholder.
- Guide strings are not in the 11 locale files; `guides.test.mjs` checks en/fr key parity. The site-wide `header.guides` and `bibliography.fieldGuide` keys are in all 11.
- `guideDomains` lives in `guides.ts`, not `src/content.config.ts`: importing the content config at runtime pulls the glob loader's `node:fs` into the Cloudflare prerender worker and the build fails.
