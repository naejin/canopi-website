# Canopi Website

Landing page for projectcanopi.com — the Canopi agroecological design app.

## Stack
- Astro (static output) + pure CSS (no Tailwind)
- Hosted on Cloudflare Pages (marketing build: `npm run build`; Web Edition publish: `npm run build:with-web`)
- Design: field notebook aesthetic from the Canopi app (ochre/parchment/ink palette)

## Commands
- `npm run dev` — dev server
- `npm run build` — marketing site only
- `npm run build:with-web` — build and install a packaged Web Edition artifact
- `npm test` — Web Edition installer regression tests
- `npm run preview` — build with the Web Edition artifact, then preview

`npm run build:with-web`, `npm run preview`, and `npm run deploy` require
`CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz`. The installer
verifies the artifact manifest, catalog checksums, Cloudflare-safe limits, and
supported filter metadata before copying it under `dist/client/app/`.

## i18n
- 11 locales: en (default at `/`), fr, es, pt, it, zh, de, ja, ko, nl, ru (at `/{lang}/`)
- Translation files: `src/i18n/translations/{locale}.json` — flat key structure
- Utility: `src/i18n/utils.ts` — `t(key, lang)` function, locale helpers
- All components receive a `lang` prop; pages pass it through
- Language detection: client-side script in Base.astro (sessionStorage, first visit only)
- Add new translation keys to ALL 11 files when adding text

## Design Rules (from app's design system)
- Colors: exact palette from `canopi/desktop/web/src/styles/global.css`
- Font: Inter (body) + Lora (display headlines), weights 400/600 only
- No green in UI chrome — green is for nature/plant content only
- Light/dark theme via `[data-theme="dark"]` + localStorage

## Release Links
- Download URLs in `src/components/Hero.astro` — update `VERSION` const when new release ships
- Links point to `github.com/naejin/canopi/releases/download/v{VERSION}/...`
- `src/components/Download.astro` exists but is UNUSED (not imported by any page) — do not edit

## Gotchas
- Cloudflare Pages `_redirects` does NOT support `Language=` conditions (that's Netlify)
- Liberapay widget script fails on localhost due to CORS — works in production
- `public/canopi-logo.svg` and `canopi-icon-128.png` are copied from the app repo
- `<body class="grain">` already provides a global SVG noise overlay (`global.css`) — do not add page-level paper textures
- Responsive breakpoints across the project: `max-width: 639px` (mobile) and `min-width: 960px` (desktop); no tablet tier
- Web Edition `/app/*` fallback is static `_redirects`; do not add website-side catalog search, storage, DuckDB, Worker, Pages Function, R2, KV, D1, service-worker, or offline catalog behavior
- Web Edition catalog files under `/app/canopi-catalog/` must serve directly as static assets
