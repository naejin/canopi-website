---
type: Module
title: src/lib
description: Framework-free logic shared by the Worker endpoint, the page scripts and node --test (contact handler, installer detection, the consortium data core).
resource: ../../src/lib
tags: [module]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-09T23:57:55Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T20:09:06Z }
  - { by: claude/opus-5.5, at: 2026-11-06T00:33:36Z }
sources:
  - id: lib
    resource: ../../src/lib
    title: src/lib/
    digest: sha256:27dda12f66dd46b8
    last_modified: 2026-11-09T23:44:46Z
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
- [correction.mjs](../../src/lib/correction.mjs): the `POST /api/correction` handler (Step 8), contact's pattern and limits (origin, 16 KiB body, honeypot, the same EMAIL binding, sender and error mapping; nothing stored). Mails the owner a plain-text summary and a JSON block between `-----BEGIN/END CANOPI CORRECTION REPORT-----` (schema `canopi-correction-report/1`; keys schema, received_at, release_id, plant_id, plant_name, field, current_value, proposed_value, note, climate, locale, licence), without the reporter email, which is only the reply-to.
- [source-credits.js](../../src/lib/source-credits.js): `parseSourceCredits(source, file?)` reads canopi-data's `source_credits.tsv` as its `read_table` does and refuses what its check refuses; `shownCredits(rows)` → `{ used, held }` (internal rows never shown). Plain JavaScript, used by the installer, `check-built-site.mjs` and `src/data/source-credits.ts`.
- [installer.mjs](../../src/lib/installer.mjs): picks a desktop installer from the user agent.
- [try-references.js](../../src/lib/try-references.js): `TRY_CITATION`, `TRY_DOI`, `parseTryReferences(source, { rows, dataset_ids }, file?)` and `referenceParts(reference)`, which splits a reference into text and links (trailing punctuation left out of the url; linked only through `safeHref` from `src/scripts/consortium/logic.js`, and never with � in the url). Used by `DataSourcesPage.astro`, `check-built-site.mjs` and `install-consortium.mjs` (so what installs builds); plain JavaScript because both run in plain Node, and Node 22.12 to 22.17 cannot import a `.ts` file without a flag.
- [consortium/](../../src/lib/consortium): the consortium tool's data core (format 3 types, climate file and country lookup, site fit, jobs, conflicts, greedy suggestion, fixed-list evaluation, swaps, share-link state); see [Consortium core](/modules/consortium-core.md).
- Field Guides (build time only): [guides.ts](../../src/lib/guides.ts) (`publishedGuides(lang)`, `guidesCiting(bookId, lang)`, `slugOf`), [svg.ts](../../src/lib/svg.ts) (seeded `rng`, `grid`, `shuffle`, bean drawing and the other shared seed and leaf shapes — kernel, squash seed, grain, tomato seed, clove, `leafPath`, `lobedLeafPath`, and the soil `crumbPath` and `threadPath` used by the soil hero row and the Soil diagrams — and `wrap` for SVG text lines), [tree-shapes.ts](../../src/lib/tree-shapes.ts) (the tree outlines the carbon farming diagrams share), [rehype-guide-terms.mjs](../../src/lib/rehype-guide-terms.mjs) (places each first `<Term>`'s glossary note and keeps a term with the punctuation touching it), [rehype-guide-checklists.mjs](../../src/lib/rehype-guide-checklists.mjs) (gives each `<Item>` its checklist id; fails on duplicate ids).

# Interfaces

- `handleContact(request, env, { timeoutMs, log })`: validates and mails the form through `env.EMAIL.send()` to `env.MAIL_TO`. Answers JSON `{ ok, code, fields? }` when `Accept: application/json`, else a 303 to `/{lang}/contact/sent/` or `/failed/`.
- `normalise(form)`, `mailText(fields, lang)`, constants `LOCALES`, `FROM`, `MAX_BODY` (32 KiB), `LIMITS`, `TIMEOUT_MS` (10 s).
- `handleCorrection(request, env, { timeoutMs, log, now })`: JSON only (415 otherwise); `{ ok, code, fields? }` with field codes `required`, `pattern`, `too_long`, `type`, `unknown`, `unchanged`; consent must be `true`; locale one of the 11, climate one of the seven, release id `^r-[0-9a-f]{16}$`. `reportBlock`, `mailText`, `LIMITS`, `MAX_BODY`.
- `detectInstaller(ua, platform, architecture, touchPoints, bitness)` returns `windows`, `mac-arm`, `mac-intel`, `linux` or `null`; `isMacDesktop(...)`.

# Dependencies

- Used by [src/pages](/modules/src-pages.md) (`api/contact.ts` passes the Worker `env` from `cloudflare:workers`) and [src/scripts](/modules/src-scripts.md) (`downloads.js`, `design-map.js`).
- Tested by [scripts](/modules/scripts.md): `contact.test.mjs`, `homepage.test.mjs`, `consortium.test.mjs`.
- No external libraries.

# Gotchas

- Contact: foreign `Origin` gets 403 (missing or `"null"` Origin is tolerated); filled honeypot field `website` answers success without sending; missing `EMAIL` binding gives 503; a send result without `messageId` counts as failure (so `wrangler dev` local sends report failure).
- Permanent mailer error codes map to `refused`, others to `failed`. Logs carry codes only, never message content or the address.
- `guides.ts` is the exception to "no Astro imports": it reads `astro:content` and runs only at build time.
- Installer detection returns `null` (keep the chooser) for mobile, ChromeOS, touch Macs, 32-bit, Windows/Linux ARM, and Macs without a known architecture: never guess.
