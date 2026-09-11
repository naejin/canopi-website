# Canopi Website

Astro marketing site for `projectcanopi.com`. Cloudflare Workers Builds deploys
the `projectcanopi` service automatically when `master` is pushed. The generated
Cloudflare adapter serves the static site from `dist/client/`.

Canopi Web is a separate application at `https://web.projectcanopi.com/`. This
website links to it; it does not build or modify the app. The optional legacy
`/app/` artifact installer remains available for compatibility.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
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

## Optional legacy Web Edition install

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

The `/app` browser-route fallback is handled by `public/_redirects` in the
published static asset tree. Catalog assets under `/app/canopi-catalog/` remain
ordinary static files rather than website-side search, storage, or compute.

## Homepage and releases

The approved homepage is implemented in the shared Astro components for all 11
locales. `src/styles/home.css` holds the visual layout. Inter and Lora are served
locally from `public/fonts/`, with their licenses alongside them.

Update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` in `src/data/release.ts` after
verifying the release assets. Installer links are generated from that one source.
The download dialog recommends a compatible desktop installer and keeps other
platforms available without navigating through GitHub.

Before publishing, run `npm test`, `npm run build`, and
`node scripts/check-built-site.mjs`. Push to `master`, wait for the GitHub
“Workers Builds: projectcanopi” check, then verify the live homepage and downloads.
`npm run deploy` is an optional manual Wrangler path and requires Cloudflare
authentication; use `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional
marketing-only manual deployment.
