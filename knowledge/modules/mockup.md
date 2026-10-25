---
type: Module
title: mockup
description: The approved October 2026 static HTML mockup and its implementation contract; a tracked design reference, not shipped by the build.
resource: ../../mockup
tags: [module, reference, design]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:07Z }
sources:
  - id: mockup
    resource: ../../mockup
    title: mockup/
    digest: sha256:68b617fd7dc5b177
    last_modified: 2026-10-14T21:57:40Z
  - id: implementation
    resource: ../../mockup/IMPLEMENTATION.md
    title: mockup/IMPLEMENTATION.md
    digest: sha256:4f85ed21a00fe27c
    last_modified: 2026-10-14T21:32:09Z
  - id: mockup-gitignore
    resource: ../../mockup/.gitignore
    title: mockup/.gitignore
    digest: sha256:083b545038b40874
    last_modified: 2026-10-14T21:32:09Z
---

# Responsibility

Reference for layout, behaviour and English copy of the home page overhaul (approved 2026-10-14), plus the contract for porting it to Astro. Tracked in git (about 60 files), but not imported, built or deployed: production code lives in `src/`. Do not develop features here.

# Key files

- [IMPLEMENTATION.md](../../mockup/IMPLEMENTATION.md): stack, file plan (mockup module to production file), design tokens, section contracts, localisation, contact endpoint, featured-designs data, asset budgets, gates, owner setup.
- [index.html](../../mockup/index.html), `css/site.css`, `js/*.js`, `data/*.json`, `vendor/` (MapLibre copy).
- `prompts/01..07-*.md`: the painting and build prompts used during the overhaul.
- `tools/check.mjs`, `tools/compress-heroes.py` (superseded by `scripts/compress-heroes.py`).
- [.gitignore](../../mockup/.gitignore): keeps hero PNG originals, `screenshots/`, `studies/`, `codex-v1/` local only.

# Interfaces

Run it locally: `cd mockup && python3 -m http.server 8765 --bind 127.0.0.1`. Mockup-only query parameters `?lang=`, `?design=`, `?contact=error` were deliberately not ported.

# Dependencies

None at build time. Its modules map onto [src/scripts](/modules/src-scripts.md), [src/lib](/modules/src-lib.md), `src/components/` and `src/styles/`.

# Gotchas

- Code is truth: where `src/` and the mockup differ, the production code wins (e.g. `places-map.js` became `design-map.js`; the mockup exporter was retired for `scripts/export-featured-designs.py`).
- Untracked local folders (`screenshots/`, `codex-v1/`, hero originals) may exist in a working copy; never commit them.
