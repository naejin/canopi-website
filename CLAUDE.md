# Canopi Website

Landing page for projectcanopi.com — the Canopi agroecological design app.

## Stack
- Astro (static output) + pure CSS (no Tailwind)
- Hosted on Cloudflare Pages (build: `npm run build`, output: `dist/`)
- Design: field notebook aesthetic from the Canopi app (ochre/parchment/ink palette)

## Commands
- `npm run dev` — dev server
- `npm run build` — static build to dist/
- `npm run preview` — preview production build

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
- Download URLs in `src/components/Download.astro` — update `VERSION` const when new release ships
- Links point to `github.com/naejin/canopi/releases/download/v{VERSION}/...`

## Gotchas
- Cloudflare Pages `_redirects` does NOT support `Language=` conditions (that's Netlify)
- Liberapay widget script fails on localhost due to CORS — works in production
- `public/canopi-logo.svg` and `canopi-icon-128.png` are copied from the app repo
