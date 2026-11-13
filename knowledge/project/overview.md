---
type: Project
title: canopi-website
description: Astro marketing site for projectcanopi.com, the home of the Canopi agroecological design app, deployed by Cloudflare Workers Builds from the deploy branch, which CI moves to master only when it is green.
tags: [project]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T06:57:02Z }
verified:
  - { by: claude/opus-5.5, at: 2026-11-06T00:33:35Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:45Z }
sources:
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:18790192849df669
    last_modified: 2026-11-06T14:34:09Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:cd62373a66839519
    last_modified: 2026-11-13T06:49:01Z
  - id: claude-md
    resource: ../../CLAUDE.md
    title: CLAUDE.md
    digest: sha256:67232b45e9d1961a
    last_modified: 2026-11-13T06:57:03Z
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
  - id: ci-yml
    resource: ../../.github/workflows/ci.yml
    title: .github/workflows/ci.yml
    digest: sha256:f54c110957ab8614
    last_modified: 2026-11-13T12:11:05Z
  - id: node-version
    resource: ../../.node-version
    title: .node-version
    digest: sha256:4137094e7792cb49
    last_modified: 2026-11-13T03:21:28Z
  - id: version-json-ts
    resource: ../../src/pages/version.json.ts
    title: src/pages/version.json.ts
    digest: sha256:9774b792a9af6f35
    last_modified: 2026-11-13T03:21:28Z
---

# Purpose

The public website of Canopi, an open-source agroecological design app run by a non-profit association. Visitors (growers, designers, the agroecology community) learn what Canopi is, download Canopi Desktop for their OS, open Canopi Web at `web.projectcanopi.com`, see what the app does and browse featured designs, read a curated bibliography and practical Field Guides (English and French), design a plant consortium for their climate (beta tool, with a "Suggest a correction" form for its plant data), and contact or donate to the project. [^readme]

# Tech stack

- Astro 6 static output with `@astrojs/cloudflare`, `@astrojs/sitemap` and `@astrojs/mdx` 5 (Field Guides); plain CSS; vanilla JS modules.
- HelloAsso donations.
- One Cloudflare Worker `projectcanopi`: serves `dist/client/` and the on-demand `POST /api/contact` and `POST /api/correction` (one send_email binding; nothing stored).
- Node >= 22.13 (`node:sqlite` without a flag) for tooling and `node --test`; `.node-version` pins 22.22.0 for CI (`actions/setup-node`) and Workers Builds; Python (Pillow) for asset generators.
- Deploys: production builds come from branch `deploy`, which GitHub Actions moves fast-forward to a master commit only once its `gate` check is green (`.github/workflows/ci.yml`; a ruleset on `deploy` refuses any other push). Cloudflare's production branch is `deploy` since 2026-11-13 (owner switch; previews off); probe P-E3a confirmed a master push alone deploys nothing. See [CI, hooks and the deploy gate](/runbooks/ci-and-deploy-gate.md). `/version.json` names the commit the live site was built from.
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
