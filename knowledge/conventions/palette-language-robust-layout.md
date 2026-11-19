---
type: Convention
title: Palette language-robust layout
description: "The Plant palette's parts (.ct) lay out in any face and all 11 locales: a one-line step bar, CJK breaking and system faces, long-word hyphenation, checked at 320-1280 px."
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-19T10:38:13Z }
sources:
  - id: shell-css
    resource: ../../src/styles/consortium/shell.css
    title: src/styles/consortium/shell.css
    digest: sha256:a10160b2d57b1e5e
    last_modified: 2026-11-19T10:13:14Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:56c4810f679c3279
    last_modified: 2026-11-19T10:16:07Z
  - id: consortiumpage-astro
    resource: ../../src/components/consortium/ConsortiumPage.astro
    title: src/components/consortium/ConsortiumPage.astro
    digest: sha256:24edd37178030d9e
    last_modified: 2026-11-19T10:13:14Z
  - id: consortium-seams-layout-browser-test-mjs
    resource: ../../scripts/browser/consortium-seams-layout.browser.test.mjs
    title: scripts/browser/consortium-seams-layout.browser.test.mjs
    digest: sha256:aa9be61b497a36c2
    last_modified: 2026-11-19T10:28:13Z
  - id: seams-helpers-mjs
    resource: ../../scripts/browser/seams-helpers.mjs
    title: scripts/browser/seams-helpers.mjs
    digest: sha256:1f3b95287e5fcf5a
    last_modified: 2026-11-19T10:07:12Z
enforced_by:
  - scripts/browser/consortium-seams-layout.browser.test.mjs::Layout stability, language-robust (L1)
  - scripts/browser/consortium-seams-layout.browser.test.mjs::Layout stability (N2, late fonts)
---

Ruled 2026-11-19 (pf-decisions row "language-robust layout", owner question on adaptive elements for Japanese and similar). Palette parts only, under `.ct`; the site header, nav and `fonts.css` keep the site's faces.

## Rules

| Part | Rule | Where |
|---|---|---|
| Step bar (`#ct-steps`) | One line in any face and locale, 320-1280 px: `flex-wrap: nowrap`, `min-width: 0`; the current step `flex: none` (whole); the other steps shrink, their words (`.ct-steps-w`) end in an ellipsis while their number badge stays; each words span carries the full words in `title` (and in the page text, so the accessible name is whole) | `shell.css`, `ConsortiumPage.astro` |
| Japanese, Chinese, Korean | `word-break: auto-phrase` (ja by phrase; zh keeps normal breaking where the browser has no phrase data), Korean `keep-all` (spaces); never `keep-all` for ja/zh (an unspaced run would overflow); `line-break: strict`; headings `text-wrap: pretty`; `letter-spacing: normal !important` (outranks each part's Latin tracking) | `base.css` |
| CJK faces | `--font-sans` and `--font-display` redefined on `.ct:lang(ja|zh|ko)`: the Latin faces first, then the language's own system faces (ja Hiragino / Yu Gothic / Noto Sans CJK JP; zh PingFang SC / Microsoft YaHei / Noto Sans CJK SC; ko Apple SD Gothic Neo / Malgun Gothic / Noto Sans CJK KR; serif twins for display), so Japanese is never drawn with Chinese glyphs (the site stack names Noto Sans SC first) | `base.css` |
| German, Dutch, Russian | `hyphens: auto` (the page sets `lang`) and `overflow-wrap: break-word` as the last resort (keeps every box's size; narrow labels keep their own `anywhere`) | `base.css` |

## Checks

In `consortium-seams-layout.browser.test.mjs`:
- L1: the step bar on Place and on the palette step, all 11 locales at 320/390/960/1280 px, and in a wide monospace stand-in face at 320/390 (the GR-B2 case: at ja 390 px the fallback face wrapped the bar, CLS 0.269).
- L2: computed CJK rules and font order in ja, zh, ko; the header's face unchanged.
- L3: no element with words spills out of its box (or past the window unless a clipping box holds it) at 320 px in de, nl, ru, ja, zh, ko, on Place and on the palette.
- N2 and N2 late fonts: all 11 locales (`seams-helpers.mjs` `MISMATCH`, `LOCALES`) at 320/390/960/1280 px, two loads at a time; late fonts prints the CLS per locale at its worst width (2026-11-19: all at or under 0.0072, pt 390).
