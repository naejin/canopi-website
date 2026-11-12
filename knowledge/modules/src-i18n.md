---
type: Module
title: src/i18n
description: The 11-locale translation tables and the t() lookup used by every component at build time.
resource: ../../src/i18n
tags: [module, i18n]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T05:58:36Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-12T05:53:45Z }
sources:
  - id: i18n
    resource: ../../src/i18n
    title: src/i18n/
    digest: sha256:15e399075c75fdff
    last_modified: 2026-11-12T05:57:45Z
  - id: homepage-test
    resource: ../../scripts/homepage.test.mjs
    title: scripts/homepage.test.mjs
    digest: sha256:2745c3a318cc6167
    last_modified: 2026-11-11T19:53:07Z
  - id: consortium-keys-test-mjs
    resource: ../../scripts/consortium-keys.test.mjs
    title: scripts/consortium-keys.test.mjs
    digest: sha256:2fbc36045c70e657
    last_modified: 2026-11-11T18:21:14Z
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

- Add every new key to all 11 files: `npm test` (`homepage.test.mjs`) fails if locales differ in keys or in the set of placeholders (a plural repeats them once per form, and zh, ja and ko have one form), if an English key is unused, or if a script string is missing from the page.
- Bibliography theme labels (`bibliography.theme.<slug>`) must exist for every theme in `src/data/bibliography.md`. Climate strings are site-wide under `climate.*`: `climate.<zone>`, `.about`, `.places` (example cities checked against Köppen, localized per locale) for every zone in `src/data/climates.ts`, plus the picker's `climate.zone`, `yours`, `chip`, `notSet`, `title`, `lede`, `none`, `none.about` (`homepage.test.mjs`).
- The consortium tool's strings are the `consortium.*` keys at the end of each locale file; `homepage.test.mjs` treats the prefix as dynamic (v1's `consortium-page.test.mjs`, which checked their parity, placeholders and plural forms, was deleted at P2 commit 0; the island's `strings.ts` reads them; the `consortium.load.*` keys of the v2 load screens are in all 11, translated; each file ends with marker keys `consortium.block.s1`…`s4`, then (P5 commit 0) `s5b`…`s5f` and the closing `consortium.block.end`, and each stream appends its keys after its own marker and before the next, so no stream edits another stream's last line (S5f's block may also hold `privacy.*` and new `dataSources.*` keys) (S1's `consortium.load.*` sit between s1 and s2; `homepage.test.mjs` checks the order; the page leaves the markers out of `#ct-data`); see [Consortium page](/modules/consortium-page.md)). The French tool is "guilde", the others "consortium" or a local word; the path is `/consortium/` in every locale (`consortium-path.js`, owner 2026-10-29).
- The consortium's "Suggest a correction" form uses `correction.*` keys (all 11 files, between the tool's `consortium.*` keys near the end of each file); `ConsortiumPage.astro` passes them, and the `climate.*` names, in `#ct-data` under their own names (v1's `correction.js` is deleted; `check-built-site.mjs` checks each equals the locale's value). `scripts/consortium-keys.test.mjs` fails on a `consortium.*` key no code uses or a key the island names that is missing from a locale (422 unused keys were pruned at the P2 hand-offs and their review; a key counts as used only when it is in a T( or P( call, matches a template, is read by ConsortiumPage.astro or is in the test's INDIRECT list, and the same check covers `correction.*`). The data release line is `consortium.release` ("Data release {id}"); the layer values add `consortium.est.*` (the word "estimate" and its legend), `consortium.t.*`, `consortium.scope.*`, and the yield-gain pair `consortium.ctype.intercropped_yield_gain` and `consortium.d.yieldGain`.
- `t()` replaces only the first occurrence of each placeholder.
- `dataSources.*` is the words around the source credits (`dataSources.credits.*`: title, lede, the used and held headings and five licence statuses) and the TRY citation and list; the citation and the rows stay in their original language and are not keys. `dataSources.title` is the page title and the footer label: it uses each locale's existing word for sources and data (de Datenquellen, ja データの出典, nl Gegevensbronnen). `dataSources.guidelines` keeps the English name of the guidelines in brackets in the other 10 locales. S5f adds `dataSources.tool.*` (title, lede, the grid/served/GBIF/map/search use lines, the privacy link) and `privacy.*` (the /privacy/ page; `privacy.title` is also the footer label) in its block; `homepage.test.mjs` checks the twenty-four keys (the sixteen, then S5f's eight `dataSources.tool.*`) in every locale, translated, with no `CC BY`, and that `dataSources.list.lost` shows �.
- Guide strings are not in the 11 locale files; `guides.test.mjs` checks en/fr key parity. The site-wide `header.guides`, `header.books`, `header.menu`, `bibliography.fieldGuide`, `bibliography.guides` and `start.*` (`start.inEnglish` and `start.all`, now used by the home's entry guides card) keys are in all 11, as are the consortium tool's entry-point keys `nav.consortium` (one short word, after `header.menu`), `nav.consortium.full` (the tool's full name, for the Menu, the footer and the home title; right after it), `learn.consortium.link` (after `bibliography.guides`, starting with the full name) and `home.consortium.*` (before `start.*`), kept apart from the tool page's own `consortium.*` keys at the end of each file; the guide preset strings `consortium.label`, `consortium.link` and `consortium.cell.<climate>.<region>` are in `guides/{en,fr}.json`; the guides index's `section.books` is in `guides/{en,fr}.json` (`homepage.test.mjs` checks both).
- `guideDomains` lives in `guides.ts`, not `src/content.config.ts`: importing the content config at runtime pulls the glob loader's `node:fs` into the Cloudflare prerender worker and the build fails.
