---
type: Module
title: src/i18n
description: The 11-locale translation tables and the t() lookup used by every component at build time.
resource: ../../src/i18n
tags: [module, i18n]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T23:53:57Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T00:59:28Z }
sources:
  - id: i18n
    resource: ../../src/i18n
    title: src/i18n/
    digest: sha256:9c7fd591012fce1d
    last_modified: 2026-10-28T00:56:38Z
  - id: homepage-test
    resource: ../../scripts/homepage.test.mjs
    title: scripts/homepage.test.mjs
    digest: sha256:d38fde41df5c147c
    last_modified: 2026-10-27T23:53:58Z
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
- Guides: `guideLocales` (en, fr), `guideDomains` and `type GuideDomain` (the index sections; each needs a hero motif, see [Field Guides](/modules/field-guides.md)), `gt(key, lang, replacements?)` (throws on a missing key, no fallback), `guideLangOf(Astro.currentLocale)`, `guidesPath(lang)` and `guidePath(slug, lang)` (other locales get the English URL), `formatDate`.

# Dependencies

- Used by components and [src/pages](/modules/src-pages.md); strings reach [src/scripts](/modules/src-scripts.md) via the page-data JSON block.
- [src/data](/modules/src-data.md) `site.ts` imports the `Locale` type.

# Gotchas

- Add every new key to all 11 files: `npm test` (`homepage.test.mjs`) fails if locales differ in keys or placeholders, if an English key is unused, or if a script string is missing from the page.
- Bibliography theme labels (`bibliography.theme.<slug>`) must exist for every theme in `src/data/bibliography.md`. Climate strings are site-wide under `climate.*`: `climate.<zone>`, `.about`, `.places` (example cities checked against Köppen, localized per locale) for every zone in `src/data/climates.ts`, plus the picker's `climate.zone`, `yours`, `chip`, `notSet`, `title`, `lede`, `none`, `none.about` (`homepage.test.mjs`).
- The consortium tool's strings are the `consortium.*` keys at the end of each locale file; `homepage.test.mjs` treats the prefix as dynamic, and `consortium-page.test.mjs` checks their parity, placeholders and plural forms (see [Consortium page](/modules/consortium-page.md)). The French tool is "guilde", the others "consortium" or a local word.
- `t()` replaces only the first occurrence of each placeholder.
- Guide strings are not in the 11 locale files; `guides.test.mjs` checks en/fr key parity. The site-wide `header.guides`, `header.books`, `header.menu`, `bibliography.fieldGuide`, `bibliography.guides` and `start.*` (home Start here row) keys are in all 11, as are the consortium tool's entry-point keys `nav.consortium` (one short word, after `header.menu`), `nav.consortium.full` (the tool's full name, for the Menu, the footer and the home title; right after it), `learn.consortium.link` (after `bibliography.guides`, starting with the full name) and `home.consortium.*` (before `start.*`), kept apart from the tool page's own `consortium.*` keys at the end of each file; the guide preset strings `consortium.label`, `consortium.link` and `consortium.cell.<climate>.<region>` are in `guides/{en,fr}.json`; the guides index's `section.books` is in `guides/{en,fr}.json` (`homepage.test.mjs` checks both).
- `guideDomains` lives in `guides.ts`, not `src/content.config.ts`: importing the content config at runtime pulls the glob loader's `node:fs` into the Cloudflare prerender worker and the build fails.
