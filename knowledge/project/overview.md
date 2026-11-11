---
type: Project
title: canopi-website
description: Astro marketing site for projectcanopi.com, the home of the Canopi agroecological design app, deployed by Cloudflare Workers Builds on push to master.
tags: [project]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T03:17:24Z }
verified:
  - { by: claude/opus-5.5, at: 2026-11-06T00:33:35Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T03:17:23Z }
sources:
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:18790192849df669
    last_modified: 2026-11-06T14:34:09Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:ed10710e2f21129d
    last_modified: 2026-11-11T03:13:35Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:d72c6a09aa29c21c
    last_modified: 2026-10-26T20:30:39Z
  - id: context-md
    resource: ../../CONTEXT.md
    title: CONTEXT.md
    digest: sha256:0a5a8181d949ff64
    last_modified: 2026-11-10T15:32:40Z
  - id: correction-ts
    resource: ../../src/pages/api/correction.ts
    title: src/pages/api/correction.ts
    digest: sha256:0e218c3a31acfb95
    last_modified: 2026-11-09T23:41:46Z
---

# Purpose

The public website of Canopi, an open-source agroecological design app run by a non-profit association. Visitors (growers, designers, the agroecology community) learn what Canopi is, download Canopi Desktop for their OS, open Canopi Web at `web.projectcanopi.com`, see what the app does and browse featured designs, read a curated bibliography and practical Field Guides (English and French), design a plant consortium for their climate (beta tool, with a "Suggest a correction" form for its plant data), and contact or donate to the project. [^readme]

# Tech stack

- Astro 6 static output with `@astrojs/cloudflare`, `@astrojs/sitemap` and `@astrojs/mdx` 5 (Field Guides); plain CSS; vanilla JS modules.
- HelloAsso donations.
- One Cloudflare Worker `projectcanopi`: serves `dist/client/` and the on-demand `POST /api/contact` and `POST /api/correction` (one send_email binding; nothing stored).
- Node >= 22.12 for tooling and `node --test`; Python (Pillow) for asset generators.
- 11 locales (en at `/`, others at `/{lang}/`); the Field Guides are en and fr only (`/guides/`, `/fr/guides/`); field-notebook design with the app's palette and fonts.

# Layout

- `src/components/`, `src/layouts/Base.astro`, `src/styles/`: markup and styles.
- [src/pages](/modules/src-pages.md): routes.
- [src/data](/modules/src-data.md): release links, site links, network, bibliography, guide glossary and crop table.
- [Field Guides](/modules/field-guides.md): `src/content/guides/`, `src/components/guides/`, `src/styles/guides.css`.
- [src/i18n](/modules/src-i18n.md): translations and `t()`.
- [src/lib](/modules/src-lib.md): framework-free logic (contact and correction handlers, installer detection, TRY list and source credits parsers, the consortium data core).
- [src/scripts](/modules/src-scripts.md): browser behaviour.
- [scripts](/modules/scripts.md): build helpers, tests, checks, generators.
- [mockup](/modules/mockup.md): approved design reference, not built.
- `docs/`: [Canopi Web deployment](/references/docs-canopi-web-subdomain-deployment.md), agent workflow docs, ADRs.

# Getting started

See [Build and test](/runbooks/build-and-test.md) and [agent instructions](/conventions/agent-instructions.md).

[^readme]: Project README and CONTEXT.md
