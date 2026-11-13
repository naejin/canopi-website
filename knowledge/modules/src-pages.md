---
type: Module
title: src/pages
description: Astro routes; thin per-locale wrappers around components, the prerendered /version.json marker, and the two on-demand endpoints, contact and correction.
resource: ../../src/pages
tags: [module]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:39:59Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T21:39:27Z }
sources:
  - id: pages
    resource: ../../src/pages
    title: src/pages/
    digest: sha256:b5d87afe02f80013
    last_modified: 2026-11-13T03:21:28Z
  - id: version-json-ts
    resource: ../../src/pages/version.json.ts
    title: src/pages/version.json.ts
    digest: sha256:9774b792a9af6f35
    last_modified: 2026-11-13T03:21:28Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:20cc55a6ae33e17a
    last_modified: 2026-11-13T03:21:28Z
---

# Responsibility

Map URLs to components for all 11 locales. Pages hold no markup or logic of their own; rendering lives in `src/components/` and form logic in [src/lib](/modules/src-lib.md).

# Key files

| Route | File | Renders |
|---|---|---|
| `/`, `/{lang}/` | [index.astro](../../src/pages/index.astro), `[lang]/index.astro` | `Home.astro` |
| `/bibliography/`, `/{lang}/bibliography/` | [bibliography.astro](../../src/pages/bibliography.astro), `[lang]/bibliography.astro` | `BibliographyPage.astro` |
| `/data-sources/`, `/{lang}/data-sources/` | [data-sources.astro](../../src/pages/data-sources.astro), `[lang]/data-sources.astro` | `DataSourcesPage.astro`: a link to the repository's `THIRD_PARTY_NOTICES.md` (code licences; `dataSources.notices`), the source credits, the consortium tool's credits (`data-credit` rows, see [Privacy page and tool credits](/modules/privacy-and-credits.md)), the TRY citation, the guidelines line and every dataset row as static HTML |
| `/privacy/`, `/{lang}/privacy/` | [privacy.astro](../../src/pages/privacy.astro), `[lang]/privacy.astro` | `PrivacyPage.astro`, see [Privacy page and tool credits](/modules/privacy-and-credits.md) |
| `/contact/sent/`, `/contact/failed/` (+ `/{lang}/`) | `contact/*.astro`, `[lang]/contact/*.astro` | `ContactResult.astro` |
| `/guides/`, `/fr/guides/` | [guides/index.astro](../../src/pages/guides/index.astro), `[lang]/guides/index.astro` | `GuidesIndex.astro` |
| `/guides/<slug>/`, `/fr/guides/<slug>/` | `guides/[slug].astro`, `[lang]/guides/[slug].astro` | `GuideLayout.astro` |
| `/consortium/`, `/{lang}/consortium/` (the 10 others, French included: owner, 2026-10-29) | [consortium.astro](../../src/pages/consortium.astro), `[lang]/consortium.astro` | `ConsortiumPage.astro`, see [Consortium page](/modules/consortium-page.md) |
| `/version.json` | [version.json.ts](../../src/pages/version.json.ts) | The version marker (E3): `{ sha, built_at, node }`, prerendered in workerd; `sha` from `WORKERS_CI_COMMIT_SHA`, else `GITHUB_SHA`, else the checkout's `.git/HEAD` (a detached sha, or the loose ref of master or deploy, read with `import.meta.glob`), else null; `node` from `npm_config_user_agent`, else null; anything not a 40-hex sha or plain version becomes null. CI's `live` job polls it; `public/_headers` serves it `no-store`; `check-built-site.mjs` checks its shape. See [CI, hooks and the deploy gate](/runbooks/ci-and-deploy-gate.md) |
| `POST /api/contact` | `api/contact.ts` | `handleContact(request, env)` |
| `POST /api/correction` | `api/correction.ts` | `handleCorrection(request, env)` (the consortium tool's "Suggest a correction"; see [src/lib](/modules/src-lib.md)) |

# Interfaces

- `[lang]` pages use `getStaticPaths()` over `locales` minus `defaultLocale`, so English lives unprefixed.
- `api/contact.ts` and `api/correction.ts` set `prerender = false` and exports `POST` and `ALL` (non-POST gets 405 from the handler).

# Dependencies

- [src/i18n](/modules/src-i18n.md), [src/lib](/modules/src-lib.md), `src/components/`; `cloudflare:workers` for the Worker `env`.

# Gotchas

- `/version.json` exists once, not per locale (no `[lang]/` twin).
- Everything is static except `/api/contact` and `/api/correction`, which run in the `projectcanopi` Worker.
- Contact result pages are `noindex` and kept out of the sitemap (checked by `scripts/check-built-site.mjs`).
- Adding a page means adding both the root file and the `[lang]/` twin.
- Exception: Field Guide routes exist in English and French only; the `[lang]/guides/` pages return `fr` alone from `getStaticPaths()` and pass `alternates` so hreflang lists en, fr and x-default.
