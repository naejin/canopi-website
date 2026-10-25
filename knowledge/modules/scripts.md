---
type: Module
title: scripts
description: Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
resource: ../../scripts
tags: [module, tooling]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T10:39:26Z }
sources:
  - id: scripts
    resource: ../../scripts
    title: scripts/
    digest: sha256:62bb2653dc3ef805
    last_modified: 2026-10-25T10:34:00Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:5d9131fcbc667bdb
    last_modified: 2026-10-25T10:03:59Z
---

# Responsibility

Tooling around the Astro build. Nothing here ships to the browser except generated files written under `public/`.

# Key files

| File | Role | Run by |
|---|---|---|
| [copy-maplibre.mjs](../../scripts/copy-maplibre.mjs) | copies `node_modules/maplibre-gl` to `public/vendor/maplibre-gl-<version>/` | `prebuild`, `predev` |
| [install-web-edition.mjs](../../scripts/install-web-edition.mjs) | verifies and installs a Web Edition tarball under `dist/client/app/` | `npm run install:web-edition` |
| [check-built-site.mjs](../../scripts/check-built-site.mjs) | asserts every locale's built pages (downloads, Web URL, dialogs, assets, og images, bibliography, no leaked contact address) and each Field Guide in en and fr (hreflang en/fr/x-default only, Article JSON-LD, glance, bibliography link, internal links and #ids, no stray scripts on non-interactive guides, no unrendered components) | by hand after build |
| [check-bibliography-links.mjs](../../scripts/check-bibliography-links.mjs) | visits every bibliography link (network) | `npm run check:bibliography` |
| `*.test.mjs` | contact, featured-designs privacy, homepage/i18n, installer, nearest, guides (content rules, glossary, crop table, safety wording, checklist and glossary plugins, mix bar, breakpoints, colours and fonts), built-links, package (declared static and dynamic imports, Node floor) | `npm test` |
| [built-links.mjs](../../scripts/built-links.mjs) | `builtTarget(root, pathname)`: resolves an internal link to a built file; a path without trailing slash or extension is an error | `check-built-site.mjs` |
| [export-featured-designs.py](../../scripts/export-featured-designs.py) | `.canopi` files to privacy-safe `public/data/featured-designs.json` | by hand |
| [compress-heroes.py](../../scripts/compress-heroes.py), [make-og-images.py](../../scripts/make-og-images.py) | hero JPGs (2400 and 1200 px), 1200x630 social images | by hand (Pillow) |

# Interfaces

- `installWebEdition({ archivePath, ... })`, reading `CANOPI_WEB_EDITION_ARCHIVE`; `CANOPI_WEB_EDITION_REQUIRED=0` skips when unset.
- `featured-designs.json` (design list and public details) and `featured-roles.json` are inputs to the exporter; `featured-files.local.json` (git-ignored) maps ids to local files.

# Dependencies

- [src/lib](/modules/src-lib.md) and [src/data](/modules/src-data.md) (tests and checks read them); Node built-ins plus `js-yaml` (declared devDependency; guide frontmatter in `guides.test.mjs`); Python scripts need Pillow and SQLite. Tests import `.ts` data files directly, so `npm test` passes `--experimental-strip-types` (Node 22.12, the engines floor, does not strip types by default).

# Gotchas

- The installer validates the `/app/` artifact contract only (manifest, checksums, Cloudflare limits, filter metadata, no raw DuckDB WASM); it is not valid for the root `web.projectcanopi.com` artifact.
- The exporter writes metres from the design centre and a pin rounded to 0.1 degree; `featured-designs.test.mjs` enforces the allowed fields. Publish a design only with its owner's consent.
- Hero PNG originals stay outside git.
