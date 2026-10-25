---
type: Runbook
title: Build and test
description: How to install, build, test, and verify the marketing site before pushing to master.
tags: [runbook, build, test]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:08Z }
sources:
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:93e69eb461e36037
    last_modified: 2026-10-23T19:07:39Z
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:e81e871c562b557c
    last_modified: 2026-10-14T21:57:40Z
  - id: check-built-site
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:d4ac68a88ae8a4af
    last_modified: 2026-10-23T19:07:39Z
---

# When to use

Setting up a working copy, building, and running checks before pushing to `master` (which deploys automatically).

# Steps

Node >= 22.12.0.

| Purpose | Command |
|---|---|
| install | `npm install` |
| dev server (port 4321) | `npm run dev` |
| unit/regression tests | `npm test` (`node --test scripts/*.test.mjs`) |
| marketing build | `npm run build` (runs `copy-maplibre.mjs` first) |
| built-site check | `node scripts/check-built-site.mjs` |
| bibliography links (network, by hand) | `npm run check:bibliography` |
| with legacy `/app/` | `CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz npm run build:with-web` |
| preview / manual deploy | `npm run preview` (`wrangler dev`), `npm run deploy` (needs Cloudflare auth) |

# Verification

- `npm test`, `npm run build` and `node scripts/check-built-site.mjs` all pass with no assertion errors.
- After pushing `master`, the GitHub "Workers Builds: projectcanopi" check succeeds; then inspect the live homepage and downloads.

# Troubleshooting

- `build:with-web`, `preview` or `deploy` fail with "CANOPI_WEB_EDITION_ARCHIVE is required": set it, or `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional marketing-only build.
- Map 404s in dev after a build: `npm run build` wiped `public/vendor`; restart the dev server (do not kill processes by port).
- Build throws `src/data/bibliography.md:<line>`: fix the bibliography entry as the message says (see [src/data](/modules/src-data.md)).
- `npm test` key mismatch: add the key to all 11 translation files (see [src/i18n](/modules/src-i18n.md)).
- Local contact send reports failure under `wrangler dev`: expected, the email simulator returns no message id.
