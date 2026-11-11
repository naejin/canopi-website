---
type: Module
title: Consortium page
description: "The consortium v2 page in 11 locales: the static Astro shell, the Preact island's store, strings, load screens and view slots, the build setup for JSX and sqlite-wasm, and its built-site and browser checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T03:50:28Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:31:32Z }
  - { by: okf-cli/0.1.0, at: 2026-11-10T18:09:34Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:56ea999956b38996
    last_modified: 2026-11-11T03:33:26Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:4ea8d26ea8944d8d
    last_modified: 2026-11-11T03:28:04Z
  - id: store-ts
    resource: ../../src/islands/consortium/store.ts
    title: src/islands/consortium/store.ts
    digest: sha256:d53def1d24a40c72
    last_modified: 2026-11-11T03:07:08Z
  - id: strings-ts
    resource: ../../src/islands/consortium/strings.ts
    title: src/islands/consortium/strings.ts
    digest: sha256:8addee8c613ecee8
    last_modified: 2026-11-11T03:07:08Z
  - id: app-tsx
    resource: ../../src/islands/consortium/App.tsx
    title: src/islands/consortium/App.tsx
    digest: sha256:b026dc82a5d43528
    last_modified: 2026-11-11T03:33:26Z
  - id: load-ts
    resource: ../../src/islands/consortium/data/load.ts
    title: src/islands/consortium/data/load.ts
    digest: sha256:fbf72e1d3a1c0c26
    last_modified: 2026-11-11T03:28:04Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:84702b124da66ce1
    last_modified: 2026-11-11T03:33:26Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:c38dfb419e140dd4
    last_modified: 2026-11-11T03:28:04Z
  - id: headers
    resource: ../../public/_headers
    title: public/_headers
    digest: sha256:19316294c48f0254
    last_modified: 2026-11-11T02:40:28Z
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:ed10710e2f21129d
    last_modified: 2026-11-11T03:13:35Z
  - id: consortium-guides-ts
    resource: ../../src/data/consortium-guides.ts
    title: src/data/consortium-guides.ts
    digest: sha256:f7e2fc8ce6d55b8c
    last_modified: 2026-10-28T09:57:25Z
  - id: check-built-site-mjs
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:2538db48b2f7133b
    last_modified: 2026-11-11T03:28:04Z
  - id: serve-mjs
    resource: ../../scripts/browser/serve.mjs
    title: scripts/browser/serve.mjs
    digest: sha256:8fdc621be2f68b1b
    last_modified: 2026-11-11T03:49:07Z
  - id: harness-mjs
    resource: ../../scripts/browser/harness.mjs
    title: scripts/browser/harness.mjs
    digest: sha256:884c87ba9ee40d8c
    last_modified: 2026-11-11T03:47:58Z
  - id: consortium-commit0-browser-test-mjs
    resource: ../../scripts/browser/consortium-commit0.browser.test.mjs
    title: scripts/browser/consortium-commit0.browser.test.mjs
    digest: sha256:dd4d9259379effa3
    last_modified: 2026-11-11T03:35:39Z
  - id: browser-tests-test-mjs
    resource: ../../scripts/browser-tests.test.mjs
    title: scripts/browser-tests.test.mjs
    digest: sha256:dbe5436d6b5380cf
    last_modified: 2026-11-11T03:37:35Z
  - id: bytes-ts
    resource: ../../src/islands/consortium/data/bytes.ts
    title: src/islands/consortium/data/bytes.ts
    digest: sha256:dfcf383316c99483
    last_modified: 2026-11-11T03:28:04Z
  - id: built-modules-mjs
    resource: ../../scripts/built-modules.mjs
    title: scripts/built-modules.mjs
    digest: sha256:13a32232086a803a
    last_modified: 2026-11-11T03:28:04Z
enforced_by:
  - scripts/check-built-site.mjs
  - scripts/browser/consortium-commit0.browser.test.mjs
  - scripts/browser-tests.test.mjs
---

# Responsibility

The consortium tool's page, `/consortium/` and `/{lang}/consortium/` in 11 locales (French included; `/fr/guilde/` was never published). Since P2 commit 0 (branch `consortium/integration`) it is the v2 shell:
- Astro renders a static page;
- a Preact 11 island, mounted from the page script, renders the tool ([architecture](/decisions/consortium-v2-architecture.md), design check A1);
- all plant logic comes from the [Consortium core](/modules/consortium-core.md).

The v1 tool (app.js and its tests) was deleted in commit 0. Its full description is this concept at commit `f8e59ba`.

# Key files

| File | Role |
|---|---|
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | The static shell (S4 owns it after commit 0). It renders: title and Beta; the lede (`home.consortium.lede`); `betaNote` counting the index's climates; the feedback and data-sources links; the `noscript` callout with the food-forest guide link; an inline head script setting `#ct-head[data-opens]` (`link` for `#v=4`, `preset` for `?plant=&climate=`, else `start`); `#ct-root` with the loading line (`consortium.loadingTool`, `aria-busy`); and the release line. A `<link rel="preload" as="fetch" crossorigin>` for the database goes into Base's `head` slot (A2). `#ct-data` carries `{ lang, strings (every consortium.* key without prefix, the `consortium.block.*` markers left out), releaseId, db { url, sha256, bytes, rawSha256, rawBytes }, climates (lowercase), images, guide }`, all from `src/data/consortium-index.json`. The page script runs `initChrome()` first, then `import()`s main.ts |
| [main.ts](../../src/islands/consortium/main.ts) | Reads `#ct-data`, sets the strings, renders App into `#ct-root` and opens the database at once. `data/load.ts` is a dynamic import (its own chunk with the sqlite-wasm glue, outside the §8 60 KB budget), retried after a failed import. S1 owns it from the follow-up. A loader chunk that fails to import is `stale` (Reload) while `navigator.onLine`, else `fetch` (review B2) |
| [store.ts](../../src/islands/consortium/store.ts) | The frozen signals of §6. State: `climate`, `country{code,source}`, `site` (`DEFAULT_SITE`: all four `unsure`), `crops`, `members`, `kept`, `removed`, `guests`, `view`, `stage`, `sheet{kind,id}`, `load{status,error}`. Data: `source`, `pools`. Computed: `pool`, `matrix`, `flags` (S1 fills their bodies) |
| [strings.ts](../../src/islands/consortium/strings.ts) | `setStrings`, `T(key, vars)`, `P(key, n, vars)` with v1's plural form `one: # x \| other: # xs`; the page uses `P` at build time for the beta note |
| [App.tsx](../../src/islands/consortium/App.tsx) | Frozen. The §5 screens from `load` (`data-load-error`, `role=alert`). Retry: `fetch`, `damaged`. Reload: `stale`, `schema`. Guide link only: `too-old`, `wasm-blocked`. Slots in page order: `Start` (S4), `Matrix` (S2; routes the side view, Jobs and plant list from `store.view`), `Actions` (S4; Share, Download, Print, link notices; after the matrix once ready), `Details` (S3; routes `store.sheet`). Each is a module exporting null until its stream fills it, so streams never edit App.tsx |
| [data/load.ts](../../src/islands/consortium/data/load.ts), [data/bytes.ts](../../src/islands/consortium/data/bytes.ts) | Minimum loader, owned by S1. Steps: `tooOld()` (no DecompressionStream) and `wasmMissing()` (P5); fetch (404 → `stale`); the body read whole (`bytes.ts` `decodeDatabase`: empty → `damaged`; gzip magic from the buffer; sha256 and size of the gzipped file, or of the raw database when the server already decoded it (P3), checked with SubtleCrypto where present → `damaged`; inflate with DecompressionStream); sqlite-wasm init with a 15 s timeout; `sqlite3_deserialize` FREEONCLOSE\|READONLY; then `application_id`, `user_version`, `meta.release_id` and the climates checked against the page (`schema`). `scripts/consortium-load.test.mjs` tests `bytes.ts` in Node |
| [views/](../../src/islands/consortium/views/), [data/sqlite-source.ts](../../src/islands/consortium/data/sqlite-source.ts) | Stream stubs |
| [base.css](../../src/styles/consortium/base.css) | Under `.ct`: strata colours and inks (the mockups' Okabe-Ito), `--hatch`/`--hatch-fill`, `--bar`, `--cell-*` (desktop 96×56, phone 41×40, head 140 px, 196 px from 960 px; no other tier), dark values, and the shell styles. Breakpoints 639/960 are written out per file. Stubs `matrix.css` (S2), `details.css` (S3), `shell.css` (S4) |
| [consortium-guides.ts](../../src/data/consortium-guides.ts) | Guides per plant, per job and for the explanations (unchanged from v1; S4's) |

**Kept unimported for the streams' ports (design check §2; `tsconfig.json` excludes them):**
- `src/scripts/consortium/{side,draw,layers,correction,scale,parts,crops,words,memory,logic}.js`;
- `src/styles/consortium.css`.
- `logic.js` still re-exports `safeHref`, now in `src/lib/safe-href.js`.

# Build setup

- **JSX:** `astro.config.mjs` scopes JSX to `src/islands/consortium/**/*.tsx` with its own pre-plugin (`canopi:consortium-jsx`) and excludes those files from `vite:esbuild`, whose `include` would otherwise decide which .ts files compile at all. Each .tsx file starts with `/** @jsxImportSource preact */` for `astro check`. This deviates from A1's literal `esbuild.include` snippet, which would break every other .ts file.
- **One wasm:** `canopi:sqlite-main-thread-only` splits two string literals in sqlite-wasm's browser build so Vite cannot see them: the Worker #1 promiser's `new Worker(new URL('sqlite3-worker1.mjs'))` and the OPFS proxy's URL. Otherwise Vite bundles a worker with a second glue and a second 879 KB wasm. The build ships one `sqlite3.<hash>.wasm`, found by the package's own `new URL('sqlite3.wasm', import.meta.url)`, with no `locateFile`. The plugin throws if a sqlite-wasm upgrade changes those literals.
- **Pins:** `optimizeDeps.exclude` holds `@sqlite.org/sqlite-wasm`. Exact pins: preact 11.0.1, @preact/signals 2.11.3, @sqlite.org/sqlite-wasm 3.54.1-build1, puppeteer-core 25.16.0 (dev).
- **Caching:** `public/_headers` makes `/_astro/*` and `/data/consortium/*` `public, max-age=31536000, immutable`; the DB and photos carry digests in their names. Other paths keep the default `max-age=0, must-revalidate`.
- **Preloads (A2):** the `canopi:consortium-modulepreload` integration in `astro.config.mjs` runs after the build: on each page holding `#ct-root` it adds a `<link rel="modulepreload">` for every chunk of the page's import graph not already a `<script src>` (chrome, main, the loader with the glue), found by [built-modules.mjs](../../scripts/built-modules.mjs). Other pages are untouched (P7: identical modulo asset hashes). `src/layouts/Base.astro` has a `head` slot for the page's DB preload.

# Checks

- [check-built-site.mjs](../../scripts/check-built-site.mjs), on every locale page:
  - the title, `#ct-root`, `#ct-data` with the index's release, db and climates;
  - the release line;
  - noscript with a guide link, the lede and the loading line;
  - hreflang, header and links;
  - then `verifyInstall` on the served data, a real `canopi_db_sha256`, and no v1 file or index served.
  - exactly one `sqlite3.<hash>.wasm` and no `sqlite3-worker1`/`opfs-async-proxy` file anywhere (review B4);
  - §8: the island's JavaScript through the built import graph, without the chunk holding the sqlite glue, under 60 KB gzip -9 (12.3 KB at the follow-up), and on every locale page the DB preload and a modulepreload for each chunk.
- Browser tests, via `npm run test:browser` (after `npm run build`, capped; never in `npm test`), one file per owner (review C1), enforced by [browser-tests.test.mjs](../../scripts/browser-tests.test.mjs) in `npm test`:
  - [consortium-commit0.browser.test.mjs](../../scripts/browser/consortium-commit0.browser.test.mjs), no todo: P1 (515 plants counted in the page from the one hashed wasm), P2 (`application/wasm`, immutable headers), P3 (gzip magic, no content-encoding), P6/BT-9 JS-off shell, a mount with no head shift, and the BT-9 load screens with their buttons (DB 404, corrupt, wrong digest, empty body, `user_version` 2, WebAssembly off, loader chunk 404 online and offline) at all four variants;
  - `consortium-s1…s4.browser.test.mjs`: each stream's §7 tests in full (BT-1 data and start halves, BT-2…BT-8, BT-9 `.canopi` against the vendored app schema, BT-5 offline correction, the exit walk-through), todo and named for their stream until it builds them;
  - harness: [serve.mjs](../../scripts/browser/serve.mjs) runs wrangler dev on 4420–4428 with the inspector on the next port, in its own process group, stopped by pid; it counts the server up only when it serves a random marker file written into the build for this run (review B5), and kills its group if the process ends early. [harness.mjs](../../scripts/browser/harness.mjs) drives the system Chrome through puppeteer-core at 390/1280 px, light/dark (stored theme and emulated `prefers-color-scheme`), 4 s waits. Options: `data: 'fixture'`, `database` variants, `photos`, `wasm: false`, `loader: 404 | 'offline'`, `storage: false`, `correction` stub (`page.correctionPosts`), `page.capturedDownloads()`, `pdf(page)`. [helpers.mjs](../../scripts/browser/helpers.mjs): variants, accessibility-tree readers, node:sqlite reads of the real and fixture databases.

# Gotchas

- P7: the JSX scope alone leaves every other page byte-identical (checked after the pins commit). Deleting app.js drops one export from the shared `chrome` chunk, so that chunk's hash, and the `<script src>` of every page, change. The page contents are otherwise identical.
- `#ct-data` still carries all ~580 `consortium.*` strings. After S4, the main agent prunes the old keys (§6).
