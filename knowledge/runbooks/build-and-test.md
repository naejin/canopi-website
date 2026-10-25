---
type: Runbook
title: Build and test
description: How to install, build, test, and verify the marketing site before pushing to master.
tags: [runbook, build, test]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T12:58:36Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-25T17:09:04Z }
sources:
  - id: package-json
    resource: ../../package.json
    title: package.json
    digest: sha256:5d9131fcbc667bdb
    last_modified: 2026-10-25T10:03:59Z
  - id: readme
    resource: ../../README.md
    title: README.md
    digest: sha256:e81e871c562b557c
    last_modified: 2026-10-14T21:57:40Z
  - id: check-built-site
    resource: ../../scripts/check-built-site.mjs
    title: scripts/check-built-site.mjs
    digest: sha256:c1b1b07d95597b57
    last_modified: 2026-10-25T17:00:03Z
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
- `npm test` key mismatch: add the key to all 11 translation files (see [src/i18n](/modules/src-i18n.md)); guide strings go in `src/i18n/guides/{en,fr}.json` only.
- `guides.test.mjs` fails: the message names the guide file and rule (see [Field Guide writing](/conventions/field-guide-writing.md)).
- Build fails with `No such module "node:fs"` from the prerender server: a page imported something that imports `src/content.config.ts` or a Node built-in; keep shared constants out of the content config.
- `astro preview` answers 500 after a rebuild: restart the preview you started (by its pid, never by port).
- Local contact send reports failure under `wrangler dev`: expected, the email simulator returns no message id.
