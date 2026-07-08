# Canopi Website

Astro site for `projectcanopi.com`, deployed with the Cloudflare adapter and
Wrangler. The Web Edition app is not generated here; this repository installs a
prebuilt artifact produced by the main Canopi repository.

## Commands

```sh
npm install
npm run dev
npm run build
npm run build:with-web
npm run preview
npm run deploy
```

`npm run build` builds the marketing site only. `npm run build:with-web`,
`npm run preview`, and `npm run deploy` require `CANOPI_WEB_EDITION_ARCHIVE` to
point at a packaged Web Edition tarball, for example:

```sh
CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-v0.9.2-<commit>.tar.gz npm run build:with-web
```

For a website-only build that intentionally skips the Web Edition install, set
`CANOPI_WEB_EDITION_REQUIRED=0`.

## Web Edition Install

The installer validates the artifact before copying it into the built static
asset tree:

- the artifact must target `/app/`
- catalog assets must be Parquet-backed and listed in the artifact manifest
- catalog checksums and byte counts must match
- supported filter metadata must be present
- generated files must stay within the artifact's Cloudflare Pages limits
- raw DuckDB WASM bundles are rejected

Astro's Cloudflare build serves static assets from `dist/client`, so the
installer writes the app to `dist/client/app/` when that directory exists. Plain
static builds fall back to `dist/app/`.

The `/app` browser-route fallback is handled in `src/middleware.ts`. Catalog
assets under `/app/canopi-catalog/` remain ordinary static files and missing app
assets still return 404.
