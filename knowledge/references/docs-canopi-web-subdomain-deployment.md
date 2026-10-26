---
type: Reference
title: Canopi Web deployment on web.projectcanopi.com
description: How Canopi Web is deployed as its own Cloudflare Pages app at web.projectcanopi.com, and what the marketing site owns.
resource: ../../docs/canopi-web-subdomain-deployment.md
tags: [docs]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T20:30:07Z }
sources:
  - id: canopi-web-subdomain-deployment-md
    resource: ../../docs/canopi-web-subdomain-deployment.md
    title: docs/canopi-web-subdomain-deployment.md
    digest: sha256:eca26246b9826cd0
    last_modified: 2026-10-26T20:30:07Z
---

# Summary

Source document: [docs/canopi-web-subdomain-deployment.md](../../docs/canopi-web-subdomain-deployment.md).

- Canopi Web is a separate Cloudflare Pages project `canopi-web` at `https://web.projectcanopi.com/`; this site only links to it and must not import app source.
- The app repo owns the build, the artifact and `scripts/publish-web-release.sh`, which verifies and deploys each release (Direct Upload, no CI token).
- Root artifact contract: `basePath "/"`, SPA fallback `/* -> /index.html` 200; the `/app/` artifact must not be deployed to the subdomain (blank page).
- SPA routing: no top-level `404.html` or catch-all `_redirects`; nested `404.html` in `assets/`, `canopi-catalog/`, `pdf-fonts/`.
- Cache: `index.html` and the manifest `no-cache`; `/assets/*` immutable.
- Release gates: run marketing `npm test`, `npm run check`, one build and `check-built-site.mjs` only when version, date, labels or URLs change; `publishLegacyApp` is true only if `/app/` must be installed or preserved.
