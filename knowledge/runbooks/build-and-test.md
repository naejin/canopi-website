---
type: Runbook
title: Build and test
description: How to install, build, test, and verify the marketing site before pushing to master.
tags: [runbook, build, test]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T09:41:06Z }
verified:
  - { by: claude/opus-5.5, at: 2026-11-06T00:33:36Z }
  - { by: claude-code/claude-opus-5-5, at: 2026-11-11T04:06:19Z }
sources:
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:cc25e3608d4deac1
    last_modified: 2026-11-11T09:39:56Z
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:18790192849df669
    last_modified: 2026-11-06T14:34:09Z
  - id: check-built-site
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:657ef460ed3c5724
    last_modified: 2026-11-11T09:39:56Z
  - id: tsconfig-json
    resource: ../../tsconfig.json
    title: tsconfig.json
    digest: sha256:0b019fd1a874cabb
    last_modified: 2026-11-11T04:31:48Z
enforced_by: [scripts/package.test.mjs]
---

# When to use

Setting up a working copy, building, and running checks before pushing to `master` (which deploys automatically).

# Steps

Node >= 22.12.0.

| Purpose | Command |
|---|---|
| install | `npm install` |
| dev server (port 4321) | `npm run dev` |
| unit/regression tests | `npm test` (`node --experimental-strip-types --test scripts/*.test.mjs`, so it runs on Node 22.12) |
| type check | `npm run check` (`wrangler types` writes the gitignored `worker-configuration.d.ts`, then `astro check` type-checks `.ts`, `.js` and `.astro` files; MDX is not checked) |
| marketing build | `npm run build` (`astro build`; the `climateTiles` integration installs the climate tiles first in every `astro build`, whatever command Cloudflare Workers Builds runs; a build without network needs `CANOPI_CLIMATE_ARCHIVE` or a warm cache) |
| built-site check | `node scripts/check-built-site.mjs` |
| bibliography links (network, by hand) | `npm run check:bibliography` |
| browser tests (after a build; never in `npm test`) | `timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser`: wrangler dev on 4420 (`CANOPI_BROWSER_PORT`, 4420–4498), headless system Chrome (`CANOPI_CHROME`, default `/usr/bin/google-chrome`) through puppeteer-core; one file per owner (`consortium-commit0` must pass; `consortium-s1…s4` are todo until their stream builds them); if a run is killed, the server's process group is killed with it, and a stray server on the port is never taken for this run's; see [Consortium page](/modules/consortium-page.md) |
| consortium timing (on demand, after a build; not a test) | `timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 node scripts/browser/consortium-timing.mjs` (same `CANOPI_BROWSER_PORT`): §8 cold and warm load of `/consortium/?climate=Temperate` under 4× CPU, 9 Mbps and 60 ms RTT, median of 5, to `ct:matrix` (or `ct:pool` until S2 sets that mark) |
| consortium data (network, by hand; output committed) | `npm run install:consortium -- <canopi-data export dir>`, given the original directory under `<canopi-data>/data/exports/consortium/`, not a copy: the install runs `canopi release verify` on it from canopi-data (`CANOPI_DATA_DIR`, else the sibling `../canopi-data`; a git worktree must set it; needs `uv`) and refuses on any exit but 0, showing the reason, older exports with no receipt included (see [Consortium core](/modules/consortium-core.md); tests use `--fixture --no-images --out <tmp>`, which skip that check, need no canopi-data, and are refused for `public/data/consortium/`) |
| climate tiles (part of every `astro build`, and of `astro dev` when missing; never committed) | the build's integration, or `npm run install:climate` by hand, installs the release pinned in `src/data/climate-release.json` into the git-ignored `public/data/climate/` and `src/data/climate-index.json`: nothing when already installed, else `CANOPI_CLIMATE_ARCHIVE=/path/to/canopi-climate-grid-vX.Y.Z.tar` (offline), the cache (`CANOPI_CLIMATE_CACHE`, default `node_modules/.cache/canopi-climate/`) or one ~99 MB download from GitHub; size and sha256 verified first, any failure fails the build. `npm run install:climate -- <tar>` installs a local tar (verified against the pin). The reader's golden test reads the extracted grid at `CANOPI_CLIMATE_GRID` (default the canopi-cache path) and skips without it; see [Climate reader](/modules/climate-reader.md) |
| with legacy `/app/` | `CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz npm run build:with-web` |
| preview / manual deploy | `npm run preview` (`wrangler dev`), `npm run deploy` (needs Cloudflare auth) |

# Verification

- `npm test`, `npm run check` (0 errors; hints are allowed), `npm run build` and `node scripts/check-built-site.mjs` all pass.
- After pushing `master`, the GitHub "Workers Builds: projectcanopi" check succeeds; then inspect the live homepage and downloads.

# Troubleshooting

- `build:with-web`, `preview` or `deploy` fail with "CANOPI_WEB_EDITION_ARCHIVE is required": set it, or `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional marketing-only build.
- `npm run build` (or `astro build`) fails with "Climate grid refused: the download of … failed" or a size/sha256 mismatch: no tiles are installed and nothing is deployed. Retry with network, or set `CANOPI_CLIMATE_ARCHIVE` to a verified local tar; a mismatch on the real release means the pin or the asset changed (see [Climate reader](/modules/climate-reader.md)).
- `npm run check` runs out of memory (it should peak under 1 GB): `tsconfig.json` must exclude `public`, `mockup`, `.local` and `node_modules`; the base config allows JS, so without them the check parses the MapLibre bundle in `public/vendor` and needs more than 4 GB, and the out-of-memory killer can take the terminal session with it. `scripts/package.test.mjs` fails if an exclude goes missing.
- Build throws `src/data/bibliography.md:<line>`: fix the bibliography entry as the message says (see [src/data](/modules/src-data.md)).
- `npm test` key mismatch: add the key to all 11 translation files (see [src/i18n](/modules/src-i18n.md)); guide strings go in `src/i18n/guides/{en,fr}.json` only.
- `guides.test.mjs` fails: the message names the guide file and rule (see [Field Guide writing](/conventions/field-guide-writing.md)).
- Build fails with `No such module "node:fs"` from the prerender server: a page imported something that imports `src/content.config.ts` or a Node built-in; keep shared constants out of the content config.
- `astro preview` answers 500 after a rebuild: restart the preview you started (by its pid, never by port).
- Local contact send reports failure under `wrangler dev`: expected, the email simulator returns no message id.
