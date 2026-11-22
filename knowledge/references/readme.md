---
type: Reference
title: "README: Canopi Website"
description: Astro marketing site for projectcanopi.com.
resource: ../../README.md
tags: [docs]
status: stable
generated: { by: antigravity/gemini, at: 2026-11-22T22:36:54Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-06T14:32:05Z }
sources:
  - id: readme-md
    resource: ../../README.md
    title: README.md
    digest: sha256:cacf097e29c875e7
    last_modified: 2026-11-22T22:35:04Z
---

# Summary

Source document: [README.md](../../README.md).

- Astro static site; a push to `master` runs CI (`.github/workflows/ci.yml`), a green `gate` fast-forwards `deploy`, and Cloudflare Workers Builds (`projectcanopi`) deploys `deploy`; static output in `dist/client/`.
- `npm run build` is marketing-only; `build:with-web`, `preview`, `deploy` need `CANOPI_WEB_EDITION_ARCHIVE` (or `CANOPI_WEB_EDITION_REQUIRED=0`).
- `/api/contact` mails `MAIL_TO` through the `EMAIL` send_email binding in `wrangler.jsonc`; needs Cloudflare Email Routing.
- Update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` in `src/data/release.ts` per release; downloads use `releases/latest/download/` aliases.
- Before publishing: `npm test`, `npm run check`, `npm run check:arch`, `npm run build`, `node scripts/check-built-site.mjs`, then watch CI `gate`, `deploy`, and `live` (`/version.json`).
- Asset generators: `scripts/compress-heroes.py`, `scripts/make-og-images.py`, `scripts/export-featured-designs.py` (owner consent required).
