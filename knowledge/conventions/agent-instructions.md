---
type: Convention
title: Existing agent instructions
description: The durable project rules given to coding agents in AGENTS.md and CLAUDE.md, summarised with where each is enforced.
tags: [convention, agents]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T12:24:37Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T14:35:46Z }
sources:
  - id: agents-md
    resource: ../../AGENTS.md
    title: AGENTS.md
    digest: sha256:eb22b22167a780e6
    last_modified: 2026-10-26T20:08:11Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:a090fc09acf02ec7
    last_modified: 2026-11-14T12:24:22Z
---

# Rule

Instruction files: [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md). They remain the source of truth; this is a map.

## Stack and scope

- Astro static output and plain CSS; no Tailwind, no framework in the browser, except the consortium tool's Preact island on `/palette/` (readers see "Plant palette"; moved from `/consortium/`, which 301-redirects, in PP-B commit 0b, [decision row "Plant palette name"](/decisions/consortium-user-decisions.md); [architecture](/decisions/consortium-v2-architecture.md)).
- Canopi Web lives at `web.projectcanopi.com`; the site only links to it. No website-side catalog search, storage, DuckDB, Worker/Pages Function, R2, KV, D1, service worker or offline catalog. `/app/*` fallback stays a static `_redirects` rule; `/app/canopi-catalog/` files are served as static assets. The rule covers the Web Edition files under `/app/`, not the consortium tool (`/palette/`), which reads its own static SQLite export in the browser with sqlite-wasm and keeps the last consortium, the reader's country choice and the shared site climate (`canopi-climate`) in localStorage (CLAUDE.md; licences in `THIRD_PARTY_NOTICES.md`). The consortium's location lookup reads static canopi-climate tiles under `/data/climate/`, fetched and verified at build (every `astro build` installs the release pinned in `src/data/climate-release.json` through the `climateTiles` integration in `astro.config.mjs`) and never committed; a failed download or checksum mismatch fails the build; the reader never requests a tile its index does not list (CLAUDE.md).
- Hosting: Cloudflare Workers Builds (`projectcanopi`), production branch `deploy`; a push to `master` runs CI and a green `gate` moves `deploy` ([CI and deploy gate](/runbooks/ci-and-deploy-gate.md)).
- Cloudflare `_redirects` has no `Language=` conditions; language detection is client-side in `Base.astro`.

## i18n

- 11 locales; every new key goes into all 11 `src/i18n/translations/*.json` files (enforced by `scripts/homepage.test.mjs`). See [src/i18n](/modules/src-i18n.md).
- Exception: Field Guides are English and French only; guide-only strings go in `src/i18n/guides/{en,fr}.json` (parity enforced by `scripts/guides.test.mjs`). See [Field Guides](/modules/field-guides.md).
- Components take a `lang` prop; scripts take strings from the page, never hard-coded English. Exception: Field Guide components read the language from `Astro.currentLocale` (`guideLangOf`), so guide MDX never passes `lang`; the component contract is [Field Guide components](/references/field-guide-components.md).

## Design

- The app's whole token set (from `canopi/desktop/web/src/styles/global.css`), neutral and plant-data colours with dark values; Source Sans 3 and Literata, weights 400/600 only.
- Colour carries meaning: roles, layers, marks and status use the app's data colours; buttons and frames stay ochre and ink; green is plant data only, as in the app (owner 2026-11-13).
- Never colour alone: a word or symbol with each colour; text contrast 4.5:1 in both themes.
- Light/dark via `[data-theme="dark"]` and `localStorage`.
- Breakpoints only `max-width: 639px` and `min-width: 960px`.
- `<body class="grain">` already provides the paper texture; do not add page-level textures.

## Releases

- `src/data/release.ts` is the only download-link authority; bump `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` per release (asserted by `scripts/check-built-site.mjs`). See [src/data](/modules/src-data.md).

## Workflow

- Track work in bd beads ([issue tracker](/references/docs-agents-issue-tracker.md), [triage](/references/docs-agents-triage-workflow.md)); read `CONTEXT.md` and `docs/adr/` first ([domain docs](/references/docs-agents-domain.md)).
- Keep this OKF bundle true after code changes (`okf impact`, `okf sync`, `okf check`).
