---
type: Module
title: scripts
description: Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
resource: ../../scripts
tags: [module, tooling]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T10:14:03Z }
verified:
  - { by: claude/opus-5.5, at: 2026-11-06T00:26:58Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-12T12:06:50Z }
sources:
  - id: consortium-boundary-test-mjs
    resource: ../../scripts/consortium-boundary.test.mjs
    title: scripts/consortium-boundary.test.mjs
    digest: sha256:2204b1125f7911bc
    last_modified: 2026-11-11T03:07:08Z
  - id: browser-test
    resource: ../../scripts/browser/consortium-commit0.browser.test.mjs
    title: scripts/browser/consortium-commit0.browser.test.mjs
    digest: sha256:0d31414eef7a7630
    last_modified: 2026-11-12T09:10:58Z
  - id: scripts
    resource: ../../scripts
    title: scripts/
    digest: sha256:5fdf5ab02a765e7a
    last_modified: 2026-11-12T12:06:41Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:4a34b88ab7543c68
    last_modified: 2026-11-11T22:31:55Z
  - id: guides-consortium-test-mjs
    resource: ../../scripts/guides-consortium.test.mjs
    title: scripts/guides-consortium.test.mjs
    digest: sha256:54b8fd886c66eeb7
    last_modified: 2026-11-11T03:33:26Z
  - id: consortium-grid-check-mjs
    resource: ../../scripts/consortium-grid-check.mjs
    title: scripts/consortium-grid-check.mjs
    digest: sha256:e4f1d144fc4ece03
    last_modified: 2026-11-12T09:10:58Z
  - id: built-modules-test-mjs
    resource: ../../scripts/built-modules.test.mjs
    title: scripts/built-modules.test.mjs
    digest: sha256:d60c6e00cc831c90
    last_modified: 2026-11-11T17:58:51Z
---

# Responsibility

Tooling around the Astro build. Nothing here ships to the browser except generated files written under `public/`.

# Key files

| File | Role | Run by |
|---|---|---|
| [home-captures/](../../scripts/home-captures) | the home page's captures of Canopi Web, in 11 languages and two themes: `make-example.py` (the fictional design), `capture.cjs` (Playwright against the live app), `crop.py` (webp files in `public/home/`) | by hand, when the app's look changes |
| [install-web-edition.mjs](../../scripts/install-web-edition.mjs) | verifies and installs a Web Edition tarball under `dist/client/app/` | `npm run install:web-edition` |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | verifies a canopi-data consortium export (format 4: one gzipped SQLite database; sums, manifest, the file's name, digests, gzip and size limits, then the database through `node:sqlite` against [consortium-schema.mjs](../../scripts/consortium-schema.mjs); refuses the all-zeros fixture without `--fixture`; `canopi release verify` from canopi-data (`CANOPI_DATA_DIR`, else the sibling) on every install but `--fixture`; `verifyInstall(dir, index)` re-checks a served folder) and installs the database and 500 px photos in `public/data/consortium/`, writing `src/data/consortium-index.json` and, on a real install, the TRY list and `source_credits.tsv` to `src/data/`; see [Consortium core](/modules/consortium-core.md) | `npm run install:consortium -- <export-dir>`, by hand |
| [install-climate.mjs](../../scripts/install-climate.mjs) | installs the pinned canopi-climate grid (`src/data/climate-release.json`): skipped when installed (every tile's sha256 checked against the index), else from `CANOPI_CLIMATE_ARCHIVE`, the cache (`CANOPI_CLIMATE_CACHE`) or one plain download (not in dev; 30 s stall and 10 min timeouts), size and sha256 checked first; one install at a time (a lock), each staged in its own directory; verifies the release ( safe regular tar entries of at most 25 MiB, every `SHA256SUMS` line, the manifest's format 1, variables, scales, slots and layer bands against `src/lib/climate/model.js`, each tile's size, sha256 and TIFF position, and the consortium export's `climate_grid_manifest_sha256` when its index has one) and installs the tiles under `public/data/climate/<version>-<12 hex>/{tiles,soil,regions}/`, writing `src/data/climate-index.json` (both git-ignored); `verifyClimateInstall(dir, index)` re-checks a served folder; see [Climate reader](/modules/climate-reader.md) | every `astro build` through [climate-integration.mjs](../../scripts/climate-integration.mjs) (the `climateTiles` Astro integration; `astro dev` too, warning only); `npm run install:climate [-- <tar>]` |
| [check-built-site.mjs](../../scripts/check-built-site.mjs) | asserts every locale's built pages (one sqlite wasm and no worker/OPFS helper; the consortium island's JS under 62 KB gzip (raised from 60 at the P5 hand-offs) through [built-modules.mjs](../../scripts/built-modules.mjs) and its first run (entry plus static imports) under 42 KB (raised from 40 by the owner for P5), with no counted chunk holding the PlantSource's SQL; no `__ctTest`, `__ctViews` or `failSheets` in a production build; every `correction.*`/`climate.*` string in `#ct-data` equal to the locale's and a guide title for each linked guide; with the DB preload and modulepreload links; downloads, Web URL, dialogs, assets, og images, bibliography, `/data-sources/`: `lang`, h1, footer link, 11 hreflang alternates, the DOI link, every row equal to the source file in order and count, the file against its meta and the meta against the installed index entry, the used and held source credits in order and nothing internal, `source_credits.tsv` present exactly when the installed index lists it and equal to its sha256, assets; no leaked contact address; the climate tiles required: the index present, the pinned grid, every listed tile with its size and sha256 and no install mark in `dist`, through `verifyClimateInstall`, and one grid for the plant ranges and the tiles through [consortium-grid-check.mjs](../../scripts/consortium-grid-check.mjs); the P5 budgets (the island with the slot shells ≤ 62 KB, the feature chunks of `P5_FEATURE_ENTRIES` ≤ 30 KB together, location ≤ 20 KB, MapLibre with its worker and CSS ≤ 330 KB, none modulepreloaded, location and MapLibre absent until S5b, found through the build's chunk roles in `dist/consortium-chunks.json` (`chunkRoles`, `readChunkRoles`), never by file name) through `onDemandChunks`, no feature chunk in the first run, and `#ct-climate` on every tool page naming the installed tiles, no hashes, ≤ 2 KB gzip) and each Field Guide in en and fr (hreflang en/fr/x-default only, Article JSON-LD, glance, bibliography link, internal links and #ids, no stray scripts on non-interactive guides, no unrendered components, crop-table cells labelled for phones and their note naming only shown columns), the consortium tool (title and h1 per locale, hreflang with `/fr/consortium/`, no `/fr/guilde/` built or linked from any built page, `#ct-root` and `#ct-data` carrying the index's release, database and climates, the noscript guide link, lede and loading line, the installed data re-checked by `verifyInstall` against the index with a real `canopi_db_sha256` and no v1 file served, the header marking it current through `consortiumPath`, the "Data release r-…" line under the tool, its links and assets), /privacy/ in every locale (lang, h1, header, Nominatim/OpenFreeMap/Cloudflare named, 11 hreflang alternates, in the sitemap, and the footer link from the home, data sources, tool and privacy pages), and the navigation (inline header and phone Menu links in every locale, the consortium tool among them, no inline Discord or Docs, `aria-current` on Guides/Books, the home page's hero proof line and editions note, the captures in each language and theme, the design list, the Learn and try section (food-forest, living-soil and landrace-gardening, the guides index and the tool) after the featured design, and the footer link, guides and bibliography linking each other and mentioning the tool, every guide preset link opening the tool with a plant placed in its climate) | by hand after build |
| [check-bibliography-links.mjs](../../scripts/check-bibliography-links.mjs) | visits every bibliography link (network) | `npm run check:bibliography` |
| `*.test.mjs` | correction (the `/api/correction` handler: limits, codes, the mail and its JSON block), source-credits (the parser and the page's licence words), try-references (the shipped list against its meta, the meta against the installed index entry, a mismatch failing, each parser refusal, which urls link, the citation verbatim, the installed database's `sources` row `try`), consortium-boundary (the core imports only its own files and no browser global; the island reaches it through index, types or source), consortium-load (the island's byte checks: whole body, empty, gzip magic, digests), consortium-canopi-file (the `.canopi` v9 file against the vendored app schema), consortium-memory (S4's arrival order, country, share state and URL, country guess, crop examples on the real data), consortium-css (consortium styles: breakpoints 639/960 only, a green only in strata tokens or selectors naming a stratum), browser-tests (one browser test file per stream, names and todo owners, BT-1…9 present, the P5 file's `P5-n (S5x …)` specs todo for their own stream), built-modules (the on-demand chunk groups), consortium-grid-check (match, mismatch, missing or empty sha, status not matched), consortium-p5-seams (the P5 stubs, store signals and Start slots), consortium-p5-seams-s5f (the GBIF credit against the installed export's meta, the tool credits' rows and refusals, the privacy and tool-credit strings in all 11 locales inside S5f's block, French says guilde), canopi-design-format (the vendored app format and its schema reader), contact, featured-designs privacy, homepage/i18n (header keys, width queries only 639/640/959/960 plus the 1200px hero-image query (the named `plants` container query of the plant list is the one exemption), no header item hidden by width except the inline/Menu swap, the menus chrome.js closes, the consortium tool's header word and full name per locale, the home note against the index's climates, the header's global styles, the consortium keys' places), installer, guides (content rules, related lists, glossary, crop table, safety wording and mouth words only inside `<Safety>` boxes, checklist and glossary plugins, shared `wrap()`, mix bar, breakpoints, colours and fonts), guides-consortium (the preset links of `try-consortium.ts` on the installed index and their build failures; every `<TryConsortium>` preset: plant in the beta cell of its climate, climate from its `<ForClimate>` block and last in it, same presets in en and fr; a guide name for every cell), built-links, install-consortium (format 4 on the v2 fixture: each refusal with nothing written, the index, the src/data/ files of a real install only, `--out` and staging, `canopi release verify` through a stub and a fake `uv`, `--fixture` kept off the site, photos through a stub fetch named by plant and digest, `verifyInstall` on the committed install), package (declared static and dynamic imports, Node floor, the type check's tsconfig excludes and `check` script) | `npm test` |
| [maplibre-notices.mjs](../../scripts/maplibre-notices.mjs) | writes the MapLibre block of `THIRD_PARTY_NOTICES.md` (maplibre-gl and its locked dependency tree, versions, licences, shipped licence texts or the README licence section) from `package-lock.json` and a `node_modules` dir | by hand after a maplibre-gl update |
| [built-links.mjs](../../scripts/built-links.mjs) | `builtTarget(root, pathname)`: resolves an internal link to a built file; a path without trailing slash or extension is an error. `subdirectories(dir)`: folder names only (the guide slugs; a stray `.DS_Store` is not a guide) | `check-built-site.mjs` |
| [fixtures/consortium-v2/make-fixture.mjs](../../scripts/fixtures/consortium-v2/make-fixture.mjs) | writes the invented format 4 consortium fixture (38 plants in Tropical, Mediterranean and Temperate, gzipped SQLite built with `node:sqlite` from canopi-data's DDL, with its manifest, sums, TRY list and credits; deterministic) and the broken variants the installer test needs; never shipped | `node scripts/fixtures/consortium-v2/make-fixture.mjs [dir]`, see its README |
| [browser/](../../scripts/browser) | `serve.mjs` (wrangler dev on 4420–4498 over `dist-test/` by default, the production `dist/` on request, stopped by pid), `harness.mjs` (puppeteer-core with the system Chrome, 390/1280 px, light/dark), `helpers.mjs`, and one test file per owner: `consortium-commit0.browser.test.mjs` (probes P1–P3, P6, the BT-9 load screens), `consortium-s1…s4.browser.test.mjs` (each stream's §7 tests) and `consortium-seams.browser.test.mjs` (tests across streams); `consortium-timing.mjs` (§8 cold/warm timing, on demand only, not a test); see [Consortium page](/modules/consortium-page.md) | `npm run test:browser` after a build, capped; never in `npm test` |
| [export-featured-designs.py](../../scripts/export-featured-designs.py) | `.canopi` files to privacy-safe `public/data/featured-designs.json` | by hand |
| [compress-heroes.py](../../scripts/compress-heroes.py), [make-og-images.py](../../scripts/make-og-images.py) | hero JPGs (2400 and 1200 px); 1200x630 social images (painting with the logo and wordmark on a parchment label inside the centre 630 px square, each ≤ 250 KB for WhatsApp) and `public/apple-touch-icon.png`; bump `?v=` on `ogImage` in `Base.astro` when they change, since messaging apps cache by image URL | by hand (Pillow + Inkscape) |

# Interfaces

- `installConsortium({ exportDir, outDir, fixture, images, fetchImpl, delayMs, backoffMs, maxFailedShare, stagingDir })`; the CLI takes `<export-dir> [--fixture [--no-images]] [--out <dir>]` (`--no-images` only with `--fixture`; `--out` must be absent, empty or a previous install; staging in the git-ignored `.cache/consortium-install/`).
- `installWebEdition({ archivePath, ... })`, reading `CANOPI_WEB_EDITION_ARCHIVE`; `CANOPI_WEB_EDITION_REQUIRED=0` skips when unset.
- `featured-designs.json` (design list and public details) and `featured-roles.json` are inputs to the exporter; `featured-files.local.json` (git-ignored) maps ids to local files.

# Dependencies

- [src/lib](/modules/src-lib.md) and [src/data](/modules/src-data.md) (tests and checks read them); Node built-ins plus `js-yaml` (declared devDependency; guide frontmatter in `guides.test.mjs`); `parse5`, `domhandler`, `css-select` and `dom-serializer` (declared devDependencies, once the small DOM of the v1 consortium harness, deleted at P2 commit 0); `puppeteer-core` (devDependency, pinned, the browser tests; uses the system Chrome); run every test under a memory cap; `npm run check` uses `typescript` (a runtime dependency since P5 commit 0: the climate integration compiles `tiff.ts` with it on Node 22.13–22.17) and the devDependency `@astrojs/check`, after `wrangler types`; `maplibre-gl` 6.10.0 is pinned exactly for S5b's map (no install scripts in the lockfile; not imported yet); Python scripts need Pillow and SQLite. Tests import `.ts` data files directly, so `npm test` passes `--experimental-strip-types` (Node 22.13, the engines floor, does not strip types by default).

# Gotchas

- The installer validates the `/app/` artifact contract only (manifest, checksums, Cloudflare limits, filter metadata, no raw DuckDB WASM); it is not valid for the root `web.projectcanopi.com` artifact.
- The exporter writes metres from the design centre and a pin rounded to 0.1 degree; `featured-designs.test.mjs` enforces the allowed fields. Publish a design only with its owner's consent.
- Hero PNG originals stay outside git.
