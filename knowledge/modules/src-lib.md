---
type: Module
title: src/lib
description: Framework-free logic shared by the Worker endpoint, the page scripts and node --test (contact handler, installer detection, nearest-design distances, the consortium data core).
resource: ../../src/lib
tags: [module]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T20:11:24Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T22:34:50Z }
sources:
  - id: lib
    resource: ../../src/lib
    title: src/lib/
    digest: sha256:5e1ded2c90c68bd3
    last_modified: 2026-10-27T22:26:44Z
  - id: contact-api
    resource: ../../src/pages/api/contact.ts
    title: src/pages/api/contact.ts
    digest: sha256:d18d3ee4b6c03e07
    last_modified: 2026-10-14T21:57:40Z
---

# Responsibility

Pure ES modules with no Astro or Cloudflare imports, so `node --test` can run them directly. Not UI code: DOM wiring lives in [src/scripts](/modules/src-scripts.md).

# Key files

- [contact.mjs](../../src/lib/contact.mjs): the `POST /api/contact` handler.
- [installer.mjs](../../src/lib/installer.mjs): picks a desktop installer from the user agent.
- [nearest.mjs](../../src/lib/nearest.mjs): great-circle distances for the design finder.
- [consortium/](../../src/lib/consortium): the consortium tool's data core (format 2 types, cell lookup, site fit, jobs, conflicts, greedy suggestion, fixed-list evaluation, swaps, share-link state); see [Consortium core](/modules/consortium-core.md).
- Field Guides (build time only): [guides.ts](../../src/lib/guides.ts) (`publishedGuides(lang)`, `guidesCiting(bookId, lang)`, `slugOf`), [svg.ts](../../src/lib/svg.ts) (seeded `rng`, `grid`, `shuffle`, bean drawing and the other shared seed and leaf shapes — kernel, squash seed, grain, tomato seed, clove, `leafPath`, `lobedLeafPath`, and the soil `crumbPath` and `threadPath` used by the soil hero row and the Soil diagrams — and `wrap` for SVG text lines), [tree-shapes.ts](../../src/lib/tree-shapes.ts) (the tree outlines the carbon farming diagrams share), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs) (places each first `<Term>`'s glossary note and keeps a term with the punctuation touching it), [rehype-guide-checklists.mjs](../../src/lib/rehype-guide-checklists.mjs) (gives each `<Item>` its checklist id; fails on duplicate ids).

# Interfaces

- `handleContact(request, env, { timeoutMs, log })`: validates and mails the form through `env.EMAIL.send()` to `env.MAIL_TO`. Answers JSON `{ ok, code, fields? }` when `Accept: application/json`, else a 303 to `/{lang}/contact/sent/` or `/failed/`.
- `normalise(form)`, `mailText(fields, lang)`, constants `LOCALES`, `FROM`, `MAX_BODY` (32 KiB), `LIMITS`, `TIMEOUT_MS` (10 s).
- `detectInstaller(ua, platform, architecture, touchPoints, bitness)` returns `windows`, `mac-arm`, `mac-intel`, `linux` or `null`; `isMacDesktop(...)`.
- `distanceKm(a, b)`, `nearestFirst(designs, point)`.

# Dependencies

- Used by [src/pages](/modules/src-pages.md) (`api/contact.ts` passes the Worker `env` from `cloudflare:workers`) and [src/scripts](/modules/src-scripts.md) (`downloads.js`, `design-map.js`).
- Tested by [scripts](/modules/scripts.md): `contact.test.mjs`, `homepage.test.mjs`, `nearest.test.mjs`, `consortium.test.mjs`.
- No external libraries.

# Gotchas

- Contact: foreign `Origin` gets 403 (missing or `"null"` Origin is tolerated); filled honeypot field `website` answers success without sending; missing `EMAIL` binding gives 503; a send result without `messageId` counts as failure (so `wrangler dev` local sends report failure).
- Permanent mailer error codes map to `refused`, others to `failed`. Logs carry codes only, never message content or the address.
- `guides.ts` is the exception to "no Astro imports": it reads `astro:content` and runs only at build time.
- Installer detection returns `null` (keep the chooser) for mobile, ChromeOS, touch Macs, 32-bit, Windows/Linux ARM, and Macs without a known architecture: never guess.
