---
type: Runbook
title: Build and test
description: How to install, build, test, and verify the marketing site before pushing to master.
tags: [runbook, build, test]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T19:29:43Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T21:39:26Z }
sources:
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:f7393b32d2100393
    last_modified: 2026-10-27T19:28:52Z
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:22edd4bb3671389f
    last_modified: 2026-10-26T20:08:11Z
  - id: check-built-site
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:aeefa898960cd687
    last_modified: 2026-10-27T21:38:30Z
  - id: tsconfig-json
    resource: ../../tsconfig.json
    title: tsconfig.json
    digest: sha256:1a8a854b16eadbd9
    last_modified: 2026-10-26T20:27:21Z
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
| marketing build | `npm run build` (runs `copy-maplibre.mjs` first) |
| built-site check | `node scripts/check-built-site.mjs` |
| bibliography links (network, by hand) | `npm run check:bibliography` |
| consortium data (network, by hand; output committed) | `npm run install:consortium -- <canopi-data export dir>` (see [Consortium core](/modules/consortium-core.md); tests use `--fixture --no-images --out <tmp>`) |
| with legacy `/app/` | `CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz npm run build:with-web` |
| preview / manual deploy | `npm run preview` (`wrangler dev`), `npm run deploy` (needs Cloudflare auth) |

# Verification

- `npm test`, `npm run check` (0 errors; hints are allowed), `npm run build` and `node scripts/check-built-site.mjs` all pass.
- After pushing `master`, the GitHub "Workers Builds: projectcanopi" check succeeds; then inspect the live homepage and downloads.

# Troubleshooting

- `build:with-web`, `preview` or `deploy` fail with "CANOPI_WEB_EDITION_ARCHIVE is required": set it, or `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional marketing-only build.
- `npm run check` runs out of memory (it should peak under 1 GB): `tsconfig.json` must exclude `public`, `mockup`, `.local` and `node_modules`; the base config allows JS, so without them the check parses the MapLibre bundle in `public/vendor` and needs more than 4 GB, and the out-of-memory killer can take the terminal session with it. `scripts/package.test.mjs` fails if an exclude goes missing.
- Map 404s in dev after a build: `npm run build` wiped `public/vendor`; restart the dev server (do not kill processes by port).
- Build throws `src/data/bibliography.md:<line>`: fix the bibliography entry as the message says (see [src/data](/modules/src-data.md)).
- `npm test` key mismatch: add the key to all 11 translation files (see [src/i18n](/modules/src-i18n.md)); guide strings go in `src/i18n/guides/{en,fr}.json` only.
- `guides.test.mjs` fails: the message names the guide file and rule (see [Field Guide writing](/conventions/field-guide-writing.md)).
- Build fails with `No such module "node:fs"` from the prerender server: a page imported something that imports `src/content.config.ts` or a Node built-in; keep shared constants out of the content config.
- `astro preview` answers 500 after a rebuild: restart the preview you started (by its pid, never by port).
- Local contact send reports failure under `wrangler dev`: expected, the email simulator returns no message id.
