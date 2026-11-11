---
type: Module
title: Consortium page
description: "The consortium v2 page in 11 locales: the static Astro shell, the Preact island's store, strings, load screens and view slots, the build setup for JSX and sqlite-wasm, and its built-site and browser checks."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T03:15:34Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:31:32Z }
  - { by: okf-cli/0.1.0, at: 2026-11-10T18:09:34Z }
sources:
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:b5e0c1b87a92828f
    last_modified: 2026-11-11T03:07:08Z
  - id: main-ts
    resource: ../../src/islands/consortium/main.ts
    title: src/islands/consortium/main.ts
    digest: sha256:0a0c3878707b9867
    last_modified: 2026-11-11T03:13:35Z
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
    digest: sha256:c315ed731f598be1
    last_modified: 2026-11-11T03:07:08Z
  - id: load-ts
    resource: ../../src/islands/consortium/data/load.ts
    title: src/islands/consortium/data/load.ts
    digest: sha256:1a2a835433e1774d
    last_modified: 2026-11-11T03:13:35Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:ac73c370f113ee46
    last_modified: 2026-11-11T03:07:08Z
  - id: astro-config-mjs
    resource: ../../astro.config.mjs
    title: astro.config.mjs
    digest: sha256:538d0016c5c7c98f
    last_modified: 2026-11-11T03:07:08Z
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
    digest: sha256:280f7f2910bb83d2
    last_modified: 2026-11-11T02:58:29Z
  - id: serve-mjs
    resource: ../../scripts/browser/serve.mjs
    title: scripts/browser/serve.mjs
    digest: sha256:db4dfd85f9c8d217
    last_modified: 2026-11-11T03:13:35Z
  - id: harness-mjs
    resource: ../../scripts/browser/harness.mjs
    title: scripts/browser/harness.mjs
    digest: sha256:27a485eb6b79a26f
    last_modified: 2026-11-11T03:13:35Z
  - id: consortium-browser-test-mjs
    resource: ../../scripts/browser/consortium.browser.test.mjs
    title: scripts/browser/consortium.browser.test.mjs
    digest: sha256:b55dcda7bc95a0f2
    last_modified: 2026-11-11T03:13:35Z
enforced_by:
  - scripts/check-built-site.mjs
  - scripts/browser/consortium.browser.test.mjs
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
| [ConsortiumPage.astro](../../src/components/consortium/ConsortiumPage.astro) | The static shell (S4 owns it after commit 0). It renders: title and Beta; the lede (`home.consortium.lede`); `betaNote` counting the index's climates; the feedback and data-sources links; the `noscript` callout with the food-forest guide link; an inline head script setting `#ct-head[data-opens]` (`link` for `#v=4`, `preset` for `?plant=&climate=`, else `start`); `#ct-root` with the loading line (`consortium.loadingTool`, `aria-busy`); and the release line. `#ct-data` carries `{ lang, strings (every consortium.* key without prefix), releaseId, db { url, sha256, bytes }, climates (lowercase), images, guide }`, all from `src/data/consortium-index.json`. The page script runs `initChrome()` first, then `import()`s main.ts |
| [main.ts](../../src/islands/consortium/main.ts) | Reads `#ct-data`, sets the strings, renders App into `#ct-root` and opens the database at once. `data/load.ts` is a dynamic import (its own chunk with the sqlite-wasm glue, outside the §8 60 KB budget), retried after a failed import |
| [store.ts](../../src/islands/consortium/store.ts) | The frozen signals of §6. State: `climate`, `country{code,source}`, `site` (`DEFAULT_SITE`: all four `unsure`), `crops`, `members`, `kept`, `removed`, `guests`, `view`, `stage`, `sheet{kind,id}`, `load{status,error}`. Data: `source`, `pools`. Computed: `pool`, `matrix`, `flags` (S1 fills their bodies) |
| [strings.ts](../../src/islands/consortium/strings.ts) | `setStrings`, `T(key, vars)`, `P(key, n, vars)` with v1's plural form `one: # x \| other: # xs`; the page uses `P` at build time for the beta note |
| [App.tsx](../../src/islands/consortium/App.tsx) | The §5 screens from `load` (`data-load-error`). Retry: `fetch`, `damaged`. Reload: `stale`, `schema`. Guide link only: `too-old`, `wasm-blocked`. View slots `Start` (S4), `Matrix` (S2) and `Details` (S3) are modules exporting null until their stream fills them, so streams never edit App.tsx |
| [data/load.ts](../../src/islands/consortium/data/load.ts) | Minimum loader, owned by S1 from here. Steps: `tooOld()` (no DecompressionStream) and `wasmMissing()` (P5); fetch (404 → `stale`); `DecompressionStream` only when the first bytes are `1f 8b` (P3); sqlite-wasm init with a 15 s timeout; `sqlite3_deserialize` FREEONCLOSE\|READONLY; then `application_id`, `user_version`, `meta.release_id` and the climates checked against the page (`schema`) |
| [views/](../../src/islands/consortium/views/), [data/sqlite-source.ts](../../src/islands/consortium/data/sqlite-source.ts) | Stream stubs |
| [base.css](../../src/styles/consortium/base.css) | Under `.ct`: strata colours and inks (the mockups' Okabe-Ito), `--hatch`/`--hatch-fill`, `--bar`, `--cell-*` (desktop 96×56, phone 41×40, head 196 px, 140 below 1200 px), dark values, and the shell styles. Breakpoints 639/960 are written out per file. Stubs `matrix.css` (S2), `details.css` (S3), `shell.css` (S4) |
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

# Checks

- [check-built-site.mjs](../../scripts/check-built-site.mjs), on every locale page:
  - the title, `#ct-root`, `#ct-data` with the index's release, db and climates;
  - the release line;
  - noscript with a guide link, the lede and the loading line;
  - hreflang, header and links;
  - then `verifyInstall` on the served data, a real `canopi_db_sha256`, and no v1 file or index served.
- [consortium.browser.test.mjs](../../scripts/browser/consortium.browser.test.mjs), via `npm run test:browser` (after `npm run build`, capped; never in `npm test`):
  - harness: `serve.mjs` runs wrangler dev on 4420–4428 with the inspector on the next port, in its own process group, stopped by pid; `harness.mjs` drives the system Chrome through puppeteer-core at 390/1280 px, light/dark, with `canopi-theme` set before navigation;
  - request interception serves the fixture or broken copies (404, corrupt, `user_version` 2), and the harness can remove WebAssembly;
  - commit 0 tests: P1 (515 plants counted in the page from the one hashed wasm), P2 (`application/wasm`, immutable headers), P3 (gzip magic, no content-encoding), P6 (JS-off shell), and a mount with no head shift;
  - BT-1…BT-9 of design check §7 are todo, each named with its owner stream. BT-9's four failure screens already pass.

# Gotchas

- P7: the JSX scope alone leaves every other page byte-identical (checked after the pins commit). Deleting app.js drops one export from the shared `chrome` chunk, so that chunk's hash, and the `<script src>` of every page, change. The page contents are otherwise identical.
- `#ct-data` still carries all ~580 `consortium.*` strings. After S4, the main agent prunes the old keys (§6).
