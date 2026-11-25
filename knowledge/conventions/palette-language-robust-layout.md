---
type: Convention
title: Palette language-robust layout
description: "The Plant palette's parts (.ct) lay out in any face and all 11 locales: a one-line step bar, CJK breaking and system faces, long-word hyphenation, checked at 320-1280 px."
generated: { by: antigravity/gemini-4-neon, at: 2026-11-25T11:39:49Z }
verified:
  - { by: antigravity/gemini, at: 2026-11-23T15:45:59Z }
  - { by: antigravity/gemini-3-pro, at: 2026-11-23T22:35:48Z }
sources:
  - id: field-studio-css
    resource: ../../src/styles/palette/field-studio.css
    title: src/styles/palette/field-studio.css
    digest: sha256:1f58100c121aa18c
    last_modified: 2026-11-23T21:58:22Z
  - id: consortiumpage-astro
    resource: ../../src/components/palette/PalettePage.astro
    title: src/components/palette/PalettePage.astro
    digest: sha256:8d5b992f4939045d
    last_modified: 2026-11-25T11:27:38Z
  - id: consortium-seams-layout-browser-test-mjs
    resource: ../../scripts/browser/palette-studio-plan-i18n.browser.test.mjs
    title: scripts/browser/palette-studio-plan-i18n.browser.test.mjs
    digest: sha256:406500fa2ce3b211
    last_modified: 2026-11-25T11:27:38Z
enforced_by: [scripts/browser/palette-studio-plan-i18n.browser.test.mjs]
---

Ruled 2026-11-19 (pf-decisions row "language-robust layout", owner question on adaptive elements for Japanese and similar). Palette parts only, under `.ct`; the site header, nav and `fonts.css` keep the site's faces. All palette styles live in `src/styles/palette/field-studio.css` (and `print.css` for print) after the Stage 2A legacy stylesheet retirement.

## Rules

| Part | Rule | Where |
|---|---|---|
| Step bar (`#ct-steps`) | One line in any face and locale, 320-1280 px: `flex-wrap: nowrap`, `min-width: 0`; the current step `flex: none` (whole); the other steps shrink, their words (`.ct-steps-w`) end in an ellipsis while their number badge stays; no `title`: the full words stay in the page text (the ellipsis only clips them), so the accessible name is whole (R2.0) | `field-studio.css`, `PalettePage.astro` |
| Japanese, Chinese, Korean | `word-break: auto-phrase` (ja by phrase; zh keeps normal breaking where the browser has no phrase data), Korean `keep-all` (spaces); never `keep-all` for ja/zh (an unspaced run would overflow); `line-break: strict`; headings `text-wrap: pretty`; `letter-spacing: normal !important` (outranks each part's Latin tracking) | `field-studio.css` |
| CJK faces | `--font-sans` and `--font-display` redefined on `.ct:lang(ja|zh|ko)`: the Latin faces first, then the language's own system faces (ja Hiragino / Yu Gothic / Noto Sans CJK JP; zh PingFang SC / Microsoft YaHei / Noto Sans CJK SC; ko Apple SD Gothic Neo / Malgun Gothic / Noto Sans CJK KR; serif twins for display), so Japanese is never drawn with Chinese glyphs (the site stack names Noto Sans SC first) | `field-studio.css` |
| German, Dutch, Russian | `hyphens: auto` (the page sets `lang`) and `overflow-wrap: break-word` as the last resort (keeps every box's size; narrow labels keep their own `anywhere`) | `field-studio.css` |
| Scientific names | never hyphenate, whatever the page's language: `.ct .ct-sci, .ct :lang(la) { hyphens: manual }` (every Latin name carries `.ct-sci` or `lang="la"`; give a new one either) | `field-studio.css` |

## Checks

In `consortium-seams-layout.browser.test.mjs`:
- L1: the step bar on Place and on the palette step, all 11 locales at 320/390/960/1280 px, and in a wide monospace stand-in face at 320/390 (the GR-B2 case: at ja 390 px the fallback face wrapped the bar, CLS 0.269).
- L2: computed CJK rules and font order in ja, zh, ko; the header's face unchanged.
- L3: no element with words spills out of its box (or past the window unless a clipping box holds it) at 320 px in de, nl, ru, ja, zh, ko, on Place and on the palette; in de, nl, ru the palette's text hyphenates (`hyphens: auto`) and every scientific name (`.ct-sci`, `[lang="la"]`) reads `hyphens: manual`.
- N2 and N2 late fonts: all 11 locales (`seams-helpers.mjs` `MISMATCH`, `LOCALES`) at 320/390/960/1280 px, two loads at a time; late fonts prints the CLS per locale at its worst width (2026-11-19: all at or under 0.0072, pt 390).
