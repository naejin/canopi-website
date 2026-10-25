---
type: Convention
title: Existing agent instructions
description: The durable project rules given to coding agents in AGENTS.md and CLAUDE.md, summarised with where each is enforced.
tags: [convention, agents]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:07Z }
sources:
  - id: agents-md
    resource: ../../AGENTS.md
    title: AGENTS.md
    digest: sha256:19f7b371bd16a0ac
    last_modified: 2026-10-25T08:52:23Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:686e63081a8f86d7
    last_modified: 2026-10-25T08:52:23Z
---

# Rule

Instruction files: [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md). They remain the source of truth; this is a map.

## Stack and scope

- Astro static output and plain CSS; no Tailwind, no framework in the browser.
- Canopi Web lives at `web.projectcanopi.com`; the site only links to it. No website-side catalog search, storage, DuckDB, Worker/Pages Function, R2, KV, D1, service worker or offline catalog. `/app/*` fallback stays a static `_redirects` rule; `/app/canopi-catalog/` files are served as static assets.
- Cloudflare `_redirects` has no `Language=` conditions; language detection is client-side in `Base.astro`.

## i18n

- 11 locales; every new key goes into all 11 `src/i18n/translations/*.json` files (enforced by `scripts/homepage.test.mjs`). See [src/i18n](/modules/src-i18n.md).
- Components take a `lang` prop; scripts take strings from the page, never hard-coded English.

## Design

- Exact app palette (from `canopi/desktop/web/src/styles/global.css`); Source Sans 3 and Literata, weights 400/600 only.
- No green in UI chrome (green is for plant content).
- Light/dark via `[data-theme="dark"]` and `localStorage`.
- Breakpoints only `max-width: 639px` and `min-width: 960px`.
- `<body class="grain">` already provides the paper texture; do not add page-level textures.

## Releases

- `src/data/release.ts` is the only download-link authority; bump `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` per release (asserted by `scripts/check-built-site.mjs`). See [src/data](/modules/src-data.md).

## Workflow

- Track work in bd beads ([issue tracker](/references/docs-agents-issue-tracker.md), [triage](/references/docs-agents-triage-workflow.md)); read `CONTEXT.md` and `docs/adr/` first ([domain docs](/references/docs-agents-domain.md)).
- Keep this OKF bundle true after code changes (`okf impact`, `okf sync`, `okf check`).
