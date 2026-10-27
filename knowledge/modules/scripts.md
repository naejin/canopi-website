---
type: Module
title: scripts
description: Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
resource: ../../scripts
tags: [module, tooling]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T19:29:33Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T19:46:08Z }
sources:
  - id: scripts
    resource: ../../scripts
    title: scripts/
    digest: sha256:138455eff624c64c
    last_modified: 2026-10-27T19:45:00Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:f7393b32d2100393
    last_modified: 2026-10-27T19:28:52Z
---

# Responsibility

Tooling around the Astro build. Nothing here ships to the browser except generated files written under `public/`.

# Key files

| File | Role | Run by |
|---|---|---|
| [copy-maplibre.mjs](../../scripts/copy-maplibre.mjs) | copies `node_modules/maplibre-gl` to `public/vendor/maplibre-gl-<version>/` | `prebuild`, `predev` |
| [install-web-edition.mjs](../../scripts/install-web-edition.mjs) | verifies and installs a Web Edition tarball under `dist/client/app/` | `npm run install:web-edition` |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | verifies a canopi-data consortium export (format 2: sums, manifest, schema shape; refuses the all-zeros fixture without `--fixture`) and installs it with 500 px photos in `public/data/consortium/`; see [Consortium core](/modules/consortium-core.md) | `npm run install:consortium -- <export-dir>`, by hand |
| [check-built-site.mjs](../../scripts/check-built-site.mjs) | asserts every locale's built pages (downloads, Web URL, dialogs, assets, og images, bibliography, no leaked contact address) and each Field Guide in en and fr (hreflang en/fr/x-default only, Article JSON-LD, glance, bibliography link, internal links and #ids, no stray scripts on non-interactive guides, no unrendered components, crop-table cells labelled for phones and their note naming only shown columns), and the navigation (inline header and phone Menu links in every locale, no inline Discord or Docs, `aria-current` on Guides/Books, the home Start here guides, guides and bibliography linking each other) | by hand after build |
| [check-bibliography-links.mjs](../../scripts/check-bibliography-links.mjs) | visits every bibliography link (network) | `npm run check:bibliography` |
| `*.test.mjs` | contact, featured-designs privacy, homepage/i18n (header keys, width queries only 639/640/959/960 plus the 1200px hero-image query, no header item hidden by width except the inline/Menu swap, the menus chrome.js closes), installer, nearest, guides (content rules, related lists, glossary, crop table, safety wording and mouth words only inside `<Safety>` boxes, checklist and glossary plugins, shared `wrap()`, mix bar, breakpoints, colours and fonts), built-links, consortium (scoring module on the fixture, share-link state, 200-taxon timing), install-consortium (refusals, photos through a stub fetch), package (declared static and dynamic imports, Node floor, the type check's tsconfig excludes and `check` script) | `npm test` |
| [built-links.mjs](../../scripts/built-links.mjs) | `builtTarget(root, pathname)`: resolves an internal link to a built file; a path without trailing slash or extension is an error. `subdirectories(dir)`: folder names only (the guide slugs; a stray `.DS_Store` is not a guide) | `check-built-site.mjs` |
| [fixtures/consortium/make_fixture.py](../../scripts/fixtures/consortium/make_fixture.py) | writes the invented consortium fixture (format 2, three cells, real `country_regions`) for building the tool before real data; never shipped | by hand, see its README |
| [export-featured-designs.py](../../scripts/export-featured-designs.py) | `.canopi` files to privacy-safe `public/data/featured-designs.json` | by hand |
| [compress-heroes.py](../../scripts/compress-heroes.py), [make-og-images.py](../../scripts/make-og-images.py) | hero JPGs (2400 and 1200 px), 1200x630 social images | by hand (Pillow) |

# Interfaces

- `installConsortium({ exportDir, outDir, fixture, images, fetchImpl, delayMs })`; the CLI takes `<export-dir> [--fixture] [--no-images] [--out <dir>]`.
- `installWebEdition({ archivePath, ... })`, reading `CANOPI_WEB_EDITION_ARCHIVE`; `CANOPI_WEB_EDITION_REQUIRED=0` skips when unset.
- `featured-designs.json` (design list and public details) and `featured-roles.json` are inputs to the exporter; `featured-files.local.json` (git-ignored) maps ids to local files.

# Dependencies

- [src/lib](/modules/src-lib.md) and [src/data](/modules/src-data.md) (tests and checks read them); Node built-ins plus `js-yaml` (declared devDependency; guide frontmatter in `guides.test.mjs`); `npm run check` uses the devDependencies `typescript` and `@astrojs/check`, after `wrangler types`; Python scripts need Pillow and SQLite. Tests import `.ts` data files directly, so `npm test` passes `--experimental-strip-types` (Node 22.12, the engines floor, does not strip types by default).

# Gotchas

- The installer validates the `/app/` artifact contract only (manifest, checksums, Cloudflare limits, filter metadata, no raw DuckDB WASM); it is not valid for the root `web.projectcanopi.com` artifact.
- The exporter writes metres from the design centre and a pin rounded to 0.1 degree; `featured-designs.test.mjs` enforces the allowed fields. Publish a design only with its owner's consent.
- Hero PNG originals stay outside git.
