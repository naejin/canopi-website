---
type: Module
title: scripts
description: Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
resource: ../../scripts
tags: [module, tooling]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T23:43:54Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T23:53:26Z }
sources:
  - id: scripts
    resource: ../../scripts
    title: scripts/
    digest: sha256:a60fed3d35e24d1b
    last_modified: 2026-10-28T23:53:25Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:26faf235c0876b4e
    last_modified: 2026-10-28T15:50:43Z
  - id: guides-consortium-test-mjs
    resource: ../../scripts/guides-consortium.test.mjs
    title: scripts/guides-consortium.test.mjs
    digest: sha256:87645d38b3e16033
    last_modified: 2026-10-28T12:22:08Z
  - id: consortium-list-ui-test-mjs
    resource: ../../scripts/consortium-list-ui.test.mjs
    title: scripts/consortium-list-ui.test.mjs
    digest: sha256:3a3bb2017becb053
    last_modified: 2026-10-28T21:53:04Z
---

# Responsibility

Tooling around the Astro build. Nothing here ships to the browser except generated files written under `public/`.

# Key files

| File | Role | Run by |
|---|---|---|
| [copy-maplibre.mjs](../../scripts/copy-maplibre.mjs) | copies `node_modules/maplibre-gl` to `public/vendor/maplibre-gl-<version>/` | `prebuild`, `predev` |
| [install-web-edition.mjs](../../scripts/install-web-edition.mjs) | verifies and installs a Web Edition tarball under `dist/client/app/` | `npm run install:web-edition` |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | verifies a canopi-data consortium export (format 3: sums, manifest, schema shape including the optional `agent_names`, http(s) source and photo-page URLs; refuses the all-zeros fixture without `--fixture`; `verifyInstall` re-checks an installed folder) and installs it with 500 px photos in `public/data/consortium/`; see [Consortium core](/modules/consortium-core.md) | `npm run install:consortium -- <export-dir>`, by hand |
| [check-built-site.mjs](../../scripts/check-built-site.mjs) | asserts every locale's built pages (downloads, Web URL, dialogs, assets, og images, bibliography, no leaked contact address) and each Field Guide in en and fr (hreflang en/fr/x-default only, Article JSON-LD, glance, bibliography link, internal links and #ids, no stray scripts on non-interactive guides, no unrendered components, crop-table cells labelled for phones and their note naming only shown columns), the consortium tool (title and h1 per locale, hreflang with `/fr/guilde/`, no `/fr/consortium/`, the installed data re-checked by `verifyInstall` (sums, cells, photos present) with a real `canopi_db_sha256`, the header marking it current through `consortiumPath`, its links and assets), and the navigation (inline header and phone Menu links in every locale, the consortium tool among them, no inline Discord or Docs, `aria-current` on Guides/Books, the home Start here guides, the consortium home section after it and the footer link, guides and bibliography linking each other and mentioning the tool, every guide preset link opening the tool with a plant of its climate's beta cell) | by hand after build |
| [check-bibliography-links.mjs](../../scripts/check-bibliography-links.mjs) | visits every bibliography link (network) | `npm run check:bibliography` |
| `*.test.mjs` | consortium-layout (the fixture's list rows, no country, in German, laid out in one headless Chrome run with the site's stylesheets and fonts at list widths 508, 850 and 1185 px: nothing past its cell, row or chip, a long one-word pest name breaks inside its chip, Swap and the stage words from 850 px only; kept small because a 200-plant version ran `npm test` out of memory (review N1); Chrome runs under `timeout -s KILL 30`, its temporary folder is removed in a finally block and on SIGINT/SIGTERM, which also kill Chrome; skipped, saying so, without Chrome or Chromium). `consortium-list-ui` opens the 200-plant page in about 30 tests; each load imports app.js again (`?ctrun=n`), and an imported module is never freed, so that file alone peaks near 1.3 GB, contact, featured-designs privacy, homepage/i18n (header keys, width queries only 639/640/959/960 plus the 1200px hero-image query (the named `plants` container query of the plant list is the one exemption), no header item hidden by width except the inline/Menu swap, the menus chrome.js closes, the consortium tool's header word and full name per locale, the home note against the manifest's climates, the header's global styles, the consortium keys' places), installer, nearest, guides (content rules, related lists, glossary, crop table, safety wording and mouth words only inside `<Safety>` boxes, checklist and glossary plugins, shared `wrap()`, mix bar, breakpoints, colours and fonts), guides-consortium (the preset links of `try-consortium.ts` on the real climate files and their build failures; every `<TryConsortium>` preset: plant in the beta cell of its climate, climate from its `<ForClimate>` block and last in it, same presets in en and fr; a guide name for every cell), built-links, consortium (scoring module on the fixture, share-link state, 200-taxon timing, `flagsFor`), consortium-list and consortium-list-ui (the plant list at 200 real plants: `scale.js` rules, then the switch, groups, rows, filters, selection, bulk Keep and Remove, paste, print and share in the harness), consortium-prepush (the pre-push review's fixes: French « guilde », unchecked toxicity, bee and warning words, the guides' rôle and general tip, "Use France", varied crop examples, one print title, "Spreads to", the globe on cards), consortium-side-layout (the side view in one headless Chrome run per width, 320 px and desktop, light and dark: true scale, readable numbers, mark contrast, gaps and dense shading), consortium-side (the side view at every size: `side.js` rules on the real Temperate list, then 9, 21 and 200 plants, keys, patching, print and French in the harness, whose DOM now has `replaceWith`), consortium-page (the tool's `consortium.*` strings in 11 locales: titles, key and placeholder parity, plural forms, every key used, no builder notes; the guides it links exist; `words.js` helpers), install-consortium (refusals, `--out` and staging, photos through a stub fetch: byte cap, redirect hosts, cancelled bodies), package (declared static and dynamic imports, Node floor, the type check's tsconfig excludes and `check` script) | `npm test` |
| [built-links.mjs](../../scripts/built-links.mjs) | `builtTarget(root, pathname)`: resolves an internal link to a built file; a path without trailing slash or extension is an error. `subdirectories(dir)`: folder names only (the guide slugs; a stray `.DS_Store` is not a guide) | `check-built-site.mjs` |
| [fixtures/consortium/make_fixture.py](../../scripts/fixtures/consortium/make_fixture.py) | writes the invented consortium fixture (format 3, three climate files; Temperate adds an invented asia_temperate cell, with a taxon chosen there only; real `countries`; each invented `invasive_in` also holds every country where GRIIS really records the plant invasive, from a `griis.json` built in canopi-data) for building the tool before real data; never shipped | by hand, see its README |
| [export-featured-designs.py](../../scripts/export-featured-designs.py) | `.canopi` files to privacy-safe `public/data/featured-designs.json` | by hand |
| [compress-heroes.py](../../scripts/compress-heroes.py), [make-og-images.py](../../scripts/make-og-images.py) | hero JPGs (2400 and 1200 px), 1200x630 social images | by hand (Pillow) |

# Interfaces

- `installConsortium({ exportDir, outDir, fixture, images, fetchImpl, delayMs, backoffMs, maxFailedShare, stagingDir })`; the CLI takes `<export-dir> [--fixture [--no-images]] [--out <dir>]` (`--no-images` only with `--fixture`; `--out` must be absent, empty or a previous install; staging in the git-ignored `.cache/consortium-install/`).
- `installWebEdition({ archivePath, ... })`, reading `CANOPI_WEB_EDITION_ARCHIVE`; `CANOPI_WEB_EDITION_REQUIRED=0` skips when unset.
- `featured-designs.json` (design list and public details) and `featured-roles.json` are inputs to the exporter; `featured-files.local.json` (git-ignored) maps ids to local files.

# Dependencies

- [src/lib](/modules/src-lib.md) and [src/data](/modules/src-data.md) (tests and checks read them); Node built-ins plus `js-yaml` (declared devDependency; guide frontmatter in `guides.test.mjs`); `parse5`, `domhandler`, `css-select` and `dom-serializer` (declared devDependencies; the small DOM of `consortium-harness.mjs`, which runs the consortium tool's app.js in `consortium-app.test.mjs`; run tests under a memory cap, as the harness once ran a process out of memory); `npm run check` uses the devDependencies `typescript` and `@astrojs/check`, after `wrangler types`; Python scripts need Pillow and SQLite. Tests import `.ts` data files directly, so `npm test` passes `--experimental-strip-types` (Node 22.12, the engines floor, does not strip types by default).

# Gotchas

- The installer validates the `/app/` artifact contract only (manifest, checksums, Cloudflare limits, filter metadata, no raw DuckDB WASM); it is not valid for the root `web.projectcanopi.com` artifact.
- The exporter writes metres from the design centre and a pin rounded to 0.1 degree; `featured-designs.test.mjs` enforces the allowed fields. Publish a design only with its owner's consent.
- Hero PNG originals stay outside git.
