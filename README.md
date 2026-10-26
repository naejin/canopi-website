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
npm run check
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

One Astro component tree (`src/components/Home.astro`) renders the home page for all 11
locales; `src/scripts/` holds its scripts, which take every string from the page. Styles are
`src/styles/{tokens,fonts,global,home}.css` with the app's palette. Literata and Source Sans 3
(Latin and Cyrillic subsets) are served from `public/fonts/` with their licences; CJK pages use
system fonts. MapLibre is copied from `node_modules` into `public/vendor/` before each build
(`scripts/copy-maplibre.mjs`).

Generated assets and their scripts:

- Hero paintings: `python3 scripts/compress-heroes.py <originals> public/hero` (the PNG
  originals stay outside git).
- Social images: `python3 scripts/make-og-images.py` writes `public/og/`.
- Featured designs: `python3 scripts/export-featured-designs.py <catalog.db> public/data/featured-designs.json`
  reads the `.canopi` files listed in `scripts/featured-designs.json`, opening the catalog
  read-only. Add a design only with its owner's consent.

The contact form posts to `/api/contact` (`src/pages/api/contact.ts`, logic in
`src/lib/contact.mjs`), which mails `MAIL_TO` through the `EMAIL` send_email binding in
`wrangler.jsonc`. It needs Cloudflare Email Routing on the domain with `MAIL_TO` verified as a
destination address. Under `wrangler dev` the email simulator returns no message id, so a local
send reports failure; the message itself is written to a temporary file named in the log.

Update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` in `src/data/release.ts` after
verifying the release assets. Desktop installers and their checksum list use the
permanent GitHub `releases/latest/download/` aliases declared in that file; keep
it as the single download-link authority when release asset names change. The
download dialog recommends a compatible desktop installer and keeps other
platforms available without navigating through GitHub.

Before publishing, run `npm test`, `npm run check`, `npm run build`, and
`node scripts/check-built-site.mjs`. Push to `master`, wait for the GitHub
“Workers Builds: projectcanopi” check, then verify the live homepage and downloads.
`npm run deploy` is an optional manual Wrangler path and requires Cloudflare
authentication; use `CANOPI_WEB_EDITION_REQUIRED=0` for an intentional
marketing-only manual deployment.

For a Canopi release that also publishes the dedicated Web Edition, follow the
mandatory and conditional gates in
[`docs/canopi-web-subdomain-deployment.md`](docs/canopi-web-subdomain-deployment.md#efficient-release-operating-profile).
Decide whether the optional `/app/` surface is in scope before downloading its
artifact, reuse one verified output through preview and production, and record
compact structured evidence instead of repeating successful checks.
