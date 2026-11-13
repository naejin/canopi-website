---
type: Runbook
title: Build and test
description: How to install, build, test, and verify the marketing site before pushing to master.
tags: [runbook, build, test]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:43Z }
verified:
  - { by: claude/opus-5.5, at: 2026-11-06T00:33:36Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:47Z }
sources:
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:cd62373a66839519
    last_modified: 2026-11-13T06:49:01Z
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:18790192849df669
    last_modified: 2026-11-06T14:34:09Z
  - id: check-built-site
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:d93324757e80faab
    last_modified: 2026-11-13T12:00:16Z
  - id: tsconfig-json
    resource: ../../tsconfig.json
    title: tsconfig.json
    digest: sha256:1936df82d865a497
    last_modified: 2026-11-11T13:27:12Z
  - id: expect-fail-mjs
    resource: ../../scripts/expect-fail.mjs
    title: scripts/expect-fail.mjs
    digest: sha256:94544e6efe25bcaa
    last_modified: 2026-11-13T03:03:27Z
  - id: pre-push
    resource: ../../.githooks/pre-push
    title: .githooks/pre-push
    digest: sha256:02956cb778d95bb8
    last_modified: 2026-11-13T03:34:49Z
  - id: pre-commit
    resource: ../../.githooks/pre-commit
    title: .githooks/pre-commit
    digest: sha256:38aa2d7737c93c66
    last_modified: 2026-11-13T03:21:28Z
  - id: node-version
    resource: ../../.node-version
    title: .node-version
    digest: sha256:4137094e7792cb49
    last_modified: 2026-11-13T03:21:28Z
  - id: run-mjs
    resource: ../../scripts/browser/run.mjs
    title: scripts/browser/run.mjs
    digest: sha256:3f6998d9e40d3983
    last_modified: 2026-11-12T22:04:52Z
  - id: ratchet-mjs
    resource: ../../scripts/quality/ratchet.mjs
    title: scripts/quality/ratchet.mjs
    digest: sha256:e17849e2a8d92e75
    last_modified: 2026-11-13T03:41:34Z
  - id: axe-smoke-mjs
    resource: ../../scripts/browser/smoke/axe.smoke.mjs
    title: scripts/browser/smoke/axe.smoke.mjs
    digest: sha256:bbf6211852cf8a8f
    last_modified: 2026-11-13T03:26:34Z
  - id: climate-vectors-test-mjs
    resource: ../../scripts/climate-vectors.test.mjs
    title: scripts/climate-vectors.test.mjs
    digest: sha256:5a5ac310e04b365c
    last_modified: 2026-11-13T03:45:14Z
  - id: version-json-ts
    resource: ../../src/pages/version.json.ts
    title: src/pages/version.json.ts
    digest: sha256:9774b792a9af6f35
    last_modified: 2026-11-13T03:21:28Z
  - id: sgconfig-yml
    resource: ../../sgconfig.yml
    title: sgconfig.yml
    digest: sha256:2c703f0a6786cc90
    last_modified: 2026-11-13T06:47:29Z
  - id: rules-test-mjs
    resource: ../../scripts/quality/ast-grep/rules.test.mjs
    title: scripts/quality/ast-grep/rules.test.mjs
    digest: sha256:9a944293ae6767b0
    last_modified: 2026-11-13T06:47:29Z
  - id: number-format-only-in-format-typescript
    resource: ../../scripts/quality/ast-grep/rules/number-format-only-in-format.typescript.yml
    title: scripts/quality/ast-grep/rules/number-format-only-in-format.typescript.yml
    digest: sha256:6265d1a1b944e5fe
    last_modified: 2026-11-13T06:47:29Z
  - id: timing-json
    resource: ../../scripts/browser/timing.json
    title: scripts/browser/timing.json
    digest: sha256:eac4e0b9cfa86a83
    last_modified: 2026-11-13T11:02:09Z
enforced_by:
  - scripts/package.test.mjs
  - sgconfig.yml
  - scripts/quality/ast-grep/rules.test.mjs
---

# When to use

Setting up a working copy, building, and running checks before pushing to `master`. A push to master runs CI; a green `gate` moves the `deploy` branch, which Cloudflare builds as production (switched 2026-11-13). See [CI, hooks and the deploy gate](/runbooks/ci-and-deploy-gate.md).

# Steps

Node >= 22.13.0 (`node:sqlite` without a flag); `.node-version` pins 22.22.0 for CI and Workers Builds. Hooks: run `git config core.hooksPath .githooks` once in the main checkout (`npm run hooks:install` prints it); `.githooks/pre-commit` runs ast-grep on staged scripts, `.githooks/pre-push` runs `npm run check`, `npm test` and `npm run check:arch` (skipped for documentation-only ranges) and the zero-marker check on master pushes (`.githooks/zero-markers`: `warn` today).

| Purpose | Command |
|---|---|
| install | `npm install` |
| dev server (port 4321) | `npm run dev` |
| unit/regression tests | `npm test` (`node --experimental-strip-types --test scripts/*.test.mjs scripts/quality/*.test.mjs scripts/quality/ast-grep/*.test.mjs`, so it runs on Node 22.13; `scripts/quality/` holds the ratchet's and the layer rules' own tests, `scripts/quality/ast-grep/rules.test.mjs` the ast-grep rules' file scopes) |
| ast-grep code rules | `node_modules/.bin/ast-grep scan` (config `sgconfig.yml`, rules in `scripts/quality/ast-grep/rules/`; CI job 1 and the pre-commit hook on staged files); `ast-grep test` runs each rule's snippets in `scripts/quality/ast-grep/rule-tests/`. One rule so far, `number-format-only-in-format` (E6 Q2; one file per language, typescript, tsx, javascript): no `Intl.NumberFormat` under `src/islands/consortium/**` or `src/lib/**` except `src/islands/consortium/format.ts`; views take `num` from `views/kit/names.ts`. The rest of the site is out of scope |
| quality ratchets | `npm run check:arch` (dependency-cruiser layer rules L1–L9, `.dependency-cruiser.cjs`), `npm run check:dup` (jscpd, `.jscpd.json`), `npm run check:dead` (knip, `knip.json`), each through `scripts/quality/ratchet.mjs` against `scripts/quality/baselines/<tool>.json`: a new finding warns locally and fails in CI (`--ci` or `CI=true`), a gone one prints "baseline stale"; an `error` arch rule fails everywhere; a crash or empty scan fails; only the merge agent rewrites a baseline (`--write`); run capped (`MemoryMax=2G`) |
| climate vectors | `npm run test:vectors` (`scripts/climate-vectors.test.mjs`, also part of `npm test`): canopi-climate v0.2.1's committed `lookup.json` against its sha256 and grid pins, then its 54 points through the reader on the installed grid; skips without the grid unless `CANOPI_REQUIRE_VECTORS=1` (CI); see [Climate reader](/modules/climate-reader.md) |
| accessibility smoke (after `npm run build`) | `npm run test:axe` (`scripts/browser/smoke/axe.smoke.mjs`: axe-core WCAG 2.x A/AA on the production `dist/`, both themes at 1280 px plus the filled consortium at 390 px, counts compared with `scripts/quality/baselines/axe.json`; `CANOPI_AXE_WRITE=1` rewrites it, merge agent only); capped `MemoryMax=2G` |
| expected-fail markers | `node scripts/expect-fail.mjs` lists them (owner, file, title); `--zero` fails while any is left (E6's exit; no push to master with markers) |
| type check | `npm run check` (`wrangler types` writes the gitignored `worker-configuration.d.ts`, then `astro check` type-checks `.ts`, `.js` and `.astro` files; MDX is not checked) |
| marketing build | `npm run build` (`astro build`; the `climateTiles` integration installs the climate tiles first in every `astro build`, whatever command Cloudflare Workers Builds runs; a build without network needs `CANOPI_CLIMATE_ARCHIVE` or a warm cache) |
| built-site check | `node scripts/check-built-site.mjs` |
| bibliography links (network, by hand) | `npm run check:bibliography` |
| browser tests (after a build; never in `npm test`) | `timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser` (it runs `npm run build:browser-test` first: `CANOPI_BROWSER_TEST=1 astro build`, which compiles in the `window.__ctTest` hook through the `__CT_TEST_HOOK__` constant defined from that flag only, into its own `dist-test/` (gitignored), so `dist/` only ever holds the production build): wrangler dev on 4420 (`CANOPI_BROWSER_PORT`, 4420–4498), headless system Chrome (`CANOPI_CHROME`, default `/usr/bin/google-chrome`) through puppeteer-core; one file per owner (`browser-tests.test.mjs` enforces the policy: no `skip` and no `.todo()`/`.skip()` anywhere; no `todo:` option either, except in a P5 stream file `consortium-p5-s5b/-s5c/-s5d/-s5f`, where a test may carry `todo: 'S5x: …'` naming that file's own stream only; S5e's todo specs wait outside the run in `pending/`; no spec or helper sleeps over 1 s, by literal or by a named value in the file, and only the harness sets `window.__ctTest` (`hook: true`); E6's specs in `consortium-e6{,-r4}` are `failing()` calls from `scripts/expect-fail.mjs` instead, each passing only while it fails for its marked reason, until its owner stream makes it pass and turns it into `test()`)); `scripts/browser/run.mjs [--list local|ci] [--shard N] [--slots K] [--no-scope] [-- <node --test args>]`: `--list local` (default) runs the 3 local shard lists of `shards.json` in parallel, at most K slots (default 3), fewer when memory is short (min(K, floor((MemAvailable − 3 GB) / 2 GB)), at least 1), each file in its own 2 GB scope, ports 8 apart per slot, and prints each file's and shard's time and memory peak (about 4 min wall); `--list ci --shard N` runs one of the 4 CI lists (`npm run test:browser:shard -- N`, unscoped); a failed test leaves console, network, JUnit XML and a screenshot under `test-results/browser/`; CI runs the 4 shards (job `browser`) and, in job `site`, `npm run test:browser:smoke` (production `dist/`, no hook), `test:axe`, `test:vectors` and the L11 graph test (`CANOPI_REQUIRE_BUILDS=1 node --test scripts/built-modules.test.mjs` over `dist/` and the downloaded `dist-test/`); locally L11 runs only when you set `CANOPI_REQUIRE_BUILDS=1` after fresh `npm run build` and `npm run build:browser-test` (stale builds would fail a plain `npm test`, so it skips there); if a run is killed, the server's process group is killed with it, and a stray server on the port is never taken for this run's; see [Consortium page](/modules/consortium-page.md) |
| consortium timing (on demand and nightly, after a build; not a test) | `timeout 900 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run timing:consortium [-- --ratchet scripts/browser/timing.json] [--dir <build dir>]` (same `CANOPI_BROWSER_PORT`; `CANOPI_TIMING_PROFILES=desktop` or `phone`, `CANOPI_TIMING_RUNS`): on the production `dist/` (run `npm run build` first) or the build given by `--dir` (e.g. a copy of `dist/` kept from before a change, for a local before/after): §8 first visit and reload of a `#v=4` link of 9 Temperate plants, median of 5, to `ct:first-view` (falls back to `ct:matrix` until R4's rename merges), desktop (1280 px, 4× CPU, 9 Mbps, 60 ms RTT) and slow phone (390 px, 4× CPU, Slow 4G: ~1.6 Mbps down, 400 ms RTT). `--ratchet` compares each median with the file's value: above it a warning, above 1.5× exit 1; null values are not compared (a `::warning::` annotation when all are). The last line, `timing-json: {…}`, is what the coordinator copies into `timing.json`, from a nightly runner run only, never a local one ([ADR-2](/decisions/consortium-chunk-budgets.md)) |
| consortium data (network, by hand; output committed) | `npm run install:consortium -- <canopi-data export dir>`, given the original directory under `<canopi-data>/data/exports/consortium/`, not a copy: the install runs `canopi release verify` on it from canopi-data (`CANOPI_DATA_DIR`, else the sibling `../canopi-data`; a git worktree must set it; needs `uv`) and refuses on any exit but 0, showing the reason, older exports with no receipt included (see [Consortium core](/modules/consortium-core.md); tests use `--fixture --no-images --out <tmp>`, which skip that check, need no canopi-data, and are refused for `public/data/consortium/`) |
| climate tiles (part of every `astro build`, and of `astro dev` when missing, from the archive or cache only; never committed) | the build's integration, or `npm run install:climate` by hand, installs the release pinned in `src/data/climate-release.json` into the git-ignored `public/data/climate/` and `src/data/climate-index.json`: nothing when already installed, else `CANOPI_CLIMATE_ARCHIVE=/path/to/canopi-climate-grid-vX.Y.Z.tar` (offline), the cache (`CANOPI_CLIMATE_CACHE`, default `node_modules/.cache/canopi-climate/`) or one ~99 MB download from GitHub; size and sha256 verified first, any failure fails the build. `npm run install:climate -- <tar>` installs a local tar (verified against the pin). The reader's probe and fetch-policy tests read the extracted grid at `CANOPI_CLIMATE_GRID` (default the canopi-cache path) and skip without it; `npm run test:vectors` reads the installed grid; see [Climate reader](/modules/climate-reader.md) |
| with legacy `/app/` | `CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz npm run build:with-web` |
| preview / manual deploy | `npm run preview` (`wrangler dev`), `npm run deploy` (needs Cloudflare auth) |

# Verification

- `npm test`, `npm run check` (0 errors; hints are allowed), `npm run build` and `node scripts/check-built-site.mjs` all pass.
- After pushing `master`, the CI `gate` check is green, its `deploy` job moves `deploy`, and the `live` job sees the commit in `https://projectcanopi.com/version.json`; then inspect the live homepage and downloads.
- `node scripts/check-built-site.mjs` also checks `/version.json` (`{ sha, built_at, node }` only; a 40-hex sha when `WORKERS_CI_COMMIT_SHA` or `GITHUB_SHA` is set, else possibly null) and that `_headers` serves it `no-store`.

# Troubleshooting

- `build:with-web`, `preview` or `deploy` fail with "CANOPI_WEB_EDITION_ARCHIVE is required": set it, or `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional marketing-only build.
- After a browser-test build (`npm run build:browser-test`, run by `npm run test:browser`), `.wrangler/deploy/config.json`, which the Cloudflare adapter writes on every build to point wrangler at the last build's `server/wrangler.json`, points at `dist-test/` (the build with the `__ctTest` hook). A bare `wrangler deploy` or `wrangler dev` then serves the test build: never run it after browser tests; `npm run deploy` and `npm run preview` rebuild production first, which points it back at `dist/`.
- `npm run build` (or `astro build`) fails with "Climate grid refused: the download of … failed" or "had no data for 30 s" / "took over 600 s" (stall and overall timeouts) or a size/sha256 mismatch: no tiles are installed and nothing is deployed. Retry with network, or set `CANOPI_CLIMATE_ARCHIVE` to a verified local tar; a mismatch on the real release means the pin or the asset changed (see [Climate reader](/modules/climate-reader.md)).
- `npm run check` runs out of memory (it should peak under 1 GB): `tsconfig.json` must exclude `public`, `mockup`, `.local` and `node_modules`; the base config allows JS, so without them the check parses the MapLibre bundle in `public/vendor` and needs more than 4 GB, and the out-of-memory killer can take the terminal session with it. `scripts/package.test.mjs` fails if an exclude goes missing.
- Build throws `src/data/bibliography.md:<line>`: fix the bibliography entry as the message says (see [src/data](/modules/src-data.md)).
- `npm test` key mismatch: add the key to all 11 translation files (see [src/i18n](/modules/src-i18n.md)); guide strings go in `src/i18n/guides/{en,fr}.json` only.
- `guides.test.mjs` fails: the message names the guide file and rule (see [Field Guide writing](/conventions/field-guide-writing.md)).
- Build fails with `No such module "node:fs"` from the prerender server: a page imported something that imports `src/content.config.ts` or a Node built-in; keep shared constants out of the content config.
- `astro preview` answers 500 after a rebuild: restart the preview you started (by its pid, never by port).
- Local contact send reports failure under `wrangler dev`: expected, the email simulator returns no message id.
