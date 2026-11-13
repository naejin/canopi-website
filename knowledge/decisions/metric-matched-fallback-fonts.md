---
type: Architecture Decision
title: Metric-matched fallback fonts
description: Local Arial and Times New Roman (or their metric twins) scaled to Source Sans 3's and Literata's metrics come first in the fallback stacks, so the late web-font swap does not shift the layout on slow phones.
tags: [fonts, performance, layout]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T07:42:23Z }
sources:
  - id: fonts-css
    resource: ../../src/styles/fonts.css
    title: src/styles/fonts.css
    digest: sha256:558068a82a8e67ca
    last_modified: 2026-11-13T04:47:00Z
  - id: tokens-css
    resource: ../../src/styles/tokens.css
    title: src/styles/tokens.css
    digest: sha256:e58e4e13bfecc6bd
    last_modified: 2026-11-13T04:47:00Z
  - id: font-fallback-metrics-mjs
    resource: ../../scripts/font-fallback-metrics.mjs
    title: scripts/font-fallback-metrics.mjs
    digest: sha256:af61386628adc5fe
    last_modified: 2026-11-13T04:47:00Z
  - id: consortium-seams-layout-browser-test-mjs
    resource: ../../scripts/browser/consortium-seams-layout.browser.test.mjs
    title: scripts/browser/consortium-seams-layout.browser.test.mjs
    digest: sha256:65e284777a37799b
    last_modified: 2026-11-13T07:21:50Z
  - id: base-astro
    resource: ../../src/layouts/Base.astro
    title: src/layouts/Base.astro
    digest: sha256:44c049911b38bbe1
    last_modified: 2026-11-11T03:28:04Z
  - id: base-css
    resource: ../../src/styles/consortium/base.css
    title: src/styles/consortium/base.css
    digest: sha256:745c147106da28e6
    last_modified: 2026-11-13T06:57:55Z
enforced_by: [scripts/browser/consortium-seams-layout.browser.test.mjs]
---

# Context

Source Sans 3 (body) and Literata (display) are self-hosted woff2 files with `font-display: swap` ([fonts.css](../../src/styles/fonts.css)); only the Latin 400 faces of each are preloaded (`src/layouts/Base.astro`). On a slow line the text first paints in the fallback stack and moves when the web fonts arrive. CI caught it: the consortium page's layout-stability spec failed with "en 320 px: CLS 0.085 at 111 ms by header-nav" (the header wrapped in the fallback, not in Source Sans 3). Before E6 the fallback after the web font was Noto Sans / Noto Serif, with different widths and vertical metrics.

# Decision

- **Metric-matched local fallbacks** (E6 font, coordinator row "Push A fixes" 2026-11-13 in [the decisions](/decisions/consortium-user-decisions.md)): `@font-face` families `'Source Sans 3 Fallback'` and `'Literata Fallback'` in `fonts.css`, placed right after their web family in `--font-sans` and `--font-display` ([tokens.css](../../src/styles/tokens.css)), before the Noto, system and generic fonts.
- **Sources:** `local('Arial')`, `local('ArialMT')`, `local('Liberation Sans')`, `local('LiberationSans')`, `local('Arimo')` for the sans (italic and bold by their own names); `local('Times New Roman')`, `local('TimesNewRomanPSMT')`, `local('Liberation Serif')`, `local('LiberationSerif')`, `local('Tinos')` for the serif. Liberation and Arimo/Tinos are metric-compatible with Arial and Times New Roman (Windows, macOS, iOS; Linux and CI runners have Liberation; ChromeOS has Arimo/Tinos).
- **Metrics:** `size-adjust` is the ratio of the two fonts' average advance per em, each character weighted by how often it occurs in the site's own strings (`src/i18n/translations`: the Latin-script locales for the Latin face, Russian for the Cyrillic one); `ascent-override` and `descent-override` are the web font's hhea values per em divided by size-adjust; `line-gap-override: 0`. The method is that of Next.js and Astro's font API, weighted by this site's text.
- **One face per weight, style and subset:** Source Sans 3 400 normal, 400 italic, 600; Literata 400, 600; each for the Latin and the Cyrillic `unicode-range` of the web faces, so bold is a real bold, never synthesised, and characters outside the ranges go on down the stack as before. Chinese, Japanese and Korean have no web font, so nothing to match.
- **Generated, not hand-tuned:** [font-fallback-metrics.mjs](../../scripts/font-fallback-metrics.mjs) reads the woff2 and Liberation files (no package) and prints the rules; rerun it and paste over `fonts.css` when a font file or the site's text changes.
- **No 600 preload:** preloading the 600 faces was measured by the coordinator to remove a shift of at most 0.0003 for about 16 KB more per page, so only the 400 faces stay preloaded.

# Consequences

- The late-font swap moves text by at most about 1% of a string's width, not to the pixel: a paragraph whose last word sits at the edge can still gain or lose a line (Start's lede at en 320 px: CLS 0.0102). The spec "Layout stability (N2, late fonts)" in [consortium-seams-layout.browser.test.mjs](../../scripts/browser/consortium-seams-layout.browser.test.mjs) holds every `/fonts/*.woff2` request 800 ms, asserts the first paint came before any font, and allows CLS 0.015 at 320, 390, 700, 960 and 1280 px in en, fr and ja (N2's own budget is 0.01). Since E6 S2 it also checks sizes (`sized`): no control on Start resizes when the fonts swap; every height and the place-search input's width hold to the pixel, a button's width within 2 % (`LABEL_SLACK`; French labels change about 2 px, 158 → 160), and a control whose top did not move keeps its left within 2 %. Vertical moves are left to the CLS budget.

# Known gaps

- **Android** ships neither Arial nor Times New Roman (nor Liberation), so the matched faces do not apply there and the stack falls to Roboto / Noto Serif unmatched. Roboto- and Noto-Serif-matched faces are a follow-up (F1a).
- **Place-search input width (fixed in E6 S2):** the input took its width from `size=20`, the font's average character width (206 px in the fallback, 179 px in Source Sans 3), which no fallback face can match. `.ct .ct-location-search { width: 11.2em; max-width: 100%; }` in [base.css](../../src/styles/consortium/base.css) now fixes it, and the late-font spec checks sizes. Any input sized by `size=` has the same problem.
- The 640 px header fit in [Site navigation](/decisions/site-navigation.md) was measured against the Noto fallback, not re-measured with the matched faces.
