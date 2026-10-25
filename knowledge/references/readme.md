---
type: Reference
title: "README: Canopi Website"
description: Astro marketing site for projectcanopi.com.
resource: ../../README.md
tags: [docs]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:08Z }
sources:
  - id: readme-md
    resource: ../../README.md
    title: README.md
    digest: sha256:e81e871c562b557c
    last_modified: 2026-10-14T21:57:40Z
---

# Summary

Source document: [README.md](../../README.md).

- Astro static site, deployed by Cloudflare Workers Builds (`projectcanopi`) on push to `master`; static output in `dist/client/`.
- `npm run build` is marketing-only; `build:with-web`, `preview`, `deploy` need `CANOPI_WEB_EDITION_ARCHIVE` (or `CANOPI_WEB_EDITION_REQUIRED=0`).
- `/api/contact` mails `MAIL_TO` through the `EMAIL` send_email binding in `wrangler.jsonc`; needs Cloudflare Email Routing.
- Update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` in `src/data/release.ts` per release; downloads use `releases/latest/download/` aliases.
- Before publishing: `npm test`, `npm run build`, `node scripts/check-built-site.mjs`, then watch the Workers Builds check.
- Asset generators: `scripts/compress-heroes.py`, `scripts/make-og-images.py`, `scripts/export-featured-designs.py` (owner consent required).
