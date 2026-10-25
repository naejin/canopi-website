---
type: Module
title: src/pages
description: Astro routes; thin per-locale wrappers around components, plus the one on-demand contact endpoint.
resource: ../../src/pages
tags: [module]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:08Z }
sources:
  - id: pages
    resource: ../../src/pages
    title: src/pages/
    digest: sha256:2ed666be70151a0b
    last_modified: 2026-10-23T19:07:39Z
---

# Responsibility

Map URLs to components for all 11 locales. Pages hold no markup or logic of their own; rendering lives in `src/components/` and form logic in [src/lib](/modules/src-lib.md).

# Key files

| Route | File | Renders |
|---|---|---|
| `/`, `/{lang}/` | [index.astro](../../src/pages/index.astro), `[lang]/index.astro` | `Home.astro` |
| `/bibliography/`, `/{lang}/bibliography/` | [bibliography.astro](../../src/pages/bibliography.astro), `[lang]/bibliography.astro` | `BibliographyPage.astro` |
| `/contact/sent/`, `/contact/failed/` (+ `/{lang}/`) | `contact/*.astro`, `[lang]/contact/*.astro` | `ContactResult.astro` |
| `POST /api/contact` | `api/contact.ts` | `handleContact(request, env)` |

# Interfaces

- `[lang]` pages use `getStaticPaths()` over `locales` minus `defaultLocale`, so English lives unprefixed.
- `api/contact.ts` sets `prerender = false` and exports `POST` and `ALL` (non-POST gets 405 from the handler).

# Dependencies

- [src/i18n](/modules/src-i18n.md), [src/lib](/modules/src-lib.md), `src/components/`; `cloudflare:workers` for the Worker `env`.

# Gotchas

- Everything is static except `/api/contact`, which runs in the `projectcanopi` Worker.
- Contact result pages are `noindex` and kept out of the sitemap (checked by `scripts/check-built-site.mjs`).
- Adding a page means adding both the root file and the `[lang]/` twin.
